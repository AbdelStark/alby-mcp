import { nwc } from "@getalby/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGetBalanceTool(
  server: McpServer,
  client: nwc.NWCClient
) {
  server.registerTool(
    "get_balance",
    {
      title: "Get Balance",
      description: "Get the balance of the connected lightning wallet",
      outputSchema: {
        amount_in_sats: z.number().nullish().describe("Current wallet balance in sats"),
        error: z.string().nullish().describe("Error message if operation failed"),
      },
    },
    async () => {
      try {
        const balance = await client.getBalance();

        // Convert millisats to sats
        const convertedBalance = {
          amount_in_sats: Math.floor(balance.balance / 1000), // Round down when converting millisats to sats as balance
          error: null,
        };

        return {
          structuredContent: convertedBalance,
          content: [
            {
              type: "text",
              text: JSON.stringify(convertedBalance, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`[MCP Tool] Error in get_balance: ${(error as Error).message}`);
        const errorResponse = {
          amount_in_sats: null,
          error: (error as Error).message,
        };
        return {
          structuredContent: errorResponse,
          content: [
            {
              type: "text",
              text: `Error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );
}
