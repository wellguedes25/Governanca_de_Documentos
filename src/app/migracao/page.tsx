"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeftRight, RotateCw, Plus, FileSpreadsheet, 
  Printer, AlertTriangle, Layers, Building2 
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DocumentoMigracao, 
  DocumentoFlexItem, 
  MigracaoKpisData, 
  StatusMigracao 
} from '@/types/migracao.types';
import { MigracaoKpis } from '@/components/migracao/MigracaoKpis';
import { MigracaoViewTabs } from '@/components/migracao/MigracaoViewTabs';
import { MigracaoKanban } from '@/components/migracao/MigracaoKanban';
import { MigracaoTable } from '@/components/migracao/MigracaoTable';
import { MigracaoBacklogTable } from '@/components/migracao/MigracaoBacklogTable';
import { MigracaoDrawer } from '@/components/migracao/MigracaoDrawer';
import toast from 'react-hot-toast';

export default function MigracaoPage() {
  const { docVersion } = useUI();

  const resolvedVersion = useMemo(() => {
    if (docVersion) return docVersion;
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('app_doc_version');
      if (saved === 'V3' || saved === 'V2') return saved;
    }
    return 'V2';
  }, [docVersion]);

  const [migracoes, setMigracoes] = useState<DocumentoMigracao[]>([]);
  const [docsFlexSemMigracao, setDocsFlexSemMigracao] = useState<DocumentoFlexItem[]>([]);
  const [docsFlexTotal, setDocsFlexTotal] = useState<DocumentoFlexItem[]>([]);
  const [docsHtml5Total, setDocsHtml5Total] = useState<DocumentoFlexItem[]>([]);
  const [kpis, setKpis] = useState<MigracaoKpisData>({
    totalFlex: 0,
    totalHtml5: 0,
    totalMigrados: 0,
    totalEmAndamento: 0,
    totalHomologacao: 0,
    totalPlanejados: 0,
    totalNaoIniciados: 0,
    percentualConcluido: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros da Visão
  const [activeTab, setActiveTab] = useState<'quadro' | 'backlog' | 'tabela'>('quadro');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('TODOS');
  const [apenasMinhas, setApenasMinhas] = useState(false);

  // Estados do Drawer de Detalhe da Demanda
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMigracao, setSelectedMigracao] = useState<DocumentoMigracao | null>(null);
  const [initialFlexDoc, setInitialFlexDoc] = useState<DocumentoFlexItem | null>(null);
  const [initialStatus, setInitialStatus] = useState<StatusMigracao | null>(null);

  // Busca de Dados da API
  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/migracao');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMigracoes(data.migracoes || []);
      setDocsFlexSemMigracao(data.docsFlexSemMigracao || []);
      setDocsFlexTotal(data.docsFlexTotal || []);
      setDocsHtml5Total(data.docsHtml5Total || []);
      if (data.kpis) setKpis(data.kpis);
    } catch (err: any) {
      console.error('Erro ao carregar dados de migração:', err);
      setError(err.message || 'Falha ao sincronizar dados de migração.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lista única de responsáveis para o filtro
  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    migracoes.forEach(m => {
      const resp = m.responsavel_dev || m.responsavel;
      if (resp) set.add(resp);
    });
    return Array.from(set).sort();
  }, [migracoes]);

  // Abertura de Modal para Nova Demanda
  const handleNovaDemanda = () => {
    setSelectedMigracao(null);
    setInitialFlexDoc(null);
    setInitialStatus('PENDENTES');
    setDrawerOpen(true);
  };

  // Promover documento do Backlog
  const handlePromoverDoc = (doc: DocumentoFlexItem, targetStatus: StatusMigracao = 'PENDENTES') => {
    setSelectedMigracao(null);
    setInitialFlexDoc(doc);
    setInitialStatus(targetStatus);
    setDrawerOpen(true);
  };

  // Abrir demanda existente
  const handleSelectMigracao = (m: DocumentoMigracao) => {
    setSelectedMigracao(m);
    setInitialFlexDoc(null);
    setInitialStatus(null);
    setDrawerOpen(true);
  };

  // Salvar Demanda (Criar ou Atualizar)
  const handleSaveDemanda = async (demandData: Partial<DocumentoMigracao>) => {
    const res = await fetch('/api/migracao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demandData)
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);

    await fetchData(true);
  };

  // Excluir Demanda
  const handleDeleteDemanda = async (id: string) => {
    const res = await fetch(`/api/migracao?id=${id}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);

    await fetchData(true);
  };

  // Atualizar Status (Arrastar no Kanban)
  const handleUpdateStatus = async (id: string, newStatus: StatusMigracao) => {
    // Atualização otimista local
    setMigracoes(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));

    try {
      const res = await fetch('/api/migracao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success(`Demanda movida para ${newStatus}`);
    } catch (err: any) {
      toast.error('Erro ao atualizar status.');
      await fetchData(true);
    }
  };

  // Exportação CSV
  const handleExportCSV = () => {
    if (!migracoes.length) {
      toast.error('Nenhuma demanda para exportar.');
      return;
    }
    const headers = ['Flex_Cod', 'Flex_Nome', 'HTML5_Cod', 'HTML5_Nome', 'Status', 'Complexidade', 'LECOM', 'Responsavel_Dev', 'Responsavel_Perfil', 'Data_Inicio', 'Limite_Dev', 'Entrada_Producao'];
    const rows = migracoes.map(m => [
      `"${m.documento_flex?.cd_documento_mv || m.documento_flex_id || ''}"`,
      `"${(m.documento_flex?.nome || m.tipo_documento || '').replace(/"/g, '""')}"`,
      `"${m.documento_html5?.cd_documento_mv || m.documento_html5_id || ''}"`,
      `"${(m.documento_html5?.nome || '').replace(/"/g, '""')}"`,
      `"${m.status}"`,
      `"${m.complexidade}"`,
      `"${m.lecom || ''}"`,
      `"${m.responsavel_dev || m.responsavel || ''}"`,
      `"${m.responsavel_perfil || ''}"`,
      `"${m.data_inicio || ''}"`,
      `"${m.data_conclusao_prevista || ''}"`,
      `"${m.data_conclusao_efetiva || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_governanca_migracao_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório gerencial exportado para Excel!');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8 space-y-6 pb-24">
      
      {/* 1. Header Padronizado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <PageHeader 
            title="Governança de Migração"
            subtitle="Painel executivo e técnico para controle de paridade funcional, esteira ágil de etapas V2 Flex ➔ V3 Editor"
            icon={ArrowLeftRight}
          />
          <Badge 
            variant="outline" 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border-sky-300 bg-sky-50 text-sky-800"
          >
            Motor {resolvedVersion}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="gap-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs cursor-pointer h-9 px-4"
          >
            <RotateCw className={`w-3.5 h-3.5 text-sky-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </Button>

          <Button
            size="sm"
            onClick={handleNovaDemanda}
            className="gap-2 text-xs font-semibold rounded-full bg-[#004953] hover:bg-[#003b44] text-white shadow-2xs cursor-pointer h-9 px-4"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Demanda</span>
          </Button>
        </div>
      </div>

      {/* Alerta de Erro */}
      {error && (
        <div className="border border-rose-200 bg-rose-50 p-4 rounded-xl flex items-center gap-3 text-xs text-rose-700 shadow-2xs">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <div>
            <p className="font-bold text-rose-900">Falha ao obter dados de migração</p>
            <p className="text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* 2. Top KPIs Executivos */}
      <MigracaoKpis kpis={kpis} />

      {/* 3. Toolbar: Visões, Filtros e Busca */}
      <MigracaoViewTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filtroResponsavel={filtroResponsavel}
        setFiltroResponsavel={setFiltroResponsavel}
        responsaveis={responsaveis}
        apenasMinhas={apenasMinhas}
        setApenasMinhas={setApenasMinhas}
        onNovaDemanda={handleNovaDemanda}
        onExportarTabela={handleExportCSV}
        totalFiltered={activeTab === 'backlog' ? docsFlexSemMigracao.length : migracoes.length}
        totalBacklog={docsFlexSemMigracao.length}
      />

      {/* 4. Conteúdo: Quadro Kanban, Backlog Geral ou Tabela */}
      {loading && migracoes.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : activeTab === 'quadro' ? (
        <MigracaoKanban
          migracoes={migracoes}
          docsFlexSemMigracao={docsFlexSemMigracao}
          onSelectMigracao={handleSelectMigracao}
          onPromoverBacklogDoc={handlePromoverDoc}
          onNovaMigracaoNaEtapa={(etapa) => {
            setSelectedMigracao(null);
            setInitialFlexDoc(null);
            setInitialStatus(etapa);
            setDrawerOpen(true);
          }}
          onUpdateStatus={handleUpdateStatus}
          searchTerm={searchTerm}
          filtroResponsavel={filtroResponsavel}
          apenasMinhas={apenasMinhas}
        />
      ) : activeTab === 'backlog' ? (
        <MigracaoBacklogTable
          docsFlexSemMigracao={docsFlexSemMigracao}
          onPromoverDoc={handlePromoverDoc}
        />
      ) : (
        <MigracaoTable
          migracoes={migracoes}
          onSelectMigracao={handleSelectMigracao}
          searchTerm={searchTerm}
          filtroResponsavel={filtroResponsavel}
          apenasMinhas={apenasMinhas}
        />
      )}

      {/* 5. Gaveta Lateral de Detalhes da Demanda */}
      <MigracaoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        migracao={selectedMigracao}
        docsFlexTotal={docsFlexTotal}
        docsHtml5Total={docsHtml5Total}
        onSave={handleSaveDemanda}
        onDelete={handleDeleteDemanda}
        initialFlexDoc={initialFlexDoc}
        initialStatus={initialStatus}
      />

    </div>
  );
}

