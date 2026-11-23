"use client";

import React, { useEffect } from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmModalProps {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ open, options, onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = (options.variant || 'danger') === 'danger';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md sylva-fade-in"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md sylva-dock rounded-[24px] border border-[var(--border)] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 fade-in duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                'p-2.5 rounded-2xl shrink-0 border',
                isDanger
                  ? 'tone-danger'
                  : 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]'
              )}
            >
              {isDanger ? <AlertTriangle size={20} /> : <Sparkles size={20} />}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight leading-snug">
                {options.title}
              </h3>
              <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                {options.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] shrink-0 cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer"
          >
            {options.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={cn(
              'px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer',
              isDanger
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_4px_14px_rgba(244,63,94,0.3)]'
                : 'bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 shadow-[0_4px_14px_rgba(204,243,82,0.25)]'
            )}
          >
            {options.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
