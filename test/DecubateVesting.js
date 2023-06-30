//** Test case for Decubate Vesting */
//** Author Vipin & Aaron */
const { time, expectRevert } = require("@openzeppelin/test-helpers");
const { assert, expect } = require("chai");

const DecubateVesting = artifacts.require("DecubateVesting");
const DCBToken = artifacts.require("DCBToken");

before(async () => {
  this.releasetime = Number(await time.latest());
  await time.increase(1000);
});

contract("DecubateVesting", (accounts) => {
  before(async function () {
    this.dcbToken = await DCBToken.deployed();
    this.dcbVesting = await DecubateVesting.deployed();
    await this.dcbToken.transfer(this.dcbVesting.address, '1000000000000000000000000');
    await this.dcbVesting.setToken(this.dcbToken.address);
  });

  describe("deployment", () => {
    it("should deploy contracts and move supply to vesting contract & correctly set token address", async function () {
      expect(this.dcbToken.address);
      expect(this.dcbVesting.address);
      const bal = await this.dcbVesting.getTotalToken(this.dcbToken.address);
      assert.equal(bal.toString(), "1000000000000000000000000");
      assert.equal(await this.dcbVesting.getToken(), this.dcbToken.address);
    });
  });

  describe("addVestingStrategy", () => {
    it("should add a vesting strategy", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.addVestingStrategy(
        "",
        100000,
        current,
        10000000,
        100,
        false
      );

      const strategy = await this.dcbVesting.getVestingInfo(0);

      assert.equal(strategy.cliff, current + 100000);
      assert.equal(strategy.name, "");
      assert.equal(strategy.start, current);
      assert.equal(strategy.duration, 10000000);
      assert.equal(strategy.initialUnlockPercent, 100);
      assert.equal(strategy.revocable, false);
    });
    it('should revert non owner', async function () {
        await expectRevert(this.dcbVesting.addVestingStrategy(
          'Reverted Strategy',
          9327600,
          await time.latest(),
          await time.duration.minutes(10),
          100,
          false,
          { from: accounts[2] }
        ),"Ownable: caller is not the owner");
    });
  });

  describe("setVestingStrategy", () => {
    it("should throw an error as strategy doesn't exist", async function () {
      const current = Number(await time.latest());
      await expectRevert(
        this.dcbVesting.setVestingStrategy(
          1,
          "",
          100000,
          current,
          10000000,
          100,
          false
        ),
        "Strategy does not exist"
      );
    });
  });

  describe("getAllVestingPools", () => {
    it("should return all vesting stratgies", async function () {
      const strategies = await this.dcbVesting.getAllVestingPools();

      const [strategy] = strategies;

      assert.equal(strategies.length, 1);
      assert.equal(strategy.name, "");
      assert.equal(strategy.duration, 10000000);
      assert.equal(strategy.initialUnlockPercent, 100);
      assert.equal(strategy.revocable, false);
    });
  });

  describe("getVestingInfo", () => {
    it("should throw an error as strategy does not exist", async function () {
      await expectRevert(
        this.dcbVesting.getVestingInfo(1),
        "Vesting option does not exist"
      );
    });
  });

  describe("addWhitelist", () => {
    it("should throw an error as strategy does not exist", async function () {
      await expectRevert(
        this.dcbVesting.addWhitelist(accounts[0], 100, 1),
        "Vesting option does not exist"
      );
    });

    it("should add user to whitelist", async function () {
      await this.dcbVesting.addWhitelist(accounts[0], "1000000", 0);
      const whitelist = await this.dcbVesting.getWhitelist(0, accounts[0]);

      assert.equal(whitelist.dcbAmount, "1000000");
    });

    it("should throw an error as user already is whitelisted", async function () {
      await expectRevert(
        this.dcbVesting.addWhitelist(accounts[0], "1000000", 0),
        "Whitelist already available"
      );
    });
  });

  describe("batchAddWhitelist", () => {
    it("should throw an error as input arrays do not match in size", async function () {
      await expectRevert(
        this.dcbVesting.batchAddWhitelist([accounts[0]], [], 0),
        "Sizes of inputs do not match"
      );
    });
    it("should successfully add lists to whitelist", async function () {
      await this.dcbVesting.batchAddWhitelist([accounts[9]], [100], 0);

      assert.equal(await this.dcbVesting.hasWhitelist(0, accounts[9]), true);
    });
  });

  describe("getWhitelist", () => {
    it("should throw an error as strategy does not exist", async function () {
      await expectRevert(
        this.dcbVesting.getWhitelist(1, accounts[0]),
        "Vesting option does not exist"
      );
    });
    it("should throw an error as user already is whitelisted", async function () {
      await expectRevert(
        this.dcbVesting.getWhitelist(0, accounts[1]),
        "User is not in whitelist"
      );
    });
  });

  describe("getVestAmount", () => {
    it("should return 0 as start has not been reached", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        100000,
        current+100,
        60 * 60,
        100,
        false
      );
      const amount = await this.dcbVesting.getVestAmount(0, accounts[0]);
      assert.equal(amount, 0);
    });

    it("should return initial unlock as start has been reached", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        100000,
        current+100,
        60 * 60,
        100,
        false
      );
      await time.increase(101);
      const amount = await this.dcbVesting.getVestAmount(0, accounts[0]);
      assert.equal(amount, '100000');
    });

    it("should return full amount as total duration has been reached", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        0,
        current,
        0,
        100,
        false
      );

      const amount = await this.dcbVesting.getVestAmount(0, accounts[0]);
      assert.equal(amount, "1000000");
    });

    it("should return the initial unlock and unlock amount at different intervals", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        100,
        current + 50,
        1000,
        100,
        false
      );

      let amount = Number(await this.dcbVesting.getVestAmount(0, accounts[0]));
      assert.equal(amount,0); //Start hasn't been reached, so 0 amount
      await time.increase(50);
      amount = Number(await this.dcbVesting.getVestAmount(0, accounts[0]));
      assert.equal(amount,100000); //Start has reached, so initial unlock
      await time.increase(200);

      //Total deposit = 1000000
      //100 seconds passed, initial unlock activated 
      //Initial inlock = 1000000/10 = 100000
      //Remaining token = 1000000 - 100000 = 900000
      //Another 100 seconds passed, of total 10000 seconds. So 1% of remaining should be unlocked
      //Total = 100000 + 900000/100 = 109000
      amount = Number(await this.dcbVesting.getVestAmount(0, accounts[0]));
      assert.isAbove(amount,109000);
      await time.increase(850);
      amount = Number(await this.dcbVesting.getVestAmount(0, accounts[0]));
      assert.isBelow(amount,1000000); //End date haven't reached, so will not get full amount
      await time.increase(100);
      amount = Number(await this.dcbVesting.getVestAmount(0, accounts[0]));
      assert.equal(amount,1000000);//End date over, so full amount
      await time.increase(60*60*24*7);
      amount = Number(await this.dcbVesting.getVestAmount(0, accounts[0]));
      assert.equal(amount,1000000);//One week passed after enddate, still same amount
    });
  });

  describe("getReleasableAmount", () => {
    it("should return the releasable amount", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        100000,
        current+100,
        60 * 60,
        100,
        false
      );

      const amount = await this.dcbVesting.getReleasableAmount(0, accounts[0]);
      assert.equal(amount, 0);
    });
  });

  describe("disable", () => {
    it("should disable and enable back a user from claiming vesting", async function () {
      await this.dcbVesting.addWhitelist(accounts[1], "1000000", 0);
      await this.dcbVesting.setVesting(0, accounts[1],true);
      await this.dcbVesting.setVesting(0, accounts[1],false);
    });
  });

  describe("claimDistribution", () => {
    it("should throw an error as there is not tokens to claim", async function () {
      await expectRevert(
        this.dcbVesting.claimDistribution(0, accounts[0]),
        "Zero amount to claim"
      );
    });
    it("should throw an error as user is disabled from claiming tokens", async function () {
      await this.dcbVesting.setVesting(0, accounts[1],true);
      await expectRevert(
        this.dcbVesting.claimDistribution(0, accounts[1]),
        "User is disabled from claiming token"
      );
    });

    it("should successfully claim 1 token as that is the max tranfer amount", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        0,
        current,
        0,
        100,
        false
      );
      await this.dcbVesting.setMaxTokenTransfer(1, true);

      const bal_before = await this.dcbToken.balanceOf(accounts[0]);

      await this.dcbVesting.claimDistribution(0, accounts[0]);
      await this.dcbVesting.setMaxTokenTransfer(0, false);

      const bal_after = await this.dcbToken.balanceOf(accounts[0]);

      assert.equal(bal_after.sub(bal_before), "1");
    });

    it("should successfully claim tokens", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(
        0,
        "",
        0,
        current,
        0,
        100,
        false
      );

      const bal_before = Number(await this.dcbToken.balanceOf(accounts[0]));

      await this.dcbVesting.claimDistribution(0, accounts[0]);

      const bal_after = Number(await this.dcbToken.balanceOf(accounts[0]));

      assert.equal(bal_after - bal_before, "999999");
    });
  });

  describe("revoke", () => {
    it("should throw an error as strategy is not revocable", async function () {
      await expectRevert(
        this.dcbVesting.revoke(0, accounts[1]),
        "Strategy is not revocable"
      );
    });
    it("should revoke a users vesting startegy", async function () {
      const current = Number(await time.latest());
      await this.dcbVesting.setVestingStrategy(0, "", 0, current, 0, 100, true);
      await this.dcbVesting.revoke(0, accounts[1]);

      const whitelist = await this.dcbVesting.getWhitelist(0, accounts[1]);
      assert.equal(whitelist.revoke, true);
    });
    it("should throw an error as user has already been revoked", async function () {
      await expectRevert(
        this.dcbVesting.revoke(0, accounts[1]),
        "already revoked"
      );
    });
  });

  describe("transferToken", () => {
    it("should transfer token to owner wallet", async function () {
      let balance = await this.dcbToken.balanceOf(accounts[0]);
      await this.dcbVesting.transferToken(this.dcbToken.address, 10000);
      let newBalance = await this.dcbToken.balanceOf(accounts[0]);
      assert.equal(Number(newBalance), Number(balance) + 10000);
    });
  });

  describe("hasWhitelist", () => {
    it("should return true as user has whitelist", async function () {
      const res = await this.dcbVesting.hasWhitelist(0, accounts[0]);
      assert.equal(res, true);
    });
    it("should return false as user does not have whitelist", async function () {
      const res = await this.dcbVesting.hasWhitelist(0, accounts[8]);
      assert.equal(res, false);
    });
  });

  describe("getWhitelistPools", () => {
    it("should get a list of the whitelist users for a vesting strategy", async function () {
      const list = await this.dcbVesting.getWhitelistPool(0);
      assert.equal(list.length, 3);
    });
  });

  describe("setWhitelist", () => {
    it("should set the whitelist amount for a user", async function () {
      await this.dcbVesting.setWhitelist(accounts[0], "100", 0);
      const whitelist = await this.dcbVesting.getWhitelist(0, accounts[0]);

      assert.equal(whitelist.dcbAmount, "100");
    });
  });
});
