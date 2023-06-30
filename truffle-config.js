const HDWalletProvider = require("@truffle/hdwallet-provider");
require("dotenv").config();

const {
  MNEMONIC,
  ROPSTEN,
  RINKEBY,
  TESTNET_ADDRESS,
  MAINNET_ADDRESS,
  ETHERAPI,
  BSCSCAN,
  POLYGONSCAN,
  SNOWTRACE,
} = process.env;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
      disableConfirmationListener: true,
    },
    ropsten: {
      provider: () => new HDWalletProvider(MNEMONIC, ROPSTEN, 0),
      network_id: 3,
      gas: 8000000,
      gasPrice: 240000000000,
      timeoutBlocks: 5000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
      // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      // skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
    rinkeby: {
      provider: () => new HDWalletProvider(MNEMONIC, RINKEBY),
      network_id: 4,
      gas: 8000000,
      gasPrice: 240000000000,
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    mumbai: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://delicate-still-seed.matic-testnet.quiknode.pro/40211f7f1812064bfd698ddf0570e6f77c9cefd7/"
        ),
      network_id: 80001,
      confirmations: 3,
      timeoutBlocks: 200,
      skipDryRun: true,
      from: TESTNET_ADDRESS,
    },
    polygon: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://matic-mainnet.chainstacklabs.com"
        ),
      network_id: 137,
      confirmations: 3,
      timeoutBlocks: 200,
      skipDryRun: true,
      from: MAINNET_ADDRESS,
    },
    fuji: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://api.avax-test.network/ext/bc/C/rpc"
        ),
      network_id: 43113,
      confirmations: 3,
      timeoutBlocks: 200,
      skipDryRun: true,
      from: TESTNET_ADDRESS,
    },
    testnet: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://data-seed-prebsc-2-s1.binance.org:8545/"
        ),
      network_id: 97,
      confirmations: 3,
      timeoutBlocks: 200,
      skipDryRun: true,
      from: TESTNET_ADDRESS,
    },
    goerli: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "wss://lively-hidden-telescope.ethereum-goerli.quiknode.pro/7f89c743138b2178bef72a6d89aa7d355ba48359/"
        ),
      network_id: 5,
      confirmations: 3,
      timeoutBlocks: 200,
      gas: 8000000,
      gasPrice: 240000000000,
      skipDryRun: true,
      from: TESTNET_ADDRESS,
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://rpc2.sepolia.org"
        ),
      network_id: 11155111,
      confirmations: 3,
      timeoutBlocks: 200,
      // gas: 80000,
      // gasPrice: 2400000000,
      skipDryRun: true,
      from: TESTNET_ADDRESS,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://bsc.meowrpc.com"
        ),
      network_id: 56,
      from: MAINNET_ADDRESS,
    },
    ethereum: {
      provider: () =>
        new HDWalletProvider(
          MNEMONIC,
          "https://eth.drpc.org"
        ),
      network_id: 1,
      from: MAINNET_ADDRESS,
    },
  },
  //
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.17", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
          
        },
      },
    },
  },

  plugins: ["truffle-plugin-verify", "solidity-coverage"],
  api_keys: {
    etherscan: ETHERAPI, // Add  API key
    bscscan: BSCSCAN,
    polygonscan: POLYGONSCAN,
    snowtrace: SNOWTRACE,
  },
};
