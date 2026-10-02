import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, BrainCircuit } from 'lucide-react';
import { ThinkingStep } from '../types/research';

interface ThinkingTimelineProps {
  steps: ThinkingStep[];
  isProcessing: boolean;
  currentAction?: string;
}

export const ThinkingTimeline: React.FC<ThinkingTimelineProps> = ({
  steps,
  isProcessing,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (steps.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="border border-slate-800/80 rounded-xl bg-[#0d1019]/90 overflow-hidden shadow-lg backdrop-blur-sm">
      {/* Header bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <span>Autonomous Reasoning Chain</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {steps.length} {steps.length === 1 ? 'operation' : 'operations'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Synthesizing</span>
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expandable step list */}
      {isExpanded && (
        <div className="p-3.5 pt-0 space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 text-xs">
          {steps.map((step) => {
            const roleColor =
              step.role === 'Searcher'
                ? 'text-purple-400'
                : step.role === 'Analyzer'
                ? 'text-sky-400'
                : step.role === 'Synthesizer'
                ? 'text-indigo-400'
                : step.role === 'Engine'
                ? 'text-emerald-400'
                : 'text-amber-400';

            return (
              <div
                key={step.id}
                className="group flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/70 hover:border-slate-700/80 transition-all font-sans"
              >
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <div className="flex-1 leading-relaxed text-slate-300 min-w-0">
                  <span className={`font-semibold mr-1.5 ${roleColor}`}>{step.role}</span>
                  <span className="text-slate-300 font-normal">{step.message}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 tabular-nums">
                  {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
