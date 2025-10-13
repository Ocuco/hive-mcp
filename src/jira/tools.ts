import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from './client.js';

const jiraClient = new JiraClient();

/**
 * Jira MCP Tools
 */

export const jiraGetIssueTool: Tool = {
  name: 'jira_get_issue',
  description: 'Get detailed information about a Jira issue by its key or ID (e.g., PROJ-123)',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue key (e.g., PROJ-123) or ID',
      },
    },
    required: ['issueIdOrKey'],
  },
};

export async function handleJiraGetIssue(args: any) {
  try {
    const { issueIdOrKey } = args;
    const issue = await jiraClient.getIssue(issueIdOrKey);

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
  description: 'Get all comments from a Jira issue. Returns comment history with authors, timestamps, and content.',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue key (e.g., PROJ-123) or ID',
      },
    },
    required: ['issueIdOrKey'],
  },
};

export async function handleJiraGetComments(args: any) {
  try {
    const { issueIdOrKey } = args;
    const comments = await jiraClient.getComments(issueIdOrKey);

    // Format comments for better readability
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      author: {
        name: comment.author.displayName,
        email: comment.author.emailAddress,
      },
      created: comment.created,
      updated: comment.updated,
      body: comment.body, // Atlassian Document Format
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            issueKey: issueIdOrKey,
            totalComments: comments.length,
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

// Export all Jira tools
export const jiraTools = [
  jiraGetIssueTool,
  jiraGetCommentsTool,
  jiraAddCommentTool,
];

// Export all Jira handlers
export const jiraHandlers = {
  'jira_get_issue': handleJiraGetIssue,
  'jira_get_comments': handleJiraGetComments,
  'jira_add_comment': handleJiraAddComment,
};

