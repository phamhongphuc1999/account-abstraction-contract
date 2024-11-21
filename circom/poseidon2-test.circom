pragma circom 2.0.0;

include "./hash-circuits/circuits/poseidon2/poseidon2_hash.circom";

template Poseidon2Test() {
  signal input plainText;
  signal output hash;

  component poseidon2 = Poseidon2_hash(1);
  poseidon2.inp[0] <== plainText;
  hash <== poseidon2.out;
}

component main = Poseidon2Test();
