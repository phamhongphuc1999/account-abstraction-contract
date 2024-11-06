/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { wasm as wasm_tester } from 'circom_tester';
import { buildPoseidon } from 'circomlibjs';

const witness1 = {
  plainText: '0x871DBcE2b9923A35716e7E83ee402B535298538E',
  hash: '14120136755926736790223205100986072419081476037165823935957624819428889532463',
};
const witness2 = {
  plainText: '12345',
  hash: '4267533774488295900887461483015112262021273608761099826938271132511348470966',
};

describe('Poseidon circuit test', function () {
  let poseidon;
  let F;
  let poseidonTest;
  this.timeout(1000000);

  before(async () => {
    poseidon = await buildPoseidon();
    F = poseidon.F;
    poseidonTest = await wasm_tester('./test/circuits/poseidon.circom');
  });
  it('Should check constrain', async () => {
    const w = await poseidonTest.calculateWitness(witness2);
    // const res2 = poseidon(['0x871DBcE2b9923A35716e7E83ee402B535298538E']);
    // console.error(res2);
    await poseidonTest.assertOut(w, { out: 1 });
    await poseidonTest.checkConstraints(w);
  });
});
