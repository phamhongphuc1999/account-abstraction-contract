import { wasm as wasm_tester } from 'circom_tester';
import { writeFileSync } from 'fs';
import { resolve } from 'node:path';
import { buffer2bits } from './utils.mjs';

describe('Keccak256 circuit test', function () {
  let circuit;

  before(async () => {
    circuit = await wasm_tester('../circom/keccak256-test.circom');
  });
  it('Should check constrain', async () => {
    let plainText = '123456789';
    while (plainText.length < 64) plainText = `0${plainText}`;
    plainText = buffer2bits(Buffer.from(plainText, 'hex'));

    writeFileSync(resolve('keccak256-test_input.json'), JSON.stringify({ plainText }), 'utf-8');

    const witness = await circuit.calculateWitness({ plainText });
    // await circuit.assertOut(witness, { hash: '123' });
    await circuit.checkConstraints(witness);
  });
});
