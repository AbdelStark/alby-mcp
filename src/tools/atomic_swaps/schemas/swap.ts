import { z } from "zod";

/**
 * Schema for swap quote information
 */
export const swapQuoteSchema = z.object({
  id: z.string().describe("Unique identifier for the swap"),
  direction: z.enum(["lightning_to_starknet", "starknet_to_lightning"]).describe("Direction of the swap"),
  input_amount: z.string().describe("Input amount in smallest units"),
  output_amount: z.string().describe("Output amount in smallest units"),
  input_token: z.string().describe("Input token symbol"),
  output_token: z.string().describe("Output token symbol"),
  fee_amount: z.string().describe("Fee amount in input token"),
  exchange_rate: z.string().describe("Exchange rate for the swap"),
  expiry: z.number().describe("Quote expiry timestamp in milliseconds"),
  security_deposit: z.string().optional().describe("Security deposit required (for Lightning -> Starknet)"),
  price_info: z.object({
    swap_price: z.string().describe("Swap price"),
    market_price: z.string().describe("Current market price"),
    price_difference: z.string().describe("Difference between swap and market price")
  }).describe("Price comparison information")
});

/**
 * Schema for swap execution result
 */
export const swapExecutionSchema = z.object({
  success: z.boolean().describe("Whether the swap was successful"),
  swap_id: z.string().describe("Unique identifier for the swap"),
  state: z.string().describe("Current state of the swap"),
  transaction_id: z.string().optional().describe("Transaction ID if applicable"),
  lightning_invoice: z.string().optional().describe("Lightning invoice for payment"),
  lightning_payment_hash: z.string().optional().describe("Lightning payment hash"),
  starknet_address: z.string().optional().describe("Starknet address involved"),
  message: z.string().optional().describe("Status message or error description"),
  next_steps: z.array(z.string()).optional().describe("Next steps required from user")
});

/**
 * Schema for swap status information
 */
export const swapStatusSchema = z.object({
  swap_id: z.string().describe("Unique identifier for the swap"),
  state: z.string().describe("Current state of the swap"),
  direction: z.enum(["lightning_to_starknet", "starknet_to_lightning"]).describe("Direction of the swap"),
  progress: z.object({
    current_step: z.number().describe("Current step number"),
    total_steps: z.number().describe("Total number of steps"),
    step_description: z.string().describe("Description of current step")
  }).describe("Progress information"),
  created_at: z.number().describe("Creation timestamp"),
  updated_at: z.number().describe("Last update timestamp"),
  can_refund: z.boolean().describe("Whether swap can be refunded"),
  can_claim: z.boolean().describe("Whether swap can be claimed"),
  error: z.string().optional().describe("Error message if swap failed")
});

/**
 * Schema for available swap limits
 */
export const swapLimitsSchema = z.object({
  direction: z.enum(["lightning_to_starknet", "starknet_to_lightning"]).describe("Direction of the swap"),
  input_limits: z.object({
    min: z.string().describe("Minimum input amount"),
    max: z.string().describe("Maximum input amount"),
    token: z.string().describe("Token symbol")
  }).describe("Input amount limits"),
  output_limits: z.object({
    min: z.string().describe("Minimum output amount"),
    max: z.string().describe("Maximum output amount"),
    token: z.string().describe("Token symbol")
  }).describe("Output amount limits")
});

/**
 * Schema for balance information
 */
export const balanceSchema = z.object({
  token: z.string().describe("Token symbol"),
  balance: z.string().describe("Available balance in smallest units"),
  spendable_balance: z.string().describe("Spendable balance after fees"),
  human_readable_balance: z.string().describe("Human readable balance"),
  network: z.string().describe("Network name")
});

/**
 * Schema for error response
 */
export const errorSchema = z.object({
  success: z.literal(false).describe("Indicates operation failed"),
  error: z.object({
    code: z.string().describe("Error code"),
    message: z.string().describe("Human readable error message"),
    details: z.object({}).passthrough().optional().describe("Additional error details"),
    recovery_suggestion: z.string().optional().describe("Suggested recovery action")
  }).describe("Error information")
});