// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./AccountFactory.sol";
import "./guardian/GuardianExecutor.sol";
import "./guardian/GuardianManager.sol";
import "./BaseAccount.sol";
import "./GuardianAccount.sol";

contract Account is BaseAccount, UUPSUpgradeable, Initializable, GuardianAccount {
  using ECDSA for bytes32;

  bytes28 private _filler;
  uint96 private _nonce;
  // address public owner;
  address public guardianManager;

  IEntryPoint private immutable _entryPoint;

  event AccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);
  event GuardianInitialized(address indexed guardian);
  event OwnerChanged(address indexed newOwner);

  // modifier onlyOwner() {
  //   _onlyOwner();
  //   _;
  // }

  modifier onlyGuardianManager() {
    _onlyGuardianManager();
    _;
  }

  function nonce() public view virtual override returns (uint256) {
    return _nonce;
  }

  function entryPoint() public view virtual override returns (IEntryPoint) {
    return _entryPoint;
  }

  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  constructor(IEntryPoint anEntryPoint) {
    _entryPoint = anEntryPoint;
    _disableInitializers();
  }

  // function _onlyOwner() internal view {
  //   //directly from EOA owner, or through the account itself (which gets redirected through execute())
  //   require(msg.sender == owner || msg.sender == address(this), "Account::_onlyOwner: only owner");
  // }

  function _onlyGuardianManager() internal view {
    require(guardianManager != address(0), "Account::_onlyGuardianManager: guardian not setup yet");
    require(msg.sender == guardianManager, "Account::_onlyGuardianManager: only guardian manager");
  }

  /**
   * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
   * a new implementation of SimpleAccount must be deployed with the new EntryPoint address, then upgrading
   * the implementation by calling `upgradeTo()`
   */
  function initialize(address anOwner) public virtual initializer {
    _initialize(anOwner);
  }

  function setUpGuardian(address _guardianManager) public onlyOwner {
    require(
      guardianManager == address(0),
      "Account::setupGuardian: guardianManager has been setup"
    );
    guardianManager = _guardianManager;
    emit GuardianInitialized(_guardianManager);
  }

  function _initialize(address anOwner) internal virtual {
    owner = anOwner;
    emit AccountInitialized(_entryPoint, owner);
  }

  function _requireFromEntryPointOrOwner() internal view {
    require(
      msg.sender == address(entryPoint()) || msg.sender == owner,
      "Account::_requireFromEntryPointOrOwner:not Owner or EntryPoint"
    );
  }

  /// implement template method of BaseAccount
  function _validateAndUpdateNonce(UserOperation calldata userOp) internal override {
    require(_nonce++ == userOp.nonce, "Account::_validateAndUpdateNonce : invalid nonce");
  }

  /// implement template method of BaseAccount
  function _validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
  ) internal virtual override returns (uint256 validationData) {
    bytes32 hash = userOpHash.toEthSignedMessageHash();
    if (owner != hash.recover(userOp.signature)) return SIG_VALIDATION_FAILED;
    return 0;
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

  function changeOwner(address newOwner) public override onlyGuardianManager {
    require(newOwner != owner && newOwner != address(0), "Account::changeOwner: invalid newOwner");
    owner = newOwner;
    emit OwnerChanged(newOwner);
  }

  function deployGuardian(
    bytes32 _salt,
    uint256 _delay,
    uint256 _expirePeriod,
    AccountFactory _accountFactory
  ) public {
    GuardianExecutor executor = (new GuardianExecutor){salt: _salt}();
    GuardianManager manager = (new GuardianManager){salt: _salt}();
    executor.initialize(address(this), _delay, _expirePeriod);
    manager.initialize(address(executor), this, _accountFactory);
    setUpGuardian(address(manager));
  }

  function _call(address target, uint256 value, bytes memory data) internal {
    (bool success, bytes memory result) = target.call{value: value}(data);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  function execute(address dest, uint256 value, bytes calldata func) external {
    _requireFromEntryPointOrOwner();
    _call(dest, value, func);
  }

  function executeBatch(address[] calldata dest, bytes[] calldata func) external {
    _requireFromEntryPointOrOwner();
    require(dest.length == func.length, "Account::executeBatch: wrong array lengths");
    for (uint256 i = 0; i < dest.length; i++) {
      _call(dest[i], 0, func[i]);
    }
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
