# Teleworker MCP Server

This is a Model Context Protocol (MCP) server that interfaces with your Teleworker Cloudflare Worker.

## Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Build**:
   ```bash
   npm run build
   ```

## Configuration

You need to provide the `ADMIN_PASSWORD` environment variable.

### Claude Desktop Config

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "teleworker": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/teleworker/mcp/build/index.js"],
      "env": {
        "ADMIN_PASSWORD": "YOUR_ADMIN_PASSWORD"
      }
    }
  }
}
```

## Tools

- `list_reminders`: View all active reminders.
- `create_reminder`: create a new reminder.
- `delete_reminder`: Delete a reminder by ID.
