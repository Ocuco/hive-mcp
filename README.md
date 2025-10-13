# Hive MCP Server

A Model Context Protocol (MCP) server that provides integrations for Jira and Sourcegraph. This allows LLMs to interact with Jira issues and search code across repositories using Sourcegraph.

**Package name:** `hive-mcp`  
**Tool prefix:** Service name (e.g., `jira_*`, `sourcegraph_*`)  
**Full tool names in LLM:** `mcp__hive-mcp__jira_get_issue` etc.

## Features

### Jira Integration
- **Get Issue**: Retrieve detailed information about Jira issues
- **Download Attachments**: Download attachments from Jira issues
- **Add Comments**: Post comments to Jira issues

### Sourcegraph Integration
- **Code Search**: Search code across repositories with powerful query operators (GraphQL)
- **Deep Search**: AI-powered conversational code search that understands natural language questions (REST API v6.7+)

## Installation

### Prerequisites
- Node.js 18 or higher
- Jira Cloud instance with API access
- Sourcegraph instance with API access

### Install from NPM (coming soon)

```bash
npm install -g hive-mcp
```

### Install from Source

```bash
git clone <repository-url>
cd hive-mcp
npm install
npm run build
npm link
```

## Configuration

Create a `.env` file in your project root or set environment variables:

```bash
# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token

# Sourcegraph Configuration
SOURCEGRAPH_URL=https://sourcegraph.company.com
SOURCEGRAPH_TOKEN=your_sourcegraph_token
```

### Getting API Credentials

#### Jira API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token and use it as `JIRA_API_TOKEN`

#### Sourcegraph Token
1. Go to your Sourcegraph instance
2. Navigate to Settings > Access tokens
3. Create a new access token
4. Copy the token and use it as `SOURCEGRAPH_TOKEN`

## Usage with Claude Desktop

Add to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hive-mcp": {
      "command": "node",
      "args": ["/path/to/hive-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your_jira_api_token",
        "SOURCEGRAPH_URL": "https://sourcegraph.company.com",
        "SOURCEGRAPH_TOKEN": "your_sourcegraph_token"
      }
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "hive-mcp": {
      "command": "hive-mcp",
      "env": {
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your_jira_api_token",
        "SOURCEGRAPH_URL": "https://sourcegraph.company.com",
        "SOURCEGRAPH_TOKEN": "your_sourcegraph_token"
      }
    }
  }
}
```

## Available Tools & Resources

### Tools

All tools are prefixed with their service name for easy identification in LLM tool lists.

**Full name format in LLM:** `mcp__hive-mcp__<tool_name>`

#### Jira Tools

#### `jira_get_issue`
Get detailed information about a Jira issue.

**Parameters:**
- `issueIdOrKey` (string): The issue key (e.g., "PROJ-123") or ID

**Example:**
```typescript
{
  "issueIdOrKey": "PROJ-123"
}
```

#### `jira_get_comments`
Get all comments from a Jira issue. Returns comment history with authors and timestamps.

**Parameters:**
- `issueIdOrKey` (string): The issue key (e.g., "PROJ-123") or ID

**Returns:**
- Total comment count
- Array of comments with:
  - Author name and email
  - Created and updated timestamps
  - Comment body (Atlassian Document Format)

**Example:**
```typescript
{
  "issueIdOrKey": "PROJ-123"
}
```

#### `jira_add_comment`
Add a comment to a Jira issue.

**Parameters:**
- `issueIdOrKey` (string): The issue key (e.g., "PROJ-123") or ID
- `comment` (string): The comment text to add

### Sourcegraph Tools

#### `sourcegraph_search_code`
Search code across repositories.

**Parameters:**
- `query` (string): Search query with optional operators
  - `repo:owner/name` - Filter by repository
  - `file:path` - Filter by file path
  - `lang:python` - Filter by language
  - And more...

**Example:**
```typescript
{
  "query": "function handleRequest repo:myorg/myrepo lang:typescript"
}
```

#### `sourcegraph_deep_search`
AI-powered Deep Search using natural language questions. This feature creates a conversation with Sourcegraph's AI agent (requires v6.7+).

**Parameters:**
- `question` (string): Natural language question about your codebase
- `timeout_seconds` (number, optional): Max wait time for answer (default: 60)

**Example:**
```typescript
{
  "question": "How does authentication work in this codebase?"
}
```

**Response includes:**
- AI-generated answer
- Relevant source code references
- Suggested follow-up questions
- Conversation ID for follow-ups
- Shareable URL

**Note:** Deep Search is async and may take 10-60 seconds. It uses credits/quota on Sourcegraph Enterprise.

---

### Resources

MCP Resources allow LLMs to read Jira attachments like local files. The server handles caching and download automatically.

**Resource URI Format:**

#### `jira://issues/{issueKey}/attachments`
List all attachments for a specific Jira issue.

**Example:**
```
jira://issues/PROJ-123/attachments
```

**Returns:**
- List of all attachments with metadata
- Each attachment includes its resource URI for direct access

#### `jira://attachments/{attachmentId}`
Read specific attachment content.

**Example:**
```
jira://attachments/10041
```

**Behavior:**
- **Images <500KB**: Returns image blob (viewable directly)
- **Files <500KB**: Returns base64 content
- **Files >500KB**: Returns metadata + warning
- **Automatic caching**: Small files cached for 5 minutes

**Advantages:**
- ✅ LLM reads attachments like local files
- ✅ No repeated downloads (smart caching)
- ✅ No authentication errors (handled by MCP)
- ✅ Automatic size management

**Usage in Claude:**
```
"Read jira://attachments/10041"
"Show me all attachments from PROJ-123"
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch for changes)
npm run dev

# Run the server
npm start
```

## Architecture

```
hive-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config.ts             # Environment configuration
│   ├── types.ts              # Shared types
│   ├── jira/
│   │   ├── client.ts         # Jira REST API client
│   │   ├── tools.ts          # Jira MCP tools
│   │   └── types.ts          # Jira types
│   └── sourcegraph/
│       ├── client.ts         # Sourcegraph GraphQL client
│       ├── tools.ts          # Sourcegraph MCP tools
│       └── types.ts          # Sourcegraph types
└── dist/                     # Compiled output
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

