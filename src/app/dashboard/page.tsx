"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Zap, Clock, Activity, Loader2, AlertTriangle,
  RotateCcw, BarChart3, TrendingUp,
  Archive, Building2, Database, ChevronRight
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
        return; // Retorna sem lançar exceção para não quebrar o React Client Component
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
    const cacheKey = `dashboard_global_quality_${docVersion || 'V2'}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setGlobalQuality(JSON.parse(cached));
          setLoadingMap(prev => ({ ...prev, 'globalQuality': false }));
          return;
        } catch (e) {}
      }
    }

    setLoadingMap(prev => ({ ...prev, 'globalQuality': true }));
    try {
      const res = await fetch(`/api/dashboard/quality`);
      const data = await res.json();
      if (!data.error) {
        setGlobalQuality(data);
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMap(prev => ({ ...prev, 'globalQuality': false }));
    }
  }, [docVersion]);

  // Inicialização de Configurações
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/connections');
        const data = await res.json();
        setEnabledQueries(data.enabledQueries || {});
      } catch (err) {
        console.error('Erro ao carregar config:', err);
      }
    }
    loadConfig();
  }, []);

  // Carregamento Sob Demanda baseado na Aba Ativa
  useEffect(() => {
    if (Object.keys(enabledQueries).length === 0) return;

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
      total: { title: 'Volume Geral (90d)', value: stats?.total || '0', icon: <FileText size={20} /> },
      prod24h: { title: 'Produção 24h', value: stats?.prod24h || '0', icon: <Activity size={20} /> },
    };

    if (id === 'hospitais') return {
      title: 'Hospitais Mapeados',
      value: '7 UN',
      icon: <Building2 size={20} />
    };

    if (id === 'volumeTurno') {
      const dia = analytics?.volumeTurno?.find((t: any) => t.TURNO === 'DIA')?.QTD || 0;
      const noite = analytics?.volumeTurno?.find((t: any) => t.TURNO === 'NOITE')?.QTD || 0;
      return {
        title: 'Turno Dia / Noite',
        value: `${dia} / ${noite}`,
        icon: <Clock size={20} />
      };
    }

    return cardMap[id] || { title: 'Indicador', value: '0', icon: <BarChart3 size={20} /> };
  };

  const isCardLoading = (id: string) => loadingMap[id];

  // Dados para o gráfico de Unidades
  const unitData: Array<{ sigla: string; total: number }> = (analytics?.unitAdherence || []).map((u: any) => ({
    sigla: u.SIGLA_UNIDADE || '??',
    total: Number(u.QTD_TOTAL_PREENCHIDA || 0)
  }));
  const maxUnitTotal = unitData[0]?.total || 1;

  if (!docVersion) return null;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden selection:bg-[var(--primary)] selection:text-black font-mono">
      
      {/* 10% Asymmetric Left Bar (Sidebar) */}
      <div className="hidden md:flex w-64 border-r border-border flex-col justify-between py-8 z-10 bg-background">
        
        <div className="px-6 mb-12">
          <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-black text-xl mb-6">
            MP
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">
            Medlytics Gateway
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[var(--primary)]">
            Telemetria <span className="text-foreground block">{docVersion}</span>
          </h1>
        </div>

        <div className="flex-1 flex flex-col gap-2 px-4">
          {[
            { id: 'operacional', label: 'Operacional', icon: <TrendingUp size={16} /> },
            { id: 'unidades', label: 'Unidades', icon: <Building2 size={16} /> },
            { id: 'qualidade', label: 'Qualidade', icon: <Zap size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={cn(
                "flex items-center gap-4 px-4 py-4 text-xs font-black uppercase tracking-widest transition-all border border-transparent",
                activeTab === tab.id 
                  ? "bg-[var(--primary)] text-black border-[var(--primary)]" 
                  : "text-muted -foreground -border -background"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </div>

        <div className="px-6 mt-auto">
          <button
            onClick={() => {
              fetchStats(true);
              fetchAnalytics(true);
            }}
            disabled={statsLoading || analyticsLoading}
            className="w-full flex items-center justify-between p-4 bg-card border border-border text-xs font-black uppercase tracking-widest transition-all hover:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <span>{statsLoading || analyticsLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
            <RotateCcw size={14} className={cn("text-muted-foreground transition-all group-hover:text-[var(--primary)]", (statsLoading || analyticsLoading) && "animate-spin text-[var(--primary)]")} />
          </button>
        </div>
      </div>

      {/* Mobile Header (fallback) */}
      <div className="md:hidden flex flex-col border-b border-border bg-background p-4 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black text-sm">MP</div>
             <h1 className="text-lg font-black uppercase tracking-tighter text-[var(--primary)]">Telemetria {docVersion}</h1>
          </div>
          <button onClick={() => { fetchStats(true); fetchAnalytics(true); }}>
            <RotateCcw size={16} className={cn("text-muted", (statsLoading || analyticsLoading) && "animate-spin")} />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'operacional', label: 'Operacional' },
            { id: 'unidades', label: 'Unidades' },
            { id: 'qualidade', label: 'Qualidade' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={cn(
                "px-3 py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                activeTab === tab.id ? "bg-[var(--primary)] text-black border-[var(--primary)]" : "text-muted border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 90% Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-12 space-y-8 bg-background">
        
        {/* Error State */}
        {error && (
          <div className="border border-red-500 bg-red-500/10 p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 bg-red-500 text-black flex items-center justify-center font-black shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">Falha Crítica de Sincronização</h3>
              <p className="text-red-400 text-xs uppercase tracking-widest">
                System Error: {error}
              </p>
            </div>
          </div>
        )}

        {/* Tab Content Rendering */}
        <div className="animate-in fade-in duration-500">
          
          {/* TAB: OPERACIONAL */}
          {activeTab === 'operacional' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['total', 'prod24h', 'hospitais', 'volumeTurno'].map(id => {
                  const card = getCardData(id);
                  return (
                    <div key={id} className="border border-border bg-card p-6 flex flex-col gap-4 group hover:border-[var(--primary)] transition-colors relative overflow-hidden">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center justify-between">
                        {card.title}
                        <span className="text-zinc-600 group-hover:text-[var(--primary)] transition-colors">{card.icon}</span>
                      </div>
                      <div className="text-4xl lg:text-4xl font-black text-foreground tracking-tighter my-2 h-10 flex items-center">
                        {isCardLoading(id) ? (
                          <Skeleton className="h-9 w-32" />
                        ) : (
                          card.value
                        )}
                      </div>
                      <div className="w-full h-1 bg-background mt-auto">
                        <div className="h-full bg-foreground group-hover:bg-[var(--primary)] transition-colors w-1/3" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Huge Data Block for Ranking */}
              <div className="border border-border bg-background p-6 md:p-12 relative overflow-hidden">
                <h2 className="text-xl font-black text-[var(--primary)] uppercase tracking-widest mb-12 relative z-10 flex items-center gap-4">
                  <span className="w-4 h-4 bg-[var(--primary)]"></span>
                  Curva ABC (Top 10 Documentos)
                </h2>
                
                <div className="space-y-6 relative z-10">
                  {loadingMap['top10'] ? (
                    <div className="space-y-6">
                      {[100, 82, 68, 54, 42, 30].map((widthPct, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="flex justify-between items-end">
                            <div className="flex items-center gap-4">
                              <Skeleton className="h-4 w-6 font-mono" />
                              <Skeleton className="h-4 w-44 md:w-80" />
                            </div>
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <div className="h-4 w-full bg-card border border-border overflow-hidden">
                            <Skeleton className="h-full" style={{ width: `${widthPct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    analytics?.top10?.map((doc: any, i: number) => {
                      const max = analytics.top10[0]?.QTD_TOTAL || 1;
                      const percent = (doc.QTD_TOTAL / max) * 100;
                      return (
                        <div key={i} className="group/bar flex flex-col gap-2">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-4">
                              <span className="text-muted-foreground font-mono w-6">#{String(i + 1).padStart(2, '0')}</span>
                              {doc.DS_DOCUMENTO}
                            </span>
                            <span className="text-sm font-black text-[var(--primary)] font-mono">
                              {Number(doc.QTD_TOTAL).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="h-4 w-full bg-card border border-border">
                            <div
                              className="h-full bg-foreground group-hover/bar:bg-[var(--primary)] transition-colors duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: UNIDADES */}
          {activeTab === 'unidades' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 border border-border bg-background p-6 md:p-12">
                <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-12 flex items-center gap-4">
                  <span className="w-4 h-4 bg-white"></span>
                  Produção por Unidade
                </h2>
                <div className="space-y-8">
                  {loadingMap['unitAdherence'] ? (
                    <div className="space-y-8">
                      {[90, 75, 58, 42, 28].map((widthPct, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-3">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <div className="h-6 w-full bg-card border border-border overflow-hidden">
                            <Skeleton className="h-full" style={{ width: `${widthPct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    unitData.map((unit) => {
                      const percent = (unit.total / maxUnitTotal) * 100;
                      return (
                        <div key={unit.sigla} className="group">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-black text-muted-foreground uppercase tracking-widest transition-colors">
                              {unit.sigla}
                            </span>
                            <span className="text-sm font-black text-foreground font-mono">
                              {unit.total.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="h-6 w-full bg-card border border-border relative">
                            {/* Grid markers inside bar */}
                            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                              <div className="border-r border-border"></div>
                              <div className="border-r border-border"></div>
                              <div className="border-r border-border"></div>
                              <div></div>
                            </div>
                            <div
                              className="h-full bg-foreground group-hover:bg-[var(--primary)] transition-colors duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-8">
                 <div className="border border-[var(--primary)] bg-[var(--primary)]/5 p-8 text-foreground relative overflow-hidden">
                   <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-[var(--primary)]">
                     <div className="w-2 h-2 bg-[var(--primary)] animate-pulse"></div>
                     Status da Rede
                   </h4>
                   <div className="space-y-6 font-mono">
                      <div className="flex justify-between items-end border-b border-border pb-2">
                        <span className="text-[10px] uppercase text-muted">Database Oracle</span>
                        <span className="text-xs font-black text-[var(--primary)]">ESTÁVEL</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-border pb-2">
                        <span className="text-[10px] uppercase text-muted">Latência Média</span>
                        <span className="text-xs font-black text-foreground">42ms</span>
                      </div>
                   </div>
                 </div>

                 <div className="border border-border p-8 group hover:border-[var(--primary)] transition-colors bg-card">
                  <h3 className="text-xs font-black text-muted-foreground flex items-center gap-3 mb-4 uppercase tracking-widest transition-colors">
                    <Database size={16} />
                    INFO UNIDADE
                  </h3>
                  <p className="text-[10px] text-muted leading-relaxed font-bold uppercase tracking-widest">
                    Dados segmentados unidades hospitalares. Sincronização granular via DBLink por Medylitcs Pro.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUALIDADE */}
          {activeTab === 'qualidade' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="border border-border p-6 flex flex-col gap-4 group hover:border-[var(--primary)] transition-colors bg-card md:col-span-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                      Taxa de Assinatura
                      <Zap size={16} className="text-zinc-600 group-hover:text-[var(--primary)]" />
                    </div>
                    <div className="text-6xl font-black text-foreground tracking-tighter my-4 h-16 flex items-center">
                      {loadingMap['assinados'] ? <Skeleton className="h-14 w-44" /> : (stats?.assinadosPercent || '0.0%')}
                    </div>
                    <div className="flex gap-8 border-t border-border pt-6 mt-auto font-mono">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Assinados</p>
                        <div className="text-xl font-black text-[var(--primary)] h-7 flex items-center">
                          {loadingMap['assinados'] ? <Skeleton className="h-5 w-20" /> : (stats?.assinadosRaw || '0')}
                        </div>
                      </div>
                      <div className="w-[1px] bg-background" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Total</p>
                        <div className="text-xl font-black text-foreground h-7 flex items-center">
                          {loadingMap['assinados'] ? <Skeleton className="h-5 w-20" /> : (stats?.totalRaw || '0')}
                        </div>
                      </div>
                    </div>
                 </div>

                 <div className="border border-border p-6 flex flex-col gap-4 group hover:border-red-500 transition-colors bg-card md:col-span-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                      Docs Ociosos
                      <Archive size={16} className="text-zinc-600 group-hover:text-red-500" />
                    </div>
                    <div className="text-6xl font-black text-foreground tracking-tighter my-4 h-16 flex items-center">
                      {loadingMap['idle'] ? <Skeleton className="h-14 w-44" /> : Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')}
                    </div>
                    <div className="flex gap-8 border-t border-border pt-6 mt-auto font-mono">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Ociosos</p>
                        <div className="text-xl font-black text-red-500 h-7 flex items-center">
                          {loadingMap['idle'] ? <Skeleton className="h-5 w-20" /> : Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="w-[1px] bg-background" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-2">Modelos (Templates)</p>
                        <div className="text-xl font-black text-foreground h-7 flex items-center">
                          {loadingMap['idle'] ? <Skeleton className="h-5 w-20" /> : Number(analytics?.idle?.[0]?.TOTAL_TEMPLATES || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* JCI / ONA GLOBAL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {/* Redundancy */}
                 <div className="border border-border p-6 flex flex-col gap-4 group hover:border-rose-500 transition-colors bg-card">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                      Redundância Clínica
                      <AlertTriangle size={16} className="text-zinc-600 group-hover:text-rose-500" />
                    </div>
                    <div className="text-5xl font-black text-foreground tracking-tighter my-4 h-12 flex items-center">
                      {loadingMap['globalQuality'] ? <Skeleton className="h-10 w-28" /> : `${globalQuality?.redundancia || '0.0'}%`}
                    </div>
                    <div className="border-t border-border pt-4 mt-auto">
                      <p className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 uppercase tracking-widest inline-block">Plágio &gt; 80%</p>
                    </div>
                 </div>

                 {/* Siglario */}
                 <div className="border border-border p-6 flex flex-col gap-4 group hover:border-cyan-500 transition-colors bg-card">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                      Vocabulário Limpo (JCI)
                      <FileText size={16} className="text-zinc-600 group-hover:text-cyan-500" />
                    </div>
                    <div className="text-5xl font-black text-foreground tracking-tighter my-4 h-12 flex items-center">
                      {loadingMap['globalQuality'] ? <Skeleton className="h-10 w-28" /> : `${globalQuality?.aderencia || '100.0'}%`}
                    </div>
                    <div className="border-t border-border pt-4 mt-auto">
                      <p className="text-[9px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-1 uppercase tracking-widest inline-block">S/ Siglas Proibidas</p>
                    </div>
                 </div>

                 {/* SLA */}
                 <div className="border border-border p-6 flex flex-col gap-4 group hover:border-indigo-500 transition-colors bg-card">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                      SLA Assinatura 24h
                      <Clock size={16} className="text-zinc-600 group-hover:text-indigo-500" />
                    </div>
                    <div className="text-5xl font-black text-foreground tracking-tighter my-4 h-12 flex items-center">
                      {loadingMap['globalQuality'] ? <Skeleton className="h-10 w-28" /> : `${globalQuality?.sla24h || '100.0'}%`}
                    </div>
                    <div className="border-t border-border pt-4 mt-auto">
                      <p className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1 uppercase tracking-widest inline-block">Fechamento Rápido</p>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
