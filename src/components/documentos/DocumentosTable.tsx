"use client";

import React from 'react';
import {
  ChevronUp, ChevronDown, Info,
  Database, Layers
} from 'lucide-react';
import { cn, formatDateTime, isDateLike } from '@/lib/utils';

interface DocumentosTableProps {
  columns: string[];
  data: any[];
  loading: boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' | null };
  onSort: (col: string) => void;
  onOpenModal: (code: string, name?: string, initialTab?: 'specs' | 'profiles') => void;
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
  sortConfig,
  onSort,
  onOpenModal,
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

  // Padronização fixa no modo compacto
  const rowPadding = 'py-1.5 px-3';
  const headerPadding = 'py-2.5 px-3';
  const fontSize = 'text-[11px]';
  const dateFontSize = 'text-[10px]';

  return (
    <div className="sylva-glass rounded-[24px] overflow-hidden flex flex-col">
      {/* Table Container with Horizontal Scroll */}
      <div className="relative overflow-x-auto scrollbar-thin max-w-full">
        <table className={cn("w-full border-collapse text-left", fontSize)}>
          {/* Header Sylva */}
          <thead>
            <tr className="border-b border-[var(--border)] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] select-none">
              {/* Sticky Col 1: CÓDIGO */}
              <th
                className={cn(
                  "sticky left-0 z-20 bg-[var(--surface-sticky)] border-r border-[var(--border)] min-w-[90px] relative",
                  headerPadding
                )}
                onClick={() => onSort('CÓDIGO')}
              >
                <div className="flex items-center justify-between cursor-pointer group">
                  <span className="group-hover:text-[var(--foreground)] transition-colors">CÓDIGO</span>
                  {sortConfig.key === 'CÓDIGO' && (
                    sortConfig.direction === 'asc'
                      ? <ChevronUp size={13} className="text-[var(--accent-ink)]" />
                      : <ChevronDown size={13} className="text-[var(--accent-ink)]" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--lime)]/50"
                  onMouseDown={(e) => onResizeStart('CÓDIGO', e)}
                />
              </th>

              {/* Sticky Col 2: NOME */}
              <th
                className={cn(
                  "sticky left-[90px] z-20 bg-[var(--surface-sticky)] border-r border-[var(--border)] shadow-[6px_0_12px_-8px_rgba(0,0,0,0.35)] min-w-[280px] max-w-[380px] relative",
                  headerPadding
                )}
                onClick={() => onSort('NOME')}
              >
                <div className="flex items-center justify-between cursor-pointer group">
                  <span className="group-hover:text-[var(--foreground)] transition-colors">DOCUMENTO CLÍNICO</span>
                  {sortConfig.key === 'NOME' && (
                    sortConfig.direction === 'asc'
                      ? <ChevronUp size={13} className="text-[var(--accent-ink)]" />
                      : <ChevronDown size={13} className="text-[var(--accent-ink)]" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--lime)]/50"
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
                      "whitespace-nowrap text-center relative bg-[var(--surface-sticky)] border-r border-[var(--border)]",
                      headerPadding,
                      isHospital && "font-mono"
                    )}
                    onClick={() => onSort(col)}
                  >
                    <div className="flex items-center justify-center gap-1 cursor-pointer group">
                      <span className="group-hover:text-[var(--foreground)] transition-colors">
                        {col}
                      </span>
                      {isSorted && (
                        sortConfig.direction === 'asc'
                          ? <ChevronUp size={13} className="text-[var(--accent-ink)]" />
                          : <ChevronDown size={13} className="text-[var(--accent-ink)]" />
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--lime)]/50"
                      onMouseDown={(e) => onResizeStart(col, e)}
                    />
                  </th>
                );
              })}

              {/* Action Column */}
              <th className={cn("text-center bg-[var(--surface-sticky)] w-24 whitespace-nowrap", headerPadding)}>
                AÇÕES
              </th>
            </tr>
          </thead>

          {/* Body Padronizado */}
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className={cn("sticky left-0 bg-[var(--surface-sticky)] border-r border-[var(--border)]", rowPadding)}>
                    <div className="skeleton h-4 w-12" />
                  </td>
                  <td className={cn("sticky left-[90px] bg-[var(--surface-sticky)] border-r border-[var(--border)]", rowPadding)}>
                    <div className="skeleton h-4 w-48" />
                  </td>
                  {displayedColumns.filter(c => c !== 'CÓDIGO' && c !== 'NOME').map(c => (
                    <td key={c} className={cn("border-r border-[var(--border-subtle)]", rowPadding)}>
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
                <td colSpan={displayedColumns.length + 1} className="py-16 text-center text-[var(--muted)]">
                  <Database size={36} className="mx-auto mb-2 opacity-35 text-[var(--muted)]" />
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
                    className="group border-b border-[var(--border-subtle)] hover:bg-[var(--card-subtle)] transition-colors"
                  >
                    {/* Sticky Col 1: CÓDIGO - Abre Modal na aba Perfis */}
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface-sticky)] group-hover:bg-[var(--surface-sticky-hover)] cursor-pointer transition-colors",
                        rowPadding
                      )}
                      onClick={() => onOpenModal(docId, docName, 'profiles')}
                      title="Clique para inspecionar Perfis Ambulatoriais deste documento"
                    >
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)] group-hover:text-[var(--accent-ink)] group-hover:border-[var(--tint-olive-border)] transition-colors">
                        <Layers size={11} className="shrink-0" />
                        <span>#{docId}</span>
                      </span>
                    </td>

                    {/* Sticky Col 2: NOME - Abre Modal nos Detalhes */}
                    <td
                      className={cn(
                        "sticky left-[90px] z-10 border-r border-[var(--border)] bg-[var(--surface-sticky)] group-hover:bg-[var(--surface-sticky-hover)] shadow-[6px_0_12px_-8px_rgba(0,0,0,0.35)] font-medium text-[var(--foreground)] group-hover:text-[var(--accent-ink)] cursor-pointer truncate max-w-[380px] transition-colors",
                        rowPadding
                      )}
                      onClick={() => onOpenModal(docId, docName, 'specs')}
                      title={`${docName} - Clique para abrir Detalhes e Metadados`}
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
                            "border-r border-[var(--border-subtle)] text-center font-mono tabular-nums whitespace-nowrap",
                            rowPadding
                          )}
                        >
                          {isHospital ? (
                            hasUsage ? (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--lime)] shadow-[0_0_10px_var(--lime)]"
                                title={`Em uso em ${col}`}
                              />
                            ) : (
                              <span
                                className="inline-block w-2 h-2 rounded-full border border-[var(--border-strong)]"
                                title={`Sem uso em ${col}`}
                              />
                            )
                          ) : (
                            <span>
                              {isDateLike(val, col) ? (
                                <span className={cn("font-mono text-[var(--muted)] font-medium whitespace-nowrap", dateFontSize)}>
                                  {formatDateTime(val)}
                                </span>
                              ) : (
                                val !== undefined && val !== null ? (
                                  <span className="font-semibold text-[var(--foreground)] font-mono tabular-nums">
                                    {typeof val === 'number' ? val.toLocaleString('pt-BR') : String(val)}
                                  </span>
                                ) : (
                                  <span className="text-[var(--muted)]">—</span>
                                )
                              )}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Action Cell com 2 atalhos diretos para o Modal Unificado */}
                    <td className={cn("text-center whitespace-nowrap", rowPadding)}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          aria-label="Abrir Perfis Ambulatoriais deste Documento"
                          onClick={() => onOpenModal(docId, docName, 'profiles')}
                          title="Abrir Perfis Ambulatoriais deste Documento"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Layers size={14} />
                        </button>

                        <button
                          type="button"
                          aria-label="Inspecionar Metadados, Regras e Campos"
                          onClick={() => onOpenModal(docId, docName, 'specs')}
                          title="Inspecionar Metadados, Regras e Campos"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
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
      <div className="px-4 py-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--foreground-secondary)]">
        <div className="flex items-center gap-2">
          <span>
            Exibindo <b className="text-[var(--foreground)]">{data.length}</b> de{' '}
            <b className="text-[var(--foreground)]">{totalFiltered}</b> documentos
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-3 py-1 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] font-mono font-bold text-[var(--foreground)] text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
