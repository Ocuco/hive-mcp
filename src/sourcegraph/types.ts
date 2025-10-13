/**
 * Sourcegraph-specific types
 */

export interface SourcegraphSearchResult {
  results: SearchResultItem[];  // Array of actual search results
  matchCount: number;
  limitHit: boolean;
  cloning?: any[];
  missing?: any[];
  timedout?: any[];
}

export interface SearchResultItem {
  __typename: string;
  file?: {
    path: string;
    url: string;
    repository: {
      name: string;
      url: string;
    };
  };
  lineMatches?: LineMatch[];
  repository?: {
    name: string;
    url: string;
  };
  symbols?: SymbolMatch[];
}

export interface LineMatch {
  lineNumber: number;
  offsetAndLengths: number[][];
  preview: string;
}

export interface SymbolMatch {
  name: string;
  kind: string;
  location: {
    resource: {
      path: string;
    };
  };
}

export interface SourcegraphSearchQuery {
  query: string;
  patternType?: 'literal' | 'regexp' | 'structural';
  version?: string;
}

/**
 * Deep Search API types (REST API, not GraphQL)
 */
export interface DeepSearchConversation {
  id: number;
  questions: DeepSearchQuestion[];
  created_at: string;
  updated_at: string;
  user_id: number;
  read_token: string;
  share_url: string;
}

export interface DeepSearchQuestion {
  id: number;
  conversation_id: number;
  question: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  title?: string;
  answer?: string;
  sources?: DeepSearchSource[];
  suggested_followups?: string[];
  created_at: string;
  updated_at: string;
  stats?: {
    time_millis: number;
    tool_calls: number;
    total_tokens: number;
    credits: number;
  };
}

export interface DeepSearchSource {
  type: string;
  repository?: string;
  path?: string;
  url?: string;
  content?: string;
}

