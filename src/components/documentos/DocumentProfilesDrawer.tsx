"use client";

import React, { useState, useMemo } from 'react';
import {
  X, Layers, Search, Download, Printer, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Building2, FileText, CheckCircle, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export interface ProfileItem {
  CD_DOCUMENTO?: string | number;
  NM_TITULO?: string;
  DS_PERFIL_AMBULATORIAL: string;
  EMPRESA: string;
}

interface DocumentProfilesDrawerProps {
  open: boolean;
  onClose: () => void;
  docId: string | null;
  docName?: string;
  profiles: ProfileItem[];
  loading: boolean;
  docVersion?: string;
}

export function DocumentProfilesDrawer({
  open,
  onClose,
  docId,
  docName,
  profiles,
  loading,
  docVersion = 'V3'
}: DocumentProfilesDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Lista única de hospitais para filtro rápido
  const hospitals = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach(p => {
      if (p.EMPRESA && p.EMPRESA !== 'NO_HOSPITALS') {
        set.add(p.EMPRESA);
      }
    });
    return Array.from(set).sort();
  }, [profiles]);

  // Filtro de Perfis por termo e hospital
  const filteredProfiles = useMemo(() => {
    let list = profiles;
    if (selectedHospital !== 'ALL') {
      list = list.filter(p => p.EMPRESA === selectedHospital);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.DS_PERFIL_AMBULATORIAL || '').toLowerCase().includes(term) ||
        (p.NM_TITULO || '').toLowerCase().includes(term) ||
        (p.EMPRESA || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [profiles, selectedHospital, searchTerm]);

  // Paginação interna
  const totalPages = Math.ceil(filteredProfiles.length / pageSize) || 1;
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProfiles.slice(start, start + pageSize);
  }, [filteredProfiles, currentPage, pageSize]);

  // Reset de página ao filtrar
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedHospital]);

  // Exportação para Excel (CSV compatível com UTF-8 BOM)
  const handleExportExcel = () => {
    if (!filteredProfiles.length) {
      toast.error('Nenhum perfil para exportar.');
      return;
    }

    const headers = ['Código Documento', 'Nome do Documento', 'Perfil Ambulatorial', 'Módulo / Título', 'Unidade / Empresa'];
    const rows = filteredProfiles.map(p => [
      `"${docId || ''}"`,
      `"${(docName || '').replace(/"/g, '""')}"`,
      `"${(p.DS_PERFIL_AMBULATORIAL || '').replace(/"/g, '""')}"`,
      `"${(p.NM_TITULO || '').replace(/"/g, '""')}"`,
      `"${p.EMPRESA || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `perfis_documento_${docId}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredProfiles.length} perfis exportados para Excel!`);
  };

  // Impressão / Salvar PDF
  const handlePrint = () => {
    if (!filteredProfiles.length) {
      toast.error('Nenhum perfil para imprimir.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('O navegador bloqueou a janela de impressão. Permita pop-ups para imprimir.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Perfis Ambulatoriais - Documento #${docId}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
          .header { border-bottom: 2px solid #004953; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 16px; font-weight: bold; color: #004953; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
          .badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f8fafc; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase; text-align: left; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; }
          td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .hospital-badge { font-weight: bold; font-family: monospace; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; border: 1px solid #cbd5e1; }
          .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">ACSC · Governança de Documentos Clínicos</h1>
            <div class="subtitle">
              Documento: <strong>#${docId} - ${docName || 'Sem descrição'}</strong> · Motor ${docVersion}
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge">${filteredProfiles.length} perfis correlacionados</span>
            <div class="subtitle">Emissão: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 60px;">Doc</th>
              <th>Perfil Ambulatorial</th>
              <th>Módulo / Título</th>
              <th style="width: 120px;">Unidade / Empresa</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProfiles.map(p => `
              <tr>
                <td style="font-family: monospace; font-weight: bold; color: #0369a1;">#${docId}</td>
                <td style="font-weight: 600;">${p.DS_PERFIL_AMBULATORIAL || '—'}</td>
                <td style="color: #64748b;">${p.NM_TITULO || '—'}</td>
                <td><span class="hospital-badge">${p.EMPRESA || 'REDE'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Relatório gerado automaticamente pelo Sistema de Governança de Documentos PEP MV · Total de registros: ${filteredProfiles.length}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] h-[78vh] bg-white rounded-t-3xl shadow-2xl border-t border-slate-200/90 flex flex-col animate-in slide-in-from-bottom duration-300 ease-out">
        
        {/* Top Handle bar */}
        <div className="w-full pt-2.5 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 transition-colors rounded-full" />
        </div>

        {/* 1. Header da Gaveta Inferior */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#004953] border border-teal-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#004953] text-white">
                  #{docId}
                </span>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  Perfis Ambulatoriais Vinculados
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold border-sky-300 bg-sky-50 text-sky-800 rounded-full">
                  {loading ? 'Carregando...' : `${filteredProfiles.length} correlacionado(s)`}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xl mt-0.5" title={docName}>
                {docName || 'Documento Clínico'}
              </p>
            </div>
          </div>

          {/* Ações no Header: Exportar Excel, Imprimir, Fechar */}
          <div className="flex items-center gap-2 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading || filteredProfiles.length === 0}
              className="h-8 text-xs font-semibold gap-1.5 rounded-full border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 cursor-pointer shadow-2xs"
              title="Exportar lista de perfis para arquivo compatível com Excel"
            >
              <Download size={13} className="text-emerald-600" />
              <span>Exportar Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={loading || filteredProfiles.length === 0}
              className="h-8 text-xs font-semibold gap-1.5 rounded-full border-slate-200 hover:bg-sky-50 hover:text-sky-800 hover:border-sky-200 cursor-pointer shadow-2xs"
              title="Imprimir ou gerar PDF formatado desta lista de perfis"
            >
              <Printer size={13} className="text-sky-600" />
              <span>Imprimir / PDF</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all ml-1 cursor-pointer"
              title="Fechar gaveta de perfis"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Barra de Filtro e Busca Rápida */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por nome do perfil, módulo ou hospital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004953]/20 focus:border-[#004953] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtro por Hospital */}
          {hospitals.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-1">
                Hospital:
              </span>
              <button
                onClick={() => setSelectedHospital('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 border cursor-pointer",
                  selectedHospital === 'ALL'
                    ? "bg-[#004953] text-white border-[#004953]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Todos ({profiles.length})
              </button>
              {hospitals.map(h => {
                const count = profiles.filter(p => p.EMPRESA === h).length;
                return (
                  <button
                    key={h}
                    onClick={() => setSelectedHospital(h)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 border cursor-pointer font-mono",
                      selectedHospital === h
                        ? "bg-[#004953] text-white border-[#004953]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {h} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Tabela de Perfis com Scroll Próprio */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="space-y-3 py-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 space-y-2">
              <Database size={32} className="opacity-30 text-sky-600" />
              <p className="text-xs font-semibold">Nenhum perfil ambulatorial encontrado para os filtros informados.</p>
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSearchTerm(''); setSelectedHospital('ALL'); }}
                  className="text-xs text-sky-700 hover:bg-sky-50"
                >
                  Limpar filtros de busca
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 bg-white">
                  <th className="py-2.5 px-3 w-16">Código</th>
                  <th className="py-2.5 px-3">Perfil Ambulatorial</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Módulo / Título</th>
                  <th className="py-2.5 px-3 text-center w-36">Unidade / Empresa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProfiles.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400 group-hover:text-sky-800">
                      #{docId}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 group-hover:text-sky-900 transition-colors block">
                        {p.DS_PERFIL_AMBULATORIAL}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 hidden md:table-cell">
                      {p.NM_TITULO || '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center justify-center font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] shadow-2xs">
                        {p.EMPRESA || 'REDE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Rodapé Fixo com Paginação */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div>
            Exibindo <strong className="font-mono">{Math.min(filteredProfiles.length, (currentPage - 1) * pageSize + 1)}</strong> até{' '}
            <strong className="font-mono">{Math.min(filteredProfiles.length, currentPage * pageSize)}</strong> de{' '}
            <strong className="font-mono">{filteredProfiles.length}</strong> perfis correlacionados
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                title="Primeira página"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                title="Última página"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}