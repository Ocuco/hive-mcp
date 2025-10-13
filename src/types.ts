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

