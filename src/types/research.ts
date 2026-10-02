export type ResearchDepth = 'quick' | 'standard' | 'deep';
export type ReportStyle = 'academic' | 'executive' | 'technical' | 'bullet';
export type LLMProvider = 'auto' | 'ollama' | 'gemini';

export interface ThinkingStep {
  id: string;
  timestamp: string;
  role: 'Searcher' | 'Analyzer' | 'Synthesizer' | 'Engine' | 'System';
  message: string;
  details?: any;
}

export interface ExtractedSource {
  id: string;
  jobId: string;
  url: string;
  title: string;
  sourceType: 'duckduckgo' | 'wikipedia' | 'arxiv' | 'hackernews' | 'reddit' | 'github' | 'tavily';
  snippet: string;
  fullContent?: string;
  reliabilityScore: number;
  extractedPoints?: string[];
  chunksCount?: number;
  createdAt: string;
}

export interface ResearchJob {
  id: string;
  query: string;
  depth: ResearchDepth;
  reportStyle: ReportStyle;
  status: 'queued' | 'searching' | 'scraping' | 'embedding' | 'synthesizing' | 'completed' | 'failed' | 'cancelled';
  progressPct: number;
  currentAction: string;
  thinkingSteps: ThinkingStep[];
  sources: ExtractedSource[];
  chunksCount: number;
  finalMarkdown?: string;
  pdfUrl?: string;
  modelUsed?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OllamaHealth {
  online: boolean;
  models: string[];
  version?: string;
  error?: string;
}
