#!/usr/bin/env node

import "websocket-polyfill";
import dotenv from "dotenv";
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

async function testLimits() {
  try {
    // Create the tool
    const tool = new AtomicSwapsTool(config);
    
    // Test limits without initializing
    console.log("Getting limits for lightning_to_starknet...");
    const limitsParams = {
      action: "limits",
      direction: "lightning_to_starknet"
    };
    
    const limitsResult = await tool.handleAction(limitsParams);
    console.log("Limits result:", JSON.stringify(limitsResult, null, 2));
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testLimits();