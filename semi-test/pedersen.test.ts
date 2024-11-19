import { expect } from 'chai';
import { readFileSync } from 'fs';
import { groth16 } from 'snarkjs';
import { buffer2bits } from '../test/jubjub-util';
import { analyticTimes } from '../test/utils';

describe('DeepEvaluation', function () {
  it('Evaluate time to generating proof (pedersen hash function)', async function () {
    const times: Array<number> = [];
    const times1: Array<number> = [];
    let plainText = '123456789';
    while (plainText.length < 64) plainText = `0${plainText}`;
    const bPlainText = buffer2bits(Buffer.from(plainText, 'hex'));
    for (let i = 0; i < 10; i++) {
      console.log('turn: ', i + 1);
      const startTime = performance.now();
      const { proof, publicSignals } = await groth16.fullProve(
        { plainText: bPlainText },
        './circom/pedersen-test_js/pedersen-test.wasm',
        './circom/pedersen-test1.zkey'
      );
      const endTime = performance.now();
      times.push(endTime - startTime);
      const startTime1 = performance.now();
      const vKey = JSON.parse(
        readFileSync('./circom/pedersen-test_verification_key.json', 'utf-8')
      );
      const _verify = await groth16.verify(vKey, publicSignals, proof);
      const endTime1 = performance.now();
      times1.push(endTime1 - startTime1);
      expect(_verify).to.be.true;
      await new Promise((r) => setTimeout(r, 200));
    }
    analyticTimes(times, times1);
  });
});
