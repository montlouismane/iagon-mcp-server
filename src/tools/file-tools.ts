/**
 * MCP Tools for file operations on Iagon storage
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIagonClient } from "../services/iagon-client.js";
import { ResponseFormat, formatBytes, CHARACTER_LIMIT } from "../constants.js";
import {
  UploadFileSchema,
  DownloadFileSchema,
  ListFilesSchema,
  DeleteFileSchema,
  GetFileInfoSchema,
  SearchFilesSchema,
  type UploadFileInput,
  type DownloadFileInput,
  type ListFilesInput,
  type DeleteFileInput,
  type GetFileInfoInput,
  type SearchFilesInput
} from "../schemas/input-schemas.js";
import type { IagonFile } from "../types.js";

/**
 * Format file list as markdown
 */
function formatFilesAsMarkdown(files: IagonFile[], total: number, offset: number, hasMore: boolean): string {
  const lines: string[] = ["# Files in Iagon Storage", ""];
  lines.push(`Showing ${files.length} of ${total} files (offset: ${offset})`);
  lines.push("");

  if (files.length === 0) {
    lines.push("*No files found*");
  } else {
    for (const file of files) {
      lines.push(`## ${file.name}`);
      lines.push(`- **ID**: \`${file.id}\``);
      lines.push(`- **Size**: ${formatBytes(file.size)}`);
      if (file.mimeType) lines.push(`- **Type**: ${file.mimeType}`);
      lines.push(`- **Created**: ${file.createdAt}`);
      lines.push("");
    }
  }

  if (hasMore) {
    lines.push(`---`);
    lines.push(`*More files available. Use offset=${offset + files.length} to see next page.*`);
  }

  return lines.join("\n");
}

/**
 * Register all file tools with the MCP server
 */
export function registerFileTools(server: McpServer): void {
  // Upload file tool
  server.registerTool(
    "iagon_upload_file",
    {
      title: "Upload File to Iagon",
      description: `Upload a local file to Iagon decentralized storage.

This tool uploads a file from your local filesystem to Iagon's encrypted, sharded storage. Files are split into 6 pieces and distributed across multiple providers for redundancy.

**Important**: Files larger than 40MB will be skipped with an error message, as this exceeds Iagon's sharding limit.

Args:
  - local_path (string, required): Absolute path to the file on your local system
  - remote_path (string, optional): Name/path for the file in Iagon (defaults to original filename)
  - folder_id (string, optional): ID of the folder to upload to

Returns:
  Success/failure status with file ID if successful.

Examples:
  - Upload a video: local_path="/Users/me/videos/clip.mp4"
  - Upload with custom name: local_path="/tmp/video.mp4", remote_path="project-a/final.mp4"`,
      inputSchema: UploadFileSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: UploadFileInput) => {
      try {
        const client = getIagonClient();
        const result = await client.uploadFile(params.local_path, params.remote_path);

        return {
          content: [{
            type: "text",
            text: result.success
              ? `**Upload Successful**\n\n- File: ${result.fileName}\n- Size: ${formatBytes(result.fileSize)}\n- ID: \`${result.fileId}\``
              : `**Upload Failed**\n\n${result.message}`
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

  // Download file tool
  server.registerTool(
    "iagon_download_file",
    {
      title: "Download File from Iagon",
      description: `Download a file from Iagon storage to your local filesystem.

Args:
  - file_id (string, required): ID of the file to download
  - local_path (string, required): Absolute path where the file should be saved

Returns:
  Success/failure status with download details.

Example:
  - file_id="abc123", local_path="/Users/me/downloads/video.mp4"`,
      inputSchema: DownloadFileSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DownloadFileInput) => {
      try {
        const client = getIagonClient();
        const result = await client.downloadFile(params.file_id, params.local_path);

        return {
          content: [{
            type: "text",
            text: result.success
              ? `**Download Successful**\n\n- File: ${result.fileName}\n- Size: ${formatBytes(result.fileSize)}\n- Saved to: ${result.localPath}`
              : `**Download Failed**\n\n${result.message}`
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

  // List files tool
  server.registerTool(
    "iagon_list_files",
    {
      title: "List Files in Iagon",
      description: `List files stored in Iagon (paginated).

Args:
  - folder_id (string, optional): Filter by folder ID
  - limit (number, optional): Max results to return (default: 20, max: 100)
  - offset (number, optional): Skip results for pagination
  - response_format ('markdown' | 'json'): Output format

Returns:
  List of files with metadata (ID, name, size, creation date).`,
      inputSchema: ListFilesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListFilesInput) => {
      try {
        const client = getIagonClient();
        const result = await client.listFiles(params.folder_id, params.limit, params.offset);

        let text: string;
        if (params.response_format === ResponseFormat.JSON) {
          text = JSON.stringify(result, null, 2);
        } else {
          text = formatFilesAsMarkdown(result.items, result.total, result.offset, result.hasMore);
        }

        // Truncate if needed
        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n\n*Response truncated. Use pagination to see more results.*";
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

  // Delete file tool
  server.registerTool(
    "iagon_delete_file",
    {
      title: "Delete File from Iagon",
      description: `Delete a file from Iagon storage.

**Warning**: This action is permanent and cannot be undone.

Args:
  - file_id (string, required): ID of the file to delete

Returns:
  Success/failure status.`,
      inputSchema: DeleteFileSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DeleteFileInput) => {
      try {
        const client = getIagonClient();
        const result = await client.deleteFile(params.file_id);

        return {
          content: [{
            type: "text",
            text: result.success
              ? `**File Deleted**\n\nFile ID \`${params.file_id}\` has been permanently deleted.`
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

  // Get file info tool
  server.registerTool(
    "iagon_get_file_info",
    {
      title: "Get File Info",
      description: `Get detailed metadata for a specific file in Iagon storage.

Args:
  - file_id (string, required): ID of the file
  - response_format ('markdown' | 'json'): Output format

Returns:
  File metadata including name, size, type, and timestamps.`,
      inputSchema: GetFileInfoSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetFileInfoInput) => {
      try {
        const client = getIagonClient();
        const file = await client.getFileInfo(params.file_id);

        if (!file) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `File not found: ${params.file_id}`
            }]
          };
        }

        let text: string;
        if (params.response_format === ResponseFormat.JSON) {
          text = JSON.stringify(file, null, 2);
        } else {
          text = [
            `# File: ${file.name}`,
            "",
            `- **ID**: \`${file.id}\``,
            `- **Size**: ${formatBytes(file.size)}`,
            file.mimeType ? `- **Type**: ${file.mimeType}` : null,
            file.folderId ? `- **Folder**: ${file.folderId}` : null,
            `- **Created**: ${file.createdAt}`,
            `- **Updated**: ${file.updatedAt}`
          ].filter(Boolean).join("\n");
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

  // Search files tool
  server.registerTool(
    "iagon_search_files",
    {
      title: "Search Files in Iagon",
      description: `Search for files by name or pattern in Iagon storage.

Args:
  - query (string, required): Search string to match against file names
  - limit (number, optional): Max results (default: 20, max: 100)
  - offset (number, optional): Skip results for pagination
  - response_format ('markdown' | 'json'): Output format

Returns:
  Matching files with metadata.

Example:
  - Search for MP4 files: query=".mp4"
  - Search for project files: query="project-a"`,
      inputSchema: SearchFilesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: SearchFilesInput) => {
      try {
        const client = getIagonClient();
        const result = await client.searchFiles(params.query, params.limit, params.offset);

        let text: string;
        if (params.response_format === ResponseFormat.JSON) {
          text = JSON.stringify(result, null, 2);
        } else {
          text = formatFilesAsMarkdown(result.items, result.total, result.offset, result.hasMore);
          text = text.replace("# Files in Iagon Storage", `# Search Results: "${params.query}"`);
        }

        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n\n*Response truncated. Use pagination to see more results.*";
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
