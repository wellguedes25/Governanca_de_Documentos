'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  FileText, 
  Activity, 
  Clock, 
  RotateCw, 
  ArrowLeft,
  TrendingUp,
  Database,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDateTime } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DbConnection, HospitalMapping } from '@/lib/storage';
import { DocumentDetailsDrawer } from '@/components/documentos/DocumentDetailsDrawer';

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

interface HospitalStats {
  kpis: {
    TOTAL_DOCS?: number;
    DOCS_ATIVOS?: number;
    ULTIMO_REGISTRO?: string;
  };
  details: DetailItem[];
  top5: Top5Item[];
  globalTotal: number;
  versionApplied?: string;
  error?: string;
}

interface QualityStats {
  sla: SlaItem[];
  versionApplied?: string;
}

interface HospitalItem extends HospitalMapping {
  color?: string;
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
  const [activeConnId, setActiveConnId] = useState('');

  // Drawer de Metadados Integrado
  const [sidebarDoc, setSidebarDoc] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataActions, setMetadataActions] = useState<any[]>([]);
  const [metadataActionsLoading, setMetadataActionsLoading] = useState(false);
  const [metadataActionsError, setMetadataActionsError] = useState<string | null>(null);
  const [metadataRules, setMetadataRules] = useState<any[]>([]);
  const [metadataRulesLoading, setMetadataRulesLoading] = useState(false);
  const [metadataRulesError, setMetadataRulesError] = useState<string | null>(null);
  const [metadataFields, setMetadataFields] = useState<any[]>([]);
  const [metadataFieldsLoading, setMetadataFieldsLoading] = useState(false);
  const [metadataFieldsError, setMetadataFieldsError] = useState<string | null>(null);

  // Versão ativa resolvida com fallback
  const resolvedVersion = useMemo(() => {
    if (docVersion) return docVersion;
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('app_doc_version');
      if (saved === 'V3' || saved === 'V2') return saved;
    }
    return 'V2';
  }, [docVersion]);

  // Cálculos da métrica de SLA
  const slaRows = qualityData?.sla || [];
  const totalSigned = useMemo(() => {
    return slaRows.reduce((acc: number, r: SlaItem) => acc + Number(r.TOTAL), 0);
  }, [slaRows]);

  const within24h = useMemo(() => {
    return slaRows
      .filter((r: SlaItem) => r.FAIXA_SLA !== 'Mais de 24h')
      .reduce((acc: number, r: SlaItem) => acc + Number(r.TOTAL), 0);
  }, [slaRows]);

  const over24h = useMemo(() => {
    const item = slaRows.find((r: SlaItem) => r.FAIXA_SLA === 'Mais de 24h');
    return item ? Number(item.TOTAL) : 0;
  }, [slaRows]);

  const slaPercentage = totalSigned > 0 ? ((within24h / totalSigned) * 100).toFixed(1) : '100.0';

  const selectedHospital = hospitals[selectedIdx];

  // Busca de Metadados para o Drawer
  const fetchDocDetails = async (docId: string) => {
    setSidebarDoc(docId);
    setSidebarOpen(true);
    setMetadataLoading(true);
    setMetadataActionsLoading(true);
    setMetadataRulesLoading(true);
    setMetadataFieldsLoading(true);

    try {
      const [resMeta, resActions, resRules, resFields] = await Promise.all([
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'METADATA', version: resolvedVersion, params: { CD_DOCUMENTO: docId } })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'ACTIONS', version: resolvedVersion, params: { CD_DOCUMENTO: docId } })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'RULES', version: resolvedVersion, params: { CD_DOCUMENTO: docId } })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'FIELDS', params: { CD_DOCUMENTO: docId } })
        }).then(r => r.json())
      ]);

      setMetadata(resMeta.rows || []);
      setMetadataActions(resActions.rows || []);
      setMetadataRules(resRules.rows || []);
      setMetadataFields(resFields.rows || []);
    } catch (e) {
      console.error('Erro ao buscar detalhes do documento:', e);
    } finally {
      setMetadataLoading(false);
      setMetadataActionsLoading(false);
      setMetadataRulesLoading(false);
      setMetadataFieldsLoading(false);
    }
  };

  // Busca de Dados do Hospital (Respeitando a Versão V2 vs V3 e Conexão)
  const fetchData = useCallback(async (id: string, force = false) => {
    const cacheKey = `hospital_data_${id}_${resolvedVersion}_${activeConnId || 'default'}`;
    
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
        fetch(`/api/hospitals/stats?id=${id}&version=${resolvedVersion}${force ? '&force=true' : ''}`),
        fetch(`/api/hospitals/quality?id=${id}&version=${resolvedVersion}${force ? '&force=true' : ''}`)
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
    } catch (err: any) {
      console.error('Erro ao buscar dados do hospital:', err);
      setError('Falha na comunicação com o servidor Oracle.');
    } finally {
      setLoading(false);
    }
  }, [resolvedVersion, activeConnId]);

  // Carrega conexões e lista de hospitais ativos
  useEffect(() => {
    fetch('/api/connections')
      .then(res => res.json())
      .then(storage => {
        if (storage.activeConnectionId && storage.connections) {
          const activeConn = storage.connections.find((c: DbConnection) => c.id === storage.activeConnectionId);
          if (activeConn) {
            setActiveConnName(activeConn.name);
            setActiveConnId(activeConn.id);
          }
        }
        if (storage.hospitalsMapping) {
          const active = storage.hospitalsMapping
            .filter((h: HospitalMapping) => h.ativo)
            .map((h: HospitalMapping) => ({
              ...h,
              nome: h.nome || h.sigla,
            }));
          setHospitals(active);

          // Suporte a seleção via query param ?id=X
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('id');
            if (targetId) {
              const idx = active.findIndex((h: HospitalItem) => String(h.id) === String(targetId));
              if (idx !== -1) {
                setSelectedIdx(idx);
              }
            }
          }
        }
      })
      .catch(err => {
        console.error('Erro ao carregar conexões:', err);
        setError('Não foi possível obter a lista de hospitais configurados.');
      });
  }, []);

  // Dispara busca quando hospital selecionado ou versão mudar
  useEffect(() => {
    if (selectedHospital) {
      fetchData(String(selectedHospital.id));
    }
  }, [selectedHospital, resolvedVersion, fetchData]);

  if (hospitals.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-9 h-9 animate-spin text-sky-600" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Carregando unidades hospitalares...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8 space-y-6 pb-24">
      
      {/* 1. Header Padronizado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <PageHeader 
            title="Unidades Hospitalares"
            subtitle={selectedHospital ? `${selectedHospital.nome} — Monitoramento de Uso Clínico` : "Gestão Operacional de Prontuários"}
            icon={Building2}
          />
          <Badge 
            variant="outline" 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border-sky-300 bg-sky-50 text-sky-800"
          >
            Motor {resolvedVersion}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {selectedHospital && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(String(selectedHospital.id), true)}
              disabled={loading}
              className="gap-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs cursor-pointer h-9 px-4"
            >
              <RotateCw className={cn("w-3.5 h-3.5 text-sky-600", loading && "animate-spin")} />
              <span>Sincronizar Agora</span>
            </Button>
          )}

          <Link href="/documentos">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs h-9 px-4 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Todos os Documentos</span>
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs h-9 px-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard Geral</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Seletor de Hospitais em Pílulas Modernas */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 flex items-center gap-1.5">
            <Building2 size={13} className="text-slate-400" />
            Unidade:
          </span>
          {hospitals.map((h, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
                  isSelected 
                    ? "bg-[#004953] text-white shadow-2xs" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                )}
              >
                <span>{h.sigla}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  #{h.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Mensagem de Erro de Conectividade */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-rose-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">Falha ao obter métricas da unidade hospitalar</p>
              <p className="text-[11px] text-rose-600 font-mono mt-0.5">{error}</p>
            </div>
          </div>
          {selectedHospital && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => fetchData(String(selectedHospital.id), true)}
              className="text-xs border-rose-300 text-rose-700 bg-white hover:bg-rose-100/60 rounded-full cursor-pointer shrink-0"
            >
              Tentar Novamente
            </Button>
          )}
        </div>
      )}

      {/* 4. Estado de Carregamento Suave */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-3 animate-pulse">
                <div className="skeleton h-4 w-28 rounded-md" />
                <div className="skeleton h-8 w-24 rounded-md" />
                <div className="skeleton h-3 w-36 rounded-md" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs h-72 animate-pulse" />
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs h-72 animate-pulse" />
          </div>
        </div>
      ) : data?.kpis ? (
        <div className="space-y-6">
          
          {/* 5. Linha Harmônica de 4 KPIs Principais (Sem Buracos Vazios) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Preenchido */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-sky-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Preenchido</span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-sky-50 text-sky-700 border-sky-200 rounded-full px-2 py-0.5">
                  Volume 90d
                </Badge>
              </div>
              <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                {Number(data?.kpis?.TOTAL_DOCS || 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Prontuários eletrônicos preenchidos na unidade
              </p>
            </div>

            {/* Card 2: Documentos Únicos em Uso */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modelos Ativos</span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Aderência Local
                </Badge>
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-800 tracking-tight">
                {Number(data?.kpis?.DOCS_ATIVOS || 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Modelos clínicos com registros homologados
              </p>
            </div>

            {/* Card 3: SLA de Assinatura (24h) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-teal-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA Assinatura (24h)</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-semibold rounded-full px-2 py-0.5",
                    Number(slaPercentage) >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  )}
                >
                  Regra CFM
                </Badge>
              </div>
              <div className={cn(
                "text-3xl font-bold font-mono tracking-tight",
                Number(slaPercentage) >= 90 ? "text-emerald-700" : "text-amber-700"
              )}>
                {slaPercentage}%
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Fechamento tempestivo de prontuários
              </p>
            </div>

            {/* Card 4: Recência de Uso */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-sky-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Atividade</span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200 rounded-full px-2 py-0.5">
                  Tempo Real
                </Badge>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 tracking-tight truncate py-1">
                {data.kpis.ULTIMO_REGISTRO 
                  ? new Date(data.kpis.ULTIMO_REGISTRO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Último atendimento registrado na base
              </p>
            </div>
          </div>

          {/* 6. Conteúdo Central: Tabela Interativa de Registros + Top 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tabela de Documentos Recentes da Unidade */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-sky-600" />
                      Documentos Mais Movimentados na Unidade
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Prontuários com maior volume recente em <b>{selectedHospital?.nome}</b>
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                    {selectedHospital?.sigla}
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5">Documento Clínico</th>
                        <th className="py-2.5 text-center">Versão</th>
                        <th className="py-2.5 text-right">Volume</th>
                        <th className="py-2.5 text-right">Último Uso</th>
                        <th className="py-2.5 text-center w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.details?.slice(0, 8).map((item: DetailItem) => (
                        <tr key={item.CD_DOCUMENTO} className="group hover:bg-sky-50/40 transition-colors">
                          <td className="py-3">
                            <div className="cursor-pointer" onClick={() => fetchDocDetails(item.CD_DOCUMENTO)}>
                              <p className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">{item.NOME}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">CÓDIGO: #{item.CD_DOCUMENTO}</p>
                            </div>
                          </td>
                          <td className="py-3 text-center font-mono">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              v{item.VERSAO || '1.0'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-sky-800 tabular-nums">
                            {Number(item.USO_UNIDADE).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-500 text-[11px]">
                            {item.ULTIMO_USO ? formatDateTime(item.ULTIMO_USO) : '-'}
                          </td>
                          <td className="py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchDocDetails(item.CD_DOCUMENTO)}
                              className="h-7 px-2 text-[10px] rounded-lg text-sky-700 hover:bg-sky-100/70 cursor-pointer"
                              title="Visualizar Metadados & Regras"
                            >
                              <Layers size={13} className="mr-1" />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Exibindo os modelos com maior volume na unidade</span>
                <Link 
                  href={`/documentos?search=${selectedHospital?.sigla}`}
                  className="font-semibold text-sky-700 hover:underline flex items-center gap-1"
                >
                  Abrir na Matriz Geral de Documentos <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* Coluna Direita: Top 5 + Card de Insight */}
            <div className="space-y-6">
              
              {/* Ranking Top 5 */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp size={16} className="text-sky-600" />
                    Top 5 Documentos Mais Usados
                  </h3>
                </div>
                
                <div className="space-y-3.5">
                  {data?.top5?.map((doc: Top5Item, i: number) => {
                    const max = data?.top5?.[0]?.USO || 1;
                    const percent = Math.round((doc.USO / max) * 100);
                    return (
                      <div key={i} className="group space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-800 truncate max-w-[70%]" title={doc.NOME}>
                            <span className="font-mono text-sky-600 font-bold mr-1.5">#{i + 1}</span>
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

              {/* Insight Operacional da Unidade na Rede */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-3xl p-5 shadow-2xs">
                <h4 className="text-xs font-bold text-sky-950 flex items-center gap-2 mb-2 uppercase tracking-wide">
                  <Activity size={14} className="text-sky-600" />
                  Representatividade na Rede
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A unidade <b>{selectedHospital?.sigla}</b> é responsável por <span className="font-bold text-sky-900">{(data.globalTotal > 0 ? ((Number(data.kpis.TOTAL_DOCS) / Number(data.globalTotal)) * 100) : 0).toFixed(1)}%</span> de todo o volume de prontuários eletrônicos preenchidos na base <span className="font-semibold text-slate-800">{activeConnName || 'ativa'}</span> (filtro motor {resolvedVersion}).
                </p>
              </div>

            </div>
          </div>

          {/* 7. Seção de Qualidade e SLA de Assinatura (Completa, Sem Coluna Vazia) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={16} className="text-emerald-600" />
                  Governança Clínica: SLA de Fechamento e Assinatura Digital
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conformidade com resolução CFM nº 1.821 e diretrizes de integridade documental
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border-emerald-200 px-2.5 py-0.5 rounded-full">
                {slaPercentage}% em dia
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Coluna 1: Distribuição de SLA por Faixas */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Distribuição por Faixa de Tempo
                </span>
                <div className="space-y-3.5">
                  {['0-2h', '2-6h', '6-12h', '12-24h', 'Mais de 24h'].map(faixa => {
                    const match = slaRows.find((r: SlaItem) => r.FAIXA_SLA === faixa);
                    const total = match ? Number(match.TOTAL) : 0;
                    const maxSla = Math.max(...slaRows.map((r: SlaItem) => Number(r.TOTAL)), 1);
                    const pct = Math.round((total / maxSla) * 100);
                    const isLate = faixa === 'Mais de 24h';

                    return (
                      <div key={faixa} className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className={cn("font-semibold", isLate ? "text-rose-700 font-bold" : "text-slate-700")}>
                            {faixa}
                          </span>
                          <span className="font-mono text-slate-500 font-medium">
                            {total.toLocaleString('pt-BR')} prontuários
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500 ease-out", 
                              isLate ? 'bg-rose-500' : 'bg-emerald-600'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna 2: Card de Avaliação Regulatória e Faturamento (Elimina o Espaço Vazio!) */}
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/70 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2 uppercase tracking-wide">
                    <ShieldCheck size={16} className="text-emerald-700" />
                    Diagnóstico Regulatório & Faturamento
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Prontuários médicos que excedem 24 horas para fechamento ou assinatura digital geram passivos em auditorias hospitalares (ONA/JCI) e bloqueios no faturamento de contas de convênios.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dentro do Prazo (&le; 24h)</span>
                      <span className="text-xl font-bold font-mono text-emerald-700">{within24h.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-emerald-600 block font-medium">Conforme regulamentação</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acima de 24h (Risco)</span>
                      <span className="text-xl font-bold font-mono text-rose-700">{over24h.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-rose-600 block font-medium">Requer intervenção</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Índice de conformidade geral da unidade: <b>{slaPercentage}%</b>.
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-2xs space-y-3">
          <Building2 size={42} className="mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-800">Nenhum dado encontrado para esta unidade</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não há registros de prontuários clínicos para o hospital selecionado nos últimos 90 dias na conexão ativa.
          </p>
        </div>
      )}

      {/* Drawer de Detalhes de Metadados Integrado */}
      <DocumentDetailsDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        docId={sidebarDoc}
        metadata={metadata}
        loading={metadataLoading}
        actions={metadataActions}
        actionsLoading={metadataActionsLoading}
        actionsError={metadataActionsError}
        rules={metadataRules}
        rulesLoading={metadataRulesLoading}
        rulesError={metadataRulesError}
        fields={metadataFields}
        fieldsLoading={metadataFieldsLoading}
        fieldsError={metadataFieldsError}
      />

    </div>
  );
}
