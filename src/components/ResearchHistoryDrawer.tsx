import React, { useState } from 'react';
import {
  History,
  X,
  Search,
  Star,
  Trash2,
  ArrowRight,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ResearchJob } from '../types/research';
import { exportJSONArchive } from '../utils/exportFormats';

interface ResearchHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentJobs: ResearchJob[];
  currentJobId?: string;
  onSelectJob: (job: ResearchJob) => void;
  onDeleteJob: (jobId: string) => void;
}

export const ResearchHistoryDrawer: React.FC<ResearchHistoryDrawerProps> = ({
  isOpen,
  onClose,
  recentJobs,
  currentJobId,
  onSelectJob,
  onDeleteJob,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredJobs = recentJobs.filter((job) =>
    job.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md h-full bg-[#0c101a] border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Research Library & History
              </h3>
              <p className="text-[10px] text-slate-400">
                {recentJobs.length} investigation sessions stored
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search past research inquiries..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* List of Sessions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching research sessions found.
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isCurrent = job.id === currentJobId;
              const isStarred = starredIds.has(job.id);

              return (
                <div
                  key={job.id}
                  onClick={() => {
                    onSelectJob(job);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group relative ${
                    isCurrent
                      ? 'bg-purple-950/20 border-purple-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
                      {job.query}
                    </h4>
                    <button
                      onClick={(e) => toggleStar(job.id, e)}
                      className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                        isStarred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded uppercase bg-slate-800 text-purple-300 border border-slate-700">
                        {job.depth}
                      </span>
                      <span>{job.sources.length} sources</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportJSONArchive(job);
                        }}
                        title="Export JSON"
                        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteJob(job.id);
                        }}
                        title="Delete Session"
                        className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
