// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import '@account-abstraction/contracts/core/BaseAccount.sol';
import '@account-abstraction/contracts/samples/callback/TokenCallbackHandler.sol';
import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import './AccountFactory.sol';
import './guardian/HashGuardian.sol';

contract Account is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
  using ECDSA for bytes32;
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

  modifier onlyAccountGuardian() {
    _onlyAccountGuardian();
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

  function _onlyAccountGuardian() internal view {
    require(accountGuardian != address(0), 'guardian not setup yet');
    require(msg.sender == accountGuardian, 'only guardian manager');
  }

  function execute(address dest, uint256 value, bytes calldata func) external {
    _requireFromEntryPointOrOwner();
    _call(dest, value, func);
  }

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

  function initialize(address anOwner) public virtual initializer {
    _initialize(anOwner);
  }

  function _initialize(address anOwner) internal virtual {
    owner = anOwner;
    emit AccountInitialized(_entryPoint, owner);
  }

  function _requireFromEntryPointOrOwner() internal view {
    require(msg.sender == address(entryPoint()) || msg.sender == owner, 'not Owner or EntryPoint');
  }

  function setUpGuardian(address _accountGuardian) public onlyOwner {
    require(accountGuardian == address(0), 'accountGuardian has been setup');
    accountGuardian = _accountGuardian;
    emit GuardianInitialized(_accountGuardian);
  }

  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    bytes32 hash = userOpHash.toEthSignedMessageHash();
    if (owner != hash.recover(userOp.signature)) return SIG_VALIDATION_FAILED;
    return 0;
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
    address _newOwner
  ) public onlyAccountGuardian {
    require(_newOwner != owner && _newOwner != address(0), 'invalid newOwner');
    _accountFactory.changeOwner(this, _newOwner);
    owner = _newOwner;
    emit OwnerChanged(_newOwner);
  }

  function deployGuardian(bytes32 _salt) public onlyOwner {
    HashGuardian manager = (new HashGuardian){salt: _salt}();
    manager.initialize(this);
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
}
