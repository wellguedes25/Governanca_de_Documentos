"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Trash2, Hash, Layers, Link as LinkIcon, Plus, BookOpen } from 'lucide-react';
import { DocMapping } from '@/lib/storage';
import toast from 'react-hot-toast';

interface MapeamentosTabProps {
  docMappings: DocMapping[];
  onSave: (mappings: DocMapping[]) => Promise<void>;
  onClose?: () => void;
}

export function MapeamentosTab({ docMappings, onSave }: MapeamentosTabProps) {
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
    } catch (e) {
      toast.error('Erro ao salvar mapeamentos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-background w-full rounded-[32px] shadow-none relative flex flex-col overflow-hidden animate-in fade-in duration-300 border border-border">
      <header className="px-8 py-6 border-b border-border flex items-center justify-between bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-none blur-3xl"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-card text-foreground rounded-none shadow-none shadow-slate-200">
            <SettingsIcon size={22} className="text-blue-400 group-hover:rotate-90 transition-transform duration-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Gerenciar Mapeamentos</h3>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5 italic">Configuração de Documentos e Campos Oracle</p>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8 -background">
        <div className="space-y-6">
          {localMappings.length === 0 && (
            <div className="border border-border rounded-[28px] p-12 text-center flex flex-col items-center justify-center">
              <BookOpen size={48} className="text-muted mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-foreground mb-2">Nenhum Documento Mapeado</h3>
              <p className="text-muted max-w-md text-sm">
                O Motor NLP precisa saber quais documentos ler. Clique em "Adicionar Novo Mapeamento" abaixo para conectar um documento do banco de dados ao motor.
              </p>
            </div>
          )}

          {localMappings.map((mapping, mIdx) => (
            <div key={mIdx} className="bg-background border -border rounded-[28px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative group/card transition-all hover:shadow-none hover:border-blue-200/50">
              <button
                onClick={() => {
                  if (confirm('Deseja remover este mapeamento de documento?')) {
                    setLocalMappings(localMappings.filter((_, i) => i !== mIdx));
                  }
                }}
                className="absolute top-4 right-4 p-2 text-muted hover:text-rose-500 hover:bg-red-500/10 rounded-none transition-all opacity-0 group-hover/card:opacity-100"
              >
                <Trash2 size={16} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted uppercase tracking-[0.15em] block ml-1">Código do Documento</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                      <Hash size={14} />
                    </div>
                    <input
                      type="text"
                      className="w-full bg-card border border-border rounded-none pl-10 pr-4 py-2.5 text-sm font-bold text-foreground -background focus:border-blue-500 transition-all outline-none"
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
                  <label className="text-[10px] font-black text-muted uppercase tracking-[0.15em] block ml-1">Nome Amigável</label>
                  <input
                    type="text"
                    className="w-full bg-card border border-border rounded-none px-4 py-2.5 text-sm font-bold text-foreground -background focus:border-blue-500 transition-all outline-none"
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
                  <label className="text-[10px] font-black text-muted uppercase tracking-[0.15em] flex items-center gap-2">
                    <Layers size={14} className="text-blue-500" /> Campos Vinculados
                  </label>
                  <span className="text-[9px] font-bold text-muted -background px-2 py-0.5 rounded-none">{mapping.fields.length} itens</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {mapping.fields.map((field, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 bg-blue-50/50 border border-blue-100 pl-3 pr-2 py-1.5 rounded-none group/tag hover:bg-blue-600 hover:border-blue-600 transition-all duration-300">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[11px] font-black text-blue-700 group-hover/-foreground transition-colors">{field.name}</span>
                        <span className="text-[8px] font-mono text-blue-400 uppercase group-hover/tag:text-blue-100 transition-colors">{field.id}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newList = [...localMappings];
                          newList[mIdx].fields = mapping.fields.filter((_, i) => i !== fIdx);
                          setLocalMappings(newList);
                        }}
                        className="p-1 text-blue-300 -foreground -background rounded-none transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-card rounded-none p-5 border -border relative overflow-hidden group/link">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-none -mr-8 -mt-8 transition-all group-hover/link:bg-blue-500/10"></div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_auto] gap-4 relative z-10 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest block ml-1">ID Técnico (Oracle)</label>
                      <input
                        id={`new-field-id-${mIdx}`}
                        type="text"
                        placeholder="EX: EVOLUCAO"
                        className="w-full bg-background border border-border px-4 py-2 rounded-none text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted uppercase tracking-widest block ml-1">Descrição Amigável</label>
                      <input
                        id={`new-field-name-${mIdx}`}
                        type="text"
                        placeholder="EX: Evolução Médica"
                        className="w-full bg-background border border-border px-4 py-2 rounded-none text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-none"
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
                      className="bg-card text-foreground px-5 py-2.5 rounded-none text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:shadow-none hover:shadow-blue-200 transition-all flex items-center gap-2 h-[38px]"
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
            className="w-full py-6 border-2 border-dashed border-border rounded-[28px] text-muted hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-3 group/add"
          >
            <div className="p-3 bg-card -muted rounded-none group-hover/add:bg-blue-100 group-hover/add:text-blue-600 transition-all">
              <Plus size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Adicionar Novo Mapeamento</span>
          </button>
        </div>
      </div>

      <footer className="px-8 py-6 bg-background border-t border-border flex items-center justify-end gap-4 shadow-[0_-4px_20px_rgb(0,0,0,0.02)]">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-foreground rounded-none font-black uppercase tracking-widest text-[10px] transition-all shadow-none shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </footer>
    </div>
  );
}
