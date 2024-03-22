import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import { HardhatUserConfig, task } from "hardhat/config";
import "solidity-coverage";
import { DEPLOY_ACCOUNT } from "./constants";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  // defaultNetwork: 'bscTestnet',
  networks: {
    bscTestnet: {
      chainId: 97,
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [DEPLOY_ACCOUNT ?? ""],
    },
    goerli: {
      chainId: 5,
      url: "https://goerli.blockpi.network/v1/rpc/public",
      accounts: [DEPLOY_ACCOUNT ?? ""],
      gas: 2100000,
      gasPrice: 8000000000,
    },
    sepolia: {
      chainId: 11155111,
      url: "https://rpc.sepolia.org",
      accounts: [DEPLOY_ACCOUNT ?? ""],
    },
  },
  gasReporter: {
    enabled: true,
    currency: "BNB",
  },
};

export default config;
