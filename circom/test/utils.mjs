/* eslint-disable no-undef */
import { buildPoseidon } from 'circomlibjs';

export function buffer2bits(buff) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) res.push(1n);
      else res.push(0n);
    }
  }
  return res;
}

export function makeVerifiedInput(recoveredAddress, increment) {
  let excludedAddress = recoveredAddress.toLowerCase();
  if (excludedAddress.slice(0, 2) == '0x') excludedAddress = excludedAddress.slice(2);
  while (excludedAddress.length < 48) excludedAddress = `0${excludedAddress}`;
  let sIncrement = parseInt(increment).toString(16);
  while (sIncrement.length < 16) sIncrement = `0${sIncrement}`;
  return `${sIncrement}${excludedAddress}`;
}

export async function generatePoseidonHash(_address, mode = 'normal') {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const res2 = poseidon([_address]);
  return mode == 'normal' ? String(F.toObject(res2)) : `0x${String(F.toObject(res2).toString(16))}`;
}

export function convertBigIntsToNumber(_in, _len, mode = 'normal') {
  let result = BigInt('0');
  let e2 = BigInt('1');
  for (let i = 0; i < _len; i++) {
    result += _in[i] * e2;
    e2 = e2 + e2;
  }
  return mode == 'normal' ? result.toString(16) : `0x${result.toString(16)}`;
}
