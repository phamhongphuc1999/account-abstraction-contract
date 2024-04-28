// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import '../Account.sol';
import '../AccountFactory.sol';
import './Verifier.sol';
import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';
import '../interfaces/ISignatureValidator.sol';

contract AccountGuardian is Verifier, Initializable, UUPSUpgradeable, ISignatureValidatorConstants {
  address public owner;
  Account public account;
  AccountFactory private accountFactory;
  uint256 public threshold;
  uint256 public guardianCount;
  uint256 private delay;
  uint256 private expirePeriod;

  mapping(address => bool) public guardians;
  mapping(bytes32 => bool) public transactionQueue;

  event GuardianAdded(address indexed guardian);
  event GuardianRemoved(address indexed guardian);
  event ThresholdChanged(uint256 threshold);

  event TransactionQueued(
    bytes32 txHash,
    address indexed target,
    uint256 value,
    string signature,
    bytes data,
    uint256 eta
  );
  event TransactionExecuted(
    bytes32 txHash,
    address indexed target,
    uint256 value,
    string signature,
    bytes data,
    uint256 eta
  );
  event TransactionCancelled(
    bytes32 txHash,
    address indexed target,
    uint256 value,
    string signature,
    bytes data,
    uint256 eta
  );

  modifier onlyOwner() {
    _onlyOwner();
    _;
  }

  modifier onlyGuardian() {
    require(guardians[msg.sender], 'only guardian');
    _;
  }

  function _onlyOwner() internal view {
    require(
      msg.sender == owner || msg.sender == address(account) || msg.sender == address(this),
      'only owner'
    );
  }

  function initialize(Account _account, AccountFactory _accountFactory) public initializer {
    account = _account;
    owner = _account.owner();
    accountFactory = _accountFactory;
  }

  function setupGuardians(
    address[] memory _guardians,
    uint256 _threshold,
    uint256 _expirePeriod
  ) public onlyOwner {
    require(threshold == 0, 'threshold must be equals 0 when initialize.');
    require(
      _guardians.length >= _threshold,
      '_guardians.length must be bigger or equals to _threshold.'
    );
    for (uint256 i = 0; i < _guardians.length; i++) {
      address guardian = _guardians[i];
      require(guardian != address(0) && guardian != address(this), 'invalid guardian address.');
      require(!guardians[guardian], 'guardian already existed.');
      guardians[guardian] = true;
      emit GuardianAdded(guardian);
    }
    guardianCount = _guardians.length;
    threshold = _threshold;
    expirePeriod = _expirePeriod;
    emit ThresholdChanged(_threshold);
  }

  function setThreshold(uint256 _threshold) external {
    require(threshold > 0, "threshold haven't been setup yet.");
    require(
      _threshold > 0 && _threshold <= guardianCount,
      '_threshold must be bigger than 0 and smaller or equals to current number of guardians.'
    );
    threshold = _threshold;
    emit ThresholdChanged(_threshold);
  }

  function addGuardian(address _guardian) external {
    require(threshold > 0, "threshold haven't been setup yet.");
    require(_guardian != address(0) && _guardian != address(this), 'invalid guardian address.');
    require(!guardians[_guardian], 'guardian already existed.');
    guardians[_guardian] = true;
    guardianCount += 1;
    emit GuardianAdded(_guardian);
  }

  function removeGuardian(address _guardian) external {
    require(threshold > 0, "threshold haven't been setup yet.");
    require(_guardian != address(0) && _guardian != address(this), 'invalid guardian address.');
    require(guardians[_guardian], 'guardian not existed.');
    require(
      guardianCount > threshold,
      'number of guardians after removed must larger or equal to threshold.'
    );
    guardians[_guardian] = false;
    guardianCount -= 1;
    emit GuardianRemoved(_guardian);
  }

  function checkSignatures(
    bytes32 dataHash,
    bytes memory data,
    bytes memory signatures,
    uint256 requiredSignatures
  ) public view returns (bool) {
    require(signatures.length >= requiredSignatures * 65, 'invalid signature length');
    uint256 signatureCount = 0;
    address currentGuardian;
    uint8 v;
    bytes32 r;
    bytes32 s;
    uint256 i;
    for (i = 0; i < requiredSignatures; i++) {
      (v, r, s) = signatureSplit(signatures, i);
      if (v == 0) {
        require(
          keccak256(data) == dataHash,
          'datahash and hash of the pre-image data do not match.'
        );
        currentGuardian = address(uint160(uint256(r)));
        require(
          uint256(s) >= requiredSignatures * 65,
          'invalid contract signature location: inside static part'
        );
        require(
          uint256(s) + 32 <= signatures.length,
          'invalid contract signature location: length not present'
        );
        uint256 contractSignatureLen;
        // solhint-disable-next-line no-inline-assembly
        assembly {
          contractSignatureLen := mload(add(add(signatures, s), 0x20))
        }
        require(
          uint256(s) + 32 + contractSignatureLen <= signatures.length,
          'invalid contract signature location: data not complete'
        );
        bytes memory contractSignature;
        // solhint-disable-next-line no-inline-assembly
        assembly {
          contractSignature := add(add(signatures, s), 0x20)
        }
        require(
          ISignatureValidator(currentGuardian).isValidSignature(data, contractSignature) ==
            EIP1271_MAGIC_VALUE,
          'invalid contract signature provided'
        );
      } else if (v > 30) {
        currentGuardian = ecrecover(
          keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n32', dataHash)),
          v - 4,
          r,
          s
        );
      } else {
        currentGuardian = ecrecover(dataHash, v, r, s);
      }
      if (guardians[currentGuardian]) signatureCount++;
    }
    return signatureCount >= requiredSignatures;
  }

  function checkMultisig(
    bytes32 dataHash,
    bytes memory data,
    bytes memory signatures
  ) public view returns (bool) {
    uint256 _threshold = threshold;
    require(_threshold > 0, 'GuardianManager::checkMultisig: invalid threshold');
    return checkSignatures(dataHash, data, signatures, threshold);
  }

  /**
   * change the owner of the current account that this guardian is managing
   * @param dataHash the preimage hash of the calldata
   * @param _newOwner the address of new owner
   * @param signatures the signature of the guardians over data
   */
  function changeOwner(
    bytes32 dataHash,
    bytes memory _newOwner,
    bytes memory signatures
  ) public payable onlyGuardian {
    require(
      checkMultisig(dataHash, _newOwner, signatures),
      'GuardianManager::changeOwner: invalid multi sig'
    );
    address __newOwner = address(uint160(bytes20(_newOwner)));
    account.changeOwner(accountFactory, _newOwner);
    owner = __newOwner;
  }

  function signatureSplit(
    bytes memory signatures,
    uint256 pos
  ) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      let signaturePos := mul(0x41, pos)
      r := mload(add(signatures, add(signaturePos, 0x20)))
      s := mload(add(signatures, add(signaturePos, 0x40)))
      v := and(mload(add(signatures, add(signaturePos, 0x41))), 0xff)
    }
  }

  function getDepay() public view returns (uint256) {
    return delay;
  }

  function queue(
    uint256 _value,
    string calldata _signature,
    bytes calldata _data,
    uint256 _eta
  ) external onlyOwner returns (bytes32) {
    require(_eta >= block.timestamp + delay, 'Estimated execution block must satisfy delay.');
    bytes32 txHash = keccak256(abi.encode(address(this), _value, _signature, _data, _eta));
    transactionQueue[txHash] = true;
    emit TransactionQueued(txHash, address(this), _value, _signature, _data, _eta);
    return txHash;
  }

  function execute(
    uint256 _value,
    string calldata _signature,
    bytes calldata _data,
    uint256 _eta
  ) external payable onlyOwner {
    bytes32 txHash = keccak256(abi.encode(address(this), _value, _signature, _data, _eta));
    require(transactionQueue[txHash], "Transaction hasn't been queued.");
    require(block.timestamp >= _eta, "Transaction hasn't surpassed time lock.");
    require(block.timestamp <= (_eta + expirePeriod), 'Transaction is expired.');

    transactionQueue[txHash] = false;
    bytes memory callData;
    if (bytes(_signature).length == 0) {
      callData = _data;
    } else {
      callData = abi.encodePacked(bytes4(keccak256(bytes(_signature))), _data);
    }

    (bool success, ) = address(this).call{value: _value}(callData);
    require(success, 'Transaction execution reverted.');
    emit TransactionExecuted(txHash, address(this), _value, _signature, _data, _eta);
  }

  function cancel(
    uint256 _value,
    string calldata _signature,
    bytes calldata _data,
    uint256 _eta
  ) external onlyOwner {
    bytes32 txHash = keccak256(abi.encode(address(this), _value, _signature, _data, _eta));
    transactionQueue[txHash] = false;
    emit TransactionCancelled(txHash, address(this), _value, _signature, _data, _eta);
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override {
    (newImplementation);
  }
}
