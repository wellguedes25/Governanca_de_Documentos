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
import { cn } from '@/lib/utils';
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

interface RankingItem {
  SIGLA: string;
  TOTAL_OCORRENCIAS: number;
}

interface SimilarityItem {
  DS_DOCUMENTO: string;
  QTD_SIMILAR_80: number;
  TOTAL_AUDITADO: number;
  PERCENTUAL_PLAGIO: number;
}

interface SlaItem {
  FAIXA_SLA: string;
  TOTAL: number;
}

const COLORS = [
  'bg-[var(--primary)]', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 
  'bg-purple-500', 'bg-rose-500', '-accent', 'bg-cyan-500', 
  'bg-fuchsia-500', 'bg-lime-500', 'bg-sky-500', 'bg-orange-500'
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
  similarity: SimilarityItem[];
  sla: SlaItem[];
}

interface VocabStats {
  adherence: {
    TOTAL_DOCUMENTOS: number;
    DOCUMENTOS_LIMPOS: number;
    INDICE_ADERENCIA: number;
  };
  ranking: RankingItem[];
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
  const [vocabData, setVocabData] = useState<VocabStats | null>(null);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [activeConnName, setActiveConnName] = useState('');

  // Cálculos das métricas de SLA e Redundância
  const slaRows = qualityData?.sla || [];
  const totalSigned = slaRows.reduce((acc: number, r: SlaItem) => acc + Number(r.TOTAL), 0);
  const within24h = slaRows
    .filter((r: SlaItem) => r.FAIXA_SLA !== 'Mais de 24h')
    .reduce((acc: number, r: SlaItem) => acc + Number(r.TOTAL), 0);
  const slaPercentage = totalSigned > 0 ? ((within24h / totalSigned) * 100).toFixed(1) : '100.0';

  const similarityRows = qualityData?.similarity || [];
  const totalSimilarityAudit = similarityRows.reduce((acc: number, r: SimilarityItem) => acc + Number(r.TOTAL_AUDITADO), 0);
  const totalRedundant = similarityRows.reduce((acc: number, r: SimilarityItem) => acc + Number(r.QTD_SIMILAR_80), 0);
  const redundancyRate = totalSimilarityAudit > 0 ? ((totalRedundant / totalSimilarityAudit) * 100).toFixed(1) : '0.0';

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
          setVocabData(cached.vocab);
          setError(null);
          return;
        } catch (e) {}
      }
    }

    setLoading(true);
    setError(null);
    try {
      const [resStats, resQuality, resVocab] = await Promise.all([
        fetch(`/api/hospitals/stats?id=${id}${force ? '&force=true' : ''}`),
        fetch(`/api/hospitals/quality?id=${id}${force ? '&force=true' : ''}`),
        fetch(`/api/hospitals/vocabulary?id=${id}${force ? '&force=true' : ''}`)
      ]);
      
      const jsonStats = await resStats.json();
      const jsonQuality = await resQuality.json();
      const jsonVocab = await resVocab.json();
      
      if (jsonStats.error) {
        setError(jsonStats.error);
        return;
      }
      
      setData(jsonStats);
      setQualityData(jsonQuality);
      setVocabData(jsonVocab);

      sessionStorage.setItem(cacheKey, JSON.stringify({
        stats: jsonStats,
        quality: jsonQuality,
        vocab: jsonVocab
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
            
            <div className="border border-border -background p-6 flex flex-col gap-4 group hover:border-[var(--primary)] transition-colors relative">
              <div className="absolute top-0 right-0 w-8 h-8 -background group-hover:bg-[var(--primary)] transition-colors flex items-center justify-center">
                 <FileText size={14} className="text-muted group-hover:text-black" />
              </div>
              <div className="text-[10px] text-muted font-black uppercase tracking-widest">
                Total Preenchido
                <span className="block mt-1 -muted">{selectedHospital.nome}</span>
              </div>
              <div className="text-5xl font-black text-foreground tracking-tighter mt-2">
                {Number(data?.kpis?.TOTAL_DOCS || 0).toLocaleString('pt-BR')}
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1">Volume 90d</span>
              </div>
            </div>

            <div className="border border-border -background p-6 flex flex-col gap-4 group hover:border-emerald-500 transition-colors relative">
              <div className="absolute top-0 right-0 w-8 h-8 -background group-hover:bg-emerald-500 transition-colors flex items-center justify-center">
                 <Activity size={14} className="text-muted group-hover:text-black" />
              </div>
              <div className="text-[10px] text-muted font-black uppercase tracking-widest">
                Documentos Ativos
                <span className="block mt-1 -muted">Modelos únicos em uso</span>
              </div>
              <div className="text-5xl font-black text-foreground tracking-tighter mt-2">
                {data?.kpis?.DOCS_ATIVOS || 0}
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1">Aderência Local</span>
              </div>
            </div>

            <div className="border border-border -background p-6 flex flex-col gap-4 group hover:border-amber-500 transition-colors relative">
              <div className="absolute top-0 right-0 w-8 h-8 -background group-hover:bg-amber-500 transition-colors flex items-center justify-center">
                 <Clock size={14} className="text-muted group-hover:text-black" />
              </div>
              <div className="text-[10px] text-muted font-black uppercase tracking-widest">
                Recência de Uso
                <span className="block mt-1 -muted">Última Atividade</span>
              </div>
              <div className="text-2xl font-black text-foreground tracking-tighter mt-2">
                {data.kpis.ULTIMO_REGISTRO 
                  ? new Date(data.kpis.ULTIMO_REGISTRO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'N/A'}
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1">Status em Tempo Real</span>
              </div>
            </div>

          </div>

          {/* KPI Grid - Linha 2: Qualidade Clínica & Segurança (Meta 2 JCI / CFM) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="border border-border -background p-6 flex flex-col gap-4 group hover:border-cyan-500 transition-colors relative">
              <div className="absolute top-0 right-0 w-8 h-8 -background group-hover:bg-cyan-500 transition-colors flex items-center justify-center">
                 <Building2 size={14} className="text-muted group-hover:text-black" />
              </div>
              <div className="text-[10px] text-muted font-black uppercase tracking-widest">
                Aderência ao Siglário
                <span className="block mt-1 -muted">JCI Meta 2 (Comunicação Limpa)</span>
              </div>
              <div className="text-5xl font-black text-foreground tracking-tighter mt-2">
                {vocabData?.adherence?.INDICE_ADERENCIA !== undefined ? `${Number(vocabData.adherence.INDICE_ADERENCIA).toFixed(1)}%` : '100.0%'}
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500 bg-cyan-500/10 px-2 py-1">Livre de Abrevições Proibidas</span>
              </div>
            </div>

            <div className="border border-border -background p-6 flex flex-col gap-4 group hover:border-rose-500 transition-colors relative">
              <div className="absolute top-0 right-0 w-8 h-8 -background group-hover:bg-rose-500 transition-colors flex items-center justify-center">
                 <AlertTriangle size={14} className="text-muted group-hover:text-black" />
              </div>
              <div className="text-[10px] text-muted font-black uppercase tracking-widest">
                Índice de Redundância
                <span className="block mt-1 -muted">Evolutivas Clonadas &gt; 80%</span>
              </div>
              <div className="text-5xl font-black text-foreground tracking-tighter mt-2">
                {redundancyRate}%
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1">Controle de Plágio Clínico</span>
              </div>
            </div>

            <div className="border border-border -background p-6 flex flex-col gap-4 group hover:border-indigo-500 transition-colors relative">
              <div className="absolute top-0 right-0 w-8 h-8 -background group-hover:bg-indigo-500 transition-colors flex items-center justify-center">
                 <Clock size={14} className="text-muted group-hover:text-black" />
              </div>
              <div className="text-[10px] text-muted font-black uppercase tracking-widest">
                SLA de Assinatura (24h)
                <span className="block mt-1 -muted">Fechamento do Registro (CFM)</span>
              </div>
              <div className="text-5xl font-black text-foreground tracking-tighter mt-2">
                {slaPercentage}%
              </div>
              <div className="mt-auto pt-4 border-t border-border">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-1">Tempo Limite de Faturamento</span>
              </div>
            </div>

          </div>

          {/* Main Content: Table & Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Table block */}
            <div className="lg:col-span-2 border border-border bg-background p-6 md:p-8 relative">
              <h2 className="text-xl font-black text-foreground uppercase tracking-widest mb-8 flex items-center gap-4">
                <span className="w-4 h-4 bg-white"></span>
                Últimos Registros
                <span className="-muted ml-auto text-xs">{selectedHospital.sigla}</span>
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="py-4 text-[10px] font-black uppercase text-muted tracking-widest">Documento</th>
                      <th className="py-4 text-[10px] font-black uppercase text-muted tracking-widest text-center">Versão</th>
                      <th className="py-4 text-[10px] font-black uppercase text-muted tracking-widest text-right">Volume</th>
                      <th className="py-4 text-[10px] font-black uppercase text-muted tracking-widest text-right">Último Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {data?.details?.slice(0, 5).map((item: DetailItem) => (
                      <tr key={item.CD_DOCUMENTO} className="group -background transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-card flex items-center justify-center border border-border group-hover:border-[var(--primary)] group-hover:text-[var(--primary)] transition-colors">
                              <FileText size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-foreground tracking-tight uppercase">{item.NOME}</p>
                              <p className="text-[10px] font-bold text-muted">ID: {item.CD_DOCUMENTO}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-[10px] font-black bg-card px-2 py-1 border border-border text-muted -foreground transition-colors">V{item.VERSAO || '1'}</span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-sm font-black text-[var(--primary)]">{Number(item.USO_UNIDADE).toLocaleString('pt-BR')}</span>
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-[10px] font-black uppercase text-muted -foreground transition-colors">
                            {item.ULTIMO_USO ? new Date(item.ULTIMO_USO).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking Section */}
            <div className="space-y-8">
              
              <div className="border border-border bg-background p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-[6vw] lg:text-[4vw] font-black -foreground/40 pointer-events-none leading-none select-none">
                  TOP 5
                </div>
                <h3 className="text-lg font-black text-[var(--primary)] uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
                  <TrendingUp size={20} /> Top Documentos
                </h3>
                
                <div className="space-y-6 relative z-10">
                  {data?.top5?.map((doc: Top5Item, i: number) => {
                    const max = data?.top5?.[0]?.USO || 1;
                    const percent = (doc.USO / max) * 100;
                    return (
                      <div key={i} className="group/bar flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-widest truncate max-w-[70%]">
                            <span className="-muted font-mono mr-2">#{i + 1}</span>
                            {doc.NOME}
                          </span>
                          <span className="text-xs font-black text-[var(--primary)] font-mono">
                            {Number(doc.USO).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-card border border-border">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 ease-out",
                              i === 0 ? "bg-[var(--primary)]" : "-card group-hover/bar:bg-zinc-500"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Info Card */}
              <div className="border border-border -background p-8 group hover:border-white transition-colors">
                <h4 className="text-xs font-black text-muted -foreground flex items-center gap-3 mb-4 uppercase tracking-widest transition-colors">
                  <Activity size={16} />
                  Insight Operacional
                </h4>
                <p className="text-[10px] text-muted leading-relaxed font-bold uppercase tracking-widest">
                  Esta unidade representa <span className="text-foreground">{(data.globalTotal > 0 ? ((Number(data.kpis.TOTAL_DOCS) / Number(data.globalTotal)) * 100) : 0).toFixed(1)}%</span> do volume total transacionado do ambiente <span className="text-foreground">{activeConnName || 'selecionado'}</span> nos últimos 90 dias.
                </p>
              </div>

            </div>
          </div>

          {/* Section: Auditoria Clínica e Segurança (Meta 2 JCI / CFM / ONA) */}
          <div className="border-t border-border pt-8 space-y-6">
            <h2 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-4">
              <span className="w-4 h-4 bg-[var(--primary)]"></span>
              Painel de Rastreabilidade Assistencial (JCI / CFM)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Acronyms Audit */}
              <div className="border border-border bg-background p-6 md:p-8 relative">
                <h3 className="text-sm font-black text-[var(--primary)] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-cyan-500 rounded-none"></span>
                  Abreviações Proibidas (JCI)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 text-[9px] font-black uppercase text-muted tracking-widest">Sigla</th>
                        <th className="py-2 text-[9px] font-black uppercase text-muted tracking-widest text-right">Violados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {vocabData?.ranking && vocabData.ranking.length > 0 ? (
                        vocabData.ranking.slice(0, 5).map((row: RankingItem, i: number) => (
                          <tr key={i} className="text-xs group hover:bg-zinc-900 transition-colors">
                            <td className="py-3 font-mono font-bold text-cyan-400 uppercase">{row.SIGLA}</td>
                            <td className="py-3 text-right font-mono font-bold text-foreground">{row.TOTAL_OCORRENCIAS} docs</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-6 text-center text-xs text-muted uppercase tracking-wider font-bold">100% de Aderência Assistencial</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Redundancy Audit */}
              <div className="border border-border bg-background p-6 md:p-8 relative">
                <h3 className="text-sm font-black text-[var(--primary)] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-none"></span>
                  Documentos Redundantes
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 text-[9px] font-black uppercase text-muted tracking-widest">Documento</th>
                        <th className="py-2 text-[9px] font-black uppercase text-muted tracking-widest text-right">Clonados (&gt;80%)</th>
                        <th className="py-2 text-[9px] font-black uppercase text-muted tracking-widest text-right">Taxa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {similarityRows && similarityRows.length > 0 ? (
                        similarityRows.slice(0, 5).map((row: SimilarityItem, i: number) => (
                          <tr key={i} className="text-xs group hover:bg-zinc-900 transition-colors">
                            <td className="py-3 truncate max-w-[120px] uppercase font-bold text-foreground">{row.DS_DOCUMENTO}</td>
                            <td className="py-3 text-right font-mono text-muted">{row.QTD_SIMILAR_80} / {row.TOTAL_AUDITADO}</td>
                            <td className="py-3 text-right font-mono font-bold text-rose-500">{row.PERCENTUAL_PLAGIO}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-xs text-muted uppercase tracking-wider font-bold">Nenhuma cópia detectada</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SLA Distribution */}
              <div className="border border-border bg-background p-6 md:p-8 relative">
                <h3 className="text-sm font-black text-[var(--primary)] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-none"></span>
                  SLA de Assinatura
                </h3>
                <div className="space-y-4">
                  {['0-2h', '2-6h', '6-12h', '12-24h', 'Mais de 24h'].map(faixa => {
                    const match = slaRows.find((r: SlaItem) => r.FAIXA_SLA === faixa);
                    const total = match ? Number(match.TOTAL) : 0;
                    const maxSla = Math.max(...slaRows.map((r: SlaItem) => Number(r.TOTAL)), 1);
                    const pct = (total / maxSla) * 100;
                    return (
                      <div key={faixa} className="flex flex-col gap-1 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold tracking-wider uppercase">{faixa}</span>
                          <span className="font-mono text-muted">{total} docs</span>
                        </div>
                        <div className="h-2 w-full bg-card border border-border">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500 ease-out", 
                              faixa === 'Mais de 24h' ? 'bg-destructive' : 'bg-indigo-500'
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
