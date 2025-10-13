import { GraphQLClient } from 'graphql-request';
import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';
import { 
  SourcegraphSearchResult, 
  SourcegraphSearchQuery,
  DeepSearchConversation
} from './types.js';

export class SourcegraphClient {
  private graphqlClient: GraphQLClient;
  private restClient: AxiosInstance;

  constructor() {
    // GraphQL client for code search
    const graphqlEndpoint = `${config.SOURCEGRAPH_URL}/.api/graphql`;
    this.graphqlClient = new GraphQLClient(graphqlEndpoint, {
      headers: {
        'Authorization': `token ${config.SOURCEGRAPH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    // REST client for Deep Search API
    this.restClient = axios.create({
      baseURL: config.SOURCEGRAPH_URL,
      headers: {
        'Authorization': `token ${config.SOURCEGRAPH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'hive-mcp 1.0.0',
      },
    });
  }

  /**
   * Search code using Sourcegraph's GraphQL API
   */
  async searchCode(searchQuery: SourcegraphSearchQuery): Promise<SourcegraphSearchResult> {
    const query = `
      query Search($query: String!) {
        search(query: $query) {
          results {
            results {
              __typename
              ... on FileMatch {
                file {
                  path
                  url
                  repository {
                    name
                    url
                  }
                }
                lineMatches {
                  lineNumber
                  offsetAndLengths
                  preview
                }
              }
              ... on Repository {
                name
                url
              }
            }
            matchCount
            limitHit
            cloning {
              name
            }
            missing {
              name
            }
            timedout {
              name
            }
          }
        }
      }
    `;

    try {
      const result = await this.graphqlClient.request<any>(
        query,
        { query: searchQuery.query }
      );

      // graphql-request removes 'data' wrapper automatically
      // result = { search: { results: { matchCount, results: [...] } } }
      // We need to return search.results which contains the actual data
      return result.search.results;
    } catch (error: any) {
      throw new Error(`Sourcegraph search failed: ${error.message}`);
    }
  }

  /**
   * Deep Search API - AI-powered code search using REST API
   * Creates a conversation and waits for the answer
   * 
   * Reference: https://sourcegraph.com/docs/deep-search/api
   */
  async deepSearch(question: string, options?: {
    maxPollAttempts?: number;
    pollIntervalMs?: number;
  }): Promise<DeepSearchConversation> {
    const maxAttempts = options?.maxPollAttempts || 30; // 30 attempts
    const pollInterval = options?.pollIntervalMs || 2000; // 2 seconds

    try {
      // Create a new Deep Search conversation
      const createResponse = await this.restClient.post<DeepSearchConversation>(
        '/.api/deepsearch/v1',
        { question }
      );

      const conversationId = createResponse.data.id;
      
      // Poll until the answer is ready
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Wait before polling (except first attempt)
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        // Get conversation status
        const conversation = await this.getDeepSearchConversation(conversationId);
        const latestQuestion = conversation.questions[conversation.questions.length - 1];

        // Check if completed or failed
        if (latestQuestion.status === 'completed') {
          return conversation;
        }

        if (latestQuestion.status === 'failed') {
          throw new Error('Deep Search failed to process the question');
        }

        // Continue polling if still processing
      }

      throw new Error(`Deep Search timeout after ${maxAttempts * pollInterval / 1000} seconds`);
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`Deep Search failed: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Deep Search failed: ${error.message}`);
    }
  }

  /**
   * Get a Deep Search conversation by ID
   */
  async getDeepSearchConversation(conversationId: number): Promise<DeepSearchConversation> {
    try {
      const response = await this.restClient.get<DeepSearchConversation>(
        `/.api/deepsearch/v1/${conversationId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Deep Search conversation: ${error.message}`);
    }
  }

  /**
   * Add a follow-up question to an existing Deep Search conversation
   */
  async addDeepSearchFollowup(
    conversationId: number, 
    question: string,
    options?: {
      maxPollAttempts?: number;
      pollIntervalMs?: number;
    }
  ): Promise<DeepSearchConversation> {
    const maxAttempts = options?.maxPollAttempts || 30;
    const pollInterval = options?.pollIntervalMs || 2000;

    try {
      // Add follow-up question
      await this.restClient.post(
        `/.api/deepsearch/v1/${conversationId}/questions`,
        { question }
      );

      // Poll until answer is ready
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        const conversation = await this.getDeepSearchConversation(conversationId);
        const latestQuestion = conversation.questions[conversation.questions.length - 1];

        if (latestQuestion.status === 'completed') {
          return conversation;
        }

        if (latestQuestion.status === 'failed') {
          throw new Error('Deep Search follow-up failed');
        }
      }

      throw new Error(`Deep Search follow-up timeout after ${maxAttempts * pollInterval / 1000} seconds`);
    } catch (error: any) {
      throw new Error(`Failed to add follow-up: ${error.message}`);
    }
  }
}

