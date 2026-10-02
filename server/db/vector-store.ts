import { randomUUID as uuidv4 } from 'crypto';

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

export interface StoredChunk {
  id: string;
  jobId: string;
  url: string;
  title: string;
  sourceType: string;
  content: string;
  embedding: number[]; // 768 dimensions
  reliabilityScore: number;
  createdAt: string;
}

export interface JobRecord {
  id: string;
  query: string;
  depth: 'quick' | 'standard' | 'deep';
  reportStyle: 'academic' | 'executive' | 'technical' | 'bullet';
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

/**
 * Resilient Vector Store Engine
 * Implements pgvector cosine distance `<=>` (1 - cosine_similarity) in-process
 * with compatibility for direct PostgreSQL + pgvector connections.
 */
class ResilientVectorStore {
  private jobs: Map<string, JobRecord> = new Map();
  private chunks: StoredChunk[] = [];

  createJob(query: string, depth: 'quick' | 'standard' | 'deep' = 'standard', reportStyle: 'academic' | 'executive' | 'technical' | 'bullet' = 'academic'): JobRecord {
    const id = uuidv4();
    const now = new Date().toISOString();
    const job: JobRecord = {
      id,
      query,
      depth,
      reportStyle,
      status: 'queued',
      progressPct: 0,
      currentAction: 'Job initialized and enqueued into BullMQ orchestrator',
      thinkingSteps: [
        {
          id: uuidv4(),
          timestamp: now,
          role: 'Engine',
          message: `Autonomous research pipeline enqueued for target query: "${query}"`,
        },
      ],
      sources: [],
      chunksCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): JobRecord | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<JobRecord>): JobRecord | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, updated);
    return updated;
  }

  addThinkingStep(jobId: string, role: ThinkingStep['role'], message: string, details?: any): ThinkingStep {
    const job = this.jobs.get(jobId);
    const step: ThinkingStep = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      role,
      message,
      details,
    };
    if (job) {
      job.thinkingSteps.push(step);
      job.currentAction = message;
      job.updatedAt = new Date().toISOString();
    }
    return step;
  }

  addSource(jobId: string, source: Omit<ExtractedSource, 'id' | 'jobId' | 'createdAt'>): ExtractedSource {
    const job = this.jobs.get(jobId);
    const record: ExtractedSource = {
      id: uuidv4(),
      jobId,
      ...source,
      createdAt: new Date().toISOString(),
    };
    if (job) {
      // Deduplicate by URL
      const existingIdx = job.sources.findIndex((s) => s.url === source.url);
      if (existingIdx >= 0) {
        job.sources[existingIdx] = { ...job.sources[existingIdx], ...record };
      } else {
        job.sources.push(record);
      }
    }
    return record;
  }

  insertChunk(chunk: Omit<StoredChunk, 'id' | 'createdAt'>): StoredChunk {
    const record: StoredChunk = {
      id: uuidv4(),
      ...chunk,
      createdAt: new Date().toISOString(),
    };
    this.chunks.push(record);
    const job = this.jobs.get(chunk.jobId);
    if (job) {
      job.chunksCount = (job.chunksCount || 0) + 1;
    }
    return record;
  }

  /**
   * Vector Cosine Similarity Search
   * Corresponds to PostgreSQL pgvector query:
   * SELECT *, 1 - (embedding <=> $queryEmbedding) AS similarity
   * FROM source_chunks WHERE job_id = $jobId
   * ORDER BY embedding <=> $queryEmbedding ASC LIMIT $topK;
   */
  searchCosine(jobId: string, queryEmbedding: number[], topK: number = 5): Array<{ chunk: StoredChunk; similarity: number }> {
    const jobChunks = this.chunks.filter((c) => c.jobId === jobId);
    if (jobChunks.length === 0) return [];

    const scored = jobChunks.map((chunk) => {
      const sim = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      return { chunk, similarity: sim };
    });

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getAllJobs(): JobRecord[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const vectorStore = new ResilientVectorStore();
