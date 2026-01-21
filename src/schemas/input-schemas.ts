/**
 * Zod validation schemas for MCP tool inputs
 */

import { z } from "zod";
import { ResponseFormat, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../constants.js";

// Common pagination schema
export const PaginationSchema = z.object({
  limit: z.number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(MAX_PAGE_LIMIT, `Limit cannot exceed ${MAX_PAGE_LIMIT}`)
    .default(DEFAULT_PAGE_LIMIT)
    .describe("Maximum number of results to return (1-100)"),
  offset: z.number()
    .int()
    .min(0, "Offset cannot be negative")
    .default(0)
    .describe("Number of results to skip for pagination")
});

// Response format schema
export const ResponseFormatSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
});

// ===== FILE OPERATIONS =====

export const UploadFileSchema = z.object({
  local_path: z.string()
    .min(1, "Local path is required")
    .describe("Absolute path to the local file to upload"),
  remote_path: z.string()
    .optional()
    .describe("Optional: Name/path for the file in Iagon storage (defaults to original filename)"),
  folder_id: z.string()
    .optional()
    .describe("Optional: ID of the folder to upload to")
}).strict();

export const DownloadFileSchema = z.object({
  file_id: z.string()
    .min(1, "File ID is required")
    .describe("ID of the file to download from Iagon"),
  local_path: z.string()
    .min(1, "Local path is required")
    .describe("Absolute path where the file should be saved locally")
}).strict();

export const ListFilesSchema = PaginationSchema.extend({
  folder_id: z.string()
    .optional()
    .describe("Optional: Filter files by folder ID"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

export const DeleteFileSchema = z.object({
  file_id: z.string()
    .min(1, "File ID is required")
    .describe("ID of the file to delete")
}).strict();

export const GetFileInfoSchema = z.object({
  file_id: z.string()
    .min(1, "File ID is required")
    .describe("ID of the file to get information about"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
}).strict();

export const SearchFilesSchema = PaginationSchema.extend({
  query: z.string()
    .min(1, "Search query is required")
    .max(200, "Search query too long")
    .describe("Search string to match against file names"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
}).strict();

// ===== FOLDER OPERATIONS =====

export const CreateFolderSchema = z.object({
  name: z.string()
    .min(1, "Folder name is required")
    .max(255, "Folder name too long")
    .describe("Name for the new folder"),
  parent_id: z.string()
    .optional()
    .describe("Optional: ID of the parent folder")
}).strict();

export const ListFoldersSchema = z.object({
  parent_id: z.string()
    .optional()
    .describe("Optional: Filter folders by parent ID"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
}).strict();

export const DeleteFolderSchema = z.object({
  folder_id: z.string()
    .min(1, "Folder ID is required")
    .describe("ID of the folder to delete")
}).strict();

// ===== STORAGE OPERATIONS =====

export const GetStorageInfoSchema = z.object({
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format")
}).strict();

// ===== BATCH OPERATIONS =====

export const UploadDirectorySchema = z.object({
  local_directory: z.string()
    .min(1, "Directory path is required")
    .describe("Absolute path to the local directory to upload"),
  folder_id: z.string()
    .optional()
    .describe("Optional: ID of the destination folder in Iagon"),
  include_pattern: z.string()
    .optional()
    .describe("Optional: Glob pattern to filter files (e.g., '*.mp4')"),
  recursive: z.boolean()
    .default(false)
    .describe("Include files from subdirectories")
}).strict();

export const BulkUploadSchema = z.object({
  file_paths: z.array(z.string())
    .min(1, "At least one file path is required")
    .max(100, "Cannot upload more than 100 files at once")
    .describe("Array of absolute paths to local files to upload"),
  folder_id: z.string()
    .optional()
    .describe("Optional: ID of the destination folder in Iagon")
}).strict();

// Type exports
export type UploadFileInput = z.infer<typeof UploadFileSchema>;
export type DownloadFileInput = z.infer<typeof DownloadFileSchema>;
export type ListFilesInput = z.infer<typeof ListFilesSchema>;
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;
export type GetFileInfoInput = z.infer<typeof GetFileInfoSchema>;
export type SearchFilesInput = z.infer<typeof SearchFilesSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type ListFoldersInput = z.infer<typeof ListFoldersSchema>;
export type DeleteFolderInput = z.infer<typeof DeleteFolderSchema>;
export type GetStorageInfoInput = z.infer<typeof GetStorageInfoSchema>;
export type UploadDirectoryInput = z.infer<typeof UploadDirectorySchema>;
export type BulkUploadInput = z.infer<typeof BulkUploadSchema>;
