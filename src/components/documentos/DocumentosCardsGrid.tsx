"use client";

import React from 'react';
import {
  FileText, Building2, Layers, Database, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentosCardsGridProps {
  data: any[];
  loading: boolean;
  onOpenModal: (code: string, name?: string, initialTab?: 'specs' | 'profiles') => void;
  activeHospitals: { id: number; sigla: string }[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFiltered: number;
}

export function DocumentosCardsGrid({
  data,
  loading,
  onOpenModal,
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
              className="sylva-glass rounded-[22px] p-5 flex flex-col justify-between space-y-4 animate-pulse"
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
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
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
      <div className="sylva-glass rounded-[22px] p-16 text-center">
        <Database size={42} className="mx-auto mb-3 opacity-35 text-[var(--muted)]" />
        <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Nenhum documento encontrado</h3>
        <p className="text-xs text-[var(--muted)]">Tente ajustar seus termos de busca ou filtros de hospital.</p>
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
              className="sylva-glass rounded-[22px] hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                {/* Header do Card: Código e Métricas Rápidas */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
                    <FileText size={11} />
                    #{docId}
                  </span>

                  {totalVal !== null && totalVal !== undefined && (
                    <span
                      className="text-[11px] font-mono font-semibold text-[var(--foreground-secondary)] bg-[var(--card-subtle)] px-2.5 py-0.5 rounded-full border border-[var(--border)]"
                      title="Total de registros produzidos"
                    >
                      {Number(totalVal).toLocaleString('pt-BR')} reg.
                    </span>
                  )}
                </div>

                {/* Título do Documento Clínico */}
                <h3
                  className="text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--accent-ink)] transition-colors line-clamp-2 min-h-[36px] leading-snug cursor-pointer mb-3"
                  onClick={() => onOpenModal(docId, docName, 'specs')}
                  title={docName}
                >
                  {docName}
                </h3>

                {/* Metadados: Último uso */}
                <div className="bg-[var(--card-subtle)] rounded-xl p-2.5 border border-[var(--border)] text-[11px] text-[var(--foreground-secondary)] space-y-1.5 mb-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)] flex items-center gap-1">
                      <Clock size={12} />
                      Último uso:
                    </span>
                    <span className="font-mono font-semibold text-[var(--foreground)]">
                      {ultUso !== '-' ? ultUso : 'Sem registro'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)] flex items-center gap-1">
                      <Building2 size={12} />
                      Hospitais ativos:
                    </span>
                    <span className="font-semibold text-[var(--accent-ink)]">
                      {hospitalsWithUsage.length} de {activeHospitals.length}
                    </span>
                  </div>
                </div>

                {/* Pílulas de Hospitais onde o documento está em uso */}
                <div className="mb-4">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1.5">
                    Presença em Unidades
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {hospitalsWithUsage.length > 0 ? (
                      hospitalsWithUsage.slice(0, 5).map(h => (
                        <span
                          key={h.id}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full tone-success border"
                          title={`Ativo em ${h.sigla}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" />
                          {h.sigla}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--muted)] italic">
                        Não ativo em hospitais selecionados
                      </span>
                    )}
                    {hospitalsWithUsage.length > 5 && (
                      <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full tone-neutral border opacity-60">
                        +{hospitalsWithUsage.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Card */}
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenModal(docId, docName, 'specs')}
                  className="flex-1 h-8 text-[11px] gap-1.5"
                >
                  <Layers size={12} className="text-[var(--accent-ink)]" />
                  Metadados
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenModal(docId, docName, 'profiles')}
                  className="h-8 px-3 text-[11px] gap-1.5"
                  title="Abrir Perfis Ambulatoriais Vinculados"
                >
                  <Layers size={12} className="text-[var(--accent-ink)]" />
                  <span>Perfis</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      <div className="p-3.5 rounded-[22px] sylva-glass flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--foreground-secondary)]">
        <div className="flex items-center gap-2">
          <span>
            Exibindo <b className="text-[var(--foreground)]">{data.length}</b> de{' '}
            <b className="text-[var(--foreground)]">{totalFiltered}</b> documentos em Cards
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
