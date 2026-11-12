"use client";

import React, { useState } from 'react';
import { 
  X, FileText, ArrowRight, Code2, Copy, Check, 
  ExternalLink, Layers, Database, ShieldCheck, Search,
  ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface LineageDrawerFieldItem {
  sourceTag?: string;
  sourceName?: string;
  targetTag: string;
  targetName: string;
  script: string;
  isDocLevel: boolean;
}

export interface LineageEdgeDetails {
  id: string;
  sourceDocId: string;
  sourceDocTitle?: string;
  targetDocId: string;
  targetDocTitle?: string;
  totalFields: number;
  fieldsMap: LineageDrawerFieldItem[];
}

export interface LineageNodeDetails {
  docId: number;
  title: string;
  version: number;
  versionType: string;
  totalFields: number;
  upstreamEdges: LineageEdgeDetails[];
  downstreamEdges: LineageEdgeDetails[];
}

interface LineageDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  edgeDetails?: LineageEdgeDetails | null;
  nodeDetails?: LineageNodeDetails | null;
  onFocusDoc?: (docId: number) => void;
}

export function LineageDetailsDrawer({
  isOpen,
  onClose,
  edgeDetails,
  nodeDetails,
  onFocusDoc
}: LineageDetailsDrawerProps) {
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Script SQL copiado com sucesso!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] md:w-[620px] bg-white border-l border-slate-200/90 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header do Drawer */}
      <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 uppercase tracking-wider">
              {edgeDetails ? 'Vínculo de Linhagem' : 'Metadados Clínicos'}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm md:text-base leading-tight">
            {edgeDetails ? 'Detalhamento de Fluxo e Dependência' : 'Dossiê do Documento Clínico'}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Conteúdo do Drawer */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 scrollbar-thin">
        {/* CASO 1: DETALHES DA ARESTA / FLUXO DE DEPENDÊNCIA */}
        {edgeDetails && (
          <div className="space-y-5">
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
                <div className="flex-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="font-mono text-[10px] font-bold text-sky-700 block">
                    DOC {edgeDetails.sourceDocId}
                  </span>
                  <p className="font-bold text-slate-800 text-xs line-clamp-2" title={edgeDetails.sourceDocTitle}>
                    {edgeDetails.sourceDocTitle || `Documento ${edgeDetails.sourceDocId}`}
                  </p>
                </div>

                <div className="p-2 rounded-full bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
                  <ArrowRight size={16} />
                </div>

                <div className="flex-1 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="font-mono text-[10px] font-bold text-sky-700 block">
                    DOC {edgeDetails.targetDocId}
                  </span>
                  <p className="font-bold text-slate-800 text-xs line-clamp-2" title={edgeDetails.targetDocTitle}>
                    {edgeDetails.targetDocTitle || `Documento ${edgeDetails.targetDocId}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Campos Mapeados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-sky-600" />
                  Mapeamento Estrito de Campos ({edgeDetails.fieldsMap.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Clique no campo para ver o SQL
                </span>
              </div>

              <div className="space-y-1.5">
                {edgeDetails.fieldsMap.map((f, idx) => {
                  const isSelected = selectedFieldIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFieldIdx(idx)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer space-y-2",
                        isSelected
                          ? "bg-sky-50/50 border-sky-300 ring-1 ring-sky-200"
                          : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Campo Alvo (Consumidor)
                          </span>
                          <p className="font-semibold text-slate-800 text-xs truncate" title={f.targetName}>
                            {f.targetName}
                          </p>
                          <code className="text-[10px] font-mono font-bold text-sky-800 block">
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
                          <code className="text-[10px] font-mono font-bold text-emerald-700 block">
                            {f.sourceTag || (f.isDocLevel ? 'STATUS_FECHADO' : 'EXPRESSÃO SQL')}
                          </code>
                        </div>
                      </div>

                      {/* Snippet SQL Expandido se Selecionado */}
                      {isSelected && (
                        <div className="pt-2 border-t border-slate-200/70 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                              <Code2 size={12} className="text-sky-600" />
                              Script SQL Executado (Propriedade 4)
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySql(f.script);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>

                          <pre className="p-3 rounded-xl bg-slate-900 text-sky-200 font-mono text-[10.5px] leading-relaxed overflow-x-auto max-h-56 scrollbar-thin select-all">
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
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  DOC {nodeDetails.docId}
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                  v{nodeDetails.version} {nodeDetails.versionType}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                {nodeDetails.title}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Total de metadados clínicos cadastrados neste layout: <b>{nodeDetails.totalFields} campos</b>.
              </p>

              {onFocusDoc && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onFocusDoc(nodeDetails.docId);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Search size={13} />
                    <span>Definir como Foco Principal do Grafo</span>
                  </button>
                </div>
              )}
            </div>

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
                    <div 
                      key={e.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500 block">
                          DOC {e.sourceDocId}
                        </span>
                        <p className="font-bold text-slate-800 text-xs truncate" title={e.sourceDocTitle}>
                          {e.sourceDocTitle || `Documento ${e.sourceDocId}`}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px] shrink-0">
                        {e.totalFields} {e.totalFields === 1 ? 'campo' : 'campos'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documentos Alimentados (Downstream) */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight size={14} className="text-sky-600" />
                Destinos de Dados (Downstream - {nodeDetails.downstreamEdges.length})
              </h4>
              {nodeDetails.downstreamEdges.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-100">
                  Nenhum documento posterior identificado consumindo dados deste layout.
                </p>
              ) : (
                <div className="space-y-2">
                  {nodeDetails.downstreamEdges.map((e) => (
                    <div 
                      key={e.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500 block">
                          DOC {e.targetDocId}
                        </span>
                        <p className="font-bold text-slate-800 text-xs truncate" title={e.targetDocTitle}>
                          {e.targetDocTitle || `Documento ${e.targetDocId}`}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px] shrink-0">
                        {e.totalFields} {e.totalFields === 1 ? 'campo' : 'campos'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
