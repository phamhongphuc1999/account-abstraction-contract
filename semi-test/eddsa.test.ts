import { expect } from 'chai';
import { readFileSync } from 'fs';
import { groth16 } from 'snarkjs';
import { convertStringToUint8, generateWitness, makeVerifiedInput } from '../test/jubjub-util';
import { analyticTimes } from '../test/utils';

describe('EdDSA evaluation', function () {
  const _privateKey1 = 'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5';

  it('Evaluate time to generating proof (EdDSA circuit)', async function () {
    const times: Array<number> = [];
    const times1: Array<number> = [];
    for (let i = 0; i < 10; i++) {
      console.log('turn: ', i + 1);
      const evaluatedMessage = makeVerifiedInput(
        '0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36',
        i.toString()
      );
      const startTime = performance.now();
      const { A, R8, S, msg } = await generateWitness(
        evaluatedMessage,
        convertStringToUint8(_privateKey1)
      );
      const { proof, publicSignals } = await groth16.fullProve(
        { msg, A, R8, S },
        './circom/eddsa_test_js/eddsa_test.wasm',
        './circom/eddsa_test1.zkey'
      );
      const endTime = performance.now();
      times.push(endTime - startTime);
      const startTime1 = performance.now();
      const vKey = JSON.parse(readFileSync('./circom/eddsa_test_verification_key.json', 'utf-8'));
      const _verify = await groth16.verify(vKey, publicSignals, proof);
      const endTime1 = performance.now();
      times1.push(endTime1 - startTime1);
      expect(_verify).to.be.true;
      await new Promise((r) => setTimeout(r, 200));
    }
    analyticTimes(times, times1);
  });
});
