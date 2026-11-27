"use client";

import React, { use, useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Code2,
  EyeOff,
  GitCompareArrows,
  History,
  Info,
  ListFilter,
  Search,
  Share2,
  Sparkles,
  TableProperties,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';
import {
  FieldDiffList,
  RuleDiffList,
  SqlActionDiffList,
} from '@/components/documentos/VersionDiffView';
import type {
  DiffChangeStatus,
  DiffCounts,
  VersionCompareResponse,
} from '@/types/version-diff.types';
import toast from 'react-hot-toast';

type DiffSectionTab = 'fields' | 'rules' | 'sqlActions';
type StatusFilter = 'ALL' | 'CHANGED' | DiffChangeStatus;

function formatReadableDelta(counts: DiffCounts, singular: string, plural: string): string {
  if (counts.totalChanged === 0) {
    return 'Sem alterações';
  }
  const parts: string[] = [];
  if (counts.added > 0) {
    parts.push(`${counts.added} ${counts.added === 1 ? 'adicionado' : 'adicionados'}`);
  }
  if (counts.removed > 0) {
    parts.push(`${counts.removed} ${counts.removed === 1 ? 'removido' : 'removidos'}`);
  }
  if (counts.modified > 0) {
    parts.push(`${counts.modified} ${counts.modified === 1 ? 'alterado' : 'alterados'}`);
  }
  if (parts.length === 0) {
    return `${counts.totalChanged} ${counts.totalChanged === 1 ? singular : plural}`;
  }
  return parts.join(' · ');
}

export default function DocumentVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-xs text-[var(--muted)]">
          Carregando comparador de versões...
        </div>
      }
    >
      <DocumentVersionsContent docId={resolvedParams.id} />
    </Suspense>
  );
}

function DocumentVersionsContent({ docId }: { docId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { docVersion } = useUI();

  const urlBase = searchParams.get('base');
  const urlTarget = searchParams.get('target');
  const urlEngine = searchParams.get('engine');
  const effectiveEngine = (urlEngine || docVersion || 'V3').toUpperCase();

  const [data, setData] = useState<VersionCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DiffSectionTab>('fields');
  const [onlyDifferences, setOnlyDifferences] = useState(true);
  const [hideVisualLabels, setHideVisualLabels] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [layoutFilter, setLayoutFilter] = useState<'ALL' | number>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchComparison = useCallback(
    async (baseParam?: string | null, targetParam?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ docId, engine: effectiveEngine });
        if (baseParam) qs.set('base', baseParam);
        if (targetParam) qs.set('target', targetParam);

        const res = await fetch(`/api/documentos/compare?${qs.toString()}`);
        const json = await res.json();
        if (!res.ok || json.error) {
          setError(json.error || 'Falha ao comparar versões do documento.');
          setData(null);
        } else {
          setData(json as VersionCompareResponse);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Erro de comunicação ao comparar versões.'
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [docId, effectiveEngine]
  );

  useEffect(() => {
    if (docId) {
      fetchComparison(urlBase, urlTarget);
    }
  }, [docId, urlBase, urlTarget, fetchComparison]);

  const updateVersionParams = (nextBase: number, nextTarget: number) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('base', String(nextBase));
    qs.set('target', String(nextTarget));
    qs.set('engine', 'V3');
    router.replace(`/documentos/${docId}/versoes?${qs.toString()}`, { scroll: false });
  };

  const handleSwapVersions = () => {
    if (!data?.baseVersion || !data?.targetVersion) return;
    updateVersionParams(data.targetVersion.versionNumber, data.baseVersion.versionNumber);
  };

  const quickHistoryVsPublished = useMemo(() => {
    if (!data?.versions?.length) return null;
    const published = data.versions.find((v) => v.lifecycle === 'published');
    if (!published) return null;
    const latestHistory =
      data.versions.find(
        (v) => v.lifecycle === 'history' && v.versionNumber < published.versionNumber
      ) ?? data.versions.find((v) => v.versionNumber !== published.versionNumber);
    if (!latestHistory) return null;
    return { base: latestHistory.versionNumber, target: published.versionNumber };
  }, [data]);

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link da comparação copiado!');
  };

  const matchesItemFilters = useCallback(
    (
      item: {
        status: DiffChangeStatus;
        layoutId: number;
        identifier: string;
        layoutName: string;
      },
      extraText: string
    ) => {
      if (onlyDifferences && item.status === 'unchanged') return false;
      if (statusFilter === 'CHANGED' && item.status === 'unchanged') return false;
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'CHANGED' &&
        item.status !== statusFilter
      ) {
        return false;
      }
      if (layoutFilter !== 'ALL' && item.layoutId !== layoutFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const hay = `${item.identifier} ${item.layoutName} ${extraText}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    },
    [onlyDifferences, statusFilter, layoutFilter, searchTerm]
  );

  const filteredFields = useMemo(() => {
    if (!data) return [];
    return data.fields.filter((f) => {
      if (hideVisualLabels && f.isVisualElement) return false;
      return matchesItemFilters(
        f,
        `${f.base?.dsCampo ?? ''} ${f.target?.dsCampo ?? ''} ${f.base?.dsTipoVisualizacao ?? ''} ${f.target?.dsTipoVisualizacao ?? ''}`
      );
    });
  }, [data, hideVisualLabels, matchesItemFilters]);

  const filteredRules = useMemo(() => {
    if (!data) return [];
    return data.rules.filter((r) =>
      matchesItemFilters(
        r,
        `${r.displayTitle} ${r.base?.tipoRegra ?? ''} ${r.target?.tipoRegra ?? ''} ${r.base?.condicao ?? ''} ${r.target?.condicao ?? ''} ${r.base?.camposAfetados ?? ''} ${r.target?.camposAfetados ?? ''} ${r.base?.script ?? ''} ${r.target?.script ?? ''}`
      )
    );
  }, [data, matchesItemFilters]);

  const filteredSqlActions = useMemo(() => {
    if (!data) return [];
    return data.sqlActions.filter((s) =>
      matchesItemFilters(
        s,
        `${s.base?.nomeCampo ?? ''} ${s.target?.nomeCampo ?? ''} ${s.base?.script ?? ''} ${s.target?.script ?? ''}`
      )
    );
  }, [data, matchesItemFilters]);

  const availableLayouts = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, string>();
    [...data.fields, ...data.rules, ...data.sqlActions].forEach((item) => {
      if (!map.has(item.layoutId)) {
        map.set(item.layoutId, item.layoutName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [data]);

  const baseLabel = data?.baseVersion ? `v${data.baseVersion.versionNumber}` : 'Base';
  const targetLabel = data?.targetVersion ? `v${data.targetVersion.versionNumber}` : 'Alvo';

  const clinicalSummary = data?.summary.clinicalFields ?? data?.summary.fields;
  const clinicalTotalCount = useMemo(
    () => (data ? data.fields.filter((f) => !f.isVisualElement).length : 0),
    [data]
  );

  const executiveSummarySentence = useMemo(() => {
    if (!data || !data.baseVersion || !data.targetVersion || !clinicalSummary) return '';
    const baseText = `v${data.baseVersion.versionNumber} (${data.baseVersion.label})`;
    const targetText = `v${data.targetVersion.versionNumber} (${data.targetVersion.label})`;

    if (data.summary.totalChanges === 0) {
      return `Nenhuma diferença estrutural encontrada entre ${baseText} e ${targetText}.`;
    }

    const parts: string[] = [];
    if (clinicalSummary.totalChanged > 0) {
      parts.push(
        `${clinicalSummary.totalChanged} ${clinicalSummary.totalChanged === 1 ? 'campo clínico' : 'campos clínicos'}`
      );
    }
    if (data.summary.rules.totalChanged > 0) {
      parts.push(
        `${data.summary.rules.totalChanged} ${data.summary.rules.totalChanged === 1 ? 'regra' : 'regras'}`
      );
    }
    if (data.summary.sqlActions.totalChanged > 0) {
      parts.push(
        `${data.summary.sqlActions.totalChanged} ${data.summary.sqlActions.totalChanged === 1 ? 'consulta SQL' : 'consultas SQL'}`
      );
    }

    return `Da ${baseText} para a ${targetText}: ${parts.join(', ')} com alterações.`;
  }, [data, clinicalSummary]);

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho */}
      <header className="sylva-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/documentos"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Catálogo</span>
            </Link>

            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
              Doc #{docId}
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tone-success border">
              Editor 3.0 (V3)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <GitCompareArrows size={22} className="text-[var(--accent-ink)] shrink-0" />
            <span className="truncate">
              {data?.docName || `Histórico de Mudanças — Documento #${docId}`}
            </span>
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Auditoria de mudanças entre versões do Editor 3.0 (Campos Clínicos, Regras e Consultas SQL).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`/documentos/${docId}/campos?version=V3`}
            className="h-9 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5"
          >
            <TableProperties size={13} />
            <span>Inspecionar Campos</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchComparison(urlBase, urlTarget)}
            disabled={loading}
            className="h-9 px-3.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="h-9 px-4 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Share2 size={13} />
            <span>Copiar Link</span>
          </button>
        </div>
      </header>

      {/* Estado de Erro / Motor V2 */}
      {error && (
        <div className="sylva-card p-5 border border-[var(--tone-warning-border)] tone-warning rounded-2xl flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-bold">Não foi possível carregar a comparação</p>
            <p className="text-xs opacity-90">{error}</p>
            {effectiveEngine === 'V2' && (
              <div className="pt-2">
                <Link
                  href={`/documentos/${docId}/versoes?engine=V3`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--card-solid)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)]"
                >
                  Tentar no Editor 3.0 (V3)
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra Seletora de Versões */}
      {data && (
        <section className="sylva-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3 flex-1">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Versão Base (Antes)
                </span>
                <select
                  value={data.baseVersion?.versionNumber ?? ''}
                  onChange={(e) => {
                    const nextBase = Number(e.target.value);
                    const nextTarget = data.targetVersion?.versionNumber ?? nextBase;
                    updateVersionParams(nextBase, nextTarget);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                >
                  {data.versions.map((v) => (
                    <option key={`base_${v.versionId}`} value={v.versionNumber}>
                      v{v.versionNumber} — {v.label} ({v.fieldsCount} campos, {v.rulesCount} regras)
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleSwapVersions}
                disabled={data.versions.length < 2}
                title="Inverter Versão Base e Versão Alvo"
                className="h-10 w-10 mx-auto rounded-xl sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer disabled:opacity-40"
              >
                <ArrowLeftRight size={15} />
              </button>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Versão Alvo (Depois)
                </span>
                <select
                  value={data.targetVersion?.versionNumber ?? ''}
                  onChange={(e) => {
                    const nextTarget = Number(e.target.value);
                    const nextBase = data.baseVersion?.versionNumber ?? nextTarget;
                    updateVersionParams(nextBase, nextTarget);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                >
                  {data.versions.map((v) => (
                    <option key={`target_${v.versionId}`} value={v.versionNumber}>
                      v{v.versionNumber} — {v.label} ({v.fieldsCount} campos, {v.rulesCount} regras)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {quickHistoryVsPublished && (
              <button
                type="button"
                onClick={() =>
                  updateVersionParams(
                    quickHistoryVsPublished.base,
                    quickHistoryVsPublished.target
                  )
                }
                className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:brightness-105 shrink-0"
              >
                <History size={14} />
                <span>
                  Última Histórico (v{quickHistoryVsPublished.base}) → Publicada (v
                  {quickHistoryVsPublished.target})
                </span>
              </button>
            )}
          </div>

          {data.warnings.length > 0 && (
            <div className="space-y-2">
              {data.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 rounded-xl tone-warning border text-xs flex items-center gap-2"
                >
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="skeleton h-16 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      )}

      {/* Banner de Resumo Executivo + Cards KPI Clicáveis + Abas */}
      {!loading && data && clinicalSummary && (
        <>
          {/* Banner de Resumo Executivo */}
          <section
            className={cn(
              'p-4 sm:p-5 rounded-2xl border flex items-start gap-3',
              data.summary.totalChanges === 0
                ? data.summary.visualElementsChanged > 0
                  ? 'tone-info'
                  : 'tone-success'
                : 'bg-[var(--card-solid)] border-[var(--border)]'
            )}
          >
            {data.summary.totalChanges === 0 ? (
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            ) : (
              <Info size={20} className="shrink-0 mt-0.5 text-[var(--accent-ink)]" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--foreground)]">
                {executiveSummarySentence}
              </p>
              {data.summary.totalChanges === 0 ? (
                <p className="text-xs opacity-90">
                  Os campos clínicos, regras e consultas SQL são equivalentes nas duas versões. A alteração pode ter sido apenas de posicionamento visual, formatação ou publicação no Editor MV.
                  {data.summary.visualElementsChanged > 0 && (
                    <>
                      {' '}
                      Observação: <strong>{data.summary.visualElementsChanged}</strong>{' '}
                      {data.summary.visualElementsChanged === 1
                        ? 'rótulo visual teve alteração de texto ou presença'
                        : 'rótulos visuais tiveram alteração de texto ou presença'}{' '}
                      (desmarque &quot;Ocultar rótulos visuais&quot; na aba Campos para visualizar).
                    </>
                  )}
                </p>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  Clique nos cards abaixo para navegar diretamente para as diferenças de Campos Clínicos, Regras ou Consultas SQL.
                </p>
              )}
            </div>
          </section>

          {/* 4 Cards KPI Autoexplicativos e Clicáveis */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sylva-card p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[var(--accent-ink)]" />
                <span>Total de Mudanças</span>
              </span>
              <p className="text-2xl font-bold font-mono text-[var(--foreground)]">
                {data.summary.totalChanges}
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                {data.summary.totalChanges === 0
                  ? `Equivalente (${baseLabel} → ${targetLabel})`
                  : `Comparando ${baseLabel} → ${targetLabel}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('fields')}
              className={cn(
                'sylva-card p-4 space-y-1 text-left transition-all cursor-pointer',
                activeTab === 'fields'
                  ? 'ring-1 ring-[var(--lime)] border-[var(--lime)]'
                  : 'hover:border-[var(--border-strong)]'
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <TableProperties size={13} />
                <span>Campos Clínicos</span>
              </span>
              <p className="text-2xl font-bold font-mono text-[var(--foreground)]">
                {clinicalSummary.totalChanged}
              </p>
              <p className="text-[11px] text-[var(--foreground-secondary)]">
                {formatReadableDelta(clinicalSummary, 'campo', 'campos')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={cn(
                'sylva-card p-4 space-y-1 text-left transition-all cursor-pointer',
                activeTab === 'rules'
                  ? 'ring-1 ring-[var(--lime)] border-[var(--lime)]'
                  : 'hover:border-[var(--border-strong)]'
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <ListFilter size={13} />
                <span>Regras</span>
              </span>
              <p className="text-2xl font-bold font-mono text-[var(--foreground)]">
                {data.summary.rules.totalChanged}
              </p>
              <p className="text-[11px] text-[var(--foreground-secondary)]">
                {formatReadableDelta(data.summary.rules, 'regra', 'regras')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sqlActions')}
              className={cn(
                'sylva-card p-4 space-y-1 text-left transition-all cursor-pointer',
                activeTab === 'sqlActions'
                  ? 'ring-1 ring-[var(--lime)] border-[var(--lime)]'
                  : 'hover:border-[var(--border-strong)]'
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <Code2 size={13} />
                <span>Consultas SQL</span>
              </span>
              <p className="text-2xl font-bold font-mono text-[var(--foreground)]">
                {data.summary.sqlActions.totalChanged}
              </p>
              <p className="text-[11px] text-[var(--foreground-secondary)]">
                {formatReadableDelta(data.summary.sqlActions, 'consulta', 'consultas')}
              </p>
            </button>
          </section>

          {/* Navegação por Abas e Filtros */}
          <section className="sylva-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    {
                      key: 'fields',
                      label: 'Campos Clínicos',
                      icon: TableProperties,
                      changed: hideVisualLabels
                        ? clinicalSummary.totalChanged
                        : data.summary.fields.totalChanged,
                      total: hideVisualLabels ? clinicalTotalCount : data.fields.length,
                    },
                    {
                      key: 'rules',
                      label: 'Regras',
                      icon: ListFilter,
                      changed: data.summary.rules.totalChanged,
                      total: data.rules.length,
                    },
                    {
                      key: 'sqlActions',
                      label: 'Consultas SQL',
                      icon: Code2,
                      changed: data.summary.sqlActions.totalChanged,
                      total: data.sqlActions.length,
                    },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer border',
                        isActive
                          ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] border-transparent'
                          : 'bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border-[var(--border)] hover:text-[var(--foreground)]'
                      )}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-mono',
                          isActive
                            ? 'bg-[var(--lime)] text-[var(--lime-ink)]'
                            : 'bg-[var(--card-solid)] text-[var(--foreground-secondary)]'
                        )}
                      >
                        {tab.changed} / {tab.total}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {activeTab === 'fields' && (
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--foreground)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideVisualLabels}
                      onChange={(e) => setHideVisualLabels(e.target.checked)}
                      className="rounded border-[var(--border)] accent-[var(--lime)] w-4 h-4 cursor-pointer"
                    />
                    <span>Ocultar rótulos visuais (Labels)</span>
                    {hideVisualLabels && data.summary.visualElementsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono tone-neutral border">
                        <EyeOff size={10} />
                        <span>{data.summary.visualElementsCount} ocultos</span>
                      </span>
                    )}
                  </label>
                )}

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--foreground)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyDifferences}
                    onChange={(e) => setOnlyDifferences(e.target.checked)}
                    className="rounded border-[var(--border)] accent-[var(--lime)] w-4 h-4 cursor-pointer"
                  />
                  <span>Somente diferenças</span>
                </label>
              </div>
            </div>

            {/* Filtros secundários */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por identificador, nome, condição ou trecho SQL..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="h-9 px-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
              >
                <option value="ALL">Todos os status</option>
                <option value="added">Adicionados</option>
                <option value="removed">Removidos</option>
                <option value="modified">Alterados</option>
                <option value="unchanged">Sem alteração</option>
              </select>

              <select
                value={String(layoutFilter)}
                onChange={(e) =>
                  setLayoutFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
                className="h-9 px-3 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
              >
                <option value="ALL">Todos os layouts</option>
                {availableLayouts.map(([id, name]) => (
                  <option key={id} value={String(id)}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista da aba ativa */}
            {activeTab === 'fields' && (
              <FieldDiffList
                items={filteredFields}
                baseLabel={baseLabel}
                targetLabel={targetLabel}
              />
            )}
            {activeTab === 'rules' && (
              <RuleDiffList
                items={filteredRules}
                baseLabel={baseLabel}
                targetLabel={targetLabel}
              />
            )}
            {activeTab === 'sqlActions' && (
              <SqlActionDiffList
                items={filteredSqlActions}
                baseLabel={baseLabel}
                targetLabel={targetLabel}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
