import { expect } from "chai";
import { BigNumber, BigNumberish, Contract, ContractReceipt, Signer, Wallet } from "ethers";
import { BytesLike, arrayify, hexConcat, keccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import {
  Account,
  AccountFactory,
  AccountFactory__factory,
  Account__factory,
  EntryPoint,
  IERC20,
} from "../typechain";
import { UserOperation } from "./UserOperation";

export const AddressZero = ethers.constants.AddressZero;
export const HashZero = ethers.constants.HashZero;
export const ETH_1 = ethers.utils.parseEther("1");
export const ETH_2 = ethers.utils.parseEther("2");
export const ETH_5 = ethers.utils.parseEther("5");
export const ETH_1000 = ethers.utils.parseEther("1000");
export const ETH_2000 = ethers.utils.parseEther("2000");

export const toStr = (x: any): string => (x != null ? x.toString() : "null");

export function toNumber(x: any): number {
  try {
    return parseFloat(x.toString());
  } catch (e: any) {
    console.error("=== failed to parseFloat:", x, e.message);
    return NaN;
  }
}

export async function fund(contractOrAddress: string | Contract, amountEth = "1"): Promise<void> {
  let address: string;
  if (typeof contractOrAddress === "string") address = contractOrAddress;
  else address = contractOrAddress.address;
  await ethers.provider
    .getSigner()
    .sendTransaction({ to: address, value: ethers.utils.parseEther(amountEth) });
}

export async function getBalance(address: string): Promise<number> {
  const balance = await ethers.provider.getBalance(address);
  return parseInt(balance.toString());
}

export async function getTokenBalance(token: IERC20, address: string): Promise<number> {
  const balance = await token.balanceOf(address);
  return parseInt(balance.toString());
}

let counter = 0;
export function createAccountOwner(): Wallet {
  const privateKey = keccak256(Buffer.from(arrayify(BigNumber.from(++counter))));
  return new ethers.Wallet(privateKey, ethers.provider);
}

export function createAddress(): string {
  return createAccountOwner().address;
}

export function callDataCost(data: string): number {
  return ethers.utils
    .arrayify(data)
    .map((x) => (x === 0 ? 4 : 16))
    .reduce((sum, x) => x + sum);
}

export async function calcGasUsage(
  rcpt: ContractReceipt,
  entryPoint: EntryPoint,
  beneficiaryAddress?: string
): Promise<{ actualGasCost: BigNumberish }> {
  const actualGas = rcpt.gasUsed;
  const logs = await entryPoint.queryFilter(
    entryPoint.filters.UserOperationEvent(),
    rcpt.blockHash
  );
  const { actualGasCost, actualGasUsed } = logs[0].args;
  console.error("\t== actual gasUsed (from tx receipt)=", actualGas.toString());
  console.error("\t== calculated gasUsed (paid to beneficiary)=", actualGasUsed);
  const tx = await ethers.provider.getTransaction(rcpt.transactionHash);
  console.error(
    "\t== gasDiff",
    actualGas.toNumber() - actualGasUsed.toNumber() - callDataCost(tx.data)
  );
  if (beneficiaryAddress != null) {
    expect(await getBalance(beneficiaryAddress)).to.eq(actualGasCost.toNumber());
  }
  return { actualGasCost };
}

export function getAccountInitCode(owner: string, factory: AccountFactory, salt = 0): BytesLike {
  return hexConcat([
    factory.address,
    factory.interface.encodeFunctionData("createAccount", [owner, salt]),
  ]);
}

export async function createAccount(
  ethersSigner: Signer,
  accountOwner: string,
  entryPoint: string,
  _factory?: AccountFactory
): Promise<{ proxy: Account; accountFactory: AccountFactory; implementation: string }> {
  const accountFactory =
    _factory ?? (await new AccountFactory__factory(ethersSigner).deploy(entryPoint));
  const implementation = await accountFactory.accountImplementation();
  await accountFactory.createAccount(accountOwner, 0);
  const accountAddress = await accountFactory.getAddress(accountOwner, 0);
  const proxy = Account__factory.connect(accountAddress, ethersSigner);
  return { implementation, accountFactory, proxy };
}

export function userOpsWithoutAgg(userOps: UserOperation[]) {
  return [{ userOps, aggregator: AddressZero, signature: "0x" }];
}
