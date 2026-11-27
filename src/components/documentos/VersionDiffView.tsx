"use client";

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Pencil,
  Equal,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Code2,
  AlertCircle,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getFieldTypeBadge,
  getRuleTypeBadge,
} from '@/components/documentos/DocumentDetailsModal';
import type {
  DiffChangeStatus,
  FieldDiffItem,
  PropertyDelta,
  RuleDiffItem,
  SqlActionDiffItem,
  SqlDiffChunk,
} from '@/types/version-diff.types';
import toast from 'react-hot-toast';

function getStatusBadgeMeta(status: DiffChangeStatus) {
  switch (status) {
    case 'added':
      return {
        label: 'Adicionado',
        badgeClass: 'tone-success border',
        borderClass: 'border-[var(--tone-success-border)]',
        Icon: Plus,
      };
    case 'removed':
      return {
        label: 'Removido',
        badgeClass: 'tone-danger border',
        borderClass: 'border-[var(--tone-danger-border)]',
        Icon: Minus,
      };
    case 'modified':
      return {
        label: 'Alterado',
        badgeClass: 'tone-warning border',
        borderClass: 'border-[var(--tone-warning-border)]',
        Icon: Pencil,
      };
    case 'unchanged':
    default:
      return {
        label: 'Sem alteração',
        badgeClass: 'tone-neutral border',
        borderClass: 'border-[var(--border)]',
        Icon: Equal,
      };
  }
}

function getPlainExplanation(
  status: DiffChangeStatus,
  baseLabel: string,
  targetLabel: string
): string {
  switch (status) {
    case 'added':
      return `Adicionado na ${targetLabel} — não existia na ${baseLabel}`;
    case 'removed':
      return `Removido na ${targetLabel} — existia na ${baseLabel}`;
    case 'modified':
      return `Alterado de ${baseLabel} → ${targetLabel}`;
    case 'unchanged':
    default:
      return `Idêntico entre ${baseLabel} e ${targetLabel}`;
  }
}

function DeltaBadges({
  changes,
  baseLabel,
  targetLabel,
}: {
  changes: PropertyDelta[];
  baseLabel: string;
  targetLabel: string;
}) {
  if (!changes.length) return null;
  return (
    <div className="flex flex-col gap-2 pt-2.5 border-t border-[var(--border)]">
      {changes.map((delta) => (
        <div
          key={delta.field}
          className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs bg-[var(--card-subtle)] px-3 py-2 rounded-xl border border-[var(--border)]"
        >
          <span className="font-semibold text-[var(--foreground)] shrink-0 min-w-[120px]">
            {delta.label}:
          </span>
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg tone-danger border text-[11px] max-w-full">
              <span className="font-bold uppercase text-[9.5px] opacity-80 shrink-0">
                Antes ({baseLabel}):
              </span>
              <span className="font-mono break-all">
                {delta.before !== null && delta.before !== '' ? String(delta.before) : '—'}
              </span>
            </div>
            <ArrowRight size={12} className="text-[var(--muted)] shrink-0" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg tone-success border text-[11px] max-w-full">
              <span className="font-bold uppercase text-[9.5px] opacity-80 shrink-0">
                Depois ({targetLabel}):
              </span>
              <span className="font-mono break-all">
                {delta.after !== null && delta.after !== '' ? String(delta.after) : '—'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SqlDiffViewer({
  chunks,
  baseScript,
  targetScript,
  baseLabel = 'Base',
  targetLabel = 'Alvo',
}: {
  chunks?: SqlDiffChunk[];
  baseScript?: string | null;
  targetScript?: string | null;
  baseLabel?: string;
  targetLabel?: string;
}) {
  const [copiedSide, setCopiedSide] = useState<'base' | 'target' | null>(null);

  const handleCopy = (text: string, side: 'base' | 'target') => {
    navigator.clipboard.writeText(text);
    setCopiedSide(side);
    toast.success(`SQL (${side === 'base' ? baseLabel : targetLabel}) copiado.`);
    setTimeout(() => setCopiedSide(null), 1800);
  };

  const renderedLines = (chunks || []).flatMap((chunk, cIdx) => {
    const rawLines = chunk.value.split('\n');
    if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop();
    }
    return rawLines.map((line, lIdx) => ({
      key: `${cIdx}_${lIdx}`,
      line,
      added: Boolean(chunk.added),
      removed: Boolean(chunk.removed),
    }));
  });

  if (renderedLines.length === 0 && !baseScript && !targetScript) {
    return null;
  }

  return (
    <div className="mt-2 rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--background-elevated)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--card-subtle)] border-b border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <Code2 size={13} />
          <span>Comparação do Script SQL ({baseLabel} → {targetLabel})</span>
        </span>
        <div className="flex items-center gap-1.5">
          {baseScript && (
            <button
              type="button"
              onClick={() => handleCopy(baseScript, 'base')}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[var(--card-solid)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedSide === 'base' ? <Check size={11} /> : <Copy size={11} />}
              <span>Copiar {baseLabel}</span>
            </button>
          )}
          {targetScript && (
            <button
              type="button"
              onClick={() => handleCopy(targetScript, 'target')}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[var(--card-solid)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedSide === 'target' ? <Check size={11} /> : <Copy size={11} />}
              <span>Copiar {targetLabel}</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto max-h-80 text-[11.5px] font-mono leading-relaxed">
        {renderedLines.length > 0 ? (
          renderedLines.map((item) => (
            <div
              key={item.key}
              className={cn(
                'px-3 py-0.5 flex items-start gap-2 whitespace-pre',
                item.added && 'bg-[var(--tone-success-bg)] text-[var(--tone-success-fg)]',
                item.removed && 'bg-[var(--tone-danger-bg)] text-[var(--tone-danger-fg)]',
                !item.added && !item.removed && 'text-[var(--foreground-secondary)]'
              )}
            >
              <span className="w-3 shrink-0 select-none font-bold opacity-80">
                {item.added ? '+' : item.removed ? '-' : ' '}
              </span>
              <span className="min-w-0">{item.line || ' '}</span>
            </div>
          ))
        ) : (
          <pre className="p-3 text-[var(--foreground-secondary)] whitespace-pre-wrap break-all">
            {targetScript || baseScript}
          </pre>
        )}
      </div>
    </div>
  );
}

export function FieldDiffList({
  items,
  baseLabel,
  targetLabel,
}: {
  items: FieldDiffItem[];
  baseLabel: string;
  targetLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--muted)] bg-[var(--card-subtle)] rounded-2xl border border-dashed border-[var(--border)] px-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Nenhuma diferença encontrada nos campos exibidos
        </p>
        <p className="text-xs mt-1">
          Todos os campos clínicos correspondentes são equivalentes entre {baseLabel} e {targetLabel}, ou ajuste os filtros acima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const statusMeta = getStatusBadgeMeta(item.status);
        const StatusIcon = statusMeta.Icon;
        const snap = item.target ?? item.base!;
        const typeBadge = getFieldTypeBadge(snap.dsTipoVisualizacao);
        const explanation = getPlainExplanation(item.status, baseLabel, targetLabel);

        return (
          <div
            key={item.key}
            className={cn(
              'p-4 rounded-2xl bg-[var(--card-solid)] border transition-all flex flex-col gap-2.5',
              statusMeta.borderClass
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      statusMeta.badgeClass
                    )}
                  >
                    <StatusIcon size={11} />
                    <span>{statusMeta.label}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)]">
                    {item.layoutName}
                  </span>

                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold', typeBadge.color)}>
                    {typeBadge.label}
                  </span>

                  {item.isVisualElement && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tone-info border">
                      Rótulo visual
                    </span>
                  )}

                  {snap.snAtivo === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tone-neutral border">
                      Inativo
                    </span>
                  )}

                  <span className="text-[11px] text-[var(--muted)]">
                    {explanation}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-2">
                  <code className="text-sm font-mono font-bold text-[var(--foreground)] break-all">
                    {item.identifier}
                  </code>
                  {snap.dsCampo && (
                    <span className="text-xs text-[var(--foreground-secondary)]">
                      {snap.dsCampo}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted)] shrink-0">
                {snap.cdMetadado !== null && <span>Meta #{snap.cdMetadado}</span>}
                <span>Campo #{snap.cdCampo}</span>
              </div>
            </div>

            <DeltaBadges
              changes={item.changes}
              baseLabel={baseLabel}
              targetLabel={targetLabel}
            />
          </div>
        );
      })}
    </div>
  );
}

export function RuleDiffList({
  items,
  baseLabel,
  targetLabel,
}: {
  items: RuleDiffItem[];
  baseLabel: string;
  targetLabel: string;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--muted)] bg-[var(--card-subtle)] rounded-2xl border border-dashed border-[var(--border)] px-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Nenhuma diferença encontrada nas regras
        </p>
        <p className="text-xs mt-1">
          As regras de negócio possuem a mesma lógica e condições entre {baseLabel} e {targetLabel}, ou ajuste os filtros acima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const statusMeta = getStatusBadgeMeta(item.status);
        const StatusIcon = statusMeta.Icon;
        const snap = item.target ?? item.base!;
        const typeBadge = getRuleTypeBadge(snap.tipoRegra);
        const hasSqlOrDetails = Boolean(
          item.scriptDiff?.length || snap.script || snap.condicao || snap.camposAfetados || snap.dsAlerta
        );
        const isExpanded = expandedKeys[item.key] ?? item.status !== 'unchanged';
        const explanation = getPlainExplanation(item.status, baseLabel, targetLabel);
        const showTechnicalId = item.displayTitle !== item.identifier;

        return (
          <div
            key={item.key}
            className={cn(
              'p-4 rounded-2xl bg-[var(--card-solid)] border transition-all flex flex-col gap-2.5',
              statusMeta.borderClass
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      statusMeta.badgeClass
                    )}
                  >
                    <StatusIcon size={11} />
                    <span>{statusMeta.label}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)]">
                    {item.layoutName}
                  </span>

                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold', typeBadge.color)}>
                    {typeBadge.label}
                  </span>

                  {snap.numOrdem !== null && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--muted)]">
                      Ordem {snap.numOrdem}
                    </span>
                  )}

                  {snap.ativa === 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tone-neutral border">
                      Inativa
                    </span>
                  )}

                  <span className="text-[11px] text-[var(--muted)]">
                    {explanation}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)] break-words">
                    {item.displayTitle}
                  </h4>
                  {showTechnicalId && (
                    <span className="text-[11px] font-mono text-[var(--muted)]">
                      ID técnico: {item.identifier}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  Regra #{snap.cdRegra}
                </span>
                {hasSqlOrDetails && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedKeys((prev) => ({ ...prev, [item.key]: !isExpanded }))
                    }
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold sylva-pill text-[var(--foreground-secondary)] hover:text-[var(--foreground)] flex items-center gap-1 cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>{isExpanded ? 'Recolher' : 'Detalhes'}</span>
                  </button>
                )}
              </div>
            </div>

            <DeltaBadges
              changes={item.changes}
              baseLabel={baseLabel}
              targetLabel={targetLabel}
            />

            {isExpanded && (
              <div className="space-y-2 pt-1 text-xs">
                {snap.condicao && (
                  <div className="px-3 py-2 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-0.5">
                      Condição ({item.status === 'removed' ? baseLabel : targetLabel})
                    </span>
                    <code className="font-mono text-[var(--foreground)] break-all">
                      {snap.condicao}
                    </code>
                  </div>
                )}

                {snap.camposAfetados && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--foreground-secondary)]">
                    <span className="font-semibold text-[var(--muted)]">Campos afetados:</span>
                    <code className="font-mono text-[var(--foreground)]">{snap.camposAfetados}</code>
                  </div>
                )}

                {snap.dsAlerta && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-xl tone-warning border text-[11.5px]">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{snap.dsAlerta}</span>
                  </div>
                )}

                {(item.scriptDiff?.length || snap.script) && (
                  <SqlDiffViewer
                    chunks={item.scriptDiff}
                    baseScript={item.base?.script}
                    targetScript={item.target?.script}
                    baseLabel={baseLabel}
                    targetLabel={targetLabel}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SqlActionDiffList({
  items,
  baseLabel,
  targetLabel,
}: {
  items: SqlActionDiffItem[];
  baseLabel: string;
  targetLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--muted)] bg-[var(--card-subtle)] rounded-2xl border border-dashed border-[var(--border)] px-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Nenhuma diferença encontrada nas consultas SQL
        </p>
        <p className="text-xs mt-1">
          As consultas SQL de preenchimento dos campos são equivalentes entre {baseLabel} e {targetLabel}, ou desative &quot;Somente diferenças&quot; para inspecioná-las.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const statusMeta = getStatusBadgeMeta(item.status);
        const StatusIcon = statusMeta.Icon;
        const snap = item.target ?? item.base!;
        const docsRefs = Array.from(
          new Set([
            ...(item.base?.docsRelacionados ?? []),
            ...(item.target?.docsRelacionados ?? []),
          ])
        );
        const sharesMetadata = Boolean(
          item.status === 'unchanged' &&
            item.base?.cdMetadado &&
            item.target?.cdMetadado &&
            item.base.cdMetadado === item.target.cdMetadado
        );
        const explanation = getPlainExplanation(item.status, baseLabel, targetLabel);

        return (
          <div
            key={item.key}
            className={cn(
              'p-4 rounded-2xl bg-[var(--card-solid)] border transition-all flex flex-col gap-2.5',
              statusMeta.borderClass
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      statusMeta.badgeClass
                    )}
                  >
                    <StatusIcon size={11} />
                    <span>{statusMeta.label}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)]">
                    {item.layoutName}
                  </span>

                  {sharesMetadata && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tone-info border">
                      Metadado compartilhado (#{snap.cdMetadado})
                    </span>
                  )}

                  {docsRefs.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
                      <Link2 size={10} />
                      <span>Docs: {docsRefs.map((d) => `#${d}`).join(', ')}</span>
                    </span>
                  )}

                  <span className="text-[11px] text-[var(--muted)]">
                    {explanation}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-2">
                  <code className="text-sm font-mono font-bold text-[var(--foreground)] break-all">
                    {item.identifier}
                  </code>
                  {snap.nomeCampo && (
                    <span className="text-xs text-[var(--foreground-secondary)]">
                      {snap.nomeCampo}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted)] shrink-0">
                {snap.cdMetadado !== null && <span>Meta #{snap.cdMetadado}</span>}
                <span>Prop #{snap.cdPropriedade}</span>
              </div>
            </div>

            <DeltaBadges
              changes={item.changes}
              baseLabel={baseLabel}
              targetLabel={targetLabel}
            />

            <SqlDiffViewer
              chunks={item.scriptDiff}
              baseScript={item.base?.script}
              targetScript={item.target?.script}
              baseLabel={baseLabel}
              targetLabel={targetLabel}
            />
          </div>
        );
      })}
    </div>
  );
}
