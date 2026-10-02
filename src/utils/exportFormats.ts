import { ResearchJob, ExtractedSource } from '../types/research';

/**
 * Clean plain text from markdown formatting
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/#+\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .trim();
}

/**
 * Generate BibTeX citation entries for academic reference management (Zotero, Mendeley, Overleaf)
 */
export function generateBibTeX(job: ResearchJob): string {
  const currentYear = new Date().getFullYear();
  const entries: string[] = [];

  // Main Report Entry
  const safeTitle = job.query.replace(/[^a-zA-Z0-9 ]/g, '');
  const reportKey = `DeepResearch_${safeTitle.slice(0, 15).replace(/\s+/g, '_')}_${currentYear}`;
  
  entries.push(`@techreport{${reportKey},
  author      = {{Autonomous Deep Research Agent}},
  title       = {{Autonomous Research Report: ${job.query.replace(/[{}"]/g, '')}}},
  institution = {Zero-Cost Local & Open Source Intelligence Engine},
  year        = {${currentYear}},
  note        = {Research Depth: ${job.depth.toUpperCase()}, Model: ${job.modelUsed || 'Ollama & Gemini'}},
  url         = {https://github.com/aistudio-build/deep-research-engine}
}`);

  // Individual Source Entries
  job.sources.forEach((s, idx) => {
    const key = `Source_${idx + 1}_${(s.sourceType || 'web').toUpperCase()}`;
    const cleanTitle = (s.title || `Reference ${idx + 1}`).replace(/[{}"]/g, '');
    const cleanUrl = s.url || '';
    
    entries.push(`@misc{${key},
  author       = {{${s.sourceType.toUpperCase()} Contributor}},
  title        = {{${cleanTitle}}},
  year         = {${currentYear}},
  howpublished = {\\url{${cleanUrl}}},
  note         = {Reliability Score: ${s.reliabilityScore || 85}\\%, Accessed: ${new Date().toISOString().split('T')[0]}}
}`);
  });

  return entries.join('\n\n');
}

/**
 * Generate APA 7th Edition formatted bibliography
 */
export function generateAPA(job: ResearchJob): string {
  const currentYear = new Date().getFullYear();
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lines: string[] = [];

  lines.push(`Autonomous Research Pipeline. (${currentYear}). ${job.query}: Synthesized intelligence report. Deep Research Engine.`);
  lines.push('\n--- References ---\n');

  job.sources.forEach((s, idx) => {
    const title = s.title || `Document ${idx + 1}`;
    const url = s.url || 'Web Resource';
    lines.push(`[${idx + 1}] ${s.sourceType.toUpperCase()}. (${currentYear}). ${title}. Retrieved ${today}, from ${url}`);
  });

  return lines.join('\n');
}

/**
 * Generate IEEE formatted bibliography
 */
export function generateIEEE(job: ResearchJob): string {
  const currentYear = new Date().getFullYear();
  const lines: string[] = [];

  job.sources.forEach((s, idx) => {
    const title = s.title || `Source ${idx + 1}`;
    const url = s.url || '';
    lines.push(`[${idx + 1}] "${title}," ${s.sourceType.toUpperCase()}, ${currentYear}. [Online]. Available: ${url}`);
  });

  return lines.join('\n');
}

/**
 * Export structured JSON archive containing the full pipeline state, vectors count, and metadata
 */
export function exportJSONArchive(job: ResearchJob, chatHistory: any[] = []): void {
  const payload = {
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    inquiry: {
      id: job.id,
      query: job.query,
      depth: job.depth,
      reportStyle: job.reportStyle,
      modelUsed: job.modelUsed,
      progressPct: job.progressPct,
      status: job.status,
    },
    metrics: {
      sourcesCount: job.sources.length,
      chunksVectorized: job.chunksCount,
      embeddingDimensions: 768,
      vectorSimilarityMetric: 'cosine_distance (<=>)',
    },
    thinkingTimeline: job.thinkingSteps,
    verifiedSources: job.sources,
    reportMarkdown: job.finalMarkdown,
    interactiveChatHistory: chatHistory,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DeepResearch_${job.query.slice(0, 25).replace(/\s+/g, '_')}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export standalone styled offline HTML file
 */
export function exportStandaloneHTML(job: ResearchJob): void {
  const cleanTitle = job.query.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${cleanTitle} - Deep Research Intelligence Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #e2e8f0;
      line-height: 1.7;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #0f1422;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #c084fc;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      color: #ffffff;
      margin-top: 0;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 16px;
    }
    .meta {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 30px;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .content {
      white-space: pre-wrap;
      font-size: 14px;
      color: #cbd5e1;
    }
    .sources {
      margin-top: 50px;
      padding-top: 24px;
      border-top: 1px solid #1e293b;
    }
    .source-item {
      background: #141b2d;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .source-item a {
      color: #a855f7;
      text-decoration: none;
    }
    .source-item a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Autonomous Intelligence Report • Zero-Cost Engine</div>
    <h1>${cleanTitle}</h1>
    <div class="meta">
      <span><strong>Depth:</strong> ${job.depth.toUpperCase()}</span>
      <span><strong>Model:</strong> ${job.modelUsed || 'Ollama & Gemini 3.8 Flash'}</span>
      <span><strong>Sources Indexed:</strong> ${job.sources.length}</span>
      <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
    </div>
    <div class="content">${job.finalMarkdown ? job.finalMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'No report content.'}</div>

    <div class="sources">
      <h3>Verified Citations & Sources</h3>
      ${job.sources.map((s, idx) => `
        <div class="source-item">
          <strong>[${idx + 1}]</strong> <a href="${s.url}" target="_blank">${s.title}</a>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${s.sourceType.toUpperCase()} • ${s.reliabilityScore || 85}% Reliability • ${s.snippet}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DeepResearch_${job.query.slice(0, 25).replace(/\s+/g, '_')}_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of raw BibTeX file
 */
export function downloadBibTeX(job: ResearchJob): void {
  const content = generateBibTeX(job);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `references_${job.id.slice(0, 8)}.bib`;
  a.click();
  URL.revokeObjectURL(url);
}
