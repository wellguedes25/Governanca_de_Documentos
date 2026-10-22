"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, RefreshCw, Database, Layout, Download, ChevronRight, 
  ChevronDown, Layers, FileSpreadsheet, ShieldAlert 
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
      <div className="w-full md:w-96 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers size={14} className="text-sky-600" />
              Perfis Cadastrados
            </h3>
            <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
              {filteredList.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input 
              type="text" 
              placeholder="Buscar perfil por nome, id..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-sky-500 transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Profile list items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {loading ? (
            <div className="p-6 text-center text-slate-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-sky-600" />
              <p className="text-xs font-medium">Carregando perfis...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg m-2">
              {error}
            </div>
          ) : paginatedList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum perfil encontrado
            </div>
          ) : (
            paginatedList.map(perfil => {
              const isSelected = selectedPerfilId === perfil.id;
              return (
                <button
                  key={perfil.id}
                  onClick={() => setSelectedPerfilId(perfil.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all flex items-start gap-2.5 border",
                    isSelected
                      ? "bg-sky-50/70 border-sky-300 shadow-2xs"
                      : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "mt-1 w-2 h-2 rounded-full shrink-0",
                    isSelected ? "bg-sky-600" : "bg-slate-300"
                  )} />
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-xs font-bold leading-tight truncate",
                      isSelected ? "text-sky-950 font-extrabold" : "text-slate-800"
                    )}>
                      {perfil.Nome_Perfil}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      ID: {perfil.id}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {perfil.Sistema && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                          {perfil.Sistema}
                        </span>
                      )}
                      {perfil.Especialidade && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                          {perfil.Especialidade}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className={cn(
                    "shrink-0 mt-1 transition-all",
                    isSelected ? "text-sky-700 translate-x-0.5" : "text-slate-300"
                  )} />
                </button>
              );
            })
          )}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-[11px] font-semibold"
            >
              Anterior
            </button>
            <span className="font-mono text-[11px] font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-[11px] font-semibold"
            >
              Próximo
            </button>
          </div>
        )}
      </div>

      {/* Detail: Módulos & Parâmetros */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 flex flex-col">
        {!selectedPerfilId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
            <Database size={40} className="mb-3 opacity-30 text-sky-600" />
            <p className="text-xs font-semibold">Selecione um perfil ambulatorial ao lado para visualizar módulos e parâmetros</p>
          </div>
        ) : selectedPerfil ? (
          <div className="space-y-5">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    ID #{selectedPerfil.id}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedPerfil.Sistema || 'SIS'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedPerfil.Nome_Perfil}
                </h2>
                {selectedPerfil.Especialidade && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Especialidade: <span className="font-semibold text-slate-700">{selectedPerfil.Especialidade}</span>
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                className="h-8 text-xs gap-1.5 border-slate-200 hover:bg-slate-50 self-start sm:self-auto"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Exportar CSV</span>
              </Button>
            </div>

            {/* Modules List */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
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
                      <div key={modId} className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <button
                          onClick={() => toggleModule(modId)}
                          className="w-full text-left p-3.5 bg-slate-50/80 hover:bg-slate-100/70 transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Layout size={15} className="text-sky-600" />
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {modData.Titulo || `Módulo ${modData.ModuloId || modId}`}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                                Código: {modData.ModuloId || modId}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">
                              {modData.Parametros?.length || 0} parâmetros
                            </span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-slate-100 space-y-2">
                            {modData.Parametros && modData.Parametros.length > 0 ? (
                              <div className="space-y-2">
                                {modData.Parametros.map((param: any, pIdx: number) => (
                                  <div key={pIdx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-slate-800 font-mono text-[11px]">
                                        {param.Parametro}
                                      </span>
                                      <span className="font-mono text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 text-[10.5px]">
                                        {param.Valor || 'Sem valor'}
                                      </span>
                                    </div>
                                    {param.Descricao && (
                                      <p className="text-[11px] text-slate-500 mt-1">
                                        {param.Descricao}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
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
                <div className="py-8 text-center text-slate-400 text-xs">
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
