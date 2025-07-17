import { Express, Request, Response } from "express";
import { createMCPServer } from "./mcp_server.js";
import { nwc } from "@getalby/sdk";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getConnectionSecret } from "./auth.js";
import { json } from "express";

// Cache for persistent NWC clients to avoid connection issues
const nwcClientCache = new Map<string, { client: nwc.NWCClient; lastUsed: number }>();
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired clients periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, { client, lastUsed }] of nwcClientCache.entries()) {
    if (now - lastUsed > CLIENT_CACHE_TTL) {
      console.log(`Cleaning up expired NWC client: ${key.substring(0, 20)}...`);
      client.close();
      nwcClientCache.delete(key);
    }
  }
}, 60 * 1000); // Check every minute

async function getOrCreateNWCClient(nostrWalletConnectUrl: string): Promise<nwc.NWCClient> {
  const cacheKey = nostrWalletConnectUrl;
  const cached = nwcClientCache.get(cacheKey);
  
  if (cached) {
    // Update last used time
    cached.lastUsed = Date.now();
    return cached.client;
  }

  // Create new client
  const client = new nwc.NWCClient({
    nostrWalletConnectUrl,
  });

  // Give the client some time to connect
  console.log("Creating new NWC client and waiting for connection...");
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test the connection
  try {
    await client.getInfo();
    console.log("NWC client connected successfully");
  } catch (error) {
    console.warn("NWC client connection test failed:", error);
    // Continue anyway, as some operations might still work
  }

  // Cache the client
  nwcClientCache.set(cacheKey, {
    client,
    lastUsed: Date.now()
  });

  return client;
}

export function addStreamableHttpEndpoints(app: Express) {
  app.post("/mcp", json(), async (req: Request, res: Response) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.
    try {
      const nostrWalletConnectUrl = getConnectionSecret(
        req.header("Authorization"),
        req.query.nwc as string
      );
      if (!nostrWalletConnectUrl) {
        res
          .status(400)
          .send("Bearer auth with NWC connection secret or nwc query parameter not provided");
        return;
      }

      const client = await getOrCreateNWCClient(nostrWalletConnectUrl);
      const server = createMCPServer(client);
      const transport: StreamableHTTPServerTransport =
        new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
      res.on("close", () => {
        console.log("Request closed");
        transport.close();
        server.close();
        // Don't close the client here - it's cached and reused
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });
}
