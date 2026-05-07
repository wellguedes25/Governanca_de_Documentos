"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Zap, Clock, Activity, Loader2, AlertTriangle,
  RotateCcw, BarChart3, TrendingUp, Users, Search, PlusSquare,
  Archive, Building2, BookOpen, ScanEye, Database, LayoutDashboard
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DashboardTab = 'operacional' | 'unidades' | 'qualidade';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('operacional');
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Inicialização de Configurações
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/connections');
        const data = await res.json();
        setEnabledQueries(data.enabledQueries || {});
        setCardSettings(data.cardSettings || {});
        setCustomCards(data.customCards || []);
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
    }
  }, [activeTab, enabledQueries, fetchStats, fetchAnalytics]);

  const getCardData = (id: string) => {
    const cardMap: Record<string, any> = {
      total: { title: 'Volume Geral (90d)', value: stats?.total || '0', icon: <FileText />, color: 'from-[var(--primary)] to-[var(--primary-light)]' },
      prod24h: { title: 'Produção 24h', value: stats?.prod24h || '0', icon: <Activity />, color: 'from-orange-600 to-red-500' },
      assinados: { title: 'Taxa de Assinatura', value: stats?.assinadosPercent || '0%', icon: <Zap />, color: 'from-emerald-600 to-teal-400' },
      idle: { title: 'Documentos Ociosos', value: Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR'), icon: <Archive />, color: 'from-rose-600 to-orange-500' },
    };

    if (id === 'hospitais') return {
      title: 'Hospitais',
      value: '7 Unidades',
      icon: <Building2 size={20} />,
      color: 'from-slate-700 to-slate-900'
    };

    if (id === 'volumeTurno') {
      const dia = analytics?.volumeTurno?.find((t: any) => t.TURNO === 'DIA')?.QTD || 0;
      const noite = analytics?.volumeTurno?.find((t: any) => t.TURNO === 'NOITE')?.QTD || 0;
      return {
        title: 'Produção por Turno',
        value: `${dia}D / ${noite}N`,
        icon: <Clock size={20} />,
        color: 'from-amber-400 to-orange-600'
      };
    }

    return cardMap[id] || { title: 'Indicador', value: '0', icon: <BarChart3 />, color: 'from-slate-500 to-slate-700' };
  };

  const isCardLoading = (id: string) => loadingMap[id];

  // Dados para o gráfico de Unidades
  const unitData: Array<{ sigla: string; total: number }> = (analytics?.unitAdherence || []).map((u: any) => ({
    sigla: u.SIGLA_UNIDADE || '??',
    total: Number(u.QTD_TOTAL_PREENCHIDA || 0)
  }));
  const maxUnitTotal = unitData[0]?.total || 1;
  const unitColors: Record<string, string> = {
    'HSC': 'bg-[var(--primary)]', 'CSSJ': 'bg-emerald-500', 'HST': 'bg-amber-500',
    'HSJ': 'bg-rose-500', 'HMRP': 'bg-indigo-500', 'HCNSC': 'bg-teal-500', 'HR': 'bg-orange-500'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-slate-900 flex items-center gap-4">
            <div className="p-3 bg-[var(--primary)] rounded-2xl shadow-xl shadow-[var(--primary)]/20">
              <LayoutDashboard size={32} className="text-white" />
            </div>
            Medlytics Dashboard
          </h1>
          <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[var(--primary-light)]" />
            Telemetria em tempo real • Oracle ACSC
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 hover:border-[var(--primary-light)] hover:text-[var(--primary-light)]"
            onClick={() => {
              fetchStats(true);
              fetchAnalytics(true);
            }}
          >
            <RotateCcw size={14} className={(statsLoading || analyticsLoading) ? 'animate-spin' : 'mr-2'} />
            Sincronizar
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-3xl animate-in slide-in-from-top-4 duration-500 flex items-center gap-6 group">
          <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
            <AlertTriangle size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-1 italic">Falha na Sincronização</h3>
            <p className="text-rose-600/80 text-xs font-bold leading-relaxed">
              O sistema encontrou um problema ao conectar com o Oracle: <span className="text-rose-900 underline underline-offset-4 decoration-rose-300">{error}</span>. 
              Por favor, verifique as configurações de conexão ou tente sincronizar novamente.
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => { fetchStats(true); fetchAnalytics(true); }}
            className="rounded-xl hover:bg-rose-100 text-rose-600 font-black text-[10px] uppercase tracking-widest px-6"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Custom Tabs Navigation */}
      <div className="flex bg-slate-100/50 p-1 rounded-2xl w-full md:w-fit">
        {[
          { id: 'operacional', label: 'Operacional', icon: <TrendingUp size={16} /> },
          { id: 'unidades', label: 'Unidades', icon: <Building2 size={16} /> },
          { id: 'qualidade', label: 'Qualidade', icon: <Zap size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as DashboardTab)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-white text-[var(--primary-light)] shadow-lg scale-[1.02]" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Rendering */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'operacional' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['total', 'prod24h', 'hospitais', 'volumeTurno'].map(id => {
                const card = getCardData(id);
                return (
                  <Card key={id} className="relative overflow-hidden group">
                    <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", card.color)} />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <h3 className="text-slate-500">{card.title}</h3>
                      <div className="p-2 bg-slate-50 rounded-lg text-[var(--primary-light)]">{card.icon}</div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">
                        {isCardLoading(id) ? <Skeleton className="h-10 w-32" /> : card.value}
                      </div>
                      {id === 'volumeTurno' && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Últimos 7 dias (Dia vs Noite)</p>
                      )}
                      {id === 'hospitais' && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Unidades mapeadas</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="relative overflow-hidden min-h-[500px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]" />
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6">
                <h2 className="text-slate-900 flex items-center gap-3">
                  <TrendingUp className="text-[var(--primary-light)]" size={24} />
                  Ranking de Documentos (Curva ABC)
                </h2>
              </CardHeader>
              <CardContent className="pt-8">
                {loadingMap['top10'] ? (
                   <div className="space-y-6">
                     {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                   </div>
                ) : (
                  <div className="space-y-5">
                    {analytics?.top10?.map((doc: any, i: number) => {
                      const max = analytics.top10[0]?.QTD_TOTAL || 1;
                      const percent = (doc.QTD_TOTAL / max) * 100;
                      return (
                        <div key={i} className="group/bar">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                              <span className="text-[var(--primary-light)] mr-2 italic">#{String(i + 1).padStart(2, '0')}</span>
                              {doc.DS_DOCUMENTO}
                            </span>
                            <span className="text-[11px] font-mono font-black text-[var(--primary-light)] bg-[var(--primary-light)]/5 px-2 py-0.5 rounded-lg">
                              {Number(doc.QTD_TOTAL).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] rounded-full transition-all duration-1000"
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
          </div>
        )}

        {activeTab === 'unidades' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]" />
              <CardHeader className="p-0 mb-8 border-b border-slate-100 pb-6">
                <h2 className="text-slate-900 flex items-center gap-3">
                  <Building2 size={28} className="text-[var(--primary)]" />
                  Produção por Unidade
                </h2>
              </CardHeader>
              <CardContent className="p-0">
                {loadingMap['unitAdherence'] ? (
                  <div className="space-y-6">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {unitData.map((unit) => {
                      const percent = (unit.total / maxUnitTotal) * 100;
                      const barColor = unitColors[unit.sigla] || 'bg-slate-400';
                      return (
                        <div key={unit.sigla}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                              <div className={cn("w-3 h-3 rounded-full shadow-sm", barColor)} />
                              {unit.sigla}
                            </span>
                            <span className="text-xs font-mono font-black text-slate-500">
                              {unit.total.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
               <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl">
                 <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                   <AlertTriangle size={16} className="text-amber-500" />
                   Status da Rede
                 </h4>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Database Oracle</span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black">ESTÁVEL</Badge>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Latência Média</span>
                      <span className="text-xs font-black text-white">42ms</span>
                    </div>
                 </div>
               </Card>

               <Card className="p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-light)]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[var(--primary-light)]/10 transition-all" />
                <h3 className="text-xs font-black text-[var(--primary-light)] flex items-center gap-2 mb-4 uppercase italic tracking-widest">
                  <Database size={16} />
                  INFO UNIDADE
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase italic tracking-tight">
                  Dados segmentados pelas 7 principais unidades hospitalares da ACSC. Sincronização granular via DBLink.
                </p>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'qualidade' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Taxa de Assinatura</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="text-4xl font-black text-slate-900 tracking-tighter">
                     {loadingMap['assinados'] ? <Skeleton className="h-10 w-24" /> : stats?.assinadosPercent}
                   </div>
                   
                   <div className="flex gap-4 mt-6 border-t border-slate-50 pt-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assinados</p>
                        <div className="text-lg font-black text-emerald-600 tracking-tighter leading-none">
                          {loadingMap['assinados'] ? <Skeleton className="h-5 w-12" /> : stats?.assinadosRaw || '0'}
                        </div>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-100" />
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                        <div className="text-lg font-black text-slate-700 tracking-tighter leading-none">
                          {loadingMap['assinados'] ? <Skeleton className="h-5 w-12" /> : stats?.totalRaw || '0'}
                        </div>
                      </div>
                   </div>
                </CardContent>
             </Card>


             <Card className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Docs Ociosos</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="text-4xl font-black text-slate-900 tracking-tighter">
                     {loadingMap['idle'] ? <Skeleton className="h-10 w-24" /> : Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')}
                   </div>

                   <div className="flex gap-4 mt-6 border-t border-slate-50 pt-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ociosos</p>
                        <div className="text-lg font-black text-rose-600 tracking-tighter leading-none">
                          {loadingMap['idle'] ? <Skeleton className="h-5 w-12" /> : Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="w-[1px] h-8 bg-slate-100" />
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Modelos</p>
                        <div className="text-lg font-black text-slate-700 tracking-tighter leading-none">
                          {loadingMap['idle'] ? <Skeleton className="h-5 w-12" /> : Number(analytics?.idle?.[0]?.TOTAL_TEMPLATES || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                   </div>
                </CardContent>
             </Card>

          </div>
        )}
      </div>
    </div>
  );
}
