import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Globe, ExternalLink, ShieldCheck } from 'lucide-react';
import { ExtractedSource } from '../types/research';

interface SourcesListProps {
  sources: ExtractedSource[];
  isProcessing: boolean;
  highlightedUrl?: string;
  onSelectSource?: (source: ExtractedSource) => void;
}

export const SourcesList: React.FC<SourcesListProps> = ({
  sources,
  isProcessing,
  highlightedUrl,
  onSelectSource,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="border border-slate-800/80 rounded-xl bg-[#0d1019]/90 overflow-hidden shadow-lg backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
          <Globe className="w-4 h-4 text-sky-400" />
          <span>Extracted Knowledge Sources</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {sources.length} {sources.length === 1 ? 'source' : 'sources'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3.5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 text-xs">
          {sources.map((src, index) => {
            const isHighlighted = highlightedUrl === src.url;
            return (
              <div
                key={src.id || index}
                onClick={() => onSelectSource && onSelectSource(src)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isHighlighted
                    ? 'bg-purple-900/20 border-purple-500/50'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-white line-clamp-1 text-xs">
                    {src.title}
                  </h4>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-slate-300 p-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2 font-normal">
                  {src.snippet}
                </p>

                {/* Clean unboxed metadata with typographic separators */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="uppercase text-slate-400 font-semibold">{src.sourceType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-medium tabular-nums">
                      {src.reliabilityScore || 85}% reliability
                    </span>
                  </div>
                  <span className="text-purple-400 hover:underline">Inspect Passages →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
