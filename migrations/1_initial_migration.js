//** Decubate Migration Script */

//** Author Vipin & Aaron : Decubate Crowdfunding 2021.9 */

require("dotenv").config();
const DecubateCrowdfunding = artifacts.require("DecubateCrowdfunding");
const DCBToken = artifacts.require("DCBToken");
const DecubateVesting = artifacts.require("DecubateVesting");
const DecubateInvestments = artifacts.require("DecubateInvestments");
const ERC20Token = artifacts.require("ERC20Token");
const BRIKToken = artifacts.require("BRIKToken");
const SNGToken = artifacts.require("SNGToken");
const ELDAToken = artifacts.require("ELDAToken");
const AEGToken = artifacts.require("AEGToken");
const AN1Token = artifacts.require("AN1Token");
const OXYZToken = artifacts.require("OXYZToken");
const Airdrop = artifacts.require("Airdrop");
const TTMToken = artifacts.require("TTMToken");
const HFDToken = artifacts.require("HFDToken");
const ChainGPT = artifacts.require("ChainGPT");
const GHFDToken = artifacts.require("GHFDToken");
const DecubateStaking = artifacts.require("DecubateStaking");
const DecubateMasterChef = artifacts.require("DecubateMasterChef");
const DecubateTiers = artifacts.require("DecubateTiers");
const DecubateWalletstore = artifacts.require("DecubateWalletstore");
const DCBVault = artifacts.require("DCBVault");
const MockToken = artifacts.require("MockBEP20");
const DepositContract = artifacts.require("DepositContract");
const AITECH = artifacts.require("AITECH");
const ARZToken = artifacts.require("ARZToken");

const { ROUTER,WETH } = require("../constants");
const { now } = require("../util");

module.exports = async function(deployer, network, accounts) {
  // /** migrate DCB token to the network */
  // await deployer.deploy(
  //   DCBToken,
  //   "TEST Token",
  //   "TEST",
  //   "1000000000000000000000000"
  // );

  // /** migrate DCB token to the network */
  // await deployer.deploy(
  //   ChainGPT
  // );

   /** migrate DCB token to the network */
  await deployer.deploy(
    HFDToken
  );

  // /** migrate Mock token to the network */
  // await deployer.deploy(
  //   MockToken,
  //   "Mock Token",
  //   "MTK",
  //   "1000000000000000000000000",
  //   { from: accounts[0] }
  // );

  // await deployer.deploy(DecubateInvestments);

  // /** get instance of deployed Token contract */
  // const tokenInstance = await DCBToken.deployed();

  // await deployer.deploy(
  //   AITECH,
  //   { from: "0x291d3813D975317B4375E050217c5335Ab28e87f" }
  // );
  
  // await deployer.deploy(
  //   ARZToken,
  //   { from: "0xa566d2d79555d0140da6a5ef391409f7a762cd67" }
  // );


  // string memory _name,
  // string memory _symbol,
  // uint256 _initialSupply,
  // uint256 _time,
  // uint256 _startTime,
  // uint256 _blockSellTime,
  // address _router,
  // address _liquidityToken


  // await deployer.deploy(
  //   TTMToken,
  //   "Tradetomato Token",
  //   "TTM",
  //   "1000000000000000000000000000",
  //   now(),
  //   "8640", //startBlock
  //   now() + 10000,
  //   ROUTER,
  //   WETH
  // );

  // /** migrate Decubate Vesting contract to network */
  // await deployer.deploy(DecubateVesting, tokenInstance.address);

  // /** migrate NFT to network */
  // await deployer.deploy(DecubateNFT, 10);

  // let nftInstance = await DecubateNFT.deployed();

  // /** migrate Decubate staking contract to network */
  // await deployer.deploy(DecubateStaking, nftInstance.address);
  // await deployer.deploy(DecubateMasterChef, nftInstance.address);

  // /** get instance of deployed DecubateMasterchef contract */
  // const masterchefInstance = await DecubateMasterChef.deployed();

  // /** get instance of deployed DecubateStaking contract */
  // const stakeInstance = await DecubateStaking.deployed();

  // await deployer.deploy(DCBVault, masterchefInstance.address);

  // const compounder = await DCBVault.deployed();

  // /** migrate wallet storage to network */
  // await deployer.deploy(DecubateWalletstore, 86400); // 24 hours

  // const walletInstance = await DecubateWalletstore.deployed();

  // await deployer.deploy(
  //   DecubateTiers,
  //   masterchefInstance.address,
  //   masterchefInstance.address,
  //   stakeInstance.address,
  //   compounder.address,
  //   tokenInstance.address
  // );

  // const investmentInstance = await DecubateInvestments.deployed();

  // await deployer.deploy(
  //   DecubateCrowdfunding,
  //   walletInstance.address,
  //   investmentInstance.address,
  //   accounts[0],
  //   "100",
  //   "1000",
  //   now(),
  //   tokenInstance.address
  // );
};
