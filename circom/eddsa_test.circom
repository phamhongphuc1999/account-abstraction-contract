pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/eddsa.circom";

template EddsaTest() {
  signal input msg[256];

  signal input A[256];
  signal input R8[256];
  signal input S[256];

  signal output out[256];

  component verifier = EdDSAVerifier(256);
  verifier.msg <== msg;
  verifier.A <== A;
  verifier.R8 <== R8;
  verifier.S <== S;

  out <== msg;
}

component main = EddsaTest();
