pragma circom 2.0.6;
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";

template PoseidonTest(){
    signal input plainText;
    signal input hash;
    signal output out;

    component poseidon = Poseidon(1);
    component compare = IsEqual();

    poseidon.inputs[0] <== plainText;
    compare.in[0] <== poseidon.out;
    compare.in[1] <== hash;
    out <== compare.out;
}

component main {public [hash]} = PoseidonTest();