import { wasm as wasm_tester } from 'circom_tester';
import { writeFileSync } from 'fs';
import { resolve } from 'node:path';

describe('Poseidon circuit test', function () {
  let _circuit;
  this.timeout(1000000);

  before(async () => {
    _circuit = await wasm_tester('../circom/poseidon-test.circom');
  });
  it('Should check constrain', async () => {
    writeFileSync(
      resolve('poseidon-test_input.json'),
      JSON.stringify({ plainText: '123456789' }),
      'utf-8'
    );
    const witness = await _circuit.calculateWitness({ plainText: '123456789' });
    await _circuit.checkConstraints(witness);
  });
});
