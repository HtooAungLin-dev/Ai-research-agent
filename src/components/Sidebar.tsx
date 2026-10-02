import React from 'react';
import {
  Database,
  Globe,
  BookOpen,
  FileText,
  Terminal,
  MessageSquare,
  GitBranch,
  Cpu,
  CheckCircle2,
  Layers,
  Code2,
  RefreshCw,
  Server,
  Sliders,
} from 'lucide-react';
import { OllamaHealth, LLMProvider, ResearchJob } from '../types/research';

interface SidebarProps {
  activeSources: string[];
  onToggleSource: (sourceKey: string) => void;
  llmProvider: LLMProvider;
  onChangeLLMProvider: (provider: LLMProvider) => void;
  ollamaHealth: OllamaHealth | null;
  onRefreshOllama: () => void;
  onOpenArchitecture: () => void;
  recentJobs: ResearchJob[];
  currentJobId?: string;
  onSelectJob: (job: ResearchJob) => void;
}

export const DATA_SOURCES = [
  {
    key: 'tavily',
    name: 'Tavily',
    label: 'AI Search API',
    icon: Globe,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
  {
    key: 'duckduckgo',
    name: 'DuckDuckGo',
    label: 'Open Web Search',
    icon: Globe,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    key: 'wikipedia',
    name: 'Wikipedia',
    label: 'Structured Encyclopedia',
    icon: BookOpen,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
  },
  {
    key: 'arxiv',
    name: 'ArXiv',
    label: 'Academic Preprints',
    icon: FileText,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    key: 'hackernews',
    name: 'Hacker News',
    label: 'Engineering Consensus',
    icon: Terminal,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    key: 'reddit',
    name: 'Reddit',
    label: 'Community Discussions',
    icon: MessageSquare,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  {
    key: 'github',
    name: 'GitHub',
    label: 'Repositories & Code',
    icon: GitBranch,
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/10',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSources,
  onToggleSource,
  llmProvider,
  onChangeLLMProvider,
  ollamaHealth,
  onRefreshOllama,
  onOpenArchitecture,
}) => {
  return (
    <aside className="w-76 h-full flex flex-col bg-[#0b0e17] border-r border-slate-800/80 select-none text-slate-300 shrink-0">
      {/* Brand Header */}
      <div className="p-4 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white">
            Deep Research
          </h1>
          <p className="text-[11px] text-slate-400">Autonomous Intelligence Engine</p>
        </div>
        <button
          onClick={onOpenArchitecture}
          title="Inspect Drizzle pgvector & Architecture"
          className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
        >
          <Code2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* DATA SOURCES */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Data Sources</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              {activeSources.length}/{DATA_SOURCES.length} active
            </span>
          </div>

          <div className="space-y-1">
            {DATA_SOURCES.map((source) => {
              const Icon = source.icon;
              const isActive = activeSources.includes(source.key);
              return (
                <div
                  key={source.key}
                  onClick={() => onToggleSource(source.key)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-slate-900/70 border-slate-800/90 text-slate-200 hover:border-slate-700'
                      : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-900/30 hover:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-md ${source.bgColor} ${source.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-[12px] font-medium leading-tight truncate">{source.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight truncate">{source.label}</div>
                    </div>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* REASONING ENGINE SPECIFICATIONS */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>Inference & Storage</span>
            </span>
            <button
              onClick={onRefreshOllama}
              title="Re-check local Ollama connection"
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Server className="w-3 h-3 text-slate-500" />
                Local Ollama
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ollamaHealth?.online ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span className={ollamaHealth?.online ? 'text-emerald-400' : 'text-slate-400'}>
                  {ollamaHealth?.online
                    ? `Online (${ollamaHealth.models.length} models)`
                    : 'Standby'}
                </span>
              </span>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/60 leading-relaxed">
              <div className="flex justify-between">
                <span>Vector Store</span>
                <span className="text-slate-200 font-mono">pgvector HNSW</span>
              </div>
              <div className="flex justify-between">
                <span>Embeddings</span>
                <span className="text-slate-200 font-mono">nomic-embed (768d)</span>
              </div>
              <div className="flex justify-between">
                <span>Cloud Fallback</span>
                <span className="text-purple-300 font-mono">Gemini 3.8 Flash</span>
              </div>
            </div>
          </div>
        </div>

        {/* PIPELINE CAPABILITIES */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-2 px-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Capabilities</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300 px-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Multi-hop autonomous search</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Vector cosine passage retrieval</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Interactive citation hover-cards</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zero-cost browser speech synthesis</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
