import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { agentOrchestrator, ResearchJobPayload } from './server/queue/bullmq.ts';
import { vectorStore } from './server/db/vector-store.ts';
import { ollamaClient } from './server/llm/ollama.ts';
import { answerFollowUpQuestionGemini } from './server/llm/gemini-fallback.ts';
import { PGVECTOR_MIGRATION_SQL } from './server/db/schema.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // 1. Dispatch Research Job (BullMQ simulation)
  app.post('/api/research/dispatch', async (req, res) => {
    try {
      const { query, depth = 'standard', reportStyle = 'academic', sourcesConfig, preferredModel } = req.body;

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const job = vectorStore.createJob(query.trim(), depth, reportStyle);

      const payload: ResearchJobPayload = {
        jobId: job.id,
        query: query.trim(),
        depth,
        reportStyle,
        sourcesConfig,
        preferredModel,
      };

      await agentOrchestrator.enqueueJob(payload);

      return res.status(202).json({
        jobId: job.id,
        status: job.status,
        message: 'Research task queued and executing',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Server-Sent Events (SSE) Route for live progress updates
  app.get('/api/research/stream/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = vectorStore.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial snapshot
    res.write(
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

    const onJobEvent = ({ event, data }: { event: string; data: any }) => {
      res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
    };

    agentOrchestrator.on(`job:${jobId}`, onJobEvent);

    req.on('close', () => {
      agentOrchestrator.off(`job:${jobId}`, onJobEvent);
    });
  });

  // 3. Status Poll / Get Job Details
  app.get('/api/research/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = vectorStore.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(job);
  });

  // 4. Cancel / Stop Research
  app.post('/api/research/cancel/:jobId', (req, res) => {
    const { jobId } = req.params;
    const cancelled = agentOrchestrator.cancelJob(jobId);
    return res.json({ cancelled });
  });

  // 5. List All Jobs
  app.get('/api/research/jobs', (req, res) => {
    return res.json(vectorStore.getAllJobs());
  });

  // 6. Local Ollama Health & Model Check
  app.get('/api/ollama/status', async (req, res) => {
    const health = await ollamaClient.checkHealth();
    return res.json(health);
  });

  // 7. Interactive Follow-up Q&A grounded on retrieved source chunks
  app.post('/api/research/ask', async (req, res) => {
    try {
      const { jobId, question } = req.body;
      const job = vectorStore.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const answer = await answerFollowUpQuestionGemini(
        question,
        job.finalMarkdown || job.currentAction || '',
        job.sources
      );

      return res.json({ answer });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8. Drizzle Schema & PostgreSQL pgvector SQL Export
  app.get('/api/architecture/schema', (req, res) => {
    return res.json({
      sql: PGVECTOR_MIGRATION_SQL,
      drizzleSchemaPath: '/server/db/schema.ts',
      bullmqPath: '/server/queue/bullmq.ts',
    });
  });

  // 9. Vite Dev Middleware or Static File Serving
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Deep Research Engine] Full-stack server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
