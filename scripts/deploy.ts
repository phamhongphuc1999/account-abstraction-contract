import { writeFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { resolve } from 'node:path';
import { ENTRYPOINT } from '../constants';

async function main() {
  const AccountFactory = await ethers.getContractFactory('AccountFactory');
  const accountFactory = await AccountFactory.deploy(ENTRYPOINT);
  await accountFactory.deployed();

  const deployedAddresses = {
    accountFactoryAddress: accountFactory.address,
  };

  console.log('network config', network.config);
  const networkName = network.name;
  const fileName = `${Date.now()}_${networkName}_addresses`;
  writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), 'utf-8');

  console.log('======================== Contracts deployed ========================');
  console.log('AccountFactory at: ', accountFactory.address);
  console.log('=============================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
