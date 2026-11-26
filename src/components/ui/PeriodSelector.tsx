"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CalendarRange, X, AlertTriangle, Check } from 'lucide-react';
import {
  ALLOWED_PERIOD_DAYS,
  MAX_CUSTOM_RANGE_DAYS,
  formatPeriodLabel,
  validateCustomDateRange,
  type PeriodFilter,
} from '@/lib/period';
import { cn } from '@/lib/utils';

interface PeriodSelectorProps {
  value: PeriodFilter;
  onChange: (filter: PeriodFilter) => void;
  disabled?: boolean;
  className?: string;
}

function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDraftDates(current: PeriodFilter): { start: string; end: string } {
  if (current.mode === 'custom') {
    return { start: current.startDate, end: current.endDate };
  }
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (current.days - 1));
  return {
    start: toIsoDateLocal(start),
    end: toIsoDateLocal(today),
  };
}

export function PeriodSelector({
  value,
  onChange,
  disabled = false,
  className,
}: PeriodSelectorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [popoverOpen]);

  const openCustomPopover = () => {
    if (popoverOpen) {
      setPopoverOpen(false);
      return;
    }
    const defaults = getDefaultDraftDates(value);
    setDraftStart(defaults.start);
    setDraftEnd(defaults.end);
    setPopoverOpen(true);
  };

  const applyQuickPresetInDraft = (kind: 'thisMonth' | 'lastMonth' | 'last7') => {
    const today = new Date();
    if (kind === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDraftStart(toIsoDateLocal(start));
      setDraftEnd(toIsoDateLocal(today));
      return;
    }
    if (kind === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setDraftStart(toIsoDateLocal(start));
      setDraftEnd(toIsoDateLocal(end));
      return;
    }
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    setDraftStart(toIsoDateLocal(start));
    setDraftEnd(toIsoDateLocal(today));
  };

  const validation = validateCustomDateRange(draftStart, draftEnd);
  const customLabel = value.mode === 'custom' ? formatPeriodLabel(value) : null;

  const handleConfirmCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid) return;
    setPopoverOpen(false);
    onChange({
      mode: 'custom',
      startDate: draftStart,
      endDate: draftEnd,
    });
  };

  return (
    <div ref={containerRef} className={cn('relative inline-flex items-center', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1 p-1 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] backdrop-blur-md flex-wrap',
          disabled && 'opacity-65 pointer-events-none'
        )}
        role="group"
        aria-label="Selecionar período de análise"
      >
        {ALLOWED_PERIOD_DAYS.map((days) => {
          const active = value.mode === 'preset' && value.days === days;
          return (
            <button
              key={days}
              type="button"
              disabled={disabled}
              onClick={() => {
                setPopoverOpen(false);
                onChange({ mode: 'preset', days });
              }}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer tabular-nums',
                active
                  ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
              )}
              title={`Filtrar últimos ${days} dias`}
            >
              {days}d
            </button>
          );
        })}

        <span className="h-4 w-px bg-[var(--border)] mx-0.5" aria-hidden="true" />

        <button
          type="button"
          disabled={disabled}
          onClick={openCustomPopover}
          aria-expanded={popoverOpen}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer tabular-nums',
            value.mode === 'custom'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
          title={
            customLabel
              ? `Período personalizado: ${customLabel.short}`
              : `Definir período personalizado (máx. ${MAX_CUSTOM_RANGE_DAYS} dias)`
          }
        >
          <CalendarRange size={12} />
          <span>{customLabel ? customLabel.compact : 'Período'}</span>
        </button>
      </div>

      {popoverOpen && (
        <form
          onSubmit={handleConfirmCustom}
          className="absolute right-0 top-full mt-2 z-50 w-[320px] sm:w-[340px] bg-[var(--card-solid)] rounded-[22px] border border-[var(--border-strong)] shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[var(--foreground)] tracking-tight">
                Período Personalizado
              </h4>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
                Limite máximo de {MAX_CUSTOM_RANGE_DAYS} dias por consulta
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="w-7 h-7 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={13} />
            </button>
          </div>

          {/* Atalhos rápidos dentro do popover */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyQuickPresetInDraft('thisMonth')}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold sylva-pill text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
            >
              Mês atual
            </button>
            <button
              type="button"
              onClick={() => applyQuickPresetInDraft('lastMonth')}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold sylva-pill text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
            >
              Mês anterior
            </button>
            <button
              type="button"
              onClick={() => applyQuickPresetInDraft('last7')}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold sylva-pill text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
            >
              Últimos 7d
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label
                htmlFor="period-start-date"
                className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]"
              >
                Data inicial
              </label>
              <input
                id="period-start-date"
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--foreground)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="period-end-date"
                className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]"
              >
                Data final
              </label>
              <input
                id="period-end-date"
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[var(--foreground)] focus:outline-none"
              />
            </div>
          </div>

          {validation.valid ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--card-subtle)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--foreground-secondary)]">
              <span>Período selecionado</span>
              <span className="font-mono font-bold text-[var(--foreground)] tabular-nums">
                {validation.spanDays} {validation.spanDays === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl tone-danger border text-[11px] font-semibold">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{validation.error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="px-3.5 py-1.5 rounded-full sylva-pill text-[11px] font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!validation.valid}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full sylva-lime-btn text-[11px] font-bold cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
            >
              <Check size={12} />
              <span>Aplicar</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
