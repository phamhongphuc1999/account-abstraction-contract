pragma circom 2.0.0;

template XorCircuit() {
    signal input x;
    signal input y;

    signal t1 <== x + y;
    signal t2 <== x * y;
    signal t3 <== -2 * t2;
    
    signal output t4 <== t1 + t3;
}

component main = XorCircuit();