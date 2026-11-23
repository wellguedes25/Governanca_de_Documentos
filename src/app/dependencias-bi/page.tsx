"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import {
  BarChart3, Plus, Search, Download, Upload, FileText, Gauge,
  DatabaseZap, Code2, ExternalLink, Edit2, Trash2, AlertTriangle,
  Building2, User, Layers, Network, X, ShieldAlert
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUI } from '@/context/UIContext';
import { HospitalMapping } from '@/lib/storage';
import {
  BiArtifact,
  BiArtifactType,
  BiCriticality,
  BiCatalogDocOption,
  BiDocumentLink,
} from '@/types/bi-dependencies.types';
import { BiArtifactModal, ARTIFACT_TYPE_META } from '@/components/dependencias-bi/BiArtifactModal';
import { cn } from '@/lib/utils';

type ViewMode = 'by_document' | 'by_artifact';

export default function DependenciasBiPage() {
  const { oracleData, docVersion, confirmAction } = useUI();

  const [artifacts, setArtifacts] = useState<BiArtifact[]>([]);
  const [serverCatalogDocs, setServerCatalogDocs] = useState<BiCatalogDocOption[]>([]);
  const [hospitals, setHospitals] = useState<HospitalMapping[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('by_document');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<BiArtifactType | 'ALL'>('ALL');
  const [filterCriticality, setFilterCriticality] = useState<BiCriticality | 'ALL'>('ALL');
  const [filterTool, setFilterTool] = useState<string>('ALL');
  const [filterHospital, setFilterHospital] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<BiArtifact | null>(null);
  const [preselectedDoc, setPreselectedDoc] = useState<{ docId: string; docName: string; motor?: 'V2' | 'V3' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDependencies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dependencias-bi');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar dependências BI.');
      setArtifacts(data.artifacts || []);
      setServerCatalogDocs(data.catalogDocs || []);
      setHospitals(data.hospitals || []);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao carregar mapeamentos BI.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  // Combina cache do servidor + oracleData em memória (caso o usuário tenha carregado o catálogo agora)
  const catalogDocs = useMemo<BiCatalogDocOption[]>(() => {
    const map = new Map<string, BiCatalogDocOption>();
    serverCatalogDocs.forEach(d => map.set(d.id, d));

    if (Array.isArray(oracleData)) {
      const motor = docVersion || 'V3';
      oracleData.forEach((r: any) => {
        const id = String(r['CÓDIGO'] || r['CODIGO'] || r['CD_DOCUMENTO'] || '').trim();
        const nome = String(r['NOME'] || r['DOCUMENTO CLÍNICO'] || r['DS_DOCUMENTO'] || '').trim();
        const totalUsos = Number(r['TOTAL'] || 0);
        if (id && !map.has(id)) {
          map.set(id, { id, nome: nome || `Documento #${id}`, motor, totalUsos: isNaN(totalUsos) ? 0 : totalUsos });
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => (b.totalUsos || 0) - (a.totalUsos || 0));
  }, [serverCatalogDocs, oracleData, docVersion]);

  const uniqueTools = useMemo(() => {
    const set = new Set<string>();
    artifacts.forEach(a => {
      if (a.ferramenta) set.add(a.ferramenta);
    });
    return Array.from(set).sort();
  }, [artifacts]);

  // Filtros aplicados aos artefatos
  const filteredArtifacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return artifacts.filter(a => {
      if (filterType !== 'ALL' && a.tipo !== filterType) return false;
      if (filterCriticality !== 'ALL' && a.criticidade !== filterCriticality) return false;
      if (filterTool !== 'ALL' && a.ferramenta !== filterTool) return false;
      if (filterHospital !== 'ALL' && a.unidades.length > 0 && !a.unidades.includes(filterHospital)) return false;

      if (term) {
        const matchHeader =
          a.nome.toLowerCase().includes(term) ||
          (a.descricao || '').toLowerCase().includes(term) ||
          (a.responsavel || '').toLowerCase().includes(term) ||
          (a.ferramenta || '').toLowerCase().includes(term);

        const matchDocs = (a.documentosVinculados || []).some(
          d =>
            d.docId.toLowerCase().includes(term) ||
            d.docName.toLowerCase().includes(term) ||
            (d.fields || []).some(f => f.toLowerCase().includes(term))
        );
        if (!matchHeader && !matchDocs) return false;
      }

      return true;
    });
  }, [artifacts, filterType, filterCriticality, filterTool, filterHospital, searchTerm]);

  // Agrupamento Por Documento Clínico (Análise de Impacto)
  const groupedByDocument = useMemo(() => {
    const map = new Map<
      string,
      {
        docId: string;
        docName: string;
        motor: 'V2' | 'V3';
        links: Array<{ artifact: BiArtifact; link: BiDocumentLink }>;
        highCriticalityCount: number;
        totalFields: number;
      }
    >();

    filteredArtifacts.forEach(artifact => {
      (artifact.documentosVinculados || []).forEach(link => {
        if (!map.has(link.docId)) {
          const catalogMatch = catalogDocs.find(c => c.id === link.docId);
          map.set(link.docId, {
            docId: link.docId,
            docName: link.docName || catalogMatch?.nome || `Documento #${link.docId}`,
            motor: link.motor || catalogMatch?.motor || 'V3',
            links: [],
            highCriticalityCount: 0,
            totalFields: 0,
          });
        }
        const entry = map.get(link.docId)!;
        entry.links.push({ artifact, link });
        if (artifact.criticidade === 'ALTA') entry.highCriticalityCount++;
        entry.totalFields += (link.fields || []).length;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.links.length - a.links.length);
  }, [filteredArtifacts, catalogDocs]);

  // KPIs
  const kpis = useMemo(() => {
    const distinctDocs = new Set<string>();
    let totalFields = 0;
    let highCrit = 0;

    artifacts.forEach(a => {
      if (a.criticidade === 'ALTA') highCrit++;
      (a.documentosVinculados || []).forEach(d => {
        distinctDocs.add(d.docId);
        totalFields += (d.fields || []).length;
      });
    });

    return {
      totalArtifacts: artifacts.length,
      distinctDocsCount: distinctDocs.size,
      highCriticalityCount: highCrit,
      totalFieldsTracked: totalFields,
    };
  }, [artifacts]);

  const handleSaveArtifact = async (
    payload: Omit<BiArtifact, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }
  ) => {
    const isEdit = Boolean(payload.id);
    const res = await fetch('/api/dependencias-bi', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Erro ao salvar artefato BI.');
      throw new Error(data.error);
    }
    setArtifacts(data.artifacts || []);
    toast.success(isEdit ? 'Vínculo atualizado com sucesso!' : 'Novo vínculo BI cadastrado!');
  };

  const handleDeleteArtifact = async (artifact: BiArtifact) => {
    const confirmed = await confirmAction({
      title: 'Remover Vínculo Analítico',
      description: `Deseja remover o artefato "${artifact.nome}" e todos os seus vínculos com documentos clínicos?`,
      confirmLabel: 'Sim, Remover',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/dependencias-bi?id=${encodeURIComponent(artifact.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');
      setArtifacts(data.artifacts || []);
      toast.success('Artefato removido.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir artefato.');
    }
  };

  // Exportação Excel (2 Abas)
  const handleExportExcel = () => {
    if (artifacts.length === 0) {
      toast.error('Nenhum vínculo cadastrado para exportar.');
      return;
    }

    const wb = XLSX.utils.book_new();

    const artifactsRows = filteredArtifacts.map(a => ({
      ID: a.id,
      Nome: a.nome,
      Tipo: ARTIFACT_TYPE_META[a.tipo]?.shortLabel || a.tipo,
      Codigo_Tipo: a.tipo,
      Ferramenta: a.ferramenta,
      Criticidade: a.criticidade,
      Responsavel: a.responsavel,
      Unidades: a.unidades.length > 0 ? a.unidades.join(', ') : 'TODAS',
      URL: a.url || '',
      Descricao: a.descricao || '',
      Qtd_Documentos: a.documentosVinculados.length,
    }));

    const matrixRows: any[] = [];
    filteredArtifacts.forEach(a => {
      (a.documentosVinculados || []).forEach(d => {
        matrixRows.push({
          Artefato_ID: a.id,
          Artefato_Nome: a.nome,
          Tipo: a.tipo,
          Ferramenta: a.ferramenta,
          Criticidade: a.criticidade,
          Responsavel: a.responsavel,
          Unidades: a.unidades.length > 0 ? a.unidades.join(', ') : 'TODAS',
          URL: a.url || '',
          Doc_Codigo: d.docId,
          Doc_Nome: d.docName,
          Motor: d.motor || 'V3',
          Campos_Identificadores: (d.fields || []).join(', '),
          Observacao: d.observacao || '',
        });
      });
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(artifactsRows), 'Artefatos_BI');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrixRows), 'Matriz_Documentos_Campos');

    XLSX.writeFile(wb, `Goverdoc_Dependencias_BI_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Planilha de Dependências BI exportada!');
  };

  // Importação Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      // Prioriza aba Matriz_Documentos_Campos ou primeira aba disponível
      const sheetName = wb.SheetNames.includes('Matriz_Documentos_Campos')
        ? 'Matriz_Documentos_Campos'
        : wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[sheetName]);

      if (!rows || rows.length === 0) {
        toast.error('A planilha está vazia.');
        return;
      }

      const grouped = new Map<string, Partial<BiArtifact>>();

      for (const row of rows) {
        const nome = String(row.Artefato_Nome || row.Nome || row.nome || '').trim();
        if (!nome) continue;

        const rawTipo = String(row.Tipo || row.Codigo_Tipo || 'RELATORIO').toUpperCase();
        const tipo: BiArtifactType =
          rawTipo.includes('PAINEL') ? 'PAINEL_BI' :
          rawTipo.includes('INDICADOR') || rawTipo.includes('KPI') ? 'INDICADOR' :
          rawTipo.includes('EXTRACAO') ? 'EXTRACAO' :
          rawTipo.includes('QUERY') || rawTipo.includes('VIEW') ? 'QUERY_VIEW' :
          'RELATORIO';

        const rawCrit = String(row.Criticidade || 'MEDIA').toUpperCase();
        const criticidade: BiCriticality =
          rawCrit.includes('ALTA') ? 'ALTA' : rawCrit.includes('BAIXA') ? 'BAIXA' : 'MEDIA';

        const rawUnidades = String(row.Unidades || '').trim();
        const unidades =
          !rawUnidades || rawUnidades.toUpperCase() === 'TODAS'
            ? []
            : rawUnidades.split(/[,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

        const docId = String(row.Doc_Codigo || row.CD_DOCUMENTO || '').trim();
        const docName = String(row.Doc_Nome || row.DS_DOCUMENTO || (docId ? `Documento #${docId}` : '')).trim();
        const rawFields = String(row.Campos_Identificadores || row.Campos || '').trim();
        const fields = rawFields
          ? rawFields.split(/[,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
          : [];

        const key = `${nome.toLowerCase()}::${tipo}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: row.Artefato_ID ? String(row.Artefato_ID) : undefined,
            nome,
            tipo,
            ferramenta: String(row.Ferramenta || 'Power BI').trim(),
            criticidade,
            responsavel: String(row.Responsavel || 'Não informado').trim(),
            url: row.URL ? String(row.URL).trim() : '',
            descricao: row.Descricao ? String(row.Descricao).trim() : '',
            unidades,
            documentosVinculados: [],
          });
        }

        if (docId) {
          grouped.get(key)!.documentosVinculados!.push({
            docId,
            docName,
            motor: String(row.Motor || 'V3').toUpperCase() === 'V2' ? 'V2' : 'V3',
            fields,
            observacao: row.Observacao ? String(row.Observacao).trim() : '',
          });
        }
      }

      const payload = Array.from(grouped.values());
      if (payload.length === 0) {
        toast.error('Nenhuma linha válida encontrada. Use o Excel exportado como modelo.');
        return;
      }

      const res = await fetch('/api/dependencias-bi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'IMPORT_BATCH', artifacts: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar planilha.');

      setArtifacts(data.artifacts || []);
      toast.success(
        `Importação concluída: ${data.summary?.createdCount || 0} criados, ${data.summary?.updatedCount || 0} atualizados.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Falha ao ler arquivo Excel.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getCriticalityBadge = (crit: BiCriticality) => {
    if (crit === 'ALTA') return { label: 'Alta Criticidade', cls: 'tone-danger border' };
    if (crit === 'MEDIA') return { label: 'Média Criticidade', cls: 'tone-warning border' };
    return { label: 'Baixa Criticidade', cls: 'tone-success border' };
  };

  return (
    <div className="flex flex-col space-y-5">
      <Toaster position="top-right" reverseOrder={false} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* 1. Header Sylva */}
      <div className="pb-3 border-b border-[var(--border)]">
        <PageHeader
          title="Dependências BI & Indicadores"
          subtitle="Mapeamento de relatórios, painéis analíticos, KPIs e extrações que consomem respostas de documentos do prontuário"
          icon={Network}
          badge={
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)]"
            >
              Impacto Downstream
            </Badge>
          }
          action={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-xs font-semibold rounded-full sylva-pill h-9 px-4 cursor-pointer"
                title="Importar vínculos via planilha Excel"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Excel</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={artifacts.length === 0}
                className="gap-2 text-xs font-semibold rounded-full sylva-pill h-9 px-4 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                <span>Exportar Excel</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEditingArtifact(null);
                  setPreselectedDoc(null);
                  setModalOpen(true);
                }}
                className="gap-2 text-xs font-bold rounded-full bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 shadow-[0_4px_14px_rgba(204,243,82,0.25)] h-9 px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Vínculo BI</span>
              </Button>
            </>
          }
        />
      </div>

      {/* 2. 4 Bento KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sylva-card-olive rounded-[22px] p-5 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--tint-olive-muted)]">
              Artefatos Mapeados
            </span>
            <div className="p-2 rounded-xl bg-[var(--card-solid)]/60 text-[var(--tint-olive-fg)] border border-[var(--tint-olive-border)]">
              <BarChart3 size={17} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--tint-olive-fg)]">{kpis.totalArtifacts}</div>
            <p className="text-[11px] text-[var(--tint-olive-muted)] mt-1">
              Relatórios, painéis, KPIs e views
            </p>
          </div>
        </div>

        <div className="sylva-card-mocha rounded-[22px] p-5 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--tint-mocha-muted)]">
              Docs com Dependência BI
            </span>
            <div className="p-2 rounded-xl bg-[var(--card-solid)]/60 text-[var(--tint-mocha-fg)] border border-[var(--tint-mocha-border)]">
              <FileText size={17} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--tint-mocha-fg)]">{kpis.distinctDocsCount}</div>
            <p className="text-[11px] text-[var(--tint-mocha-muted)] mt-1">
              Documentos clínicos monitorados
            </p>
          </div>
        </div>

        <div className="sylva-card-slate rounded-[22px] p-5 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--tint-slate-muted)]">
              Alta Criticidade
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30">
              <ShieldAlert size={17} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--tint-slate-fg)]">{kpis.highCriticalityCount}</div>
            <p className="text-[11px] text-[var(--tint-slate-muted)] mt-1">
              Impacto crítico se alterados
            </p>
          </div>
        </div>

        <div className="sylva-glass rounded-[22px] p-5 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Campos Rastreados
            </span>
            <div className="p-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
              <Layers size={17} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--foreground)]">{kpis.totalFieldsTracked}</div>
            <p className="text-[11px] text-[var(--muted)] mt-1">
              Identificadores vinculados ao BI
            </p>
          </div>
        </div>
      </div>

      {/* 3. Dock de Visões + Filtros */}
      <div className="sylva-glass rounded-[22px] p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented View Toggle */}
          <div className="inline-flex items-center gap-1 p-1 bg-[var(--card-subtle)] rounded-full border border-[var(--border)] self-start">
            <button
              type="button"
              onClick={() => setViewMode('by_document')}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer',
                viewMode === 'by_document'
                  ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold shadow-xs'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              )}
            >
              <FileText size={13} />
              <span>Por Documento (Impacto)</span>
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                viewMode === 'by_document' ? 'bg-[var(--lime)] text-[var(--lime-ink)]' : 'bg-[var(--card-hover)]'
              )}>
                {groupedByDocument.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('by_artifact')}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer',
                viewMode === 'by_artifact'
                  ? 'bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold shadow-xs'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              )}
            >
              <BarChart3 size={13} />
              <span>Catálogo de Artefatos BI</span>
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                viewMode === 'by_artifact' ? 'bg-[var(--lime)] text-[var(--lime-ink)]' : 'bg-[var(--card-hover)]'
              )}>
                {filteredArtifacts.length}
              </span>
            </button>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[230px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar doc #382, campo, relatório..."
                className="w-full pl-9 pr-8 py-1.5 bg-[var(--card-subtle)] border border-[var(--border)] rounded-full text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as BiArtifactType | 'ALL')}
              className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
            >
              <option value="ALL">Todos os Tipos</option>
              {(Object.keys(ARTIFACT_TYPE_META) as BiArtifactType[]).map(t => (
                <option key={t} value={t}>{ARTIFACT_TYPE_META[t].shortLabel}</option>
              ))}
            </select>

            <select
              value={filterTool}
              onChange={e => setFilterTool(e.target.value)}
              className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
            >
              <option value="ALL">Todas Ferramentas</option>
              {uniqueTools.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={filterCriticality}
              onChange={e => setFilterCriticality(e.target.value as BiCriticality | 'ALL')}
              className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
            >
              <option value="ALL">Todas Criticidades</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>

            {hospitals.length > 0 && (
              <select
                value={filterHospital}
                onChange={e => setFilterHospital(e.target.value)}
                className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
              >
                <option value="ALL">Todas Unidades</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.sigla}>{h.sigla}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 4. Conteúdo Principal */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="sylva-glass rounded-[22px] p-5 h-44 animate-pulse">
              <div className="skeleton h-5 w-48 mb-3" />
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredArtifacts.length === 0 ? (
        <div className="sylva-glass rounded-[24px] p-16 text-center border border-dashed border-[var(--border)]">
          <Network size={40} className="mx-auto mb-3 opacity-35 text-[var(--muted)]" />
          <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">
            Nenhum vínculo encontrado
          </h3>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto mb-4">
            Cadastre manualmente os relatórios, painéis de BI e indicadores que utilizam respostas dos documentos clínicos ou importe via Excel.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingArtifact(null);
              setPreselectedDoc(null);
              setModalOpen(true);
            }}
            className="px-5 py-2 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] font-bold text-xs cursor-pointer hover:brightness-105"
          >
            + Mapear Primeiro Vínculo
          </button>
        </div>
      ) : viewMode === 'by_document' ? (
        /* VISÃO 1: AGRUPADO POR DOCUMENTO CLÍNICO (ANÁLISE DE IMPACTO) */
        <div className="space-y-4">
          {groupedByDocument.map(group => (
            <div
              key={group.docId}
              className="sylva-glass rounded-[24px] p-5 border border-[var(--border)] space-y-4"
            >
              {/* Cabeçalho do Documento */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] font-mono font-bold text-xs shadow-xs">
                    #{group.docId}
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)] leading-snug">
                      {group.docName}
                    </h3>
                    <div className="flex items-center gap-2.5 text-[11px] text-[var(--muted)] mt-0.5 flex-wrap">
                      <span className="font-mono">{group.motor}</span>
                      <span>•</span>
                      <span>
                        <b className="text-[var(--foreground)]">{group.links.length}</b>{' '}
                        {group.links.length === 1 ? 'artefato dependente' : 'artefatos dependentes'}
                      </span>
                      {group.highCriticalityCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-500 font-bold flex items-center gap-1">
                            <AlertTriangle size={11} />
                            {group.highCriticalityCount} de alta criticidade
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingArtifact(null);
                    setPreselectedDoc({ docId: group.docId, docName: group.docName, motor: group.motor });
                    setModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent-ink)] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Vincular a #{group.docId}</span>
                </button>
              </div>

              {/* Lista de Artefatos Dependentes deste Documento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {group.links.map(({ artifact, link }) => {
                  const typeMeta = ARTIFACT_TYPE_META[artifact.tipo] || ARTIFACT_TYPE_META.RELATORIO;
                  const TypeIcon = typeMeta.icon;
                  const critBadge = getCriticalityBadge(artifact.criticidade);

                  return (
                    <div
                      key={`${group.docId}-${artifact.id}`}
                      className="bg-[var(--card-subtle)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="p-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] shrink-0">
                              <TypeIcon size={15} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-[var(--foreground)] leading-snug">
                                {artifact.nome}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-solid)] border border-[var(--border)] text-[var(--foreground-secondary)]">
                                  {typeMeta.shortLabel}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-solid)] border border-[var(--border)] text-[var(--accent-ink)]">
                                  {artifact.ferramenta}
                                </span>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', critBadge.cls)}>
                                  {critBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {artifact.url && (
                              <a
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
                                title="Abrir relatório/painel"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingArtifact(artifact);
                                setPreselectedDoc(null);
                                setModalOpen(true);
                              }}
                              className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                              title="Editar vínculo"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteArtifact(artifact)}
                              className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Campos específicos consumidos */}
                        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                            Campos Utilizados:
                          </span>
                          {link.fields && link.fields.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {link.fields.map(f => (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 rounded-md bg-[var(--accent)] border border-[var(--tint-olive-border)] text-[var(--accent-ink)] font-mono text-[10px] font-bold"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-[var(--muted)]">
                              Vínculo em nível de documento (sem campos especificados)
                            </span>
                          )}
                          {link.observacao && (
                            <p className="text-[11px] text-[var(--foreground-secondary)] leading-relaxed">
                              {link.observacao}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--muted)]">
                        <span className="flex items-center gap-1 truncate">
                          <User size={11} /> {artifact.responsavel}
                        </span>
                        <span className="flex items-center gap-1 font-mono shrink-0">
                          <Building2 size={11} />
                          {artifact.unidades.length > 0 ? artifact.unidades.join(', ') : 'Todas'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISÃO 2: CATÁLOGO DE ARTEFATOS BI */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredArtifacts.map(artifact => {
            const typeMeta = ARTIFACT_TYPE_META[artifact.tipo] || ARTIFACT_TYPE_META.RELATORIO;
            const TypeIcon = typeMeta.icon;
            const critBadge = getCriticalityBadge(artifact.criticidade);

            return (
              <div
                key={artifact.id}
                className="sylva-glass rounded-[24px] p-5 border border-[var(--border)] flex flex-col justify-between gap-4 hover:border-[var(--border-strong)] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] shrink-0">
                        <TypeIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug">
                          {artifact.nome}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)]">
                            {typeMeta.shortLabel}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--accent-ink)]">
                            {artifact.ferramenta}
                          </span>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', critBadge.cls)}>
                            {critBadge.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {artifact.url && (
                        <a
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
                          title="Abrir URL externa"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingArtifact(artifact);
                          setPreselectedDoc(null);
                          setModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArtifact(artifact)}
                        className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {artifact.descricao && (
                    <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                      {artifact.descricao}
                    </p>
                  )}

                  {/* Documentos de Origem */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                      Documentos Fontes ({artifact.documentosVinculados.length}):
                    </span>
                    <div className="space-y-2">
                      {artifact.documentosVinculados.map(doc => (
                        <div
                          key={doc.docId}
                          className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] font-mono font-bold text-[10.5px] shrink-0">
                                #{doc.docId}
                              </span>
                              <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                                {doc.docName}
                              </span>
                            </div>
                            {doc.motor && (
                              <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">
                                {doc.motor}
                              </span>
                            )}
                          </div>

                          {doc.fields && doc.fields.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {doc.fields.map(f => (
                                <span
                                  key={f}
                                  className="px-1.5 py-0.2 rounded bg-[var(--accent)] border border-[var(--tint-olive-border)] text-[var(--accent-ink)] font-mono text-[10px] font-bold"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--muted)]">
                  <span className="flex items-center gap-1.5 truncate">
                    <User size={12} /> {artifact.responsavel}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono shrink-0">
                    <Building2 size={12} />
                    {artifact.unidades.length > 0 ? artifact.unidades.join(', ') : 'Todas as Unidades'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <BiArtifactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        artifact={editingArtifact}
        preselectedDoc={preselectedDoc}
        catalogDocs={catalogDocs}
        hospitals={hospitals}
        onSave={handleSaveArtifact}
      />
    </div>
  );
}
