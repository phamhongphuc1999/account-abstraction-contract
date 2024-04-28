import { ecsign, keccak256 as keccak256_buffer, toRpcSig } from 'ethereumjs-util';
import { BigNumber, BigNumberish, Contract, Signer, Wallet } from 'ethers';
import {
  BytesLike,
  Hexable,
  Interface,
  arrayify,
  defaultAbiCoder,
  hexDataSlice,
  hexZeroPad,
  hexlify,
  keccak256,
  parseEther,
} from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  Account,
  AccountFactory,
  AccountFactory__factory,
  Account__factory,
  ERC1967Proxy__factory,
  SimpleEntryPoint,
  SimpleEntryPoint__factory,
  TestERC20__factory,
  TestPaymasterRevertCustomError__factory,
} from '../typechain';
import { PackedUserOperation, UserOperation } from './types';

export const AddressZero = ethers.constants.AddressZero;
export const HashZero = ethers.constants.HashZero;
export const ONE_ETH = parseEther('1');
export const TWO_ETH = parseEther('2');
export const FIVE_ETH = parseEther('5');

export const DefaultsForUserOp: UserOperation = {
  sender: AddressZero,
  nonce: 0,
  initCode: '0x',
  callData: '0x',
  callGasLimit: 0,
  verificationGasLimit: 150000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
  preVerificationGas: 21000, // should also cover calldata cost.
  maxFeePerGas: 0,
  maxPriorityFeePerGas: 1e9,
  paymaster: AddressZero,
  paymasterData: '0x',
  paymasterVerificationGasLimit: 3e5,
  paymasterPostOpGasLimit: 0,
  signature: '0x',
};

const panicCodes: { [key: number]: string } = {
  // from https://docs.soliditylang.org/en/v0.8.0/control-structures.html
  0x01: 'assert(false)',
  0x11: 'arithmetic overflow/underflow',
  0x12: 'divide by zero',
  0x21: 'invalid enum value',
  0x22: 'storage byte array that is incorrectly encoded',
  0x31: '.pop() on an empty array.',
  0x32: 'array sout-of-bounds or negative index',
  0x41: 'memory overflow',
  0x51: 'zero-initialized variable of internal function type',
};

const decodeRevertReasonContracts = new Interface([
  ...SimpleEntryPoint__factory.createInterface().fragments,
  ...TestPaymasterRevertCustomError__factory.createInterface().fragments,
  ...TestERC20__factory.createInterface().fragments, // for OZ errors,
  'error ECDSAInvalidSignature()',
]); // .filter(f => f.type === 'error'))

export function decodeRevertReason(data: string | Error, nullIfNoMatch = true): string | null {
  if (typeof data !== 'string') {
    const err = data as any;
    data = (err.data ?? err.error?.data) as string;
    if (typeof data !== 'string') throw err;
  }

  const methodSig = data.slice(0, 10);
  const dataParams = '0x' + data.slice(10);

  // can't add Error(string) to xface...
  if (methodSig === '0x08c379a0') {
    const [err] = ethers.utils.defaultAbiCoder.decode(['string'], dataParams);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `Error(${err})`;
  } else if (methodSig === '0x4e487b71') {
    const [code] = ethers.utils.defaultAbiCoder.decode(['uint256'], dataParams);
    return `Panic(${panicCodes[code] ?? code} + ')`;
  }

  try {
    const err = decodeRevertReasonContracts.parseError(data);
    // treat any error "bytes" argument as possible error to decode (e.g. FailedOpWithRevert, PostOpReverted)
    const args = err.args.map((arg: any, index) => {
      switch (err.errorFragment.inputs[index].type) {
        case 'bytes':
          return decodeRevertReason(arg);
        case 'string':
          return `"${arg as string}"`;
        default:
          return arg;
      }
    });
    return `${err.name}(${args.join(',')})`;
  } catch (e) {
    // throw new Error('unsupported errorSig ' + data)
    if (!nullIfNoMatch) {
      return data;
    }
    return null;
  }
}

// rethrow "cleaned up" exception.
// - stack trace goes back to method (or catch) line, not inner provider
// - attempt to parse revert data (needed for geth)
// use with ".catch(rethrow())", so that current source file/line is meaningful.
export function rethrow(): (e: Error) => void {
  const callerStack = new Error()
    .stack!.replace(/Error.*\n.*at.*\n/, '')
    .replace(/.*at.* \(internal[\s\S]*/, '');

  if (arguments[0] != null) {
    throw new Error('must use .catch(rethrow()), and NOT .catch(rethrow)');
  }
  return function (e: Error) {
    const solstack = e.stack!.match(/((?:.* at .*\.sol.*\n)+)/);
    const stack = (solstack != null ? solstack[1] : '') + callerStack;
    // const regex = new RegExp('error=.*"data":"(.*?)"').compile()
    const found = /error=.*?"data":"(.*?)"/.exec(e.message);
    let message: string;
    if (found != null) {
      const data = found[1];
      message = decodeRevertReason(data) ?? e.message + ' - ' + data.slice(0, 100);
    } else {
      message = e.message;
    }
    const err = new Error(message);
    err.stack = 'Error: ' + message + '\n' + stack;
    throw err;
  };
}

export async function getDeployedAddress(
  accountFactory: AccountFactory,
  owner: string,
  salt: string
): Promise<string> {
  const encodedFunctionCall = Account__factory.createInterface().encodeFunctionData('initialize', [
    owner,
  ]);
  const encoder = new ethers.utils.AbiCoder();
  const initCodeHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes', 'bytes'],
      [
        ERC1967Proxy__factory.bytecode,
        encoder.encode(
          ['address', 'bytes'],
          [await accountFactory.accountImplementation(), encodedFunctionCall]
        ),
      ]
    )
  );
  return ethers.utils.getCreate2Address(accountFactory.address, salt, initCodeHash);
}

export function callDataCost(data: string): number {
  return ethers.utils
    .arrayify(data)
    .map((x) => (x === 0 ? 4 : 16))
    .reduce((sum, x) => sum + x);
}

export async function fillUserOp(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  entryPoint?: SimpleEntryPoint,
  getNonceFunction = 'getNonce'
): Promise<UserOperation> {
  const op1 = { ...op };
  const provider = entryPoint?.provider;
  if (op.initCode != null) {
    const initAddr = hexDataSlice(op1.initCode!, 0, 20);
    const initCallData = hexDataSlice(op1.initCode!, 20);
    if (op1.nonce == null) op1.nonce = 0;
    if (op1.sender == null) {
      if (initAddr.toLowerCase() === accountFactory.address.toLowerCase()) {
        const ctr = hexDataSlice(initCallData, 32);
        const salt = hexDataSlice(initCallData, 0, 32);
        op1.sender = await getDeployedAddress(accountFactory, ctr, salt);
      } else {
        if (provider == null) throw new Error('no entrypoint/provider');
        op1.sender = await entryPoint!.callStatic
          .getSenderAddress(op1.initCode!)
          .catch((e) => e.errorArgs.sender);
      }
    }
    if (op1.verificationGasLimit == null) {
      if (provider == null) throw new Error('no entrypoint/provider');
      const initEstimate = await provider.estimateGas({
        from: entryPoint?.address,
        to: initAddr,
        data: initCallData,
        gasLimit: 10e6,
      });
      op1.verificationGasLimit = BigNumber.from(DefaultsForUserOp.verificationGasLimit).add(
        initEstimate
      );
    }
  }
  if (op1.nonce == null) {
    if (provider == null) throw new Error('must have entryPoint to autofill nonce');
    const c = new Contract(
      op.sender!,
      [`function ${getNonceFunction}() view returns(uint256)`],
      provider
    );
    op1.nonce = await c[getNonceFunction]().catch(rethrow());
  }
  if (op1.callGasLimit == null && op.callData != null) {
    if (provider == null) throw new Error('must have entryPoint for callGasLimit estimate');
    const gasEtimated = await provider.estimateGas({
      from: entryPoint?.address,
      to: op1.sender,
      data: op1.callData,
    });
    op1.callGasLimit = gasEtimated;
  }
  if (op1.paymaster != null) {
    if (op1.paymasterVerificationGasLimit == null) {
      op1.paymasterVerificationGasLimit = DefaultsForUserOp.paymasterVerificationGasLimit;
    }
    if (op1.paymasterPostOpGasLimit == null) {
      op1.paymasterPostOpGasLimit = DefaultsForUserOp.paymasterPostOpGasLimit;
    }
  }
  if (op1.maxFeePerGas == null) {
    if (provider == null) throw new Error('must have entryPoint to autofill maxFeePerGas');
    const block = await provider.getBlock('latest');
    op1.maxFeePerGas = block.baseFeePerGas!.add(
      op1.maxPriorityFeePerGas ?? DefaultsForUserOp.maxPriorityFeePerGas
    );
  }
  if (op1.maxPriorityFeePerGas == null) {
    op1.maxPriorityFeePerGas = DefaultsForUserOp.maxPriorityFeePerGas;
  }
  const op2 = fillUserOpDefaults(op1);
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  if (op2.preVerificationGas.toString() === '0') {
    // TODO: we don't add overhead, which is ~21000 for a single TX, but much lower in a batch.
    op2.preVerificationGas = callDataCost(encodeUserOp(op2, false));
  }
  return op2;
}

export async function fillAndSign(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  signer: Wallet | Signer,
  entryPoint?: SimpleEntryPoint,
  getNonceFunction = 'getNonce'
): Promise<UserOperation> {
  const provider = entryPoint?.provider;
  const op2 = await fillUserOp(accountFactory, op, entryPoint, getNonceFunction);
  const chainId = await provider!.getNetwork().then((net) => net.chainId);
  const message = arrayify(getUserOpHash(op2, entryPoint!.address, chainId));

  let signature;
  try {
    signature = await signer.signMessage(message);
  } catch (err: any) {
    signature = await (signer as any)._legacySignMessage(message);
  }
  return { ...op2, signature };
}

export async function fillSignAndPack(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  signer: Wallet | Signer,
  entryPoint?: SimpleEntryPoint,
  getNonceFunction = 'getNonce'
): Promise<PackedUserOperation> {
  const filledAndSignedOp = await fillAndSign(
    accountFactory,
    op,
    signer,
    entryPoint,
    getNonceFunction
  );
  return packUserOp(filledAndSignedOp);
}

export function packAccountGasLimits(
  verificationGasLimit: BigNumberish,
  callGasLimit: BigNumberish
): string {
  return ethers.utils.hexConcat([
    hexZeroPad(hexlify(verificationGasLimit, { hexPad: 'left' }), 16),
    hexZeroPad(hexlify(callGasLimit, { hexPad: 'left' }), 16),
  ]);
}

export function packPaymasterData(
  paymaster: string,
  paymasterVerificationGasLimit: BytesLike | Hexable | number | bigint,
  postOpGasLimit: BytesLike | Hexable | number | bigint,
  paymasterData: string
): string {
  return ethers.utils.hexConcat([
    paymaster,
    hexZeroPad(hexlify(paymasterVerificationGasLimit, { hexPad: 'left' }), 16),
    hexZeroPad(hexlify(postOpGasLimit, { hexPad: 'left' }), 16),
    paymasterData,
  ]);
}

export function packUserOp(userOp: UserOperation): PackedUserOperation {
  const accountGasLimits = packAccountGasLimits(userOp.verificationGasLimit, userOp.callGasLimit);
  const gasFees = packAccountGasLimits(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas);
  let paymasterAndData = '0x';
  if (userOp.paymaster?.length >= 20 && userOp.paymaster !== AddressZero) {
    paymasterAndData = packPaymasterData(
      userOp.paymaster as string,
      userOp.paymasterVerificationGasLimit,
      userOp.paymasterPostOpGasLimit,
      userOp.paymasterData as string
    );
  }
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    callData: userOp.callData,
    accountGasLimits,
    initCode: userOp.initCode,
    preVerificationGas: userOp.preVerificationGas,
    gasFees,
    paymasterAndData,
    signature: userOp.signature,
  };
}

export function encodeUserOp(userOp: UserOperation, forSignature = true): string {
  const packedUserOp = packUserOp(userOp);
  if (forSignature) {
    return defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32'],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        keccak256(packedUserOp.initCode),
        keccak256(packedUserOp.callData),
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        keccak256(packedUserOp.paymasterAndData),
      ]
    );
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes', 'bytes', 'bytes32', 'uint256', 'bytes32', 'bytes', 'bytes'],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        packedUserOp.initCode,
        packedUserOp.callData,
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        packedUserOp.paymasterAndData,
        packedUserOp.signature,
      ]
    );
  }
}

export function fillUserOpDefaults(
  op: Partial<UserOperation>,
  defaults = DefaultsForUserOp
): UserOperation {
  const partial: any = { ...op };
  // we want "item:undefined" to be used from defaults, and not override defaults, so we must explicitly
  // remove those so "merge" will succeed.
  for (const key in partial) {
    if (partial[key] == null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete partial[key];
    }
  }
  const filled = { ...defaults, ...partial };
  return filled;
}

export function getUserOpHash(op: UserOperation, entryPoint: string, chainId: number): string {
  const userOpHash = keccak256(encodeUserOp(op, true));
  const enc = defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId]
  );
  return keccak256(enc);
}

export function signUserOp(
  op: UserOperation,
  signer: Wallet,
  entryPoint: string,
  chainId: number
): UserOperation {
  const message = getUserOpHash(op, entryPoint, chainId);
  const msg1 = Buffer.concat([
    Buffer.from('\x19Ethereum Signed Message:\n32', 'ascii'),
    Buffer.from(arrayify(message)),
  ]);

  const sig = ecsign(keccak256_buffer(msg1), Buffer.from(arrayify(signer.privateKey)));
  // that's equivalent of:  await signer.signMessage(message);
  // (but without "async"
  const signedMessage1 = toRpcSig(sig.v, sig.r, sig.s);
  return {
    ...op,
    signature: signedMessage1,
  };
}

let counter = 0;
// create non-random account, so gas calculations are deterministic
export function createAccountOwner(): Wallet {
  const privateKey = keccak256(Buffer.from(arrayify(BigNumber.from(++counter))));
  return new ethers.Wallet(privateKey, ethers.provider);
  // return new ethers.Wallet('0x'.padEnd(66, privkeyBase), ethers.provider);
}

export function createAddress(): string {
  return createAccountOwner().address;
}

export async function getBalance(address: string): Promise<number> {
  const balance = await ethers.provider.getBalance(address);
  return parseInt(balance.toString());
}

export async function isDeployed(addr: string): Promise<boolean> {
  const code = await ethers.provider.getCode(addr);
  return code.length > 2;
}

// Deploys an implementation and a proxy pointing to this implementation
export async function createAccount(
  ethersSigner: Signer,
  accountOwner: string,
  entryPoint: string,
  _factory?: AccountFactory
): Promise<{
  proxy: Account;
  accountFactory: AccountFactory;
  implementation: string;
}> {
  const accountFactory =
    _factory ?? (await new AccountFactory__factory(ethersSigner).deploy(entryPoint));
  const implementation = await accountFactory.accountImplementation();
  await accountFactory.createAccount(accountOwner, 0);
  const accountAddress = await accountFactory.getAddress(accountOwner, 0);
  const proxy = Account__factory.connect(accountAddress, ethersSigner);
  return {
    implementation,
    accountFactory,
    proxy,
  };
}

export async function sendEntryPoint(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  signer: Wallet | Signer,
  entryPoint: SimpleEntryPoint
) {
  const etherSigner = ethers.provider.getSigner();
  const queueUserOp = await fillSignAndPack(accountFactory, op, signer, entryPoint);
  const signerAddress = await signer.getAddress();
  const tx = await entryPoint
    .connect(etherSigner)
    .handleOps([queueUserOp], signerAddress, { maxFeePerGas: 1e9, gasLimit: 1e7 });
  const receipt = await tx.wait();
  return receipt;
}

export async function fund(contractOrAddress: string | Contract, amountEth = '1'): Promise<void> {
  let address: string;
  if (typeof contractOrAddress === 'string') {
    address = contractOrAddress;
  } else {
    address = contractOrAddress.address;
  }
  await ethers.provider.getSigner().sendTransaction({ to: address, value: parseEther(amountEth) });
}
