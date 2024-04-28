import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import { Interface, hexConcat } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  Account,
  AccountFactory,
  AccountFactory__factory,
  AccountGuardian,
  AccountGuardian__factory,
  Account__factory,
  SimpleEntryPoint,
  SimpleEntryPoint__factory,
} from '../typechain';
import { AddressZero, createAccountOwner, fund, sendEntryPoint } from './utils';

async function getEta() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp + 1;
}

const salt = '0x'.padEnd(66, '0');

describe('Guardian', function () {
  let account: Account;
  let accountOwner: Wallet = createAccountOwner();
  let accountFactory: AccountFactory;
  let entryPoint: SimpleEntryPoint;
  const etherSigner = ethers.provider.getSigner();

  let guardian1: Wallet = createAccountOwner();
  let guardian2: Wallet = createAccountOwner();
  let guardian3: Wallet = createAccountOwner();
  let guardian4: Wallet = createAccountOwner();

  let accountGuardian: AccountGuardian;

  const accountInter = new Interface(Account__factory.abi);
  const accountGuardianInter = new Interface(AccountGuardian__factory.abi);

  before(async () => {
    entryPoint = await new SimpleEntryPoint__factory(etherSigner).deploy();
    accountFactory = await new AccountFactory__factory(etherSigner).deploy(entryPoint.address);
    await accountFactory.createAccount(accountOwner.address, salt);
    let accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    account = (await ethers.getContractAt('Account', accountAddress, etherSigner)) as Account;
    await fund(accountOwner.address, '1000');
    await fund(account.address, '1000');
    await fund(guardian1.address, '1000');
  });

  it('Should deploy guardian', async function () {
    let callData = accountInter.encodeFunctionData('accountGuardian', []);
    let decodedResult = await account.accountGuardian();
    expect(decodedResult).to.equal(AddressZero);

    callData = accountInter.encodeFunctionData('deployGuardian', [salt, accountFactory.address]);
    callData = accountInter.encodeFunctionData('execute', [account.address, 0, callData]);
    const _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    // await account.deployGuardian(salt, accountFactory.address);
    const managerAddress = await account.computeAddress(AccountGuardian__factory.bytecode, salt);
    const realManagerAddress = await account.accountGuardian();
    expect(realManagerAddress).to.eq(managerAddress);
    accountGuardian = (await ethers.getContractAt(
      'AccountGuardian',
      managerAddress
    )) as AccountGuardian;
    expect(await accountGuardian.owner()).to.be.eq(accountOwner.address);
    expect(await accountGuardian.account()).to.be.eq(account.address);
  });
  it('Should setup guardians', async function () {
    let callData = accountGuardianInter.encodeFunctionData('setupGuardians', [
      [guardian1.address, guardian2.address, guardian3.address],
      1,
      100000,
    ]);
    callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, callData]);
    const _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await accountGuardian.guardianCount()).to.be.eq(3);
    expect(await accountGuardian.threshold()).to.be.eq(1);
    expect(await accountGuardian.guardians(guardian1.address)).to.be.true;
    expect(await accountGuardian.guardians(guardian2.address)).to.be.true;
    expect(await accountGuardian.guardians(guardian3.address)).to.be.true;
  });
  it('Should set threshold', async function () {
    // create setThreshold callData
    const setThresholdCalldata = accountGuardianInter.encodeFunctionData('setThreshold', [2]);
    const eta = await getEta();
    let _callData = accountGuardianInter.encodeFunctionData('queue', [
      0,
      '',
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    // execute setThreshold callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = accountGuardianInter.encodeFunctionData('execute', [
      0,
      '',
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await accountGuardian.threshold()).to.be.eq(2);
  });
  it('Should cancel queue transaction', async function () {
    // create setThreshold callData
    const setThresholdCalldata = accountGuardianInter.encodeFunctionData('setThreshold', [2]);
    const eta = await getEta();
    let _callData = accountGuardianInter.encodeFunctionData('queue', [
      0,
      '',
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    // cancel setThreshold callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = accountGuardianInter.encodeFunctionData('cancel', [
      0,
      '',
      setThresholdCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await accountGuardian.threshold()).to.be.eq(2);
  });
  it('Should add guardian', async function () {
    // create addGuardian callData
    const addGuardianCalldata = accountGuardianInter.encodeFunctionData('addGuardian', [
      guardian4.address,
    ]);
    const eta = await getEta();
    let _callData = accountGuardianInter.encodeFunctionData('queue', [
      0,
      '',
      addGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    // execute addGuardian callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = accountGuardianInter.encodeFunctionData('execute', [
      0,
      '',
      addGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await accountGuardian.guardians(guardian4.address)).to.be.true;
    expect(await accountGuardian.guardianCount()).to.be.eq(4);
  });
  it('Should remove guardian', async function () {
    // create removeGuardian callData
    const removeGuardianCalldata = accountGuardianInter.encodeFunctionData('removeGuardian', [
      guardian3.address,
    ]);
    const eta = await getEta();
    let _callData = accountGuardianInter.encodeFunctionData('queue', [
      0,
      '',
      removeGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    // execute removeGuardian callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = accountGuardianInter.encodeFunctionData('execute', [
      0,
      '',
      removeGuardianCalldata,
      eta,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [accountGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await accountGuardian.guardians(guardian3.address)).to.be.false;
    expect(await accountGuardian.guardianCount()).to.be.eq(3);
  });
  it('Should verify signatures', async () => {
    const calldata = '0x00';
    const dataHash = ethers.utils.hashMessage(calldata);
    const guardians = [guardian1, guardian2, guardian4];
    guardians.sort((a, b) => (BigNumber.from(a.address).lt(BigNumber.from(b.address)) ? -1 : 1));
    const sigs = await Promise.all(guardians.map(async (w) => await w.signMessage(calldata)));
    const signature = hexConcat(sigs);
    expect(await accountGuardian.checkSignatures(dataHash, calldata, signature, 3)).to.be.true;
  });
  it('Should change owner', async () => {
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
      '0x'.padEnd(66, '0')
    );
    expect(account.address).to.be.equal(accountAddress);
    await accountGuardian.connect(guardian1).changeOwner(dataHash, newOwner.address, signatures, {
      value: ethers.utils.parseEther('0.1'),
      gasLimit: 1000000,
    });
    const newAccountAddress = await accountFactory.getAddress(
      newOwner.address,
      '0x'.padEnd(66, '0')
    );
    accountAddress = await accountFactory.getAddress(accountOwner.address, '0x'.padEnd(66, '0'));
    expect(await account.owner()).to.be.eq(newOwner.address);
    expect(await accountGuardian.owner()).to.be.eq(newOwner.address);
    expect(account.address).to.be.equal(newAccountAddress);
    expect(accountAddress).to.be.equal(AddressZero);
  });
});
