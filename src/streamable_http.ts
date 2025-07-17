import { Express, Request, Response } from "express";
import { createMCPServer } from "./mcp_server.js";
import { nwc } from "@getalby/sdk";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getConnectionSecret } from "./auth.js";
import { json } from "express";
import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/hashes/utils";

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
  const connectionId = nostrWalletConnectUrl.substring(0, 20) + "...";
  console.log(`[NWC] getOrCreateNWCClient called for connection: ${connectionId}`);
  
  // Log the exact connection string for debugging
  console.log(`[NWC] Full connection string: ${nostrWalletConnectUrl}`);
  
  // Extract and log the secret and derived pubkey
  try {
    const url = new URL(nostrWalletConnectUrl);
    const secret = url.searchParams.get('secret');
    const relay = url.searchParams.get('relay');
    const pubkeyFromUrl = url.pathname.replace('//', '');
    
    if (secret) {
      try {
        const secretBytes = new Uint8Array(Buffer.from(secret, 'hex'));
        const pubkeyBytes = schnorr.getPublicKey(secretBytes);
        const derivedPubkey = bytesToHex(pubkeyBytes);
        console.log(`[NWC] Connection analysis:`);
        console.log(`  - Wallet pubkey from URL: ${pubkeyFromUrl}`);
        console.log(`  - Derived app pubkey: ${derivedPubkey}`);
        console.log(`  - Relay: ${relay}`);
        console.log(`  - Secret: ${secret.substring(0, 8)}...`);
      } catch (keyError) {
        console.warn(`[NWC] Failed to derive pubkey from secret:`, keyError);
      }
    }
  } catch (parseError) {
    console.warn(`[NWC] Failed to parse connection string:`, parseError);
  }
  
  const cacheKey = nostrWalletConnectUrl;
  const cached = nwcClientCache.get(cacheKey);
  
  if (cached) {
    console.log(`[NWC] Using cached client for: ${connectionId}`);
    cached.lastUsed = Date.now();
    
    // Test cached client to ensure it's still working - but be more lenient
    try {
      const info = await cached.client.getInfo();
      console.log(`[NWC] Cached client verified - alias: ${info.alias}`);
      return cached.client;
    } catch (error) {
      console.warn(`[NWC] Cached client verification failed for ${connectionId}:`, (error as Error).message);
      // Only remove if it's an authorization error (pubkey not connected)
      if ((error as Error).message.includes('pubkey not connected') || (error as any).code === 'UNAUTHORIZED') {
        console.log(`[NWC] Removing cached client due to authorization error: ${connectionId}`);
        cached.client.close();
        nwcClientCache.delete(cacheKey);
        // Recursively try again with fresh client
        return getOrCreateNWCClient(nostrWalletConnectUrl);
      } else {
        console.log(`[NWC] Keeping cached client despite verification failure - may work for operations`);
        return cached.client;
      }
    }
  }

  // Create new client
  console.log(`[NWC] Creating new NWC client for: ${connectionId}`);
  const client = new nwc.NWCClient({
    nostrWalletConnectUrl,
  });

  // Give the client time to connect properly
  console.log(`[NWC] Waiting for connection to establish...`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced to 1 second

  // Test the connection with fewer retries and shorter timeouts
  let connected = false;
  let connectionError = null;
  const maxRetries = 2; // Reduced retries
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const info = await client.getInfo();
      console.log(`[NWC] ✅ Client connected successfully after ${i + 1} attempts`);
      console.log(`[NWC] Wallet info - alias: ${info.alias}`);
      connected = true;
      break;
    } catch (error) {
      connectionError = error;
      console.warn(`[NWC] ❌ Connection test attempt ${i + 1}/${maxRetries} failed:`, (error as Error).message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced wait time
      }
    }
  }

  if (!connected) {
    console.warn(`[NWC] ⚠️ Connection failed after ${maxRetries} attempts. Last error:`, connectionError);
    // Don't cache failed client - throw error instead
    client.close();
    throw new Error(`Failed to establish NWC connection: ${(connectionError as Error).message}`);
  }

  // Cache the client only if connection succeeded
  nwcClientCache.set(cacheKey, {
    client,
    lastUsed: Date.now()
  });

  console.log(`[NWC] Client cached for: ${connectionId}`);
  return client;
}

// Export for use in other modules
export function invalidateNWCCache(connectionUrl: string) {
  const cacheKey = connectionUrl;
  const cached = nwcClientCache.get(cacheKey);
  if (cached) {
    cached.client.close();
    nwcClientCache.delete(cacheKey);
    console.log(`[NWC] Invalidated cache for ${cacheKey.substring(0, 20)}...`);
  }
}

export function addStreamableHttpEndpoints(app: Express) {
  // GET endpoint for MCP registration
  app.get("/mcp", async (req: Request, res: Response) => {
    res.json({
      jsonrpc: "2.0",
      result: {
        serverInfo: {
          name: "Alby MCP Server",
          version: "1.1.1"
        },
        capabilities: {
          tools: {}
        }
      }
    });
  });

  app.post("/mcp", json(), async (req: Request, res: Response) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[MCP-${requestId}] New request received`);
    
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.
    try {
      const nostrWalletConnectUrl = getConnectionSecret(
        req.header("Authorization"),
        req.query.nwc as string
      );
      if (!nostrWalletConnectUrl) {
        console.error(`[MCP-${requestId}] No NWC connection string provided`);
        res
          .status(400)
          .send("Bearer auth with NWC connection secret or nwc query parameter not provided");
        return;
      }

      console.log(`[MCP-${requestId}] Getting NWC client...`);
      const client = await getOrCreateNWCClient(nostrWalletConnectUrl);
      
      console.log(`[MCP-${requestId}] Creating MCP server...`);
      const server = createMCPServer(client, nostrWalletConnectUrl);
      
      console.log(`[MCP-${requestId}] Setting up transport...`);
      const transport: StreamableHTTPServerTransport =
        new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
      
      res.on("close", () => {
        console.log(`[MCP-${requestId}] Request closed`);
        transport.close();
        server.close();
        // Don't close the client here - it's cached and reused
      });
      
      console.log(`[MCP-${requestId}] Connecting server to transport...`);
      await server.connect(transport);
      
      console.log(`[MCP-${requestId}] Handling request...`);
      await transport.handleRequest(req, res, req.body);
      
      console.log(`[MCP-${requestId}] Request completed successfully`);
    } catch (error) {
      console.error(`[MCP-${requestId}] Error handling MCP request:`, error);
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
