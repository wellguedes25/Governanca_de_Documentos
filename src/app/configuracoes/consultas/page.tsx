"use client";

import { useState, useEffect } from 'react';
import { Database, Save, Loader2, CircleX, CircleCheck, BarChart3, Clock, TrendingUp, Search, FileText, LayoutIcon, Settings2, Terminal, Printer, Check } from 'lucide-react';
import { AIQueryAssistant } from '@/components/AIQueryAssistant';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUI } from '@/context/UIContext';

export default function ConfigConsultasPage() {
  const { clearCache, setActiveConnInfo, activeConnInfo } = useUI();
  // Queries Padrão V2
  const [query, setQuery] = useState('');
  const [profileQuery, setProfileQuery] = useState('');
  const [docMetadataQuery, setDocMetadataQuery] = useState('');
  const [docActionsQuery, setDocActionsQuery] = useState('');
  const [reportBaseUrl, setReportBaseUrl] = useState('');
  const [kpiTotal, setKpiTotal] = useState('');
  const [kpi24h, setKpi24h] = useState('');
  const [kpiAssinados, setKpiAssinados] = useState('');
  const [kpiTop10, setKpiTop10] = useState('');
  const [kpiIdle, setKpiIdle] = useState('');
  const [kpiVolume3m, setKpiVolume3m] = useState('');
  const [kpiUnitAdherence, setKpiUnitAdherence] = useState('');
  const [kpiUnitInactivity, setKpiUnitInactivity] = useState('');

  // Queries V3 (Editor 3.0 HTML5)
  const [queryV3, setQueryV3] = useState('');
  const [profileQueryV3, setProfileQueryV3] = useState('');
  const [docMetadataQueryV3, setDocMetadataQueryV3] = useState('');
  const [docActionsQueryV3, setDocActionsQueryV3] = useState('');
  const [kpiTotalV3, setKpiTotalV3] = useState('');
  const [kpi24hV3, setKpi24hV3] = useState('');
  const [kpiAssinadosV3, setKpiAssinadosV3] = useState('');
  
  // Auditoria Params
  const [auditDays, setAuditDays] = useState(15);
  const [auditDocId, setAuditDocId] = useState<string | number>("0");
  
  const [activeTab, setActiveTab] = useState<'v3' | 'v2' | 'instituicoes'>('v3');
  
  // Custom Cards e Metadados
  const [customCards, setCustomCards] = useState<any[]>([]);
  const [cardSettings, setCardSettings] = useState<Record<string, any>>({});

  const [editingCard, setEditingCard] = useState<any>(null);
  const [editingNative, setEditingNative] = useState<string | null>(null);

  const [newCard, setNewCard] = useState({
    title: '',
    query: '',
    type: 'kpi',
    icon: 'FileText',
    color: 'from-[#074E52] to-[#0D9488]',
    enabled: true,
    valueType: 'number'
  });

  const [enabledQueries, setEnabledQueries] = useState<Record<string, boolean>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [kpiLoading, setKpiLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [activeConnName, setActiveConnName] = useState('');

  // Hospitais / Empresas
  const [hospitalsMapping, setHospitalsMapping] = useState<any[]>([]);
  const [dbHospitals, setDbHospitals] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalsError, setHospitalsError] = useState<string | null>(null);

  async function saveHospitalsMapping(newMapping: any[]) {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'SAVE_HOSPITALS_MAPPING', 
          hospitalsMapping: newMapping
        }),
      });
      if (!res.ok) throw new Error('Falha no salvamento');
      
      // Invalidate frontend cache so all pages (documentos, dashboard, linhagem) fetch the new hospitals
      clearCache();
      const activeHospList = newMapping.filter((h: any) => h.ativo);
      if (activeConnInfo) {
        setActiveConnInfo({
          ...activeConnInfo,
          activeHospitals: activeHospList
        });
      }
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oracle_documentos_data_V2');
        sessionStorage.removeItem('oracle_documentos_data_V3');
        sessionStorage.removeItem('dashboard_stats_V2');
        sessionStorage.removeItem('dashboard_analytics_V2');
        sessionStorage.removeItem('dashboard_stats_V3');
        sessionStorage.removeItem('dashboard_analytics_V3');
      }

      setMessage(`Mapeamento salvo com sucesso!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erro ao salvar mapeamento.');
    }
  }

  function toggleHospitalActive(hospital: any) {
    const existing = hospitalsMapping.find(h => h.id === hospital.CD_MULTI_EMPRESA);
    let newMapping;
    if (existing) {
      newMapping = hospitalsMapping.map(h => h.id === hospital.CD_MULTI_EMPRESA ? { ...h, ativo: !h.ativo } : h);
    } else {
      newMapping = [...hospitalsMapping, { id: hospital.CD_MULTI_EMPRESA, nome: hospital.NM_FANTASIA, sigla: '', ativo: true }];
    }
    setHospitalsMapping(newMapping);
    saveHospitalsMapping(newMapping);
  }

  function updateHospitalSigla(hospital: any, sigla: string) {
    const existing = hospitalsMapping.find(h => h.id === hospital.CD_MULTI_EMPRESA);
    let newMapping;
    if (existing) {
      newMapping = hospitalsMapping.map(h => h.id === hospital.CD_MULTI_EMPRESA ? { ...h, sigla } : h);
    } else {
      newMapping = [...hospitalsMapping, { id: hospital.CD_MULTI_EMPRESA, nome: hospital.NM_FANTASIA, sigla, ativo: false }];
    }
    setHospitalsMapping(newMapping);
    saveHospitalsMapping(newMapping);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsInitialLoading(true);
    try {
      const res = await fetch('/api/connections');
      const storage = await res.json();
      setQuery(storage.activeQuery || '');
      setQueryV3(storage.activeQueryV3 || '');
      setProfileQuery(storage.profileQuery || '');
      setProfileQueryV3(storage.profileQueryV3 || '');
      setDocMetadataQuery(storage.docMetadataQuery || '');
      setDocMetadataQueryV3(storage.docMetadataQueryV3 || '');
      setDocActionsQuery(storage.docActionsQuery || '');
      setDocActionsQueryV3(storage.docActionsQueryV3 || '');
      setReportBaseUrl(storage.reportBaseUrl || 'http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=');
      
      if (storage.kpiQueries) {
        setKpiTotal(storage.kpiQueries.total || '');
        setKpi24h(storage.kpiQueries.prod24h || '');
        setKpiAssinados(storage.kpiQueries.assinados || '');
      }

      if (storage.kpiQueriesV3) {
        setKpiTotalV3(storage.kpiQueriesV3.total || '');
        setKpi24hV3(storage.kpiQueriesV3.prod24h || '');
        setKpiAssinadosV3(storage.kpiQueriesV3.assinados || '');
      }

      if (storage.analyticQueries) {
        setKpiTop10(storage.analyticQueries.top10 || '');
        setKpiIdle(storage.analyticQueries.idle || '');
        setKpiVolume3m(storage.analyticQueries.volume3m || '');
        setKpiUnitAdherence(storage.analyticQueries.unitAdherence || '');
        setKpiUnitInactivity(storage.analyticQueries.unitInactivity || '');
      }

      setAuditDays(storage.auditDays || 15);
      setAuditDocId(storage.auditDocId !== undefined ? String(storage.auditDocId) : "0");

      setEnabledQueries(storage.enabledQueries || {});
      setCustomCards(storage.customCards || []);
      setCardSettings(storage.cardSettings || {});
      setHospitalsMapping(storage.hospitalsMapping || []);
      
      const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
      if (active) {
        setActiveConnName(active.name);
        setLoadingHospitals(true);
        setHospitalsError(null);
        fetch('/api/empresas')
          .then(res => res.json())
          .then(data => {
            if (data.rows) {
              setDbHospitals(data.rows);
            } else if (data.error) {
              setHospitalsError(data.error);
              console.error('Erro retornado pela API de empresas:', data.error);
            }
          })
          .catch(err => {
            console.error('Erro ao buscar empresas:', err);
            setHospitalsError(err.message || 'Erro desconhecido ao conectar com a API');
          })
          .finally(() => setLoadingHospitals(false));
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
      setMessage('Erro ao carregar dados do storage.');
    } finally {
      setIsInitialLoading(false);
    }
  }

  async function handleSave(type: 'MAIN' | 'MAIN_V3' | 'PROFILE' | 'PROFILE_V3' | 'DOC_METADATA' | 'DOC_METADATA_V3' | 'DOC_ACTIONS' | 'DOC_ACTIONS_V3' | 'REPORT_URL' | 'KPI_TOTAL' | 'KPI_TOTAL_V3' | 'KPI_24H' | 'KPI_24H_V3' | 'KPI_ASSINADOS' | 'KPI_ASSINADOS_V3' | 'KPI_TOP10' | 'KPI_IDLE' | 'KPI_VOLUME3M' | 'KPI_UNIT_ADHERENCE' | 'KPI_UNIT_INACTIVITY' | 'SETTINGS' | 'AUDIT_PARAMS') {
    if (type === 'MAIN' || type === 'MAIN_V3') setLoading(true);
    else if (type === 'PROFILE' || type === 'PROFILE_V3' || type === 'DOC_METADATA' || type === 'DOC_METADATA_V3' || type === 'DOC_ACTIONS' || type === 'DOC_ACTIONS_V3') setProfileLoading(true);
    else if (type === 'REPORT_URL') setProfileLoading(true); 
    else if (type === 'SETTINGS') setLoading(true); 
    else setKpiLoading(type);
    
    let bodyType = '';
    let bodyQuery = '';

    switch(type) {
      case 'MAIN': bodyType = 'SAVE_QUERY'; bodyQuery = query; break;
      case 'MAIN_V3': bodyType = 'SAVE_QUERY_V3'; bodyQuery = queryV3; break;
      case 'PROFILE': bodyType = 'SAVE_PROFILE_QUERY'; bodyQuery = profileQuery; break;
      case 'PROFILE_V3': bodyType = 'SAVE_PROFILE_QUERY_V3'; bodyQuery = profileQueryV3; break;
      case 'DOC_METADATA': bodyType = 'SAVE_DOC_METADATA_QUERY'; bodyQuery = docMetadataQuery; break;
      case 'DOC_METADATA_V3': bodyType = 'SAVE_DOC_METADATA_QUERY_V3'; bodyQuery = docMetadataQueryV3; break;
      case 'DOC_ACTIONS': bodyType = 'SAVE_DOC_ACTIONS_QUERY'; bodyQuery = docActionsQuery; break;
      case 'DOC_ACTIONS_V3': bodyType = 'SAVE_DOC_ACTIONS_QUERY_V3'; bodyQuery = docActionsQueryV3; break;
      case 'REPORT_URL': bodyType = 'SAVE_REPORT_URL'; bodyQuery = reportBaseUrl; break;
      case 'KPI_TOTAL': bodyType = 'SAVE_KPI_TOTAL'; bodyQuery = kpiTotal; break;
      case 'KPI_TOTAL_V3': bodyType = 'SAVE_KPI_TOTAL_V3'; bodyQuery = kpiTotalV3; break;
      case 'KPI_24H': bodyType = 'SAVE_KPI_24H'; bodyQuery = kpi24h; break;
      case 'KPI_24H_V3': bodyType = 'SAVE_KPI_24H_V3'; bodyQuery = kpi24hV3; break;
      case 'KPI_ASSINADOS': bodyType = 'SAVE_KPI_ASSINADOS'; bodyQuery = kpiAssinados; break;
      case 'KPI_ASSINADOS_V3': bodyType = 'SAVE_KPI_ASSINADOS_V3'; bodyQuery = kpiAssinadosV3; break;
      case 'KPI_TOP10': bodyType = 'SAVE_KPI_TOP10'; bodyQuery = kpiTop10; break;
      case 'KPI_IDLE': bodyType = 'SAVE_KPI_IDLE'; bodyQuery = kpiIdle; break;
      case 'KPI_VOLUME3M': bodyType = 'SAVE_KPI_VOLUME3M'; bodyQuery = kpiVolume3m; break;
      case 'KPI_UNIT_ADHERENCE': bodyType = 'SAVE_KPI_UNIT_ADHERENCE'; bodyQuery = kpiUnitAdherence; break;
      case 'KPI_UNIT_INACTIVITY': bodyType = 'SAVE_KPI_UNIT_INACTIVITY'; bodyQuery = kpiUnitInactivity; break;
      case 'SETTINGS': bodyType = 'SAVE_SETTINGS'; break;
      case 'AUDIT_PARAMS': bodyType = 'SAVE_AUDIT_PARAMS'; break;
    }
    
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: bodyType, 
          query: bodyQuery,
          url: bodyType === 'SAVE_REPORT_URL' ? bodyQuery : undefined,
          enabledQueries,
          cardSettings,
          auditDays: bodyType === 'SAVE_AUDIT_PARAMS' ? auditDays : undefined,
          auditDocId: bodyType === 'SAVE_AUDIT_PARAMS' ? auditDocId : undefined
        }),
      });
      if (!res.ok) throw new Error('Falha no salvamento');
      setMessage(`Configuração salva com sucesso!`);
      setTimeout(() => setMessage(''), 3000);
      setEditingNative(null);
    } catch (err) {
      setMessage('Erro ao salvar configuração.');
    } finally {
      setLoading(false);
      setProfileLoading(false);
      setKpiLoading(null);
    }
  }

  const toggleQuery = (key: string) => {
    const newState = {
      ...enabledQueries,
      [key]: !enabledQueries[key]
    };
    setEnabledQueries(newState);
    
    // Auto-save: Persiste a mudança imediatamente no servidor
    saveSettings(newState, cardSettings);
  };

  async function saveSettings(enabled: any, settings: any) {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'SAVE_SETTINGS', 
          enabledQueries: enabled,
          cardSettings: settings
        }),
      });
      if (!res.ok) throw new Error('Falha ao sincronizar toggles');
      setMessage('Preferência sincronizada!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Erro no auto-save:', err);
      setMessage('Erro ao salvar preferência.');
    }
  }



  const updateCardSetting = (id: string, field: string, value: string) => {
    setCardSettings(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };

  const QueryHeader = ({ title, queryKey, icon: Icon, defaultTitle }: { title: string, queryKey: string, icon: any, defaultTitle?: string }) => {
    const isEditing = editingNative === queryKey;
    const settings = cardSettings[queryKey] || {};
    const displayTitle = settings.title || defaultTitle || title;

    return (
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-1 flex-1">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <input 
                autoFocus
                className="bg-white border border-[#074E52] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#0F2426] outline-none w-1/2"
                value={settings.title || defaultTitle || title}
                onChange={e => updateCardSetting(queryKey, 'title', e.target.value)}
              />
              <select 
                className="bg-white border border-[#D5E4E0] focus:border-[#074E52] rounded-lg px-2.5 py-1.5 text-xs text-[#0F2426] outline-none"
                value={settings.color || 'from-[#074E52] to-[#0D9488]'}
                onChange={e => updateCardSetting(queryKey, 'color', e.target.value)}
              >
                <option value="from-[#074E52] to-[#0D9488]">Verde Petróleo (Teal)</option>
                <option value="from-[#0D9488] to-emerald-600">Teal Clínico</option>
                <option value="from-emerald-500 to-teal-600">Verde</option>
                <option value="from-orange-500 to-red-600">Laranja</option>
                <option value="from-rose-500 to-orange-600">Rosa/Verm</option>
              </select>
               <button 
                onClick={() => saveSettings(enabledQueries, cardSettings)}
                className="p-1.5 bg-[#074E52] rounded-lg text-white hover:bg-[#053A3D] cursor-pointer"
              >
                <Check size={13}/>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h4 className="text-sm font-bold text-[#0F2426] flex items-center gap-2 normal-case tracking-tight">
                <Icon size={17} className="text-[#074E52]" />
                {displayTitle}
              </h4>
              <button 
                onClick={() => setEditingNative(queryKey)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:bg-[#E6F4F1] hover:text-[#074E52] transition-all cursor-pointer"
              >
                <Settings2 size={13} />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => toggleQuery(queryKey)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-all ${
            enabledQueries[queryKey] !== false 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${enabledQueries[queryKey] !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
          {enabledQueries[queryKey] !== false ? 'Ativo' : 'Inativo'}
        </button>
      </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[#074E52]" size={40} />
        <p className="text-slate-500 font-medium text-xs">Carregando consultas SQL...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5">
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[#E0ECE9]">
        <PageHeader 
          title="Motor de Inteligência SQL"
          subtitle={`Gestão de algoritmos de extração e telemetria. Ambiente ativo: ${activeConnName || 'Padrão'}`}
          icon={Database}
          action={
            message ? (
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold shadow-2xs border ${
                message.includes('Erro') 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {message.includes('Erro') ? <CircleX size={15} /> : <CircleCheck size={15} className="text-emerald-600" />}
                <span>{message}</span>
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Menu de Abas Principal */}
      <div className="flex flex-wrap gap-2 border-b border-[#E0ECE9] mb-4">
        {[
          { id: 'v3', label: 'Consultas V3 (HTML5)', icon: <Database size={14} className="text-emerald-600" />, badge: 'ATUAL' },
          { id: 'v2', label: 'Consultas V2 (Flex)', icon: <Database size={14} className="text-amber-600" />, badge: 'LEGADO' },
          { id: 'instituicoes', label: 'Instituições', icon: <LayoutIcon size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#074E52] text-[#074E52]'
                : 'border-transparent text-slate-500 hover:text-[#074E52] hover:border-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-mono ${
                tab.badge === 'ATUAL' ? 'bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF]' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={activeTab === 'instituicoes' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
      {/* Mapeamento de Instituições (MV) */}
      <section className="bg-white p-6 border border-[#E0ECE9] rounded-2xl shadow-xs mt-2 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#0F2426] flex items-center gap-3 font-semibold">
            <LayoutIcon className="text-[#074E52]" size={24} />
            Mapeamento de Instituições (MV)
          </h2>
          <div className="text-[10px] text-slate-600 bg-[#F3F7F6] border border-[#E0ECE9] px-3 py-1 rounded-full font-mono uppercase tracking-widest flex items-center gap-2">
            {loadingHospitals ? <Loader2 size={12} className="animate-spin text-[#074E52]" /> : <Database size={12} className="text-[#074E52]" />}
            {dbHospitals.length} Registros Encontrados
          </div>
        </div>
        <p className="text-slate-600 text-sm mb-6 max-w-3xl leading-relaxed">
          Ative as empresas que farão parte do dashboard e defina a <strong className="text-[#0F2426]">Sigla</strong> que será exibida nas tabelas (ex: HSL, HSR). 
          As consultas usarão a variável <code className="text-[#074E52] bg-[#E6F4F1] px-1.5 py-0.5 rounded font-mono text-xs">:EMPRESAS_ATIVAS</code> para injetar os IDs selecionados e <code className="text-[#074E52] bg-[#E6F4F1] px-1.5 py-0.5 rounded font-mono text-xs">:DECODE_EMPRESAS</code> para a tradução das siglas.
        </p>

        {loadingHospitals ? (
          <div className="flex items-center justify-center p-8 bg-[#F3F7F6] border border-[#E0ECE9] rounded-xl">
            <Loader2 className="animate-spin text-[#074E52]" size={24} />
          </div>
        ) : hospitalsError ? (
          <div className="flex flex-col items-center justify-center p-8 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
            <Database size={32} className="mb-2 opacity-50" />
            <p className="font-semibold text-center mb-1">Falha na conexão com o Banco de Dados</p>
            <p className="text-xs text-center max-w-lg opacity-80">{hospitalsError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {dbHospitals.map(hospital => {
              const mapping = hospitalsMapping.find(m => m.id === hospital.CD_MULTI_EMPRESA);
              const isAtivo = mapping?.ativo || false;
              const sigla = mapping?.sigla || '';
              
              return (
                <div key={hospital.CD_MULTI_EMPRESA} className={`flex flex-col gap-2 p-3.5 border rounded-xl transition-colors duration-300 ${isAtivo ? 'bg-[#E6F4F1]/40 border-[#074E52]/40' : 'bg-[#F3F7F6]/60 border-[#E0ECE9]'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-[#E0ECE9]">ID: {hospital.CD_MULTI_EMPRESA}</span>
                        <h3 className="text-sm font-semibold text-[#0F2426] truncate" title={hospital.NM_FANTASIA}>{hospital.NM_FANTASIA}</h3>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleHospitalActive(hospital)}
                      className={`shrink-0 w-10 h-5 relative flex items-center rounded-full transition-colors duration-300 cursor-pointer ${isAtivo ? 'bg-[#074E52]' : 'bg-slate-300'}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute transition-transform duration-300 ${isAtivo ? 'translate-x-5.5' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-600 font-mono">SIGLA:</span>
                    <input 
                      type="text" 
                      value={sigla}
                      onChange={(e) => updateHospitalSigla(hospital, e.target.value)}
                      placeholder="Ex: HSL"
                      disabled={!isAtivo}
                      maxLength={10}
                      className={`flex-1 bg-white border rounded-lg p-1 text-xs font-bold text-center uppercase focus:outline-none transition-all ${isAtivo ? 'border-[#CBE5DF] text-[#074E52] focus:border-[#074E52]' : 'border-[#E0ECE9] text-slate-400 opacity-60 cursor-not-allowed'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>

      {/* SEÇÃO CONSULTAS V3 (HTML5) */}
      <div className={activeTab === 'v3' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
        <div className="flex items-center justify-between border-b border-[#E0ECE9] pb-3 pt-2 mb-5">
          <div className="flex items-center gap-3">
            <Database className="text-[#074E52]" size={22} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F2426] tracking-tight">Motor SQL - Editor 3.0 (HTML5)</h2>
                <span className="text-[10px] bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF] px-2.5 py-0.5 rounded-full font-bold font-mono">ATUAL</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">Consultas nativas apontando para o schema <code className="text-[#074E52] bg-[#E6F4F1] px-1.5 py-0.5 rounded font-mono">EDITOR.*</code> da nova arquitetura web.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Motor Principal V3 */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Database size={18} className="text-[#074E52]" />
                  <h4 className="text-sm font-bold text-[#0F2426] normal-case tracking-tight">
                    Query Principal V3 (Tela de Documentos - HTML5)
                  </h4>
                  <span className="text-[10px] bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF] px-2.5 py-0.5 rounded-full font-mono font-semibold">EDITOR.EDITOR_DOCUMENTO</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Motor Ativo V3
                </div>
              </div>
              <textarea 
                className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={queryV3}
                onChange={(e) => setQueryV3(e.target.value)}
              />
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={queryV3} 
                  onApply={setQueryV3} 
                  context="Consulta principal da V3 para alimentar a tabela da tela de Documentos (Editor 3.0 HTML5 com schema EDITOR)" 
                />
                <button 
                  onClick={() => handleSave('MAIN_V3')}
                  disabled={loading}
                  title="Atualizar Motor SQL V3"
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>

            {/* Perfil Vinculado V3 */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0D9488]"></div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-[#0F2426] uppercase tracking-wider flex items-center gap-2">
                  <Search size={14} className="text-[#074E52]" />
                  Motor de Reconciliação de Perfis V3 (CD_DOCUMENTO_EDITOR_3)
                </h4>
                <span className="text-[10px] bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF] px-2.5 py-0.5 rounded-full font-mono font-semibold">V3 Profiles</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Busca de perfis no Editor 3.0 utilizando o parâmetro de perfil <code className="text-[#074E52] bg-[#E6F4F1] px-1.5 py-0.5 rounded font-mono">CD_DOCUMENTO_EDITOR_3</code>.
              </p>
              <textarea 
                className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={profileQueryV3}
                onChange={(e) => setProfileQueryV3(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-slate-600 font-semibold">Variável Requerida: <b className="text-[#074E52] font-mono">:CD_DOCUMENTO</b></p>
                  <AIQueryAssistant 
                    currentQuery={profileQueryV3} 
                    onApply={setProfileQueryV3} 
                    context="Busca de perfis de atendimento vinculados ao Editor 3.0 com CD_DOCUMENTO_EDITOR_3 usando :CD_DOCUMENTO" 
                  />
                </div>
                <button 
                  onClick={() => handleSave('PROFILE_V3')} 
                  disabled={profileLoading} 
                  title="Salvar Motor de Perfis V3" 
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
                >
                  {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>

            {/* KPI: Total V3 */}
            <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
              <h4 className="text-sm font-bold text-[#0F2426] flex items-center gap-2 normal-case tracking-tight mb-3">
                <FileText size={17} className="text-[#074E52]" />
                Volume Total Docs V3 (Opcional)
              </h4>
              <textarea 
                className="w-full h-32 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={kpiTotalV3}
                placeholder="Se vazio, utiliza a query global de documentos."
                onChange={(e) => setKpiTotalV3(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpiTotalV3} 
                  onApply={setKpiTotalV3} 
                  context="Contagem total de documentos preenchidos no banco Oracle para a V3" 
                />
                <button 
                  onClick={() => handleSave('KPI_TOTAL_V3')} 
                  disabled={kpiLoading === 'KPI_TOTAL_V3'} 
                  title="Salvar KPI Total V3" 
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {kpiLoading === 'KPI_TOTAL_V3' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>
            </div>

            {/* Produção 24h V3 */}
            <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <h4 className="text-sm font-bold text-[#0F2426] flex items-center gap-2 normal-case tracking-tight mb-3">
                <Clock size={17} className="text-amber-600" />
                Produção Snapshot 24h V3 (Opcional)
              </h4>
              <textarea 
                className="w-full h-32 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={kpi24hV3}
                placeholder="Se vazio, utiliza a query global de documentos."
                onChange={(e) => setKpi24hV3(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpi24hV3} 
                  onApply={setKpi24hV3} 
                  context="Volume de documentos preenchidos nas últimas 24 horas no banco Oracle para a V3" 
                />
                <button 
                  onClick={() => handleSave('KPI_24H_V3')} 
                  disabled={kpiLoading === 'KPI_24H_V3'} 
                  title="Salvar KPI 24h V3" 
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {kpiLoading === 'KPI_24H_V3' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>
            </div>

            {/* Metadados e Especificações Técnicas V3 */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-[#0F2426] uppercase tracking-wider flex items-center gap-2">
                  <Settings2 size={14} className="text-[#074E52]" />
                  Metadados e Especificações Técnicas V3 (Menu Lateral)
                </h4>
                <span className="text-[10px] bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF] px-2.5 py-0.5 rounded-full font-mono font-semibold">V3 Metadata</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Alimenta o menu lateral com quantidade de campos, regras, cabeçalho, rodapé e histórico de versões no schema <code className="text-[#074E52] bg-[#E6F4F1] px-1.5 py-0.5 rounded font-mono">EDITOR</code>.
              </p>
              <textarea 
                className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={docMetadataQueryV3}
                onChange={(e) => setDocMetadataQueryV3(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-slate-600 font-semibold">Variável Requerida: <b className="text-[#074E52] font-mono">:CD_DOCUMENTO</b></p>
                  <AIQueryAssistant 
                    currentQuery={docMetadataQueryV3} 
                    onApply={setDocMetadataQueryV3} 
                    context="Consulta de metadados técnicos, regras e campos do Editor 3.0 HTML5 no schema EDITOR usando :CD_DOCUMENTO" 
                  />
                </div>
                <button 
                  onClick={() => handleSave('DOC_METADATA_V3')} 
                  disabled={profileLoading} 
                  title="Salvar Metadados V3" 
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
                >
                  {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>

            {/* Vínculos SQL e Ações V3 */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0D9488]"></div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-[#0F2426] uppercase tracking-wider flex items-center gap-2">
                  <Terminal size={14} className="text-[#074E52]" />
                  Vínculos SQL e Ações Entre Documentos V3
                </h4>
                <span className="text-[10px] bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF] px-2.5 py-0.5 rounded-full font-mono font-semibold">V3 Actions</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Mapeamento de chamadas dinâmicas, scripts e regras de relacionamento de documentos no Editor 3.0.
              </p>
              <textarea 
                className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={docActionsQueryV3}
                onChange={(e) => setDocActionsQueryV3(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-slate-600 font-semibold">Variável Requerida: <b className="text-[#074E52] font-mono">:CD_DOCUMENTO</b></p>
                  <AIQueryAssistant 
                    currentQuery={docActionsQueryV3} 
                    onApply={setDocActionsQueryV3} 
                    context="Consulta de ações e vínculos SQL de documentos no Editor 3.0 usando :CD_DOCUMENTO" 
                  />
                </div>
                <button 
                  onClick={() => handleSave('DOC_ACTIONS_V3')} 
                  disabled={profileLoading} 
                  title="Salvar Vínculos SQL V3" 
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
                >
                  {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO CONSULTAS V2 (FLEX) */}
      <div className={activeTab === 'v2' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
        <div className="flex items-center justify-between border-b border-[#E0ECE9] pb-3 pt-2 mb-5">
          <div className="flex items-center gap-3">
            <Database className="text-amber-600" size={22} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F2426] tracking-tight">Motor SQL - Editor 2.0 (Flex)</h2>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold font-mono">LEGADO</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">Consultas nativas apontando para o schema <code className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono">DBAMV.EDITOR_DOCUMENTO</code> do editor flex.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Motor Principal V2 */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <QueryHeader title="Query Principal (Tela Documentos - V2 Flex)" queryKey="main" icon={Database} defaultTitle="Query Principal V2" />
              <textarea 
                className={`w-full h-48 bg-[#F7FAF9] border rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:bg-white focus:outline-none transition-all ${
                  enabledQueries['main'] !== false ? 'border-[#D5E4E0] focus:border-[#074E52]' : 'border-[#E0ECE9] opacity-40 grayscale pointer-events-none'
                }`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={query} 
                  onApply={setQuery} 
                  context="Consulta principal da V2 para alimentar a tabela da tela de Documentos (Editor 2.0 Flex com schema DBAMV.EDITOR_DOCUMENTO)" 
                />
                <button 
                  onClick={() => handleSave('MAIN')}
                  disabled={loading}
                  title="Atualizar Motor SQL V2"
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>

            {/* KPI: Total de Documentos V2 */}
            <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <QueryHeader title="Volume Total Docs V2" queryKey="total" icon={FileText} defaultTitle="Volume Total V2" />
              <textarea 
                className={`w-full h-32 bg-[#F7FAF9] border rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:bg-white focus:outline-none transition-all ${
                  enabledQueries['total'] !== false ? 'border-[#D5E4E0] focus:border-[#074E52]' : 'border-[#E0ECE9] opacity-40 grayscale pointer-events-none'
                }`}
                value={kpiTotal}
                onChange={(e) => setKpiTotal(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpiTotal} 
                  onApply={setKpiTotal} 
                  context="Contagem total de documentos preenchidos no banco Oracle para a V2" 
                />
                <button 
                  onClick={() => handleSave('KPI_TOTAL')}
                  disabled={kpiLoading === 'KPI_TOTAL'}
                  title="Atualizar KPI Total V2"
                  className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
                >
                  {kpiLoading === 'KPI_TOTAL' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>

            {/* Produção 24h V2 */}
            <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <QueryHeader title="Produção Snapshot V2" queryKey="prod24h" icon={Clock} defaultTitle="Produção 24h V2" />
              <textarea 
                className={`w-full h-32 bg-[#F7FAF9] border rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:bg-white focus:outline-none transition-all ${
                  enabledQueries['prod24h'] !== false ? 'border-[#D5E4E0] focus:border-[#074E52]' : 'border-[#E0ECE9] opacity-40 grayscale pointer-events-none'
                }`}
                value={kpi24h}
                onChange={(e) => setKpi24h(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpi24h} 
                  onApply={setKpi24h} 
                  context="Volume de documentos preenchidos nas últimas 24 horas no banco Oracle para a V2" 
                />
                <button onClick={() => handleSave('KPI_24H')} disabled={kpiLoading === 'KPI_24H'} title="Atualizar Motor Snapshot" className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer">{kpiLoading === 'KPI_24H' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
              </div>
            </div>

            {/* Taxa de Assinatura */}
            <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
              <QueryHeader title="Taxa Compliance V2" queryKey="assinados" icon={TrendingUp} defaultTitle="Taxa Assinatura V2" />
              <textarea 
                className={`w-full h-32 bg-[#F7FAF9] border rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:bg-white focus:outline-none transition-all ${
                  enabledQueries['assinados'] !== false ? 'border-[#D5E4E0] focus:border-[#074E52]' : 'border-[#E0ECE9] opacity-40 grayscale pointer-events-none'
                }`}
                 value={kpiAssinados}
                 onChange={(e) => setKpiAssinados(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpiAssinados} 
                  onApply={setKpiAssinados} 
                  context="Taxa de documentos assinados vs total preenchido (compliance clínico)" 
                />
                <button onClick={() => handleSave('KPI_ASSINADOS')} disabled={kpiLoading === 'KPI_ASSINADOS'} title="Atualizar Motor Compliance" className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer">{kpiLoading === 'KPI_ASSINADOS' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
              </div>
            </div>

            {/* Volume 3 Meses */}
            <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0D9488]"></div>
              <QueryHeader title="Timeline 90 Dias V2" queryKey="volume3m" icon={BarChart3} defaultTitle="Volume Global V2" />
              <textarea 
                className={`w-full h-32 bg-[#F7FAF9] border rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:bg-white focus:outline-none transition-all ${
                  enabledQueries['volume3m'] !== false ? 'border-[#D5E4E0] focus:border-[#074E52]' : 'border-[#E0ECE9] opacity-40 grayscale pointer-events-none'
                }`}
                value={kpiVolume3m}
                onChange={(e) => setKpiVolume3m(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpiVolume3m} 
                  onApply={setKpiVolume3m} 
                  context="Série histórica de volume de documentos nos últimos 90 dias" 
                />
                <button onClick={() => handleSave('KPI_VOLUME3M')} disabled={kpiLoading === 'KPI_VOLUME3M'} title="Atualizar Motor Global" className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer">{kpiLoading === 'KPI_VOLUME3M' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
              </div>
            </div>

            {/* Curva ABC Config */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
              <QueryHeader title="Analytics: Curva ABC de Documentação (V2)" queryKey="top10" icon={TrendingUp} defaultTitle="Ranking Top 10" />
              <textarea 
                className={`w-full h-48 bg-[#F7FAF9] border rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:bg-white focus:outline-none transition-all ${
                  enabledQueries['top10'] !== false ? 'border-[#D5E4E0] focus:border-[#074E52]' : 'border-[#E0ECE9] opacity-40 grayscale pointer-events-none'
                }`}
                 value={kpiTop10}
                 onChange={(e) => setKpiTop10(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <AIQueryAssistant 
                  currentQuery={kpiTop10} 
                  onApply={setKpiTop10} 
                  context="Ranking dos 10 documentos mais utilizados (Curva ABC)" 
                />
                <button onClick={() => handleSave('KPI_TOP10')} disabled={kpiLoading === 'KPI_TOP10'} title="Salvar Algoritmo Analytics" className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer">{kpiLoading === 'KPI_TOP10' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
              </div>
            </div>

            {/* Perfil Vinculado V2 */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
              <h4 className="text-xs font-bold text-[#0F2426] mb-2 uppercase tracking-wider flex items-center gap-2">
                <Search size={14} className="text-emerald-600" />
                Motor de Reconciliação V2 (CD_DOCUMENTO - Editor 2.0 Flex)
              </h4>
              <textarea 
                className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
                value={profileQuery}
                onChange={(e) => setProfileQuery(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-slate-600 font-semibold">Variável Requerida: <b className="text-[#074E52] font-mono">:CD_DOCUMENTO</b></p>
                  <AIQueryAssistant 
                    currentQuery={profileQuery} 
                    onApply={setProfileQuery} 
                    context="Busca de perfis de atendimento vinculados a um documento no Editor 2.0 Flex usando :CD_DOCUMENTO" 
                  />
                </div>
                <button onClick={() => handleSave('PROFILE')} disabled={profileLoading} title="Salvar Motor de Vínculo V2" className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer">
                  {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consultas Globais Compartilhadas */}
      <div className="grid grid-cols-1 gap-4 mt-6 pb-8 border-t border-[#E0ECE9] pt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Settings2 size={16} className="text-[#074E52]" />
          Módulos Globais e Metadados
        </h3>

        {/* Metadados e Especificações Técnicas V2 */}
        <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0D9488]"></div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-[#0F2426] uppercase tracking-wider flex items-center gap-2">
              <Settings2 size={14} className="text-[#074E52]" />
              Metadados e Especificações Técnicas V2 (Menu Lateral)
            </h4>
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">V2 Metadata</span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Alimenta o menu lateral com quantidade de campos, regras, cabeçalho, rodapé e histórico de versões no schema <code className="text-[#074E52] bg-[#F3F7F6] px-1.5 py-0.5 rounded font-mono">DBAMV</code>.
          </p>
          <textarea 
            className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
            value={docMetadataQuery}
            onChange={(e) => setDocMetadataQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-slate-600 font-semibold">Variável Requerida: <b className="text-[#074E52] font-mono">:CD_DOCUMENTO</b></p>
              <AIQueryAssistant 
                currentQuery={docMetadataQuery} 
                onApply={setDocMetadataQuery} 
                context="Consulta de metadados técnicos, regras e campos do Editor 2.0 Flex no schema DBAMV usando :CD_DOCUMENTO" 
              />
            </div>
            <button 
              onClick={() => handleSave('DOC_METADATA')} 
              disabled={profileLoading} 
              title="Salvar Metadados V2" 
              className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
            >
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Vínculos SQL e Ações V2 */}
        <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-[#0F2426] uppercase tracking-wider flex items-center gap-2">
              <Terminal size={14} className="text-[#074E52]" />
              Vínculos SQL e Ações Entre Documentos V2
            </h4>
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono font-semibold">V2 Actions</span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Mapeamento de chamadas dinâmicas e scripts na propriedade de ação (cd_propriedade = 4) do Editor 2.0.
          </p>
          <textarea 
            className="w-full h-48 bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl p-3 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
            value={docActionsQuery}
            onChange={(e) => setDocActionsQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E0ECE9]">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-slate-600 font-semibold">Variável Requerida: <b className="text-[#074E52] font-mono">:CD_DOCUMENTO</b></p>
              <AIQueryAssistant 
                currentQuery={docActionsQuery} 
                onApply={setDocActionsQuery} 
                context="Consulta de ações e vínculos SQL de documentos no Editor 2.0 Flex usando :CD_DOCUMENTO" 
              />
            </div>
            <button 
              onClick={() => handleSave('DOC_ACTIONS')} 
              disabled={profileLoading} 
              title="Salvar Vínculos SQL V2" 
              className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer"
            >
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Configuração do Relatório Dinâmico MV */}
        <div className="bg-white rounded-2xl p-5 border border-[#E0ECE9] shadow-2xs relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
          <h4 className="text-xs font-bold text-[#0F2426] mb-2 uppercase tracking-wider flex items-center gap-2">
            <Printer size={14} className="text-[#074E52]" />
            Vínculo Report Web (Laudos PDF MV)
          </h4>
          <p className="text-xs text-slate-600 mb-3">
            Defina a URL base para visualização remota dos documentos no portal MV.
          </p>
          <input 
            type="text"
            className="w-full bg-[#F7FAF9] border border-[#D5E4E0] focus:bg-white focus:border-[#074E52] rounded-xl px-4 py-2 text-xs font-mono text-[#0F2426] focus:outline-none transition-all"
            value={reportBaseUrl}
            onChange={(e) => setReportBaseUrl(e.target.value)}
            placeholder="http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId="
          />
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#E0ECE9]">
            <p className="text-[11px] text-slate-600 font-semibold">Será complementado por: <b className="text-[#074E52] font-mono text-xs">+ CD_REGISTRO</b></p>
            <button onClick={() => handleSave('REPORT_URL')} disabled={profileLoading} title="Salvar URL do Laudo" className="flex items-center justify-center bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] p-2.5 rounded-xl transition-all group/btn cursor-pointer">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
