pragma circom 2.0.0;

template AnalyticMessage(begin, end) {
  signal input msg[256];

  signal output result;

  var _total = 0;
  var multiplicationLevel = 1;

  for (var i = end; i >= begin; i--) {
    var index = i * 8 + 7;
    var piece = msg[index];
    piece = piece * 2 + msg[index - 1];
    piece = piece * 2 + msg[index - 2];
    piece = piece * 2 + msg[index - 3];
    piece = piece * 2 + msg[index - 4];
    piece = piece * 2 + msg[index - 5];
    piece = piece * 2 + msg[index - 6];
    piece = piece * 2 + msg[index - 7];
    _total = _total + piece * multiplicationLevel;
    multiplicationLevel = multiplicationLevel * 256;
  }
  result <== _total;
}