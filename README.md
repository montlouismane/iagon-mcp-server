# Iagon MCP Server

An MCP (Model Context Protocol) server for [Iagon](https://iagon.com) decentralized storage. This server enables Claude Code and other AI agents to upload, download, and manage files on Iagon's encrypted, sharded cloud storage.

## Features

- **File Operations**: Upload, download, list, delete, and search files
- **Folder Management**: Create, list, and delete folders for organization
- **Batch Operations**: Upload entire directories or multiple files at once
- **Storage Info**: Check quota and usage statistics
- **40MB File Limit Handling**: Gracefully skips large files with clear messages

## Quick Start

### 1. Generate an Iagon Access Token

1. Log in to [https://app.iagon.com](https://app.iagon.com)
2. Go to **Settings**
3. Click **Generate Token**
4. Copy and save the token securely

### 2. Install Dependencies

```bash
git clone https://github.com/montlouismane/iagon-mcp-server.git
cd iagon-mcp-server
npm install
npm run build
```

### 3. Configure Claude Code

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "iagon": {
      "command": "node",
      "args": ["/path/to/iagon-mcp-server/dist/index.js"],
      "env": {
        "IAGON_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

### 4. Restart Claude Code

Restart Claude Code to load the new MCP server. You should now see Iagon tools available.

## Available Tools

### File Operations

| Tool | Description |
|------|-------------|
| `iagon_upload_file` | Upload a local file to Iagon storage |
| `iagon_download_file` | Download a file from Iagon to local path |
| `iagon_list_files` | List files in storage (paginated) |
| `iagon_delete_file` | Delete a file from storage |
| `iagon_get_file_info` | Get metadata for a specific file |
| `iagon_search_files` | Search files by name/pattern |

### Folder Operations

| Tool | Description |
|------|-------------|
| `iagon_create_folder` | Create a folder for organization |
| `iagon_list_folders` | List folders |
| `iagon_delete_folder` | Delete a folder |

### Storage Management

| Tool | Description |
|------|-------------|
| `iagon_get_storage_info` | Get storage quota and usage |

### Batch Operations

| Tool | Description |
|------|-------------|
| `iagon_upload_directory` | Upload all files from a local directory |
| `iagon_bulk_upload` | Upload multiple files by path list |

## Usage Examples

### Upload a video file

```
Upload the file at /Users/me/videos/project.mp4 to Iagon
```

### Upload all MP4 files from a directory

```
Upload all .mp4 files from /Users/me/raw-footage to Iagon
```

### List files and search

```
List all files in my Iagon storage
Search for files containing "project-a" in the name
```

### Check storage usage

```
Show my Iagon storage usage and quota
```

## File Size Limits

Iagon has a **40MB per-file limit** for its sharding process. Files larger than 40MB will be skipped with a helpful message suggesting to compress or split the file.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `IAGON_ACCESS_TOKEN` | Yes | Your Iagon personal access token |
| `IAGON_TRANSPORT` | No | Transport mode: `stdio` (default) or `http` |
| `PORT` | No | HTTP server port when using HTTP transport (default: 3000) |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode with auto-reload
npm run dev

# Clean build artifacts
npm run clean
```

## Deploying to Iagon Compute

You can host this MCP server on Iagon's compute platform:

1. Push this repo to GitHub
2. Log in to [https://app.iagon.com](https://app.iagon.com)
3. Go to **Apps** section
4. Select a subscription plan
5. Submit your GitHub repository URL and branch
6. Set environment variables in the deployment config
7. Access via the generated domain URL

## About Iagon

[Iagon](https://iagon.com) is a decentralized storage and compute marketplace built on the Cardano blockchain. Files are encrypted, split into 6 shards using Reed-Solomon encoding, and distributed across multiple storage providers. Only 4 of 6 shards are needed to reconstruct the original file, providing redundancy.

## License

MIT License - see [LICENSE](LICENSE) file.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Links

- [Iagon Website](https://iagon.com)
- [Iagon Documentation](https://docs.iagon.com)
- [Iagon App](https://app.iagon.com)
- [MCP Protocol](https://modelcontextprotocol.io)
