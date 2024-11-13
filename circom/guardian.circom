pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/eddsa.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

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

  var iTotal = 0;
  var multiplicationLevel = 1;

  for (var i = 7; i >= 0; i--) {
    var index = i * 8 + 7;
    var piece = msg[index];
    piece = piece * 2 + msg[index - 1];
    piece = piece * 2 + msg[index - 2];
    piece = piece * 2 + msg[index - 3];
    piece = piece * 2 + msg[index - 4];
    piece = piece * 2 + msg[index - 5];
    piece = piece * 2 + msg[index - 6];
    piece = piece * 2 + msg[index - 7];
    iTotal = iTotal + piece * multiplicationLevel;
    multiplicationLevel = multiplicationLevel * 256;
  }
  increment <== iTotal;
  
  var aTotal = 0;
  multiplicationLevel = 1;
  
  for (var i = 31; i >= 8; i--) {
    var index = i * 8 + 7;
    var piece = msg[index];
    piece = piece * 2 + msg[index - 1];
    piece = piece * 2 + msg[index - 2];
    piece = piece * 2 + msg[index - 3];
    piece = piece * 2 + msg[index - 4];
    piece = piece * 2 + msg[index - 5];
    piece = piece * 2 + msg[index - 6];
    piece = piece * 2 + msg[index - 7];
    aTotal = aTotal + piece * multiplicationLevel;
    multiplicationLevel = multiplicationLevel * 256;
  }
  address <== aTotal;
}

component main = Guardian();
