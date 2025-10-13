#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tools and handlers
import { jiraTools, jiraHandlers } from './jira/tools.js';
import { sourcegraphTools, sourcegraphHandlers } from './sourcegraph/tools.js';

// Import resources
import { 
  jiraResourceTemplates, 
  listJiraResources, 
  readJiraResource 
} from './jira/resources.js';

// Create MCP server
const server = new Server(
  {
    name: 'hive-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Combine all tools and handlers
const allTools = [...jiraTools, ...sourcegraphTools];
const allHandlers = {
  ...jiraHandlers,
  ...sourcegraphHandlers,
};

// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Find and execute the appropriate handler
  const handler = allHandlers[name as keyof typeof allHandlers];

  if (!handler) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  return await handler(args);
});

// Register resource handlers
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: jiraResourceTemplates,
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = await listJiraResources();
  return {
    resources,
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    return await readJiraResource(uri);
  } catch (error: any) {
    throw new Error(`Failed to read resource ${uri}: ${error.message}`);
  }
});

// Start the server
async function main() {
  console.error('🚀 Hive MCP Server starting...');
  
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Hive MCP Server running on stdio');
    console.error('📋 Available tools:');
    allTools.forEach(tool => {
      console.error(`   - ${tool.name}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();

