import { ethers } from 'hardhat';
import { AccountFactory } from '../typechain';

async function main() {
  const AccountFactory = await ethers.getContractFactory('AccountFactory');
  const contract = AccountFactory.attach(
    '0x4CfB5895322ebDBD328cc63C51177cb720100428'
  ) as AccountFactory;
  const _account = await contract.getAddress(
    '0xac7367fe5423f5134039b446D4B9dD9C06f57826',
    '0x'.padEnd(66, '0')
  );
  const code = await ethers.provider.getCode(_account);
  console.log('🚀 ~ main ~ _account:', _account, code);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
