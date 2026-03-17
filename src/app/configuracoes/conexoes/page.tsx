"use client";

import { useState, useEffect } from 'react';
import { Settings, Database, Plus, Trash2, Edit2, Check, FlaskConical, AlertTriangle } from 'lucide-react';

interface DbConnection {
  id: string;
  name: string;
  user: string;
  password?: string;
  connectString: string;
}

export default function ConfigConexoesPage() {
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
      body: JSON.stringify({ type: 'SET_ACTIVE', id }),
    });
    setActiveId(id);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;
    await fetch('/api/connections', {
      method: 'POST',
      body: JSON.stringify({ type: 'DELETE_CONNECTION', id }),
    });
    fetchConnections();
  }

  async function testConn(id: string) {
    setMessage('Testando conexão...');
    await fetch('/api/connections', {
        method: 'POST',
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
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <header className="flex justify-between items-center text-wrap">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="text-[var(--primary)]" />
            Conexões Oracle
          </h2>
          <p className="text-slate-400 mt-2">Configure seus ambientes de Produção, Homologação e Desenvolvimento.</p>
          
          <div className="mt-6 p-4 glass rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5">
            <h4 className="text-sm font-bold text-[var(--primary)] mb-2 uppercase tracking-tight flex items-center gap-2">
              <Database size={14} />
              Configuração Global Oracle (Thick Mode)
            </h4>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Caminho do Instant Client"
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-[var(--primary)]"
                value={clientPath}
                onChange={e => setClientPath(e.target.value)}
              />
              <button 
                onClick={handleSaveClientPath}
                className="bg-[var(--primary)] hover:brightness-110 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                Salvar Path
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
              <AlertTriangle size={10} className="text-amber-500" />
              O erro NJS-116 exige o Instant Client. Após salvar o caminho, reinicie o servidor Next.js.
            </p>
          </div>
        </div>
        {message && (
          <div className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg shadow-lg animate-bounce text-sm font-medium">
            {message}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form para Nova Conexão */}
        <div className="glass rounded-2xl p-8 h-fit border border-[var(--border)]/50">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Plus size={18} className="text-[var(--primary)]" />
            {formData.id ? 'Editar Conexão' : 'Nova Conexão'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Nome do Ambiente</label>
              <input 
                type="text" 
                placeholder="Ex: PRODUÇÃO"
                autoComplete="off"
                className="w-full bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3 mt-1 text-sm text-white focus:border-[var(--primary)] outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Usuário</label>
              <input 
                type="text" 
                placeholder="Ex: dbamv"
                autoComplete="off"
                className="w-full bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3 mt-1 text-sm text-white focus:border-[var(--primary)] outline-none transition-all"
                value={formData.user}
                onChange={e => setFormData({...formData, user: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Senha</label>
              <input 
                type="password" 
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3 mt-1 text-sm text-white focus:border-[var(--primary)] outline-none transition-all"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Connect String</label>
              <input 
                type="text" 
                placeholder="host:port/service_name"
                autoComplete="off"
                className="w-full bg-[var(--background)]/50 border border-[var(--border)] rounded-lg p-3 mt-1 text-sm text-white focus:border-[var(--primary)] outline-none transition-all"
                value={formData.connectString}
                onChange={e => setFormData({...formData, connectString: e.target.value})}
              />
              <p className="text-[10px] text-slate-500 mt-2 italic px-1">
                Use host:porta/serviço (Ex: 10.10.1.1:1521/PROD)
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-[var(--primary)] hover:brightness-110 text-white font-bold py-3 rounded-lg shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : formData.id ? 'Atualizar' : 'Salvar Conexão'}
              </button>
              {formData.id && (
                <button 
                  onClick={() => setFormData({ name: '', user: '', password: '', connectString: '' })}
                  className="bg-[var(--accent)] hover:bg-[var(--card)] text-slate-300 px-4 py-3 rounded-lg transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Conexões */}
        <div className="lg:col-span-2 space-y-4">
          {connections.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-dashed border-slate-700 opacity-50">
              <p className="text-slate-500 italic">Nenhuma conexão cadastrada.</p>
            </div>
          ) : (
            connections.map(conn => (
              <div 
                key={conn.id} 
                className={`glass rounded-2xl p-6 border transition-all ${
                  activeId === conn.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg shadow-[var(--primary)]/10' : 'border-[var(--border)]/50 hover:border-[var(--border)]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${activeId === conn.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-slate-500'}`}>
                        <Database size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white uppercase tracking-tight">{conn.name}</h4>
                        {activeId === conn.id && (
                          <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">ATIVO</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{conn.user}@{conn.connectString}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => testConn(conn.id)}
                      title="Testar Conexão"
                      className="p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-all"
                    >
                      <FlaskConical size={16} />
                    </button>
                    <button 
                      onClick={() => setFormData(conn)}
                      title="Editar"
                      className="p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    {!formData.id && activeId !== conn.id && (
                      <button 
                        onClick={() => setActive(conn.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                      >
                         Selecionar
                      </button>
                    )}
                    {activeId === conn.id && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                         <Check size={14} /> Ativo
                      </div>
                    )}
                    <button 
                      onClick={() => handleDelete(conn.id)}
                      title="Excluir"
                      className="p-2.5 text-slate-600 hover:text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
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
