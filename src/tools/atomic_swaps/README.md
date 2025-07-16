# Starknet Lightning Atomic Swaps Tool

This tool enables trustless atomic swaps between Lightning Network and Starknet using the AtomiqLabs SDK. It provides a comprehensive MCP tool interface for executing cross-chain swaps with proper error handling and monitoring.

## Features

- **Trustless Swaps**: Execute atomic swaps without trusted intermediaries
- **Bidirectional**: Support for both Lightning → Starknet and Starknet → Lightning
- **Lightning Support**: Works with BOLT11 invoices, LNURL-pay, and LNURL-withdraw
- **Comprehensive Error Handling**: Detailed error reporting with recovery suggestions
- **Swap Management**: Track, monitor, refund, and claim swaps
- **Balance Checking**: Check spendable balances before swaps
- **Address Parsing**: Parse and validate Lightning and Starknet addresses

## Configuration

### Environment Variables

```bash
# Required - Starknet Configuration
STARKNET_RPC_URL=https://starknet-mainnet.public.blastapi.io/rpc/v0_7
STARKNET_PRIVATE_KEY=your_private_key_here
STARKNET_ACCOUNT_ADDRESS=your_account_address_here

# Required - Network Configuration
BITCOIN_NETWORK=mainnet  # or testnet

# Optional - AtomiqLabs Configuration
ATOMIQ_INTERMEDIARY_URL=https://custom-lp-node.example.com
ATOMIQ_REGISTRY_URL=https://custom-registry.example.com
ATOMIQ_TRUSTED_INTERMEDIARY_URL=https://trusted-lp.example.com

# Optional - Timeout Configuration
GET_REQUEST_TIMEOUT=10000  # milliseconds
POST_REQUEST_TIMEOUT=10000  # milliseconds

# Optional - Swap Configuration
MAX_PRICING_DIFFERENCE_PPM=20000  # 2% maximum price difference
DEFAULT_GAS_AMOUNT=1000000000000000000  # 1 STRK for gas drops
ENABLE_TESTNET=false
```

### Security Considerations

1. **Private Key Management**: Store private keys securely using environment variables
2. **Network Validation**: Ensure you're connecting to the correct network
3. **Amount Validation**: Always validate swap amounts before execution
4. **Address Verification**: Verify destination addresses before swaps

## Usage Examples

### 1. Get Swap Limits

```json
{
  "action": "limits",
  "direction": "lightning_to_starknet"
}
```

Response:
```json
{
  "direction": "lightning_to_starknet",
  "input_limits": {
    "min": "1000",
    "max": "100000000",
    "token": "BTC"
  },
  "output_limits": {
    "min": "1000000000000000",
    "max": "100000000000000000000",
    "token": "STRK"
  }
}
```

### 2. Check Balance

```json
{
  "action": "balance"
}
```

Response:
```json
{
  "token": "STRK",
  "balance": "5000000000000000000",
  "spendable_balance": "4950000000000000000",
  "human_readable_balance": "5.0",
  "network": "starknet"
}
```

### 3. Parse Lightning Address

```json
{
  "action": "parse_address",
  "address": "lnbc10u1pj2q0g9pp5ejs6m677m39cznpzum7muruvh50ys93ln82p4j9ks2luqm56xxlshp52r2anlhddfa9ex9vpw9gstxujff8a0p8s3pzvua930js0kwfea6scqzzsxqyz5vqsp5073zskc5qfgp7lre0t6s8uexxxey80ax564hsjklfwfjq2ew0ewq9qyyssqvzmgs6f8mvuwgfa9uqxhtza07qem4yfhn9wwlpskccmuwplsqmh8pdy6c42kqdu8p73kky9lsnl40qha5396d8lpgn90y27ltfc5rfqqq59cya"
}
```

### 4. Lightning → Starknet Swap

#### Step 1: Create Quote
```json
{
  "action": "quote",
  "direction": "lightning_to_starknet",
  "amount": "0.001",
  "exact_in": true,
  "starknet_address": "0x1234567890abcdef1234567890abcdef12345678",
  "gas_amount": "1.0"
}
```

Response:
```json
{
  "id": "swap_1234567890_abcdef123",
  "direction": "lightning_to_starknet",
  "input_amount": "100000",
  "output_amount": "2500000000000000000",
  "input_token": "BTC",
  "output_token": "STRK",
  "fee_amount": "1000",
  "exchange_rate": "25000.0",
  "expiry": 1672531200000,
  "security_deposit": "100000000000000000",
  "price_info": {
    "swap_price": "25000.0",
    "market_price": "25050.0",
    "price_difference": "-0.2"
  }
}
```

#### Step 2: Execute Swap
```json
{
  "action": "execute",
  "swap_id": "swap_1234567890_abcdef123",
  "direction": "lightning_to_starknet"
}
```

Response:
```json
{
  "success": true,
  "swap_id": "swap_1234567890_abcdef123",
  "state": "COMMITTED",
  "message": "Swap committed successfully. Waiting for Lightning payment.",
  "lightning_invoice": "lnbc100u1pj2q0g9pp5...",
  "next_steps": [
    "Pay the Lightning invoice",
    "Monitor swap status"
  ]
}
```

#### Step 3: Monitor Status
```json
{
  "action": "status",
  "swap_id": "swap_1234567890_abcdef123"
}
```

Response:
```json
{
  "swap_id": "swap_1234567890_abcdef123",
  "state": "CLAIMED",
  "direction": "lightning_to_starknet",
  "progress": {
    "current_step": 100,
    "total_steps": 100,
    "step_description": "Swap completed successfully. Funds delivered to Starknet."
  },
  "created_at": 1672531200000,
  "updated_at": 1672531800000,
  "can_refund": false,
  "can_claim": false
}
```

### 5. Starknet → Lightning Swap

#### Step 1: Create Quote
```json
{
  "action": "quote",
  "direction": "starknet_to_lightning",
  "amount": "2.5",
  "exact_in": true,
  "lightning_invoice": "lnbc100u1pj2q0g9pp5ejs6m677m39cznpzum7muruvh50ys93ln82p4j9ks2luqm56xxlshp52r2anlhddfa9ex9vpw9gstxujff8a0p8s3pzvua930js0kwfea6scqzzsxqyz5vqsp5073zskc5qfgp7lre0t6s8uexxxey80ax564hsjklfwfjq2ew0ewq9qyyssqvzmgs6f8mvuwgfa9uqxhtza07qem4yfhn9wwlpskccmuwplsqmh8pdy6c42kqdu8p73kky9lsnl40qha5396d8lpgn90y27ltfc5rfqqq59cya"
}
```

#### Step 2: Execute Swap
```json
{
  "action": "execute",
  "swap_id": "swap_1234567890_abcdef456",
  "direction": "starknet_to_lightning"
}
```

### 6. LNURL-Pay Support

```json
{
  "action": "quote",
  "direction": "starknet_to_lightning",
  "amount": "0.001",
  "exact_in": false,
  "lightning_address": "user@lightning-address.com",
  "comment": "Payment for services"
}
```

### 7. Refund Failed Swap

```json
{
  "action": "refund",
  "swap_id": "swap_1234567890_abcdef123"
}
```

### 8. Claim Completed Swap

```json
{
  "action": "claim",
  "swap_id": "swap_1234567890_abcdef123"
}
```

### 9. List All Swaps

```json
{
  "action": "list_swaps"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "refundable_swaps": [
      {
        "id": "swap_1234567890_abcdef789",
        "state": "REFUNDABLE",
        "can_refund": true
      }
    ],
    "claimable_swaps": [
      {
        "id": "swap_1234567890_abcdef012",
        "state": "CLAIM_COMMITTED",
        "can_claim": true
      }
    ],
    "active_swaps": [
      "swap_1234567890_abcdef123",
      "swap_1234567890_abcdef456"
    ]
  },
  "message": "Found 1 refundable and 1 claimable swaps"
}
```

## Error Handling

The tool provides comprehensive error handling with user-friendly messages:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for swap",
    "details": {
      "required": "1000000000000000000",
      "available": "500000000000000000",
      "token": "STRK"
    },
    "recovery_suggestion": "Add more STRK to your wallet or reduce swap amount"
  }
}
```

### Common Error Codes

- `INSUFFICIENT_BALANCE`: Not enough funds for the swap
- `AMOUNT_TOO_LOW`: Swap amount below minimum limit
- `AMOUNT_TOO_HIGH`: Swap amount above maximum limit
- `INVALID_ADDRESS`: Invalid Lightning or Starknet address
- `SWAP_EXPIRED`: Swap quote has expired
- `NETWORK_ERROR`: Connection issues with blockchain networks
- `OPERATION_FAILED`: General operation failure

## Swap States

### Lightning → Starknet States

- `CREATED`: Swap quote created and ready to execute
- `COMMITTED`: Swap initiated, waiting for Lightning payment
- `SOFT_CLAIMED`: Lightning payment received, processing Starknet transaction
- `CLAIMED`: Swap completed, funds delivered to Starknet
- `REFUNDABLE`: Swap failed, funds can be refunded

### Starknet → Lightning States

- `PR_CREATED`: Lightning invoice created, waiting for payment
- `PR_PAID`: Lightning payment received, ready to claim
- `CLAIM_COMMITTED`: Claiming initiated on Starknet
- `CLAIM_CLAIMED`: Swap completed, funds delivered

## Best Practices

1. **Always Check Limits**: Use the `limits` action before creating swaps
2. **Verify Addresses**: Use `parse_address` to validate destination addresses
3. **Monitor Status**: Regularly check swap status during execution
4. **Handle Timeouts**: Set appropriate timeouts for network operations
5. **Secure Keys**: Never log or expose private keys
6. **Test First**: Use testnet for initial testing

## Troubleshooting

### Common Issues

1. **Swap Not Found**: Check if swap ID is correct and swap exists
2. **Quote Expired**: Create a new quote if the old one expired
3. **Network Connection**: Verify RPC URLs and network connectivity
4. **Insufficient Balance**: Ensure adequate funds for swap and fees
5. **Invalid Configuration**: Check all required environment variables

### Recovery Actions

1. **Refund Failed Swaps**: Use the `refund` action for failed swaps
2. **Claim Completed Swaps**: Use the `claim` action for ready swaps
3. **List Pending Swaps**: Use `list_swaps` to find refundable/claimable swaps

## Advanced Features

### Gas Drops

For Lightning → Starknet swaps, you can request gas drops for new addresses:

```json
{
  "action": "quote",
  "direction": "lightning_to_starknet",
  "amount": "0.001",
  "gas_amount": "1.0"
}
```

### Custom Comments

For LNURL-pay swaps, you can include comments:

```json
{
  "action": "quote",
  "direction": "starknet_to_lightning",
  "lightning_address": "user@example.com",
  "comment": "Payment for services"
}
```

### Batch Operations

You can process multiple swaps by calling the tool multiple times or use the `list_swaps` action to manage multiple swaps efficiently.

## Integration Examples

### React Application

```typescript
import { MCPClient } from '@modelcontextprotocol/client';

const mcpClient = new MCPClient();

// Create a swap quote
const quote = await mcpClient.callTool('starknet_lightning_atomic_swaps', {
  action: 'quote',
  direction: 'lightning_to_starknet',
  amount: '0.001',
  exact_in: true
});

// Execute the swap
const result = await mcpClient.callTool('starknet_lightning_atomic_swaps', {
  action: 'execute',
  swap_id: quote.id,
  direction: 'lightning_to_starknet'
});
```

### Node.js Backend

```javascript
const { spawn } = require('child_process');

const mcpProcess = spawn('node', ['build/index.js']);

// Send swap request
mcpProcess.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'starknet_lightning_atomic_swaps',
    arguments: {
      action: 'quote',
      direction: 'lightning_to_starknet',
      amount: '0.001'
    }
  }
}) + '\n');
```

## License

This tool is part of the Alby MCP server and is licensed under the MIT License.