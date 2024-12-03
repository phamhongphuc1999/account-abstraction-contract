import { expect } from 'chai';
import { Wallet } from 'ethers';
import { Interface, parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  convertBigIntsToNumber,
  convertStringToUint8,
  generateCalldata,
  generatePoseidonHash,
  generateProof,
  generateWitness,
  makeVerifiedInput,
  verifyProof,
} from '../jubjub-util';
import { createAccountOwner, fund, getAccountInitCode, salt, sendEntryPoint } from '../utils';
import {
  Account,
  Account__factory,
  AccountFactory__factory,
  MockEntryPoint__factory,
  ZKGuardian,
  ZKGuardian__factory,
} from '../../typechain';

const DECIMAL_18 = '1000000000000000000';
const DECIMAL_9 = '1000000000';
const SIMPLE_SALT = '0x'.padEnd(66, '0');

describe('GasCost', function () {
  it('Evaluate gas cost of the first transaction with deploying account', async function () {
    const etherSigner = ethers.provider.getSigner();
    const accountInter = new Interface(Account__factory.abi);
    const zkGuardianInter = new Interface(ZKGuardian__factory.abi);

    // account owner
    const accountOwner: Wallet = createAccountOwner();
    await fund(accountOwner.address, '1');

    // participant
    const account1: Wallet = createAccountOwner();
    await fund(account1.address, '1');

    const entryPoint = await new MockEntryPoint__factory(etherSigner).deploy();
    const accountFactory = await new AccountFactory__factory(etherSigner).deploy(
      entryPoint.address
    );
    // create account abstraction
    const accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    const account = (await ethers.getContractAt('Account', accountAddress, etherSigner)) as Account;
    await fund(account.address, '1');

    // send 0.1 ETH to account1, expect to deploy account abstraction
    let callData = accountInter.encodeFunctionData('execute', [
      account1.address,
      parseEther('0.1'),
      '0x00',
    ]);
    let _nonce = await entryPoint.getNonce(accountAddress, '0x0');
    expect(_nonce).to.eq('0');

    const _code = _nonce.isZero()
      ? getAccountInitCode(accountOwner.address, SIMPLE_SALT, accountFactory.address)
      : undefined;
    // transfer 0.1 BNB transaction to deploy account
    let receipt = await sendEntryPoint(
      accountFactory,
      { sender: accountAddress, callData, nonce: _nonce, initCode: _code },
      accountOwner,
      entryPoint
    );
    console.log('the first transaction: ', receipt.gasUsed);

    // transfer 0.1 BNB transaction
    _nonce = await entryPoint.getNonce(accountAddress, '0x0');
    expect(_nonce).to.eq('1');
    receipt = await sendEntryPoint(
      accountFactory,
      { sender: accountAddress, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    console.log('the transfer transaction: ', receipt.gasUsed);

    // deploy guardian smart contract
    _nonce = await entryPoint.getNonce(accountAddress, '0x0');
    expect(_nonce).to.eq('2');

    callData = accountInter.encodeFunctionData('deployGuardian', [salt]);
    callData = accountInter.encodeFunctionData('execute', [account.address, 0, callData]);
    receipt = await sendEntryPoint(
      accountFactory,
      { sender: accountAddress, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    const managerAddress = await account.computeAddress(ZKGuardian__factory.bytecode, salt);
    const realManagerAddress = await account.accountGuardian();
    expect(realManagerAddress).to.eq(managerAddress);
    const zkGuardian = (await ethers.getContractAt('ZKGuardian', managerAddress)) as ZKGuardian;
    expect(await zkGuardian.owner()).to.be.eq(accountOwner.address);
    expect(await zkGuardian.account()).to.be.eq(account.address);
    expect(await zkGuardian.maxGuardians()).to.be.eq(5);
    console.log('deploy guardian smart contract: ', receipt.gasUsed);

    // verification transaction
    // 1. verification transaction - setup guardian
    const _privateKey1 = 'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5';
    const _privateKey2 = 'deea921bccc87954c9d8707a2a9fe6accf39742da61ac8acc5c9b8f242c279aa';
    const _privateKey3 = '900a63747266d836e4c122a1b3f2c14d585494cd6cf7efafe0bc0b030965e974';
    const _privateKey4 = '1108986958552e0058997f92b0d38eb79096abab134e761fdc03ba323ae5fef8';

    const _proof1 = await generateWitness('', convertStringToUint8(_privateKey1));
    const _proof2 = await generateWitness('', convertStringToUint8(_privateKey2));
    const _proof3 = await generateWitness('', convertStringToUint8(_privateKey3));
    const _proof4 = await generateWitness('', convertStringToUint8(_privateKey4));
    const _hash1 = await generatePoseidonHash(convertBigIntsToNumber(_proof1.A, 256, 'hex'), 'hex');
    const _hash2 = await generatePoseidonHash(convertBigIntsToNumber(_proof2.A, 256, 'hex'), 'hex');
    const _hash3 = await generatePoseidonHash(convertBigIntsToNumber(_proof3.A, 256, 'hex'), 'hex');
    const _hash4 = await generatePoseidonHash(convertBigIntsToNumber(_proof4.A, 256, 'hex'), 'hex');

    callData = zkGuardianInter.encodeFunctionData('setupGuardians', [
      [_hash1, _hash2, _hash3],
      1,
      100000,
      0,
    ]);
    callData = accountInter.encodeFunctionData('execute', [zkGuardian.address, 0, callData]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );

    // 2. verification transaction - submit new owner
    const newOwner = createAccountOwner();
    const _submitCalldata = zkGuardianInter.encodeFunctionData('submitNewOwner', [
      newOwner.address,
      accountFactory.address,
      salt,
    ]);
    let _callData = accountInter.encodeFunctionData('execute', [
      zkGuardian.address,
      0,
      _submitCalldata,
    ]);
    _nonce = await entryPoint.getNonce(account.address, '0x0');
    await sendEntryPoint(
      accountFactory,
      { sender: account.address, callData: _callData, nonce: _nonce },
      accountOwner,
      entryPoint
    );
    const _increment = (await zkGuardian.increment()).toString();
    const _hash = await zkGuardian._tempNewOwner();
    expect(_hash).to.be.eq(newOwner.address);

    // 3. verification transaction - confirm change new owner
    const message = makeVerifiedInput(_hash, _increment);
    let _proof = await generateProof(message, convertStringToUint8(_privateKey1));
    let _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      const tx = await zkGuardian.connect(etherSigner).confirmChangeOwner(pA, pB, pC, pubSignals);
      const receipt = await tx.wait();
      expect(await zkGuardian.confirms(_hash1)).to.be.true;
      expect(await zkGuardian.isEnoughConfirm()).to.be.true;
      console.log('confirm change owner: ', receipt.gasUsed);
    }
  });
});
