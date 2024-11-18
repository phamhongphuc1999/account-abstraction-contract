import { ethers } from 'hardhat';

async function main() {
  const receipt = await ethers.provider.getTransactionReceipt(
    '0x0f48f8b10efd2801684d426c4c2ef93d617a827cefe7aaf69d9bad7e5c6ba207'
  );
  console.log('🚀 ~ main ~ receipt:', receipt);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
