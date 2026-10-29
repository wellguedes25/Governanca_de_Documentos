"use client";

import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, Check, X, FileSpreadsheet, Printer, 
  ExternalLink, Layers, Database, ChevronLeft, ChevronRight,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentoMigracao } from '@/types/migracao.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MigracaoTableProps {
  migracoes: DocumentoMigracao[];
  onSelectMigracao: (migracao: DocumentoMigracao) => void;
  searchTerm: string;
  filtroResponsavel: string;
  apenasMinhas: boolean;
}

export function MigracaoTable({
  migracoes,
  onSelectMigracao,
  searchTerm,
  filtroResponsavel,
  apenasMinhas
}: MigracaoTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredItems = useMemo(() => {
    return migracoes.filter(m => {
      const nome = (m.documento_flex?.nome || m.documento_html5?.nome || m.tipo_documento || '').toLowerCase();
      const flexCod = String(m.documento_flex?.cd_documento_mv || m.documento_flex_id || '');
      const lecom = String(m.lecom || '');
      const resp = m.responsavel_dev || m.responsavel || '';
      const respPerfil = m.responsavel_perfil || '';

      const matchSearch = !searchTerm.trim() || 
        nome.includes(searchTerm.toLowerCase()) || 
        flexCod.includes(searchTerm) || 
        lecom.includes(searchTerm);

      let matchResp = filtroResponsavel === 'TODOS' || resp === filtroResponsavel;

      if (apenasMinhas) {
        const meuNomeRegex = /cleiton|wellington|wellguedes/i;
        matchResp = meuNomeRegex.test(resp) || meuNomeRegex.test(respPerfil);
      }

      return matchSearch && matchResp;
    });
  }, [migracoes, searchTerm, filtroResponsavel, apenasMinhas]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Formatação de datas
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.slice(0, 10).split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EM_PRODUCAO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">Produção</span>;
      case 'HOMOLOGACAO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">Homologação</span>;
      case 'DESENVOLVIMENTO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">Desenvolvimento</span>;
      case 'CONFIGURACAO_PERFIL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Perfil</span>;
      case 'AGENDADO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">Agendado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Pendentes</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
              <th className="py-3 px-3.5">Origem Flex (V2)</th>
              <th className="py-3 px-3.5">Destino HTML5 (V3)</th>
              <th className="py-3 px-3.5 text-center">Status</th>
              <th className="py-3 px-3.5 text-center">Esforço</th>
              <th className="py-3 px-3.5">LECOM</th>
              <th className="py-3 px-3.5">Responsável Dev</th>
              <th className="py-3 px-3.5">Previsão</th>
              <th className="py-3 px-3.5">Produção</th>
              <th className="py-3 px-3.5 text-center w-16">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <Database size={32} className="mx-auto mb-2 opacity-30 text-sky-600" />
                  <p className="text-xs font-semibold">Nenhuma demanda encontrada com os filtros atuais.</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => {
                const flexCod = item.documento_flex?.cd_documento_mv || item.documento_flex_id;
                const html5Cod = item.documento_html5?.cd_documento_mv || item.documento_html5_id;
                const flexNome = item.documento_flex?.nome || item.tipo_documento || 'Flex Sem Nome';
                const html5Nome = item.documento_html5?.nome || 'Ainda não pareado';

                return (
                  <tr 
                    key={item.id || idx} 
                    className="hover:bg-sky-50/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectMigracao(item)}
                  >
                    {/* Doc Flex Origem */}
                    <td className="py-3 px-3.5 max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#004953] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                          #{flexCod}
                        </span>
                        <span className="font-semibold text-slate-800 group-hover:text-[#004953] transition-colors truncate">
                          {flexNome}
                        </span>
                      </div>
                    </td>

                    {/* Doc HTML5 Pareado */}
                    <td className="py-3 px-3.5 max-w-xs truncate">
                      {html5Cod ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            #{html5Cod}
                          </span>
                          <span className="text-slate-700 font-medium truncate">
                            {html5Nome}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          Em desenvolvimento
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Esforço */}
                    <td className="py-3 px-3.5 text-center font-mono text-[11px]">
                      {item.complexidade || 'MEDIA'}
                    </td>

                    {/* LECOM */}
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {item.lecom || '—'}
                    </td>

                    {/* Responsável Dev */}
                    <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {item.responsavel_dev || item.responsavel || '—'}
                    </td>

                    {/* Previsão */}
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(item.data_conclusao_prevista)}
                    </td>

                    {/* Produção */}
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(item.data_conclusao_efetiva)}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMigracao(item);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#004953] hover:bg-teal-50 transition-all cursor-pointer"
                        title="Editar Demanda"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Exibindo <b>{paginatedItems.length}</b> de <b>{filteredItems.length}</b> demandas
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800 text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

