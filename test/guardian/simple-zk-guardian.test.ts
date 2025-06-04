import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SimpleZKGuardian, SimpleZKGuardian__factory } from '../../typechain';
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

interface ProofType {
  A: bigint[];
  R8: bigint[];
  S: bigint[];
  msg: bigint[];
}

describe('SimpleZKGuardian', function () {
  let simpleZKGuardian: SimpleZKGuardian;
  const etherSigner = ethers.provider.getSigner();
  const _privateKey1 = 'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5';
  const _privateKey2 = 'deea921bccc87954c9d8707a2a9fe6accf39742da61ac8acc5c9b8f242c279aa';
  const _privateKey3 = '900a63747266d836e4c122a1b3f2c14d585494cd6cf7efafe0bc0b030965e974';
  const _privateKey4 = '1108986958552e0058997f92b0d38eb79096abab134e761fdc03ba323ae5fef8';

  let _proof1: ProofType;
  let _proof2: ProofType;
  let _proof3: ProofType;

  let _hash1: string;
  let _hash2: string;
  let _hash3: string;

  let message = '';

  before(async () => {
    message = makeVerifiedInput('0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36', '2');
    simpleZKGuardian = await new SimpleZKGuardian__factory(etherSigner).deploy();
    _proof1 = await generateWitness(message, convertStringToUint8(_privateKey1));
    console.log('🚀 ~ before ~ _proof1:', _proof1);
    _proof2 = await generateWitness(message, convertStringToUint8(_privateKey2));
    _proof3 = await generateWitness(message, convertStringToUint8(_privateKey3));
    _hash1 = await generatePoseidonHash(convertBigIntsToNumber(_proof1.A, 256, 'hex'), 'hex');
    _hash2 = await generatePoseidonHash(convertBigIntsToNumber(_proof2.A, 256, 'hex'), 'hex');
    _hash3 = await generatePoseidonHash(convertBigIntsToNumber(_proof3.A, 256, 'hex'), 'hex');
  });

  it('Should add guardians', async function () {
    await simpleZKGuardian.addGuardian(_hash1);
    await simpleZKGuardian.addGuardian(_hash2);
    await simpleZKGuardian.addGuardian(_hash3);

    const _isGuardian1 = await simpleZKGuardian.isGuardian(_hash1);
    expect(_isGuardian1).to.be.true;
    const _isGuardian3 = await simpleZKGuardian.isGuardian(_hash3);
    expect(_isGuardian3).to.be.true;
  });
  it('Should execute', async function () {
    let _counter = await simpleZKGuardian.counter();
    expect(_counter).to.eq(0);
    let _proof = await generateProof(message, convertStringToUint8(_privateKey1));
    let _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      await simpleZKGuardian.verifyGuardian(pA, pB, pC, pubSignals);
      _counter = await simpleZKGuardian.counter();
      expect(_counter).to.eq(1);
    }

    _proof = await generateProof(message, convertStringToUint8(_privateKey1));
    _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      await simpleZKGuardian.verifyGuardian(pA, pB, pC, pubSignals);
      _counter = await simpleZKGuardian.counter();
      expect(_counter).to.eq(2);

      _proof = await generateProof(message, convertStringToUint8(_privateKey4));
      _verify = await verifyProof(_proof.proof, _proof.publicSignals);
      expect(_verify).to.be.true;
      if (_verify) {
        const { pA, pB, pC, pubSignals } = await generateCalldata(
          _proof.proof,
          _proof.publicSignals
        );
        await expect(simpleZKGuardian.verifyGuardian(pA, pB, pC, pubSignals)).to.be.revertedWith(
          "Verifier isn't a guardian"
        );
      }
    }
  });
  it('Evaluate time to generating proof', async function () {
    const evaluatedMessage = makeVerifiedInput('0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36', '2');
    const startTime = performance.now();
    const _proof = await generateProof(evaluatedMessage, convertStringToUint8(_privateKey1));
    const endTime = performance.now();
    console.log('time run: ', endTime - startTime);
  });
});
