"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Search, AlertTriangle, CheckCircle2, Loader2, BarChart2,
  ChevronDown, ChevronUp, ShieldAlert, Filter, X, BookOpen
} from 'lucide-react';

interface SiglaInfracao {
  ATENDIMENTO: number | string;
  DOCUMENTO: number | string;
  CD_EDITOR_REGISTRO: number | string;
  CD_DOCUMENTO_CLINICO: number | string;
  SIGLA_DETECTADA: string;
  CONTEXTO: string;
  DATA_HORA: string;
  PRESTADOR: number | string;
  UNIDADE: string;
}

interface RankingItem { sigla: string; count: number; }

export default function AuditoriaTab() {
  const [data, setData] = useState<SiglaInfracao[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSigla, setFilterSigla] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Config independentes
  const [docIds, setDocIds] = useState('');
  const [days, setDays] = useState(15);
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(''), 4000); 
  };

  useEffect(() => {
    fetch('/api/siglario/dicionario')
      .then(res => res.json())
      .then(json => {
        if (json.params) {
          setDocIds(json.params.docIds);
          setDays(json.params.days);
        }
      });
  }, []);

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      await fetch('/api/siglario/dicionario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SAVE_SIGLARIO_PARAMS', docIds, days })
      });
      showToast('Configurações salvas!');
      setShowConfig(false);
    } catch (e) { showToast('Erro ao salvar config.'); }
    finally { setSavingConfig(false); }
  }

  const ranking: RankingItem[] = useMemo(() => {
    const count: Record<string, number> = {};
    data.forEach(d => { const k = d.SIGLA_DETECTADA; count[k] = (count[k] || 0) + 1; });
    return Object.entries(count).map(([sigla, count]) => ({ sigla, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [data]);

  const unidades = useMemo(() => [...new Set(data.map(d => d.UNIDADE).filter(Boolean))], [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      const term = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || d.SIGLA_DETECTADA.toLowerCase().includes(term) || d.CONTEXTO?.toLowerCase().includes(term) || String(d.ATENDIMENTO).includes(term);
      const matchSigla = !filterSigla || d.SIGLA_DETECTADA.toLowerCase().includes(filterSigla.toLowerCase());
      const matchUnidade = !filterUnidade || d.UNIDADE === filterUnidade;
      return matchSearch && matchSigla && matchUnidade;
    });
  }, [data, searchTerm, filterSigla, filterUnidade]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  async function handleProcess() {
    setProcessing(true); setError('');
    showToast('Iniciando Motor Python... Aguarde alguns minutos.');
    try {
      const res = await fetch('/api/siglario', { method: 'POST' });
      if (!res.ok) { 
        const err = await res.json(); 
        throw new Error(err.error || 'Erro ao processar motor'); 
      }
      showToast('Processamento concluído!');
      await handleExecute(); // Recarrega os dados após processar
    } catch (e: any) { 
      setError(e.message); 
      showToast('Erro no processamento. Verifique se o banco está lento.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleExecute() {
    setLoading(true); setError(''); setHasSearched(true); setCurrentPage(1);
    try {
      const res = await fetch('/api/siglario?' + new URLSearchParams({ dataInicio, dataFim }));
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro ao consultar siglário'); }
      const json = await res.json();
      setData(json.rows || []);
      if (json.rows?.length > 0) showToast(`${json.rows.length} registros encontrados.`);
    } catch (e: any) { setError(e.message); setData([]); }
    finally { setLoading(false); }
  }

  const maxRanking = ranking[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Configuração Independente */}
      <section className="bg-card border border-border rounded-none overflow-hidden transition-all">
        <button onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between px-6 py-3 -background transition-colors">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-muted" />
            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Configurações do Motor de Siglário</span>
          </div>
          {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {showConfig && (
          <div className="px-6 pb-6 pt-2 border-t border-border animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[9px] font-black text-muted uppercase tracking-widest mb-1.5 block">Documentos p/ Auditoria (IDs)</label>
                <input value={docIds} onChange={e => setDocIds(e.target.value)}
                  placeholder="Ex: 916, 1048"
                  className="w-full bg-background border border-border rounded-none px-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted uppercase tracking-widest mb-1.5 block">Dias de Retroatividade</label>
                <input type="number" value={days} onChange={e => setDays(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-none px-4 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-[var(--primary)]" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={handleProcess} disabled={processing || savingConfig}
                className="flex items-center gap-2 -background text-foreground px-5 py-2 rounded-none text-[9px] font-black uppercase tracking-widest -background transition-all disabled:opacity-50">
                {processing ? <Loader2 size={12} className="animate-spin" /> : <BarChart2 size={12} />} 
                {processing ? 'Processando...' : 'Executar Motor (Python)'}
              </button>
              <button onClick={handleSaveConfig} disabled={savingConfig || processing}
                className="flex items-center gap-2 bg-[var(--primary)] text-foreground px-5 py-2 rounded-none text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-none">
                {savingConfig ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Salvar Configurações
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Filtros */}
      <section className="bg-background border border-border rounded-none p-8 shadow-none">
        <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <Filter size={12} /> Parâmetros de Auditoria
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-widest mb-1.5 block">Data Início</label>
            <input type="date" max={dataFim} value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-[var(--primary)] transition-all" />
          </div>
          <div>
            <label className="text-[9px] font-black text-muted uppercase tracking-widest mb-1.5 block">Data Fim</label>
            <input type="date" min={dataInicio} value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:border-[var(--primary)] transition-all" />
          </div>
          <div className="flex items-end">
            <button onClick={handleExecute} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--primary)] hover:opacity-90 text-foreground px-8 py-2.5 rounded-none text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-none disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              {loading ? 'Carregando...' : 'Consultar Auditoria'}
            </button>
          </div>
        </div>
      </section>

      {/* Status Badge */}
      {hasSearched && !loading && (
        <div className="flex justify-end">
          {data.length > 0 ? (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/50/20 px-4 py-2 rounded-none">
              <AlertTriangle size={14} className="text-rose-500" />
              <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">{data.length} infração(ões)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-none">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Nenhuma Infração</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50/20 rounded-none p-6 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-500 shrink-0" />
          <div>
            <p className="text-rose-700 font-black text-sm">{error}</p>
            <p className="text-rose-500 text-[11px] mt-1 font-medium">Verifique se a tabela TB_AUDITORIA_SIGLARIO existe e o script Python já foi executado.</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && hasSearched && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ranking */}
          <div className="bg-background border border-border rounded-none p-8 shadow-none">
            <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <BarChart2 size={14} className="text-rose-500" /> Top Infrações
            </h3>
            <ul className="space-y-3">
              {ranking.map((item, i) => (
                <li key={item.sigla}>
                  <button onClick={() => setFilterSigla(filterSigla === item.sigla ? '' : item.sigla)}
                    className={`w-full text-left group transition-all ${filterSigla === item.sigla ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black w-4 ${i === 0 ? 'text-rose-500' : i < 3 ? 'text-amber-500' : 'text-muted'}`}>#{i + 1}</span>
                        <span className={`font-black text-xs font-mono uppercase ${filterSigla === item.sigla ? 'text-[var(--primary)]' : 'text-foreground'}`}>{item.sigla}</span>
                      </div>
                      <span className="text-[10px] font-black text-muted">{item.count}×</span>
                    </div>
                    <div className="w-full h-1 -background rounded-none overflow-hidden">
                      <div className={`h-full rounded-none transition-all duration-500 ${i === 0 ? 'bg-rose-500' : i < 3 ? 'bg-amber-400' : 'bg-slate-400'}`}
                        style={{ width: `${(item.count / maxRanking) * 100}%` }} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {filterSigla && (
              <button onClick={() => setFilterSigla('')}
                className="mt-4 w-full text-[9px] font-black uppercase text-muted hover:text-rose-500 flex items-center justify-center gap-1 transition-colors">
                <X size={10} /> Limpar Filtro
              </button>
            )}
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input type="text" placeholder="Busca rápida..." value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-none text-sm font-medium text-foreground focus:outline-none focus:border-[var(--primary)] shadow-none" />
              </div>
              {unidades.length > 0 && (
                <select value={filterUnidade} onChange={e => { setFilterUnidade(e.target.value); setCurrentPage(1); }}
                  className="bg-background border border-border rounded-none px-4 py-2.5 text-[11px] font-bold text-foreground">
                  <option value="">Todas as Unidades</option>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>

            <div className="text-[10px] text-muted font-bold uppercase tracking-widest px-1">
              {filtered.length} registro(s) {filterSigla && `• Filtrado por: "${filterSigla}"`}
            </div>

            <div className="space-y-3">
              {paginated.map((row, i) => {
                const key = `${row.ATENDIMENTO}-${row.CD_DOCUMENTO_CLINICO}-${row.SIGLA_DETECTADA}-${i}`;
                const isExpanded = expanded === key;
                return (
                  <div key={key} className="bg-background border border-border rounded-none overflow-hidden shadow-none hover:border-rose-300 transition-all group">
                    <button onClick={() => setExpanded(isExpanded ? null : key)} className="w-full flex items-start gap-4 p-5 text-left">
                      <div className="shrink-0 bg-red-500/10 border border-red-500/50/20 rounded-none px-3 py-2 min-w-[70px] text-center">
                        <span className="text-red-500 font-black text-sm font-mono block">{row.SIGLA_DETECTADA}</span>
                        <span className="text-[8px] text-rose-400 font-bold uppercase">infração</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-3 mb-2 items-center">
                          <span className="text-[10px] font-black text-muted uppercase tracking-wider">
                            Atend. <span className="text-foreground">{row.ATENDIMENTO}</span>
                          </span>
                          {row.UNIDADE && (
                            <span className="-background text-muted text-[9px] font-black uppercase px-2 py-0.5 rounded-none tracking-widest">{row.UNIDADE}</span>
                          )}
                          <span className="text-[10px] text-muted font-bold">
                            {row.DATA_HORA ? new Date(row.DATA_HORA).toLocaleString('pt-BR') : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted font-medium truncate leading-relaxed">{row.CONTEXTO || 'Contexto não disponível.'}</p>
                      </div>
                      <div className="shrink-0 -muted -muted transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border bg-card px-6 py-5 animate-in slide-in-from-top-1 duration-200">
                        <p className="text-[12px] text-foreground font-medium leading-loose mb-4"
                          dangerouslySetInnerHTML={{
                            __html: (row.CONTEXTO || '').replace(
                              new RegExp(`(${row.SIGLA_DETECTADA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark class="bg-amber-200 text-amber-900 rounded px-0.5 font-black">$1</mark>'
                            )
                          }} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Prestador', value: row.PRESTADOR },
                            { label: 'Documento', value: row.DOCUMENTO },
                            { label: 'CD Clínico', value: row.CD_DOCUMENTO_CLINICO },
                            { label: 'Registro', value: row.CD_EDITOR_REGISTRO },
                          ].map(item => (
                            <div key={item.label} className="bg-background border border-border rounded-none px-3 py-2">
                              <p className="text-[8px] font-black text-muted uppercase tracking-widest">{item.label}</p>
                              <p className="font-black text-xs text-foreground mt-0.5 font-mono">{item.value || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-none border border-border text-muted hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-30 transition-all">
                  ← Ant.
                </button>
                <span className="text-[11px] font-bold text-muted px-3">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-none border border-border text-muted hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-30 transition-all">
                  Próx. →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty States */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 opacity-60">
          <div className="p-8 rounded-none -background"><ShieldAlert size={48} className="text-muted" /></div>
          <div className="text-center">
            <p className="font-black text-muted text-lg uppercase tracking-tight">Motor de Siglário em Standby</p>
            <p className="text-muted text-sm mt-2">Configure o período e execute a auditoria.</p>
          </div>
        </div>
      )}

      {!loading && hasSearched && data.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <div className="p-8 rounded-none bg-emerald-50"><CheckCircle2 size={48} className="text-emerald-400" /></div>
          <div className="text-center">
            <p className="font-black text-emerald-600 text-lg uppercase tracking-tight">Dicionário Aprovado</p>
            <p className="text-muted text-sm mt-2">Nenhuma sigla fora do padrão detectada para o período selecionado.</p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-card text-foreground px-6 py-3 rounded-none shadow-none flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 z-50 border -border">
          <div className="w-2 h-2 bg-[var(--primary)] rounded-none animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast}</span>
        </div>
      )}
    </div>
  );
}
