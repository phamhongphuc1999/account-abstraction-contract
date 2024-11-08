import { buildBabyjub, buildEddsa, buildPoseidon } from 'circomlibjs';
import { BigNumberish } from 'ethers';
import { readFileSync } from 'fs';
import { Groth16Proof, PublicSignals, groth16 } from 'snarkjs';
import { PromiseOrValue } from '../typechain/common';

export function convertUint8ToString(_in: Uint8Array) {
  return Buffer.from(_in).toString('hex');
}

export function convertStringToUint8(_in: string) {
  return Uint8Array.from(Buffer.from(_in, 'hex'));
}

function buffer2bits(buff: Uint8Array) {
  const res = [];
  for (let i = 0; i < buff.length; i++) {
    for (let j = 0; j < 8; j++) {
      if ((buff[i] >> j) & 1) res.push(1n);
      else res.push(0n);
    }
  }
  return res;
}

export function convertBigIntsToNumber(
  _in: bigint[],
  _len: number,
  mode: 'normal' | 'hex' = 'normal'
) {
  let result: bigint = BigInt('0');
  let e2 = BigInt('1');
  for (let i = 0; i < _len; i++) {
    result += _in[i] * e2;
    e2 = e2 + e2;
  }
  return mode == 'normal' ? result.toString(16) : `0x${result.toString(16)}`;
}

export async function generatePoseidonHash(
  _address: string,
  mode: 'normal' | 'hex' = 'normal'
): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const res2 = poseidon([_address]);
  return mode == 'normal' ? String(F.toObject(res2)) : `0x${String(F.toObject(res2).toString(16))}`;
}

export async function generateWitness(message: string, privateKey: Uint8Array) {
  const eddsa = await buildEddsa();
  const babyJub = await buildBabyjub();
  const messageBytes = Buffer.from(message, 'hex');
  const signature = eddsa.signPedersen(privateKey, messageBytes);
  const pSignature = eddsa.packSignature(signature);
  const msgBits = buffer2bits(messageBytes);
  const r8Bits = buffer2bits(pSignature.slice(0, 32));
  const sBits = buffer2bits(pSignature.slice(32, 64));
  const pubKey = eddsa.prv2pub(privateKey);
  const pPubKey = babyJub.packPoint(pubKey);
  const aBits = buffer2bits(pPubKey);
  return { A: aBits, R8: r8Bits, S: sBits, msg: msgBits };
}

export async function generateProof(
  message: string,
  privateKey: Uint8Array
): Promise<{
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}> {
  const { A, R8, S, msg } = await generateWitness(message, privateKey);
  const { proof, publicSignals } = await groth16.fullProve(
    { msg, A, R8, S },
    './circom/guardian_js/guardian.wasm',
    './circom/guardian1.zkey'
  );
  return { proof, publicSignals };
}

export async function verifyProof(
  proof: Groth16Proof,
  publicSignals: PublicSignals
): Promise<boolean> {
  const vKey = JSON.parse(readFileSync('./circom/verification_key.json', 'utf-8'));
  const res = await groth16.verify(vKey, publicSignals, proof);
  return res;
}

interface ReturnType {
  pA: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
  pB: [
    [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>],
    [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>]
  ];
  pC: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
  pubSignals: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>];
}
export async function generateCalldata(
  proof: Groth16Proof,
  publicSignals: PublicSignals
): Promise<ReturnType> {
  const _call = await groth16.exportSolidityCallData(proof, publicSignals);
  const realCall = JSON.parse(`[${_call}]`) as [
    ReturnType['pA'],
    ReturnType['pB'],
    ReturnType['pC'],
    ReturnType['pubSignals']
  ];
  return { pA: realCall[0], pB: realCall[1], pC: realCall[2], pubSignals: realCall[3] };
}
