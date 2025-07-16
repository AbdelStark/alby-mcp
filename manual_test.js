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

console.log("Config loaded with:", {
  starknetRpcUrl: config.starknetRpcUrl,
  starknetAccountAddress: config.starknetAccountAddress,
  hasPrivateKey: !!config.starknetPrivateKey,
  bitcoinNetwork: config.bitcoinNetwork
});

async function testQuote() {
  try {
    // Create the tool
    const tool = new AtomicSwapsTool(config);
    
    // Initialize the tool
    await tool.initialize();
    
    // Get quote
    console.log("Getting quote for 1000 sats (0.00001 BTC) to STRK...");
    const quoteParams = {
      action: "quote",
      direction: "lightning_to_starknet",
      amount: "0.00001"
    };
    
    const quoteResult = await tool.handleAction(quoteParams);
    console.log("Quote result:", JSON.stringify(quoteResult, null, 2));
    
    if (quoteResult.success) {
      console.log("SUCCESS: Quote obtained successfully!");
      console.log(`Swap ID: ${quoteResult.data.id}`);
      console.log(`Input: ${quoteResult.data.input_amount} sats`);
      console.log(`Output: ${quoteResult.data.output_amount} STRK units`);
      console.log(`Fee: ${quoteResult.data.fee_amount} sats`);
      console.log(`Exchange rate: ${quoteResult.data.exchange_rate}`);
      
      // If user wants to execute the swap
      const swapId = quoteResult.data.id;
      console.log("\nExecuting swap...");
      
      const executeParams = {
        action: "execute",
        direction: "lightning_to_starknet",
        swap_id: swapId
      };
      
      const executeResult = await tool.handleAction(executeParams);
      console.log("Execute result:", JSON.stringify(executeResult, null, 2));
      
      if (executeResult.success) {
        console.log("SUCCESS: Swap execution initiated!");
        console.log(`Lightning invoice: ${executeResult.data.lightning_invoice}`);
        console.log(`Lightning hyperlink: ${executeResult.data.lightning_hyperlink}`);
        console.log("Pay the lightning invoice above to complete the swap!");
      } else {
        console.log("FAILED: Swap execution failed");
      }
    } else {
      console.log("FAILED: Quote failed");
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testQuote();