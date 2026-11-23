"use client";

import { useState, useEffect } from 'react';
import { Settings, Database, Plus, Trash2, Edit2, Check, FlaskConical, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUI } from '@/context/UIContext';

interface DbConnection {
  id: string;
  name: string;
  user: string;
  password?: string;
  connectString: string;
}

export default function ConfigConexoesPage() {
  const { confirmAction } = useUI();
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DbConnection>>({
    name: '',
    user: '',
    password: '',
    connectString: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [clientPath, setClientPath] = useState('');

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    const res = await fetch('/api/connections');
    const data = await res.json();
    setConnections(data.connections || []);
    setActiveId(data.activeConnectionId);
    setClientPath(data.oracleClientPath || '');
  }

  async function handleSave() {
    if (!formData.name || !formData.connectString) return;
    setLoading(true);
    const conn: DbConnection = {
      id: formData.id || Math.random().toString(36).substr(2, 9),
      name: formData.name,
      user: formData.user || '',
      password: formData.password || '',
      connectString: formData.connectString,
    };

    await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SAVE_CONNECTION', connection: conn }),
    });

    setFormData({ name: '', user: '', password: '', connectString: '' });
    fetchConnections();
    setLoading(false);
    setMessage('Conexão salva com sucesso!');
    setTimeout(() => setMessage(''), 3000);
  }

  async function setActive(id: string) {
    await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SET_ACTIVE', id }),
    });
    setActiveId(id);
    
    // Limpa o cache do navegador para forçar que os dashboards busquem novos dados
    sessionStorage.clear();
    setMessage('Conexão ativada e cache limpo!');
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmAction({
      title: 'Excluir Conexão Oracle',
      description: 'Tem certeza que deseja excluir esta conexão salva?',
      confirmLabel: 'Excluir Conexão',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DELETE_CONNECTION', id }),
      });
      
      if (!res.ok) throw new Error('Falha na resposta do servidor');
      
      const data = await res.json();
      setConnections(data.connections || []);
      setActiveId(data.activeConnectionId);
      setMessage('Conexão removida com sucesso');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Erro ao deletar conexão:', err);
      setMessage('Erro ao deletar!');
    }
  }

  async function testConn(id: string) {
    setMessage('Testando conexão...');
    await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SET_ACTIVE', id }),
    });
    const res = await fetch('/api/oracle/execute', {
      method: 'POST',
      body: JSON.stringify({ type: 'TEST' }),
    });
    const result = await res.json();
    if (result.success) {
      setMessage('✅ Conexão bem-sucedida!');
    } else {
      setMessage(`❌ Erro: ${result.error}`);
    }
  }

  async function handleSaveClientPath() {
    setLoading(true);
    await fetch('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ type: 'SAVE_CLIENT_PATH', path: clientPath }),
    });
    setLoading(false);
    setMessage('Caminho do Client salvo! Reinicie a aplicação para aplicar.');
    setTimeout(() => setMessage(''), 5000);
  }

  return (
    <div className="flex flex-col space-y-5">
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[#E0ECE9]">
        <PageHeader 
          title="Infraestrutura Oracle"
          subtitle="Gerenciamento de instâncias e conectividade thick-mode para ambientes DBAMV"
          icon={Settings}
          action={
            message ? (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-semibold shadow-2xs">
                {message}
              </div>
            ) : undefined
          }
        />
      </div>

      <div className="bg-white border border-[#E0ECE9] rounded-2xl p-6 shadow-2xs max-w-3xl">
        <h4 className="text-[11px] font-bold text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Database size={14} className="text-[#074E52]" />
          Oracle Client Path (Thick Mode)
        </h4>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Ex: C:\instantclient_23_0"
            className="flex-1 bg-[#F7FAF9] border border-[#D5E4E0] rounded-xl px-4 py-2 text-xs text-[#0F2426] placeholder:text-slate-400 outline-none focus:border-[#074E52] focus:bg-white transition-all font-mono"
            value={clientPath}
            onChange={e => setClientPath(e.target.value)}
          />
          <button 
            onClick={handleSaveClientPath}
            className="bg-[#074E52] hover:bg-[#053A3D] text-white text-xs font-semibold px-5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Configurar
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2.5 flex items-center gap-2 font-medium">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          A alteração do binário exige reinicialização do serviço Node.js / Next.js
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form para Nova Conexão */}
        <div className="bg-white rounded-2xl p-6 h-fit border border-[#E0ECE9] shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#074E52]"></div>
          <h3 className="text-base font-bold text-[#0F2426] mb-5 flex items-center gap-2.5 tracking-tight border-b border-[#E0ECE9] pb-3.5">
            <Plus size={18} className="text-[#074E52]" />
            {formData.id ? 'Modificar Registro' : 'Novo Ambiente'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-600 font-semibold block mb-1.5">Nome do Ambiente</label>
              <input 
                type="text" 
                placeholder="PRODUÇÃO / HOMOLOG"
                autoComplete="off"
                className="w-full bg-[#F7FAF9] border border-[#D5E4E0] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#0F2426] placeholder:text-slate-400 focus:border-[#074E52] focus:bg-white outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-semibold block mb-1.5">DB User</label>
              <input 
                type="text" 
                placeholder="System / Dbamv"
                autoComplete="off"
                className="w-full bg-[#F7FAF9] border border-[#D5E4E0] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#0F2426] placeholder:text-slate-400 focus:border-[#074E52] focus:bg-white outline-none transition-all font-mono"
                value={formData.user}
                onChange={e => setFormData({...formData, user: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-semibold block mb-1.5">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-[#F7FAF9] border border-[#D5E4E0] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#0F2426] placeholder:text-slate-400 focus:border-[#074E52] focus:bg-white outline-none transition-all"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-semibold block mb-1.5">Connect String (Oracle Service)</label>
              <input 
                type="text" 
                placeholder="host:port/service_name"
                autoComplete="off"
                className="w-full bg-[#F7FAF9] border border-[#D5E4E0] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[#0F2426] placeholder:text-slate-400 focus:border-[#074E52] focus:bg-white outline-none transition-all font-mono"
                value={formData.connectString}
                onChange={e => setFormData({...formData, connectString: e.target.value})}
              />
            </div>
            <div className="flex gap-2 pt-3">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-[#074E52] hover:bg-[#053A3D] text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processando...' : formData.id ? 'Salvar Alterações' : 'Registrar Conexão'}
              </button>
              {formData.id && (
                <button 
                  onClick={() => setFormData({ name: '', user: '', password: '', connectString: '' })}
                  className="bg-[#F3F7F6] hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl border border-[#D5E4E0] transition-all font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Conexões */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ambientes Mapeados</span>
             <span className="text-xs font-semibold text-slate-500">{connections.length} Instância(s)</span>
          </div>
          
          {connections.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-[#CBE5DF]">
              <p className="text-slate-500 font-semibold text-xs">Nenhuma infraestrutura detectada.</p>
            </div>
          ) : (
            connections.map(conn => (
              <div 
                key={conn.id} 
                className={`bg-white rounded-2xl p-5 border border-l-4 transition-all shadow-2xs ${
                  activeId === conn.id
                    ? 'border-[#E0ECE9] border-l-[#074E52]'
                    : 'border-[#E0ECE9] border-l-[#CBE5DF] hover:border-[#074E52]/40'
                }`}
              >
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors border shrink-0 ${activeId === conn.id ? 'bg-[#E6F4F1] text-[#074E52] border-[#CBE5DF]' : 'bg-[#F3F7F6] text-slate-500 border-[#E0ECE9]'}`}>
                        <Database size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-bold text-[#0F2426] tracking-tight normal-case">{conn.name}</h4>
                        {activeId === conn.id ? (
                          <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Check size={11} /> Target Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#F3F7F6] text-slate-600 border border-[#E0ECE9] px-2.5 py-0.5 rounded-full font-semibold">
                            Standby
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-mono mt-1 truncate">{conn.user}@<span className="text-slate-500">{conn.connectString}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => testConn(conn.id)}
                      title="Testar Latência"
                      className="p-2.5 text-slate-500 hover:text-[#074E52] hover:bg-[#E6F4F1] rounded-xl transition-all border border-transparent hover:border-[#CBE5DF] cursor-pointer"
                    >
                      <FlaskConical size={17} />
                    </button>
                    <button 
                      onClick={() => setFormData(conn)}
                      title="Modificar"
                      className="p-2.5 text-slate-500 hover:text-[#074E52] hover:bg-[#E6F4F1] rounded-xl transition-all border border-transparent hover:border-[#CBE5DF] cursor-pointer"
                    >
                      <Edit2 size={17} />
                    </button>
                    {!formData.id && activeId !== conn.id && (
                      <button 
                        onClick={() => setActive(conn.id)}
                        className="px-4 py-2 bg-[#E6F4F1] hover:bg-[#074E52] text-[#074E52] hover:text-white border border-[#CBE5DF] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                         Ativar
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(conn.id)}
                      title="Eliminar"
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200 cursor-pointer"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
