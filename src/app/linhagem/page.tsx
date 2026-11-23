"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DocumentNode } from '@/components/linhagem/DocumentNode';
import { LineageToolbar } from '@/components/linhagem/LineageToolbar';
import { LineageDetailsDrawer, LineageEdgeDetails, LineageNodeDetails } from '@/components/linhagem/LineageDetailsDrawer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useUI } from '@/context/UIContext';
import { getLayoutedElements } from '@/lib/dagre-layout';
import type { ExecutiveEdgeData, LineageDocNodeData } from '@/app/api/oracle/lineage/route';
import { Loader2, GitFork, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const nodeTypes = {
  documentNode: DocumentNode
};

function LineageFlowContent() {
  const searchParams = useSearchParams();
  const urlFocusRaw = searchParams.get('focus') || '';
  const urlFocusNum = /^\d+$/.test(urlFocusRaw) ? Number(urlFocusRaw) : null;

  const { docVersion, theme, getCached, setCached } = useUI();
  const isDark = theme !== 'light';
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [prevUrlFocus, setPrevUrlFocus] = useState<number | null>(null);
  const [focusDocId, setFocusDocId] = useState<number | null>(null);
  const [availableDocs, setAvailableDocs] = useState<{ id: number; title: string; totalLinks: number }[]>([]);

  if (urlFocusNum !== null && urlFocusNum !== prevUrlFocus) {
    setPrevUrlFocus(urlFocusNum);
    setFocusDocId(urlFocusNum);
  }
  
  // Dados brutos da API para cruzamento nos drawers
  const [, setRawApiNodes] = useState<LineageDocNodeData[]>([]);
  const rawDataRef = useRef<{ nodes: LineageDocNodeData[]; edges: ExecutiveEdgeData[] }>({ nodes: [], edges: [] });
  const [summary, setSummary] = useState({ totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 });

  // Estados do Drawer Lateral
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEdgeDetails, setSelectedEdgeDetails] = useState<LineageEdgeDetails | null>(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<LineageNodeDetails | null>(null);

  // Ao clicar no botão Inspecionar ou em um nó
  const handleInspectNode = useCallback((
    docId: number,
    currentNodes: LineageDocNodeData[] = rawDataRef.current.nodes,
    currentEdges: ExecutiveEdgeData[] = rawDataRef.current.edges
  ) => {
    const nodeObj = currentNodes.find((n) => n.docId === docId);
    if (!nodeObj) return;

    const upstream: LineageEdgeDetails[] = currentEdges
      .filter((e) => Number(e.targetDocId) === docId)
      .map((e) => {
        const sDoc = currentNodes.find((n) => String(n.docId) === String(e.sourceDocId));
        return {
          id: e.id,
          sourceDocId: String(e.sourceDocId),
          sourceDocTitle: sDoc?.title,
          targetDocId: String(e.targetDocId),
          targetDocTitle: nodeObj.title,
          totalFields: e.totalFields,
          fieldsMap: e.fieldsMap || [],
          isHybridV2: e.isHybridV2,
          isBroken: e.isBroken
        };
      });

    const downstream: LineageEdgeDetails[] = currentEdges
      .filter((e) => Number(e.sourceDocId) === docId)
      .map((e) => {
        const tDoc = currentNodes.find((n) => String(n.docId) === String(e.targetDocId));
        return {
          id: e.id,
          sourceDocId: String(e.sourceDocId),
          sourceDocTitle: nodeObj.title,
          targetDocId: String(e.targetDocId),
          targetDocTitle: tDoc?.title,
          totalFields: e.totalFields,
          fieldsMap: e.fieldsMap || [],
          isHybridV2: e.isHybridV2,
          isBroken: e.isBroken
        };
      });

    setSelectedEdgeDetails(null);
    setSelectedNodeDetails({
      docId: nodeObj.docId,
      title: nodeObj.title,
      version: nodeObj.version,
      versionType: nodeObj.versionType,
      tech: nodeObj.tech,
      totalFields: nodeObj.totalFields,
      isLegacyV2: nodeObj.isLegacyV2,
      isBroken: nodeObj.isBroken,
      selfFields: nodeObj.selfFields || [],
      upstreamEdges: upstream,
      downstreamEdges: downstream
    });
    setDrawerOpen(true);
  }, []);

  // Consulta à API com validação estrita, cache multinível e suporte a Modo Foco
  const fetchLineage = useCallback(async (targetFocusId: number | null, force = false) => {
    const cacheKey = `lineage_${targetFocusId || 'global'}_${docVersion || 'V3'}`;
    
    // 1. Tenta cache em memória / sessionStorage
    if (!force) {
      const cached = getCached<{ nodes: LineageDocNodeData[]; edges: ExecutiveEdgeData[]; availableDocs: any[]; summary: any }>(cacheKey);
      if (cached) {
        rawDataRef.current = { nodes: cached.nodes || [], edges: cached.edges || [] };
        setRawApiNodes(cached.nodes || []);
        setAvailableDocs(cached.availableDocs || []);
        setSummary(cached.summary || { totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 });

        const flowNodes: Node[] = (cached.nodes || []).map((n) => ({
          id: n.id,
          type: 'documentNode',
          data: {
            ...n,
            onInspect: (docId: number) => handleInspectNode(docId, cached.nodes, cached.edges),
            onFocus: (docId: number) => setFocusDocId(docId)
          },
          position: { x: 0, y: 0 }
        }));

        const flowEdges: Edge[] = (cached.edges || []).map((e) => {
          const strokeColor = e.isBroken ? '#f43f5e' : e.isHybridV2 ? '#f59e0b' : '#CCF352';
          const labelFill = e.isBroken ? '#f43f5e' : e.isHybridV2 ? '#f59e0b' : isDark ? '#CCF352' : '#3f5205';

          return {
            id: e.id,
            source: `doc_${e.sourceDocId}`,
            target: `doc_${e.targetDocId}`,
            sourceHandle: 'doc_source',
            targetHandle: 'doc_target',
            animated: true,
            type: 'smoothstep',
            label: e.label,
            labelStyle: {
              fontSize: 10.5,
              fontWeight: 700,
              fill: labelFill
            },
            labelBgStyle: {
              fill: isDark ? '#141312' : '#ffffff',
              fillOpacity: 0.95,
              stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              strokeWidth: 1,
              rx: 6,
              ry: 6
            },
            labelBgPadding: [6, 4] as [number, number],
            style: {
              stroke: strokeColor,
              strokeWidth: 2.2,
              ...(e.isBroken ? { strokeDasharray: '6 4' } : {})
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: strokeColor,
              width: 14,
              height: 14
            },
            data: e as unknown as Record<string, unknown>
          };
        });

        const layouted = getLayoutedElements(flowNodes, flowEdges, 'LR');
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        setLoading(false);
        setTimeout(() => {
          fitView({ padding: 0.25, duration: 400 });
        }, 100);
        return;
      }
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetFocusId) {
        params.set('rootDocId', String(targetFocusId));
      }

      const res = await fetch(`/api/oracle/lineage?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao consultar linhagem no Oracle');
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const apiNodes: LineageDocNodeData[] = data.nodes || [];
      const apiEdges: ExecutiveEdgeData[] = data.edges || [];

      // Salva no cache do cliente
      setCached(cacheKey, {
        nodes: apiNodes,
        edges: apiEdges,
        availableDocs: data.availableDocs || [],
        summary: data.summary || { totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 }
      });

      rawDataRef.current = { nodes: apiNodes, edges: apiEdges };
      setRawApiNodes(apiNodes);
      setAvailableDocs(data.availableDocs || []);
      setSummary(data.summary || { totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 });

      // Mapeia nós executivos
      const flowNodes: Node[] = apiNodes.map((n) => ({
        id: n.id,
        type: 'documentNode',
        data: {
          ...n,
          onInspect: (docId: number) => handleInspectNode(docId, apiNodes, apiEdges),
          onFocus: (docId: number) => setFocusDocId(docId)
        },
        position: { x: 0, y: 0 }
      }));

      // Mapeia arestas executivas consolidadas
      const flowEdges: Edge[] = apiEdges.map((e) => {
        const strokeColor = e.isBroken
          ? '#f43f5e'
          : e.isHybridV2
            ? '#f59e0b'
            : '#CCF352';
        const labelFill = e.isBroken
          ? '#f43f5e'
          : e.isHybridV2
            ? '#f59e0b'
            : isDark ? '#CCF352' : '#3f5205';

        return {
          id: e.id,
          source: `doc_${e.sourceDocId}`,
          target: `doc_${e.targetDocId}`,
          sourceHandle: 'doc_source',
          targetHandle: 'doc_target',
          animated: true,
          type: 'smoothstep',
          label: e.label,
          labelStyle: {
            fontSize: 10.5,
            fontWeight: 700,
            fill: labelFill
          },
          labelBgStyle: {
            fill: isDark ? '#141312' : '#ffffff',
            fillOpacity: 0.95,
            stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            strokeWidth: 1,
            rx: 6,
            ry: 6
          },
          labelBgPadding: [6, 4] as [number, number],
          style: {
            stroke: strokeColor,
            strokeWidth: 2.2,
            ...(e.isBroken ? { strokeDasharray: '6 4' } : {})
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14
          },
          data: e as unknown as Record<string, unknown>
        };
      });

      // Aplica auto-layout Dagre determinístico
      const layouted = getLayoutedElements(flowNodes, flowEdges, 'LR');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      // Enquadra a câmera de forma suave
      setTimeout(() => {
        fitView({ padding: 0.25, duration: 400 });
      }, 100);

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados de linhagem';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fitView, handleInspectNode, setNodes, setEdges, isDark, docVersion, getCached, setCached]);

  // Carrega inicialmente
  useEffect(() => {
    fetchLineage(focusDocId);
  }, [fetchLineage, focusDocId]);

  // Troca de documento de foco
  const handleSelectFocus = (newFocusId: number | null) => {
    setFocusDocId(newFocusId);
  };

  // Reorganiza e centraliza
  const handleResetLayout = () => {
    const layouted = getLayoutedElements(nodes, edges, 'LR');
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    fitView({ padding: 0.25, duration: 350 });
    toast.success('Grafo centralizado e reorganizado');
  };

  // Ao clicar em uma aresta executiva
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    const edgeData = edge.data as unknown as ExecutiveEdgeData | undefined;
    if (!edgeData) return;

    const sourceDoc = rawDataRef.current.nodes.find((n) => String(n.docId) === String(edgeData.sourceDocId));
    const targetDoc = rawDataRef.current.nodes.find((n) => String(n.docId) === String(edgeData.targetDocId));

    setSelectedNodeDetails(null);
    setSelectedEdgeDetails({
      id: edgeData.id,
      sourceDocId: String(edgeData.sourceDocId),
      sourceDocTitle: sourceDoc?.title,
      targetDocId: String(edgeData.targetDocId),
      targetDocTitle: targetDoc?.title,
      totalFields: edgeData.totalFields,
      fieldsMap: edgeData.fieldsMap || [],
      isHybridV2: edgeData.isHybridV2,
      isBroken: edgeData.isBroken
    });
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[var(--border-subtle)]">
        <PageHeader 
          title="Grafo Global de Linhagem & Dependências"
          subtitle="Rastreamento em tempo real do fluxo de dados e transferências entre documentos clínicos (Oracle DBAMV)"
          icon={GitFork}
          badge={
            <Badge 
              variant="outline" 
              suppressHydrationWarning
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[#CCF352]/30 bg-[#CCF352]/10 text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205]"
            >
              Motor {docVersion || 'V3'}
            </Badge>
          }
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 bg-[var(--dock-bg)] px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs shadow-2xs backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CCF352] shadow-2xs" />
                  <span className="font-semibold text-[var(--text-primary)] text-[11px]">Fluxo SQL V3</span>
                </div>
                <div className="w-px h-3 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
                  <span className="font-semibold text-amber-500 text-[11px]">Legado V2</span>
                </div>
                <div className="w-px h-3 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
                  <Info size={13} className="text-[#CCF352]" />
                  <span>Clique no fluxo para inspecionar</span>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* 2. Toolbar de Filtros e Controles */}
      <LineageToolbar
        totalDocs={summary.totalDocs}
        totalEdges={summary.totalEdges}
        totalFieldsLinked={summary.totalFieldsLinked}
        focusDocId={focusDocId}
        onSelectFocusDoc={handleSelectFocus}
        availableDocs={availableDocs}
        onResetLayout={handleResetLayout}
        loading={loading}
      />

      {/* 3. Main Flow Canvas */}
      <div 
        className="w-full sylva-canvas bg-[var(--canvas-bg)] rounded-2xl border border-[var(--border-subtle)] shadow-xs relative overflow-hidden backdrop-blur-md"
        style={{ height: 'calc(100vh - 220px)', minHeight: '560px' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
            <Loader2 className="animate-spin text-[#CCF352]" size={36} />
            <p className="text-xs font-semibold">Mapeando linhagem executiva de metadados...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhum vínculo de dependência encontrado para o filtro atual.</p>
            <p className="text-xs text-[var(--text-muted)] max-w-md">
              Tente selecionar outro documento de foco ou retorne para a visão global.
            </p>
            <button
              onClick={() => handleSelectFocus(null)}
              className="mt-1 px-4 py-2 rounded-full bg-[#CCF352] hover:bg-[#b8dd3e] text-[#141312] text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              Exibir Grafo Global
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => handleInspectNode(Number(node.data.docId))}
              onEdgeClick={onEdgeClick}
              fitView
              minZoom={0.2}
              maxZoom={1.6}
              defaultEdgeOptions={{
                type: 'smoothstep'
              }}
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={24} 
                size={1.2} 
                color={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}
              />
              <Controls className="!bg-[var(--dock-bg)] !border !border-[var(--border-subtle)] !text-[var(--text-primary)] !rounded-xl !shadow-lg backdrop-blur-md [&>button]:!bg-transparent [&>button]:!border-b [&>button]:!border-[var(--border-subtle)] [&>button]:!text-[var(--text-primary)] [&>button:hover]:!bg-white/10" />
              <MiniMap 
                nodeColor={(n) => {
                  const nodeData = n.data as Partial<LineageDocNodeData> | undefined;
                  if (nodeData?.isBroken) return '#f43f5e';
                  if (nodeData?.isLegacyV2) return '#f59e0b';
                  if (nodeData?.isFocus) return '#CCF352';
                  return isDark ? '#333' : '#94a3b8';
                }}
                maskColor={isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(240, 238, 233, 0.65)'}
                className="!bg-[var(--dock-bg)] !border !border-[var(--border-subtle)] !rounded-2xl !shadow-lg overflow-hidden backdrop-blur-md"
                zoomable
                pannable
              />
            </ReactFlow>
          </div>
        )}
      </div>

      {/* Drawer Lateral de Detalhamento de Campos e SQL */}
      <LineageDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        edgeDetails={selectedEdgeDetails}
        nodeDetails={selectedNodeDetails}
        onFocusDoc={(docId) => handleSelectFocus(docId)}
        onSelectEdge={(edge) => {
          setSelectedNodeDetails(null);
          setSelectedEdgeDetails(edge);
        }}
      />
    </div>
  );
}

export default function LineagePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Carregando grafo de linhagem...</div>}>
      <ReactFlowProvider>
        <LineageFlowContent />
      </ReactFlowProvider>
    </Suspense>
  );
}
