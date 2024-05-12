// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import '@account-abstraction/contracts/interfaces/UserOperation.sol';

contract TestUtil {
  using UserOperationLib for UserOperation;

  function packUserOp(UserOperation calldata op) external pure returns (bytes memory) {
    return op.pack();
  }
}
