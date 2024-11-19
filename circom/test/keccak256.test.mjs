import { wasm as wasm_tester } from 'circom_tester';
import { buffer2bits } from './utils.mjs';
import { writeFileSync } from 'fs';
import { resolve } from 'node:path';

describe('Keccak256 circuit test', function () {
  let _circuit;
  this.timeout(1000000);

  before(async () => {
    _circuit = await wasm_tester('../circom/keccak256-test.circom');
  });
  it('Should check constrain', async () => {
    let plainText = '123456789';
    while (plainText.length < 64) plainText = `0${plainText}`;
    plainText = buffer2bits(Buffer.from(plainText, 'hex'));
    console.log(plainText, plainText.length);

    writeFileSync(resolve('input.json'), JSON.stringify({ plainText }), 'utf-8');

    const witness = await _circuit.calculateWitness({ plainText });
    await _circuit.checkConstraints(witness);
  });
});
