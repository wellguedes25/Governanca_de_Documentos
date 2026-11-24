"use client";

import React from 'react';
import {
  Search, RefreshCw, FileSpreadsheet, Printer,
  LayoutGrid, Rows, Building2, Filter, X
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
    <div className="flex flex-col gap-3.5 mb-1 sylva-glass p-4 rounded-[22px]">
      {/* Top Row: Segmented Controls estilo Sylva + Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Segmented Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-[var(--card-subtle)] rounded-full border border-[var(--border)] self-start">
          <button
            type="button"
            onClick={() => setActiveTab('documentos')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'documentos'
                ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-xs font-bold"
                : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            )}
          >
            <span>Documentos Clínicos</span>
            {totalDocs > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold",
                activeTab === 'documentos'
                  ? "bg-[var(--lime)] text-[var(--lime-ink)]"
                  : "bg-[var(--card-hover)] text-[var(--foreground-secondary)]"
              )}>
                {totalFiltered}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('perfis')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'perfis'
                ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-xs font-bold"
                : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            )}
          >
            <span>Perfis Vinculados</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 self-end md:self-auto">
          {/* Alternador de Modo: Tabela vs Cards */}
          <div className="inline-flex items-center bg-[var(--card-subtle)] p-1 rounded-full border border-[var(--border)] text-xs">
            <button
              type="button"
              onClick={() => setViewMode && setViewMode('table')}
              title="Visualização em Tabela Completa"
              className={cn(
                "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 text-xs cursor-pointer",
                viewMode === 'table'
                  ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-2xs font-bold"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] font-medium"
              )}
            >
              <Rows size={13} />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode && setViewMode('cards')}
              title="Visualização em Cards Clínicos"
              className={cn(
                "px-3 py-1 rounded-full transition-all flex items-center gap-1.5 text-xs cursor-pointer",
                viewMode === 'cards'
                  ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-2xs font-bold"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] font-medium"
              )}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Hospital Filter Pill Toggle */}
          {activeHospitals.length > 0 && activeTab === 'documentos' && (
            <button
              type="button"
              onClick={() => setShowHospitalPills(!showHospitalPills)}
              className={cn(
                "px-3.5 h-8 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                showHospitalPills || selectedHospitals.length > 0
                  ? "bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--lime)]"
                  : "sylva-pill text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              )}
            >
              <Building2 size={13} />
              <span>Unidades</span>
              {selectedHospitals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] text-[10px] flex items-center justify-center font-bold">
                  {selectedHospitals.length}
                </span>
              )}
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin text-[var(--lime)]")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 gap-1.5"
          >
            <FileSpreadsheet size={13} className="text-[var(--lime)]" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="h-8 gap-1.5"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15} />
        <input
          type="text"
          placeholder="Filtrar por código ou descrição do documento clínico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-[var(--card-subtle)] border border-[var(--border)] rounded-full text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--lime)] focus:ring-2 focus:ring-[var(--lime)]/20 transition-all outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Hospital Filter Pills Expandable Panel */}
      {showHospitalPills && activeTab === 'documentos' && (
        <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--muted)] mr-1 flex items-center gap-1">
            <Filter size={11} /> Unidades:
          </span>
          <button
            type="button"
            onClick={selectAllHospitals}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer",
              selectedHospitals.length === 0
                ? "bg-[var(--lime)] text-[var(--lime-ink)] font-bold"
                : "bg-[var(--card-subtle)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            )}
          >
            Todas
          </button>
          {activeHospitals.map((h) => {
            const isSelected = selectedHospitals.includes(h.sigla);
            return (
              <button
                type="button"
                key={h.sigla}
                onClick={() => toggleHospital(h.sigla)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer",
                  isSelected
                    ? "bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--lime)] font-bold"
                    : "bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                )}
              >
                {h.sigla}
              </button>
            );
          })}
          {selectedHospitals.length > 0 && (
            <button
              type="button"
              onClick={clearHospitalFilter}
              className="text-[11px] text-[var(--tone-danger-fg)] hover:underline ml-2 font-medium cursor-pointer"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
