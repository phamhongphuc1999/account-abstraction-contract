import { writeFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { resolve } from 'node:path';
import { ENTRYPOINT } from '../constants';

async function main() {
  const networkName = network.name;
  let entrypointAddress = ENTRYPOINT;
  if (networkName == 'localhost') {
    const EntrypointFactory = await ethers.getContractFactory('MockEntryPoint');
    const entrypoint = await EntrypointFactory.deploy();
    await entrypoint.deployed();
    entrypointAddress = entrypoint.address;
  }

  const AccountFactory = await ethers.getContractFactory('AccountFactory');
  const accountFactory = await AccountFactory.deploy(entrypointAddress);
  await accountFactory.deployed();

  const deployedAddresses = {
    accountFactoryAddress: accountFactory.address,
    entrypointAddress,
  };

  const fileName = `${Date.now()}_${networkName}_addresses.json`;
  writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), 'utf-8');

  console.log('======================== Contracts deployed ========================');
  console.log('AccountFactory at: ', accountFactory.address);
  console.log('=============================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
