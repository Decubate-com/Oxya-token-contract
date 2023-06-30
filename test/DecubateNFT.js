//** Test case for Decubate NFT */
//** Author Vipin : Decubate 2021.9 */

const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");
const DecubateNFT = artifacts.require("DecubateNFT");

contract("DecubateNFT", (accounts) => {
  before(async () => {
    block = Number(await time.latestBlock());
    times = Number(await time.latest());

    this.dcbNFT = await DecubateNFT.deployed();
    this.baseURI =
      "https://my-json-server.typicode.com/grimreaper619/samplenft/tokens/"; //For testing
    this.maxSupply = 10;
  });

  describe("setURI", () => {
    it("should fail to set a base URI", async () => {
      await expectRevert(
        this.dcbNFT.setBaseURI(this.baseURI, { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("should set a base URI", async () => {
      await this.dcbNFT.setBaseURI(this.baseURI, { from: accounts[0] });
      const URI = await this.dcbNFT.baseURI();

      assert.equal(URI, this.baseURI);
    });

    it("should return tthe base extension", async () => {
      const extension = await this.dcbNFT.baseExtension();

      assert.equal(extension, ".json");
    });
  });

  describe("Get Init info", () => {
    it("should return max supply", async () => {
      const maxSupply = await this.dcbNFT.maxSupply();

      assert.equal(maxSupply, this.maxSupply);
    });

    it("should return current number of tokens minted", async () => {
      const currentSupply = await this.dcbNFT.numTokens();

      assert.equal(currentSupply, "0");
    });

    it("should return status for interfaces", async () => {
      let falsestatus = await this.dcbNFT.supportsInterface("0xffffffff");
      let trueStatus = await this.dcbNFT.supportsInterface("0x01ffc9a7");

      assert.isNotOk(falsestatus); //Returns false since that interface is not implemented
      assert.isOk(trueStatus); //Returns true since IERC165 interface is implemented
    });
  });

  describe("Mint NFT", () => {
    it("should fail to mint NFT from non owner", async () => {
      await expectRevert(
        this.dcbNFT.mint(1, { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("should mint NFT succesfully", async () => {
      await this.dcbNFT.mint(5);

      let currentSupply = await this.dcbNFT.totalSupply();

      assert.equal(currentSupply, 5);
    });

    it("should mint whole supply of NFT", async () => {
      await this.dcbNFT.mint(this.maxSupply - 5);

      let currentSupply = await this.dcbNFT.totalSupply();
      const maxSupply = await this.dcbNFT.maxSupply();

      assert.equal(Number(currentSupply), Number(maxSupply));
    });

    it("should fail to mint above max supply", async () => {
      await expectRevert(this.dcbNFT.mint(1), "Not enough NFT left.");
    });
  });

  describe("Get NFT info", () => {
    it("should return all token ids of a wallet", async () => {
      const ids = await this.dcbNFT.walletOfOwner(accounts[0]);
      assert.equal(ids.length, 10);
    });

    it("should return balance of an address", async () => {
      const bal = await this.dcbNFT.balanceOf(accounts[0]);
      assert.equal(bal, 10);
    });
  });

  describe("NFT interaction", () => {
    it("should approve one NFT token", async () => {
      await this.dcbNFT.approve(accounts[1], 2, { from: accounts[0] });

      const approver = await this.dcbNFT.getApproved(2);

      assert.equal(approver, accounts[1]);
    });

    it("should approve for all tokens", async () => {
      await this.dcbNFT.setApprovalForAll(accounts[1], true, {
        from: accounts[0],
      });

      const stats = await this.dcbNFT.isApprovedForAll(
        accounts[0],
        accounts[1]
      );

      assert.isOk(stats);
    });

    it("should transfer token from owner", async () => {
      await this.dcbNFT.transferFrom(accounts[0], accounts[2], 1, {
        from: accounts[0],
      });

      const ids = await this.dcbNFT.walletOfOwner(accounts[2]);

      assert.equal(ids[0], 1);
    });

    it("should fail transfer from unapproved address", async () => {
      await expectRevert(
        this.dcbNFT.transferFrom(accounts[0], accounts[2], 2, {
          from: accounts[3],
        }),
        "ERC721: transfer caller is not owner nor approved"
      );
    });

    it("should transfer token from owner by an approver", async () => {
      await this.dcbNFT.transferFrom(accounts[0], accounts[2], 3, {
        from: accounts[1],
      });

      const bal = await this.dcbNFT.balanceOf(accounts[2]);

      assert.equal(bal, 2);
    });

    it("should show error for non existing token ID", async () => {
      await expectRevert(
        this.dcbNFT.tokenURI(11),
        "ERC721: URI query for nonexistent token"
      );
    });

    it("should return correct URI for existing token", async () => {
      const actualURI = await this.dcbNFT.tokenURI(1);
      const expectedURI = this.baseURI.concat("1.json");

      assert.equal(actualURI, expectedURI);
    });
  });
});
