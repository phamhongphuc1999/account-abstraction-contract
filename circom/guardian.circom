pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/eddsa.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./analytic-message.circom";

template Guardian() {
  signal input msg[256];

  signal input A[256];
  signal input R8[256];
  signal input S[256];

  signal output hashPublicKey;
  signal output increment;
  signal output address;

  component bitAToNum = Bits2Num(256);
  component poseidon = Poseidon(1);
  bitAToNum.in <== A;
  poseidon.inputs[0] <== bitAToNum.out;

  hashPublicKey <== poseidon.out;
  
  component verifier = EdDSAVerifier(256);
  verifier.msg <== msg;
  verifier.A <== A;
  verifier.R8 <== R8;
  verifier.S <== S;

  component incrementAnalytic = AnalyticMessage(0, 7);
  incrementAnalytic.msg <== msg;
  increment <== incrementAnalytic.result;

  component addressAnalytic = AnalyticMessage(8, 31);
  addressAnalytic.msg <== msg;
  address <== addressAnalytic.result;
}

component main = Guardian();
