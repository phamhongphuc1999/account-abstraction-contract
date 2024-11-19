import { expect } from 'chai';
import {
  convertStringToUint8,
  generateProof,
  makeVerifiedInput,
  verifyProof,
} from '../test/jubjub-util';
import { analyticTimes } from '../test/utils';

describe('DeepEvaluation', function () {
  const _privateKey1 = 'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5';

  it('Evaluate time to generating proof (guardian circuit)', async function () {
    const times: Array<number> = [];
    const times1: Array<number> = [];
    for (let i = 0; i < 10; i++) {
      console.log('turn: ', i + 1);
      const evaluatedMessage = makeVerifiedInput(
        '0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36',
        i.toString()
      );
      const startTime = performance.now();
      const { proof, publicSignals } = await generateProof(
        evaluatedMessage,
        convertStringToUint8(_privateKey1)
      );
      const endTime = performance.now();
      times.push(endTime - startTime);
      const startTime1 = performance.now();
      const _verify = await verifyProof(proof, publicSignals);
      const endTime1 = performance.now();
      times1.push(endTime1 - startTime1);
      expect(_verify).to.be.true;
      await new Promise((r) => setTimeout(r, 200));
    }
    analyticTimes(times, times1);
  });
});
