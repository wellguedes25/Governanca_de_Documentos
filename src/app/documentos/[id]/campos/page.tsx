"use client";

import React, { useState, useEffect, useMemo, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Download,
  Sparkles,
  Zap,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  GitCompareArrows,
  TableProperties,
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';
import { getFieldTypeBadge } from '@/components/documentos/DocumentDetailsModal';
import toast from 'react-hot-toast';

interface FieldRecord {
  CD_CAMPO: number;
  DS_IDENTIFICADOR: string;
  DS_CAMPO: string;
  CD_METADADO: number | null;
  SN_ATIVO: number;
  CD_TIPO_VISUALIZACAO: number;
  DS_TIPO_VISUALIZACAO: string;
  CD_LAYOUT: number;
  CD_TIPO_LAYOUT: number;
  DS_TIPO_LAYOUT: string;
  VL_VERSAO: number;
  TP_VERSAO: string;
  SN_PUBLICADO: number;
  QTD_REGRAS: number;
}

export default function DocumentCamposPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-[var(--muted)]">
          Carregando campos do documento...
        </div>
      }
    >
      <DocumentCamposContent docId={resolvedParams.id} />
    </Suspense>
  );
}

function DocumentCamposContent({ docId }: { docId: string }) {
  const searchParams = useSearchParams();
  const { docVersion } = useUI();
  const urlVersion = searchParams.get('version');
  const resolvedVersion: 'V2' | 'V3' =
    (urlVersion || docVersion || 'V3').toUpperCase() === 'V2' ? 'V2' : 'V3';

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [docTitle, setDocTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filtros (null = usa automaticamente a versão publicada quando disponível)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<number | 'ALL' | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<'ALL' | number>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | '1' | '0'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedHasRules, setSelectedHasRules] = useState<'ALL' | 'WITH_RULES' | 'WITHOUT_RULES'>('ALL');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchDocInfo() {
      try {
        const res = await fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'METADATA',
            version: resolvedVersion,
            params: { CD_DOCUMENTO: docId },
          }),
        });
        const data = await res.json();
        if (active && data.rows && data.rows.length > 0) {
          setDocTitle(data.rows[0].DESCRICAO_DOCUMENTO || '');
        }
      } catch (e) {
        console.error('Erro ao buscar título do documento:', e);
      }
    }

    async function loadFields() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'FIELDS',
            version: resolvedVersion,
            params: { CD_DOCUMENTO: docId },
          }),
        });
        const data = await res.json();
        if (!active) return;
        if (data.error) {
          setError(data.error);
        } else {
          setFields(data.rows || []);
          if (data.rows && data.rows.length > 0) {
            fetchDocInfo();
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Falha ao buscar campos do documento.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (docId) {
      loadFields();
    }

    return () => {
      active = false;
    };
  }, [docId, resolvedVersion]);

  // Versões disponíveis
  const versions = useMemo(() => {
    const map = new Map<
      number,
      { version: number; type: string; published: number; count: number }
    >();
    fields.forEach((f) => {
      const v = f.VL_VERSAO;
      if (v !== undefined && v !== null) {
        if (!map.has(v)) {
          map.set(v, {
            version: v,
            type: f.TP_VERSAO || (f.SN_PUBLICADO === 1 ? 'PUBLISHED' : 'HISTORY'),
            published: f.SN_PUBLICADO ?? 0,
            count: 0,
          });
        }
        map.get(v)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.version - a.version);
  }, [fields]);

  const effectiveVersion = useMemo<number | 'ALL'>(() => {
    if (selectedVersion !== null) return selectedVersion;
    const pub = versions.find((v) => v.published === 1);
    return pub ? pub.version : 'ALL';
  }, [selectedVersion, versions]);

  // Tipos de componentes únicos
  const componentTypes = useMemo(() => {
    const types = new Set<string>();
    fields.forEach((f) => {
      if (f.DS_TIPO_VISUALIZACAO) types.add(f.DS_TIPO_VISUALIZACAO);
    });
    return Array.from(types).sort();
  }, [fields]);

  // Campos filtrados
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      if (effectiveVersion !== 'ALL' && f.VL_VERSAO !== effectiveVersion) return false;
      if (selectedLayout !== 'ALL' && f.CD_TIPO_LAYOUT !== selectedLayout) return false;
      if (selectedStatus !== 'ALL' && String(f.SN_ATIVO) !== selectedStatus) return false;
      if (selectedType !== 'ALL' && f.DS_TIPO_VISUALIZACAO !== selectedType) return false;
      if (selectedHasRules === 'WITH_RULES' && (!f.QTD_REGRAS || f.QTD_REGRAS === 0)) {
        return false;
      }
      if (selectedHasRules === 'WITHOUT_RULES' && f.QTD_REGRAS > 0) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTag = String(f.DS_IDENTIFICADOR || '').toLowerCase().includes(term);
        const matchName = String(f.DS_CAMPO || '').toLowerCase().includes(term);
        const matchMeta = String(f.CD_METADADO || '').toLowerCase().includes(term);
        const matchType = String(f.DS_TIPO_VISUALIZACAO || '').toLowerCase().includes(term);
        const matchLayout = String(f.DS_TIPO_LAYOUT || '').toLowerCase().includes(term);
        if (!matchTag && !matchName && !matchMeta && !matchType && !matchLayout) return false;
      }
      return true;
    });
  }, [
    fields,
    effectiveVersion,
    selectedLayout,
    selectedStatus,
    selectedType,
    selectedHasRules,
    searchTerm,
  ]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredFields.length;
    const active = filteredFields.filter((f) => f.SN_ATIVO === 1).length;
    const withMetadata = filteredFields.filter(
      (f) => f.CD_METADADO !== null && f.CD_METADADO !== undefined
    ).length;
    const withRules = filteredFields.filter((f) => f.QTD_REGRAS > 0).length;
    return { total, active, withMetadata, withRules };
  }, [filteredFields]);

  // Contagem de campos por layout para a versão selecionada
  const layoutCountsForVersion = useMemo(() => {
    const targetVer =
      effectiveVersion !== 'ALL'
        ? effectiveVersion
        : versions.find((v) => v.published === 1)?.version || versions[0]?.version;
    const list =
      effectiveVersion === 'ALL'
        ? fields
        : fields.filter((f) => f.VL_VERSAO === targetVer);
    const tela = list.filter((f) => f.CD_TIPO_LAYOUT === 1).length;
    const relatorio = list.filter((f) => f.CD_TIPO_LAYOUT === 2).length;
    return { all: list.length, tela, relatorio, targetVer };
  }, [fields, effectiveVersion, versions]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(text);
    toast.success(`Identificador copiado: ${text}`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const exportCSV = () => {
    if (!filteredFields.length) {
      toast.error('Nenhum campo para exportar.');
      return;
    }
    const headers = [
      'Documento',
      'Versão',
      'Layout',
      'Identificador',
      'Descrição',
      'Metadado_ID',
      'Tipo_Componente',
      'Status',
      'Qtd_Regras',
    ];
    const rows = filteredFields.map((f) => [
      `"${docId}"`,
      `"${f.VL_VERSAO || ''}"`,
      `"${f.DS_TIPO_LAYOUT || ''}"`,
      `"${f.DS_IDENTIFICADOR || ''}"`,
      `"${(f.DS_CAMPO || '').replace(/"/g, '""')}"`,
      `"${f.CD_METADADO || ''}"`,
      `"${f.DS_TIPO_VISUALIZACAO || ''}"`,
      `"${f.SN_ATIVO === 1 ? 'Ativo' : 'Inativo'}"`,
      `"${f.QTD_REGRAS || 0}"`,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_campos_doc_${docId}_v${effectiveVersion}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  const hasActiveFilters =
    effectiveVersion !== 'ALL' ||
    selectedLayout !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedType !== 'ALL' ||
    selectedHasRules !== 'ALL' ||
    Boolean(searchTerm);

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho Sylva Frosted Glass */}
      <header className="sylva-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/documentos"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              title="Voltar para Catálogo de Documentos"
            >
              <ArrowLeft size={13} />
              <span>Catálogo</span>
            </Link>

            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
              Doc #{docId}
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tone-success border">
              {resolvedVersion === 'V3' ? 'Editor 3.0 (V3)' : 'Editor 2.0 (V2)'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <TableProperties size={22} className="text-[var(--accent-ink)] shrink-0" />
            <span className="truncate">{docTitle || `Documento #${docId}`}</span>
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Governança de metadados, identificadores técnicos e componentes do formulário.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {resolvedVersion === 'V3' && (
            <Link
              href={`/documentos/${docId}/versoes?engine=V3`}
              className="h-9 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5"
            >
              <GitCompareArrows size={13} />
              <span>Comparar Versões</span>
            </Link>
          )}

          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || filteredFields.length === 0}
            className="h-9 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>

          <Link
            href={`/linhagem?focus=${docId}`}
            className="h-9 px-4 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
          >
            <Layers size={13} />
            <span>Ver no Grafo de Linhagem</span>
          </Link>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="sylva-card p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
            Total no Filtro
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] font-mono">
              {kpis.total}
            </span>
            <span className="text-xs text-[var(--muted)]">campos</span>
          </div>
        </div>

        <div className="sylva-card p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
            Campos Ativos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--tone-success-fg)] font-mono">
              {kpis.active}
            </span>
            <span className="text-xs text-[var(--foreground-secondary)] font-mono">
              {kpis.total > 0 ? `${Math.round((kpis.active / kpis.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        <div className="sylva-card p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
            Metadados Reutilizáveis
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--tone-info-fg)] font-mono">
              {kpis.withMetadata}
            </span>
            <span className="text-xs text-[var(--muted)]">padronizados</span>
          </div>
        </div>

        <div className="sylva-card p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
            Com Regras Vinculadas
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--tone-warning-fg)] font-mono">
              {kpis.withRules}
            </span>
            <span className="text-xs text-[var(--muted)]">com automações</span>
          </div>
        </div>
      </section>

      {/* Filters Toolbar */}
      <section className="sylva-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por identificador, rótulo, código ou metadado..."
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--foreground-secondary)] shrink-0">
              Versão:
            </span>
            <select
              value={String(effectiveVersion)}
              onChange={(e) =>
                setSelectedVersion(
                  e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                )
              }
              className="h-9 text-xs font-semibold bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] cursor-pointer"
            >
              <option value="ALL">Todas as Versões ({fields.length} campos)</option>
              {versions.map((v) => {
                const verType = String(v.type || '').toUpperCase();
                const statusLabel =
                  verType === 'PUBLISHED' || v.published === 1
                    ? '★ Publicada'
                    : ['EDITABLE', 'EDITAVEL'].includes(verType)
                      ? 'Editável'
                      : verType === 'TEST' || verType === 'DRAFT'
                        ? 'Em Teste'
                        : 'Histórico';
                return (
                  <option key={v.version} value={v.version}>
                    v{v.version} — {statusLabel} ({v.count} campos)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Secondary Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border)] text-xs">
          {/* Layout Filter */}
          <div className="flex items-center gap-1 bg-[var(--card-subtle)] p-1 rounded-xl border border-[var(--border)]">
            {[
              { key: 'ALL' as const, label: 'Todos Layouts', count: layoutCountsForVersion.all },
              { key: 1 as const, label: 'Tela (Editor)', count: layoutCountsForVersion.tela },
              {
                key: 2 as const,
                label: 'Relatório (Impressão)',
                count: layoutCountsForVersion.relatorio,
              },
            ].map((item) => {
              const isSelected = selectedLayout === item.key;
              return (
                <button
                  key={String(item.key)}
                  type="button"
                  onClick={() => setSelectedLayout(item.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer',
                    isSelected
                      ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold'
                      : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10.5px] opacity-75">({item.count})</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[var(--card-subtle)] p-1 rounded-xl border border-[var(--border)]">
            {[
              { key: 'ALL' as const, label: 'Todos' },
              { key: '1' as const, label: 'Ativos' },
              { key: '0' as const, label: 'Inativos' },
            ].map((item) => {
              const isSelected = selectedStatus === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedStatus(item.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer',
                    isSelected
                      ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold'
                      : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Component Type Filter */}
          {componentTypes.length > 0 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 text-xs bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-2.5 font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] cursor-pointer"
            >
              <option value="ALL">Todos Componentes</option>
              {componentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Rules Filter */}
          <button
            type="button"
            onClick={() =>
              setSelectedHasRules(
                selectedHasRules === 'WITH_RULES' ? 'ALL' : 'WITH_RULES'
              )
            }
            className={cn(
              'h-8 px-3 rounded-xl font-semibold transition-all border flex items-center gap-1.5 cursor-pointer',
              selectedHasRules === 'WITH_RULES'
                ? 'tone-warning border font-bold'
                : 'bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border-[var(--border)] hover:text-[var(--foreground)]'
            )}
          >
            <Zap size={12} />
            <span>Apenas com Regras</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedVersion('ALL');
                setSelectedLayout('ALL');
                setSelectedStatus('ALL');
                setSelectedType('ALL');
                setSelectedHasRules('ALL');
                setSearchTerm('');
              }}
              className="text-[var(--accent-ink)] hover:underline font-bold text-xs ml-auto cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </section>

      {/* Fields Table */}
      <section className="sylva-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="skeleton h-9 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="p-8 text-center tone-danger">
            <AlertTriangle size={30} className="mx-auto mb-2" />
            <p className="font-bold text-sm">Erro ao carregar campos</p>
            <p className="text-xs opacity-90 mt-1">{error}</p>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="p-14 text-center text-[var(--muted)]">
            <Search size={34} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm text-[var(--foreground)]">
              Nenhum campo encontrado
            </p>
            <p className="text-xs mt-1">
              Tente ajustar os termos de busca ou filtros de layout/versão.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--card-subtle)] text-[var(--muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3.5 px-4">Identificador Técnico</th>
                  <th className="py-3.5 px-4">Rótulo / Descrição</th>
                  <th className="py-3.5 px-3">Componente</th>
                  <th className="py-3.5 px-3">Metadado Padrão</th>
                  <th className="py-3.5 px-3">Layout</th>
                  <th className="py-3.5 px-3">Versão</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-center">Regras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredFields.map((field, idx) => {
                  const typeBadge = getFieldTypeBadge(field.DS_TIPO_VISUALIZACAO);
                  const isCopied = copiedTag === field.DS_IDENTIFICADOR;

                  return (
                    <tr
                      key={`fld_row_${field.CD_CAMPO}_${field.VL_VERSAO}_${field.CD_LAYOUT}_${idx}`}
                      className="hover:bg-[var(--card-hover)] transition-colors group"
                    >
                      {/* Identificador */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(field.DS_IDENTIFICADOR)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:brightness-110 text-[var(--accent-ink)] border border-[var(--tint-olive-border)] transition-all text-left cursor-pointer"
                          title="Clique para copiar identificador técnico"
                        >
                          <span>{field.DS_IDENTIFICADOR}</span>
                          {isCopied ? (
                            <Check size={12} className="shrink-0" />
                          ) : (
                            <Copy
                              size={12}
                              className="opacity-55 group-hover:opacity-100 shrink-0"
                            />
                          )}
                        </button>
                      </td>

                      {/* Rótulo / Descrição */}
                      <td className="py-3 px-4 font-medium text-[var(--foreground)] max-w-xs">
                        {field.DS_CAMPO && field.DS_CAMPO !== field.DS_IDENTIFICADOR ? (
                          <span>{field.DS_CAMPO}</span>
                        ) : (
                          <span className="italic text-[var(--muted)]">
                            Sem rótulo customizado
                          </span>
                        )}
                      </td>

                      {/* Tipo de Componente */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            typeBadge.color
                          )}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Metadado Padrão */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {field.CD_METADADO ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full tone-success border font-mono text-[10.5px] font-bold">
                            <Sparkles size={10} />
                            <span>MD #{field.CD_METADADO}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] font-mono text-[11px]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Layout */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                            field.CD_TIPO_LAYOUT === 1
                              ? 'tone-info'
                              : 'bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border-[var(--border)]'
                          )}
                        >
                          {field.DS_TIPO_LAYOUT ||
                            (field.CD_TIPO_LAYOUT === 1 ? 'Tela' : 'Relatório')}
                        </span>
                      </td>

                      {/* Versão */}
                      <td className="py-3 px-3 font-mono font-semibold text-[var(--foreground-secondary)] whitespace-nowrap">
                        v{field.VL_VERSAO}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                            field.SN_ATIVO === 1 ? 'tone-success' : 'tone-neutral'
                          )}
                        >
                          {field.SN_ATIVO === 1 ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Regras */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {field.QTD_REGRAS > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full tone-warning border font-bold font-mono text-[10.5px]">
                            <Zap size={11} />
                            <span>{field.QTD_REGRAS}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] font-mono text-[11px]">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
