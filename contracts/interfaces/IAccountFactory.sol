// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import '@account-abstraction/contracts/core/BaseAccount.sol';

interface IAccountFactory {
  function createAccount(address owner, uint256 salt) external returns (BaseAccount ret);
  function getAddress(address owner, uint256 salt) external view returns (address);
  function changeOwner(BaseAccount _account, address _newOwner) external;
}
