"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RotateCw,
  Building2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Sun,
  Moon,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { safeSessionSetItem } from '@/lib/safe-storage';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDatabaseError } from '@/lib/error-formatter';
import { PeriodSelector } from '@/components/ui/PeriodSelector';
import { formatPeriodLabel, getPeriodCacheKey, getPeriodQueryParams } from '@/lib/period';

interface Top10Item {
  CD_DOCUMENTO: number;
  DS_DOCUMENTO: string;
  QTD_TOTAL: number;
}

interface UnitAdherenceItem {
  CD_MULTI_EMPRESA: number;
  SIGLA_UNIDADE: string;
  QTD_TOTAL_PREENCHIDA: number;
}

interface SlaFaixaItem {
  FAIXA_SLA: string;
  TOTAL: number;
}

interface TurnoItem {
  TURNO: 'DIA' | 'NOITE';
  QTD: number;
}

interface DashboardStats {
  total?: string | number;
  prod24h?: string | number;
  assinadosPercent?: string;
}

interface DashboardAnalytics {
  top10?: Top10Item[];
  unitAdherence?: UnitAdherenceItem[];
  idle?: Array<{ TOTAL_TEMPLATES?: number; TOTAL_DOCS_OCIOSOS?: number }>;
  volumeTurno?: TurnoItem[];
}

interface DashboardQuality {
  sla24h?: string | number;
  faixas?: SlaFaixaItem[];
}

type ChartMode = 'modelos' | 'unidades';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatCompactNumber(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace('.', ',')}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1).replace('.', ',')}K`;
  return val.toLocaleString('pt-BR');
}

export default function Dashboard() {
  const { docVersion, periodFilter, setPeriodFilter } = useUI();
  const router = useRouter();
  const resolvedVersion = docVersion || 'V3';
  const periodLabel = useMemo(() => formatPeriodLabel(periodFilter), [periodFilter]);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [quality, setQuality] = useState<DashboardQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [activeConnId, setActiveConnId] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('modelos');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const greeting = useMemo(() => getGreeting(), []);
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(new Date());
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    fetch('/api/connections')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeConnectionId) {
          setActiveConnId(data.activeConnectionId);
        }
      })
      .catch(console.error);
  }, []);

  const fetchDashboardData = useCallback(async (force = false) => {
    const cacheKey = `dashboard_unified_v2_${activeConnId || 'default'}_${resolvedVersion}_${getPeriodCacheKey(periodFilter)}`;

    if (!force && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setStats(parsed.stats);
          setAnalytics(parsed.analytics);
          setQuality(parsed.quality);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Erro ao ler cache do dashboard:', e);
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      const forceParam = force ? '&force=true' : '';
      const periodParams = getPeriodQueryParams(periodFilter);
      const [resStats, resAnalytics, resQuality] = await Promise.all([
        fetch(`/api/dashboard/stats?version=${resolvedVersion}&${periodParams}${forceParam}`).then((r) => r.json()),
        fetch(`/api/dashboard/analytics?version=${resolvedVersion}&${periodParams}${forceParam}`).then((r) => r.json()),
        fetch(`/api/dashboard/quality?version=${resolvedVersion}${forceParam}`).then((r) => r.json()),
      ]);

      if (resStats.error) throw new Error(resStats.error);
      if (resAnalytics.error) throw new Error(resAnalytics.error);
      if (resQuality.error) throw new Error(resQuality.error);

      setStats(resStats);
      setAnalytics(resAnalytics);
      setQuality(resQuality);

      if (typeof window !== 'undefined') {
        safeSessionSetItem(
          cacheKey,
          JSON.stringify({
            stats: resStats,
            analytics: resAnalytics,
            quality: resQuality,
          })
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o banco Oracle.';
      console.error('Erro ao carregar telemetria do dashboard:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resolvedVersion, periodFilter, activeConnId]);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Dados processados
  const top10List = useMemo(() => analytics?.top10 ?? [], [analytics]);
  const unitList = useMemo(() => analytics?.unitAdherence ?? [], [analytics]);
  const maxUnitVal = unitList[0]?.QTD_TOTAL_PREENCHIDA || 1;
  const totalUnitProduction = useMemo(
    () => unitList.reduce((acc, u) => acc + Number(u.QTD_TOTAL_PREENCHIDA || 0), 0),
    [unitList]
  );

  const idleItem = analytics?.idle?.[0];
  const totalTemplates = Number(idleItem?.TOTAL_TEMPLATES || 0);
  const idleTemplates = Number(idleItem?.TOTAL_DOCS_OCIOSOS || 0);
  const activeTemplates = Math.max(0, totalTemplates - idleTemplates);
  const activeRatio = totalTemplates > 0 ? Math.round((activeTemplates / totalTemplates) * 100) : 0;

  const turnos = useMemo(() => analytics?.volumeTurno ?? [], [analytics]);
  const turnoDia = Number(turnos.find((t) => t.TURNO === 'DIA')?.QTD || 0);
  const turnoNoite = Number(turnos.find((t) => t.TURNO === 'NOITE')?.QTD || 0);
  const totalTurnos = turnoDia + turnoNoite || 1;
  const pctDia = ((turnoDia / totalTurnos) * 100).toFixed(1);
  const pctNoite = ((turnoNoite / totalTurnos) * 100).toFixed(1);

  const faixasSla = useMemo(() => quality?.faixas ?? [], [quality]);

  // Dados para o Gráfico de Colunas Verticais estilo Sylva ("Revenue won")
  const barChartData = useMemo(() => {
    if (chartMode === 'modelos') {
      return top10List.slice(0, 10).map((d, idx) => ({
        id: String(d.CD_DOCUMENTO || idx),
        shortLabel: `#${String(idx + 1).padStart(2, '0')}`,
        fullLabel: d.DS_DOCUMENTO,
        value: Number(d.QTD_TOTAL || 0),
        isHighlight: idx === 0,
      }));
    }
    return unitList.slice(0, 10).map((u, idx) => ({
      id: String(u.CD_MULTI_EMPRESA || idx),
      shortLabel: u.SIGLA_UNIDADE.slice(0, 6),
      fullLabel: u.SIGLA_UNIDADE,
      value: Number(u.QTD_TOTAL_PREENCHIDA || 0),
      isHighlight: idx === 0,
    }));
  }, [chartMode, top10List, unitList]);

  const maxBarValue = useMemo(
    () => Math.max(...barChartData.map((b) => b.value), 1),
    [barChartData]
  );

  const avgBarValue = useMemo(() => {
    if (barChartData.length === 0) return 0;
    const sum = barChartData.reduce((acc, b) => acc + b.value, 0);
    return sum / barChartData.length;
  }, [barChartData]);

  const avgLinePct = Math.min(92, Math.max(12, (avgBarValue / maxBarValue) * 100));

  const stageColors = [
    'bg-[var(--lime)]',
    'bg-[var(--sky)]',
    'bg-[var(--sky)]/85',
    'bg-[var(--sand)]',
    'bg-white/35',
  ];

  return (
    <div className="flex flex-col space-y-5">
      {/* 1. Hero Header — Estilo "Good morning, Ananya" do Sylva */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <h1
            className="text-[28px] md:text-[34px] font-bold tracking-tight text-[var(--foreground)] leading-none relative inline-block pb-2"
            suppressHydrationWarning
          >
            {greeting}, Governança
            <span className="absolute left-0 bottom-0 h-[3px] w-full max-w-[260px] rounded-full bg-[var(--lime)]" />
          </h1>
          <p className="text-[12.5px] text-[var(--foreground-secondary)] flex items-center gap-2 flex-wrap" suppressHydrationWarning>
            <span className="font-medium text-[var(--foreground)]">Motor {resolvedVersion}</span>
            <span className="text-[var(--muted)]">·</span>
            <span className="capitalize">{formattedDate}</span>
            <span className="text-[var(--muted)]">·</span>
            <span>{activeTemplates} templates ativos</span>
            <span className="text-[var(--muted)]">·</span>
            <span>{unitList.length} unidades monitoradas</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <PeriodSelector value={periodFilter} onChange={setPeriodFilter} disabled={loading} />

          <button
            type="button"
            onClick={() => router.push('/hospitais')}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full sylva-pill text-[12.5px] font-semibold text-[var(--foreground)] cursor-pointer"
          >
            <Building2 size={15} className="text-[var(--foreground-secondary)]" />
            <span>Unidades</span>
          </button>

          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full sylva-lime-btn text-[12.5px] font-bold cursor-pointer disabled:opacity-60"
          >
            <RotateCw size={14} strokeWidth={2.4} className={cn(loading && 'animate-spin')} />
            <span>{loading ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>

      {/* Alerta Amigável de Erro Oracle (Glass Style) */}
      {error && (() => {
        const friendlyError = formatDatabaseError(error);
        return (
          <div className="sylva-glass border-rose-400/30 rounded-[22px] p-5 transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-400/25 shrink-0">
                  <AlertTriangle size={19} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-[var(--foreground)] text-sm">{friendlyError.title}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/25">
                      Banco Oracle
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">{friendlyError.message}</p>
                  <p className="text-xs text-rose-300/90 font-medium">{friendlyError.actionSuggestion}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] cursor-pointer shrink-0"
              >
                <RotateCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                <span>Tentar Novamente</span>
              </button>
            </div>

            {friendlyError.technicalDetails && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowTechDetails((prev) => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showTechDetails && 'rotate-180')} />
                  <span>{showTechDetails ? 'Ocultar detalhes técnicos' : 'Ver código do erro (DBA / Suporte)'}</span>
                </button>
                {showTechDetails && (
                  <div className="mt-2 p-3 rounded-xl bg-black/30 border border-[var(--border)] font-mono text-[11px] text-rose-200 break-all select-all">
                    {friendlyError.technicalDetails}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. Row 1 — 4 KPI Cards Translúcidos Coloridos (Slate, Olive, Mocha, Charcoal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Slate Blue Glass — Volume Geral */}
        <div className="sylva-card-slate rounded-[22px] p-5 flex flex-col justify-between min-h-[144px] hover:-translate-y-0.5 transition-transform">
          <div className="text-[12px] font-medium text-[var(--tint-slate-muted)]">Volume geral ({periodLabel.short})</div>
          <div className="my-2">
            <div className="text-[30px] font-bold font-[family-name:var(--font-manrope)] tabular-nums text-[var(--tint-slate-fg)] tracking-tight leading-none">
              {loading ? <Skeleton className="h-8 w-32" /> : stats?.total || '0'}
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-1.5 bg-[var(--tint-slate-track)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--tint-slate-bar)] rounded-full w-full" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--tint-slate-muted)]">
              <span>Prontuários sob governança</span>
              <span className="text-[var(--lime)] font-semibold flex items-center gap-0.5">
                <ArrowUpRight size={12} />
                Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Olive Glass — Produção 24h */}
        <div className="sylva-card-olive rounded-[22px] p-5 flex flex-col justify-between min-h-[144px] hover:-translate-y-0.5 transition-transform">
          <div className="text-[12px] font-medium text-[var(--tint-olive-muted)]">Produção recente (24h)</div>
          <div className="my-2">
            <div className="text-[30px] font-bold font-[family-name:var(--font-manrope)] tabular-nums text-[var(--tint-olive-fg)] tracking-tight leading-none">
              {loading ? <Skeleton className="h-8 w-28" /> : stats?.prod24h || '0'}
            </div>
          </div>
          <div className="text-[11.5px] text-[var(--tint-olive-muted)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
            <span>Documentos registrados hoje</span>
          </div>
        </div>

        {/* Card 3: Mocha/Bronze Glass — SLA Fechamento */}
        <div className="sylva-card-mocha rounded-[22px] p-5 flex flex-col justify-between min-h-[144px] hover:-translate-y-0.5 transition-transform">
          <div className="text-[12px] font-medium text-[var(--tint-mocha-muted)]">SLA fechamento (24h)</div>
          <div className="my-2">
            <div className="text-[30px] font-bold font-[family-name:var(--font-manrope)] tabular-nums text-[var(--tint-mocha-fg)] tracking-tight leading-none">
              {loading ? <Skeleton className="h-8 w-24" /> : `${quality?.sla24h || '100.0'}%`}
            </div>
          </div>
          <div className="text-[11.5px] text-[var(--tint-mocha-muted)]">
            Assinados: <strong className="text-[var(--tint-mocha-fg)] font-semibold">{stats?.assinadosPercent || '0.0%'}</strong>
          </div>
        </div>

        {/* Card 4: Charcoal Glass — Catálogo Clínico */}
        <div className="sylva-card-charcoal rounded-[22px] p-5 flex flex-col justify-between min-h-[144px] hover:-translate-y-0.5 transition-transform">
          <div className="text-[12px] font-medium text-[var(--foreground-secondary)]">Catálogo clínico</div>
          <div className="my-2">
            <div className="text-[30px] font-bold font-[family-name:var(--font-manrope)] tabular-nums text-[var(--foreground)] tracking-tight leading-none">
              {loading ? <Skeleton className="h-8 w-24" /> : `${activeRatio}%`}
            </div>
          </div>
          <div className="text-[11.5px] text-[var(--foreground-secondary)]">
            {activeTemplates} ativos de {totalTemplates} templates
          </div>
        </div>
      </div>

      {/* 3. Row 2 — Painel Principal Assimétrico (7/5 igual à imagem 2 do Sylva) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Esquerda (7 cols): Gráfico Vertical estilo "Revenue won" com barra líder em Neon Lime */}
        <div className="lg:col-span-7 sylva-glass rounded-[24px] p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--foreground)] tracking-tight">
                {chartMode === 'modelos' ? 'Curva ABC · Top Modelos' : 'Produção por Unidade'}
              </h2>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                {chartMode === 'modelos'
                  ? `Top 10 documentos mais preenchidos ${periodLabel.phrase}`
                  : 'Volume consolidado de preenchimentos por hospital'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Legenda igual ao "Won | Target" da imagem 2 */}
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-[var(--foreground-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[4px] bg-[var(--sky)]" />
                  Volume
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 border-t border-dashed border-[var(--foreground-secondary)]" />
                  Média {formatCompactNumber(Math.round(avgBarValue))}
                </span>
              </div>

              {/* Segmented Pill Control igual à imagem 1 do Sylva */}
              <div className="inline-flex items-center p-1 rounded-full bg-[var(--card-subtle)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setChartMode('modelos')}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11.5px] font-semibold cursor-pointer transition-all',
                    chartMode === 'modelos'
                      ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-xs'
                      : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                  )}
                >
                  Modelos
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('unidades')}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11.5px] font-semibold cursor-pointer transition-all',
                    chartMode === 'unidades'
                      ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-xs'
                      : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                  )}
                >
                  Unidades
                </button>
              </div>
            </div>
          </div>

          {/* Área do Gráfico de Colunas Verticais */}
          {loading ? (
            <div className="grid grid-cols-10 gap-2.5 h-56 items-end pt-4">
              {[88, 72, 65, 58, 52, 46, 40, 35, 28, 22].map((h, i) => (
                <Skeleton key={i} className="w-full rounded-xl" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : barChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-[var(--muted)]">
              Nenhum dado analítico encontrado para o período.
            </div>
          ) : (
            <div className="relative pt-6">
              {/* Linha tracejada de Média/Meta */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-[var(--foreground)]/25 pointer-events-none z-10 transition-all duration-500"
                style={{ bottom: `calc(${avgLinePct}% * 0.84 + 28px)` }}
              />

              {/* Colunas Verticais */}
              <div className="grid gap-2 sm:gap-2.5 items-end h-56" style={{ gridTemplateColumns: `repeat(${barChartData.length}, minmax(0, 1fr))` }}>
                {barChartData.map((bar, idx) => {
                  const heightPct = Math.max(10, Math.round((bar.value / maxBarValue) * 100));
                  const isHovered = hoveredBar === idx;
                  return (
                    <div
                      key={bar.id}
                      className="relative flex flex-col items-center h-full justify-end group cursor-pointer"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip flutuante */}
                      {isHovered && (
                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-xl bg-[#11100F] border border-white/15 shadow-xl whitespace-nowrap pointer-events-none">
                          <div className="text-[11px] font-semibold text-white max-w-[200px] truncate">
                            {bar.fullLabel}
                          </div>
                          <div className="text-[10.5px] font-mono text-[var(--lime)] font-bold">
                            {bar.value.toLocaleString('pt-BR')} registros
                          </div>
                        </div>
                      )}

                      {/* Trilho translúcido vertical */}
                      <div className="w-full flex-1 rounded-xl bg-[var(--card-subtle)] flex items-end overflow-hidden p-[1px]">
                        <div
                          className={cn(
                            'w-full rounded-[10px] transition-all duration-500 ease-out',
                            bar.isHighlight
                              ? 'bg-[var(--lime)] shadow-[0_0_24px_rgba(204,243,82,0.28)]'
                              : 'bg-[var(--sky)] group-hover:brightness-110'
                          )}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      {/* Rótulo X */}
                      <span
                        className={cn(
                          'mt-2 text-[10.5px] font-mono truncate max-w-full',
                          bar.isHighlight ? 'text-[var(--foreground)] font-bold' : 'text-[var(--muted)]'
                        )}
                      >
                        {bar.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Direita (5 cols): Aderência por Unidade estilo "Pipeline by stage" */}
        <div className="lg:col-span-5 sylva-glass rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-5">
              <div>
                <h2 className="text-[15px] font-bold text-[var(--foreground)] tracking-tight">
                  Aderência por unidade
                </h2>
                <p className="text-[12px] text-[var(--muted)] mt-0.5">
                  Participação de cada hospital na produção
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/hospitais')}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer shrink-0"
              >
                <span>Hospitais</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-2.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : unitList.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--muted)]">
                  Nenhuma unidade retornada pelo Oracle.
                </div>
              ) : (
                unitList.slice(0, 5).map((unit, idx) => {
                  const percent = Math.max(8, (unit.QTD_TOTAL_PREENCHIDA / maxUnitVal) * 100);
                  const share =
                    totalUnitProduction > 0
                      ? ((unit.QTD_TOTAL_PREENCHIDA / totalUnitProduction) * 100).toFixed(1)
                      : '0.0';
                  const barColor = stageColors[idx] || 'bg-white/30';

                  return (
                    <div
                      key={unit.CD_MULTI_EMPRESA}
                      onClick={() => router.push(`/hospitais?id=${unit.CD_MULTI_EMPRESA}`)}
                      className="grid grid-cols-12 items-center gap-3 group cursor-pointer"
                    >
                      <div className="col-span-4 min-w-0">
                        <div className="text-[12.5px] font-semibold text-[var(--foreground)] group-hover:text-[var(--lime)] transition-colors truncate">
                          {unit.SIGLA_UNIDADE}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">{share}% do total</div>
                      </div>

                      <div className="col-span-5">
                        <div className="h-2.5 w-full rounded-full bg-[var(--card-subtle)] overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', barColor)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="col-span-3 text-right font-mono text-[12px] font-semibold text-[var(--foreground)] tabular-nums">
                        {formatCompactNumber(Number(unit.QTD_TOTAL_PREENCHIDA))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Row 3 — 3 Cards Inferiores estilo "Next Best Move", "Today" e "Leaderboard" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1 (Olive Glass): Destaque / Próxima Ação de Governança */}
        <div
          onClick={() => router.push('/documentos')}
          className="sylva-card-olive rounded-[24px] p-6 flex flex-col justify-between min-h-[190px] cursor-pointer group hover:-translate-y-0.5 transition-transform"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">
              <Sparkles size={12} />
              <span>Próximo passo</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--tint-olive-fg)] tracking-tight">
              Saneamento de Catálogo
            </h3>
            <p className="text-[12.5px] text-[var(--tint-olive-muted)] leading-relaxed">
              {idleTemplates > 0
                ? `${idleTemplates} templates sem uso ${periodLabel.phrase} prontos para revisão ou arquivamento.`
                : `Todos os templates clínicos estão com uso saudável ${periodLabel.phrase}.`}
            </p>
          </div>

          <div className="pt-4 flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-[var(--tint-olive-fg)] tabular-nums">
                {loading ? <Skeleton className="h-7 w-20" /> : `${idleTemplates} ociosos`}
              </div>
              <div className="text-[11px] text-[var(--tint-olive-muted)]">de {totalTemplates} modelos cadastrados</div>
            </div>
            <span className="w-9 h-9 rounded-full bg-[var(--tint-olive-btn)] group-hover:bg-[var(--lime)] group-hover:text-[var(--lime-ink)] text-[var(--tint-olive-fg)] flex items-center justify-center transition-colors">
              <ArrowUpRight size={16} />
            </span>
          </div>
        </div>

        {/* Card 2 (Charcoal Glass): Dinâmica de Turnos */}
        <div className="sylva-glass rounded-[24px] p-6 flex flex-col justify-between min-h-[190px]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--foreground)]">Dinâmica de turnos</h3>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">Carga assistencial · últimos 7 dias</p>
            </div>
            <Clock size={16} className="text-[var(--muted)] shrink-0 mt-0.5" />
          </div>

          <div className="space-y-3 my-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--sand)]">
                <Sun size={14} />
                Diurno · {pctDia}%
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[var(--sky)]">
                <Moon size={14} />
                Noturno · {pctNoite}%
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-[var(--card-subtle)] overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-[var(--sand)] rounded-l-full transition-all duration-500"
                style={{ width: `${pctDia}%` }}
              />
              <div
                className="h-full bg-[var(--sky)] rounded-r-full transition-all duration-500"
                style={{ width: `${pctNoite}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-[var(--muted)]">
              <span>{turnoDia.toLocaleString('pt-BR')} docs</span>
              <span>{turnoNoite.toLocaleString('pt-BR')} docs</span>
            </div>
          </div>
        </div>

        {/* Card 3 (Charcoal Glass): Faixas de SLA estilo Leaderboard */}
        <div className="sylva-glass rounded-[24px] p-6 flex flex-col justify-between min-h-[190px]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--foreground)]">Faixas de SLA</h3>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">Tempo médio até assinatura</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent)] text-[var(--lime)]">
              <CheckCircle2 size={12} />
              {quality?.sla24h || '100.0'}%
            </span>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : faixasSla.length === 0 ? (
            <div className="text-xs text-[var(--muted)] py-6 text-center">Sem faixas de SLA registradas.</div>
          ) : (
            <div className="space-y-2">
              {faixasSla.slice(0, 4).map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-mono text-[var(--muted)] w-4">{idx + 1}</span>
                    <span className="font-medium text-[var(--foreground)]">{f.FAIXA_SLA}</span>
                  </div>
                  <span className="font-mono font-semibold text-[var(--foreground-secondary)] tabular-nums">
                    {Number(f.TOTAL).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
