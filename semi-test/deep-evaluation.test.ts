import { expect } from 'chai';
import { groth16 } from 'snarkjs';
import {
  buffer2bits,
  convertStringToUint8,
  generateProof,
  makeVerifiedInput,
  verifyProof,
} from '../test/jubjub-util';
import { readFileSync } from 'fs';

function analyticTimes(times: Array<number>, times1: Array<number>) {
  const sortedTimes = [...times].sort((x, y) => (x > y ? 1 : -1));
  const averageTime = times.reduce((a, b) => a + b) / 10;
  const averageTime1 = times1.reduce((a, b) => a + b) / 10;
  console.log('times: ', sortedTimes, times);
  console.log('average generation proof time: ', averageTime);
  console.log('times1: ', times1);
  console.log('average verification time: ', averageTime1);
}

describe('DeepEvaluation', function () {
  const _privateKey1 = 'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5';

  // it('Evaluate time to generating proof (guardian circuit)', async function () {
  //   const times: Array<number> = [];
  //   const times1: Array<number> = [];
  //   for (let i = 0; i < 10; i++) {
  //     console.log('turn: ', i + 1);
  //     const evaluatedMessage = makeVerifiedInput(
  //       '0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36',
  //       i.toString()
  //     );
  //     const startTime = performance.now();
  //     const {proof, publicSignals} = await generateProof(evaluatedMessage, convertStringToUint8(_privateKey1));
  //     const endTime = performance.now();
  //     times.push(endTime - startTime);
  //     const startTime1 = performance.now();
  //     const _verify = await verifyProof(proof, publicSignals);
  //     const endTime1 = performance.now();
  //     times1.push(endTime1 - startTime1);
  //     expect(_verify).to.be.true;
  //     await new Promise((r) => setTimeout(r, 200));
  //   }
  //   analyticTimes(times, times1)
  // });

  // it('Evaluate time to generating proof (poseidon hash function)', async function () {
  //   const times: Array<number> = [];
  //   const times1: Array<number> = [];
  //   for (let i = 0; i < 10; i++) {
  //     console.log('turn: ', i + 1);
  //     const startTime = performance.now();
  //     const { proof, publicSignals } = await groth16.fullProve(
  //       { plainText: '123456789' },
  //       './circom/poseidon-test_js/poseidon-test.wasm',
  //       './circom/poseidon-test1.zkey'
  //     );
  //     const endTime = performance.now();
  //     times.push(endTime - startTime);
  //     const startTime1 = performance.now();
  //     const vKey = JSON.parse(
  //       readFileSync('./circom/poseidon-test_verification_key.json', 'utf-8')
  //     );
  //     const _verify = await groth16.verify(vKey, publicSignals, proof);
  //     const endTime1 = performance.now();
  //     times1.push(endTime1 - startTime1);
  //     expect(_verify).to.be.true;
  //     await new Promise((r) => setTimeout(r, 200));
  //   }
  //   analyticTimes(times, times1);
  // });

  // it('Evaluate time to generating proof (pedersen hash function)', async function () {
  //   const times: Array<number> = [];
  //   const times1: Array<number> = [];
  //   let plainText = '123456789';
  //   while (plainText.length < 64) plainText = `0${plainText}`;
  //   const bPlainText = buffer2bits(Buffer.from(plainText, 'hex'));
  //   for (let i = 0; i < 10; i++) {
  //     console.log('turn: ', i + 1);
  //     const startTime = performance.now();
  //     const { proof, publicSignals } = await groth16.fullProve(
  //       { plainText: bPlainText },
  //       './circom/pedersen-test_js/pedersen-test.wasm',
  //       './circom/pedersen-test1.zkey'
  //     );
  //     const endTime = performance.now();
  //     times.push(endTime - startTime);
  //     const startTime1 = performance.now();
  //     const vKey = JSON.parse(
  //       readFileSync('./circom/pedersen-test_verification_key.json', 'utf-8')
  //     );
  //     const _verify = await groth16.verify(vKey, publicSignals, proof);
  //     const endTime1 = performance.now();
  //     times1.push(endTime1 - startTime1);
  //     expect(_verify).to.be.true;
  //     await new Promise((r) => setTimeout(r, 200));
  //   }
  //   analyticTimes(times, times1);
  // });

  it('Evaluate time to generating proof (keccak hash function)', async function () {
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
        './circom/keccak256-test_js/keccak256-test.wasm',
        './circom/keccak256-test1.zkey'
      );
      const endTime = performance.now();
      times.push(endTime - startTime);
      const startTime1 = performance.now();
      const vKey = JSON.parse(
        readFileSync('./circom/keccak256-test_verification_key.json', 'utf-8')
      );
      const _verify = await groth16.verify(vKey, publicSignals, proof);
      const endTime1 = performance.now();
      times1.push(endTime1 - startTime1);
      expect(_verify).to.be.true;
      await new Promise((r) => setTimeout(r, 200));
    }
    analyticTimes(times, times1);
  }).timeout(1000000);
});
