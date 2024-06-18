import { wasm as wasm_tester } from 'circom_tester';
import { buffer2bits } from './eddsa.test.mjs';

describe('Bits test', function (){
  let circuit;

  before(async () => {
    circuit = await wasm_tester('circom/test/circuits/bits.circom');
  })

  it ('number one', async () => {
    const message = "10000004700001234589";
    const messageBytes = Buffer.from(message, 'hex');
    const msgBits = buffer2bits(messageBytes);

    const w = await circuit.calculateWitness(
      { msg: msgBits },
      true
    );
    console.log(await circuit.checkConstraints(w));
  })
})