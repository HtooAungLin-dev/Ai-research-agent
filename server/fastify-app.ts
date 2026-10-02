/**
 * Production Fastify Server Implementation
 * Implements job dispatch, Server-Sent Events (SSE) stream, and report retrieval
 * for enterprise-grade autonomous AI research workflows.
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { agentOrchestrator, ResearchJobPayload } from './queue/bullmq.ts';
import { vectorStore } from './db/vector-store.ts';
import { ollamaClient } from './llm/ollama.ts';
import { answerFollowUpQuestionGemini } from './llm/gemini-fallback.ts';

export function buildFastifyServer(): FastifyInstance {
  const server = Fastify({
    logger: true,
  });

  // CORS & Content Parser plugins would be registered here in production
  // e.g. await server.register(cors);

  /**
   * POST /api/research/dispatch
   * Enqueues an autonomous research task to BullMQ
   */
  server.post(
    '/api/research/dispatch',
    async (
      request: FastifyRequest<{
        Body: {
          query: string;
          depth?: 'quick' | 'standard' | 'deep';
          reportStyle?: 'academic' | 'executive' | 'technical' | 'bullet';
          sourcesConfig?: string[];
          preferredModel?: 'ollama' | 'gemini' | 'auto';
        };
      }>,
      reply: FastifyReply
    ) => {
      const { query, depth = 'standard', reportStyle = 'academic', sourcesConfig, preferredModel } = request.body;

      if (!query || query.trim().length === 0) {
        return reply.status(400).send({ error: 'Research query is required' });
      }

      // Initialize job in database/vector store
      const job = vectorStore.createJob(query.trim(), depth, reportStyle);

      // Enqueue to BullMQ worker pipeline
      const payload: ResearchJobPayload = {
        jobId: job.id,
        query: query.trim(),
        depth,
        reportStyle,
        sourcesConfig,
        preferredModel,
      };

      await agentOrchestrator.enqueueJob(payload);

      return reply.status(202).send({
        jobId: job.id,
        status: job.status,
        message: 'Research task successfully enqueued to BullMQ worker pipeline.',
      });
    }
  );

  /**
   * GET /api/research/stream/:jobId
   * Server-Sent Events (SSE) route for real-time thinking process & progress streaming
   */
  server.get(
    '/api/research/stream/:jobId',
    (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = request.params;
      const job = vectorStore.getJob(jobId);

      if (!job) {
        return reply.status(404).send({ error: 'Research job not found' });
      }

      // Set headers for Server-Sent Events (SSE)
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial state snapshot
      reply.raw.write(
        `data: ${JSON.stringify({
          event: 'init',
          data: {
            jobId: job.id,
            status: job.status,
            progressPct: job.progressPct,
            currentAction: job.currentAction,
            thinkingSteps: job.thinkingSteps,
            sources: job.sources,
            finalMarkdown: job.finalMarkdown,
          },
        })}\n\n`
      );

      // Subscribe to real-time orchestrator events
      const onJobEvent = ({ event, data }: { event: string; data: any }) => {
        reply.raw.write(`data: ${JSON.stringify({ event, data })}\n\n`);
        if (event === 'complete' || event === 'failed' || event === 'cancelled') {
          // Keep open or clean up
        }
      };

      agentOrchestrator.on(`job:${jobId}`, onJobEvent);

      request.raw.on('close', () => {
        agentOrchestrator.off(`job:${jobId}`, onJobEvent);
      });
    }
  );

  /**
   * GET /api/research/status/:jobId
   * Polling fallback endpoint
   */
  server.get(
    '/api/research/status/:jobId',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = request.params;
      const job = vectorStore.getJob(jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return reply.send(job);
    }
  );

  /**
   * POST /api/research/cancel/:jobId
   * Aborts active execution
   */
  server.post(
    '/api/research/cancel/:jobId',
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = request.params;
      const cancelled = agentOrchestrator.cancelJob(jobId);
      return reply.send({ cancelled });
    }
  );

  /**
   * GET /api/ollama/status
   * Detects local Ollama instance connectivity and available models
   */
  server.get('/api/ollama/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const health = await ollamaClient.checkHealth();
    return reply.send(health);
  });

  /**
   * POST /api/research/ask
   * Answers follow-up questions grounded on retrieved source chunks
   */
  server.post(
    '/api/research/ask',
    async (
      request: FastifyRequest<{ Body: { jobId: string; question: string } }>,
      reply: FastifyReply
    ) => {
      const { jobId, question } = request.body;
      const job = vectorStore.getJob(jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      const answer = await answerFollowUpQuestionGemini(
        question,
        job.finalMarkdown || job.currentAction || '',
        job.sources
      );

      return reply.send({ answer });
    }
  );

  return server;
}
