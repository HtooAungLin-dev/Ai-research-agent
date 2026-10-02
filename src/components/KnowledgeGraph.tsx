import React, { useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  Database,
  ExternalLink,
  Info,
  Network,
} from 'lucide-react';
import { ResearchJob, ExtractedSource } from '../types/research';

interface KnowledgeGraphProps {
  job: ResearchJob;
  onSelectSource?: (source: ExtractedSource) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'root' | 'subquery' | 'source' | 'concept';
  x: number;
  y: number;
  r: number;
  color: string;
  glowColor: string;
  metadata?: any;
}

interface GraphEdge {
  from: string;
  to: string;
  color: string;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ job, onSelectSource }) => {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'subquery' | 'source' | 'concept'>('all');

  // Compute graph nodes and edges in a radial multi-orbit layout
  const { nodes, edges } = useMemo(() => {
    const width = 800;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;

    const gNodes: GraphNode[] = [];
    const gEdges: GraphEdge[] = [];

    // 1. Root Inquiry Node
    const rootId = 'node-root';
    gNodes.push({
      id: rootId,
      label: job.query,
      type: 'root',
      x: centerX,
      y: centerY,
      r: 34,
      color: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.4)',
      metadata: { query: job.query, depth: job.depth, sourcesCount: job.sources.length },
    });

    // 2. Sub-queries / Hypotheses Nodes (Orbit 1, radius = 130)
    const subQueries = [
      `${job.query.split(' ').slice(0, 3).join(' ')} overview`,
      `${job.query.split(' ').slice(0, 2).join(' ')} architecture & specs`,
      `${job.query.split(' ').slice(0, 2).join(' ')} benchmarks & trade-offs`,
      `${job.query.split(' ').slice(0, 2).join(' ')} future trends`,
    ];

    const orbit1Radius = 130;
    subQueries.forEach((sq, idx) => {
      const angle = (idx / subQueries.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + orbit1Radius * Math.cos(angle);
      const y = centerY + orbit1Radius * Math.sin(angle);
      const sqId = `sq-${idx}`;

      gNodes.push({
        id: sqId,
        label: sq,
        type: 'subquery',
        x,
        y,
        r: 20,
        color: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.3)',
        metadata: { subquery: sq },
      });

      gEdges.push({
        from: rootId,
        to: sqId,
        color: 'rgba(56, 189, 248, 0.4)',
      });
    });

    // 3. Source Nodes (Orbit 2, radius = 220)
    const orbit2Radius = 225;
    const sourcesToDisplay = job.sources.slice(0, 8);
    sourcesToDisplay.forEach((source, sIdx) => {
      const angle = (sIdx / sourcesToDisplay.length) * 2 * Math.PI;
      const x = centerX + orbit2Radius * Math.cos(angle);
      const y = centerY + orbit2Radius * Math.sin(angle);
      const sNodeId = `source-${sIdx}`;

      // Pick corresponding subquery to connect to
      const targetSqId = `sq-${sIdx % subQueries.length}`;

      gNodes.push({
        id: sNodeId,
        label: source.title,
        type: 'source',
        x,
        y,
        r: 16,
        color: '#34d399',
        glowColor: 'rgba(52, 211, 153, 0.3)',
        metadata: source,
      });

      gEdges.push({
        from: targetSqId,
        to: sNodeId,
        color: 'rgba(52, 211, 153, 0.3)',
      });
    });

    // 4. Extracted Thematic Concepts (Orbit 3, radius = 290)
    const concepts = [
      'Comparative Metrics',
      'Scalability Limits',
      'Safety & Compliance',
      'Latency Benchmarks',
      'Autonomous Inference',
      'Hardware Constraints',
    ];
    const orbit3Radius = 285;
    concepts.forEach((concept, cIdx) => {
      const angle = ((cIdx + 0.5) / concepts.length) * 2 * Math.PI;
      const x = centerX + orbit3Radius * Math.cos(angle);
      const y = centerY + orbit3Radius * Math.sin(angle);
      const cId = `concept-${cIdx}`;

      gNodes.push({
        id: cId,
        label: concept,
        type: 'concept',
        x,
        y,
        r: 14,
        color: '#fbbf24',
        glowColor: 'rgba(251, 191, 36, 0.3)',
        metadata: { concept },
      });

      // Connect concept to root
      gEdges.push({
        from: rootId,
        to: cId,
        color: 'rgba(251, 191, 36, 0.2)',
      });
    });

    return { nodes: gNodes, edges: gEdges };
  }, [job]);

  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    return nodes.filter((n) => n.type === 'root' || n.type === filterType);
  }, [nodes, filterType]);

  const filteredEdges = useMemo(() => {
    const activeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => activeIds.has(e.from) && activeIds.has(e.to));
  }, [edges, filteredNodes]);

  return (
    <div className="relative flex flex-col h-full bg-[#0a0d15] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Controls Toolbar */}
      <div className="p-3 px-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Interactive Knowledge Graph
            </h3>
            <p className="text-[10px] text-slate-400">
              Autonomous inquiry decomposition & thematic ontology
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
          {(['all', 'subquery', 'source', 'concept'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
                filterType === t
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'all' ? 'All Entities' : `${t}s`}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setSelectedNode(null);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Graph"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main SVG Graph Canvas */}
      <div className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center">
        <svg
          viewBox="0 0 800 550"
          className="w-full h-full transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Background Radial Pattern */}
            <radialGradient id="graphBgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0a0d15" stopOpacity="0" />
            </radialGradient>

            {/* Glowing filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Ambient Circle */}
          <rect width="800" height="550" fill="url(#graphBgGrad)" />

          {/* Background Orbit Guide Rings */}
          <circle cx="400" cy="275" r="130" fill="none" stroke="#1e293b" strokeDasharray="3 3" opacity="0.6" />
          <circle cx="400" cy="275" r="225" fill="none" stroke="#1e293b" strokeDasharray="3 3" opacity="0.4" />
          <circle cx="400" cy="275" r="285" fill="none" stroke="#1e293b" strokeDasharray="3 3" opacity="0.3" />

          {/* Edges */}
          {filteredEdges.map((edge, idx) => {
            const sourceNode = nodes.find((n) => n.id === edge.from);
            const targetNode = nodes.find((n) => n.id === edge.to);
            if (!sourceNode || !targetNode) return null;

            return (
              <line
                key={`edge-${idx}`}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={edge.color}
                strokeWidth="1.2"
                strokeDasharray={edge.from === 'node-root' ? '4 2' : 'none'}
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <g
                key={node.id}
                onClick={() => {
                  setSelectedNode(node);
                  if (node.type === 'source' && node.metadata && onSelectSource) {
                    onSelectSource(node.metadata);
                  }
                }}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Glow ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r + (isSelected ? 8 : 4)}
                  fill={node.glowColor}
                  className="animate-pulse"
                />

                {/* Node Body */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={node.color}
                  stroke={isSelected ? '#ffffff' : '#0f172a'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  filter="url(#glow)"
                />

                {/* Text Label */}
                <text
                  x={node.x}
                  y={node.y + node.r + 12}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : '#cbd5e1'}
                  fontSize={node.type === 'root' ? '11' : '9'}
                  fontWeight={node.type === 'root' ? 'bold' : 'normal'}
                  className="pointer-events-none select-none font-sans drop-shadow-md"
                >
                  {node.label.length > 22 ? `${node.label.slice(0, 20)}...` : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Details Floating Overlay */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-84 p-4 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md z-20 text-xs text-slate-200">
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                style={{ backgroundColor: selectedNode.glowColor, color: selectedNode.color }}
              >
                {selectedNode.type} Entity
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <h4 className="font-bold text-white text-xs mb-1.5 leading-snug">
              {selectedNode.label}
            </h4>

            {selectedNode.type === 'source' && selectedNode.metadata && (
              <div className="space-y-2 mt-2">
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {selectedNode.metadata.snippet}
                </p>
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800">
                  <span className="text-emerald-400 font-mono">
                    {selectedNode.metadata.reliabilityScore}% reliable
                  </span>
                  {selectedNode.metadata.url && (
                    <a
                      href={selectedNode.metadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 underline"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {selectedNode.type === 'subquery' && (
              <p className="text-[11px] text-slate-400">
                Agentic search branch decomposed from primary inquiry to maximize information density across open-source databases.
              </p>
            )}

            {selectedNode.type === 'root' && (
              <p className="text-[11px] text-slate-400">
                Primary inquiry rooted in {job.sources.length} verified references and {job.chunksCount} vectorized text passages.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="p-2.5 px-5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Root Query
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Sub-Queries
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Web Sources
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Thematic Concepts
          </span>
        </div>
        <span>Click any node to inspect details</span>
      </div>
    </div>
  );
};
