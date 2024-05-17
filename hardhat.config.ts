import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'hardhat-prettier';
import { HardhatUserConfig, task } from 'hardhat/config';
import 'solidity-coverage';
import { DEPLOY_ACCOUNT } from './constants';

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.23',
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  // defaultNetwork: 'bscTestnet',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    bscTestnet: {
      url: 'https://bsc-testnet-rpc.publicnode.com',
      chainId: 97,
      accounts: [DEPLOY_ACCOUNT ?? ''],
    },
    sepolia: {
      url: 'https://rpc.sepolia.org',
      chainId: 11155111,
      accounts: [DEPLOY_ACCOUNT ?? ''],
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'BNB',
  },
};

export default config;
