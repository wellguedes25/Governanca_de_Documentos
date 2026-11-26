"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RotateCcw, Copy, Check, Code2, Loader2, Tag } from 'lucide-react';
import { AIQueryAssistant } from '@/components/AIQueryAssistant';
import { cn } from '@/lib/utils';

export interface SqlMacroHint {
  token: string;
  label: string;
  description: string;
}

export const SQL_MACRO_HINTS: SqlMacroHint[] = [
  {
    token: '/* DYNAMIC_PERIOD_DAYS */',
    label: 'Período Selecionado (dias)',
    description: 'Substituído automaticamente por 30, 60, 90, 180 ou 365 conforme filtro na UI.',
  },
  {
    token: '/* DYNAMIC_HOSPITALS_IN */',
    label: 'Empresas Ativas (IN)',
    description: 'Lista de IDs das unidades hospitalares ativas em Instituições.',
  },
  {
    token: '/* DYNAMIC_HOSPITALS_PIVOT */',
    label: 'Colunas Pivot (Empresas)',
    description: 'Gera dinamicamente as colunas de contagem por unidade ativa.',
  },
  {
    token: '/* DYNAMIC_HOSPITALS_DECODE */',
    label: 'Sigla Empresa (DECODE)',
    description: 'Mapeia CD_MULTI_EMPRESA para a sigla configurada.',
  },
];

export interface SqlQueryEditorTarget {
  id: string;
  title: string;
  defaultTitle?: string;
  description: string;
  moduleLabel: string;
  engine: 'V3' | 'V2';
  sql: string;
  defaultSql: string;
  requiredBinds?: string[];
  supportsTitleEdit?: boolean;
  customTitle?: string;
  aiContext: string;
}

interface SqlQueryEditorModalProps {
  open: boolean;
  target: SqlQueryEditorTarget | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: { sql: string; customTitle?: string }) => Promise<void> | void;
}

export function SqlQueryEditorModal({
  open,
  target,
  saving = false,
  onClose,
  onSave,
}: SqlQueryEditorModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, onClose]);

  if (!open || !target) return null;

  return (
    <SqlQueryEditorModalContent
      key={`${target.id}_${target.sql.length}`}
      target={target}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function SqlQueryEditorModalContent({
  target,
  saving,
  onClose,
  onSave,
}: {
  target: SqlQueryEditorTarget;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { sql: string; customTitle?: string }) => Promise<void> | void;
}) {
  const [draftSql, setDraftSql] = useState(target.sql || '');
  const [draftTitle, setDraftTitle] = useState(target.customTitle || '');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isModifiedFromDefault = draftSql.trim() !== (target.defaultSql || '').trim();
  const isDirty =
    draftSql !== (target.sql || '') ||
    (target.supportsTitleEdit ? draftTitle !== (target.customTitle || '') : false);
  const lineCount = draftSql ? draftSql.split('\n').length : 0;

  const insertTokenAtCursor = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setDraftSql((prev) => (prev ? `${prev} ${token}` : token));
      return;
    }
    const start = el.selectionStart ?? draftSql.length;
    const end = el.selectionEnd ?? draftSql.length;
    const next = `${draftSql.slice(0, start)}${token}${draftSql.slice(end)}`;
    setDraftSql(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  const handleRestoreDefault = () => {
    setDraftSql(target.defaultSql || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      sql: draftSql,
      customTitle: target.supportsTitleEdit ? draftTitle : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md sylva-fade-in"
        onClick={() => {
          if (!saving) onClose();
        }}
      />

      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-editor-modal-title"
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col sylva-dock rounded-[26px] border border-[var(--border)] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--card-subtle)]">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] flex items-center justify-center shrink-0">
              <Code2 size={18} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
                  Motor {target.engine}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--card-bg)] text-[var(--foreground-secondary)] border border-[var(--border)]">
                  {target.moduleLabel}
                </span>
                {isModifiedFromDefault ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tone-warning border">
                    Customizada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tone-success border">
                    Padrão do Sistema
                  </span>
                )}
              </div>
              <h2
                id="sql-editor-modal-title"
                className="text-lg font-bold text-[var(--foreground)] tracking-tight truncate"
              >
                {target.title}
              </h2>
              <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                {target.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="w-9 h-9 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] shrink-0 cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {target.supportsTitleEdit && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border-subtle)]">
              <label
                htmlFor="sql-card-title-input"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] shrink-0"
              >
                <Tag size={12} className="text-[var(--accent-ink)]" />
                Título Exibido no Card:
              </label>
              <input
                id="sql-card-title-input"
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={target.defaultTitle || target.title}
                className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Macro & Bind Pills */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                Macros e Variáveis (clique para inserir no cursor)
              </span>
              <span className="text-[11px] font-mono text-[var(--muted)] tabular-nums">
                {lineCount} {lineCount === 1 ? 'linha' : 'linhas'} • {draftSql.length} caracteres
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {SQL_MACRO_HINTS.map((macro) => (
                <button
                  key={macro.token}
                  type="button"
                  onClick={() => insertTokenAtCursor(macro.token)}
                  title={`${macro.label}: ${macro.description}`}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer"
                >
                  {macro.token}
                </button>
              ))}

              {target.requiredBinds?.map((bind) => (
                <button
                  key={bind}
                  type="button"
                  onClick={() => insertTokenAtCursor(bind)}
                  title={`Inserir bind obrigatório ${bind}`}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tone-info border hover:brightness-110 transition-all cursor-pointer"
                >
                  {bind}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={draftSql}
              onChange={(e) => setDraftSql(e.target.value)}
              spellCheck={false}
              rows={15}
              placeholder="SELECT ..."
              className="w-full min-h-[320px] bg-[var(--card-bg)] border border-[var(--border)] focus:border-[var(--lime)] rounded-2xl p-4 pr-12 text-xs font-mono leading-relaxed text-[var(--foreground)] focus:outline-none transition-colors resize-y shadow-inner"
            />
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar SQL"
              className="absolute top-3 right-3 w-8 h-8 rounded-xl sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
            >
              {copied ? <Check size={14} className="text-[var(--lime)]" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--card-subtle)]">
          <div className="flex flex-wrap items-center gap-2">
            <AIQueryAssistant
              currentQuery={draftSql}
              onApply={setDraftSql}
              context={target.aiContext}
            />

            <button
              type="button"
              disabled={!isModifiedFromDefault || saving}
              onClick={handleRestoreDefault}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer',
                isModifiedFromDefault
                  ? 'sylva-pill text-[var(--foreground)] hover:border-[var(--border-strong)]'
                  : 'opacity-45 pointer-events-none bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--muted)]'
              )}
              title="Substitui o rascunho atual pela query padrão padronizada do sistema"
            >
              <RotateCcw size={12} />
              <span>Restaurar Padrão</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || !draftSql.trim()}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2 rounded-full sylva-lime-btn text-xs font-bold cursor-pointer disabled:opacity-50',
                !isDirty && 'opacity-90'
              )}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Salvando...' : 'Salvar Consulta'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
