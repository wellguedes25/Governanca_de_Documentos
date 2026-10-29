"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Save, Trash2, CheckSquare, Square, Plus, 
  Calendar, User, ShieldCheck, Tag, GitBranch, Layers, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  // Seção 1: Dados da Demanda
  const [flexId, setFlexId] = useState<string>('');
  const [html5Id, setHtml5Id] = useState<string>('');
  const [status, setStatus] = useState<StatusMigracao>('PENDENTES');
  const [complexidade, setComplexidade] = useState<ComplexidadeMigracao>('MEDIA');
  const [tipoDocumento, setTipoDocumento] = useState<string>('');

  // Seção 2: Responsáveis
  const [lecom, setLecom] = useState<string>('');
  const [responsavelDev, setResponsavelDev] = useState<string>('');
  const [responsavelPerfil, setResponsavelPerfil] = useState<string>('');

  // Seção 3: Dados Documento
  const [codigoObjeto, setCodigoObjeto] = useState<string>('');

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
    } else {
      // Nova Demanda
      setFlexId(initialFlexDoc ? String(initialFlexDoc.cd_documento_mv) : (docsFlexTotal[0] ? String(docsFlexTotal[0].cd_documento_mv) : ''));
      setHtml5Id('');
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
    if (confirm('Tem certeza que deseja excluir esta demanda de migração?')) {
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer deslizante da direita */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header da Gaveta */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#004953] border border-teal-100 flex items-center justify-center shrink-0 shadow-2xs">
                <Layers size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {migracao ? 'Detalhe da Demanda de Migração' : 'Nova Demanda de Migração'}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-bold border-teal-200 bg-teal-50 text-[#004953] rounded-full">
                    PEP MV
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate max-w-md mt-0.5">
                  {tipoDocumento || 'Transição V2 Flex ➔ V3 Editor'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form com Scroll */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs scrollbar-thin">
            
            {/* 1. DADOS DA DEMANDA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Tag size={14} className="text-[#004953]" />
                <span>Dados da Demanda</span>
              </div>

              <div>
                <Label className="mb-1 block">Documento Flex Origem (V2) *</Label>
                <select
                  value={flexId}
                  onChange={(e) => {
                    setFlexId(e.target.value);
                    const selected = docsFlexTotal.find(d => String(d.cd_documento_mv) === e.target.value);
                    if (selected && !tipoDocumento) setTipoDocumento(selected.nome);
                  }}
                  required
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#004953] shadow-2xs"
                >
                  <option value="">Selecione o modelo Flex...</option>
                  {docsFlexTotal.map(d => (
                    <option key={d.id || d.cd_documento_mv} value={d.cd_documento_mv}>
                      [{d.cd_documento_mv}] {d.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Status / Etapa *</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusMigracao)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#004953] shadow-2xs font-semibold"
                  >
                    <option value="PENDENTES">Pendentes</option>
                    <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                    <option value="HOMOLOGACAO">Homologação</option>
                    <option value="CONFIGURACAO_PERFIL">Perfil</option>
                    <option value="AGENDADO">Agendado</option>
                    <option value="EM_PRODUCAO">Produção</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-1 block">Esforço / Complexidade</Label>
                  <select
                    value={complexidade}
                    onChange={(e) => setComplexidade(e.target.value as ComplexidadeMigracao)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#004953] shadow-2xs"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Tipo de Documento / Categoria</Label>
                <Input
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  placeholder="Ex: Anamnese, Evolução, Checklist, Termo de Consentimento..."
                />
              </div>
            </div>

            {/* 2. RESPONSÁVEIS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <User size={14} className="text-[#004953]" />
                <span>Responsáveis</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1 block">LECOM (Ticket)</Label>
                  <Input
                    value={lecom}
                    onChange={(e) => setLecom(e.target.value)}
                    placeholder="Ex: 1.042.964"
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label className="mb-1 block">Responsável Dev</Label>
                  <Input
                    value={responsavelDev}
                    onChange={(e) => setResponsavelDev(e.target.value)}
                    placeholder="Ex: Cleiton - Noxtec"
                  />
                </div>

                <div>
                  <Label className="mb-1 block">Responsável Perfil</Label>
                  <Input
                    value={responsavelPerfil}
                    onChange={(e) => setResponsavelPerfil(e.target.value)}
                    placeholder="Ex: Juliana Lopes"
                  />
                </div>
              </div>
            </div>

            {/* 3. DADOS DOCUMENTO (DE-PARA DESTINO) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <GitBranch size={14} className="text-[#004953]" />
                <span>Dados Documento (Destino V3)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block">Documento HTML5 / Editor 3 Pareado</Label>
                  <select
                    value={html5Id}
                    onChange={(e) => setHtml5Id(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#004953] shadow-2xs"
                  >
                    <option value="">Ainda não pareado / Em desenvolvimento</option>
                    {docsHtml5Total.map(d => (
                      <option key={d.id || d.cd_documento_mv} value={d.cd_documento_mv}>
                        [{d.cd_documento_mv}] {d.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="mb-1 block">Código Objeto Documento (MV)</Label>
                  <Input
                    value={codigoObjeto}
                    onChange={(e) => setCodigoObjeto(e.target.value)}
                    placeholder="Ex: 772, 733"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. REGRAS E RELACIONAMENTOS FLEX */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <ShieldCheck size={14} className="text-[#004953]" />
                <span>Regras e Relacionamentos Flex</span>
              </div>

              <div>
                <Label className="mb-1 block">Regras e Relacionamentos</Label>
                <Textarea
                  value={regrasNegocio}
                  onChange={(e) => setRegrasNegocio(e.target.value)}
                  placeholder="Ex: 868 - AVALIACAO MEDICA INICIAL | 916 - EVOLUCAO MEDICA"
                  rows={2}
                />
              </div>

              <div>
                <Label className="mb-1 block">Campos Relacionados</Label>
                <Textarea
                  value={camposRelacionados}
                  onChange={(e) => setCamposRelacionados(e.target.value)}
                  placeholder="Ex: 1142527 - resumo clinico para alta [DOCUMENTOS: 868, 916]..."
                  rows={2}
                />
              </div>
            </div>

            {/* 5. CRONOGRAMA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Clock size={14} className="text-[#004953]" />
                <span>Cronograma</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1 block">Data Início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label className="mb-1 block">Limite Desenvolvimento</Label>
                  <Input
                    type="date"
                    value={dataPrevisao}
                    onChange={(e) => setDataPrevisao(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label className="mb-1 block">Entrada em Produção</Label>
                  <Input
                    type="date"
                    value={dataEfetiva}
                    onChange={(e) => setDataEfetiva(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 6. CHECKLIST DE GOVERNANÇA ASSISTENCIAL */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <CheckSquare size={14} className="text-[#004953]" />
                <span>Checklist de Homologação</span>
              </div>

              <div className="space-y-2">
                {checklist.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all cursor-pointer select-none"
                  >
                    {item.concluido ? (
                      <CheckSquare size={15} className="text-[#004953]" />
                    ) : (
                      <Square size={15} className="text-slate-300" />
                    )}
                    <span className={cn(
                      "text-xs transition-colors",
                      item.concluido ? "text-slate-900 font-semibold" : "text-slate-500"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. OBSERVAÇÕES */}
            <div>
              <Label className="mb-1 block">Observações e Objetivo</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Objetivo assistencial, notas para a equipe ou detalhes do projeto..."
                rows={3}
              />
            </div>

          </form>

          {/* Footer Fixo de Ações */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            {migracao ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="h-9 px-3 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50 border-rose-200 cursor-pointer shadow-2xs gap-1.5"
              >
                <Trash2 size={13} />
                <span>Excluir</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-4 text-xs font-semibold rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={saving}
                className="h-9 px-5 text-xs font-semibold rounded-full bg-[#004953] hover:bg-[#003b44] text-white cursor-pointer shadow-2xs gap-1.5 transition-all"
              >
                <Save size={13} />
                <span>{saving ? 'Salvando...' : 'Salvar Demanda'}</span>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
