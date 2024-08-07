// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.15;

import '@account-abstraction/contracts/interfaces/IEntryPoint.sol';

contract GetUserOpHashes {
  error UserOpHashesResult(bytes32[] userOpHashes);

  constructor(IEntryPoint entryPoint, UserOperation[] memory userOps) {
    revert UserOpHashesResult(getUserOpHashes(entryPoint, userOps));
  }

  function getUserOpHashes(
    IEntryPoint entryPoint,
    UserOperation[] memory userOps
  ) public view returns (bytes32[] memory ret) {
    ret = new bytes32[](userOps.length);
    for (uint i = 0; i < userOps.length; i++) {
      ret[i] = entryPoint.getUserOpHash(userOps[i]);
    }
  }
}
