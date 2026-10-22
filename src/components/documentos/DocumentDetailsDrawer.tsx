"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, AlertTriangle, CheckCircle, Database, FileText, 
  Layers, Code2, Unlink, Copy, Check, ChevronDown, ChevronUp, ExternalLink,
  Search, ListFilter, Zap, SlidersHorizontal, CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DocumentDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  docId: string | null;
  metadata: any[];
  loading: boolean;
  actions: any[];
  actionsLoading: boolean;
  actionsError: string | null;
  rules?: any[];
  rulesLoading?: boolean;
  rulesError?: string | null;
}

export const getRuleTypeBadge = (tipo?: string) => {
  const t = String(tipo || '').toUpperCase();
  switch (t) {
    case 'ENABLE':
      return {
        label: 'Habilitar',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    case 'DISABLE':
      return {
        label: 'Desabilitar',
        color: 'bg-rose-50 text-rose-700 border-rose-200'
      };
    case 'ANSWER':
      return {
        label: 'Preencher / Responder',
        color: 'bg-sky-50 text-sky-700 border-sky-200'
      };
    case 'VALIDATE':
      return {
        label: 'Validar',
        color: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    case 'CLEAR':
      return {
        label: 'Limpar',
        color: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    case 'VISIBLE':
      return {
        label: 'Visível',
        color: 'bg-teal-50 text-teal-700 border-teal-200'
      };
    case 'INVISIBLE':
      return {
        label: 'Invisível',
        color: 'bg-zinc-100 text-zinc-700 border-zinc-200'
      };
    case 'REQUIRED':
      return {
        label: 'Obrigatório',
        color: 'bg-orange-50 text-orange-700 border-orange-200'
      };
    case 'REFRESH':
    case 'REFRESH_FIELD':
      return {
        label: 'Atualizar',
        color: 'bg-cyan-50 text-cyan-800 border-cyan-200'
      };
    case 'ON_CLONE':
    case 'ON_CLOSE':
    case 'ON_COPY':
      return {
        label: 'Ao Finalizar',
        color: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    case 'ON_SAVE':
      return {
        label: 'Ao Salvar',
        color: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    case 'RUN':
    case 'RUN_SET':
      return {
        label: 'Executar',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    case 'FILTER':
      return {
        label: 'Filtrar',
        color: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    case 'INVALIDATE':
      return {
        label: 'Invalidar',
        color: 'bg-rose-50 text-rose-800 border-rose-200'
      };
    default:
      return {
        label: tipo || 'Ação',
        color: 'bg-slate-100 text-slate-700 border-slate-200'
      };
  }
};

export function DocumentDetailsDrawer({
  open,
  onClose,
  docId,
  metadata,
  loading,
  actions,
  actionsLoading,
  actionsError,
  rules = [],
  rulesLoading = false,
  rulesError = null
}: DocumentDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'specs' | 'history' | 'actions' | 'rules'>('specs');
  const [actionsFilterDoc, setActionsFilterDoc] = useState<string | null>(null);
  const [selectedRuleVersion, setSelectedRuleVersion] = useState<number | 'ALL'>('ALL');
  const [selectedRuleType, setSelectedRuleType] = useState<string>('ALL');
  const [rulesSearchTerm, setRulesSearchTerm] = useState('');
  const [expandedScripts, setExpandedScripts] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extrai versões únicas das regras
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

  // Define a versão publicada mais recente como padrão para as regras
  useEffect(() => {
    if (ruleVersions.length > 0) {
      const pub = ruleVersions.find(v => v.type === 'PUBLISHED' || v.published === 1);
      setSelectedRuleVersion(pub ? pub.version : ruleVersions[0].version);
    } else {
      setSelectedRuleVersion('ALL');
    }
  }, [ruleVersions]);

  // Estatísticas por tipo de regra (usando o rótulo traduzido) na versão selecionada
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

  // Regras filtradas por versão, tipo traduzido e busca
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    return rules.filter(r => {
      if (selectedRuleVersion !== 'ALL' && r.VL_VERSAO !== selectedRuleVersion) {
        return false;
      }
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

  // Identifica a versão publicada mais recente
  const activePublishedVersion = metadata.find(m => 
    m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S'
  )?.VALOR_VERSAO;

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

  // Documentos relacionados únicos
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

  // Ações filtradas e deduplicadas
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

    // Deduplica ações repetidas decorrentes de múltiplos layouts (tela vs relatório)
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

  const toggleScript = (id: string) => {
    setExpandedScripts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFields = (id: string) => {
    setExpandedFields(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Script SQL copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg sm:max-w-xl lg:max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 relative">
            <button 
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                Metadados MV
              </span>
              {hasTestVersion && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <AlertTriangle size={11} /> Versão de Teste
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug pr-6">
              {metadata[0]?.DESCRICAO_DOCUMENTO || 'Detalhes do Documento'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Código MV: <span className="font-mono font-bold text-sky-700">{docId}</span>
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-6 gap-2 bg-white">
            <button 
              onClick={() => setActiveTab('specs')}
              className={cn(
                "py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'specs' 
                  ? "border-sky-600 text-sky-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <FileText size={14} />
              <span>Especificações</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'history' 
                  ? "border-sky-600 text-sky-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Layers size={14} />
              <span>Histórico ({metadata.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('actions')}
              className={cn(
                "py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'actions' 
                  ? "border-sky-600 text-sky-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Code2 size={14} />
              <span>Vínculos SQL ({actions.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={cn(
                "py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'rules' 
                  ? "border-sky-600 text-sky-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <ListFilter size={14} />
              <span>Regras ({rules.length})</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {loading ? (
              <div className="space-y-4 py-8">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-24 w-full" />
                <div className="skeleton h-24 w-full" />
              </div>
            ) : (
              <>
                {/* Tab: Especificações */}
                {activeTab === 'specs' && activeSpecs && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Versão Ativa Publicada:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          v{activeSpecs.VALOR_VERSAO || '1.0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Tipo de Versão:</span>
                        <span className="font-semibold text-slate-800">
                          {activeSpecs.DESCRICAO_TIPO_VERSAO || 'Publicada'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Layout Base:</span>
                        <span className="font-semibold text-slate-800">
                          {activeSpecs.DESCRICAO_TIPO_LAYOUT || 'Editor Clínico'}
                        </span>
                      </div>
                    </div>

                    {/* Regras e Campos */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-sky-50/50 border border-sky-100 rounded-xl">
                        <span className="text-[11px] font-semibold text-sky-800 block">Quantidade de Regras</span>
                        <span className="text-2xl font-bold text-sky-900 font-mono mt-1 block">
                          {activeSpecs.QUANTIDADE_REGRAS ?? 0}
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <span className="text-[11px] font-semibold text-slate-700 block">Quantidade de Campos</span>
                        <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                          {activeSpecs.QUANTIDADE_CAMPOS ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Cabeçalho e Rodapé */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Layouts Vinculados</h4>
                      <div className="text-xs flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Cabeçalho:</span>
                        <span className="font-mono text-slate-800 font-medium">
                          {activeSpecs.DOCUMENTO_CABECALHO ? `Doc ${activeSpecs.DOCUMENTO_CABECALHO}` : (activeSpecs.CODIGO_LAYOUT_CABECALHO || 'Padrão')}
                        </span>
                      </div>
                      <div className="text-xs flex justify-between py-1">
                        <span className="text-slate-500">Rodapé:</span>
                        <span className="font-mono text-slate-800 font-medium">
                          {activeSpecs.CODIGO_LAYOUT_RODAPE || 'Padrão'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Histórico de Versões */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {metadata.map((ver, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3.5 rounded-xl border transition-all",
                          ver.STATUS_ATIVO === 'S' || ver.STATUS_ATIVO === 1
                            ? "bg-emerald-50/40 border-emerald-200/80"
                            : "bg-slate-50/60 border-slate-200/70"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            Versão {ver.VALOR_VERSAO}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            ver.STATUS_ATIVO === 'S' || ver.STATUS_ATIVO === 1
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          )}>
                            {ver.STATUS_ATIVO === 'S' || ver.STATUS_ATIVO === 1 ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
                          <span>{ver.DESCRICAO_TIPO_LAYOUT || 'Layout'}</span>
                          <span className="font-mono text-slate-500">ID: {ver.CODIGO_VERSAO_DOCUMENTO}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Vínculos SQL */}
                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    {uniqueRelatedDocs.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500">Filtrar Doc:</span>
                        <button
                          onClick={() => setActionsFilterDoc(null)}
                          className={cn(
                            "px-2 py-0.5 text-[11px] rounded font-medium",
                            !actionsFilterDoc ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          Todos
                        </button>
                        {uniqueRelatedDocs.map(d => (
                          <button
                            key={d}
                            onClick={() => setActionsFilterDoc(d)}
                            className={cn(
                              "px-2 py-0.5 text-[11px] rounded font-medium border font-mono",
                              actionsFilterDoc === d ? "bg-sky-50 border-sky-300 text-sky-800 font-bold" : "bg-white border-slate-200 text-slate-600"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}

                    {actionsLoading ? (
                      <div className="space-y-3 py-6">
                        <div className="skeleton h-16 w-full" />
                        <div className="skeleton h-16 w-full" />
                      </div>
                    ) : actionsError ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                        {actionsError}
                      </div>
                    ) : filteredActions.length > 0 ? (
                      <div className="space-y-3">
                        {filteredActions.map((action, aIdx) => {
                          const actionKey = `${action.CODIGO_REGRA || action.CODIGO_CAMPO || action.CD_CAMPO || aIdx}_${action.CODIGO_ACAO || aIdx}`;
                          const isExpanded = expandedScripts[actionKey];
                          const scriptText = action.SCRIPT_ACAO_COMPLETO || action.SCRIPT || action.script || '';
                          const fieldIdent = action.IDENTIFICADOR_CAMPO || action.DS_IDENTIFICADOR || action.CODIGO_CAMPO || action.CD_CAMPO || 'Global';
                          const ruleDesc = action.DESCRICAO_REGRA || action.NOME_CAMPO || action.DS_CAMPO || (action.CODIGO_REGRA ? `Regra ${action.CODIGO_REGRA}` : `Campo ${fieldIdent}`);

                          return (
                            <div key={actionKey} className="bg-slate-50/80 border border-slate-200 rounded-xl overflow-hidden text-xs">
                              <div className="p-3.5 bg-white border-b border-slate-200/70 flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold text-slate-900 block">
                                    {ruleDesc}
                                  </span>
                                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                                    Campo: <code className="font-mono text-sky-700 font-semibold">{fieldIdent}</code>
                                  </span>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {action.DOCUMENTO_RELACIONADO && (
                                    <span className="px-2 py-0.5 bg-sky-50 border border-sky-200 text-sky-800 rounded text-[10px] font-mono font-bold">
                                      Doc {action.DOCUMENTO_RELACIONADO}
                                    </span>
                                  )}
                                  {(action.GRUPO_DOCS_RELACIONADOS || action.Grupo_Docs_Relacionados) && (
                                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded text-[10px] font-mono font-bold">
                                      Docs: {action.GRUPO_DOCS_RELACIONADOS || action.Grupo_Docs_Relacionados}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Script Body */}
                              <div className="p-3 bg-slate-50">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                    Lógica SQL
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => copyToClipboard(scriptText, actionKey)}
                                      className="text-slate-500 hover:text-sky-700 flex items-center gap-1 text-[11px] font-medium"
                                      title="Copiar Script"
                                    >
                                      {copiedId === actionKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                      <span>Copiar</span>
                                    </button>
                                    <button
                                      onClick={() => toggleScript(actionKey)}
                                      className="text-sky-700 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
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
                                  "font-mono text-[10.5px] bg-slate-900 text-slate-100 p-2.5 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed transition-all",
                                  isExpanded ? "max-h-[350px] overflow-y-auto" : "max-h-[70px] overflow-hidden"
                                )}>
                                  {scriptText || '-- Sem script cadastrado'}
                                </pre>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        <Unlink size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Nenhum vínculo ou regra SQL cadastrada</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Regras do Documento (Editor 3.0) */}
                {activeTab === 'rules' && (
                  <div className="space-y-4">
                    {rulesLoading ? (
                      <div className="space-y-3 py-6">
                        <div className="skeleton h-10 w-full" />
                        <div className="skeleton h-10 w-full" />
                        <div className="skeleton h-24 w-full" />
                        <div className="skeleton h-24 w-full" />
                      </div>
                    ) : rulesError ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                        {rulesError}
                      </div>
                    ) : rules.length > 0 ? (
                      <div className="space-y-3">
                        {/* Version Selector & Filter Header */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                              Versão do Documento:
                            </span>
                            <select
                              value={selectedRuleVersion}
                              onChange={(e) => {
                                setSelectedRuleVersion(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                                setSelectedRuleType('ALL');
                              }}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs cursor-pointer"
                            >
                              {ruleVersions.map(v => (
                                <option key={v.version} value={v.version}>
                                  v{v.version} — {v.type === 'PUBLISHED' ? 'Publicada' : v.type === 'TEST' ? 'Teste' : 'Histórico'} ({v.count} regras)
                                </option>
                              ))}
                              <option value="ALL">Todas as Versões ({rules.length} regras)</option>
                            </select>
                          </div>

                          {/* Quick Search */}
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar por regra, condição, campo ou SQL..."
                              value={rulesSearchTerm}
                              onChange={(e) => setRulesSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-2xs font-medium"
                            />
                            {rulesSearchTerm && (
                              <button
                                onClick={() => setRulesSearchTerm('')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {/* Filter Pills by Action Type */}
                          {Object.keys(ruleTypeStats.byLabel).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <button
                                type="button"
                                onClick={() => setSelectedRuleType('ALL')}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
                                  selectedRuleType === 'ALL'
                                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
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
                                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border flex items-center gap-1.5",
                                      isSelected
                                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                    )}
                                  >
                                    <span>{label}</span>
                                    <span className={cn(
                                      "px-1.5 py-0.2 rounded-full text-[9.5px]",
                                      isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                                    )}>
                                      {info.count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                            <span>Exibindo <b>{filteredRules.length}</b> de <b>{ruleTypeStats.all}</b> regras</span>
                            {selectedRuleVersion !== 'ALL' && (
                              <span className="font-mono text-sky-700 font-semibold">
                                Versão v{selectedRuleVersion}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* List of rules */}
                        {filteredRules.length > 0 ? (
                          <div className="space-y-3">
                            {filteredRules.map((rule, rIdx) => {
                              const ruleKey = `rule_${rule.CD_REGRA || rIdx}_v${rule.VL_VERSAO || 0}_${rIdx}`;
                              const isExpanded = expandedScripts[ruleKey];
                              const isFieldsExpanded = expandedFields[ruleKey];
                              const scriptText = rule.SCRIPT || '';
                              const badge = getRuleTypeBadge(rule.TIPO_REGRA);

                              const fields = rule.CAMPOS_AFETADOS 
                                ? String(rule.CAMPOS_AFETADOS).split(',').map((f: string) => f.trim()).filter(Boolean)
                                : [];

                              return (
                                <div key={ruleKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-xs">
                                  {/* Card Header */}
                                  <div className="p-3.5 bg-slate-50/70 border-b border-slate-200/70 flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 font-mono font-bold text-[11px]">
                                          #{rule.NUM_ORDEM ?? (rIdx + 1)}
                                        </span>
                                        <span className="font-bold text-slate-900 text-sm leading-snug">
                                          {rule.DS_REGRA || `Regra ${rule.CD_REGRA}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                        <span>Código: <b className="font-mono text-slate-700">{rule.CD_REGRA}</b></span>
                                        <span className="text-slate-300">•</span>
                                        <span>Versão: <b className="font-mono text-slate-700">v{rule.VL_VERSAO}</b></span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                          "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider",
                                          badge.color
                                        )}>
                                          {badge.label}
                                        </span>
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                          rule.ATIVA === 1 || rule.ATIVA === 'S'
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                        )}>
                                          {rule.ATIVA === 1 || rule.ATIVA === 'S' ? 'Ativa' : 'Inativa'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Card Body */}
                                  <div className="p-3.5 space-y-3">
                                    {/* Gatilho / Condição */}
                                    {rule.CONDICAO ? (
                                      <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 text-xs text-amber-950">
                                        <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] shrink-0 mt-0.5 flex items-center gap-1">
                                          <Zap size={12} className="text-amber-600" /> Quando:
                                        </span>
                                        <code className="font-mono text-amber-950 font-semibold break-all leading-relaxed">
                                          {rule.CONDICAO}
                                        </code>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-500">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                          <Zap size={11} /> Quando:
                                        </span>
                                        <span className="italic text-[11px] text-slate-400">
                                          Sem condição (execução contínua / disparo global)
                                        </span>
                                      </div>
                                    )}

                                    {/* Campos Afetados */}
                                    {fields.length > 0 && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                                            <SlidersHorizontal size={12} className="text-slate-400" /> Campos Afetados ({rule.QTD_CAMPOS || fields.length}):
                                          </span>
                                          {fields.length > 6 && (
                                            <button
                                              type="button"
                                              onClick={() => toggleFields(ruleKey)}
                                              className="text-sky-700 hover:underline font-semibold text-[11px] flex items-center gap-0.5"
                                            >
                                              {isFieldsExpanded ? (
                                                <>Recolher <ChevronUp size={12} /></>
                                              ) : (
                                                <>Ver todos ({fields.length}) <ChevronDown size={12} /></>
                                              )}
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(isFieldsExpanded ? fields : fields.slice(0, 6)).map((fieldName: string, fIdx: number) => (
                                            <span 
                                              key={fIdx}
                                              className="font-mono text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded-md"
                                            >
                                              {fieldName}
                                            </span>
                                          ))}
                                          {!isFieldsExpanded && fields.length > 6 && (
                                            <button
                                              type="button"
                                              onClick={() => toggleFields(ruleKey)}
                                              className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
                                            >
                                              +{fields.length - 6} mais
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Mensagem de Alerta (se houver) */}
                                    {rule.DS_ALERTA && (
                                      <div className="flex items-start gap-2 bg-rose-50 border border-rose-200/80 rounded-lg p-2.5 text-xs text-rose-900">
                                        <AlertTriangle size={14} className="shrink-0 text-rose-600 mt-0.5" />
                                        <div className="space-y-0.5">
                                          <span className="font-bold uppercase text-[10px] tracking-wide text-rose-700 block">
                                            Mensagem de Validação
                                          </span>
                                          <p className="text-rose-950 font-medium leading-relaxed">
                                            {rule.DS_ALERTA}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Script SQL / Execução */}
                                    {scriptText && (
                                      <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                            <Code2 size={12} className="text-slate-400" /> Ação / Script SQL
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => copyToClipboard(scriptText, ruleKey)}
                                              className="text-slate-500 hover:text-sky-700 flex items-center gap-1 text-[11px] font-medium transition-colors"
                                              title="Copiar Script"
                                            >
                                              {copiedId === ruleKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                              <span>Copiar SQL</span>
                                            </button>
                                            <button
                                              onClick={() => toggleScript(ruleKey)}
                                              className="text-sky-700 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
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
                                          "font-mono text-[10.5px] bg-slate-950 text-slate-100 p-2.5 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed transition-all",
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
                          <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <Search size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
                            <p className="text-xs font-semibold">Nenhuma regra encontrada com os filtros atuais</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        <Unlink size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Nenhuma regra cadastrada para este documento</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
