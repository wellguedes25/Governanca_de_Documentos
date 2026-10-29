"use client";

import React from 'react';
import { 
  LayoutGrid, Table, Search, Plus, User, 
  FileSpreadsheet, Filter, X, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MigracaoViewTabsProps {
  activeTab: 'quadro' | 'backlog' | 'tabela';
  setActiveTab: (tab: 'quadro' | 'backlog' | 'tabela') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filtroResponsavel: string;
  setFiltroResponsavel: (resp: string) => void;
  responsaveis: string[];
  apenasMinhas: boolean;
  setApenasMinhas: (val: boolean) => void;
  onNovaDemanda: () => void;
  onExportarTabela?: () => void;
  totalFiltered: number;
  totalBacklog?: number;
}

export function MigracaoViewTabs({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  filtroResponsavel,
  setFiltroResponsavel,
  responsaveis,
  apenasMinhas,
  setApenasMinhas,
  onNovaDemanda,
  onExportarTabela,
  totalFiltered,
  totalBacklog = 0
}: MigracaoViewTabsProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
      
      {/* Top Row: Visões (Quadro vs Backlog vs Tabela) e Botões de Ação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Alternador de Visões em Pílula */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs self-start overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('quadro')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer font-semibold whitespace-nowrap",
              activeTab === 'quadro'
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LayoutGrid size={14} className={cn(activeTab === 'quadro' ? "text-[#004953]" : "text-slate-400")} />
            <span>00 - Quadro (Kanban)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backlog')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer font-semibold whitespace-nowrap",
              activeTab === 'backlog'
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers size={14} className={cn(activeTab === 'backlog' ? "text-[#004953]" : "text-slate-400")} />
            <span>01 - Backlog Geral V2</span>
            {totalBacklog > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-800 font-bold">
                {totalBacklog}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tabela')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer font-semibold whitespace-nowrap",
              activeTab === 'tabela'
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Table size={14} className={cn(activeTab === 'tabela' ? "text-[#004953]" : "text-slate-400")} />
            <span>02 - Dossiê / De-Para</span>
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {onExportarTabela && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportarTabela}
              className="h-9 px-3.5 text-xs font-semibold rounded-full border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs gap-1.5"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Exportar Dossiê</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={onNovaDemanda}
            className="h-9 px-4 text-xs font-semibold rounded-full bg-[#004953] hover:bg-[#003b44] text-white cursor-pointer shadow-2xs gap-1.5 transition-all"
          >
            <Plus size={14} />
            <span>Nova Demanda</span>
          </Button>
        </div>
      </div>

      {/* Bottom Row: Barra de Busca e Filtros Contextuais (no modo Kanban ou Dossiê) */}
      {activeTab !== 'backlog' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            {/* Input de Busca */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Filtrar prontuário, código Flex ou LECOM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#004953] focus:border-[#004953] transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtro 1-Clique "Minhas Demandas" */}
            <button
              type="button"
              onClick={() => setApenasMinhas(!apenasMinhas)}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer",
                apenasMinhas
                  ? "bg-teal-50 text-[#004953] border-teal-300 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <User size={13} />
              <span>Minhas Demandas</span>
            </button>

            {/* Filtro por Responsável Técnico */}
            {responsaveis.length > 0 && (
              <div className="relative">
                <select
                  value={filtroResponsavel}
                  onChange={(e) => setFiltroResponsavel(e.target.value)}
                  className="h-8 pl-3 pr-7 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#004953] focus:border-[#004953] appearance-none cursor-pointer"
                >
                  <option value="TODOS">Todos os Responsáveis</option>
                  {responsaveis.map((resp) => (
                    <option key={resp} value={resp}>
                      {resp}
                    </option>
                  ))}
                </select>
                <Filter size={11} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Contador de Itens */}
          <div className="text-xs text-slate-400 font-medium whitespace-nowrap self-end sm:self-center">
            Exibindo <span className="font-semibold text-slate-700">{totalFiltered}</span> {totalFiltered === 1 ? 'item' : 'itens'}
          </div>
        </div>
      )}

    </div>
  );
}
