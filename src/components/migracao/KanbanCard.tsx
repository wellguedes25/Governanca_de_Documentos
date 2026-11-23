"use client";

import React from 'react';
import { 
  User, Layers, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentoMigracao } from '@/types/migracao.types';

interface KanbanCardProps {
  migracao: DocumentoMigracao;
  onSelect: (migracao: DocumentoMigracao) => void;
  onMoveToStatus?: (id: string, status: any) => void;
}

export function KanbanCard({
  migracao,
  onSelect
}: KanbanCardProps) {
  const nomeDoc = migracao.documento_flex?.nome || migracao.documento_html5?.nome || migracao.tipo_documento || 'Documento Sem Nome';
  const flexCod = migracao.documento_flex?.cd_documento_mv || migracao.documento_flex_id;
  const html5Cod = migracao.documento_html5?.cd_documento_mv || migracao.documento_html5_id;
  const resp = migracao.responsavel_dev || migracao.responsavel || 'Não atribuído';

  // Badges de Complexidade
  const complexidadeBadge = {
    BAIXA: { label: 'Baixa', class: 'bg-[var(--dock-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]' },
    MEDIA: { label: 'Média', class: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    ALTA: { label: 'Alta', class: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
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
      className="group sylva-card bg-[var(--card-bg)] rounded-xl border border-[var(--border-subtle)] hover:border-[#CCF352]/40 hover:shadow-md transition-all p-3.5 flex flex-col justify-between cursor-pointer space-y-3 relative text-[var(--text-primary)]"
    >
      {/* Top Header: Nome + Complexidade */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[#CCF352] transition-colors leading-snug line-clamp-2 normal-case tracking-normal">
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
        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono font-medium text-[var(--text-muted)] mt-1">
          <span className="bg-[var(--dock-bg)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            Flex: <strong className="text-[var(--text-primary)]">{flexCod}</strong>
          </span>
          {html5Cod && (
            <span className="bg-[#CCF352]/10 px-1.5 py-0.5 rounded text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205] border border-[#CCF352]/30">
              HTML5: <strong>{html5Cod}</strong>
            </span>
          )}
          {migracao.lecom && (
            <span className="bg-sky-500/10 px-1.5 py-0.5 rounded text-sky-400 border border-sky-500/30">
              LECOM: <strong>{migracao.lecom}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Datas e Cronograma */}
      <div className="bg-[var(--dock-bg)]/50 rounded-lg p-2 border border-[var(--border-subtle)] text-[10px] space-y-1">
        <div className="flex justify-between items-center text-[var(--text-muted)]">
          <span>Limite dev:</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {formatDate(migracao.data_conclusao_prevista)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[var(--text-muted)]">
          <span>Entrada produção:</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {formatDate(migracao.data_conclusao_efetiva)}
          </span>
        </div>
      </div>

      {/* Footer: Responsável */}
      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-full bg-[var(--dock-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] border border-[var(--border-subtle)] shrink-0">
            {resp.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-[10px] text-[var(--text-secondary)] font-medium">
            {resp}
          </span>
        </div>

        <span className="text-[10px] font-semibold text-[#CCF352] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          Detalhes <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}
