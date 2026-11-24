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
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalFiltered: number;
  columnWidths: Record<string, number>;
  onResizeStart: (col: string, e: React.MouseEvent) => void;
}

const KNOWN_FIXED_COLS = new Set([
  'CÓDIGO', 'CODIGO', 'CD_DOCUMENTO',
  'NOME', 'DOCUMENTO CLÍNICO', 'DS_DOCUMENTO', 'NM_TITULO',
  'TOTAL', 'TOTAL_USO', 'QTD_TOTAL',
  'ÚLTIMO USO', 'ULTIMO USO', 'ULT. GERAL', 'DH_CRIACAO',
  'USO', 'AÇÕES'
]);

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
  pageSize,
  onPageSizeChange,
  totalFiltered,
  columnWidths,
  onResizeStart
}: DocumentosTableProps) {
  const isFixedCol = (col: string) => KNOWN_FIXED_COLS.has(col.toUpperCase().trim());
  const isHospitalCol = (col: string) => !isFixedCol(col);

  // Filtra colunas de hospitais de acordo com empresas ativas e seleção de hospitais
  const displayedColumns = columns.filter(col => {
    const upper = col.toUpperCase().trim();
    if (isFixedCol(upper)) return true;

    // Se é coluna de hospital/unidade: deve pertencer a uma empresa explicitamente ATIVA
    const matchingHospital = activeHospitals.find(
      h => (h.sigla && h.sigla.toUpperCase() === upper) || String(h.id) === upper
    );
    if (!matchingHospital) return false;

    // Se o usuário selecionou filtros de unidades específicas na barra
    if (selectedHospitals.length > 0) {
      return selectedHospitals.some(
        sel => sel.toUpperCase() === matchingHospital.sigla.toUpperCase() || sel === String(matchingHospital.id)
      );
    }
    return true;
  });

  // Padronização fixa no modo compacto
  const rowPadding = 'py-1.5 px-3';
  const headerPadding = 'py-2.5 px-3';
  const fontSize = 'text-[11px]';
  const dateFontSize = 'text-[10px]';

  // Colunas do meio (excluindo CÓDIGO, NOME e AÇÕES)
  const middleColumns = displayedColumns.filter(c => {
    const upper = c.toUpperCase().trim();
    return upper !== 'CÓDIGO' && upper !== 'CODIGO' && upper !== 'CD_DOCUMENTO' &&
           upper !== 'NOME' && upper !== 'DOCUMENTO CLÍNICO' && upper !== 'DS_DOCUMENTO' && upper !== 'NM_TITULO' &&
           upper !== 'AÇÕES';
  });

  return (
    <div className="sylva-glass rounded-[24px] overflow-hidden flex flex-col shadow-xs border border-[var(--border)]">
      {/* Table Container with Horizontal and Vertical Scroll */}
      <div className="relative overflow-auto scrollbar-thin max-w-full max-h-[calc(100vh-280px)] min-h-[380px]">
        <table className={cn("w-full border-collapse text-left", fontSize)}>
          {/* Header Sylva */}
          <thead className="sticky top-0 z-30 bg-[var(--surface-sticky)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]">
            <tr className="border-b border-[var(--border)] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] select-none">
              {/* Sticky Col 1: CÓDIGO */}
              <th
                className={cn(
                  "sticky left-0 top-0 z-40 bg-[var(--surface-sticky)] border-r border-[var(--border)] w-[96px] min-w-[96px] max-w-[96px] relative",
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
                  "sticky left-[96px] top-0 z-40 bg-[var(--surface-sticky)] border-r border-[var(--border)] shadow-[6px_0_12px_-8px_rgba(0,0,0,0.35)] w-[320px] min-w-[280px] max-w-[380px] relative",
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
              {middleColumns.map((col) => {
                const isHospital = isHospitalCol(col);
                const isSorted = sortConfig.key === col;
                const width = columnWidths[col];

                return (
                  <th
                    key={col}
                    style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined}
                    className={cn(
                      "whitespace-nowrap text-center relative bg-[var(--surface-sticky)] border-r border-[var(--border)] sticky top-0 z-30",
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

              {/* Sticky Action Column (Always visible on the right edge) */}
              <th className={cn(
                "text-center bg-[var(--surface-sticky)] sticky right-0 top-0 z-40 border-l border-[var(--border)] shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.30)] w-[84px] min-w-[84px] whitespace-nowrap",
                headerPadding
              )}>
                AÇÕES
              </th>
            </tr>
          </thead>

          {/* Body Padronizado */}
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className={cn("sticky left-0 bg-[var(--surface-sticky)] border-r border-[var(--border)] w-[96px]", rowPadding)}>
                    <div className="skeleton h-4 w-12" />
                  </td>
                  <td className={cn("sticky left-[96px] bg-[var(--surface-sticky)] border-r border-[var(--border)] w-[320px]", rowPadding)}>
                    <div className="skeleton h-4 w-48" />
                  </td>
                  {middleColumns.map(c => (
                    <td key={c} className={cn("border-r border-[var(--border-subtle)]", rowPadding)}>
                      <div className="skeleton h-4 w-12 mx-auto" />
                    </td>
                  ))}
                  <td className={cn("sticky right-0 bg-[var(--surface-sticky)] border-l border-[var(--border)] text-center w-[84px]", rowPadding)}>
                    <div className="skeleton h-4 w-12 mx-auto" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={middleColumns.length + 3} className="py-16 text-center text-[var(--muted)]">
                  <Database size={36} className="mx-auto mb-2 opacity-35 text-[var(--muted)]" />
                  <p className="text-xs font-semibold">Nenhum documento clínico encontrado com os filtros atuais</p>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const docId = String(row['CÓDIGO'] || row['CODIGO'] || row['CD_DOCUMENTO'] || '');
                const docName = String(row['DOCUMENTO CLÍNICO'] || row['NOME'] || row['DS_DOCUMENTO'] || row['NM_TITULO'] || 'Sem Nome');

                return (
                  <tr
                    key={docId || rIdx}
                    className="group border-b border-[var(--border-subtle)] hover:bg-[var(--card-subtle)] transition-colors"
                  >
                    {/* Sticky Col 1: CÓDIGO - Abre Modal na aba Perfis */}
                    <td
                      className={cn(
                        "sticky left-0 z-20 border-r border-[var(--border)] bg-[var(--surface-sticky)] group-hover:bg-[var(--surface-sticky-hover)] cursor-pointer transition-colors w-[96px] min-w-[96px] max-w-[96px]",
                        rowPadding
                      )}
                      onClick={() => onOpenModal(docId, docName, 'profiles')}
                      title="Clique para inspecionar Perfis Vinculados deste documento"
                    >
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)] group-hover:text-[var(--accent-ink)] group-hover:border-[var(--tint-olive-border)] transition-colors">
                        <Layers size={11} className="shrink-0" />
                        <span>#{docId}</span>
                      </span>
                    </td>

                    {/* Sticky Col 2: NOME - Abre Modal nos Detalhes */}
                    <td
                      className={cn(
                        "sticky left-[96px] z-20 border-r border-[var(--border)] bg-[var(--surface-sticky)] group-hover:bg-[var(--surface-sticky-hover)] shadow-[6px_0_12px_-8px_rgba(0,0,0,0.35)] font-medium text-[var(--foreground)] group-hover:text-[var(--accent-ink)] cursor-pointer truncate w-[320px] min-w-[280px] max-w-[380px] transition-colors",
                        rowPadding
                      )}
                      onClick={() => onOpenModal(docId, docName, 'specs')}
                      title={`${docName} - Clique para abrir Detalhes e Metadados`}
                    >
                      {docName}
                    </td>

                    {/* Scrollable Middle Columns */}
                    {middleColumns.map((col) => {
                      const val = row[col];
                      const isHospital = isHospitalCol(col);
                      const numVal = Number(val);
                      const hasUsage = val === '1' || val === 1 || (!isNaN(numVal) && numVal > 0);

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

                    {/* Action Cell Sticky com 2 atalhos diretos para o Modal Unificado */}
                    <td className={cn(
                      "sticky right-0 z-20 bg-[var(--surface-sticky)] group-hover:bg-[var(--surface-sticky-hover)] border-l border-[var(--border)] shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.30)] text-center whitespace-nowrap w-[84px] min-w-[84px]",
                      rowPadding
                    )}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          aria-label="Abrir Perfis Vinculados deste Documento"
                          onClick={() => onOpenModal(docId, docName, 'profiles')}
                          title="Abrir Perfis Vinculados deste Documento"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] opacity-75 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Layers size={13} />
                        </button>

                        <button
                          type="button"
                          aria-label="Inspecionar Metadados, Regras e Campos"
                          onClick={() => onOpenModal(docId, docName, 'specs')}
                          title="Inspecionar Metadados, Regras e Campos"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] opacity-75 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Info size={13} />
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

      {/* Pagination Footer Padronizado e Acessível */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--foreground-secondary)] bg-[var(--surface-sticky)]">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            Exibindo <b className="text-[var(--foreground)]">{data.length}</b> de{' '}
            <b className="text-[var(--foreground)]">{totalFiltered}</b> documentos
          </span>

          {onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span>Linhas:</span>
              <select
                aria-label="Linhas por página"
                value={pageSize || 25}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="bg-[var(--card-bg)] border border-[var(--border)] text-xs rounded-lg px-2 py-0.5 text-[var(--foreground)] font-semibold cursor-pointer focus:outline-none focus:border-[var(--lime)]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-center sm:self-auto">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="h-8 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            Anterior
          </button>
          <span className="px-3 py-1 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] font-mono font-bold text-[var(--foreground)] text-xs">
            {currentPage} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="h-8 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
