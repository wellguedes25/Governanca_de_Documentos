"use client";

import React from 'react';
import { 
  ChevronUp, ChevronDown, Info, 
  Database, Layers, Check, X
} from 'lucide-react';
import { cn, formatDateTime, isDateLike } from '@/lib/utils';

interface DocumentosTableProps {
  columns: string[];
  data: any[];
  loading: boolean;
  density: 'compact' | 'normal';
  sortConfig: { key: string; direction: 'asc' | 'desc' | null };
  onSort: (col: string) => void;
  onOpenDrawer: (code: string) => void;
  onOpenProfiles: (code: string, name?: string) => void;
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
  onOpenDrawer,
  onOpenProfiles,
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

  // Padronização tipográfica e de espaçamento conforme a densidade
  const rowPadding = density === 'compact' ? 'py-1.5 px-3' : 'py-2.5 px-3.5';
  const headerPadding = density === 'compact' ? 'py-2 px-3' : 'py-3 px-3.5';
  const fontSize = density === 'compact' ? 'text-[11px]' : 'text-xs';
  const dateFontSize = density === 'compact' ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Table Container with Horizontal Scroll */}
      <div className="relative overflow-x-auto scrollbar-thin max-w-full">
        <table className={cn("w-full border-collapse text-left", fontSize)}>
          {/* Header Padronizado */}
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600 select-none">
              {/* Sticky Col 1: CÓDIGO */}
              <th 
                className={cn(
                  "sticky left-0 z-20 bg-slate-100/95 backdrop-blur-xs border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[90px]",
                  headerPadding
                )}
                onClick={() => onSort('CÓDIGO')}
              >
                <div className="flex items-center justify-between cursor-pointer group">
                  <span className="group-hover:text-[#004953] transition-colors">CÓDIGO</span>
                  {sortConfig.key === 'CÓDIGO' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={13} className="text-[#004953]" /> : <ChevronDown size={13} className="text-[#004953]" />
                  )}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400"
                  onMouseDown={(e) => onResizeStart('CÓDIGO', e)}
                />
              </th>

              {/* Sticky Col 2: NOME */}
              <th 
                className={cn(
                  "sticky left-[90px] z-20 bg-slate-100/95 backdrop-blur-xs border-r border-slate-200/80 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.08)] min-w-[280px] max-w-[380px]",
                  headerPadding
                )}
                onClick={() => onSort('NOME')}
              >
                <div className="flex items-center justify-between cursor-pointer group">
                  <span className="group-hover:text-[#004953] transition-colors">DOCUMENTO CLÍNICO</span>
                  {sortConfig.key === 'NOME' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={13} className="text-[#004953]" /> : <ChevronDown size={13} className="text-[#004953]" />
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
                      "border-r border-slate-200/70 whitespace-nowrap text-center relative",
                      headerPadding,
                      isHospital ? "bg-slate-50/70 text-slate-800 font-bold font-mono" : "bg-slate-100/90 text-slate-600 font-semibold"
                    )}
                    onClick={() => onSort(col)}
                  >
                    <div className="flex items-center justify-center gap-1 cursor-pointer group">
                      <span className={cn(
                        "group-hover:text-[#004953] transition-colors",
                        isHospital && "text-slate-900 font-bold"
                      )}>
                        {col}
                      </span>
                      {isSorted && (
                        sortConfig.direction === 'asc' ? <ChevronUp size={13} className="text-[#004953]" /> : <ChevronDown size={13} className="text-[#004953]" />
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
              <th className={cn("text-center text-slate-600 w-24 whitespace-nowrap", headerPadding)}>
                AÇÕES
              </th>
            </tr>
          </thead>

          {/* Body Padronizado */}
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className={cn("sticky left-0 bg-white border-r border-slate-200", rowPadding)}>
                    <div className="skeleton h-4 w-12" />
                  </td>
                  <td className={cn("sticky left-[90px] bg-white border-r border-slate-200", rowPadding)}>
                    <div className="skeleton h-4 w-48" />
                  </td>
                  {displayedColumns.filter(c => c !== 'CÓDIGO' && c !== 'NOME').map(c => (
                    <td key={c} className={cn("border-r border-slate-100", rowPadding)}>
                      <div className="skeleton h-4 w-12 mx-auto" />
                    </td>
                  ))}
                  <td className={cn("text-center", rowPadding)}>
                    <div className="skeleton h-4 w-12 mx-auto" />
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
                const docId = String(row['CÓDIGO'] || row['CD_DOCUMENTO'] || '');
                const docName = String(row['DOCUMENTO CLÍNICO'] || row['NOME'] || row['DS_DOCUMENTO'] || 'Sem Nome');

                return (
                  <tr 
                    key={docId || rIdx}
                    className={cn(
                      "group transition-colors border-b border-slate-100 hover:bg-sky-50/40",
                      rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}
                  >
                    {/* Sticky Col 1: CÓDIGO - Abre gaveta inferior de perfis */}
                    <td 
                      className={cn(
                        "sticky left-0 z-10 border-r border-slate-200/80 font-mono font-bold text-[#004953] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] cursor-pointer group-hover:underline",
                        rowPadding,
                        rIdx % 2 === 0 ? "bg-white group-hover:bg-sky-50/70" : "bg-slate-50/40 group-hover:bg-sky-50/70"
                      )}
                      onClick={() => onOpenProfiles(docId, docName)}
                      title="Clique para abrir Gaveta Inferior de Perfis Ambulatoriais"
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers size={12} className="text-[#004953]/70 group-hover:text-[#004953] shrink-0" />
                        <span>#{docId}</span>
                      </div>
                    </td>

                    {/* Sticky Col 2: NOME - Abre gaveta inferior de perfis */}
                    <td 
                      className={cn(
                        "sticky left-[90px] z-10 border-r border-slate-200/80 font-medium text-slate-800 shadow-[3px_0_5px_-2px_rgba(0,0,0,0.08)] cursor-pointer truncate max-w-[380px] group-hover:text-[#004953]",
                        rowPadding,
                        rIdx % 2 === 0 ? "bg-white group-hover:bg-sky-50/70" : "bg-slate-50/40 group-hover:bg-sky-50/70"
                      )}
                      onClick={() => onOpenProfiles(docId, docName)}
                      title={`${docName} - Clique para abrir Perfis Ambulatoriais`}
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
                            "border-r border-slate-100 text-center font-mono tabular-nums whitespace-nowrap",
                            rowPadding
                          )}
                        >
                          {isHospital ? (
                            hasUsage ? (
                              <span 
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs mx-auto"
                                title={`Em uso em ${col}`}
                              >
                                <Check size={12} strokeWidth={2.5} />
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300 border border-slate-200/70 shadow-2xs mx-auto"
                                title={`Sem uso em ${col}`}
                              >
                                <X size={12} strokeWidth={2} />
                              </span>
                            )
                          ) : (
                            <span className="text-slate-700">
                              {isDateLike(val, col) ? (
                                <span className={cn("font-mono text-slate-600 font-medium whitespace-nowrap", dateFontSize)}>
                                  {formatDateTime(val)}
                                </span>
                              ) : (
                                val !== undefined && val !== null ? (
                                  <span className="font-semibold text-slate-800 font-mono">
                                    {typeof val === 'number' ? val.toLocaleString('pt-BR') : String(val)}
                                  </span>
                                ) : '—'
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Action Cell com 2 botões padronizados */}
                    <td className={cn("text-center whitespace-nowrap", rowPadding)}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Botão 1: Abrir Gaveta Inferior de Perfis */}
                        <button
                          onClick={() => onOpenProfiles(docId, docName)}
                          title="Abrir Perfis Ambulatoriais deste Documento"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#004953] hover:bg-teal-50 transition-all cursor-pointer"
                        >
                          <Layers size={14} />
                        </button>

                        {/* Botão 2: Abrir Gaveta Lateral de Metadados / Regras */}
                        <button
                          onClick={() => onOpenDrawer(docId)}
                          title="Inspecionar Metadados e Regras SQL"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-all cursor-pointer"
                        >
                          <Info size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Padronizado */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Exibindo <b>{data.length}</b> de <b>{totalFiltered}</b> documentos</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800 text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}