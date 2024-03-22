import { expect } from "chai";
import { zeroAddress } from "ethereumjs-util";
import { BigNumber, Wallet } from "ethers";
import { Interface, hexConcat } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  Account,
  AccountFactory,
  AccountFactory__factory,
  Account__factory,
  EntryPoint,
  EntryPoint__factory,
  GuardianExecutor,
  GuardianExecutor__factory,
  GuardianManager,
  GuardianManager__factory,
} from "../typechain";
import { AddressZero, createAccountOwner, fund } from "../utils";
import { fillAndSign } from "../utils/UserOp";

const salt = "0x".padEnd(66, "0");

async function getEta() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp + 1;
}

describe("Account guardian flow test", function () {
  let account: Account;
  let accountOwner: Wallet = createAccountOwner();
  let accountFactory: AccountFactory;
  let entryPoint: EntryPoint;
  const etherSigner = ethers.provider.getSigner();

  let guardian1: Wallet = createAccountOwner();
  let guardian2: Wallet = createAccountOwner();
  let guardian3: Wallet = createAccountOwner();
  let guardian4: Wallet = createAccountOwner();

  let guardianExecutor: GuardianExecutor;
  let guardianManager: GuardianManager;

  const accountInter = new Interface(Account__factory.abi);
  const executorInter = new Interface(GuardianExecutor__factory.abi);
  const managerInter = new Interface(GuardianManager__factory.abi);

  async function sendEntryPoint(callData: string, signer: Wallet) {
    const queueUserOp = await fillAndSign(
      accountFactory,
      { sender: account.address, callData },
      accountOwner,
      entryPoint
    );
    await entryPoint
      .connect(etherSigner)
      .handleOps([queueUserOp], signer.address, { gasLimit: 1000000 });
  }

  before(async function () {
    entryPoint = await new EntryPoint__factory(etherSigner).deploy();
    accountFactory = await new AccountFactory__factory(etherSigner).deploy(entryPoint.address);

    await accountFactory.createAccount(accountOwner.address, salt);
    let accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    account = await ethers.getContractAt("Account", accountAddress, etherSigner);

    await fund(accountOwner.address, "100");
    await fund(account.address, "100");
    await fund(guardian1.address, "100");
  });
  it("Should deploy guardians", async () => {
    let callData = accountInter.encodeFunctionData("guardianManager", []);
    let result = await account.staticExecute(account.address, callData);
    let decodedResult = accountInter.decodeFunctionResult("guardianManager", result);
    expect(decodedResult[0]).to.equal(AddressZero);

    callData = accountInter.encodeFunctionData("deployGuardian", [
      salt,
      0,
      100000,
      accountFactory.address,
    ]);
    callData = accountInter.encodeFunctionData("execute", [account.address, 0, callData]);
    let userOp = await fillAndSign(
      accountFactory,
      { sender: account.address, callData },
      accountOwner,
      entryPoint
    );
    await entryPoint
      .connect(etherSigner)
      .handleOps([userOp], guardian1.address, { gasLimit: 30000000 });
    const executorAddress = await account.computeAddress(GuardianExecutor__factory.bytecode, salt);
    const managerAddress = await account.computeAddress(GuardianManager__factory.bytecode, salt);
    const realManagerAddress = await account.guardianManager();
    expect(realManagerAddress).to.eq(managerAddress);
    guardianManager = await ethers.getContractAt("GuardianManager", managerAddress);
    guardianExecutor = await ethers.getContractAt("GuardianExecutor", executorAddress);
    expect(await guardianExecutor.account()).to.be.eq(account.address);
    expect(await guardianManager.owner()).to.be.eq(accountOwner.address);
    expect(await guardianManager.account()).to.be.eq(account.address);
    expect(await guardianManager.executor()).to.be.equal(executorAddress);
  });
  it("Should setup guardians", async () => {
    let callData = managerInter.encodeFunctionData("setupGuardians", [
      [guardian1.address, guardian2.address, guardian3.address],
      1,
    ]);
    callData = accountInter.encodeFunctionData("execute", [guardianManager.address, 0, callData]);
    let userOp = await fillAndSign(
      accountFactory,
      { sender: account.address, callData },
      accountOwner,
      entryPoint
    );
    await entryPoint
      .connect(etherSigner)
      .handleOps([userOp], guardian1.address, { gasLimit: 30000000 });
    expect(await guardianManager.guardianCount()).to.be.eq(3);
    expect(await guardianManager.threshold()).to.be.eq(1);
    expect(await guardianManager.guardians(guardian1.address)).to.be.true;
    expect(await guardianManager.guardians(guardian2.address)).to.be.true;
    expect(await guardianManager.guardians(guardian3.address)).to.be.true;
  });
  it("Should set threshold", async () => {
    // create setThreshold callData
    const setThresholdCalldata = managerInter.encodeFunctionData("setThreshold", [2]);
    const eta = await getEta();
    let _callData = executorInter.encodeFunctionData("queue", [
      guardianManager.address,
      0,
      "",
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    // execute setThreshold callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = executorInter.encodeFunctionData("execute", [
      guardianManager.address,
      0,
      "",
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    expect(await guardianManager.threshold()).to.be.eq(2);
  });
  it("Should cancel queue transaction", async () => {
    // create setThreshold callData
    const setThresholdCalldata = managerInter.encodeFunctionData("setThreshold", [2]);
    const eta = await getEta();
    let _callData = executorInter.encodeFunctionData("queue", [
      guardianManager.address,
      0,
      "",
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    // cancel setThreshold callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = executorInter.encodeFunctionData("cancel", [
      guardianManager.address,
      0,
      "",
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    expect(await guardianManager.threshold()).to.be.eq(2);
  });
  it("Should add guardian", async () => {
    // create addGuardian callData
    const addGuardianCalldata = managerInter.encodeFunctionData("addGuardian", [guardian4.address]);
    const eta = await getEta();
    let _callData = executorInter.encodeFunctionData("queue", [
      guardianManager.address,
      0,
      "",
      addGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    // execute addGuardian callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = executorInter.encodeFunctionData("execute", [
      guardianManager.address,
      0,
      "",
      addGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    expect(await guardianManager.guardians(guardian4.address)).to.be.true;
    expect(await guardianManager.guardianCount()).to.be.eq(4);
  });
  it("Should remove guardian", async () => {
    // create removeGuardian callData
    const removeGuardianCalldata = managerInter.encodeFunctionData("removeGuardian", [
      guardian3.address,
    ]);
    const eta = await getEta();
    let _callData = executorInter.encodeFunctionData("queue", [
      guardianManager.address,
      0,
      "",
      removeGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    // execute removeGuardian callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = executorInter.encodeFunctionData("execute", [
      guardianManager.address,
      0,
      "",
      removeGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData("execute", [
      guardianExecutor.address,
      0,
      _callData,
    ]);
    await sendEntryPoint(_callData, guardian1);
    expect(await guardianManager.guardians(guardian3.address)).to.be.false;
    expect(await guardianManager.guardianCount()).to.be.eq(3);
  });
  it("Should verify signatures", async () => {
    const calldata = "0x00";
    const dataHash = ethers.utils.hashMessage(calldata);
    const guardians = [guardian1, guardian2, guardian4];
    guardians.sort((a, b) => (BigNumber.from(a.address).lt(BigNumber.from(b.address)) ? -1 : 1));
    const sigs = await Promise.all(guardians.map(async (w) => await w.signMessage(calldata)));
    const signature = hexConcat(sigs);
    expect(await guardianManager.checkSignatures(dataHash, calldata, signature, 3)).to.be.true;
  });
  it("Should change owner", async () => {
    const newOwner = createAccountOwner();

    const dataHash = ethers.utils.hashMessage(newOwner.address);
    const guardians = [guardian1, guardian2, guardian4];
    guardians.sort((a, b) => (BigNumber.from(a.address).lt(BigNumber.from(b.address)) ? -1 : 1));
    const sigs = await Promise.all(
      guardians.map(async (w) => await w.signMessage(newOwner.address))
    );
    const signatures = hexConcat(sigs);
    let accountAddress = await accountFactory.getAddress(
      accountOwner.address,
      "0x".padEnd(66, "0")
    );
    expect(account.address).to.be.equal(accountAddress);
    await guardianManager.connect(guardian1).changeOwner(dataHash, newOwner.address, signatures, {
      value: ethers.utils.parseEther("0.1"),
      gasLimit: 1000000,
    });
    const newAccountAddress = await accountFactory.getAddress(
      newOwner.address,
      "0x".padEnd(66, "0")
    );
    accountAddress = await accountFactory.getAddress(accountOwner.address, "0x".padEnd(66, "0"));
    expect(await account.owner()).to.be.eq(newOwner.address);
    expect(await guardianManager.owner()).to.be.eq(newOwner.address);
    expect(account.address).to.be.equal(newAccountAddress);
    expect(accountAddress).to.be.equal(zeroAddress());
  });
});
