pragma circom 2.0.0;

template CalculationMessage() {
  signal input msg[256];

  signal output increment;
  signal output address;

  var iTotal = 0;
  var multiplicationLevel = 1;

  for (var i = 7; i >= 0; i--) {
    var index = i * 8 + 7;
    var piece = msg[index];
    piece = piece * 2 + msg[index - 1];
    piece = piece * 2 + msg[index - 2];
    piece = piece * 2 + msg[index - 3];
    piece = piece * 2 + msg[index - 4];
    piece = piece * 2 + msg[index - 5];
    piece = piece * 2 + msg[index - 6];
    piece = piece * 2 + msg[index - 7];
    iTotal = iTotal + piece * multiplicationLevel;
    multiplicationLevel = multiplicationLevel * 256;
  }
  increment <== iTotal;
  
  var aTotal = 0;
  multiplicationLevel = 1;
  
  for (var i = 31; i >= 8; i--) {
    var index = i * 8 + 7;
    var piece = msg[index];
    piece = piece * 2 + msg[index - 1];
    piece = piece * 2 + msg[index - 2];
    piece = piece * 2 + msg[index - 3];
    piece = piece * 2 + msg[index - 4];
    piece = piece * 2 + msg[index - 5];
    piece = piece * 2 + msg[index - 6];
    piece = piece * 2 + msg[index - 7];
    aTotal = aTotal + piece * multiplicationLevel;
    multiplicationLevel = multiplicationLevel * 256;
  }
  address <== aTotal;
}