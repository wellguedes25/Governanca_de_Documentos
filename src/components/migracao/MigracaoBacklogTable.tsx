"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, ArrowRight, TrendingUp, Calendar, 
  Layers, Plus, Filter, Database, CheckCircle2 
} from 'lucide-react';
import { DocumentoFlexItem } from '@/types/migracao.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MigracaoBacklogTableProps {
  docsFlexSemMigracao: DocumentoFlexItem[];
  onPromoverDoc: (doc: DocumentoFlexItem) => void;
}

export function MigracaoBacklogTable({
  docsFlexSemMigracao,
  onPromoverDoc
}: MigracaoBacklogTableProps) {
  const [search, setSearch] = useState('');
  const [filterUso, setFilterUso] = useState<'todos' | 'com_uso' | 'sem_uso'>('todos');
  const [sortBy, setSortBy] = useState<'usos' | 'recente' | 'nome' | 'codigo'>('usos');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    let result = docsFlexSemMigracao;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d => 
        (d.nome || '').toLowerCase().includes(q) ||
        String(d.cd_documento_mv).includes(q)
      );
    }

    if (filterUso === 'com_uso') {
      result = result.filter(d => (d.total_usos || 0) > 0);
    } else if (filterUso === 'sem_uso') {
      result = result.filter(d => (d.total_usos || 0) === 0);
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'usos') return (b.total_usos || 0) - (a.total_usos || 0);
      if (sortBy === 'recente') {
        const dA = a.ultimo_uso ? new Date(a.ultimo_uso).getTime() : 0;
        const dB = b.ultimo_uso ? new Date(b.ultimo_uso).getTime() : 0;
        return dB - dA;
      }
      if (sortBy === 'nome') return (a.nome || '').localeCompare(b.nome || '');
      if (sortBy === 'codigo') return a.cd_documento_mv - b.cd_documento_mv;
      return 0;
    });
  }, [docsFlexSemMigracao, search, filterUso, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      
      {/* Barra de Filtros e Busca do Backlog Geral */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 text-[#004953] border border-teal-100">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Inventário Backlog V2 (Oracle)
            </h3>
            <p className="text-xs text-slate-500">
              Todos os {docsFlexSemMigracao.length} modelos de prontuários legados Flex pendentes de transição
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#004953] focus:border-[#004953]"
            />
          </div>

          {/* Filtro de Uso */}
          <select
            value={filterUso}
            onChange={(e) => {
              setFilterUso(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#004953]"
          >
            <option value="todos">Todos os Documentos</option>
            <option value="com_uso">Apenas com Uso Clínico</option>
            <option value="sem_uso">Sem Uso Registrado</option>
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#004953]"
          >
            <option value="usos">Mais Utilizados (Uso)</option>
            <option value="recente">Uso Mais Recente</option>
            <option value="nome">Nome (A-Z)</option>
            <option value="codigo">Código MV</option>
          </select>
        </div>
      </div>

      {/* Tabela de Backlog */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-28">Código MV</th>
              <th className="py-3 px-4">Nome do Prontuário Flex V2</th>
              <th className="py-3 px-4 w-36 text-right">Volume de Usos</th>
              <th className="py-3 px-4 w-36">Último Uso no MV</th>
              <th className="py-3 px-4 w-32 text-center">Status</th>
              <th className="py-3 px-4 w-36 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {paginatedDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Nenhum documento encontrado no backlog para os critérios selecionados.
                </td>
              </tr>
            ) : (
              paginatedDocs.map((doc) => (
                <tr key={doc.id || doc.cd_documento_mv} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#004953]">
                    #{doc.cd_documento_mv}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">
                      {doc.nome}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Legado Flex PEP MV
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {doc.total_usos !== undefined && doc.total_usos > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <TrendingUp size={11} />
                        {doc.total_usos.toLocaleString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {doc.ultimo_uso ? new Date(doc.ultimo_uso).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
                      Backlog Puro
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => onPromoverDoc(doc)}
                      className="bg-[#004953] hover:bg-[#003840] text-white text-xs h-7 px-3 rounded-lg gap-1.5 shadow-2xs font-semibold cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Migrar</span>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40">
        <span>
          Mostrando <strong>{paginatedDocs.length}</strong> de <strong>{filtered.length}</strong> prontuários no Backlog
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-7 px-2.5 text-xs rounded-lg"
          >
            Anterior
          </Button>

          <span className="px-2 font-mono text-xs font-semibold text-slate-700">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-7 px-2.5 text-xs rounded-lg"
          >
            Próxima
          </Button>
        </div>
      </div>

    </div>
  );
}

