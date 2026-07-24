require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Support both PRIVATE_KEY and RELAYER_PRIVATE_KEY from .env
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun"
    }
  },
  networks: {
    eduTestnet: {
      url: "https://rpc.open-campus-codex.gelato.digital",
      chainId: 656476,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: { 
      eduTestnet: "empty" 
    },
    customChains: [
      {
        network: "eduTestnet",
        chainId: 656476,
        urls: {
          apiURL: "https://edu-chain-testnet.blockscout.com/api",
          browserURL: "https://edu-chain-testnet.blockscout.com"
        }
      }
    ]
  }
};
