/**
 * Iagon MCP Server Constants
 */

// API Configuration
export const IAGON_API_BASE_URL = "https://gw.v2.iagon.com/api/v2";
export const IAGON_DOWNLOAD_URL = "https://da.iagon.com/api/v1";

// Limits
export const FILE_SIZE_LIMIT = 40 * 1024 * 1024; // 40MB - Iagon's sharding limit
export const CHARACTER_LIMIT = 25000; // Max response size for MCP tools
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Timeouts (in milliseconds)
export const API_TIMEOUT = 30000; // 30 seconds
export const UPLOAD_TIMEOUT = 300000; // 5 minutes for uploads

// Response formats
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// File size formatting helper
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
