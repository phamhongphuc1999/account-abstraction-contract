include "../node_modules/circomlib/circuits/eddsa.circom";

template Guardians(){
    signal input address;

    signal input msg[80];
    signal input r8Sig[256];
    signal input sSig[256];

    signal output out;

    component eddsa = EdDSAVerifier(80);

    poseidon.inputs[0] <== address;
    compare.in[0] <== poseidon.out;
    compare.in[1] <== hash;
    out <== compare.out;
}

component main {public [hash]} = Guardians();
