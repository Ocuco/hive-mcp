import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SourcegraphClient } from './client.js';

const sourcegraphClient = new SourcegraphClient();

/**
 * Sourcegraph MCP Tools
 */

export const sourcegraphSearchCodeTool: Tool = {
  name: 'sourcegraph_search_code',
  description: 'Search code across repositories using Sourcegraph. Supports various search operators like repo:, file:, lang:, count:, patterntype:, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query. Can include operators like "repo:owner/name", "file:path", "lang:python", "count:50", "patterntype:literal" (default), "patterntype:regexp", or "patterntype:structural". Examples: "payment count:50", "function handleRequest repo:myorg/myrepo", "func.*Handler patterntype:regexp"',
      },
    },
    required: ['query'],
  },
};

export async function handleSourcegraphSearchCode(args: any) {
  try {
    const { query } = args;
    const result = await sourcegraphClient.searchCode({ query });

    // Format results for better readability
    const formattedResults = {
      matchCount: result.matchCount || 0,
      limitHit: result.limitHit || false,
      results: result.results.map((item: any) => {
        if (item.__typename === 'FileMatch' && item.file) {
          return {
            type: 'FileMatch',
            repository: item.file.repository.name,
            path: item.file.path,
            url: item.file.url,
            matches: item.lineMatches?.map((match: any) => ({
              lineNumber: match.lineNumber,
              preview: match.preview,
            })) || [],
          };
        } else if (item.__typename === 'Repository') {
          return {
            type: 'Repository',
            name: item.name,
            url: item.url,
          };
        }
        return item;
      }),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResults, null, 2),
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

export const sourcegraphDeepSearchTool: Tool = {
  name: 'sourcegraph_deep_search',
  description: 'AI-powered Deep Search that understands natural language questions about your codebase. Ask questions like "How does authentication work?" or "Where are API endpoints defined?". This uses Sourcegraph\'s agentic search (REST API v6.7+) and may take 10-60 seconds.',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'Natural language question about your codebase. Examples: "Does the repo have a README?", "How is error handling implemented?", "Where are database migrations defined?"',
      },
      timeout_seconds: {
        type: 'number',
        description: 'Optional: Maximum time to wait for answer (default: 60 seconds)',
      },
    },
    required: ['question'],
  },
};

export async function handleSourcegraphDeepSearch(args: any) {
  try {
    const { question, timeout_seconds } = args;
    
    // Calculate max poll attempts based on timeout
    const timeoutMs = (timeout_seconds || 60) * 1000;
    const pollInterval = 2000; // 2 seconds
    const maxPollAttempts = Math.ceil(timeoutMs / pollInterval);

    console.error(`🔍 Starting Deep Search for: "${question}"`);
    console.error(`⏱️  Max wait time: ${timeout_seconds || 60} seconds`);

    const conversation = await sourcegraphClient.deepSearch(question, {
      maxPollAttempts,
      pollIntervalMs: pollInterval,
    });

    const latestQuestion = conversation.questions[conversation.questions.length - 1];

    // Format the response
    const formattedResult = {
      conversation_id: conversation.id,
      share_url: conversation.share_url,
      question: latestQuestion.question,
      title: latestQuestion.title,
      answer: latestQuestion.answer,
      sources: latestQuestion.sources?.map(source => ({
        type: source.type,
        repository: source.repository,
        path: source.path,
        url: source.url,
      })),
      suggested_followups: latestQuestion.suggested_followups,
      stats: {
        time_seconds: latestQuestion.stats ? (latestQuestion.stats.time_millis / 1000).toFixed(2) : 0,
        tool_calls: latestQuestion.stats?.tool_calls || 0,
        tokens: latestQuestion.stats?.total_tokens || 0,
        credits: latestQuestion.stats?.credits || 0,
      },
      note: 'You can ask follow-up questions by referencing the conversation_id',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResult, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\n\nNote: Deep Search requires Sourcegraph v6.7+ and appropriate permissions.`,
        },
      ],
      isError: true,
    };
  }
}

// Export all Sourcegraph tools
export const sourcegraphTools = [
  sourcegraphSearchCodeTool,
  sourcegraphDeepSearchTool,
];

// Export all Sourcegraph handlers
export const sourcegraphHandlers = {
  'sourcegraph_search_code': handleSourcegraphSearchCode,
  'sourcegraph_deep_search': handleSourcegraphDeepSearch,
};

