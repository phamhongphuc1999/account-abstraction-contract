import { buildPoseidon } from 'circomlibjs';
import { BigNumberish } from 'ethers';
import { readFileSync } from 'fs';
import { Groth16Proof, PublicSignals, groth16 } from 'snarkjs';
import { PromiseOrValue } from '../typechain/common';

export async function generatePoseidonHash(
  _address: string,
  mode: 'normal' | 'hex' = 'normal'
): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const res2 = poseidon([_address]);
  return mode == 'normal' ? String(F.toObject(res2)) : `0x${String(F.toObject(res2).toString(16))}`;
}

export async function generateProof(_address: string): Promise<{
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}> {
  const _hash = await generatePoseidonHash(_address);
  const { proof, publicSignals } = await groth16.fullProve(
    { address: _address, hash: _hash },
    './circom/sha_js/sha.wasm',
    './circom/sha1.zkey'
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
