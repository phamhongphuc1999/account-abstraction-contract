// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import './Verifier.sol';

contract SimpleZKGuardian is Verifier {
  mapping(uint => bool) public guardians;
  uint256 public counter;
  uint256 public threshold;

  constructor() {
    counter = 0;
    threshold = 2;
  }

  function isGuardian(uint _guradian) public view returns (bool) {
    return guardians[_guradian];
  }

  function addGuardian(uint _guradian) external {
    guardians[_guradian] = true;
  }

  function verifyGuardian(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[2] calldata _pubSignals
  ) external payable {
    bool isValid = verifyProof(_pA, _pB, _pC, _pubSignals);
    require(isValid, 'Proof is invalid');
    require(guardians[_pubSignals[0]], "Verifier isn't a guardian");
    counter += 1;
  }
}
