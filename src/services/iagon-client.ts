/**
 * Iagon API Client
 *
 * Handles all communication with Iagon's decentralized storage API.
 * Requires IAGON_ACCESS_TOKEN environment variable.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import * as fs from "fs";
import * as path from "path";
import FormData from "form-data";
import {
  IAGON_API_BASE_URL,
  IAGON_DOWNLOAD_URL,
  FILE_SIZE_LIMIT,
  API_TIMEOUT,
  UPLOAD_TIMEOUT,
  formatBytes
} from "../constants.js";
import type {
  IagonFile,
  IagonFolder,
  IagonStorageInfo,
  PaginatedResponse,
  UploadResult,
  DownloadResult,
  IagonApiError
} from "../types.js";

export class IagonClient {
  private client: AxiosInstance;
  private downloadClient: AxiosInstance;
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.IAGON_ACCESS_TOKEN || "";

    if (!this.token) {
      throw new Error(
        "IAGON_ACCESS_TOKEN is required. Generate one at https://app.iagon.com → Settings → Generate Token"
      );
    }

    // Main API client
    this.client = axios.create({
      baseURL: IAGON_API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    // Download client (different base URL)
    this.downloadClient = axios.create({
      baseURL: IAGON_DOWNLOAD_URL,
      timeout: UPLOAD_TIMEOUT,
      headers: {
        "Authorization": `Bearer ${this.token}`
      }
    });
  }

  /**
   * Upload a file to Iagon storage
   */
  async uploadFile(localPath: string, remotePath?: string): Promise<UploadResult> {
    // Verify file exists
    if (!fs.existsSync(localPath)) {
      return {
        success: false,
        fileName: path.basename(localPath),
        fileSize: 0,
        message: `File not found: ${localPath}`
      };
    }

    const stats = fs.statSync(localPath);
    const fileName = remotePath || path.basename(localPath);

    // Check file size limit
    if (stats.size > FILE_SIZE_LIMIT) {
      return {
        success: false,
        fileName,
        fileSize: stats.size,
        message: `File ${fileName} (${formatBytes(stats.size)}) exceeds Iagon's 40MB limit. Consider compressing the video or splitting it into smaller segments.`
      };
    }

    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(localPath), fileName);

      const response = await this.client.post("/files/upload", formData, {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${this.token}`
        },
        timeout: UPLOAD_TIMEOUT
      });

      return {
        success: true,
        fileId: response.data.id || response.data.fileId,
        fileName,
        fileSize: stats.size,
        message: `Successfully uploaded ${fileName} (${formatBytes(stats.size)})`
      };
    } catch (error) {
      return {
        success: false,
        fileName,
        fileSize: stats.size,
        message: this.handleError(error)
      };
    }
  }

  /**
   * Download a file from Iagon storage
   */
  async downloadFile(fileId: string, localPath: string, nodeId?: string): Promise<DownloadResult> {
    try {
      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Get file info first to know the filename if not provided
      const fileInfo = await this.getFileInfo(fileId);
      const fileName = path.basename(localPath) || fileInfo?.name || fileId;

      const response = await this.downloadClient.get("/download", {
        params: {
          nodeId: nodeId || fileInfo?.nodeId,
          filename: fileInfo?.name || fileId
        },
        responseType: "stream"
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        let fileSize = 0;
        response.data.on("data", (chunk: Buffer) => {
          fileSize += chunk.length;
        });

        writer.on("finish", () => {
          resolve({
            success: true,
            localPath,
            fileName,
            fileSize,
            message: `Successfully downloaded ${fileName} to ${localPath}`
          });
        });

        writer.on("error", (err) => {
          reject({
            success: false,
            localPath,
            fileName,
            fileSize: 0,
            message: `Download failed: ${err.message}`
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        localPath,
        fileName: fileId,
        fileSize: 0,
        message: this.handleError(error)
      };
    }
  }

  /**
   * List files in storage (paginated)
   */
  async listFiles(
    folderId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<IagonFile>> {
    try {
      const response = await this.client.get("/files", {
        params: {
          folderId,
          limit,
          offset
        }
      });

      const data = response.data;
      const items = data.files || data.items || [];
      const total = data.total || items.length;

      return {
        items,
        total,
        count: items.length,
        offset,
        hasMore: total > offset + items.length,
        nextOffset: total > offset + items.length ? offset + items.length : undefined
      };
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Get file metadata
   */
  async getFileInfo(fileId: string): Promise<IagonFile | null> {
    try {
      const response = await this.client.get(`/files/${fileId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.delete(`/files/${fileId}`);
      return {
        success: true,
        message: `File ${fileId} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }

  /**
   * Search files by name/pattern
   */
  async searchFiles(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<IagonFile>> {
    try {
      const response = await this.client.get("/files/search", {
        params: {
          q: query,
          limit,
          offset
        }
      });

      const data = response.data;
      const items = data.files || data.items || [];
      const total = data.total || items.length;

      return {
        items,
        total,
        count: items.length,
        offset,
        hasMore: total > offset + items.length,
        nextOffset: total > offset + items.length ? offset + items.length : undefined
      };
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Create a folder
   */
  async createFolder(
    name: string,
    parentId?: string
  ): Promise<{ success: boolean; folder?: IagonFolder; message: string }> {
    try {
      const response = await this.client.post("/folders", {
        name,
        parentId
      });

      return {
        success: true,
        folder: response.data,
        message: `Folder "${name}" created successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }

  /**
   * List folders
   */
  async listFolders(parentId?: string): Promise<IagonFolder[]> {
    try {
      const response = await this.client.get("/folders", {
        params: { parentId }
      });
      return response.data.folders || response.data || [];
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.delete(`/folders/${folderId}`);
      return {
        success: true,
        message: `Folder ${folderId} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: this.handleError(error)
      };
    }
  }

  /**
   * Get storage information (quota and usage)
   */
  async getStorageInfo(): Promise<IagonStorageInfo> {
    try {
      const response = await this.client.get("/storage/info");
      return response.data;
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  /**
   * Handle API errors with actionable messages
   */
  private handleError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<IagonApiError>;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;

        switch (status) {
          case 401:
            return "Authentication failed. Please check your IAGON_ACCESS_TOKEN is valid. Generate a new one at https://app.iagon.com → Settings.";
          case 403:
            return "Permission denied. You don't have access to this resource.";
          case 404:
            return "Resource not found. Please check the file/folder ID is correct.";
          case 413:
            return "File too large. Iagon has a 40MB limit per file for sharding.";
          case 429:
            return "Rate limit exceeded. Please wait before making more requests.";
          case 500:
            return "Iagon server error. Please try again later.";
          default:
            return data?.message || `API request failed with status ${status}`;
        }
      } else if (axiosError.code === "ECONNABORTED") {
        return "Request timed out. The file may be too large or the network is slow.";
      } else if (axiosError.code === "ENOTFOUND") {
        return "Cannot connect to Iagon servers. Please check your internet connection.";
      }
    }

    return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Singleton instance
let clientInstance: IagonClient | null = null;

export function getIagonClient(): IagonClient {
  if (!clientInstance) {
    clientInstance = new IagonClient();
  }
  return clientInstance;
}
