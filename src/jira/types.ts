/**
 * Jira-specific types
 */

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: any;
    status: {
      name: string;
    };
    priority?: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    attachment?: JiraAttachment[];
    [key: string]: any;
  };
}

export interface JiraAttachment {
  id: string;
  self: string;
  filename: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  size: number;
  mimeType: string;
  content: string;
}

export interface JiraComment {
  id: string;
  self: string;
  body: any;
  author: {
    displayName: string;
    emailAddress: string;
  };
  created: string;
  updated: string;
}

export interface JiraCommentInput {
  body: {
    type: 'doc';
    version: 1;
    content: Array<{
      type: 'paragraph';
      content: Array<{
        type: 'text';
        text: string;
      }>;
    }>;
  };
}

/**
 * Pagination response structure from Jira API
 */
export interface JiraCommentsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  isLast?: boolean;
  comments: JiraComment[];
}

/**
 * MCP Resource types for Jira
 */
export interface CachedAttachment {
  data: string; // base64 content
  metadata: JiraAttachment;
  timestamp: number;
  expiresAt: number;
}

