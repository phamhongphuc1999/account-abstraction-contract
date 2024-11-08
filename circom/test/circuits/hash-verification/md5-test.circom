pragma circom 2.0.6;

include "./hash-function/raw-md5.circom";

template Md5Test(){
    signal input plainText[16];
    signal output hash[4];

    component md5 = Md5();
    md5.in <== plainText;
    hash <== md5.out;
}

component main = Md5Test();
