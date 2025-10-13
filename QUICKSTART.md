# Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
# Create your .env file
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Jira Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your_jira_token_here

# Sourcegraph Configuration
SOURCEGRAPH_URL=https://sourcegraph.your-company.com
SOURCEGRAPH_TOKEN=your_sourcegraph_token_here
```

### 3. Build the Project

```bash
npm run build
```

### 4. Test the Server

```bash
npm start
```

You should see:
```
🚀 Hive MCP Server starting...
✅ Hive MCP Server running on stdio
📋 Available tools:
   - jira_get_issue
   - jira_download_attachment
   - jira_add_comment
   - sourcegraph_search_code
   - sourcegraph_deep_search
```

## Using with Claude Desktop

### 1. Find your Claude config file

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. Add Hive MCP to the config

```json
{
  "mcpServers": {
    "hive-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\hive-mcp\\dist\\index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_EMAIL": "your.email@company.com",
        "JIRA_API_TOKEN": "your_jira_token",
        "SOURCEGRAPH_URL": "https://sourcegraph.your-company.com",
        "SOURCEGRAPH_TOKEN": "your_sourcegraph_token"
      }
    }
  }
}
```

**Note**: Replace `C:\\path\\to\\hive-mcp` with the actual path to your hive-mcp directory.

### 3. Restart Claude Desktop

After adding the configuration, restart Claude Desktop completely.

### 4. Verify the Integration

In Claude Desktop, you can now ask:

**Jira:**
- "What's in Jira issue PROJ-123?"
- "Show me all comments from PROJ-123"
- "Read jira://attachments/10041" (Resource - direct access)
- "Show me all attachments from PROJ-123"
- "Add a comment to PROJ-123 saying 'Working on this'"

**Sourcegraph:**
- "Search for authentication code in our repositories"
- "Do a deep search: How does the auth system work?"

## Example Usage

### Jira Examples

**Get Issue Details:**
```
Can you get me the details of PROJ-123?
```

**Read Attachments (Resource):**
```
Read jira://attachments/10041
Show me the image from attachment 10041
List all attachments: jira://issues/PROJ-123/attachments
```

**Add Comment:**
```
Add a comment to PROJ-456 saying "I've reviewed this and it looks good"
```

**Note:** Attachments are now accessed via Resources - Claude reads them like local files!

### Sourcegraph Examples

**Basic Search:**
```
Search for "function handleLogin" in our codebase
```

**Advanced Search:**
```
Search for authentication code in the backend repository, TypeScript files only
```

**Deep Search (AI-powered, natural language):**
```
Ask: "How does the authentication system work in this codebase?"
Ask: "Where are API rate limiting rules defined and how do they work?"
Ask: "Does this repository follow any specific design patterns?"
```

Note: Deep Search uses AI and may take 10-60 seconds to analyze and respond.

## Troubleshooting

### Server won't start

1. Check your `.env` file has all required variables
2. Verify your API tokens are valid
3. Make sure you ran `npm install` and `npm run build`

### Claude can't find the tools

1. Check the path in `claude_desktop_config.json` is correct
2. Make sure you restarted Claude Desktop
3. Verify the server builds without errors

### API calls failing

1. **Jira**: Check your JIRA_BASE_URL doesn't have a trailing slash
2. **Sourcegraph**: Verify your Sourcegraph URL is accessible
3. Check your API tokens have the required permissions

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the [API documentation](docs/API.md) for advanced usage
- Contribute by adding more tools or improving existing ones

