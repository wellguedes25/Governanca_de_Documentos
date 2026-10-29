"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Clock, CheckCircle2, Layers, AlertCircle, FileText, Activity } from 'lucide-react';
import { MigracaoKpisData } from '@/types/migracao.types';

interface MigracaoKpisProps {
  kpis: MigracaoKpisData;
}

export function MigracaoKpis({ kpis }: MigracaoKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Progresso Geral da Migração */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
          <span>Progresso de Migração</span>
          <div className="p-2 rounded-xl bg-teal-50 text-[#004953] border border-teal-100">
            <ArrowLeftRight size={17} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight my-1">
              {kpis.percentualConcluido}%
            </span>
            <span className="text-xs text-emerald-700 font-semibold">concluído</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            <strong className="text-slate-800 font-mono">{kpis.totalMigrados}</strong> de <strong className="text-slate-800 font-mono">{kpis.totalFlex}</strong> modelos Flex migrados
          </p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-[#004953] rounded-full transition-all duration-500" 
            style={{ width: `${Math.max(Math.min(kpis.percentualConcluido, 100), kpis.totalMigrados > 0 ? 3 : 0)}%` }} 
          />
        </div>
      </div>

      {/* 2. Em Andamento (Dev & Homologação) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
          <span>Em Desenvolvimento / Testes</span>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <Clock size={17} />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight my-1">
            {kpis.totalEmAndamento + kpis.totalHomologacao}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-2">
            <span>Dev: <strong className="text-slate-800 font-mono">{kpis.totalEmAndamento}</strong></span>
            <span>•</span>
            <span>Homologação: <strong className="text-slate-800 font-mono">{kpis.totalHomologacao}</strong></span>
          </p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-amber-500 rounded-full w-2/3" />
        </div>
      </div>

      {/* 3. Fila Pendente (Flex) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
          <span>Fila Pendente (Backlog Flex)</span>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            <Layers size={17} />
          </div>
        </div>
        <div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight my-1">
            {kpis.totalPlanejados + kpis.totalNaoIniciados}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-2">
            <span>Planejados: <strong className="text-slate-800 font-mono">{kpis.totalPlanejados}</strong></span>
            <span>•</span>
            <span>A Iniciar: <strong className="text-slate-800 font-mono">{kpis.totalNaoIniciados}</strong></span>
          </p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-slate-400 rounded-full w-1/2" />
        </div>
      </div>

      {/* 4. Inventário Geral por Tecnologia */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
          <span>Inventário do Catálogo</span>
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
            <FileText size={17} />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-4 my-1">
            <div>
              <span className="text-3xl font-bold font-mono tabular-nums text-emerald-700">{kpis.totalHtml5}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">V3 (HTML5)</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-700">{kpis.totalFlex}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">V2 (Flex)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Total mapeado no prontuário eletrônico
          </p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-emerald-600 rounded-full w-3/4" />
        </div>
      </div>

    </div>
  );
}
