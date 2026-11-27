'use client';

import React, { useState } from 'react';
import { Check, Copy, Database, Info, X } from 'lucide-react';
import { buildSimilarityDdl, sanitizeAuditOwner } from '@/lib/similarity';

interface SimilarityDdlModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemaOwner?: string | null;
  docVersion?: string | null;
}

export function SimilarityDdlModal({
  isOpen,
  onClose,
  schemaOwner,
  docVersion,
}: SimilarityDdlModalProps) {
  const [copied, setCopied] = useState(false);
  const propEngine: 'V2' | 'V3' = docVersion === 'V2' ? 'V2' : 'V3';
  const [prevPropEngine, setPrevPropEngine] = useState<'V2' | 'V3'>(propEngine);
  const [selectedEngine, setSelectedEngine] = useState<'V2' | 'V3'>(propEngine);

  if (propEngine !== prevPropEngine) {
    setPrevPropEngine(propEngine);
    setSelectedEngine(propEngine);
  }

  if (!isOpen) return null;

  const normalizedOwner = sanitizeAuditOwner(schemaOwner);
  const engine = selectedEngine;
  const ddlScript = buildSimilarityDdl(normalizedOwner, engine);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ddlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy DDL script:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card-solid)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--accent)]">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Script DDL Oracle — Auditoria de Similaridade
                </h3>
                <span className="sylva-pill px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Schema: {normalizedOwner} • {engine === 'V3' ? 'Editor 3.0' : 'Editor 2.0'}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Cria a tabela de resultados, índices e a view analítica no schema configurado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedEngine('V3')}
                className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                  engine === 'V3'
                    ? 'bg-[var(--lime)] text-[var(--lime-ink)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Editor 3.0 (V3)
              </button>
              <button
                type="button"
                onClick={() => setSelectedEngine('V2')}
                className={`rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                  engine === 'V2'
                    ? 'bg-[var(--lime)] text-[var(--lime-ink)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Editor 2.0 (V2)
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal DDL"
              className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--card-solid)] hover:text-[var(--foreground)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="tone-info mx-6 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Este script utiliza o owner <strong className="font-mono">{normalizedOwner}</strong> para os objetos customizados (<code className="font-mono">{normalizedOwner}.TB_AUDITORIA_SIMILARIDADE</code> e <code className="font-mono">{normalizedOwner}.V_AUDITORIA_COPIA_COLA</code>), mantendo a leitura nas tabelas clínicas originais do <code className="font-mono">DBAMV</code>. Se precisar alterar o schema, ajuste o campo <strong>Schema / Owner de Auditoria</strong> em <em>Configurações &gt; Parâmetros</em>.
          </div>
        </div>

        <div className="relative flex-1 overflow-auto p-6 pt-4">
          <pre className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 font-mono text-xs leading-relaxed text-[var(--foreground)]">
            <code>{ddlScript}</code>
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--card-subtle)] px-6 py-4">
          <span className="text-xs text-[var(--muted)]">
            Compatível com Oracle 11g / 12c / 19c+ (MV2000 / SoulMV)
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="sylva-lime-btn inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Script Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar DDL Completo
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--border)] bg-[var(--card-solid)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
