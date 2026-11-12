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
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DocumentNode } from '@/components/linhagem/DocumentNode';
import { LineageToolbar } from '@/components/linhagem/LineageToolbar';
import { EdgeDetailsModal } from '@/components/linhagem/EdgeDetailsModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useUI } from '@/context/UIContext';
import { getLayoutedElements } from '@/lib/dagre-layout';
import { Loader2, GitFork } from 'lucide-react';
import toast from 'react-hot-toast';

const nodeTypes = {
  documentNode: DocumentNode
};

export default function LineagePage() {
  const { docVersion } = useUI();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [onlyLinked, setOnlyLinked] = useState(true);
  const [rootDocId, setRootDocId] = useState<string | null>(null);
  const [availableDocs, setAvailableDocs] = useState<{ id: number; title: string }[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [summary, setSummary] = useState({ totalDocs: 0, totalEdges: 0, linkedDocs: 0 });

  const fetchLineage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('onlyLinked', String(onlyLinked));
      if (rootDocId) params.set('rootDocId', rootDocId);

      const res = await fetch(`/api/oracle/lineage?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao consultar linhagem no Oracle');
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Mapeia nós para formato do React Flow
      const flowNodes: Node[] = (data.nodes || []).map((n: any) => ({
        id: n.id,
        type: 'documentNode',
        data: n,
        position: { x: 0, y: 0 }
      }));

      // Extrai lista de documentos disponíveis para o dropdown de busca
      if (!rootDocId) {
        setAvailableDocs(
          (data.nodes || []).map((n: any) => ({
            id: n.docId,
            title: n.title
          })).sort((a: any, b: any) => a.id - b.id)
        );
      }

      // Mapeia arestas para formato do React Flow
      const flowEdges: Edge[] = (data.edges || []).map((e: any) => {
        const isSql = e.type === 'SQL_QUERY';
        const sourceHandle = e.sourceFieldTag ? `source_${e.sourceFieldTag}` : 'doc_source';
        const targetHandle = e.targetFieldTag ? `target_${e.targetFieldTag}` : 'doc_target';

        return {
          id: e.id,
          source: `doc_${e.sourceDocId}`,
          target: `doc_${e.targetDocId}`,
          sourceHandle,
          targetHandle,
          animated: true,
          type: 'smoothstep',
          style: {
            stroke: isSql ? '#0284c7' : '#10b981',
            strokeWidth: 2,
            strokeDasharray: isSql ? '6,6' : undefined
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSql ? '#0284c7' : '#10b981',
            width: 14,
            height: 14
          },
          data: e
        };
      });

      // Aplica auto-layout Dagre da Esquerda para a Direita
      const layouted = getLayoutedElements(flowNodes, flowEdges, 'LR');
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setSummary(data.summary || { totalDocs: flowNodes.length, totalEdges: flowEdges.length, linkedDocs: flowNodes.length });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao carregar dados de linhagem');
    } finally {
      setLoading(false);
    }
  }, [onlyLinked, rootDocId, setNodes, setEdges]);

  useEffect(() => {
    fetchLineage();
  }, [fetchLineage]);

  const handleResetLayout = () => {
    const layouted = getLayoutedElements(nodes, edges, 'LR');
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    toast.success('Layout reorganizado da esquerda para a direita');
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8 space-y-4 pb-12">
      {/* 1. Header Padronizado */}
      <div className="pb-4 border-b border-slate-200/80">
        <PageHeader 
          title="Grafo Global de Linhagem & Dependências"
          subtitle="Mapeamento em tempo real do fluxo de dados e dependências entre metadados (React Flow)"
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
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                  <span className="font-semibold text-slate-700 text-[11px]">Herança Direta</span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shadow-2xs" />
                  <span className="font-semibold text-slate-700 text-[11px]">Consulta SQL</span>
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
        onlyLinked={onlyLinked}
        onToggleOnlyLinked={(val) => setOnlyLinked(val)}
        rootDocId={rootDocId}
        onSelectRootDoc={(id) => setRootDocId(id)}
        availableDocs={availableDocs}
        onResetLayout={handleResetLayout}
        loading={loading}
      />

      {/* 3. Main Flow Canvas */}
      <div className="flex-1 w-full h-[calc(100vh-270px)] min-h-[520px] bg-white rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
            <Loader2 className="animate-spin text-sky-600" size={36} />
            <p className="text-xs font-semibold">Mapeando linhagem e dependências entre metadados...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <p className="text-sm font-semibold">Nenhum documento ou vínculo encontrado com os filtros atuais.</p>
            <button
              onClick={() => { setOnlyLinked(false); setRootDocId(null); }}
              className="text-xs text-sky-700 hover:underline font-semibold cursor-pointer"
            >
              Exibir todos os documentos
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
            maxZoom={1.8}
            defaultEdgeOptions={{
              type: 'smoothstep'
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.2} 
              color="#cbd5e1"
            />
            <Controls className="!bg-white !border !border-slate-200 !rounded-xl !shadow-sm" />
            <MiniMap 
              nodeColor={() => '#38bdf8'}
              className="!bg-white !border !border-slate-200 !rounded-xl !shadow-sm overflow-hidden"
              zoomable
              pannable
            />
          </ReactFlow>
        )}
      </div>

      {/* Edge Details Modal */}
      <EdgeDetailsModal
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
      />
    </div>
  );
}

