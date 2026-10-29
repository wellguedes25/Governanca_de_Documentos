"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DocumentosToolbar } from '@/components/documentos/DocumentosToolbar';
import { DocumentosTable } from '@/components/documentos/DocumentosTable';
import { DocumentosCardsGrid } from '@/components/documentos/DocumentosCardsGrid';
import { DocumentDetailsDrawer } from '@/components/documentos/DocumentDetailsDrawer';
import { DocumentProfilesDrawer } from '@/components/documentos/DocumentProfilesDrawer';
import { AmbulatoryProfilesView } from '@/components/documentos/AmbulatoryProfilesView';

export default function DocumentosPage() {
  const { oracleData, setOracleData, columnWidths, setColumnWidth, docVersion } = useUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeConnName, setActiveConnName] = useState('');
  const [activeHospitals, setActiveHospitals] = useState<{ id: number; sigla: string }[]>([]);
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [density, setDensity] = useState<'compact' | 'normal'>('normal');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: docVersion === 'V3' ? 'ULT. GERAL' : 'ÚLTIMO USO',
    direction: 'desc'
  });
  const pageSize = 25;

  // Estados de Abas
  const [activeMainTab, setActiveMainTab] = useState<'documentos' | 'perfis'>('documentos');

  // Estados para Gaveta Inferior de Perfis Ambulatoriais
  const [profilesDrawerOpen, setProfilesDrawerOpen] = useState(false);
  const [profilesDocInfo, setProfilesDocInfo] = useState<{ id: string; name: string } | null>(null);
  const [profileData, setProfileData] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleOpenProfiles = (code: string, name?: string) => {
    setProfilesDocInfo({ id: code, name: name || `Documento #${code}` });
    setProfilesDrawerOpen(true);
    fetchProfile(code);
  };

  // Estados para Drawer de Metadados Técnicos
  const [sidebarDoc, setSidebarDoc] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataActions, setMetadataActions] = useState<any[]>([]);
  const [metadataActionsLoading, setMetadataActionsLoading] = useState(false);
  const [metadataActionsError, setMetadataActionsError] = useState<string | null>(null);
  const [metadataRules, setMetadataRules] = useState<any[]>([]);
  const [metadataRulesLoading, setMetadataRulesLoading] = useState(false);
  const [metadataRulesError, setMetadataRulesError] = useState<string | null>(null);

  const [metadataFields, setMetadataFields] = useState<any[]>([]);
  const [metadataFieldsLoading, setMetadataFieldsLoading] = useState(false);
  const [metadataFieldsError, setMetadataFieldsError] = useState<string | null>(null);

  // Estados para Perfis Ambulatoriais
  const [ambulatoryProfilesData, setAmbulatoryProfilesData] = useState<any[]>([]);
  const [ambulatoryProfilesLoading, setAmbulatoryProfilesLoading] = useState(false);
  const [ambulatoryProfilesError, setAmbulatoryProfilesError] = useState('');
  const [selectedPerfilId, setSelectedPerfilId] = useState<string | null>(null);
  const [profileDetailsCache, setProfileDetailsCache] = useState<Record<string, any>>({});
  const [profileDetailsLoading, setProfileDetailsLoading] = useState(false);

  // Controle de redimensionamento de colunas
  const resizingCol = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  // Carregamento inicial de conexões e hospitais
  useEffect(() => {
    const currentVersion = docVersion || (typeof window !== 'undefined' ? (sessionStorage.getItem('app_doc_version') as 'V2' | 'V3') : null) || 'V2';
    const cacheKey = `oracle_documentos_data_${currentVersion}`;
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
    
    if (cached) {
      try {
        setOracleData(JSON.parse(cached));
      } catch (e) {
        console.error('Erro ao ler cache:', e);
      }
    } else {
      setOracleData(null);
    }
    
    fetch('/api/connections')
      .then(res => res.json())
      .then(storage => {
        const active = storage.connections?.find((c: any) => c.id === storage.activeConnectionId);
        if (active) setActiveConnName(active.name);
        if (storage.hospitalsMapping) {
          setActiveHospitals(storage.hospitalsMapping.filter((h: any) => h.ativo));
        }
        if (!cached) {
          fetchInitialData(true, currentVersion);
        }
      })
      .catch(err => console.error('Erro ao carregar conexões:', err));
  }, [docVersion]);

  // Carrega documentos do Oracle
  async function fetchInitialData(isManual = false, versionOverride?: 'V2' | 'V3') {
    if (loading) return;
    const targetVersion = versionOverride || docVersion || (typeof window !== 'undefined' ? (sessionStorage.getItem('app_doc_version') as 'V2' | 'V3') : null) || 'V2';
    setLoading(true);
    setError('');
    
    if (isManual) setOracleData(null);
    
    try {
      const resData = await fetch('/api/connections');
      const storage = await resData.json();
      
      const active = storage.connections?.find((c: any) => c.id === storage.activeConnectionId);
      if (active) setActiveConnName(active.name);

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
          version: targetVersion
        })
      });

      const execData = await execRes.json();
      if (!execRes.ok || execData.error) {
        setError(execData.error || 'Falha ao executar consulta no Oracle.');
        setOracleData([]);
      } else {
        const rows = execData.rows || [];
        setOracleData(rows);
        sessionStorage.setItem(`oracle_documentos_data_${targetVersion}`, JSON.stringify(rows));
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com a API.');
    } finally {
      setLoading(false);
    }
  }


  async function fetchProfile(docId: string) {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'PROFILE', 
          version: docVersion || 'V2',
          params: { CD_DOCUMENTO: docId } 
        })
      });
      const result = await res.json();
      setProfileData(result.rows || []);
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
    } finally {
      setProfileLoading(false);
    }
  }

  // Dispara busca de metadados para o Drawer
  useEffect(() => {
    if (sidebarDoc && sidebarOpen) {
      fetchMetadata(sidebarDoc);
      fetchActions(sidebarDoc);
      fetchRules(sidebarDoc);
      fetchFields(sidebarDoc);
    } else if (!sidebarOpen) {
      setMetadata([]);
      setMetadataActions([]);
      setMetadataActionsError(null);
      setMetadataRules([]);
      setMetadataRulesError(null);
      setMetadataFields([]);
      setMetadataFieldsError(null);
    }
  }, [sidebarDoc, sidebarOpen, docVersion]);

  async function fetchMetadata(docId: string) {
    setMetadataLoading(true);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'METADATA', 
          version: docVersion || 'V2',
          params: { CD_DOCUMENTO: docId } 
        })
      });
      const result = await res.json();
      setMetadata(result.rows || []);
    } catch (err) {
      console.error('Erro ao carregar metadados técnicos:', err);
    } finally {
      setMetadataLoading(false);
    }
  }

  async function fetchActions(docId: string) {
    setMetadataActionsLoading(true);
    setMetadataActionsError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'ACTIONS', 
          version: docVersion || 'V2',
          params: { CD_DOCUMENTO: docId } 
        })
      });
      const result = await res.json();
      if (result.error) {
        setMetadataActionsError(result.error);
      } else {
        setMetadataActions(result.rows || []);
      }
    } catch (err: any) {
      setMetadataActionsError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataActionsLoading(false);
    }
  }

  async function fetchRules(docId: string) {
    setMetadataRulesLoading(true);
    setMetadataRulesError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'RULES', 
          version: docVersion || 'V3',
          params: { CD_DOCUMENTO: docId } 
        })
      });
      const result = await res.json();
      if (result.error) {
        setMetadataRulesError(result.error);
      } else {
        setMetadataRules(result.rows || []);
      }
    } catch (err: any) {
      setMetadataRulesError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataRulesLoading(false);
    }
  }

  async function fetchFields(docId: string) {
    setMetadataFieldsLoading(true);
    setMetadataFieldsError(null);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'FIELDS', 
          params: { CD_DOCUMENTO: docId } 
        })
      });
      const result = await res.json();
      if (result.error) {
        setMetadataFieldsError(result.error);
      } else {
        setMetadataFields(result.rows || []);
      }
    } catch (err: any) {
      setMetadataFieldsError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataFieldsLoading(false);
    }
  }

  // Perfis Ambulatoriais (Aba Secundária)
  const fetchAmbulatoryProfiles = async () => {
    if (ambulatoryProfilesData.length > 0) return;
    setAmbulatoryProfilesLoading(true);
    setAmbulatoryProfilesError('');
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'AMBULATORY_PROFILES' })
      });
      const result = await res.json();
      if (res.ok) {
        setAmbulatoryProfilesData(result.rows || []);
      } else {
        setAmbulatoryProfilesError(result.error || 'Erro ao carregar perfis ambulatoriais.');
      }
    } catch {
      setAmbulatoryProfilesError('Erro de comunicação com o servidor.');
    } finally {
      setAmbulatoryProfilesLoading(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'perfis') {
      fetchAmbulatoryProfiles();
    }
  }, [activeMainTab]);

  // Detalhes do Perfil Ambulatorial Selecionado
  useEffect(() => {
    if (!selectedPerfilId || profileDetailsCache[selectedPerfilId]) return;

    const fetchDetails = async () => {
      setProfileDetailsLoading(true);
      try {
        const res = await fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: 'AMBULATORY_PROFILE_DETAILS',
            params: { CD_PERFIL: selectedPerfilId }
          })
        });
        const result = await res.json();
        
        const modulos: Record<string, any> = {};
        if (result.rows) {
          result.rows.forEach((row: any) => {
            const codPerfilModulo = String(row.COD_PERFIL_MODULO || row.Cod_Perfil_Modulo || '');
            const moduloName = String(row.MODULO || row.Modulo || '');
            const tituloModulo = String(row.TITULO || row.Titulo || '');
            const parametro = String(row.PARAMETRO || row.Parametro || '');
            const valor = String(row.VALOR_PARAMETRO || row.Valor_Parametro || '');
            const descValor = String(row.DESC_VALOR_PARAMETRO || row.Desc_Valor_Parametro || '');

            if (!codPerfilModulo) return;
            if (!modulos[codPerfilModulo]) {
              modulos[codPerfilModulo] = { Titulo: tituloModulo, ModuloId: moduloName, Parametros: [] };
            }
            if (parametro) {
              modulos[codPerfilModulo].Parametros.push({
                Parametro: parametro, Valor: valor, Descricao: descValor
              });
            }
          });
        }
        
        setProfileDetailsCache(prev => ({
          ...prev,
          [selectedPerfilId]: modulos
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setProfileDetailsLoading(false);
      }
    };
    
    fetchDetails();
  }, [selectedPerfilId, profileDetailsCache]);

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
    const cols = Object.keys(oracleData[0]).map(k => k.replace(/"/g, ''));
    // Ordena para garantir CÓDIGO e NOME no início
    const fixed = ['CÓDIGO', 'NOME'];
    const remaining = cols.filter(c => !fixed.includes(c));
    return [...fixed, ...remaining];
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

  // Exportação de Perfis para CSV
  const handleExportPerfilCSV = () => {
    if (!selectedPerfilId || !profileDetailsCache[selectedPerfilId]) return;
    const modulos = profileDetailsCache[selectedPerfilId];
    const rows = [
      ['ID Perfil', selectedPerfilId],
      [],
      ['Módulo ID', 'Módulo', 'Parâmetro', 'Valor Atribuído', 'Descrição']
    ];

    Object.entries(modulos).forEach(([modId, modData]: [string, any]) => {
      const displayModId = modData.ModuloId || modId;
      if (!modData.Parametros || modData.Parametros.length === 0) {
        rows.push([displayModId, modData.Titulo || `Módulo ${displayModId}`, 'Sem parâmetros', '', '']);
      } else {
        modData.Parametros.forEach((param: any) => {
          rows.push([
            displayModId,
            modData.Titulo || `Módulo ${displayModId}`,
            param.Parametro,
            param.Valor || 'Não definido',
            param.Descricao || ''
          ]);
        });
      }
    });

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Perfil_${selectedPerfilId}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col min-h-screen pb-16">
      {/* Page Header */}
      <PageHeader 
        title="Repositório de Documentos Clínicos"
        subtitle="Matriz de Adesão e Utilização em Todas as Unidades ACSC (Oracle DBAMV)"
        icon={FileText}
        badge={activeConnName ? `Oracle: ${activeConnName}` : 'Conectando...'}
      />

      {/* Error Alert */}
      {error && activeMainTab === 'documentos' && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-medium">
          <AlertTriangle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Toolbar */}
      <DocumentosToolbar
        activeTab={activeMainTab}
        setActiveTab={setActiveMainTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        density={density}
        setDensity={setDensity}
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

      {/* Main Content: Documentos Table / Cards Grid or Ambulatory Profiles */}
      {activeMainTab === 'documentos' ? (
        viewMode === 'table' ? (
          <DocumentosTable
            columns={columns}
            data={paginatedData}
            loading={loading}
            density={density}
            sortConfig={sortConfig}
            onSort={handleSort}
            onOpenDrawer={(code) => {
              setSidebarDoc(code);
              setSidebarOpen(true);
            }}
            onOpenProfiles={handleOpenProfiles}
            activeHospitals={activeHospitals}
            selectedHospitals={selectedHospitals}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalFiltered={filteredData.length}
            columnWidths={columnWidths}
            onResizeStart={handleResizeStart}
          />
        ) : (
          <DocumentosCardsGrid
            data={paginatedData}
            loading={loading}
            onOpenDrawer={(code) => {
              setSidebarDoc(code);
              setSidebarOpen(true);
            }}
            onOpenProfiles={handleOpenProfiles}
            activeHospitals={activeHospitals}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalFiltered={filteredData.length}
          />
        )
      ) : (
        <AmbulatoryProfilesView
          data={ambulatoryProfilesData}
          loading={ambulatoryProfilesLoading}
          error={ambulatoryProfilesError}
          selectedPerfilId={selectedPerfilId}
          setSelectedPerfilId={setSelectedPerfilId}
          profileDetailsCache={profileDetailsCache}
          profileDetailsLoading={profileDetailsLoading}
          onExportCSV={handleExportPerfilCSV}
        />
      )}

      {/* Technical Details Drawer */}
      <DocumentDetailsDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        docId={sidebarDoc}
        metadata={metadata}
        loading={metadataLoading}
        actions={metadataActions}
        actionsLoading={metadataActionsLoading}
        actionsError={metadataActionsError}
        rules={metadataRules}
        rulesLoading={metadataRulesLoading}
        rulesError={metadataRulesError}
        fields={metadataFields}
        fieldsLoading={metadataFieldsLoading}
        fieldsError={metadataFieldsError}
      />

      {/* Bottom Sheet Drawer for Ambulatory Profiles */}
      <DocumentProfilesDrawer
        open={profilesDrawerOpen}
        onClose={() => setProfilesDrawerOpen(false)}
        docId={profilesDocInfo?.id || null}
        docName={profilesDocInfo?.name}
        profiles={profileData}
        loading={profileLoading}
        docVersion={docVersion || 'V3'}
      />
    </div>
  );
}
