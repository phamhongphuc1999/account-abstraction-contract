import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Verifier__factory } from '../typechain';
import { generateCalldata, generateProof, verifyProof } from './circom-utils';

describe('Verify', function () {
  const _account1 = '0x9A85752B25Cb26a1E42f8E095588e4647859Bc36';

  it('Should verify', async () => {
    let _proof = await generateProof(_account1);
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
