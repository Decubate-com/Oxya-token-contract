//** Decubate Migration Script */

//** Author Vipin & Aaron : Decubate Crowdfunding 2021.9 */

require("dotenv").config();
const OXYZToken = artifacts.require("OXYZToken");

const { ROUTER,WETH } = require("../constants");
const { now } = require("../util");

module.exports = async function(deployer, network, accounts) {

   /** migrate DCB token to the network */
  await deployer.deploy(
    OXYZToken
  );

};
