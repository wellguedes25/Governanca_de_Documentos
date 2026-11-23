"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentoMigracao, StatusMigracao, DocumentoFlexItem } from '@/types/migracao.types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: StatusMigracao;
  label: string;
  cor: string;
  limiteWip?: number;
  items: DocumentoMigracao[];
  onSelectMigracao: (migracao: DocumentoMigracao) => void;
  onNovaMigracaoNaEtapa?: (etapaId: StatusMigracao) => void;
  onDropItem?: (id: string, targetStatus: StatusMigracao) => void;
  onDropBacklogDoc?: (doc: DocumentoFlexItem, targetStatus: StatusMigracao) => void;
}

export function KanbanColumn({
  id,
  label,
  cor,
  limiteWip,
  items,
  onSelectMigracao,
  onNovaMigracaoNaEtapa,
  onDropItem,
  onDropBacklogDoc
}: KanbanColumnProps) {
  const isWipExceeded = limiteWip !== undefined && items.length > limiteWip;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;

    try {
      const parsed = JSON.parse(rawData);
      if (parsed.isBacklog && parsed.doc) {
        onDropBacklogDoc?.(parsed.doc, id);
        return;
      }
    } catch {
      // Not JSON, proceed with standard id
    }

    if (onDropItem) {
      onDropItem(rawData, id);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col sylva-glass bg-[var(--card-bg)]/70 rounded-2xl border border-[var(--border-subtle)] p-3 min-w-[260px] max-w-[280px] shrink-0 h-full max-h-[calc(100vh-280px)] shadow-2xs backdrop-blur-md"
    >
      {/* Header da Coluna */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide uppercase">
            {label}
          </span>
          <span className={cn(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
            isWipExceeded
              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
              : "bg-[var(--dock-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
          )}>
            {items.length}{limiteWip ? `/${limiteWip}` : ''}
          </span>
        </div>

        {onNovaMigracaoNaEtapa && (
          <button
            onClick={() => onNovaMigracaoNaEtapa(id)}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[#CCF352] hover:bg-white/5 transition-all cursor-pointer"
            title={`Adicionar documento em ${label}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
        {items.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-[var(--border-subtle)] rounded-xl flex items-center justify-center p-4 text-center bg-[var(--dock-bg)]/20">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              Arraste itens aqui ou selecione o botão de adição acima
            </span>
          </div>
        ) : (
          items.map(m => (
            <KanbanCard
              key={m.id}
              migracao={m}
              onSelect={onSelectMigracao}
            />
          ))
        )}
      </div>
    </div>
  );
}
