"use client";

import React, { useState, useMemo } from 'react';
import {
  Search, RefreshCw, Database, Layout, ChevronRight,
  ChevronDown, Layers, FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AmbulatoryProfilesViewProps {
  data: any[];
  loading: boolean;
  error: string;
  selectedPerfilId: string | null;
  setSelectedPerfilId: (id: string | null) => void;
  profileDetailsCache: Record<string, any>;
  profileDetailsLoading: boolean;
  onExportCSV: () => void;
}

export function AmbulatoryProfilesView({
  data,
  loading,
  error,
  selectedPerfilId,
  setSelectedPerfilId,
  profileDetailsCache,
  profileDetailsLoading,
  onExportCSV
}: AmbulatoryProfilesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const pageSize = 8;

  const masterList = useMemo(() => {
    return data.map(row => ({
      id: String(row.COD_PERFIL || row.Cod_Perfil || row['"COD_PERFIL"'] || ''),
      Nome_Perfil: String(row.NOME_PERFIL || row.Nome_Perfil || row['"NOME_PERFIL"'] || ''),
      Especialidade: String(row.ESPECIALIDADE || row.Especialidade || row['"ESPECIALIDADE"'] || ''),
      Sistema: String(row.SISTEMA || row.Sistema || row['"SISTEMA"'] || ''),
    })).filter(p => p.id);
  }, [data]);

  const filteredList = useMemo(() => {
    if (!searchTerm) return masterList;
    const term = searchTerm.toLowerCase();
    return masterList.filter(p =>
      p.Nome_Perfil.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term) ||
      p.Especialidade.toLowerCase().includes(term)
    );
  }, [masterList, searchTerm]);

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedPerfil = useMemo(() => {
    return masterList.find(p => p.id === selectedPerfilId);
  }, [masterList, selectedPerfilId]);

  const activeModules = selectedPerfilId ? profileDetailsCache[selectedPerfilId] : null;

  return (
    <div className="flex flex-col md:flex-row gap-5 min-h-[500px]">
      {/* Master: Lista de Perfis */}
      <div className="w-full md:w-96 sylva-glass rounded-[22px] flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide flex items-center gap-2">
              <Layers size={14} className="text-[var(--accent-ink)]" />
              Perfis Cadastrados
            </h3>
            <span className="text-[11px] font-bold text-[var(--accent-ink)] bg-[var(--accent)] px-2.5 py-0.5 rounded-full border border-[var(--tint-olive-border)] font-mono">
              {filteredList.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={13} />
            <input
              type="text"
              placeholder="Buscar perfil por nome, id..."
              className="w-full bg-[var(--card-subtle)] border border-[var(--border)] rounded-full pl-9 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lime)] focus:ring-2 focus:ring-[var(--lime)]/20 transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Profile list items */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
          {loading ? (
            <div className="p-6 text-center text-[var(--muted)]">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[var(--accent-ink)]" />
              <p className="text-xs font-medium">Carregando perfis...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-xs tone-danger border rounded-xl m-2">
              {error}
            </div>
          ) : paginatedList.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted)] text-xs">
              Nenhum perfil encontrado
            </div>
          ) : (
            paginatedList.map(perfil => {
              const isSelected = selectedPerfilId === perfil.id;
              return (
                <button
                  type="button"
                  key={perfil.id}
                  onClick={() => setSelectedPerfilId(perfil.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl transition-all flex items-start gap-2.5 border cursor-pointer",
                    isSelected
                      ? "bg-[var(--accent)] border-[var(--tint-olive-border)] shadow-2xs"
                      : "bg-transparent border-transparent hover:border-[var(--border)] hover:bg-[var(--card-subtle)]"
                  )}
                >
                  <div className={cn(
                    "mt-1 w-2 h-2 rounded-full shrink-0",
                    isSelected ? "bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]" : "bg-[var(--border-strong)]"
                  )} />
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-xs font-bold leading-tight truncate normal-case tracking-normal",
                      isSelected ? "text-[var(--accent-ink)] font-extrabold" : "text-[var(--foreground)]"
                    )}>
                      {perfil.Nome_Perfil}
                    </h4>
                    <p className="text-[10px] text-[var(--muted)] font-mono mt-0.5">
                      ID: {perfil.id}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {perfil.Sistema && (
                        <span className="text-[9.5px] px-2 py-0.5 bg-[var(--card-subtle)] text-[var(--foreground-secondary)] rounded-full font-medium border border-[var(--border)]">
                          {perfil.Sistema}
                        </span>
                      )}
                      {perfil.Especialidade && (
                        <span className="text-[9.5px] px-2 py-0.5 bg-[var(--card-subtle)] text-[var(--foreground-secondary)] rounded-full font-medium border border-[var(--border)]">
                          {perfil.Especialidade}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className={cn(
                    "shrink-0 mt-1 transition-all",
                    isSelected ? "text-[var(--accent-ink)] translate-x-0.5" : "text-[var(--muted)]"
                  )} />
                </button>
              );
            })
          )}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--foreground-secondary)]">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-full sylva-pill disabled:opacity-30 disabled:pointer-events-none text-[11px] font-semibold text-[var(--foreground)] cursor-pointer"
            >
              Anterior
            </button>
            <span className="font-mono text-[11px] font-bold text-[var(--foreground)]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-full sylva-pill disabled:opacity-30 disabled:pointer-events-none text-[11px] font-semibold text-[var(--foreground)] cursor-pointer"
            >
              Próximo
            </button>
          </div>
        )}
      </div>

      {/* Detail: Módulos & Parâmetros */}
      <div className="flex-1 sylva-glass rounded-[22px] p-6 flex flex-col">
        {!selectedPerfilId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] py-16">
            <Database size={40} className="mb-3 opacity-35 text-[var(--muted)]" />
            <p className="text-xs font-semibold">Selecione um perfil vinculado ao lado para visualizar módulos e parâmetros</p>
          </div>
        ) : selectedPerfil ? (
          <div className="space-y-5">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--accent-ink)] bg-[var(--accent)] px-2.5 py-0.5 rounded-full border border-[var(--tint-olive-border)]">
                    ID #{selectedPerfil.id}
                  </span>
                  <span className="text-xs text-[var(--muted)] font-medium">
                    {selectedPerfil.Sistema || 'SIS'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[var(--foreground)] mt-1.5">
                  {selectedPerfil.Nome_Perfil}
                </h2>
                {selectedPerfil.Especialidade && (
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Especialidade: <span className="font-semibold text-[var(--foreground-secondary)]">{selectedPerfil.Especialidade}</span>
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                className="h-8 text-xs gap-1.5 self-start sm:self-auto"
              >
                <FileSpreadsheet size={13} />
                <span>Exportar CSV</span>
              </Button>
            </div>

            {/* Modules List */}
            <div>
              <h3 className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3">
                Módulos do Perfil
              </h3>

              {profileDetailsLoading ? (
                <div className="space-y-3 py-6">
                  <div className="skeleton h-14 w-full" />
                  <div className="skeleton h-14 w-full" />
                </div>
              ) : activeModules && Object.keys(activeModules).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(activeModules).map(([modId, modData]: [string, any]) => {
                    const isExpanded = expandedModules[modId];
                    return (
                      <div key={modId} className="border border-[var(--border)] rounded-2xl overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => toggleModule(modId)}
                          className="w-full text-left p-3.5 bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] transition-all flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Layout size={15} className="text-[var(--accent-ink)]" />
                            <div>
                              <span className="font-bold text-[var(--foreground)] block">
                                {modData.Titulo || `Módulo ${modData.ModuloId || modId}`}
                              </span>
                              <span className="text-[10px] text-[var(--muted)] font-mono mt-0.5 block">
                                Código: {modData.ModuloId || modId}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[var(--muted)]">
                            <span className="text-[11px] font-semibold">
                              {modData.Parametros?.length || 0} parâmetros
                            </span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 border-t border-[var(--border-subtle)] space-y-2">
                            {modData.Parametros && modData.Parametros.length > 0 ? (
                              <div className="space-y-2">
                                {modData.Parametros.map((param: any, pIdx: number) => (
                                  <div key={pIdx} className="p-2.5 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-xs">
                                    <div className="flex justify-between items-center gap-2">
                                      <span className="font-bold text-[var(--foreground)] font-mono text-[11px]">
                                        {param.Parametro}
                                      </span>
                                      <span className="font-mono text-[var(--accent-ink)] bg-[var(--accent)] px-2 py-0.5 rounded-full border border-[var(--tint-olive-border)] text-[10.5px]">
                                        {param.Valor || 'Sem valor'}
                                      </span>
                                    </div>
                                    {param.Descricao && (
                                      <p className="text-[11px] text-[var(--muted)] mt-1">
                                        {param.Descricao}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--muted)] italic">
                                Nenhum parâmetro específico vinculado a este módulo.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[var(--muted)] text-xs">
                  Nenhum módulo vinculado encontrado para este perfil.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
