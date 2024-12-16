import { writeFileSync } from 'fs';
import { ethers, network } from 'hardhat';
import { resolve } from 'node:path';
import { ENTRYPOINT } from '../constants';

async function main() {
  const Guardian = await ethers.getContractFactory('ZKGuardian');
  const guardian = await Guardian.deploy();
  await guardian.deployed();
  const receipt = await guardian.deployTransaction.wait();

  const deployedAddresses = {
    accountAddress: guardian.address,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed,
  };

  const networkName = network.name;
  const fileName = `${Date.now()}_guardian_${networkName}_addresses.json`;
  writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), 'utf-8');

  console.log('======================== Contracts deployed ========================');
  console.log('Guardian at: ', guardian.address);
  console.log('=============================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
