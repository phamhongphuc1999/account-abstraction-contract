import { writeFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { resolve } from 'node:path';
import { ENTRYPOINT } from '../constants';

async function main() {
  const Account = await ethers.getContractFactory('Account');
  const account = await Account.deploy(ENTRYPOINT);
  await account.deployed();
  const receipt = await account.deployTransaction.wait();

  const deployedAddresses = {
    accountAddress: account.address,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed,
  };

  const networkName = network.name;
  const fileName = `${Date.now()}_account_${networkName}_addresses.json`;
  writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), 'utf-8');

  console.log('======================== Contracts deployed ========================');
  console.log('Account at: ', account.address);
  console.log('=============================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
