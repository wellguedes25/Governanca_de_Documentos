"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Zap, Clock, Activity, Loader2, AlertTriangle,
  RotateCcw, BarChart3, TrendingUp,
  Archive, Building2, Database, ChevronRight, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardTab = 'operacional' | 'unidades' | 'qualidade';

export default function Dashboard() {
  const { docVersion } = useUI();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('operacional');
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [globalQuality, setGlobalQuality] = useState<any>(null);
  const [enabledQueries, setEnabledQueries] = useState<Record<string, boolean>>({});

  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Proteção de rota
  useEffect(() => {
    const savedVersion = sessionStorage.getItem('app_doc_version');
    if (!docVersion && !savedVersion) {
      router.push('/');
    }
  }, [docVersion, router]);

  const fetchStats = useCallback(async (force = false, type?: string) => {
    const cacheKey = `dashboard_stats_${docVersion || 'V2'}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (!type) {
            setStats(parsedCache);
            setStatsLoading(false);
            return;
          }
          if (parsedCache[type] !== undefined) {
            setStats((prev: any) => ({ ...prev, ...parsedCache }));
            setLoadingMap(prev => ({ ...prev, [type]: false }));
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }

    if (type) setLoadingMap(prev => ({ ...prev, [type]: true }));
    else setStatsLoading(true);

    try {
      const url = type 
        ? `/api/dashboard/stats?type=${type}&version=${docVersion || 'V2'}` 
        : `/api/dashboard/stats?version=${docVersion || 'V2'}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        throw new Error(data.error);
      }
      setError(null);

      setStats((prev: any) => {
        const newData = type ? { ...prev, ...data } : data;
        sessionStorage.setItem(cacheKey, JSON.stringify(newData));
        return newData;
      });
    } catch (err) {
      console.error(`Erro ao carregar stats (${type || 'all'}):`, err);
    } finally {
      if (type) setLoadingMap(prev => ({ ...prev, [type]: false }));
      else setStatsLoading(false);
    }
  }, [docVersion]);

  const fetchAnalytics = useCallback(async (force = false, type?: string) => {
    const cacheKey = `dashboard_analytics_${docVersion || 'V2'}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (!type) {
            setAnalytics(parsedCache);
            setAnalyticsLoading(false);
            return;
          }
          if (parsedCache[type] !== undefined) {
            setAnalytics((prev: any) => ({ ...prev, ...parsedCache }));
            setLoadingMap(prev => ({ ...prev, [type]: false }));
            return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }

    if (type) setLoadingMap(prev => ({ ...prev, [type]: true }));
    else setAnalyticsLoading(true);

    try {
      const url = type 
        ? `/api/dashboard/analytics?type=${type}&version=${docVersion || 'V2'}` 
        : `/api/dashboard/analytics?version=${docVersion || 'V2'}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        throw new Error(data.error);
      }
      setError(null);

      setAnalytics((prev: any) => {
        const newData = type ? { ...prev, ...data } : data;
        sessionStorage.setItem(cacheKey, JSON.stringify(newData));
        return newData;
      });
    } catch (err) {
      console.error(`Erro ao carregar analytics (${type || 'all'}):`, err);
    } finally {
      if (type) setLoadingMap(prev => ({ ...prev, [type]: false }));
      else setAnalyticsLoading(false);
    }
  }, [docVersion]);

  const fetchGlobalQuality = useCallback(async (force = false) => {
    const cacheKey = `dashboard_quality_${docVersion || 'V2'}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setGlobalQuality(JSON.parse(cached));
          setLoadingMap(prev => ({ ...prev, globalQuality: false }));
          return;
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }

    setLoadingMap(prev => ({ ...prev, globalQuality: true }));
    try {
      const res = await fetch(`/api/dashboard/quality?version=${docVersion || 'V2'}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGlobalQuality(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error("Erro ao carregar qualidade global:", err);
    } finally {
      setLoadingMap(prev => ({ ...prev, globalQuality: false }));
    }
  }, [docVersion]);

  useEffect(() => {
    fetch('/api/connections')
      .then(res => res.json())
      .then(data => {
        if (data.enabledQueries) {
          setEnabledQueries(data.enabledQueries);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'operacional') {
      if (enabledQueries['total'] !== false) fetchStats(false, 'total');
      if (enabledQueries['prod24h'] !== false) fetchStats(false, 'prod24h');
      if (enabledQueries['top10'] !== false) fetchAnalytics(false, 'top10');
      if (enabledQueries['volumeTurno'] !== false) fetchAnalytics(false, 'volumeTurno');
    } else if (activeTab === 'unidades') {
      if (enabledQueries['unitAdherence'] !== false) fetchAnalytics(false, 'unitAdherence');
      if (enabledQueries['unitInactivity'] !== false) fetchAnalytics(false, 'unitInactivity');
    } else if (activeTab === 'qualidade') {
      if (enabledQueries['assinados'] !== false) fetchStats(false, 'assinados');
      if (enabledQueries['idle'] !== false) fetchAnalytics(false, 'idle');
      fetchGlobalQuality(false);
    }
  }, [activeTab, enabledQueries, fetchStats, fetchAnalytics, fetchGlobalQuality]);

  const getCardData = (id: string) => {
    const cardMap: Record<string, any> = {
      total: { title: 'Volume Geral (90d)', value: stats?.total || '0', icon: <FileText size={18} /> },
      prod24h: { title: 'Produção 24h', value: stats?.prod24h || '0', icon: <Activity size={18} /> },
    };

    if (id === 'hospitais') return {
      title: 'Hospitais Mapeados',
      value: '7 UN',
      icon: <Building2 size={18} />
    };

    if (id === 'volumeTurno') {
      const dia = analytics?.volumeTurno?.find((t: any) => t.TURNO === 'DIA')?.QTD || 0;
      const noite = analytics?.volumeTurno?.find((t: any) => t.TURNO === 'NOITE')?.QTD || 0;
      return {
        title: 'Turno Dia / Noite',
        value: `${dia} / ${noite}`,
        icon: <Clock size={18} />
      };
    }

    return cardMap[id] || { title: 'Indicador', value: '0', icon: <BarChart3 size={18} /> };
  };

  const isCardLoading = (id: string) => loadingMap[id];

  const unitData: Array<{ sigla: string; total: number }> = (analytics?.unitAdherence || []).map((u: any) => ({
    sigla: u.SIGLA_UNIDADE || '??',
    total: Number(u.QTD_TOTAL_PREENCHIDA || 0)
  }));
  const maxUnitTotal = unitData[0]?.total || 1;

  if (!docVersion) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen pb-16 gap-6">
      
      {/* Telemetry Tab Selector Bar */}
      <div className="w-full md:w-60 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between shrink-0 self-start">
        <div>
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-tight leading-none">
                Telemetria
              </h2>
              <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">
                PEP MV · {docVersion}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {[
              { id: 'operacional', label: 'Operacional', icon: <TrendingUp size={15} /> },
              { id: 'unidades', label: 'Unidades', icon: <Building2 size={15} /> },
              { id: 'qualidade', label: 'Qualidade & SLA', icon: <Zap size={15} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border",
                  activeTab === tab.id 
                    ? "bg-sky-50/80 text-sky-800 border-sky-200/90 font-bold shadow-2xs" 
                    : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className={cn(activeTab === tab.id ? "text-sky-600" : "text-slate-400")}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight size={14} className="ml-auto text-sky-600" />}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-100">
          <button
            onClick={() => {
              fetchStats(true);
              fetchAnalytics(true);
            }}
            disabled={statsLoading || analyticsLoading}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100/80 transition-all disabled:opacity-50"
          >
            <span>{statsLoading || analyticsLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
            <RotateCcw size={13} className={cn("text-slate-400", (statsLoading || analyticsLoading) && "animate-spin text-sky-600")} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="border border-rose-200 bg-rose-50 p-4 rounded-xl flex items-center gap-3 text-xs text-rose-700">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-rose-900">Falha ao obter telemetria do banco</p>
              <p className="text-rose-600">{error}</p>
            </div>
          </div>
        )}

        {/* TAB: OPERACIONAL */}
        {activeTab === 'operacional' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['total', 'prod24h', 'hospitais', 'volumeTurno'].map(id => {
                const card = getCardData(id);
                return (
                  <div key={id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                      <span>{card.title}</span>
                      <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                        {card.icon}
                      </div>
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 my-1">
                      {isCardLoading(id) ? <Skeleton className="h-7 w-24" /> : card.value}
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-sky-600 rounded-full w-2/5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Curva ABC (Top 10 Documentos) */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <BarChart3 size={17} className="text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Curva ABC (Top 10 Documentos Mais Utilizados)
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">Janela: Últimos 90 dias</span>
              </div>
              
              <div className="space-y-4">
                {loadingMap['top10'] ? (
                  <div className="space-y-4">
                    {[100, 80, 65, 50, 40].map((widthPct, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-52" />
                          <Skeleton className="h-4 w-14" />
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-200" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  analytics?.top10?.map((doc: any, i: number) => {
                    const max = analytics.top10[0]?.QTD_TOTAL || 1;
                    const percent = (doc.QTD_TOTAL / max) * 100;
                    return (
                      <div key={i} className="group space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 truncate max-w-lg">
                            <span className="font-mono font-bold text-slate-400 text-[11px] w-5">
                              #{String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="font-medium text-slate-800 truncate group-hover:text-sky-700 transition-colors">
                              {doc.DS_DOCUMENTO}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 tabular-nums ml-2">
                            {Number(doc.QTD_TOTAL).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: UNIDADES */}
        {activeTab === 'unidades' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Building2 size={16} className="text-sky-600" />
                  Produção por Unidade Hospitalar
                </h3>
                <span className="text-xs text-slate-500 font-medium">Documentos gerados</span>
              </div>
              <div className="space-y-4">
                {loadingMap['unitAdherence'] ? (
                  <div className="space-y-4">
                    {[90, 75, 58, 42].map((widthPct, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  unitData.map((unit) => {
                    const percent = (unit.total / maxUnitTotal) * 100;
                    return (
                      <div key={unit.sigla} className="group space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 font-mono">
                            {unit.sigla}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {unit.total.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-600 group-hover:bg-sky-500 transition-all rounded-full duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-sky-800 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  Status da Rede Oracle
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-sky-200/50">
                    <span className="text-slate-600">Conexão Ativa:</span>
                    <span className="font-bold text-sky-900">ESTÁVEL</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Sincronização:</span>
                    <span className="font-bold text-slate-800 font-mono">Automática</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-2">
                  <Database size={14} className="text-sky-600" />
                  Segmentação Hospitalar
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Os dados de cada unidade são integrados diretamente através do schema DBAMV da ACSC para auditoria clínica contínua.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: QUALIDADE & SLA */}
        {activeTab === 'qualidade' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Taxa de Assinatura */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                    <span>Taxa de Assinatura</span>
                    <Zap size={16} className="text-amber-500" />
                  </div>
                  <div className="text-4xl font-bold font-mono tracking-tight text-slate-900 my-2">
                    {loadingMap['assinados'] ? <Skeleton className="h-10 w-28" /> : (stats?.assinadosPercent || '0.0%')}
                  </div>
                </div>
                <div className="flex gap-4 border-t border-slate-100 pt-3 mt-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Assinados</span>
                    <span className="font-bold text-sky-800">{stats?.assinadosRaw || '0'}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="font-bold text-slate-700">{stats?.totalRaw || '0'}</span>
                  </div>
                </div>
              </div>

              {/* SLA de Assinatura em 24h */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                    <span>SLA Fechamento 24h</span>
                    <Clock size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-4xl font-bold font-mono tracking-tight text-emerald-600 my-2">
                    {loadingMap['globalQuality'] ? <Skeleton className="h-10 w-28" /> : `${globalQuality?.sla24h || '100.0'}%`}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Conformidade Clínica
                  </span>
                </div>
              </div>

              {/* Documentos Ociosos */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                    <span>Documentos Ociosos</span>
                    <Archive size={16} className="text-rose-500" />
                  </div>
                  <div className="text-4xl font-bold font-mono tracking-tight text-slate-900 my-2">
                    {loadingMap['idle'] ? <Skeleton className="h-10 w-28" /> : Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex gap-4 border-t border-slate-100 pt-3 mt-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ociosos</span>
                    <span className="font-bold text-rose-600">
                      {Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Templates</span>
                    <span className="font-bold text-slate-700">
                      {Number(analytics?.idle?.[0]?.TOTAL_TEMPLATES || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
