"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Zap, Clock, Activity, Loader2, AlertTriangle,
  RotateCcw, BarChart3, TrendingUp, Users, Search, PlusSquare,
  Archive, Building2, BookOpen, ScanEye
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [enabledQueries, setEnabledQueries] = useState<Record<string, boolean>>({});
  const [cardSettings, setCardSettings] = useState<Record<string, any>>({});
  const [customCards, setCustomCards] = useState<any[]>([]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const fetchStats = useCallback(async (force = false, type?: string) => {
    const cacheKey = 'dashboard_stats';
    if (!force && !type) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setStats(JSON.parse(cached));
        setStatsLoading(false);
        return;
      }
    }

    if (type) setLoadingMap(prev => ({ ...prev, [type]: true }));
    else setStatsLoading(true);

    try {
      const url = type ? `/api/dashboard/stats?type=${type}` : '/api/dashboard/stats';
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

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
  }, []);

  const fetchAnalytics = useCallback(async (force = false, type?: string) => {
    const cacheKey = 'dashboard_analytics';
    if (!force && !type) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setAnalytics(JSON.parse(cached));
        setAnalyticsLoading(false);
        return;
      }
    }

    if (type) setLoadingMap(prev => ({ ...prev, [type]: true }));
    else setAnalyticsLoading(true);

    try {
      const url = type ? `/api/dashboard/analytics?type=${type}` : '/api/dashboard/analytics';
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

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
  }, []);

  const fetchCustomCard = useCallback(async (card: any, force = false) => {
    const cacheKey = `dashboard_custom_${card.id}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setCustomData(prev => ({ ...prev, [card.id]: cached }));
        return;
      }
    }

    setLoadingMap(prev => ({ ...prev, [card.id]: true }));
    try {
      const res = await fetch(`/api/dashboard/stats?type=${card.id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const value = String(data.value);
      setCustomData(prev => ({ ...prev, [card.id]: value }));
      sessionStorage.setItem(cacheKey, value);
    } catch (err) {
      console.error(`Erro ao carregar card custom (${card.title}):`, err);
      setCustomData(prev => ({ ...prev, [card.id]: 'Erro' }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [card.id]: false }));
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/connections');
        const data = await res.json();
        setEnabledQueries(data.enabledQueries || {});
        setCardSettings(data.cardSettings || {});
        setCustomCards(data.customCards || []);

        // Carrega dados iniciais (respeita cache interno de fetchStats/fetchAnalytics)
        fetchStats();
        fetchAnalytics();

        // Carrega dados dos cards customizados
        if (data.customCards) {
          data.customCards.forEach((card: any) => {
            if (card.enabled !== false) fetchCustomCard(card);
          });
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
      }
    }
    init();
  }, [fetchStats, fetchAnalytics, fetchCustomCard]);

  const defaultCards = [
    {
      id: 'total',
      title: cardSettings['total']?.title || 'Preenchimentos (90d)',
      value: stats?.total || '0',
      change: 'Volume Operacional',
      icon: <FileText size={22} />,
      color: cardSettings['total']?.color || 'from-[var(--primary)] to-[var(--primary-light)]',
      onRefresh: () => fetchStats(true, 'total')
    },
    {
      id: 'prod24h',
      title: cardSettings['prod24h']?.title || 'Produção 24h',
      value: stats?.prod24h || '0',
      change: 'Últimas 24 horas',
      icon: <Activity size={22} />,
      color: cardSettings['prod24h']?.color || 'from-[var(--cta)] to-red-500',
      onRefresh: () => fetchStats(true, 'prod24h')
    },
    {
      id: 'assinados',
      title: cardSettings['assinados']?.title || 'Taxa de Assinatura',
      value: stats?.assinadosPercent || '0%',
      change: 'Assinados / Total (90d)',
      icon: <Zap size={22} />,
      color: cardSettings['assinados']?.color || 'from-[var(--success)] to-emerald-400',
      onRefresh: () => fetchStats(true, 'assinados')
    },
    {
      id: 'volume3m',
      title: cardSettings['volume3m']?.title || 'Prestadores Ativos',
      value: Number(analytics?.volume3m || 0).toLocaleString('pt-BR'),
      change: 'Profissionais (90 dias)',
      icon: <Users size={22} />,
      color: cardSettings['volume3m']?.color || 'from-[var(--primary-dark)] to-[var(--primary)]',
      onRefresh: () => fetchAnalytics(true, 'volume3m')
    },
    {
      id: 'idle',
      title: cardSettings['idle']?.title || 'Documentos Ociosos',
      value: Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR'),
      change: 'Sem uso (90 dias)',
      icon: <Archive size={22} />,
      color: cardSettings['idle']?.color || 'from-[var(--destructive)] to-[var(--cta)]',
      onRefresh: () => fetchAnalytics(true, 'idle')
    },
  ].filter(card => enabledQueries[card.id] !== false);

  const dynamicCards = customCards.filter(c => c.enabled !== false).map(card => {
    const rawValue = customData[card.id];
    let displayValue = rawValue || '---';

    if (rawValue !== undefined && rawValue !== null && rawValue !== '---' && rawValue !== 'Erro') {
      if (card.valueType === 'percent') {
        displayValue = `${Number(rawValue).toFixed(1)}%`;
      } else {
        displayValue = Number(rawValue).toLocaleString('pt-BR');
      }
    }

    return {
      id: card.id,
      title: card.title,
      value: displayValue,
      change: 'Indicador Customizado',
      icon: <BarChart3 size={22} />,
      color: card.color || 'from-slate-500 to-slate-700',
      onRefresh: () => fetchCustomCard(card, true)
    };
  });

  const allCards = [...defaultCards, ...dynamicCards];
  const isCardLoading = (id: string) => statsLoading || analyticsLoading || loadingMap[id];

  // Dados para o gráfico de Produção por Unidade
  const unitData: Array<{ sigla: string; total: number }> = (analytics?.unitAdherence || []).map((u: any) => ({
    sigla: u.SIGLA_UNIDADE || '??',
    total: Number(u.QTD_TOTAL_PREENCHIDA || 0)
  }));
  const maxUnitTotal = unitData[0]?.total || 1;

  // Cores consistentes para cada unidade
  const unitColors: Record<string, string> = {
    'HSC': 'bg-blue-500', 'CSSJ': 'bg-emerald-500', 'HST': 'bg-amber-500',
    'HSJ': 'bg-rose-500', 'HMRP': 'bg-indigo-500', 'HCNSC': 'bg-teal-500', 'HR': 'bg-orange-500'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-end mb-8 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
            <BarChart3 size={32} className="text-[var(--primary)]" />
            Medlytics Dashboard
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-sm tracking-tight">Telemetria em tempo real • Oracle DBAMV</p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            fetchStats(true);
            fetchAnalytics(true);
            customCards.forEach(c => { if (c.enabled !== false) fetchCustomCard(c, true); });
          }}
          disabled={statsLoading || analyticsLoading}
        >
          <RotateCcw size={14} className={(statsLoading || analyticsLoading) ? 'animate-spin' : ''} />
          Sincronizar Dados
        </Button>
      </header>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {allCards.map((card) => (
          <Card
            key={card.id}
            className={cn(
              "group hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] cursor-default relative overflow-hidden",
              "transition-all duration-200"
            )}
          >
            {/* Gradient accent bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", card.color)} />

            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="p-2.5 bg-slate-50 rounded-[var(--radius)] text-[var(--primary)] border border-slate-100 group-hover:bg-[var(--primary)]/5 transition-colors">
                {card.icon}
              </div>
              <Badge variant="live">
                <span className="w-1 h-1 rounded-full bg-[var(--success)] animate-pulse" />
                Live
              </Badge>
            </CardHeader>

            <CardContent>
              <CardTitle>{card.title}</CardTitle>
              <div className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums mt-1">
                {isCardLoading(card.id) ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  card.value
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-4 mt-auto border-t border-slate-50 flex justify-between items-center">
              <CardDescription>{card.change}</CardDescription>
              <button
                onClick={card.onRefresh}
                disabled={!!loadingMap[card.id]}
                className="p-1.5 rounded-[var(--radius)] hover:bg-slate-50 text-slate-400 hover:text-[var(--primary)] transition-all disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw size={12} className={loadingMap[card.id] ? 'animate-spin' : ''} />
              </button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva ABC (Top 10) */}
        {enabledQueries['top10'] !== false && (
          <Card className="lg:col-span-2 relative overflow-hidden min-h-[500px]">
            {/* Left accent bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary-light)]" />

            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                <TrendingUp className="text-[var(--primary)]" size={24} />
                Ranking de Documentos (Curva ABC)
              </h3>
              <button
                onClick={() => fetchAnalytics(true, 'top10')}
                disabled={analyticsLoading || loadingMap['top10']}
                className="p-2 rounded-[var(--radius)] hover:bg-slate-50 text-slate-400 hover:text-[var(--primary)] transition-all cursor-pointer"
              >
                <RotateCcw size={16} className={(analyticsLoading || loadingMap['top10']) ? 'animate-spin' : ''} />
              </button>
            </CardHeader>

            <CardContent className="flex-1">
              {(analyticsLoading || loadingMap['top10']) ? (
                <div className="space-y-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {analytics?.top10?.map((doc: any, i: number) => {
                    const max = analytics.top10[0]?.QTD_TOTAL || 1;
                    const percent = (doc.QTD_TOTAL / max) * 100;
                    return (
                      <div key={i} className="group/bar">
                        <div className="flex justify-between items-end mb-1.5 px-0.5">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight truncate max-w-[85%]">
                            <span className={cn(
                              "inline-block w-5 text-[10px] font-black mr-1",
                              i === 0 ? "text-[var(--primary)]" : i < 3 ? "text-[var(--primary-light)]" : "text-slate-400"
                            )}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            {doc.DS_DOCUMENTO}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-0.5 rounded-[var(--radius)] border border-[var(--primary)]/10">
                            {Number(doc.QTD_TOTAL).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 ease-out",
                              i === 0
                                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]"
                                : i < 3
                                  ? "bg-[var(--primary)]"
                                  : "bg-[var(--primary)]/60"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Produção por Unidade — dados reais de unitAdherence */}
          {enabledQueries['unitAdherence'] !== false && (
            <Card className="p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-blue-500" />
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-2">
                  <Building2 size={20} className="text-indigo-500" />
                  Produção por Unidade
                </h3>
                <button
                  onClick={() => fetchAnalytics(true, 'unitAdherence')}
                  disabled={analyticsLoading || loadingMap['unitAdherence']}
                  className="p-1.5 rounded-[var(--radius)] hover:bg-slate-50 text-slate-400 hover:text-indigo-500 transition-all cursor-pointer"
                >
                  <RotateCcw size={12} className={(analyticsLoading || loadingMap['unitAdherence']) ? 'animate-spin' : ''} />
                </button>
              </div>

              {(analyticsLoading || loadingMap['unitAdherence']) ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : unitData.length > 0 ? (
                <div className="space-y-4">
                  {unitData.map((unit, i) => {
                    const percent = (unit.total / maxUnitTotal) * 100;
                    const barColor = unitColors[unit.sigla] || 'bg-slate-400';
                    return (
                      <div key={unit.sigla} className="group/unit">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-sm", barColor)} />
                            {unit.sigla}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {unit.total.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-8 italic">Sem dados de unidades</p>
              )}
            </Card>
          )}

          <Card className="p-8">
            <h3 className="text-lg font-black text-slate-900 mb-6 italic uppercase tracking-tighter border-b border-slate-100 pb-4">Status Infra</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Produção Oracle</span>
                </div>
                <Badge variant="success">Estável</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Sandbox Dev</span>
                </div>
                <Badge variant="outline">Standby</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[var(--primary)]/10 transition-all" />
            <h3 className="text-xs font-black text-[var(--primary)] flex items-center gap-2 mb-4 uppercase italic tracking-widest">
              <AlertTriangle size={16} />
              Nota Técnica
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase italic tracking-tight">
              Sincronização via DBLink ativa. Último heartbeat processado com sucesso. Para atualização forçada de índices, utilize o comando sincronizar.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
