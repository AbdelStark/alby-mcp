import { BitcoinNetwork } from "@atomiqlabs/sdk";

/**
 * Utility functions for atomic swaps
 */

/**
 * Convert satoshis to human readable format
 */
export function satoshisToHumanReadable(sats: bigint): string {
  const btc = Number(sats) / 100000000;
  return `${btc.toFixed(8)} BTC`;
}

/**
 * Convert human readable BTC to satoshis
 * Supports both BTC format (0.00000342) and sats format (342)
 */
export function humanReadableToSatoshis(amount: string): bigint {
  const numAmount = parseFloat(amount);
  
  // If the amount is very small (< 0.01), treat it as BTC
  // If the amount is >= 0.01, treat it as sats
  if (numAmount < 0.01) {
    // BTC format - convert to sats
    const sats = Math.round(numAmount * 100000000);
    return BigInt(sats);
  } else {
    // Sats format - use as is
    return BigInt(Math.round(numAmount));
  }
}

/**
 * Convert Starknet token amount to human readable format
 */
export function starknetTokenToHumanReadable(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fractional = amount % divisor;
  
  if (fractional === 0n) {
    return whole.toString();
  }
  
  const fractionalStr = fractional.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  return `${whole.toString()}.${trimmedFractional}`;
}

/**
 * Convert human readable Starknet token to base units
 */
export function humanReadableToStarknetToken(amount: string, decimals: number = 18): bigint {
  const [whole, fractional = ''] = amount.split('.');
  const wholeBigInt = BigInt(whole || '0');
  const fractionalPadded = fractional.padEnd(decimals, '0').slice(0, decimals);
  const fractionalBigInt = BigInt(fractionalPadded || '0');
  
  return wholeBigInt * BigInt(10 ** decimals) + fractionalBigInt;
}

/**
 * Format swap state for display
 */
export function formatSwapState(state: number | string): string {
  if (typeof state === 'string') {
    return state;
  }

  // Map numeric states to descriptive strings
  const stateMap: { [key: number]: string } = {
    // Common states
    0: "CREATED",
    1: "COMMITTED", 
    2: "SOFT_CLAIMED",
    3: "CLAIMED",
    4: "REFUNDABLE"
  };
  
  // Add error states separately to handle negative keys
  stateMap[-1] = "EXPIRED";
  stateMap[-2] = "QUOTE_EXPIRED";
  stateMap[-3] = "QUOTE_SOFT_EXPIRED";
  stateMap[-4] = "FAILED";
  stateMap[-5] = "CLOSED";

  return stateMap[state] || `UNKNOWN_STATE_${state}`;
}

/**
 * Calculate swap progress percentage
 */
export function calculateSwapProgress(state: number | string, direction: string): number {
  let numericState: number;
  
  if (typeof state === 'string') {
    // Convert string states to numeric for calculation
    const stateToNumeric: { [key: string]: number } = {
      "CREATED": 0,
      "PR_CREATED": 0,
      "COMMITTED": 1,
      "PR_PAID": 1,
      "SOFT_CLAIMED": 2,
      "CLAIM_COMMITTED": 2,
      "CLAIMED": 3,
      "CLAIM_CLAIMED": 3,
      "REFUNDABLE": 4
    };
    numericState = stateToNumeric[state] || 0;
  } else {
    numericState = state;
  }

  // Handle error states
  if (numericState < 0) {
    return 0;
  }

  if (direction === "lightning_to_starknet") {
    switch (numericState) {
      case 0: return 25;  // CREATED
      case 1: return 50;  // COMMITTED
      case 2: return 75;  // SOFT_CLAIMED
      case 3: return 100; // CLAIMED
      case 4: return 0;   // REFUNDABLE (failed)
      default: return 0;
    }
  } else {
    switch (numericState) {
      case 0: return 25;  // PR_CREATED
      case 1: return 50;  // PR_PAID
      case 2: return 75;  // CLAIM_COMMITTED
      case 3: return 100; // CLAIM_CLAIMED
      default: return 0;
    }
  }
}

/**
 * Generate user-friendly swap status description
 */
export function getSwapStatusDescription(state: number | string, direction: string): string {
  const formattedState = formatSwapState(state);
  
  if (direction === "lightning_to_starknet") {
    switch (formattedState) {
      case "CREATED":
        return "Swap quote created. Ready to execute.";
      case "COMMITTED":
        return "Swap initiated. Waiting for Lightning payment.";
      case "SOFT_CLAIMED":
        return "Lightning payment received. Processing Starknet transaction.";
      case "CLAIMED":
        return "Swap completed successfully. Funds delivered to Starknet.";
      case "REFUNDABLE":
        return "Swap failed. Funds can be refunded.";
      case "EXPIRED":
        return "Swap expired. No funds were exchanged.";
      case "QUOTE_EXPIRED":
        return "Quote expired. Please create a new swap.";
      default:
        return `Swap in progress (${formattedState})`;
    }
  } else {
    switch (formattedState) {
      case "PR_CREATED":
        return "Lightning invoice created. Please pay the invoice.";
      case "PR_PAID":
        return "Lightning payment received. Ready to claim on Starknet.";
      case "CLAIM_COMMITTED":
        return "Claiming initiated on Starknet. Finalizing swap.";
      case "CLAIM_CLAIMED":
        return "Swap completed successfully. Funds delivered to Starknet.";
      case "EXPIRED":
        return "Lightning invoice expired. Swap cancelled.";
      case "FAILED":
        return "Swap failed. Lightning payment will be refunded.";
      default:
        return `Swap in progress (${formattedState})`;
    }
  }
}

/**
 * Extract next steps for user based on swap state
 */
export function getNextSteps(state: number | string, direction: string): string[] {
  const formattedState = formatSwapState(state);
  
  if (direction === "lightning_to_starknet") {
    switch (formattedState) {
      case "CREATED":
        return ["Execute the swap by calling the commit action"];
      case "COMMITTED":
        return ["Wait for the swap to be processed", "Monitor swap status"];
      case "SOFT_CLAIMED":
        return ["Wait for Starknet transaction confirmation"];
      case "CLAIMED":
        return ["Swap completed successfully"];
      case "REFUNDABLE":
        return ["Refund your funds using the refund action"];
      case "EXPIRED":
      case "QUOTE_EXPIRED":
        return ["Create a new swap quote"];
      default:
        return ["Monitor swap status"];
    }
  } else {
    switch (formattedState) {
      case "PR_CREATED":
        return ["Pay the Lightning invoice", "Wait for payment confirmation"];
      case "PR_PAID":
        return ["Claim your funds on Starknet using the claim action"];
      case "CLAIM_COMMITTED":
        return ["Wait for Starknet transaction confirmation"];
      case "CLAIM_CLAIMED":
        return ["Swap completed successfully"];
      case "EXPIRED":
        return ["Create a new swap (Lightning invoice expired)"];
      case "FAILED":
        return ["Lightning payment will be automatically refunded"];
      default:
        return ["Monitor swap status"];
    }
  }
}

/**
 * Validate Lightning invoice format
 */
export function isValidLightningInvoice(invoice: string): boolean {
  // Basic BOLT11 invoice validation
  return /^ln(bc|tb|bcrt)[0-9]{1,7}[02-9ac-hj-np-z]+$/i.test(invoice);
}

/**
 * Validate Starknet address format
 */
export function isValidStarknetAddress(address: string): boolean {
  // Basic Starknet address validation
  return /^0x[0-9a-fA-F]{1,64}$/.test(address);
}

/**
 * Validate LNURL format
 */
export function isValidLNURL(lnurl: string): boolean {
  // Basic LNURL validation
  return /^lnurl[0-9a-z]+$/i.test(lnurl) || /^lightning:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(lnurl);
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: Error | string): string {
  const message = error instanceof Error ? error.message : error;
  
  // Common error patterns and user-friendly messages
  const errorMappings = [
    { pattern: /insufficient.*balance/i, message: "Insufficient balance for this swap" },
    { pattern: /amount.*too.*low/i, message: "Swap amount is below minimum limit" },
    { pattern: /amount.*too.*high/i, message: "Swap amount exceeds maximum limit" },
    { pattern: /network.*error/i, message: "Network connection error. Please try again." },
    { pattern: /timeout/i, message: "Request timed out. Please try again." },
    { pattern: /invalid.*address/i, message: "Invalid address format" },
    { pattern: /swap.*expired/i, message: "Swap has expired" },
    { pattern: /quote.*expired/i, message: "Quote has expired. Please create a new swap." }
  ];

  for (const mapping of errorMappings) {
    if (mapping.pattern.test(message)) {
      return mapping.message;
    }
  }

  return message;
}

/**
 * Check if network is testnet
 */
export function isTestnet(network: BitcoinNetwork): boolean {
  return network === BitcoinNetwork.TESTNET || network === BitcoinNetwork.TESTNET4;
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network: BitcoinNetwork): string {
  switch (network) {
    case BitcoinNetwork.MAINNET:
      return "mainnet";
    case BitcoinNetwork.TESTNET:
      return "testnet";
    case BitcoinNetwork.TESTNET4:
      return "testnet4";
    default:
      return "unknown";
  }
}

/**
 * Generate a unique ID for tracking
 */
export function generateTrackingId(): string {
  return `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for network operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries - 1) {
        await sleep(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}