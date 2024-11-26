import { Point, sign } from '@noble/secp256k1';
import { wasm as wasm_tester } from 'circom_tester';
import { writeFileSync } from 'fs';
import { resolve } from 'node:path';
import { bigint_to_array, bigint_to_Uint8Array, Uint8Array_to_bigint } from './utils.mjs';

describe('ECDSA test', function () {
  this.timeout(1000 * 1000);
  let circuit;

  before(async () => {
    circuit = await wasm_tester('../circom/ecdsa_test.circom');
  });

  it('Verify ECDSA signature', async () => {
    const privKey = 88549154299169935420064281163296845505587953610183896504176354567359434168161n;
    const pubKey = Point.fromPrivateKey(privKey);
    console.log('🚀 ~ it ~ pubKey:', pubKey);
    const msghash_bigint = 1234n;

    var msghash = bigint_to_Uint8Array(msghash_bigint);
    var sig = await sign(msghash, bigint_to_Uint8Array(privKey), { canonical: true, der: false });

    var r = sig.slice(0, 32);
    var r_bigint = Uint8Array_to_bigint(r);
    var s = sig.slice(32, 64);
    var s_bigint = Uint8Array_to_bigint(s);

    var r_array = bigint_to_array(64, 4, r_bigint + 1n);
    var s_array = bigint_to_array(64, 4, s_bigint);
    var msghash_array = bigint_to_array(64, 4, msghash_bigint);
    var pub0_array = bigint_to_array(64, 4, pubKey.x);
    var pub1_array = bigint_to_array(64, 4, pubKey.y);

    writeFileSync(
      resolve('ecdsa_test_input.json'),
      JSON.stringify({
        r: r_array,
        s: s_array,
        msghash: msghash_array,
        pubkey: [pub0_array, pub1_array],
      }),
      'utf-8'
    );

    const witness = await circuit.calculateWitness({
      r: r_array,
      s: s_array,
      msghash: msghash_array,
      pubkey: [pub0_array, pub1_array],
    });
    await circuit.assertOut(witness, { result: 0n });
    await circuit.checkConstraints(witness);
  });
});
