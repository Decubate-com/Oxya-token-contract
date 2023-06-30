//** Test case for Decubate Tiers */
//** Author Aaron : Decubate 2021.9 */

const { expectRevert } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { assert } = require("chai");
const DecubateInvestments = artifacts.require("DecubateInvestments");
const DecubateVesting = artifacts.require("DecubateVesting");
const DCBToken = artifacts.require("DCBToken");

const { now } = require("../util");

contract("DecubateInvestments", (accounts) => {
  const EVENT_ONE = accounts[0];
  const EVENT_TWO = accounts[1];
  const DEAD_ADDR = "0x000000000000000000000000000000000000dEaD";

  before(async () => {
    this.dcbInvestments = await DecubateInvestments.deployed();
    this.dcbVesting = await DecubateVesting.deployed();
    this.dcbToken = await DCBToken.deployed();

    await this.dcbVesting.addVestingStrategy("", 0, now(), 60 * 60, 100, false);
    await this.dcbVesting.addWhitelist(accounts[0], 1000, 0);
    await this.dcbVesting.setToken(this.dcbToken.address);
    await this.dcbToken.transfer(this.dcbVesting.address, 1000);
  });

  describe("addEvent", () => {
    it("should add a new event", async () => {
      await this.dcbInvestments.addEvent(
        EVENT_ONE,
        "Test",
        web3.utils.toWei("0.1"),
        "TEST",
        DEAD_ADDR,
        false,
        0,
        false
      );
      await this.dcbInvestments.addEvent(
        EVENT_TWO,
        "Test Airdrop",
        web3.utils.toWei("0.1"),
        "TAIR",
        DEAD_ADDR,
        false,
        0,
        true
      );

      const event = await this.dcbInvestments.events(EVENT_ONE);

      assert.equal(event.name, "Test");
      assert.equal(event.tokenPrice, web3.utils.toWei("0.1"));
      assert.equal(event.tokenSymbol, "TEST");
      assert.equal(event.vestingAddress, DEAD_ADDR);
      assert.equal(event.vestingActive, false);
      assert.equal(event.vestingId, 0);
      assert.equal(event.isAirdrop, false);
    });

    it("should throw an error as event already exists", async () => {
      await expectRevert(
        this.dcbInvestments.addEvent(
          EVENT_ONE,
          "Test",
          web3.utils.toWei("0.1"),
          "TEST",
          DEAD_ADDR,
          false,
          0,
          false
        ),
        "Event already exists"
      );
    });
  });

  describe("setEvent", () => {
    it("should throw an error as the event does not exist", async () => {
      await expectRevert(
        this.dcbInvestments.setEvent(
          DEAD_ADDR,
          "Test",
          web3.utils.toWei("0.1"),
          "TEST",
          DEAD_ADDR,
          false,
          0,
          false
        ),
        "Event does not exist"
      );
    });
    it("should set an events details", async () => {
      await this.dcbInvestments.setEvent(
        EVENT_ONE,
        "Test",
        web3.utils.toWei("0.1"),
        "TEST",
        this.dcbVesting.address,
        true,
        0,
        false
      );

      const event = await this.dcbInvestments.events(EVENT_ONE);

      assert.equal(event.name, "Test");
      assert.equal(event.tokenPrice, web3.utils.toWei("0.1"));
      assert.equal(event.tokenSymbol, "TEST");
      assert.equal(event.vestingAddress, this.dcbVesting.address);
      assert.equal(event.vestingActive, true);
      assert.equal(event.vestingId, 0);
      assert.equal(event.isAirdrop, false);
    });
  });

  describe("setUserInvestment", () => {
    it("should throw an error as the event does not exist", async () => {
      await expectRevert(
        this.dcbInvestments.setUserInvestment(accounts[0], DEAD_ADDR, "0"),
        "Event not active"
      );
    });
    it("should throw an error as the caller is not authorized", async () => {
      await expectRevert(
        this.dcbInvestments.setUserInvestment(accounts[0], EVENT_ONE, "0", {
          from: accounts[1],
        }),
        "Caller does not have correct permission"
      );
    });
    it("should set investment amount for a normal event", async () => {
      await this.dcbInvestments.setUserInvestment(accounts[0], EVENT_ONE, "1");

      const { amount } = await this.dcbInvestments.userInvestments(
        accounts[0],
        EVENT_ONE
      );

      assert.equal(amount, "1");
    });
    it("should set investment amount for an airdrop event", async () => {
      await this.dcbInvestments.setUserInvestment(accounts[0], EVENT_TWO, 0);

      const { active } = await this.dcbInvestments.userInvestments(
        accounts[0],
        EVENT_TWO
      );

      assert.equal(active, true);
    });
    it("should set investment amount to 0 for a non airdrop event (refund for example)", async () => {
      const { length: num_before } =
        await this.dcbInvestments.getUserInvestments(accounts[0]);

      await this.dcbInvestments.setUserInvestment(accounts[0], EVENT_ONE, 0);

      const { length: num_after } =
        await this.dcbInvestments.getUserInvestments(accounts[0]);

      assert.equal(num_before - num_after, 1);
    });
  });

  describe("getInvestmentInfo", () => {
    it("should return the events investment info for user", async () => {
      const event = await this.dcbInvestments.getInvestmentInfo(
        accounts[0],
        EVENT_ONE
      );

      assert.equal(event.name, "Test");
      assert.equal(event.tokenPrice, web3.utils.toWei("0.1"));
      assert.equal(event.tokenSymbol, "TEST");
      assert.equal(event.vestingActive, true);
      assert.equal(event.invested, 0);
      assert.equal(event.isAirdrop, false);
    });
  });

  describe("getVestingInfo", () => {
    it("should return the events vesting info for user", async () => {
      const vesting = await this.dcbInvestments.getVestingInfo(
        accounts[0],
        EVENT_ONE
      );

      assert.equal(vesting.duration, 60 * 60);
      assert.equal(vesting.total, 1000);
      assert.equal(vesting.released, 0);
      assert.isTrue(vesting.available.gt(0));
      assert.equal(vesting.initialUnlockPercent, 100);
    });
    it("should throw an error as vesting is not active yet", async () => {
      await expectRevert(
        this.dcbInvestments.getVestingInfo(accounts[0], EVENT_TWO),
        "Vesting is not active yet"
      );
    });
  });

  describe("claimDistribution", () => {
    it("should throw an error as vesting is not active", async () => {
      await expectRevert(
        this.dcbInvestments.claimDistribution(accounts[0], EVENT_TWO),
        "Vesting is not active"
      );
    });

    it("should claim the tokens from the vesting contract", async () => {
      const bal_before = await this.dcbToken.balanceOf(accounts[0]);

      await this.dcbInvestments.claimDistribution(accounts[0], EVENT_ONE);

      const bal_after = await this.dcbToken.balanceOf(accounts[0]);

      assert.isTrue(bal_after.sub(bal_before).gte(100)); // at least initial unlock received
    });
  });
});
