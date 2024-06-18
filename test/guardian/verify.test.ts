import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Verifier__factory } from '../../typechain';
import { convertStringToUint8, generateCalldata, generateProof, verifyProof } from '../jubjub-util';

describe('Verify', function () {
  const _account1 = '0x9A85752B25Cb26a1E42f8E095588e4647859Bc36';

  it('Should verify', async () => {
    const _privateKey = convertStringToUint8(
      'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5'
    );
    let _proof = await generateProof('000540000000000362701', _privateKey);
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
