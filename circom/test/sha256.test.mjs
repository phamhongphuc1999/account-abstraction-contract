/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { wasm as wasm_tester } from 'circom_tester';

describe('SHA256 circuit test', function () {
  let _circuit;

  before(async () => {
    _circuit = await wasm_tester('./test/circuits/hash-verification/sha256-test.circom');
  });
  it('Should check constrain', async () => {
    const witness = await _circuit.calculateWitness({ plainText: '1111' });
    await _circuit.checkConstraints(witness);
  });
});
