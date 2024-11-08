pragma circom 2.0.6;

include "./hash-function/keccak256/keccak256.circom";

template Keccak256Test(){
    signal input plainText[256];
    signal output hash[256];

    component keccak256 = Keccak(256, 256);
    keccak256.in <== plainText;
    hash <== keccak256.out;
}

component main = Keccak256Test();
