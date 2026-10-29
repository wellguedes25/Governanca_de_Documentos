"use client";

import React from 'react';
import { 
  FileText, Calendar, Activity, Building2, 
  ExternalLink, Layers, ChevronRight, Check, Database,
  Clock, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DocumentosCardsGridProps {
  data: any[];
  loading: boolean;
  onOpenProfiles: (code: string, name?: string) => void;
  onOpenDrawer: (code: string) => void;
  activeHospitals: { id: number; sigla: string }[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFiltered: number;
}

export function DocumentosCardsGrid({
  data,
  loading,
  onOpenProfiles,
  onOpenDrawer,
  activeHospitals,
  currentPage,
  totalPages,
  onPageChange,
  totalFiltered,
}: DocumentosCardsGridProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-4 w-16 rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded-md" />
                <div className="skeleton h-4 w-3/4 rounded-md" />
              </div>
              <div className="skeleton h-12 w-full rounded-xl" />
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <div className="skeleton h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
        <Database size={42} className="mx-auto mb-3 opacity-30 text-sky-600" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">Nenhum documento encontrado</h3>
        <p className="text-xs text-slate-500">Tente ajustar seus termos de busca ou filtros de hospital.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map((row, idx) => {
          const docId = String(row['CÓDIGO'] || row['Codigo'] || row['CODIGO'] || '');
          const docName = String(row['NOME'] || row['Nome'] || row['DS_DOCUMENTO'] || '-');
          const ultUso = String(row['ULT. GERAL'] || row['ÚLTIMO USO'] || row['DT_ATUALIZACAO'] || '-');
          const totalVal = row['TOTAL'] || row['QTD'] || null;

          // Descobrir quais hospitais ativos possuem uso deste documento
          const hospitalsWithUsage = activeHospitals.filter(h => {
            const val = row[h.sigla] || row[h.sigla.toUpperCase()];
            const num = Number(val);
            return !isNaN(num) && num > 0;
          });

          return (
            <div 
              key={docId || idx}
              className="bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all p-4.5 flex flex-col justify-between group"
            >
              <div>
                {/* Header do Card: Código e Métricas Rápidas */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200/70 shadow-2xs">
                    <FileText size={11} className="text-sky-600" />
                    #{docId}
                  </span>

                  {totalVal !== null && totalVal !== undefined && (
                    <span 
                      className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md"
                      title="Total de registros produzidos"
                    >
                      {Number(totalVal).toLocaleString('pt-BR')} reg.
                    </span>
                  )}
                </div>

                {/* Título do Documento Clínico */}
                <h3 
                  className="text-xs font-bold text-slate-900 group-hover:text-sky-800 transition-colors line-clamp-2 min-h-[36px] leading-snug cursor-pointer mb-3"
                  onClick={() => onOpenDrawer(docId)}
                  title={docName}
                >
                  {docName}
                </h3>

                {/* Metadados: Último uso */}
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-[11px] text-slate-600 space-y-1.5 mb-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      Último uso:
                    </span>
                    <span className="font-mono font-semibold text-slate-700">
                      {ultUso !== '-' ? ultUso : 'Sem registro'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      Hospitais ativos:
                    </span>
                    <span className="font-semibold text-sky-700">
                      {hospitalsWithUsage.length} de {activeHospitals.length}
                    </span>
                  </div>
                </div>

                {/* Pílulas de Hospitais onde o documento está em uso */}
                <div className="mb-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Presença em Unidades
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {hospitalsWithUsage.length > 0 ? (
                      hospitalsWithUsage.slice(0, 5).map(h => (
                        <span 
                          key={h.id} 
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title={`Ativo em ${h.sigla}`}
                        >
                          <Check size={9} strokeWidth={3} className="text-emerald-600" />
                          {h.sigla}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Não ativo em hospitais selecionados
                      </span>
                    )}
                    {hospitalsWithUsage.length > 5 && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        +{hospitalsWithUsage.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Card */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDrawer(docId)}
                  className="flex-1 h-8 text-[11px] font-semibold gap-1.5 rounded-xl border-slate-200 hover:bg-sky-50 hover:text-sky-800 hover:border-sky-200 cursor-pointer shadow-2xs"
                >
                  <Layers size={12} className="text-sky-600" />
                  Metadados
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenProfiles(docId, docName)}
                  className="h-8 px-3 text-[11px] font-semibold rounded-xl border-slate-200 bg-white hover:bg-teal-50 hover:text-[#004953] hover:border-teal-200 transition-all cursor-pointer shadow-2xs gap-1.5 text-slate-700"
                  title="Abrir Perfis Ambulatoriais Vinculados"
                >
                  <Layers size={12} className="text-[#004953]" />
                  <span>Perfis</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Exibindo <b>{data.length}</b> de <b>{totalFiltered}</b> documentos em Cards</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-2 text-xs font-mono font-medium text-slate-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

