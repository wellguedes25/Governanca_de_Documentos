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
  AlertTriangle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDateTime } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DbConnection, HospitalMapping } from '@/lib/storage';
import { DocumentDetailsModal } from '@/components/documentos/DocumentDetailsModal';

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
  const { docVersion, getCached, setCached, activeConnInfo, setActiveConnInfo } = useUI();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HospitalStats | null>(null);
  const [qualityData, setQualityData] = useState<QualityStats | null>(null);
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [activeConnName, setActiveConnName] = useState('');
  const [activeConnId, setActiveConnId] = useState('');

  // Modal Unificado de Metadados e Perfis Integrado
  const [sidebarDoc, setSidebarDoc] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [metadataActions, setMetadataActions] = useState<any[]>([]);
  const [metadataActionsLoading, setMetadataActionsLoading] = useState(false);
  const [metadataActionsError, setMetadataActionsError] = useState<string | null>(null);
  const [metadataRules, setMetadataRules] = useState<any[]>([]);
  const [metadataRulesLoading, setMetadataRulesLoading] = useState(false);
  const [metadataRulesError, setMetadataRulesError] = useState<string | null>(null);
  const [metadataFields, setMetadataFields] = useState<any[]>([]);
  const [metadataFieldsLoading, setMetadataFieldsLoading] = useState(false);
  const [metadataFieldsError, setMetadataFieldsError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Versão ativa resolvida com fallback
  const resolvedVersion = docVersion || 'V3';

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

  // Busca de Metadados e Perfis para o Modal com Cache Integrado
  const fetchDocDetails = async (docId: string, force = false) => {
    setSidebarDoc(docId);
    setSidebarOpen(true);

    const metaKey = `meta_v2_${docId}_${resolvedVersion}`;
    const actionsKey = `actions_${docId}_${resolvedVersion}`;
    const rulesKey = `rules_v2_${docId}_${resolvedVersion}`;
    const fieldsKey = `fields_v2_${docId}_${resolvedVersion}`;
    const profileKey = `profile_${docId}_${resolvedVersion}`;

    if (!force) {
      const cachedMeta = getCached<any[]>(metaKey);
      const cachedActions = getCached<any[]>(actionsKey);
      const cachedRules = getCached<any[]>(rulesKey);
      const cachedFields = getCached<any[]>(fieldsKey);
      const cachedProfiles = getCached<any[]>(profileKey);
      const isValidMetaCache =
        Array.isArray(cachedMeta) &&
        (cachedMeta.length === 0 ||
          ('SN_PUBLICADO' in cachedMeta[0] &&
            'TP_VERSAO' in cachedMeta[0] &&
            'VALOR_VERSAO' in cachedMeta[0] &&
            'QUANTIDADE_CAMPOS' in cachedMeta[0]));

      if (isValidMetaCache && cachedActions && cachedRules && cachedFields && cachedProfiles) {
        setMetadata(cachedMeta);
        setMetadataActions(cachedActions);
        setMetadataRules(cachedRules);
        setMetadataFields(cachedFields);
        setProfileData(cachedProfiles);
        setMetadataError(null);
        setMetadataActionsError(null);
        setMetadataRulesError(null);
        setMetadataFieldsError(null);
        setProfileError(null);
        setMetadataLoading(false);
        setMetadataActionsLoading(false);
        setMetadataRulesLoading(false);
        setMetadataFieldsLoading(false);
        setProfileLoading(false);
        return;
      }
    }

    setMetadataLoading(true);
    setMetadataActionsLoading(true);
    setMetadataRulesLoading(true);
    setMetadataFieldsLoading(true);
    setProfileLoading(true);
    setMetadataError(null);
    setMetadataActionsError(null);
    setMetadataRulesError(null);
    setMetadataFieldsError(null);
    setProfileError(null);

    const cleanId = String(docId).trim();

    try {
      const [resMeta, resActions, resRules, resFields, resProfiles] = await Promise.all([
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'METADATA', version: resolvedVersion, params: { CD_DOCUMENTO: cleanId }, forceRefresh: force })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'ACTIONS', version: resolvedVersion, params: { CD_DOCUMENTO: cleanId }, forceRefresh: force })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'RULES', version: resolvedVersion, params: { CD_DOCUMENTO: cleanId }, forceRefresh: force })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'FIELDS', version: resolvedVersion, params: { CD_DOCUMENTO: cleanId }, forceRefresh: force })
        }).then(r => r.json()),
        fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'PROFILE', version: resolvedVersion, params: { CD_DOCUMENTO: cleanId }, forceRefresh: force })
        }).then(r => r.json())
      ]);

      if (resMeta.error) setMetadataError(resMeta.error);
      else {
        const mRows = resMeta.rows || [];
        setMetadata(mRows);
        setCached(metaKey, mRows);
      }

      if (resActions.error) setMetadataActionsError(resActions.error);
      else {
        const aRows = resActions.rows || [];
        setMetadataActions(aRows);
        setCached(actionsKey, aRows);
      }

      if (resRules.error) setMetadataRulesError(resRules.error);
      else {
        const rRows = resRules.rows || [];
        setMetadataRules(rRows);
        setCached(rulesKey, rRows);
      }

      if (resFields.error) setMetadataFieldsError(resFields.error);
      else {
        const fRows = resFields.rows || [];
        setMetadataFields(fRows);
        setCached(fieldsKey, fRows);
      }

      if (resProfiles.error) setProfileError(resProfiles.error);
      else {
        const pRows = resProfiles.rows || [];
        setProfileData(pRows);
        setCached(profileKey, pRows);
      }
    } catch (err: any) {
      console.error('Erro ao buscar metadados do documento:', err);
      setMetadataError('Falha de comunicação com o servidor Oracle.');
    } finally {
      setMetadataLoading(false);
      setMetadataActionsLoading(false);
      setMetadataRulesLoading(false);
      setMetadataFieldsLoading(false);
      setProfileLoading(false);
    }
  };

  // Busca dados de estatísticas e SLA do hospital com cache multinível
  const fetchData = useCallback(async (hId: string, force = false) => {
    const cacheKey = `hospital_data_${hId}_${resolvedVersion}_${activeConnId || 'default'}`;

    if (!force) {
      const cached = getCached<any>(cacheKey);
      if (cached) {
        setData(cached.stats);
        setQualityData(cached.quality);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const forceParam = force ? '&force=true' : '';
      const [resStats, resQuality] = await Promise.all([
        fetch(`/api/hospitals/stats?id=${hId}&version=${resolvedVersion}${forceParam}`),
        fetch(`/api/hospitals/quality?id=${hId}&version=${resolvedVersion}${forceParam}`)
      ]);

      const jsonStats = await resStats.json();
      const jsonQuality = await resQuality.json();

      if (jsonStats.error) {
        setError(jsonStats.error);
        setData(null);
        return;
      }
      
      setData(jsonStats);
      setQualityData(jsonQuality);

      setCached(cacheKey, {
        stats: jsonStats,
        quality: jsonQuality
      });
    } catch (err: any) {
      console.error('Erro ao buscar dados do hospital:', err);
      setError('Falha na comunicação com o servidor Oracle.');
    } finally {
      setLoading(false);
    }
  }, [resolvedVersion, activeConnId, getCached, setCached]);

  // Carrega conexões e lista de hospitais ativos reaproveitando contexto global
  useEffect(() => {
    if (activeConnInfo) {
      setActiveConnName(activeConnInfo.name);
      setActiveConnId(activeConnInfo.id);
      setHospitals(activeConnInfo.activeHospitals);
      return;
    }

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

          if (storage.activeConnectionId) {
            setActiveConnInfo({
              id: storage.activeConnectionId,
              name: storage.connections?.find((c: any) => c.id === storage.activeConnectionId)?.name || 'Oracle',
              activeHospitals: active
            });
          }

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
  }, [activeConnInfo, setActiveConnInfo]);

  // Dispara busca quando hospital selecionado ou versão mudar
  useEffect(() => {
    if (selectedHospital) {
      fetchData(String(selectedHospital.id));
    }
  }, [selectedHospital, resolvedVersion, fetchData]);

  if (hospitals.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-9 h-9 animate-spin text-[#CCF352]" />
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Carregando unidades hospitalares...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[var(--border-subtle)]">
        <PageHeader 
          kicker="REDE ASSISTENCIAL • MONITORAMENTO OPERACIONAL"
          title="Unidades Hospitalares"
          subtitle={selectedHospital ? `${selectedHospital.nome} — Monitoramento de Uso Clínico em Tempo Real` : "Gestão Operacional de Prontuários"}
          icon={Building2}
          badge={
            <Badge 
              variant="outline" 
              suppressHydrationWarning
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)]"
            >
              Motor {resolvedVersion}
            </Badge>
          }
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {selectedHospital && (
                <Button
                  size="sm"
                  onClick={() => fetchData(String(selectedHospital.id), true)}
                  disabled={loading}
                  className="gap-2 text-xs font-bold rounded-full bg-[#CCF352] hover:bg-[#b8dd3e] text-[#141312] shadow-2xs cursor-pointer h-9 px-4 transition-all"
                >
                  <RotateCw className={cn("w-3.5 h-3.5 text-[#141312]", loading && "animate-spin")} />
                  <span>Sincronizar Agora</span>
                </Button>
              )}

              <Link href="/documentos">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-semibold rounded-full bg-[var(--dock-bg)] hover:bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xs h-9 px-4 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Ver Todos os Documentos</span>
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-semibold rounded-full bg-[var(--dock-bg)] hover:bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xs h-9 px-4 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Dashboard Geral</span>
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* 2. Seletor de Hospitais em Dock Sylva */}
      <div className="sylva-dock bg-[var(--dock-bg)]/80 p-2 rounded-2xl border border-[var(--border-subtle)] overflow-x-auto scrollbar-thin backdrop-blur-md">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-3 flex items-center gap-1.5">
            <Building2 size={13} className="text-[var(--accent-ink)]" />
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
                    ? "bg-[#CCF352] text-[#141312] shadow-2xs font-bold scale-102"
                    : "bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-[var(--border-subtle)]"
                )}
              >
                <span>{h.sigla}</span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                  isSelected
                    ? "bg-black/15 text-[#141312]"
                    : "bg-[var(--dock-bg)] text-[var(--text-muted)]"
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
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-rose-400 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="text-xs font-bold">Falha ao obter métricas da unidade hospitalar</p>
              <p className="text-[11px] text-rose-400 font-mono mt-0.5">{error}</p>
            </div>
          </div>
          {selectedHospital && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => fetchData(String(selectedHospital.id), true)}
              className="text-xs border-rose-500/30 text-rose-400 bg-transparent hover:bg-rose-500/20 rounded-full cursor-pointer shrink-0"
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
              <div key={i} className="sylva-glass bg-[var(--card-bg)] rounded-2xl p-5 border border-[var(--border-subtle)] shadow-2xs space-y-3 animate-pulse">
                <div className="h-4 w-28 bg-black/10 dark:bg-white/10 rounded-md" />
                <div className="h-8 w-24 bg-black/10 dark:bg-white/10 rounded-md" />
                <div className="h-3 w-36 bg-black/10 dark:bg-white/10 rounded-md" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 sylva-glass bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-2xs h-72 animate-pulse" />
            <div className="sylva-glass bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-2xs h-72 animate-pulse" />
          </div>
        </div>
      ) : data?.kpis ? (
        <div className="space-y-6">
          
          {/* 5. Linha Harmônica de 4 KPIs Principais (Bento Tinted Palette Sylva) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Preenchido (Olive Tint com Neon Lime) */}
            <div className="sylva-card-olive text-[var(--tint-olive-fg)] p-5 rounded-2xl flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Preenchido</span>
                <Badge variant="outline" className="text-[10px] font-bold bg-[var(--tint-olive-btn)] text-[var(--tint-olive-fg)] border-[var(--tint-olive-border)] rounded-full px-2 py-0.5">
                  Volume 90d
                </Badge>
              </div>
              <div className="text-3xl font-extrabold font-mono text-[var(--tint-olive-fg)] tracking-tight my-1">
                {Number(data?.kpis?.TOTAL_DOCS || 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-[var(--tint-olive-muted)] mt-1 truncate">
                Prontuários eletrônicos na unidade
              </p>
              <div className="w-full h-1.5 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-[#CCF352] rounded-full w-4/5 shadow-[0_0_8px_rgba(204,243,82,0.5)]" />
              </div>
            </div>

            {/* Card 2: Documentos Únicos em Uso (Mocha Tint) */}
            <div className="sylva-card-mocha text-[var(--tint-mocha-fg)] p-5 rounded-2xl flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Modelos Ativos</span>
                <Badge variant="outline" className="text-[10px] font-bold tone-warning rounded-full px-2 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Aderência Local
                </Badge>
              </div>
              <div className="text-3xl font-extrabold font-mono text-[var(--tint-mocha-fg)] tracking-tight my-1">
                {Number(data?.kpis?.DOCS_ATIVOS || 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-[11px] text-[var(--tint-mocha-muted)] mt-1 truncate">
                Modelos com registros homologados
              </p>
              <div className="w-full h-1.5 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-amber-500 rounded-full w-2/3 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              </div>
            </div>

            {/* Card 3: SLA de Assinatura (Slate Tint) */}
            <div className="sylva-card-slate text-[var(--tint-slate-fg)] p-5 rounded-2xl flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">SLA Assinatura (24h)</span>
                <Badge variant="outline" className="text-[10px] font-bold tone-info rounded-full px-2 py-0.5">
                  Regra CFM
                </Badge>
              </div>
              <div className="text-3xl font-extrabold font-mono text-[var(--tint-slate-fg)] tracking-tight my-1">
                {slaPercentage}%
              </div>
              <p className="text-[11px] text-[var(--tint-slate-muted)] mt-1 truncate">
                Fechamento tempestivo de prontuários
              </p>
              <div className="w-full h-1.5 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-sky-400 rounded-full w-11/12 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
              </div>
            </div>

            {/* Card 4: Última Atividade Registrada (Sylva Frosted Glass) */}
            <div className="sylva-glass border border-[var(--border-subtle)] text-[var(--text-primary)] p-5 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Última Atividade</span>
                <Badge variant="outline" className="text-[10px] font-bold bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)] rounded-full px-2 py-0.5">
                  Tempo Real
                </Badge>
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tracking-tight my-1 truncate">
                {data?.kpis?.ULTIMO_REGISTRO ? formatDateTime(data.kpis.ULTIMO_REGISTRO).slice(0, 16) : 'Hoje'}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                Último atendimento registrado na base
              </p>
              <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-[#CCF352] to-amber-500 rounded-full w-full" />
              </div>
            </div>

          </div>

          {/* 6. Conteúdo Central: Tabela Interativa de Registros + Top 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tabela de Documentos Recentes da Unidade */}
            <div className="lg:col-span-2 sylva-glass bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <FileText size={16} className="text-[var(--accent-ink)]" />
                      Documentos Mais Movimentados na Unidade
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Prontuários com maior volume recente em <b>{selectedHospital?.nome}</b>
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
                    {selectedHospital?.sigla}
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5">Documento Clínico</th>
                        <th className="py-2.5 text-center">Versão</th>
                        <th className="py-2.5 text-right">Volume</th>
                        <th className="py-2.5 text-right">Último Uso</th>
                        <th className="py-2.5 text-center w-20">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {data?.details?.slice(0, 8).map((item: DetailItem, idx: number) => (
                        <tr key={`${item.CD_DOCUMENTO}-${item.VERSAO || ''}-${idx}`} className="group hover:bg-[var(--hover-bg)] transition-colors">
                          <td className="py-3">
                            <div className="cursor-pointer" onClick={() => fetchDocDetails(item.CD_DOCUMENTO)}>
                              <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-ink)] transition-colors">{item.NOME}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">CÓDIGO: #{item.CD_DOCUMENTO}</p>
                            </div>
                          </td>
                          <td className="py-3 text-center font-mono">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--card-subtle)] text-[var(--text-secondary)] text-[10px] font-bold border border-[var(--border-subtle)]">
                              v{item.VERSAO || '1.0'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-[var(--accent-ink)] tabular-nums">
                            {Number(item.USO_UNIDADE).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 text-right font-mono text-[var(--text-muted)] text-[11px]">
                            {item.ULTIMO_USO ? formatDateTime(item.ULTIMO_USO) : '-'}
                          </td>
                          <td className="py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchDocDetails(item.CD_DOCUMENTO)}
                              className="h-7 px-2 text-[10px] rounded-lg text-[var(--accent-ink)] hover:bg-[var(--accent)] cursor-pointer font-bold"
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

              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Exibindo os modelos com maior volume na unidade</span>
                <Link 
                  href={`/documentos?search=${selectedHospital?.sigla}`}
                  className="font-bold text-[var(--accent-ink)] hover:underline flex items-center gap-1"
                >
                  Abrir na Matriz Geral de Documentos <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            {/* Coluna Direita: Top 5 + Card de Insight */}
            <div className="space-y-6">
              
              {/* Ranking Top 5 */}
              <div className="sylva-glass border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <TrendingUp size={16} className="text-[var(--accent-ink)]" />
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
                          <span className="font-semibold text-[var(--text-primary)] truncate max-w-[70%]" title={doc.NOME}>
                            <span className="font-mono text-[var(--accent-ink)] font-bold mr-1.5">#{i + 1}</span>
                            {doc.NOME}
                          </span>
                          <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
                            {Number(doc.USO).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              i === 0 ? "bg-[#CCF352] shadow-[0_0_8px_rgba(204,243,82,0.5)]" : "bg-sky-400"
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
              <div className="sylva-card border border-[var(--border-subtle)] rounded-2xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-[var(--accent-ink)] flex items-center gap-2 mb-2 uppercase tracking-wide">
                  <Activity size={14} className="text-[var(--accent-ink)]" />
                  Representatividade na Rede
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  A unidade <b>{selectedHospital?.sigla}</b> é responsável por <span className="font-bold text-[var(--accent-ink)]">{(data.globalTotal > 0 ? ((Number(data.kpis.TOTAL_DOCS) / Number(data.globalTotal)) * 100) : 0).toFixed(1)}%</span> de todo o volume de prontuários eletrônicos preenchidos na base <span className="font-semibold text-[var(--text-primary)]">{activeConnName || 'ativa'}</span> (filtro motor {resolvedVersion}).
                </p>
              </div>

            </div>
          </div>

          {/* 7. Seção de Qualidade e SLA de Assinatura */}
          <div className="sylva-glass border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Clock size={16} className="text-[var(--accent-ink)]" />
                  Governança Clínica: SLA de Fechamento e Assinatura Digital
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Conformidade com resolução CFM nº 1.821 e diretrizes de integridade documental
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold text-[var(--accent-ink)] bg-[var(--accent)] border-[var(--tint-olive-border)] px-2.5 py-0.5 rounded-full">
                {slaPercentage}% em dia
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Coluna 1: Distribuição de SLA por Faixas */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-[var(--text-muted)] block uppercase tracking-wider">
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
                          <span className={cn("font-semibold", isLate ? "text-rose-400 font-bold" : "text-[var(--text-primary)]")}>
                            {faixa}
                          </span>
                          <span className="font-mono text-[var(--text-muted)] font-medium">
                            {total.toLocaleString('pt-BR')} prontuários
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500 ease-out", 
                              isLate ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-[#CCF352] shadow-[0_0_8px_rgba(204,243,82,0.4)]'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna 2: Card de Avaliação Regulatória e Faturamento */}
              <div className="sylva-card rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2 uppercase tracking-wide">
                    <ShieldCheck size={16} className="text-[var(--accent-ink)]" />
                    Diagnóstico Regulatório &amp; Faturamento
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                    Prontuários médicos que excedem 24 horas para fechamento ou assinatura digital geram passivos em auditorias hospitalares (ONA/JCI) e bloqueios no faturamento de contas de convênios.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="sylva-glass p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Dentro do Prazo (&le; 24h)</span>
                      <span className="text-xl font-bold font-mono text-[var(--accent-ink)]">{within24h.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-[var(--text-muted)] block font-medium">Conforme regulamentação</span>
                    </div>

                    <div className="sylva-glass p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Acima de 24h (Risco)</span>
                      <span className="text-xl font-bold font-mono text-rose-500">{over24h.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-rose-500/90 block font-medium">Requer intervenção</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[var(--card-subtle)] rounded-xl border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-primary)] font-medium">
                  <CheckCircle2 size={16} className="text-[var(--accent-ink)] shrink-0" />
                  <span>
                    Índice de conformidade geral da unidade: <b className="text-[var(--accent-ink)]">{slaPercentage}%</b>.
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="sylva-glass bg-[var(--card-bg)] rounded-2xl p-16 text-center border border-[var(--border-subtle)] shadow-2xs space-y-3">
          <Building2 size={42} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Nenhum dado encontrado para esta unidade</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Não há registros de prontuários clínicos para o hospital selecionado nos últimos 90 dias na conexão ativa.
          </p>
        </div>
      )}

      {/* Modal Central Unificado de Detalhes e Perfis */}
      <DocumentDetailsModal
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        docId={sidebarDoc}
        docVersion={resolvedVersion}
        metadata={metadata}
        loading={metadataLoading}
        metadataError={metadataError}
        actions={metadataActions}
        actionsLoading={metadataActionsLoading}
        actionsError={metadataActionsError}
        rules={metadataRules}
        rulesLoading={metadataRulesLoading}
        rulesError={metadataRulesError}
        fields={metadataFields}
        fieldsLoading={metadataFieldsLoading}
        fieldsError={metadataFieldsError}
        profiles={profileData}
        profilesLoading={profileLoading}
        profilesError={profileError}
        onRefresh={() => sidebarDoc && fetchDocDetails(sidebarDoc, true)}
      />

    </div>
  );
}
