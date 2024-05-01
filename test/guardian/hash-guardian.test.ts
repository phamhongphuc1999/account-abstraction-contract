import { expect } from 'chai';
import { Wallet } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  Account,
  AccountFactory,
  AccountFactory__factory,
  Account__factory,
  HashGuardian,
  HashGuardian__factory,
  SimpleEntryPoint,
  SimpleEntryPoint__factory,
} from '../../typechain';
import {
  generateCalldata,
  generatePoseidonHash,
  generateProof,
  verifyProof,
} from '../circom-utils';
import { AddressZero, createAccountOwner, fund, sendEntryPoint } from '../utils';

async function getEta() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp + 1;
}

const salt = '0x'.padEnd(66, '0');

describe('HashGuardian', function () {
  let account: Account;
  let accountOwner: Wallet = createAccountOwner();
  let accountFactory: AccountFactory;
  let entryPoint: SimpleEntryPoint;
  const etherSigner = ethers.provider.getSigner();

  const guardian1: Wallet = createAccountOwner();
  const guardian2: Wallet = createAccountOwner();
  const guardian3: Wallet = createAccountOwner();
  const guardian4: Wallet = createAccountOwner();

  let _hash1 = '';
  let _hash2 = '';
  let _hash3 = '';
  let _hash4 = '';

  let hashGuardian: HashGuardian;

  const accountInter = new Interface(Account__factory.abi);
  const hashGuardianInter = new Interface(HashGuardian__factory.abi);

  before(async () => {
    entryPoint = await new SimpleEntryPoint__factory(etherSigner).deploy();
    accountFactory = await new AccountFactory__factory(etherSigner).deploy(entryPoint.address);
    await accountFactory.createAccount(accountOwner.address, salt);
    let accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    account = (await ethers.getContractAt('Account', accountAddress, etherSigner)) as Account;

    _hash1 = await generatePoseidonHash(guardian1.address, 'hex');
    _hash2 = await generatePoseidonHash(guardian2.address, 'hex');
    _hash3 = await generatePoseidonHash(guardian3.address, 'hex');
    _hash4 = await generatePoseidonHash(guardian4.address, 'hex');

    await fund(accountOwner.address, '1000');
    await fund(account.address, '1000');
    await fund(guardian1.address, '1000');
  });

  it('Should deploy guardian', async function () {
    let callData = accountInter.encodeFunctionData('accountGuardian', []);
    let decodedResult = await account.accountGuardian();
    expect(decodedResult).to.equal(AddressZero);

    callData = accountInter.encodeFunctionData('deployGuardian', [salt]);
    callData = accountInter.encodeFunctionData('execute', [account.address, 0, callData]);
    const _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    const managerAddress = await account.computeAddress(HashGuardian__factory.bytecode, salt);
    const realManagerAddress = await account.accountGuardian();
    expect(realManagerAddress).to.eq(managerAddress);
    hashGuardian = (await ethers.getContractAt('HashGuardian', managerAddress)) as HashGuardian;
    expect(await hashGuardian.owner()).to.be.eq(accountOwner.address);
    expect(await hashGuardian.account()).to.be.eq(account.address);
  });
  it('Should setup guardians', async function () {
    let callData = hashGuardianInter.encodeFunctionData('setupGuardians', [
      [_hash1, _hash2, _hash3],
      1,
      100000,
    ]);
    callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, callData]);
    const _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await hashGuardian.guardianCount()).to.be.eq(3);
    expect(await hashGuardian.threshold()).to.be.eq(1);
    expect(await hashGuardian.guardians(0)).to.be.eq(_hash1);
    expect(await hashGuardian.guardians(1)).to.be.eq(_hash2);
    expect(await hashGuardian.guardians(2)).to.be.eq(_hash3);
  });
  it('Should set threshold', async function () {
    // create setThreshold callData
    let createThresholdCalldata = await hashGuardianInter.encodeFunctionData('setThreshold', [2]);
    const eta = await getEta();
    let _callData = hashGuardianInter.encodeFunctionData('queue', [
      0,
      createThresholdCalldata,
      eta,
      2,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    let _transactionData = await hashGuardian.ownerTransactions(0);
    expect(_transactionData.data).to.be.eq(createThresholdCalldata);
    expect(_transactionData._type).to.be.eq(2);
    expect(_transactionData.executedType).to.be.eq(0);
    // execute setThreshold callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = hashGuardianInter.encodeFunctionData('execute', [0]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    _transactionData = await hashGuardian.ownerTransactions(0);
    expect(_transactionData.data).to.be.eq(createThresholdCalldata);
    expect(_transactionData._type).to.be.eq(2);
    expect(_transactionData.executedType).to.be.eq(1);
    expect(await hashGuardian.threshold()).to.be.eq(2);
  });
  it('Should cancel queue transaction', async function () {
    // create setThreshold callData
    let createThresholdCalldata = hashGuardianInter.encodeFunctionData('setThreshold', [1]);
    const eta = await getEta();
    let _callData = hashGuardianInter.encodeFunctionData('queue', [
      0,
      createThresholdCalldata,
      eta,
      2,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    let _transactionData = await hashGuardian.ownerTransactions(1);
    expect(_transactionData.data).to.be.eq(createThresholdCalldata);
    expect(_transactionData._type).to.be.eq(2);
    expect(_transactionData.executedType).to.be.eq(0);
    // cancel setThreshold callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = hashGuardianInter.encodeFunctionData('cancel', [1]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    _transactionData = await hashGuardian.ownerTransactions(1);
    expect(_transactionData.data).to.be.eq(createThresholdCalldata);
    expect(_transactionData._type).to.be.eq(2);
    expect(_transactionData.executedType).to.be.eq(3);
    expect(await hashGuardian.threshold()).to.be.eq(2);
  });
  it('Should add guardian', async function () {
    // create addGuardian callData
    let addGuardianCalldata = hashGuardianInter.encodeFunctionData('addGuardian', [_hash4]);
    const eta = await getEta();
    let _callData = hashGuardianInter.encodeFunctionData('queue', [0, addGuardianCalldata, eta, 0]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    let _transactionData = await hashGuardian.ownerTransactions(2);
    expect(_transactionData.data).to.be.eq(addGuardianCalldata);
    expect(_transactionData._type).to.be.eq(0);
    expect(_transactionData.executedType).to.be.eq(0);
    // execute addGuardian callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = hashGuardianInter.encodeFunctionData('execute', [2]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    _transactionData = await hashGuardian.ownerTransactions(2);
    expect(_transactionData.data).to.be.eq(addGuardianCalldata);
    expect(_transactionData._type).to.be.eq(0);
    expect(_transactionData.executedType).to.be.eq(1);
    const _result = await hashGuardian.guardianIndex(_hash4);
    expect(_result[0]).to.be.eq(true);
    expect(_result[1]).to.be.eq(3);
    expect(await hashGuardian.guardianCount()).to.be.eq(4);
  });
  it('Should remove guardian', async function () {
    // create removeGuardian callData
    let removeCalldata = hashGuardianInter.encodeFunctionData('removeGuardian', [_hash3]);
    const eta = await getEta();
    let _callData = hashGuardianInter.encodeFunctionData('queue', [0, removeCalldata, eta, 1]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    let _transactionData = await hashGuardian.ownerTransactions(3);
    expect(_transactionData.data).to.be.eq(removeCalldata);
    expect(_transactionData._type).to.be.eq(1);
    expect(_transactionData.executedType).to.be.eq(0);
    // execute removeGuardian callData
    await new Promise((r) => setTimeout(r, 1000));
    _callData = hashGuardianInter.encodeFunctionData('execute', [3]);
    _callData = accountInter.encodeFunctionData('execute', [hashGuardian.address, 0, _callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    _transactionData = await hashGuardian.ownerTransactions(3);
    expect(_transactionData.data).to.be.eq(removeCalldata);
    expect(_transactionData._type).to.be.eq(1);
    expect(_transactionData.executedType).to.be.eq(1);
    const _result = await hashGuardian.guardianIndex(_hash3);
    expect(_result[0]).to.be.eq(false);
    expect(_result[1]).to.be.eq(0);
    expect(await hashGuardian.guardianCount()).to.be.eq(3);
  });
  it('Should change owner', async function () {
    const newOwner = createAccountOwner();
    // submit new owner
    const _submitCalldata = hashGuardianInter.encodeFunctionData('submitNewOwner', [
      newOwner.address,
    ]);
    let _callData = accountInter.encodeFunctionData('execute', [
      hashGuardian.address,
      0,
      _submitCalldata,
    ]);
    let _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    expect(await hashGuardian._tempNewOwner()).to.be.eq(newOwner.address);
    // comfirm change new owner
    let _proof = await generateProof(guardian1.address);
    let _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      const _comfirmCalldata = hashGuardianInter.encodeFunctionData('comfirmChangeOwner', [
        pA,
        pB,
        pC,
        pubSignals,
      ]);
      let _callData = accountInter.encodeFunctionData('execute', [
        hashGuardian.address,
        0,
        _comfirmCalldata,
      ]);
      let _nonce = await entryPoint.getNonce(account.address, '0x0');
      await sendEntryPoint(
        accountFactory,
        { sender: account.address, callData: _callData, nonce: _nonce },
        accountOwner,
        entryPoint
      );
      expect(await hashGuardian.comfirms(_hash1)).to.be.true;
      expect(await hashGuardian.isEnoughComfirm()).to.be.false;
    }

    _proof = await generateProof(guardian2.address);
    _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      const _comfirmCalldata = hashGuardianInter.encodeFunctionData('comfirmChangeOwner', [
        pA,
        pB,
        pC,
        pubSignals,
      ]);
      let _callData = accountInter.encodeFunctionData('execute', [
        hashGuardian.address,
        0,
        _comfirmCalldata,
      ]);
      let _nonce = await entryPoint.getNonce(account.address, '0x0');
      await sendEntryPoint(
        accountFactory,
        { sender: account.address, callData: _callData, nonce: _nonce },
        accountOwner,
        entryPoint
      );
      expect(await hashGuardian.comfirms(_hash2)).to.be.true;
      expect(await hashGuardian.isEnoughComfirm()).to.be.true;
    }
    // change owner
    const oldOwner = await account.owner();
    let _changeCalldata = hashGuardianInter.encodeFunctionData('changeOwner', [
      accountFactory.address,
    ]);
    _callData = accountInter.encodeFunctionData('execute', [
      hashGuardian.address,
      0,
      _changeCalldata,
    ]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    const oldAccountAddress = await accountFactory.getAddress(oldOwner, salt);
    expect(oldAccountAddress).to.be.eq(AddressZero);
    const newAccountAddress = await accountFactory.getAddress(newOwner.address, salt);
    expect(newAccountAddress).to.be.eq(account.address);
    const _guardianOwnerAddress = await hashGuardian.owner();
    expect(_guardianOwnerAddress).to.be.eq(newOwner.address);
    const _tempNewOwner = await hashGuardian._tempNewOwner();
    expect(_tempNewOwner).to.be.eq(AddressZero);
    const _cHash1 = await hashGuardian.comfirms(_hash1);
    expect(_cHash1).to.be.false;
    const _cHash2 = await hashGuardian.comfirms(_hash2);
    expect(_cHash2).to.be.false;
  });
});
