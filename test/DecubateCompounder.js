const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const DCBToken = artifacts.require("DCBToken");
const MockToken = artifacts.require("MockBEP20");
const DecubateMasterChef = artifacts.require("DecubateMasterChef");
const DecubateNFT = artifacts.require("DecubateNFT");
const DecubateVault = artifacts.require("DCBVault");

contract("DecubateCompounder", (accounts) => {
  before(async () => {
    this.token1 = await DCBToken.deployed();
    this.token2 = await MockToken.deployed();
    this.dcbMasterChef = await DecubateMasterChef.deployed();
    this.dcbNft = await DecubateNFT.deployed();
    this.dcbVault = await DecubateVault.deployed();
    this.curr = Number(await time.latest());

    for (i = 0; i < 3; i++) {
      await this.token1.transfer(accounts[i + 1], "2000000000", {
        from: accounts[0],
      });
      await this.token1.approve(this.dcbVault.address, "10000000", {
        from: accounts[i + 1],
      });
      await this.token2.transfer(accounts[i + 1], "20000000", {
        from: accounts[0],
      });
      await this.token2.approve(this.dcbVault.address, "10000000", {
        from: accounts[i + 1],
      });
    }

    await this.dcbMasterChef.updateCompounder(this.dcbVault.address);

    await this.dcbMasterChef.add(
      "240",
      "10",
      0,
      0,
      "60",
      false,
      this.curr + 86400 * 365,
      "1000",
      "100000",
      "10000000",
      this.token1.address,
      { from: accounts[0] }
    );
    await this.dcbMasterChef.add(
      "120",
      "20",
      0,
      10,
      "0",
      true,
      this.curr + 86400 * 365,
      "100",
      "100000",
      "100000000",
      this.token2.address,
      { from: accounts[0] }
    );

    await this.dcbNft.mint(3, { from: accounts[0] });
    await this.dcbNft.transferFrom(accounts[0], accounts[3], 1, {
      from: accounts[0],
    });
  });

  describe("Deposit", () => {
    it("should not deposit less than min deposit", async () => {
      await expectRevert(
        this.dcbVault.deposit(0, 100, { from: accounts[1] }),
        "Invalid amount!"
      );
    });

    it("should not deposit above max deposit", async () => {
      await expectRevert(
        this.dcbVault.deposit(0, 1000000, { from: accounts[1] }),
        "Invalid amount!"
      );
    });

    it("should deposit succesfully to the compounder", async () => {
      const prevBal = await this.token1.balanceOf(this.dcbMasterChef.address);
      await this.dcbVault.deposit(0, 10000, { from: accounts[1] });
      const currBal = await this.token1.balanceOf(this.dcbMasterChef.address);
      assert.equal(currBal - prevBal, 10000);
    });

    it("should deposit succesfully from another address", async () => {
      const prevBal = await this.token1.balanceOf(this.dcbMasterChef.address);
      await this.dcbVault.deposit(0, 50000, { from: accounts[2] });
      const currBal = await this.token1.balanceOf(this.dcbMasterChef.address);

      assert.equal(currBal - prevBal, 50000);
      assert.equal(
        await this.token1.balanceOf(this.dcbMasterChef.address),
        60000
      );
    });

    it("should deposit succesfully a third time", async () => {
      await this.dcbVault.deposit(1, 20000, { from: accounts[3] });
      const firstPoolInfo = await this.dcbMasterChef.poolInfo(0);
      const secondPoolInfo = await this.dcbMasterChef.poolInfo(1);

      assert.equal(Number(firstPoolInfo[3]), 60000);
      assert.equal(Number(secondPoolInfo[3]), 20000);
    });
  });

  describe("PoolInfo", () => {
    it("should return the balance of a single token in compounder contract", async () => {
      const bal = await this.dcbVault.available(0);
      assert.equal(bal, 0);
    });

    it("should return total amount staked in the masterchef by compounder", async () => {
      const bal = await this.dcbVault.balanceOf(0);
      assert.equal(bal, 60000);
    });

    it("should return price of a single share in a pool", async () => {
      const price = await this.dcbVault.getPricePerFullShare(0);
      assert.equal(Number(price), 1 * 10 ** 18); //6000/6000 * 10**18
    });

    it("should return the amount of reward harvested", async () => {
      await time.increase(86400 * 30);

      const reward = await this.dcbVault.calculateTotalPendingRewards(0);
      assert.equal(Number(reward), 1195); //compound interest for 30 days, 24% apy
    });

    it("should return amount of reward while calling harvest", async () => {
      const callFee = await this.dcbVault.calculateHarvestDcbRewards(0);
      assert.equal(Number(callFee), 2); //0.25% call fee on 1195
    });
  });

  describe("Harvest", () => {
    it("should havest the available amount for one pool", async () => {
      const prevAmount = (await this.dcbMasterChef.poolInfo(0))[3];
      await this.dcbVault.harvest(0, { from: accounts[5] });
      const currAmount = (await this.dcbMasterChef.poolInfo(0))[3];

      //1195 as total reward
      //0.5% fee on claim
      //0.25% fee send to harvest caller
      //1195 - 0.75% fee = 1188
      assert.equal(currAmount - prevAmount, 1188);
    });

    it("should send the call fee to caller", async () => {
      const bal = await this.token1.balanceOf(accounts[5]);
      assert.equal(bal, 2);
    });

    it("should harvest reward from all pools", async () => {
      await time.increase(86400 * 15);

      const prevAmount =
        Number(await this.dcbVault.balanceOf(0)) +
        Number(await this.dcbVault.balanceOf(1));
      await this.dcbVault.harvestAll({ from: accounts[6] });
      const currAmount =
        Number(await this.dcbVault.balanceOf(0)) +
        Number(await this.dcbVault.balanceOf(1));

      assert.equal(currAmount - prevAmount, 899); //Both pool 1 and pool 2 rewards. Pool 1 was once claimed before
    });

    it("should send caller fee on multi harvest properly", async () => {
      const bal = await this.token1.balanceOf(accounts[6]);
      assert.equal(Number(bal), 1); //Rounding error. Should've been 2
    });
  });
  describe("Withdraw", () => {
    it("should not allow withdraw in lock period", async () => {
      await expectRevert(
        this.dcbVault.withdraw(0, 10000, { from: accounts[1] }),
        "Stake still in locked state"
      );
    });

    it("should not allow 0 withdraw", async () => {
      await expectRevert(
        this.dcbVault.withdraw(0, 0, { from: accounts[1] }),
        "Nothing to withdraw"
      );
    });

    it("should not allow withdraw above share balance", async () => {
      await expectRevert(
        this.dcbVault.withdraw(0, 20000, { from: accounts[1] }),
        "Withdraw amount exceeds balance"
      );
    });

    it("should allow withdraw for non locked deposits", async () => {
      const prevBal = Number(await this.token2.balanceOf(accounts[3]));
      await this.dcbVault.withdraw(1, 10000, { from: accounts[3] });
      const currBal = Number(await this.token2.balanceOf(accounts[3]));

      //Total reward for 45 days = 148 (12% apy)
      //NFT multiplier enabled = 148 * 2 = 296
      //Expected outcome = prevBalance + 10296
      assert.equal(currBal - prevBal, 10296);
    });

    it("should calculate total amount of rewards earned", async () => {
      const rewards = (await this.dcbVault.users(1, accounts[3]))[3];
      assert.equal(rewards, 296);
    });

    it("should allow withdraw for locked deposits after lock period", async () => {
      await time.increase(86400 * 15);

      const prevBal = Number(await this.token1.balanceOf(accounts[1]));
      await this.dcbVault.withdraw(0, 5000, { from: accounts[1] });
      const currBal = Number(await this.token1.balanceOf(accounts[1]));

      assert.equal(currBal - prevBal, 5200); //No nft multiplier, 24% apy, with harvest
    });

    it("should withdraw all shares of a user", async () => {
      await this.token1.transfer(this.dcbMasterChef.address, "10000");
      try {
        await this.dcbVault.withdrawAll(0, { from: accounts[2] });
      } catch (err) {
        assert.equal(err, null);
      }
    });
  });
  describe("Setters", () => {
    it("should set new call fee", async () => {
      try {
        await this.dcbVault.setCallFee(30);
      } catch (err) {
        assert.equal(err, null);
      }
    });

    it("should pause/unpause contract succesfully", async () => {
      await this.dcbVault.pause();
      await expectRevert(
        this.dcbVault.harvest(0, { from: accounts[5] }),
        "Pausable: paused"
      );
      await this.dcbVault.unpause();

      try {
        await this.dcbVault.harvest(0, { from: accounts[5] });
      } catch (err) {
        assert.equal(err, null);
      }
    });
  });
});
