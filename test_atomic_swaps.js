#!/usr/bin/env node

import "websocket-polyfill";
import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import { AtomicSwapsTool } from "./build/tools/atomic_swaps/atomic_swaps.js";
import { BitcoinNetwork } from "@atomiqlabs/sdk";

async function testAtomicSwaps() {
  console.log("Testing atomic swaps tool...");
  
  try {
    // Create custom config with environment variables loaded
    const customConfig = {
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
    
    console.log("Using custom config with:", {
      starknetRpcUrl: customConfig.starknetRpcUrl,
      starknetAccountAddress: customConfig.starknetAccountAddress,
      hasPrivateKey: !!customConfig.starknetPrivateKey,
      bitcoinNetwork: customConfig.bitcoinNetwork
    });
    
    // Create the tool instance
    const tool = new AtomicSwapsTool(customConfig);
    
    // Initialize the tool
    await tool.initialize();
    
    // Test quote for Lightning to Starknet
    console.log("Getting quote for 150 sats (0.0000015 BTC) to STRK...");
    
    const quoteParams = {
      action: "quote",
      direction: "lightning_to_starknet",
      amount: "0.0000015"
    };
    
    const quoteResult = await tool.handleAction(quoteParams);
    console.log("Quote result:", JSON.stringify(quoteResult, null, 2));
    
    if (quoteResult.success && quoteResult.data) {
      const swapId = quoteResult.data.id;
      console.log(`\nSwap quote created with ID: ${swapId}`);
      
      // Ask user if they want to execute the swap
      console.log("\nQuote details:");
      console.log(`- Input: ${quoteResult.data.input_amount} sats`);
      console.log(`- Output: ${quoteResult.data.output_amount} STRK`);
      console.log(`- Fee: ${quoteResult.data.fee_amount} sats`);
      console.log(`- Exchange rate: ${quoteResult.data.exchange_rate}`);
      
      // Execute the swap
      console.log("\nExecuting swap...");
      const executeParams = {
        action: "execute",
        direction: "lightning_to_starknet",
        swap_id: swapId
      };
      
      const executeResult = await tool.handleAction(executeParams);
      console.log("Execute result:", JSON.stringify(executeResult, null, 2));
      
      if (executeResult.success && executeResult.data) {
        console.log(`\nSwap execution initiated!`);
        console.log(`Lightning invoice: ${executeResult.data.lightning_invoice}`);
        console.log(`Pay this invoice to complete the swap.`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Run the test
testAtomicSwaps().catch(console.error);