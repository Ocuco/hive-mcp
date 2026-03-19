#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from './config.js';
import { Integration } from './types.js';

// Aggregated state from all enabled integrations
const allTools: Tool[] = [];
const allHandlers: Record<string, (args: any) => Promise<any>> = {};
const allResourceTemplates: ResourceTemplate[] = [];
const resourceListers: (() => Promise<Resource[]>)[] = [];
const resourceReaders: ((uri: string) => Promise<any>)[] = [];

async function loadIntegrations() {
  const names = config.enabledIntegrations.map(i => i.name);
  console.error(`📦 Enabled services: ${names.join(', ')}`);

  for (const integration of config.enabledIntegrations) {
    // Validate and init with parsed config
    const envConfig = integration.configSchema.parse(process.env);
    await integration.init(envConfig);

    allTools.push(...integration.tools);
    Object.assign(allHandlers, integration.handlers);

    if (integration.resourceTemplates) {
      allResourceTemplates.push(...integration.resourceTemplates);
    }
    if (integration.listResources) {
      resourceListers.push(integration.listResources);
    }
    if (integration.readResource) {
      resourceReaders.push(integration.readResource);
    }

    console.error(`  ✅ ${integration.name} loaded`);
  }
}

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

// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = allHandlers[name];

  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  return await handler(args);
});

// Register resource handlers
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return { resourceTemplates: allResourceTemplates };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const results = await Promise.all(resourceListers.map(fn => fn()));
  return { resources: results.flat() };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  for (const reader of resourceReaders) {
    try {
      return await reader(uri);
    } catch {
      // This reader doesn't handle this URI, try the next one
    }
  }

  throw new Error(`No resource handler available for ${uri}`);
});

// Start the server
async function main() {
  console.error('🚀 Hive MCP Server starting...');

  try {
    await loadIntegrations();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Hive MCP Server running on stdio');
    console.error(`📋 Available tools (${allTools.length}):`);
    allTools.forEach(tool => {
      console.error(`   - ${tool.name}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
