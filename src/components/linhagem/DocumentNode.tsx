"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, ArrowDownLeft, ArrowUpRight, Search, Eye, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
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
  selfLinksCount?: number;
  isFocus?: boolean;
  isLegacyV2?: boolean;
  isBroken?: boolean;
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
    selfLinksCount = 0,
    isFocus = false,
    isLegacyV2 = false,
    isBroken = false,
    onInspect,
    onFocus
  } = data;

  const isPublished = versionType === 'PUBLISHED' || versionType === '1';

  return (
    <div
      className={cn(
        "w-[320px] h-[170px] rounded-2xl border transition-all text-xs font-sans relative group flex flex-col justify-between p-3.5 select-none backdrop-blur-md",
        isBroken
          ? "bg-rose-500/10 border-rose-500/40 text-[var(--text-primary)] ring-1 ring-rose-500/20 shadow-sm"
          : isFocus
            ? "sylva-glass bg-[var(--card-bg)] border-[#CCF352] ring-2 ring-[#CCF352]/30 shadow-lg text-[var(--text-primary)]"
            : isLegacyV2
              ? "sylva-glass bg-[var(--card-bg)] border-amber-500/30 hover:border-amber-500/60 shadow-xs text-[var(--text-primary)]"
              : "sylva-glass bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-[#CCF352]/40 shadow-xs text-[var(--text-primary)]"
      )}
    >
      {/* Handles de Entrada e Saída Globais do Documento */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="doc_target" 
        className={cn(
          "!w-3 !h-3 !-left-1.5 border-2 border-[var(--card-bg)] shadow-xs transition-transform hover:scale-125 cursor-crosshair",
          isBroken ? "!bg-rose-500" : isLegacyV2 ? "!bg-amber-500" : "!bg-[#CCF352]"
        )}
        title={`Entrada de dados do Doc ${docId}`}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="doc_source" 
        className={cn(
          "!w-3 !h-3 !-right-1.5 border-2 border-[var(--card-bg)] shadow-xs transition-transform hover:scale-125 cursor-crosshair",
          isBroken ? "!bg-rose-500" : isLegacyV2 ? "!bg-amber-500" : "!bg-[#CCF352]"
        )}
        title={`Saída de dados do Doc ${docId}`}
      />

      {/* Header do Card */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "px-2 py-0.5 rounded-full font-mono font-bold text-[10px]",
              isBroken
                ? "bg-rose-500 text-white shadow-2xs"
                : isFocus
                  ? "bg-[#CCF352] text-[#141312] shadow-2xs"
                  : "bg-[var(--dock-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
            )}>
              DOC {docId}
            </span>
            <span className={cn(
              "px-1.5 py-0.5 rounded font-mono font-semibold text-[9.5px]",
              isBroken
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : isLegacyV2
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-[var(--dock-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            )}>
              {tech}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isFocus && (
              <span className="px-2 py-0.5 rounded-full font-bold text-[9.5px] bg-[#CCF352]/20 text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205] border border-[#CCF352]/40 flex items-center gap-1 shadow-2xs">
                <Sparkles size={10} />
                FOCO
              </span>
            )}
            {isBroken ? (
              <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[9.5px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                INEXISTENTE
              </span>
            ) : (
              <span className={cn(
                "px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[9.5px]",
                isPublished 
                  ? "bg-[#CCF352]/10 text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205] border border-[#CCF352]/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              )}>
                v{version}
              </span>
            )}
          </div>
        </div>

        {/* Título do Documento */}
        <div className="flex items-start gap-2 pt-0.5">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0 mt-0.5",
            isBroken
              ? "bg-rose-500/20 text-rose-400"
              : isFocus
                ? "bg-[#CCF352]/10 text-[#CCF352]"
                : isLegacyV2
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-[var(--dock-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
          )}>
            {isBroken ? <AlertTriangle size={14} strokeWidth={2.2} /> : <FileText size={14} strokeWidth={2.2} />}
          </div>
          <h4 
            className={cn(
              "font-bold text-[12px] leading-snug line-clamp-2",
              isBroken ? "text-rose-400" : "text-[var(--text-primary)] group-hover:text-[#CCF352] transition-colors"
            )}
            title={title}
          >
            {title}
          </h4>
        </div>
      </div>

      {/* Métricas Clínicas de Linhagem */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span 
            className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]"
            title={`${upstreamCount} documento(s) alimentam este documento`}
          >
            <ArrowDownLeft size={13} className="text-[#CCF352]" />
            <span>{upstreamCount} in</span>
          </span>
          <span className="text-[var(--text-muted)] opacity-40">•</span>
          <span 
            className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]"
            title={`Alimenta ${downstreamCount} documento(s) posteriores`}
          >
            <ArrowUpRight size={13} className="text-sky-400" />
            <span>{downstreamCount} out</span>
          </span>
          {selfLinksCount > 0 && (
            <>
              <span className="text-[var(--text-muted)] opacity-40">•</span>
              <span
                className="px-1.5 py-0.5 rounded-full bg-[var(--dock-bg)] text-[#CCF352] border border-[#CCF352]/30 font-bold text-[9.5px] flex items-center gap-1"
                title={`Continuidade clínica: ${selfLinksCount} campo(s) herdam de versões/registros anteriores deste mesmo documento`}
              >
                <RefreshCw size={9} />
                <span>{selfLinksCount} auto</span>
              </span>
            </>
          )}
        </div>

        <span className="text-[10px] text-[var(--text-muted)] font-medium">
          {isBroken ? 'Órfão' : `${totalFields} campos`}
        </span>
      </div>

      {/* Ações do Card */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onInspect) onInspect(docId);
          }}
          className="flex-1 py-1 px-2 rounded-lg bg-[var(--dock-bg)] hover:bg-[#CCF352]/10 hover:text-[#CCF352] text-[var(--text-secondary)] text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border border-[var(--border-subtle)]"
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
            className="py-1 px-2.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--dock-bg)] text-[var(--text-primary)] hover:text-[#CCF352] text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer border border-[var(--border-subtle)] hover:border-[#CCF352]/40 shadow-2xs"
            title="Tornar este documento o foco central do grafo"
          >
            <Search size={11} className="text-[#CCF352]" />
            <span>Focar</span>
          </button>
        )}
      </div>
    </div>
  );
}
