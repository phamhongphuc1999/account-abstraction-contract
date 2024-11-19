pragma circom 2.0.6;

include "../node_modules/circomlib/circuits/pedersen.circom";

template PedersenTest(){
    signal input plainText[256];
    signal output hash[2];

    component pedersen = Pedersen(256);
    pedersen.in <== plainText;
    hash <== pedersen.out;
}

component main = PedersenTest();