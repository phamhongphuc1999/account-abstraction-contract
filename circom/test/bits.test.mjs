import { wasm as wasm_tester } from 'circom_tester';
import { buffer2bits, makeVerifiedInput } from './utils.mjs';

describe('Bits test', function () {
  let circuit;

  before(async () => {
    circuit = await wasm_tester('test/circuits/bits.circom');
  });

  it('number one', async () => {
    const message = makeVerifiedInput('0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36', '2');
    const messageBytes = Buffer.from(message, 'hex');
    const msgBits = buffer2bits(messageBytes);

    const witness = await circuit.calculateWitness({ msg: msgBits }, true);
    await circuit.assertOut(witness, {
      increment: '2',
      address: '9172479870263692382061256538628018494823193654',
    });
    await circuit.checkConstraints(witness);
  });
});
