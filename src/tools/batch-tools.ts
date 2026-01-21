/**
 * MCP Tools for batch file operations on Iagon storage
 */

import * as fs from "fs";
import * as path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getIagonClient } from "../services/iagon-client.js";
import { formatBytes, FILE_SIZE_LIMIT } from "../constants.js";
import {
  UploadDirectorySchema,
  BulkUploadSchema,
  type UploadDirectoryInput,
  type BulkUploadInput
} from "../schemas/input-schemas.js";
import type { BulkOperationResult } from "../types.js";

/**
 * Get files from directory (optionally recursive)
 */
function getFilesFromDirectory(
  dirPath: string,
  recursive: boolean,
  pattern?: string
): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...getFilesFromDirectory(fullPath, recursive, pattern));
      }
    } else if (entry.isFile()) {
      // Apply pattern filter if provided
      if (pattern) {
        const regex = new RegExp(
          pattern.replace(/\*/g, ".*").replace(/\?/g, "."),
          "i"
        );
        if (!regex.test(entry.name)) {
          continue;
        }
      }
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Format bulk operation result as markdown
 */
function formatBulkResultAsMarkdown(result: BulkOperationResult): string {
  const lines: string[] = [
    "# Bulk Upload Results",
    "",
    "## Summary",
    `- **Total**: ${result.total}`,
    `- **Successful**: ${result.successful}`,
    `- **Failed**: ${result.failed}`,
    `- **Skipped**: ${result.skipped}`,
    ""
  ];

  if (result.results.length > 0) {
    lines.push("## Details");
    lines.push("");

    for (const r of result.results) {
      const icon = r.status === "success" ? "+" : r.status === "failed" ? "X" : "-";
      const fileName = path.basename(r.path);
      lines.push(`[${icon}] **${fileName}**: ${r.message}`);
      if (r.fileId) {
        lines.push(`    ID: \`${r.fileId}\``);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Register batch operation tools with the MCP server
 */
export function registerBatchTools(server: McpServer): void {
  // Upload directory tool
  server.registerTool(
    "iagon_upload_directory",
    {
      title: "Upload Directory to Iagon",
      description: `Upload all files from a local directory to Iagon storage.

This tool scans a directory and uploads all matching files. Files larger than 40MB will be skipped.

Args:
  - local_directory (string, required): Absolute path to the local directory
  - folder_id (string, optional): ID of the destination folder in Iagon
  - include_pattern (string, optional): Glob pattern to filter files (e.g., "*.mp4", "*.mov")
  - recursive (boolean, optional): Include files from subdirectories (default: false)

Returns:
  Summary of uploads with success/failure status for each file.

Examples:
  - Upload all videos: local_directory="/Users/me/videos", include_pattern="*.mp4"
  - Upload recursively: local_directory="/Users/me/project", recursive=true`,
      inputSchema: UploadDirectorySchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: UploadDirectoryInput) => {
      try {
        // Verify directory exists
        if (!fs.existsSync(params.local_directory)) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Directory not found: ${params.local_directory}`
            }]
          };
        }

        if (!fs.statSync(params.local_directory).isDirectory()) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Path is not a directory: ${params.local_directory}`
            }]
          };
        }

        // Get files
        const files = getFilesFromDirectory(
          params.local_directory,
          params.recursive,
          params.include_pattern
        );

        if (files.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No files found in ${params.local_directory}` +
                    (params.include_pattern ? ` matching pattern "${params.include_pattern}"` : "")
            }]
          };
        }

        const client = getIagonClient();
        const result: BulkOperationResult = {
          total: files.length,
          successful: 0,
          failed: 0,
          skipped: 0,
          results: []
        };

        // Upload each file
        for (const filePath of files) {
          const stats = fs.statSync(filePath);
          const fileName = path.basename(filePath);

          // Check size limit
          if (stats.size > FILE_SIZE_LIMIT) {
            result.skipped++;
            result.results.push({
              path: filePath,
              status: "skipped",
              message: `Exceeds 40MB limit (${formatBytes(stats.size)})`
            });
            continue;
          }

          // Upload
          const uploadResult = await client.uploadFile(filePath);

          if (uploadResult.success) {
            result.successful++;
            result.results.push({
              path: filePath,
              status: "success",
              message: `Uploaded (${formatBytes(stats.size)})`,
              fileId: uploadResult.fileId
            });
          } else {
            result.failed++;
            result.results.push({
              path: filePath,
              status: "failed",
              message: uploadResult.message
            });
          }
        }

        return {
          content: [{
            type: "text",
            text: formatBulkResultAsMarkdown(result)
          }]
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

  // Bulk upload tool
  server.registerTool(
    "iagon_bulk_upload",
    {
      title: "Bulk Upload Files to Iagon",
      description: `Upload multiple specific files to Iagon storage.

This tool uploads a list of files by their paths. Files larger than 40MB will be skipped.

Args:
  - file_paths (string[], required): Array of absolute paths to files to upload (max 100)
  - folder_id (string, optional): ID of the destination folder in Iagon

Returns:
  Summary of uploads with success/failure status for each file.

Example:
  file_paths=["/Users/me/video1.mp4", "/Users/me/video2.mp4", "/Users/me/video3.mp4"]`,
      inputSchema: BulkUploadSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: BulkUploadInput) => {
      try {
        const client = getIagonClient();
        const result: BulkOperationResult = {
          total: params.file_paths.length,
          successful: 0,
          failed: 0,
          skipped: 0,
          results: []
        };

        for (const filePath of params.file_paths) {
          // Check if file exists
          if (!fs.existsSync(filePath)) {
            result.failed++;
            result.results.push({
              path: filePath,
              status: "failed",
              message: "File not found"
            });
            continue;
          }

          const stats = fs.statSync(filePath);

          // Check size limit
          if (stats.size > FILE_SIZE_LIMIT) {
            result.skipped++;
            result.results.push({
              path: filePath,
              status: "skipped",
              message: `Exceeds 40MB limit (${formatBytes(stats.size)})`
            });
            continue;
          }

          // Upload
          const uploadResult = await client.uploadFile(filePath);

          if (uploadResult.success) {
            result.successful++;
            result.results.push({
              path: filePath,
              status: "success",
              message: `Uploaded (${formatBytes(stats.size)})`,
              fileId: uploadResult.fileId
            });
          } else {
            result.failed++;
            result.results.push({
              path: filePath,
              status: "failed",
              message: uploadResult.message
            });
          }
        }

        return {
          content: [{
            type: "text",
            text: formatBulkResultAsMarkdown(result)
          }]
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
