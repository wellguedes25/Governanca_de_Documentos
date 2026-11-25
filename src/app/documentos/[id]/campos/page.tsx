"use client";

import React, { useState, useEffect, useMemo, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Search, Download, TableProperties, Sparkles, Zap, 
  Copy, Check, SlidersHorizontal, AlertTriangle, Layers, Eye
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FieldRecord {
  CD_CAMPO: number;
  DS_IDENTIFICADOR: string;
  DS_CAMPO: string;
  CD_METADADO: number | null;
  SN_ATIVO: number;
  CD_TIPO_VISUALIZACAO: number;
  DS_TIPO_VISUALIZACAO: string;
  CD_LAYOUT: number;
  CD_TIPO_LAYOUT: number;
  DS_TIPO_LAYOUT: string;
  VL_VERSAO: number;
  TP_VERSAO: string;
  SN_PUBLICADO: number;
  QTD_REGRAS: number;
}

const getFieldTypeBadge = (tipo?: string) => {
  const t = String(tipo || '').toUpperCase();
  if (t.includes('TEXT') || t.includes('TEXTO')) {
    return { label: tipo || 'Texto', color: 'bg-[#E6F4F1] text-[#074E52] border-[#CBE5DF]' };
  }
  if (t.includes('CHECKBOX') || t.includes('CHECK')) {
    return { label: tipo || 'CheckBox', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (t.includes('RADIO') || t.includes('COMBO') || t.includes('LIST')) {
    return { label: tipo || 'Seleção', color: 'bg-teal-50 text-teal-800 border-teal-200' };
  }
  if (t.includes('DATE') || t.includes('DATA')) {
    return { label: tipo || 'Data', color: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  if (t.includes('BUTTON') || t.includes('BOTAO')) {
    return { label: tipo || 'Botão', color: 'bg-[#EDF4F2] text-[#053A3D] border-[#CBE5DF]' };
  }
  if (t.includes('TABLE') || t.includes('TABELA') || t.includes('GRID')) {
    return { label: tipo || 'Tabela', color: 'bg-teal-50 text-teal-700 border-teal-200' };
  }
  if (t.includes('IMAGE') || t.includes('IMAGEM')) {
    return { label: tipo || 'Imagem', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
  return { label: tipo || 'Componente', color: 'bg-slate-100 text-slate-700 border-slate-200' };
};

export default function DocumentCamposPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[var(--muted)]">Carregando campos do documento...</div>}>
      <DocumentCamposContent docId={resolvedParams.id} />
    </Suspense>
  );
}

function DocumentCamposContent({ docId }: { docId: string }) {
  const searchParams = useSearchParams();
  const { docVersion } = useUI();
  const urlVersion = searchParams.get('version');
  const resolvedVersion: 'V2' | 'V3' =
    (urlVersion || docVersion || 'V3').toUpperCase() === 'V2' ? 'V2' : 'V3';

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [docTitle, setDocTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<number | 'ALL'>('ALL');
  const [selectedLayout, setSelectedLayout] = useState<'ALL' | number>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | '1' | '0'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedHasRules, setSelectedHasRules] = useState<'ALL' | 'WITH_RULES' | 'WITHOUT_RULES'>('ALL');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    async function loadFields() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'FIELDS',
            version: resolvedVersion,
            params: { CD_DOCUMENTO: docId }
          })
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setFields(data.rows || []);
          if (data.rows && data.rows.length > 0) {
            // Busca o título do documento nos metadados
            fetchDocInfo();
          }
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar campos do documento.');
      } finally {
        setLoading(false);
      }
    }

    async function fetchDocInfo() {
      try {
        const res = await fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'METADATA',
            version: resolvedVersion,
            params: { CD_DOCUMENTO: docId }
          })
        });
        const data = await res.json();
        if (data.rows && data.rows.length > 0) {
          setDocTitle(data.rows[0].DESCRICAO_DOCUMENTO || '');
        }
      } catch (e) {
        console.error('Erro ao buscar título do documento:', e);
      }
    }

    if (docId) {
      loadFields();
    }
  }, [docId, resolvedVersion]);

  // Versões disponíveis
  const versions = useMemo(() => {
    const map = new Map<number, { version: number; type: string; published: number; count: number }>();
    fields.forEach(f => {
      const v = f.VL_VERSAO;
      if (v !== undefined && v !== null) {
        if (!map.has(v)) {
          map.set(v, {
            version: v,
            type: f.TP_VERSAO || (f.SN_PUBLICADO === 1 ? 'PUBLISHED' : 'HISTORY'),
            published: f.SN_PUBLICADO ?? 0,
            count: 0
          });
        }
        map.get(v)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.version - a.version);
  }, [fields]);

  // Predefine a versão publicada como padrão
  useEffect(() => {
    if (versions.length > 0 && selectedVersion === 'ALL') {
      const pub = versions.find(v => v.published === 1);
      if (pub) setSelectedVersion(pub.version);
    }
  }, [versions]);

  // Tipos de componentes únicos
  const componentTypes = useMemo(() => {
    const types = new Set<string>();
    fields.forEach(f => {
      if (f.DS_TIPO_VISUALIZACAO) types.add(f.DS_TIPO_VISUALIZACAO);
    });
    return Array.from(types).sort();
  }, [fields]);

  // Campos filtrados
  const filteredFields = useMemo(() => {
    return fields.filter(f => {
      if (selectedVersion !== 'ALL' && f.VL_VERSAO !== selectedVersion) return false;
      if (selectedLayout !== 'ALL' && f.CD_TIPO_LAYOUT !== selectedLayout) return false;
      if (selectedStatus !== 'ALL' && String(f.SN_ATIVO) !== selectedStatus) return false;
      if (selectedType !== 'ALL' && f.DS_TIPO_VISUALIZACAO !== selectedType) return false;
      if (selectedHasRules === 'WITH_RULES' && (!f.QTD_REGRAS || f.QTD_REGRAS === 0)) return false;
      if (selectedHasRules === 'WITHOUT_RULES' && f.QTD_REGRAS > 0) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTag = String(f.DS_IDENTIFICADOR || '').toLowerCase().includes(term);
        const matchName = String(f.DS_CAMPO || '').toLowerCase().includes(term);
        const matchMeta = String(f.CD_METADADO || '').toLowerCase().includes(term);
        const matchType = String(f.DS_TIPO_VISUALIZACAO || '').toLowerCase().includes(term);
        const matchLayout = String(f.DS_TIPO_LAYOUT || '').toLowerCase().includes(term);
        if (!matchTag && !matchName && !matchMeta && !matchType && !matchLayout) return false;
      }
      return true;
    });
  }, [fields, selectedVersion, selectedLayout, selectedStatus, selectedType, selectedHasRules, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredFields.length;
    const active = filteredFields.filter(f => f.SN_ATIVO === 1).length;
    const withMetadata = filteredFields.filter(f => f.CD_METADADO !== null && f.CD_METADADO !== undefined).length;
    const withRules = filteredFields.filter(f => f.QTD_REGRAS > 0).length;
    return { total, active, withMetadata, withRules };
  }, [filteredFields]);

  // Contagem de campos por layout para a versão selecionada
  const layoutCountsForVersion = useMemo(() => {
    const targetVer = selectedVersion !== 'ALL' 
      ? selectedVersion 
      : (versions.find(v => v.published === 1)?.version || versions[0]?.version);
    const list = selectedVersion === 'ALL' 
      ? fields 
      : fields.filter(f => f.VL_VERSAO === targetVer);
    const tela = list.filter(f => f.CD_TIPO_LAYOUT === 1).length;
    const relatorio = list.filter(f => f.CD_TIPO_LAYOUT === 2).length;
    return { all: list.length, tela, relatorio, targetVer };
  }, [fields, selectedVersion, versions]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(text);
    toast.success(`Identificador copiado: ${text}`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const exportCSV = () => {
    if (!filteredFields.length) {
      toast.error('Nenhum campo para exportar.');
      return;
    }
    const headers = ['Documento', 'Versão', 'Layout', 'Identificador', 'Descrição', 'Metadado_ID', 'Tipo_Componente', 'Status', 'Qtd_Regras'];
    const rows = filteredFields.map(f => [
      `"${docId}"`,
      `"${f.VL_VERSAO || ''}"`,
      `"${f.DS_TIPO_LAYOUT || ''}"`,
      `"${f.DS_IDENTIFICADOR || ''}"`,
      `"${(f.DS_CAMPO || '').replace(/"/g, '""')}"`,
      `"${f.CD_METADADO || ''}"`,
      `"${f.DS_TIPO_VISUALIZACAO || ''}"`,
      `"${f.SN_ATIVO === 1 ? 'Ativo' : 'Inativo'}"`,
      `"${f.QTD_REGRAS || 0}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo_campos_doc_${docId}_v${selectedVersion}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* Clean Canvas Header */}
      <div className="pb-3 border-b border-[#E0ECE9] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documentos"
            className="p-2 rounded-xl text-slate-500 hover:text-[#074E52] hover:bg-[#E6F4F1] border border-[#E0ECE9] bg-white transition-colors"
            title="Voltar para Catálogo de Documentos"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4F1] text-[#074E52] border border-[#CBE5DF] text-[11px] font-mono font-bold">
                Doc #{docId}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Governança de Metadados e Campos
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-[#0F2426] mt-0.5">
              {docTitle || `Documento ${docId}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={loading || filteredFields.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-[#074E52] hover:bg-[#F3F7F6] bg-white border border-[#D5E4E0] rounded-full flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} className="text-[#0D9488]" />
            <span>Exportar CSV</span>
          </button>
          <Link
            href={`/linhagem?focus=${docId}`}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#074E52] hover:bg-[#053A3D] rounded-full flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Layers size={14} />
            <span>Ver no Grafo de Linhagem</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-5">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#074E52] border border-[#053A3D] text-white p-4 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-emerald-100/90 uppercase tracking-wide block">
              Total no Filtro
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono">
                {kpis.total}
              </span>
              <span className="text-xs text-emerald-100/75">campos</span>
            </div>
          </div>

          <div className="bg-white border border-emerald-200/80 p-4 rounded-2xl shadow-2xs">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide block">
              Campos Ativos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-900 font-mono">
                {kpis.active}
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                {kpis.total > 0 ? `${Math.round((kpis.active / kpis.total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#CBE5DF] p-4 rounded-2xl shadow-2xs">
            <span className="text-xs font-semibold text-[#074E52] uppercase tracking-wide block">
              Metadados Reutilizáveis
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#074E52] font-mono">
                {kpis.withMetadata}
              </span>
              <span className="text-xs text-[#0D9488] font-medium">
                padronizados
              </span>
            </div>
          </div>

          <div className="bg-white border border-amber-200/80 p-4 rounded-2xl shadow-2xs">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide block">
              Com Regras Vinculadas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-amber-900 font-mono">
                {kpis.withRules}
              </span>
              <span className="text-xs text-amber-700 font-medium">
                com automações
              </span>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white border border-[#E0ECE9] p-4 rounded-2xl shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por identificador, rótulo, código ou metadado..."
                className="w-full pl-9 pr-8 py-2 bg-[#F7FAF9] border border-[#D5E4E0] rounded-lg text-xs font-medium text-[#0F2426] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#074E52]/20 focus:border-[#074E52] focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#074E52] text-sm font-bold cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Version Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 shrink-0">Versão:</span>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="text-xs font-bold bg-[#F7FAF9] border border-[#D5E4E0] rounded-lg px-3 py-2 text-[#0F2426] focus:outline-hidden focus:ring-2 focus:ring-[#074E52]/20 focus:border-[#074E52] cursor-pointer"
              >
                <option value="ALL">Todas as Versões ({fields.length} campos)</option>
                {versions.map(v => {
                  const verType = String(v.type || '').toUpperCase();
                  const statusLabel =
                    verType === 'PUBLISHED' || v.published === 1
                      ? '★ Publicada'
                      : ['EDITABLE', 'EDITAVEL'].includes(verType)
                        ? 'Editável'
                        : verType === 'TEST' || verType === 'DRAFT'
                          ? 'Em Teste'
                          : 'Histórico';
                  return (
                    <option key={v.version} value={v.version}>
                      v{v.version} — {statusLabel} ({v.count} campos)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Secondary Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EDF4F2] text-xs">
            {/* Layout Filter */}
            <div className="flex items-center gap-1 bg-[#EBF2F0] p-0.5 rounded-lg border border-[#D5E4E0]">
              <button
                onClick={() => setSelectedLayout('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer",
                  selectedLayout === 'ALL'
                    ? "bg-white text-[#074E52] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#074E52]"
                )}
              >
                <span>Todos Layouts</span>
                <span className="font-mono text-[10.5px] text-slate-500">({layoutCountsForVersion.all})</span>
              </button>
              <button
                onClick={() => setSelectedLayout(1)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer",
                  selectedLayout === 1
                    ? "bg-[#074E52] text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#074E52]"
                )}
              >
                <span>Tela (Editor)</span>
                <span className={cn(
                  "font-mono text-[10.5px]",
                  selectedLayout === 1 ? "text-emerald-100" : "text-slate-500"
                )}>({layoutCountsForVersion.tela})</span>
              </button>
              <button
                onClick={() => setSelectedLayout(2)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer",
                  selectedLayout === 2
                    ? "bg-[#0D9488] text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#074E52]"
                )}
              >
                <span>Relatório (Impressão)</span>
                <span className={cn(
                  "font-mono text-[10.5px]",
                  selectedLayout === 2 ? "text-emerald-100" : "text-slate-500"
                )}>({layoutCountsForVersion.relatorio})</span>
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#EBF2F0] p-0.5 rounded-lg border border-[#D5E4E0]">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                  selectedStatus === 'ALL'
                    ? "bg-white text-[#074E52] font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#074E52]"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedStatus('1')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                  selectedStatus === '1'
                    ? "bg-emerald-600 text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#074E52]"
                )}
              >
                Ativos
              </button>
              <button
                onClick={() => setSelectedStatus('0')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                  selectedStatus === '0'
                    ? "bg-slate-700 text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-[#074E52]"
                )}
              >
                Inativos
              </button>
            </div>

            {/* Component Type Filter */}
            {componentTypes.length > 0 && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs bg-[#F7FAF9] border border-[#D5E4E0] rounded-lg px-2.5 py-1 font-medium text-[#0F2426] focus:outline-hidden focus:ring-2 focus:ring-[#074E52]/20 focus:border-[#074E52] cursor-pointer"
              >
                <option value="ALL">Todos Componentes</option>
                {componentTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {/* Rules Filter */}
            <button
              onClick={() => setSelectedHasRules(selectedHasRules === 'WITH_RULES' ? 'ALL' : 'WITH_RULES')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold transition-all border flex items-center gap-1 cursor-pointer",
                selectedHasRules === 'WITH_RULES'
                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                  : "bg-white text-slate-600 border-[#D5E4E0] hover:bg-[#F3F7F6]"
              )}
            >
              <Zap size={12} />
              <span>Apenas com Regras</span>
            </button>

            {(selectedVersion !== 'ALL' || selectedLayout !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL' || selectedHasRules !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedVersion('ALL');
                  setSelectedLayout('ALL');
                  setSelectedStatus('ALL');
                  setSelectedType('ALL');
                  setSelectedHasRules('ALL');
                  setSearchTerm('');
                }}
                className="text-[#074E52] hover:underline font-bold text-xs ml-auto cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Fields Table */}
        <div className="bg-white border border-[#E0ECE9] rounded-2xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="p-8 space-y-4">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">
              <AlertTriangle size={32} className="mx-auto mb-2 text-rose-500" />
              <p className="font-bold text-sm">Erro ao carregar campos</p>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Search size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-bold text-sm text-slate-600">Nenhum campo encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar os termos de busca ou filtros de layout/versão.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#074E52] text-white font-semibold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3.5 px-4">Identificador Técnico</th>
                    <th className="py-3.5 px-4">Rótulo / Descrição</th>
                    <th className="py-3.5 px-3">Componente</th>
                    <th className="py-3.5 px-3">Metadado Padrão</th>
                    <th className="py-3.5 px-3">Layout</th>
                    <th className="py-3.5 px-3">Versão</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-center">Regras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF4F2]">
                  {filteredFields.map((field, idx) => {
                    const typeBadge = getFieldTypeBadge(field.DS_TIPO_VISUALIZACAO);
                    const isCopied = copiedTag === field.DS_IDENTIFICADOR;

                    return (
                      <tr 
                        key={`fld_row_${field.CD_CAMPO}_${field.VL_VERSAO}_${field.CD_LAYOUT}_${idx}`}
                        className="hover:bg-[#F3F7F6]/70 transition-colors group"
                      >
                        {/* Identificador */}
                        <td className="py-3 px-4 font-mono font-bold text-[#0F2426]">
                          <button
                            onClick={() => copyToClipboard(field.DS_IDENTIFICADOR)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#E6F4F1] hover:bg-[#CBE5DF]/70 text-[#074E52] border border-[#CBE5DF] transition-colors text-left cursor-pointer"
                            title="Clique para copiar identificador técnico"
                          >
                            <span>{field.DS_IDENTIFICADOR}</span>
                            {isCopied ? (
                              <Check size={12} className="text-emerald-600 shrink-0" />
                            ) : (
                              <Copy size={12} className="opacity-50 group-hover:opacity-90 shrink-0" />
                            )}
                          </button>
                        </td>

                        {/* Rótulo / Descrição */}
                        <td className="py-3 px-4 font-medium text-[#0F2426] max-w-xs">
                          {field.DS_CAMPO && field.DS_CAMPO !== field.DS_IDENTIFICADOR ? (
                            <span>{field.DS_CAMPO}</span>
                          ) : (
                            <span className="italic text-slate-400">Sem rótulo customizado</span>
                          )}
                        </td>

                        {/* Tipo de Componente */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                            typeBadge.color
                          )}>
                            {typeBadge.label}
                          </span>
                        </td>

                        {/* Metadado Padrão */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {field.CD_METADADO ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10.5px] font-bold">
                              <Sparkles size={10} className="text-emerald-600" />
                              MD #{field.CD_METADADO}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Layout */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border uppercase",
                            field.CD_TIPO_LAYOUT === 1
                              ? "bg-[#E6F4F1] text-[#074E52] border-[#CBE5DF]"
                              : "bg-teal-50 text-teal-700 border-teal-200"
                          )}>
                            {field.DS_TIPO_LAYOUT || (field.CD_TIPO_LAYOUT === 1 ? 'Tela' : 'Relatório')}
                          </span>
                        </td>

                        {/* Versão */}
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                          v{field.VL_VERSAO}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            field.SN_ATIVO === 1
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          )}>
                            {field.SN_ATIVO === 1 ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        {/* Regras */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {field.QTD_REGRAS > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10.5px]">
                              <Zap size={11} className="text-amber-600" />
                              {field.QTD_REGRAS}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

