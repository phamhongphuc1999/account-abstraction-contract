import { BigNumber, Signer, Wallet } from 'ethers';
import { arrayify, keccak256, parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { Account, AccountFactory, AccountFactory__factory, Account__factory } from '../typechain';

export const AddressZero = ethers.constants.AddressZero;
export const HashZero = ethers.constants.HashZero;
export const ONE_ETH = parseEther('1');
export const TWO_ETH = parseEther('2');
export const FIVE_ETH = parseEther('5');

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
