// SPDX-License-Identifier: MIT

//** OXYZ Token Token */
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract OXYZToken is ERC20Burnable {
    constructor() ERC20("OXYZ Token", "$OXYZ") {
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
    }
}