import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts:
        process.env.SEPOLIA_PRIVATE_KEY &&
        process.env.SEPOLIA_PRIVATE_KEY.startsWith("0x")
          ? [process.env.SEPOLIA_PRIVATE_KEY]
          : [],
    },
    /** Monad Testnet — chain id 10143 */
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts:
        process.env.MONAD_TESTNET_PRIVATE_KEY &&
        process.env.MONAD_TESTNET_PRIVATE_KEY.startsWith("0x")
          ? [process.env.MONAD_TESTNET_PRIVATE_KEY]
          : [],
    },
  },
});
