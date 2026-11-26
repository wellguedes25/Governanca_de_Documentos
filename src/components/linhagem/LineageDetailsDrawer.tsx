"use client";

import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { LineageFieldItem } from '@/types/lineage.types';

export type LineageDrawerFieldItem = LineageFieldItem;

export interface LineageEdgeDetails {
  id: string;
  sourceDocId: string;
  sourceDocTitle?: string;
  targetDocId: string;
  targetDocTitle?: string;
  totalFields: number;
  fieldsMap: LineageFieldItem[];
  isHybridV2?: boolean;
  isBroken?: boolean;
}

export interface LineageNodeDetails {
  docId: number;
  title: string;
  version: number;
  versionType: string;
  tech?: string;
  totalFields: number;
  isLegacyV2?: boolean;
  isBroken?: boolean;
  selfFields?: LineageFieldItem[];
  upstreamEdges: LineageEdgeDetails[];
  downstreamEdges: LineageEdgeDetails[];
}

interface LineageDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  edgeDetails?: LineageEdgeDetails | null;
  nodeDetails?: LineageNodeDetails | null;
  onFocusDoc?: (docId: number) => void;
  onSelectEdge?: (edge: LineageEdgeDetails) => void;
}

export function LineageDetailsDrawer({
  isOpen,
  onClose,
  edgeDetails,
  nodeDetails,
  onFocusDoc,
  onSelectEdge,
}: LineageDetailsDrawerProps) {
  if (!isOpen) return null;

  const selectionKey = edgeDetails
    ? `edge:${edgeDetails.id}`
    : nodeDetails
      ? `node:${nodeDetails.docId}`
      : 'empty';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] md:w-[640px] sylva-glass bg-[var(--card-solid)] border-l border-[var(--border-strong)] shadow-2xl flex flex-col sylva-drawer-in text-[var(--text-primary)]">
      {/* Header do Drawer */}
      <div className="p-4 md:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--dock-bg)]/90">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                edgeDetails?.isBroken || nodeDetails?.isBroken
                  ? 'tone-danger'
                  : edgeDetails?.isHybridV2 || nodeDetails?.isLegacyV2
                    ? 'tone-warning'
                    : 'tone-success'
              )}
            >
              {edgeDetails
                ? edgeDetails.isBroken
                  ? 'Vínculo Quebrado (Auditoria)'
                  : edgeDetails.isHybridV2
                    ? 'Vínculo Híbrido V2 ➔ V3'
                    : 'Vínculo de Linhagem'
                : nodeDetails?.isBroken
                  ? 'Documento Inexistente'
                  : 'Metadados Clínicos'}
            </span>
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base leading-tight">
            {edgeDetails ? 'Detalhamento de Fluxo e Dependência' : 'Dossiê do Documento Clínico'}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[#CCF352] hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <LineageDrawerBody
        key={selectionKey}
        onClose={onClose}
        edgeDetails={edgeDetails}
        nodeDetails={nodeDetails}
        onFocusDoc={onFocusDoc}
        onSelectEdge={onSelectEdge}
      />
    </div>
  );
}

function LineageDrawerBody({
  onClose,
  edgeDetails,
  nodeDetails,
  onFocusDoc,
  onSelectEdge,
}: Omit<LineageDetailsDrawerProps, 'isOpen'>) {
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(0);
  const [selectedSelfIdx, setSelectedSelfIdx] = useState<number | null>(null);
  const [expandedMultiFields, setExpandedMultiFields] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const handleCopySql = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Script SQL copiado com sucesso!');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMultiFields = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMultiFields((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 scrollbar-thin">
      {/* CASO 1: DETALHES DA ARESTA / FLUXO DE DEPENDÊNCIA */}
      {edgeDetails && (
        <div className="space-y-5">
          {edgeDetails.isBroken && (
            <div className="p-3.5 rounded-2xl tone-danger border flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold">Alerta de Governança Clínica: Referência Órfã Detectada</p>
                <p className="opacity-90 leading-relaxed">
                  O script SQL executado no <b>Doc {edgeDetails.targetDocId}</b> referencia{' '}
                  <code className="px-1.5 py-0.5 rounded bg-black/15 font-mono font-bold">
                    CD_DOCUMENTO = {edgeDetails.sourceDocId}
                  </code>
                  , mas este documento não existe na base V3 (<code className="font-mono">EDITOR</code>) nem na base
                  legada V2 (<code className="font-mono">DBAMV</code>).
                </p>
              </div>
            </div>
          )}

          {/* Bloco de Origem ➔ Destino */}
          <div className="p-4 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold">
              <span>Documento Provedor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full tone-neutral border">
                {edgeDetails.totalFields} {edgeDetails.totalFields === 1 ? 'vínculo' : 'vínculos'}
              </span>
              <span>Documento Consumidor</span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex-1 p-2.5 rounded-xl bg-[var(--card-bg)] border shadow-2xs space-y-1',
                  edgeDetails.isBroken ? 'border-rose-500/40' : 'border-[var(--border-subtle)]'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[10px] font-bold block',
                    edgeDetails.isBroken
                      ? 'text-rose-400'
                      : edgeDetails.isHybridV2
                        ? 'text-amber-400'
                        : 'text-[#CCF352]'
                  )}
                >
                  DOC {edgeDetails.sourceDocId}
                </span>
                <p className="font-bold text-[var(--text-primary)] text-xs line-clamp-2" title={edgeDetails.sourceDocTitle}>
                  {edgeDetails.sourceDocTitle || `Documento ${edgeDetails.sourceDocId}`}
                </p>
              </div>

              <div
                className={cn(
                  'p-2 rounded-full border shrink-0',
                  edgeDetails.isBroken ? 'tone-danger' : 'tone-success'
                )}
              >
                <ArrowRight size={16} />
              </div>

              <div className="flex-1 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-2xs space-y-1">
                <span className="font-mono text-[10px] font-bold text-[#CCF352] block">
                  DOC {edgeDetails.targetDocId}
                </span>
                <p className="font-bold text-[var(--text-primary)] text-xs line-clamp-2" title={edgeDetails.targetDocTitle}>
                  {edgeDetails.targetDocTitle || `Documento ${edgeDetails.targetDocId}`}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Campos / Regras Mapeados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[#CCF352]" />
                Mapeamento Estrito ({edgeDetails.fieldsMap.length})
              </h4>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                Clique no item para ver o SQL
              </span>
            </div>

            <div className="space-y-2">
              {edgeDetails.fieldsMap.map((f, idx) => {
                const isSelected = selectedFieldIdx === idx;
                const multiCount = f.sourceFields?.length || 0;
                const isMultiExpanded = Boolean(expandedMultiFields[idx]);
                const isRule = f.originKind === 'DOC_RULE';

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedFieldIdx(idx)}
                    className={cn(
                      'p-3 rounded-xl border transition-all cursor-pointer space-y-2',
                      f.linkKind === 'BROKEN'
                        ? isSelected
                          ? 'bg-rose-500/15 border-rose-500/50'
                          : 'bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10'
                        : isSelected
                          ? 'bg-[#CCF352]/10 border-[#CCF352]/50'
                          : 'bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-[#CCF352]/35'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                            Alvo (Consumidor)
                          </span>
                          {isRule ? (
                            <span className="px-1.5 py-0.5 rounded tone-info border text-[9px] font-bold uppercase flex items-center gap-1">
                              <ShieldCheck size={9} />
                              Regra SQL{f.ruleType ? ` · ${f.ruleType}` : ''}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded tone-success border text-[9px] font-bold uppercase flex items-center gap-1">
                              <Zap size={9} />
                              Ação SQL
                            </span>
                          )}
                          {f.linkKind === 'VALIDATION' && (
                            <span className="px-1.5 py-0.5 rounded tone-neutral border text-[9px] font-bold uppercase">
                              Validação
                            </span>
                          )}
                          {f.linkKind === 'BROKEN' && (
                            <span className="px-1.5 py-0.5 rounded tone-danger border text-[9px] font-bold uppercase">
                              Quebrado
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-[var(--text-primary)] text-xs truncate" title={f.targetName}>
                          {f.targetName}
                        </p>
                        <code className="text-[10px] font-mono font-bold text-[#CCF352] block truncate">
                          {f.targetTag}
                          {isRule && f.ruleName && f.ruleName !== f.targetTag ? ` (${f.ruleName})` : ''}
                        </code>
                      </div>

                      <div className="flex items-center self-center shrink-0 text-[var(--text-muted)] px-1">
                        <ArrowRight size={14} />
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0 text-right">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] block uppercase">
                          Origem (Provedor)
                        </span>
                        <p className="font-semibold text-[var(--text-primary)] text-xs truncate" title={f.sourceName || 'Auditoria Geral'}>
                          {f.sourceName || (f.isDocLevel ? 'Auditoria / Metadado' : 'Sem tag direta')}
                        </p>
                        <code
                          className={cn(
                            'text-[10px] font-mono font-bold block truncate',
                            f.linkKind === 'BROKEN' ? 'text-rose-400' : 'text-emerald-400'
                          )}
                        >
                          {f.sourceTag || (f.isDocLevel ? 'STATUS_FECHADO' : 'EXPRESSÃO SQL')}
                        </code>
                      </div>
                    </div>

                    {multiCount > 1 && f.sourceFields && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => toggleMultiFields(idx, e)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full tone-success border text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <span>{multiCount} campos de origem consolidados</span>
                          {isMultiExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>

                        {isMultiExpanded && (
                          <div className="mt-2 p-2.5 rounded-xl bg-[var(--dock-bg)] border border-[var(--border-subtle)] grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                            {f.sourceFields.map((sf, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-center justify-between gap-2 text-[10.5px] py-0.5 border-b border-[var(--border-subtle)] last:border-0"
                              >
                                <span className="text-[var(--text-secondary)] font-medium truncate" title={sf.name}>
                                  {sf.name}
                                </span>
                                <code className="font-mono font-bold text-emerald-400 shrink-0 text-[10px]">
                                  {sf.tag}
                                </code>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {isSelected && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2 sylva-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                            <Code2 size={12} className="text-[#CCF352]" />
                            {isRule
                              ? `Script SQL da Regra (${f.ruleName || f.targetTag})`
                              : 'Script SQL Executado (Propriedade 4)'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySql(f.script);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--dock-bg)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>

                        <pre className="p-3 rounded-xl bg-[#09181A] border border-[#16383B] text-emerald-200 font-mono text-[10.5px] leading-relaxed overflow-x-auto max-h-56 scrollbar-thin select-all">
                          {f.script}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CASO 2: DETALHES DE UM DOCUMENTO SELECIONADO */}
      {nodeDetails && !edgeDetails && (
        <div className="space-y-6">
          <div
            className={cn(
              'p-4 rounded-2xl border space-y-2',
              nodeDetails.isBroken
                ? 'bg-rose-500/10 border-rose-500/35'
                : 'bg-[var(--card-subtle)] border-[var(--border-subtle)]'
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'font-mono font-bold border px-2 py-0.5 rounded-full',
                    nodeDetails.isBroken ? 'tone-danger' : 'tone-success'
                  )}
                >
                  DOC {nodeDetails.docId}
                </span>
                {nodeDetails.tech && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border',
                      nodeDetails.isLegacyV2
                        ? 'tone-warning'
                        : nodeDetails.isBroken
                          ? 'tone-danger'
                          : 'tone-neutral'
                    )}
                  >
                    {nodeDetails.tech}
                  </span>
                )}
              </div>

              {nodeDetails.isBroken ? (
                <span className="font-bold tone-danger border px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                  <AlertTriangle size={11} />
                  INEXISTENTE
                </span>
              ) : (
                <span className="font-bold tone-success border px-2 py-0.5 rounded-full text-[10px]">
                  v{nodeDetails.version || 1} {nodeDetails.versionType}
                </span>
              )}
            </div>
            <h4 className="font-bold text-[var(--text-primary)] text-sm leading-snug">{nodeDetails.title}</h4>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {nodeDetails.isBroken ? (
                'Este código é citado em queries de outros documentos, mas não possui cadastro ativo no Oracle.'
              ) : (
                <>
                  Total de metadados clínicos cadastrados neste layout:{' '}
                  <b className="text-[var(--text-primary)]">{nodeDetails.totalFields} campos</b>.
                </>
              )}
            </p>

            {onFocusDoc && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onFocusDoc(nodeDetails.docId);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl sylva-lime-btn font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Search size={13} />
                  <span>Definir como Foco Principal do Grafo</span>
                </button>
              </div>
            )}
          </div>

          {/* Auto-Herança / Continuidade Clínica */}
          {nodeDetails.selfFields && nodeDetails.selfFields.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw size={14} className="text-[#CCF352]" />
                Auto-Herança / Continuidade Clínica ({nodeDetails.selfFields.length})
              </h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Campos ou regras que herdam automaticamente valores de registros anteriores preenchidos neste mesmo
                documento.
              </p>
              <div className="space-y-1.5">
                {nodeDetails.selfFields.map((sf, idx) => {
                  const isSelfExpanded = selectedSelfIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedSelfIdx(isSelfExpanded ? null : idx)}
                      className={cn(
                        'p-3 rounded-xl border transition-all cursor-pointer space-y-2',
                        isSelfExpanded
                          ? 'bg-[#CCF352]/10 border-[#CCF352]/50'
                          : 'bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-[#CCF352]/35'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate" title={sf.targetName}>
                            {sf.targetName}
                          </p>
                          <code className="text-[10px] font-mono font-bold text-[#CCF352]">{sf.targetTag}</code>
                        </div>
                        <span className="px-2 py-0.5 rounded-full tone-success border text-[10px] font-bold shrink-0">
                          {sf.sourceFields && sf.sourceFields.length > 1
                            ? `${sf.sourceFields.length} origens`
                            : sf.sourceTag || 'Histórico'}
                        </span>
                      </div>

                      {isSelfExpanded && (
                        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                              <Code2 size={12} className="text-[#CCF352]" />
                              Script SQL de Continuidade
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySql(sf.script);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--dock-bg)] hover:bg-[var(--card-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                            >
                              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                          <pre className="p-3 rounded-xl bg-[#09181A] border border-[#16383B] text-emerald-200 font-mono text-[10.5px] leading-relaxed overflow-x-auto max-h-48 scrollbar-thin select-all">
                            {sf.script}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Origens de Dados (Upstream) */}
          <div className="space-y-2">
            <h4 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft size={14} className="text-[#CCF352]" />
              Origens de Dados (Upstream - {nodeDetails.upstreamEdges.length})
            </h4>
            {nodeDetails.upstreamEdges.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic p-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-subtle)]">
                Nenhum documento prévio identificado alimentando este layout.
              </p>
            ) : (
              <div className="space-y-2">
                {nodeDetails.upstreamEdges.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => onSelectEdge && onSelectEdge(e)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl bg-[var(--card-bg)] border flex items-center justify-between text-xs transition-all cursor-pointer',
                      e.isBroken
                        ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
                        : 'border-[var(--border-subtle)] hover:border-[#CCF352]/40 hover:bg-[var(--card-hover)]'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <span
                        className={cn(
                          'font-mono text-[10px] font-bold block',
                          e.isBroken ? 'text-rose-400' : e.isHybridV2 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                        )}
                      >
                        DOC {e.sourceDocId} {e.isBroken ? '• QUEBRADO' : e.isHybridV2 ? '• V2' : ''}
                      </span>
                      <p className="font-bold text-[var(--text-primary)] text-xs truncate" title={e.sourceDocTitle}>
                        {e.sourceDocTitle || `Documento ${e.sourceDocId}`}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full tone-neutral border font-bold text-[10.5px] shrink-0">
                      {e.totalFields} {e.totalFields === 1 ? 'vínculo' : 'vínculos'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destinos de Dados (Downstream) */}
          <div className="space-y-2">
            <h4 className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-sky-400" />
              Destinos de Dados (Downstream - {nodeDetails.downstreamEdges.length})
            </h4>
            {nodeDetails.downstreamEdges.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic p-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-subtle)]">
                Nenhum documento posterior identificado consumindo dados deste layout.
              </p>
            ) : (
              <div className="space-y-2">
                {nodeDetails.downstreamEdges.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => onSelectEdge && onSelectEdge(e)}
                    className="w-full text-left p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex items-center justify-between text-xs hover:border-[#CCF352]/40 hover:bg-[var(--card-hover)] transition-all cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] block">
                        DOC {e.targetDocId}
                      </span>
                      <p className="font-bold text-[var(--text-primary)] text-xs truncate" title={e.targetDocTitle}>
                        {e.targetDocTitle || `Documento ${e.targetDocId}`}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full tone-neutral border font-bold text-[10.5px] shrink-0">
                      {e.totalFields} {e.totalFields === 1 ? 'vínculo' : 'vínculos'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
