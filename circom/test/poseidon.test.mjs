/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { wasm as wasm_tester } from 'circom_tester';
import { buildPoseidon } from 'circomlibjs';

describe('Poseidon circuit test', function () {
  let poseidon;
  let F;
  let _circuit;
  this.timeout(1000000);

  before(async () => {
    poseidon = await buildPoseidon();
    F = poseidon.F;
    _circuit = await wasm_tester('./test/circuits/hash-verification/poseidon-test.circom');
  });
  it('Should check constrain', async () => {
    const witness = await _circuit.calculateWitness({
      plainText: '0x871DBcE2b9923A35716e7E83ee402B535298538E',
    });
    await _circuit.checkConstraints(witness);
  });
});
