"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Eye,
  Focus,
  Layers,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldCheck,
  Route,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutiveEdgeData, LineageDocNodeData } from '@/types/lineage.types';

interface LineageColumnExplorerProps {
  nodes: LineageDocNodeData[];
  edges: ExecutiveEdgeData[];
  focusDocId: number | null;
  isDark: boolean;
  onInspectNode: (docId: number) => void;
  onInspectEdge: (edge: ExecutiveEdgeData) => void;
  onFocusDoc: (docId: number) => void;
}

interface ColumnGroup {
  key: string;
  title: string;
  subtitle: string;
  isFocusCol?: boolean;
  nodes: LineageDocNodeData[];
}

interface SvgCurveItem {
  id: string;
  edge: ExecutiveEdgeData;
  d: string;
  midX: number;
  midY: number;
  stroke: string;
  isDashed: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
}

function computeTopologicalColumns(
  nodes: LineageDocNodeData[],
  edges: ExecutiveEdgeData[]
): ColumnGroup[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.docId));
  const inDegree = new Map<number, number>();
  const outgoing = new Map<number, number[]>();
  const level = new Map<number, number>();

  nodes.forEach((n) => {
    inDegree.set(n.docId, 0);
    outgoing.set(n.docId, []);
    level.set(n.docId, 0);
  });

  edges.forEach((e) => {
    const s = Number(e.sourceDocId);
    const t = Number(e.targetDocId);
    if (!nodeIds.has(s) || !nodeIds.has(t) || s === t) return;
    outgoing.get(s)!.push(t);
    inDegree.set(t, (inDegree.get(t) || 0) + 1);
  });

  const queue: number[] = [];
  nodes.forEach((n) => {
    if ((inDegree.get(n.docId) || 0) === 0) {
      queue.push(n.docId);
    }
  });

  const processed = new Set<number>();
  while (queue.length > 0) {
    const curr = queue.shift()!;
    processed.add(curr);
    const currLvl = level.get(curr) || 0;
    for (const next of outgoing.get(curr) || []) {
      level.set(next, Math.max(level.get(next) || 0, currLvl + 1));
      const rem = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, rem);
      if (rem <= 0 && !processed.has(next)) {
        queue.push(next);
      }
    }
  }

  nodes.forEach((n) => {
    if (!processed.has(n.docId)) {
      const hasIn = edges.some((e) => Number(e.targetDocId) === n.docId);
      level.set(n.docId, hasIn ? 1 : 0);
    }
  });

  const maxLvl = Math.max(0, ...Array.from(level.values()));
  const byLevel = new Map<number, LineageDocNodeData[]>();
  nodes.forEach((n) => {
    const l = level.get(n.docId) || 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(n);
  });

  const columns: ColumnGroup[] = [];
  for (let l = 0; l <= maxLvl; l++) {
    const groupNodes = (byLevel.get(l) || []).sort(
      (a, b) =>
        b.upstreamCount + b.downstreamCount - (a.upstreamCount + a.downstreamCount) ||
        a.docId - b.docId
    );
    if (groupNodes.length === 0) continue;

    let title = `Camada ${l + 1}`;
    let subtitle = 'Intermediários';
    if (l === 0) {
      title = 'Origens Primárias';
      subtitle = 'Provedores iniciais';
    } else if (l === maxLvl) {
      title = 'Destinos Finais';
      subtitle = 'Consumidores de dados';
    }

    columns.push({
      key: `layer_${l}`,
      title,
      subtitle,
      nodes: groupNodes,
    });
  }

  return columns;
}

function computeFocusColumns(
  nodes: LineageDocNodeData[],
  focusDocId: number
): ColumnGroup[] {
  const byHop = new Map<number, LineageDocNodeData[]>();
  nodes.forEach((n) => {
    const hop = n.docId === focusDocId ? 0 : (n.hopDistance ?? 1);
    if (!byHop.has(hop)) byHop.set(hop, []);
    byHop.get(hop)!.push(n);
  });

  const sortedHops = Array.from(byHop.keys()).sort((a, b) => a - b);
  return sortedHops.map((hop) => {
    const groupNodes = (byHop.get(hop) || []).sort(
      (a, b) =>
        b.upstreamCount + b.downstreamCount - (a.upstreamCount + a.downstreamCount) ||
        a.docId - b.docId
    );

    if (hop === 0) {
      return {
        key: 'hop_0',
        title: 'Documento em Foco',
        subtitle: 'Campos e vínculos ativos',
        isFocusCol: true,
        nodes: groupNodes,
      };
    }
    if (hop < 0) {
      const dist = Math.abs(hop);
      return {
        key: `hop_${hop}`,
        title: dist === 1 ? 'Origens Diretas (-1)' : `Origens Indiretas (-${dist})`,
        subtitle: dist === 1 ? 'Alimentam diretamente o foco' : `Saltos anteriores (${dist} níveis)`,
        nodes: groupNodes,
      };
    }
    return {
      key: `hop_${hop}`,
      title: hop === 1 ? 'Destinos Diretos (+1)' : `Destinos Indiretos (+${hop})`,
      subtitle: hop === 1 ? 'Consomem diretamente o foco' : `Impacto em cadeia (+${hop} níveis)`,
      nodes: groupNodes,
    };
  });
}

export function LineageColumnExplorer({
  nodes,
  edges,
  focusDocId,
  isDark,
  onInspectNode,
  onInspectEdge,
  onFocusDoc,
}: LineageColumnExplorerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [hoveredDocId, setHoveredDocId] = useState<number | null>(null);
  const [pinnedDocId, setPinnedDocId] = useState<number | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [activeFieldTag, setActiveFieldTag] = useState<string | null>(null);
  const [showAllLines, setShowAllLines] = useState(false);
  const [curves, setCurves] = useState<SvgCurveItem[]>([]);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const isDenseGraph = edges.length > 12;
  const activeDocForChain = hoveredDocId ?? pinnedDocId;

  const setCardRef = useCallback((docId: number, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(docId, el);
    } else {
      cardRefs.current.delete(docId);
    }
  }, []);

  const columns = useMemo(() => {
    if (focusDocId !== null) {
      return computeFocusColumns(nodes, focusDocId);
    }
    return computeTopologicalColumns(nodes, edges);
  }, [nodes, edges, focusDocId]);

  const highlightedChain = useMemo(() => {
    if (activeDocForChain === null) return null;

    const activeNodes = new Set<number>([activeDocForChain]);
    const activeEdges = new Set<string>();

    const upQueue = [activeDocForChain];
    const upSeen = new Set<number>([activeDocForChain]);
    while (upQueue.length > 0) {
      const curr = upQueue.shift()!;
      edges.forEach((e) => {
        const s = Number(e.sourceDocId);
        const t = Number(e.targetDocId);
        if (t === curr) {
          activeEdges.add(e.id);
          activeNodes.add(s);
          if (!upSeen.has(s)) {
            upSeen.add(s);
            upQueue.push(s);
          }
        }
      });
    }

    const downQueue = [activeDocForChain];
    const downSeen = new Set<number>([activeDocForChain]);
    while (downQueue.length > 0) {
      const curr = downQueue.shift()!;
      edges.forEach((e) => {
        const s = Number(e.sourceDocId);
        const t = Number(e.targetDocId);
        if (s === curr) {
          activeEdges.add(e.id);
          activeNodes.add(t);
          if (!downSeen.has(t)) {
            downSeen.add(t);
            downQueue.push(t);
          }
        }
      });
    }

    return { nodes: activeNodes, edges: activeEdges };
  }, [activeDocForChain, edges]);

  const fieldHighlightedChain = useMemo(() => {
    if (!activeFieldTag || focusDocId === null) return null;
    const upperTag = activeFieldTag.toUpperCase();
    const activeNodes = new Set<number>([focusDocId]);
    const activeEdges = new Set<string>();

    edges.forEach((e) => {
      const s = Number(e.sourceDocId);
      const t = Number(e.targetDocId);
      const matchesTarget = t === focusDocId && e.fieldsMap.some((f) => f.targetTag.toUpperCase() === upperTag);
      const matchesSource =
        s === focusDocId &&
        e.fieldsMap.some(
          (f) =>
            f.sourceTag?.toUpperCase() === upperTag ||
            f.sourceFields?.some((sf) => sf.tag.toUpperCase() === upperTag)
        );
      if (matchesTarget || matchesSource) {
        activeEdges.add(e.id);
        activeNodes.add(s);
        activeNodes.add(t);
      }
    });

    return { nodes: activeNodes, edges: activeEdges };
  }, [activeFieldTag, focusDocId, edges]);

  const effectiveHighlight = fieldHighlightedChain || highlightedChain;

  const recomputeCurves = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const width = Math.max(container.scrollWidth, cRect.width);
    const height = Math.max(container.scrollHeight, cRect.height);

    setSvgSize({ width, height });

    // Em grafos densos com showAllLines=false, traça conexões sob demanda para eliminar poluição visual
    const shouldRenderAll = !isDenseGraph || showAllLines;
    if (!shouldRenderAll && !effectiveHighlight && hoveredEdgeId === null) {
      setCurves([]);
      return;
    }

    const nextCurves: SvgCurveItem[] = [];
    edges.forEach((edge) => {
      const isHighlighted =
        hoveredEdgeId === edge.id || (effectiveHighlight ? effectiveHighlight.edges.has(edge.id) : false);

      if (!shouldRenderAll && !isHighlighted) return;

      const sId = Number(edge.sourceDocId);
      const tId = Number(edge.targetDocId);
      const sEl = cardRefs.current.get(sId);
      const tEl = cardRefs.current.get(tId);
      if (!sEl || !tEl) return;

      const sRect = sEl.getBoundingClientRect();
      const tRect = tEl.getBoundingClientRect();

      const x1 = sRect.right - cRect.left + scrollLeft;
      const y1 = sRect.top + sRect.height / 2 - cRect.top + scrollTop;
      const x2 = tRect.left - cRect.left + scrollLeft;
      const y2 = tRect.top + tRect.height / 2 - cRect.top + scrollTop;

      const dx = Math.max(44, Math.abs(x2 - x1) * 0.48);
      const d =
        x2 >= x1 - 12
          ? `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1 + 76} ${y1 - 65}, ${x2 - 76} ${y2 - 65}, ${x2} ${y2}`;

      const midX = (x1 + x2) / 2;
      const midY = x2 >= x1 - 12 ? (y1 + y2) / 2 : Math.min(y1, y2) - 44;

      const stroke = edge.isBroken
        ? '#f43f5e'
        : edge.isHybridV2
          ? '#f59e0b'
          : edge.hasDocRules && !edge.hasFieldActions
            ? isDark
              ? '#84BAF8'
              : '#1F4F86'
            : isDark
              ? '#CCF352'
              : '#4D6B0A';

      const isDimmed =
        (hoveredEdgeId !== null && hoveredEdgeId !== edge.id) ||
        (effectiveHighlight !== null && !effectiveHighlight.edges.has(edge.id));

      nextCurves.push({
        id: edge.id,
        edge,
        d,
        midX,
        midY,
        stroke,
        isDashed: Boolean(edge.isBroken),
        isDimmed,
        isHighlighted,
      });
    });

    setCurves(nextCurves);
  }, [edges, hoveredEdgeId, effectiveHighlight, isDark, isDenseGraph, showAllLines]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(recomputeCurves);
    const container = containerRef.current;
    if (!container) return () => window.cancelAnimationFrame(raf);

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(recomputeCurves);
    });
    observer.observe(container);
    cardRefs.current.forEach((el) => observer.observe(el));

    const handleResize = () => window.requestAnimationFrame(recomputeCurves);
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [recomputeCurves, columns]);

  const focusNode = useMemo(
    () => (focusDocId !== null ? nodes.find((n) => n.docId === focusDocId) || null : null),
    [nodes, focusDocId]
  );

  const focusFieldRows = useMemo(() => {
    if (!focusNode) return [];
    const map = new Map<
      string,
      {
        targetTag: string;
        targetName: string;
        inCount: number;
        outCount: number;
        hasRule: boolean;
        hasAction: boolean;
        hasBroken: boolean;
      }
    >();

    edges.forEach((e) => {
      const s = Number(e.sourceDocId);
      const t = Number(e.targetDocId);
      if (t === focusNode.docId) {
        e.fieldsMap.forEach((f) => {
          const key = f.targetTag.toUpperCase();
          if (!map.has(key)) {
            map.set(key, {
              targetTag: f.targetTag,
              targetName: f.targetName,
              inCount: 0,
              outCount: 0,
              hasRule: false,
              hasAction: false,
              hasBroken: false,
            });
          }
          const entry = map.get(key)!;
          entry.inCount += 1;
          if (f.originKind === 'DOC_RULE') entry.hasRule = true;
          else entry.hasAction = true;
          if (f.linkKind === 'BROKEN') entry.hasBroken = true;
        });
      }
      if (s === focusNode.docId) {
        e.fieldsMap.forEach((f) => {
          const tags =
            f.sourceFields && f.sourceFields.length > 0
              ? f.sourceFields
              : f.sourceTag
                ? [{ tag: f.sourceTag, name: f.sourceName || f.sourceTag }]
                : [];
          tags.forEach((sf) => {
            const key = sf.tag.toUpperCase();
            if (!map.has(key)) {
              map.set(key, {
                targetTag: sf.tag,
                targetName: sf.name,
                inCount: 0,
                outCount: 0,
                hasRule: false,
                hasAction: false,
                hasBroken: false,
              });
            }
            const entry = map.get(key)!;
            entry.outCount += 1;
            if (f.originKind === 'DOC_RULE') entry.hasRule = true;
            else entry.hasAction = true;
          });
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.inCount + b.outCount - (a.inCount + a.outCount));
  }, [focusNode, edges]);

  return (
    <div
      ref={containerRef}
      onScroll={recomputeCurves}
      className="relative w-full h-full overflow-auto scrollbar-thin p-4 md:p-6"
    >
      {/* Barra contextual de conexões sob demanda para cadeias densas */}
      {isDenseGraph && (
        <div className="sticky top-0 left-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-[var(--dock-bg)]/95 border border-[var(--border-subtle)] backdrop-blur-md shadow-xs text-[11px]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Route size={14} className="text-[#CCF352] shrink-0" />
            <span>
              Cadeia densa (<b className="text-[var(--text-primary)]">{nodes.length} docs</b> ·{' '}
              <b className="text-[var(--text-primary)]">{edges.length} fluxos</b>) —{' '}
              {showAllLines
                ? 'exibindo todas as linhas de fluxo.'
                : 'passe o mouse ou clique em um documento para traçar suas conexões sem poluição visual.'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {pinnedDocId !== null && (
              <button
                type="button"
                onClick={() => setPinnedDocId(null)}
                className="px-2.5 py-1 rounded-full bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] text-[10.5px] font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <X size={11} />
                <span>Limpar seleção (Doc {pinnedDocId})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAllLines((v) => !v)}
              className={cn(
                'px-2.5 py-1 rounded-full border text-[10.5px] font-semibold cursor-pointer transition-colors',
                showAllLines
                  ? 'bg-[#CCF352] text-[#141312] border-transparent font-bold'
                  : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#CCF352]/40'
              )}
            >
              {showAllLines ? 'Ocultar linhas não selecionadas' : 'Mostrar todas as linhas'}
            </button>
          </div>
        </div>
      )}

      {/* Camada SVG de Conectores Bézier */}
      <svg
        width={svgSize.width}
        height={svgSize.height}
        className="pointer-events-none absolute top-0 left-0 z-0"
      >
        <defs>
          <marker id="arrow-lime" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={isDark ? '#CCF352' : '#4D6B0A'} />
          </marker>
          <marker id="arrow-sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={isDark ? '#84BAF8' : '#1F4F86'} />
          </marker>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>
          <marker id="arrow-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f43f5e" />
          </marker>
        </defs>

        {curves.map((c) => {
          const markerId = c.edge.isBroken
            ? 'url(#arrow-rose)'
            : c.edge.isHybridV2
              ? 'url(#arrow-amber)'
              : c.edge.hasDocRules && !c.edge.hasFieldActions
                ? 'url(#arrow-sky)'
                : 'url(#arrow-lime)';
          return (
            <path
              key={c.id}
              d={c.d}
              fill="none"
              stroke={c.stroke}
              strokeWidth={c.isHighlighted ? 2.6 : 1.7}
              strokeDasharray={c.isDashed ? '6 4' : undefined}
              strokeOpacity={c.isDimmed ? 0.14 : c.isHighlighted ? 0.95 : 0.65}
              markerEnd={markerId}
              className="transition-all duration-200"
            />
          );
        })}
      </svg>

      {/* Pílulas Clicáveis no Ponto Médio de Cada Fluxo */}
      <div className="pointer-events-none absolute top-0 left-0 z-10" style={{ width: svgSize.width, height: svgSize.height }}>
        {curves.map((c) => {
          const badgeTone = c.edge.isBroken
            ? 'tone-danger border-rose-500/40'
            : c.edge.isHybridV2
              ? 'tone-warning border-amber-500/40'
              : c.edge.hasDocRules && !c.edge.hasFieldActions
                ? 'tone-info'
                : 'tone-success';

          return (
            <button
              key={`pill_${c.id}`}
              type="button"
              onClick={() => onInspectEdge(c.edge)}
              onMouseEnter={() => setHoveredEdgeId(c.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
              style={{ left: `${c.midX}px`, top: `${c.midY}px` }}
              className={cn(
                'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full border text-[10px] font-bold shadow-sm backdrop-blur-md transition-all cursor-pointer whitespace-nowrap',
                badgeTone,
                c.isDimmed && 'opacity-15 scale-95',
                c.isHighlighted && 'scale-105 ring-2 ring-[#CCF352]/40 z-20'
              )}
              title={`Inspecionar fluxo Doc ${c.edge.sourceDocId} → Doc ${c.edge.targetDocId}`}
            >
              {c.edge.isBroken && '⚠ '}
              {c.edge.totalFields} {c.edge.totalFields === 1 ? 'vínculo' : 'vínculos'}
            </button>
          );
        })}
      </div>

      {/* Colunas Topológicas ou Centradas no Foco */}
      <div className="relative z-10 flex items-start gap-16 min-w-max pb-6">
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn('flex flex-col gap-3.5 shrink-0', col.isFocusCol ? 'w-[330px]' : 'w-[264px]')}
          >
            {/* Cabeçalho da Coluna */}
            <div className="px-3.5 py-2 rounded-2xl bg-[var(--dock-bg)]/90 border border-[var(--border-subtle)] backdrop-blur-md shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  {col.title}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--card-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {col.nodes.length}
                </span>
              </div>
              <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5">{col.subtitle}</p>
            </div>

            {/* Cards da Coluna */}
            <div className="flex flex-col gap-3.5">
              {col.nodes.map((node) => {
                const isNodeFocus = focusDocId === node.docId;
                const isPinned = pinnedDocId === node.docId;
                const isDimmed =
                  effectiveHighlight !== null && !effectiveHighlight.nodes.has(node.docId);
                const isHighlighted =
                  hoveredDocId === node.docId ||
                  isPinned ||
                  (effectiveHighlight !== null && effectiveHighlight.nodes.has(node.docId));

                return (
                  <div
                    key={node.id}
                    ref={(el) => setCardRef(node.docId, el)}
                    onMouseEnter={() => setHoveredDocId(node.docId)}
                    onMouseLeave={() => setHoveredDocId(null)}
                    onClick={() =>
                      setPinnedDocId((prev) => (prev === node.docId ? null : node.docId))
                    }
                    className={cn(
                      'rounded-2xl border p-3 transition-all duration-200 flex flex-col gap-2 backdrop-blur-md cursor-pointer',
                      node.isBroken
                        ? 'bg-rose-500/10 border-rose-500/40'
                        : isNodeFocus
                          ? 'sylva-glass bg-[var(--card-bg)] border-[#CCF352] ring-2 ring-[#CCF352]/30 shadow-lg'
                          : isPinned
                            ? 'sylva-glass bg-[var(--card-bg)] border-[#CCF352] ring-2 ring-[#CCF352]/25 shadow-md'
                            : node.isLegacyV2
                              ? 'sylva-glass bg-[var(--card-bg)] border-amber-500/35 hover:border-amber-500/70'
                              : 'sylva-glass bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-[#CCF352]/50',
                      isDimmed && 'opacity-20 scale-[0.98]',
                      isHighlighted && !isNodeFocus && !isPinned && 'ring-1 ring-[#CCF352]/40 shadow-md'
                    )}
                  >
                    {/* Linha de Badges do Card */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full font-mono font-bold text-[10px]',
                            node.isBroken
                              ? 'bg-rose-500 text-white'
                              : isNodeFocus || isPinned
                                ? 'bg-[#CCF352] text-[#141312]'
                                : 'bg-[var(--dock-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                          )}
                        >
                          DOC {node.docId}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded font-mono font-semibold text-[9.5px] border',
                            node.isBroken
                              ? 'tone-danger'
                              : node.isLegacyV2
                                ? 'tone-warning'
                                : 'tone-neutral'
                          )}
                        >
                          {node.tech}
                        </span>
                      </div>

                      {node.isBroken ? (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tone-danger border flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Quebrado
                        </span>
                      ) : isNodeFocus ? (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tone-success border flex items-center gap-1">
                          <Sparkles size={10} />
                          Foco
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold tone-neutral border">
                          v{node.version || 1}
                        </span>
                      )}
                    </div>

                    {/* Título do Documento */}
                    <h4
                      className={cn(
                        'font-bold text-[11.5px] leading-snug line-clamp-2',
                        node.isBroken ? 'text-rose-400' : 'text-[var(--text-primary)]'
                      )}
                      title={node.title}
                    >
                      {node.title}
                    </h4>

                    {/* Métricas in / out / auto */}
                    <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)] pt-1.5 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]"
                          title="Documentos que alimentam este layout"
                        >
                          <ArrowDownLeft size={12} className="text-[#CCF352]" />
                          {node.upstreamCount} in
                        </span>
                        <span className="opacity-40">•</span>
                        <span
                          className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]"
                          title="Documentos que consomem este layout"
                        >
                          <ArrowUpRight size={12} className="text-sky-400" />
                          {node.downstreamCount} out
                        </span>
                        {node.selfLinksCount > 0 && (
                          <>
                            <span className="opacity-40">•</span>
                            <span
                              className="flex items-center gap-0.5 font-bold text-[#CCF352]"
                              title="Auto-herança de registros anteriores"
                            >
                              <RefreshCw size={10} />
                              {node.selfLinksCount}
                            </span>
                          </>
                        )}
                      </div>
                      <span>{node.isBroken ? 'Órfão' : `${node.totalFields} campos`}</span>
                    </div>

                    {/* Lista Interativa de Campos Vinculados quando em Foco */}
                    {isNodeFocus && focusFieldRows.length > 0 && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Layers size={11} className="text-[#CCF352]" />
                            Campos Vinculados ({focusFieldRows.length})
                          </span>
                          {activeFieldTag && (
                            <button
                              type="button"
                              onClick={() => setActiveFieldTag(null)}
                              className="text-[9.5px] text-[#CCF352] hover:underline cursor-pointer"
                            >
                              Limpar filtro
                            </button>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1 pr-0.5">
                          {focusFieldRows.map((fr) => {
                            const isFieldActive = activeFieldTag?.toUpperCase() === fr.targetTag.toUpperCase();
                            return (
                              <button
                                key={fr.targetTag}
                                type="button"
                                onClick={() =>
                                  setActiveFieldTag(isFieldActive ? null : fr.targetTag)
                                }
                                onMouseEnter={() => setActiveFieldTag(fr.targetTag)}
                                onMouseLeave={() => setActiveFieldTag(null)}
                                className={cn(
                                  'w-full text-left px-2.5 py-1.5 rounded-xl border text-[10.5px] transition-all cursor-pointer flex items-center justify-between gap-2',
                                  isFieldActive
                                    ? 'bg-[#CCF352]/15 border-[#CCF352]/50 text-[var(--text-primary)]'
                                    : 'bg-[var(--dock-bg)]/60 border-[var(--border-subtle)] hover:border-[#CCF352]/35 text-[var(--text-secondary)]'
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold truncate text-[var(--text-primary)]" title={fr.targetName}>
                                    {fr.targetName}
                                  </p>
                                  <code className="font-mono text-[9.5px] text-[#CCF352] block truncate">
                                    {fr.targetTag}
                                  </code>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {fr.hasAction && (
                                    <span className="p-0.5 rounded tone-success border" title="Ação SQL">
                                      <Zap size={9} />
                                    </span>
                                  )}
                                  {fr.hasRule && (
                                    <span className="p-0.5 rounded tone-info border" title="Regra SQL">
                                      <ShieldCheck size={9} />
                                    </span>
                                  )}
                                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--card-subtle)]">
                                    {fr.inCount > 0 ? `${fr.inCount}←` : ''}
                                    {fr.outCount > 0 ? ` →${fr.outCount}` : ''}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectNode(node.docId);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-[var(--dock-bg)] hover:bg-[#CCF352]/15 hover:text-[#CCF352] text-[var(--text-secondary)] text-[10.5px] font-semibold flex items-center justify-center gap-1 border border-[var(--border-subtle)] transition-all cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Inspecionar</span>
                      </button>

                      {!isNodeFocus && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusDoc(node.docId);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] text-[var(--text-primary)] hover:text-[#CCF352] text-[10.5px] font-semibold flex items-center justify-center gap-1 border border-[var(--border-subtle)] transition-all cursor-pointer"
                          title="Focar cadeia neste documento"
                        >
                          <Focus size={12} className="text-[#CCF352]" />
                          <span>Focar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
