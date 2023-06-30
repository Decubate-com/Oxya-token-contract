//** Test case for Decubate NFT */
//** Author Vipin : Decubate 2021.9 */

const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const DecubateWalletstore = artifacts.require("DecubateWalletstore");

contract("DecubateWalletstore", (accounts) => {
  before(async () => {
    this.dcbWalletstore = await DecubateWalletstore.deployed();
  });

  describe("addUser", () => {
    it("should add a user to the contract", async () => {
      await this.dcbWalletstore.addUser(accounts[0]);

      assert(await this.dcbWalletstore.isVerified(accounts[0]), true);
    });

    it("should throw an error as the user is already verified", async () => {
      await expectRevert(
        this.dcbWalletstore.addUser(accounts[0]),
        "user is already verified"
      );
    });
  });

  describe("replaceUser", () => {
    it("should throw an error as user does not have correct permission", async () => {
      await expectRevert(
        this.dcbWalletstore.replaceUser(accounts[0], accounts[1], {
          from: accounts[1],
        }),
        "user does not have correct permission"
      );
    });

    it("should throw an error as new address is already verified", async () => {
      await expectRevert(
        this.dcbWalletstore.replaceUser(accounts[0], accounts[0]),
        "new address is already verified"
      );
    });

    it("should succesfully replace a users address", async () => {
      await this.dcbWalletstore.replaceUser(accounts[0], accounts[1]);

      assert.equal(await this.dcbWalletstore.isVerified(accounts[0]), false);
      assert.equal(await this.dcbWalletstore.isVerified(accounts[1]), true);
    });

    it("should throw an error as user has changed their wallet recently", async () => {
      await expectRevert(
        this.dcbWalletstore.replaceUser(accounts[1], accounts[0], {
          from: accounts[1],
        }),
        "Wait before changing wallet again"
      );
    });
  });

  describe("getVerifiedUsers", () => {
    it("should get the list of verified users", async () => {
      const list = await this.dcbWalletstore.getVerifiedUsers();

      assert.equal(list.length, 1);
      assert.equal(list[0], accounts[1]);
    });
  });

  describe("batchAddUser", () => {
    it("should add a list of users to the wallet store", async () => {
      await this.dcbWalletstore.batchAddUser([
        accounts[2],
        accounts[3],
        accounts[4],
      ]);
      const list = await this.dcbWalletstore.getVerifiedUsers();
      assert.equal(list.length, 4);
      assert.equal(list[0], accounts[1]);
      assert.equal(list[1], accounts[2]);
      assert.equal(list[2], accounts[3]);
      assert.equal(list[3], accounts[4]);
    });
  });
});
