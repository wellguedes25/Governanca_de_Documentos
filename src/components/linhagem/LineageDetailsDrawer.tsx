"use client";

import React, { useState } from 'react';
import { 
  X, ArrowRight, Code2, Copy, Check, 
  Layers, ArrowDownLeft, ArrowUpRight,
  Search, AlertTriangle, RefreshCw, ShieldAlert, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface LineageDrawerFieldItem {
  sourceTag?: string;
  sourceName?: string;
  sourceFields?: Array<{ tag: string; name: string }>;
  targetTag: string;
  targetName: string;
  script: string;
  isDocLevel: boolean;
  linkKind?: 'CONTENT' | 'VALIDATION' | 'BROKEN';
}

export interface LineageEdgeDetails {
  id: string;
  sourceDocId: string;
  sourceDocTitle?: string;
  targetDocId: string;
  targetDocTitle?: string;
  totalFields: number;
  fieldsMap: LineageDrawerFieldItem[];
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
  selfFields?: LineageDrawerFieldItem[];
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
  onSelectEdge
}: LineageDetailsDrawerProps) {
  if (!isOpen) return null;

  const selectionKey = edgeDetails
    ? `edge:${edgeDetails.id}`
    : nodeDetails
      ? `node:${nodeDetails.docId}`
      : 'empty';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] md:w-[640px] sylva-glass bg-[var(--card-bg)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-[var(--text-primary)]">
      {/* Header do Drawer */}
      <div className="p-4 md:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--dock-bg)]/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
              edgeDetails?.isBroken || nodeDetails?.isBroken
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : edgeDetails?.isHybridV2 || nodeDetails?.isLegacyV2
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-[#CCF352]/10 text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205] border-[#CCF352]/30"
            )}>
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
          className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[#CCF352] hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Conteúdo do Drawer (chaveado pela seleção para resetar estado local sem useEffect) */}
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
  onSelectEdge
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
    <>
      {/* Conteúdo do Drawer */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 scrollbar-thin">
        {/* CASO 1: DETALHES DA ARESTA / FLUXO DE DEPENDÊNCIA */}
        {edgeDetails && (
          <div className="space-y-5">
            {edgeDetails.isBroken && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900">
                <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-rose-900">
                    Alerta de Governança Clínica: Referência Órfã Detectada
                  </p>
                  <p className="text-rose-800/90 leading-relaxed">
                    O script SQL executado no <b>Doc {edgeDetails.targetDocId}</b> referencia o código de documento{' '}
                    <code className="px-1.5 py-0.5 rounded bg-rose-100 font-mono font-bold">
                      CD_DOCUMENTO = {edgeDetails.sourceDocId}
                    </code>
                    , mas este documento não existe na base V3 (<code className="font-mono">EDITOR</code>) nem na base legada V2 (<code className="font-mono">DBAMV</code>).
                  </p>
                </div>
              </div>
            )}

            {/* Bloco de Origem ➔ Destino */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Documento Provedor</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                  {edgeDetails.totalFields} {edgeDetails.totalFields === 1 ? 'campo' : 'campos'}
                </span>
                <span>Documento Consumidor</span>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex-1 p-2.5 rounded-xl bg-white border shadow-2xs space-y-1",
                  edgeDetails.isBroken ? "border-rose-200 bg-rose-50/40" : "border-[#E0ECE9]"
                )}>
                  <span className={cn(
                    "font-mono text-[10px] font-bold block",
                    edgeDetails.isBroken ? "text-rose-700" : edgeDetails.isHybridV2 ? "text-amber-700" : "text-[#074E52]"
                  )}>
                    DOC {edgeDetails.sourceDocId}
                  </span>
                  <p className="font-bold text-[#0F2426] text-xs line-clamp-2" title={edgeDetails.sourceDocTitle}>
                    {edgeDetails.sourceDocTitle || `Documento ${edgeDetails.sourceDocId}`}
                  </p>
                </div>

                <div className={cn(
                  "p-2 rounded-full border shrink-0",
                  edgeDetails.isBroken
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-[#E6F4F1] text-[#074E52] border-[#CBE5DF]"
                )}>
                  <ArrowRight size={16} />
                </div>

                <div className="flex-1 p-2.5 rounded-xl bg-white border border-[#E0ECE9] shadow-2xs space-y-1">
                  <span className="font-mono text-[10px] font-bold text-[#074E52] block">
                    DOC {edgeDetails.targetDocId}
                  </span>
                  <p className="font-bold text-[#0F2426] text-xs line-clamp-2" title={edgeDetails.targetDocTitle}>
                    {edgeDetails.targetDocTitle || `Documento ${edgeDetails.targetDocId}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Campos Mapeados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[#0F2426] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-[#074E52]" />
                  Mapeamento Estrito de Campos ({edgeDetails.fieldsMap.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Clique no campo para ver o SQL
                </span>
              </div>

              <div className="space-y-1.5">
                {edgeDetails.fieldsMap.map((f, idx) => {
                  const isSelected = selectedFieldIdx === idx;
                  const multiCount = f.sourceFields?.length || 0;
                  const isMultiExpanded = Boolean(expandedMultiFields[idx]);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFieldIdx(idx)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer space-y-2",
                        f.linkKind === 'BROKEN'
                          ? isSelected
                            ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-200"
                            : "bg-rose-50/30 border-rose-200 hover:bg-rose-50/60"
                          : isSelected
                            ? "bg-[#E6F4F1]/60 border-[#074E52]/50 ring-1 ring-[#074E52]/15"
                            : "bg-white border-[#E0ECE9] hover:bg-[#F7FAF9] hover:border-[#CBE5DF]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Campo Alvo (Consumidor)
                            </span>
                            {f.linkKind === 'VALIDATION' && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold uppercase">
                                Validação
                              </span>
                            )}
                            {f.linkKind === 'BROKEN' && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-bold uppercase">
                                Quebrado
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 text-xs truncate" title={f.targetName}>
                            {f.targetName}
                          </p>
                          <code className="text-[10px] font-mono font-bold text-[#074E52] block">
                            {f.targetTag}
                          </code>
                        </div>

                        <div className="flex items-center self-center shrink-0 text-slate-400 px-1">
                          <ArrowRight size={14} />
                        </div>

                        <div className="space-y-0.5 flex-1 min-w-0 text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Campo Origem (Provedor)
                          </span>
                          <p className="font-semibold text-slate-800 text-xs truncate" title={f.sourceName || 'Auditoria Geral'}>
                            {f.sourceName || (f.isDocLevel ? 'Auditoria / Metadado' : 'Sem tag direta')}
                          </p>
                          <code className={cn(
                            "text-[10px] font-mono font-bold block truncate",
                            f.linkKind === 'BROKEN' ? "text-rose-700" : "text-emerald-700"
                          )}>
                            {f.sourceTag || (f.isDocLevel ? 'STATUS_FECHADO' : 'EXPRESSÃO SQL')}
                          </code>
                        </div>
                      </div>

                      {/* Lista expansível quando múltiplos campos alimentam 1 destino (N:1) */}
                      {multiCount > 1 && f.sourceFields && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={(e) => toggleMultiFields(idx, e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            <span>{multiCount} campos de origem consolidados</span>
                            {isMultiExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>

                          {isMultiExpanded && (
                            <div className="mt-2 p-2.5 rounded-xl bg-white border border-slate-200 grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                              {f.sourceFields.map((sf, sIdx) => (
                                <div key={sIdx} className="flex items-center justify-between gap-2 text-[10.5px] py-0.5 border-b border-slate-100 last:border-0">
                                  <span className="text-slate-700 font-medium truncate" title={sf.name}>
                                    {sf.name}
                                  </span>
                                  <code className="font-mono font-bold text-emerald-700 shrink-0 text-[10px]">
                                    {sf.tag}
                                  </code>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Snippet SQL Expandido se Selecionado */}
                      {isSelected && (
                        <div className="pt-2 border-t border-[#E0ECE9] space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                              <Code2 size={12} className="text-[#074E52]" />
                              Script SQL Executado (Propriedade 4)
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySql(f.script);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-[#F3F7F6] border border-[#D5E4E0] text-[#074E52] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
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
            {/* Identificação do Documento */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-2",
              nodeDetails.isBroken
                ? "bg-rose-50/60 border-rose-200"
                : "bg-slate-50 border-slate-200/80"
            )}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-mono font-bold border px-2 py-0.5 rounded-full",
                    nodeDetails.isBroken
                      ? "text-rose-800 bg-rose-100 border-rose-200"
                      : "text-[#074E52] bg-[#E6F4F1] border-[#CBE5DF]"
                  )}>
                    DOC {nodeDetails.docId}
                  </span>
                  {nodeDetails.tech && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border",
                      nodeDetails.isLegacyV2
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : nodeDetails.isBroken
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-white text-slate-600 border-slate-200"
                    )}>
                      {nodeDetails.tech}
                    </span>
                  )}
                </div>

                {nodeDetails.isBroken ? (
                  <span className="font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                    <AlertTriangle size={11} />
                    INEXISTENTE
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                    v{nodeDetails.version} {nodeDetails.versionType}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                {nodeDetails.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {nodeDetails.isBroken
                  ? 'Este código é citado em queries de outros documentos, mas não possui cadastro ativo no Oracle.'
                  : <>Total de metadados clínicos cadastrados neste layout: <b>{nodeDetails.totalFields} campos</b>.</>}
              </p>

              {onFocusDoc && (
                <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onFocusDoc(nodeDetails.docId);
                        onClose();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#074E52] hover:bg-[#053A3D] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
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
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-teal-600" />
                  Auto-Herança / Continuidade Clínica ({nodeDetails.selfFields.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Campos que herdam automaticamente valores de registros anteriores preenchidos neste mesmo documento.
                </p>
                <div className="space-y-1.5">
                  {nodeDetails.selfFields.map((sf, idx) => {
                    const isSelfExpanded = selectedSelfIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedSelfIdx(isSelfExpanded ? null : idx)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer space-y-2",
                          isSelfExpanded
                            ? "bg-teal-50/50 border-teal-300 ring-1 ring-teal-200"
                            : "bg-white border-slate-200 hover:border-teal-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate" title={sf.targetName}>
                              {sf.targetName}
                            </p>
                            <code className="text-[10px] font-mono font-bold text-teal-700">
                              {sf.targetTag}
                            </code>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold shrink-0">
                            {sf.sourceFields && sf.sourceFields.length > 1
                              ? `${sf.sourceFields.length} origens`
                              : sf.sourceTag || 'Histórico'}
                          </span>
                        </div>

                        {isSelfExpanded && (
                          <div className="pt-2 border-t border-slate-200/70 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <Code2 size={12} className="text-teal-600" />
                                Script SQL de Continuidade
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySql(sf.script);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                              >
                                {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
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

            {/* Documentos que Alimentam (Upstream) */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft size={14} className="text-emerald-600" />
                Origens de Dados (Upstream - {nodeDetails.upstreamEdges.length})
              </h4>
              {nodeDetails.upstreamEdges.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-100">
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
                        "w-full text-left p-3 rounded-xl bg-white border flex items-center justify-between text-xs transition-all cursor-pointer",
                        e.isBroken
                          ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                          : "border-[#E0ECE9] hover:border-[#074E52]/40 hover:bg-[#F3F7F6]/70"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <span className={cn(
                          "font-mono text-[10px] font-bold block",
                          e.isBroken ? "text-rose-600" : e.isHybridV2 ? "text-amber-700" : "text-slate-500"
                        )}>
                          DOC {e.sourceDocId} {e.isBroken ? '• QUEBRADO' : e.isHybridV2 ? '• V2' : ''}
                        </span>
                        <p className="font-bold text-[#0F2426] text-xs truncate" title={e.sourceDocTitle}>
                          {e.sourceDocTitle || `Documento ${e.sourceDocId}`}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#F3F7F6] border border-[#E0ECE9] text-slate-700 font-bold text-[10.5px] shrink-0">
                        {e.totalFields} {e.totalFields === 1 ? 'campo' : 'campos'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Documentos Alimentados (Downstream) */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#0F2426] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight size={14} className="text-[#074E52]" />
                Destinos de Dados (Downstream - {nodeDetails.downstreamEdges.length})
              </h4>
              {nodeDetails.downstreamEdges.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-[#F7FAF9] border border-[#E0ECE9]">
                  Nenhum documento posterior identificado consumindo dados deste layout.
                </p>
              ) : (
                <div className="space-y-2">
                  {nodeDetails.downstreamEdges.map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => onSelectEdge && onSelectEdge(e)}
                      className="w-full text-left p-3 rounded-xl bg-white border border-[#E0ECE9] flex items-center justify-between text-xs hover:border-[#074E52]/40 hover:bg-[#F3F7F6]/70 transition-all cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500 block">
                          DOC {e.targetDocId}
                        </span>
                        <p className="font-bold text-[#0F2426] text-xs truncate" title={e.targetDocTitle}>
                          {e.targetDocTitle || `Documento ${e.targetDocId}`}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#F3F7F6] border border-[#E0ECE9] text-slate-700 font-bold text-[10.5px] shrink-0">
                        {e.totalFields} {e.totalFields === 1 ? 'campo' : 'campos'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
