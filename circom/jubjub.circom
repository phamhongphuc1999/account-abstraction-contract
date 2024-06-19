pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/eddsa.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template Jubjub() {
  signal input msg[80];

  signal input A[256];
  signal input R8[256];
  signal input S[256];

  signal output outA;
  signal output outMsg;

  component bitAToNum = Bits2Num(256);
  component poseidon = Poseidon(1);
  bitAToNum.in <== A;
  poseidon.inputs[0] <== bitAToNum.out;

  outA <== poseidon.out;
  
  component verifier = EdDSAVerifier(80);
  verifier.msg <== msg;
  verifier.A <== A;
  verifier.R8 <== R8;
  verifier.S <== S;

  var lc1 = 0;
  for (var i = 0; i < 10; i++) {
    var index = i * 8;
    var temp1 = msg[index];
    temp1 += msg[index + 1] * 2;
    temp1 += msg[index + 2] * 4;
    temp1 += msg[index + 3] * 8;

    var temp2 = msg[index + 4];
    temp2 += msg[index + 5] * 2;
    temp2 += msg[index + 6] * 4;
    temp2 += msg[index + 7] * 8;

    lc1 = lc1 * 10 + temp2;
    lc1 = lc1 * 10 + temp1;
  }
  outMsg <== lc1;
}

component main = Jubjub();
