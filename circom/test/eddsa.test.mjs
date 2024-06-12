import { assert } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import { buildBabyjub, buildEddsa } from 'circomlibjs';

function buffer2bits(buff) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) res.push(1n);
      else res.push(0n);
    }
  }
  return res;
}

describe('EdDSA test', function () {
  let circuit;
  let eddsa;
  let babyJub;

  this.timeout(100000);

  before(async () => {
    eddsa = await buildEddsa();
    babyJub = await buildBabyjub();
    circuit = await wasm_tester('circom/test/circuits/eddsa_test.circom');
  });

  it('Sign a single 10 bytes from 0 to 9', async () => {
    const msg = Buffer.from('00010203040506070809', 'hex');
    console.log('msg', msg);

    const prvKey = Buffer.from(
      '0001020304050607080900010203040506070809000102030405060708090001',
      'hex'
    );
    console.log('prvKey', prvKey);

    const pubKey = eddsa.prv2pub(prvKey);
    console.log('pubKey', pubKey);
    const pPubKey = babyJub.packPoint(pubKey);
    console.log('pPubKey', pPubKey);

    const signature = eddsa.signPedersen(prvKey, msg);
    const pSignature = eddsa.packSignature(signature);
    const uSignature = eddsa.unpackSignature(pSignature);

    assert(eddsa.verifyPedersen(msg, uSignature, pubKey));

    const msgBits = buffer2bits(msg);
    console.log('msgBits', msgBits, msgBits.length);
    const r8Bits = buffer2bits(pSignature.slice(0, 32));
    const sBits = buffer2bits(pSignature.slice(32, 64));
    console.log('r8Bitsr8Bitsr8Bits', r8Bits, sBits);
    const aBits = buffer2bits(pPubKey);

    const w = await circuit.calculateWitness(
      { A: aBits, R8: r8Bits, S: sBits, msg: msgBits },
      true
    );

    await circuit.checkConstraints(w);
  });
});
