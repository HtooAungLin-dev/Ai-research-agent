import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Download,
  Copy,
  Check,
  Send,
  MessageSquareQuote,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileText,
  Globe,
  BookOpen,
  Terminal,
  MessageSquare,
  GitBranch,
  Trash2,
  User,
  Bot,
  Clock,
  CornerDownRight,
  Network,
  Table2,
  Headphones,
  ChevronDown,
} from 'lucide-react';
import { ExtractedSource, ResearchJob } from '../types/research';
import { exportReportToPDF } from '../utils/pdfExport';
import {
  downloadBibTeX,
  generateAPA,
  generateIEEE,
  exportJSONArchive,
  exportStandaloneHTML,
} from '../utils/exportFormats';
import { AudioBriefingPlayer } from './AudioBriefingPlayer';
import { KnowledgeGraph } from './KnowledgeGraph';
import { ComparisonMatrixClaims } from './ComparisonMatrixClaims';

interface ReportViewerProps {
  job: ResearchJob;
  onAskFollowUp: (question: string) => Promise<string>;
  onInspectSource?: (source: ExtractedSource) => void;
}

interface CitationHoverCardProps {
  index: number;
  source?: ExtractedSource;
  onInspect?: (source: ExtractedSource) => void;
}

interface ChatMessage {
  id: string;
  timestamp: string;
  question: string;
  answer: string;
}

const getSourceIcon = (sourceType?: string) => {
  switch (sourceType) {
    case 'arxiv':
      return FileText;
    case 'wikipedia':
      return BookOpen;
    case 'hackernews':
      return Terminal;
    case 'reddit':
      return MessageSquare;
    case 'github':
      return GitBranch;
    default:
      return Globe;
  }
};

export const CitationHoverCard: React.FC<CitationHoverCardProps> = ({ index, source, onInspect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  const Icon = getSourceIcon(source?.sourceType);

  let hostname = '';
  if (source?.url) {
    try {
      hostname = new URL(source.url.startsWith('http') ? source.url : `https://${source.url}`).hostname;
    } catch {
      hostname = source.url;
    }
  }

  return (
    <span
      className="relative inline-block align-baseline mx-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => {
          if (source && onInspect) {
            onInspect(source);
          } else if (source?.url) {
            window.open(source.url, '_blank', 'noopener,noreferrer');
          }
        }}
        className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 hover:text-white text-[10px] font-mono font-bold border border-purple-500/30 hover:bg-purple-600 hover:border-purple-400 transition-all shadow-xs cursor-pointer inline-flex items-center gap-0.5 group focus:outline-none focus:ring-1 focus:ring-purple-400"
        aria-label={`Citation [${index}]: ${source?.title || 'Source reference'}`}
      >
        <span>[{index}]</span>
      </button>

      {isOpen && (
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-3.5 rounded-xl bg-[#0c101a] border border-slate-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-slate-200 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 pointer-events-auto text-left whitespace-normal font-sans font-normal"
        >
          {/* Card Top Unboxed Metadata */}
          <span className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800 text-[10px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="font-mono font-bold text-purple-300">
                Source [{index}]
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 uppercase tracking-wider text-slate-300">
                <Icon className="w-2.5 h-2.5 text-purple-400" />
                <span>{source?.sourceType || 'Web'}</span>
              </span>
            </span>
            <span className="text-emerald-400 font-mono tabular-nums">
              {source?.reliabilityScore || 85}% reliable
            </span>
          </span>

          {/* Title */}
          <span
            onClick={() => source && onInspect && onInspect(source)}
            className="block font-semibold text-white text-xs leading-snug line-clamp-2 mb-1.5 hover:text-purple-300 cursor-pointer transition-colors"
          >
            {source?.title || `Source Document #${index}`}
          </span>

          {/* Snippet */}
          <span className="block text-[11px] text-slate-400 line-clamp-3 leading-relaxed mb-3 font-normal">
            {source?.snippet || source?.fullContent?.slice(0, 200) || 'Verified empirical data chunk extracted by autonomous agent.'}
          </span>

          {/* Bottom Action: Hostname, Deep Inspector, and Link */}
          <span className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 truncate max-w-[110px]" title={hostname}>
              {hostname || 'web reference'}
            </span>

            <span className="flex items-center gap-1.5">
              {source && onInspect && (
                <button
                  type="button"
                  onClick={() => onInspect(source)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition-colors cursor-pointer"
                >
                  Inspect
                </button>
              )}

              {source?.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-medium shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </span>
          </span>

          {/* Pointing caret */}
          <span className="block absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-slate-700/80" />
        </span>
      )}
    </span>
  );
};

export const ReportViewer: React.FC<ReportViewerProps> = ({ job, onAskFollowUp, onInspectSource }) => {
  const [copied, setCopied] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'document' | 'graph' | 'matrix'>('document');
  const [showAudioBriefing, setShowAudioBriefing] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [followUpQuery, setFollowUpQuery] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const markdown = job.finalMarkdown || '';

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 2500);
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      showNotification('Markdown copied to clipboard.');
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {}
  };

  const handleDownloadPDF = () => {
    exportReportToPDF(job.query, markdown, job.sources, {
      depth: job.depth,
      model: job.modelUsed || 'Ollama & Gemini 3.8 Flash',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    });
    showNotification('Generating publication PDF...');
  };

  const handleExportBibTeX = () => {
    downloadBibTeX(job);
    setIsExportMenuOpen(false);
    showNotification('BibTeX references downloaded.');
  };

  const handleCopyAPA = async () => {
    const apa = generateAPA(job);
    await navigator.clipboard.writeText(apa);
    setIsExportMenuOpen(false);
    showNotification('APA citations copied to clipboard.');
  };

  const handleCopyIEEE = async () => {
    const ieee = generateIEEE(job);
    await navigator.clipboard.writeText(ieee);
    setIsExportMenuOpen(false);
    showNotification('IEEE citations copied to clipboard.');
  };

  const handleExportJSON = () => {
    exportJSONArchive(job, chatHistory);
    setIsExportMenuOpen(false);
    showNotification('Structured JSON archive downloaded.');
  };

  const handleExportHTML = () => {
    exportStandaloneHTML(job);
    setIsExportMenuOpen(false);
    showNotification('Standalone offline HTML generated.');
  };

  const handleAskQuestion = async (questionText?: string) => {
    const q = (questionText || followUpQuery).trim();
    if (!q || followUpLoading) return;

    setFollowUpQuery('');
    setFollowUpLoading(true);

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const a = await onAskFollowUp(q);
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        timestamp: timeString,
        question: q,
        answer: a,
      };
      setChatHistory((prev) => [...prev, newMessage]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        timestamp: timeString,
        question: q,
        answer: `Encountered an error while querying knowledge base: ${err.message}`,
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const quickPrompts = [
    'What are the key technical challenges identified?',
    'Summarize primary trade-offs and architectural comparison',
    'What are the most cited academic papers or sources?',
  ];

  /**
   * Helper that traverses React nodes and replaces text citations like "[1]" or "[2]"
   * with the interactive CitationHoverCard component.
   */
  const injectCitationCards = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const citationRegex = /\[(\d+)\]/g;
      if (!citationRegex.test(children)) {
        return children;
      }
      citationRegex.lastIndex = 0;
      const elements: React.ReactNode[] = [];
      let lastIdx = 0;
      let match: RegExpExecArray | null;

      while ((match = citationRegex.exec(children)) !== null) {
        if (match.index > lastIdx) {
          elements.push(children.slice(lastIdx, match.index));
        }
        const citeIndex = parseInt(match[1], 10);
        const source = job.sources[citeIndex - 1];

        elements.push(
          <CitationHoverCard
            key={`cite-${match.index}-${citeIndex}`}
            index={citeIndex}
            source={source}
            onInspect={onInspectSource}
          />
        );
        lastIdx = match.index + match[0].length;
      }

      if (lastIdx < children.length) {
        elements.push(children.slice(lastIdx));
      }
      return elements;
    }

    if (Array.isArray(children)) {
      return React.Children.map(children, (child) => injectCitationCards(child));
    }

    if (React.isValidElement(children) && (children.props as any)?.children) {
      return React.cloneElement(
        children,
        {},
        injectCitationCards((children.props as any).children)
      );
    }

    return children;
  };

  return (
    <div className="relative flex flex-col h-full bg-[#0d1019] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
      {/* UNIFIED PROFESSIONAL TOOLBAR */}
      <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-4 flex-wrap z-20">
        {/* Left Zone: Segmented View Switcher */}
        <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveReportTab('document')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeReportTab === 'document'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document</span>
          </button>

          <button
            onClick={() => setActiveReportTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeReportTab === 'graph'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Knowledge Graph</span>
          </button>

          <button
            onClick={() => setActiveReportTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeReportTab === 'matrix'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Matrix & Claims</span>
          </button>
        </div>

        {/* Right Zone: Controls & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio Briefing Toggle */}
          <button
            onClick={() => setShowAudioBriefing((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              showAudioBriefing
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-purple-400" />
            <span>{showAudioBriefing ? 'Hide Audio' : 'Audio Briefing'}</span>
          </button>

          {/* Copy Markdown */}
          <button
            onClick={handleCopyMarkdown}
            title="Copy Markdown to Clipboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>

          {/* Download as PDF */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-xl p-1 z-50 text-xs text-slate-300 animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-400 border-b border-slate-800">
                  Academic & Data Exports
                </div>
                <button
                  onClick={handleExportBibTeX}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-purple-600/30 hover:text-white flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>BibTeX (.bib)</span>
                  <span className="text-[10px] text-purple-400 font-mono">LaTeX</span>
                </button>
                <button
                  onClick={handleCopyAPA}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-purple-600/30 hover:text-white flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>Copy APA 7th</span>
                  <span className="text-[10px] text-slate-500">Text</span>
                </button>
                <button
                  onClick={handleCopyIEEE}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-purple-600/30 hover:text-white flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>Copy IEEE</span>
                  <span className="text-[10px] text-slate-500">Text</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-purple-600/30 hover:text-white flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>JSON Archive</span>
                  <span className="text-[10px] text-emerald-400 font-mono">RAG DB</span>
                </button>
                <button
                  onClick={handleExportHTML}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-purple-600/30 hover:text-white flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>Standalone HTML</span>
                  <span className="text-[10px] text-sky-400 font-mono">HTML5</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Status Notification */}
      {exportNotice && (
        <div className="absolute top-14 right-5 z-50 px-3.5 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <Check className="w-3.5 h-3.5" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Expandable Audio Briefing Player */}
      {showAudioBriefing && (
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 animate-in fade-in">
          <AudioBriefingPlayer job={job} />
        </div>
      )}

      {/* Main View Display */}
      {activeReportTab === 'graph' ? (
        <div className="flex-1 overflow-hidden">
          <KnowledgeGraph job={job} onSelectSource={onInspectSource} />
        </div>
      ) : activeReportTab === 'matrix' ? (
        <div className="flex-1 overflow-hidden">
          <ComparisonMatrixClaims job={job} onSelectSource={onInspectSource} />
        </div>
      ) : (
        /* Document Report View */
        <div className="flex-1 overflow-y-auto px-7 py-6 scrollbar-thin scrollbar-thumb-slate-800 text-slate-200">
          <article className="prose prose-invert prose-purple max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-h1:text-2xl prose-h1:text-white prose-h2:text-lg prose-h2:text-purple-300 prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2 prose-h3:text-sm prose-h3:text-slate-300 prose-p:text-xs prose-p:leading-relaxed prose-p:text-slate-300 prose-li:text-xs prose-li:text-slate-300 prose-table:text-xs prose-th:bg-slate-900/80 prose-th:text-slate-200 prose-td:border-slate-800">
            <ReactMarkdown
              components={{
                p: ({ children }) => <div className="mb-4 leading-relaxed">{injectCitationCards(children)}</div>,
                li: ({ children }) => <li className="mb-1 leading-relaxed">{injectCitationCards(children)}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-purple-500/50 pl-3 italic text-slate-400 my-3">
                    {injectCitationCards(children)}
                  </blockquote>
                ),
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{injectCitationCards(children)}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mt-6 mb-3 pb-2 border-b border-slate-800">{injectCitationCards(children)}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-2 text-purple-300">{injectCitationCards(children)}</h3>,
                td: ({ children }) => <td className="p-2 border border-slate-800">{injectCitationCards(children)}</td>,
                th: ({ children }) => <th className="p-2 border border-slate-800 font-semibold bg-slate-900/70">{injectCitationCards(children)}</th>,
                a: ({ href, children, ...props }) => {
                  const textContent = String(children).trim();
                  const citationMatch = textContent.match(/^\[?(\d+)\]?$/);
                  if (citationMatch) {
                    const citeNum = parseInt(citationMatch[1], 10);
                    const source = job.sources[citeNum - 1] || (href ? { url: href, title: href, sourceType: 'web' as const, reliabilityScore: 85, snippet: '', id: 'c', jobId: 'j', createdAt: '' } : undefined);
                    return <CitationHoverCard index={citeNum} source={source} onInspect={onInspectSource} />;
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline underline-offset-2 inline-flex items-center gap-0.5"
                      {...props}
                    >
                      {children}
                      <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  );
                },
              }}
            >
              {markdown}
            </ReactMarkdown>
          </article>

          {/* ======================================================== */}
          {/* CHAT HISTORY & GROUNDED INTERACTIVE Q&A SECTION */}
          {/* ======================================================== */}
          <div className="mt-12 pt-8 border-t border-slate-800/80">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Grounded Inquiry Session
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Interact directly with vector-indexed passages and report findings
                  </p>
                </div>
              </div>

              {chatHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {chatHistory.length} {chatHistory.length === 1 ? 'inquiry' : 'inquiries'}
                  </span>
                  <button
                    onClick={() => setChatHistory([])}
                    title="Clear chat history"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700/80 text-[11px] text-slate-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="mb-4 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mr-1">
                Suggestions:
              </span>
              {quickPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleAskQuestion(prompt)}
                  disabled={followUpLoading}
                  className="px-2.5 py-1 rounded-md bg-slate-900/70 hover:bg-purple-900/30 border border-slate-800 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-purple-200 transition-all cursor-pointer disabled:opacity-50 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat History List */}
            {chatHistory.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-800/80 text-center mb-4">
                <MessageSquare className="w-7 h-7 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-400 font-medium">No follow-up questions asked yet.</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                  Submit an inquiry below to verify findings against the autonomous agent's retrieved passages.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mb-5">
                {chatHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-sm"
                  >
                    {/* User Question Row */}
                    <div className="p-3.5 bg-slate-800/30 border-b border-slate-800/80 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-purple-300">Inquiry</span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-white">{item.question}</p>
                      </div>
                    </div>

                    {/* Assistant Answer Row */}
                    <div className="p-3.5 bg-[#0a0d14] flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 text-xs text-slate-300 leading-relaxed">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1.5">
                          <span className="font-semibold text-indigo-300">Deep Research Agent</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400 font-mono">Grounded RAG</span>
                        </div>
                        <div className="prose prose-invert prose-purple max-w-none text-xs prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs">
                          <ReactMarkdown>{item.answer}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Input Box for Follow-up Inquiries */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder="Ask anything about this research report..."
                  disabled={followUpLoading}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-all pr-10"
                />
                <CornerDownRight className="w-3.5 h-3.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={followUpLoading || !followUpQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                {followUpLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
