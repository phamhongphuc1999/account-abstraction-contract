import { TokenPaymaster__factory } from '@account-abstraction/contracts';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  Account,
  AccountFactory,
  AccountFactory__factory,
  MockEntryPoint,
  MockEntryPoint__factory,
  TestCounter__factory,
  TokenPaymaster,
} from '../typechain';
import { UserOperation } from './types';
import {
  AddressZero,
  ONE_ETH,
  calcGasUsage,
  checkForBannedOps,
  checkForGeth,
  createAccountOwner,
  fillAndSign,
  fund,
  getAccountInitCode,
  getBalance,
  getTokenBalance,
  rethrow,
  salt,
} from './utils';

describe('EntryPoint with paymaster', function () {
  let entryPoint: MockEntryPoint;
  let accountOwner: Wallet;
  const etherSigner = ethers.provider.getSigner();
  let account: Account;
  const beneficiaryAddress = '0x'.padEnd(42, '1');
  let accountFactory: AccountFactory;

  before(async function () {
    this.timeout(20000);
    await checkForGeth();
    entryPoint = await new MockEntryPoint__factory(etherSigner).deploy();
    accountFactory = await new AccountFactory__factory(etherSigner).deploy(entryPoint.address);
    accountOwner = createAccountOwner();

    let accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
    account = (await ethers.getContractAt('Account', accountAddress, etherSigner)) as Account;

    await fund(account);
  });

  describe('TokenPaymaster', () => {
    let paymaster: TokenPaymaster;
    const otherAddr = createAccountOwner();
    let ownerAddr: string;
    let pmAddr: string;

    before(async () => {
      paymaster = await new TokenPaymaster__factory(etherSigner).deploy(
        accountFactory.address,
        'ttt',
        entryPoint.address
      );
      pmAddr = paymaster.address;
      ownerAddr = await etherSigner.getAddress();
    });

    it('owner should have allowance to withdraw funds', async () => {
      expect(await paymaster.allowance(pmAddr, ownerAddr)).to.equal(ethers.constants.MaxUint256);
      expect(await paymaster.allowance(pmAddr, otherAddr.address)).to.equal(0);
    });

    it('should allow only NEW owner to move funds after transferOwnership', async () => {
      await paymaster.transferOwnership(otherAddr.address);
      expect(await paymaster.allowance(pmAddr, otherAddr.address)).to.equal(
        ethers.constants.MaxUint256
      );
      expect(await paymaster.allowance(pmAddr, ownerAddr)).to.equal(0);
    });
  });

  describe('using TokenPaymaster (account pays in paymaster tokens)', () => {
    let paymaster: TokenPaymaster;
    before(async () => {
      paymaster = await new TokenPaymaster__factory(etherSigner).deploy(
        accountFactory.address,
        'tst',
        entryPoint.address
      );
      await entryPoint.depositTo(paymaster.address, { value: parseEther('1') });
      await paymaster.addStake(1, { value: parseEther('2') });
    });

    describe('#handleOps', () => {
      let calldata: string;

      before(async () => {
        const updateEntryPoint = await account.populateTransaction
          .withdrawDepositTo(AddressZero, 0)
          .then((tx) => tx.data!);
        calldata = await account.populateTransaction
          .execute(account.address, 0, updateEntryPoint)
          .then((tx) => tx.data!);
      });

      it("paymaster should reject if account doesn't have tokens", async () => {
        const _nonce = await entryPoint.getNonce(account.address, '0x0');
        const op = await fillAndSign(
          accountFactory,
          {
            sender: account.address,
            paymasterAndData: paymaster.address,
            callData: calldata,
            nonce: _nonce,
          },
          accountOwner,
          entryPoint
        );
        await expect(
          entryPoint.callStatic.handleOps([op], beneficiaryAddress, {
            gasLimit: 1e7,
          })
        ).to.revertedWith('AA33 reverted: TokenPaymaster: no balance');
        await expect(
          entryPoint.handleOps([op], beneficiaryAddress, {
            gasLimit: 1e7,
          })
        ).to.revertedWith('AA33 reverted: TokenPaymaster: no balance');
      });
    });
    describe('create account', () => {
      let createOp: UserOperation;
      let created = false;
      const beneficiary = createAccountOwner();

      it('should reject if account not funded', async () => {
        const op = await fillAndSign(
          accountFactory,
          {
            initCode: getAccountInitCode(accountOwner.address, salt, accountFactory.address),
            verificationGasLimit: 1e7,
            paymasterAndData: paymaster.address,
          },
          accountOwner,
          entryPoint
        );
        await expect(
          entryPoint.callStatic
            .handleOps([op], beneficiary.address, {
              gasLimit: 1e7,
            })
            .catch(rethrow())
        ).to.revertedWith('TokenPaymaster: no balance');
      });

      it('should succeed to create account with tokens', async () => {
        createOp = await fillAndSign(
          accountFactory,
          {
            initCode: getAccountInitCode(accountOwner.address, salt, accountFactory.address),
            verificationGasLimit: 2e6,
            paymasterAndData: paymaster.address,
            nonce: 0,
          },
          accountOwner,
          entryPoint
        );

        const preAddr = createOp.sender;
        await paymaster.mintTokens(preAddr, parseEther('1'));
        // paymaster is the token, so no need for "approve" or any init function...

        await entryPoint.simulateValidation(createOp, { gasLimit: 5e6 }).catch((e) => e.message);
        const [tx] = await ethers.provider.getBlock('latest').then((block) => block.transactions);
        await checkForBannedOps(tx, true);

        const rcpt = await entryPoint
          .handleOps([createOp], beneficiary.address, {
            gasLimit: 1e7,
          })
          .catch(rethrow())
          .then(async (tx) => await tx!.wait());
        console.log('\t== create gasUsed=', rcpt.gasUsed.toString());
        await calcGasUsage(rcpt, entryPoint);
        created = true;
      });

      it('account should pay for its creation (in tst)', async function () {
        if (!created) this.skip();
        // TODO: calculate needed payment
        const ethRedeemed = await getBalance(beneficiary.address);
        expect(ethRedeemed).to.above(100000);

        const accountAddr = await await accountFactory.getAddress(accountOwner.address, salt);
        const postBalance = await getTokenBalance(paymaster, accountAddr);
        expect(1e18 - postBalance).to.above(10000);
      });

      it('should reject if account already created', async function () {
        if (!created) this.skip();
        await expect(
          entryPoint.callStatic
            .handleOps([createOp], beneficiary.address, {
              gasLimit: 1e7,
            })
            .catch(rethrow())
        ).to.revertedWith('sender already constructed');
      });

      it('batched request should each pay for its share', async function () {
        this.timeout(20000);
        // validate context is passed correctly to postOp
        // (context is the account to pay with)

        const beneficiary = createAccountOwner();
        const testCounter = await new TestCounter__factory(etherSigner).deploy();
        const justEmit = testCounter.interface.encodeFunctionData('justemit');
        const execFromSingleton = account.interface.encodeFunctionData('execute', [
          testCounter.address,
          0,
          justEmit,
        ]);

        const ops: UserOperation[] = [];
        const accounts: Account[] = [];

        for (let i = 0; i < 4; i++) {
          let accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
          const aAccount = (await ethers.getContractAt(
            'Account',
            accountAddress,
            etherSigner
          )) as Account;
          await paymaster.mintTokens(aAccount.address, parseEther('1'));
          const op = await fillAndSign(
            accountFactory,
            {
              sender: aAccount.address,
              callData: execFromSingleton,
              paymasterAndData: paymaster.address,
            },
            accountOwner,
            entryPoint
          );

          accounts.push(aAccount);
          ops.push(op);
        }

        const pmBalanceBefore = await paymaster
          .balanceOf(paymaster.address)
          .then((b) => b.toNumber());
        await entryPoint.handleOps(ops, beneficiary.address).then(async (tx) => tx.wait());
        const totalPaid =
          (await paymaster.balanceOf(paymaster.address).then((b) => b.toNumber())) -
          pmBalanceBefore;
        for (let i = 0; i < accounts.length; i++) {
          const bal = await getTokenBalance(paymaster, accounts[i].address);
          const paid = parseEther('1').sub(bal.toString()).toNumber();

          // roughly each account should pay 1/4th of total price, within 15%
          // (first account pays more, for warming up..)
          expect(paid).to.be.closeTo(totalPaid / 4, paid * 0.15);
        }
      });

      // accounts attempt to grief paymaster: both accounts pass validatePaymasterUserOp (since they have enough balance)
      // but the execution of account1 drains account2.
      // as a result, the postOp of the paymaster reverts, and cause entire handleOp to revert.
      describe('grief attempt', () => {
        let account2: Account;
        let approveCallData: string;
        before(async function () {
          this.timeout(20000);
          // ({ proxy: account2 } = await createAccount(
          //   ethersSigner,
          //   await accountOwner.getAddress(),
          //   entryPoint.address
          // ));
          let accountAddress = await accountFactory.getAddress(accountOwner.address, salt);
          const account2 = (await ethers.getContractAt(
            'Account',
            accountAddress,
            etherSigner
          )) as Account;
          await paymaster.mintTokens(account2.address, parseEther('1'));
          await paymaster.mintTokens(account.address, parseEther('1'));
          approveCallData = paymaster.interface.encodeFunctionData('approve', [
            account.address,
            ethers.constants.MaxUint256,
          ]);
          // need to call approve from account2. use paymaster for that
          const approveOp = await fillAndSign(
            accountFactory,
            {
              sender: account2.address,
              callData: account2.interface.encodeFunctionData('execute', [
                paymaster.address,
                0,
                approveCallData,
              ]),
              paymasterAndData: paymaster.address,
            },
            accountOwner,
            entryPoint
          );
          await entryPoint.handleOps([approveOp], beneficiary.address);
          expect(await paymaster.allowance(account2.address, account.address)).to.eq(
            ethers.constants.MaxUint256
          );
        });

        it('griefing attempt should cause handleOp to revert', async () => {
          // account1 is approved to withdraw going to withdraw account2's balance

          const account2Balance = await paymaster.balanceOf(account2.address);
          const transferCost = parseEther('1').sub(account2Balance);
          const withdrawAmount = account2Balance.sub(transferCost.mul(0));
          const withdrawTokens = paymaster.interface.encodeFunctionData('transferFrom', [
            account2.address,
            account.address,
            withdrawAmount,
          ]);
          // const withdrawTokens = paymaster.interface.encodeFunctionData('transfer', [account.address, parseEther('0.1')])
          const execFromEntryPoint = account.interface.encodeFunctionData('execute', [
            paymaster.address,
            0,
            withdrawTokens,
          ]);

          const userOp1 = await fillAndSign(
            accountFactory,
            {
              sender: account.address,
              callData: execFromEntryPoint,
              paymasterAndData: paymaster.address,
            },
            accountOwner,
            entryPoint
          );

          // account2's operation is unimportant, as it is going to be reverted - but the paymaster will have to pay for it..
          const userOp2 = await fillAndSign(
            accountFactory,
            {
              sender: account2.address,
              callData: execFromEntryPoint,
              paymasterAndData: paymaster.address,
              callGasLimit: 1e6,
            },
            accountOwner,
            entryPoint
          );

          await expect(
            entryPoint.handleOps([userOp1, userOp2], beneficiary.address)
          ).to.be.revertedWith('transfer amount exceeds balance');
        });
      });
    });
    describe('withdraw', () => {
      const withdrawAddress = createAccountOwner();
      it('should fail to withdraw before unstake', async function () {
        this.timeout(20000);
        await expect(paymaster.withdrawStake(withdrawAddress.address)).to.revertedWith(
          'must call unlockStake() first'
        );
      });
      it('should be able to withdraw after unstake delay', async () => {
        await paymaster.unlockStake();
        const amount = await entryPoint
          .getDepositInfo(paymaster.address)
          .then((info) => info.stake);
        expect(amount).to.be.gte(ONE_ETH.div(2));
        await ethers.provider.send('evm_mine', [Math.floor(Date.now() / 1000) + 1000]);
        await paymaster.withdrawStake(withdrawAddress.address);
        expect(await ethers.provider.getBalance(withdrawAddress.address)).to.eql(amount);
        expect(await entryPoint.getDepositInfo(paymaster.address).then((info) => info.stake)).to.eq(
          0
        );
      });
    });
  });
});
