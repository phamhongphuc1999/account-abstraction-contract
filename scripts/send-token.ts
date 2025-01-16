import { ethers } from 'hardhat';

async function main() {
  const accounts = await ethers.getSigners();
  const account = accounts[0];
  const response = await account.sendTransaction({
    to: '0xa710c2748dca59b322e9b38d60635e654569770f',
    value: ethers.utils.parseEther('1'),
  });
  const receipt = await response.wait();
  console.log('🚀 ~ main ~ receipt:', receipt);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
