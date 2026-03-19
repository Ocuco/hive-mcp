import { Tool, Resource, ResourceTemplate } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

/**
 * Shared types for Hive MCP Server
 */

export interface MCPError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: MCPError;
}

/**
 * Standard interface every integration must export as default from its index.ts
 */
export interface Integration {
  /** Unique name used in DISABLED_SERVICES (e.g. 'jira', 'sourcegraph') */
  name: string;

  /** Zod schema for required env vars */
  configSchema: z.ZodType<any>;

  /** Called with validated config to initialize the integration */
  init(config: any): Promise<void> | void;

  /** MCP tools this integration provides */
  tools: Tool[];

  /** Map of tool name → handler function */
  handlers: Record<string, (args: any) => Promise<any>>;

  /** Optional MCP resource templates */
  resourceTemplates?: ResourceTemplate[];

  /** Optional: list available resources */
  listResources?: () => Promise<Resource[]>;

  /** Optional: read a resource by URI */
  readResource?: (uri: string) => Promise<any>;
}

