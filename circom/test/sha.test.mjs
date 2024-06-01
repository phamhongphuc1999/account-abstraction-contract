/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { wasm as wasm_tester } from 'circom_tester';
import { buildPoseidon } from 'circomlibjs';

describe('Poseidon Circuit test', function () {
  let poseidon;
  let F;
  let guardian;
  this.timeout(1000000);

  before(async () => {
    poseidon = await buildPoseidon();
    F = poseidon.F;
    guardian = await wasm_tester('circom/sha.circom');
  });

  it('Should check constrain of hash([1, 2]) t=6', async () => {
    const w = await guardian.calculateWitness({
      address: '0x871DBcE2b9923A35716e7E83ee402B535298538E',
      hash: '14120136755926736790223205100986072419081476037165823935957624819428889532463',
    });
    // const res2 = poseidon(['0x871DBcE2b9923A35716e7E83ee402B535298538E']);
    await guardian.assertOut(w, { out: 1 });
    await guardian.checkConstraints(w);
  });
});
