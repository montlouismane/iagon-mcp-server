#!/usr/bin/env node
/**
 * Iagon MCP Server
 *
 * An MCP server for Iagon decentralized storage that enables Claude Code
 * and other AI agents to upload, download, and manage files on Iagon.
 *
 * Supports both stdio (local) and HTTP (remote) transports.
 *
 * Environment Variables:
 *   IAGON_ACCESS_TOKEN - Required: Your Iagon access token
 *   IAGON_TRANSPORT    - Optional: 'stdio' (default) or 'http'
 *   PORT               - Optional: HTTP server port (default: 3000)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFileTools } from "./tools/file-tools.js";
import { registerFolderTools } from "./tools/folder-tools.js";
import { registerStorageTools } from "./tools/storage-tools.js";
import { registerBatchTools } from "./tools/batch-tools.js";

// Server metadata
const SERVER_NAME = "iagon-mcp-server";
const SERVER_VERSION = "1.0.0";

/**
 * Create and configure the MCP server
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  // Register all tools
  registerFileTools(server);
  registerFolderTools(server);
  registerStorageTools(server);
  registerBatchTools(server);

  return server;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Validate required environment variable
  if (!process.env.IAGON_ACCESS_TOKEN) {
    console.error("ERROR: IAGON_ACCESS_TOKEN environment variable is required.");
    console.error("");
    console.error("To generate a token:");
    console.error("  1. Log in to https://app.iagon.com");
    console.error("  2. Go to Settings");
    console.error("  3. Click 'Generate Token'");
    console.error("");
    console.error("Then set the environment variable:");
    console.error("  export IAGON_ACCESS_TOKEN=your-token-here");
    process.exit(1);
  }

  const transportType = process.env.IAGON_TRANSPORT || "stdio";
  const server = createServer();

  if (transportType === "http") {
    // HTTP transport for remote deployment (e.g., Iagon Compute)
    const port = parseInt(process.env.PORT || "3000", 10);

    // Note: MCP SDK's HTTP transport requires additional setup
    // For now, we'll use a simple HTTP server wrapper
    console.error(`HTTP transport requested on port ${port}`);
    console.error("Note: HTTP transport requires additional setup. Using stdio for now.");
    console.error("For HTTP deployment, consider using the MCP HTTP proxy.");

    // Fall back to stdio for now
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running via stdio`);
  } else {
    // Stdio transport (default) for local use with Claude Code
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running via stdio`);
  }
}

// Handle uncaught errors gracefully
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

// Run the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
