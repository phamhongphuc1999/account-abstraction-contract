// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import '@account-abstraction/contracts/core/BaseAccount.sol';
import '@account-abstraction/contracts/samples/callback/TokenCallbackHandler.sol';
import '@account-abstraction/contracts/core/Helpers.sol';
import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';
import './AccountFactory.sol';
import './guardian/AccountGuardian.sol';

contract Account is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
  address public owner;
  address public accountGuardian;

  IEntryPoint private immutable _entryPoint;

  event AccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);
  event GuardianInitialized(address indexed guardian);
  event OwnerChanged(address indexed newOwner);

  modifier onlyOwner() {
    _onlyOwner();
    _;
  }

  /// @inheritdoc BaseAccount
  function entryPoint() public view virtual override returns (IEntryPoint) {
    return _entryPoint;
  }

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  constructor(IEntryPoint anEntryPoint) {
    _entryPoint = anEntryPoint;
    _disableInitializers();
  }

  function _onlyOwner() internal view {
    //directly from EOA owner, or through the account itself (which gets redirected through execute())
    require(msg.sender == owner || msg.sender == address(this), 'only owner');
  }

  modifier onlyAccountGuardian() {
    _onlyAccountGuardian();
    _;
  }

  function _onlyAccountGuardian() internal view {
    require(accountGuardian != address(0), 'Account::_onlyAccountGuardian: guardian not setup yet');
    require(msg.sender == accountGuardian, 'Account::_onlyAccountGuardian: only guardian manager');
  }

  /**
   * execute a transaction (called directly from owner, or by entryPoint)
   * @param dest destination address to call
   * @param value the value to pass in this call
   * @param func the calldata to pass in this call
   */
  function execute(address dest, uint256 value, bytes calldata func) external {
    _requireFromEntryPointOrOwner();
    _call(dest, value, func);
  }

  /**
   * execute a sequence of transactions
   * @dev to reduce gas consumption for trivial case (no value), use a zero-length array to mean zero value
   * @param dest an array of destination addresses
   * @param value an array of values to pass to each call. can be zero-length for no-value calls
   * @param func an array of calldata to pass to each call
   */
  function executeBatch(
    address[] calldata dest,
    uint256[] calldata value,
    bytes[] calldata func
  ) external {
    _requireFromEntryPointOrOwner();
    require(
      dest.length == func.length && (value.length == 0 || value.length == func.length),
      'wrong array lengths'
    );
    if (value.length == 0) {
      for (uint256 i = 0; i < dest.length; i++) {
        _call(dest[i], 0, func[i]);
      }
    } else {
      for (uint256 i = 0; i < dest.length; i++) {
        _call(dest[i], value[i], func[i]);
      }
    }
  }

  /**
   * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
   * a new implementation of Account must be deployed with the new EntryPoint address, then upgrading
   * the implementation by calling `upgradeTo()`
   * @param anOwner the owner (signer) of this account
   */
  function initialize(address anOwner) public virtual initializer {
    _initialize(anOwner);
  }

  function _initialize(address anOwner) internal virtual {
    owner = anOwner;
    emit AccountInitialized(_entryPoint, owner);
  }

  // Require the function call went through EntryPoint or owner
  function _requireFromEntryPointOrOwner() internal view {
    require(
      msg.sender == address(entryPoint()) || msg.sender == owner,
      'account: not Owner or EntryPoint'
    );
  }

  // function setUpGuardian(address _accountGuardian) public onlyOwner {
  function setUpGuardian(address _accountGuardian) public {
    require(
      accountGuardian == address(0),
      'Account::setupGuardian: accountGuardian has been setup'
    );
    accountGuardian = _accountGuardian;
    emit GuardianInitialized(_accountGuardian);
  }

  /// implement template method of BaseAccount
  function _validateSignature(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
    if (owner != ECDSA.recover(hash, userOp.signature)) return SIG_VALIDATION_FAILED;
    return SIG_VALIDATION_SUCCESS;
  }

  function _call(address target, uint256 value, bytes memory data) internal {
    (bool success, bytes memory result) = target.call{value: value}(data);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  /**
   * check current account deposit in the entryPoint
   */
  function getDeposit() public view returns (uint256) {
    return entryPoint().balanceOf(address(this));
  }

  /**
   * deposit more funds for this account in the entryPoint
   */
  function addDeposit() public payable {
    entryPoint().depositTo{value: msg.value}(address(this));
  }

  /**
   * withdraw value from the account's deposit
   * @param withdrawAddress target to send to
   * @param amount to withdraw
   */
  function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
    entryPoint().withdrawTo(withdrawAddress, amount);
  }

  function _authorizeUpgrade(address newImplementation) internal view override {
    (newImplementation);
    _onlyOwner();
  }

  function changeOwner(
    AccountFactory _accountFactory,
    bytes memory _newOwner
  ) public onlyAccountGuardian {
    address __newOwner = address(uint160(bytes20(_newOwner)));
    require(
      __newOwner != owner && __newOwner != address(0),
      'Account::changeOwner: invalid newOwner'
    );
    owner = __newOwner;
    _accountFactory.changeOwner(this, _newOwner);
    emit OwnerChanged(__newOwner);
  }

  function deployGuardian(bytes32 _salt, AccountFactory _accountFactory) public {
    AccountGuardian manager = (new AccountGuardian){salt: _salt}();
    manager.initialize(this, _accountFactory);
    setUpGuardian(address(manager));
  }

  function deploy(bytes memory bytecode, uint _salt) external onlyOwner {
    address addr;
    assembly {
      addr := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
      if iszero(extcodesize(addr)) {
        revert(0, 0)
      }
    }
  }

  function computeAddress(bytes memory bytecode, bytes32 salt) external view returns (address) {
    bytes32 bytecodeHash = keccak256(bytecode);
    bytes32 _data = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash));
    return address(bytes20(_data << 96));
  }

  function isDeploy(bytes memory bytecode, bytes32 salt) external view returns (bool) {
    address addr = this.computeAddress(bytecode, salt);
    return addr.code.length > 0;
  }

  function delegateExecute(address target, bytes memory data) public payable onlyOwner {
    (bool success, bytes memory result) = target.delegatecall(data);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  function staticExecute(address target, bytes memory data) external view returns (bytes memory) {
    (bool success, bytes memory result) = target.staticcall(data);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
    return result;
  }

  /// @inheritdoc IAccount
  function validateUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 missingAccountFunds
  ) external virtual override returns (uint256 validationData) {
    _requireFromEntryPoint();
    validationData = _validateSignature(userOp, userOpHash);
    _validateNonce(userOp.nonce);
    _payPrefund(missingAccountFunds);
  }
}
