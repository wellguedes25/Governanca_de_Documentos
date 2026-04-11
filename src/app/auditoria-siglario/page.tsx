"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, AlertTriangle, CheckCircle2, RefreshCw,
  Loader2, FileText, BarChart2, ChevronDown, ChevronUp,
  ShieldAlert, Filter, X, Download
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

interface RankingItem {
  sigla: string;
  count: number;
}

export default function AuditoriaSiglarioPage() {
  const [data, setData] = useState<SiglaInfracao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSigla, setFilterSigla] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);

  // Detalhe expandido
  const [expanded, setExpanded] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Dados para Ranking
  const ranking: RankingItem[] = useMemo(() => {
    const count: Record<string, number> = {};
    data.forEach(d => {
      const k = d.SIGLA_DETECTADA;
      count[k] = (count[k] || 0) + 1;
    });
    return Object.entries(count)
      .map(([sigla, count]) => ({ sigla, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const unidades = useMemo(() => [...new Set(data.map(d => d.UNIDADE).filter(Boolean))], [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      const term = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        d.SIGLA_DETECTADA.toLowerCase().includes(term) ||
        d.CONTEXTO?.toLowerCase().includes(term) ||
        String(d.ATENDIMENTO).includes(term) ||
        String(d.PRESTADOR).includes(term);
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

  async function handleExecute() {
    setLoading(true);
    setError('');
    setHasSearched(true);
    setCurrentPage(1);
    try {
      const res = await fetch('/api/siglario?' + new URLSearchParams({
        dataInicio,
        dataFim
      }));
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao consultar siglário');
      }
      const json = await res.json();
      setData(json.rows || []);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const maxRanking = ranking[0]?.count || 1;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700 pb-24 text-slate-800">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic tracking-tighter">
            <BookOpen className="text-[var(--primary)]" size={32} />
            Auditoria de Siglário
          </h2>
          <p className="text-slate-500 mt-1 font-medium text-sm tracking-tight">
            Detecção de siglas e abreviações não padronizadas em laudos clínicos.
          </p>
        </div>
        {hasSearched && !loading && (
          <div className="flex items-center gap-3">
            {data.length > 0 ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-4 py-2 rounded-[var(--radius)]">
                <AlertTriangle size={14} className="text-rose-500" />
                <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest">{data.length} infração(ões) detectada(s)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-[var(--radius)]">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Nenhuma Infração</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Filtros de Busca */}
      <section className="bg-white border border-slate-200 rounded-[var(--radius)] p-8 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <Filter size={12} /> Parâmetros de Auditoria
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data Início</label>
            <input
              type="date"
              max={dataFim}
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data Fim</label>
            <input
              type="date"
              min={dataInicio}
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--primary)] hover:opacity-90 text-white px-8 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              {loading ? 'Analisando...' : 'Executar Auditoria'}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-[var(--radius)] p-6 flex items-center gap-3">
          <AlertTriangle size={18} className="text-rose-500 shrink-0" />
          <div>
            <p className="text-rose-700 font-black text-sm">{error}</p>
            <p className="text-rose-500 text-[11px] mt-1 font-medium">Verifique se a tabela TB_AUDITORIA_SIGLARIO existe e o script Python já foi executado.</p>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      {!loading && hasSearched && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Ranking de Infrações */}
          <div className="bg-white border border-slate-200 rounded-[var(--radius)] p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <BarChart2 size={14} className="text-rose-500" />
              Top Infrações
            </h3>
            <ul className="space-y-3">
              {ranking.map((item, i) => (
                <li key={item.sigla}>
                  <button
                    onClick={() => setFilterSigla(filterSigla === item.sigla ? '' : item.sigla)}
                    className={`w-full text-left group transition-all ${filterSigla === item.sigla ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black w-4 ${i === 0 ? 'text-rose-500' : i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                          #{i + 1}
                        </span>
                        <span className={`font-black text-xs font-mono uppercase ${filterSigla === item.sigla ? 'text-[var(--primary)]' : 'text-slate-800'}`}>
                          {item.sigla}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-500">{item.count}×</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-rose-500' : i < 3 ? 'bg-amber-400' : 'bg-slate-400'}`}
                        style={{ width: `${(item.count / maxRanking) * 100}%` }}
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {filterSigla && (
              <button
                onClick={() => setFilterSigla('')}
                className="mt-4 w-full text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1 transition-colors"
              >
                <X size={10} /> Limpar Filtro
              </button>
            )}
          </div>

          {/* Lista de Infrações */}
          <div className="lg:col-span-2 space-y-4">
            {/* Barra de busca inline */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Busca rápida (sigla, contexto, atendimento...)"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-[var(--radius)] text-sm font-medium text-slate-800 focus:outline-none focus:border-[var(--primary)] transition-all shadow-sm"
                />
              </div>
              {unidades.length > 0 && (
                <select
                  value={filterUnidade}
                  onChange={e => { setFilterUnidade(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[var(--primary)] transition-all"
                >
                  <option value="">Todas as Unidades</option>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>

            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">
              {filtered.length} registro(s) {filterSigla && `• Filtrado por: "${filterSigla}"`}
            </div>

            {/* Cards de infrações */}
            <div className="space-y-3">
              {paginated.map((row, i) => {
                const key = `${row.ATENDIMENTO}-${row.CD_DOCUMENTO_CLINICO}-${row.SIGLA_DETECTADA}-${i}`;
                const isExpanded = expanded === key;
                return (
                  <div
                    key={key}
                    className="bg-white border border-slate-200 rounded-[var(--radius)] overflow-hidden shadow-sm hover:border-rose-300 transition-all group"
                  >
                    <button
                      onClick={() => setExpanded(isExpanded ? null : key)}
                      className="w-full flex items-start gap-4 p-5 text-left"
                    >
                      {/* Sigla Badge */}
                      <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-[var(--radius)] px-3 py-2 min-w-[70px] text-center">
                        <span className="text-rose-600 font-black text-sm font-mono block">{row.SIGLA_DETECTADA}</span>
                        <span className="text-[8px] text-rose-400 font-bold uppercase">infração</span>
                      </div>

                      {/* Detalhes */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-3 mb-2 items-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            Atend. <span className="text-slate-800">{row.ATENDIMENTO}</span>
                          </span>
                          {row.UNIDADE && (
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">
                              {row.UNIDADE}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold">
                            {row.DATA_HORA ? new Date(row.DATA_HORA).toLocaleString('pt-BR') : ''}
                          </span>
                        </div>
                        {/* Preview do contexto */}
                        <p className="text-[11px] text-slate-500 font-medium truncate leading-relaxed">
                          {row.CONTEXTO || 'Contexto não disponível.'}
                        </p>
                      </div>

                      <div className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Detalhe Expandido */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 animate-in slide-in-from-top-1 duration-200">
                        {/* Contexto completo com highlight */}
                        <p className="text-[12px] text-slate-700 font-medium leading-loose mb-4"
                          dangerouslySetInnerHTML={{
                            __html: (row.CONTEXTO || '').replace(
                              new RegExp(`(${row.SIGLA_DETECTADA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark class="bg-amber-200 text-amber-900 rounded px-0.5 font-black">$1</mark>'
                            )
                          }}
                        />
                        {/* Metadados de rastreabilidade */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Prestador', value: row.PRESTADOR },
                            { label: 'Documento', value: row.DOCUMENTO },
                            { label: 'CD Clínico', value: row.CD_DOCUMENTO_CLINICO },
                            { label: 'Registro', value: row.CD_EDITOR_REGISTRO },
                          ].map(item => (
                            <div key={item.label} className="bg-white border border-slate-100 rounded-[var(--radius)] px-3 py-2">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                              <p className="font-black text-xs text-slate-800 mt-0.5 font-mono">{item.value || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-[var(--radius)] border border-slate-200 text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-30 transition-all"
                >
                  ← Ant.
                </button>
                <span className="text-[11px] font-bold text-slate-500 px-3">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-[var(--radius)] border border-slate-200 text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-30 transition-all"
                >
                  Próx. →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty / Initial State */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 opacity-60">
          <div className="p-8 rounded-full bg-slate-100">
            <ShieldAlert size={48} className="text-slate-400" />
          </div>
          <div className="text-center">
            <p className="font-black text-slate-500 text-lg uppercase tracking-tight">Motor de Siglário em Standby</p>
            <p className="text-slate-400 text-sm mt-2">Configure o período e execute a auditoria.</p>
          </div>
        </div>
      )}

      {!loading && hasSearched && data.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <div className="p-8 rounded-full bg-emerald-50">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="font-black text-emerald-600 text-lg uppercase tracking-tight">Dicionário Aprovado</p>
            <p className="text-slate-400 text-sm mt-2">Nenhuma sigla fora do padrão detectada para o período selecionado.</p>
          </div>
        </div>
      )}
    </div>
  );
}
