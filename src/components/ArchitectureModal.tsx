import React, { useState } from 'react';
import { X, Code2, Database, Cpu, Layers, Copy, Check, Terminal } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PGVECTOR_SQL = `-- Step 1: Enable pgvector extension in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create research_jobs table
CREATE TABLE IF NOT EXISTS research_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    depth VARCHAR(32) NOT NULL DEFAULT 'standard',
    report_style VARCHAR(32) NOT NULL DEFAULT 'academic',
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    progress_pct INTEGER NOT NULL DEFAULT 0,
    current_action TEXT,
    thinking_steps JSONB DEFAULT '[]'::jsonb,
    data_sources_config JSONB DEFAULT '["duckduckgo", "wikipedia", "arxiv", "hackernews"]'::jsonb,
    final_markdown TEXT,
    pdf_url TEXT,
    model_used VARCHAR(64),
    total_sources_found INTEGER DEFAULT 0,
    total_chunks_indexed INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 3: Create source_chunks table with 768-dim vector
CREATE TABLE IF NOT EXISTS source_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
    source_type VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    reliability_score INTEGER DEFAULT 85,
    embedding vector(768) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 4: Create HNSW index for cosine distance (<=>)
CREATE INDEX IF NOT EXISTS source_chunks_embedding_hnsw_idx 
ON source_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS source_chunks_job_id_idx ON source_chunks (job_id);

-- Cosine Distance Retrieval Query (top 5 most relevant chunks):
-- SELECT id, title, url, content, 1 - (embedding <=> $query_embedding) AS similarity
-- FROM source_chunks
-- WHERE job_id = $job_id
-- ORDER BY embedding <=> $query_embedding ASC
-- LIMIT 5;`;

const TABS = [
  { id: 'drizzle', label: 'Drizzle Schema & pgvector', icon: Database },
  { id: 'bullmq', label: 'BullMQ Worker Pipeline', icon: Layers },
  { id: 'fastify', label: 'Fastify SSE Routes', icon: Terminal },
  { id: 'ollama', label: 'Ollama Client Module', icon: Cpu },
  { id: 'sql', label: 'PostgreSQL Migration SQL', icon: Code2 },
];

const CODE_SNIPPETS: Record<string, string> = {
  drizzle: `// Drizzle ORM Schema with pgvector(768) and HNSW Index
import { pgTable, text, timestamp, uuid, varchar, integer, jsonb, customType, index } from 'drizzle-orm/pg-core';

export const vector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]) {
    return \`[\${value.join(',')}]\`;
  },
  fromDriver(value: string) {
    return value.replace(/[\\[\\]]/g, '').split(',').map((n) => parseFloat(n.trim()));
  },
});

export const researchJobs = pgTable('research_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  query: text('query').notNull(),
  depth: varchar('depth', { length: 32 }).notNull().default('standard'),
  status: varchar('status', { length: 32 }).notNull().default('queued'),
  progressPct: integer('progress_pct').notNull().default(0),
  finalMarkdown: text('final_markdown'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sourceChunks = pgTable('source_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').references(() => researchJobs.id, { onDelete: 'cascade' }).notNull(),
  sourceType: varchar('source_type', { length: 64 }).notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  embedding: vector768('embedding').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // HNSW index definition for sub-millisecond cosine vector similarity (<=>)
  index('source_chunks_embedding_hnsw_idx')
    .using('hnsw', table.embedding.op('vector_cosine_ops')),
  index('source_chunks_job_id_idx').on(table.jobId),
]);`,

  bullmq: `// BullMQ Worker Pipeline with Redis Backing
import { Queue, Worker, Job } from 'bullmq';
import { ResearchJobPayload } from './types';

export const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const researchQueue = new Queue<ResearchJobPayload>('deep-research', {
  connection: redisConnection,
});

export const researchWorker = new Worker<ResearchJobPayload>(
  'deep-research',
  async (job: Job<ResearchJobPayload>) => {
    const { jobId, query, depth } = job.data;
    
    // 1. Sub-query generation (Ollama format: "json" or Gemini 3.8 Flash)
    const subQueries = await generateSubQueries(query, depth);
    
    // 2. Multi-source search & Cheerio extraction
    const rawPages = await searchAcrossSources(subQueries);
    
    // 3. Local 768-dim embeddings in Ollama / nomic-embed
    for (const page of rawPages) {
      const embedding = await ollama.generateEmbedding(page.chunkText);
      await db.insert(sourceChunks).values({ jobId, ...page, embedding });
    }
    
    // 4. pgvector Cosine similarity retrieval (<=>)
    const topChunks = await db.execute(sql\`
      SELECT *, 1 - (embedding <=> \${queryEmbedding}) AS similarity
      FROM source_chunks WHERE job_id = \${jobId}
      ORDER BY embedding <=> \${queryEmbedding} ASC LIMIT 10
    \`);
    
    // 5. Multi-pass deep report synthesis with citations [1], [2]
    const finalReport = await synthesizeReport(query, topChunks);
    
    return { finalReport };
  },
  { connection: redisConnection, concurrency: 4 }
);`,

  fastify: `// Fastify Routes: Job Dispatch + Real-time SSE
import Fastify from 'fastify';

const server = Fastify({ logger: true });

// POST /api/research/dispatch
server.post('/api/research/dispatch', async (request, reply) => {
  const { query, depth, reportStyle } = request.body;
  const job = await researchQueue.add('research-job', { query, depth, reportStyle });
  return reply.status(202).send({ jobId: job.id, status: 'queued' });
});

// GET /api/research/stream/:jobId (Server-Sent Events)
server.get('/api/research/stream/:jobId', (request, reply) => {
  const { jobId } = request.params;
  
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  const listener = (eventData) => {
    reply.raw.write(\`data: \${JSON.stringify(eventData)}\\n\\n\`);
  };

  eventBus.on(\`job:\${jobId}\`, listener);
  request.raw.on('close', () => eventBus.off(\`job:\${jobId}\`, listener));
});`,

  ollama: `// Resilient Ollama Client: Zero API Cost Local Model Calling
export class OllamaClient {
  private baseUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

  async generateStructuredJson<T>(prompt: string, system: string, model = 'qwen2.5:7b') {
    const res = await fetch(\`\${this.baseUrl}/api/generate\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system,
        format: 'json',
        stream: false,
        options: { temperature: 0.2 },
      }),
    });
    const json = await res.json();
    return JSON.parse(json.response) as T;
  }

  async generateEmbedding(text: string, model = 'nomic-embed-text') {
    const res = await fetch(\`\${this.baseUrl}/api/embeddings\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text.slice(0, 2048) }),
    });
    const json = await res.json();
    return json.embedding; // 768 dimensions
  }
}`,

  sql: PGVECTOR_SQL,
};

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('drizzle');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = CODE_SNIPPETS[activeTab] || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#0d0f17] border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">System Architecture & Database Schema</h2>
              <p className="text-[11px] text-slate-400">Zero-Cost Autonomous Research Engine Implementation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/60 px-4 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#090b10]">
          <div className="absolute top-3 right-5 z-10">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 shadow-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="flex-1 overflow-auto p-6 font-mono text-xs text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
            <code>{currentCode}</code>
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Zero external API cost • PostgreSQL pgvector HNSW indexing • Ollama + Gemini 3.8 Flash</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
