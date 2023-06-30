//** Test case for Decubate Token whitelist */
//** Author Aaron : Decubate 2021.9 */

const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert, expect } = require("chai");

const BRIKToken = artifacts.require("BRIKToken");
const Router = artifacts.require("IUniswapV2Router02");
const Factory = artifacts.require("IUniswapV2Factory");
const { ROUTER, WETH } = require("../constants");
const DEAD_ADDR = "0x000000000000000000000000000000000000dEaD";

contract("BRIKToken", (accounts) => {
  before(async () => {
    const router = await Router.at(ROUTER);
    const factory = await Factory.at(await router.factory());
    this.dcbTokenWhitelisted = await BRIKToken.deployed();
    this.pair = await factory.getPair(this.dcbTokenWhitelisted.address, WETH);
    await this.dcbTokenWhitelisted.transfer(accounts[1], 1000);
    await this.dcbTokenWhitelisted.transfer(accounts[4], 1000);
  });

  describe("lockTokens", () => {
    it("should lock some amount of tokens", async () => {
      const bal_before = await this.dcbTokenWhitelisted.balanceOf(DEAD_ADDR);

      await this.dcbTokenWhitelisted.lockTokens(1000);

      const bal_after = await this.dcbTokenWhitelisted.balanceOf(DEAD_ADDR);

      assert.equal(bal_before, 0);
      assert.equal(bal_after, 1000);
    });
  });

  describe("burn", () => {
    it("should burn some amount of tokens", async () => {
      const supply_before = await this.dcbTokenWhitelisted.totalSupply();

      await this.dcbTokenWhitelisted.burn(1000);

      const supply_after = await this.dcbTokenWhitelisted.totalSupply();

      assert.isTrue(supply_before.gt(supply_after));
    });
  });

  describe("isTimeLocked", () => {
    it("should return an error as time is still locked", async () => {
      await expectRevert(
        this.dcbTokenWhitelisted.transfer(accounts[2], 1000, {
          from: accounts[1],
        }),
        "Trading not enabled yet"
      );
    });
    it("should allow owner to sell even when transfer locked", async () => {
      try {
        await this.dcbTokenWhitelisted.transfer(await this.pair, 1000, {
          from: accounts[0],
        });
      } catch (err) {
        assert.equal(err, null);
      }
    });
    it("should trasnfer successfully as time lock disabled", async () => {
      await this.dcbTokenWhitelisted.setTimeLocked(false, 0);
      await this.dcbTokenWhitelisted.transfer(accounts[1], 1000, {
        from: accounts[0],
      });
      const bal = await this.dcbTokenWhitelisted.balanceOf(accounts[1]);
      assert.equal(bal, 2000);
    });
    it("should transfer successfully as time lock has passed", async () => {
      await this.dcbTokenWhitelisted.setTimeLocked(true, 0);
      await this.dcbTokenWhitelisted.transfer(accounts[2], 1000, {
        from: accounts[1],
      });
      const bal = await this.dcbTokenWhitelisted.balanceOf(accounts[2]);
      assert.equal(bal, 1000);
    });
  });

  describe("setBlockSellUntil", () => {
    it("should set the block sell until time", async () => {
      await this.dcbTokenWhitelisted.setBlockSellUntil(0);
      const block_sell_until = await this.dcbTokenWhitelisted.blockSellUntil();
      assert.equal(block_sell_until, 0);
    });
  });

  describe("blacklist", () => {
    it("should blacklist an address", async () => {
      await this.dcbTokenWhitelisted.blackList(accounts[1], true);
      const blacklisted = await this.dcbTokenWhitelisted.isBlackListed(
        accounts[1]
      );
      assert.equal(blacklisted, true);
    });
  });

  describe("setBlacklist", () => {
    it("should set blacklist enabled", async () => {
      await this.dcbTokenWhitelisted.setBlackList(false);
      let blacklist = await this.dcbTokenWhitelisted.isBlackListEnabled();
      assert.equal(blacklist, false);
      await this.dcbTokenWhitelisted.setBlackList(true);
      blacklist = await this.dcbTokenWhitelisted.isBlackListEnabled();
      assert.equal(blacklist, true);
    });
  });

  describe("bulkBlackList", () => {
    it("should throw an error as mismatch in input data", async () => {
      await expectRevert(
        this.dcbTokenWhitelisted.bulkBlackList([accounts[2]], []),
        "Array length mismatch"
      );
    });
    it("should successfully blacklist addresses", async () => {
      await this.dcbTokenWhitelisted.bulkBlackList([accounts[2]], [true]);
      const blacklisted = await this.dcbTokenWhitelisted.isBlackListed(
        accounts[2]
      );
      assert.equal(blacklisted, true);
    });
  });

  describe("whitelist", () => {
    it("should whitelist an address", async () => {
      await this.dcbTokenWhitelisted.whiteList(accounts[1], true);
      let whitelist = await this.dcbTokenWhitelisted.isWhitelisted(accounts[1]);
      assert.equal(whitelist, true);
    });
  });

  describe("onlyWhitelisted", () => {
    it("should prevent non whitelisted users from calling a function", async () => {
      await expectRevert(
        this.dcbTokenWhitelisted.setBlockSellUntil(0, { from: accounts[2] }),
        "Caller is not whitelister"
      );
    });
  });

  describe("notBlackListed", () => {
    it("shouldn't stop the transfer as blacklisting is disabled", async () => {
      await this.dcbTokenWhitelisted.setBlackList(false);
      const bal_before = await this.dcbTokenWhitelisted.balanceOf(accounts[1]);
      await this.dcbTokenWhitelisted.transfer(accounts[1], 1000);
      const bal_after = await this.dcbTokenWhitelisted.balanceOf(accounts[1]);
      assert.equal(bal_after.sub(bal_before), 1000);
    });

    it("should stop the transfer as it's from a blacklisted address", async () => {
      await this.dcbTokenWhitelisted.setBlackList(true);
      await this.dcbTokenWhitelisted.blackList(accounts[1], true);
      await expectRevert(
        this.dcbTokenWhitelisted.transfer(accounts[1], 1000),
        "Address is blacklisted"
      );
    });
  });

  describe("isSaleBlocked", () => {
    it("should throw an error as selling is currently disabled", async () => {
      await this.dcbTokenWhitelisted.setBlockSellUntil(
        Number(await time.latest()) + 24 * 60 * 60
      );
      await expectRevert(
        this.dcbTokenWhitelisted.transfer(await this.pair, 1000, {
          from: accounts[4],
        }),
        "Sell disabled!"
      );
    });

    it("should set a new pair address", async () => {
      await this.dcbTokenWhitelisted.setBlockSellUntil(
        Number(await time.latest()) + 24 * 60 * 60
      );
      await this.dcbTokenWhitelisted.setPairAddress(accounts[3], true);
      await expectRevert(
        this.dcbTokenWhitelisted.transfer(accounts[3], 1000, {
          from: accounts[4],
        }),
        "Sell disabled!"
      );
    });

    it("should allow the sale as selling is no longer blocked", async () => {
      await this.dcbTokenWhitelisted.setBlockSellUntil(0);
      const bal_before = await this.dcbTokenWhitelisted.balanceOf(
        await this.pair
      );
      await this.dcbTokenWhitelisted.transfer(await this.pair, 1000, {
        from: accounts[4],
      });
      const bal_after = await this.dcbTokenWhitelisted.balanceOf(
        await this.pair
      );
      assert.equal(bal_after.sub(bal_before), 1000);
    });
  });
});
