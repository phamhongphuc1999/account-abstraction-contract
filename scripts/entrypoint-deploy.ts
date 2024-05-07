import { writeFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { resolve } from 'node:path';

async function main() {
  const EntrypointFactory = await ethers.getContractFactory('SimpleEntryPoint');
  const entrpypoint = await EntrypointFactory.deploy();
  await entrpypoint.deployed();

  const deployedAddresses = {
    entrpypointAddress: entrpypoint.address,
  };

  console.log('network config', network.config);
  if (network.config.chainId == 97) {
    const networkName = network.name;
    const fileName = `${Date.now()}_${networkName}_entrypoint_addresses`;
    writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), 'utf-8');

    console.log('======================== Contracts deployed ========================');
    console.log('EntrpyPoint at: ', entrpypoint.address);
    console.log('=============================================================');
  } else console.error('chainId must be 97');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
