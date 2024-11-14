pragma circom 2.0.6;

include "../../../../node_modules/circomlib/circuits/poseidon.circom";

template PoseidonTest(){
	signal input plainText;
	signal output hash;

	component poseidon = Poseidon(1);
	poseidon.inputs[0] <== plainText;
	hash <== poseidon.out;
}

component main = PoseidonTest();