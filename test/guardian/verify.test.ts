import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Verifier__factory } from '../../typechain';
import {
  convertStringToUint8,
  generateCalldata,
  generateProof,
  makeVerifiedInput,
  verifyProof,
} from '../jubjub-util';

describe('Verify', function () {
  it('Should verify', async () => {
    const _privateKey = convertStringToUint8(
      'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5'
    );
    const message = makeVerifiedInput('0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36', '2');
    let _proof = await generateProof(message, _privateKey);
    let _verify = await verifyProof(_proof.proof, _proof.publicSignals);
    expect(_verify).to.be.true;
    if (_verify) {
      const { pA, pB, pC, pubSignals } = await generateCalldata(_proof.proof, _proof.publicSignals);
      const etherSigner = ethers.provider.getSigner();
      const verifier = await new Verifier__factory(etherSigner).deploy();
      const isVerify = await verifier.verifyProof(pA, pB, pC, pubSignals);
      expect(isVerify).to.be.true;
    }
  });
});
