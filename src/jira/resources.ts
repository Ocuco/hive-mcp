import { Resource, ResourceTemplate } from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from './client.js';
import { CachedAttachment } from './types.js';

const jiraClient = new JiraClient();

// In-memory cache for attachments
const attachmentCache = new Map<string, CachedAttachment>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE_KB = 500; // Only cache files <500KB

/**
 * Resource templates for Jira
 */
export const jiraResourceTemplates: ResourceTemplate[] = [
  {
    uriTemplate: 'jira://issues/{issueKey}/attachments',
    name: 'Jira Issue Attachments',
    description: 'List all attachments for a specific Jira issue',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'jira://attachments/{attachmentId}',
    name: 'Jira Attachment',
    description: 'Get specific attachment content',
    mimeType: 'application/octet-stream',
  },
];

/**
 * Parse Jira resource URI
 */
function parseJiraUri(uri: string): { type: 'issue-attachments' | 'attachment'; params: Record<string, string> } | null {
  // jira://issues/PROJ-123/attachments
  const issueAttachmentsMatch = uri.match(/^jira:\/\/issues\/([^\/]+)\/attachments$/);
  if (issueAttachmentsMatch) {
    return {
      type: 'issue-attachments',
      params: { issueKey: issueAttachmentsMatch[1] },
    };
  }

  // jira://attachments/10041
  const attachmentMatch = uri.match(/^jira:\/\/attachments\/([^\/]+)$/);
  if (attachmentMatch) {
    return {
      type: 'attachment',
      params: { attachmentId: attachmentMatch[1] },
    };
  }

  return null;
}

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of attachmentCache.entries()) {
    if (now > value.expiresAt) {
      attachmentCache.delete(key);
    }
  }
}

/**
 * Get attachment from cache or download
 */
async function getAttachmentWithCache(attachmentId: string): Promise<{ data: string; metadata: any }> {
  // Check cache first
  const cached = attachmentCache.get(attachmentId);
  if (cached && Date.now() < cached.expiresAt) {
    console.error(`✅ Cache hit for attachment ${attachmentId}`);
    return { data: cached.data, metadata: cached.metadata };
  }

  // Download from Jira
  console.error(`⬇️  Downloading attachment ${attachmentId}...`);
  const result = await jiraClient.downloadAttachment(attachmentId);

  // Cache if small enough
  const sizeKB = result.metadata.size / 1024;
  if (sizeKB <= MAX_CACHE_SIZE_KB) {
    const now = Date.now();
    attachmentCache.set(attachmentId, {
      data: result.contentBase64,
      metadata: result.metadata,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    });
    console.error(`💾 Cached attachment ${attachmentId} (${sizeKB.toFixed(2)} KB)`);
  } else {
    console.error(`⚠️  Attachment ${attachmentId} too large to cache (${sizeKB.toFixed(2)} KB)`);
  }

  // Clean old entries
  cleanCache();

  return { data: result.contentBase64, metadata: result.metadata };
}

/**
 * List available Jira resources
 */
export async function listJiraResources(): Promise<Resource[]> {
  // Return example resources for LLM discovery
  // These show the URI patterns LLM can use
  return [
    {
      uri: 'jira://issues/{issueKey}/attachments',
      name: 'Jira Issue Attachments List',
      description: 'List all attachments for a Jira issue. Replace {issueKey} with actual issue key (e.g., PROJ-123)',
      mimeType: 'application/json',
    },
    {
      uri: 'jira://attachments/{attachmentId}',
      name: 'Jira Attachment Content',
      description: 'Read specific attachment content. Replace {attachmentId} with actual attachment ID (e.g., 10041)',
      mimeType: 'application/octet-stream',
    },
  ];
}

/**
 * Read a Jira resource by URI
 */
export async function readJiraResource(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}> {
  const parsed = parseJiraUri(uri);
  
  if (!parsed) {
    throw new Error(`Invalid Jira resource URI: ${uri}`);
  }

  // Handle issue attachments list
  if (parsed.type === 'issue-attachments') {
    const { issueKey } = parsed.params;
    
    try {
      const issue = await jiraClient.getIssue(issueKey);
      const attachments = issue.fields.attachment || [];

      // Return list of attachments as JSON
      const attachmentsList = attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        uri: `jira://attachments/${att.id}`,
        author: att.author.displayName,
        created: att.created,
      }));

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              issueKey,
              totalAttachments: attachments.length,
              attachments: attachmentsList,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get attachments for ${issueKey}: ${error.message}`);
    }
  }

  // Handle specific attachment
  if (parsed.type === 'attachment') {
    const { attachmentId } = parsed.params;

    try {
      const { data, metadata } = await getAttachmentWithCache(attachmentId);
      
      const sizeKB = metadata.size / 1024;
      const isImage = metadata.mimeType.startsWith('image/');

      // For large files, return metadata only
      if (sizeKB > MAX_CACHE_SIZE_KB) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                error: 'FILE_TOO_LARGE',
                message: `File is ${sizeKB.toFixed(2)} KB, exceeds max size of ${MAX_CACHE_SIZE_KB} KB`,
                filename: metadata.filename,
                mimeType: metadata.mimeType,
                size: metadata.size,
                downloadUrl: metadata.content,
              }, null, 2),
            },
          ],
        };
      }

      // For images, return as blob
      if (isImage) {
        return {
          contents: [
            {
              uri,
              mimeType: metadata.mimeType,
              blob: data, // base64 encoded
            },
          ],
        };
      }

      // For other files, return as base64 text
      return {
        contents: [
          {
            uri,
            mimeType: metadata.mimeType,
            text: JSON.stringify({
              filename: metadata.filename,
              mimeType: metadata.mimeType,
              size: metadata.size,
              contentBase64: data,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to read attachment ${attachmentId}: ${error.message}`);
    }
  }

  throw new Error(`Unknown resource type for URI: ${uri}`);
}

