"use client";

import React, { useState } from 'react';
import { X, Copy, Check, Code2, ArrowRight, Database } from 'lucide-react';
import toast from 'react-hot-toast';

interface EdgeDetailsModalProps {
  edge: any | null;
  onClose: () => void;
}

export function EdgeDetailsModal({ edge, onClose }: EdgeDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!edge) return null;

  const copyScript = () => {
    if (!edge.data?.script) return;
    navigator.clipboard.writeText(edge.data.script);
    setCopied(true);
    toast.success('Script copiado com sucesso!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
              <Code2 size={16} />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Detalhes do Vínculo de Linhagem
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Conexão {edge.data?.type === 'SQL_QUERY' ? 'Consulta SQL' : 'Herança Direta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Path Flow Cards */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Origem</span>
              <p className="font-mono font-bold text-slate-800 text-xs">
                Doc {edge.data?.sourceDocId}
              </p>
              <code className="font-mono text-[10.5px] text-sky-800 font-semibold block">
                {edge.data?.sourceFieldTag || 'Documento Global'}
              </code>
            </div>

            <ArrowRight size={16} className="text-slate-400 shrink-0" />

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Destino</span>
              <p className="font-mono font-bold text-slate-800 text-xs">
                Doc {edge.data?.targetDocId}
              </p>
              <code className="font-mono text-[10.5px] text-emerald-700 font-semibold block">
                {edge.data?.targetFieldTag || 'Documento Global'}
              </code>
            </div>
          </div>

          {/* Script Display */}
          {edge.data?.script ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-600 uppercase tracking-wide">
                  Script SQL de Execução
                </span>
                <button
                  type="button"
                  onClick={copyScript}
                  className="text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>
              <pre className="font-mono text-[11px] bg-slate-950 text-slate-100 p-3.5 rounded-xl border border-slate-800 overflow-x-auto max-h-64 whitespace-pre-wrap leading-relaxed">
                {edge.data.script}
              </pre>
            </div>
          ) : (
            <div className="p-4 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
              Vínculo por herança direta de metadado (sem script SQL associado).
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
