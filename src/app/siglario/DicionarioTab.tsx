"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Trash2, Edit3, Check, X, Upload, Download,
  ShieldCheck, ShieldAlert, Loader2, BookOpen, Filter
} from 'lucide-react';

interface SiglarioEntry {
  id: string;
  sigla: string;
  tipo: 'allowed' | 'forbidden';
  significado?: string;
  criadoEm: string;
}

export default function DicionarioTab() {
  const [entries, setEntries] = useState<SiglarioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'' | 'allowed' | 'forbidden'>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ sigla: '', tipo: 'allowed' as const, significado: '' });
  const [newSigla, setNewSigla] = useState('');
  const [newTipo, setNewTipo] = useState<'allowed' | 'forbidden'>('allowed');
  const [newSignificado, setNewSignificado] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkTipo, setBulkTipo] = useState<'allowed' | 'forbidden'>('allowed');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  async function fetchEntries() {
    setLoading(true);
    try {
      const res = await fetch('/api/siglario/dicionario');
      const json = await res.json();
      setEntries(json.entries || []);
    } catch { showToast('Erro ao carregar dicionário.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchEntries(); }, []);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = !search || e.sigla.toLowerCase().includes(search.toLowerCase()) || (e.significado || '').toLowerCase().includes(search.toLowerCase());
      const matchTipo = !filterTipo || e.tipo === filterTipo;
      return matchSearch && matchTipo;
    });
  }, [entries, search, filterTipo]);

  const stats = useMemo(() => ({
    total: entries.length,
    allowed: entries.filter(e => e.tipo === 'allowed').length,
    forbidden: entries.filter(e => e.tipo === 'forbidden').length,
  }), [entries]);

  async function handleAdd() {
    if (!newSigla.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/siglario/dicionario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sigla: newSigla, tipo: newTipo, significado: newSignificado }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNewSigla(''); setNewSignificado('');
      showToast(json.skipped > 0 ? 'Sigla já existe no dicionário.' : 'Sigla adicionada!');
      fetchEntries();
    } catch (e: any) { showToast(e.message); }
    finally { setSaving(false); }
  }

  async function handleBulkImport() {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setSaving(true);
    try {
      const bulkEntries = lines.map(line => {
        const parts = line.split(/[;|,\t]/).map(p => p.trim());
        return { sigla: parts[0], tipo: bulkTipo, significado: parts[1] || '' };
      });
      const res = await fetch('/api/siglario/dicionario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: bulkEntries }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(`${json.added} adicionada(s), ${json.skipped} duplicada(s).`);
      setBulkText(''); setShowBulk(false);
      fetchEntries();
    } catch (e: any) { showToast(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/siglario/dicionario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar.');
      setEditingId(null);
      showToast('Sigla atualizada!');
      fetchEntries();
    } catch (e: any) { showToast(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta sigla do dicionário?')) return;
    try {
      await fetch(`/api/siglario/dicionario?id=${id}`, { method: 'DELETE' });
      showToast('Sigla removida.');
      fetchEntries();
    } catch { showToast('Erro ao excluir.'); }
  }

  function handleExportCSV() {
    const header = 'Sigla;Tipo;Significado;Data Cadastro\n';
    const rows = entries.map(e => `${e.sigla};${e.tipo === 'allowed' ? 'Permitida' : 'Proibida'};${e.significado || ''};${e.criadoEm}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dicionario_siglario.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function startEdit(entry: SiglarioEntry) {
    setEditingId(entry.id);
    setEditForm({ sigla: entry.sigla, tipo: entry.tipo, significado: entry.significado || '' });
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border animate-in slide-in-from-top-4 duration-300 bg-emerald-600 border-emerald-500 text-white">
          <Check size={14} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast}</span>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Cadastradas', value: stats.total, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-200' },
          { label: 'Permitidas', value: stats.allowed, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <ShieldCheck size={16} /> },
          { label: 'Proibidas', value: stats.forbidden, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: <ShieldAlert size={16} /> },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} border ${kpi.border} rounded-[var(--radius)] p-5`}>
            <div className="flex items-center gap-2 mb-1">
              {kpi.icon && <span className={kpi.color}>{kpi.icon}</span>}
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">{kpi.label}</span>
            </div>
            <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Add New + Actions */}
      <div className="bg-white border border-slate-200 rounded-[var(--radius)] p-6 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
          <Plus size={12} /> Adicionar Sigla
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sigla</label>
            <input
              value={newSigla} onChange={e => setNewSigla(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Ex: IAM, pac., A.V.C."
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>
          <div className="w-40">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo</label>
            <select value={newTipo} onChange={e => setNewTipo(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-3 py-2.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[var(--primary)]">
              <option value="allowed">✅ Permitida</option>
              <option value="forbidden">🚫 Proibida</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Significado (opcional)</label>
            <input
              value={newSignificado} onChange={e => setNewSignificado(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Ex: Infarto Agudo do Miocárdio"
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>
          <button onClick={handleAdd} disabled={saving || !newSigla.trim()}
            className="flex items-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white px-6 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
          </button>
        </div>

        {/* Bulk + Export buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
          <button onClick={() => setShowBulk(!showBulk)}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[var(--primary)] transition-colors">
            <Upload size={12} /> Importar em Massa
          </button>
          <button onClick={handleExportCSV} disabled={entries.length === 0}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-30">
            <Download size={12} /> Exportar CSV
          </button>
        </div>

        {/* Bulk Import Area */}
        {showBulk && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-[var(--radius)] p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-3 items-end mb-3">
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Cole as siglas (uma por linha, opcionalmente separadas por ; com significado)
                </label>
                <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
                  placeholder={"IAM;Infarto Agudo do Miocárdio\nDPOC;Doença Pulmonar Obstrutiva Crônica\nHAS\npac.\nmed."}
                  className="w-full bg-white border border-slate-200 rounded-[var(--radius)] p-3 text-[11px] font-mono font-medium text-slate-700 focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="space-y-2">
                <select value={bulkTipo} onChange={e => setBulkTipo(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-[var(--radius)] px-3 py-2 text-[11px] font-bold">
                  <option value="allowed">✅ Permitidas</option>
                  <option value="forbidden">🚫 Proibidas</option>
                </select>
                <button onClick={handleBulkImport} disabled={saving || !bulkText.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-wider disabled:opacity-40">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Importar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar sigla ou significado..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-[var(--radius)] text-sm font-medium text-slate-800 focus:outline-none focus:border-[var(--primary)] shadow-sm"
          />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-[var(--radius)] px-4 py-2.5 text-[11px] font-bold text-slate-800">
          <option value="">Todos os Tipos</option>
          <option value="allowed">✅ Permitidas</option>
          <option value="forbidden">🚫 Proibidas</option>
        </select>
      </div>

      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">
        {filtered.length} registro(s) {search && `• Busca: "${search}"`}
      </div>

      {/* Entries Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 opacity-60">
          <div className="p-6 rounded-full bg-slate-100"><BookOpen size={40} className="text-slate-400" /></div>
          <p className="font-black text-slate-500 uppercase tracking-tight">
            {entries.length === 0 ? 'Dicionário Vazio' : 'Nenhum resultado'}
          </p>
          <p className="text-slate-400 text-sm">
            {entries.length === 0 ? 'Adicione siglas para começar a auditoria.' : 'Tente ajustar os filtros.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[var(--radius)] overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sigla</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Significado</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Data</th>
                <th className="text-right px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  {editingId === entry.id ? (
                    <>
                      <td className="px-5 py-3">
                        <input value={editForm.sigla} onChange={e => setEditForm(f => ({ ...f, sigla: e.target.value }))}
                          className="bg-white border border-blue-400 rounded px-2 py-1 text-xs font-black font-mono w-full" autoFocus />
                      </td>
                      <td className="px-5 py-3">
                        <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value as any }))}
                          className="bg-white border border-blue-400 rounded px-2 py-1 text-[10px] font-bold">
                          <option value="allowed">Permitida</option>
                          <option value="forbidden">Proibida</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <input value={editForm.significado} onChange={e => setEditForm(f => ({ ...f, significado: e.target.value }))}
                          className="bg-white border border-blue-400 rounded px-2 py-1 text-xs font-medium w-full" />
                      </td>
                      <td className="px-5 py-3 text-[10px] text-slate-400">{new Date(entry.criadoEm).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleUpdate(entry.id)} className="p-1.5 bg-emerald-600 rounded text-white hover:bg-emerald-500"><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-200 rounded text-slate-600 hover:bg-slate-300"><X size={12} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3">
                        <span className="font-black text-sm font-mono text-slate-900">{entry.sigla}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                          entry.tipo === 'allowed'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {entry.tipo === 'allowed' ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                          {entry.tipo === 'allowed' ? 'Permitida' : 'Proibida'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[11px] text-slate-500 font-medium">{entry.significado || '—'}</td>
                      <td className="px-5 py-3 text-[10px] text-slate-400 font-mono">{new Date(entry.criadoEm).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(entry)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"><Edit3 size={13} /></button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
