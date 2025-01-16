import { writeFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { resolve } from 'node:path';

async function main() {
  const EntrypointFactory = await ethers.getContractFactory('MockEntryPoint');
  const entrypoint = await EntrypointFactory.deploy();
  await entrypoint.deployed();

  const deployedAddresses = {
    entrypointAddress: entrypoint.address,
  };

  const networkName = network.name;
  const fileName = `${Date.now()}_${networkName}_entryPoint_addresses.json`;
  writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), 'utf-8');

  console.log('======================== Contracts deployed ========================');
  console.log('EntryPoint at: ', entrypoint.address);
  console.log('=============================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
