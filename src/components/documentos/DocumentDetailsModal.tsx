"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  X, AlertTriangle, Database, FileText,
  Layers, Code2, Unlink, Copy, Check, ChevronDown, ChevronUp, ExternalLink,
  Search, ListFilter, Zap, SlidersHorizontal, TableProperties,
  Download, Sparkles, RefreshCw, Printer, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface ProfileItem {
  CD_DOCUMENTO?: string | number;
  NM_TITULO?: string;
  DS_PERFIL_AMBULATORIAL: string;
  EMPRESA: string;
}

export type DocumentDetailsTab = 'specs' | 'history' | 'actions' | 'rules' | 'fields' | 'profiles';

interface DocumentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  docId: string | null;
  docName?: string;
  docVersion?: string;
  initialTab?: DocumentDetailsTab;
  metadata: any[];
  loading: boolean;
  metadataError?: string | null;
  actions: any[];
  actionsLoading: boolean;
  actionsError: string | null;
  rules?: any[];
  rulesLoading?: boolean;
  rulesError?: string | null;
  fields?: any[];
  fieldsLoading?: boolean;
  fieldsError?: string | null;
  profiles?: ProfileItem[];
  profilesLoading?: boolean;
  profilesError?: string | null;
  onRefresh?: () => void;
}

export const getFieldTypeBadge = (tipo?: string) => {
  const t = String(tipo || '').toUpperCase();
  if (t.includes('TEXT') || t.includes('TEXTO')) {
    return { label: tipo || 'Texto', color: 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]' };
  }
  if (t.includes('CHECKBOX') || t.includes('CHECK')) {
    return { label: tipo || 'CheckBox', color: 'tone-success border' };
  }
  if (t.includes('RADIO') || t.includes('COMBO') || t.includes('LIST')) {
    return { label: tipo || 'Seleção', color: 'tone-info border' };
  }
  if (t.includes('DATE') || t.includes('DATA')) {
    return { label: tipo || 'Data', color: 'tone-warning border' };
  }
  if (t.includes('BUTTON') || t.includes('BOTAO')) {
    return { label: tipo || 'Botão', color: 'bg-[var(--card-subtle)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]' };
  }
  if (t.includes('TABLE') || t.includes('TABELA') || t.includes('GRID')) {
    return { label: tipo || 'Tabela', color: 'tone-info border' };
  }
  if (t.includes('IMAGE') || t.includes('IMAGEM')) {
    return { label: tipo || 'Imagem', color: 'tone-neutral border' };
  }
  return { label: tipo || 'Componente', color: 'tone-neutral border' };
};

export const getRuleTypeBadge = (tipo?: string) => {
  const t = String(tipo || '').toUpperCase();
  switch (t) {
    case 'ENABLE':
      return { label: 'Habilitar', color: 'tone-success border' };
    case 'DISABLE':
      return { label: 'Desabilitar', color: 'tone-danger border' };
    case 'ANSWER':
      return { label: 'Preencher / Responder', color: 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]' };
    case 'VALIDATE':
      return { label: 'Validar', color: 'tone-warning border' };
    case 'CLEAR':
      return { label: 'Limpar', color: 'tone-neutral border' };
    case 'VISIBLE':
      return { label: 'Visível', color: 'tone-info border' };
    case 'INVISIBLE':
      return { label: 'Invisível', color: 'tone-neutral border' };
    case 'REQUIRED':
      return { label: 'Obrigatório', color: 'tone-warning border' };
    case 'REFRESH':
    case 'REFRESH_FIELD':
      return { label: 'Atualizar', color: 'bg-[var(--card-subtle)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]' };
    case 'ON_CLONE':
    case 'ON_CLOSE':
    case 'ON_COPY':
      return { label: 'Ao Finalizar', color: 'tone-info border' };
    case 'ON_SAVE':
      return { label: 'Ao Salvar', color: 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]' };
    case 'RUN':
    case 'RUN_SET':
      return { label: 'Executar', color: 'tone-success border' };
    case 'FILTER':
      return { label: 'Filtrar', color: 'tone-warning border' };
    case 'INVALIDATE':
      return { label: 'Invalidar', color: 'tone-danger border' };
    default:
      return { label: tipo || 'Ação', color: 'tone-neutral border' };
  }
};

export function DocumentDetailsModal({
  open,
  onClose,
  docId,
  docName,
  docVersion = 'V3',
  initialTab = 'specs',
  metadata,
  loading,
  metadataError = null,
  actions,
  actionsLoading,
  actionsError,
  rules = [],
  rulesLoading = false,
  rulesError = null,
  fields = [],
  fieldsLoading = false,
  fieldsError = null,
  profiles = [],
  profilesLoading = false,
  profilesError = null,
  onRefresh
}: DocumentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentDetailsTab>(initialTab);
  const [actionsFilterDoc, setActionsFilterDoc] = useState<string | null>(null);
  const [selectedRuleVersion, setSelectedRuleVersion] = useState<number | 'ALL'>('ALL');
  const [selectedRuleType, setSelectedRuleType] = useState<string>('ALL');
  const [rulesSearchTerm, setRulesSearchTerm] = useState('');
  const [expandedScripts, setExpandedScripts] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados específicos para a aba de Campos / Metadados
  const [fieldsSearchTerm, setFieldsSearchTerm] = useState('');
  const [selectedFieldLayout, setSelectedFieldLayout] = useState<'ALL' | number>('ALL');
  const [selectedFieldVersion, setSelectedFieldVersion] = useState<number | 'ALL'>('ALL');
  const [selectedFieldStatus, setSelectedFieldStatus] = useState<'ALL' | '1' | '0'>('ALL');
  const [selectedFieldHasRules, setSelectedFieldHasRules] = useState<'ALL' | 'WITH_RULES' | 'WITHOUT_RULES'>('ALL');

  // Estados específicos para a aba de Perfis Ambulatoriais
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [selectedProfileHospital, setSelectedProfileHospital] = useState<string>('ALL');
  const [profilePage, setProfilePage] = useState(1);
  const profilePageSize = 12;

  // Sincroniza aba inicial quando o modal abre ou troca de documento
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setProfileSearchTerm('');
      setSelectedProfileHospital('ALL');
      setProfilePage(1);
      setActionsFilterDoc(null);
      setRulesSearchTerm('');
      setFieldsSearchTerm('');
    }
  }, [open, docId, initialTab]);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const isAnyLoading = loading || actionsLoading || rulesLoading || fieldsLoading || profilesLoading;
  const resolvedDocTitle = docName || metadata[0]?.DESCRICAO_DOCUMENTO || `Documento #${docId || ''}`;

  // Versões únicas das regras
  const ruleVersions = useMemo(() => {
    if (!rules || rules.length === 0) return [];
    const map = new Map<number, { version: number; type: string; published: number; count: number }>();
    rules.forEach(r => {
      const v = r.VL_VERSAO;
      if (v !== undefined && v !== null) {
        if (!map.has(v)) {
          map.set(v, {
            version: v,
            type: r.TP_VERSAO || (r.SN_PUBLICADO === 1 ? 'PUBLISHED' : 'HISTORY'),
            published: r.SN_PUBLICADO ?? 0,
            count: 0
          });
        }
        map.get(v)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.version - a.version);
  }, [rules]);

  useEffect(() => {
    if (ruleVersions.length > 0) {
      const pub = ruleVersions.find(v => v.type === 'PUBLISHED' || v.published === 1);
      setSelectedRuleVersion(pub ? pub.version : ruleVersions[0].version);
    } else {
      setSelectedRuleVersion('ALL');
    }
  }, [ruleVersions]);

  const ruleTypeStats = useMemo(() => {
    if (!rules || rules.length === 0) return { all: 0, byLabel: {} as Record<string, { count: number; color: string }> };
    const currentVersionRules = rules.filter(r => selectedRuleVersion === 'ALL' || r.VL_VERSAO === selectedRuleVersion);
    const byLabel: Record<string, { count: number; color: string }> = {};
    currentVersionRules.forEach(r => {
      const badge = getRuleTypeBadge(r.TIPO_REGRA);
      if (!byLabel[badge.label]) {
        byLabel[badge.label] = { count: 0, color: badge.color };
      }
      byLabel[badge.label].count++;
    });
    return { all: currentVersionRules.length, byLabel };
  }, [rules, selectedRuleVersion]);

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    return rules.filter(r => {
      if (selectedRuleVersion !== 'ALL' && r.VL_VERSAO !== selectedRuleVersion) return false;
      if (selectedRuleType !== 'ALL') {
        const badge = getRuleTypeBadge(r.TIPO_REGRA);
        if (badge.label !== selectedRuleType) return false;
      }
      if (rulesSearchTerm) {
        const term = rulesSearchTerm.toLowerCase();
        const badge = getRuleTypeBadge(r.TIPO_REGRA);
        const matchName = String(r.DS_REGRA || '').toLowerCase().includes(term);
        const matchCond = String(r.CONDICAO || '').toLowerCase().includes(term);
        const matchFields = String(r.CAMPOS_AFETADOS || '').toLowerCase().includes(term);
        const matchProp = String(r.DS_PROPRIEDADE || '').toLowerCase().includes(term);
        const matchScript = String(r.SCRIPT || '').toLowerCase().includes(term);
        const matchAlert = String(r.DS_ALERTA || '').toLowerCase().includes(term);
        const matchType = String(r.TIPO_REGRA || '').toLowerCase().includes(term);
        const matchLabel = badge.label.toLowerCase().includes(term);
        if (!matchName && !matchCond && !matchFields && !matchProp && !matchScript && !matchAlert && !matchType && !matchLabel) return false;
      }
      return true;
    });
  }, [rules, selectedRuleVersion, selectedRuleType, rulesSearchTerm]);

  const activePublishedVersion = useMemo(() => {
    return metadata.find(m =>
      m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S'
    )?.VALOR_VERSAO;
  }, [metadata]);

  const fieldVersions = useMemo(() => {
    if (!fields || fields.length === 0) return [];
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

  useEffect(() => {
    if (fieldVersions.length > 0) {
      const pub = fieldVersions.find(v => v.type === 'PUBLISHED' || v.published === 1);
      setSelectedFieldVersion(pub ? pub.version : fieldVersions[0].version);
    } else {
      setSelectedFieldVersion('ALL');
    }
  }, [fieldVersions]);

  const filteredFields = useMemo(() => {
    if (!fields) return [];
    return fields.filter(f => {
      if (selectedFieldVersion !== 'ALL' && f.VL_VERSAO !== selectedFieldVersion) return false;
      if (selectedFieldLayout !== 'ALL' && f.CD_TIPO_LAYOUT !== selectedFieldLayout) return false;
      if (selectedFieldStatus !== 'ALL' && String(f.SN_ATIVO) !== selectedFieldStatus) return false;
      if (selectedFieldHasRules === 'WITH_RULES' && (!f.QTD_REGRAS || f.QTD_REGRAS === 0)) return false;
      if (selectedFieldHasRules === 'WITHOUT_RULES' && f.QTD_REGRAS > 0) return false;

      if (fieldsSearchTerm) {
        const term = fieldsSearchTerm.toLowerCase();
        const matchTag = String(f.DS_IDENTIFICADOR || '').toLowerCase().includes(term);
        const matchName = String(f.DS_CAMPO || '').toLowerCase().includes(term);
        const matchMeta = String(f.CD_METADADO || '').toLowerCase().includes(term);
        const matchType = String(f.DS_TIPO_VISUALIZACAO || '').toLowerCase().includes(term);
        const matchLayout = String(f.DS_TIPO_LAYOUT || '').toLowerCase().includes(term);
        if (!matchTag && !matchName && !matchMeta && !matchType && !matchLayout) return false;
      }
      return true;
    });
  }, [fields, selectedFieldVersion, selectedFieldLayout, selectedFieldStatus, selectedFieldHasRules, fieldsSearchTerm]);

  const fieldsKpis = useMemo(() => {
    const total = filteredFields.length;
    const active = filteredFields.filter(f => f.SN_ATIVO === 1).length;
    const withMetadata = filteredFields.filter(f => f.CD_METADADO !== null && f.CD_METADADO !== undefined).length;
    const withRules = filteredFields.filter(f => f.QTD_REGRAS > 0).length;
    return { total, active, withMetadata, withRules };
  }, [filteredFields]);

  const layoutCountsForVersion = useMemo(() => {
    const targetVer = selectedFieldVersion !== 'ALL'
      ? selectedFieldVersion
      : (activePublishedVersion || fieldVersions[0]?.version);
    const list = selectedFieldVersion === 'ALL'
      ? fields
      : fields.filter(f => f.VL_VERSAO === targetVer);
    const tela = list.filter(f => f.CD_TIPO_LAYOUT === 1).length;
    const relatorio = list.filter(f => f.CD_TIPO_LAYOUT === 2).length;
    return { all: list.length, tela, relatorio, targetVer };
  }, [fields, selectedFieldVersion, activePublishedVersion, fieldVersions]);

  const telaSpecs = metadata.find(m =>
    (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') &&
    m.CODIGO_TIPO_LAYOUT === 1 &&
    (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
  );

  const relatorioSpecs = metadata.find(m =>
    (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') &&
    m.CODIGO_TIPO_LAYOUT === 2 &&
    (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
  );

  const fallbackSpecs = metadata.find(m =>
    (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') &&
    (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
  ) || metadata[0];

  const activeSpecs = (telaSpecs || relatorioSpecs || fallbackSpecs) ? {
    ...(telaSpecs || relatorioSpecs || fallbackSpecs),
    CODIGO_LAYOUT_CABECALHO: relatorioSpecs?.CODIGO_LAYOUT_CABECALHO || (telaSpecs || fallbackSpecs)?.CODIGO_LAYOUT_CABECALHO,
    DOCUMENTO_CABECALHO: relatorioSpecs?.DOCUMENTO_CABECALHO || (telaSpecs || fallbackSpecs)?.DOCUMENTO_CABECALHO,
    CODIGO_LAYOUT_RODAPE: relatorioSpecs?.CODIGO_LAYOUT_RODAPE || (telaSpecs || fallbackSpecs)?.CODIGO_LAYOUT_RODAPE,
  } : undefined;

  const hasTestVersion = metadata.some(m => m.CODIGO_TIPO_VERSAO === 1 && m.STATUS_ATIVO !== 1 && m.STATUS_ATIVO !== 'S');

  const uniqueRelatedDocs = useMemo(() => {
    const docs = new Set<string>();
    actions.forEach(action => {
      const relDoc = action.DOCUMENTO_RELACIONADO || action.Documento_Relacionado || action.documento_relacionado;
      if (relDoc && /^\d+$/.test(String(relDoc).trim())) {
        docs.add(String(relDoc).trim());
      }
      const groupDocs = action.GRUPO_DOCS_RELACIONADOS || action.Grupo_Docs_Relacionados || action.grupo_docs_relacionados;
      if (groupDocs) {
        String(groupDocs).split(',').forEach((id: string) => {
          const trimmed = id.trim();
          if (trimmed && /^\d+$/.test(trimmed)) {
            docs.add(trimmed);
          }
        });
      }
    });
    return Array.from(docs).sort((a, b) => Number(a) - Number(b));
  }, [actions]);

  const filteredActions = useMemo(() => {
    let list = actions;
    if (actionsFilterDoc) {
      list = actions.filter(action => {
        const relDoc = String(action.DOCUMENTO_RELACIONADO || action.Documento_Relacionado || action.documento_relacionado || '');
        const rawGroup = action.GRUPO_DOCS_RELACIONADOS || action.Grupo_Docs_Relacionados || action.grupo_docs_relacionados || '';
        const groupDocs = String(rawGroup).split(',').map((s: string) => s.trim());
        return relDoc === actionsFilterDoc || groupDocs.includes(actionsFilterDoc);
      });
    }
    const seen = new Set<string>();
    return list.filter(action => {
      const field = action.IDENTIFICADOR_CAMPO || action.DS_IDENTIFICADOR || action.CODIGO_CAMPO || '';
      const script = action.SCRIPT_ACAO_COMPLETO || action.SCRIPT || action.script || '';
      const key = `${field}_${script}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [actions, actionsFilterDoc]);

  // Perfis Ambulatoriais (Aba 6)
  const profileHospitals = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach(p => {
      if (p.EMPRESA && p.EMPRESA !== 'NO_HOSPITALS') {
        set.add(p.EMPRESA);
      }
    });
    return Array.from(set).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    let list = profiles;
    if (selectedProfileHospital !== 'ALL') {
      list = list.filter(p => p.EMPRESA === selectedProfileHospital);
    }
    if (profileSearchTerm.trim()) {
      const term = profileSearchTerm.toLowerCase();
      list = list.filter(p =>
        (p.DS_PERFIL_AMBULATORIAL || '').toLowerCase().includes(term) ||
        (p.NM_TITULO || '').toLowerCase().includes(term) ||
        (p.EMPRESA || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [profiles, selectedProfileHospital, profileSearchTerm]);

  const totalProfilePages = Math.ceil(filteredProfiles.length / profilePageSize) || 1;
  const paginatedProfiles = useMemo(() => {
    const start = (profilePage - 1) * profilePageSize;
    return filteredProfiles.slice(start, start + profilePageSize);
  }, [filteredProfiles, profilePage, profilePageSize]);

  useEffect(() => {
    setProfilePage(1);
  }, [profileSearchTerm, selectedProfileHospital]);

  const toggleScript = (id: string) => {
    setExpandedScripts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFields = (id: string) => {
    setExpandedFields(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Exportação do Dossiê Completo em Excel Multi-abas (.xlsx)
  const handleExportDossierExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Especificações & Resumo
      const specsSheet = XLSX.utils.json_to_sheet([
        { Campo: 'Código MV', Valor: docId || '' },
        { Campo: 'Nome do Documento', Valor: resolvedDocTitle },
        { Campo: 'Motor', Valor: docVersion },
        { Campo: 'Versão Ativa', Valor: activeSpecs?.VALOR_VERSAO ? `v${activeSpecs.VALOR_VERSAO}` : 'N/A' },
        { Campo: 'Tipo de Versão', Valor: activeSpecs?.DESCRICAO_TIPO_VERSAO || 'N/A' },
        { Campo: 'Layout Base', Valor: activeSpecs?.DESCRICAO_TIPO_LAYOUT || 'N/A' },
        { Campo: 'Cabeçalho', Valor: activeSpecs?.DOCUMENTO_CABECALHO ? `Doc ${activeSpecs.DOCUMENTO_CABECALHO}` : (activeSpecs?.CODIGO_LAYOUT_CABECALHO || 'Padrão') },
        { Campo: 'Rodapé', Valor: activeSpecs?.CODIGO_LAYOUT_RODAPE || 'Padrão' },
        { Campo: 'Qtd. Regras (Versão Ativa)', Valor: activeSpecs?.QUANTIDADE_REGRAS ?? rules.length },
        { Campo: 'Qtd. Campos (Tela)', Valor: activeSpecs?.QUANTIDADE_CAMPOS ?? 0 },
        { Campo: 'Qtd. Vínculos SQL', Valor: actions.length },
        { Campo: 'Qtd. Perfis Vinculados', Valor: profiles.length },
        { Campo: 'Data da Exportação', Valor: new Date().toLocaleString('pt-BR') }
      ]);
      XLSX.utils.book_append_sheet(wb, specsSheet, 'Especificacoes');

      // 2. Histórico de Versões
      if (metadata.length > 0) {
        const histRows = metadata.map(m => ({
          Versao: m.VALOR_VERSAO,
          Status: m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S' ? 'Ativa' : 'Inativa',
          Tipo_Versao: m.DESCRICAO_TIPO_VERSAO || '',
          Layout: m.DESCRICAO_TIPO_LAYOUT || '',
          ID_Versao: m.CODIGO_VERSAO_DOCUMENTO || '',
          Qtd_Regras: m.QUANTIDADE_REGRAS ?? 0,
          Qtd_Campos: m.QUANTIDADE_CAMPOS ?? 0
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(histRows), 'Historico');
      }

      // 3. Vínculos SQL
      if (filteredActions.length > 0) {
        const actionRows = filteredActions.map(a => ({
          Regra_Campo: a.DESCRICAO_REGRA || a.NOME_CAMPO || a.DS_CAMPO || '',
          Identificador: a.IDENTIFICADOR_CAMPO || a.DS_IDENTIFICADOR || '',
          Doc_Relacionado: a.DOCUMENTO_RELACIONADO || a.GRUPO_DOCS_RELACIONADOS || '',
          Script_SQL: String(a.SCRIPT_ACAO_COMPLETO || a.SCRIPT || '').slice(0, 30000)
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actionRows), 'Vinculos_SQL');
      }

      // 4. Regras
      if (rules.length > 0) {
        const ruleRows = rules.map(r => ({
          Ordem: r.NUM_ORDEM ?? '',
          Codigo: r.CD_REGRA ?? '',
          Versao: r.VL_VERSAO ?? '',
          Nome: r.DS_REGRA || '',
          Tipo: getRuleTypeBadge(r.TIPO_REGRA).label,
          Status: r.ATIVA === 1 || r.ATIVA === 'S' ? 'Ativa' : 'Inativa',
          Condicao: r.CONDICAO || '',
          Campos_Afetados: r.CAMPOS_AFETADOS || '',
          Alerta: r.DS_ALERTA || '',
          Script: String(r.SCRIPT || '').slice(0, 30000)
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ruleRows), 'Regras');
      }

      // 5. Campos
      if (fields.length > 0) {
        const fieldRows = fields.map(f => ({
          Versao: f.VL_VERSAO ?? '',
          Layout: f.DS_TIPO_LAYOUT || '',
          Identificador: f.DS_IDENTIFICADOR || '',
          Rotulo: f.DS_CAMPO || '',
          Tipo_Componente: f.DS_TIPO_VISUALIZACAO || '',
          Metadado_ID: f.CD_METADADO || '',
          Status: f.SN_ATIVO === 1 ? 'Ativo' : 'Inativo',
          Qtd_Regras: f.QTD_REGRAS ?? 0
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fieldRows), 'Campos');
      }

      // 6. Perfis Vinculados
      if (profiles.length > 0) {
        const profRows = profiles.map(p => ({
          Documento_ID: docId || '',
          Perfil_Vinculado: p.DS_PERFIL_AMBULATORIAL || '',
          Modulo_Titulo: p.NM_TITULO || '',
          Unidade_Empresa: p.EMPRESA || ''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profRows), 'Perfis_Vinculados');
      }

      XLSX.writeFile(wb, `Dossie_Doc_${docId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Dossiê completo do Documento #${docId} exportado!`);
    } catch (err) {
      console.error('Erro ao exportar dossiê:', err);
      toast.error('Falha ao gerar arquivo Excel.');
    }
  };

  const modalTabs: { key: DocumentDetailsTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'specs', label: 'Especificações', icon: FileText },
    { key: 'history', label: 'Histórico', icon: Layers, count: metadata.length },
    { key: 'actions', label: 'Vínculos SQL', icon: Code2, count: filteredActions.length },
    { key: 'rules', label: 'Regras', icon: ListFilter, count: rules.length },
    { key: 'fields', label: 'Campos', icon: TableProperties, count: layoutCountsForVersion.all || fields.length },
    { key: 'profiles', label: 'Perfis Vinculados', icon: Users, count: profiles.length },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 overflow-hidden">
      {/* Backdrop Frosted */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md sylva-fade-in"
        onClick={onClose}
      />

      {/* Centered Wide Bento Modal */}
      <div className="relative w-full max-w-6xl h-[90vh] sylva-dock rounded-[26px] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <header className="px-6 py-4.5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card-subtle)]/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] text-[10px] font-bold rounded-full uppercase tracking-wider font-mono">
                #{docId}
              </span>
              <span className="px-2.5 py-0.5 tone-success border text-[10px] font-bold rounded-full uppercase tracking-wider">
                Motor {docVersion}
              </span>
              {hasTestVersion && (
                <span className="px-2.5 py-0.5 tone-warning border text-[10px] font-bold rounded-full flex items-center gap-1">
                  <AlertTriangle size={11} /> Versão de Teste
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--foreground)] tracking-tight leading-snug truncate">
              {resolvedDocTitle}
            </h3>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isAnyLoading}
                className="h-9 px-3 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Recarregar dados do Oracle (ignorar cache)"
              >
                <RefreshCw size={13} className={cn(isAnyLoading && "animate-spin text-[var(--lime)]")} />
                <span className="hidden md:inline">Atualizar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportDossierExcel}
              disabled={isAnyLoading}
              className="h-9 px-4 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_14px_rgba(204,243,82,0.25)] transition-all cursor-pointer disabled:opacity-40"
              title="Exportar Dossiê Completo em Excel (6 abas)"
            >
              <Download size={14} />
              <span>Exportar Dossiê</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-9 h-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer"
              title="Imprimir"
            >
              <Printer size={15} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Navigation Tabs (Segmented Dock Pill Sylva) */}
        <div className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--canvas-bg)]/40">
          <div className="inline-flex max-w-full overflow-x-auto scrollbar-thin gap-1 p-1 rounded-full bg-[var(--card-subtle)] border border-[var(--border)]">
            {modalTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all",
                    isActive
                      ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] shadow-xs font-bold"
                      : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                        isActive
                          ? "bg-[var(--lime)] text-[var(--lime-ink)]"
                          : "bg-[var(--card-hover)] text-[var(--foreground-secondary)]"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {/* Alerta de erro/queda de conexão global de metadados */}
          {metadataError && activeTab !== 'profiles' && (
            <div className="mb-4 p-4 tone-danger border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Falha na consulta ao Oracle</span>
                  <span className="opacity-90">{metadataError}</span>
                </div>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--card-solid)] text-[var(--foreground)] border border-[var(--border)] font-bold text-[11px] hover:border-[var(--lime)] transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Tentar Novamente
                </button>
              )}
            </div>
          )}

          {/* TAB 1: Especificações */}
          {activeTab === 'specs' && (
            loading ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="skeleton h-28 rounded-[20px]" />
                  <div className="skeleton h-28 rounded-[20px]" />
                  <div className="skeleton h-28 rounded-[20px]" />
                </div>
                <div className="skeleton h-40 rounded-[20px]" />
              </div>
            ) : activeSpecs ? (
              <div className="space-y-5">
                {/* 4 Tinted Summary Cards Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sylva-card-slate rounded-[20px] p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--tint-slate-muted)] block">
                        Versão ativa
                      </span>
                      <span className="text-2xl font-bold font-mono text-[var(--tint-slate-fg)] mt-1 block">
                        v{activeSpecs.VALOR_VERSAO || '1.0'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--tint-slate-muted)] mt-2 truncate block">
                      {activeSpecs.DESCRICAO_TIPO_VERSAO || 'Publicada'}
                    </span>
                  </div>

                  <div className="sylva-card-olive rounded-[20px] p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--tint-olive-muted)] block">
                        Regras no Editor
                      </span>
                      <span className="text-2xl font-bold font-mono text-[var(--tint-olive-fg)] mt-1 block">
                        {activeSpecs.QUANTIDADE_REGRAS ?? rules.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rules')}
                      className="mt-2 pt-2 border-t border-[var(--tint-olive-border)] text-[11px] font-semibold text-[var(--tint-olive-fg)] flex items-center justify-between cursor-pointer"
                    >
                      <span>Inspecionar regras</span>
                      <span>→</span>
                    </button>
                  </div>

                  <div className="sylva-card-mocha rounded-[20px] p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--tint-mocha-muted)] block">
                        Campos (Tela)
                      </span>
                      <span className="text-2xl font-bold font-mono text-[var(--tint-mocha-fg)] mt-1 block">
                        {activeSpecs.QUANTIDADE_CAMPOS ?? 0}
                      </span>
                      {relatorioSpecs?.QUANTIDADE_CAMPOS && (
                        <span className="text-[10.5px] text-[var(--tint-mocha-muted)] mt-0.5 block">
                          +{relatorioSpecs.QUANTIDADE_CAMPOS} no Relatório
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFieldLayout(1);
                        setActiveTab('fields');
                      }}
                      className="mt-2 pt-2 border-t border-[var(--tint-mocha-border)] text-[11px] font-semibold text-[var(--tint-mocha-fg)] flex items-center justify-between cursor-pointer"
                    >
                      <span>Ver campos de Tela</span>
                      <span>→</span>
                    </button>
                  </div>

                  <div className="sylva-glass rounded-[20px] p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--muted)] block">
                        Perfis Vinculados
                      </span>
                      <span className="text-2xl font-bold font-mono text-[var(--foreground)] mt-1 block">
                        {profilesLoading ? '...' : profiles.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profiles')}
                      className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--accent-ink)] flex items-center justify-between cursor-pointer"
                    >
                      <span>Ver perfis vinculados</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* Estrutura do Layout */}
                <div className="sylva-glass rounded-[20px] p-5 space-y-3">
                  <h4 className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    Estrutura do layout e metadados técnicos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <div className="text-xs flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[var(--muted)]">Layout base</span>
                      <span className="text-[var(--foreground)] font-medium">
                        {activeSpecs.DESCRICAO_TIPO_LAYOUT || 'Editor Clínico'}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[var(--muted)]">Tipo de versão</span>
                      <span className="text-[var(--foreground)] font-medium">
                        {activeSpecs.DESCRICAO_TIPO_VERSAO || 'Publicada'}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[var(--muted)]">Cabeçalho</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {activeSpecs.DOCUMENTO_CABECALHO ? `Doc ${activeSpecs.DOCUMENTO_CABECALHO}` : (activeSpecs.CODIGO_LAYOUT_CABECALHO || 'Padrão')}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[var(--muted)]">Rodapé</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {activeSpecs.CODIGO_LAYOUT_RODAPE || 'Padrão'}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between items-center py-2">
                      <span className="text-[var(--muted)]">Identificador Técnico</span>
                      <span className="font-mono text-[var(--foreground)] font-medium">
                        {activeSpecs.IDENTIFICADOR_DOCUMENTO || '—'}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between items-center py-2">
                      <span className="text-[var(--muted)]">Vínculos SQL Detectados</span>
                      <span className="font-mono text-[var(--accent-ink)] font-bold">
                        {filteredActions.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[var(--muted)] sylva-glass rounded-[20px]">
                <Database size={36} className="mx-auto mb-3 opacity-35" />
                <p className="text-sm font-bold text-[var(--foreground)]">Sem especificações carregadas</p>
                <p className="text-xs mt-1 max-w-md mx-auto">
                  Nenhum metadado técnico foi retornado para o documento #{docId} no Motor {docVersion}.
                </p>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-4 px-4 py-2 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] font-bold text-xs cursor-pointer hover:brightness-105"
                  >
                    Tentar Novamente
                  </button>
                )}
              </div>
            )
          )}

          {/* TAB 2: Histórico de Versões */}
          {activeTab === 'history' && (
            loading ? (
              <div className="space-y-3 py-4">
                <div className="skeleton h-16 w-full rounded-xl" />
                <div className="skeleton h-16 w-full rounded-xl" />
              </div>
            ) : metadata.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metadata.map((ver, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl border transition-all",
                      ver.STATUS_ATIVO === 'S' || ver.STATUS_ATIVO === 1
                        ? "tone-success border"
                        : "bg-[var(--card-subtle)] border-[var(--border)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[var(--foreground)]">
                        Versão {ver.VALOR_VERSAO}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        ver.STATUS_ATIVO === 'S' || ver.STATUS_ATIVO === 1
                          ? "tone-success border"
                          : "tone-neutral border"
                      )}>
                        {ver.STATUS_ATIVO === 'S' || ver.STATUS_ATIVO === 1 ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="mt-2.5 text-xs text-[var(--foreground-secondary)] flex items-center justify-between">
                      <span>{ver.DESCRICAO_TIPO_LAYOUT || 'Layout'}</span>
                      <span className="font-mono text-[var(--muted)]">ID: {ver.CODIGO_VERSAO_DOCUMENTO}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center text-[var(--muted)]">
                <Layers size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">Nenhum histórico de versão encontrado</p>
              </div>
            )
          )}

          {/* TAB 3: Vínculos SQL */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              {uniqueRelatedDocs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-[var(--muted)]">Filtrar Doc:</span>
                  <button
                    onClick={() => setActionsFilterDoc(null)}
                    className={cn(
                      "px-2.5 py-0.5 text-[11px] rounded-full font-semibold cursor-pointer",
                      !actionsFilterDoc ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)]" : "bg-[var(--card-subtle)] text-[var(--foreground-secondary)] hover:bg-[var(--card-hover)]"
                    )}
                  >
                    Todos
                  </button>
                  {uniqueRelatedDocs.map(d => (
                    <button
                      key={d}
                      onClick={() => setActionsFilterDoc(d)}
                      className={cn(
                        "px-2.5 py-0.5 text-[11px] rounded-full font-medium border font-mono cursor-pointer",
                        actionsFilterDoc === d ? "bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)] font-bold" : "bg-[var(--card-subtle)] border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {actionsLoading ? (
                <div className="space-y-3 py-6">
                  <div className="skeleton h-20 w-full rounded-xl" />
                  <div className="skeleton h-20 w-full rounded-xl" />
                </div>
              ) : actionsError ? (
                <div className="p-4 tone-danger border rounded-xl text-xs text-[var(--tone-danger-fg)]">
                  {actionsError}
                </div>
              ) : filteredActions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredActions.map((action, aIdx) => {
                    const actionKey = `${action.CODIGO_REGRA || action.CODIGO_CAMPO || action.CD_CAMPO || aIdx}_${action.CODIGO_ACAO || aIdx}`;
                    const isExpanded = expandedScripts[actionKey];
                    const scriptText = action.SCRIPT_ACAO_COMPLETO || action.SCRIPT || action.script || '';
                    const fieldIdent = action.IDENTIFICADOR_CAMPO || action.DS_IDENTIFICADOR || action.CODIGO_CAMPO || action.CD_CAMPO || 'Global';
                    const ruleDesc = action.DESCRICAO_REGRA || action.NOME_CAMPO || action.DS_CAMPO || (action.CODIGO_REGRA ? `Regra ${action.CODIGO_REGRA}` : `Campo ${fieldIdent}`);

                    return (
                      <div key={actionKey} className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-2xl overflow-hidden text-xs flex flex-col">
                        <div className="p-3.5 border-b border-[var(--border)] flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-[var(--foreground)] block truncate">
                              {ruleDesc}
                            </span>
                            <span className="text-[11px] text-[var(--muted)] mt-0.5 block">
                              Campo: <code className="font-mono text-[var(--accent-ink)] font-semibold">{fieldIdent}</code>
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {action.DOCUMENTO_RELACIONADO && (
                              <span className="px-2 py-0.5 bg-[var(--accent)] border border-[var(--tint-olive-border)] text-[var(--accent-ink)] rounded-full text-[10px] font-mono font-bold">
                                Doc {action.DOCUMENTO_RELACIONADO}
                              </span>
                            )}
                            {(action.GRUPO_DOCS_RELACIONADOS || action.Grupo_Docs_Relacionados) && (
                              <span className="px-2 py-0.5 bg-[var(--accent)] border border-[var(--tint-olive-border)] text-[var(--accent-ink)] rounded-full text-[10px] font-mono font-bold">
                                Docs: {action.GRUPO_DOCS_RELACIONADOS || action.Grupo_Docs_Relacionados}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide">
                              Lógica SQL
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(scriptText, actionKey)}
                                className="text-[var(--muted)] hover:text-[var(--accent-ink)] flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                              >
                                {copiedId === actionKey ? <Check size={12} className="text-[var(--accent-ink)]" /> : <Copy size={12} />}
                                <span>Copiar</span>
                              </button>
                              <button
                                onClick={() => toggleScript(actionKey)}
                                className="text-[var(--accent-ink)] hover:underline flex items-center gap-0.5 text-[11px] font-semibold cursor-pointer"
                              >
                                {isExpanded ? (
                                  <><span>Recolher</span><ChevronUp size={12} /></>
                                ) : (
                                  <><span>Expandir</span><ChevronDown size={12} /></>
                                )}
                              </button>
                            </div>
                          </div>
                          <pre className={cn(
                            "font-mono text-[10.5px] bg-[#0E0D0C] text-emerald-200 p-3 rounded-xl border border-[var(--border)] overflow-x-auto whitespace-pre-wrap leading-relaxed transition-all scrollbar-thin",
                            isExpanded ? "max-h-[380px] overflow-y-auto" : "max-h-[85px] overflow-hidden"
                          )}>
                            {scriptText || '-- Sem script cadastrado'}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--muted)]">
                  <Unlink size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Nenhum vínculo ou regra SQL cadastrada</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Regras */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {rulesLoading ? (
                <div className="space-y-3 py-6">
                  <div className="skeleton h-12 w-full rounded-xl" />
                  <div className="skeleton h-28 w-full rounded-xl" />
                </div>
              ) : rulesError ? (
                <div className="p-4 tone-danger border rounded-xl text-xs text-[var(--tone-danger-fg)]">
                  {rulesError}
                </div>
              ) : rules.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-[var(--card-subtle)] p-4 rounded-2xl border border-[var(--border)] space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[var(--foreground-secondary)] uppercase tracking-wide">
                          Versão:
                        </span>
                        <select
                          value={selectedRuleVersion}
                          onChange={(e) => {
                            setSelectedRuleVersion(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                            setSelectedRuleType('ALL');
                          }}
                          className="text-xs bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3 py-1.5 font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] cursor-pointer"
                        >
                          {ruleVersions.map(v => (
                            <option key={v.version} value={v.version}>
                              v{v.version} — {v.type === 'PUBLISHED' ? 'Publicada' : v.type === 'TEST' ? 'Teste' : 'Histórico'} ({v.count} regras)
                            </option>
                          ))}
                          <option value="ALL">Todas as Versões ({rules.length} regras)</option>
                        </select>
                      </div>

                      <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                        <input
                          type="text"
                          placeholder="Buscar por regra, condição, campo ou SQL..."
                          value={rulesSearchTerm}
                          onChange={(e) => setRulesSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 text-xs bg-[var(--card-solid)] border border-[var(--border)] rounded-full text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] font-medium"
                        />
                        {rulesSearchTerm && (
                          <button
                            onClick={() => setRulesSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--accent-ink)] cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {Object.keys(ruleTypeStats.byLabel).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRuleType('ALL')}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border cursor-pointer",
                            selectedRuleType === 'ALL'
                              ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] border-transparent"
                              : "bg-[var(--card-solid)] text-[var(--foreground-secondary)] border-[var(--border)] hover:bg-[var(--card-hover)]"
                          )}
                        >
                          Todas ({ruleTypeStats.all})
                        </button>
                        {Object.entries(ruleTypeStats.byLabel).map(([label, info]) => {
                          const isSelected = selectedRuleType === label;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setSelectedRuleType(isSelected ? 'ALL' : label)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border flex items-center gap-1.5 cursor-pointer",
                                isSelected
                                  ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] border-transparent"
                                  : "bg-[var(--card-solid)] text-[var(--foreground-secondary)] border-[var(--border)] hover:bg-[var(--card-hover)]"
                              )}
                            >
                              <span>{label}</span>
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[9.5px] font-bold",
                                isSelected ? "bg-[var(--lime)] text-[var(--lime-ink)]" : "bg-[var(--card-hover)] text-[var(--foreground-secondary)]"
                              )}>
                                {info.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {filteredRules.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredRules.map((rule, rIdx) => {
                        const ruleKey = `rule_${rule.CD_REGRA || rIdx}_v${rule.VL_VERSAO || 0}_${rIdx}`;
                        const isExpanded = expandedScripts[ruleKey];
                        const isFieldsExpanded = expandedFields[ruleKey];
                        const scriptText = rule.SCRIPT || '';
                        const badge = getRuleTypeBadge(rule.TIPO_REGRA);

                        const affectedFields = rule.CAMPOS_AFETADOS
                          ? String(rule.CAMPOS_AFETADOS).split(',').map((f: string) => f.trim()).filter(Boolean)
                          : [];

                        return (
                          <div key={ruleKey} className="bg-[var(--card-subtle)] border border-[var(--border)] rounded-2xl overflow-hidden text-xs flex flex-col">
                            <div className="p-3.5 border-b border-[var(--border)] flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-[var(--card-solid)] border border-[var(--border)] text-[var(--foreground)] font-mono font-bold text-[11px]">
                                    #{rule.NUM_ORDEM ?? (rIdx + 1)}
                                  </span>
                                  <span className="font-bold text-[var(--foreground)] text-sm leading-snug">
                                    {rule.DS_REGRA || `Regra ${rule.CD_REGRA}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                                  <span>Código: <b className="font-mono text-[var(--foreground-secondary)]">{rule.CD_REGRA}</b></span>
                                  <span>•</span>
                                  <span>Versão: <b className="font-mono text-[var(--foreground-secondary)]">v{rule.VL_VERSAO}</b></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase", badge.color)}>
                                  {badge.label}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  rule.ATIVA === 1 || rule.ATIVA === 'S' ? "tone-success border" : "tone-neutral border"
                                )}>
                                  {rule.ATIVA === 1 || rule.ATIVA === 'S' ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                            </div>

                            <div className="p-3.5 space-y-3 flex-1">
                              {rule.CONDICAO ? (
                                <div className="flex items-start gap-2 tone-warning border rounded-xl p-2.5 text-xs">
                                  <span className="font-bold text-[var(--tone-warning-fg)] uppercase tracking-wider text-[10px] shrink-0 mt-0.5 flex items-center gap-1">
                                    <Zap size={12} /> Quando:
                                  </span>
                                  <code className="font-mono text-[var(--tone-warning-fg)] font-semibold break-all leading-relaxed">
                                    {rule.CONDICAO}
                                  </code>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--muted)]">
                                  <Zap size={11} />
                                  <span className="italic text-[11px]">Sem condição (disparo global)</span>
                                </div>
                              )}

                              {affectedFields.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-[var(--foreground-secondary)] uppercase tracking-wide flex items-center gap-1">
                                      <SlidersHorizontal size={12} className="text-[var(--muted)]" /> Campos Afetados ({rule.QTD_CAMPOS || affectedFields.length}):
                                    </span>
                                    {affectedFields.length > 6 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleFields(ruleKey)}
                                        className="text-[var(--accent-ink)] hover:underline font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                                      >
                                        {isFieldsExpanded ? <>Recolher <ChevronUp size={12} /></> : <>Ver todos ({affectedFields.length}) <ChevronDown size={12} /></>}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(isFieldsExpanded ? affectedFields : affectedFields.slice(0, 6)).map((fieldName: string, fIdx: number) => (
                                      <span
                                        key={fIdx}
                                        className="font-mono text-[11px] font-semibold bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] px-2 py-0.5 rounded-md"
                                      >
                                        {fieldName}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {rule.DS_ALERTA && (
                                <div className="flex items-start gap-2 tone-danger border rounded-xl p-2.5 text-xs">
                                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold uppercase text-[10px] block">Mensagem de Validação</span>
                                    <p className="font-medium leading-relaxed">{rule.DS_ALERTA}</p>
                                  </div>
                                </div>
                              )}

                              {scriptText && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide flex items-center gap-1">
                                      <Code2 size={12} /> Ação / Script SQL
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => copyToClipboard(scriptText, ruleKey)}
                                        className="text-[var(--muted)] hover:text-[var(--accent-ink)] flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                                      >
                                        {copiedId === ruleKey ? <Check size={12} className="text-[var(--accent-ink)]" /> : <Copy size={12} />}
                                        <span>Copiar SQL</span>
                                      </button>
                                      <button
                                        onClick={() => toggleScript(ruleKey)}
                                        className="text-[var(--accent-ink)] hover:underline flex items-center gap-0.5 text-[11px] font-semibold cursor-pointer"
                                      >
                                        {isExpanded ? <>Recolher <ChevronUp size={12} /></> : <>Expandir <ChevronDown size={12} /></>}
                                      </button>
                                    </div>
                                  </div>
                                  <pre className={cn(
                                    "font-mono text-[10.5px] bg-[#0E0D0C] text-emerald-200 p-2.5 rounded-xl border border-[var(--border)] overflow-x-auto whitespace-pre-wrap leading-relaxed transition-all scrollbar-thin",
                                    isExpanded ? "max-h-[350px] overflow-y-auto" : "max-h-[75px] overflow-hidden"
                                  )}>
                                    {scriptText}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-[var(--muted)] bg-[var(--card-subtle)] rounded-2xl border border-dashed border-[var(--border)]">
                      <Search size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-semibold">Nenhuma regra encontrada com os filtros atuais</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--muted)]">
                  <Unlink size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Nenhuma regra cadastrada para este documento</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Campos / Metadados */}
          {activeTab === 'fields' && (
            <div className="space-y-4">
              {fieldsLoading ? (
                <div className="space-y-4 py-6">
                  <div className="skeleton h-12 w-full rounded-xl" />
                  <div className="grid grid-cols-4 gap-3">
                    <div className="skeleton h-16 rounded-xl" />
                    <div className="skeleton h-16 rounded-xl" />
                    <div className="skeleton h-16 rounded-xl" />
                    <div className="skeleton h-16 rounded-xl" />
                  </div>
                </div>
              ) : fieldsError ? (
                <div className="p-4 tone-danger border rounded-xl text-[var(--tone-danger-fg)] text-xs">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <AlertTriangle size={14} /> Erro ao carregar campos
                  </div>
                  <p>{fieldsError}</p>
                </div>
              ) : fields.length > 0 ? (
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--card-subtle)] p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--foreground-secondary)]">Versão:</span>
                      <select
                        value={selectedFieldVersion}
                        onChange={(e) => setSelectedFieldVersion(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="text-xs font-bold bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] cursor-pointer"
                      >
                        <option value="ALL">Todas as Versões ({fields.length})</option>
                        {fieldVersions.map(v => (
                          <option key={v.version} value={v.version}>
                            v{v.version} {v.published === 1 ? '★ Publicada' : ''} ({v.count} campos)
                          </option>
                        ))}
                      </select>

                      <Link
                        href={`/documentos/${docId}/campos`}
                        target="_blank"
                        className="px-3 py-1.5 text-[11px] font-bold text-[var(--accent-ink)] bg-[var(--accent)] hover:bg-[var(--card-hover)] border border-[var(--tint-olive-border)] rounded-full flex items-center gap-1 transition-all"
                      >
                        <ExternalLink size={12} />
                        <span>Página Dedicada</span>
                      </Link>
                    </div>

                    <div className="relative flex-1 max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                      <input
                        type="text"
                        value={fieldsSearchTerm}
                        onChange={(e) => setFieldsSearchTerm(e.target.value)}
                        placeholder="Buscar tag, nome, metadado..."
                        className="w-full pl-9 pr-8 py-1.5 bg-[var(--card-solid)] border border-[var(--border)] rounded-full text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                      />
                      {fieldsSearchTerm && (
                        <button
                          onClick={() => setFieldsSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--accent-ink)] text-xs font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-2xl">
                      <span className="text-[10.5px] font-medium text-[var(--muted)] block">Campos no Filtro</span>
                      <span className="text-xl font-bold text-[var(--foreground)] font-mono mt-0.5 block">{fieldsKpis.total}</span>
                    </div>
                    <div className="p-3 tone-success border rounded-2xl">
                      <span className="text-[10.5px] font-medium text-[var(--tone-success-fg)] block">Campos Ativos</span>
                      <span className="text-xl font-bold text-[var(--tone-success-fg)] font-mono mt-0.5 block">{fieldsKpis.active}</span>
                    </div>
                    <div className="p-3 bg-[var(--accent)] border border-[var(--tint-olive-border)] rounded-2xl">
                      <span className="text-[10.5px] font-medium text-[var(--accent-ink)] block">Metadados Padrão</span>
                      <span className="text-xl font-bold text-[var(--accent-ink)] font-mono mt-0.5 block">{fieldsKpis.withMetadata}</span>
                    </div>
                    <div className="p-3 tone-warning border rounded-2xl">
                      <span className="text-[10.5px] font-medium text-[var(--tone-warning-fg)] block">Com Regras</span>
                      <span className="text-xl font-bold text-[var(--tone-warning-fg)] font-mono mt-0.5 block">{fieldsKpis.withRules}</span>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--card-subtle)] p-1 rounded-full border border-[var(--border)] text-[11px]">
                      <button
                        onClick={() => setSelectedFieldLayout('ALL')}
                        className={cn(
                          "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                          selectedFieldLayout === 'ALL' ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold" : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        Todos ({layoutCountsForVersion.all})
                      </button>
                      <button
                        onClick={() => setSelectedFieldLayout(1)}
                        className={cn(
                          "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                          selectedFieldLayout === 1 ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold" : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        Tela ({layoutCountsForVersion.tela})
                      </button>
                      <button
                        onClick={() => setSelectedFieldLayout(2)}
                        className={cn(
                          "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                          selectedFieldLayout === 2 ? "bg-[var(--sky)] text-[#0B1A2B] font-bold" : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        Relatório ({layoutCountsForVersion.relatorio})
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-[var(--card-subtle)] p-1 rounded-full border border-[var(--border)] text-[11px]">
                      <button
                        onClick={() => setSelectedFieldStatus('ALL')}
                        className={cn(
                          "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                          selectedFieldStatus === 'ALL' ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold" : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        Todos Status
                      </button>
                      <button
                        onClick={() => setSelectedFieldStatus('1')}
                        className={cn(
                          "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                          selectedFieldStatus === '1' ? "bg-[var(--lime)] text-[var(--lime-ink)] font-bold" : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        Ativos
                      </button>
                      <button
                        onClick={() => setSelectedFieldStatus('0')}
                        className={cn(
                          "px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer",
                          selectedFieldStatus === '0' ? "bg-[var(--glass-pill-active)] text-[var(--glass-pill-active-ink)] font-bold" : "text-[var(--foreground-secondary)]"
                        )}
                      >
                        Inativos
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedFieldHasRules(selectedFieldHasRules === 'WITH_RULES' ? 'ALL' : 'WITH_RULES')}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border flex items-center gap-1 cursor-pointer",
                        selectedFieldHasRules === 'WITH_RULES'
                          ? "bg-[var(--sand)] text-[#1A1408] border-[var(--sand)]"
                          : "bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border-[var(--border)] hover:bg-[var(--card-hover)]"
                      )}
                    >
                      <Zap size={11} />
                      <span>Apenas com Regras</span>
                    </button>
                  </div>

                  {/* Grid of Fields */}
                  {filteredFields.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredFields.map((field, fIdx) => {
                        const fKey = `fld_${field.CD_CAMPO}_${field.VL_VERSAO}_${field.CD_LAYOUT}_${fIdx}`;
                        const typeBadge = getFieldTypeBadge(field.DS_TIPO_VISUALIZACAO);
                        const isCopied = copiedId === field.DS_IDENTIFICADOR;

                        return (
                          <div
                            key={fKey}
                            className="bg-[var(--card-subtle)] border border-[var(--border)] hover:border-[var(--border-strong)] rounded-2xl p-3.5 transition-all flex flex-col gap-2 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <button
                                  onClick={() => copyToClipboard(field.DS_IDENTIFICADOR, field.DS_IDENTIFICADOR)}
                                  className="font-mono text-xs font-bold text-[var(--accent-ink)] bg-[var(--accent)] hover:bg-[var(--card-hover)] px-2 py-0.5 rounded border border-[var(--tint-olive-border)] flex items-center gap-1 cursor-pointer"
                                  title="Copiar identificador técnico"
                                >
                                  <span>{field.DS_IDENTIFICADOR}</span>
                                  {isCopied ? <Check size={11} /> : <Copy size={11} className="opacity-50" />}
                                </button>
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", typeBadge.color)}>
                                  {typeBadge.label}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold border uppercase",
                                  field.CD_TIPO_LAYOUT === 1 ? "bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]" : "tone-info border"
                                )}>
                                  {field.DS_TIPO_LAYOUT || (field.CD_TIPO_LAYOUT === 1 ? 'Tela' : 'Relatório')}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--muted)] shrink-0">ID #{field.CD_CAMPO}</span>
                            </div>

                            <div className="text-xs text-[var(--foreground)] font-medium">
                              {field.DS_CAMPO && field.DS_CAMPO !== field.DS_IDENTIFICADOR ? field.DS_CAMPO : (
                                <span className="italic text-[var(--muted)]">Usa identificador técnico</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--muted)]">
                              <div className="flex items-center gap-2">
                                {field.CD_METADADO ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded tone-success border font-mono text-[10px] font-bold">
                                    <Sparkles size={10} /> Metadado #{field.CD_METADADO}
                                  </span>
                                ) : (
                                  <span className="text-[10px]">Campo Específico</span>
                                )}
                                <span>•</span>
                                <span className="font-mono text-[10px]">v{field.VL_VERSAO}</span>
                              </div>

                              {field.QTD_REGRAS > 0 ? (
                                <button
                                  onClick={() => {
                                    setRulesSearchTerm(field.DS_IDENTIFICADOR);
                                    setActiveTab('rules');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full tone-warning border font-bold text-[10px] cursor-pointer"
                                >
                                  <Zap size={10} />
                                  <span>{field.QTD_REGRAS} {field.QTD_REGRAS === 1 ? 'regra' : 'regras'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px]">Sem regras</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-[var(--muted)] bg-[var(--card-subtle)] rounded-2xl border border-dashed border-[var(--border)]">
                      <Search size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-semibold">Nenhum campo encontrado com os filtros atuais</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--muted)]">
                  <TableProperties size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Nenhum campo cadastrado para este documento</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Perfis Ambulatoriais Unificados */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              {profilesError && (
                <div className="p-4 tone-danger border rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} />
                    <span>{profilesError}</span>
                  </div>
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={onRefresh}
                      className="px-3 py-1 rounded-full bg-[var(--card-solid)] text-[var(--foreground)] border border-[var(--border)] font-bold text-[11px] cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {/* Search & Hospital Filters */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--card-subtle)] p-3.5 rounded-2xl border border-[var(--border)]">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={profileSearchTerm}
                    onChange={(e) => setProfileSearchTerm(e.target.value)}
                    placeholder="Buscar por nome do perfil, módulo ou hospital..."
                    className="w-full pl-9 pr-8 py-1.5 bg-[var(--card-solid)] border border-[var(--border)] rounded-full text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                  />
                  {profileSearchTerm && (
                    <button
                      onClick={() => setProfileSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {profileHospitals.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-[var(--muted)] mr-1">Hospital:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProfileHospital('ALL')}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer",
                        selectedProfileHospital === 'ALL'
                          ? "bg-[var(--lime)] text-[var(--lime-ink)] font-bold"
                          : "bg-[var(--card-solid)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:text-[var(--foreground)]"
                      )}
                    >
                      Todos ({profiles.length})
                    </button>
                    {profileHospitals.map(h => {
                      const count = profiles.filter(p => p.EMPRESA === h).length;
                      const isSel = selectedProfileHospital === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSelectedProfileHospital(h)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer font-mono",
                            isSel
                              ? "bg-[var(--lime)] text-[var(--lime-ink)] font-bold"
                              : "bg-[var(--card-solid)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:text-[var(--foreground)]"
                          )}
                        >
                          {h} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Profiles Table */}
              {profilesLoading ? (
                <div className="space-y-2.5 py-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-11 w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredProfiles.length > 0 ? (
                <div className="sylva-glass rounded-2xl overflow-hidden border border-[var(--border)]">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--card-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                          <th className="py-2.5 px-4 w-24">Código</th>
                          <th className="py-2.5 px-4">Perfil Vinculado</th>
                          <th className="py-2.5 px-4">Módulo / Título</th>
                          <th className="py-2.5 px-4 text-center w-32">Unidade / Empresa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {paginatedProfiles.map((prof, idx) => (
                          <tr key={idx} className="hover:bg-[var(--card-subtle)]/70 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-[var(--muted)]">
                              #{prof.CD_DOCUMENTO || docId}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-[var(--foreground)]">
                              {prof.DS_PERFIL_AMBULATORIAL || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-[var(--foreground-secondary)]">
                              {prof.NM_TITULO || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-bold bg-[var(--card-solid)] border border-[var(--border)] text-[var(--foreground)]">
                                {prof.EMPRESA && prof.EMPRESA !== 'NO_HOSPITALS' ? prof.EMPRESA : 'Todas'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--card-subtle)]/40 flex items-center justify-between text-xs text-[var(--foreground-secondary)]">
                    <span>
                      Exibindo <b className="text-[var(--foreground)]">{paginatedProfiles.length}</b> de{' '}
                      <b className="text-[var(--foreground)]">{filteredProfiles.length}</b> perfis correlacionados
                    </span>
                    {totalProfilePages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={profilePage === 1}
                          onClick={() => setProfilePage(1)}
                          className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronsLeft size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={profilePage === 1}
                          onClick={() => setProfilePage(p => Math.max(1, p - 1))}
                          className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--card-solid)] border border-[var(--border)] font-mono font-bold text-[11px] text-[var(--foreground)]">
                          {profilePage} / {totalProfilePages}
                        </span>
                        <button
                          type="button"
                          disabled={profilePage === totalProfilePages}
                          onClick={() => setProfilePage(p => Math.min(totalProfilePages, p + 1))}
                          className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={profilePage === totalProfilePages}
                          onClick={() => setProfilePage(totalProfilePages)}
                          className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronsRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center text-[var(--muted)] sylva-glass rounded-2xl border border-dashed border-[var(--border)]">
                  <Users size={34} className="mx-auto mb-2 opacity-35" />
                  <p className="text-sm font-bold text-[var(--foreground)]">Nenhum perfil vinculado encontrado</p>
                  <p className="text-xs mt-1">
                    Não foram encontrados perfis ativos vinculados ao documento #{docId} no Motor {docVersion}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
