"use client";

import React, { useState, useMemo } from 'react';
import { 
  Layers, ChevronLeft, ChevronRight, Search, Plus, 
  ArrowRight, FileText, CheckCircle2, TrendingUp, Calendar, ArrowUpDown, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentoFlexItem } from '@/types/migracao.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface KanbanBacklogRailProps {
  docsFlexSemMigracao: DocumentoFlexItem[];
  onPromoverDoc: (doc: DocumentoFlexItem) => void;
  isPinnedAsColumn?: boolean;
  onTogglePin?: () => void;
}

type SortOption = 'usos' | 'nome' | 'codigo' | 'recente';

export function KanbanBacklogRail({
  docsFlexSemMigracao,
  onPromoverDoc,
  isPinnedAsColumn = false,
  onTogglePin
}: KanbanBacklogRailProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('usos');
  const [displayCount, setDisplayCount] = useState(40);

  // Filtra e ordena a lista completa de documentos V2 do Oracle
  const filteredAndSortedDocs = useMemo(() => {
    let result = docsFlexSemMigracao;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(doc => 
        (doc.nome || '').toLowerCase().includes(term) ||
        String(doc.cd_documento_mv).includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'usos') {
        return (b.total_usos || 0) - (a.total_usos || 0);
      }
      if (sortBy === 'nome') {
        return (a.nome || '').localeCompare(b.nome || '');
      }
      if (sortBy === 'codigo') {
        return a.cd_documento_mv - b.cd_documento_mv;
      }
      if (sortBy === 'recente') {
        const dateA = a.ultimo_uso ? new Date(a.ultimo_uso).getTime() : 0;
        const dateB = b.ultimo_uso ? new Date(b.ultimo_uso).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
  }, [docsFlexSemMigracao, searchTerm, sortBy]);

  const displayedDocs = useMemo(() => {
    return filteredAndSortedDocs.slice(0, displayCount);
  }, [filteredAndSortedDocs, displayCount]);

  const total = docsFlexSemMigracao.length;

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-all duration-300 flex flex-col shrink-0 overflow-hidden",
        isPinnedAsColumn 
          ? "min-w-[280px] max-w-[300px] h-full max-h-[calc(100vh-280px)] bg-slate-50/50" 
          : collapsed 
            ? "w-14 h-[calc(100vh-280px)]" 
            : "w-80 h-[calc(100vh-280px)]"
      )}
    >
      {/* Header do Backlog */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        {(!collapsed || isPinnedAsColumn) ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded-lg bg-teal-50 text-[#004953] border border-teal-100 shrink-0">
              <Layers size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide leading-none truncate">
                  Backlog Flex V2
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <Database size={10} className="text-emerald-600" />
                {total} no Oracle
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white border-slate-200 text-[#004953] shrink-0">
              {total}
            </Badge>
          </div>
        ) : null}

        {!isPinnedAsColumn && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer mx-auto ml-1"
            title={collapsed ? `Expandir Backlog Flex (${total} itens)` : "Recolher Backlog"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Conteúdo Expandido */}
      {(!collapsed || isPinnedAsColumn) ? (
        <div className="flex-1 flex flex-col overflow-hidden p-2.5 space-y-2">
          
          {/* Busca Rápida no Backlog */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder={`Buscar em ${total} prontuários V2...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDisplayCount(40);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#004953] focus:border-[#004953] transition-all"
            />
          </div>

          {/* Filtros de Ordenação Rápida */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
            <span className="font-medium text-slate-400">Ordenar por:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortBy('usos')}
                className={cn(
                  "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                  sortBy === 'usos' ? "bg-teal-50 text-[#004953] border border-teal-200" : "hover:text-slate-700"
                )}
                title="Mais utilizados no hospital"
              >
                Usos
              </button>
              <button
                onClick={() => setSortBy('recente')}
                className={cn(
                  "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                  sortBy === 'recente' ? "bg-teal-50 text-[#004953] border border-teal-200" : "hover:text-slate-700"
                )}
                title="Uso mais recente"
              >
                Recente
              </button>
              <button
                onClick={() => setSortBy('nome')}
                className={cn(
                  "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                  sortBy === 'nome' ? "bg-teal-50 text-[#004953] border border-teal-200" : "hover:text-slate-700"
                )}
                title="Ordem alfabética"
              >
                A-Z
              </button>
              <button
                onClick={() => setSortBy('codigo')}
                className={cn(
                  "px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer",
                  sortBy === 'codigo' ? "bg-teal-50 text-[#004953] border border-teal-200" : "hover:text-slate-700"
                )}
                title="Código MV"
              >
                # Cód
              </button>
            </div>
          </div>

          {/* Lista de Documentos V2 (Cards Draggable) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
            {filteredAndSortedDocs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Nenhum documento Flex encontrado para o filtro.
              </div>
            ) : (
              <>
                {displayedDocs.map((doc) => (
                  <div
                    key={doc.id || doc.cd_documento_mv}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ isBacklog: true, doc }));
                    }}
                    className="group bg-white hover:bg-slate-50/90 rounded-xl border border-slate-200/90 hover:border-sky-300 hover:shadow-xs p-2.5 transition-all space-y-1.5 cursor-grab active:cursor-grabbing"
                    title="Arraste para uma coluna do Kanban ou clique em Migrar"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-[#004953] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                        #{doc.cd_documento_mv}
                      </span>
                      {doc.total_usos !== undefined && doc.total_usos > 0 ? (
                        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <TrendingUp size={10} className="text-slate-400" />
                          {doc.total_usos.toLocaleString('pt-BR')} usos
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-medium">Sem uso</span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-800 group-hover:text-[#004953] transition-colors line-clamp-2 leading-snug">
                      {doc.nome}
                    </h4>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-100/70 text-[10px] text-slate-400">
                      <span className="truncate max-w-[130px]">
                        {doc.ultimo_uso ? new Date(doc.ultimo_uso).toLocaleDateString('pt-BR') : 'Legado V2'}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPromoverDoc(doc)}
                        className="h-6 px-2 text-[10px] font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded gap-1 cursor-pointer"
                        title="Criar demanda e abrir no Kanban"
                      >
                        <span>+ Migrar</span>
                        <ArrowRight size={10} />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Paginação / Carregar Mais */}
                {filteredAndSortedDocs.length > displayedDocs.length && (
                  <div className="pt-1 pb-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisplayCount(prev => prev + 50)}
                      className="w-full text-xs font-semibold text-slate-600 hover:text-[#004953] hover:border-teal-300 py-1 h-7 rounded-xl cursor-pointer"
                    >
                      Ver mais 50 (restam {filteredAndSortedDocs.length - displayedDocs.length})
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-1 px-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
            <span>Exibindo {displayedDocs.length} de {filteredAndSortedDocs.length}</span>
            <span className="font-medium text-slate-500">Arraste para o Kanban</span>
          </div>
        </div>
      ) : (
        /* Modo Recolhido */
        <div 
          onClick={() => setCollapsed(false)}
          className="flex-1 flex flex-col items-center justify-between py-6 space-y-4 cursor-pointer hover:bg-slate-50 transition-colors"
          title={`Expandir Backlog (${total} documentos)`}
        >
          <div className="p-1.5 rounded-lg bg-teal-50 text-[#004953] border border-teal-100">
            <Layers size={14} />
          </div>

          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest -rotate-90 whitespace-nowrap hover:text-[#004953]">
            Backlog ({total})
          </span>

          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}
