//** Test case for Decubate Crowdfunding */
//** Author Aaron & Vipin : Decubate 2021.9 */
const { assert } = require("chai");
const { expectRevert, time } = require("@openzeppelin/test-helpers");

const DecubateCrowdfunding = artifacts.require("DecubateCrowdfunding");
const DCBToken = artifacts.require("DCBToken");
const DecubateWalletStore = artifacts.require("DecubateWalletStore");
const DecubateTiers = artifacts.require("DecubateTiers");
const DecubateInvestments = artifacts.require("DecubateInvestments");
const DecubateVesting = artifacts.require("DecubateVesting");

contract("DecubateCrowdfunding", (accounts) => {
  before(async () => {
    this.dcbToken = await DCBToken.deployed();
    this.dcbTiers = await DecubateTiers.deployed();
    this.DecubateWalletStore = await DecubateWalletStore.deployed();
    this.dcbCrowdfunding = await DecubateCrowdfunding.deployed();
    this.dcbVesting = await DecubateVesting.deployed();
    this.dcbInvestments = await DecubateInvestments.deployed();

    this.dcbTiers.addTier(0, 1000);

    this.dcbInvestments.addEvent(
      this.dcbCrowdfunding.address,
      "Crowdfunding",
      1000,
      "DCB",
      this.dcbVesting.address,
      true,
      1,
      false
    );
  });

  describe("deployment", () => {
    it("should be deployed with an agreement set", async () => {
      const { softcap, hardcap } = await this.dcbCrowdfunding.dcbAgreement();

      assert.equal(softcap, 100);
      assert.equal(hardcap, 1000);
    });
  });

  describe("setDCBAgreement", () => {
    it("should set the terms of the agreement", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        200,
        2000,
        Number(await time.latest()),
        this.dcbToken.address
      );

      const { softcap, hardcap } = await this.dcbCrowdfunding.dcbAgreement();

      assert.equal(softcap, 200);
      assert.equal(hardcap, 2000);
    });
  });

  describe("DecubateWalletStore", () => {
    it("should set the address of wallet store", async () => {
      let e = null;
      try {
        await this.dcbCrowdfunding.setWalletStoreAddress(
          this.DecubateWalletStore.address
        );
      } catch (err) {
        e = err;
      }
      assert.equal(e, null);
    });

    it("should add new wallet to wallet store", async () => {
      await this.DecubateWalletStore.addUser(accounts[5]);
      const users = await this.DecubateWalletStore.getVerifiedUsers();
      assert.equal(users[0], accounts[5]);
    });

    it("should replace one address with another", async () => {
      await this.DecubateWalletStore.replaceUser(accounts[5], accounts[6]);
      const users = await this.DecubateWalletStore.getVerifiedUsers();
      assert.equal(users[0], accounts[6]);
    });
  });

  describe("getInfo", () => {
    it("should return the relevant display info for the frontend", async () => {
      const res = await this.dcbCrowdfunding.getInfo();

      assert.equal(res[0], 200);
      assert.equal(res[1], 2000);
    });
  });

  describe("getTotalToken", () => {
    it("should return the total amount of funding token stored in the contract", async () => {
      const total = await this.dcbCrowdfunding.getTotalToken();
      assert.equal(total, 0);
    });
  });

  describe("fundAgreement", () => {
    it("should throw an error as the users address is not verified", async () => {
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(0),
        "User is not verified"
      );
    });

    it("should throw an error as the amount invested is 0", async () => {
      await this.DecubateWalletStore.addUser(accounts[0]);
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(0),
        "You cannot invest 0"
      );
    });

    it("should throw an error as the crowdfunding has not started", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        100,
        1000,
        Number(await time.latest()) + 60 * 60,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(100),
        "Crowdfunding not open"
      );
    });

    it("should throw an error as the crowdfunding has ended", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        100,
        1000,
        0,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(100),
        "Crowdfunding ended"
      );
    });

    it("should throw an error as the hardcap for the project has been met", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        0,
        0,
        Number(await time.latest()) - 10,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(100),
        "Hardcap already met"
      );
    });

    it("should throw an error as the user has no allocation", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        200,
        1000,
        Number(await time.latest()) - 10,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(101),
        "User does not have any allocation"
      );
    });

    it("should throw an error as the amount is greater than the user has allocated to them", async () => {
      await this.dcbCrowdfunding.setAllocation(accounts[0], 100);
      await this.dcbCrowdfunding.setDCBAgreement(
        200,
        1000,
        Number(await time.latest()) - 10,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.fundAgreement(101),
        "Amount is greater than allocation"
      );
    });

    it("should deposit funds successfully for the first time using allocation", async () => {
      let e = null;
      await this.dcbToken.approve(this.dcbCrowdfunding.address, 200);
      try {
        await this.dcbTiers.setTier(0, 0, 1000);
        await this.dcbCrowdfunding.fundAgreement(50);
      } catch (err) {
        e = err;
      }
      assert.equal(e, null);
    });

    it("should deposit funds successfully for the second time using allocation", async () => {
      let e = null;
      try {
        await this.dcbTiers.setTier(0, 0, 1000);
        await this.dcbCrowdfunding.fundAgreement(25);
      } catch (err) {
        e = err;
      }
      assert.equal(e, null);
    });

    it("should deposit funds successfully for the third time during FCFS", async () => {
      let e = null;
      try {
        await this.dcbCrowdfunding.setDCBAgreement(
          200,
          1000,
          Number(await time.latest()) - 60 * 60 * 5,
          this.dcbToken.address
        );
        await this.dcbTiers.setTier(0, 0, 1000);
        await this.dcbCrowdfunding.fundAgreement(100); //Should work as allocation doubles after 2 hours
      } catch (err) {
        e = err;
      }
      assert.equal(e, null);
    });
  });

  describe("claimInnovatorFund", () => {
    it("should throw an error as crowdfunding end date is not reached", async () => {
      await expectRevert(
        this.dcbCrowdfunding.claimInnovatorFund(),
        "Date and cap not met"
      );
    });

    it("should throw an error as softcap is not reached", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        200,
        1000,
        0,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.claimInnovatorFund(),
        "Date and cap not met"
      );
    });

    it("should throw an error as not enough funds in the treasurey to give", async () => {
      this.dcbCrowdfunding.transferToken(50, accounts[0]);
      await this.dcbCrowdfunding.setDCBAgreement(
        0,
        1000,
        0,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.claimInnovatorFund(),
        "Not enough funds in treasury"
      );
    });

    it("should set a separate innovator wallet", async () => {
      const res = await this.dcbCrowdfunding.setInnovatorAddress(accounts[1], {
        from: accounts[0],
      });
      const agreement = await this.dcbCrowdfunding.dcbAgreement();

      assert.equal(agreement.innovatorWallet, accounts[1]);
    });

    it("should throw an error as innovator is not the caller", async () => {
      await expectRevert(
        this.dcbCrowdfunding.claimInnovatorFund({ from: accounts[0] }),
        "Only innovator can claim"
      );
    });

    it("should successfully send funds to innovator address", async () => {
      await this.dcbToken.transfer(this.dcbCrowdfunding.address, 50);
      await this.dcbCrowdfunding.claimInnovatorFund({ from: accounts[1] });

      assert.equal(
        await this.dcbToken.balanceOf(this.dcbCrowdfunding.address),
        0
      );
    });

    it("should succesfully send funds as hardcap is met", async () => {
      await this.dcbToken.transfer(this.dcbCrowdfunding.address, 175);
      await this.dcbCrowdfunding.setDCBAgreement(
        50,
        75,
        Number(await time.latest()),
        this.dcbToken.address
      );
      await this.dcbCrowdfunding.claimInnovatorFund({ from: accounts[1] });
      assert.equal(await this.dcbToken.balanceOf(accounts[1]), "350"); //175+175
    });
  });

  describe("transferToken", () => {
    it("should throw an error as not enough funds in the treasurey", async () => {
      await expectRevert(
        this.dcbCrowdfunding.transferToken(10000, accounts[0]),
        "Not enough funds in treasury"
      );
    });

    it("should successfully transfer funds from the contract to an address", async () => {
      await this.dcbToken.transfer(this.dcbCrowdfunding.address, 1000);
      await this.dcbCrowdfunding.transferToken(1000, accounts[0]);

      assert.equal(
        await this.dcbToken.balanceOf(this.dcbCrowdfunding.address),
        0
      );
    });
  });

  describe("refund", () => {
    it("should throw an error as user is not an investor", async () => {
      await expectRevert(
        this.dcbCrowdfunding.refund({ from: accounts[1] }),
        "User is not an investor"
      );
    });

    it("should throw an error as the softcap has already been met", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        0,
        1000,
        0,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.refund(),
        "Softcap already reached"
      );
    });

    it("should throw an error as end date has not been reached", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        200,
        1000,
        Number(await time.latest()),
        this.dcbToken.address
      );
      await expectRevert(this.dcbCrowdfunding.refund(), "End date not reached");
    });

    it("should throw an error as not enough funds in the treasurey", async () => {
      await this.dcbCrowdfunding.setDCBAgreement(
        200,
        1000,
        0,
        this.dcbToken.address
      );
      await expectRevert(
        this.dcbCrowdfunding.refund(),
        "Not enough funds in treasury"
      );
    });

    it("should successfully refund investment", async () => {
      await this.dcbToken.transfer(this.dcbCrowdfunding.address, 175);
      await this.dcbCrowdfunding.refund({ from: accounts[0] });
      assert.equal(
        await this.dcbToken.balanceOf(this.dcbCrowdfunding.address),
        0
      );
    });
  });

  describe("userInvestment", () => {
    it("should return a users investment in the project", async () => {
      const {
        investAmount,
        joinDate,
      } = await this.dcbCrowdfunding.userInvestment(accounts[0]);

      assert.equal(investAmount, 0); //Refund claimed
      assert.isTrue(joinDate > 0);
    });
  });

  describe("getParticipants", () => {
    it("should return the users who have participated in crowdfunding", async () => {
      const participants = await this.dcbCrowdfunding.getParticipants();

      assert.equal(participants.length, 1);
    });
  });

  describe("setInnovatorAddress", () => {
    it("shoud throw an error as caller is not innovator", async () => {
      await expectRevert(
        this.dcbCrowdfunding.setInnovatorAddress(accounts[0]),
        "Only innovator can change"
      );
    });
  });
});
