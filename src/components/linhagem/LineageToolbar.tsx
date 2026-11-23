"use client";

import React from 'react';
import { Sparkles, RotateCcw, X, Globe2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineageToolbarProps {
  totalDocs: number;
  totalEdges: number;
  totalFieldsLinked: number;
  focusDocId: number | null;
  onSelectFocusDoc: (docId: number | null) => void;
  availableDocs: { id: number; title: string; totalLinks: number }[];
  onResetLayout: () => void;
  loading: boolean;
}

export function LineageToolbar({
  totalDocs,
  totalEdges,
  totalFieldsLinked,
  focusDocId,
  onSelectFocusDoc,
  availableDocs,
  onResetLayout,
  loading
}: LineageToolbarProps) {
  return (
    <div className="sylva-dock bg-[var(--dock-bg)]/80 border border-[var(--border-subtle)] rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 backdrop-blur-md">
      {/* Controles da Esquerda */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Toggle Modo Foco vs Modo Global */}
        <div className="flex items-center bg-[var(--card-bg)] p-1 rounded-full border border-[var(--border-subtle)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              if (!focusDocId && availableDocs.length > 0) {
                onSelectFocusDoc(availableDocs[0].id);
              }
            }}
            className={cn(
              "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer text-xs",
              focusDocId !== null
                ? "bg-[#CCF352] text-[#141312] shadow-2xs font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sparkles size={12} className={focusDocId !== null ? "text-[#141312]" : "text-[#CCF352]"} />
            <span>Modo Foco</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFocusDoc(null)}
            className={cn(
              "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer text-xs",
              focusDocId === null
                ? "bg-[#CCF352] text-[#141312] shadow-2xs font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Globe2 size={12} className={focusDocId === null ? "text-[#141312]" : "text-[#CCF352]"} />
            <span>Visão Global</span>
          </button>
        </div>

        {/* Dropdown de Seleção de Documento Raiz */}
        <div className="relative">
          <select
            value={focusDocId || ''}
            onChange={(e) => onSelectFocusDoc(e.target.value ? Number(e.target.value) : null)}
            className="text-xs bg-[var(--card-bg)] hover:bg-[var(--dock-bg)] border border-[var(--border-subtle)] rounded-full pl-3 pr-8 py-1.5 font-medium text-[var(--text-primary)] focus:outline-none focus:border-[#CCF352] shadow-2xs cursor-pointer max-w-[280px] md:max-w-[340px] truncate transition-colors"
          >
            <option value="">Todos os Documentos Conectados (Global)</option>
            {availableDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Doc {doc.id} — {doc.title} ({doc.totalLinks} links)
              </option>
            ))}
          </select>
        </div>

        {/* Tag de Foco Ativo com Botão Limpar */}
        {focusDocId && (
          <span className="px-3 py-1 rounded-full font-bold text-[11px] bg-[#CCF352]/10 text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205] border border-[#CCF352]/30 flex items-center gap-1.5 shadow-2xs">
            <span>Foco: <b>Doc {focusDocId}</b></span>
            <button 
              type="button" 
              onClick={() => onSelectFocusDoc(null)} 
              className="hover:text-[var(--text-primary)] rounded-full p-0.5 hover:bg-white/10 transition-colors cursor-pointer"
              title="Voltar para Visão Global"
            >
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      {/* Estatísticas e Ações da Direita */}
      <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
        {/* Contadores da Sessão */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#CCF352] animate-pulse" />
            <b className="text-[var(--text-primary)]">{totalDocs}</b> {totalDocs === 1 ? 'Doc' : 'Docs'}
          </span>
          <span className="text-[var(--text-muted)] opacity-40">•</span>
          <span>
            <b className="text-[var(--text-primary)]">{totalEdges}</b> {totalEdges === 1 ? 'Fluxo' : 'Fluxos'}
          </span>
          <span className="text-[var(--text-muted)] opacity-40">•</span>
          <span className="text-[#CCF352] font-bold">
            <b>{totalFieldsLinked}</b> Metadados
          </span>
        </div>

        {/* Botão de Centralizar / Reorganizar Layout */}
        <button
          type="button"
          onClick={onResetLayout}
          disabled={loading}
          className="py-1 px-3.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--dock-bg)] border border-[var(--border-subtle)] hover:border-[#CCF352]/40 rounded-full transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Reorganizar Nós e Centralizar Câmera"
        >
          <RotateCcw size={13} className={cn("text-[#CCF352]", loading && "animate-spin")} />
          <span>Centralizar</span>
        </button>
      </div>
    </div>
  );
}
