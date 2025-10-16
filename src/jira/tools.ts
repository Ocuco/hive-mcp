import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from './client.js';
import { readJiraResource } from './resources.js';

const jiraClient = new JiraClient();

/**
 * Default fields to fetch for Jira issues to keep response size manageable
 * These cover the most essential information without bloating the response
 * Intentionally excludes:
 * - description (can be very large, request explicitly if needed)
 * - comment (use jira_get_comments tool instead)
 * - attachment (use jira_list_attachments tool instead)
 * - Large optional fields (labels, components, etc. - request explicitly if needed)
 */
export const DEFAULT_JIRA_FIELDS = [
  'summary',
  'status',
  'priority',
  'assignee',
  'reporter',
  'created',
  'updated',
  'issuetype',
];

/**
 * Jira MCP Tools
 */

export const jiraGetIssueTool: Tool = {
  name: 'jira_get_issue',
  description: 'Get detailed information about a Jira issue by its key or ID (e.g., PROJ-123). IMPORTANT: Use the fields parameter to control response size and avoid token limits. Default fields provide essential info (summary, status, priority, assignee, reporter, created, updated, issuetype) without bloating response.',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue key (e.g., PROJ-123) or ID',
      },
      fields: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Optional array of specific field names to fetch. Omit this parameter to use default minimal fields (recommended: summary, status, priority, assignee, reporter, created, updated, issuetype). Only specify fields if you need additional information. For comments use jira_get_comments tool, for attachments use jira_list_attachments tool. Common fields: description, labels, components, fixVersions, resolution, resolutiondate, duedate, environment, customfield_*',
      },
    },
    required: ['issueIdOrKey'],
  },
};

export async function handleJiraGetIssue(args: any) {
  try {
    const { issueIdOrKey, fields } = args;

    // Use provided fields or default to minimal field set
    const fieldsToFetch = fields && fields.length > 0 ? fields : DEFAULT_JIRA_FIELDS;

    const issue = await jiraClient.getIssue(issueIdOrKey, fieldsToFetch);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

// jira_download_attachment tool removed
// Use MCP Resources instead: jira://attachments/{attachmentId}

export const jiraGetCommentsTool: Tool = {
  name: 'jira_get_comments',
  description: 'Get comments from a Jira issue with pagination support. Returns comment history with authors, timestamps, and content. Use pagination parameters to control response size and avoid token limits.',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue key (e.g., PROJ-123) or ID',
      },
      startAt: {
        type: 'number',
        description: 'The index of the first comment to return (0-indexed). Default: 0',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of comments to return per request (max: 100). Default: 5',
      },
    },
    required: ['issueIdOrKey'],
  },
};

export async function handleJiraGetComments(args: any) {
  try {
    const { issueIdOrKey, startAt = 0, maxResults = 5 } = args;
    const response = await jiraClient.getComments(issueIdOrKey, startAt, maxResults);

    // Format comments for better readability
    const formattedComments = response.comments.map(comment => ({
      id: comment.id,
      author: {
        name: comment.author.displayName,
        email: comment.author.emailAddress,
      },
      created: comment.created,
      updated: comment.updated,
      body: comment.body, // Atlassian Document Format
    }));

    // Calculate if there are more comments to fetch
    const hasMore = !response.isLast && (response.startAt + response.maxResults < response.total);
    const nextStartAt = hasMore ? response.startAt + response.maxResults : null;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            issueKey: issueIdOrKey,
            pagination: {
              startAt: response.startAt,
              maxResults: response.maxResults,
              total: response.total,
              returned: response.comments.length,
              hasMore,
              ...(nextStartAt !== null && {
                nextStartAt,
                nextPageHint: `To get the next page, call with: startAt=${nextStartAt}, maxResults=${maxResults}`
              }),
            },
            comments: formattedComments,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

export const jiraAddCommentTool: Tool = {
  name: 'jira_add_comment',
  description: 'Add a comment to a Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue key (e.g., PROJ-123) or ID',
      },
      comment: {
        type: 'string',
        description: 'The comment text to add',
      },
    },
    required: ['issueIdOrKey', 'comment'],
  },
};

export async function handleJiraAddComment(args: any) {
  try {
    const { issueIdOrKey, comment } = args;
    const result = await jiraClient.addComment(issueIdOrKey, comment);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: result.id,
            created: result.created,
            author: result.author,
            message: 'Comment added successfully',
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

export const jiraListAttachmentsTool: Tool = {
  name: 'jira_list_attachments',
  description: 'List all attachments for a Jira issue. Returns attachment metadata including IDs, filenames, sizes, and mime types.',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'The issue key (e.g., PROJ-123)',
      },
    },
    required: ['issueKey'],
  },
};

export async function handleJiraListAttachments(args: any) {
  try {
    const { issueKey } = args;
    const result = await readJiraResource(`jira://issues/${issueKey}/attachments`);

    // Convert resource response to tool response format
    const toolContent = result.contents.map(item => {
      if (item.text) {
        return {
          type: 'text' as const,
          text: item.text,
        };
      } else if (item.blob) {
        return {
          type: 'image' as const,
          data: item.blob,
          mimeType: item.mimeType,
        };
      }
      return {
        type: 'text' as const,
        text: 'Unknown content type',
      };
    });

    return {
      content: toolContent,
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

export const jiraReadAttachmentTool: Tool = {
  name: 'jira_read_attachment',
  description: 'Read a specific Jira attachment by ID. Returns the attachment content (images as blob, other files as base64). Files larger than 500KB will return metadata only.',
  inputSchema: {
    type: 'object',
    properties: {
      attachmentId: {
        type: 'string',
        description: 'The attachment ID (e.g., 10041)',
      },
    },
    required: ['attachmentId'],
  },
};

export async function handleJiraReadAttachment(args: any) {
  try {
    const { attachmentId } = args;
    const result = await readJiraResource(`jira://attachments/${attachmentId}`);

    // Convert resource response to tool response format
    const toolContent = result.contents.map(item => {
      if (item.text) {
        return {
          type: 'text' as const,
          text: item.text,
        };
      } else if (item.blob) {
        return {
          type: 'image' as const,
          data: item.blob,
          mimeType: item.mimeType,
        };
      }
      return {
        type: 'text' as const,
        text: 'Unknown content type',
      };
    });

    return {
      content: toolContent,
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

// Export all Jira tools
export const jiraTools = [
  jiraGetIssueTool,
  jiraGetCommentsTool,
  jiraAddCommentTool,
  jiraListAttachmentsTool,
  jiraReadAttachmentTool,
];

// Export all Jira handlers
export const jiraHandlers = {
  'jira_get_issue': handleJiraGetIssue,
  'jira_get_comments': handleJiraGetComments,
  'jira_add_comment': handleJiraAddComment,
  'jira_list_attachments': handleJiraListAttachments,
  'jira_read_attachment': handleJiraReadAttachment,
};

