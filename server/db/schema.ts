import { pgTable, text, timestamp, uuid, varchar, integer, jsonb, customType, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Custom Drizzle type for pgvector vector(768)
 * 768 dimensions is standard for nomic-embed-text, bge-small-en-v1.5, and standard free embedding models.
 */
export const vector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((n) => parseFloat(n.trim()));
  },
});

/**
 * research_jobs table
 * Tracks autonomous deep research execution status, queries, configuration, progress, and results.
 */
export const researchJobs = pgTable('research_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  query: text('query').notNull(),
  depth: varchar('depth', { length: 32 }).notNull().default('standard'), // 'quick' | 'standard' | 'deep'
  reportStyle: varchar('report_style', { length: 32 }).notNull().default('academic'), // 'academic' | 'executive' | 'technical' | 'bullet'
  status: varchar('status', { length: 32 }).notNull().default('queued'), // 'queued' | 'searching' | 'scraping' | 'embedding' | 'synthesizing' | 'completed' | 'failed' | 'cancelled'
  progressPct: integer('progress_pct').notNull().default(0),
  currentAction: text('current_action'),
  thinkingSteps: jsonb('thinking_steps').default(sql`'[]'::jsonb`),
  dataSourcesConfig: jsonb('data_sources_config').default(sql`'["duckduckgo", "wikipedia", "arxiv", "hackernews"]'::jsonb`),
  finalMarkdown: text('final_markdown'),
  pdfUrl: text('pdf_url'),
  modelUsed: varchar('model_used', { length: 64 }),
  totalSourcesFound: integer('total_sources_found').default(0),
  totalChunksIndexed: integer('total_chunks_indexed').default(0),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * source_chunks table
 * Stores scraped text chunks with 768-dimensional embeddings for pgvector cosine retrieval.
 * Includes an HNSW index with vector_cosine_ops for sub-millisecond approximate nearest neighbor search.
 */
export const sourceChunks = pgTable(
  'source_chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .references(() => researchJobs.id, { onDelete: 'cascade' })
      .notNull(),
    sourceType: varchar('source_type', { length: 64 }).notNull(), // 'duckduckgo' | 'wikipedia' | 'arxiv' | 'hackernews' | 'reddit' | 'github' | 'tavily'
    url: text('url').notNull(),
    title: text('title').notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    content: text('content').notNull(),
    reliabilityScore: integer('reliability_score').default(85), // 0 - 100
    embedding: vector768('embedding').notNull(),
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // HNSW index definition for ultra-fast cosine similarity vector search (<=>)
    index('source_chunks_embedding_hnsw_idx')
      .using('hnsw', table.embedding.op('vector_cosine_ops')),
    index('source_chunks_job_id_idx').on(table.jobId),
  ]
);

/**
 * Raw SQL Migration script to initialize pgvector in PostgreSQL
 */
export const PGVECTOR_MIGRATION_SQL = `
-- Step 1: Enable the pgvector extension in PostgreSQL
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
-- LIMIT 5;
`;

export type ResearchJob = typeof researchJobs.$inferSelect;
export type NewResearchJob = typeof researchJobs.$inferInsert;
export type SourceChunk = typeof sourceChunks.$inferSelect;
export type NewSourceChunk = typeof sourceChunks.$inferInsert;
