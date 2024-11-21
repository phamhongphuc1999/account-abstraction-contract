import { assert } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import { buildBabyjub, buildEddsa } from 'circomlibjs';
import { writeFileSync } from 'fs';
import { resolve } from 'node:path';
import { buffer2bits, makeVerifiedInput } from './utils.mjs';

describe('EdDSA test', function () {
  let circuit;
  let eddsa;
  let babyJub;

  before(async () => {
    eddsa = await buildEddsa();
    babyJub = await buildBabyjub();
    circuit = await wasm_tester('../circom/eddsa_test.circom');
  });

  it('Sign a single 10 bytes from 0 to 9', async () => {
    const _address = '0x019b4EE7AD22FFD4c215e5F424FAf4c75577dc36';
    const _increment = '2';
    const message = makeVerifiedInput(_address, _increment);
    const messageBytes = Buffer.from(message, 'hex');

    const prvKey = Buffer.from(
      '0001020304050607080900010203040506070809000102030405060708090001',
      'hex'
    );

    const pubKey = eddsa.prv2pub(prvKey);
    const pPubKey = babyJub.packPoint(pubKey);

    const signature = eddsa.signPedersen(prvKey, messageBytes);
    const pSignature = eddsa.packSignature(signature);
    const uSignature = eddsa.unpackSignature(pSignature);

    assert(eddsa.verifyPedersen(messageBytes, uSignature, pubKey));

    const msgBits = buffer2bits(messageBytes);
    const r8Bits = buffer2bits(pSignature.slice(0, 32));
    const sBits = buffer2bits(pSignature.slice(32, 64));
    const aBits = buffer2bits(pPubKey);

    writeFileSync(
      resolve('eddsa_test_input.json'),
      JSON.stringify({
        msg: msgBits.map((item) => item.toString()),
        A: aBits.map((item) => item.toString()),
        R8: r8Bits.map((item) => item.toString()),
        S: sBits.map((item) => item.toString()),
      }),
      'utf-8'
    );

    const witness = await circuit.calculateWitness(
      { A: aBits, R8: r8Bits, S: sBits, msg: msgBits },
      true
    );
    await circuit.assertOut(witness, { out: msgBits });
    await circuit.checkConstraints(witness);
  });
});
