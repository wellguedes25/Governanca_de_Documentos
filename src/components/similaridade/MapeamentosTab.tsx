"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Trash2, Hash, Layers, Link as LinkIcon, Plus, BookOpen, X } from 'lucide-react';
import { DocMapping } from '@/lib/storage';
import { useUI } from '@/context/UIContext';
import toast from 'react-hot-toast';

interface MapeamentosTabProps {
  docMappings: DocMapping[];
  onSave: (mappings: DocMapping[]) => Promise<void>;
  onClose?: () => void;
}

export function MapeamentosTab({ docMappings, onSave }: MapeamentosTabProps) {
  const { confirmAction } = useUI();
  const [localMappings, setLocalMappings] = useState<DocMapping[]>(docMappings || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (docMappings) {
      setLocalMappings(docMappings);
    }
  }, [docMappings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localMappings);
      toast.success('Mapeamentos salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar mapeamentos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sylva-card w-full rounded-2xl relative flex flex-col overflow-hidden animate-in fade-in duration-300 border border-[var(--border-subtle)] bg-[var(--card-bg)]/80 backdrop-blur-md">
      <header className="px-6 py-4.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--dock-bg)] relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-2.5 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 rounded-xl">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">Gerenciar Mapeamentos</h3>
            <p className="text-xs text-[var(--muted)] font-normal">Configuração de Documentos e Identificadores Clínicos Oracle</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 bg-[var(--canvas-bg)]/40">
        <div className="space-y-6">
          {localMappings.length === 0 && (
            <div className="bg-[var(--card-bg)]/60 border border-dashed border-[var(--border-subtle)] rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <BookOpen size={44} className="text-[var(--lime-dark)] dark:text-[var(--lime)] opacity-60 mb-4" />
              <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">Nenhum Documento Mapeado</h3>
              <p className="text-[var(--foreground-secondary)] max-w-md text-xs leading-relaxed">
                O Motor NLP precisa saber quais documentos ler. Clique em &quot;Adicionar Novo Mapeamento&quot; abaixo para conectar um documento do banco de dados ao motor.
              </p>
            </div>
          )}

          {localMappings.map((mapping, mIdx) => (
            <div key={mIdx} className="sylva-glass bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-xs relative group/card transition-all hover:border-[var(--lime-dark)]/40 dark:hover:border-[var(--lime)]/40">
              <button
                onClick={async () => {
                  const confirmed = await confirmAction({
                    title: 'Remover Mapeamento NLP',
                    description: 'Deseja remover este mapeamento de documento e seus campos vinculados?',
                    confirmLabel: 'Remover',
                    cancelLabel: 'Cancelar',
                    variant: 'danger',
                  });
                  if (confirmed) {
                    setLocalMappings(localMappings.filter((_, i) => i !== mIdx));
                  }
                }}
                className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover/card:opacity-100 cursor-pointer"
                title="Remover Documento"
              >
                <Trash2 size={16} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block ml-1">Código do Documento</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--muted)]">
                      <Hash size={14} />
                    </div>
                    <input
                      type="text"
                      className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-[var(--foreground)] focus:border-[var(--lime)] transition-all outline-none"
                      value={mapping.id}
                      onChange={(e) => {
                        const newList = [...localMappings];
                        newList[mIdx].id = e.target.value;
                        setLocalMappings(newList);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block ml-1">Nome Amigável</label>
                  <input
                    type="text"
                    className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl px-4 py-2 text-xs font-semibold text-[var(--foreground)] focus:border-[var(--lime)] transition-all outline-none"
                    value={mapping.name}
                    onChange={(e) => {
                      const newList = [...localMappings];
                      newList[mIdx].name = e.target.value;
                      setLocalMappings(newList);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-2">
                    <Layers size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> Campos Vinculados
                  </label>
                  <span className="text-[11px] font-semibold text-[var(--foreground)] bg-[var(--dock-bg)] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
                    {mapping.fields.length} {mapping.fields.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {mapping.fields.map((field, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 bg-[var(--canvas-bg)] border border-[var(--border-subtle)] pl-3 pr-2 py-1.5 rounded-xl group/tag hover:border-[var(--lime)] transition-all duration-200">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[11px] font-bold text-[var(--foreground)] group-hover/tag:text-[var(--lime-dark)] dark:group-hover/tag:text-[var(--lime)] transition-colors">{field.name}</span>
                        <span className="text-[9px] font-mono text-[var(--muted)] uppercase transition-colors">{field.id}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newList = [...localMappings];
                          newList[mIdx].fields = mapping.fields.filter((_, i) => i !== fIdx);
                          setLocalMappings(newList);
                        }}
                        className="p-1 text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                        title="Remover campo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-[var(--dock-bg)] rounded-xl p-4 border border-[var(--border-subtle)] relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_auto] gap-4 relative z-10 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block ml-1">ID Técnico (Oracle)</label>
                      <input
                        id={`new-field-id-${mIdx}`}
                        type="text"
                        placeholder="EX: EVOLUCAO"
                        className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lime)] transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] block ml-1">Descrição Amigável</label>
                      <input
                        id={`new-field-name-${mIdx}`}
                        type="text"
                        placeholder="EX: Evolução Médica"
                        className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lime)] transition-all"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const idInput = document.getElementById(`new-field-id-${mIdx}`) as HTMLInputElement;
                        const nameInput = document.getElementById(`new-field-name-${mIdx}`) as HTMLInputElement;
                        const id = idInput.value.trim().toUpperCase();
                        const name = nameInput.value.trim();

                        if (id && name) {
                          const newList = [...localMappings];
                          newList[mIdx].fields.push({ id, name });
                          setLocalMappings(newList);
                          idInput.value = '';
                          nameInput.value = '';
                          toast.success('Campo vinculado com sucesso!');
                        } else {
                          toast.error('Preencha o ID Técnico e a Descrição.');
                        }
                      }}
                      className="bg-[var(--lime)] text-[var(--lime-ink)] font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 h-[38px] cursor-pointer hover:brightness-105 shadow-xs"
                    >
                      <LinkIcon size={14} /> Vincular Campo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button 
            onClick={() => {
              const newList = [...localMappings];
              newList.push({ id: '', name: 'Novo Documento', fields: [] });
              setLocalMappings(newList);
            }}
            className="w-full py-6 border-2 border-dashed border-[var(--border-subtle)] bg-[var(--card-bg)]/40 hover:bg-[var(--card-bg)] rounded-2xl text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:border-[var(--lime-dark)] dark:hover:border-[var(--lime)] transition-all flex flex-col items-center justify-center gap-2.5 group/add cursor-pointer"
          >
            <div className="p-3 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] rounded-xl group-hover/add:scale-110 transition-transform">
              <Plus size={22} />
            </div>
            <span className="text-xs font-bold">Adicionar Novo Mapeamento</span>
          </button>
        </div>
      </div>

      <footer className="px-6 py-4 bg-[var(--dock-bg)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-[var(--lime)] text-[var(--lime-ink)] font-bold rounded-xl text-xs transition-all shadow-[0_4px_14px_rgba(204,243,82,0.25)] hover:brightness-105 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </footer>
    </div>
  );
}
