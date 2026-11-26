"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Columns3,
  Network,
  RotateCw,
  Search,
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  LineageAvailableDoc,
  LineageClusterSummary,
  LineageDepth,
} from '@/types/lineage.types';

export type LineageViewMode = 'columns' | 'network';

interface LineageToolbarProps {
  viewMode: LineageViewMode;
  onChangeViewMode: (mode: LineageViewMode) => void;
  totalDocs: number;
  totalEdges: number;
  totalFieldsLinked: number;
  totalClusters: number;
  focusDocId: number | null;
  onSelectFocusDoc: (docId: number | null) => void;
  depth: LineageDepth;
  onChangeDepth: (depth: LineageDepth) => void;
  availableDocs: LineageAvailableDoc[];
  clusters: LineageClusterSummary[];
  selectedClusterId: number | null;
  onSelectCluster: (clusterId: number | null) => void;
  showActions: boolean;
  onToggleActions: () => void;
  showRules: boolean;
  onToggleRules: () => void;
  showBroken: boolean;
  onToggleBroken: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function LineageToolbar({
  viewMode,
  onChangeViewMode,
  totalDocs,
  totalEdges,
  totalFieldsLinked,
  totalClusters,
  focusDocId,
  onSelectFocusDoc,
  depth,
  onChangeDepth,
  availableDocs,
  clusters,
  selectedClusterId,
  onSelectCluster,
  showActions,
  onToggleActions,
  showRules,
  onToggleRules,
  showBroken,
  onToggleBroken,
  onRefresh,
  loading,
}: LineageToolbarProps) {
  const [searchText, setSearchText] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement | null>(null);

  const selectedDoc = useMemo(
    () => (focusDocId !== null ? availableDocs.find((d) => d.id === focusDocId) || null : null),
    [availableDocs, focusDocId]
  );

  const filteredDocs = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return availableDocs.slice(0, 40);
    return availableDocs
      .filter(
        (d) =>
          String(d.id).includes(q) ||
          d.title.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [availableDocs, searchText]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="sylva-dock bg-[var(--dock-bg)]/85 border border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xs space-y-3 backdrop-blur-md relative z-30">
      {/* Linha Principal de Controles */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Esquerda: Modo Visual + Busca Rápida + Profundidade */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Toggle Colunas vs Rede */}
          <div className="flex items-center bg-[var(--card-bg)] p-1 rounded-full border border-[var(--border-subtle)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => onChangeViewMode('columns')}
              className={cn(
                'px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer text-xs',
                viewMode === 'columns'
                  ? 'bg-[#CCF352] text-[#141312] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Columns3 size={13} />
              <span>Fluxo em Colunas</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('network')}
              className={cn(
                'px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer text-xs',
                viewMode === 'network'
                  ? 'bg-[#CCF352] text-[#141312] shadow-2xs font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Network size={13} />
              <span>Mapa em Rede</span>
            </button>
          </div>

          {/* Combobox Pesquisável de Documento */}
          <div ref={comboRef} className="relative">
            <div className="flex items-center bg-[var(--card-bg)] border border-[var(--border-subtle)] focus-within:border-[#CCF352] rounded-full pl-3 pr-2 py-1 text-xs shadow-2xs min-w-[260px] sm:min-w-[320px]">
              <Search size={13} className="text-[var(--text-muted)] shrink-0 mr-2" />
              <input
                type="text"
                value={
                  dropdownOpen
                    ? searchText
                    : selectedDoc
                      ? `Doc ${selectedDoc.id} — ${selectedDoc.title}`
                      : ''
                }
                placeholder="Buscar documento por código ou nome..."
                onFocus={() => {
                  setDropdownOpen(true);
                  setSearchText('');
                }}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setDropdownOpen(true);
                }}
                className="bg-transparent w-full text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none truncate"
              />
              {focusDocId !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectFocusDoc(null);
                    setSearchText('');
                    setDropdownOpen(false);
                  }}
                  className="p-0.5 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer ml-1"
                  title="Limpar foco e voltar às cadeias"
                >
                  <X size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="p-0.5 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] cursor-pointer ml-1"
                >
                  <ChevronDown size={13} />
                </button>
              )}
            </div>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-[360px] max-w-[90vw] max-h-72 overflow-y-auto scrollbar-thin rounded-2xl bg-[var(--card-solid)] border border-[var(--border-strong)] shadow-2xl p-1.5 z-50 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectFocusDoc(null);
                    setDropdownOpen(false);
                    setSearchText('');
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer',
                    focusDocId === null
                      ? 'bg-[#CCF352]/15 text-[#CCF352]'
                      : 'hover:bg-[var(--card-hover)] text-[var(--text-primary)]'
                  )}
                >
                  <span>Visão de Cadeias / Global</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{availableDocs.length} docs</span>
                </button>

                <div className="h-px bg-[var(--border-subtle)] my-1" />

                {filteredDocs.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">
                    Nenhum documento encontrado para &ldquo;{searchText}&rdquo;.
                  </p>
                ) : (
                  filteredDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        onSelectFocusDoc(doc.id);
                        setDropdownOpen(false);
                        setSearchText('');
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2',
                        focusDocId === doc.id
                          ? 'bg-[#CCF352]/15 text-[#CCF352]'
                          : 'hover:bg-[var(--card-hover)] text-[var(--text-primary)]'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[10.5px]">DOC {doc.id}</span>
                          {doc.isBroken && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tone-danger border">
                              Quebrado
                            </span>
                          )}
                          {doc.isLegacyV2 && !doc.isBroken && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tone-warning border">
                              V2
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">{doc.title}</p>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                        {doc.upstreamCount}↓ {doc.downstreamCount}↑
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Seletor de Profundidade (quando há Foco) */}
          {focusDocId !== null && (
            <div className="flex items-center bg-[var(--card-bg)] p-1 rounded-full border border-[var(--border-subtle)] text-[11px] font-semibold">
              {(
                [
                  { value: 1, label: '1 nível' },
                  { value: 2, label: '2 níveis' },
                  { value: 'all', label: 'Cadeia completa' },
                ] as const
              ).map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => onChangeDepth(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full transition-all cursor-pointer',
                    depth === opt.value
                      ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direita: Filtros de Origem + Estatísticas + Atualizar */}
        <div className="flex items-center gap-2 flex-wrap justify-between xl:justify-end">
          {/* Filtros de Origem */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleActions}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer',
                showActions
                  ? 'tone-success'
                  : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
              )}
              title="Exibir ou ocultar vínculos originados em Ações SQL de campos"
            >
              <Zap size={11} />
              <span>Ações SQL</span>
            </button>

            <button
              type="button"
              onClick={onToggleRules}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer',
                showRules
                  ? 'tone-info'
                  : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
              )}
              title="Exibir ou ocultar vínculos originados em Regras SQL de documentos"
            >
              <ShieldCheck size={11} />
              <span>Regras SQL</span>
            </button>

            <button
              type="button"
              onClick={onToggleBroken}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer',
                showBroken
                  ? 'tone-danger'
                  : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
              )}
              title="Exibir ou ocultar referências quebradas (documentos inexistentes)"
            >
              <AlertTriangle size={11} />
              <span>Quebrados</span>
            </button>
          </div>

          {/* Contadores */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#CCF352]" />
              <b className="text-[var(--text-primary)]">{totalDocs}</b> {totalDocs === 1 ? 'Doc' : 'Docs'}
            </span>
            <span className="opacity-40">•</span>
            <span>
              <b className="text-[var(--text-primary)]">{totalEdges}</b> {totalEdges === 1 ? 'Fluxo' : 'Fluxos'}
            </span>
            <span className="opacity-40">•</span>
            <span className="text-[#CCF352] font-bold">
              <b>{totalFieldsLinked}</b> Vínculos
            </span>
            {focusDocId === null && (
              <>
                <span className="opacity-40">•</span>
                <span>
                  <b className="text-[var(--text-primary)]">{totalClusters}</b>{' '}
                  {totalClusters === 1 ? 'Cadeia' : 'Cadeias'}
                </span>
              </>
            )}
          </div>

          {/* Atualizar do Oracle */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="py-1 px-3.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] hover:border-[#CCF352]/40 rounded-full transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Recarregar Linhagem Diretamente do Oracle"
          >
            <RotateCw size={13} className={cn('text-[#CCF352]', loading && 'animate-spin')} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Faixa de Cadeias / Clusters (quando sem foco e > 1 cluster) */}
      {focusDocId === null && clusters.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-2 border-t border-[var(--border-subtle)] pb-0.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 shrink-0 mr-1">
            <GitBranch size={12} className="text-[#CCF352]" />
            Cadeias:
          </span>

          <button
            type="button"
            onClick={() => onSelectCluster(null)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 transition-all cursor-pointer',
              selectedClusterId === null
                ? 'bg-[#CCF352] text-[#141312] border-transparent font-bold'
                : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Todas ({clusters.length})
          </button>

          {clusters.map((c) => (
            <button
              key={c.clusterId}
              type="button"
              onClick={() => onSelectCluster(selectedClusterId === c.clusterId ? null : c.clusterId)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 flex items-center gap-1.5 transition-all cursor-pointer',
                selectedClusterId === c.clusterId
                  ? 'bg-[#CCF352] text-[#141312] border-transparent font-bold'
                  : 'bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#CCF352]/40'
              )}
              title={`${c.docCount} documentos · ${c.edgeCount} fluxos · ${c.totalFieldsLinked} vínculos`}
            >
              {c.hasBroken && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Contém vínculo quebrado" />
              )}
              <span className="truncate max-w-[200px]">{c.label}</span>
              <span className="opacity-70 text-[10px]">({c.docCount})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
