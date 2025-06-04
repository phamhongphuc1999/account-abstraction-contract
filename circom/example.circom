template ExampleCircuit() {
    signal input c1;
    signal input c2;
    signal input c3;
    signal output g2;
    signal g1;

    g1 <== c1*c2;
    g2 <== g1 + (c1+c3);
}

component main = ExampleCircuit();