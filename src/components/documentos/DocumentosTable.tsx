"use client";

import React from 'react';
import { 
  ChevronUp, ChevronDown, ChevronRight, Info, ExternalLink, 
  Database, FileSpreadsheet, Layers, Check, X, ShieldAlert, Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DocumentosTableProps {
  columns: string[];
  data: any[];
  loading: boolean;
  density: 'compact' | 'normal';
  sortConfig: { key: string; direction: 'asc' | 'desc' | null };
  onSort: (col: string) => void;
  selectedDoc: string | null;
  onToggleDoc: (code: string) => void;
  onOpenDrawer: (code: string) => void;
  profileData: any[];
  profileLoading: boolean;
  reportBaseUrl?: string;
  activeHospitals: { id: number; sigla: string }[];
  selectedHospitals: string[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFiltered: number;
  columnWidths: Record<string, number>;
  onResizeStart: (col: string, e: React.MouseEvent) => void;
}

export function DocumentosTable({
  columns,
  data,
  loading,
  density,
  sortConfig,
  onSort,
  selectedDoc,
  onToggleDoc,
  onOpenDrawer,
  profileData,
  profileLoading,
  reportBaseUrl,
  activeHospitals,
  selectedHospitals,
  currentPage,
  totalPages,
  onPageChange,
  totalFiltered,
  columnWidths,
  onResizeStart
}: DocumentosTableProps) {
  // Separa colunas fixas das colunas dinâmicas de hospitais
  const isHospitalCol = (col: string) => {
    return activeHospitals.some(h => h.sigla.toUpperCase() === col.toUpperCase());
  };

  // Filtra colunas de acordo com seleção de hospitais
  const displayedColumns = columns.filter(col => {
    if (!isHospitalCol(col)) return true;
    if (selectedHospitals.length === 0) return true;
    return selectedHospitals.includes(col.toUpperCase());
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Table Container with Horizontal Scroll */}
      <div className={cn(
        "relative overflow-x-auto scrollbar-thin max-w-full",
        density === 'compact' ? "density-compact" : "density-normal"
      )}>
        <table className="w-full border-collapse text-left">
          {/* Header */}
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider select-none">
              {/* Sticky Col 1: CÓDIGO */}
              <th 
                className="sticky left-0 z-20 bg-slate-100/95 backdrop-blur-xs px-3.5 py-3 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[90px]"
                onClick={() => onSort('CÓDIGO')}
              >
                <div className="flex items-center justify-between cursor-pointer group">
                  <span className="group-hover:text-sky-700 transition-colors">CÓDIGO</span>
                  {sortConfig.key === 'CÓDIGO' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={13} className="text-sky-600" /> : <ChevronDown size={13} className="text-sky-600" />
                  )}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400"
                  onMouseDown={(e) => onResizeStart('CÓDIGO', e)}
                />
              </th>

              {/* Sticky Col 2: NOME */}
              <th 
                className="sticky left-[90px] z-20 bg-slate-100/95 backdrop-blur-xs px-3.5 py-3 border-r border-slate-200/80 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.08)] min-w-[260px] max-w-[360px]"
                onClick={() => onSort('NOME')}
              >
                <div className="flex items-center justify-between cursor-pointer group">
                  <span className="group-hover:text-sky-700 transition-colors">DOCUMENTO CLÍNICO</span>
                  {sortConfig.key === 'NOME' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={13} className="text-sky-600" /> : <ChevronDown size={13} className="text-sky-600" />
                  )}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400"
                  onMouseDown={(e) => onResizeStart('NOME', e)}
                />
              </th>

              {/* Scrollable General & Hospital Columns */}
              {displayedColumns.filter(c => c !== 'CÓDIGO' && c !== 'NOME').map((col) => {
                const isHospital = isHospitalCol(col);
                const isSorted = sortConfig.key === col;
                const width = columnWidths[col];

                return (
                  <th
                    key={col}
                    style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
                    className={cn(
                      "px-3 py-3 border-r border-slate-200/70 whitespace-nowrap text-center relative",
                      isHospital ? "bg-slate-50/70 text-slate-800" : "bg-slate-100/90 text-slate-700"
                    )}
                    onClick={() => onSort(col)}
                  >
                    <div className="flex items-center justify-center gap-1 cursor-pointer group">
                      <span className={cn(
                        "group-hover:text-sky-700 transition-colors",
                        isHospital && "text-sky-950 font-extrabold"
                      )}>
                        {col}
                      </span>
                      {isSorted && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={13} className="text-sky-600" /> : <ChevronDown size={13} className="text-sky-600" />
                      )}
                    </div>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400"
                      onMouseDown={(e) => onResizeStart(col, e)}
                    />
                  </th>
                );
              })}

              {/* Action Column */}
              <th className="px-3 py-3 text-center text-slate-600 w-16 whitespace-nowrap">
                AÇÕES
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="sticky left-0 bg-white px-3.5 py-3 border-r border-slate-200">
                    <div className="skeleton h-4 w-12" />
                  </td>
                  <td className="sticky left-[90px] bg-white px-3.5 py-3 border-r border-slate-200">
                    <div className="skeleton h-4 w-48" />
                  </td>
                  {displayedColumns.filter(c => c !== 'CÓDIGO' && c !== 'NOME').map(c => (
                    <td key={c} className="px-3 py-3 border-r border-slate-100">
                      <div className="skeleton h-4 w-12 mx-auto" />
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="skeleton h-4 w-6 mx-auto" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={displayedColumns.length + 1} className="py-16 text-center text-slate-400">
                  <Database size={36} className="mx-auto mb-2 opacity-30 text-sky-600" />
                  <p className="text-xs font-semibold">Nenhum documento clínico encontrado com os filtros atuais</p>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const docId = String(row['CÓDIGO'] || row['Codigo'] || row['CODIGO'] || '');
                const docName = String(row['NOME'] || row['Nome'] || row['DS_DOCUMENTO'] || '-');
                const isExpanded = selectedDoc === docId;

                return (
                  <React.Fragment key={docId || rIdx}>
                    <tr 
                      className={cn(
                        "group transition-colors border-b border-slate-100 hover:bg-sky-50/40",
                        isExpanded ? "bg-sky-50/50" : (rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30")
                      )}
                    >
                      {/* Sticky Col 1: CÓDIGO */}
                      <td 
                        className={cn(
                          "sticky left-0 z-10 px-3.5 border-r border-slate-200/80 font-mono text-xs font-bold text-sky-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] cursor-pointer",
                          isExpanded ? "bg-sky-100/90" : "bg-white group-hover:bg-sky-50/70"
                        )}
                        onClick={() => onToggleDoc(docId)}
                        title="Clique para ver Perfis Ambulatoriais deste documento"
                      >
                        <div className="flex items-center gap-1.5">
                          <ChevronRight size={13} className={cn(
                            "text-slate-400 group-hover:text-sky-600 transition-transform shrink-0",
                            isExpanded && "rotate-90 text-sky-700"
                          )} />
                          <span>{docId}</span>
                        </div>
                      </td>

                      {/* Sticky Col 2: NOME */}
                      <td 
                        className={cn(
                          "sticky left-[90px] z-10 px-3.5 border-r border-slate-200/80 font-medium text-slate-900 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.08)] cursor-pointer truncate max-w-[360px]",
                          isExpanded ? "bg-sky-100/90 font-bold" : "bg-white group-hover:bg-sky-50/70"
                        )}
                        onClick={() => onToggleDoc(docId)}
                        title={docName}
                      >
                        {docName}
                      </td>

                      {/* Scrollable Columns */}
                      {displayedColumns.filter(c => c !== 'CÓDIGO' && c !== 'NOME').map((col) => {
                        const val = row[col];
                        const isHospital = isHospitalCol(col);
                        const numVal = Number(val);
                        const hasUsage = !isNaN(numVal) && numVal > 0;

                        return (
                          <td 
                            key={col}
                            className={cn(
                              "px-3 border-r border-slate-100 text-center font-mono tabular-nums whitespace-nowrap",
                              isHospital && "text-xs"
                            )}
                          >
                            {isHospital ? (
                              hasUsage ? (
                                <span 
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs"
                                  title={`Em uso em ${col}`}
                                >
                                  <Check size={13} strokeWidth={2.5} />
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-500 border border-rose-200/70 shadow-2xs"
                                  title={`Sem uso em ${col}`}
                                >
                                  <X size={13} strokeWidth={2.5} />
                                </span>
                              )
                            ) : (
                              <span className="text-slate-700 text-xs">
                                {val !== undefined && val !== null ? String(val) : '—'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Action Cell */}
                      <td className="px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onOpenDrawer(docId)}
                          title="Inspecionar Metadados e Regras SQL"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-100/60 transition-all"
                        >
                          <Info size={15} />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Drilldown: Ambulatory Profiles for this Doc */}
                    {isExpanded && (
                      <tr className="bg-sky-50/30 border-b border-sky-100">
                        <td colSpan={displayedColumns.length + 1} className="p-4 sm:p-5">
                          <div className="bg-white rounded-xl border border-sky-200/80 p-4 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <Layers size={15} className="text-sky-600" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                  Perfis Ambulatoriais Vinculados ao Documento {docId}
                                </h4>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {profileData.length} perfil(s) correlacionado(s)
                              </span>
                            </div>

                            {profileLoading ? (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                Carregando correlações de perfis...
                              </div>
                            ) : profileData.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/60">
                                      <th className="px-3 py-2 text-left">CÓDIGO</th>
                                      <th className="px-3 py-2 text-left">PERFIL AMBULATORIAL</th>
                                      <th className="px-3 py-2 text-center">UNIDADE / EMPRESA</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {profileData.map((p, pIdx) => (
                                      <tr key={pIdx} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">
                                          {p.CD_DOCUMENTO || docId}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-slate-800">
                                          {p.DS_PERFIL_AMBULATORIAL || p.NM_TITULO || 'Acessível'}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                            {p.EMPRESA || 'Todas'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 py-3 text-center italic">
                                Nenhum perfil ambulatorial restrito diretamente a este documento.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Exibindo <b>{data.length}</b> de <b>{totalFiltered}</b> documentos</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs"
            >
              Anterior
            </button>
            <span className="px-2 text-xs font-mono font-medium text-slate-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
