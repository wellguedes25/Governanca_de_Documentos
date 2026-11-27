'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Database,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DocMapping } from '@/lib/storage';
import { sanitizeAuditOwner } from '@/lib/similarity';
import { useUI } from '@/context/UIContext';

interface CatalogDocItem {
  id: string;
  name: string;
  subtitle?: string;
}

interface CatalogFieldItem {
  id: string;
  name: string;
  tipoVisualizacao: string;
  cdTipoVisualizacao: number | null;
  versao: string;
}

interface MapeamentosTabProps {
  docMappings: DocMapping[];
  onSave: (newMappings: DocMapping[]) => Promise<void>;
  docVersion?: string;
  schemaOwner?: string;
  onOpenDdlModal?: () => void;
}

function normalizeColKey(key: string): string {
  return key
    .replace(/"/g, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function getRowValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = row[candidate];
    if (exact !== undefined && exact !== null && String(exact).trim() !== '') {
      return exact;
    }
    const targetNorm = normalizeColKey(candidate);
    const foundKey = keys.find((k) => normalizeColKey(k) === targetNorm);
    if (
      foundKey &&
      row[foundKey] !== undefined &&
      row[foundKey] !== null &&
      String(row[foundKey]).trim() !== ''
    ) {
      return row[foundKey];
    }
  }
  return undefined;
}

function mapCatalogRows(rawRows: Record<string, unknown>[]): CatalogDocItem[] {
  const dedup = new Map<string, CatalogDocItem>();

  for (const row of rawRows) {
    if (!row || typeof row !== 'object') continue;

    let rawId = getRowValue(row, [
      'CÓDIGO',
      'CODIGO',
      'CÃ“DIGO',
      'CD_DOCUMENTO',
      'CODIGO_DOCUMENTO',
      'COD_DOCUMENTO',
      'DOCUMENTO',
      'ID',
    ]);

    if (rawId === undefined) {
      const numericEntry = Object.entries(row).find(
        ([k, v]) =>
          v !== null &&
          v !== undefined &&
          String(v).trim() !== '' &&
          /^\d+$/.test(String(v).trim()) &&
          normalizeColKey(k) !== 'TOTAL'
      );
      if (numericEntry) {
        rawId = numericEntry[1];
      }
    }

    if (rawId === undefined) continue;
    const id = String(rawId).trim();
    if (!id || dedup.has(id)) continue;

    const rawName = getRowValue(row, [
      'NOME',
      'DOCUMENTO CLÍNICO',
      'DOCUMENTO CLINICO',
      'NM_TITULO',
      'DS_DOCUMENTO',
      'DESCRICAO_DOCUMENTO',
      'NM_DOCUMENTO',
      'NOME_DOCUMENTO',
      'TITULO',
    ]);

    const name = rawName ? String(rawName).trim() : `Documento ${id}`;
    const tipo = getRowValue(row, ['DS_TIPO_DOCUMENTO', 'IDENTIFICADOR', 'DS_IDENTIFICADOR']);
    const total = getRowValue(row, ['TOTAL', 'QTD', 'COUNT']);
    const subtitle = tipo
      ? String(tipo).trim()
      : total !== undefined && !Number.isNaN(Number(total))
        ? `${Number(total).toLocaleString('pt-BR')} registros (90d)`
        : undefined;

    dedup.set(id, {
      id,
      name,
      subtitle,
    });
  }

  return Array.from(dedup.values()).sort((a, b) => Number(a.id) - Number(b.id));
}

function isTextFieldType(field: CatalogFieldItem): boolean {
  if (field.cdTipoVisualizacao === 1 || field.cdTipoVisualizacao === 2) {
    return true;
  }
  const desc = field.tipoVisualizacao.toUpperCase();
  return (
    desc.includes('TEXT') ||
    desc.includes('MEMO') ||
    desc.includes('OBSERV') ||
    desc.includes('RICHTEXT') ||
    desc.includes('HTML')
  );
}

export function MapeamentosTab({
  docMappings,
  onSave,
  docVersion = 'V3',
  schemaOwner = 'DBAMV',
  onOpenDdlModal,
}: MapeamentosTabProps) {
  const activeEngine: 'V2' | 'V3' = docVersion === 'V2' ? 'V2' : 'V3';
  const visibleFromProps = (list: DocMapping[]) =>
    list.filter((m) => !m.engine || m.engine === activeEngine);

  const [prevPropMappings, setPrevPropMappings] = useState<DocMapping[]>(docMappings);
  const [prevEngine, setPrevEngine] = useState<'V2' | 'V3'>(activeEngine);
  const [mappings, setMappings] = useState<DocMapping[]>(() => visibleFromProps(docMappings));
  if (docMappings !== prevPropMappings || prevEngine !== activeEngine) {
    setPrevPropMappings(docMappings);
    setPrevEngine(activeEngine);
    setMappings(visibleFromProps(docMappings));
  }

  const [saving, setSaving] = useState(false);

  // Manual fallback state
  const [newDocId, setNewDocId] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newFields, setNewFields] = useState<Record<string, { id: string; name: string }>>({});

  const { oracleData } = useUI();

  // Oracle Document Catalog browser state (pre-seeded if session already loaded /documentos)
  const [prevOracleData, setPrevOracleData] = useState<unknown>(oracleData);
  const [catalogDocs, setCatalogDocs] = useState<CatalogDocItem[]>(() =>
    Array.isArray(oracleData) ? mapCatalogRows(oracleData as Record<string, unknown>[]) : []
  );
  const [catalogEngine, setCatalogEngine] = useState<'V2' | 'V3'>(activeEngine);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoadedOnce, setCatalogLoadedOnce] = useState(false);

  // Per-document Oracle Field Picker state
  const [fieldsByDoc, setFieldsByDoc] = useState<Record<string, CatalogFieldItem[]>>({});
  const [loadingFieldsDocId, setLoadingFieldsDocId] = useState<string | null>(null);
  const [onlyTextFields, setOnlyTextFields] = useState(true);
  const [fieldSearchByDoc, setFieldSearchByDoc] = useState<Record<string, string>>({});

  if (catalogEngine !== activeEngine) {
    setCatalogEngine(activeEngine);
    setCatalogDocs([]);
    setFieldsByDoc({});
    setCatalogError(null);
    setCatalogLoadedOnce(false);
  }
  if (oracleData !== prevOracleData) {
    setPrevOracleData(oracleData);
    if (Array.isArray(oracleData) && oracleData.length > 0 && catalogDocs.length === 0) {
      setCatalogDocs(mapCatalogRows(oracleData as Record<string, unknown>[]));
    }
  }

  const normalizedOwner = sanitizeAuditOwner(schemaOwner);

  const mappedDocIds = useMemo(() => new Set(mappings.map((m) => String(m.id))), [mappings]);

  const filteredCatalogDocs = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalogDocs.slice(0, 60);
    return catalogDocs
      .filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.subtitle && d.subtitle.toLowerCase().includes(q))
      )
      .slice(0, 60);
  }, [catalogDocs, catalogSearch]);

  const handleLoadCatalog = async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    setCatalogLoadedOnce(true);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'DOCUMENTOS',
          version: docVersion === 'V2' ? 'V2' : 'V3',
          forceRefresh: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao consultar catálogo de documentos.');
      }

      const rawRows = (data.rows || []) as Record<string, unknown>[];
      const list = mapCatalogRows(rawRows);
      setCatalogDocs(list);

      if (list.length === 0) {
        const msg =
          rawRows.length > 0
            ? 'O Oracle retornou registros, mas sem colunas reconhecidas de código/nome.'
            : `Nenhum documento encontrado no Motor ${docVersion} na janela configurada.`;
        setCatalogError(msg);
        toast(msg);
      } else {
        toast.success(`${list.length} documento(s) carregado(s) do Motor ${docVersion}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar catálogo Oracle.';
      setCatalogError(msg);
      toast.error(msg);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleAddDocFromCatalog = (item: CatalogDocItem) => {
    if (mappedDocIds.has(item.id)) {
      toast('Este documento já está na lista de auditoria.');
      return;
    }
    setMappings((prev) => [
      { id: item.id, name: item.name, fields: [], engine: activeEngine },
      ...prev,
    ]);
    toast.success(`Documento #${item.id} adicionado. Carregando campos do Oracle...`);
    void handleFetchFieldsForDoc(item.id);
  };

  const handleFetchFieldsForDoc = async (docId: string) => {
    setLoadingFieldsDocId(docId);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'DOC_FIELDS',
          version: docVersion === 'V2' ? 'V2' : 'V3',
          params: { CD_DOCUMENTO: Number(docId) || docId },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao buscar campos do documento.');
      }

      const rawRows = (data.rows || []) as Record<string, unknown>[];
      const byIdentifier = new Map<string, CatalogFieldItem>();

      for (const row of rawRows) {
        const rawIdent = getRowValue(row, ['DS_IDENTIFICADOR', 'IDENTIFICADOR', 'CD_CAMPO']);
        if (!rawIdent) continue;
        const id = String(rawIdent).trim();
        if (!id || byIdentifier.has(id.toUpperCase())) continue;

        const rawLabel = getRowValue(row, ['DS_CAMPO', 'NOME', 'TITULO']);
        const rawTipoDesc = getRowValue(row, ['DS_TIPO_VISUALIZACAO', 'TIPO']);
        const rawTipoCd = getRowValue(row, ['CD_TIPO_VISUALIZACAO']);
        const rawVersao = getRowValue(row, ['VL_VERSAO', 'TP_VERSAO']);

        byIdentifier.set(id.toUpperCase(), {
          id,
          name: rawLabel ? String(rawLabel).trim() : id,
          tipoVisualizacao: rawTipoDesc ? String(rawTipoDesc).trim() : 'Desconhecido',
          cdTipoVisualizacao:
            rawTipoCd !== undefined && !Number.isNaN(Number(rawTipoCd))
              ? Number(rawTipoCd)
              : null,
          versao: rawVersao ? String(rawVersao).trim() : '',
        });
      }

      const fields = Array.from(byIdentifier.values());
      setFieldsByDoc((prev) => ({ ...prev, [docId]: fields }));

      if (fields.length === 0) {
        toast('Nenhum campo retornado para este documento no Oracle.');
      } else {
        toast.success(`${fields.length} campo(s) mapeável(is) encontrado(s) no Doc #${docId}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao consultar campos do documento.';
      toast.error(msg);
    } finally {
      setLoadingFieldsDocId(null);
    }
  };

  const handleToggleCatalogField = (docId: string, field: CatalogFieldItem) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.id !== docId) return m;
        const exists = m.fields.some(
          (f) => f.id.trim().toUpperCase() === field.id.trim().toUpperCase()
        );
        if (exists) {
          return {
            ...m,
            fields: m.fields.filter(
              (f) => f.id.trim().toUpperCase() !== field.id.trim().toUpperCase()
            ),
          };
        }
        return {
          ...m,
          fields: [...m.fields, { id: field.id, name: field.name }],
        };
      })
    );
  };

  const handleSelectAllVisibleFields = (docId: string, visibleFields: CatalogFieldItem[]) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.id !== docId) return m;
        const existingMap = new Map(m.fields.map((f) => [f.id.trim().toUpperCase(), f]));
        for (const vf of visibleFields) {
          const key = vf.id.trim().toUpperCase();
          if (!existingMap.has(key)) {
            existingMap.set(key, { id: vf.id, name: vf.name });
          }
        }
        return { ...m, fields: Array.from(existingMap.values()) };
      })
    );
  };

  const handleClearDocFields = (docId: string) => {
    setMappings((prev) => prev.map((m) => (m.id === docId ? { ...m, fields: [] } : m)));
  };

  const handleAddDocManual = () => {
    const cleanId = newDocId.trim();
    if (!cleanId || !newDocName.trim()) {
      toast.error('Informe o Código CD_DOCUMENTO e um Nome Descritivo.');
      return;
    }
    if (mappings.some((m) => m.id === cleanId)) {
      toast.error('Este Código de Documento já está mapeado.');
      return;
    }

    setMappings([{ id: cleanId, name: newDocName.trim(), fields: [], engine: activeEngine }, ...mappings]);
    setNewDocId('');
    setNewDocName('');
    toast.success('Documento adicionado! Agora selecione ou adicione os campos.');
  };

  const handleRemoveDoc = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddFieldManual = (docId: string) => {
    const field = newFields[docId];
    if (!field || !field.id.trim() || !field.name.trim()) {
      toast.error('Informe o Identificador (DS_IDENTIFICADOR) e o Nome Amigável.');
      return;
    }

    setMappings((prev) =>
      prev.map((m) => {
        if (m.id !== docId) return m;
        if (m.fields.some((f) => f.id.toUpperCase() === field.id.trim().toUpperCase())) {
          toast.error('Este campo já existe neste documento.');
          return m;
        }
        return {
          ...m,
          fields: [...m.fields, { id: field.id.trim(), name: field.name.trim() }],
        };
      })
    );

    setNewFields((prev) => ({ ...prev, [docId]: { id: '', name: '' } }));
  };

  const handleRemoveField = (docId: string, fieldId: string) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.id !== docId) return m;
        return { ...m, fields: m.fields.filter((f) => f.id !== fieldId) };
      })
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const otherEngine = docMappings.filter((m) => m.engine && m.engine !== activeEngine);
      const currentTagged = mappings.map((m) => ({ ...m, engine: activeEngine }));
      await onSave([...otherEngine, ...currentTagged]);
      toast.success('Mapeamentos de Documentos & Campos salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar mapeamentos no servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Topo + Schema/Owner + Botão Salvar */}
      <div className="sylva-card flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--foreground)]">
              <BookOpen className="text-[var(--lime-dark)] dark:text-[var(--lime)]" size={20} />
              Seleção de Documentos &amp; Campos para Auditoria
            </h2>
            <span className="sylva-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              Schema: {normalizedOwner}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Escolha no catálogo Oracle quais documentos e campos textuais o motor de similaridade NLP deve auditar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenDdlModal && (
            <button
              type="button"
              onClick={onOpenDdlModal}
              className="sylva-pill inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--lime)]"
            >
              <Database size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
              <span>Script DDL ({normalizedOwner})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="sylva-lime-btn flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold shadow-[0_4px_14px_rgba(204,243,82,0.25)] transition-all hover:brightness-105 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{saving ? 'Salvando...' : 'Salvar Escopo de Auditoria'}</span>
          </button>
        </div>
      </div>

      {/* Catálogo Direto do Oracle */}
      <div className="sylva-card space-y-4 rounded-2xl border border-[var(--border-subtle)] p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <Sparkles size={15} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
              Explorar Catálogo de Documentos Oracle ({docVersion})
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Carregue os documentos clínicos reais do hospital e adicione com 1 clique sem precisar decorar códigos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadCatalog}
            disabled={loadingCatalog}
            className="sylva-pill inline-flex cursor-pointer items-center gap-2 self-start rounded-full px-4 py-2 text-xs font-bold text-[var(--foreground)] transition-colors hover:border-[var(--lime)] disabled:opacity-50"
          >
            {loadingCatalog ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
            )}
            <span>
              {loadingCatalog
                ? 'Consultando Oracle...'
                : catalogDocs.length > 0
                  ? 'Atualizar Catálogo'
                  : 'Carregar Documentos do Oracle'}
            </span>
          </button>
        </div>

        {catalogError && (
          <div className="tone-warning flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{catalogError}</span>
          </div>
        )}

        {!loadingCatalog && catalogLoadedOnce && !catalogError && catalogDocs.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--canvas-bg)]/40 px-4 py-3 text-xs text-[var(--muted)]">
            Nenhum documento retornado na consulta do catálogo para o Motor {docVersion}.
          </div>
        )}

        {catalogDocs.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Filtrar catálogo por código ou nome do documento..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)] py-2 pl-9 pr-3 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)]"
              />
            </div>

            <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredCatalogDocs.map((doc) => {
                const alreadyAdded = mappedDocIds.has(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleAddDocFromCatalog(doc)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                      alreadyAdded
                        ? 'cursor-default border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--foreground)]'
                        : 'cursor-pointer border-[var(--border-subtle)] bg-[var(--canvas-bg)]/80 text-[var(--foreground)] hover:border-[var(--lime)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[var(--lime-dark)] dark:text-[var(--lime)]">
                          #{doc.id}
                        </span>
                        <span className="truncate font-semibold">{doc.name}</span>
                      </div>
                      {doc.subtitle && (
                        <p className="truncate text-[10px] text-[var(--muted)]">{doc.subtitle}</p>
                      )}
                    </div>
                    {alreadyAdded ? (
                      <Check size={14} className="shrink-0 text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                    ) : (
                      <Plus size={14} className="shrink-0 text-[var(--muted)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Entrada Manual Alternativa */}
        <details className="rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)]/40 px-4 py-2.5">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">
            Ou informar código manualmente (CD_DOCUMENTO)
          </summary>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Cód. Doc (ex: 1048)"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)] sm:w-44"
              value={newDocId}
              onChange={(e) => setNewDocId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Nome descritivo (ex: Evolução Médica)"
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)]"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddDocManual}
              className="sylva-pill flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--lime)]"
            >
              <Plus size={15} /> Adicionar
            </button>
          </div>
        </details>
      </div>

      {/* Lista de Documentos Mapeados */}
      <div className="grid grid-cols-1 gap-5">
        {mappings.map((doc) => {
          const loadedFields = fieldsByDoc[doc.id];
          const fieldSearch = (fieldSearchByDoc[doc.id] || '').trim().toLowerCase();
          const visibleFields = loadedFields
            ? loadedFields.filter((f) => {
                if (onlyTextFields && !isTextFieldType(f)) return false;
                if (!fieldSearch) return true;
                return (
                  f.id.toLowerCase().includes(fieldSearch) ||
                  f.name.toLowerCase().includes(fieldSearch)
                );
              })
            : [];

          return (
            <div
              key={doc.id}
              className="sylva-card overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--card-bg)]/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lime)]/30 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)]">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--lime)]/30 bg-[var(--lime)]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--lime-dark)] dark:text-[var(--lime)]">
                        COD: {doc.id}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">{doc.name}</h4>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      {doc.fields.length === 0
                        ? 'Nenhum campo específico selecionado — auditará todos os campos textuais deste documento'
                        : `${doc.fields.length} campo(s) específico(s) selecionado(s) para auditoria`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFetchFieldsForDoc(doc.id)}
                    disabled={loadingFieldsDocId === doc.id}
                    className="sylva-pill inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--lime)] disabled:opacity-50"
                  >
                    {loadingFieldsDocId === doc.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                    )}
                    <span>
                      {loadedFields ? 'Recarregar Campos Oracle' : 'Buscar Campos do Documento'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="cursor-pointer rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    title="Remover Documento do Escopo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Campos já selecionados */}
                {doc.fields.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        Campos Monitorados ({doc.fields.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleClearDocFields(doc.id)}
                        className="cursor-pointer text-[11px] font-semibold text-rose-500 hover:underline"
                      >
                        Limpar campos selecionados
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.fields.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-2.5 rounded-xl border border-[var(--lime)]/35 bg-[var(--lime)]/10 px-3 py-1.5 text-xs"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--foreground)]">{f.name}</span>
                            <span className="font-mono text-[10px] text-[var(--lime-dark)] dark:text-[var(--lime)]">
                              ID: {f.id}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(doc.id, f.id)}
                            className="cursor-pointer rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-500"
                            title="Remover Campo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seletor de Campos carregados do Oracle */}
                {loadedFields && (
                  <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)]/50 p-4">
                    <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                          <input
                            type="checkbox"
                            checked={onlyTextFields}
                            onChange={(e) => setOnlyTextFields(e.target.checked)}
                            className="h-3.5 w-3.5 rounded accent-[var(--lime)]"
                          />
                          <Filter size={12} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                          <span>Apenas campos de texto (Texto / TextArea)</span>
                        </label>
                        <span className="text-[11px] text-[var(--muted)]">
                          Exibindo {visibleFields.length} de {loadedFields.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Filtrar campos..."
                          value={fieldSearchByDoc[doc.id] || ''}
                          onChange={(e) =>
                            setFieldSearchByDoc((prev) => ({
                              ...prev,
                              [doc.id]: e.target.value,
                            }))
                          }
                          className="w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--canvas-bg)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)]"
                        />
                        {visibleFields.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllVisibleFields(doc.id, visibleFields)}
                            className="sylva-pill cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold text-[var(--foreground)] hover:border-[var(--lime)]"
                          >
                            Selecionar todos
                          </button>
                        )}
                      </div>
                    </div>

                    {visibleFields.length === 0 ? (
                      <p className="py-2 text-xs text-[var(--muted)]">
                        Nenhum campo correspondente encontrado. Desmarque o filtro de texto caso utilize um campo customizado.
                      </p>
                    ) : (
                      <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleFields.map((vf) => {
                          const isSelected = doc.fields.some(
                            (f) => f.id.trim().toUpperCase() === vf.id.trim().toUpperCase()
                          );
                          return (
                            <button
                              key={vf.id}
                              type="button"
                              onClick={() => handleToggleCatalogField(doc.id, vf)}
                              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                                isSelected
                                  ? 'border-[var(--lime)] bg-[var(--lime)]/15 text-[var(--foreground)]'
                                  : 'border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--lime)]/60'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{vf.name}</p>
                                <p className="truncate font-mono text-[10px] text-[var(--muted)]">
                                  {vf.id} • {vf.tipoVisualizacao}
                                </p>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                  isSelected
                                    ? 'border-[var(--lime)] bg-[var(--lime)] text-[var(--lime-ink)]'
                                    : 'border-[var(--border-subtle)] text-transparent'
                                }`}
                              >
                                <Check size={12} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Input Manual Alternativo de Campo */}
                <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Identificador manual (ex: EVOLUCAO)"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)] px-3 py-1.5 font-mono text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)] sm:w-56"
                    value={newFields[doc.id]?.id || ''}
                    onChange={(e) =>
                      setNewFields((prev) => ({
                        ...prev,
                        [doc.id]: {
                          id: e.target.value,
                          name: prev[doc.id]?.name || '',
                        },
                      }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="Nome amigável (ex: Evolução Clínica)"
                    className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--canvas-bg)] px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)]"
                    value={newFields[doc.id]?.name || ''}
                    onChange={(e) =>
                      setNewFields((prev) => ({
                        ...prev,
                        [doc.id]: {
                          id: prev[doc.id]?.id || '',
                          name: e.target.value,
                        },
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFieldManual(doc.id)}
                    className="sylva-pill flex cursor-pointer items-center justify-center gap-1 rounded-xl px-4 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--lime)]"
                  >
                    <Plus size={14} /> Add Campo
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {mappings.length === 0 && (
          <div className="sylva-card rounded-2xl border border-dashed border-[var(--border-subtle)] p-10 text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Nenhum documento configurado no escopo de similaridade.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Carregue o catálogo Oracle acima ou adicione manualmente um documento para restringir a auditoria, ou salve vazio para auditar todos os documentos textuais.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
