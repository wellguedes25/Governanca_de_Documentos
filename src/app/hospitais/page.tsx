'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Activity, 
  Clock, 
  RefreshCcw, 
  ArrowLeft,
  TrendingUp,
  Database,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDateTime } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { DbConnection, HospitalMapping } from '@/lib/storage';

interface DetailItem {
  CD_DOCUMENTO: string;
  NOME: string;
  VERSAO?: string;
  USO_UNIDADE: number;
  ULTIMO_USO?: string;
}

interface Top5Item {
  NOME: string;
  USO: number;
}

interface SlaItem {
  FAIXA_SLA: string;
  TOTAL: number;
}

const COLORS = [
  'bg-sky-600', 'bg-emerald-600', 'bg-amber-600', 'bg-teal-600', 
  'bg-cyan-600', 'bg-rose-600', 'bg-slate-700', 'bg-blue-600', 
  'bg-emerald-500', 'bg-lime-600', 'bg-sky-500', 'bg-orange-500'
];

interface HospitalStats {
  kpis: {
    TOTAL_DOCS?: number;
    DOCS_ATIVOS?: number;
    ULTIMO_REGISTRO?: string;
  };
  details: DetailItem[];
  top5: Top5Item[];
  globalTotal: number;
  error?: string;
}

interface QualityStats {
  sla: SlaItem[];
}

interface HospitalItem extends HospitalMapping {
  color: string;
}

export default function HospitaisPage() {
  const { docVersion } = useUI();
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HospitalStats | null>(null);
  const [qualityData, setQualityData] = useState<QualityStats | null>(null);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [activeConnName, setActiveConnName] = useState('');

  // Cálculos da métrica de SLA
  const slaRows = qualityData?.sla || [];
  const totalSigned = slaRows.reduce((acc: number, r: SlaItem) => acc + Number(r.TOTAL), 0);
  const within24h = slaRows
    .filter((r: SlaItem) => r.FAIXA_SLA !== 'Mais de 24h')
    .reduce((acc: number, r: SlaItem) => acc + Number(r.TOTAL), 0);
  const slaPercentage = totalSigned > 0 ? ((within24h / totalSigned) * 100).toFixed(1) : '100.0';

  // Proteção de rota
  useEffect(() => {
    const savedVersion = sessionStorage.getItem('app_doc_version');
    if (!docVersion && !savedVersion) {
      router.push('/');
    }
  }, [docVersion, router]);

  const selectedHospital = hospitals[selectedIdx];

  const fetchData = async (id: string, force = false) => {
    const cacheKey = `hospital_data_${id}`;
    if (!force) {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          setData(cached.stats);
          setQualityData(cached.quality);
          setError(null);
          return;
        } catch (e) {}
      }
    }

    setLoading(true);
    setError(null);
    try {
      const [resStats, resQuality] = await Promise.all([
        fetch(`/api/hospitals/stats?id=${id}${force ? '&force=true' : ''}`),
        fetch(`/api/hospitals/quality?id=${id}${force ? '&force=true' : ''}`)
      ]);
      
      const jsonStats = await resStats.json();
      const jsonQuality = await resQuality.json();
      
      if (jsonStats.error) {
        setError(jsonStats.error);
        return;
      }
      
      setData(jsonStats);
      setQualityData(jsonQuality);

      sessionStorage.setItem(cacheKey, JSON.stringify({
        stats: jsonStats,
        quality: jsonQuality
      }));
    } catch (error) {
      const err = error as Error;
      console.error('Erro ao buscar dados do hospital:', err);
      setError('Falha na comunicação com o servidor Oracle.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/connections')
      .then(res => res.json())
      .then(storage => {
        if (storage.activeConnectionId && storage.connections) {
          const activeConn = storage.connections.find((c: DbConnection) => c.id === storage.activeConnectionId);
          if (activeConn) {
            setActiveConnName(activeConn.name);
          }
        }
        if (storage.hospitalsMapping) {
          const active = storage.hospitalsMapping
            .filter((h: HospitalMapping) => h.ativo)
            .map((h: HospitalMapping, i: number) => ({
              ...h,
              nome: h.nome || h.sigla, // Usamos a sigla como fallback para o nome
              color: COLORS[i % COLORS.length]
            }));
          setHospitals(active);
          
          if (active.length > 0) {
            fetchData(String(active[0].id));
          }
        }
      });
  }, []);

  useEffect(() => {
    if (selectedHospital) {
      fetchData(String(selectedHospital.id));
    }
  }, [selectedIdx, selectedHospital]);

  if (hospitals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-muted space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        <p className="text-xs uppercase tracking-widest font-black">Carregando unidades...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card flex flex-col p-4 md:p-8 space-y-8 animate-in fade-in duration-700 text-foreground font-mono pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        {/* --- PADRONIZAÇÃO DO HEADER --- */}
        <PageHeader 
          title="Unidades Hospitalares"
          subtitle={selectedHospital ? `${selectedHospital.nome}` : "Gestão Operacional"}
          icon={Building2}
        />
        
        <Link href="/dashboard" className="flex items-center justify-between p-4 bg-card border border-border -border -foreground transition-colors group w-full md:w-auto text-xs font-black uppercase tracking-widest text-muted">
          <ArrowLeft className="w-4 h-4 mr-4 group-hover:-translate-x-1 transition-transform" />
          Dashboard Geral
        </Link>
      </div>

      {/* Hospital Selector (Brutalist Tabs) */}
      <div className="flex flex-wrap gap-2">
        {hospitals.map((h, idx) => (
          <button
            key={h.id}
            onClick={() => setSelectedIdx(idx)}
            className={cn(
              "px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border",
              selectedIdx === idx 
                ? "bg-[var(--primary)] text-black border-[var(--primary)]" 
                : "-background border-border text-muted -background -foreground -border"
            )}
          >
            {h.sigla}
          </button>
        ))}
      </div>

      {error && (
        <div className="border border-red-500 bg-red-500/10 p-6 flex items-start md:items-center gap-6">
          <div className="w-12 h-12 bg-red-500 text-black flex items-center justify-center font-black shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">Erro de Conectividade</h3>
            <p className="text-red-400 text-xs uppercase tracking-widest">
              {error}
            </p>
          </div>
          <button 
            onClick={() => fetchData(String(selectedHospital.id), true)}
            className="px-6 py-4 bg-card border border-red-500/50 hover:border-red-500 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center"
          >
            <RefreshCcw size={14} className="mr-2" /> Tentar Novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-6 border border-border -background">
          <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
          <div className="text-center">
            <span className="text-[var(--primary)] text-sm font-black uppercase tracking-[0.2em] block mb-2">Sincronizando</span>
            <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Estabelecendo handshake com Oracle...</span>
          </div>
        </div>
      ) : data?.error ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-6 border border-red-500/50 -background p-8">
          <AlertTriangle className="w-16 h-16 text-red-500" />
          <div className="text-center">
            <h3 className="text-xl font-black text-foreground uppercase tracking-widest mb-2">Dados Indisponíveis</h3>
            <p className="text-muted text-xs font-bold uppercase tracking-widest mb-4">
              Falha ao resolver query para {selectedHospital.sigla}.
            </p>
            <div className="text-[10px] text-red-400 bg-red-500/10 px-4 py-2 border border-red-500/20 font-mono">
              SYS_ERR: {data.error}
            </div>
          </div>
          <button 
            onClick={() => fetchData(String(selectedHospital.id))}
            className="px-8 py-4 bg-card border -border hover:border-white text-foreground text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      ) : data?.kpis ? (
        <div className="space-y-8">
          
          {/* KPI Grid - Linha 1: Métricas Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <div>
                  <span className="block text-slate-700 font-bold">Total Preenchido</span>
                  <span className="text-[10px] text-slate-400 font-normal">{selectedHospital.nome}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 my-1">
                {Number(data?.kpis?.TOTAL_DOCS || 0).toLocaleString('pt-BR')}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Volume 90d
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <div>
                  <span className="block text-slate-700 font-bold">Documentos Ativos</span>
                  <span className="text-[10px] text-slate-400 font-normal">Modelos únicos em uso</span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Activity size={16} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 my-1">
                {data?.kpis?.DOCS_ATIVOS || 0}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Aderência Local
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <div>
                  <span className="block text-slate-700 font-bold">Recência de Uso</span>
                  <span className="text-[10px] text-slate-400 font-normal">Última Atividade</span>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 my-1 truncate">
                {data.kpis.ULTIMO_REGISTRO 
                  ? new Date(data.kpis.ULTIMO_REGISTRO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'N/A'}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Tempo Real
                </span>
              </div>
            </div>

          </div>

          {/* KPI Grid - Linha 2: Eficiência & Segurança (SLA) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <div>
                  <span className="block text-slate-700 font-bold">SLA de Assinatura (24h)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Fechamento do Registro (CFM)</span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-emerald-600 my-1">
                {slaPercentage}%
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Tempo Limite de Faturamento
                </span>
              </div>
            </div>
          </div>

          {/* Main Content: Table & Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Table block */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <FileText size={16} className="text-sky-600" />
                  Últimos Registros
                </h3>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                  {selectedHospital.sigla}
                </span>
              </div>
              
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5">Documento</th>
                      <th className="py-2.5 text-center">Versão</th>
                      <th className="py-2.5 text-right">Volume</th>
                      <th className="py-2.5 text-right">Último Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.details?.slice(0, 5).map((item: DetailItem) => (
                      <tr key={item.CD_DOCUMENTO} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-3">
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{item.NOME}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {item.CD_DOCUMENTO}</p>
                          </div>
                        </td>
                        <td className="py-3 text-center font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            v{item.VERSAO || '1.0'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-sky-800 tabular-nums">
                          {Number(item.USO_UNIDADE).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-500 text-[11px]">
                          {item.ULTIMO_USO ? formatDateTime(item.ULTIMO_USO) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking Section */}
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-5 flex items-center gap-2">
                  <TrendingUp size={16} className="text-sky-600" />
                  Top 5 Documentos
                </h3>
                
                <div className="space-y-4">
                  {data?.top5?.map((doc: Top5Item, i: number) => {
                    const max = data?.top5?.[0]?.USO || 1;
                    const percent = (doc.USO / max) * 100;
                    return (
                      <div key={i} className="group space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 truncate max-w-[70%]">
                            <span className="font-mono text-slate-400 font-bold mr-1.5">#{i + 1}</span>
                            {doc.NOME}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {Number(doc.USO).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              i === 0 ? "bg-sky-600" : "bg-sky-400"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-sky-900 flex items-center gap-2 mb-2 uppercase tracking-wide">
                  <Activity size={14} className="text-sky-600" />
                  Insight Operacional
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Esta unidade representa <span className="font-bold text-sky-900">{(data.globalTotal > 0 ? ((Number(data.kpis.TOTAL_DOCS) / Number(data.globalTotal)) * 100) : 0).toFixed(1)}%</span> do volume total transacionado do ambiente <span className="font-semibold text-slate-800">{activeConnName || 'selecionado'}</span> nos últimos 90 dias.
                </p>
              </div>

            </div>
          </div>

          {/* Section: SLA de Assinatura */}
          <div className="border-t border-slate-200/80 pt-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center gap-3">
              <span className="w-3.5 h-3.5 bg-sky-600 rounded-xs"></span>
              Distribuição de SLA de Assinatura
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* SLA Distribution */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-sky-600 rounded-full"></span>
                  SLA de Assinatura por Faixas
                </h3>
                <div className="space-y-4">
                  {['0-2h', '2-6h', '6-12h', '12-24h', 'Mais de 24h'].map(faixa => {
                    const match = slaRows.find((r: SlaItem) => r.FAIXA_SLA === faixa);
                    const total = match ? Number(match.TOTAL) : 0;
                    const maxSla = Math.max(...slaRows.map((r: SlaItem) => Number(r.TOTAL)), 1);
                    const pct = (total / maxSla) * 100;
                    return (
                      <div key={faixa} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-700">{faixa}</span>
                          <span className="font-mono text-slate-500 font-medium">{total} docs</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500 ease-out", 
                              faixa === 'Mais de 24h' ? 'bg-rose-500' : 'bg-sky-600'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-96 p-20 text-center border border-border -background">
          <div className="w-16 h-16 bg-card border border-border flex items-center justify-center mb-6">
            <Building2 size={32} className="-muted" />
          </div>
          <h2 className="text-xl font-black text-zinc-700 uppercase tracking-widest mb-2">Dados Indisponíveis</h2>
          <p className="-muted text-[10px] font-bold uppercase max-w-xs">
            Aguardando sincronização ou ausência de registros para este hospital no período.
          </p>
        </div>
      )}
    </div>
  );
}
