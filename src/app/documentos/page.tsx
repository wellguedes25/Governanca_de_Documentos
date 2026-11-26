"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, AlertTriangle } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { safeSessionSetItem } from '@/lib/safe-storage';
import { PageHeader } from '@/components/ui/PageHeader';
import { PeriodSelector } from '@/components/ui/PeriodSelector';
import { getPeriodCacheKey, type PeriodFilter } from '@/lib/period';
import { Badge } from '@/components/ui/badge';
import { DocumentosToolbar } from '@/components/documentos/DocumentosToolbar';
import { DocumentosTable } from '@/components/documentos/DocumentosTable';
import { DocumentosCardsGrid } from '@/components/documentos/DocumentosCardsGrid';
import { DocumentDetailsModal, DocumentDetailsTab } from '@/components/documentos/DocumentDetailsModal';

export default function DocumentosPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-[var(--muted)]">Carregando catálogo de documentos...</div>}>
      <DocumentosContent />
    </Suspense>
  );
}

function DocumentosContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const { 
    oracleData, 
    setOracleData, 
    columnWidths, 
    setColumnWidth, 
    docVersion,
    periodFilter,
    setPeriodFilter,
    activeConnInfo,
    setActiveConnInfo,
    getCached,
    setCached
  } = useUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeConnName, setActiveConnName] = useState('');
  const [activeHospitals, setActiveHospitals] = useState<{ id: number; sigla: string }[]>([]);
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [prevUrlSearch, setPrevUrlSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);

  if (urlSearch && urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: docVersion === 'V3' ? 'ULT. GERAL' : 'ÚLTIMO USO',
    direction: 'desc'
  });
  const [pageSize, setPageSize] = useState<number>(25);

  // Estados para Modal Unificado de Detalhes e Perfis do Documento
  const [modalDoc, setModalDoc] = useState<{ id: string; name?: string; initialTab: DocumentDetailsTab } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [profileData, setProfileData] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [metadataActions, setMetadataActions] = useState<any[]>([]);
  const [metadataActionsLoading, setMetadataActionsLoading] = useState(false);
  const [metadataActionsError, setMetadataActionsError] = useState<string | null>(null);
  const [metadataRules, setMetadataRules] = useState<any[]>([]);
  const [metadataRulesLoading, setMetadataRulesLoading] = useState(false);
  const [metadataRulesError, setMetadataRulesError] = useState<string | null>(null);

  const [metadataFields, setMetadataFields] = useState<any[]>([]);
  const [metadataFieldsLoading, setMetadataFieldsLoading] = useState(false);
  const [metadataFieldsError, setMetadataFieldsError] = useState<string | null>(null);

  const handleOpenDocumentModal = (code: string, name?: string, initialTab: DocumentDetailsTab = 'specs') => {
    setModalDoc({ id: code, name: name || `Documento #${code}`, initialTab });
    setModalOpen(true);
  };

  // Controle de redimensionamento de colunas
  const resizingCol = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  // Carregamento inicial de conexões e hospitais sempre atualizado
  useEffect(() => {
    const currentVersion = docVersion || 'V3';
    const currentPeriod = periodFilter;
    let isCurrent = true;

    fetch('/api/connections')
      .then(res => res.json())
      .then(storage => {
        if (!isCurrent) return;
        const active = storage.connections?.find((c: any) => c.id === storage.activeConnectionId);
        const hospitals = storage.hospitalsMapping ? storage.hospitalsMapping.filter((h: any) => h.ativo) : [];
        if (active) {
          setActiveConnName(active.name);
          setActiveConnInfo({
            id: active.id,
            name: active.name,
            activeHospitals: hospitals
          });
        }
        setActiveHospitals(hospitals);

        // Verifica cache com chave isolada pela conexão ativa e período
        const connId = active?.id || storage.activeConnectionId || 'default';
        const cacheKey = `oracle_documentos_data_v2_${connId}_${currentVersion}_${getPeriodCacheKey(currentPeriod)}`;
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;

        if (cached) {
          try {
            const rawCached = JSON.parse(cached);
            const normalized = Array.isArray(rawCached) ? rawCached.map((r: any) => {
              if (!r || typeof r !== 'object') return r;
              const clean: Record<string, any> = {};
              for (const [k, v] of Object.entries(r)) {
                let key = k.replace(/"/g, '').trim();
                if (key === 'CÃ“DIGO' || key === 'CODIGO' || key === 'CD_DOCUMENTO') key = 'CÓDIGO';
                else if (key === 'DOCUMENTO CLÍNICO' || key === 'DS_DOCUMENTO' || key === 'NM_TITULO') key = 'NOME';
                else if (key === 'ÃšLTIMO USO' || key === 'ULTIMO USO' || key === 'LTIMO USO') key = 'ÚLTIMO USO';
                clean[key] = v;
              }
              return clean;
            }) : rawCached;
            setOracleData(normalized);
          } catch {
            fetchInitialData(true, currentVersion, currentPeriod);
          }
        } else {
          fetchInitialData(false, currentVersion, currentPeriod);
        }
      })
      .catch(err => {
        console.error('Erro ao carregar conexões:', err);
        fetchInitialData(false, currentVersion, currentPeriod);
      });

    return () => {
      isCurrent = false;
    };
  }, [docVersion, periodFilter]);

  // Carrega documentos do Oracle
  async function fetchInitialData(isManual = false, versionOverride?: 'V2' | 'V3', periodOverride?: PeriodFilter) {
    if (loading && !periodOverride) return;
    const targetVersion = versionOverride || docVersion || 'V3';
    const targetPeriod = periodOverride || periodFilter;
    setLoading(true);
    setError('');
    
    if (isManual) setOracleData(null);
    
    try {
      const resData = await fetch('/api/connections');
      const storage = await resData.json();
      
      const active = storage.connections?.find((c: any) => c.id === storage.activeConnectionId);
      if (active) setActiveConnName(active.name);
      const hospitals = storage.hospitalsMapping ? storage.hospitalsMapping.filter((h: any) => h.ativo) : [];
      setActiveHospitals(hospitals);
      if (active) {
        setActiveConnInfo({
          id: active.id,
          name: active.name,
          activeHospitals: hospitals
        });
      }

      if (!storage.activeConnectionId) {
        setError('Nenhuma conexão ativa configurada. Vá em Configurações > Conexões.');
        setLoading(false);
        return;
      }

      const execRes = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'DOCUMENTOS',
          version: targetVersion,
          period: targetPeriod,
          forceRefresh: isManual
        })
      });

      const execData = await execRes.json();
      if (!execRes.ok || execData.error) {
        setError(execData.error || 'Falha ao executar consulta no Oracle.');
        setOracleData([]);
      } else {
        const rawRows = execData.rows || [];
        const rows = rawRows.map((r: any) => {
          if (!r || typeof r !== 'object') return r;
          const clean: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            let key = k.replace(/"/g, '').trim();
            if (key === 'CÃ“DIGO' || key === 'CODIGO' || key === 'CD_DOCUMENTO') key = 'CÓDIGO';
            else if (key === 'DOCUMENTO CLÍNICO' || key === 'DS_DOCUMENTO' || key === 'NM_TITULO') key = 'NOME';
            else if (key === 'ÃšLTIMO USO' || key === 'ULTIMO USO' || key === 'LTIMO USO') key = 'ÚLTIMO USO';
            clean[key] = v;
          }
          return clean;
        });
        setOracleData(rows);
        const connId = active?.id || storage.activeConnectionId || 'default';
        safeSessionSetItem(`oracle_documentos_data_v2_${connId}_${targetVersion}_${getPeriodCacheKey(targetPeriod)}`, JSON.stringify(rows));
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com a API.');
    } finally {
      setLoading(false);
    }
  }


  async function fetchProfile(docId: string, force = false) {
    const activeVersion = docVersion || 'V3';
    const cacheKey = `profile_${docId}_${activeVersion}`;
    if (!force) {
      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        setProfileData(cached);
        setProfileError(null);
        return;
      }
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'PROFILE',
          version: activeVersion,
          params: { CD_DOCUMENTO: String(docId).trim() },
          forceRefresh: force
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setProfileError(result.error || `Erro HTTP ${res.status} ao carregar perfis vinculados.`);
        setProfileData([]);
      } else {
        const rows = result.rows || [];
        setProfileData(rows);
        setCached(cacheKey, rows);
      }
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
      setProfileError('Falha de comunicação com o servidor Oracle ao buscar perfis.');
    } finally {
      setProfileLoading(false);
    }
  }

  // Dispara busca unificada para o Modal de Detalhes e Perfis
  useEffect(() => {
    if (modalDoc?.id && modalOpen) {
      fetchMetadata(modalDoc.id);
      fetchActions(modalDoc.id);
      fetchRules(modalDoc.id);
      fetchFields(modalDoc.id);
      fetchProfile(modalDoc.id);
    } else if (!modalOpen) {
      setMetadata([]);
      setMetadataError(null);
      setMetadataActions([]);
      setMetadataActionsError(null);
      setMetadataRules([]);
      setMetadataRulesError(null);
      setMetadataFields([]);
      setMetadataFieldsError(null);
      setProfileData([]);
      setProfileError(null);
    }
  }, [modalDoc?.id, modalOpen, docVersion]);

  const handleRefreshModal = () => {
    if (!modalDoc?.id) return;
    fetchMetadata(modalDoc.id, true);
    fetchActions(modalDoc.id, true);
    fetchRules(modalDoc.id, true);
    fetchFields(modalDoc.id, true);
    fetchProfile(modalDoc.id, true);
  };

  async function fetchMetadata(docId: string, force = false) {
    const activeVersion = docVersion || 'V3';
    const cacheKey = `meta_v2_${docId}_${activeVersion}`;
    if (!force) {
      const cached = getCached<any[]>(cacheKey);
      const isValidCache =
        Array.isArray(cached) &&
        (cached.length === 0 ||
          ('SN_PUBLICADO' in cached[0] &&
            'TP_VERSAO' in cached[0] &&
            'VALOR_VERSAO' in cached[0] &&
            'QUANTIDADE_CAMPOS' in cached[0]));
      if (isValidCache) {
        setMetadata(cached);
        setMetadataError(null);
        return;
      }
    }
    setMetadataLoading(true);
    setMetadataError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'METADATA',
          version: activeVersion,
          params: { CD_DOCUMENTO: String(docId).trim() },
          forceRefresh: force
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setMetadataError(result.error || `Erro HTTP ${res.status} ao carregar metadados técnicos.`);
        setMetadata([]);
      } else {
        const rows = result.rows || [];
        setMetadata(rows);
        setCached(cacheKey, rows);
      }
    } catch (err) {
      console.error('Erro ao carregar metadados técnicos:', err);
      setMetadataError('Falha de comunicação com o servidor Oracle. Verifique a conexão ativa.');
    } finally {
      setMetadataLoading(false);
    }
  }

  async function fetchActions(docId: string, force = false) {
    const activeVersion = docVersion || 'V3';
    const cacheKey = `actions_${docId}_${activeVersion}`;
    if (!force) {
      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        setMetadataActions(cached);
        setMetadataActionsError(null);
        return;
      }
    }
    setMetadataActionsLoading(true);
    setMetadataActionsError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'ACTIONS',
          version: activeVersion,
          params: { CD_DOCUMENTO: String(docId).trim() },
          forceRefresh: force
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setMetadataActionsError(result.error || `Erro HTTP ${res.status} ao carregar vínculos SQL.`);
      } else {
        const rows = result.rows || [];
        setMetadataActions(rows);
        setCached(cacheKey, rows);
      }
    } catch (err: any) {
      setMetadataActionsError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataActionsLoading(false);
    }
  }

  async function fetchRules(docId: string, force = false) {
    const activeVersion = docVersion || 'V3';
    const cacheKey = `rules_v2_${docId}_${activeVersion}`;
    if (!force) {
      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        setMetadataRules(cached);
        setMetadataRulesError(null);
        return;
      }
    }
    setMetadataRulesLoading(true);
    setMetadataRulesError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'RULES',
          version: activeVersion,
          params: { CD_DOCUMENTO: String(docId).trim() },
          forceRefresh: force
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setMetadataRulesError(result.error || `Erro HTTP ${res.status} ao carregar regras.`);
      } else {
        const rows = result.rows || [];
        setMetadataRules(rows);
        setCached(cacheKey, rows);
      }
    } catch (err: any) {
      setMetadataRulesError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataRulesLoading(false);
    }
  }

  async function fetchFields(docId: string, force = false) {
    const activeVersion = docVersion || 'V3';
    const cacheKey = `fields_v2_${docId}_${activeVersion}`;
    if (!force) {
      const cached = getCached<any[]>(cacheKey);
      if (cached) {
        setMetadataFields(cached);
        setMetadataFieldsError(null);
        return;
      }
    }
    setMetadataFieldsLoading(true);
    setMetadataFieldsError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'FIELDS',
          version: activeVersion,
          params: { CD_DOCUMENTO: String(docId).trim() },
          forceRefresh: force
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setMetadataFieldsError(result.error || `Erro HTTP ${res.status} ao carregar campos.`);
      } else {
        const rows = result.rows || [];
        setMetadataFields(rows);
        setCached(cacheKey, rows);
      }
    } catch (err: any) {
      setMetadataFieldsError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataFieldsLoading(false);
    }
  }

  // --- Filtros e Ordenação ---
  const filteredData = useMemo(() => {
    let data = [...(oracleData || [])];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(lower)
        )
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      const sortKey = sortConfig.key;
      data.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const isNumA = !isNaN(Number(valA));
        const isNumB = !isNaN(Number(valB));
        if (isNumA && isNumB) {
          return sortConfig.direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return sortConfig.direction === 'asc' 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
    }

    return data;
  }, [oracleData, searchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, oracleData]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Colunas disponíveis
  const columns = useMemo(() => {
    if (!oracleData || oracleData.length === 0) return ['CÓDIGO', 'NOME', 'TOTAL', 'ÚLTIMO USO'];
    const rawKeys = Object.keys(oracleData[0]).map(k => k.replace(/"/g, '').trim());
    const fixedOrder = ['CÓDIGO', 'NOME'];
    const standardMetricCols = ['TOTAL', 'ÚLTIMO USO'];

    const hospitalAndOtherCols = rawKeys.filter(c => 
      !fixedOrder.includes(c) && 
      c !== 'DOCUMENTO CLÍNICO' && 
      c !== 'CD_DOCUMENTO' && 
      c !== 'DS_DOCUMENTO' &&
      c !== 'NM_TITULO' &&
      !standardMetricCols.includes(c)
    );

    const metricsPresent = standardMetricCols.filter(m => rawKeys.includes(m));

    return [...fixedOrder, ...metricsPresent, ...hospitalAndOtherCols];
  }, [oracleData]);

  // Handler de Ordenação
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key: direction ? key : '', direction });
  };

  // Redimensionamento de Colunas
  const handleResizeStart = (colName: string, e: React.MouseEvent) => {
    e.preventDefault();
    const isName = colName.toUpperCase() === 'NOME';
    const currentWidth = columnWidths[colName] || (isName ? 260 : 75);
    resizingCol.current = { name: colName, startX: e.pageX, startWidth: currentWidth };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = moveEvent.pageX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + delta);
      setColumnWidth(resizingCol.current.name, newWidth);
    };

    const handleMouseUp = () => {
      resizingCol.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Alternar Filtros de Unidades Hospitalares
  const toggleHospital = (sigla: string) => {
    setSelectedHospitals(prev => 
      prev.includes(sigla) ? prev.filter(s => s !== sigla) : [...prev, sigla]
    );
  };

  // Exportação CSV com BOM UTF-8
  const handleExportCSV = () => {
    if (!filteredData.length) return;
    const exportColumns = columns;
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
      return `"${s}"`;
    };

    const headers = exportColumns.map(c => `"${c}"`);
    const rows = filteredData.map(row => 
      exportColumns.map(col => escapeCSV(row[col] ?? '')).join(';')
    );

    const csvContent = [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `governanca_documentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* 1. Header Padronizado */}
      <div className="pb-3 border-b border-[var(--border)]">
        <PageHeader
          title="Catálogo Mestre de Documentos Clínicos"
          subtitle="Matriz de Adesão e Utilização em Todas as Unidades"
          icon={FileText}
          badge={
            <Badge
              variant="outline"
              suppressHydrationWarning
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)]"
            >
              Motor {docVersion || 'V3'}
            </Badge>
          }
          action={
            <PeriodSelector value={periodFilter} onChange={setPeriodFilter} disabled={loading} />
          }
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3.5 tone-danger border rounded-2xl flex items-center gap-3 text-xs font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Toolbar */}
      <DocumentosToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        loading={loading}
        onRefresh={() => fetchInitialData(true)}
        onExport={handleExportCSV}
        onPrint={() => window.print()}
        activeHospitals={activeHospitals}
        selectedHospitals={selectedHospitals}
        toggleHospital={toggleHospital}
        selectAllHospitals={() => setSelectedHospitals([])}
        clearHospitalFilter={() => setSelectedHospitals([])}
        totalFiltered={filteredData.length}
        totalDocs={oracleData?.length || 0}
      />

      {/* Main Content: Documentos Table / Cards Grid */}
      {viewMode === 'table' ? (
        <DocumentosTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          sortConfig={sortConfig}
          onSort={handleSort}
          onOpenModal={handleOpenDocumentModal}
          activeHospitals={activeHospitals}
          selectedHospitals={selectedHospitals}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalFiltered={filteredData.length}
          columnWidths={columnWidths}
          onResizeStart={handleResizeStart}
        />
      ) : (
        <DocumentosCardsGrid
          data={paginatedData}
          loading={loading}
          onOpenModal={handleOpenDocumentModal}
          activeHospitals={activeHospitals}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalFiltered={filteredData.length}
        />
      )}

      {/* Modal Central Unificado (Metadados, Regras, Campos & Perfis) */}
      <DocumentDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        docId={modalDoc?.id || null}
        docName={modalDoc?.name}
        docVersion={docVersion || 'V3'}
        initialTab={modalDoc?.initialTab || 'specs'}
        metadata={metadata}
        loading={metadataLoading}
        metadataError={metadataError}
        actions={metadataActions}
        actionsLoading={metadataActionsLoading}
        actionsError={metadataActionsError}
        rules={metadataRules}
        rulesLoading={metadataRulesLoading}
        rulesError={metadataRulesError}
        fields={metadataFields}
        fieldsLoading={metadataFieldsLoading}
        fieldsError={metadataFieldsError}
        profiles={profileData}
        profilesLoading={profileLoading}
        profilesError={profileError}
        onRefresh={handleRefreshModal}
      />
    </div>
  );
}
