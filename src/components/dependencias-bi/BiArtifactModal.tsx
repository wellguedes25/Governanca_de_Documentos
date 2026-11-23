"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, FileText, BarChart3, Gauge, DatabaseZap, Code2,
  Plus, Trash2, Search, Loader2, Sparkles, Check, Building2, Link2
} from 'lucide-react';
import {
  BiArtifact,
  BiArtifactType,
  BiCriticality,
  BiDocumentLink,
  BiCatalogDocOption,
} from '@/types/bi-dependencies.types';
import { HospitalMapping } from '@/lib/storage';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export const ARTIFACT_TYPE_META: Record<BiArtifactType, { label: string; shortLabel: string; icon: React.ElementType }> = {
  RELATORIO: { label: 'Relatório Operacional / Assistencial', shortLabel: 'Relatório', icon: FileText },
  PAINEL_BI: { label: 'Painel / Dashboard BI', shortLabel: 'Painel BI', icon: BarChart3 },
  INDICADOR: { label: 'Indicador (KPI)', shortLabel: 'Indicador', icon: Gauge },
  EXTRACAO: { label: 'Extração / Integração de Dados', shortLabel: 'Extração', icon: DatabaseZap },
  QUERY_VIEW: { label: 'Query / View no Banco', shortLabel: 'Query / View', icon: Code2 },
};

const TOOL_OPTIONS = [
  'Power BI',
  'Qlik',
  'Tableau',
  'MV',
  'Oracle / View',
  'Excel / Integrador',
  'Outro',
];

interface OracleFieldOption {
  identificador: string;
  nome: string;
  tipo?: string;
}

interface BiArtifactModalProps {
  open: boolean;
  onClose: () => void;
  artifact: BiArtifact | null;
  preselectedDoc?: { docId: string; docName: string; motor?: 'V2' | 'V3' } | null;
  catalogDocs: BiCatalogDocOption[];
  hospitals: HospitalMapping[];
  onSave: (payload: Omit<BiArtifact, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }) => Promise<void>;
}

export function BiArtifactModal({
  open,
  onClose,
  artifact,
  preselectedDoc,
  catalogDocs,
  hospitals,
  onSave,
}: BiArtifactModalProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<BiArtifactType>('PAINEL_BI');
  const [ferramenta, setFerramenta] = useState('Power BI');
  const [responsavel, setResponsavel] = useState('');
  const [area, setArea] = useState('');
  const [url, setUrl] = useState('');
  const [criticidade, setCriticidade] = useState<BiCriticality>('ALTA');
  const [unidades, setUnidades] = useState<string[]>([]);
  const [documentosVinculados, setDocumentosVinculados] = useState<BiDocumentLink[]>([]);
  const [saving, setSaving] = useState(false);

  // Busca de documentos para vincular
  const [docSearch, setDocSearch] = useState('');
  const [manualDocId, setManualDocId] = useState('');
  const [manualDocName, setManualDocName] = useState('');
  const [manualDocMotor, setManualDocMotor] = useState<'V3' | 'V2'>('V3');

  // Campos carregados do Oracle por documento
  const [oracleFieldsByDoc, setOracleFieldsByDoc] = useState<Record<string, OracleFieldOption[]>>({});
  const [loadingFieldsDoc, setLoadingFieldsDoc] = useState<string | null>(null);
  const [customFieldInputs, setCustomFieldInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (artifact) {
      setNome(artifact.nome || '');
      setDescricao(artifact.descricao || '');
      setTipo(artifact.tipo || 'PAINEL_BI');
      setFerramenta(artifact.ferramenta || 'Power BI');
      setResponsavel(artifact.responsavel || '');
      setArea(artifact.area || '');
      setUrl(artifact.url || '');
      setCriticidade(artifact.criticidade || 'MEDIA');
      setUnidades(artifact.unidades || []);
      setDocumentosVinculados(
        (artifact.documentosVinculados || []).map(d => ({
          ...d,
          fields: d.fields || [],
        }))
      );
    } else {
      setNome('');
      setDescricao('');
      setTipo('PAINEL_BI');
      setFerramenta('Power BI');
      setResponsavel('');
      setArea('');
      setUrl('');
      setCriticidade('ALTA');
      setUnidades([]);
      setDocumentosVinculados(
        preselectedDoc
          ? [{
              docId: preselectedDoc.docId,
              docName: preselectedDoc.docName,
              motor: preselectedDoc.motor || 'V3',
              fields: [],
              observacao: '',
            }]
          : []
      );
    }
    setDocSearch('');
    setManualDocId('');
    setManualDocName('');
    setCustomFieldInputs({});
  }, [open, artifact, preselectedDoc]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const filteredCatalog = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return catalogDocs.slice(0, 8);
    return catalogDocs
      .filter(d => d.id.toLowerCase().includes(q) || d.nome.toLowerCase().includes(q))
      .slice(0, 10);
  }, [catalogDocs, docSearch]);

  const toggleUnidade = (sigla: string) => {
    setUnidades(prev =>
      prev.includes(sigla) ? prev.filter(s => s !== sigla) : [...prev, sigla]
    );
  };

  const handleAddDocLink = (docId: string, docName: string, motor: 'V2' | 'V3' = 'V3') => {
    const cleanId = docId.trim();
    if (!cleanId) {
      toast.error('Informe o código do documento.');
      return;
    }
    if (documentosVinculados.some(d => d.docId === cleanId)) {
      toast.error(`Documento #${cleanId} já está vinculado neste artefato.`);
      return;
    }
    setDocumentosVinculados(prev => [
      ...prev,
      {
        docId: cleanId,
        docName: docName.trim() || `Documento #${cleanId}`,
        motor,
        fields: [],
        observacao: '',
      },
    ]);
    setDocSearch('');
    setManualDocId('');
    setManualDocName('');
  };

  const handleRemoveDocLink = (docId: string) => {
    setDocumentosVinculados(prev => prev.filter(d => d.docId !== docId));
  };

  const handleToggleField = (docId: string, fieldIdent: string) => {
    const cleanField = fieldIdent.trim().toUpperCase();
    if (!cleanField) return;
    setDocumentosVinculados(prev =>
      prev.map(link => {
        if (link.docId !== docId) return link;
        const exists = link.fields.includes(cleanField);
        return {
          ...link,
          fields: exists
            ? link.fields.filter(f => f !== cleanField)
            : [...link.fields, cleanField],
        };
      })
    );
  };

  const handleAddCustomField = (docId: string) => {
    const raw = (customFieldInputs[docId] || '').trim().toUpperCase();
    if (!raw) return;
    const parts = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    setDocumentosVinculados(prev =>
      prev.map(link => {
        if (link.docId !== docId) return link;
        const merged = Array.from(new Set([...link.fields, ...parts]));
        return { ...link, fields: merged };
      })
    );
    setCustomFieldInputs(prev => ({ ...prev, [docId]: '' }));
  };

  const handleLoadOracleFields = async (docId: string) => {
    setLoadingFieldsDoc(docId);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'FIELDS',
          params: { CD_DOCUMENTO: String(docId).trim() },
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error || 'Não foi possível buscar campos no Oracle. Adicione manualmente.');
        return;
      }
      const rows: any[] = json.rows || [];
      const seen = new Set<string>();
      const unique: OracleFieldOption[] = [];
      for (const r of rows) {
        const ident = String(r.DS_IDENTIFICADOR || '').trim();
        if (!ident || seen.has(ident)) continue;
        seen.add(ident);
        unique.push({
          identificador: ident,
          nome: String(r.DS_CAMPO || ident).trim(),
          tipo: r.DS_TIPO_VISUALIZACAO ? String(r.DS_TIPO_VISUALIZACAO) : undefined,
        });
      }
      setOracleFieldsByDoc(prev => ({ ...prev, [docId]: unique }));
      if (unique.length === 0) {
        toast('Nenhum campo retornado no Editor para este documento. Use o campo manual.', { icon: 'ℹ️' });
      } else {
        toast.success(`${unique.length} identificadores carregados do Oracle!`);
      }
    } catch {
      toast.error('Sem conexão ativa com o Oracle. Use o campo manual.');
    } finally {
      setLoadingFieldsDoc(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do relatório, painel ou indicador.');
      return;
    }
    if (documentosVinculados.length === 0) {
      toast.error('Vincule pelo menos um documento clínico que alimenta este artefato.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: artifact?.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        tipo,
        ferramenta,
        responsavel: responsavel.trim() || 'Não informado',
        area: area.trim(),
        url: url.trim(),
        criticidade,
        unidades,
        documentosVinculados,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md sylva-fade-in"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-4xl max-h-[92vh] sylva-dock rounded-[26px] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Header */}
        <header className="px-6 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--card-subtle)]/50">
          <div>
            <span className="px-2.5 py-0.5 bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] text-[10px] font-bold rounded-full uppercase tracking-wider">
              {artifact ? 'Editar Vínculo Analítico' : 'Novo Mapeamento BI'}
            </span>
            <h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight mt-1.5">
              {artifact ? artifact.nome : 'Cadastrar Relatório, Painel ou Indicador'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Seção 1: Identificação do Artefato */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              1. Metadados do Artefato Analítico
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Nome do Relatório / Painel / Indicador *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Painel de Adesão da Evolução Médica / Indicador de Sepse..."
                  className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              {/* Tipo de Artefato */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Tipo de Artefato *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(ARTIFACT_TYPE_META) as BiArtifactType[]).map(key => {
                    const meta = ARTIFACT_TYPE_META[key];
                    const Icon = meta.icon;
                    const active = tipo === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipo(key)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer',
                          active
                            ? 'bg-[var(--lime)] text-[var(--lime-ink)] border-transparent font-bold shadow-xs'
                            : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)]'
                        )}
                      >
                        <Icon size={15} />
                        <span className="text-[11px] leading-tight">{meta.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ferramenta */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Ferramenta / Plataforma *
                </label>
                <select
                  value={ferramenta}
                  onChange={e => setFerramenta(e.target.value)}
                  className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                >
                  {TOOL_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Criticidade */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Criticidade Assistencial / Negócio *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ALTA', 'MEDIA', 'BAIXA'] as BiCriticality[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCriticidade(c)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                        criticidade === c
                          ? c === 'ALTA'
                            ? 'tone-danger border shadow-xs'
                            : c === 'MEDIA'
                              ? 'tone-warning border shadow-xs'
                              : 'tone-success border shadow-xs'
                          : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)]'
                      )}
                    >
                      {c === 'ALTA' ? 'Alta' : c === 'MEDIA' ? 'Média' : 'Baixa'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Responsável / Área Dona *
                </label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={e => setResponsavel(e.target.value)}
                  placeholder="Ex: Qualidade Assistencial / João Silva"
                  className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              {/* URL / Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
                  <Link2 size={12} /> Link / URL do Relatório (opcional)
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://app.powerbi.com/..."
                  className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              {/* Unidades Hospitalares */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
                  <Building2 size={12} /> Unidades Hospitalares que utilizam
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUnidades([])}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer',
                      unidades.length === 0
                        ? 'bg-[var(--lime)] text-[var(--lime-ink)] border-transparent font-bold'
                        : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)]'
                    )}
                  >
                    Todas / Corporativo
                  </button>
                  {hospitals.map(h => {
                    const active = unidades.includes(h.sigla);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => toggleUnidade(h.sigla)}
                        className={cn(
                          'px-3 py-1 rounded-full text-[11px] font-mono font-semibold border transition-all cursor-pointer',
                          active
                            ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)] font-bold'
                            : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                        )}
                      >
                        {h.sigla}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descrição */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Descrição / Regra de Negócio (opcional)
                </label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Explique o objetivo do indicador, frequência ou impacto caso o documento clínico seja alterado..."
                  className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Documentos Clínicos e Campos Opcionais */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  2. Documentos Clínicos & Campos Consumidos ({documentosVinculados.length})
                </h4>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  Selecione o documento (ex: #382). Os campos específicos (<code className="font-mono">DS_IDENTIFICADOR</code>) são opcionais.
                </p>
              </div>
            </div>

            {/* Seletor / Busca de Documentos do Catálogo */}
            <div className="sylva-glass rounded-2xl p-4 space-y-3 border border-[var(--border)]">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={e => setDocSearch(e.target.value)}
                  placeholder="Buscar documento no catálogo por código (ex: 382) ou nome..."
                  className="w-full pl-9 pr-4 py-2 bg-[var(--card-solid)] border border-[var(--border)] rounded-full text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              {filteredCatalog.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                  {filteredCatalog.map(doc => {
                    const alreadyAdded = documentosVinculados.some(d => d.docId === doc.id);
                    return (
                      <button
                        key={`${doc.motor}-${doc.id}`}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => handleAddDocLink(doc.id, doc.nome, doc.motor)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] border flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40',
                          alreadyAdded
                            ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)]'
                            : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground)] hover:border-[var(--lime)]'
                        )}
                      >
                        <span className="font-mono font-bold">#{doc.id}</span>
                        <span className="truncate max-w-[200px]">{doc.nome}</span>
                        <span className="text-[9px] px-1.5 rounded-full bg-[var(--card-solid)] text-[var(--muted)] font-mono">
                          {doc.motor}
                        </span>
                        {!alreadyAdded && <Plus size={11} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Adição Manual Direta */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--muted)]">Ou adicionar código manualmente:</span>
                <input
                  type="text"
                  value={manualDocId}
                  onChange={e => setManualDocId(e.target.value)}
                  placeholder="Cód. (ex: 382)"
                  className="w-28 bg-[var(--card-solid)] border border-[var(--border)] rounded-full px-3 py-1 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                />
                <input
                  type="text"
                  value={manualDocName}
                  onChange={e => setManualDocName(e.target.value)}
                  placeholder="Nome do documento (opcional)"
                  className="flex-1 min-w-[180px] bg-[var(--card-solid)] border border-[var(--border)] rounded-full px-3 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                />
                <select
                  value={manualDocMotor}
                  onChange={e => setManualDocMotor(e.target.value as 'V3' | 'V2')}
                  className="bg-[var(--card-solid)] border border-[var(--border)] rounded-full px-2.5 py-1 text-xs font-mono text-[var(--foreground)]"
                >
                  <option value="V3">V3</option>
                  <option value="V2">V2</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleAddDocLink(manualDocId, manualDocName, manualDocMotor)}
                  className="px-3 py-1 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] text-xs font-bold flex items-center gap-1 cursor-pointer hover:brightness-105"
                >
                  <Plus size={12} /> Vincular
                </button>
              </div>
            </div>

            {/* Lista de Documentos Vinculados */}
            {documentosVinculados.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--border)] text-xs text-[var(--muted)]">
                Nenhum documento clínico vinculado ainda. Busque acima ou adicione um código manualmente.
              </div>
            ) : (
              <div className="space-y-3">
                {documentosVinculados.map(link => {
                  const oracleOptions = oracleFieldsByDoc[link.docId] || [];
                  const isLoadingFields = loadingFieldsDoc === link.docId;

                  return (
                    <div
                      key={link.docId}
                      className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)] border border-[var(--tint-olive-border)] text-[var(--accent-ink)] font-mono font-bold text-xs">
                            #{link.docId}
                          </span>
                          <span className="text-xs font-bold text-[var(--foreground)]">{link.docName}</span>
                          {link.motor && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--card-solid)] border border-[var(--border)] text-[10px] font-mono text-[var(--muted)]">
                              {link.motor}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadOracleFields(link.docId)}
                            disabled={isLoadingFields}
                            className="px-3 py-1 rounded-full sylva-pill text-[11px] font-semibold text-[var(--foreground)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Buscar campos deste documento no Oracle"
                          >
                            {isLoadingFields ? (
                              <Loader2 size={12} className="animate-spin text-[var(--lime)]" />
                            ) : (
                              <Sparkles size={12} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                            )}
                            <span>{oracleOptions.length > 0 ? 'Recarregar Campos' : 'Carregar Campos Oracle'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveDocLink(link.docId)}
                            className="p-1.5 rounded-full text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remover vínculo com este documento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Campos Selecionados */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[var(--muted)] mr-1">
                            Campos vinculados (opcional):
                          </span>
                          {link.fields.length === 0 ? (
                            <span className="text-[11px] italic text-[var(--muted)]">
                              Documento inteiro (nenhum campo específico marcado)
                            </span>
                          ) : (
                            link.fields.map(fieldIdent => (
                              <span
                                key={fieldIdent}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] font-mono text-[10.5px] font-bold"
                              >
                                {fieldIdent}
                                <button
                                  type="button"
                                  onClick={() => handleToggleField(link.docId, fieldIdent)}
                                  className="hover:opacity-70 cursor-pointer"
                                  title="Remover campo"
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Sugestões carregadas do Oracle */}
                        {oracleOptions.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-[var(--card-solid)] border border-[var(--border)] space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                              Clique nos campos do Oracle para marcar/desmarcar ({oracleOptions.length} disponíveis):
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                              {oracleOptions.map(opt => {
                                const selected = link.fields.includes(opt.identificador.toUpperCase());
                                return (
                                  <button
                                    key={opt.identificador}
                                    type="button"
                                    onClick={() => handleToggleField(link.docId, opt.identificador)}
                                    title={opt.nome}
                                    className={cn(
                                      'px-2 py-0.5 rounded-md font-mono text-[10.5px] border flex items-center gap-1 transition-all cursor-pointer',
                                      selected
                                        ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)] font-bold'
                                        : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                                    )}
                                  >
                                    {selected && <Check size={10} />}
                                    <span>{opt.identificador}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Adição manual de identificador + observação */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customFieldInputs[link.docId] || ''}
                              onChange={e => setCustomFieldInputs(prev => ({ ...prev, [link.docId]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomField(link.docId);
                                }
                              }}
                              placeholder="Adicionar identificador manual (ex: CONDUTA_MEDICA)"
                              className="flex-1 bg-[var(--card-solid)] border border-[var(--border)] rounded-full px-3 py-1 text-[11px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddCustomField(link.docId)}
                              className="px-2.5 py-1 rounded-full sylva-pill text-[11px] font-bold text-[var(--foreground)] cursor-pointer"
                            >
                              + Campo
                            </button>
                          </div>

                          <input
                            type="text"
                            value={link.observacao || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setDocumentosVinculados(prev =>
                                prev.map(d => d.docId === link.docId ? { ...d, observacao: val } : d)
                              );
                            }}
                            placeholder="Observação do uso neste relatório (opcional)..."
                            className="bg-[var(--card-solid)] border border-[var(--border)] rounded-full px-3 py-1 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card-subtle)]/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] font-bold text-xs shadow-[0_4px_14px_rgba(204,243,82,0.25)] hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            <span>{artifact ? 'Salvar Alterações' : 'Cadastrar Vínculo BI'}</span>
          </button>
        </footer>
      </form>
    </div>
  );
}
