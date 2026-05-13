"use client";

import { useState, useEffect } from 'react';
import { 
  Database, Play, Save, Info, AlertTriangle, RefreshCw, 
  Loader2, BarChart3, Search, TrendingUp, Users, Clock, 
  FileText, Plus, Trash2, Edit3, Check, X, Palette, 
  Settings2, LayoutIcon, ScanEye, Printer, Terminal, SquarePlay, CircleCheck, CircleX, Download, Sparkles
} from 'lucide-react';
import { AIQueryAssistant } from '@/components/AIQueryAssistant';

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
  
  // Custom Cards e Metadados
  const [customCards, setCustomCards] = useState<any[]>([]);
  const [cardSettings, setCardSettings] = useState<Record<string, any>>({});
  const [isAddingCard, setIsAddingCard] = useState(false);
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

  useEffect(() => {
    fetchData();
  }, []);

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
      
      const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
      if (active) setActiveConnName(active.name);
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

  async function handleSaveCustomCard() {
    try {
      const cardToSave = {
        ...(editingCard || newCard),
        id: editingCard ? editingCard.id : Date.now().toString(),
        order: editingCard ? editingCard.order : customCards.length
      };
      
      const res = await fetch('/api/dashboard/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardToSave)
      });
      if (!res.ok) throw new Error('Falha ao salvar card');
      
      setIsAddingCard(false);
      setEditingCard(null);
      setNewCard({
        title: '',
        query: '',
        type: 'kpi',
        icon: 'FileText',
        color: 'from-blue-500 to-indigo-600',
        enabled: true,
        valueType: 'number'
      });
      fetchData();
      setMessage('Card customizado salvo!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erro ao salvar card customizado.');
    }
  }

  async function handleDeleteCustomCard(id: string) {
    if (!confirm('Tem certeza que deseja excluir este card?')) return;
    try {
      const res = await fetch(`/api/dashboard/custom?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir card');
      
      setMessage('Card excluído com sucesso!');
      // Recarrega apenas os dados — sem reload de página completo
      await fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Erro ao excluir card: ${err.message}`);
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
                className="bg-white border border-blue-500 rounded px-3 py-1 text-xs font-bold text-slate-900 outline-none w-1/2 shadow-sm"
                value={settings.title || defaultTitle || title}
                onChange={e => updateCardSetting(queryKey, 'title', e.target.value)}
              />
              <select 
                className="bg-white border border-blue-500 rounded px-2 py-1 text-[10px] text-slate-900 outline-none shadow-sm"
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
                className="p-1.5 bg-emerald-600 rounded text-white hover:bg-emerald-500 shadow-md"
              >
                <Check size={12}/>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase italic tracking-tighter">
                <Icon size={18} className="text-blue-600" />
                {displayTitle}
              </h4>
              <button 
                onClick={() => setEditingNative(queryKey)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[var(--radius)] hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
              >
                <Settings2 size={12} />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => toggleQuery(queryKey)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${
            enabledQueries[queryKey] !== false 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${enabledQueries[queryKey] !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
          {enabledQueries[queryKey] !== false ? 'Ativo' : 'Inativo'}
        </button>
      </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
        <p className="text-slate-400 animate-pulse font-medium">Carregando consultas SQL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-5 duration-700 pb-12 text-slate-800">
      <header className="flex justify-between items-end border-b border-slate-200 pb-2">
        <div className="max-w-4xl">
          <h1 className="text-slate-900 flex items-center gap-3">
            <Database className="text-[var(--primary)]" size={32} />
            Motor de Inteligência SQL
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm tracking-tight">
            Gestão de algoritmos de extração e telemetria. Ambiente ativo: 
            <span className="text-[var(--primary)] font-black ml-2 uppercase italic tracking-widest bg-slate-100 px-3 py-1 border border-slate-200">{activeConnName}</span>
          </p>
        </div>

        {message && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
            message.includes('Erro') 
              ? 'bg-rose-600 border-rose-500 text-white' 
              : 'bg-emerald-600 border-emerald-500 text-white'
          }`}>
            {message.includes('Erro') ? <CircleX size={18} /> : <CircleCheck size={18} className="animate-bounce" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              {message}
            </span>
          </div>
        )}
      </header>


      {/* Grid de Configurações Existentes */}
      <h2 className="text-slate-900 flex items-center gap-3 pt-2">
        <Settings2 className="text-[var(--primary)]" size={24} />
        Algoritmos Nativos DocOracle
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KPI: Total de Documentos */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
          <QueryHeader title="Volume Total Docs" queryKey="total" icon={FileText} defaultTitle="Volume Total" />
          <textarea 
            className={`w-full h-32 bg-slate-50 border rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['total'] !== false ? 'border-slate-200 focus:border-[var(--primary)]' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
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
              className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn"
            >
              {kpiLoading === 'KPI_TOTAL' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Produção 24h */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
          <QueryHeader title="Produção Snapshot" queryKey="prod24h" icon={Clock} defaultTitle="Produção 24h" />
          <textarea 
            className={`w-full h-32 bg-slate-50 border rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['prod24h'] !== false ? 'border-slate-200 focus:border-orange-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
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
            <button onClick={() => handleSave('KPI_24H')} disabled={kpiLoading === 'KPI_24H'} title="Atualizar Motor Snapshot" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">{kpiLoading === 'KPI_24H' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>

        {/* Taxa de Assinatura */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <QueryHeader title="Taxa Compliance" queryKey="assinados" icon={TrendingUp} defaultTitle="Taxa Assinatura" />
          <textarea 
            className={`w-full h-32 bg-slate-50 border rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['assinados'] !== false ? 'border-slate-200 focus:border-emerald-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
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
            <button onClick={() => handleSave('KPI_ASSINADOS')} disabled={kpiLoading === 'KPI_ASSINADOS'} title="Atualizar Motor Compliance" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">{kpiLoading === 'KPI_ASSINADOS' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>

        {/* Volume 3 Meses */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
          <QueryHeader title="Timeline 90 Dias" queryKey="volume3m" icon={BarChart3} defaultTitle="Volume Global" />
          <textarea 
            className={`w-full h-32 bg-slate-50 border rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['volume3m'] !== false ? 'border-slate-200 focus:border-cyan-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
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
            <button onClick={() => handleSave('KPI_VOLUME3M')} disabled={kpiLoading === 'KPI_VOLUME3M'} title="Atualizar Motor Global" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">{kpiLoading === 'KPI_VOLUME3M' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4 pb-8">
        {/* Curva ABC Config */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <QueryHeader title="Analytics: Curva ABC de Documentação" queryKey="top10" icon={TrendingUp} defaultTitle="Ranking Top 10" />
          <textarea 
            className={`w-full h-48 bg-slate-50 border rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['top10'] !== false ? 'border-slate-200 focus:border-indigo-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
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
            <button onClick={() => handleSave('KPI_TOP10')} disabled={kpiLoading === 'KPI_TOP10'} title="Salvar Algoritmo Analytics" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">{kpiLoading === 'KPI_TOP10' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}</button>
          </div>
        </div>

        {/* Perfil Vinculado (Documentos Page) */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
          <h4 className="text-[10px] font-black text-slate-900 mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
            <Search size={14} className="text-emerald-600" />
            Motor de Reconciliação (Página de Documentos)
          </h4>
          <textarea 
            className={`w-full h-48 bg-slate-50 border border-slate-200 rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none focus:border-emerald-500 transition-all`}
            value={profileQuery}
            onChange={(e) => setProfileQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
            <div className="flex flex-col">
              <p className="text-[10px] text-slate-400 font-bold uppercase italic italic-wider">Variável Requerida: <b className="text-emerald-600">:CD_DOCUMENTO</b></p>
              <AIQueryAssistant 
                currentQuery={profileQuery} 
                onApply={setProfileQuery} 
                context="Busca de perfis de atendimento vinculados a um documento específico usando :CD_DOCUMENTO" 
              />
            </div>
            <button onClick={() => handleSave('PROFILE')} disabled={profileLoading} title="Salvar Motor de Vínculo" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Motor de Similaridade (Busca de Redundância) */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)]"></div>
          <h4 className="text-[10px] font-black text-slate-900 mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
            <ScanEye size={14} className="text-[var(--primary)]" />
            Motor de Auditoria de Similaridade (Redundância EMR)
          </h4>
          <textarea 
            className={`w-full h-48 bg-slate-50 border border-slate-200 rounded-[var(--radius)] p-3 text-[11px] font-mono font-bold text-slate-600 focus:outline-none focus:border-[var(--primary)] transition-all`}
            value={similarityQuery}
            onChange={(e) => setSimilarityQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-bold uppercase italic italic-wider">Variáveis Requeridas: <b className="text-[var(--primary)] text-[9px]">:CD_DOCUMENTO, :CD_CAMPO, :DATA_INI, :DATA_FIM</b></p>
            <button onClick={() => handleSave('SIMILARITY')} disabled={profileLoading} title="Salvar Motor de Auditoria" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Configuração do Relatório Dinâmico MV */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden group mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
          <h4 className="text-[10px] font-black text-slate-900 mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
            <Printer size={14} className="text-slate-800" />
            Vínculo Report Web (Laudos PDF MV)
          </h4>
          <p className="text-[10px] text-slate-400 font-bold mb-2">
            Defina a URL base para visualização remota dos documentos no portal MV.
          </p>
          <input 
            type="text"
            className={`w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-2 text-[11px] font-mono font-bold text-slate-600 focus:outline-none focus:border-slate-800 transition-all`}
            value={reportBaseUrl}
            onChange={(e) => setReportBaseUrl(e.target.value)}
            placeholder="http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId="
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-bold uppercase italic italic-wider">Será complementado por: <b className="text-slate-800 text-[9px]">+ CD_REGISTRO</b></p>
            <button onClick={() => handleSave('REPORT_URL')} disabled={profileLoading} title="Salvar URL do Laudo" className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Downloads de Infraestrutura SQL                              */}
        {/* ============================================================ */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400" />
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
                <Download size={18} className="text-slate-600" />
                Downloads de Infraestrutura SQL
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Scripts necessários para provisionamento no Oracle DBAMV
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
            {[
              { 
                file: 'Create_Table_Siglario.sql', 
                label: 'Tabela de Siglario', 
                desc: 'DDL da TB_AUDITORIA_SIGLARIO' 
              },
              { 
                file: 'crate table auditoria_similaridade.sql', 
                label: 'Tabela de Similaridade', 
                desc: 'DDL da TB_AUDITORIA_SIMILARIDADE' 
              },
              { 
                file: 'Create_View_Similaridade.sql', 
                label: 'View de Extração', 
                desc: 'View V_AUDITORIA_COPIA_COLA' 
              }
            ].map((item) => (
              <a 
                key={item.file}
                href={`/api/scripts/download?file=${encodeURIComponent(item.file)}`}
                className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-[var(--radius)] hover:border-slate-300 hover:bg-white transition-all group shadow-sm"
              >
                <div className="p-2 bg-white rounded-lg border border-slate-100 group-hover:text-blue-600 transition-colors">
                  <FileText size={16} />
                </div>
                <div>
                  <h5 className="text-[10px] font-black uppercase text-slate-700">{item.label}</h5>
                  <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">{item.desc}</p>
                </div>
                <Download size={12} className="ml-auto text-slate-300 group-hover:text-blue-600 transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* Motor de Processamento Python                                  */}
        {/* ============================================================ */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-600 to-indigo-600" />
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] grayscale pointer-events-none">
            <Terminal size={160} />
          </div>

          <div className="flex justify-between items-start mb-5 relative z-10">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
                <Terminal size={18} className="text-violet-600" />
                Motor de Processamento Python
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Execução manual dos motores de auditoria NLP
              </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                <div key={script} className={`bg-slate-50 rounded-[var(--radius)] border border-slate-200 ${meta.border} transition-all overflow-hidden`}>
                  {/* Accent bar */}
                  <div className={`h-0.5 w-full bg-gradient-to-r ${meta.color}`} />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className={`text-[11px] font-black uppercase tracking-tighter ${meta.textColor}`}>{meta.label}</h5>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{meta.desc}</p>
                      </div>
                      {/* Status Badge */}
                      {status === 'idle' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Aguardando</span>
                      )}
                      {status === 'running' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full flex items-center gap-1">
                          <Loader2 size={8} className="animate-spin" /> Executando
                        </span>
                      )}
                      {status === 'success' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full flex items-center gap-1">
                          <CircleCheck size={9} /> Sucesso
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full flex items-center gap-1">
                          <CircleX size={9} /> Erro
                        </span>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-500 font-bold mb-3 leading-relaxed">{meta.detail}</p>

                    {/* Log Terminal */}
                    <div className={`mt-3 transition-all duration-500 ${(log || isRunning) ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                      {/* Barra de Progresso */}
                      {isRunning && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)] animate-pulse">Processando Lotes...</span>
                            <span className="text-[9px] font-black text-slate-600">{scriptProgress[script] || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${meta.color} transition-all duration-500 ease-out`}
                              style={{ width: `${scriptProgress[script] || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          <Terminal size={10} /> Console de Saída
                        </span>
                        {isRunning && (
                          <span className="flex gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping delay-75" />
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping delay-150" />
                          </span>
                        )}
                      </div>
                      <div 
                        className="bg-slate-900 rounded-[var(--radius)] p-3 max-h-48 overflow-y-auto border border-slate-800 shadow-inner group/console"
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
                      className={`w-full flex items-center justify-center gap-2 ${meta.btnColor} text-white px-4 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isRunning ? (
                        <><Loader2 size={14} className="animate-spin" /> Processando...</>
                      ) : (
                        <><SquarePlay size={14} /> Executar Agora</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 text-center italic relative z-10">
            Parâmetros de janela e documento alvo são lidos do bloco abaixo.
          </p>
        </div>

        {/* Parâmetros Globais de Auditoria */}
        <div className="bg-white rounded-[var(--radius)] p-4 border border-slate-200 shadow-sm relative overflow-hidden group mt-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600"></div>
          <h4 className="text-[10px] font-black text-slate-900 mb-4 uppercase tracking-[0.3em] flex items-center gap-2">
            <ScanEye size={14} className="text-rose-600" />
            Parâmetros Globais de Auditoria (Motores Python)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Janela de Processamento (Dias)</label>
              <input 
                type="number"
                className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-all"
                value={auditDays}
                onChange={(e) => setAuditDays(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">ID do Documento Alvo (Filtro)</label>
              <input 
                type="text"
                placeholder="Ex: 916 ou 916, 917"
                className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-3 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-all"
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
              className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-[var(--radius)] transition-all shadow-md group/btn"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover/btn:scale-110 transition-transform" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
