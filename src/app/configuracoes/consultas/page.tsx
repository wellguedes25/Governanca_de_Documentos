"use client";

import { useState, useEffect } from 'react';
import { Database, Play, Save, Info, AlertTriangle } from 'lucide-react';

export default function ConfigConsultasPage() {
  const [query, setQuery] = useState('');
  const [profileQuery, setProfileQuery] = useState('');
  const [kpiTotal, setKpiTotal] = useState('');
  const [kpi24h, setKpi24h] = useState('');
  const [kpiAssinados, setKpiAssinados] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [kpiLoading, setKpiLoading] = useState<string | null>(null);
  
  const [message, setMessage] = useState('');
  const [activeConnName, setActiveConnName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await fetch('/api/connections');
    const storage = await res.json();
    setQuery(storage.activeQuery || '');
    setProfileQuery(storage.profileQuery || '');
    
    if (storage.kpiQueries) {
      setKpiTotal(storage.kpiQueries.total || '');
      setKpi24h(storage.kpiQueries.prod24h || '');
      setKpiAssinados(storage.kpiQueries.assinados || '');
    }
    
    const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
    if (active) setActiveConnName(active.name);
  }

  async function handleSave(type: 'MAIN' | 'PROFILE' | 'KPI_TOTAL' | 'KPI_24H' | 'KPI_ASSINADOS') {
    if (type === 'MAIN') setLoading(true);
    else if (type === 'PROFILE') setProfileLoading(true);
    else setKpiLoading(type);
    
    let bodyType = '';
    let bodyQuery = '';

    switch(type) {
      case 'MAIN': bodyType = 'SAVE_QUERY'; bodyQuery = query; break;
      case 'PROFILE': bodyType = 'SAVE_PROFILE_QUERY'; bodyQuery = profileQuery; break;
      case 'KPI_TOTAL': bodyType = 'SAVE_KPI_TOTAL'; bodyQuery = kpiTotal; break;
      case 'KPI_24H': bodyType = 'SAVE_KPI_24H'; bodyQuery = kpi24h; break;
      case 'KPI_ASSINADOS': bodyType = 'SAVE_KPI_ASSINADOS'; bodyQuery = kpiAssinados; break;
    }
    
    try {
      await fetch('/api/connections', {
        method: 'POST',
        body: JSON.stringify({ type: bodyType, query: bodyQuery }),
      });
      setMessage(`Configuração salva com sucesso!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erro ao salvar configuração.');
    } finally {
      setLoading(false);
      setProfileLoading(false);
      setKpiLoading(null);
    }
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500 pb-10">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Database className="text-[var(--primary)]" />
            Queries & SQL
          </h2>
          <p className="text-slate-400 mt-2">
            Configure as consultas SQL que alimentam o dashboard e o perfil de documentos.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {message && (
            <span className="text-[var(--primary)] text-sm font-medium animate-pulse">{message}</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-8">
          {/* Bloco Consulta Principal */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)]/50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]/50"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Play size={12} className="text-[var(--primary)]" />
                Consulta Principal (Documentos em Uso)
              </span>
              <button 
                onClick={() => handleSave('MAIN')}
                disabled={loading}
                className="flex items-center gap-2 bg-[var(--primary)]/10 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border border-[var(--primary)]/20"
              >
                <Save size={14} />
                {loading ? 'Salvando...' : 'Salvar Principal'}
              </button>
            </div>
            <textarea 
              className="w-full h-[150px] bg-[var(--background)]/50 text-[var(--primary)] font-mono p-6 rounded-xl border border-[var(--border)] focus:border-[var(--primary)] outline-none resize-none shadow-inner leading-relaxed text-sm selection:bg-[var(--primary)]/30"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
              placeholder="SELECT * FROM DOCUMENTOS..."
            />
          </div>

          {/* Bloco Consulta Perfil */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)]/50 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Play size={12} className="text-purple-500" />
                Consulta de Perfil (Vínculos)
              </span>
              <button 
                onClick={() => handleSave('PROFILE')}
                disabled={profileLoading}
                className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 border border-purple-500/20"
              >
                <Save size={14} />
                {profileLoading ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </div>
            <textarea 
              className="w-full h-[150px] bg-[var(--background)]/50 text-purple-400 font-mono p-6 rounded-xl border border-[var(--border)] focus:border-purple-500/50 outline-none resize-none shadow-inner leading-relaxed text-sm selection:bg-purple-500/30"
              value={profileQuery}
              onChange={(e) => setProfileQuery(e.target.value)}
              spellCheck={false}
              placeholder="SELECT * FROM PERFIL_AMBULATORIAL..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI Total */}
            <div className="glass rounded-2xl p-6 border border-[var(--border)]/50 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  KPI: Total Geral
                </span>
                <button 
                  onClick={() => handleSave('KPI_TOTAL')}
                  disabled={kpiLoading === 'KPI_TOTAL'}
                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                  title="Salvar Query de Total"
                >
                  <Save size={14} />
                </button>
              </div>
              <textarea 
                className="w-full h-[100px] bg-[var(--background)]/50 text-blue-400 font-mono p-4 rounded-xl border border-[var(--border)] focus:border-blue-500/50 outline-none resize-none text-xs selection:bg-blue-500/30"
                value={kpiTotal}
                onChange={(e) => setKpiTotal(e.target.value)}
                spellCheck={false}
              />
            </div>

            {/* KPI 24h */}
            <div className="glass rounded-2xl p-6 border border-[var(--border)]/50 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  KPI: Produção 24h
                </span>
                <button 
                  onClick={() => handleSave('KPI_24H')}
                  disabled={kpiLoading === 'KPI_24H'}
                  className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                  title="Salvar Query 24h"
                >
                  <Save size={14} />
                </button>
              </div>
              <textarea 
                className="w-full h-[100px] bg-[var(--background)]/50 text-orange-400 font-mono p-4 rounded-xl border border-[var(--border)] focus:border-orange-500/50 outline-none resize-none text-xs selection:bg-orange-500/30"
                value={kpi24h}
                onChange={(e) => setKpi24h(e.target.value)}
                spellCheck={false}
              />
            </div>

            {/* KPI Assinados */}
            <div className="glass rounded-2xl p-6 border border-[var(--border)]/50 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  KPI: Taxa Assinatura
                </span>
                <button 
                  onClick={() => handleSave('KPI_ASSINADOS')}
                  disabled={kpiLoading === 'KPI_ASSINADOS'}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                  title="Salvar Query Assinados"
                >
                  <Save size={14} />
                </button>
              </div>
              <textarea 
                className="w-full h-[100px] bg-[var(--background)]/50 text-emerald-400 font-mono p-4 rounded-xl border border-[var(--border)] focus:border-emerald-500/50 outline-none resize-none text-xs selection:bg-emerald-500/30"
                value={kpiAssinados}
                onChange={(e) => setKpiAssinados(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-[var(--border)] bg-[var(--card)]/30">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database size={14} />
              Ambiente Ativo
            </h4>
            <div className="p-3 rounded-xl bg-[var(--background)]/50 border border-[var(--border)]">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Conectado em:</p>
              <p className="text-sm text-white font-mono truncate">{activeConnName || 'Nenhuma seleção'}</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-[var(--primary)]/20 bg-[var(--primary)]/5">
            <h4 className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info size={14} />
              Dicas de Integração
            </h4>
            <ul className="text-xs text-slate-400 space-y-3">
              <li className="flex gap-2">
                <span className="text-[var(--primary)]">•</span>
                As queries de KPI alimentam os cards do Dashboard inicial.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--primary)]">•</span>
                Tente retornar uma coluna chamada <b>TOTAL</b> para melhor compatibilidade.
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--primary)]">•</span>
                Use o parâmetro <b>:CD_DOCUMENTO</b> apenas na query de perfil.
              </li>
            </ul>
          </div>

          <div className="glass rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={14} />
              Atenção
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Alterações nestas queries afetam diretamente o carregamento de dados e o tempo de resposta do Oracle. Teste sempre com limites (ROWNUM).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
