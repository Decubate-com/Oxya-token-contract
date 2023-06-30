const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const DCBToken = artifacts.require("DCBToken");
const DecubateStaking = artifacts.require("DecubateMasterChef");
const DecubateNFT = artifacts.require("DecubateNFT");

contract("DecubateMasterChef", (accounts) => {
  before(async () => {
    this.dcbToken = await DCBToken.deployed();
    this.dcbStaking = await DecubateStaking.deployed();
    this.dcbNft = await DecubateNFT.deployed();
    this.curr = Number(await time.latest());

    await this.dcbToken.transferOwnership(this.dcbStaking.address, {
      from: accounts[0],
    });

    await this.dcbToken.transfer(accounts[1], "2000000000", {
      from: accounts[0],
    });
    await this.dcbToken.transfer(accounts[2], "2000000000", {
      from: accounts[0],
    });
    await this.dcbToken.transfer(accounts[3], "2000000000", {
      from: accounts[0],
    });

    await this.dcbToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[1],
    });
    await this.dcbToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[2],
    });
    await this.dcbToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[3],
    });

    await this.dcbStaking.add(
      "240",
      "1",
      0,
      0,
      "30",
      false,
      this.curr + 86400 * 90,
      "1000",
      "100000",
      "10000000",
      this.dcbToken.address,
      { from: accounts[0] }
    );
    await this.dcbStaking.add(
      "120",
      "2",
      0,
      10,
      "0",
      true,
      this.curr + 86400 * 365,
      "100",
      "100000",
      "100000000",
      this.dcbToken.address,
      { from: accounts[0] }
    );

    await this.dcbNft.mint(3, { from: accounts[0] });
    await this.dcbNft.transferFrom(accounts[0], accounts[3], 0, {
      from: accounts[0],
    });
  });

  it("1. Normal Case", async () => {
    assert.equal((await this.dcbStaking.poolLength()).toString(), "2");

    await this.dcbStaking.stake(1, "2000", { from: accounts[1] });

    assert.equal(
      (await this.dcbToken.balanceOf(accounts[1])).toString(),
      "1999998000"
    );
  });

  it("2. Set pool info", async () => {
    await expectRevert(
      this.dcbStaking.set(
        3,
        "240",
        "10",
        0,
        0,
        "30",
        false,
        this.curr + 86400 * 90,
        "1000",
        "100000",
        "10000000",
        this.dcbToken.address,
        { from: accounts[0] }
      ),
      "Invalid pool Id"
    );

    await this.dcbStaking.set(
      1,
      "120",
      "20",
      0,
      10,
      "0",
      true,
      this.curr + 86400 * 365,
      "100",
      "100000",
      "1000000",
      this.dcbToken.address,
      { from: accounts[0] }
    );

    const poolInfo = await this.dcbStaking.getPools();

    assert.equal(poolInfo[1].hardCap, "1000000");
  });

  it("3. stake/Unstake", async () => {
    await this.dcbStaking.stake(0, "5000", { from: accounts[1] });
    await expectRevert(
      this.dcbStaking.stake(1, "0", { from: accounts[1] }),
      "Invalid amount"
    );
    await expectRevert(
      this.dcbStaking.stake(1, "500000", { from: accounts[1] }),
      "Invalid amount"
    );
    await this.dcbStaking.stake(1, "5000", { from: accounts[1] });
    assert.equal(
      (await this.dcbToken.balanceOf(accounts[1])).toString(),
      "1999988000"
    );

    await this.dcbStaking.unStake(1, "2000", { from: accounts[1] });
    assert.equal(
      (await this.dcbToken.balanceOf(accounts[1])).toString(),
      "1999990000"
    );

    await time.increase(86400 * 61);
    await expectRevert(
      this.dcbStaking.stake(0, "5000", { from: accounts[2] }),
      "Staking is disabled for this pool"
    );
  });

  it("4. Correct unstaking with rewards", async () => {
    assert.isAbove(Number(await this.dcbStaking.payout(0, accounts[1])), 0);

    const prevBalance = Number(await this.dcbToken.balanceOf(accounts[1]));

    await this.dcbStaking.unStake(0, "4000", { from: accounts[1] });

    //61 days passed
    //Reward for 61 days = 204
    //Total after unstake = 4000 + 204
    assert.equal(
      Number(await this.dcbToken.balanceOf(accounts[1])),
      prevBalance + 4204
    );
  });

  it("5. Claim reward ", async () => {
    await this.dcbStaking.stake(1, "50000", { from: accounts[2] });

    await time.increase(86400 * 30);

    let prevBalanceDCB = Number(await this.dcbToken.balanceOf(accounts[2]));
    let prevBalanceOwner = Number(await this.dcbToken.balanceOf(accounts[0]));

    await this.dcbStaking.claimAll({ from: accounts[2] });

    //30 days passed
    //Total reward = 496
    //0.5% fee for each pool claim, 496 * 0.5 / 100 = 2.46 (2)
    //reward = 496 - 2 = 494 (Rounding error happens because of small number)
    assert.equal(
      prevBalanceDCB + 494,
      Number(await this.dcbToken.balanceOf(accounts[2]))
    );
    assert.equal(
      Number(await this.dcbToken.balanceOf(accounts[0])),
      prevBalanceOwner + 2
    );
  });

  it("6. Claim reward with NFT multiplier", async () => {
    await this.dcbStaking.stake(1, "50000", { from: accounts[3] });

    await time.increase(86400 * 30);

    const pool = await this.dcbStaking.poolInfo(1);

    const prevBalanceDCB = Number(await this.dcbToken.balanceOf(accounts[3]));
    const prevBalanceOwner = Number(await this.dcbToken.balanceOf(accounts[0]));

    await this.dcbStaking.claimAll({ from: accounts[3] });

    //30 days passed
    //Total reward = 496
    //NFT multiplier = 496*2 = 992
    //0.5% fee = 992 - 4 = 988
    assert.equal(
      prevBalanceDCB + 988,
      Number(await this.dcbToken.balanceOf(accounts[3]))
    );
    assert.equal(
      Number(await this.dcbToken.balanceOf(accounts[0])),
      prevBalanceOwner + 4
    );
  });

  it("7. Reinvest reward ", async () => {
    await this.dcbStaking.set(
      0,
      "240",
      "10",
      0,
      0,
      "30",
      false,
      this.curr + 86400 * 365,
      "100",
      "1000000",
      "10000000",
      this.dcbToken.address,
      { from: accounts[0] }
    );

    await this.dcbStaking.stake(0, "50000", { from: accounts[2] });
    await time.increase(86400 * 45);

    let totalInvested = (await this.dcbStaking.users(0, accounts[2]))
      .totalInvested;
    let claimAmount = Number(await this.dcbStaking.payout(0, accounts[2]));

    await this.dcbStaking.stake(0, "1000", { from: accounts[2] });

    let currentAmount = (await this.dcbStaking.users(0, accounts[2]))
      .totalInvested;

    assert.equal(
      Number(currentAmount),
      Number(totalInvested) + Number(claimAmount) + 1000
    );
  });

  it("8. Change endDate without affecting stakers", async () => {
    await this.dcbToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[2],
    });

    await this.dcbStaking.stake(1, "5000", { from: accounts[2] });

    await time.increase(86400 * 45);

    //Claim amount before changing endDate
    const prevClaim = Number(await this.dcbStaking.payout(1, accounts[2]));

    //Changing endDate to current time + 100 days
    await this.dcbStaking.set(
      "1",
      "120",
      "20",
      0,
      10,
      "0",
      true,
      Number(await time.latest()) + 86400 * 100,
      "1000",
      "100000",
      "10000000",
      this.dcbToken.address,
      { from: accounts[0] }
    );

    //Claim amount after changing endDate
    const currClaim = Number(await this.dcbStaking.payout(1, accounts[2]));

    assert.equal(prevClaim, currClaim);
  });
});
