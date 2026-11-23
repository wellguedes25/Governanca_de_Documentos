"use client";

import React from 'react';
import { ArrowLeftRight, Clock, Layers, FileText } from 'lucide-react';
import { MigracaoKpisData } from '@/types/migracao.types';

interface MigracaoKpisProps {
  kpis: MigracaoKpisData;
}

export function MigracaoKpis({ kpis }: MigracaoKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Hero Card: Progresso Geral da Migração (Olive Tint com Neon Lime) */}
      <div className="sylva-card-olive text-[var(--tint-olive-fg)] rounded-2xl p-5 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="uppercase tracking-wider text-[11px] opacity-80">Progresso de Migração</span>
          <div className="p-2 rounded-xl bg-[var(--tint-olive-btn)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
            <ArrowLeftRight size={17} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight my-1 text-[var(--tint-olive-fg)]">
              {kpis.percentualConcluido}%
            </span>
            <span className="text-xs font-bold text-[var(--accent-ink)]">concluído</span>
          </div>
          <p className="text-[11px] text-[var(--tint-olive-muted)] mt-1 font-medium">
            <strong className="font-mono">{kpis.totalMigrados}</strong> de <strong className="font-mono">{kpis.totalFlex}</strong> modelos Flex migrados
          </p>
        </div>
        <div className="w-full h-1.5 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-[#CCF352] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(204,243,82,0.6)]" 
            style={{ width: `${Math.max(Math.min(kpis.percentualConcluido, 100), kpis.totalMigrados > 0 ? 3 : 0)}%` }} 
          />
        </div>
      </div>

      {/* 2. Em Andamento (Mocha Tint) */}
      <div className="sylva-card-mocha text-[var(--tint-mocha-fg)] rounded-2xl p-5 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="uppercase tracking-wider text-[11px] opacity-80">Desenvolvimento & Testes</span>
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <Clock size={17} />
          </div>
        </div>
        <div>
          <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight my-1 text-[var(--tint-mocha-fg)]">
            {kpis.totalEmAndamento + kpis.totalHomologacao}
          </div>
          <p className="text-[11px] text-[var(--tint-mocha-muted)] mt-1 font-medium flex items-center gap-2">
            <span>Dev: <strong className="font-mono">{kpis.totalEmAndamento}</strong></span>
            <span>•</span>
            <span>Homologação: <strong className="font-mono">{kpis.totalHomologacao}</strong></span>
          </p>
        </div>
        <div className="w-full h-1.5 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-amber-500 rounded-full w-2/3 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        </div>
      </div>

      {/* 3. Fila Pendente (Slate Tint) */}
      <div className="sylva-card-slate text-[var(--tint-slate-fg)] rounded-2xl p-5 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="uppercase tracking-wider text-[11px] opacity-80">Fila Pendente (Backlog Flex)</span>
          <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--tint-slate-fg)] border border-[var(--tint-slate-border)]">
            <Layers size={17} />
          </div>
        </div>
        <div>
          <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight my-1 text-[var(--tint-slate-fg)]">
            {kpis.totalPlanejados + kpis.totalNaoIniciados}
          </div>
          <p className="text-[11px] text-[var(--tint-slate-muted)] mt-1 font-medium flex items-center gap-2">
            <span>Planejados: <strong className="font-mono">{kpis.totalPlanejados}</strong></span>
            <span>•</span>
            <span>A Iniciar: <strong className="font-mono">{kpis.totalNaoIniciados}</strong></span>
          </p>
        </div>
        <div className="w-full h-1.5 bg-black/15 dark:bg-white/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-sky-400 rounded-full w-1/2 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
        </div>
      </div>

      {/* 4. Inventário Geral por Tecnologia (Sylva Frosted Glass) */}
      <div className="sylva-glass border border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-semibold mb-2">
          <span className="uppercase tracking-wider text-[11px]">Inventário do Catálogo</span>
          <div className="p-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
            <FileText size={17} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-4 my-1">
            <div>
              <span className="text-3xl font-extrabold font-mono tabular-nums text-[var(--accent-ink)]">{kpis.totalHtml5}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">V3 (HTML5)</span>
            </div>
            <div className="text-xl font-light text-[var(--text-muted)]">/</div>
            <div>
              <span className="text-3xl font-extrabold font-mono tabular-nums text-amber-600 dark:text-amber-400">{kpis.totalFlex}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">V2 (Flex)</span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
            Total mapeado no prontuário eletrônico
          </p>
        </div>
        <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-gradient-to-r from-[#CCF352] to-amber-500 rounded-full" 
            style={{ width: `${Math.min(((kpis.totalHtml5 + kpis.totalFlex) > 0 ? (kpis.totalHtml5 / (kpis.totalHtml5 + kpis.totalFlex)) * 100 : 0) + 10, 100)}%` }} 
          />
        </div>
      </div>

    </div>
  );
}
