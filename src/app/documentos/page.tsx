"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Filter, FileText, Download, Check, X, ChevronUp, ChevronDown, ListFilter, XCircle, FileSpreadsheet, Printer, AlertTriangle, Loader2, Info, Settings, Zap, Unlink, Database, ChevronRight, Layout } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DocumentosPage() {
  const { oracleData, setOracleData, columnWidths, setColumnWidth, docVersion } = useUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeConnName, setActiveConnName] = useState('');
  const [activeHospitals, setActiveHospitals] = useState<{id: number, sigla: string}[]>([]);
  const [inactiveHospitals, setInactiveHospitals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState({ CÓDIGO: '', NOME: '', EMPRESA: '' });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: docVersion === 'V3' ? 'ULT. GERAL' : 'ÚLTIMO USO', direction: 'desc' });
  const pageSize = 20;

  // Estados para Detalhamento de Perfil (Drill-down)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileCurrentPage, setProfileCurrentPage] = useState(1);
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [profileUnitFilter, setProfileUnitFilter] = useState('');
  const profilePageSize = 5;

  // Estados para Sidebar de Informações Técnicas
  const [sidebarDoc, setSidebarDoc] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataActions, setMetadataActions] = useState<any[]>([]);
  const [metadataActionsLoading, setMetadataActionsLoading] = useState(false);
  const [metadataActionsError, setMetadataActionsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'history' | 'actions'>('specs');
  const [actionsFilterDoc, setActionsFilterDoc] = useState<string | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<'documentos' | 'perfis'>('documentos');

  // Estados para a aba Perfis Ambulatoriais
  const [ambulatoryProfilesData, setAmbulatoryProfilesData] = useState<any[]>([]);
  const [ambulatoryProfilesLoading, setAmbulatoryProfilesLoading] = useState(false);
  const [ambulatoryProfilesError, setAmbulatoryProfilesError] = useState('');
  const [selectedPerfilId, setSelectedPerfilId] = useState<string | null>(null);
  const [perfisSearchTerm, setPerfisSearchTerm] = useState('');
  const [perfisCurrentPage, setPerfisCurrentPage] = useState(1);
  const perfisPageSize = 5;

  const [profileDetailsCache, setProfileDetailsCache] = useState<Record<string, any>>({});
  const [profileDetailsLoading, setProfileDetailsLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedModules({});
  }, [selectedPerfilId]);

  const fetchAmbulatoryProfiles = async () => {
    if (ambulatoryProfilesData.length > 0) return; // já carregado
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
    } catch (err: any) {
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

  useEffect(() => {
    if (!selectedPerfilId) return;
    if (profileDetailsCache[selectedPerfilId]) return;

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
            const codPerfilModulo = String(row.COD_PERFIL_MODULO || row.Cod_Perfil_Modulo || row['\"COD_PERFIL_MODULO\"'] || '');
            const moduloName = String(row.MODULO || row.Modulo || row['\"MODULO\"'] || '');
            const tituloModulo = String(row.TITULO || row.Titulo || row['\"TITULO\"'] || '');
            const parametro = String(row.PARAMETRO || row.Parametro || row['\"PARAMETRO\"'] || '');
            const valor = String(row.VALOR_PARAMETRO || row.Valor_Parametro || row['\"VALOR_PARAMETRO\"'] || '');
            const descValor = String(row.DESC_VALOR_PARAMETRO || row.Desc_Valor_Parametro || row['\"DESC_VALOR_PARAMETRO\"'] || '');

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

  const masterPerfisList = useMemo(() => {
    return ambulatoryProfilesData.map(row => ({
      id: String(row.COD_PERFIL || row.Cod_Perfil || row['\"COD_PERFIL\"'] || ''),
      Nome_Perfil: String(row.NOME_PERFIL || row.Nome_Perfil || row['\"NOME_PERFIL\"'] || ''),
      Especialidade: String(row.ESPECIALIDADE || row.Especialidade || row['\"ESPECIALIDADE\"'] || ''),
      Sistema: String(row.SISTEMA || row.Sistema || row['\"SISTEMA\"'] || ''),
    })).filter(p => p.id);
  }, [ambulatoryProfilesData]);

  const groupedPerfis = useMemo(() => {
    const groups: Record<string, any> = {};
    masterPerfisList.forEach(p => { groups[p.id] = p; });
    return groups;
  }, [masterPerfisList]);

  const filteredPerfisList = useMemo(() => {
    let list = masterPerfisList;
    if (perfisSearchTerm) {
      const term = perfisSearchTerm.toLowerCase();
      list = list.filter(p => 
        p.Nome_Perfil.toLowerCase().includes(term) || 
        p.id.toLowerCase().includes(term) ||
        p.Especialidade.toLowerCase().includes(term)
      );
    }
    return list;
  }, [masterPerfisList, perfisSearchTerm]);

  useEffect(() => {
    setPerfisCurrentPage(1);
  }, [perfisSearchTerm]);

  const perfisTotalPages = Math.ceil(filteredPerfisList.length / perfisPageSize);
  const paginatedPerfisList = useMemo(() => {
    const start = (perfisCurrentPage - 1) * perfisPageSize;
    return filteredPerfisList.slice(start, start + perfisPageSize);
  }, [filteredPerfisList, perfisCurrentPage]);

  const exportPerfisToCSV = () => {
    if (!selectedPerfilId) return;
    const perfil = groupedPerfis[selectedPerfilId];
    const modulos = profileDetailsCache[selectedPerfilId];
    if (!perfil || !modulos) return;

    const rows = [
      ['Perfil', perfil.Nome_Perfil],
      ['Sistema', perfil.Sistema || ''],
      ['Especialidade', perfil.Especialidade || ''],
      [],
      ['Módulo ID', 'Módulo', 'Parâmetro', 'Valor Atribuído', 'Descrição']
    ];

    Object.entries(modulos).forEach(([modId, modData]: [string, any]) => {
      const displayModId = modData.ModuloId || modId;
      if (modData.Parametros.length === 0) {
        rows.push([displayModId, modData.Titulo || `Módulo ${displayModId}`, 'Nenhum parâmetro vinculado', '', '']);
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

    const csvContent = rows.map(r => r.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\\n')) {
        return '"' + cellStr.replace(/"/g, '""') + '"';
      }
      return cellStr;
    }).join(',')).join('\\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Perfil_${selectedPerfilId}.csv`;
    link.click();
  };

  // Extrair documentos únicos relacionados para filtros no topo
  const uniqueRelatedDocs = useMemo(() => {
    const docs = new Set<string>();
    metadataActions.forEach(action => {
      if (action.DOCUMENTO_RELACIONADO) docs.add(String(action.DOCUMENTO_RELACIONADO));
      if (action.GRUPO_DOCS_RELACIONADOS) {
        action.GRUPO_DOCS_RELACIONADOS.split(',').forEach((id: string) => {
          const trimmed = id.trim();
          if (trimmed) docs.add(trimmed);
        });
      }
    });
    return Array.from(docs).sort((a, b) => Number(a) - Number(b));
  }, [metadataActions]);
  
  // Ref para controle de redimensionamento
  const resizingCol = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  // Carregamento inicial e sincronização sensível à versão (V2 / V3)
  useEffect(() => {
    const currentVersion = docVersion || (typeof window !== 'undefined' ? (sessionStorage.getItem('app_doc_version') as 'V2' | 'V3') : null) || 'V2';
    const cacheKey = `oracle_documentos_data_${currentVersion}`;
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setOracleData(parsed);
      } catch (e) {
        console.error('Erro ao ler cache:', e);
      }
    } else {
      setOracleData(null);
    }
    
    // Sempre busca o nome da conexão ativa
    fetch('/api/connections').then(res => res.json()).then(storage => {
      const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
      if (active) setActiveConnName(active.name);
      if (storage.hospitalsMapping) {
        setActiveHospitals(storage.hospitalsMapping.filter((h: any) => h.ativo));
        setInactiveHospitals(storage.hospitalsMapping.filter((h: any) => !h.ativo).map((h: any) => h.sigla.toUpperCase()));
      }
      
      // Se não tem dados para esta versão, busca no Oracle
      if (!cached) {
        fetchInitialData(true, currentVersion);
      }
    });
  }, [docVersion]);

  // Dispara busca de perfis ao selecionar documento
  useEffect(() => {
    if (selectedDoc) {
      setProfileCurrentPage(1);
      setProfileSearchTerm('');
      setProfileUnitFilter('');
      fetchProfile(selectedDoc);
    } else {
      setProfileData([]);
    }
  }, [selectedDoc]);

  // Dispara busca de metadados para o sidebar
  useEffect(() => {
    if (sidebarDoc && sidebarOpen) {
      fetchMetadata(sidebarDoc);
      fetchActions(sidebarDoc);
      setActionsFilterDoc(null);
    } else if (!sidebarOpen) {
      setMetadata([]);
      setMetadataActions([]);
      setMetadataActionsError(null);
      setActionsFilterDoc(null);
    }
  }, [sidebarDoc, sidebarOpen, docVersion]);

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
      console.error('Erro ao carregar vínculos SQL:', err);
      setMetadataActionsError('Falha na comunicação com o servidor.');
    } finally {
      setMetadataActionsLoading(false);
    }
  }

  // --- Função para capturar data estável ---
  const [reportDate, setReportDate] = useState('');
  useEffect(() => {
    setReportDate(new Date().toLocaleString('pt-BR'));
  }, []);

  // --- Funções de Exportação ---
  const exportToCSV = () => {
    const dataToExport = filteredProfileData.length ? filteredProfileData : profileData;
    if (!dataToExport.length) return;
    
    // Função auxiliar para escapar CSV padrão (delimitador vírgula)
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      let s = String(val).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
      return `"${s}"`;
    };

    const headers = ['Cód. Doc', 'Nome Documento', 'Perfil Ambulatorial', 'Empresa'];
    const rows = dataToExport.map(p => [
      escapeCSV(p.CD_DOCUMENTO || selectedDoc),
      escapeCSV(p.NM_TITULO || '-'),
      escapeCSV(p.DS_PERFIL_AMBULATORIAL || '-'),
      escapeCSV(p.EMPRESA || '-')
    ]);
    
    // Gera o conteúdo CSV com BOM UTF-8 para garantir acentuação
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Cria o link, anexa ao DOM (essencial para alguns navegadores) e dispara clique
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', `perfis_doc_${selectedDoc}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Limpeza
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    window.print();
  };



  // Removido useEffect duplicado que estava no fim do bloco de estados

  async function fetchInitialData(isManual = false, versionOverride?: 'V2' | 'V3') {
    if (loading) return; // Evita chamadas duplicadas
    
    const targetVersion = versionOverride || docVersion || (typeof window !== 'undefined' ? (sessionStorage.getItem('app_doc_version') as 'V2' | 'V3') : null) || 'V2';
    setLoading(true);
    setError('');
    
    if (isManual) {
      setOracleData(null); // Limpa dados atuais para mostrar o spinner corretamente
    }
    
    try {
      const resData = await fetch('/api/connections');
      const storage = await resData.json();
      
      const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
      if (active) setActiveConnName(active.name);

      if (!storage.activeConnectionId) {
        setError('Nenhuma conexão ativa selecionada. Vá em Configurações > Conexões.');
        setLoading(false);
        return;
      }

      const execRes = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'EXECUTE', query: targetVersion }),
      });
      
      const result = await execRes.json();
      if (execRes.ok) {
        const rows = result.rows || [];
        setOracleData(rows);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`oracle_documentos_data_${targetVersion}`, JSON.stringify(rows));
          sessionStorage.setItem('oracle_documentos_data', JSON.stringify(rows));
        }
      } else {
        setError(result.error || 'Erro ao carregar documentos.');
      }
    } catch (err: any) {
      setError('Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  // --- Lógica de Redimensionamento ---
  const handleMouseDown = (e: React.MouseEvent, colName: string) => {
    e.preventDefault();
    const isName = colName.toUpperCase() === 'NOME';
    const currentWidth = columnWidths[colName] || (isName ? 150 : 65);
    resizingCol.current = { name: colName, startX: e.pageX, startWidth: currentWidth };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.pageX - resizingCol.current.startX;
    const newWidth = Math.max(50, resizingCol.current.startWidth + delta);
    setColumnWidth(resizingCol.current.name, newWidth);
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- Reatividade de Filtros ---
  useEffect(() => {
    // Se todos os filtros estiverem vazios, limpa a seleção e os perfis
    const isFiltersEmpty = !columnFilters.CÓDIGO && !columnFilters.NOME && (columnFilters.EMPRESA === '' || !columnFilters.EMPRESA);
    if (isFiltersEmpty) {
      setSelectedDoc(null);
      setProfileData([]);
    }
  }, [columnFilters]);

  // --- Filtro e Ordenação ---
  const filteredData = useMemo(() => {
    let data = [...(oracleData || [])];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(lowerTerm)
        )
      );
    }
    
    if (columnFilters.CÓDIGO) {
      const term = columnFilters.CÓDIGO.trim();
      data = data.filter(row => {
        const rawKey = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === 'CÓDIGO');
        if (!rawKey) return false;
        const val = String(row[rawKey] || '');
        return val.includes(term);
      });
    }
    
    if (columnFilters.NOME) {
      const term = columnFilters.NOME.trim().toLowerCase();
      data = data.filter(row => {
        const rawKey = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === 'NOME');
        if (!rawKey) return false;
        const val = String(row[rawKey] || '').toLowerCase();
        return val.includes(term);
      });
    }
    
    if (columnFilters.EMPRESA) {
      const empTarget = columnFilters.EMPRESA.toUpperCase();
      data = data.filter(row => {
        const rawKey = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === empTarget);
        if (!rawKey) return false;
        return String(row[rawKey] || '') === '1';
      });
    }

    if (sortConfig.key && sortConfig.direction) {
      const sortKey = sortConfig.key;
      data.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Tentar converter para data se parecer uma data
        const isDateA = !isNaN(Date.parse(String(valA)));
        const isDateB = !isNaN(Date.parse(String(valB)));

        if (isDateA && isDateB) {
          const timeA = new Date(String(valA)).getTime();
          const timeB = new Date(String(valB)).getTime();
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

        const isNumeric = !isNaN(Number(valA)) && !isNaN(Number(valB));
        if (isNumeric) {
          return sortConfig.direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        } else {
          return sortConfig.direction === 'asc' 
            ? String(valA).localeCompare(String(valB)) 
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return data;
  }, [oracleData, searchTerm, columnFilters, sortConfig]);

  // Se a busca resultar em apenas um registro, seleciona automaticamente
  useEffect(() => {
    if (filteredData.length === 1) {
      const docCode = String(filteredData[0]['CÓDIGO'] || filteredData[0]['\"CÓDIGO\"'] || '');
      if (docCode && docCode !== selectedDoc) {
        setSelectedDoc(docCode);
      }
    }
  }, [filteredData, selectedDoc]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key: direction ? key : '', direction });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, oracleData, columnFilters]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  // --- Filtro de Perfis (Drill-down) ---
  const filteredProfileData = useMemo(() => {
    let data = [...profileData];
    
    if (profileSearchTerm) {
      const term = profileSearchTerm.toLowerCase();
      data = data.filter(p => 
        String(p.DS_PERFIL_AMBULATORIAL || '').toLowerCase().includes(term) ||
        String(p.NM_TITULO || '').toLowerCase().includes(term)
      );
    }
    
    if (profileUnitFilter) {
      data = data.filter(p => p.EMPRESA === profileUnitFilter);
    }
    
    return data;
  }, [profileData, profileSearchTerm, profileUnitFilter]);

  const profileTotalPages = Math.ceil(filteredProfileData.length / profilePageSize);
  const paginatedProfileData = useMemo(() => {
    const start = (profileCurrentPage - 1) * profilePageSize;
    return filteredProfileData.slice(start, start + profilePageSize);
  }, [filteredProfileData, profileCurrentPage]);

  return (
    <div className="min-h-screen bg-card flex flex-col p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-20 relative text-foreground font-mono">
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border pb-6">
          <div className="flex-1">
            <PageHeader 
              title="Repositório de Documentos"
              subtitle="Oracle DBAMV Infrastructure"
              icon={FileText}
              badge={activeConnName || 'DISCONNECTED'}
            />
            
            {/* Tabs Selector */}
            <div className="flex items-center gap-4 mt-6 border-b border-border">
              <button
                onClick={() => setActiveMainTab('documentos')}
                className={`pb-2 px-1 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeMainTab === 'documentos' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                Documentos
              </button>
              <button
                onClick={() => setActiveMainTab('perfis')}
                className={`pb-2 px-1 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeMainTab === 'perfis' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                Perfis Ambulatoriais
              </button>
            </div>

            {error && activeMainTab === 'documentos' && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50/20 rounded-none flex items-center gap-3 text-red-500 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} />
                <span className="text-[11px] font-black uppercase tracking-tight">{error}</span>
              </div>
            )}
            
            {ambulatoryProfilesError && activeMainTab === 'perfis' && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50/20 rounded-none flex items-center gap-3 text-red-500 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} />
                <span className="text-[11px] font-black uppercase tracking-tight">{ambulatoryProfilesError}</span>
              </div>
            )}
          </div>

          {activeMainTab === 'documentos' && (
            <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-[var(--primary)] transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Pesquisa global..."
                className="bg-background border border-border rounded-none pl-9 pr-4 py-2 text-xs text-foreground outline-none focus:border-[var(--primary)] w-72 transition-all shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchInitialData(true)}
              disabled={loading}
              className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-foreground rounded-none transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-none"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sincronizar
            </button>
            <button 
              onClick={exportToCSV}
              className="p-2 bg-background -background text-muted hover:text-[var(--primary)] rounded-none border border-border transition-all shadow-none"
            >
              <Download size={16} />
            </button>
          </div>
          )}
        </div>
        
        {activeMainTab === 'documentos' && (
          <>
            <div className="bg-background border border-border rounded-none p-4 flex flex-wrap items-center gap-6 shadow-none animate-in slide-in-from-top duration-700 relative overflow-visible">
          <div className="flex items-center gap-2 text-muted">
            <ListFilter size={18} className="text-[var(--primary)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] min-w-fit">Filtros Técnicos</span>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center gap-4">
            <input 
              type="text" 
              placeholder="CÓDIGO"
              className="bg-card border border-border rounded-none px-4 py-1.5 text-[11px] font-bold text-foreground outline-none focus:border-[var(--primary)] w-28 transition-all"
              value={columnFilters.CÓDIGO}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, CÓDIGO: e.target.value }))}
            />
            <input 
              type="text" 
              placeholder="NOME DO DOCUMENTO"
              className="bg-card border border-border rounded-none px-4 py-1.5 text-[11px] font-bold text-foreground outline-none focus:border-[var(--primary)] flex-1 min-w-[300px] transition-all"
              value={columnFilters.NOME}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, NOME: e.target.value }))}
            />
            <select 
              className="bg-card border border-border rounded-none px-4 py-1.5 text-[11px] font-bold text-foreground outline-none focus:border-[var(--primary)] w-40 transition-all cursor-pointer"
              value={columnFilters.EMPRESA}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, EMPRESA: e.target.value }))}
            >
              <option value="">EMPRESA (TODAS)</option>
              {activeHospitals.map(unit => (
                <option key={unit.sigla} value={unit.sigla}>{unit.sigla}</option>
              ))}
            </select>
          </div>

          {(columnFilters.CÓDIGO || columnFilters.NOME || columnFilters.EMPRESA) && (
            <button 
              onClick={() => {
                setColumnFilters({ CÓDIGO: '', NOME: '', EMPRESA: '' });
                setSelectedDoc(null);
                setProfileData([]);
              }}
              className="px-4 py-1.5 text-[10px] font-black text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-none transition-all flex items-center gap-2 uppercase tracking-tighter"
            >
              <XCircle size={14} /> Limpar Filtros
            </button>
          )}
        </div>

        <div className={`bg-background rounded-none border border-border flex flex-col overflow-hidden shadow-none w-full max-w-full transition-all duration-500 ease-in-out ${selectedDoc && !sidebarOpen ? 'min-h-[300px] max-h-[300px]' : 'min-h-[600px]'}`}>
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 w-full relative">
            {paginatedData.length > 0 ? (
              <table className="w-full text-left border-collapse table-auto select-none min-w-max">
                <thead className="sticky top-0 z-10">
                   <tr className="bg-card shadow-none border-b border-border">
                    <th className="px-2 py-3 w-8 border-r border-border italic font-black -muted text-[9px] text-center">INFO</th>
                    {(() => {
                      const keys = Object.keys(paginatedData[0]);
                      const order = ['CÓDIGO', 'NOME', 'VERSAO', ...activeHospitals.map(h => h.sigla), 'ÚLTIMO USO', 'ULT. GERAL', 'TOTAL', 'ULTIMO REGISTRO'];
                      const sortedKeys = keys.filter((key) => {
                        const cleanKey = key.replace(/"/g, '').toUpperCase();
                        if (inactiveHospitals.includes(cleanKey)) return false;
                        if (inactiveHospitals.some(sigla => cleanKey === `USO ${sigla}`)) return false;
                        return true;
                      }).sort((a, b) => {
                        const indexA = order.indexOf(a.replace(/"/g, '').toUpperCase());
                        const indexB = order.indexOf(b.replace(/"/g, '').toUpperCase());
                        if (indexA === -1 && indexB === -1) return 0;
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                      });
                      
                      return sortedKeys.map((key) => {
                        const cleanKey = key.replace(/"/g, '').toUpperCase();
                        const isName = cleanKey === 'NOME';
                        const isCodigo = cleanKey === 'CÓDIGO';
                        const width = columnWidths[key] || (isName ? 350 : isCodigo ? 50 : 65);
                        return (
                          <th 
                            key={key} 
                            style={{ width, minWidth: width }}
                            onClick={() => handleSort(key)}
                            className={`relative px-4 py-3 text-[10px] font-black text-muted uppercase tracking-[0.2em] hover:text-[var(--primary)] transition-colors border-r border-border whitespace-nowrap cursor-pointer group/th ${isName ? 'overflow-hidden text-ellipsis' : 'text-center'} ${sortConfig.key === key ? 'bg-[var(--primary)]/5 text-[var(--primary)]' : ''}`}
                          >
                            <div className={`flex items-center gap-2 ${!isName ? 'justify-center' : ''}`}>
                              <Filter size={10} className={`transition-colors ${sortConfig.key === key ? 'text-[var(--primary)]' : '-muted group-hover/-muted'}`} />
                              {cleanKey}
                              {sortConfig.key === key && (
                                <span className="text-[var(--primary)]">
                                  {sortConfig.direction === 'asc' ? <ChevronUp size={10} strokeWidth={4} /> : <ChevronDown size={10} strokeWidth={4} />}
                                </span>
                              )}
                            </div>
                            <div 
                              onMouseDown={(e) => handleMouseDown(e, key)}
                              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-[var(--primary)]/20 group/resizer transition-colors"
                            ></div>
                          </th>
                        );
                      });
                    })()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedData.map((row, idx) => {
                    const docCode = String(row['CÓDIGO'] || row['\"CÓDIGO\"'] || '');
                    const isSelected = selectedDoc === docCode;
                    return (
                       <tr 
                        key={idx} 
                        onClick={() => setSelectedDoc(isSelected ? null : docCode)}
                        className={`transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-[var(--primary)]/5 border-[var(--primary)] text-foreground' : '-background border-transparent text-muted'}`}
                      >
                        <td className="px-3 py-2 border-r -border text-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (sidebarOpen && sidebarDoc === docCode) {
                                setSidebarOpen(false);
                              } else {
                                setSidebarDoc(docCode);
                                setSidebarOpen(true);
                              }
                            }}
                            className={`p-1.5 rounded-none transition-all ${sidebarDoc === docCode && sidebarOpen ? 'bg-[var(--primary)] text-foreground' : '-muted hover:text-[var(--primary)] hover:bg-[var(--primary)]/10'}`}
                          >
                            <Info size={14} />
                          </button>
                        </td>
                        {(() => {
                          const entries = Object.entries(row);
                          const order = ['CÓDIGO', 'NOME', 'VERSAO', ...activeHospitals.map(h => h.sigla), 'ÚLTIMO USO', 'ULT. GERAL', 'TOTAL', 'ULTIMO REGISTRO'];
                          const filteredEntries = entries.filter(([key]) => {
                            const cleanKey = key.replace(/"/g, '').toUpperCase();
                            if (inactiveHospitals.includes(cleanKey)) return false;
                            if (inactiveHospitals.some(sigla => cleanKey === `USO ${sigla}`)) return false;
                            return true;
                          });
                          const sortedEntries = filteredEntries.sort((a, b) => {
                            const indexA = order.indexOf(a[0].replace(/"/g, '').toUpperCase());
                            const indexB = order.indexOf(b[0].replace(/"/g, '').toUpperCase());
                            if (indexA === -1 && indexB === -1) return 0;
                            if (indexA === -1) return 1;
                            if (indexB === -1) return -1;
                            return indexA - indexB;
                          });

                          return sortedEntries.map(([key, val], vIdx) => {
                            const cleanKey = key.replace(/"/g, '').toUpperCase();
                            const isName = cleanKey === 'NOME';
                            const isCodigo = cleanKey === 'CÓDIGO';
                            const width = columnWidths[key] || (isName ? 350 : isCodigo ? 50 : 65);
                            const renderValue = () => {
                              if (val === null || val === undefined) return <span className="-muted italic opacity-50">--</span>;
                              const strVal = String(val);
                              const cleanKey = key.replace(/"/g, '').toUpperCase();
                              const companyCols = activeHospitals.map(h => h.sigla);
                              const usageCols = [...activeHospitals.map(h => `USO ${h.sigla}`), 'TOTAL'];
                              
                              if (companyCols.includes(cleanKey)) {
                                if (strVal === '1') return <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 mx-auto shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Ativo" />;
                                if (strVal === '0') return <div className="w-1.5 h-1.5 rounded-none -card mx-auto" title="Inativo" />;
                              }

                              if (usageCols.includes(cleanKey)) {
                                const num = Number(val);
                                if (num > 0) return <span className="font-black text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-0.5 rounded-none border border-[var(--primary)]/10">{num.toLocaleString('pt-BR')}</span>;
                                return <span className="-muted font-normal">0</span>;
                              }

                              const isNameOrCode = cleanKey === 'NOME' || cleanKey === 'CÓDIGO' || cleanKey === 'NM_TITULO' || cleanKey === 'CD_DOCUMENTO';

                              if (!isNameOrCode && (strVal.includes('T') || cleanKey.startsWith('ULT.') || cleanKey.startsWith('DH_')) && !isNaN(Date.parse(strVal))) {
                                return (
                                  <div className="flex flex-col items-center">
                                    <span suppressHydrationWarning className="font-mono text-[9px] text-foreground font-black tracking-tighter">
                                      {new Date(strVal).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span suppressHydrationWarning className="font-mono text-[8px] text-muted font-bold leading-none">
                                      {new Date(strVal).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                );
                              }
                              return strVal;
                            };
                            return (
                              <td 
                                key={vIdx} 
                                style={{ width, minWidth: width }}
                                className={`px-4 py-2 text-[10px] border-r -border last:border-r-0 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${!isName ? 'text-center font-bold' : ''}`}
                              >
                                {renderValue()}
                              </td>
                            );
                          });
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-32">
                <Loader2 className="animate-spin text-zinc-700" size={48} />
                <div className="text-center">
                  <p className="text-[10px] text-muted font-black uppercase tracking-[0.3em]">
                    {loading ? 'Acessando Infraestrutura Oracle...' : 'Nenhum Registro Encontrado'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between px-6 py-3 bg-card border-t border-border text-[10px] font-bold text-muted uppercase tracking-widest">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                PÁGINA <b className="text-foreground">{currentPage}</b> DE <b className="text-muted">{totalPages || 1}</b>
              </span>
              <span className="text-zinc-700 font-normal">|</span>
              <span className="tracking-tighter">
                VOL. ATIVO <b className="text-foreground">{filteredData.length}</b> REGISTROS
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-1.5 rounded-none bg-background border border-border text-muted hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all disabled:opacity-30"
                >
                  VOLTAR
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-1.5 rounded-none bg-card text-foreground -background transition-all disabled:opacity-30"
                >
                  AVANÇAR
                </button>
              </div>
              <span className="text-zinc-700 font-normal">|</span>
              <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-500"></span>
                  <span className="text-emerald-600 font-black">Sincronizado</span>
              </div>
            </div>
          </div>
        </div>

        {selectedDoc && (
          <div id="perfil-detalhes" className="bg-background rounded-none border border-border overflow-hidden animate-in slide-in-from-bottom-6 duration-500 shadow-none relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]"></div>
            <div className="flex items-center justify-between px-8 py-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-none bg-card text-[var(--primary)] border border-border">
                  <ListFilter size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground uppercase tracking-tighter italic">Vínculos de Perfil Automático</h3>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">Hardware ID: <b className="text-[var(--primary)]">{selectedDoc}</b></p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-1 max-w-2xl px-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 -muted" size={12} />
                  <input 
                    type="text"
                    placeholder="Filtrar perfil..."
                    className="w-full bg-card border border-border rounded-none pl-9 pr-4 py-2 text-[10px] font-bold text-foreground outline-none focus:border-[var(--primary)] transition-all uppercase tracking-widest"
                    value={profileSearchTerm}
                    onChange={(e) => {
                      setProfileSearchTerm(e.target.value);
                      setProfileCurrentPage(1);
                    }}
                  />
                </div>
                <select 
                  className="bg-card border border-border rounded-none px-4 py-2 text-[10px] font-bold text-foreground outline-none focus:border-[var(--primary)] w-32 transition-all cursor-pointer uppercase"
                  value={profileUnitFilter}
                  onChange={(e) => {
                    setProfileUnitFilter(e.target.value);
                    setProfileCurrentPage(1);
                  }}
                >
                  <option value="">UNIDADE</option>
                  {activeHospitals.map(unit => (
                    <option key={unit.sigla} value={unit.sigla}>{unit.sigla}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-background -background text-muted rounded-none border border-border transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Excel
                </button>
                <button 
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-background -background text-muted rounded-none border border-border transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <Printer size={16} className="text-muted" />
                  Print
                </button>
                <div className="w-px h-8 -background mx-2"></div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 -background rounded-none text-muted hover:text-red-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <Loader2 className="text-[var(--primary)] animate-spin" size={48} />
                  <span className="text-[10px] text-muted font-black uppercase tracking-[0.4em] animate-pulse">Relacionando Registros...</span>
                </div>
              ) : profileData.length > 0 ? (
                <>
                  <div className="overflow-x-auto border border-border rounded-none -background">
                    <table className="w-full text-left border-collapse table-auto min-w-max">
                      <thead>
                        <tr className="bg-card text-[10px] font-black text-muted uppercase tracking-[0.2em] border-b border-border">
                          <th className="px-8 py-4 border-r border-border whitespace-nowrap">Cód. Interno</th>
                          <th className="px-8 py-4 border-r border-border whitespace-nowrap">Descrição Doc</th>
                          <th className="px-8 py-4 border-r border-border whitespace-nowrap">Perfil Vinculado</th>
                          <th className="px-8 py-4 text-center whitespace-nowrap">Unidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {paginatedProfileData.map((perf, pIdx) => (
                          <tr key={pIdx} className="-background transition-all group -background">
                            <td className="px-8 py-4 text-[11px] text-muted -foreground border-r -border whitespace-nowrap font-mono">{perf.CD_DOCUMENTO || selectedDoc}</td>
                            <td className="px-8 py-4 text-[11px] text-muted border-r -border uppercase whitespace-nowrap tracking-tighter">{perf.NM_TITULO || '-'}</td>
                            <td className="px-8 py-4 text-[12px] text-[var(--primary)] border-r -border uppercase whitespace-nowrap">
                               <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 bg-[var(--primary)]"></div>
                                 {perf.DS_PERFIL_AMBULATORIAL || 'ACESSÍVEL'}
                               </div>
                            </td>
                            <td className="px-8 py-4 text-center whitespace-nowrap">
                              <span className="-background px-3 py-1 text-muted font-black text-[10px] border border-border italic">
                                {perf.EMPRESA || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {profileTotalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between px-2 text-[10px] font-black text-muted uppercase tracking-[0.2em]">
                      <div className="flex items-center gap-8">
                        <span>Página {profileCurrentPage} de {profileTotalPages}</span>
                        <span className="text-zinc-700">|</span>
                        <span>{filteredProfileData.length} Correlações Encontradas</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          disabled={profileCurrentPage === 1}
                          onClick={() => setProfileCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-6 py-2 bg-background border border-border text-foreground hover:text-[var(--primary)] transition-all disabled:opacity-30"
                        >
                          ANTERIOR
                        </button>
                        <button 
                          disabled={profileCurrentPage === profileTotalPages}
                          onClick={() => setProfileCurrentPage(prev => Math.min(profileTotalPages, prev + 1))}
                          className="px-6 py-2 bg-card text-foreground font-black -background transition-all disabled:opacity-30"
                        >
                          PRÓXIMO
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
                  <XCircle size={64} className="-muted mb-6" />
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-muted italic">Shadow Profile Indisponível</p>
                </div>
              )}
            </div>
          </div>
         )}
        </>
        )}
      </div>

      {activeMainTab === 'documentos' && (
        <>
      {/* Sidebar Técnico (Opção B) */}
      <div 
        className={`fixed top-0 right-0 h-full bg-background border-l border-border z-[100] transition-all duration-500 ease-in-out transform flex flex-col ${sidebarOpen ? 'translate-x-0 w-[450px]' : 'translate-x-full w-[450px]'}`}
      >
        {/* Lógica de Extração de Metadados (Fix: Oracle Aliases in Uppercase e Compatibilidade V2/V3) */}
        {(() => {
          // Identifica a versão publicada/ativa mais recente (V2: TIPO_VERSAO = 3 ou STATUS_ATIVO = 'S'; V3: STATUS_ATIVO = 1)
          const activePublishedVersion = metadata.find(m => m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S')?.VALOR_VERSAO;
          
          const telaSpecs = metadata.find(m => 
            (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') && 
            m.CODIGO_TIPO_LAYOUT === 1 && 
            (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
          );
          const relatorioSpecs = metadata.find(m => 
            (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') && 
            m.CODIGO_TIPO_LAYOUT === 2 && 
            (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
          );
          const fallbackSpecs = metadata.find(m => 
            (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') && 
            (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
          ) || metadata[0];

          // Baseia-se primariamente na Tela para regras/campos. Se não houver Tela, tenta Relatório ou Fallback.
          const baseSpecs = telaSpecs || relatorioSpecs || fallbackSpecs;
          
          // Faz o "merge": usa os dados da base, mas injeta o Cabeçalho/Rodapé do Relatório (já que a Tela não os possui).
          const activeSpecs = baseSpecs ? {
            ...baseSpecs,
            CODIGO_LAYOUT_CABECALHO: relatorioSpecs?.CODIGO_LAYOUT_CABECALHO || baseSpecs.CODIGO_LAYOUT_CABECALHO,
            DOCUMENTO_CABECALHO: relatorioSpecs?.DOCUMENTO_CABECALHO || baseSpecs.DOCUMENTO_CABECALHO,
            CODIGO_LAYOUT_RODAPE: relatorioSpecs?.CODIGO_LAYOUT_RODAPE || baseSpecs.CODIGO_LAYOUT_RODAPE,
          } : undefined;
          
          const hasTestVersion = metadata.some(m => m.CODIGO_TIPO_VERSAO === 1 && m.STATUS_ATIVO !== 1 && m.STATUS_ATIVO !== 'S');
          const publishedRow = metadata.find(m => 
            (m.CODIGO_TIPO_VERSAO === 3 || m.STATUS_ATIVO === 1 || m.STATUS_ATIVO === 'S') && 
            (activePublishedVersion !== undefined ? m.VALOR_VERSAO === activePublishedVersion : true)
          ) || metadata[0];

          return (
            <>
              <div className="p-8 border-b border-border -background relative">
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-6 right-6 p-2 text-muted hover:text-[var(--primary)] transition-all"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-2 pr-8">
                  <span className="px-2 py-0.5 bg-[var(--primary)] text-foreground text-[9px] font-black rounded uppercase tracking-wider">
                    Document Specs
                  </span>
                  {hasTestVersion && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-500 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Versão de Teste
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tighter leading-tight italic pr-8">
                  {metadata[0]?.DESCRICAO_DOCUMENTO || 'Detalhes Técnicos'}
                </h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mt-1">
                  Oracle Identifier: <b className="text-[var(--primary)]">{sidebarDoc}</b>
                </p>
              </div>

              <div className="flex border-b border-border px-8 overflow-x-auto scrollbar-none">
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all shrink-0 ${activeTab === 'specs' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted -muted'}`}
                >
                  Especificações
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all shrink-0 ${activeTab === 'history' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted -muted'}`}
                >
                  Histórico
                </button>
                <button 
                  onClick={() => setActiveTab('actions')}
                  className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all shrink-0 ${activeTab === 'actions' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted -muted'}`}
                >
                  Vínculos SQL
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-200">
                {metadataLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                    <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Consultando Banco...</span>
                  </div>
                ) : activeTab === 'specs' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Settings size={14} className="text-muted" />
                        <h4 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">Configurações da Versão</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { label: 'Identificador do Documento', value: activeSpecs?.IDENTIFICADOR_DOCUMENTO },
                          { label: 'Quantidade de Campos', value: activeSpecs?.QUANTIDADE_CAMPOS ?? 0 },
                          { label: 'Quantidade de Regras', value: activeSpecs?.QUANTIDADE_REGRAS ?? 0 },
                          { label: 'Última Versão Publicada', value: publishedRow?.VALOR_VERSAO },
                          { label: 'Código do Cabeçalho (Ativo)', value: activeSpecs?.CODIGO_LAYOUT_CABECALHO || 'Sem Cabeçalho' },
                          { label: 'Documento Origem Cabecalho', value: activeSpecs?.DOCUMENTO_CABECALHO },
                          { label: 'Código do Rodapé', value: activeSpecs?.CODIGO_LAYOUT_RODAPE || 'Sem Rodapé' },
                        ].filter(item => item.value !== 'N/A' && item.value !== null && item.value !== undefined).map((item, i) => (
                          <div key={i} className="bg-card border border-border p-4 rounded-none group -background hover:border-[var(--primary)]/20 transition-all">
                            <span className="block text-[9px] font-black text-muted uppercase tracking-widest mb-1">{item.label}</span>
                            <span className="block text-xs font-bold text-foreground font-mono">{item.value ?? '--'}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : activeTab === 'history' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     {metadata.sort((a, b) => b.VALOR_VERSAO - a.VALOR_VERSAO).map((v, idx) => {
                       const isAtivo = v.STATUS_ATIVO === 'S' || v.STATUS_ATIVO === 1;
                       return (
                       <div key={idx} className={`relative pl-8 pb-6 border-l-2 ${isAtivo ? 'border-[var(--primary)]' : 'border-border'} last:pb-0`}>
                         <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-none border-4 bg-background ${isAtivo ? 'border-[var(--primary)] scale-110 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' : 'border-border'}`}></div>
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-[11px] font-black text-foreground uppercase tracking-tighter">
                             Versão {v.VALOR_VERSAO}
                           </span>
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-colors ${
                             v.CODIGO_TIPO_VERSAO === 3 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500 ring-1 ring-emerald-500 shadow-none' : 
                             v.CODIGO_TIPO_VERSAO === 2 ? 'bg-blue-500/10 text-blue-600 border-blue-500 ring-1 ring-blue-500 shadow-none' : 
                             v.CODIGO_TIPO_VERSAO === 1 ? 'bg-red-500/10 text-red-500 border-red-500/50 ring-1 ring-red-500 shadow-none' : 'bg-card text-muted border-border'
                           }`}>
                             {v.DESCRICAO_TIPO_VERSAO}
                           </span>
                         </div>
                         <div className="text-[10px] text-muted font-bold">
                           <div className="flex items-center gap-2 mb-1 uppercase tracking-tighter">
                              <span className="-muted">Layout:</span> {v.DESCRICAO_TIPO_LAYOUT}
                           </div>
                           <div className="flex items-center gap-2 text-muted font-mono text-[9px]">
                              ID Versão: {v.CODIGO_VERSAO_DOCUMENTO}
                           </div>
                         </div>
                         {isAtivo && v.CODIGO_TIPO_VERSAO === 3 && (
                           <div className="mt-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 italic">
                             <Check size={10} strokeWidth={4} /> Versão Ativa em Produção
                           </div>
                         )}
                       </div>
                     );
                     })}
                  </div>
                ) : activeTab === 'actions' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-500 fill-amber-500" />
                            <h4 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">Fluxos e Relacionamentos</h4>
                        </div>
                        
                        {uniqueRelatedDocs.length > 0 && !metadataActionsLoading && (
                          <div className="flex flex-wrap gap-2 py-2 border-y -border">
                            <button 
                              onClick={() => setActionsFilterDoc(null)}
                              className={`px-3 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest transition-all ${
                                actionsFilterDoc === null 
                                ? 'bg-[var(--primary)] text-foreground shadow-none shadow-[var(--primary)]/20' 
                                : 'bg-card text-muted -background border border-border'
                              }`}
                            >
                              Todos
                            </button>
                            {uniqueRelatedDocs.map(docId => (
                              <button 
                                key={docId}
                                onClick={() => setActionsFilterDoc(docId)}
                                className={`px-3 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest transition-all border ${
                                  actionsFilterDoc === docId 
                                  ? 'bg-indigo-600 text-foreground border-indigo-700 shadow-none shadow-indigo-200' 
                                  : 'bg-background text-indigo-500 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50'
                                }`}
                              >
                                {docId}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                    
                    {metadataActionsLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Escaneando Scripts...</span>
                      </div>
                    ) : metadataActionsError ? (
                      <div className="py-12 px-6 bg-red-500/10 border border-red-100 rounded-none text-center">
                        <AlertTriangle size={32} className="text-red-400 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-2 font-mono">Erro de Query Oracle</p>
                        <p className="text-[9px] text-red-500 font-mono leading-relaxed line-clamp-3 overflow-hidden mb-4">
                          {metadataActionsError}
                        </p>
                        <button 
                          onClick={() => fetchActions(selectedDoc!)}
                          className="px-4 py-2 bg-red-100 text-red-500 text-[9px] font-black rounded uppercase hover:bg-red-200 transition-all shadow-none"
                        >
                          Tentar Novamente
                        </button>
                      </div>
                    ) : metadataActions.length > 0 ? (
                      <div className="space-y-4">
                        {metadataActions
                          .filter(action => {
                            if (!actionsFilterDoc) return true;
                            const single = String(action.DOCUMENTO_RELACIONADO) === actionsFilterDoc;
                            const group = action.GRUPO_DOCS_RELACIONADOS?.split(',').map((s: string) => s.trim()).includes(actionsFilterDoc);
                            return single || group;
                          })
                          .map((action, idx) => (
                          <div key={idx} className="bg-card border border-border rounded-none overflow-hidden group hover:border-[var(--primary)]/30 transition-all shadow-none">
                            <div className="p-4 border-b border-border flex items-start justify-between bg-background">
                              <div className="flex-1 mr-2">
                                <span className="block text-[10px] font-black text-foreground uppercase tracking-widest mb-1 leading-tight">{action.NOME_CAMPO || 'Campo sem Nome'}</span>
                                <span className="block text-[9px] font-bold text-muted font-mono italic">{action.IDENTIFICADOR_CAMPO}</span>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                {action.DOCUMENTO_RELACIONADO && (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[8px] font-black rounded uppercase tracking-wider border border-emerald-500/20 shadow-none">
                                    Doc: {action.DOCUMENTO_RELACIONADO}
                                  </span>
                                )}
                                {action.GRUPO_DOCS_RELACIONADOS && (
                                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 text-[8px] font-black rounded uppercase tracking-wider border border-indigo-200 shadow-none">
                                    Grupo: {action.GRUPO_DOCS_RELACIONADOS}
                                  </span>
                                )}
                                {!action.DOCUMENTO_RELACIONADO && !action.GRUPO_DOCS_RELACIONADOS && (
                                  <span className="px-2 py-0.5 -background text-muted text-[8px] font-black rounded uppercase tracking-wider">
                                    S/ Vínculo Direto
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-4 -background">
                               <div className="flex flex-col gap-2">
                                 <div className="flex items-center justify-between">
                                   <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em]">Escopo da Lógica SQL</span>
                                   <button 
                                    onClick={(e) => {
                                      const next = e.currentTarget.parentElement?.nextElementSibling;
                                      next?.classList.toggle('hidden');
                                    }}
                                    className="text-[8px] font-black text-[var(--primary)] uppercase underline hover:opacity-70"
                                   >
                                     Ver Script
                                   </button>
                                 </div>
                                 <div className="hidden mt-1 block w-full">
                                    <pre className="text-[9px] font-mono text-muted bg-background p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto shadow-inner">
                                      {action.SCRIPT_ACAO_COMPLETO}
                                    </pre>
                                 </div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center bg-card border border-dashed border-border rounded-none">
                        <Unlink size={32} className="-muted mx-auto mb-4" />
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Nenhum Vínculo Detectado</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          );
        })()}
      </div>
      </>
      )}

      {activeMainTab === 'perfis' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col md:flex-row gap-6 mt-4">
            {/* Master: Lista de Perfis */}
            <div className="w-full md:w-1/3 flex flex-col bg-card border border-border rounded-none relative print:hidden">
              <div className="p-4 border-b border-border bg-background sticky top-0 z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <ListFilter size={14} className="text-[var(--primary)]" />
                    Perfis Cadastrados
                  </h3>
                  <span className="text-[10px] bg-[var(--primary)] text-background px-2 py-0.5 rounded-none font-bold">
                    {filteredPerfisList.length}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={12} />
                  <input 
                    type="text" 
                    placeholder="Buscar perfil..."
                    className="w-full bg-background border border-border rounded-none pl-8 pr-4 py-1.5 text-[10px] text-foreground outline-none focus:border-[var(--primary)] transition-all shadow-none"
                    value={perfisSearchTerm}
                    onChange={(e) => setPerfisSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {paginatedPerfisList.map(perfil => (
                  <button
                    key={perfil.id}
                    onClick={() => setSelectedPerfilId(perfil.id)}
                    className={`w-full text-left p-3 border rounded-none transition-all duration-200 group flex items-start gap-3 ${
                      selectedPerfilId === perfil.id 
                        ? 'bg-[var(--primary)]/10 border-[var(--primary)]/50' 
                        : 'bg-background border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[11px] font-black uppercase tracking-wide truncate ${selectedPerfilId === perfil.id ? 'text-[var(--primary)]' : 'text-foreground'}`}>
                        {perfil.Nome_Perfil}
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-mono mt-1">Cód: {perfil.id}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {perfil.Sistema && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-card border border-border rounded-none flex items-center gap-1">
                            <Layout size={10} /> {perfil.Sistema}
                          </span>
                        )}
                        {perfil.Especialidade && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-card border border-border rounded-none flex items-center gap-1">
                            <Database size={10} /> {perfil.Especialidade}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all ${selectedPerfilId === perfil.id ? 'opacity-100 text-[var(--primary)]' : 'text-muted'}`} />
                  </button>
                ))}
                {filteredPerfisList.length === 0 && !ambulatoryProfilesLoading && (
                  <div className="text-center p-8 text-muted-foreground">
                    <p className="text-[10px] uppercase font-bold tracking-widest">Nenhum perfil encontrado</p>
                  </div>
                )}
                {ambulatoryProfilesLoading && (
                  <div className="text-center p-8 text-muted-foreground flex flex-col items-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-[var(--primary)]" />
                    <p className="text-[10px] uppercase font-bold tracking-widest">Carregando...</p>
                  </div>
                )}
              </div>
              
              {perfisTotalPages > 1 && (
                <div className="p-2 border-t border-border bg-background flex items-center justify-between sticky bottom-0">
                  <button 
                    onClick={() => setPerfisCurrentPage(p => Math.max(1, p - 1))}
                    disabled={perfisCurrentPage === 1}
                    className="px-3 py-1 bg-card border border-border hover:border-[var(--primary)] text-[10px] font-black uppercase tracking-wider text-muted hover:text-[var(--primary)] transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Anterior
                  </button>
                  <span className="text-[10px] font-mono text-foreground font-black">
                    {perfisCurrentPage} / {perfisTotalPages}
                  </span>
                  <button 
                    onClick={() => setPerfisCurrentPage(p => Math.min(perfisTotalPages, p + 1))}
                    disabled={perfisCurrentPage === perfisTotalPages}
                    className="px-3 py-1 bg-card border border-border hover:border-[var(--primary)] text-[10px] font-black uppercase tracking-wider text-muted hover:text-[var(--primary)] transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Próximo
                  </button>
                </div>
              )}
            </div>

            {/* Detail: Módulos e Parâmetros */}
            <div className="w-full md:w-2/3 bg-card border border-border rounded-none p-6 flex flex-col relative min-h-[400px] print:w-full print:border-none print:p-0 print:m-0">
              {!selectedPerfilId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <Database size={48} className="mb-4 opacity-20" />
                  <p className="text-[12px] uppercase tracking-widest font-bold">Selecione um perfil para ver os detalhes</p>
                </div>
              ) : groupedPerfis[selectedPerfilId] ? (
                <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-300">
                  <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] px-2 py-0.5 bg-[var(--primary)] text-background uppercase tracking-widest font-black">
                          {groupedPerfis[selectedPerfilId].Sistema}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">CÓD: {selectedPerfilId}</span>
                      </div>
                      <h2 className="text-xl font-black uppercase text-foreground">
                        {groupedPerfis[selectedPerfilId].Nome_Perfil}
                      </h2>
                      {groupedPerfis[selectedPerfilId].Especialidade && (
                        <p className="text-xs text-muted-foreground mt-1">Esp: {groupedPerfis[selectedPerfilId].Especialidade}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                      <button 
                        onClick={exportPerfisToCSV}
                        className="p-2 border border-border hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-muted flex items-center gap-2 group"
                        title="Exportar CSV"
                        disabled={profileDetailsLoading}
                      >
                        <Download size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden group-hover:inline">CSV</span>
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="p-2 border border-border hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors text-muted flex items-center gap-2 group"
                        title="Exportar PDF"
                        disabled={profileDetailsLoading}
                      >
                        <Printer size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider hidden group-hover:inline">PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                    {profileDetailsLoading && !profileDetailsCache[selectedPerfilId] ? (
                      <div className="text-center p-8 text-muted-foreground flex flex-col items-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-[var(--primary)]" />
                        <p className="text-[10px] uppercase font-bold tracking-widest mt-2">Carregando Detalhes...</p>
                      </div>
                    ) : profileDetailsCache[selectedPerfilId] && Object.keys(profileDetailsCache[selectedPerfilId]).length > 0 ? (
                      Object.entries(profileDetailsCache[selectedPerfilId]).map(([modId, modData]: [string, any]) => {
                        const isExpanded = expandedModules[modId] || false;
                        return (
                        <div key={modId} className="bg-background border border-border rounded-none overflow-hidden group">
                          <button 
                            onClick={() => setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }))}
                            className="w-full bg-card p-3 flex items-center justify-between border-b border-border hover:bg-[var(--primary)]/5 transition-colors text-left outline-none focus:bg-[var(--primary)]/5"
                          >
                            <div className="flex items-center gap-3">
                              <Layout className="text-[var(--primary)]" size={16} />
                              <div>
                                <h4 className="text-[12px] font-black uppercase text-foreground">{modData.Titulo || `Módulo ${modData.ModuloId}`}</h4>
                                <p className="text-[9px] font-mono text-muted-foreground mt-0.5">Módulo ID: {modData.ModuloId}</p>
                              </div>
                            </div>
                            <div className="text-muted group-hover:text-[var(--primary)] transition-colors print:hidden">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>
                          
                          <div className={`p-0 ${isExpanded ? 'block' : 'hidden print:block'}`}>
                            {modData.Parametros.length > 0 ? (
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/30">
                                  <tr>
                                    <th className="p-2 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-r border-border w-1/3">Parâmetro</th>
                                    <th className="p-2 text-[9px] font-black uppercase text-muted-foreground tracking-widest border-b border-border">Valor Atribuído</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {modData.Parametros.map((param: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-muted/10 transition-colors border-b border-border last:border-0">
                                      <td className="p-3 text-[10px] font-mono text-foreground border-r border-border truncate max-w-xs" title={param.Descricao}>
                                        {param.Parametro}
                                      </td>
                                      <td className="p-3 text-[10px] font-mono text-foreground break-all">
                                        {param.Valor || <span className="text-muted-foreground italic opacity-50">Não definido</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="p-4 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">
                                Nenhum parâmetro vinculado
                              </div>
                            )}
                          </div>
                        </div>
                      )})
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <p className="text-[10px] uppercase font-bold tracking-widest">Nenhum módulo encontrado</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

      <div id="print-area" className="hidden print:block -background print:text-black w-full" style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999 }}>
        <div className="p-8">
          <div className="mb-8 border-b-4 border-black pb-4">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Relatório de Perfis Vinculados</h1>
            <div className="mt-4 grid grid-cols-3 gap-8 text-[12px] font-mono uppercase">
              <div className="flex flex-col">
                <span className="text-muted text-[10px]">Identificador do Documento</span>
                <b className="text-lg">{selectedDoc}</b>
              </div>
              <div className="flex flex-col">
                <span className="text-muted text-[10px]">Data de Geração</span>
                <b suppressHydrationWarning>{reportDate || '...'}</b>
              </div>
              <div className="flex flex-col">
                <span className="text-muted text-[10px]">Total de Perfis</span>
                <b className="text-emerald-700">{filteredProfileData.length}</b>
              </div>
            </div>
          </div>
          
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="-background italic border-b-2 border-black">
                <th className="border -border px-4 py-3 text-left">CÓD. DOC</th>
                <th className="border -border px-4 py-3 text-left">NOME DO DOCUMENTO</th>
                <th className="border -border px-4 py-3 text-left">PERFIL AMBULATORIAL</th>
                <th className="border -border px-4 py-3 text-center">EMPRESA</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfileData.map((perf, idx) => (
                <tr key={idx} className="border-b border-border break-inside-avoid">
                  <td className="border -border px-4 py-2 font-mono">{perf.CD_DOCUMENTO || selectedDoc}</td>
                  <td className="border -border px-4 py-2 uppercase">{perf.NM_TITULO || '-'}</td>
                  <td className="border -border px-4 py-2 font-bold">{perf.DS_PERFIL_AMBULATORIAL || '-'}</td>
                  <td className="border -border px-4 py-2 text-center uppercase">{perf.EMPRESA || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-12 pt-4 border-t border-border text-center text-[9px] text-muted italic">
            Gerado eletronicamente por DocOracle Pro. Todos os direitos reservados.
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* Esconder TUDO que tenha a classe print:hidden */
          .print\:hidden {
            display: none !important;
          }
          
          body {
            overflow: visible !important;
          }

          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }

          ::-webkit-scrollbar {
            display: none !important;
          }

          /* Garantir que o print-area esteja visível e no topo */
          #print-area {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }

          #print-area * {
            visibility: visible !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }

          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
