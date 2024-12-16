import { ethers } from 'hardhat';
import { it } from 'mocha';
import { MockEntryPoint__factory } from '../../typechain';
import { createAccountOwner } from '../utils';
import { Wallet } from 'ethers';
import { parseEther } from 'ethers/lib/utils';

describe('DeployGasCost', function () {
  const etherSigner = ethers.provider.getSigner();
  it('deploy a account without AA', async function () {
    const entryPoint = await new MockEntryPoint__factory(etherSigner).deploy();
    const Account = await ethers.getContractFactory('Account');
    const account = await Account.deploy(entryPoint.address);
    await account.deployed();
    const receipt = await account.deployTransaction.wait();
    console.log('deploy a account gas used: ', receipt.gasUsed);
  });
  it('deploy a guardian without AA', async function () {
    const Guardian = await ethers.getContractFactory('ZKGuardian');
    const guardian = await Guardian.deploy();
    await guardian.deployed();
    const receipt = await guardian.deployTransaction.wait();
    console.log('deploy a guardian gas used: ', receipt.gasUsed);
  });
  it('send 0.1ETH without AA', async function () {
    const account1: Wallet = createAccountOwner();
    const response = await etherSigner.sendTransaction({
      to: account1.address,
      value: parseEther('0.1'),
    });
    const receipt = await response.wait();
    console.log('send 0.1ETH gas used: ', receipt.gasUsed);
  });
});
