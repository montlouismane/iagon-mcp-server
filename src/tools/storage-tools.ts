/**
 * MCP Tools for storage information on Iagon
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIagonClient } from "../services/iagon-client.js";
import { ResponseFormat, formatBytes } from "../constants.js";
import {
  GetStorageInfoSchema,
  type GetStorageInfoInput
} from "../schemas/input-schemas.js";

/**
 * Register storage info tools with the MCP server
 */
export function registerStorageTools(server: McpServer): void {
  // Get storage info tool
  server.registerTool(
    "iagon_get_storage_info",
    {
      title: "Get Storage Info",
      description: `Get your Iagon storage quota and usage information.

Args:
  - response_format ('markdown' | 'json'): Output format

Returns:
  Storage statistics including used space, available space, and file/folder counts.`,
      inputSchema: GetStorageInfoSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetStorageInfoInput) => {
      try {
        const client = getIagonClient();
        const info = await client.getStorageInfo();

        const usagePercent = info.total > 0
          ? ((info.used / info.total) * 100).toFixed(1)
          : "0";

        let text: string;
        if (params.response_format === ResponseFormat.JSON) {
          text = JSON.stringify({
            ...info,
            usedFormatted: formatBytes(info.used),
            totalFormatted: formatBytes(info.total),
            availableFormatted: formatBytes(info.available),
            usagePercent: parseFloat(usagePercent)
          }, null, 2);
        } else {
          text = [
            "# Iagon Storage Information",
            "",
            "## Usage",
            `- **Used**: ${formatBytes(info.used)} (${usagePercent}%)`,
            `- **Available**: ${formatBytes(info.available)}`,
            `- **Total**: ${formatBytes(info.total)}`,
            "",
            "## Contents",
            `- **Files**: ${info.fileCount}`,
            `- **Folders**: ${info.folderCount}`,
            "",
            "---",
            "*Note: Iagon has a 40MB per-file limit for the sharding process.*"
          ].join("\n");
        }

        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
