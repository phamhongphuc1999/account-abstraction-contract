// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./guardian/GuardianExecutor.sol";
import "./guardian/GuardianManager.sol";
import "../interfaces/IEntryPoint.sol";
import "./Account.sol";

/**
 * A sample factory contract for Account
 * A UserOperations "initCode" holds the address of the factory, and a method call (to createAccount, in this sample factory).
 * The factory's createAccount returns the target account address even if it is already installed.
 * This way, the entryPoint.getSenderAddress() can be called either before or after the account is created.
 */
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
    uint codeSize = addr.code.length;
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

  function changeOwner(Account _account, bytes memory data) public  {
    address guardianManager = _account.guardianManager();
    require(guardianManager == msg.sender, "AccountFactory::changeOwner: Only owner can change yourself");
    address oldOwner = _account.owner();
    address account = owners[oldOwner];
    address newOwner = address(uint160(bytes20(data)));
    delete owners[oldOwner];
    owners[newOwner] = account;
  }

  /**
   * calculate the counterfactual address of this account as it would be returned by createAccount()
   */
  function getAddress(address owner, uint256 salt) public view returns (address) {
    address account = owners[owner];
    if (account != address(0)) return account;
    address rawAccount = Create2.computeAddress(
      bytes32(salt), 
      keccak256(abi.encodePacked(
        type(ERC1967Proxy).creationCode, 
        abi.encode(address(accountImplementation), 
        abi.encodeCall(Account.initialize, (owner)))
      ))
    );
    if (rawAccount.code.length > 0) return address(0);
    return rawAccount;
  }
}
