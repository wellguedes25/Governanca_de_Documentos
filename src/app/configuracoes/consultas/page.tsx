"use client";

import { useState, useEffect } from 'react';
import { Database, Save, Loader2, Play, CircleX, CircleCheck, BarChart3, Clock, TrendingUp, Search, ScanEye, Download, FileText, LayoutIcon, Settings2, Terminal, Printer, Check } from 'lucide-react';
import { AIQueryAssistant } from '@/components/AIQueryAssistant';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConfigConsultasPage() {
  // Queries Padrão
  const [query, setQuery] = useState('');
  const [profileQuery, setProfileQuery] = useState('');
  const [similarityQuery, setSimilarityQuery] = useState('');
  const [reportBaseUrl, setReportBaseUrl] = useState('');
  const [kpiTotal, setKpiTotal] = useState('');
  const [kpi24h, setKpi24h] = useState('');
  const [kpiAssinados, setKpiAssinados] = useState('');
  const [kpiTop10, setKpiTop10] = useState('');
  const [kpiIdle, setKpiIdle] = useState('');
  const [kpiVolume3m, setKpiVolume3m] = useState('');
  const [kpiUnitAdherence, setKpiUnitAdherence] = useState('');
  const [kpiUnitInactivity, setKpiUnitInactivity] = useState('');
  
  // Auditoria Params
  const [auditDays, setAuditDays] = useState(15);
  const [auditDocId, setAuditDocId] = useState<string | number>("0");
  
  const [activeTab, setActiveTab] = useState<'instituicoes' | 'nativas' | 'python' | 'downloads'>('instituicoes');
  
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
    color: 'from-blue-500 to-indigo-600',
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

  // Motor de Processamento Python
  const [scriptRunning, setScriptRunning] = useState<string | null>(null);
  const [scriptLog, setScriptLog] = useState<Record<string, string>>({});
  const [scriptStatus, setScriptStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  const [scriptProgress, setScriptProgress] = useState<Record<string, number>>({});

  // Hospitais / Empresas
  const [hospitalsMapping, setHospitalsMapping] = useState<any[]>([]);
  const [dbHospitals, setDbHospitals] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalsError, setHospitalsError] = useState<string | null>(null);

  // Status de objetos no banco
  const [dbObjectsStatus, setDbObjectsStatus] = useState<Record<string, boolean>>({});
  const [checkingDbObjects, setCheckingDbObjects] = useState(false);
  const [executingScript, setExecutingScript] = useState<string | null>(null);

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
      
      // Invalidate frontend cache so the dashboard fetches the new hospitals
      sessionStorage.removeItem('dashboard_stats_V2');
      sessionStorage.removeItem('dashboard_analytics_V2');
      sessionStorage.removeItem('dashboard_stats_V3');
      sessionStorage.removeItem('dashboard_analytics_V3');

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

  async function checkDbObjects() {
    setCheckingDbObjects(true);
    try {
      const res = await fetch('/api/scripts/check');
      const data = await res.json();
      if (!data.error) {
        setDbObjectsStatus(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingDbObjects(false);
    }
  }

  async function handleExecuteScript(filename: string) {
    if (!confirm('Deseja realmente executar este script de infraestrutura no banco de dados ativo? O script atual será substituído/executado.')) return;
    
    setExecutingScript(filename);
    try {
      const res = await fetch('/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(data.message);
        await checkDbObjects();
      } else {
        setMessage(data.error || 'Erro ao executar script');
      }
    } catch (e: any) {
      setMessage('Erro de comunicação com o servidor');
    } finally {
      setExecutingScript(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  useEffect(() => {
    if (activeTab === 'downloads') {
      checkDbObjects();
    }
  }, [activeTab, activeConnName]);

  async function handleRunScript(script: 'siglario' | 'similaridade') {
    setScriptRunning(script);
    setScriptStatus(prev => ({ ...prev, [script]: 'running' }));
    setScriptLog(prev => ({ ...prev, [script]: '' }));
    setScriptProgress(prev => ({ ...prev, [script]: 0 }));

    try {
      // Auto-save: Garante que os parâmetros de auditoria sejam salvos antes de rodar
      if (script === 'similaridade') {
        await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'SAVE_AUDIT_PARAMS', 
            auditDays,
            auditDocId
          }),
        });
      }

      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      
      if (!res.body) throw new Error('Falha ao iniciar stream de logs.');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          // Parsing de progresso [PROGRESS] 45.2
          const progressMatch = chunk.match(/\[PROGRESS\]\s+([\d.]+)/);
          if (progressMatch) {
            const p = parseFloat(progressMatch[1]);
            setScriptProgress(prev => ({ ...prev, [script]: p }));
          }

          setScriptLog(prev => ({
            ...prev,
            [script]: (prev[script] || '') + chunk
          }));
        }
      }

      setScriptStatus(prev => ({ ...prev, [script]: 'success' }));
      setMessage('Processamento concluído!');
    } catch (err: any) {
      setScriptLog(prev => ({ 
        ...prev, 
        [script]: (prev[script] || '') + `\n[ERRO FATAL] ${err.message}` 
      }));
      setScriptStatus(prev => ({ ...prev, [script]: 'error' }));
      setMessage('Erro durante o processamento.');
    } finally {
      setScriptRunning(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  async function fetchData() {
    setIsInitialLoading(true);
    try {
      const res = await fetch('/api/connections');
      const storage = await res.json();
      setQuery(storage.activeQuery || '');
      setProfileQuery(storage.profileQuery || '');
      setSimilarityQuery(storage.similarityQuery || '');
      setReportBaseUrl(storage.reportBaseUrl || 'http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=');
      
      if (storage.kpiQueries) {
        setKpiTotal(storage.kpiQueries.total || '');
        setKpi24h(storage.kpiQueries.prod24h || '');
        setKpiAssinados(storage.kpiQueries.assinados || '');
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

  async function handleSave(type: 'MAIN' | 'PROFILE' | 'SIMILARITY' | 'REPORT_URL' | 'KPI_TOTAL' | 'KPI_24H' | 'KPI_ASSINADOS' | 'KPI_TOP10' | 'KPI_IDLE' | 'KPI_VOLUME3M' | 'KPI_UNIT_ADHERENCE' | 'KPI_UNIT_INACTIVITY' | 'SETTINGS' | 'AUDIT_PARAMS') {
    if (type === 'MAIN') setLoading(true);
    else if (type === 'PROFILE') setProfileLoading(true);
    else if (type === 'SIMILARITY') setProfileLoading(true); 
    else if (type === 'REPORT_URL') setProfileLoading(true); 
    else if (type === 'SETTINGS') setLoading(true); 
    else setKpiLoading(type);
    
    let bodyType = '';
    let bodyQuery = '';

    switch(type) {
      case 'MAIN': bodyType = 'SAVE_QUERY'; bodyQuery = query; break;
      case 'PROFILE': bodyType = 'SAVE_PROFILE_QUERY'; bodyQuery = profileQuery; break;
      case 'SIMILARITY': bodyType = 'SAVE_SIMILARITY_QUERY'; bodyQuery = similarityQuery; break;
      case 'REPORT_URL': bodyType = 'SAVE_REPORT_URL'; bodyQuery = reportBaseUrl; break;
      case 'KPI_TOTAL': bodyType = 'SAVE_KPI_TOTAL'; bodyQuery = kpiTotal; break;
      case 'KPI_24H': bodyType = 'SAVE_KPI_24H'; bodyQuery = kpi24h; break;
      case 'KPI_ASSINADOS': bodyType = 'SAVE_KPI_ASSINADOS'; bodyQuery = kpiAssinados; break;
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
                className="bg-background border border-blue-500 rounded px-3 py-1 text-xs font-bold text-foreground outline-none w-1/2 shadow-none"
                value={settings.title || defaultTitle || title}
                onChange={e => updateCardSetting(queryKey, 'title', e.target.value)}
              />
              <select 
                className="bg-background border border-blue-500 rounded px-2 py-1 text-[10px] text-foreground outline-none shadow-none"
                value={settings.color || 'from-blue-500 to-indigo-600'}
                onChange={e => updateCardSetting(queryKey, 'color', e.target.value)}
              >
                <option value="from-blue-500 to-indigo-600">Azul</option>
                <option value="from-emerald-500 to-teal-600">Verde</option>
                <option value="from-orange-500 to-red-600">Laranja</option>
                <option value="from-rose-500 to-orange-600">Rosa/Verm</option>
                <option value="from-indigo-500 to-purple-600">Roxo</option>
              </select>
               <button 
                onClick={() => saveSettings(enabledQueries, cardSettings)}
                className="p-1.5 bg-emerald-600 rounded text-foreground hover:bg-emerald-500 shadow-none"
              >
                <Check size={12}/>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h4 className="text-sm font-black text-foreground flex items-center gap-2 uppercase italic tracking-tighter">
                <Icon size={18} className="text-blue-600" />
                {displayTitle}
              </h4>
              <button 
                onClick={() => setEditingNative(queryKey)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-none -background text-muted hover:text-blue-600 transition-all border border-transparent -border"
              >
                <Settings2 size={12} />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => toggleQuery(queryKey)}
          className={`flex items-center gap-2 px-3 py-1 rounded-none text-[9px] font-black uppercase transition-all ${
            enabledQueries[queryKey] !== false 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-none ${enabledQueries[queryKey] !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
          {enabledQueries[queryKey] !== false ? 'Ativo' : 'Inativo'}
        </button>
      </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
        <p className="text-muted animate-pulse font-medium">Carregando consultas SQL...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card flex flex-col p-4 md:p-8 space-y-3 animate-in slide-in-from-bottom-5 duration-700 pb-12 text-foreground">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-2 gap-4">
        <div className="max-w-4xl">
          <PageHeader 
            title="Motor de Inteligência SQL"
            subtitle={`Gestão de algoritmos de extração e telemetria. Ambiente ativo: ${activeConnName}`}
            icon={Database}
          />
        </div>

        {message && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-none shadow-none border animate-in slide-in-from-top-4 duration-300 ${
            message.includes('Erro') 
              ? 'bg-rose-600 border-rose-500 text-foreground' 
              : 'bg-emerald-600 border-emerald-500 text-foreground'
          }`}>
            {message.includes('Erro') ? <CircleX size={18} /> : <CircleCheck size={18} className="animate-bounce" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              {message}
            </span>
          </div>
        )}
      </header>

      {/* Menu de Abas */}
      <div className="flex flex-wrap gap-2 border-b border-border mb-6">
        {[
          { id: 'instituicoes', label: 'Instituições', icon: <LayoutIcon size={14} /> },
          { id: 'nativas', label: 'Consultas Nativas', icon: <Settings2 size={14} /> },
          { id: 'python', label: 'Motores Python', icon: <Terminal size={14} /> },
          { id: 'downloads', label: 'Integrações & Scripts', icon: <Download size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-muted hover:text-foreground hover:border-slate-500'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'instituicoes' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
      {/* Mapeamento de Instituições (MV) */}
      <section className="bg-background p-6 border border-border rounded-none shadow-none mt-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground flex items-center gap-3 font-semibold">
            <LayoutIcon className="text-indigo-500" size={24} />
            Mapeamento de Instituições (MV)
          </h2>
          <div className="text-[10px] text-muted bg-card border border-border px-3 py-1 font-mono uppercase tracking-widest flex items-center gap-2">
            {loadingHospitals ? <Loader2 size={12} className="animate-spin text-indigo-400" /> : <Database size={12} className="text-indigo-400" />}
            {dbHospitals.length} Registros Encontrados
          </div>
        </div>
        <p className="text-muted text-sm mb-6 max-w-3xl leading-relaxed">
          Ative as empresas que farão parte do dashboard e defina a <strong className="text-foreground">Sigla</strong> que será exibida nas tabelas (ex: HSL, HSR). 
          As consultas usarão a variável <code className="text-indigo-400 bg-card px-1 font-mono text-xs">:EMPRESAS_ATIVAS</code> para injetar os IDs selecionados e <code className="text-indigo-400 bg-card px-1 font-mono text-xs">:DECODE_EMPRESAS</code> para a tradução das siglas.
        </p>

        {loadingHospitals ? (
          <div className="flex items-center justify-center p-8 bg-card border border-border">
            <Loader2 className="animate-spin text-indigo-500" size={24} />
          </div>
        ) : hospitalsError ? (
          <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500/20 text-red-400">
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
                <div key={hospital.CD_MULTI_EMPRESA} className={`flex flex-col gap-2 p-3 border rounded-none transition-colors duration-300 ${isAtivo ? 'bg-card border-indigo-500/50' : '-background border-border'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted bg-background px-1.5 py-0.5 border border-border">ID: {hospital.CD_MULTI_EMPRESA}</span>
                        <h3 className="text-sm font-semibold text-foreground truncate" title={hospital.NM_FANTASIA}>{hospital.NM_FANTASIA}</h3>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleHospitalActive(hospital)}
                      className={`shrink-0 w-10 h-5 relative flex items-center rounded-none transition-colors duration-300 ${isAtivo ? 'bg-indigo-500' : '-background'}`}
                    >
                      <div className={`w-3 h-3 bg-white absolute transition-transform duration-300 ${isAtivo ? 'translate-x-6' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted font-mono">SIGLA:</span>
                    <input 
                      type="text" 
                      value={sigla}
                      onChange={(e) => updateHospitalSigla(hospital, e.target.value)}
                      placeholder="Ex: HSL"
                      disabled={!isAtivo}
                      maxLength={10}
                      className={`flex-1 bg-background border p-1 text-xs font-bold text-center uppercase focus:outline-none transition-all ${isAtivo ? '-border text-indigo-300 focus:border-indigo-500' : 'border-border -muted opacity-50 cursor-not-allowed'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>

      <div className={activeTab === 'nativas' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
      {/* Grid de Configurações Existentes */}
      <h2 className="text-foreground flex items-center gap-3 pt-2">
        <Settings2 className="text-[var(--primary)]" size={24} />
        Algoritmos Nativos DocOracle
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Motor Principal (Tela Documentos) */}
        <div className="col-span-1 lg:col-span-2 bg-background rounded-none p-4 border border-border shadow-none relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-600"></div>
          <QueryHeader title="Query Principal (Tela Documentos)" queryKey="main" icon={Database} defaultTitle="Query Principal" />
          <textarea 
            className={`w-full h-48 bg-card border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none transition-all ${
              enabledQueries['main'] !== false ? 'border-border focus:border-[var(--primary)]' : 'border-border opacity-40 grayscale pointer-events-none'
            }`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-4">
            <AIQueryAssistant 
              currentQuery={query} 
              onApply={setQuery} 
              context="Consulta principal para alimentar a tabela da tela de Documentos" 
            />
            <button 
              onClick={() => handleSave('MAIN')}
              disabled={loading}
              title="Atualizar Motor SQL"
              className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* KPI: Total de Documentos */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-card"></div>
          <QueryHeader title="Volume Total Docs" queryKey="total" icon={FileText} defaultTitle="Volume Total" />
          <textarea 
            className={`w-full h-32 bg-card border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none transition-all ${
              enabledQueries['total'] !== false ? 'border-border focus:border-[var(--primary)]' : 'border-border opacity-40 grayscale pointer-events-none'
            }`}
            value={kpiTotal}
            onChange={(e) => setKpiTotal(e.target.value)}
          />
          <div className="flex justify-between items-center mt-4">
            <AIQueryAssistant 
              currentQuery={kpiTotal} 
              onApply={setKpiTotal} 
              context="Contagem total de documentos preenchidos no banco Oracle" 
            />
            <button 
              onClick={() => handleSave('KPI_TOTAL')}
              disabled={kpiLoading === 'KPI_TOTAL'}
              title="Atualizar Motor SQL"
              className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn"
            >
              {kpiLoading === 'KPI_TOTAL' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Produção 24h */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
          <QueryHeader title="Produção Snapshot" queryKey="prod24h" icon={Clock} defaultTitle="Produção 24h" />
          <textarea 
            className={`w-full h-32 bg-card border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none transition-all ${
              enabledQueries['prod24h'] !== false ? 'border-border focus:border-orange-500' : 'border-border opacity-40 grayscale pointer-events-none'
            }`}
            value={kpi24h}
            onChange={(e) => setKpi24h(e.target.value)}
          />
          <div className="flex justify-between items-center mt-4">
            <AIQueryAssistant 
              currentQuery={kpi24h} 
              onApply={setKpi24h} 
              context="Volume de documentos preenchidos nas últimas 24 horas no banco Oracle" 
            />
            <button onClick={() => handleSave('KPI_24H')} disabled={kpiLoading === 'KPI_24H'} title="Atualizar Motor Snapshot" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">{kpiLoading === 'KPI_24H' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>

        {/* Taxa de Assinatura */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <QueryHeader title="Taxa Compliance" queryKey="assinados" icon={TrendingUp} defaultTitle="Taxa Assinatura" />
          <textarea 
            className={`w-full h-32 bg-card border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none transition-all ${
              enabledQueries['assinados'] !== false ? 'border-border focus:border-emerald-500' : 'border-border opacity-40 grayscale pointer-events-none'
            }`}
             value={kpiAssinados}
             onChange={(e) => setKpiAssinados(e.target.value)}
          />
          <div className="flex justify-between items-center mt-4">
            <AIQueryAssistant 
              currentQuery={kpiAssinados} 
              onApply={setKpiAssinados} 
              context="Taxa de documentos assinados vs total preenchido (compliance clínico)" 
            />
            <button onClick={() => handleSave('KPI_ASSINADOS')} disabled={kpiLoading === 'KPI_ASSINADOS'} title="Atualizar Motor Compliance" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">{kpiLoading === 'KPI_ASSINADOS' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>

        {/* Volume 3 Meses */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
          <QueryHeader title="Timeline 90 Dias" queryKey="volume3m" icon={BarChart3} defaultTitle="Volume Global" />
          <textarea 
            className={`w-full h-32 bg-card border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none transition-all ${
              enabledQueries['volume3m'] !== false ? 'border-border focus:border-cyan-500' : 'border-border opacity-40 grayscale pointer-events-none'
            }`}
            value={kpiVolume3m}
            onChange={(e) => setKpiVolume3m(e.target.value)}
          />
          <div className="flex justify-between items-center mt-4">
            <AIQueryAssistant 
              currentQuery={kpiVolume3m} 
              onApply={setKpiVolume3m} 
              context="Série histórica de volume de documentos nos últimos 90 dias" 
            />
            <button onClick={() => handleSave('KPI_VOLUME3M')} disabled={kpiLoading === 'KPI_VOLUME3M'} title="Atualizar Motor Global" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">{kpiLoading === 'KPI_VOLUME3M' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4 pb-8">
        {/* Curva ABC Config */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <QueryHeader title="Analytics: Curva ABC de Documentação" queryKey="top10" icon={TrendingUp} defaultTitle="Ranking Top 10" />
          <textarea 
            className={`w-full h-48 bg-card border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none transition-all ${
              enabledQueries['top10'] !== false ? 'border-border focus:border-indigo-500' : 'border-border opacity-40 grayscale pointer-events-none'
            }`}
             value={kpiTop10}
             onChange={(e) => setKpiTop10(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
            <AIQueryAssistant 
              currentQuery={kpiTop10} 
              onApply={setKpiTop10} 
              context="Ranking dos 10 documentos mais utilizados (Curva ABC)" 
            />
            <button onClick={() => handleSave('KPI_TOP10')} disabled={kpiLoading === 'KPI_TOP10'} title="Salvar Algoritmo Analytics" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">{kpiLoading === 'KPI_TOP10' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>

        {/* Perfil Vinculado (Documentos Page) */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
          <h4 className="text-[10px] font-black text-foreground mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
            <Search size={14} className="text-emerald-600" />
            Motor de Reconciliação (Página de Documentos)
          </h4>
          <textarea 
            className={`w-full h-48 bg-card border border-border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none focus:border-emerald-500 transition-all`}
            value={profileQuery}
            onChange={(e) => setProfileQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
            <div className="flex flex-col">
              <p className="text-[10px] text-muted font-bold uppercase italic italic-wider">Variável Requerida: <b className="text-emerald-600">:CD_DOCUMENTO</b></p>
              <AIQueryAssistant 
                currentQuery={profileQuery} 
                onApply={setProfileQuery} 
                context="Busca de perfis de atendimento vinculados a um documento específico usando :CD_DOCUMENTO" 
              />
            </div>
            <button onClick={() => handleSave('PROFILE')} disabled={profileLoading} title="Salvar Motor de Vínculo" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Motor de Similaridade (Busca de Redundância) */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)]"></div>
          <h4 className="text-[10px] font-black text-foreground mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
            <ScanEye size={14} className="text-[var(--primary)]" />
            Motor de Auditoria de Similaridade (Redundância EMR)
          </h4>
          <textarea 
            className={`w-full h-48 bg-card border border-border rounded-none p-3 text-[11px] font-mono font-bold text-foreground focus:outline-none focus:border-[var(--primary)] transition-all`}
            value={similarityQuery}
            onChange={(e) => setSimilarityQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
            <p className="text-[10px] text-muted font-bold uppercase italic italic-wider">Variáveis Requeridas: <b className="text-[var(--primary)] text-[9px]">:CD_DOCUMENTO, :CD_CAMPO, :DATA_INI, :DATA_FIM</b></p>
            <button onClick={() => handleSave('SIMILARITY')} disabled={profileLoading} title="Salvar Motor de Auditoria" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>
      </div>
      </div>

      <div className={activeTab === 'downloads' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
      <div className="grid grid-cols-1 gap-4">
        {/* Configuração do Relatório Dinâmico MV */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden group mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full -background"></div>
          <h4 className="text-[10px] font-black text-foreground mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
            <Printer size={14} className="text-foreground" />
            Vínculo Report Web (Laudos PDF MV)
          </h4>
          <p className="text-[10px] text-muted font-bold mb-2">
            Defina a URL base para visualização remota dos documentos no portal MV.
          </p>
          <input 
            type="text"
            className={`w-full bg-card border border-border rounded-none px-4 py-2 text-[11px] font-mono font-bold text-foreground focus:outline-none -border transition-all`}
            value={reportBaseUrl}
            onChange={(e) => setReportBaseUrl(e.target.value)}
            placeholder="http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId="
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
            <p className="text-[10px] text-muted font-bold uppercase italic italic-wider">Será complementado por: <b className="text-foreground text-[9px]">+ CD_REGISTRO</b></p>
            <button onClick={() => handleSave('REPORT_URL')} disabled={profileLoading} title="Salvar URL do Laudo" className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Downloads de Infraestrutura SQL                              */}
        {/* ============================================================ */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400" />
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
                <Download size={18} className="text-foreground" />
                Downloads de Infraestrutura SQL
              </h4>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                Scripts necessários para provisionamento no Oracle DBAMV
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
            {[
              { 
                file: 'Create_Table_Siglario.sql', 
                label: 'Tabela de Siglario', 
                desc: 'DDL da TB_AUDITORIA_SIGLARIO',
                objKey: 'TB_AUDITORIA_SIGLARIO'
              },
              { 
                file: 'crate table auditoria_similaridade.sql', 
                label: 'Tabela de Similaridade', 
                desc: 'DDL da TB_AUDITORIA_SIMILARIDADE',
                objKey: 'TB_AUDITORIA_SIMILARIDADE'
              },
              { 
                file: 'Create_View_Similaridade.sql', 
                label: 'View de Extração', 
                desc: 'View V_AUDITORIA_COPIA_COLA',
                objKey: 'V_AUDITORIA_COPIA_COLA'
              }
            ].map((item) => {
              const isInstalled = dbObjectsStatus[item.objKey];
              const isExecuting = executingScript === item.file;
              
              return (
              <div key={item.file} className="flex flex-col p-3 bg-card border border-border rounded-none hover:border-slate-300 transition-all group shadow-none">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-none border border-border group-hover:text-blue-600 transition-colors">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700">{item.label}</h5>
                      <p className="text-[9px] text-muted font-medium italic mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  {checkingDbObjects ? (
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted -background px-2 py-1 rounded-none flex items-center gap-1">
                      <Loader2 size={8} className="animate-spin" /> ...
                    </span>
                  ) : isInstalled ? (
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-none flex items-center gap-1">
                      <CircleCheck size={9} /> Instalado
                    </span>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-none flex items-center gap-1">
                      Pendente
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-50">
                  <button 
                    onClick={() => handleExecuteScript(item.file)}
                    disabled={isExecuting || checkingDbObjects}
                    className={`flex-1 flex justify-center items-center gap-2 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-none border ${isInstalled ? 'bg-background text-muted border-border hover:border-slate-300' : 'bg-[var(--primary)] text-foreground border-[var(--primary)] hover:brightness-110'}`}
                  >
                    {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    {isInstalled ? 'Reinstalar' : 'Instalar'}
                  </button>
                  <a 
                    href={`/api/scripts/download?file=${encodeURIComponent(item.file)}`}
                    className="p-1.5 bg-background text-muted hover:text-blue-600 rounded-none border border-border transition-all"
                    title="Baixar Script"
                  >
                    <Download size={14} />
                  </a>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
      </div>

      <div className={activeTab === 'python' ? 'animate-in fade-in duration-300 block' : 'hidden'}>
      <div className="grid grid-cols-1 gap-4">
        {/* ============================================================ */}
        {/* Motor de Processamento Python                                  */}
        {/* ============================================================ */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-600 to-indigo-600" />
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] grayscale pointer-events-none">
            <Terminal size={160} />
          </div>

          <div className="flex justify-between items-start mb-5 relative z-10">
            <div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
                <Terminal size={18} className="text-violet-600" />
                Motor de Processamento Python
              </h4>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                Execução manual dos motores de auditoria NLP
              </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted bg-card px-3 py-1.5 rounded-none border border-border">
              <div className="w-1.5 h-1.5 rounded-none bg-emerald-400 animate-pulse" />
              Python {'{'}Runtime{'}'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {/* Motor Siglário */}
            {(['siglario', 'similaridade'] as const).map((script) => {
              const meta = {
                siglario: {
                  label: 'Auditoria de Siglário',
                  desc: 'Processar_Siglario.py',
                  detail: 'Detecta siglas não padronizadas nos documentos clínicos via NLP.',
                  color: 'from-orange-500 to-amber-500',
                  border: 'hover:border-orange-400',
                  btnColor: 'bg-orange-600 hover:bg-orange-500',
                  textColor: 'text-orange-600',
                },
                similaridade: {
                  label: 'Auditoria de Similaridade',
                  desc: 'Processar_Similaridade.py',
                  detail: 'Calcula grau de redundância textual entre documentos (PLN).',
                  color: 'from-[var(--primary)] to-indigo-500',
                  border: 'hover:border-blue-400',
                  btnColor: 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]',
                  textColor: 'text-[var(--primary)]',
                },
              }[script];

              const status = scriptStatus[script] || 'idle';
              const log = scriptLog[script] || '';
              const isRunning = scriptRunning === script;

              return (
                <div key={script} className={`bg-card rounded-none border border-border ${meta.border} transition-all overflow-hidden`}>
                  {/* Accent bar */}
                  <div className={`h-0.5 w-full bg-gradient-to-r ${meta.color}`} />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className={`text-[11px] font-black uppercase tracking-tighter ${meta.textColor}`}>{meta.label}</h5>
                        <p className="text-[9px] font-mono text-muted mt-0.5">{meta.desc}</p>
                      </div>
                      {/* Status Badge */}
                      {status === 'idle' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted -background px-2 py-1 rounded-none">Aguardando</span>
                      )}
                      {status === 'running' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-none flex items-center gap-1">
                          <Loader2 size={8} className="animate-spin" /> Executando
                        </span>
                      )}
                      {status === 'success' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-none flex items-center gap-1">
                          <CircleCheck size={9} /> Sucesso
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-none flex items-center gap-1">
                          <CircleX size={9} /> Erro
                        </span>
                      )}
                    </div>

                    <p className="text-[9px] text-muted font-bold mb-3 leading-relaxed">{meta.detail}</p>

                    {/* Log Terminal */}
                    <div className={`mt-3 transition-all duration-500 ${(log || isRunning) ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                      {/* Barra de Progresso */}
                      {isRunning && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)] animate-pulse">Processando Lotes...</span>
                            <span className="text-[9px] font-black text-foreground">{scriptProgress[script] || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full -accent rounded-none overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${meta.color} transition-all duration-500 ease-out`}
                              style={{ width: `${scriptProgress[script] || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                          <Terminal size={10} /> Console de Saída
                        </span>
                        {isRunning && (
                          <span className="flex gap-1">
                            <span className="w-1 h-1 rounded-none bg-emerald-500 animate-ping" />
                            <span className="w-1 h-1 rounded-none bg-emerald-500 animate-ping delay-75" />
                            <span className="w-1 h-1 rounded-none bg-emerald-500 animate-ping delay-150" />
                          </span>
                        )}
                      </div>
                      <div 
                        className="bg-card rounded-none p-3 max-h-48 overflow-y-auto border border-border shadow-none group/console"
                        ref={(el) => {
                          if (el && isRunning) {
                            el.scrollTop = el.scrollHeight;
                          }
                        }}
                      >
                        <pre className="text-[10px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap break-words">
                          {log || (isRunning ? '> Aguardando saída do motor...' : '')}
                        </pre>
                      </div>
                    </div>

                    {/* Run button */}
                    <button
                      onClick={() => handleRunScript(script)}
                      disabled={scriptRunning !== null}
                      className={`w-full flex items-center justify-center gap-2 ${meta.btnColor} text-foreground px-4 py-2.5 rounded-none text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-none disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isRunning ? (
                        <><Loader2 size={14} className="animate-spin" /> Processando...</>
                      ) : (
                        <><Play size={14} /> Executar Agora</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-4 text-center italic relative z-10">
            Parâmetros de janela e documento alvo são lidos do bloco abaixo.
          </p>
        </div>

        {/* Parâmetros Globais de Auditoria */}
        <div className="bg-background rounded-none p-4 border border-border shadow-none relative overflow-hidden group mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600"></div>
          <h4 className="text-[10px] font-black text-foreground mb-4 uppercase tracking-[0.3em] flex items-center gap-2">
            <ScanEye size={14} className="text-rose-600" />
            Parâmetros Globais de Auditoria (Motores Python)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1 block">Janela de Processamento (Dias)</label>
              <input 
                type="number"
                className="w-full bg-card border border-border rounded-none px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-all"
                value={auditDays}
                onChange={(e) => setAuditDays(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1 block">ID do Documento Alvo (Filtro)</label>
              <input 
                type="text"
                placeholder="Ex: 916 ou 916, 917"
                className="w-full bg-card border border-border rounded-none px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-all"
                value={auditDocId}
                onChange={(e) => setAuditDocId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-50">
            <button 
              onClick={() => handleSave('AUDIT_PARAMS')} 
              disabled={loading} 
              title="Salvar Parâmetros de Motor"
              className="flex items-center justify-center bg-card -background text-foreground p-2.5 rounded-none transition-all shadow-none group/btn"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
