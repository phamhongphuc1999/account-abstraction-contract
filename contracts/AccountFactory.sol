// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import './Account.sol';
import '@openzeppelin/contracts/utils/Create2.sol';
import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import '@account-abstraction/contracts/interfaces/IEntryPoint.sol';

contract AccountFactory {
  Account public immutable accountImplementation;
  mapping(address => address) public owners;

  constructor(IEntryPoint _entryPoint) {
    accountImplementation = new Account(_entryPoint);
  }

  /**
   * create an account, and return its address.
   * returns the address even if the account is already deployed.
   * Note that during UserOperation execution, this method is called only if the account is not deployed.
   * This method returns an existing account address so that entryPoint.getSenderAddress() would work even after account creation
   */
  function createAccount(address owner, uint256 salt) public returns (Account ret) {
    address addr = getAddress(owner, salt);
    uint256 codeSize = addr.code.length;
    if (codeSize > 0) {
      return Account(payable(addr));
    }
    owners[owner] = addr;
    ret = Account(
      payable(
        new ERC1967Proxy{salt: bytes32(salt)}(
          address(accountImplementation),
          abi.encodeCall(Account.initialize, (owner))
        )
      )
    );
  }

  /**
   * calculate the counterfactual address of this account as it would be returned by createAccount()
   */
  function getAddress(address owner, uint256 salt) public view returns (address) {
    address account = owners[owner];
    if (account != address(0)) return account;
    address rawAccount = Create2.computeAddress(
      bytes32(salt),
      keccak256(
        abi.encodePacked(
          type(ERC1967Proxy).creationCode,
          abi.encode(address(accountImplementation), abi.encodeCall(Account.initialize, (owner)))
        )
      )
    );
    if (rawAccount.code.length > 0) return address(0);
    return rawAccount;
  }

  function changeOwner(Account _account, address _newOwner) public {
    require(address(_account) == msg.sender, 'Only account can change itself');
    address oldOwner = _account.owner();
    address account = owners[oldOwner];
    address newOwner = _newOwner;
    delete owners[oldOwner];
    owners[newOwner] = account;
  }
}
