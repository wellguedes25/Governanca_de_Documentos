"use client";

import React from 'react';
import { 
  Search, RefreshCw, FileSpreadsheet, Printer, 
  SlidersHorizontal, LayoutGrid, Rows, Building2, Filter, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentosToolbarProps {
  activeTab: 'documentos' | 'perfis';
  setActiveTab: (tab: 'documentos' | 'perfis') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode?: 'table' | 'cards';
  setViewMode?: (mode: 'table' | 'cards') => void;
  density?: 'compact' | 'normal';
  setDensity?: (d: 'compact' | 'normal') => void;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onPrint: () => void;
  activeHospitals: { id: number; sigla: string }[];
  selectedHospitals: string[];
  toggleHospital: (sigla: string) => void;
  selectAllHospitals: () => void;
  clearHospitalFilter: () => void;
  totalFiltered: number;
  totalDocs: number;
}

export function DocumentosToolbar({
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  viewMode = 'table',
  setViewMode,
  density = 'normal',
  setDensity,
  loading,
  onRefresh,
  onExport,
  onPrint,
  activeHospitals,
  selectedHospitals,
  toggleHospital,
  selectAllHospitals,
  clearHospitalFilter,
  totalFiltered,
  totalDocs
}: DocumentosToolbarProps) {
  const [showHospitalPills, setShowHospitalPills] = React.useState(false);

  return (
    <div className="flex flex-col gap-3.5 mb-5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
      {/* Top Row: Main Tabs & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/60 self-start">
          <button
            onClick={() => setActiveTab('documentos')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === 'documentos'
                ? "bg-white text-sky-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>Documentos Clínicos</span>
            {totalDocs > 0 && (
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold",
                activeTab === 'documentos' ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"
              )}>
                {totalFiltered}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('perfis')}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === 'perfis'
                ? "bg-white text-sky-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>Perfis Ambulatoriais</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 self-end md:self-auto">
          {/* Alternador de Modo: Tabela vs Cards */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs">
            <button
              type="button"
              onClick={() => setViewMode && setViewMode('table')}
              title="Visualização em Tabela Completa"
              className={cn(
                "p-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 text-xs cursor-pointer",
                viewMode === 'table'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "hover:text-slate-900 text-slate-600 font-medium"
              )}
            >
              <Rows size={13} className={cn(viewMode === 'table' ? "text-[#004953]" : "text-slate-400")} />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode && setViewMode('cards')}
              title="Visualização em Cards Clínicos"
              className={cn(
                "p-1.5 px-2.5 rounded-md transition-all flex items-center gap-1.5 text-xs cursor-pointer",
                viewMode === 'cards'
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "hover:text-slate-900 text-slate-600 font-medium"
              )}
            >
              <LayoutGrid size={13} className={cn(viewMode === 'cards' ? "text-[#004953]" : "text-slate-400")} />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Alternador de Densidade para Tabela: Normal vs Compacto */}
          {viewMode === 'table' && setDensity && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={() => setDensity('normal')}
                title="Espaçamento Padrão"
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] transition-all cursor-pointer",
                  density === 'normal'
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                )}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                title="Espaçamento Compacto / Alta Densidade"
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] transition-all cursor-pointer",
                  density === 'compact'
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                )}
              >
                Compacto
              </button>
            </div>
          )}

          {/* Hospital Filter Pill Toggle */}
          {activeHospitals.length > 0 && activeTab === 'documentos' && (
            <button
              onClick={() => setShowHospitalPills(!showHospitalPills)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all",
                showHospitalPills || selectedHospitals.length > 0
                  ? "bg-sky-50 border-sky-200 text-sky-700 font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Building2 size={13} />
              <span>Hospitais</span>
              {selectedHospitals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {selectedHospitals.length}
                </span>
              )}
            </button>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 text-xs font-medium gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin text-sky-600")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {/* Export to Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 text-xs font-medium gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          {/* Print */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="h-8 text-xs font-medium gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type="text"
          placeholder="Filtrar por código ou descrição do documento clínico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Hospital Filter Pills Expandable Panel */}
      {showHospitalPills && activeTab === 'documentos' && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 transition-all animate-in fade-in duration-150">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter size={11} /> Unidades:
          </span>
          <button
            onClick={selectAllHospitals}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
              selectedHospitals.length === 0
                ? "bg-slate-800 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Todas
          </button>
          {activeHospitals.map(h => {
            const isSelected = selectedHospitals.includes(h.sigla);
            return (
              <button
                key={h.sigla}
                onClick={() => toggleHospital(h.sigla)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium transition-all border",
                  isSelected
                    ? "bg-sky-50 border-sky-300 text-sky-800 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {h.sigla}
              </button>
            );
          })}
          {selectedHospitals.length > 0 && (
            <button
              onClick={clearHospitalFilter}
              className="text-[11px] text-rose-600 hover:underline ml-2 font-medium"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
