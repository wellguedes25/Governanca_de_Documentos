"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, GitFork, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const nodeTypes = {
  documentNode: DocumentNode
};

function LineageFlowContent() {
  const { docVersion } = useUI();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [focusDocId, setFocusDocId] = useState<number | null>(null);
  const [availableDocs, setAvailableDocs] = useState<{ id: number; title: string; totalLinks: number }[]>([]);
  
  // Dados brutos da API para cruzamento nos drawers
  const [rawApiNodes, setRawApiNodes] = useState<any[]>([]);
  const [rawApiEdges, setRawApiEdges] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 });

  // Estados do Drawer Lateral
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEdgeDetails, setSelectedEdgeDetails] = useState<LineageEdgeDetails | null>(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<LineageNodeDetails | null>(null);

  // Consulta à API com validação estrita e suporte a Modo Foco
  const fetchLineage = useCallback(async (targetFocusId: number | null) => {
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

      setRawApiNodes(data.nodes || []);
      setRawApiEdges(data.edges || []);
      setAvailableDocs(data.availableDocs || []);
      setSummary(data.summary || { totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 });

      // Mapeia nós executivos
      const flowNodes: Node[] = (data.nodes || []).map((n: any) => ({
        id: n.id,
        type: 'documentNode',
        data: {
          ...n,
          onInspect: (docId: number) => handleInspectNode(docId, data.nodes, data.edges),
          onFocus: (docId: number) => handleSelectFocus(docId)
        },
        position: { x: 0, y: 0 }
      }));

      // Mapeia arestas executivas consolidadas
      const flowEdges: Edge[] = (data.edges || []).map((e: any) => {
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
            fill: '#0369a1'
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.95,
            rx: 6,
            ry: 6
          },
          labelBgPadding: [6, 4] as [number, number],
          style: {
            stroke: '#0284c7',
            strokeWidth: 2.2
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#0284c7',
            width: 14,
            height: 14
          },
          data: e
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

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao carregar dados de linhagem');
    } finally {
      setLoading(false);
    }
  }, [fitView, setNodes, setEdges]);

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
    const edgeData = edge.data as any;
    if (!edgeData) return;

    const sourceDoc = rawApiNodes.find(n => String(n.docId) === String(edgeData.sourceDocId));
    const targetDoc = rawApiNodes.find(n => String(n.docId) === String(edgeData.targetDocId));

    setSelectedNodeDetails(null);
    setSelectedEdgeDetails({
      id: edgeData.id,
      sourceDocId: String(edgeData.sourceDocId),
      sourceDocTitle: sourceDoc?.title,
      targetDocId: String(edgeData.targetDocId),
      targetDocTitle: targetDoc?.title,
      totalFields: edgeData.totalFields,
      fieldsMap: edgeData.fieldsMap || []
    });
    setDrawerOpen(true);
  };

  // Ao clicar no botão Inspecionar de um nó
  const handleInspectNode = (docId: number, currentNodes = rawApiNodes, currentEdges = rawApiEdges) => {
    const nodeObj = currentNodes.find(n => n.docId === docId);
    if (!nodeObj) return;

    const upstream = currentEdges
      .filter((e: any) => Number(e.targetDocId) === docId)
      .map((e: any) => {
        const sDoc = currentNodes.find(n => String(n.docId) === String(e.sourceDocId));
        return {
          id: e.id,
          sourceDocId: String(e.sourceDocId),
          sourceDocTitle: sDoc?.title,
          targetDocId: String(e.targetDocId),
          totalFields: e.totalFields,
          fieldsMap: e.fieldsMap || []
        };
      });

    const downstream = currentEdges
      .filter((e: any) => Number(e.sourceDocId) === docId)
      .map((e: any) => {
        const tDoc = currentNodes.find(n => String(n.docId) === String(e.targetDocId));
        return {
          id: e.id,
          sourceDocId: String(e.sourceDocId),
          targetDocId: String(e.targetDocId),
          targetDocTitle: tDoc?.title,
          totalFields: e.totalFields,
          fieldsMap: e.fieldsMap || []
        };
      });

    setSelectedEdgeDetails(null);
    setSelectedNodeDetails({
      docId: nodeObj.docId,
      title: nodeObj.title,
      version: nodeObj.version,
      versionType: nodeObj.versionType,
      totalFields: nodeObj.totalFields,
      upstreamEdges: upstream,
      downstreamEdges: downstream
    });
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8 space-y-4 pb-12">
      {/* 1. Header Padronizado */}
      <div className="pb-4 border-b border-slate-200/80">
        <PageHeader 
          title="Grafo Global de Linhagem & Dependências"
          subtitle="Rastreamento em tempo real do fluxo de dados e transferências entre documentos clínicos (Oracle DBAMV)"
          icon={GitFork}
          badge={
            <Badge 
              variant="outline" 
              suppressHydrationWarning
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border-sky-300 bg-sky-50 text-sky-800"
            >
              Motor {docVersion || 'V3'}
            </Badge>
          }
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shadow-2xs" />
                  <span className="font-semibold text-slate-700 text-[11px]">Fluxo SQL Consolidado</span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Info size={13} className="text-slate-400" />
                  <span>Clique no fluxo para inspecionar o SQL</span>
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
      <div className="flex-1 w-full h-[calc(100vh-270px)] min-h-[540px] bg-white rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
            <Loader2 className="animate-spin text-sky-600" size={36} />
            <p className="text-xs font-semibold">Mapeando linhagem executiva de metadados...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">Nenhum vínculo de dependência encontrado para o filtro atual.</p>
            <p className="text-xs text-slate-500 max-w-md">
              Tente selecionar outro documento de foco ou retorne para a visão global.
            </p>
            <button
              onClick={() => handleSelectFocus(null)}
              className="mt-1 px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              Exibir Grafo Global
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
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
              color="#cbd5e1"
            />
            <Controls className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs" />
            <MiniMap 
              nodeColor={(n: any) => n.data?.isFocus ? '#0284c7' : '#94a3b8'}
              className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs overflow-hidden"
              zoomable
              pannable
            />
          </ReactFlow>
        )}
      </div>

      {/* Drawer Lateral de Detalhamento de Campos e SQL */}
      <LineageDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        edgeDetails={selectedEdgeDetails}
        nodeDetails={selectedNodeDetails}
        onFocusDoc={(docId) => handleSelectFocus(docId)}
      />
    </div>
  );
}

export default function LineagePage() {
  return (
    <ReactFlowProvider>
      <LineageFlowContent />
    </ReactFlowProvider>
  );
}
