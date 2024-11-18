import { expect } from 'chai';
import {
  convertStringToUint8,
  generateProof,
  makeVerifiedInput,
  verifyProof,
} from '../jubjub-util';

describe('DeepEvaluation', function () {
  const _privateKey1 = 'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5';

  it('Evaluate time to generating proof', async function () {
    const times: Array<number> = [];
    const times1: Array<number> = [];
    for (let i = 0; i < 10; i++) {
      console.log('turn: ', i + 1);
      const evaluatedMessage = makeVerifiedInput(
        '0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36',
        i.toString()
      );
      const startTime = performance.now();
      const _proof = await generateProof(evaluatedMessage, convertStringToUint8(_privateKey1));
      const endTime = performance.now();
      times.push(endTime - startTime);
      const startTime1 = performance.now();
      const _verify = await verifyProof(_proof.proof, _proof.publicSignals);
      const endTime1 = performance.now();
      times1.push(endTime1 - startTime1);
      expect(_verify).to.be.true;
      await new Promise((r) => setTimeout(r, 1000));
    }
    const sortedTimes = [...times].sort((x, y) => (x > y ? 1 : -1));
    const averageTime = times.reduce((a, b) => a + b) / 10;
    const averageTime1 = times1.reduce((a, b) => a + b) / 10;
    console.log('times: ', sortedTimes, times);
    console.log('averageTime: ', averageTime);
    console.log('times1: ', times1);
    console.log('averageTime1: ', averageTime1);
  });
});
