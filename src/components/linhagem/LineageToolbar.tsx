"use client";

import React from 'react';
import { 
  Sparkles, Layers, Link2, Search, RotateCcw, 
  Maximize2, Database, SlidersHorizontal, ArrowRight, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineageToolbarProps {
  totalDocs: number;
  totalEdges: number;
  onlyLinked: boolean;
  onToggleOnlyLinked: (val: boolean) => void;
  rootDocId: string | null;
  onSelectRootDoc: (docId: string | null) => void;
  availableDocs: { id: number; title: string }[];
  onResetLayout: () => void;
  loading: boolean;
}

export function LineageToolbar({
  totalDocs,
  totalEdges,
  onlyLinked,
  onToggleOnlyLinked,
  rootDocId,
  onSelectRootDoc,
  availableDocs,
  onResetLayout,
  loading
}: LineageToolbarProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Action Row & Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pills de Tags / Modos */}
        <span className="px-2.5 py-1 rounded-full font-bold text-[10.5px] bg-slate-100 text-slate-700 border border-slate-200">
          Canvas Interativo
        </span>
        <span className="px-2.5 py-1 rounded-full font-bold text-[10.5px] bg-sky-50 text-sky-800 border border-sky-200">
          Metadados
        </span>

        {rootDocId && (
          <span className="px-2.5 py-1 rounded-full font-bold text-[10.5px] bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <span>Foco no Doc: <b>{rootDocId}</b></span>
            <button 
              type="button" 
              onClick={() => onSelectRootDoc(null)} 
              className="hover:text-amber-950 ml-0.5 rounded-full p-0.5 hover:bg-amber-100"
              title="Remover foco de documento"
            >
              <X size={12} />
            </button>
          </span>
        )}

        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Counters Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <b>{totalDocs}</b> Documentos
          </span>
          <span className="text-slate-300">•</span>
          <span>
            <b>{totalEdges}</b> Vínculos
          </span>
        </div>

        {/* Root Doc Search Dropdown */}
        <div className="relative">
          <select
            value={rootDocId || ''}
            onChange={(e) => onSelectRootDoc(e.target.value || null)}
            className="text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-full pl-3 pr-8 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs cursor-pointer max-w-[240px] truncate transition-colors"
          >
            <option value="">Todos os Documentos Conectados</option>
            {availableDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Doc {doc.id} — {doc.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onResetLayout}
          disabled={loading}
          className="py-1.5 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Reorganizar Nós Automático (Esquerda para Direita)"
        >
          <RotateCcw size={13} className={cn("text-sky-600", loading && "animate-spin")} />
          <span>Reorganizar</span>
        </button>
      </div>

      {/* View Mode Toggle (Apenas com Vínculos vs Todos os Campos) */}
      <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/80 text-xs font-semibold self-start md:self-center shrink-0">
        <span className="text-[11px] text-slate-500 font-bold px-2.5">Exibir:</span>
        <button
          type="button"
          onClick={() => onToggleOnlyLinked(true)}
          className={cn(
            "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 text-xs cursor-pointer",
            onlyLinked
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Link2 size={13} className="text-emerald-600" />
          <span>Apenas com Vínculos</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleOnlyLinked(false)}
          className={cn(
            "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 text-xs cursor-pointer",
            !onlyLinked
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Layers size={13} />
          <span>Todos os Campos</span>
        </button>
      </div>
    </div>
  );
}

