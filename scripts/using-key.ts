import * as elliptic from 'elliptic';

function hexStringToArrayBuffer(hexString: string) {
  // remove the leading 0x
  hexString = hexString.replace(/^0x/, '');

  // ensure even number of characters
  if (hexString.length % 2 != 0) {
    console.log('WARNING: expecting an even number of characters in the hexString');
  }

  // check for some non-hex characters
  var bad = hexString.match(/[G-Z\s]/i);
  if (bad) {
    console.log('WARNING: found non-hex characters', bad);
  }

  // split the string into pairs of octets
  const pairs = hexString.match(/[\dA-F]{2}/gi);

  // convert the octets to integers
  var integers = pairs?.map(function (s) {
    return parseInt(s, 16);
  });

  var array = new Uint8Array(integers!);
  console.log(array);

  return array.buffer;
}

function _test1() {
  const _pubKey = '871DBcE2b9923A35716e7E83ee402B535298538E';
  console.log('hexStringToArrayBuffer', hexStringToArrayBuffer(_pubKey));
}

function _test() {
  const ec = new elliptic.eddsa('ed25519');

  const keyPair = ec.keyFromSecret(elliptic.rand(32));
  const pubKey = keyPair.getPublic();
  const pubKeyHex = pubKey.toString('hex');
  console.log('🚀 ~ _test ~ pubKeyHex:', pubKeyHex);

  const pubKey_x = pubKeyHex.slice(0, 64);
  const pubKey_y = pubKeyHex.slice(64);

  const message = 'abcbcbcbc';

  const signature = keyPair.sign(message).toHex();

  const sig_R = signature.slice(0, 32);
  const sig_S = signature.slice(32);

  console.log('Public Key X:', pubKey_x);
  console.log('Public Key Y:', pubKey_y);
  console.log('Message:', message);
  console.log('Signature R:', sig_R);
  console.log('Signature S:', sig_S);
}

_test1();
