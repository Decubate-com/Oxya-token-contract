//** Test case for Decubate Tiers */
//** Author Aaron : Decubate 2021.9 */

const { time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const { ROUTER, WETH } = require("../constants");
const DecubateTiers = artifacts.require("DecubateTiers");
const DecubateStaking = artifacts.require("DecubateStaking");
const DecubateMasterChef = artifacts.require("DecubateMasterChef");
const DCBVault = artifacts.require("DCBVault");
const DecubateNFT = artifacts.require("DecubateNFT");
const DCBToken = artifacts.require("DCBToken");
const Router = artifacts.require("IUniswapV2Router02");

contract("DecubateTiers", (accounts) => {
  before(async () => {
    block = Number(await time.latestBlock());
    this.times = Number(await time.latest());
    this.dcbNft = await DecubateNFT.deployed();
    this.dcbToken = await DCBToken.new(
      "Decubate Token",
      "DCB",
      "1000000000000000000000000"
    );
    this.dcbMasterchef = await DecubateMasterChef.new(this.dcbNft.address);
    this.dcbCompounder = await DCBVault.new(this.dcbMasterchef.address);
    this.dcbStaking = await DecubateStaking.new(this.dcbNft.address);
    this.dcbTiers = await DecubateTiers.new(
      this.dcbMasterchef.address,
      this.dcbMasterchef.address,
      this.dcbStaking.address,
      this.dcbCompounder.address,
      this.dcbToken.address
    );
    this.router = await Router.at(ROUTER);

    this.dcbToken.transfer(accounts[1], 160);

    await this.dcbToken.approve(this.router.address, BigInt(2e18), {
      from: accounts[0],
    });
    await this.router.addLiquidityETH(
      this.dcbToken.address,
      BigInt(1e18),
      0,
      0,
      this.router.address,
      this.times + 1000,

      { value: 1e18, from: accounts[0], gasLimit: 10000000 }
    );

    // add staking pool for ranking tiers
    await this.dcbMasterchef.add(
      100,
      10,
      0,
      10,
      10,
      false,
      this.times + 20 * 24 * 60 * 60, // end date is 20 days from now
      "0",
      "1000000000000",
      "1000000000000",
      this.dcbToken.address,
      { from: accounts[0], gasLimit: 10000000 }
    );

    // approve staking contract to spend tokens
    await this.dcbToken.approve(this.dcbCompounder.address, 50, {
      from: accounts[0],
    });
    await this.dcbToken.approve(this.dcbCompounder.address, 160, {
      from: accounts[1],
    });
    // stake in pool
    await this.dcbCompounder.deposit(0, 50, { from: accounts[0] });
    await this.dcbCompounder.deposit(0, 160, { from: accounts[1] });
  });

  describe("addTier", () => {
    it("should add a new tier", async () => {
      await this.dcbTiers.addTier(0, 99);
      const tier = await this.dcbTiers.tierInfo(0);

      assert.equal(tier.minLimit, 0);
      assert.equal(tier.maxLimit, 99);
    });
  });

  describe("setTier", () => {
    it("should set a users tier", async () => {
      await this.dcbTiers.setTier(0, 1, 50);
      const tier = await this.dcbTiers.tierInfo(0);

      assert.equal(tier.minLimit, 1);
      assert.equal(tier.maxLimit, 50);
    });
  });

  describe("setStakingContract", () => {
    it("should set the address of staking contract to use for tiers", async () => {
      let e = null;
      try {
        await this.dcbTiers.setLegacyStakingContract(this.dcbStaking.address);
      } catch (err) {
        e = err;
      }
      assert.equal(e, null);
    });
  });

  describe("getTotalDeposit", () => {
    it("should return the total amount staked in all staking pools for a user", async () => {
      const amount = await this.dcbTiers.getTotalDeposit(accounts[0]);
      assert.equal(Number(amount), 50);
    });
  });

  describe("getTiersLength", () => {
    it("should get the current number of tiers", async () => {
      const res = await this.dcbTiers.getTiersLength();
      assert.equal(res, 1);
    });
  });

  describe("getTiers", () => {
    it("should return the list of current tiers", async () => {
      const res = await this.dcbTiers.getTiers();
      assert.equal(res.length, 1);
      assert.equal(res[0].minLimit, 1);
    });
  });

  describe("getTierOfUser", () => {
    it("should get the tier of the user without the compounding effect", async () => {
      await this.dcbTiers.addTier(50, 99);
      const { flag, pos, multiplier } = await this.dcbTiers.getTierOfUser(
        accounts[0]
      );

      assert.equal(flag, true);
      assert.equal(pos, 1);
      assert.equal(multiplier, 1);
    });

    it("should get the tier of the user with the compounding effect", async () => {
      const { flag, pos, multiplier } = await this.dcbTiers.getTierOfUser(
        accounts[1]
      );

      assert.equal(flag, true);
      assert.equal(pos, 1);
      assert.equal(multiplier, 3);
    });
  });
});
