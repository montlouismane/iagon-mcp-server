/**
 * MCP Tools for folder operations on Iagon storage
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIagonClient } from "../services/iagon-client.js";
import { ResponseFormat } from "../constants.js";
import {
  CreateFolderSchema,
  ListFoldersSchema,
  DeleteFolderSchema,
  type CreateFolderInput,
  type ListFoldersInput,
  type DeleteFolderInput
} from "../schemas/input-schemas.js";
import type { IagonFolder } from "../types.js";

/**
 * Format folder list as markdown
 */
function formatFoldersAsMarkdown(folders: IagonFolder[]): string {
  const lines: string[] = ["# Folders in Iagon Storage", ""];

  if (folders.length === 0) {
    lines.push("*No folders found*");
  } else {
    lines.push(`Found ${folders.length} folder(s):`);
    lines.push("");

    for (const folder of folders) {
      lines.push(`## ${folder.name}`);
      lines.push(`- **ID**: \`${folder.id}\``);
      if (folder.parentId) lines.push(`- **Parent**: ${folder.parentId}`);
      if (folder.fileCount !== undefined) lines.push(`- **Files**: ${folder.fileCount}`);
      lines.push(`- **Created**: ${folder.createdAt}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Register all folder tools with the MCP server
 */
export function registerFolderTools(server: McpServer): void {
  // Create folder tool
  server.registerTool(
    "iagon_create_folder",
    {
      title: "Create Folder in Iagon",
      description: `Create a new folder in Iagon storage for organizing files.

Args:
  - name (string, required): Name for the new folder
  - parent_id (string, optional): ID of the parent folder (for nested folders)

Returns:
  Folder details including the new folder ID.

Example:
  - Create root folder: name="project-videos"
  - Create nested folder: name="raw-footage", parent_id="abc123"`,
      inputSchema: CreateFolderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CreateFolderInput) => {
      try {
        const client = getIagonClient();
        const result = await client.createFolder(params.name, params.parent_id);

        if (result.success && result.folder) {
          return {
            content: [{
              type: "text",
              text: [
                `**Folder Created Successfully**`,
                "",
                `- **Name**: ${result.folder.name}`,
                `- **ID**: \`${result.folder.id}\``,
                result.folder.parentId ? `- **Parent**: ${result.folder.parentId}` : null
              ].filter(Boolean).join("\n")
            }]
          };
        } else {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `**Failed to Create Folder**\n\n${result.message}`
            }]
          };
        }
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

  // List folders tool
  server.registerTool(
    "iagon_list_folders",
    {
      title: "List Folders in Iagon",
      description: `List folders in Iagon storage.

Args:
  - parent_id (string, optional): Filter by parent folder ID (omit for root folders)
  - response_format ('markdown' | 'json'): Output format

Returns:
  List of folders with metadata.`,
      inputSchema: ListFoldersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListFoldersInput) => {
      try {
        const client = getIagonClient();
        const folders = await client.listFolders(params.parent_id);

        let text: string;
        if (params.response_format === ResponseFormat.JSON) {
          text = JSON.stringify({ folders, count: folders.length }, null, 2);
        } else {
          text = formatFoldersAsMarkdown(folders);
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

  // Delete folder tool
  server.registerTool(
    "iagon_delete_folder",
    {
      title: "Delete Folder from Iagon",
      description: `Delete a folder from Iagon storage.

**Warning**: This may also delete all files within the folder. This action is permanent.

Args:
  - folder_id (string, required): ID of the folder to delete

Returns:
  Success/failure status.`,
      inputSchema: DeleteFolderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DeleteFolderInput) => {
      try {
        const client = getIagonClient();
        const result = await client.deleteFolder(params.folder_id);

        return {
          content: [{
            type: "text",
            text: result.success
              ? `**Folder Deleted**\n\nFolder ID \`${params.folder_id}\` has been permanently deleted.`
              : `**Delete Failed**\n\n${result.message}`
          }],
          isError: !result.success
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
