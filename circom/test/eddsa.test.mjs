import { assert } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import { buildBabyjub, buildEddsa } from 'circomlibjs';
import { buffer2bits } from './utils.mjs';

describe('EdDSA test', function () {
  let circuit;
  let eddsa;
  let babyJub;

  before(async () => {
    eddsa = await buildEddsa();
    babyJub = await buildBabyjub();
    circuit = await wasm_tester('test/circuits/eddsa_test.circom');
  });

  it('Sign a single 10 bytes from 0 to 9', async () => {
    const msg = Buffer.from('000000000000000000cd', 'hex');

    const prvKey = Buffer.from(
      '0001020304050607080900010203040506070809000102030405060708090001',
      'hex'
    );

    const pubKey = eddsa.prv2pub(prvKey);
    const pPubKey = babyJub.packPoint(pubKey);

    const signature = eddsa.signPedersen(prvKey, msg);
    const pSignature = eddsa.packSignature(signature);
    const uSignature = eddsa.unpackSignature(pSignature);

    assert(eddsa.verifyPedersen(msg, uSignature, pubKey));

    const msgBits = buffer2bits(msg);
    const r8Bits = buffer2bits(pSignature.slice(0, 32));
    const sBits = buffer2bits(pSignature.slice(32, 64));
    const aBits = buffer2bits(pPubKey);

    const witness = await circuit.calculateWitness(
      { A: aBits, R8: r8Bits, S: sBits, msg: msgBits },
      true
    );
    await circuit.assertOut(witness, { out: msgBits });
    await circuit.checkConstraints(witness);
  });
});
