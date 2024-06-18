pragma circom 2.0.0;

template Bits() {
  signal input msg[80];
  signal output out;
  var lc1 = 0;

  for (var i = 0; i < 10; i++) {
    var index = i * 8;
    var temp1 = msg[index];
    temp1 += msg[index + 1] * 2;
    temp1 += msg[index + 2] * 4;
    temp1 += msg[index + 3] * 8;

    var temp2 = msg[index + 4];
    temp2 += msg[index + 5] * 2;
    temp2 += msg[index + 6] * 4;
    temp2 += msg[index + 7] * 8;

    lc1 = lc1 * 10 + temp2;
    lc1 = lc1 * 10 + temp1;
  }
  out <== lc1;
}

component main = Bits();
