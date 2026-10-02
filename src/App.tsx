import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Database,
  Cpu,
  Layers,
  CheckCircle,
  History,
  Code2,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ThinkingTimeline } from './components/ThinkingTimeline';
import { SourcesList } from './components/SourcesList';
import { ReportViewer } from './components/ReportViewer';
import { QueryInputBar } from './components/QueryInputBar';
import { ArchitectureModal } from './components/ArchitectureModal';
import { SourceInspectorModal } from './components/SourceInspectorModal';
import { ResearchHistoryDrawer } from './components/ResearchHistoryDrawer';
import { ResearchJob, ResearchDepth, ReportStyle, LLMProvider, OllamaHealth, ExtractedSource } from './types/research';

export default function App() {
  const [activeSources, setActiveSources] = useState<string[]>([
    'tavily',
    'duckduckgo',
    'wikipedia',
    'arxiv',
    'hackernews',
    'reddit',
    'github',
  ]);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('auto');
  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth | null>(null);
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<ResearchDepth>('quick');
  const [reportStyle, setReportStyle] = useState<ReportStyle>('academic');
  const [currentJob, setCurrentJob] = useState<ResearchJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentJobs, setRecentJobs] = useState<ResearchJob[]>([]);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'report'>('stream');

  // Modals state
  const [inspectedSource, setInspectedSource] = useState<ExtractedSource | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Check Ollama health on mount
  const checkOllama = async () => {
    try {
      const res = await fetch('/api/ollama/status');
      if (res.ok) {
        const data = await res.json();
        setOllamaHealth(data);
      }
    } catch (e) {
      setOllamaHealth({ online: false, models: [] });
    }
  };

  // Fetch past jobs from server and merge with localStorage
  const fetchJobs = async () => {
    let localSaved: ResearchJob[] = [];
    try {
      const stored = localStorage.getItem('deep_research_local_jobs');
      if (stored) localSaved = JSON.parse(stored);
    } catch {}

    try {
      const res = await fetch('/api/research/jobs');
      if (res.ok) {
        const serverJobs: ResearchJob[] = await res.json();
        const map = new Map<string, ResearchJob>();
        serverJobs.forEach((j) => map.set(j.id, j));
        localSaved.forEach((j) => {
          if (!map.has(j.id)) map.set(j.id, j);
        });
        const combined = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentJobs(combined);
        return;
      }
    } catch (e) {}

    if (localSaved.length > 0) {
      setRecentJobs(localSaved);
    }
  };

  useEffect(() => {
    checkOllama();
    fetchJobs();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const saveJobsToLocal = (jobs: ResearchJob[]) => {
    try {
      localStorage.setItem('deep_research_local_jobs', JSON.stringify(jobs.slice(0, 30)));
    } catch {}
  };

  const handleToggleSource = (key: string) => {
    setActiveSources((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleStartResearch = async () => {
    if (!query.trim() || isProcessing) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsProcessing(true);
    setActiveTab('stream');

    try {
      const res = await fetch('/api/research/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          depth,
          reportStyle,
          sourcesConfig: activeSources,
          preferredModel: llmProvider,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to dispatch research task');
      }

      const { jobId } = await res.json();

      // Setup initial job state
      const newJob: ResearchJob = {
        id: jobId,
        query: query.trim(),
        depth,
        reportStyle,
        status: 'searching',
        progressPct: 10,
        currentAction: 'Autonomous agent initialized and dispatching sub-queries...',
        thinkingSteps: [
          {
            id: 'init-1',
            timestamp: new Date().toISOString(),
            role: 'Engine',
            message: `Research pipeline launched for "${query.trim()}" (Depth: ${depth.toUpperCase()})`,
          },
        ],
        sources: [],
        chunksCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentJob(newJob);

      // Connect to Server-Sent Events (SSE)
      const es = new EventSource(`/api/research/stream/${jobId}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: evtType, data } = payload;

          if (evtType === 'init') {
            setCurrentJob((prev) => (prev ? { ...prev, ...data } : data));
          } else if (evtType === 'thinking') {
            setCurrentJob((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentAction: data.step.message,
                thinkingSteps: [...prev.thinkingSteps, data.step],
              };
            });
          } else if (evtType === 'source_found') {
            setCurrentJob((prev) => {
              if (!prev) return prev;
              const existing = prev.sources.find((s) => s.url === data.source.url);
              if (existing) return prev;
              return {
                ...prev,
                sources: [...prev.sources, data.source],
              };
            });
          } else if (evtType === 'progress') {
            setCurrentJob((prev) => (prev ? { ...prev, progressPct: data.progress } : prev));
          } else if (evtType === 'complete') {
            setCurrentJob((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                status: 'completed' as const,
                progressPct: 100,
                finalMarkdown: data.finalMarkdown,
                pdfUrl: data.pdfUrl,
              };
              setRecentJobs((rj) => {
                const nextList = [updated, ...rj.filter((j) => j.id !== updated.id)];
                saveJobsToLocal(nextList);
                return nextList;
              });
              return updated;
            });
            setIsProcessing(false);
            setActiveTab('report');
            es.close();
          } else if (evtType === 'failed' || evtType === 'cancelled') {
            setCurrentJob((prev) => (prev ? { ...prev, status: evtType as any } : prev));
            setIsProcessing(false);
            es.close();
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      es.onerror = () => {
        setIsProcessing(false);
        es.close();
      };
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleStopResearch = async () => {
    if (!currentJob) return;
    try {
      await fetch(`/api/research/cancel/${currentJob.id}`, { method: 'POST' });
    } catch (e) {}
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsProcessing(false);
    setCurrentJob((prev) =>
      prev
        ? {
            ...prev,
            status: 'cancelled',
            currentAction: 'Autonomous research stopped by user.',
          }
        : null
    );
  };

  const handleAskFollowUp = async (question: string): Promise<string> => {
    if (!currentJob) return '';
    const res = await fetch('/api/research/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: currentJob.id, question }),
    });
    const data = await res.json();
    return data.answer || 'No response generated.';
  };

  const handleSelectJob = (job: ResearchJob) => {
    setCurrentJob(job);
    setActiveTab(job.finalMarkdown ? 'report' : 'stream');
    setQuery(job.query);
  };

  const handleDeleteJob = (jobId: string) => {
    setRecentJobs((prev) => {
      const next = prev.filter((j) => j.id !== jobId);
      saveJobsToLocal(next);
      return next;
    });
    if (currentJob?.id === jobId) {
      setCurrentJob(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090b10] text-slate-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        activeSources={activeSources}
        onToggleSource={handleToggleSource}
        llmProvider={llmProvider}
        onChangeLLMProvider={setLlmProvider}
        ollamaHealth={ollamaHealth}
        onRefreshOllama={checkOllama}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
        recentJobs={recentJobs}
        currentJobId={currentJob?.id}
        onSelectJob={handleSelectJob}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0e111a] to-[#080a0f]">
        {/* Top Header: 3-Zone Top Bar Contract */}
        <header className="px-6 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#0b0d14]/80 backdrop-blur-md z-10 shrink-0">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-white">
              Deep Research
            </span>
          </div>

          {/* Zone 2: Segmented View Navigation */}
          {currentJob?.finalMarkdown ? (
            <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('stream')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === 'stream'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Process Log
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Synthesized Report
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Zone 3: Actions & System Status */}
          <div className="flex items-center gap-3">
            {/* History Drawer Toggle */}
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>Library ({recentJobs.length})</span>
            </button>

            {/* Architecture Modal Trigger */}
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Architecture</span>
            </button>

            {/* Quiet Status Indicator (Zero-Pill compliant) */}
            {isProcessing && currentJob ? (
              <div className="flex items-center gap-2 text-xs text-purple-300 font-medium max-w-xs truncate">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                <span className="truncate">{currentJob.currentAction || 'Processing...'}</span>
              </div>
            ) : currentJob?.status === 'completed' ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Idle</span>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Welcome Screen (only when no job active) */}
          {!currentJob && !isProcessing && (
            <div className="max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in">
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Autonomous Deep Research
                </h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Autonomous research engine combining local Ollama (Qwen 2.5 / Llama 3.1), Google Gemini 3.8 Flash free tier, Cheerio page extraction, and pgvector cosine similarity (<code className="text-purple-300">&lt;=&gt;</code>) with zero recurring API expense.
                </p>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>pgvector HNSW</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Local 768-dim embeddings stored with sub-millisecond approximate nearest neighbor cosine search.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Zero API Cost</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Runs on local Ollama hardware with fallback to Gemini 3.8 Flash free-tier. No credit card required.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>7 Data Sources</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Crawls DuckDuckGo, Wikipedia, ArXiv academic papers, Hacker News, Reddit, and GitHub simultaneously.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Job Progress & Content */}
          {currentJob && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Progress bar */}
              {isProcessing && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium capitalize">
                      Stage: {currentJob.status} ({currentJob.progressPct}%)
                    </span>
                    <span className="text-slate-400 text-[11px] truncate max-w-sm">
                      {currentJob.currentAction}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${currentJob.progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* View 1: Stream & Reasoning Timeline */}
              {(activeTab === 'stream' || !currentJob.finalMarkdown) && (
                <div className="space-y-4">
                  <ThinkingTimeline
                    steps={currentJob.thinkingSteps}
                    isProcessing={isProcessing}
                    currentAction={currentJob.currentAction}
                  />

                  <SourcesList
                    sources={currentJob.sources}
                    isProcessing={isProcessing}
                    onSelectSource={(src) => setInspectedSource(src)}
                  />
                </div>
              )}

              {/* View 2: Synthesized Intelligence Report */}
              {activeTab === 'report' && currentJob.finalMarkdown && (
                <ReportViewer
                  job={currentJob}
                  onAskFollowUp={handleAskFollowUp}
                  onInspectSource={(src) => setInspectedSource(src)}
                />
              )}
            </div>
          )}
        </div>

        {/* Bottom Dock / Query Input Bar */}
        <div className="p-4 bg-[#0a0d14]/90 border-t border-slate-800/80 backdrop-blur-md shrink-0">
          <QueryInputBar
            query={query}
            onChangeQuery={setQuery}
            depth={depth}
            onChangeDepth={setDepth}
            reportStyle={reportStyle}
            onChangeReportStyle={setReportStyle}
            onSubmit={handleStartResearch}
            onStop={handleStopResearch}
            isProcessing={isProcessing}
            onSelectSampleQuery={(sample) => {
              setQuery(sample);
            }}
          />
        </div>
      </main>

      {/* Architecture & DB Schema Inspection Modal */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      {/* Deep Source Inspector Modal */}
      <SourceInspectorModal
        source={inspectedSource}
        onClose={() => setInspectedSource(null)}
      />

      {/* Past Research History Drawer */}
      <ResearchHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        recentJobs={recentJobs}
        currentJobId={currentJob?.id}
        onSelectJob={handleSelectJob}
        onDeleteJob={handleDeleteJob}
      />
    </div>
  );
}
