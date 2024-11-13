pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/eddsa.circom";

template EddsaTest() {
  signal input msg[80];

  for (var i = 0; i < 80; i++) {
    log(msg[i]);
  }

  signal input A[256];
  signal input R8[256];
  signal input S[256];

  signal output out[80];

  component verifier = EdDSAVerifier(80);
  verifier.msg <== msg;
  verifier.A <== A;
  verifier.R8 <== R8;
  verifier.S <== S;

  out <== msg;
}

component main = EddsaTest();
