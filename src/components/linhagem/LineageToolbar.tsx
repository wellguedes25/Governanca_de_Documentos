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
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm p-4 space-y-3.5">
      {/* Top Badges & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10.5px] bg-slate-100 text-slate-700 border border-slate-200">
              Canvas Interativo React Flow
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10.5px] bg-sky-50 text-sky-800 border border-sky-200">
              Nível de Campo (Metadado)
            </span>
            {rootDocId && (
              <span className="px-2.5 py-0.5 rounded-full font-bold text-[10.5px] bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                Foco no Doc: <b>{rootDocId}</b>
                <button 
                  type="button" 
                  onClick={() => onSelectRootDoc(null)} 
                  className="hover:text-amber-950 ml-0.5"
                  title="Remover filtro de documento"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Grafo Global de Linhagem & Dependências
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Mapeamento em tempo real do fluxo de dados e dependências entre metadados.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-xs self-start lg:self-center">
          <div className="flex items-center gap-1.5 px-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
            <span className="font-semibold text-slate-700 text-[11px]">Herança Direta</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200" />
          <div className="flex items-center gap-1.5 px-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shadow-2xs" />
            <span className="font-semibold text-slate-700 text-[11px]">Consulta SQL</span>
          </div>
        </div>
      </div>

      {/* Action Row & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Counters Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <b>{totalDocs}</b> Documentos
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <b>{totalEdges}</b> vínculos
            </span>
          </div>

          {/* Root Doc Search Dropdown */}
          <div className="relative">
            <select
              value={rootDocId || ''}
              onChange={(e) => onSelectRootDoc(e.target.value || null)}
              className="text-xs bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs cursor-pointer max-w-[240px] truncate"
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
            className="p-1.5 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            title="Reorganizar Nós Automático (Esquerda para Direita)"
          >
            <RotateCcw size={13} />
            <span>Reorganizar</span>
          </button>
        </div>

        {/* View Mode Toggle (Apenas com Vínculos vs Todos os Campos) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold self-start md:self-center">
          <span className="text-[11px] text-slate-500 font-bold px-2">Visualização:</span>
          <button
            type="button"
            onClick={() => onToggleOnlyLinked(true)}
            className={cn(
              "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5",
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
              "px-3 py-1 rounded-lg transition-all flex items-center gap-1.5",
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
    </div>
  );
}
