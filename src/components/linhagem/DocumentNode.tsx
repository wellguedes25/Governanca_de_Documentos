"use client";

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, ChevronDown, ChevronUp, Link2, ExternalLink, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineageField {
  id: string;
  code: number;
  tag: string;
  name: string;
  metadataId?: number;
  hasLink: boolean;
  isSource?: boolean;
  isTarget?: boolean;
}

interface DocumentNodeData {
  docId: number;
  title: string;
  version: number;
  versionType: string;
  tech: string;
  totalFields: number;
  linkedFieldsCount: number;
  fields: LineageField[];
  unlinkedFields: LineageField[];
}

export function DocumentNode({ data }: { data: DocumentNodeData }) {
  const [showAllFields, setShowAllFields] = useState(false);
  const [expandedUnlinked, setExpandedUnlinked] = useState(false);

  const {
    docId,
    title,
    version,
    versionType,
    tech = 'HTML5',
    totalFields = 0,
    linkedFieldsCount = 0,
    fields = [],
    unlinkedFields = []
  } = data;

  const isPublished = versionType === 'PUBLISHED' || versionType === '1';

  return (
    <div className="w-[360px] bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all text-xs font-sans relative group">
      {/* Node Level Handles (Global Doc Fallback) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="doc_target" 
        className="!bg-sky-500 !w-2.5 !h-2.5 !-left-1.5 border-2 border-white shadow-xs transition-transform hover:scale-125"
        title={`Entrada global do Doc ${docId}`}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="doc_source" 
        className="!bg-sky-500 !w-2.5 !h-2.5 !-right-1.5 border-2 border-white shadow-xs transition-transform hover:scale-125"
        title={`Saída global do Doc ${docId}`}
      />

      {/* Header */}
      <div className="p-3.5 bg-slate-50/70 rounded-t-2xl border-b border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-800">
              DOC {docId}
            </span>
            <span className="px-1.5 py-0.5 rounded font-mono font-semibold bg-slate-100 text-slate-600">
              {tech}
            </span>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full font-bold uppercase tracking-wide",
            isPublished 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            v{version} {isPublished ? '(PUBLICADO)' : '(RASCUNHO)'}
          </span>
        </div>

        <div className="flex items-start gap-2 pt-0.5">
          <FileText size={15} className="text-sky-600 shrink-0 mt-0.5" />
          <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2" title={title}>
            {title}
          </h4>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
          <span className="font-medium">
            <b className="text-slate-800">{linkedFieldsCount}</b> vinculados / {totalFields} total
          </span>
          {totalFields > 0 && (
            <button
              type="button"
              onClick={() => setShowAllFields(!showAllFields)}
              className="text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-0.5 transition-colors"
            >
              <span>{showAllFields ? 'Ocultar isolados' : `Ver todos (${totalFields})`}</span>
              {showAllFields ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Body: Linked Fields List */}
      <div className="p-3 space-y-2">
        {fields.length > 0 ? (
          <div className="space-y-1.5">
            {fields.map((field) => (
              <div 
                key={field.tag} 
                className="relative p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/30 transition-all group/field"
              >
                {/* Field-level Handles */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`target_${field.tag}`}
                  className="!bg-emerald-600 !w-2.5 !h-2.5 !-left-1.5 border-2 border-white shadow-xs"
                  title={`Recebe dados em ${field.tag}`}
                />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`source_${field.tag}`}
                  className="!bg-emerald-600 !w-2.5 !h-2.5 !-right-1.5 border-2 border-white shadow-xs"
                  title={`Fornece dados a partir de ${field.tag}`}
                />

                <div className="flex items-start justify-between gap-1.5">
                  <div className="space-y-0.5 min-w-0 pr-1">
                    <p className="font-semibold text-slate-900 text-[11.5px] leading-tight truncate" title={field.name}>
                      {field.name}
                    </p>
                    <code className="font-mono text-[10px] text-sky-800 font-bold block truncate" title={field.tag}>
                      {field.tag}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span 
                      className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-500 shadow-2xs"
                      title="Campo com Vínculo Ativo"
                    >
                      <Link2 size={11} className="text-sky-600" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 space-y-1">
            <p className="font-semibold text-[11px] text-slate-700">Nenhum campo com vínculo ativo</p>
            <p className="text-[10px] text-slate-400">
              Este documento possui {totalFields} campos isolados sem conexões.
            </p>
          </div>
        )}

        {/* Unlinked Fields (Collapsible) */}
        {(showAllFields || expandedUnlinked) && unlinkedFields.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Campos sem Vínculo ({unlinkedFields.length})
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {unlinkedFields.map((field) => (
                <div 
                  key={field.tag}
                  className="p-1.5 px-2 rounded-lg bg-slate-50/50 border border-slate-100 flex items-center justify-between text-[10.5px] text-slate-600"
                >
                  <span className="truncate pr-2 font-medium" title={field.name}>{field.name}</span>
                  <code className="font-mono text-[9.5px] text-slate-400 shrink-0">{field.tag}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Toggle */}
        {!showAllFields && !expandedUnlinked && unlinkedFields.length > 0 && (
          <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-400">
            <span>+{unlinkedFields.length} campos sem vínculo</span>
            <button
              type="button"
              onClick={() => setExpandedUnlinked(true)}
              className="text-sky-700 hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>Expandir todos</span>
              <ChevronDown size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
