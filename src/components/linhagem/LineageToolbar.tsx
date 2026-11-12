"use client";

import React from 'react';
import { 
  Sparkles, Layers, Link2, Search, RotateCcw, 
  Maximize2, Database, SlidersHorizontal, ArrowRight, X,
  Globe2, ArrowRightLeft, Eye
} from 'lucide-react';
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
  const focusedDocObj = focusDocId ? availableDocs.find(d => d.id === focusDocId) : null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Controles da Esquerda */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Toggle Modo Foco vs Modo Global */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200 text-xs font-semibold">
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
                ? "bg-white text-sky-800 shadow-2xs border border-slate-200/70 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Sparkles size={12} className="text-sky-600" />
            <span>Modo Foco</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFocusDoc(null)}
            className={cn(
              "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer text-xs",
              focusDocId === null
                ? "bg-white text-slate-900 shadow-2xs border border-slate-200/70 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Globe2 size={12} className="text-emerald-600" />
            <span>Visão Global</span>
          </button>
        </div>

        {/* Dropdown de Seleção de Documento Raiz */}
        <div className="relative">
          <select
            value={focusDocId || ''}
            onChange={(e) => onSelectFocusDoc(e.target.value ? Number(e.target.value) : null)}
            className="text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-full pl-3 pr-8 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs cursor-pointer max-w-[280px] md:max-w-[340px] truncate transition-colors"
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
          <span className="px-3 py-1 rounded-full font-bold text-[11px] bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1.5 shadow-2xs">
            <span>Foco: <b>Doc {focusDocId}</b></span>
            <button 
              type="button" 
              onClick={() => onSelectFocusDoc(null)} 
              className="hover:text-sky-950 rounded-full p-0.5 hover:bg-sky-100 transition-colors cursor-pointer"
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
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <b>{totalDocs}</b> {totalDocs === 1 ? 'Doc' : 'Docs'}
          </span>
          <span className="text-slate-300">•</span>
          <span>
            <b>{totalEdges}</b> {totalEdges === 1 ? 'Fluxo' : 'Fluxos'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-sky-700 font-bold">
            <b>{totalFieldsLinked}</b> Metadados
          </span>
        </div>

        {/* Botão de Centralizar / Reorganizar Layout */}
        <button
          type="button"
          onClick={onResetLayout}
          disabled={loading}
          className="py-1 px-3.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Reorganizar Nós e Centralizar Câmera"
        >
          <RotateCcw size={13} className={cn("text-sky-600", loading && "animate-spin")} />
          <span>Centralizar</span>
        </button>
      </div>
    </div>
  );
}
