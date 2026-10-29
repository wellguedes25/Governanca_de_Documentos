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
      className="flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 min-w-[260px] max-w-[280px] shrink-0 h-full max-h-[calc(100vh-280px)] shadow-2xs"
    >
      {/* Header da Coluna */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            {label}
          </span>
          <span className={cn(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
            isWipExceeded
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-white text-slate-700 border-slate-200"
          )}>
            {items.length}{limiteWip ? `/${limiteWip}` : ''}
          </span>
        </div>

        {onNovaMigracaoNaEtapa && (
          <button
            onClick={() => onNovaMigracaoNaEtapa(id)}
            className="p-1 rounded-md text-slate-400 hover:text-[#004953] hover:bg-white transition-all cursor-pointer"
            title={`Adicionar documento em ${label}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
        {items.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-xl flex items-center justify-center p-4 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Arraste itens aqui ou selecione o botão de adição acima
            </span>
          </div>
        ) : (
          items.map(m => (
            <div
              key={m.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', m.id);
              }}
            >
              <KanbanCard
                migracao={m}
                onSelect={onSelectMigracao}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
