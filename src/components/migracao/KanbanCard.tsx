"use client";

import React from 'react';
import { 
  Clock, Calendar, User, ArrowRight, CheckCircle2, 
  ExternalLink, Layers, AlertCircle, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentoMigracao } from '@/types/migracao.types';
import { Badge } from '@/components/ui/badge';

interface KanbanCardProps {
  migracao: DocumentoMigracao;
  onSelect: (migracao: DocumentoMigracao) => void;
  onMoveToStatus?: (id: string, status: any) => void;
}

export function KanbanCard({
  migracao,
  onSelect,
  onMoveToStatus
}: KanbanCardProps) {
  const nomeDoc = migracao.documento_flex?.nome || migracao.documento_html5?.nome || migracao.tipo_documento || 'Documento Sem Nome';
  const flexCod = migracao.documento_flex?.cd_documento_mv || migracao.documento_flex_id;
  const html5Cod = migracao.documento_html5?.cd_documento_mv || migracao.documento_html5_id;
  const resp = migracao.responsavel_dev || migracao.responsavel || 'Não atribuído';

  // Badges de Complexidade
  const complexidadeBadge = {
    BAIXA: { label: 'Baixa', class: 'bg-slate-100 text-slate-700 border-slate-200' },
    MEDIA: { label: 'Média', class: 'bg-amber-50 text-amber-800 border-amber-200' },
    ALTA: { label: 'Alta', class: 'bg-rose-50 text-rose-800 border-rose-200' }
  }[migracao.complexidade || 'MEDIA'];

  // Formatação de datas
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.slice(0, 10).split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={() => onSelect(migracao)}
      className="group bg-white rounded-xl border border-slate-200/90 hover:border-sky-300 hover:shadow-md transition-all p-3.5 flex flex-col justify-between cursor-pointer space-y-3 relative"
    >
      {/* Top Header: Nome + Complexidade */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#004953] transition-colors leading-snug line-clamp-2">
            {nomeDoc}
          </h4>
          <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
            complexidadeBadge.class
          )}>
            {complexidadeBadge.label}
          </span>
        </div>

        {/* Tags de Identificação Técnica */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono font-medium text-slate-500 mt-1">
          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
            Flex: <strong className="text-slate-900">{flexCod}</strong>
          </span>
          {html5Cod && (
            <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-200/70">
              HTML5: <strong>{html5Cod}</strong>
            </span>
          )}
          {migracao.lecom && (
            <span className="bg-sky-50 px-1.5 py-0.5 rounded text-sky-800 border border-sky-200/70">
              LECOM: <strong>{migracao.lecom}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Datas e Cronograma */}
      <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 text-[10px] space-y-1">
        <div className="flex justify-between items-center text-slate-500">
          <span>Limite dev:</span>
          <span className="font-mono font-semibold text-slate-700">
            {formatDate(migracao.data_conclusao_prevista)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Entrada produção:</span>
          <span className="font-mono font-semibold text-slate-700">
            {formatDate(migracao.data_conclusao_efetiva)}
          </span>
        </div>
      </div>

      {/* Footer: Responsável */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 truncate pr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
          <span className="text-slate-600 truncate font-medium text-[10px]">
            {resp}
          </span>
        </div>

        {migracao.checklist && migracao.checklist.length > 0 && (
          <span className="text-[10px] font-mono text-slate-400 shrink-0" title="Itens de homologação concluídos">
            {migracao.checklist.filter(c => c.concluido).length}/{migracao.checklist.length}
          </span>
        )}
      </div>
    </div>
  );
}
