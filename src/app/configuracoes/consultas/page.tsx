"use client";

import { useState, useEffect } from 'react';
import { 
  Database, Play, Save, Info, AlertTriangle, RefreshCw, 
  Loader2, BarChart3, Search, TrendingUp, Users, Clock, 
  FileText, Plus, Trash2, Edit3, Check, X, Palette, 
  Settings2, LayoutIcon, ScanEye
} from 'lucide-react';

export default function ConfigConsultasPage() {
  // Queries Padrão
  const [query, setQuery] = useState('');
  const [profileQuery, setProfileQuery] = useState('');
  const [similarityQuery, setSimilarityQuery] = useState('');
  const [kpiTotal, setKpiTotal] = useState('');
  const [kpi24h, setKpi24h] = useState('');
  const [kpiAssinados, setKpiAssinados] = useState('');
  const [kpiTop10, setKpiTop10] = useState('');
  const [kpiIdle, setKpiIdle] = useState('');
  const [kpiVolume3m, setKpiVolume3m] = useState('');
  const [kpiUnitAdherence, setKpiUnitAdherence] = useState('');
  const [kpiUnitInactivity, setKpiUnitInactivity] = useState('');
  
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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsInitialLoading(true);
    try {
      const res = await fetch('/api/connections');
      const storage = await res.json();
      setQuery(storage.activeQuery || '');
      setProfileQuery(storage.profileQuery || '');
      setSimilarityQuery(storage.similarityQuery || '');
      
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

  async function handleSave(type: 'MAIN' | 'PROFILE' | 'KPI_TOTAL' | 'KPI_24H' | 'KPI_ASSINADOS' | 'KPI_TOP10' | 'KPI_IDLE' | 'KPI_VOLUME3M' | 'KPI_UNIT_ADHERENCE' | 'KPI_UNIT_INACTIVITY' | 'SETTINGS') {
    if (type === 'MAIN') setLoading(true);
    else if (type === 'PROFILE') setProfileLoading(true);
    else if (type === 'SIMILARITY') setProfileLoading(true); // Reuso profileLoading ou outro estado se preferir
    else if (type === 'SETTINGS') setLoading(true); // Reuso loading para settings
    else setKpiLoading(type);
    
    let bodyType = '';
    let bodyQuery = '';

    switch(type) {
      case 'MAIN': bodyType = 'SAVE_QUERY'; bodyQuery = query; break;
      case 'PROFILE': bodyType = 'SAVE_PROFILE_QUERY'; bodyQuery = profileQuery; break;
      case 'SIMILARITY': bodyType = 'SAVE_SIMILARITY_QUERY'; bodyQuery = similarityQuery; break;
      case 'KPI_TOTAL': bodyType = 'SAVE_KPI_TOTAL'; bodyQuery = kpiTotal; break;
      case 'KPI_24H': bodyType = 'SAVE_KPI_24H'; bodyQuery = kpi24h; break;
      case 'KPI_ASSINADOS': bodyType = 'SAVE_KPI_ASSINADOS'; bodyQuery = kpiAssinados; break;
      case 'KPI_TOP10': bodyType = 'SAVE_KPI_TOP10'; bodyQuery = kpiTop10; break;
      case 'KPI_IDLE': bodyType = 'SAVE_KPI_IDLE'; bodyQuery = kpiIdle; break;
      case 'KPI_VOLUME3M': bodyType = 'SAVE_KPI_VOLUME3M'; bodyQuery = kpiVolume3m; break;
      case 'KPI_UNIT_ADHERENCE': bodyType = 'SAVE_KPI_UNIT_ADHERENCE'; bodyQuery = kpiUnitAdherence; break;
      case 'KPI_UNIT_INACTIVITY': bodyType = 'SAVE_KPI_UNIT_INACTIVITY'; bodyQuery = kpiUnitInactivity; break;
      case 'SETTINGS': bodyType = 'SAVE_SETTINGS'; break;
    }
    
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        body: JSON.stringify({ 
          type: bodyType, 
          query: bodyQuery,
          enabledQueries,
          cardSettings
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
    console.log('Frontend: Solicitando exclusão do card:', id);
    try {
      const res = await fetch(`/api/dashboard/custom?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      console.log('Frontend: Resposta da exclusão:', data);
      
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir card');
      
      setMessage('Card excluído com sucesso!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Frontend: Erro ao excluir card:', err);
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
    <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-700 pb-24 text-slate-800">
      <header className="flex justify-between items-end border-b border-slate-200 pb-8">
        <div className="max-w-4xl">
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic tracking-tighter">
            <Database className="text-[var(--primary)]" size={32} />
            Motor de Inteligência SQL
          </h2>
          <p className="text-slate-500 mt-1 font-medium text-sm tracking-tight">
            Gestão de algoritmos de extração e telemetria. Ambiente ativo: 
            <span className="text-[var(--primary)] font-black ml-2 uppercase italic tracking-widest bg-slate-100 px-3 py-1 border border-slate-200">{activeConnName}</span>
          </p>
        </div>

        {message && (
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-[var(--radius)] shadow-xl animate-in zoom-in duration-300 text-[10px] font-black uppercase tracking-widest">
            {message}
          </div>
        )}
      </header>

      {/* Seção de Cards Customizados */}
      <section className="bg-white border border-slate-200 rounded-[var(--radius)] p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] grayscale pointer-events-none">
          <Palette size={160} />
        </div>
        
        <div className="flex justify-between items-center mb-10 relative z-10">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase italic">
              <LayoutIcon className="text-blue-600" size={24} />
              Indicadores Customizados (KPI/Analytics)
            </h3>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Expansão de telemetria via queries dinâmicas</p>
          </div>
          <button 
            onClick={() => setIsAddingCard(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg"
          >
            <Plus size={16} />
            Provisionar Card
          </button>
        </div>

        {(isAddingCard || editingCard) && (
          <div className="mb-10 p-8 bg-slate-50 border border-slate-200 rounded-[var(--radius)] relative animate-in zoom-in-98 duration-500 shadow-inner">
            <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.3em] border-b border-slate-200 pb-3">
              {editingCard ? 'Modificar Registro de Card' : 'Configurar Novo Ativo de Telemetria'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block">Identificação Visual</label>
                <input 
                  type="text" 
                  placeholder="Ex: TAXA DE OCUPAÇÃO" 
                  className="bg-white border border-slate-200 rounded-[var(--radius)] px-4 py-3 text-[11px] font-bold text-slate-900 focus:border-blue-500 outline-none w-full shadow-sm"
                  value={editingCard ? editingCard.title : newCard.title}
                  onChange={e => editingCard ? setEditingCard({...editingCard, title: e.target.value}) : setNewCard({...newCard, title: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block">Símbolo</label>
                  <select 
                    className="bg-white border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-[11px] font-bold text-slate-900 focus:border-blue-600 outline-none w-full"
                    value={editingCard ? editingCard.icon : newCard.icon}
                    onChange={e => editingCard ? setEditingCard({...editingCard, icon: e.target.value}) : setNewCard({...newCard, icon: e.target.value})}
                  >
                    <option value="FileText">DADOS TXT</option>
                    <option value="Users">VETOR USUÁRIOS</option>
                    <option value="Activity">PULSO ATIVIDADE</option>
                    <option value="TrendingUp">VETOR TENDÊNCIA</option>
                    <option value="AlertTriangle">ALERTA CRÍTICO</option>
                  </select>
                </div>
                <div className="flex-1">
                   <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block">Formatação</label>
                   <select 
                    className="bg-white border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-[11px] font-bold text-slate-900 focus:border-blue-600 outline-none w-full"
                    value={editingCard ? (editingCard.valueType || 'number') : newCard.valueType}
                    onChange={e => editingCard ? setEditingCard({...editingCard, valueType: e.target.value}) : setNewCard({...newCard, valueType: e.target.value})}
                  >
                    <option value="number">QUANTIDADE ABSOLUTA</option>
                    <option value="percent">PERCENTUAL (%)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 block">Código SQL de Extração</label>
              <textarea 
                placeholder="SELECT COUNT(*) AS TOTAL FROM ..." 
                className="bg-white border border-slate-200 rounded-[var(--radius)] px-6 py-6 text-[11px] font-mono font-bold text-slate-700 focus:border-blue-500 outline-none w-full h-40 shadow-inner"
                value={editingCard ? editingCard.query : newCard.query}
                onChange={e => editingCard ? setEditingCard({...editingCard, query: e.target.value}) : setNewCard({...newCard, query: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 items-center pt-4 border-t border-slate-200">
              <button 
                onClick={() => { setIsAddingCard(false); setEditingCard(null); }}
                className="px-6 py-2.5 text-[10px] font-black text-slate-400 hover:text-rose-600 transition-all uppercase tracking-widest"
              >
                Abortar
              </button>
              <button 
                onClick={handleSaveCustomCard}
                className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg"
              >
                <Check size={16} />
                Confirmar Implantação
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {customCards.map(card => (
            <div key={card.id} className="p-6 rounded-[var(--radius)] bg-slate-50 border border-slate-100 hover:border-[var(--primary)] transition-all flex flex-col justify-between group shadow-sm">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-[var(--radius)] bg-white border border-slate-200 text-slate-900 shadow-sm`}>
                   <BarChart3 size={20} className="text-blue-600" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingCard(card)} className="p-2 hover:bg-white rounded-[var(--radius)] text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100"><Edit3 size={16}/></button>
                    <button onClick={() => handleDeleteCustomCard(card.id)} className="p-2 hover:bg-rose-50 rounded-[var(--radius)] text-slate-300 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"><Trash2 size={16}/></button>
                  </div>
                </div>
                <h4 className="text-slate-900 font-black text-sm uppercase tracking-tighter italic mb-3">{card.title}</h4>
                <div className="text-[10px] text-slate-400 font-mono truncate bg-white p-3 rounded-[var(--radius)] border border-slate-100 font-bold">
                  {card.query}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center px-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">User Defined KPI</span>
                <div className={`w-2 h-2 rounded-none ${card.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
            </div>
          ))}
          {customCards.length === 0 && !isAddingCard && (
            <div className="col-span-full py-20 text-center border-4 border-dotted border-slate-100 rounded-[var(--radius)] bg-slate-50/50">
              <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.4em] italic mb-2">Namespace de telemetria vazio</p>
              <p className="text-slate-400 text-[10px] font-medium italic">Provisione um novo card para expandir a telemetria do dashboard.</p>
            </div>
          )}
        </div>
      </section>

      {/* Grid de Configurações Existentes */}
      <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 pt-12 uppercase italic tracking-tighter">
        <Settings2 className="text-[var(--primary)]" size={24} />
        Algoritmos Nativos DocOracle
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KPI: Total de Documentos */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900"></div>
          <QueryHeader title="Volume Total Docs" queryKey="total" icon={FileText} defaultTitle="Volume Total" />
          <textarea 
            className={`w-full h-40 bg-slate-50 border rounded-[var(--radius)] p-6 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['total'] !== false ? 'border-slate-200 focus:border-[var(--primary)]' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
            }`}
            value={kpiTotal}
            onChange={(e) => setKpiTotal(e.target.value)}
          />
          <div className="flex justify-end mt-6">
            <button 
              onClick={() => handleSave('KPI_TOTAL')}
              disabled={kpiLoading === 'KPI_TOTAL'}
              className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              {kpiLoading === 'KPI_TOTAL' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Atualizar Motor
            </button>
          </div>
        </div>

        {/* Produção 24h */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
          <QueryHeader title="Produção Snapshot" queryKey="prod24h" icon={Clock} defaultTitle="Produção 24h" />
          <textarea 
            className={`w-full h-40 bg-slate-50 border rounded-[var(--radius)] p-6 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['prod24h'] !== false ? 'border-slate-200 focus:border-orange-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
            }`}
            value={kpi24h}
            onChange={(e) => setKpi24h(e.target.value)}
          />
          <div className="flex justify-end mt-6">
            <button onClick={() => handleSave('KPI_24H')} disabled={kpiLoading === 'KPI_24H'} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all"><Save size={16} /> Atualizar Motor</button>
          </div>
        </div>

        {/* Taxa de Assinatura */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <QueryHeader title="Taxa Compliance" queryKey="assinados" icon={TrendingUp} defaultTitle="Taxa Assinatura" />
          <textarea 
            className={`w-full h-40 bg-slate-50 border rounded-[var(--radius)] p-6 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['assinados'] !== false ? 'border-slate-200 focus:border-emerald-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
            }`}
             value={kpiAssinados}
             onChange={(e) => setKpiAssinados(e.target.value)}
          />
          <div className="flex justify-end mt-6">
            <button onClick={() => handleSave('KPI_ASSINADOS')} disabled={kpiLoading === 'KPI_ASSINADOS'} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all"><Save size={16} /> Atualizar Motor</button>
          </div>
        </div>

        {/* Volume 3 Meses */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
          <QueryHeader title="Timeline 90 Dias" queryKey="volume3m" icon={BarChart3} defaultTitle="Volume Global" />
          <textarea 
            className={`w-full h-40 bg-slate-50 border rounded-[var(--radius)] p-6 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['volume3m'] !== false ? 'border-slate-200 focus:border-cyan-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
            }`}
            value={kpiVolume3m}
            onChange={(e) => setKpiVolume3m(e.target.value)}
          />
          <div className="flex justify-end mt-6">
            <button onClick={() => handleSave('KPI_VOLUME3M')} disabled={kpiLoading === 'KPI_VOLUME3M'} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all"><Save size={16} /> Atualizar Motor</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 mt-12 pb-16">
        {/* Curva ABC Config */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <QueryHeader title="Analytics: Curva ABC de Documentação" queryKey="top10" icon={TrendingUp} defaultTitle="Ranking Top 10" />
          <textarea 
            className={`w-full h-60 bg-slate-50 border rounded-[var(--radius)] p-8 text-[11px] font-mono font-bold text-slate-600 focus:outline-none transition-all ${
              enabledQueries['top10'] !== false ? 'border-slate-200 focus:border-indigo-500' : 'border-slate-100 opacity-40 grayscale pointer-events-none'
            }`}
            value={kpiTop10}
            onChange={(e) => setKpiTop10(e.target.value)}
          />
          <div className="flex justify-end mt-8 border-t border-slate-50 pt-6">
            <button onClick={() => handleSave('KPI_TOP10')} disabled={kpiLoading === 'KPI_TOP10'} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all"><Save size={16} /> Salvar Algoritmo Analytics</button>
          </div>
        </div>

        {/* Perfil Vinculado (Documentos Page) */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600"></div>
          <h4 className="text-[10px] font-black text-slate-900 mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
            <Search size={14} className="text-emerald-600" />
            Motor de Reconciliação (Página de Documentos)
          </h4>
          <textarea 
            className={`w-full h-60 bg-slate-50 border border-slate-200 rounded-[var(--radius)] p-8 text-[11px] font-mono font-bold text-slate-600 focus:outline-none focus:border-emerald-500 transition-all`}
            value={profileQuery}
            onChange={(e) => setProfileQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-8 border-t border-slate-50 pt-6">
            <p className="text-[10px] text-slate-400 font-bold uppercase italic italic-wider">Variável Requerida: <b className="text-emerald-600">:CD_DOCUMENTO</b></p>
            <button onClick={() => handleSave('PROFILE')} disabled={profileLoading} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Motor de Vínculo
            </button>
          </div>
        </div>

        {/* Motor de Similaridade (Busca de Redundância) */}
        <div className="bg-white rounded-[var(--radius)] p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)]"></div>
          <h4 className="text-[10px] font-black text-slate-900 mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
            <ScanEye size={14} className="text-[var(--primary)]" />
            Motor de Auditoria de Similaridade (Redundância EMR)
          </h4>
          <textarea 
            className={`w-full h-60 bg-slate-50 border border-slate-200 rounded-[var(--radius)] p-8 text-[11px] font-mono font-bold text-slate-600 focus:outline-none focus:border-[var(--primary)] transition-all`}
            value={similarityQuery}
            onChange={(e) => setSimilarityQuery(e.target.value)}
          />
          <div className="flex justify-between items-center mt-8 border-t border-slate-50 pt-6">
            <p className="text-[10px] text-slate-400 font-bold uppercase italic italic-wider">Variáveis Requeridas: <b className="text-[var(--primary)] text-[9px]">:CD_DOCUMENTO, :CD_CAMPO, :DATA_INI, :DATA_FIM</b></p>
            <button onClick={() => handleSave('SIMILARITY')} disabled={profileLoading} className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all">
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Motor de Auditoria
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
