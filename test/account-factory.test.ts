import { expect } from "chai";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import {
  AccountFactory,
  AccountFactory__factory,
  EntryPoint,
  EntryPoint__factory,
} from "../typechain";
import { createAccountOwner } from "../utils";

describe("AccountFactory test", async () => {
  const ethersSigner = ethers.provider.getSigner();
  let entryPoint: EntryPoint;
  let accountFactory: AccountFactory;
  let accountOwner: Wallet = createAccountOwner();
  let accountOwner2: Wallet = createAccountOwner();
  let salt: string;

  before(async () => {
    entryPoint = await new EntryPoint__factory(ethersSigner).deploy();
    accountFactory = await new AccountFactory__factory(ethersSigner).deploy(entryPoint.address);
    salt = "0x".padEnd(66, "0");
  });
  it("Should create account", async () => {
    const accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    expect(await ethers.provider.getCode(accountAddress).then((code) => code.length)).to.eq(2);
    await accountFactory.createAccount(accountOwner.address, salt);
    expect(await ethers.provider.getCode(accountAddress).then((code) => code.length)).to.gt(2);

    const accountAddress2 = await accountFactory.getAddress(accountOwner2.address, salt);
    expect(await ethers.provider.getCode(accountAddress2).then((code) => code.length)).to.equal(2);
    await accountFactory.createAccount(accountOwner2.address, salt);
    expect(await ethers.provider.getCode(accountAddress2).then((code) => code.length)).to.gt(2);
  });
  it("Should have the same owner", async () => {
    const accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    const mappingAccountAddress = await accountFactory.owners(accountOwner.address);
    const account = await ethers.getContractAt("Account", accountAddress, ethersSigner);
    expect(accountOwner.address).to.be.eq(await account.owner());
    expect(account.address).to.be.eq(mappingAccountAddress);

    const accountAddress2 = await accountFactory.getAddress(accountOwner2.address, salt);
    const mappingAccountAddress2 = await accountFactory.owners(accountOwner2.address);
    const account2 = await ethers.getContractAt("Account", accountAddress2, ethersSigner);
    expect(accountOwner2.address).to.be.equal(await account2.owner());
    expect(account2.address).to.be.equal(mappingAccountAddress2);

    expect(mappingAccountAddress).to.not.equal(mappingAccountAddress2);
  });
});
