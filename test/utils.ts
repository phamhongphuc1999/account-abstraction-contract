import { ecsign, keccak256 as keccak256_buffer, toRpcSig } from 'ethereumjs-util';
import { BigNumber, Contract, Signer, Wallet } from 'ethers';
import {
  BytesLike,
  Interface,
  arrayify,
  defaultAbiCoder,
  hexConcat,
  hexDataSlice,
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
  MockEntryPoint,
} from '../typechain';
import { UserOperation } from './types';

export const salt = '0x'.padEnd(66, '0');
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
  paymasterAndData: '0x',
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

export function analyticTimes(times: Array<number>, times1: Array<number>) {
  const sortedTimes = [...times].sort((x, y) => (x > y ? 1 : -1));
  const averageTime = times.reduce((a, b) => a + b) / 10;
  const averageTime1 = times1.reduce((a, b) => a + b) / 10;
  console.log('times: ', sortedTimes, times);
  console.log('average generation proof time: ', averageTime);
  console.log('times1: ', times1);
  console.log('average verification time: ', averageTime1);
}

export function decodeRevertReason(data: string, nullIfNoMatch = true): string | null {
  const methodSig = data.slice(0, 10);
  const dataParams = '0x' + data.slice(10);

  if (methodSig === '0x08c379a0') {
    const [err] = ethers.utils.defaultAbiCoder.decode(['string'], dataParams);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `Error(${err})`;
  } else if (methodSig === '0x00fa072b') {
    const [opindex, paymaster, msg] = ethers.utils.defaultAbiCoder.decode(
      ['uint256', 'address', 'string'],
      dataParams
    );
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `FailedOp(${opindex}, ${paymaster !== AddressZero ? paymaster : 'none'}, ${msg})`;
  } else if (methodSig === '0x4e487b71') {
    const [code] = ethers.utils.defaultAbiCoder.decode(['uint256'], dataParams);
    return `Panic(${panicCodes[code] ?? code} + ')`;
  }
  if (!nullIfNoMatch) {
    return data;
  }
  return null;
}

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

export async function fund(contractOrAddress: string | Contract, amountEth = '1'): Promise<void> {
  let address: string;
  if (typeof contractOrAddress === 'string') {
    address = contractOrAddress;
  } else {
    address = contractOrAddress.address;
  }
  await ethers.provider.getSigner().sendTransaction({ to: address, value: parseEther(amountEth) });
}

export function fillUserOpDefaults(
  op: Partial<UserOperation>,
  defaults = DefaultsForUserOp
): UserOperation {
  const partial: any = { ...op };
  for (const key in partial) {
    if (partial[key] == null) {
      delete partial[key];
    }
  }
  const filled = { ...defaults, ...partial };
  return filled;
}

export function callDataCost(data: string): number {
  return ethers.utils
    .arrayify(data)
    .map((x) => (x === 0 ? 4 : 16))
    .reduce((sum, x) => sum + x);
}

export function packUserOp(op: UserOperation, forSignature = true): string {
  if (forSignature) {
    return defaultAbiCoder.encode(
      [
        'address',
        'uint256',
        'bytes32',
        'bytes32',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes32',
      ],
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        keccak256(op.paymasterAndData),
      ]
    );
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      [
        'address',
        'uint256',
        'bytes',
        'bytes',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes',
        'bytes',
      ],
      [
        op.sender,
        op.nonce,
        op.initCode,
        op.callData,
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        op.paymasterAndData,
        op.signature,
      ]
    );
  }
}

export async function fillUserOp(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  entryPoint?: MockEntryPoint,
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
    const estimatedGas = await provider.estimateGas({
      from: entryPoint?.address,
      to: op1.sender,
      data: op1.callData,
    });
    op1.callGasLimit = estimatedGas; // .add(55000)
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
  if (op2.preVerificationGas.toString() === '0') {
    op2.preVerificationGas = callDataCost(packUserOp(op2, false));
  }
  return op2;
}

export function getUserOpHash(op: UserOperation, entryPoint: string, chainId: number): string {
  const userOpHash = keccak256(packUserOp(op, true));
  const enc = defaultAbiCoder.encode(
    ['bytes32', 'address', 'uint256'],
    [userOpHash, entryPoint, chainId]
  );
  return keccak256(enc);
}

export async function fillAndSign(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  signer: Wallet | Signer,
  entryPoint?: MockEntryPoint,
  getNonceFunction = 'getNonce'
): Promise<UserOperation> {
  const provider = entryPoint?.provider;
  const op2 = await fillUserOp(accountFactory, op, entryPoint, getNonceFunction);

  const chainId = await provider!.getNetwork().then((net) => net.chainId);
  const message = arrayify(getUserOpHash(op2, entryPoint!.address, chainId));

  return { ...op2, signature: await signer.signMessage(message) };
}

export async function sendEntryPoint(
  accountFactory: AccountFactory,
  op: Partial<UserOperation>,
  signer: Wallet | Signer,
  entryPoint: MockEntryPoint
) {
  const etherSigner = ethers.provider.getSigner();
  const queueUserOp = await fillAndSign(accountFactory, op, signer, entryPoint);
  const signerAddress = await signer.getAddress();
  const tx = await entryPoint
    .connect(etherSigner)
    .handleOps([queueUserOp], signerAddress, { maxFeePerGas: 1e9, gasLimit: 1e7 });
  const receipt = await tx.wait();
  return receipt;
}

let counter = 0;
export function createAccountOwner(): Wallet {
  const privateKey = keccak256(Buffer.from(arrayify(BigNumber.from(++counter))));
  return new ethers.Wallet(privateKey, ethers.provider);
}

export function createAddress(): string {
  return createAccountOwner().address;
}

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
  return { implementation, accountFactory, proxy };
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
  const signedMessage1 = toRpcSig(sig.v, sig.r, sig.s);
  return { ...op, signature: signedMessage1 };
}

export async function getBalance(address: string): Promise<number> {
  const balance = await ethers.provider.getBalance(address);
  return parseInt(balance.toString());
}

export async function isDeployed(addr: string): Promise<boolean> {
  const code = await ethers.provider.getCode(addr);
  return code.length > 2;
}

export function getAccountInitCode(owner: string, salt: string, factoryAddress: string): BytesLike {
  const _interface = new Interface(AccountFactory__factory.abi);
  return hexConcat([factoryAddress, _interface.encodeFunctionData('createAccount', [owner, salt])]);
}
