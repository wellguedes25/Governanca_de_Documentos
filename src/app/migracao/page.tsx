"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeftRight, RotateCw, Plus, AlertTriangle
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
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Carregando governança de migração...</div>}>
      <MigracaoContent />
    </Suspense>
  );
}

function MigracaoContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const { docVersion } = useUI();
  const resolvedVersion = docVersion || 'V3';

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
  const [prevUrlSearch, setPrevUrlSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('TODOS');
  const [apenasMinhas, setApenasMinhas] = useState(false);

  if (urlSearch && urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchTerm(urlSearch);
  }

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
      const syncParam = force ? '?sync=true' : '';
      const res = await fetch(`/api/migracao${syncParam}`);
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
    <div className="flex flex-col space-y-5">
      
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[var(--border-subtle)]">
        <PageHeader 
          kicker="PEP MV • TRANSIÇÃO TECNOLÓGICA"
          title="Governança de Migração de Documentos"
          subtitle="Painel executivo e técnico para controle de paridade funcional, esteira ágil de etapas V2 Flex ➔ V3 Editor"
          icon={ArrowLeftRight}
          badge={
            <Badge 
              variant="outline" 
              suppressHydrationWarning
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[#CCF352]/30 bg-[#CCF352]/10 text-[#CCF352] dark:text-[#CCF352] light:text-[#3f5205]"
            >
              Motor {resolvedVersion}
            </Badge>
          }
          action={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={loading}
                className="gap-2 text-xs font-semibold rounded-full bg-[var(--dock-bg)] hover:bg-[var(--card-bg)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xs cursor-pointer h-9 px-4"
              >
                <RotateCw className={`w-3.5 h-3.5 text-[#CCF352] ${loading ? 'animate-spin' : ''}`} />
                <span>Sincronizar</span>
              </Button>

              <Button
                size="sm"
                onClick={handleNovaDemanda}
                className="gap-2 text-xs font-bold rounded-full bg-[#CCF352] hover:bg-[#b8dd3e] text-[#141312] shadow-2xs cursor-pointer h-9 px-4 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Demanda</span>
              </Button>
            </>
          }
        />
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

