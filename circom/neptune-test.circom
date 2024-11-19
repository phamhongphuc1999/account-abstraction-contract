pragma circom 2.0.0;

include "../../../snarkjs_bench/circuits/neptune.circom";

template NeptuneTest() {
  signal input plainText;
  signal output hash;

  component neptune = Neptune(1, 1);
  neptune.inputs[0] <== plainText;
  hash <== neptune.outputs[0];
}

component main = NeptuneTest();
