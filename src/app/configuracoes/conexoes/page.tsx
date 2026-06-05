"use client";

import { useState, useEffect } from 'react';
import { Settings, Database, Plus, Trash2, Edit2, Check, FlaskConical, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

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
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;
    
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
    <div className="min-h-screen bg-card flex flex-col p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-5 duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-border pb-8 gap-4">
        <div className="max-w-3xl">
          <PageHeader 
            title="Infraestrutura Oracle"
            subtitle="Gerenciamento de instâncias e conectividade thick-mode para ambientes DBAMV."
            icon={Settings}
          />
          
          <div className="mt-8 p-6 bg-card border border-border rounded-none">
            <h4 className="text-[10px] font-black text-muted mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <Database size={14} className="text-[var(--primary)]" />
              Oracle Client Path (Required)
            </h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: C:\instantclient_23_0"
                className="flex-1 bg-background border border-border rounded-none px-4 py-2 text-xs text-foreground outline-none focus:border-[var(--primary)] shadow-none font-mono"
                value={clientPath}
                onChange={e => setClientPath(e.target.value)}
              />
              <button 
                onClick={handleSaveClientPath}
                className="bg-card hover:bg-muted text-foreground text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-none transition-all"
              >
                Configurar
              </button>
            </div>
            <p className="text-[9px] text-muted mt-3 flex items-center gap-2 font-bold uppercase tracking-tight">
              <AlertTriangle size={12} className="text-amber-500" />
              A alteração do binário exige reinicialização do serviço Node.js / Next.js
            </p>
          </div>
        </div>
        {message && (
          <div className="bg-emerald-600 text-foreground px-6 py-3 rounded-none shadow-none animate-in zoom-in duration-300 text-[10px] font-black uppercase tracking-widest">
             {message}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form para Nova Conexão */}
        <div className="bg-background rounded-none p-8 h-fit border border-border shadow-none relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]"></div>
          <h3 className="text-lg font-black text-foreground mb-8 flex items-center gap-3 uppercase italic tracking-tighter border-b -border pb-4">
            <Plus size={20} className="text-[var(--primary)]" />
            {formData.id ? 'Modificar Registro' : 'Novo Ambiente'}
          </h3>
          <div className="space-y-6">
            <div>
              <label className="text-[9px] text-muted uppercase font-black tracking-[0.2em] block mb-1.5">Nome do Ambiente</label>
              <input 
                type="text" 
                placeholder="PRODUÇÃO / HOMOLOG"
                autoComplete="off"
                className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-[11px] font-bold text-foreground focus:border-[var(--primary)] outline-none transition-all -muted"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[9px] text-muted uppercase font-black tracking-[0.2em] block mb-1.5">DB User</label>
              <input 
                type="text" 
                placeholder="System / Dbamv"
                autoComplete="off"
                className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-[11px] font-bold text-foreground focus:border-[var(--primary)] outline-none transition-all -muted font-mono"
                value={formData.user}
                onChange={e => setFormData({...formData, user: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[9px] text-muted uppercase font-black tracking-[0.2em] block mb-1.5">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-[11px] font-bold text-foreground focus:border-[var(--primary)] outline-none transition-all -muted"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[9px] text-muted uppercase font-black tracking-[0.2em] block mb-1.5">Connect String (Oracle Service)</label>
              <input 
                type="text" 
                placeholder="host:port/service_name"
                autoComplete="off"
                className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-[11px] font-bold text-foreground focus:border-[var(--primary)] outline-none transition-all -muted font-mono"
                value={formData.connectString}
                onChange={e => setFormData({...formData, connectString: e.target.value})}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-[var(--primary)] hover:brightness-110 text-foreground text-[10px] font-black uppercase tracking-widest py-3 rounded-none transition-all shadow-none shadow-[var(--primary)]/20 disabled:opacity-50"
              >
                {loading ? 'Processando...' : formData.id ? 'Salvar Alterações' : 'Registrar Conexão'}
              </button>
              {formData.id && (
                <button 
                  onClick={() => setFormData({ name: '', user: '', password: '', connectString: '' })}
                  className="-background -card text-muted px-4 py-3 rounded-none transition-all font-bold text-[10px] uppercase"
                >
                  X
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Conexões */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Ambientes Mapeados</span>
             <span className="text-[10px] font-bold text-muted">{connections.length} Instância(s)</span>
          </div>
          
          {connections.length === 0 ? (
            <div className="bg-card rounded-none p-16 text-center border-2 border-dashed border-border">
              <p className="text-muted font-bold uppercase text-[10px] tracking-widest italic">Nenhuma infraestrutura detectada.</p>
            </div>
          ) : (
            connections.map(conn => (
              <div 
                key={conn.id} 
                className={`bg-background rounded-none p-6 border-l-4 transition-all shadow-none ${
                  activeId === conn.id ? 'border-[var(--primary)] shadow-none' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-6">
                    <div className={`w-14 h-14 rounded-none flex items-center justify-center transition-colors border ${activeId === conn.id ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' : 'bg-card text-muted border-border'}`}>
                        <Database size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-black text-foreground uppercase tracking-tighter italic">{conn.name}</h4>
                        {activeId === conn.id ? (
                          <span className="text-[9px] bg-emerald-500 text-foreground px-2 py-0.5 rounded-none font-black tracking-widest uppercase">Target Ativo</span>
                        ) : (
                          <span className="text-[9px] -background text-muted px-2 py-0.5 rounded-none font-black tracking-widest uppercase">Standby</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted font-mono mt-0.5 font-bold uppercase">{conn.user}@<span className="text-muted">{conn.connectString}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => testConn(conn.id)}
                      title="Testar Latência"
                      className="p-3 text-muted hover:text-[var(--primary)] -background rounded-none transition-all border border-transparent -border"
                    >
                      <FlaskConical size={18} />
                    </button>
                    <button 
                      onClick={() => setFormData(conn)}
                      title="Modificar"
                      className="p-3 text-muted -foreground -background rounded-none transition-all border border-transparent -border"
                    >
                      <Edit2 size={18} />
                    </button>
                    {!formData.id && activeId !== conn.id && (
                      <button 
                        onClick={() => setActive(conn.id)}
                        className="px-6 py-2.5 bg-card -background text-foreground text-[10px] font-black rounded-none transition-all uppercase tracking-widest"
                      >
                         Ativar
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(conn.id)}
                      title="Eliminar"
                      className="p-3 -muted hover:text-red-500 hover:bg-red-500/10 rounded-none transition-all"
                    >
                      <Trash2 size={18} />
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
