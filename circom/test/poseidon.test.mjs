import { wasm as wasm_tester } from 'circom_tester';

describe('Poseidon circuit test', function () {
  let _circuit;
  this.timeout(1000000);

  before(async () => {
    _circuit = await wasm_tester('../circom/poseidon-test.circom');
  });
  it('Should check constrain', async () => {
    const witness = await _circuit.calculateWitness({ plainText: '123456789' });
    await _circuit.checkConstraints(witness);
  });
});
