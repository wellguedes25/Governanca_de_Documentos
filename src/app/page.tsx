"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Zap, Clock, Activity, Loader2, AlertTriangle, 
  RotateCcw, BarChart3, TrendingUp, Users, Search, PlusSquare 
} from 'lucide-react';

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
      title: cardSettings['total']?.title || 'Total Documentos', 
      value: (statsLoading || loadingMap['total']) ? <Loader2 className="animate-spin text-[var(--primary)] h-8 w-8" /> : (stats?.total || '0'), 
      change: 'Histórico Total', 
      icon: <FileText size={24} />, 
      color: cardSettings['total']?.color || 'from-[var(--primary)] to-emerald-600',
      onRefresh: () => fetchStats(true, 'total')
    },
    { 
      id: 'prod24h',
      title: cardSettings['prod24h']?.title || 'Produção 24h', 
      value: (statsLoading || loadingMap['prod24h']) ? <Loader2 className="animate-spin text-orange-500 h-8 w-8" /> : (stats?.prod24h || '0'), 
      change: 'Novos registros', 
      icon: <Activity size={24} />, 
      color: cardSettings['prod24h']?.color || 'from-orange-500 to-red-600',
      onRefresh: () => fetchStats(true, 'prod24h')
    },
    { 
      id: 'assinados',
      title: cardSettings['assinados']?.title || 'Taxa de Assinatura', 
      value: (statsLoading || loadingMap['assinados']) ? <Loader2 className="animate-spin text-emerald-500 h-8 w-8" /> : (stats?.assinadosPercent || '0%'), 
      change: 'Documentos Finalizados', 
      icon: <Zap size={24} />, 
      color: cardSettings['assinados']?.color || 'from-emerald-500 to-[var(--primary)]',
      onRefresh: () => fetchStats(true, 'assinados')
    },
    { 
      id: 'volume3m',
      title: cardSettings['volume3m']?.title || 'Volume (3 Meses)', 
      value: (analyticsLoading || loadingMap['volume3m']) ? <Loader2 className="animate-spin text-cyan-500 h-8 w-8" /> : (Number(analytics?.volume3m || 0).toLocaleString('pt-BR')), 
      change: 'Volume Curto Prazo', 
      icon: <Clock size={24} />, 
      color: cardSettings['volume3m']?.color || 'from-[var(--primary)] to-cyan-600',
      onRefresh: () => fetchAnalytics(true, 'volume3m')
    },
    { 
      id: 'idle',
      title: cardSettings['idle']?.title || 'Documentos Ociosos', 
      value: (analyticsLoading || loadingMap['idle']) ? <Loader2 className="animate-spin text-rose-500 h-8 w-8" /> : (Number(analytics?.idle?.[0]?.TOTAL_DOCS_OCIOSOS || 0).toLocaleString('pt-BR')), 
      change: 'Sem uso (90 dias)', 
      icon: <Clock size={24} />, 
      color: cardSettings['idle']?.color || 'from-rose-500 to-orange-600',
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
      value: loadingMap[card.id] ? <Loader2 className="animate-spin h-8 w-8 opacity-50" /> : displayValue,
      change: 'Indicador Customizado',
      icon: <BarChart3 size={24} />,
      color: card.color || 'from-slate-500 to-slate-700',
      onRefresh: () => fetchCustomCard(card, true)
    };
  });

  const allCards = [...defaultCards, ...dynamicCards];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex justify-between items-end mb-8 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
            <BarChart3 size={32} className="text-[var(--primary)]" />
            Dashboard Estratégico
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-sm tracking-tight">Telemetria em tempo real • Oracle DBAMV</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => { 
                fetchStats(true); 
                fetchAnalytics(true); 
                customCards.forEach(c => { if (c.enabled !== false) fetchCustomCard(c, true); }); 
            }}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-[var(--radius)] text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-200 shadow-sm"
            disabled={statsLoading || analyticsLoading}
          >
            <RotateCcw size={14} className={(statsLoading || analyticsLoading) ? 'animate-spin' : ''} />
            Sincronizar Dados
          </button>
        </div>
      </header>

      {/* Grid de Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allCards.map((card) => (
          <div key={card.id} className="group bg-white border border-slate-200 p-5 rounded-[var(--radius)] shadow-sm hover:border-[var(--primary)] transition-all flex flex-col justify-between h-full relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-slate-50 rounded-[var(--radius)] text-[var(--primary)] border border-slate-100">
                {card.icon}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Status</span>
                <span className="text-[9px] font-black uppercase text-emerald-600 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{card.title}</h3>
              <div className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                {card.value}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-[9px]">
              <span className="text-slate-400 font-bold uppercase tracking-tighter">{card.change}</span>
              <button 
                onClick={card.onRefresh}
                disabled={loadingMap[card.id]}
                className="p-1.5 rounded-[var(--radius)] hover:bg-slate-50 text-slate-400 hover:text-[var(--primary)] transition-all disabled:opacity-50"
              >
                <RotateCcw size={12} className={loadingMap[card.id] ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva ABC (Top 10) */}
        {enabledQueries['top10'] !== false && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[var(--radius)] p-8 shadow-sm relative overflow-hidden flex flex-col min-h-[500px]">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]"></div>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tighter">
                <TrendingUp className="text-[var(--primary)]" size={24} />
                Ranking de Documentos (Curva ABC)
              </h3>
              <button 
                onClick={() => fetchAnalytics(true, 'top10')}
                disabled={analyticsLoading || loadingMap['top10']}
                className="p-2 rounded-[var(--radius)] hover:bg-slate-50 text-slate-400 hover:text-[var(--primary)] transition-all"
              >
                <RotateCcw size={16} className={(analyticsLoading || loadingMap['top10']) ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className="flex-1">
              {(analyticsLoading || loadingMap['top10']) ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
                  <p className="text-slate-400 font-bold text-[10px] tracking-[0.2em] uppercase italic">Atualizando Índices...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {analytics?.top10?.map((doc: any, i: number) => {
                    const max = analytics.top10[0]?.QTD_TOTAL || 1;
                    const percent = (doc.QTD_TOTAL / max) * 100;
                    return (
                      <div key={i} className="group">
                        <div className="flex justify-between items-end mb-2 px-0.5">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight truncate max-w-[85%]">
                            {String(i+1).padStart(2, '0')}. {doc.DS_DOCUMENTO}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[var(--primary)] bg-slate-50 px-2 py-0.5 border border-slate-100">{Number(doc.QTD_TOTAL).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-none overflow-hidden flex">
                          <div 
                            className="h-full bg-[var(--primary)] transition-all duration-1000 ease-out"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[var(--radius)] p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-6 italic uppercase tracking-tighter border-b border-slate-100 pb-4">Status Infra</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Produção Oracle</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 uppercase font-black px-2 py-1 bg-emerald-50 border border-emerald-100">Estável</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Sandbox Dev</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black px-2 py-1 bg-slate-50 border border-slate-100">Standby</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-8 rounded-[var(--radius)] text-slate-900 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[var(--primary)]/10 transition-all"></div>
            <h3 className="text-xs font-black text-[var(--primary)] flex items-center gap-2 mb-4 uppercase italic tracking-widest">
              <AlertTriangle size={16} />
              Nota Técnica
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase italic tracking-tight">
              Sincronização via DBLink ativa. Último heartbeat processado com sucesso. Para atualização forçada de índices, utilize o comando sincronizar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
