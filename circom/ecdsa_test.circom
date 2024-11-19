pragma circom 2.0.0;

include "../circom-ecdsa/circuits/ecdsa.circom";

template EcdsaTest() {
  signal input r[4];
  signal input s[4];
  signal input msghash[4];
  signal input pubkey[2][4];

  signal output result;

  component verifier = ECDSAVerifyNoPubkeyCheck(64, 4);
  verifier.r <== r;
  verifier.s <== s;
  verifier.msghash <== msghash;
  verifier.pubkey <== pubkey;

  result <== verifier.result;
}

component main = EcdsaTest();
