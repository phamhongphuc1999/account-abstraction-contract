pragma circom 2.0.6;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";

template Sha256Test(){
    signal input plainText[256];
    signal output hash[256];

    component sha256 = Sha256(256);
    sha256.in <== plainText;
    hash <== sha256.out;
}

component main = Sha256Test();
