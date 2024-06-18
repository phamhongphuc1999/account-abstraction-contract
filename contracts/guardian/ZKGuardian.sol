// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import './Verifier.sol';
import '../Account.sol';
import '../AccountFactory.sol';
import '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';
import '../interfaces/ISignatureValidator.sol';

contract ZKGuardian is Verifier, Initializable, UUPSUpgradeable, ISignatureValidatorConstants {
  struct OwnerTransaction {
    uint256 value;
    bytes data;
    uint256 eta;
    uint8 executedType; // 0: queue, 1: success, 2: fail, 3: cancel
    uint8 _type; // 0: add a guardian, 1: remove a guardian, 2: set threshold
  }

  address public owner;
  uint256 public increment;
  Account public account;
  uint256 public threshold;
  uint256 public guardianCount;
  uint256 public constant maxGuardians = 5;
  uint256 public delay;
  uint256 public expirePeriod;
  uint[maxGuardians] public guardians;
  address public _tempNewOwner;
  mapping(uint => bool) public confirms;
  OwnerTransaction[] public ownerTransactions;

  event GuardianAdded(uint indexed guardian);
  event GuardianRemoved(uint indexed guardian);
  event ThresholdChanged(uint256 threshold);
  event TransactionQueued(address indexed target, uint256 value, bytes data, uint256 eta);
  event TransactionExecuted(address indexed target, uint256 value, bytes data, uint256 eta);
  event TransactionCancelled(address indexed target, uint256 value, bytes data, uint256 eta);

  modifier isOkGuardianAndCounter(uint _guardian, uint256 _increment) {
    (bool isCheck, ) = guardianIndex(_guardian);
    require(isCheck, 'only guardian');
    require(_increment == increment);
    _;
  }

  modifier onlyOwner() {
    require(
      msg.sender == owner || msg.sender == address(account) || msg.sender == address(this),
      'only owner'
    );
    _;
  }

  function initialize(Account _account) public initializer {
    account = _account;
    owner = _account.owner();
    increment = 0;
  }

  function guardianIndex(uint _guardian) public view returns (bool, uint256) {
    bool isCheck = false;
    uint256 _index = 0;
    for (uint256 i = 0; i < guardianCount; i++) {
      if (_guardian == guardians[i]) {
        isCheck = true;
        _index = i;
        break;
      }
    }
    return (isCheck, _index);
  }

  function getOwnerTransactionCount() public view returns (uint256) {
    return ownerTransactions.length;
  }

  function resetConfirm() internal {
    for (uint256 i = 0; i < guardianCount; i++) confirms[guardians[i]] = false;
  }

  function isEnoughConfirm() public view returns (bool) {
    uint256 counter = 0;
    for (uint256 i = 0; i < guardianCount; i++) {
      if (confirms[guardians[i]]) counter = counter + 1;
    }
    return counter >= threshold;
  }

  function submitNewOwner(address _newOwner) public onlyOwner {
    require(_tempNewOwner == address(0), 'current transaction must be finished');
    _tempNewOwner = _newOwner;
  }

  function confirmChangeOwner(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[2] calldata _pubSignals
  ) external payable isOkGuardianAndCounter(_pubSignals[0], _pubSignals[1]) {
    bool isEnough = isEnoughConfirm();
    require(!isEnough, "enough already, you shouldn't confirm");
    require(!confirms[_pubSignals[0]], 'already confirmed');
    bool isValid = verifyProof(_pA, _pB, _pC, _pubSignals);
    require(isValid, 'proof is invalid');
    confirms[_pubSignals[0]] = true;
  }

  function changeOwner(AccountFactory accountFactory) public payable {
    bool isEnough = isEnoughConfirm();
    require(isEnough, 'you must have enough guardian confirm');
    account.changeOwner(accountFactory, _tempNewOwner);
    owner = _tempNewOwner;
    _tempNewOwner = address(0);
    increment = increment + 1;
    resetConfirm();
  }

  function setupGuardians(
    uint[] memory _guardians,
    uint256 _threshold,
    uint256 _expirePeriod,
    uint256 _delay
  ) public onlyOwner {
    require(threshold == 0, 'threshold must be equals 0 when initialize.');
    uint256 _guardianLen = _guardians.length;
    require(
      _threshold > 0 && _threshold <= _guardianLen,
      'threshold must be greaster than 0 and less than or equal to number of guardians'
    );
    require(
      _guardianLen <= maxGuardians,
      'number of guardians must be less than or equal maxGuardians'
    );
    for (uint256 i = 0; i < _guardianLen; i++) {
      uint guardian = _guardians[i];
      require(guardian != 0, 'invalid guardian address.');
      (bool isCheck, ) = guardianIndex(guardian);
      require(!isCheck, 'guardian already existed.');
      guardians[i] = guardian;
      emit GuardianAdded(guardian);
    }
    guardianCount = _guardians.length;
    threshold = _threshold;
    expirePeriod = _expirePeriod;
    delay = _delay;
    emit ThresholdChanged(_threshold);
  }

  function setThreshold(uint256 _threshold) external onlyOwner {
    require(threshold > 0, "threshold haven't been setup yet.");
    require(
      _threshold > 0 && _threshold <= guardianCount,
      '_threshold must be bigger than 0 and smaller or equals to current number of guardians.'
    );
    require(_tempNewOwner == address(0), 'change owner is in process, please finish it first');
    threshold = _threshold;
    emit ThresholdChanged(_threshold);
  }

  function addGuardian(uint _guardian) external onlyOwner {
    require(threshold > 0, "threshold haven't been setup yet.");
    require(_guardian != 0, 'invalid guardian address.');
    require(_tempNewOwner == address(0), 'change owner is in process, please finish it first');
    (bool isCheck, ) = guardianIndex(_guardian);
    require(!isCheck, 'guardian already existed.');
    require(guardianCount < maxGuardians, 'guardian is full');
    guardians[guardianCount] = _guardian;
    guardianCount += 1;
    emit GuardianAdded(_guardian);
  }

  function removeGuardian(uint _guardian) external onlyOwner {
    require(threshold > 0, "threshold haven't been setup yet.");
    require(_guardian != 0, 'invalid guardian address.');
    require(_tempNewOwner == address(0), 'change owner is in process, please finish it first');
    (bool isCheck, uint256 _index) = guardianIndex(_guardian);
    require(isCheck, 'guardian not existed.');
    require(
      guardians.length > threshold,
      'number of guardians after removed must larger or equal to threshold.'
    );
    for (uint256 i = _index; i < guardianCount - 1; i++) {
      guardians[i] = guardians[i + 1];
    }
    guardians[guardianCount - 1] = 0;
    guardianCount -= 1;
    emit GuardianRemoved(_guardian);
  }

  function queue(
    uint256 _value,
    bytes calldata _data,
    uint256 _eta,
    uint8 _type
  ) external onlyOwner {
    require(_eta >= block.timestamp + delay, 'Estimated execution block must satisfy delay.');
    ownerTransactions.push(
      OwnerTransaction({value: _value, data: _data, eta: _eta, executedType: 0, _type: _type})
    );
    emit TransactionQueued(address(this), _value, _data, _eta);
  }

  function execute(uint256 _index) external payable onlyOwner {
    require(_index >= 0 && _index <= ownerTransactions.length, 'Out of range');
    OwnerTransaction memory transaction = ownerTransactions[_index];
    uint256 eta = transaction.eta;
    require(block.timestamp >= eta, "Transaction hasn't surpassed time lock.");
    require(block.timestamp <= (eta + expirePeriod), 'Transaction is expired.');
    bytes memory callData = transaction.data;
    uint256 _value = transaction.value;
    (bool success, bytes memory result) = address(this).call{value: _value}(callData);
    if (success) ownerTransactions[_index].executedType = 1;
    else ownerTransactions[_index].executedType = 2;
    emit TransactionExecuted(address(this), _value, callData, eta);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  function cancel(uint256 _index) external onlyOwner {
    require(_index >= 0 && _index <= ownerTransactions.length, 'Out of range');
    ownerTransactions[_index].executedType = 3;
    OwnerTransaction memory transaction = ownerTransactions[_index];
    emit TransactionCancelled(address(this), transaction.value, transaction.data, transaction.eta);
  }

  function _authorizeUpgrade(address newImplementation) internal virtual override {
    (newImplementation);
  }
}
