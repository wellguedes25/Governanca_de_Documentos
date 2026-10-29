"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Activity, ShieldCheck, Archive, RotateCw,
  Building2, BarChart3, Clock, ChevronRight, AlertTriangle,
  Sun, Moon, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function Dashboard() {
  const { docVersion } = useUI();
  const router = useRouter();

  // Versão resolvida com fallback seguro
  const resolvedVersion = useMemo(() => {
    if (docVersion) return docVersion;
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('app_doc_version');
      if (saved === 'V3' || saved === 'V2') return saved;
    }
    return 'V2';
  }, [docVersion]);

  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [quality, setQuality] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeConnId, setActiveConnId] = useState('');

  // Busca dados de conexões ativas
  useEffect(() => {
    fetch('/api/connections')
      .then(res => res.json())
      .then(data => {
        if (data.activeConnectionId) {
          setActiveConnId(data.activeConnectionId);
        }
      })
      .catch(console.error);
  }, []);

  // Busca centralizada de todos os dados do Cockpit
  const fetchDashboardData = useCallback(async (force = false) => {
    const cacheKey = `dashboard_unified_${activeConnId || 'default'}_${resolvedVersion}`;

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
      const [resStats, resAnalytics, resQuality] = await Promise.all([
        fetch(`/api/dashboard/stats?version=${resolvedVersion}${forceParam}`).then(r => r.json()),
        fetch(`/api/dashboard/analytics?version=${resolvedVersion}${forceParam}`).then(r => r.json()),
        fetch(`/api/dashboard/quality?version=${resolvedVersion}${forceParam}`).then(r => r.json()),
      ]);

      if (resStats.error) throw new Error(resStats.error);
      if (resAnalytics.error) throw new Error(resAnalytics.error);
      if (resQuality.error) throw new Error(resQuality.error);

      setStats(resStats);
      setAnalytics(resAnalytics);
      setQuality(resQuality);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          stats: resStats,
          analytics: resAnalytics,
          quality: resQuality
        }));
      }
    } catch (err: any) {
      console.error('Erro ao carregar telemetria do dashboard:', err);
      setError(err.message || 'Falha na comunicação com o banco Oracle.');
    } finally {
      setLoading(false);
    }
  }, [resolvedVersion, activeConnId]);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Métricas calculadas para os Top Cards
  const top10List: Top10Item[] = analytics?.top10 || [];
  const maxTopDoc = top10List[0]?.QTD_TOTAL || 1;

  const unitList: UnitAdherenceItem[] = analytics?.unitAdherence || [];
  const maxUnitVal = unitList[0]?.QTD_TOTAL_PREENCHIDA || 1;
  const totalUnitProduction = useMemo(() => {
    return unitList.reduce((acc, u) => acc + Number(u.QTD_TOTAL_PREENCHIDA || 0), 0);
  }, [unitList]);

  // Métricas do Catálogo (Ociosos vs Ativos)
  const idleItem = analytics?.idle?.[0];
  const totalTemplates = Number(idleItem?.TOTAL_TEMPLATES || 0);
  const idleTemplates = Number(idleItem?.TOTAL_DOCS_OCIOSOS || 0);
  const activeTemplates = Math.max(0, totalTemplates - idleTemplates);

  // Métricas de Turno
  const turnos: TurnoItem[] = analytics?.volumeTurno || [];
  const turnoDia = Number(turnos.find(t => t.TURNO === 'DIA')?.QTD || 0);
  const turnoNoite = Number(turnos.find(t => t.TURNO === 'NOITE')?.QTD || 0);
  const totalTurnos = turnoDia + turnoNoite || 1;
  const pctDia = ((turnoDia / totalTurnos) * 100).toFixed(1);
  const pctNoite = ((turnoNoite / totalTurnos) * 100).toFixed(1);

  // Faixas de SLA
  const faixasSla: SlaFaixaItem[] = quality?.faixas || [];
  const totalSlaSigned = useMemo(() => {
    return faixasSla.reduce((acc, f) => acc + Number(f.TOTAL || 0), 0);
  }, [faixasSla]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8 space-y-6 pb-24">
      
      {/* 1. Header Executivo Padronizado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <PageHeader 
            title="Cockpit de Governança"
            subtitle="Visão executiva consolidada · Produção clínica, aderência das unidades e conformidade regulatória"
            icon={BarChart3}
          />
          <Badge 
            variant="outline" 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border-sky-300 bg-sky-50 text-sky-800"
          >
            Motor {resolvedVersion}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/hospitais')}
            className="gap-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs cursor-pointer h-9 px-4"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Visão por Hospital</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
            className="gap-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs cursor-pointer h-9 px-4"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-sky-600", loading && "animate-spin")} />
            <span>Sincronizar Cockpit</span>
          </Button>
        </div>
      </div>

      {/* Alerta de Erro */}
      {error && (
        <div className="border border-rose-200 bg-rose-50 p-4 rounded-xl flex items-center gap-3 text-xs text-rose-700 shadow-2xs">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <div>
            <p className="font-bold text-rose-900">Falha ao obter telemetria do banco de dados</p>
            <p className="text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* 2. Top Executive KPI Bar (4 Cards de Alto Impacto) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Volume Geral (90d) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Volume Geral (90d)</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
              <FileText size={17} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight my-1">
              {loading ? <Skeleton className="h-9 w-28" /> : stats?.total || '0'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Prontuários e evoluções na rede
            </p>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-sky-600 rounded-full w-full" />
          </div>
        </div>

        {/* Card 2: Produção 24 Horas */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Produção Recente (24h)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Activity size={17} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight my-1">
              {loading ? <Skeleton className="h-9 w-24" /> : stats?.prod24h || '0'}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Documentos registrados hoje
            </p>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-emerald-500 rounded-full w-3/4" />
          </div>
        </div>

        {/* Card 3: Conformidade de SLA (24h) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>SLA Fechamento (24h)</span>
            <div className="p-2 rounded-xl bg-teal-50 text-[#004953] border border-teal-100">
              <ShieldCheck size={17} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums text-[#004953] tracking-tight my-1">
              {loading ? <Skeleton className="h-9 w-24" /> : `${quality?.sla24h || '100.0'}%`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Taxa de assinatura: <strong className="text-slate-800">{stats?.assinadosPercent || '0.0%'}</strong>
            </p>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-[#004953] rounded-full w-[95%]" />
          </div>
        </div>

        {/* Card 4: Saúde do Catálogo */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span>Catálogo Clínico</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
              <Archive size={17} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight my-1">
              {loading ? <Skeleton className="h-9 w-24" /> : `${activeTemplates} Ativos`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {idleTemplates} templates ociosos em 90 dias
            </p>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-amber-500 rounded-full" 
              style={{ width: `${totalTemplates > 0 ? (activeTemplates / totalTemplates) * 100 : 50}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 3. Painel Central: Grid 2 Colunas (7/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA: Curva ABC (Top 10 Modelos Clínicos) - 7 Colunas */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                  Curva ABC · Modelos Mais Utilizados
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  Ranking dos 10 documentos de maior relevância assistencial
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 border-slate-200 bg-slate-50 self-start sm:self-auto">
              Últimos 90 dias
            </Badge>
          </div>

          <div className="space-y-3.5">
            {loading ? (
              <div className="space-y-4">
                {[100, 85, 70, 55, 40].map((width, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                ))}
              </div>
            ) : top10List.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                Nenhum dado analítico encontrado para os últimos 90 dias.
              </div>
            ) : (
              top10List.map((doc, idx) => {
                const percent = (doc.QTD_TOTAL / maxTopDoc) * 100;
                return (
                  <div key={doc.CD_DOCUMENTO || idx} className="group p-2.5 rounded-xl hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[11px] shrink-0 border",
                          idx === 0 ? "bg-[#004953] text-white border-[#004953]" :
                          idx === 1 ? "bg-sky-700 text-white border-sky-700" :
                          idx === 2 ? "bg-sky-600 text-white border-sky-600" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 group-hover:text-sky-800 transition-colors block truncate">
                            {doc.DS_DOCUMENTO}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {Number(doc.QTD_TOTAL).toLocaleString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">usos</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#004953] to-sky-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Aderência por Unidade + Qualidade & Turnos - 5 Colunas */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Módulo 1: Aderência por Unidade Hospitalar com link direto */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-[#004953] border border-teal-100">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                    Aderência por Unidade
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Participação de cada hospital na produção
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 border-slate-200 bg-slate-50">
                {unitList.length} Unidades
              </Badge>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  ))}
                </div>
              ) : unitList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhum dado por unidade retornado.
                </div>
              ) : (
                unitList.map((unit) => {
                  const percent = (unit.QTD_TOTAL_PREENCHIDA / maxUnitVal) * 100;
                  const share = totalUnitProduction > 0 
                    ? ((unit.QTD_TOTAL_PREENCHIDA / totalUnitProduction) * 100).toFixed(1) 
                    : '0.0';

                  return (
                    <div 
                      key={unit.CD_MULTI_EMPRESA} 
                      className="group p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer"
                      onClick={() => router.push(`/hospitais?id=${unit.CD_MULTI_EMPRESA}`)}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-[11px]">
                            {unit.SIGLA_UNIDADE}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {share}% do total
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 group-hover:text-sky-800 transition-colors">
                          <span className="font-mono font-bold tabular-nums">
                            {Number(unit.QTD_TOTAL_PREENCHIDA).toLocaleString('pt-BR')}
                          </span>
                          <ChevronRight size={13} className="text-slate-400 group-hover:text-sky-600 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-600 group-hover:bg-[#004953] transition-all rounded-full duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Módulo 2: Operação & Distribuição de Turno */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                  <Clock size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                    Dinâmica de Turnos
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Distribuição da carga clínica (Últimos 7 dias)
                  </span>
                </div>
              </div>
            </div>

            {/* Barra bipartida Dia vs Noite */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <Sun size={14} className="text-amber-500" />
                  <span>Diurno (07h às 19h): <strong>{pctDia}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                  <Moon size={14} className="text-indigo-500" />
                  <span>Noturno: <strong>{pctNoite}%</strong></span>
                </div>
              </div>

              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  className="h-full bg-amber-400 hover:bg-amber-500 transition-all duration-500" 
                  style={{ width: `${pctDia}%` }}
                  title={`Diurno: ${turnoDia.toLocaleString('pt-BR')} registros`}
                />
                <div 
                  className="h-full bg-slate-700 hover:bg-slate-800 transition-all duration-500" 
                  style={{ width: `${pctNoite}%` }}
                  title={`Noturno: ${turnoNoite.toLocaleString('pt-BR')} registros`}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>{turnoDia.toLocaleString('pt-BR')} preenchimentos</span>
                <span>{turnoNoite.toLocaleString('pt-BR')} preenchimentos</span>
              </div>
            </div>

            {/* Faixas de Tempo de Fechamento */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Cumprimento de SLA de Fechamento
                </span>
                <span className="text-emerald-700 font-mono font-bold">
                  {quality?.sla24h || '100.0'}% em &lt;24h
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
                {faixasSla.map((f, i) => (
                  <div key={i} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                    <span className="block text-slate-400 font-medium">{f.FAIXA_SLA}</span>
                    <strong className="block text-slate-800 font-mono mt-0.5 font-bold">
                      {Number(f.TOTAL).toLocaleString('pt-BR')}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}