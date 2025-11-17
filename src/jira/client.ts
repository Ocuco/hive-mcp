import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { config } from '../config.js';
import { JiraIssue, JiraAttachment, JiraComment, JiraCommentInput, JiraCommentsResponse } from './types.js';

export class JiraClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = config.JIRA_BASE_URL;

    // Create HTTPS agent for self-signed certificate support
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Allow self-signed certificates
    });

    this.client = axios.create({
      baseURL: `${this.baseURL}/rest/api/2`,
      headers: {
        'Authorization': `Bearer ${config.JIRA_API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      httpsAgent,
    });
  }

  /**
   * Get issue details by issue key or ID
   * @param issueIdOrKey - The issue key (e.g., PROJ-123) or ID
   * @param fields - Optional array of field names to fetch. If not specified, fetches all fields.
   */
  async getIssue(issueIdOrKey: string, fields?: string[]): Promise<JiraIssue> {
    try {
      // Build query parameters
      const params: Record<string, string> = {};
      if (fields && fields.length > 0) {
        params.fields = fields.join(',');
      }

      const response = await this.client.get<JiraIssue>(`/issue/${issueIdOrKey}`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to get Jira issue: ${error.response?.data?.errorMessages?.[0] || error.message}`
      );
    }
  }

  /**
   * Download attachment by attachment ID
   * Returns the attachment metadata and content as base64
   */
  async downloadAttachment(attachmentId: string): Promise<{ 
    metadata: JiraAttachment; 
    content: string;
    contentBase64: string;
  }> {
    try {
      // First, get attachment metadata
      const metadataResponse = await this.client.get<JiraAttachment>(
        `/attachment/${attachmentId}`
      );
      const metadata = metadataResponse.data;

      // Download the actual file content
      // Create HTTPS agent for self-signed certificate support
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });

      const contentResponse = await axios.get(metadata.content, {
        headers: {
          'Authorization': `Bearer ${config.JIRA_API_TOKEN}`,
        },
        responseType: 'arraybuffer',
        httpsAgent,
      });

      const contentBase64 = Buffer.from(contentResponse.data).toString('base64');

      return {
        metadata,
        content: metadata.content,
        contentBase64,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to download attachment: ${error.response?.data?.errorMessages?.[0] || error.message}`
      );
    }
  }

  /**
   * Get comments for an issue with pagination support
   * @param issueIdOrKey - The issue key (e.g., PROJ-123) or ID
   * @param startAt - The index of the first result to return (default: 0)
   * @param maxResults - The maximum number of comments to return (default: 5, max: 100)
   */
  async getComments(
    issueIdOrKey: string,
    startAt: number = 0,
    maxResults: number = 5
  ): Promise<JiraCommentsResponse> {
    try {
      // Ensure maxResults doesn't exceed Jira's limit
      const limitedMaxResults = Math.min(maxResults, 100);

      const response = await this.client.get<JiraCommentsResponse>(
        `/issue/${issueIdOrKey}/comment`,
        {
          params: {
            startAt,
            maxResults: limitedMaxResults,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to get comments: ${error.response?.data?.errorMessages?.[0] || error.message}`
      );
    }
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueIdOrKey: string, commentText: string): Promise<JiraComment> {
    try {
      // Create Atlassian Document Format comment
      const commentData: JiraCommentInput = {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: commentText,
                },
              ],
            },
          ],
        },
      };

      const response = await this.client.post<JiraComment>(
        `/issue/${issueIdOrKey}/comment`,
        commentData
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to add comment: ${error.response?.data?.errorMessages?.[0] || error.message}`
      );
    }
  }
}

