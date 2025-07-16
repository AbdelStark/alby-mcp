#!/usr/bin/env node

import "websocket-polyfill";
import dotenv from "dotenv";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BitcoinNetwork } from "@atomiqlabs/sdk";
import { AtomicSwapsTool } from "./build/tools/atomic_swaps/atomic_swaps.js";

// Load environment variables
dotenv.config();

// Create proper config with environment variables
const config = {
  starknetRpcUrl: process.env.STARKNET_RPC_URL || "https://starknet-mainnet.public.blastapi.io/rpc/v0_7",
  bitcoinNetwork: process.env.BITCOIN_NETWORK === "testnet" ? BitcoinNetwork.TESTNET : BitcoinNetwork.MAINNET,
  starknetPrivateKey: process.env.STARKNET_PRIVATE_KEY,
  starknetAccountAddress: process.env.STARKNET_ACCOUNT_ADDRESS,
  getRequestTimeout: parseInt(process.env.GET_REQUEST_TIMEOUT || "10000"),
  postRequestTimeout: parseInt(process.env.POST_REQUEST_TIMEOUT || "10000"),
  maxPricingDifferencePPM: BigInt(process.env.MAX_PRICING_DIFFERENCE_PPM || "20000"),
  defaultGasAmount: process.env.DEFAULT_GAS_AMOUNT ? BigInt(process.env.DEFAULT_GAS_AMOUNT) : BigInt("1000000000000000000"),
  enableTestnet: process.env.ENABLE_TESTNET === "true"
};

console.log("Config loaded with:", {
  starknetRpcUrl: config.starknetRpcUrl,
  starknetAccountAddress: config.starknetAccountAddress,
  hasPrivateKey: !!config.starknetPrivateKey,
  bitcoinNetwork: config.bitcoinNetwork
});

// Create MCP server
const server = new McpServer({
  name: "atomic-swaps-test",
  version: "1.0.0",
  title: "Atomic Swaps Test Server",
});

// Create and register the tool
const tool = new AtomicSwapsTool(config);
tool.registerTool(server);

// Connect to transport
const transport = new StdioServerTransport();
server.connect(transport);

console.log("Server ready for atomic swaps operations");