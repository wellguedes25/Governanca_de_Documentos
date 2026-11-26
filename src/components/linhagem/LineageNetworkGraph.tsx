"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Tag, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutiveEdgeData, LineageDocNodeData } from '@/types/lineage.types';
import type { Core as CytoscapeCore, NodeSingular, EdgeSingular } from 'cytoscape';
import type { ElkNode } from 'elkjs/lib/elk-api';

interface LineageNetworkGraphProps {
  nodes: LineageDocNodeData[];
  edges: ExecutiveEdgeData[];
  focusDocId: number | null;
  isDark: boolean;
  onInspectNode: (docId: number) => void;
  onInspectEdge: (edge: ExecutiveEdgeData) => void;
  onFocusDoc: (docId: number) => void;
}

interface HoverTooltipState {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export function LineageNetworkGraph({
  nodes,
  edges,
  focusDocId,
  isDark,
  onInspectNode,
  onInspectEdge,
  onFocusDoc,
}: LineageNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<CytoscapeCore | null>(null);
  const [layouting, setLayouting] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [tooltip, setTooltip] = useState<HoverTooltipState | null>(null);

  const callbacksRef = useRef({ onInspectNode, onInspectEdge, onFocusDoc });
  callbacksRef.current = { onInspectNode, onInspectEdge, onFocusDoc };

  useEffect(() => {
    let cancelled = false;
    let instance: CytoscapeCore | null = null;

    async function initGraph() {
      const container = containerRef.current;
      if (!container || nodes.length === 0) {
        setLayouting(false);
        return;
      }

      setLayouting(true);
      try {
        const [cyMod, elkMod] = await Promise.all([
          import('cytoscape'),
          import('elkjs/lib/elk.bundled.js'),
        ]);

        if (cancelled) return;

        const cytoscape = cyMod.default;
        const ElkCtor = (elkMod as unknown as { default?: new () => { layout: (g: ElkNode) => Promise<ElkNode> } }).default
          ?? (elkMod as unknown as new () => { layout: (g: ElkNode) => Promise<ElkNode> });
        const elk = new ElkCtor();
        const nodeWidth = 246;
        const nodeHeight = 76;

        const validNodeIds = new Set(nodes.map((n) => n.id));
        const elkEdges = edges
          .filter((e) => validNodeIds.has(`doc_${e.sourceDocId}`) && validNodeIds.has(`doc_${e.targetDocId}`))
          .map((e) => ({
            id: e.id,
            sources: [`doc_${e.sourceDocId}`],
            targets: [`doc_${e.targetDocId}`],
          }));

        const elkGraph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.separateConnectedComponents': 'true',
            'elk.spacing.nodeNode': '42',
            'elk.layered.spacing.nodeNodeBetweenLayers': '140',
            'elk.spacing.componentComponent': '80',
            'elk.padding': '[top=40,left=40,bottom=40,right=40]',
          },
          children: nodes.map((n) => ({
            id: n.id,
            width: nodeWidth,
            height: nodeHeight,
          })),
          edges: elkEdges,
        };

        const laidOut = await elk.layout(elkGraph);
        if (cancelled || !containerRef.current) return;

        const posMap = new Map<string, { x: number; y: number }>();
        (laidOut.children || []).forEach((child: ElkNode) => {
          posMap.set(child.id, {
            x: (child.x ?? 0) + (child.width ?? nodeWidth) / 2,
            y: (child.y ?? 0) + (child.height ?? nodeHeight) / 2,
          });
        });

        const cyElements = [
          ...nodes.map((n) => {
            const pos = posMap.get(n.id) || { x: 0, y: 0 };
            const kind = n.isBroken
              ? 'broken'
              : focusDocId === n.docId
                ? 'focus'
                : n.isLegacyV2
                  ? 'legacy'
                  : 'v3';
            return {
              group: 'nodes' as const,
              data: {
                id: n.id,
                docId: n.docId,
                label: `DOC ${n.docId} · ${n.tech}\n${truncateText(n.title, 34)}\n${n.upstreamCount} in · ${n.downstreamCount} out`,
                fullTitle: n.title,
                tech: n.tech,
                version: n.version,
                upstreamCount: n.upstreamCount,
                downstreamCount: n.downstreamCount,
                totalFields: n.totalFields,
                kind,
              },
              position: pos,
            };
          }),
          ...edges
            .filter((e) => validNodeIds.has(`doc_${e.sourceDocId}`) && validNodeIds.has(`doc_${e.targetDocId}`))
            .map((e) => {
              const kind = e.isBroken
                ? 'broken'
                : e.isHybridV2
                  ? 'legacy'
                  : e.hasDocRules && !e.hasFieldActions
                    ? 'rule'
                    : 'action';
              return {
                group: 'edges' as const,
                data: {
                  id: e.id,
                  source: `doc_${e.sourceDocId}`,
                  target: `doc_${e.targetDocId}`,
                  label: `${e.totalFields}`,
                  kind,
                  rawEdge: e,
                },
              };
            }),
        ];

        const bgCard = isDark ? '#1E1D1B' : '#FFFFFF';
        const fgText = isDark ? '#F4F3EE' : '#171615';
        const borderNeutral = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(23,22,21,0.18)';
        const limeColor = isDark ? '#CCF352' : '#4D6B0A';
        const skyColor = isDark ? '#84BAF8' : '#1F4F86';
        const amberColor = isDark ? '#FBBF24' : '#B45309';
        const roseColor = isDark ? '#F43F5E' : '#BE123C';

        instance = cytoscape({
          container: containerRef.current,
          elements: cyElements,
          layout: { name: 'preset' },
          minZoom: 0.18,
          maxZoom: 2.2,
          wheelSensitivity: 0.25,
          style: [
            {
              selector: 'node',
              style: {
                shape: 'round-rectangle',
                width: nodeWidth,
                height: nodeHeight,
                'background-color': bgCard,
                'border-width': 1.5,
                'border-color': borderNeutral,
                color: fgText,
                label: 'data(label)',
                'text-wrap': 'wrap',
                'text-max-width': '220px',
                'text-valign': 'center',
                'text-halign': 'center',
                'font-size': 11,
                'font-family': 'Inter, system-ui, sans-serif',
                'font-weight': 600,
                'line-height': 1.35,
                'transition-property': 'opacity, border-color, border-width',
                'transition-duration': 150,
              },
            },
            {
              selector: 'node[kind = "focus"]',
              style: {
                'border-width': 2.5,
                'border-color': limeColor,
                'background-color': isDark ? '#252A1B' : '#F4FAD9',
              },
            },
            {
              selector: 'node[kind = "legacy"]',
              style: {
                'border-color': amberColor,
                'border-width': 2,
              },
            },
            {
              selector: 'node[kind = "broken"]',
              style: {
                'border-color': roseColor,
                'border-width': 2,
                'background-color': isDark ? '#2E181C' : '#FDECEC',
              },
            },
            {
              selector: 'edge',
              style: {
                'curve-style': 'taxi',
                'taxi-direction': 'rightward',
                'taxi-turn': '50%',
                width: 2.2,
                'line-color': limeColor,
                'target-arrow-color': limeColor,
                'target-arrow-shape': 'triangle',
                'arrow-scale': 1.05,
                opacity: 0.78,
                label: showLabels ? 'data(label)' : '',
                'font-size': 10,
                'font-weight': 700,
                color: fgText,
                'text-background-color': bgCard,
                'text-background-opacity': 0.92,
                'text-background-padding': '3px',
                'text-background-shape': 'roundrectangle',
                'transition-property': 'opacity, width',
                'transition-duration': 150,
              },
            },
            {
              selector: 'edge[kind = "rule"]',
              style: {
                'line-color': skyColor,
                'target-arrow-color': skyColor,
              },
            },
            {
              selector: 'edge[kind = "legacy"]',
              style: {
                'line-color': amberColor,
                'target-arrow-color': amberColor,
              },
            },
            {
              selector: 'edge[kind = "broken"]',
              style: {
                'line-color': roseColor,
                'target-arrow-color': roseColor,
                'line-style': 'dashed',
              },
            },
            {
              selector: '.dimmed',
              style: {
                opacity: 0.16,
              },
            },
            {
              selector: '.highlighted',
              style: {
                opacity: 1,
                'z-index': 999,
              },
            },
          ],
        });

        cyRef.current = instance;
        instance.fit(undefined, 44);

        // Hover highlight em cadeia conectada (predecessores + sucessores)
        instance.on('mouseover', 'node', (evt) => {
          const node = evt.target as NodeSingular;
          if (!instance) return;
          const chain = node.predecessors().union(node.successors()).union(node);
          instance.elements().not(chain).addClass('dimmed');
          chain.addClass('highlighted');

          const pos = evt.renderedPosition;
          const d = node.data();
          setTooltip({
            x: pos.x,
            y: pos.y,
            title: `DOC ${d.docId} · ${d.fullTitle}`,
            subtitle: `${d.tech} · v${d.version || 1}`,
            meta: `${d.upstreamCount} origens · ${d.downstreamCount} destinos · ${d.totalFields} campos`,
            badge: d.kind === 'broken' ? 'Quebrado' : d.kind === 'legacy' ? 'Legado V2' : 'Editor V3',
          });
        });

        instance.on('mouseout', 'node', () => {
          if (!instance) return;
          instance.elements().removeClass('dimmed highlighted');
          setTooltip(null);
        });

        instance.on('mouseover', 'edge', (evt) => {
          const edge = evt.target as EdgeSingular;
          if (!instance) return;
          const connected = edge.connectedNodes().union(edge);
          instance.elements().not(connected).addClass('dimmed');
          connected.addClass('highlighted');

          const rawEdge = edge.data('rawEdge') as ExecutiveEdgeData | undefined;
          if (rawEdge) {
            const pos = evt.renderedPosition;
            const origins = [
              rawEdge.hasFieldActions ? 'Ação SQL' : null,
              rawEdge.hasDocRules ? 'Regra SQL' : null,
            ]
              .filter(Boolean)
              .join(' + ');
            setTooltip({
              x: pos.x,
              y: pos.y,
              title: `Doc ${rawEdge.sourceDocId} ➔ Doc ${rawEdge.targetDocId}`,
              subtitle: rawEdge.label,
              meta: `Origem: ${origins || 'SQL'} · Clique para abrir scripts`,
              badge: rawEdge.isBroken ? 'Quebrado' : rawEdge.isHybridV2 ? 'Híbrido V2' : undefined,
            });
          }
        });

        instance.on('mouseout', 'edge', () => {
          if (!instance) return;
          instance.elements().removeClass('dimmed highlighted');
          setTooltip(null);
        });

        instance.on('tap', 'node', (evt) => {
          const docId = Number(evt.target.data('docId'));
          if (docId) callbacksRef.current.onInspectNode(docId);
        });

        instance.on('dbltap', 'node', (evt) => {
          const docId = Number(evt.target.data('docId'));
          if (docId) callbacksRef.current.onFocusDoc(docId);
        });

        instance.on('tap', 'edge', (evt) => {
          const rawEdge = evt.target.data('rawEdge') as ExecutiveEdgeData | undefined;
          if (rawEdge) callbacksRef.current.onInspectEdge(rawEdge);
        });
      } catch (err) {
        console.error('[LineageNetworkGraph] Erro ao renderizar rede:', err);
      } finally {
        if (!cancelled) setLayouting(false);
      }
    }

    initGraph();

    return () => {
      cancelled = true;
      if (instance) {
        instance.destroy();
      }
      cyRef.current = null;
    };
  }, [nodes, edges, focusDocId, isDark, showLabels]);

  const handleZoom = useCallback((factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 44);
  }, []);

  const handleExportPng = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const pngData = cy.png({
      full: true,
      scale: 2,
      bg: isDark ? '#141312' : '#F0EEE9',
    });
    const link = document.createElement('a');
    link.href = pngData;
    link.download = `linhagem-documentos-${focusDocId || 'global'}.png`;
    link.click();
  }, [isDark, focusDocId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {layouting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--canvas-bg)]/70 backdrop-blur-xs z-20">
          <Loader2 className="animate-spin text-[#CCF352]" size={28} />
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Calculando roteamento ortogonal ELK...
          </span>
        </div>
      )}

      {/* Tooltip Flutuante */}
      {tooltip && (
        <div
          style={{
            left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth || 600) - 270),
            top: Math.max(12, tooltip.y - 16),
          }}
          className="pointer-events-none absolute z-30 w-64 p-3 rounded-2xl sylva-dock bg-[var(--card-solid)] border border-[var(--border-strong)] shadow-xl text-xs space-y-1"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[var(--text-primary)] line-clamp-2 text-[11.5px]">
              {tooltip.title}
            </span>
          </div>
          <p className="text-[10.5px] font-semibold text-[#CCF352]">{tooltip.subtitle}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{tooltip.meta}</p>
        </div>
      )}

      {/* Barra Flutuante de Controles */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl sylva-dock bg-[var(--dock-bg)] border border-[var(--border-subtle)] shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleZoom(1.2)}
          className="p-2 rounded-xl hover:bg-[var(--card-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Aproximar zoom"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.82)}
          className="p-2 rounded-xl hover:bg-[var(--card-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Afastar zoom"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="p-2 rounded-xl hover:bg-[var(--card-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
          title="Ajustar tudo à tela"
        >
          <Maximize2 size={15} />
        </button>
        <div className="w-px h-5 bg-[var(--border-subtle)]" />
        <button
          type="button"
          onClick={() => setShowLabels((prev) => !prev)}
          className={cn(
            'px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
            showLabels
              ? 'bg-[#CCF352] text-[#141312]'
              : 'hover:bg-[var(--card-hover)] text-[var(--text-secondary)]'
          )}
          title="Mostrar ou ocultar contagem nas linhas"
        >
          <Tag size={13} />
          <span>Rótulos</span>
        </button>
        <button
          type="button"
          onClick={handleExportPng}
          className="px-2.5 py-1.5 rounded-xl hover:bg-[var(--card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Exportar mapa como imagem PNG"
        >
          <Download size={13} />
          <span>PNG</span>
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-[var(--dock-bg)]/90 border border-[var(--border-subtle)] text-[10.5px] text-[var(--text-muted)] backdrop-blur-md">
        Clique no nó para inspecionar · Duplo clique para focar
      </div>
    </div>
  );
}
