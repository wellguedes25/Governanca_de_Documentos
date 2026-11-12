"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Search, Eye, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DocumentNodeData {
  docId: number;
  title: string;
  version: number;
  versionType: string;
  tech?: string;
  totalFields: number;
  upstreamCount: number;
  downstreamCount: number;
  isFocus?: boolean;
  onInspect?: (docId: number) => void;
  onFocus?: (docId: number) => void;
}

export function DocumentNode({ data }: { data: DocumentNodeData }) {
  const {
    docId,
    title,
    version,
    versionType,
    tech = 'HTML5',
    totalFields = 0,
    upstreamCount = 0,
    downstreamCount = 0,
    isFocus = false,
    onInspect,
    onFocus
  } = data;

  const isPublished = versionType === 'PUBLISHED' || versionType === '1';

  return (
    <div
      className={cn(
        "w-[320px] h-[170px] rounded-2xl border transition-all text-xs font-sans relative group flex flex-col justify-between p-3.5 select-none",
        isFocus
          ? "bg-sky-50/40 border-sky-400 ring-2 ring-sky-300/80 shadow-md"
          : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-sm"
      )}
    >
      {/* Handles de Entrada e Saída Globais do Documento */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="doc_target" 
        className="!bg-sky-600 !w-3 !h-3 !-left-1.5 border-2 border-white shadow-xs transition-transform hover:scale-125 cursor-crosshair"
        title={`Entrada de dados do Doc ${docId}`}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="doc_source" 
        className="!bg-sky-600 !w-3 !h-3 !-right-1.5 border-2 border-white shadow-xs transition-transform hover:scale-125 cursor-crosshair"
        title={`Saída de dados do Doc ${docId}`}
      />

      {/* Header do Card */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "px-2 py-0.5 rounded-full font-mono font-bold text-[10px]",
              isFocus ? "bg-sky-600 text-white shadow-2xs" : "bg-slate-100 text-slate-800 border border-slate-200"
            )}>
              DOC {docId}
            </span>
            <span className="px-1.5 py-0.5 rounded font-mono font-semibold bg-slate-100/90 text-slate-600 text-[9.5px]">
              {tech}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isFocus && (
              <span className="px-2 py-0.5 rounded-full font-bold text-[9.5px] bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                <Sparkles size={10} />
                FOCO
              </span>
            )}
            <span className={cn(
              "px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[9.5px]",
              isPublished 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            )}>
              v{version}
            </span>
          </div>
        </div>

        {/* Título do Documento */}
        <div className="flex items-start gap-2 pt-0.5">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0 mt-0.5",
            isFocus ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"
          )}>
            <FileText size={14} strokeWidth={2.2} />
          </div>
          <h4 
            className="font-bold text-slate-900 text-[12px] leading-snug line-clamp-2" 
            title={title}
          >
            {title}
          </h4>
        </div>
      </div>

      {/* Métricas Clínicas de Linhagem */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span 
            className="flex items-center gap-1 font-semibold text-slate-700"
            title={`${upstreamCount} documento(s) alimentam este documento`}
          >
            <ArrowDownLeft size={13} className="text-emerald-600" />
            <span>{upstreamCount} in</span>
          </span>
          <span className="text-slate-300">•</span>
          <span 
            className="flex items-center gap-1 font-semibold text-slate-700"
            title={`Alimenta ${downstreamCount} documento(s) posteriores`}
          >
            <ArrowUpRight size={13} className="text-sky-600" />
            <span>{downstreamCount} out</span>
          </span>
        </div>

        <span className="text-[10px] text-slate-400 font-medium">
          {totalFields} campos
        </span>
      </div>

      {/* Ações do Card */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onInspect) onInspect(docId);
          }}
          className="flex-1 py-1 px-2 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-600 text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200/60"
          title="Inspecionar metadados e scripts SQL de linhagem"
        >
          <Eye size={12} />
          <span>Inspecionar</span>
        </button>

        {!isFocus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onFocus) onFocus(docId);
            }}
            className="py-1 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
            title="Tornar este documento o foco central do grafo"
          >
            <Search size={11} className="text-sky-600" />
            <span>Focar</span>
          </button>
        )}
      </div>
    </div>
  );
}
