pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/eddsa.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template Jubjub(n) {
  signal input msg[n];

  signal input A[256];
  signal input R8[256];
  signal input S[256];

  signal output out;

  component verifier = EdDSAVerifier(n);
  component bitToNum = Bits2Num(256);

  bitToNum.in <== A;
  out <== bitToNum.out;
  
  verifier.msg <== msg;
  verifier.A <== A;
  verifier.R8 <== R8;
  verifier.S <== S;
}

component main = Jubjub(80);
