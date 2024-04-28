// define the same export types as used by export typechain/ethers
import { BigNumberish } from 'ethers';
import { BytesLike } from '@ethersproject/bytes';

export type address = string;
export type uint256 = BigNumberish;
export type uint = BigNumberish;
export type uint48 = BigNumberish;
export type uint128 = BigNumberish;
export type bytes = BytesLike;
export type bytes32 = BytesLike;

export interface UserOperation {
  sender: address;
  nonce: uint256;
  initCode: bytes;
  callData: bytes;
  callGasLimit: uint128;
  verificationGasLimit: uint128;
  preVerificationGas: uint256;
  maxFeePerGas: uint256;
  maxPriorityFeePerGas: uint256;
  paymaster: address;
  paymasterVerificationGasLimit: uint128;
  paymasterPostOpGasLimit: uint128;
  paymasterData: bytes;
  signature: bytes;
}

export interface PackedUserOperation {
  sender: address;
  nonce: uint256;
  initCode: bytes;
  callData: bytes;
  accountGasLimits: bytes32;
  preVerificationGas: uint256;
  gasFees: bytes32;
  paymasterAndData: bytes;
  signature: bytes;
}
