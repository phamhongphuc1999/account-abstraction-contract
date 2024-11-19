pragma circom 2.0.6;

include "./hash-circuits/circuits/keccak/keccak_bits.circom";

template Keccak256Test(){
    signal input plainText[256];
    signal output hash[256];

    component keccak256 = Keccak_256(256);
    keccak256.inp <== plainText;
    hash <== keccak256.out;
}

component main = Keccak256Test();
