#!/usr/bin/env node
/**
 * Standalone test script for atomic swap functionality
 * Usage: yarn test-swap [amount_in_btc] [direction]
 * Example: yarn test-swap 0.00000422 lightning_to_starknet
 */

import "websocket-polyfill";
import { nwc } from "@getalby/sdk";
import dotenv from "dotenv";
import { AtomicSwapsTool } from "./build/tools/atomic_swaps/atomic_swaps.js";
import { createDefaultConfig } from "./build/tools/atomic_swaps/config.js";

// Load environment variables
dotenv.config();

class AtomicSwapTester {
    constructor() {
        this.nwcClient = null;
        this.atomicSwapsTool = null;
    }

    async initialize() {
        console.log("🔧 Initializing atomic swap tester...");
        
        // Check required environment variables
        const requiredEnvVars = [
            'NWC_CONNECTION_STRING',
            'STARKNET_PRIVATE_KEY',
            'STARKNET_ACCOUNT_ADDRESS',
            'STARKNET_RPC_URL'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`❌ Missing required environment variable: ${envVar}`);
            }
        }

        // Initialize NWC client
        console.log("📱 Connecting to NWC wallet...");
        this.nwcClient = new nwc.NWCClient({
            nostrWalletConnectUrl: process.env.NWC_CONNECTION_STRING,
        });

        // Initialize atomic swaps tool
        console.log("⚛️ Initializing atomic swaps tool...");
        const config = createDefaultConfig();
        this.atomicSwapsTool = new AtomicSwapsTool(config, this.nwcClient);
        await this.atomicSwapsTool.initialize();

        console.log("✅ Initialization complete!");
        console.log("");
    }

    async testSwap(amount = "0.00000422", direction = "lightning_to_starknet") {
        console.log(`🚀 Starting ${direction} swap test...`);
        console.log(`💰 Amount: ${amount} BTC`);
        console.log(`📍 Direction: ${direction}`);
        console.log("");

        try {
            // Test basic availability first
            console.log("🔍 Testing AtomiqLabs service availability...");
            try {
                const tokens = this.atomicSwapsTool.swapper.getAvailableTokens();
                const srcToken = tokens.BITCOIN.BTCLN;
                const dstToken = tokens.STARKNET.STRK;
                const limits = this.atomicSwapsTool.swapper.getSwapLimits(srcToken, dstToken);
                console.log("✅ Service responsive, swap limits:", {
                    input: { min: limits.input.min?.toString(), max: limits.input.max?.toString() },
                    output: { min: limits.output.min?.toString(), max: limits.output.max?.toString() }
                });
            } catch (limitsError) {
                console.log("⚠️ Could not get swap limits:", limitsError.message);
            }

            // Prepare swap parameters
            const swapParams = {
                action: "swap",
                direction: direction,
                amount: amount,
                auto_pay: true
            };

            console.log("📋 Swap parameters:", JSON.stringify(swapParams, null, 2));
            console.log("");

            // Execute the swap
            console.log("⏳ Executing swap...");
            const startTime = Date.now();
            
            const result = await this.atomicSwapsTool.handleAction(swapParams);
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.log("");
            console.log("📊 SWAP RESULT:");
            console.log("=".repeat(50));
            console.log(`⏱️  Duration: ${duration}s`);
            console.log(`✅ Success: ${result.success}`);
            console.log(`📝 Message: ${result.message}`);
            
            if (result.data) {
                console.log("📄 Data:");
                console.log(JSON.stringify(result.data, null, 2));
            }

            if (result.error) {
                console.log("❌ Error:");
                console.log(JSON.stringify(result.error, null, 2));
            }

            console.log("=".repeat(50));
            
            return result;

        } catch (error) {
            console.error("💥 Test failed with error:", error);
            
            // Provide specific troubleshooting for common errors
            if (error.message.includes("Internal server error")) {
                console.log("");
                console.log("🔧 TROUBLESHOOTING:");
                console.log("- AtomiqLabs service may be temporarily unavailable");
                console.log("- Try again in a few minutes");
                console.log("- Check if the amount is within supported limits");
                console.log("- Verify your environment variables are correct");
            } else if (error.message.includes("insufficient")) {
                console.log("");
                console.log("🔧 TROUBLESHOOTING:");
                console.log("- Check your wallet balance");
                console.log("- Ensure you have enough funds for the swap + fees");
            } else if (error.message.includes("network")) {
                console.log("");
                console.log("🔧 TROUBLESHOOTING:");
                console.log("- Check your internet connection");
                console.log("- Verify Starknet RPC URL is accessible");
            }
            
            throw error;
        }
    }

    async testWalletConnection() {
        console.log("🔍 Testing wallet connection...");
        try {
            const info = await this.nwcClient.getInfo();
            console.log("✅ Wallet connected successfully!");
            console.log(`📱 Wallet alias: ${info.alias}`);
            console.log(`💰 Balance: ${info.balance} sats`);
            console.log("");
            return true;
        } catch (error) {
            console.error("❌ Wallet connection failed:", error);
            return false;
        }
    }

    async showEnvironmentInfo() {
        console.log("🌍 Environment Information:");
        console.log("=".repeat(40));
        console.log(`🔗 Starknet RPC: ${process.env.STARKNET_RPC_URL}`);
        console.log(`👛 Starknet Address: ${process.env.STARKNET_ACCOUNT_ADDRESS}`);
        console.log(`🌐 Bitcoin Network: ${process.env.BITCOIN_NETWORK || 'mainnet'}`);
        console.log(`🔒 Has Private Key: ${!!process.env.STARKNET_PRIVATE_KEY}`);
        console.log(`🔗 Has NWC Connection: ${!!process.env.NWC_CONNECTION_STRING}`);
        console.log(`🏭 Atomiq URL: ${process.env.ATOMIQ_INTERMEDIARY_URL || 'default'}`);
        console.log("=".repeat(40));
        console.log("");

        // Add usage instructions
        console.log("📖 Usage:");
        console.log("  yarn test-swap [amount] [direction]");
        console.log("  Default: yarn test-swap 0.00000422 lightning_to_starknet");
        console.log("  Example: yarn test-swap 0.00001000 starknet_to_lightning");
        console.log("");
    }

    async cleanup() {
        console.log("Closing NWC client...");
        if (this.nwcClient) {
            try {
                this.nwcClient.close();
                console.log("✅ NWC client closed");
            } catch (error) {
                console.warn("⚠️ Error closing NWC client:", error);
            }
        }

        console.log("Cleaning up atomic swaps tool...");
        if (this.atomicSwapsTool) {
            try {
                // The swapper might have cleanup methods
                if (this.atomicSwapsTool.swapper && typeof this.atomicSwapsTool.swapper.cleanup === 'function') {
                    await this.atomicSwapsTool.swapper.cleanup();
                }
                console.log("✅ Atomic swaps tool cleaned up");
            } catch (error) {
                console.warn("⚠️ Error cleaning up atomic swaps tool:", error);
            }
        }

        console.log("✅ Cleanup completed");
    }
}

async function main() {
    console.log("🧪 Atomic Swap Test Script");
    console.log("=".repeat(30));
    console.log("");

    const tester = new AtomicSwapTester();

    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        const amount = args[0] || "0.00000422";
        const direction = args[1] || "lightning_to_starknet";

        // Validate direction
        if (!["lightning_to_starknet", "starknet_to_lightning"].includes(direction)) {
            throw new Error("Direction must be 'lightning_to_starknet' or 'starknet_to_lightning'");
        }

        // Show environment info
        await tester.showEnvironmentInfo();

        // Initialize everything
        await tester.initialize();

        // Test wallet connection
        const walletOk = await tester.testWalletConnection();
        if (!walletOk) {
            throw new Error("Wallet connection failed - cannot proceed");
        }

        // Run the swap test
        const result = await tester.testSwap(amount, direction);

        // Final summary
        console.log("");
        console.log("🎯 TEST SUMMARY:");
        console.log("=".repeat(20));
        if (result.success) {
            console.log("✅ Swap completed successfully!");
            if (result.data?.swap_id) {
                console.log(`🆔 Swap ID: ${result.data.swap_id}`);
            }
            if (result.data?.state) {
                console.log(`📊 Final State: ${result.data.state}`);
            }
        } else {
            console.log("❌ Swap failed");
            if (result.data?.next_steps) {
                console.log("📝 Next steps:");
                result.data.next_steps.forEach((step, i) => {
                    console.log(`   ${i + 1}. ${step}`);
                });
            }
        }
        console.log("=".repeat(20));

        // Clean up resources
        console.log("🧹 Cleaning up...");
        await tester.cleanup();

    } catch (error) {
        console.error("");
        console.error("💥 Test script failed:");
        console.error(error.message);
        console.error("");
        if (error.stack) {
            console.error("Stack trace:");
            console.error(error.stack);
        }
        
        // Clean up resources even on error
        try {
            await tester.cleanup();
        } catch (cleanupError) {
            console.warn("⚠️ Error during cleanup:", cleanupError);
        }
        
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function
main();