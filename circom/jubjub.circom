pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/eddsa.circom";

template Jubjub(n) {
  signal input msg[n];

  signal input A[256];
  signal input R8[256];
  signal input S[256];

  signal output out;

  component verifier = EdDSAVerifier(n);
  
  verifier.msg <== msg;
  verifier.A <== A;
  verifier.R8 <== R8;
  verifier.S <== S;

  out <== 0;
  for (var i = 0; i < 256; i++) {
    out <== out * 10 + A[i];
  }
}

component main {public [A]} = Jubjub(80);
