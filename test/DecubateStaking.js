const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const { ROUTER, WETH } = require("../constants");
const DCBToken = artifacts.require("DCBToken");
const DecubateStaking = artifacts.require("DecubateStaking");
const DecubateNFT = artifacts.require("DecubateNFT");
const MockToken = artifacts.require("MockBEP20");
const Router = artifacts.require("IUniswapV2Router02");

contract("DecubateStaking", (accounts) => {
  before(async () => {
    this.depositToken = await DCBToken.deployed();
    this.rewardToken = await MockToken.deployed();
    this.dcbStaking = await DecubateStaking.deployed();
    this.dcbNft = await DecubateNFT.deployed();
    this.curr = Number(await time.latest());
    this.router = await Router.at(ROUTER);

    const currTime = await time.latest();

    await this.depositToken.approve(this.router.address, BigInt(2e18), {
      from: accounts[0],
    });

    await this.rewardToken.approve(this.router.address, BigInt(2e18), {
      from: accounts[0],
    });

    await this.router.addLiquidityETH(
      this.depositToken.address,
      BigInt(1e17),
      0,
      0,
      this.router.address,
      currTime + 100,
      { value: 1e18, from: accounts[0] }
    );

    await this.router.addLiquidityETH(
      this.rewardToken.address,
      BigInt(1e18),
      0,
      0,
      this.router.address,
      currTime + 1000,
      { value: 1e18, from: accounts[0] }
    );

    await this.depositToken.transfer(accounts[1], "2000000000", {
      from: accounts[0],
    });
    await this.depositToken.transfer(accounts[2], "2000000000", {
      from: accounts[0],
    });
    await this.depositToken.transfer(accounts[3], "2000000000", {
      from: accounts[0],
    });

    await this.rewardToken.transfer(this.dcbStaking.address, "2000000000", {
      from: accounts[0],
    });
    await this.depositToken.transfer(this.dcbStaking.address, "2000000000", {
      from: accounts[0],
    });

    await this.depositToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[1],
    });
    await this.depositToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[2],
    });
    await this.depositToken.approve(this.dcbStaking.address, "10000000", {
      from: accounts[3],
    });

    await this.dcbStaking.add(
      "240",
      "10",
      0,
      0,
      "30",
      false,
      this.curr + 86400 * 90,
      WETH,
      {
        addr: this.depositToken.address,
        router: ROUTER,
      },
      {
        addr: this.depositToken.address,
        router: ROUTER,
      },
      { from: accounts[0] }
    );
    await this.dcbStaking.add(
      "120",
      "20",
      0,
      10,
      "0",
      true,
      this.curr + 86400 * 365,
      WETH,
      {
        addr: this.depositToken.address,
        router: ROUTER,
      },
      {
        addr: this.rewardToken.address,
        router: ROUTER,
      },
      { from: accounts[0] }
    );

    await this.dcbNft.mint(3, { from: accounts[0] });
    await this.dcbNft.transferFrom(accounts[0], accounts[3], 1, {
      from: accounts[0],
    });
  });

  it("1. Normal Case", async () => {
    assert.equal((await this.dcbStaking.poolLength()).toString(), "2");

    await this.dcbStaking.stake(1, "2000", { from: accounts[1] });

    assert.equal(
      (await this.depositToken.balanceOf(accounts[1])).toString(),
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
        10,
        "30",
        false,
        this.curr + 86400 * 90,
        WETH,
        {
          addr: this.depositToken.address,
          router: ROUTER,
        },
        {
          addr: this.depositToken.address,
          router: ROUTER,
        },
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
      WETH,
      {
        addr: this.depositToken.address,
        router: ROUTER,
      },
      {
        addr: this.rewardToken.address,
        router: ROUTER,
      },
      { from: accounts[0] }
    );

    const poolInfo = await this.dcbStaking.getPools();

    assert.equal(poolInfo[1].tradesAgainst, WETH);
  });

  it("3. stake/Unstake", async () => {
    await this.dcbStaking.stake(0, "5000", { from: accounts[1] });

    await this.dcbStaking.stake(1, "5000", { from: accounts[1] });
    assert.equal(
      (await this.depositToken.balanceOf(accounts[1])).toString(),
      "1999988000"
    );

    await this.dcbStaking.unStake(1, "2000", { from: accounts[1] });
    assert.equal(
      (await this.depositToken.balanceOf(accounts[1])).toString(),
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

    const prevBalance = Number(await this.depositToken.balanceOf(accounts[1]));

    await this.dcbStaking.unStake(0, "4000", { from: accounts[1] });

    //61 days passed
    //Reward for 61 days = 204
    //Total after unstake = 4000 + 204
    assert.equal(
      Number(await this.depositToken.balanceOf(accounts[1])),
      prevBalance + 4204
    );
  });

  it("5. Claim reward ", async () => {
    await this.dcbStaking.stake(1, "50000", { from: accounts[2] });

    await time.increase(86400 * 30);

    let prevBalanceDCB = Number(await this.rewardToken.balanceOf(accounts[2]));
    let prevBalanceOwner = Number(
      await this.rewardToken.balanceOf(accounts[0])
    );

    await this.dcbStaking.claimAll({ from: accounts[2] });

    //30 days passed
    //Total reward = 496
    //Deposit token is 10 times more valuable than reward token
    // 496 * 10 = 4960
    //0.5% fee for each pool claim, 4960 * 0.5 / 100 = 24.6 (24)
    //reward = 4960 - 24 = 4936 (Rounding error happens because of small number)
    assert.equal(
      prevBalanceDCB + 4936,
      Number(await this.rewardToken.balanceOf(accounts[2]))
    );
    assert.equal(
      Number(await this.rewardToken.balanceOf(accounts[0])),
      prevBalanceOwner + 2
    );
  });

  it("6. Claim reward with NFT multiplier", async () => {
    await this.dcbStaking.stake(1, "50000", { from: accounts[3] });

    await time.increase(86400 * 30);

    let prevBalanceDCB = Number(await this.rewardToken.balanceOf(accounts[3]));
    let prevBalanceOwner = Number(
      await this.rewardToken.balanceOf(accounts[0])
    );

    await this.dcbStaking.claimAll({ from: accounts[3] });

    //30 days passed
    //Total reward = 4960 //Deposit-reward token price difference
    //NFT multiplier = 4960*2 = 9920
    //0.5% fee for each pool claim, 9920 * 0.5 / 100 = 49.6 (49)
    //reward = 9920 - 49 = 9871 (Rounding error happens because of small number)
    assert.equal(
      prevBalanceDCB + 9871,
      Number(await this.rewardToken.balanceOf(accounts[3]))
    );
    assert.equal(
      Number(await this.rewardToken.balanceOf(accounts[0])),
      prevBalanceOwner + 4
    );
  });

  it("7. Change endDate without affecting stakers", async () => {
    await this.depositToken.approve(this.dcbStaking.address, "10000000", {
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
      WETH,
      {
        addr: this.depositToken.address,
        router: ROUTER,
      },
      {
        addr: this.depositToken.address,
        router: ROUTER,
      },
      { from: accounts[0] }
    );

    //Claim amount after changing endDate
    const currClaim = Number(await this.dcbStaking.payout(1, accounts[2]));

    assert.equal(prevClaim, currClaim);
  });
});
