import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SimpleHashGuardian, SimpleHashGuardian__factory } from '../../typechain';
import {
  generateCalldata,
  generatePoseidonHash,
  generateProof,
  verifyProof,
} from '../circom-utils';

describe('SimpleHashGuardian', function () {
  let simpleHashGuardian: SimpleHashGuardian;
  const etherSigner = ethers.provider.getSigner();
  const _account1 = '0x9A85752B25Cb26a1E42f8E095588e4647859Bc36';
  const _account2 = '0xac7367fe5423f5134039b446D4B9dD9C06f57826';
  const _account3 = '0x0E043E83C116546737b49d0887d6CCe29f7bFD4d';
  const _account4 = '0xeea17fC3a6078895ec5BA4Ef4158860f5303bD2A';

  let _hash1 = '';
  let _hash2 = '';
  let _hash3 = '';

  before(async () => {
    simpleHashGuardian = await new SimpleHashGuardian__factory(etherSigner).deploy();
    _hash1 = await generatePoseidonHash(_account1, 'hex');
    _hash2 = await generatePoseidonHash(_account2, 'hex');
    _hash3 = await generatePoseidonHash(_account3, 'hex');
  });

  it('Should add guardians', async function () {
    await simpleHashGuardian.addGuardian(_hash1);
    await simpleHashGuardian.addGuardian(_hash2);
    await simpleHashGuardian.addGuardian(_hash3);

    const _isGuardian1 = await simpleHashGuardian.isGuardian(_hash1);
    expect(_isGuardian1).to.be.true;
    const _isGuardian3 = await simpleHashGuardian.isGuardian(_hash3);
    expect(_isGuardian3).to.be.true;
  });
  it('Should execute', async function () {
    let _counter = await simpleHashGuardian.counter();
    expect(_counter).to.eq(0);
    let _proof = await generateProof(_account1);
    let _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      await simpleHashGuardian.verifyGuardian(pA, pB, pC, pubSignals);
      _counter = await simpleHashGuardian.counter();
      expect(_counter).to.eq(1);
    }

    _proof = await generateProof(_account1);
    _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      await simpleHashGuardian.verifyGuardian(pA, pB, pC, pubSignals);
      _counter = await simpleHashGuardian.counter();
      expect(_counter).to.eq(2);

      _proof = await generateProof(_account4);
      _verify = await verifyProof(_proof.proof, _proof.publicSignals);
      expect(_verify).to.be.true;
      if (_verify) {
        const { pA, pB, pC, pubSignals } = await generateCalldata(
          _proof.proof,
          _proof.publicSignals
        );
        await expect(simpleHashGuardian.verifyGuardian(pA, pB, pC, pubSignals)).to.be.revertedWith(
          "Verifier isn't a guardian"
        );
      }
    }
  });
});
