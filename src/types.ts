/**
 * TypeScript interfaces for Iagon API responses and internal types
 */

// File metadata from Iagon API
export interface IagonFile {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  nodeId?: string;
}

// Folder metadata
export interface IagonFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
}

// Storage info/quota
export interface IagonStorageInfo {
  used: number;
  total: number;
  available: number;
  fileCount: number;
  folderCount: number;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  count: number;
  offset: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Upload result
export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName: string;
  fileSize: number;
  message: string;
}

// Download result
export interface DownloadResult {
  success: boolean;
  localPath: string;
  fileName: string;
  fileSize: number;
  message: string;
}

// Bulk operation result
export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: {
    path: string;
    status: "success" | "failed" | "skipped";
    message: string;
    fileId?: string;
  }[];
}

// API error response
export interface IagonApiError {
  status: number;
  message: string;
  code?: string;
}
