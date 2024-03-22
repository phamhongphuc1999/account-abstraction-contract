import { ethers, network } from "hardhat";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ENTRYPOINT } from "../constants";

async function main() {
  const AccountFactory = await ethers.getContractFactory("AccountFactory");
  const accountFactory = await AccountFactory.deploy(ENTRYPOINT);
  await accountFactory.deployed();

  const Paymaster = await ethers.getContractFactory("DepositPaymaster");
  const paymaster = await Paymaster.deploy(ENTRYPOINT);
  await paymaster.deployed();

  const Oracle = await ethers.getContractFactory("MockOracle");
  const oracle = await Oracle.deploy(2);
  await oracle.deployed();

  const Token = await ethers.getContractFactory("TestToken");
  const token = await Token.deploy();
  await token.deployed();

  const deployedAddresses = {
    accountFactoryAddress: accountFactory.address,
    paymasterAddress: paymaster.address,
    oracleAddress: oracle.address,
    tokenAddress: token.address,
  };

  console.log("network config", network.config);
  const networkName = network.name;
  const fileName = `ignore_${Date.now()}_${networkName}_addresses`;
  writeFileSync(resolve(`./scripts/${fileName}`), JSON.stringify(deployedAddresses), "utf-8");

  console.log("======================== Contracts deployed ========================");
  console.log("AccountFactory at: ", accountFactory.address);
  console.log("Paymaster at: ", paymaster.address);
  console.log("Oracle at: ", oracle.address);
  console.log("Token at: ", token.address);
  console.log("====================================================================");
  await paymaster.addToken(token.address, oracle.address);
  await paymaster.oracles(token.address).then((res) => console.log(res));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
