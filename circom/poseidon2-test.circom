pragma circom 2.0.0;

include "../../../snarkjs_bench/circuits/poseidon2.circom";

template Poseidon2Test() {
  signal input plainText;
  signal output hash;

  component poseidon2 = Poseidon2(1, 1);
  poseidon2.inputs[0] <== plainText;
  hash <== poseidon2.out[0];
}

component main = Poseidon2Test();
