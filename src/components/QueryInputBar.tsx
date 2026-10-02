import React from 'react';
import { ArrowUpRight, Search, Square, Send, Compass } from 'lucide-react';
import { ResearchDepth, ReportStyle } from '../types/research';

interface QueryInputBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  depth: ResearchDepth;
  onChangeDepth: (d: ResearchDepth) => void;
  reportStyle: ReportStyle;
  onChangeReportStyle: (s: ReportStyle) => void;
  onSubmit: () => void;
  onStop: () => void;
  isProcessing: boolean;
  onSelectSampleQuery: (q: string) => void;
}

const SAMPLE_QUERIES = [
  'History and future of space exploration',
  'Zero API cost autonomous LLM agent architecture',
  'CRISPR gene editing therapeutics clinical trials 2026',
  'PostgreSQL pgvector vs specialized vector databases',
];

export const QueryInputBar: React.FC<QueryInputBarProps> = ({
  query,
  onChangeQuery,
  depth,
  onChangeDepth,
  reportStyle,
  onChangeReportStyle,
  onSubmit,
  onStop,
  isProcessing,
  onSelectSampleQuery,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) {
      onStop();
    } else {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2.5">
      {/* Sample Inquiries (only when idle and empty) */}
      {!isProcessing && !query && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs scrollbar-none">
          <span className="text-slate-500 flex items-center gap-1 shrink-0 font-medium text-[11px]">
            <Compass className="w-3.5 h-3.5" /> Suggested:
          </span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSampleQuery(sample)}
              className="px-2.5 py-1 rounded-md bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{sample}</span>
              <ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
            </button>
          ))}
        </div>
      )}

      {/* Control bar: Segmented controls for Depth & Style */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">Depth</span>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
              {(['quick', 'standard', 'deep'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeDepth(d)}
                  className={`px-2.5 py-0.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
                    depth === d
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">Format</span>
            <div className="inline-flex p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
              {(['academic', 'executive', 'technical'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeReportStyle(s)}
                  className={`px-2.5 py-0.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
                    reportStyle === s
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          Press Enter to launch research
        </span>
      </div>

      {/* Input Field Container */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 text-slate-500 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter any research inquiry (e.g., 'Quantum computing fault tolerance limits')..."
          disabled={isProcessing}
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-11 pr-28 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {isProcessing ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!query.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-purple-900/40 transition-all cursor-pointer"
            >
              <span>Research</span>
              <Send className="w-3 h-3" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
