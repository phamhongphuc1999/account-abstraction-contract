import { BytesLike } from '@ethersproject/bytes';
import { BigNumberish } from 'ethers';

export type address = string;
export type uint256 = BigNumberish;
export type uint = BigNumberish;
export type uint48 = BigNumberish;
export type bytes = BytesLike;
export type bytes32 = BytesLike;

export interface UserOperation {
  sender: address;
  nonce: uint256;
  initCode: bytes;
  callData: bytes;
  callGasLimit: uint256;
  verificationGasLimit: uint256;
  preVerificationGas: uint256;
  maxFeePerGas: uint256;
  maxPriorityFeePerGas: uint256;
  paymasterAndData: bytes;
  signature: bytes;
}
