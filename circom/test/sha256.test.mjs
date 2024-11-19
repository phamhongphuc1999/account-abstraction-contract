import { wasm as wasm_tester } from 'circom_tester';
import { writeFileSync } from 'fs';
import { resolve } from 'node:path';
import { buffer2bits } from './utils.mjs';

describe('SHA256 circuit test', function () {
  let _circuit;

  before(async () => {
    _circuit = await wasm_tester('../circom/sha256-test.circom');
  });
  it('Should check constrain', async () => {
    let plainText = '123456789';
    while (plainText.length < 64) plainText = `0${plainText}`;
    plainText = buffer2bits(Buffer.from(plainText, 'hex'));

    writeFileSync(resolve('sha256-test_input.json'), JSON.stringify({ plainText }), 'utf-8');

    const witness = await _circuit.calculateWitness({ plainText });
    await _circuit.checkConstraints(witness);
  });
});
