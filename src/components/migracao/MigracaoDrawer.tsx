"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Save, Trash2, CheckSquare, Square,
  User, ShieldCheck, Tag, GitBranch, Layers, Clock, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DocumentoMigracao,
  DocumentoFlexItem,
  ChecklistItem,
  StatusMigracao,
  ComplexidadeMigracao
} from '@/types/migracao.types';
import { useUI } from '@/context/UIContext';
import toast from 'react-hot-toast';

interface MigracaoDrawerProps {
  open: boolean;
  onClose: () => void;
  migracao: DocumentoMigracao | null;
  docsFlexTotal: DocumentoFlexItem[];
  docsHtml5Total: DocumentoFlexItem[];
  onSave: (demandData: Partial<DocumentoMigracao>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialFlexDoc?: DocumentoFlexItem | null;
  initialStatus?: StatusMigracao | null;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Mapeamento e paridade de campos realizado', concluido: false },
  { id: '2', label: 'Consultas SQL de alimentação adaptadas e testadas', concluido: false },
  { id: '3', label: 'Consumidores analíticos de BI verificados e sem quebras', concluido: false },
  { id: '4', label: 'Configuração de perfil e permissões no MV', concluido: false },
  { id: '5', label: 'Homologação clínica com equipe assistencial aprovada', concluido: false },
  { id: '6', label: 'Publicação oficial no catálogo e Go-Live', concluido: false },
];

export function MigracaoDrawer({
  open,
  onClose,
  migracao,
  docsFlexTotal,
  docsHtml5Total,
  onSave,
  onDelete,
  initialFlexDoc,
  initialStatus
}: MigracaoDrawerProps) {
  const { confirmAction } = useUI();

  // Seção 1: Dados da Demanda
  const [flexId, setFlexId] = useState<string>('');
  const [flexSearch, setFlexSearch] = useState<string>('');
  const [html5Id, setHtml5Id] = useState<string>('');
  const [status, setStatus] = useState<StatusMigracao>('PENDENTES');
  const [complexidade, setComplexidade] = useState<ComplexidadeMigracao>('MEDIA');
  const [tipoDocumento, setTipoDocumento] = useState<string>('');

  const sortedAndFilteredFlex = useMemo(() => {
    return [...docsFlexTotal]
      .sort((a, b) => Number(a.cd_documento_mv) - Number(b.cd_documento_mv))
      .filter(d => {
        if (!flexSearch.trim()) return true;
        const term = flexSearch.toLowerCase().trim();
        return (
          String(d.cd_documento_mv).includes(term) ||
          d.nome.toLowerCase().includes(term)
        );
      });
  }, [docsFlexTotal, flexSearch]);

  // Seção 2: Responsáveis
  const [lecom, setLecom] = useState<string>('');
  const [responsavelDev, setResponsavelDev] = useState<string>('');
  const [responsavelPerfil, setResponsavelPerfil] = useState<string>('');

  // Seção 3: Dados Documento Destino V3
  const [codigoObjeto, setCodigoObjeto] = useState<string>('');
  const [html5Search, setHtml5Search] = useState<string>('');

  const sortedAndFilteredHtml5 = useMemo(() => {
    return [...docsHtml5Total]
      .sort((a, b) => Number(a.cd_documento_mv) - Number(b.cd_documento_mv))
      .filter(d => {
        if (!html5Search.trim()) return true;
        const term = html5Search.toLowerCase().trim();
        return (
          String(d.cd_documento_mv).includes(term) ||
          d.nome.toLowerCase().includes(term)
        );
      });
  }, [docsHtml5Total, html5Search]);

  // Seção 4: Regras e Relacionamentos Flex
  const [regrasNegocio, setRegrasNegocio] = useState<string>('');
  const [camposRelacionados, setCamposRelacionados] = useState<string>('');

  // Seção 5: Cronograma
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataPrevisao, setDataPrevisao] = useState<string>('');
  const [dataEfetiva, setDataEfetiva] = useState<string>('');

  // Seção 6: Observações e Checklist
  const [observacoes, setObservacoes] = useState<string>('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (migracao) {
      setFlexId(String(migracao.documento_flex_id || ''));
      setHtml5Id(String(migracao.documento_html5_id || ''));
      setStatus(migracao.status || 'PENDENTES');
      setComplexidade(migracao.complexidade || 'MEDIA');
      setTipoDocumento(migracao.tipo_documento || '');
      setLecom(migracao.lecom || '');
      setResponsavelDev(migracao.responsavel_dev || migracao.responsavel || '');
      setResponsavelPerfil(migracao.responsavel_perfil || '');
      setCodigoObjeto(migracao.codigo_objeto || '');
      setRegrasNegocio(migracao.regras_negocio || '');
      setCamposRelacionados(migracao.campos_relacionados || '');
      setDataInicio(migracao.data_inicio ? migracao.data_inicio.slice(0, 10) : '');
      setDataPrevisao(migracao.data_conclusao_prevista ? migracao.data_conclusao_prevista.slice(0, 10) : '');
      setDataEfetiva(migracao.data_conclusao_efetiva ? migracao.data_conclusao_efetiva.slice(0, 10) : '');
      setObservacoes(migracao.observacoes || '');
      setChecklist(migracao.checklist && migracao.checklist.length > 0 ? migracao.checklist : DEFAULT_CHECKLIST);
      setHtml5Search('');
      setFlexSearch('');
    } else {
      setFlexId(initialFlexDoc ? String(initialFlexDoc.cd_documento_mv) : (docsFlexTotal[0] ? String(docsFlexTotal[0].cd_documento_mv) : ''));
      setHtml5Id('');
      setHtml5Search('');
      setFlexSearch('');
      setStatus(initialStatus || 'PENDENTES');
      setComplexidade('MEDIA');
      setTipoDocumento(initialFlexDoc?.nome || '');
      setLecom('');
      setResponsavelDev('');
      setResponsavelPerfil('');
      setCodigoObjeto('');
      setRegrasNegocio('');
      setCamposRelacionados('');
      setDataInicio(new Date().toISOString().slice(0, 10));
      setDataPrevisao('');
      setDataEfetiva('');
      setObservacoes('');
      setChecklist(DEFAULT_CHECKLIST);
    }
  }, [migracao, initialFlexDoc, initialStatus, docsFlexTotal]);

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, concluido: !c.concluido } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flexId) {
      toast.error('Selecione o documento Flex de origem');
      return;
    }

    setSaving(true);
    try {
      const selectedFlex = docsFlexTotal.find(d => String(d.cd_documento_mv) === String(flexId));
      const selectedHtml5 = docsHtml5Total.find(d => String(d.cd_documento_mv) === String(html5Id));

      await onSave({
        id: migracao?.id,
        documento_flex_id: flexId,
        documento_html5_id: html5Id || null,
        status,
        complexidade,
        tipo_documento: tipoDocumento || selectedFlex?.nome,
        lecom,
        responsavel_dev: responsavelDev,
        responsavel_perfil: responsavelPerfil,
        codigo_objeto: codigoObjeto,
        regras_negocio: regrasNegocio,
        campos_relacionados: camposRelacionados,
        data_inicio: dataInicio || null,
        data_conclusao_prevista: dataPrevisao || null,
        data_conclusao_efetiva: dataEfetiva || null,
        observacoes,
        checklist,
        documento_flex: selectedFlex || null,
        documento_html5: selectedHtml5 || null,
      });

      toast.success(migracao ? 'Demanda atualizada com sucesso!' : 'Nova demanda criada com sucesso!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar demanda.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!migracao?.id || !onDelete) return;
    const confirmed = await confirmAction({
      title: 'Excluir Demanda de Migração',
      description: 'Tem certeza que deseja excluir esta demanda de migração do quadro?',
      confirmLabel: 'Excluir Demanda',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await onDelete(migracao.id);
        toast.success('Demanda excluída com sucesso!');
        onClose();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir demanda.');
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 overflow-hidden">
      {/* Backdrop Frosted */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md sylva-fade-in"
        onClick={onClose}
      />

      {/* Modal Central Amplo Sylva */}
      <div className="relative w-full max-w-4xl max-h-[92vh] sylva-dock rounded-[26px] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <header className="px-6 py-4.5 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--card-subtle)]/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                  {migracao ? 'Detalhe da Demanda de Migração' : 'Nova Demanda de Migração'}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)] rounded-full"
                >
                  PEP MV
                </Badge>
              </div>
              <p className="text-xs text-[var(--muted)] font-medium truncate mt-0.5">
                {tipoDocumento || 'Transição V2 Flex ➔ V3 Editor'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer shrink-0"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        {/* Form Body com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs scrollbar-thin">
          {/* 1. PARIDADE DE DOCUMENTOS (BENTO 2 COLUNAS: V2 ORIGEM vs V3 DESTINO) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
              <GitBranch size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
              <span>Pareamento de Documentos (V2 Flex ➔ V3 Editor)</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card Origem V2 Flex */}
              <div className="sylva-glass rounded-2xl p-4 border border-[var(--border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[var(--foreground)]">
                    Documento Flex Origem (V2) *
                  </Label>
                  {docsFlexTotal.length > 0 && (
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {sortedAndFilteredFlex.length} de {docsFlexTotal.length} docs
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar por código (ex: 1914) ou nome..."
                    value={flexSearch}
                    onChange={(e) => setFlexSearch(e.target.value)}
                    className="w-full h-8.5 pl-8 pr-3 rounded-full border border-[var(--border)] bg-[var(--card-solid)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] transition-all"
                  />
                </div>

                <select
                  value={flexId}
                  onChange={(e) => {
                    setFlexId(e.target.value);
                    const selected = docsFlexTotal.find(d => String(d.cd_documento_mv) === e.target.value);
                    if (selected && !tipoDocumento) setTipoDocumento(selected.nome);
                  }}
                  required
                  className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--card-solid)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] font-mono"
                >
                  <option value="" className="font-sans">Selecione o modelo Flex...</option>
                  {sortedAndFilteredFlex.map(d => (
                    <option key={d.id || d.cd_documento_mv} value={d.cd_documento_mv}>
                      [{d.cd_documento_mv}] {d.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Card Destino V3 HTML5 */}
              <div className="sylva-glass rounded-2xl p-4 border border-[var(--border)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[var(--foreground)]">
                    Documento Destino HTML5 (V3)
                  </Label>
                  {docsHtml5Total.length > 0 && (
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {sortedAndFilteredHtml5.length} de {docsHtml5Total.length} docs
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar por código (ex: 622) ou nome..."
                    value={html5Search}
                    onChange={(e) => setHtml5Search(e.target.value)}
                    className="w-full h-8.5 pl-8 pr-3 rounded-full border border-[var(--border)] bg-[var(--card-solid)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={html5Id}
                    onChange={(e) => setHtml5Id(e.target.value)}
                    className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--card-solid)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] font-mono"
                  >
                    <option value="" className="font-sans">Ainda não pareado / Em desenvolvimento</option>
                    {sortedAndFilteredHtml5.map(d => (
                      <option key={d.id || d.cd_documento_mv} value={d.cd_documento_mv}>
                        [{d.cd_documento_mv}] {d.nome}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={codigoObjeto}
                    onChange={(e) => setCodigoObjeto(e.target.value.slice(0, 4))}
                    maxLength={4}
                    placeholder="Obj: 646"
                    title="Cód. Objeto Perfil (Máx. 4 dígitos)"
                    className="w-24 h-9 px-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-solid)] text-xs font-mono text-center tracking-wider uppercase text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. CLASSIFICAÇÃO & RESPONSÁVEIS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Dados da Demanda */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                <Tag size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                <span>Dados da Demanda</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="block text-[11px] text-[var(--foreground-secondary)]">Status / Etapa *</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusMigracao)}
                    className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--card-solid)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)] font-semibold"
                  >
                    <option value="PENDENTES">Pendentes</option>
                    <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                    <option value="HOMOLOGACAO">Homologação</option>
                    <option value="CONFIGURACAO_PERFIL">Perfil</option>
                    <option value="AGENDADO">Agendado</option>
                    <option value="EM_PRODUCAO">Produção</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="block text-[11px] text-[var(--foreground-secondary)]">Esforço / Complexidade</Label>
                  <select
                    value={complexidade}
                    onChange={(e) => setComplexidade(e.target.value as ComplexidadeMigracao)}
                    className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--card-solid)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="block text-[11px] text-[var(--foreground-secondary)]">Tipo de Documento / Categoria</Label>
                <Input
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  placeholder="Ex: Anamnese, Evolução, Checklist, Termo de Consentimento..."
                />
              </div>
            </div>

            {/* Responsáveis */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                <User size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                <span>Responsáveis & Chamado</span>
              </div>

              <div className="space-y-1">
                <Label className="block text-[11px] text-[var(--foreground-secondary)]">LECOM (Ticket)</Label>
                <Input
                  value={lecom}
                  onChange={(e) => setLecom(e.target.value)}
                  placeholder="Ex: 1.042.964"
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="block text-[11px] text-[var(--foreground-secondary)]">Responsável Dev</Label>
                  <Input
                    value={responsavelDev}
                    onChange={(e) => setResponsavelDev(e.target.value)}
                    placeholder="Ex: Cleiton - Noxtec"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="block text-[11px] text-[var(--foreground-secondary)]">Responsável Perfil</Label>
                  <Input
                    value={responsavelPerfil}
                    onChange={(e) => setResponsavelPerfil(e.target.value)}
                    placeholder="Ex: Juliana Lopes"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. REGRAS, RELACIONAMENTOS E CRONOGRAMA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
              <ShieldCheck size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
              <span>Regras, Relacionamentos Flex & Cronograma</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="block text-[11px] text-[var(--foreground-secondary)]">Regras e Relacionamentos</Label>
                <Textarea
                  value={regrasNegocio}
                  onChange={(e) => setRegrasNegocio(e.target.value)}
                  placeholder="Ex: 868 - AVALIACAO MEDICA INICIAL | 916 - EVOLUCAO MEDICA"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="block text-[11px] text-[var(--foreground-secondary)]">Campos Relacionados</Label>
                <Textarea
                  value={camposRelacionados}
                  onChange={(e) => setCamposRelacionados(e.target.value)}
                  placeholder="Ex: 1142527 - resumo clinico para alta [DOCUMENTOS: 868, 916]..."
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-[var(--foreground-secondary)]">
                  <Clock size={11} /> Data Início
                </Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-[var(--foreground-secondary)]">
                  <Clock size={11} /> Limite Desenvolvimento
                </Label>
                <Input
                  type="date"
                  value={dataPrevisao}
                  onChange={(e) => setDataPrevisao(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[11px] text-[var(--foreground-secondary)]">
                  <Clock size={11} /> Entrada em Produção
                </Label>
                <Input
                  type="date"
                  value={dataEfetiva}
                  onChange={(e) => setDataEfetiva(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. CHECKLIST DE HOMOLOGAÇÃO (GRID 2 COLUNAS) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
              <CheckSquare size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
              <span>Checklist de Homologação Assistencial</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                    item.concluido
                      ? "bg-[var(--accent)] border-[var(--tint-olive-border)]"
                      : "bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] border-[var(--border)]"
                  )}
                >
                  {item.concluido ? (
                    <CheckSquare size={15} className="text-[var(--lime-dark)] dark:text-[var(--lime)] shrink-0" />
                  ) : (
                    <Square size={15} className="text-[var(--muted)] shrink-0" />
                  )}
                  <span className={cn(
                    "text-xs transition-colors leading-snug",
                    item.concluido ? "text-[var(--foreground)] font-semibold" : "text-[var(--foreground-secondary)]"
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. OBSERVAÇÕES */}
          <div className="space-y-1.5">
            <Label className="block text-[11px] text-[var(--foreground-secondary)]">Observações e Objetivo</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Objetivo assistencial, notas para a equipe ou detalhes do projeto..."
              rows={2}
            />
          </div>
        </form>

        {/* Footer Fixo de Ações */}
        <footer className="px-6 py-4 border-t border-[var(--border)] bg-[var(--card-subtle)]/50 flex items-center justify-between gap-3">
          {migracao ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-full tone-danger border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:brightness-110 transition-all"
            >
              <Trash2 size={13} />
              <span>Excluir</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 rounded-full bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 text-xs font-bold shadow-[0_4px_14px_rgba(204,243,82,0.25)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              <Save size={13} />
              <span>{saving ? 'Salvando...' : 'Salvar Demanda'}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
