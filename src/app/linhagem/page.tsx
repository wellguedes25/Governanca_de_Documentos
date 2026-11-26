"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Loader2,
  GitFork,
  Info,
  GitBranch,
  AlertTriangle,
  ArrowRight,
  Layers,
  Focus,
  Network,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useUI } from '@/context/UIContext';
import { LineageToolbar, type LineageViewMode } from '@/components/linhagem/LineageToolbar';
import { LineageColumnExplorer } from '@/components/linhagem/LineageColumnExplorer';
import { LineageNetworkGraph } from '@/components/linhagem/LineageNetworkGraph';
import {
  LineageDetailsDrawer,
  type LineageEdgeDetails,
  type LineageNodeDetails,
} from '@/components/linhagem/LineageDetailsDrawer';
import type {
  ExecutiveEdgeData,
  LineageApiResponse,
  LineageAvailableDoc,
  LineageClusterSummary,
  LineageDepth,
  LineageDocNodeData,
} from '@/types/lineage.types';

function LineageFlowContent() {
  const searchParams = useSearchParams();
  const urlFocusRaw = searchParams.get('focus') || '';
  const urlFocusNum = /^\d+$/.test(urlFocusRaw) ? Number(urlFocusRaw) : null;

  const { docVersion, isMounted, theme, getCached, setCached } = useUI();
  const isDark = theme !== 'light';
  const resolvedVersion: 'V3' | 'V2' = docVersion === 'V2' ? 'V2' : 'V3';

  const [viewMode, setViewMode] = useState<LineageViewMode>('columns');
  const [focusDocId, setFocusDocId] = useState<number | null>(urlFocusNum);
  const [prevUrlFocus, setPrevUrlFocus] = useState<number | null>(urlFocusNum);
  const [depth, setDepth] = useState<LineageDepth>('all');
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [forceExpandAllChains, setForceExpandAllChains] = useState(false);

  const [showActions, setShowActions] = useState(true);
  const [showRules, setShowRules] = useState(true);
  const [showBroken, setShowBroken] = useState(true);

  if (urlFocusNum !== null && urlFocusNum !== prevUrlFocus) {
    setPrevUrlFocus(urlFocusNum);
    setFocusDocId(urlFocusNum);
  }

  const [loading, setLoading] = useState(true);
  const [rawNodes, setRawNodes] = useState<LineageDocNodeData[]>([]);
  const [rawEdges, setRawEdges] = useState<ExecutiveEdgeData[]>([]);
  const [clusters, setClusters] = useState<LineageClusterSummary[]>([]);
  const [availableDocs, setAvailableDocs] = useState<LineageAvailableDoc[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEdgeDetails, setSelectedEdgeDetails] = useState<LineageEdgeDetails | null>(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<LineageNodeDetails | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const prevEngineRef = useRef<'V3' | 'V2' | null>(null);

  const fetchLineage = useCallback(
    async (
      targetVersion: 'V3' | 'V2',
      targetFocusId: number | null,
      targetDepth: LineageDepth,
      force = false
    ) => {
      // Cancela requisição em voo para impedir race condition ao trocar V2/V3 ou foco
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const seq = ++requestSeqRef.current;

      const cacheKey = `lineage_v3_${targetFocusId || 'global'}_${targetDepth}_${targetVersion}`;

      if (!force) {
        const cached = getCached<LineageApiResponse>(cacheKey);
        if (cached && (!cached.engine || cached.engine === targetVersion)) {
          if (seq !== requestSeqRef.current) return;
          setRawNodes(cached.nodes || []);
          setRawEdges(cached.edges || []);
          setClusters(cached.clusters || []);
          setAvailableDocs(cached.availableDocs || []);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('version', targetVersion);
        params.set('depth', String(targetDepth));
        if (targetFocusId !== null) {
          params.set('rootDocId', String(targetFocusId));
        }
        if (force) {
          params.set('force', 'true');
        }

        const res = await fetch(`/api/oracle/lineage?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error('Falha ao consultar linhagem no Oracle');
        }
        const data = (await res.json()) as LineageApiResponse & { error?: string };
        if (data.error) throw new Error(data.error);

        // Descarta respostas obsoletas ou de outro motor
        if (seq !== requestSeqRef.current || (data.engine && data.engine !== targetVersion)) {
          return;
        }

        setCached(cacheKey, data);
        setRawNodes(data.nodes || []);
        setRawEdges(data.edges || []);
        setClusters(data.clusters || []);
        setAvailableDocs(data.availableDocs || []);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (seq !== requestSeqRef.current) return;
        console.error(err);
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados de linhagem';
        toast.error(message);
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [getCached, setCached]
  );

  // Aguarda hidratação do UIContext (app_doc_version no sessionStorage) antes da primeira carga
  useEffect(() => {
    if (!isMounted) return;

    const engineChanged = prevEngineRef.current !== null && prevEngineRef.current !== resolvedVersion;
    prevEngineRef.current = resolvedVersion;

    if (engineChanged) {
      setRawNodes([]);
      setRawEdges([]);
      setClusters([]);
      setAvailableDocs([]);
      setSelectedClusterId(null);
      setForceExpandAllChains(false);
      setDrawerOpen(false);
      if (urlFocusNum === null && focusDocId !== null) {
        setFocusDocId(null);
        return;
      }
    }

    fetchLineage(resolvedVersion, focusDocId, depth);
  }, [isMounted, resolvedVersion, focusDocId, depth, urlFocusNum, fetchLineage]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Aplica filtros de UI (Cadeia/Cluster + Ações SQL + Regras SQL + Quebrados) de forma reativa sem refetch
  const { visibleNodes, visibleEdges, computedSummary } = useMemo(() => {
    const filteredEdges = rawEdges
      .map((e) => {
        const nextFields = e.fieldsMap.filter((f) => {
          if (f.originKind === 'FIELD_ACTION' && !showActions) return false;
          if (f.originKind === 'DOC_RULE' && !showRules) return false;
          if (f.linkKind === 'BROKEN' && !showBroken) return false;
          return true;
        });

        if (nextFields.length === 0) return null;

        const hasFieldActions = nextFields.some((f) => f.originKind === 'FIELD_ACTION');
        const hasDocRules = nextFields.some((f) => f.originKind === 'DOC_RULE');
        return {
          ...e,
          fieldsMap: nextFields,
          totalFields: nextFields.length,
          hasFieldActions,
          hasDocRules,
        };
      })
      .filter((e): e is ExecutiveEdgeData => e !== null);

    const clusterDocFilter =
      focusDocId === null && selectedClusterId !== null
        ? new Set(
            rawNodes.filter((n) => n.clusterId === selectedClusterId).map((n) => n.docId)
          )
        : null;

    const clusterEdges = clusterDocFilter
      ? filteredEdges.filter(
          (e) =>
            clusterDocFilter.has(Number(e.sourceDocId)) &&
            clusterDocFilter.has(Number(e.targetDocId))
        )
      : filteredEdges;

    const activeDocIds = new Set<number>();
    clusterEdges.forEach((e) => {
      activeDocIds.add(Number(e.sourceDocId));
      activeDocIds.add(Number(e.targetDocId));
    });
    if (focusDocId !== null) activeDocIds.add(focusDocId);

    const upCount = new Map<number, number>();
    const downCount = new Map<number, number>();
    clusterEdges.forEach((e) => {
      const s = Number(e.sourceDocId);
      const t = Number(e.targetDocId);
      downCount.set(s, (downCount.get(s) || 0) + 1);
      upCount.set(t, (upCount.get(t) || 0) + 1);
    });

    const filteredNodes = rawNodes
      .filter((n) => {
        if (!showBroken && n.isBroken) return false;
        if (clusterDocFilter && !clusterDocFilter.has(n.docId)) return false;
        if (activeDocIds.has(n.docId)) return true;
        return n.selfLinksCount > 0 && (!clusterDocFilter || clusterDocFilter.has(n.docId));
      })
      .map((n) => ({
        ...n,
        upstreamCount: upCount.get(n.docId) || 0,
        downstreamCount: downCount.get(n.docId) || 0,
      }));

    const finalNodeIds = new Set(filteredNodes.map((n) => n.docId));
    const finalEdges = clusterEdges.filter(
      (e) => finalNodeIds.has(Number(e.sourceDocId)) && finalNodeIds.has(Number(e.targetDocId))
    );

    const visibleClusters = new Set(filteredNodes.map((n) => n.clusterId));

    return {
      visibleNodes: filteredNodes,
      visibleEdges: finalEdges,
      computedSummary: {
        totalDocs: filteredNodes.length,
        totalEdges: finalEdges.length,
        totalFieldsLinked: finalEdges.reduce((acc, e) => acc + e.totalFields, 0),
        totalClusters: visibleClusters.size,
      },
    };
  }, [rawNodes, rawEdges, showActions, showRules, showBroken, focusDocId, selectedClusterId]);

  const showChainOverviewGrid =
    focusDocId === null &&
    selectedClusterId === null &&
    clusters.length > 1 &&
    visibleNodes.length > 15 &&
    !forceExpandAllChains &&
    viewMode === 'columns';

  const clusterDetailsMap = useMemo(() => {
    const map = new Map<number, LineageDocNodeData[]>();
    visibleNodes.forEach((n) => {
      if (!map.has(n.clusterId)) map.set(n.clusterId, []);
      map.get(n.clusterId)!.push(n);
    });
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          b.upstreamCount + b.downstreamCount - (a.upstreamCount + a.downstreamCount) ||
          a.docId - b.docId
      )
    );
    return map;
  }, [visibleNodes]);

  const handleInspectNode = useCallback(
    (docId: number) => {
      const nodeObj = visibleNodes.find((n) => n.docId === docId) || rawNodes.find((n) => n.docId === docId);
      if (!nodeObj) return;

      const upstream: LineageEdgeDetails[] = visibleEdges
        .filter((e) => Number(e.targetDocId) === docId)
        .map((e) => {
          const sDoc = rawNodes.find((n) => String(n.docId) === String(e.sourceDocId));
          return {
            id: e.id,
            sourceDocId: String(e.sourceDocId),
            sourceDocTitle: sDoc?.title,
            targetDocId: String(e.targetDocId),
            targetDocTitle: nodeObj.title,
            totalFields: e.totalFields,
            fieldsMap: e.fieldsMap || [],
            isHybridV2: e.isHybridV2,
            isBroken: e.isBroken,
          };
        });

      const downstream: LineageEdgeDetails[] = visibleEdges
        .filter((e) => Number(e.sourceDocId) === docId)
        .map((e) => {
          const tDoc = rawNodes.find((n) => String(n.docId) === String(e.targetDocId));
          return {
            id: e.id,
            sourceDocId: String(e.sourceDocId),
            sourceDocTitle: nodeObj.title,
            targetDocId: String(e.targetDocId),
            targetDocTitle: tDoc?.title,
            totalFields: e.totalFields,
            fieldsMap: e.fieldsMap || [],
            isHybridV2: e.isHybridV2,
            isBroken: e.isBroken,
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
        downstreamEdges: downstream,
      });
      setDrawerOpen(true);
    },
    [visibleNodes, visibleEdges, rawNodes]
  );

  const handleInspectEdge = useCallback(
    (edgeData: ExecutiveEdgeData) => {
      const sourceDoc = rawNodes.find((n) => String(n.docId) === String(edgeData.sourceDocId));
      const targetDoc = rawNodes.find((n) => String(n.docId) === String(edgeData.targetDocId));

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
        isBroken: edgeData.isBroken,
      });
      setDrawerOpen(true);
    },
    [rawNodes]
  );

  const handleSelectFocusDoc = useCallback((docId: number | null) => {
    setFocusDocId(docId);
    if (docId !== null) {
      setSelectedClusterId(null);
      setForceExpandAllChains(false);
    }
  }, []);

  const handleSelectCluster = useCallback((clusterId: number | null) => {
    setSelectedClusterId(clusterId);
    if (clusterId !== null) {
      setForceExpandAllChains(false);
    }
  }, []);

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[var(--border-subtle)]">
        <PageHeader
          title="Grafo Global de Linhagem & Dependências"
          subtitle="Rastreamento estrutural de fluxo de dados entre documentos via Ações e Regras SQL (Oracle DBAMV)"
          icon={GitFork}
          badge={
            <Badge
              variant="outline"
              suppressHydrationWarning
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[#CCF352]/30 bg-[#CCF352]/10 text-[#CCF352]"
            >
              Motor {resolvedVersion}
            </Badge>
          }
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 bg-[var(--dock-bg)] px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs shadow-2xs backdrop-blur-md flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CCF352]" />
                  <span className="font-semibold text-[var(--text-primary)] text-[11px]">Ação SQL</span>
                </div>
                <div className="w-px h-3 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#84BAF8]" />
                  <span className="font-semibold text-[var(--text-primary)] text-[11px]">Regra SQL</span>
                </div>
                <div className="w-px h-3 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-400 text-[11px]">Legado V2</span>
                </div>
                <div className="w-px h-3 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-semibold text-rose-400 text-[11px]">Quebrado</span>
                </div>
                <div className="hidden md:block w-px h-3 bg-[var(--border-subtle)]" />
                <div className="hidden md:flex items-center gap-1 text-[var(--text-muted)] text-[11px]">
                  <Info size={13} className="text-[#CCF352]" />
                  <span>Clique no fluxo para ver SQL</span>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* 2. Toolbar Híbrida */}
      <LineageToolbar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        totalDocs={computedSummary.totalDocs}
        totalEdges={computedSummary.totalEdges}
        totalFieldsLinked={computedSummary.totalFieldsLinked}
        totalClusters={computedSummary.totalClusters}
        focusDocId={focusDocId}
        onSelectFocusDoc={handleSelectFocusDoc}
        depth={depth}
        onChangeDepth={setDepth}
        availableDocs={availableDocs}
        clusters={clusters}
        selectedClusterId={selectedClusterId}
        onSelectCluster={handleSelectCluster}
        showActions={showActions}
        onToggleActions={() => setShowActions((v) => !v)}
        showRules={showRules}
        onToggleRules={() => setShowRules((v) => !v)}
        showBroken={showBroken}
        onToggleBroken={() => setShowBroken((v) => !v)}
        onRefresh={() => fetchLineage(resolvedVersion, focusDocId, depth, true)}
        loading={loading}
      />

      {/* 3. Canvas Principal (Grade de Cadeias, Colunas ou Rede ELK/Cytoscape) */}
      <div
        className="w-full sylva-canvas bg-[var(--canvas-bg)] rounded-2xl border border-[var(--border-subtle)] shadow-xs relative overflow-hidden backdrop-blur-md"
        style={{ height: 'calc(100vh - 235px)', minHeight: '560px' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
            <Loader2 className="animate-spin text-[#CCF352]" size={36} />
            <p className="text-xs font-semibold">Mapeando linhagem executiva ({resolvedVersion})...</p>
          </div>
        ) : visibleNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Nenhum vínculo de dependência encontrado para os filtros atuais.
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-md">
              Ajuste os filtros de Ações/Regras/Quebrados, troque a cadeia selecionada ou retorne para a visão global.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowActions(true);
                setShowRules(true);
                setShowBroken(true);
                setSelectedClusterId(null);
                setForceExpandAllChains(false);
                handleSelectFocusDoc(null);
              }}
              className="mt-1 px-4 py-2 rounded-full sylva-lime-btn text-xs font-bold transition-all cursor-pointer"
            >
              Resetar Filtros e Visão Global
            </button>
          </div>
        ) : showChainOverviewGrid ? (
          <div className="h-full overflow-y-auto scrollbar-thin p-5 md:p-6 space-y-5">
            {/* Barra introdutória do Mapa de Cadeias */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--dock-bg)]/85 border border-[var(--border-subtle)]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <GitBranch size={15} className="text-[#CCF352]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Mapa Executivo de Cadeias ({clusters.length} cadeias independentes)
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Selecione uma cadeia para explorar seu fluxo em colunas sem poluição visual, ou clique direto em um
                  documento para abrir o Modo Foco.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('network')}
                  className="px-3 py-1.5 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Network size={13} className="text-[#CCF352]" />
                  <span>Ver Rede ELK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForceExpandAllChains(true)}
                  className="px-3 py-1.5 rounded-full bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Abrir todas no canvas</span>
                </button>
              </div>
            </div>

            {/* Grade de Cards de Cadeias */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {clusters.map((cluster) => {
                const clusterNodes = clusterDetailsMap.get(cluster.clusterId) || [];
                if (clusterNodes.length === 0) return null;

                return (
                  <div
                    key={cluster.clusterId}
                    onClick={() => handleSelectCluster(cluster.clusterId)}
                    className="group rounded-2xl sylva-glass bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-[#CCF352]/50 p-4 flex flex-col justify-between gap-3.5 transition-all cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tone-success border">
                          Cadeia {cluster.clusterId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {cluster.hasLegacyV2 && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold tone-warning border">
                              Legado V2
                            </span>
                          )}
                          {cluster.hasBroken && (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold tone-danger border flex items-center gap-1">
                              <AlertTriangle size={10} />
                              Quebrado
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[#CCF352] transition-colors line-clamp-1">
                        {cluster.label.replace(/^Cadeia \d+ · /, '')}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium">
                        <span>
                          <b className="text-[var(--text-primary)]">{cluster.docCount}</b> docs
                        </span>
                        <span className="opacity-40">•</span>
                        <span>
                          <b className="text-[var(--text-primary)]">{cluster.edgeCount}</b> fluxos
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="text-[#CCF352] font-bold">
                          {cluster.totalFieldsLinked} {cluster.totalFieldsLinked === 1 ? 'vínculo' : 'vínculos'}
                        </span>
                      </div>
                    </div>

                    {/* Principais documentos da cadeia */}
                    <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
                      {clusterNodes.slice(0, 4).map((doc) => (
                        <button
                          key={doc.docId}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFocusDoc(doc.docId);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl bg-[var(--dock-bg)]/60 hover:bg-[#CCF352]/15 border border-[var(--border-subtle)] hover:border-[#CCF352]/40 text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          title={`Focar no Doc ${doc.docId}`}
                        >
                          <span className="truncate text-[var(--text-primary)] font-medium">
                            <span className="font-mono font-bold text-[#CCF352] mr-1.5">{doc.docId}</span>
                            {doc.title}
                          </span>
                          <Focus size={11} className="text-[var(--text-muted)] shrink-0" />
                        </button>
                      ))}
                      {clusterNodes.length > 4 && (
                        <p className="text-[10.5px] text-[var(--text-muted)] px-1 pt-0.5">
                          + {clusterNodes.length - 4} outro(s) documento(s) nesta cadeia
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs font-semibold text-[#CCF352]">
                      <span>Explorar fluxo em colunas</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'columns' ? (
          <LineageColumnExplorer
            nodes={visibleNodes}
            edges={visibleEdges}
            focusDocId={focusDocId}
            isDark={isDark}
            onInspectNode={handleInspectNode}
            onInspectEdge={handleInspectEdge}
            onFocusDoc={handleSelectFocusDoc}
          />
        ) : (
          <LineageNetworkGraph
            nodes={visibleNodes}
            edges={visibleEdges}
            focusDocId={focusDocId}
            isDark={isDark}
            onInspectNode={handleInspectNode}
            onInspectEdge={handleInspectEdge}
            onFocusDoc={handleSelectFocusDoc}
          />
        )}
      </div>

      {/* 4. Drawer Lateral de Detalhamento de Campos, Regras e SQL */}
      <LineageDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        edgeDetails={selectedEdgeDetails}
        nodeDetails={selectedNodeDetails}
        onFocusDoc={handleSelectFocusDoc}
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
    <Suspense fallback={<div className="py-12 text-center text-xs text-[var(--text-muted)]">Carregando grafo de linhagem...</div>}>
      <LineageFlowContent />
    </Suspense>
  );
}
