"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Filter, FileText, Download, GripVertical, Check, X, ChevronUp, ChevronDown, ListFilter, XCircle, FileSpreadsheet, Printer, AlertTriangle, Loader2, Info, History, Settings, ExternalLink, Zap, Unlink } from 'lucide-react';
import { useUI } from '@/context/UIContext';

export default function DocumentosPage() {
  const { oracleData, setOracleData, columnWidths, setColumnWidth } = useUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeConnName, setActiveConnName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState({ CÓDIGO: '', NOME: '', EMPRESA: '' });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataActions, setMetadataActions] = useState<any[]>([]);
  const [metadataActionsLoading, setMetadataActionsLoading] = useState(false);
  const [metadataActionsError, setMetadataActionsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'history' | 'actions'>('specs');
  const [actionsFilterDoc, setActionsFilterDoc] = useState<string | null>(null);

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

  useEffect(() => {
    // Só carregar automaticamente se não houver dados em cache
    if (!oracleData) {
      fetchInitialData();
    } else {
      // Re-verificar apenas o nome da conexão
      fetch('/api/connections').then(res => res.json()).then(storage => {
        const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
        if (active) setActiveConnName(active.name);
      });
    }
  }, []);

  // Dispara busca de perfis e metadados ao selecionar documento
  useEffect(() => {
    if (selectedDoc) {
      setProfileCurrentPage(1);
      setProfileSearchTerm('');
      setProfileUnitFilter('');
      fetchProfile(selectedDoc);
      fetchMetadata(selectedDoc);
      fetchActions(selectedDoc);
      setActionsFilterDoc(null);
    } else {
      setProfileData([]);
      setMetadata([]);
      setMetadataActions([]);
      setMetadataActionsError(null);
      setActionsFilterDoc(null);
    }
  }, [selectedDoc]);

  async function fetchProfile(docId: string) {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: 'PROFILE', 
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

  useEffect(() => {
    // 1. Tentar carregar do UIContext (in-memory)
    if (oracleData && oracleData.length > 0) {
      fetch('/api/connections').then(res => res.json()).then(storage => {
        const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
        if (active) setActiveConnName(active.name);
      });
      return;
    }

    // 2. Tentar carregar do sessionStorage (persistência entre refresh/navegação)
    const cached = sessionStorage.getItem('oracle_documentos_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setOracleData(parsed);
        fetch('/api/connections').then(res => res.json()).then(storage => {
          const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
          if (active) setActiveConnName(active.name);
        });
        return;
      } catch (e) {
        console.error('Erro ao ler cache de documentos:', e);
      }
    }

    // 3. Caso contrário, buscar do servidor
    fetchInitialData();
  }, []);

  async function fetchInitialData(isManual = false) {
    setLoading(true);
    setError('');
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
        body: JSON.stringify({ type: 'EXECUTE' }),
      });
      
      const result = await execRes.json();
      if (execRes.ok) {
        const rows = result.rows || [];
        setOracleData(rows);
        sessionStorage.setItem('oracle_documentos_data', JSON.stringify(rows));
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
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
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
    <div className="min-h-screen flex flex-col space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="print:hidden space-y-6">
        <header className="flex justify-between items-center gap-4 border-b border-slate-200 pb-6">
          <div className="flex-1">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic tracking-tighter">
              <FileText className="text-[var(--primary)]" size={28} />
              Repositório de Documentos
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Oracle DBAMV Infrastructure</span>
              <span className={`px-2 py-0.5 rounded-[var(--radius)] text-[9px] font-black uppercase border ${activeConnName ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200 italic'}`}>
                  {activeConnName || 'DISCONNECTED'}
              </span>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-[var(--radius)] flex items-center gap-3 text-rose-600 animate-in slide-in-from-top-2">
                <AlertTriangle size={16} />
                <span className="text-[11px] font-black uppercase tracking-tight">{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Pesquisa global..."
                className="bg-white border border-slate-200 rounded-[var(--radius)] pl-9 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-[var(--primary)] w-72 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchInitialData(true)}
              disabled={loading}
              className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-white rounded-[var(--radius)] transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sincronizar
            </button>
            <button 
              onClick={exportToCSV}
              className="p-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-[var(--primary)] rounded-[var(--radius)] border border-slate-200 transition-all shadow-sm"
            >
              <Download size={16} />
            </button>
          </div>
        </header>
        
        <div className="bg-white border border-slate-200 rounded-[var(--radius)] p-4 flex flex-wrap items-center gap-6 shadow-sm animate-in slide-in-from-top duration-700 relative overflow-visible">
          <div className="flex items-center gap-2 text-slate-500">
            <ListFilter size={18} className="text-[var(--primary)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] min-w-fit">Filtros Técnicos</span>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center gap-4">
            <input 
              type="text" 
              placeholder="CÓDIGO"
              className="bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[var(--primary)] w-28 transition-all"
              value={columnFilters.CÓDIGO}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, CÓDIGO: e.target.value }))}
            />
            <input 
              type="text" 
              placeholder="NOME DO DOCUMENTO"
              className="bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[var(--primary)] flex-1 min-w-[300px] transition-all"
              value={columnFilters.NOME}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, NOME: e.target.value }))}
            />
            <select 
              className="bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-[var(--primary)] w-40 transition-all cursor-pointer"
              value={columnFilters.EMPRESA}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, EMPRESA: e.target.value }))}
            >
              <option value="">EMPRESA (TODAS)</option>
              {['HSC', 'CSSJ', 'HST', 'HSJ', 'HMRP', 'HCNSC', 'HR'].map(unit => (
                <option key={unit} value={unit}>{unit}</option>
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
              className="px-4 py-1.5 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[var(--radius)] transition-all flex items-center gap-2 uppercase tracking-tighter"
            >
              <XCircle size={14} /> Limpar Filtros
            </button>
          )}
        </div>

        <div className={`bg-white rounded-[var(--radius)] border border-slate-200 flex flex-col overflow-hidden shadow-md w-full max-w-full transition-all duration-500 ease-in-out ${selectedDoc && !sidebarOpen ? 'min-h-[300px] max-h-[300px]' : 'min-h-[600px]'}`}>
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 w-full relative">
            {paginatedData.length > 0 ? (
              <table className="w-full text-left border-collapse table-auto select-none min-w-max">
                <thead className="sticky top-0 z-10">
                   <tr className="bg-slate-50 shadow-sm border-b border-slate-200">
                    <th className="px-4 py-3 w-10 border-r border-slate-100 italic font-black text-slate-300 text-[9px] text-center">INFO</th>
                    {Object.keys(paginatedData[0]).map((key) => {
                      const cleanKey = key.replace(/"/g, '');
                      const isName = cleanKey.toUpperCase() === 'NOME';
                      const width = columnWidths[key] || (isName ? 150 : 65);
                      return (
                        <th 
                          key={key} 
                          style={{ width, minWidth: width, maxWidth: isName ? 150 : 'none' }}
                          onClick={() => handleSort(key)}
                          className={`relative px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-[var(--primary)] transition-colors border-r border-slate-100 whitespace-nowrap cursor-pointer group/th ${isName ? 'overflow-hidden text-ellipsis' : 'text-center'} ${sortConfig.key === key ? 'bg-[var(--primary)]/5 text-[var(--primary)]' : ''}`}
                        >
                          <div className={`flex items-center gap-2 ${!isName ? 'justify-center' : ''}`}>
                            <Filter size={10} className={`transition-colors ${sortConfig.key === key ? 'text-[var(--primary)]' : 'text-slate-300 group-hover/th:text-slate-500'}`} />
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
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedData.map((row, idx) => {
                    const docCode = String(row['CÓDIGO'] || row['\"CÓDIGO\"'] || '');
                    const isSelected = selectedDoc === docCode;
                    return (
                       <tr 
                        key={idx} 
                        className={`transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-[var(--primary)]/5 border-[var(--primary)] text-slate-900' : 'hover:bg-slate-50 border-transparent text-slate-600'}`}
                      >
                        <td className="px-3 py-2 border-r border-slate-50 text-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDoc(docCode);
                              setSidebarOpen(true);
                            }}
                            className={`p-1.5 rounded-full transition-all ${isSelected && sidebarOpen ? 'bg-[var(--primary)] text-white' : 'text-slate-300 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10'}`}
                          >
                            <Info size={14} />
                          </button>
                        </td>
                        {Object.entries(row).map(([key, val], vIdx) => {
                          const isName = key.replace(/"/g, '').toUpperCase() === 'NOME';
                          const width = columnWidths[key] || (isName ? 150 : 65);
                          const renderValue = () => {
                            if (val === null || val === undefined) return <span className="text-slate-300 italic opacity-50">--</span>;
                            const strVal = String(val);
                            const cleanKey = key.replace(/"/g, '').toUpperCase();
                            const companyCols = ['HSC', 'CSSJ', 'HST', 'HSJ', 'HCNSC', 'HMRP', 'HR'];
                            if (companyCols.includes(cleanKey)) {
                              if (strVal === '1') return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto" />;
                              if (strVal === '0') return <div className="w-1.5 h-1.5 rounded-full bg-[var(--destructive)] mx-auto" />;
                            }
                            if (strVal.includes('T') && !isNaN(Date.parse(strVal))) {
                              return <span suppressHydrationWarning className="font-mono text-[9px]">{new Date(strVal).toLocaleString('pt-BR')}</span>;
                            }
                            return strVal;
                          };
                          return (
                            <td 
                              key={vIdx} 
                              style={{ width, minWidth: width, maxWidth: isName ? 150 : 'none' }}
                              className={`px-4 py-2 text-[10px] border-r border-slate-50 last:border-r-0 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${!isName ? 'text-center font-bold' : ''}`}
                            >
                              {renderValue()}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-32">
                <Loader2 className="animate-spin text-slate-200" size={48} />
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                    {loading ? 'Acessando Infraestrutura Oracle...' : 'Nenhum Registro Encontrado'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                PÁGINA <b className="text-slate-900">{currentPage}</b> DE <b className="text-slate-500">{totalPages || 1}</b>
              </span>
              <span className="text-slate-200 font-normal">|</span>
              <span className="tracking-tighter">
                VOL. ATIVO <b className="text-slate-900">{filteredData.length}</b> REGISTROS
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-1.5 rounded-[var(--radius)] bg-white border border-slate-200 text-slate-600 hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all disabled:opacity-30"
                >
                  VOLTAR
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-4 py-1.5 rounded-[var(--radius)] bg-slate-900 text-white hover:bg-slate-800 transition-all disabled:opacity-30"
                >
                  AVANÇAR
                </button>
              </div>
              <span className="text-slate-200 font-normal">|</span>
              <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-500"></span>
                  <span className="text-emerald-600 font-black">Sincronizado</span>
              </div>
            </div>
          </div>
        </div>

        {selectedDoc && (
          <div id="perfil-detalhes" className="bg-white rounded-[var(--radius)] border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-500 shadow-xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]"></div>
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-[var(--radius)] bg-slate-50 text-[var(--primary)] border border-slate-100">
                  <ListFilter size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Vínculos de Perfil Automático</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hardware ID: <b className="text-[var(--primary)]">{selectedDoc}</b></p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-1 max-w-2xl px-8">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                  <input 
                    type="text"
                    placeholder="Filtrar perfil..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] pl-9 pr-4 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-[var(--primary)] transition-all uppercase tracking-widest"
                    value={profileSearchTerm}
                    onChange={(e) => {
                      setProfileSearchTerm(e.target.value);
                      setProfileCurrentPage(1);
                    }}
                  />
                </div>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-4 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-[var(--primary)] w-32 transition-all cursor-pointer uppercase"
                  value={profileUnitFilter}
                  onChange={(e) => {
                    setProfileUnitFilter(e.target.value);
                    setProfileCurrentPage(1);
                  }}
                >
                  <option value="">UNIDADE</option>
                  {['HSC', 'CSSJ', 'HST', 'HSJ', 'HMRP', 'HCNSC', 'HR'].map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-[var(--radius)] border border-slate-200 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Excel
                </button>
                <button 
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-[var(--radius)] border border-slate-200 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <Printer size={16} className="text-slate-400" />
                  Print
                </button>
                <div className="w-px h-8 bg-slate-100 mx-2"></div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-rose-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <Loader2 className="text-[var(--primary)] animate-spin" size={48} />
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] animate-pulse">Relacionando Registros...</span>
                </div>
              ) : profileData.length > 0 ? (
                <>
                  <div className="overflow-x-auto border border-slate-200 rounded-[var(--radius)] bg-slate-50/30">
                    <table className="w-full text-left border-collapse table-auto min-w-max">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200">
                          <th className="px-8 py-4 border-r border-slate-100 whitespace-nowrap">Cód. Interno</th>
                          <th className="px-8 py-4 border-r border-slate-100 whitespace-nowrap">Descrição Doc</th>
                          <th className="px-8 py-4 border-r border-slate-100 whitespace-nowrap">Perfil Vinculado</th>
                          <th className="px-8 py-4 text-center whitespace-nowrap">Unidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {paginatedProfileData.map((perf, pIdx) => (
                          <tr key={pIdx} className="hover:bg-white transition-all group bg-white/50">
                            <td className="px-8 py-4 text-[11px] text-slate-400 group-hover:text-slate-900 border-r border-slate-50 whitespace-nowrap font-mono">{perf.CD_DOCUMENTO || selectedDoc}</td>
                            <td className="px-8 py-4 text-[11px] text-slate-600 border-r border-slate-50 uppercase whitespace-nowrap tracking-tighter">{perf.NM_TITULO || '-'}</td>
                            <td className="px-8 py-4 text-[12px] text-[var(--primary)] border-r border-slate-50 uppercase whitespace-nowrap">
                               <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 bg-[var(--primary)]"></div>
                                 {perf.DS_PERFIL_AMBULATORIAL || 'ACESSÍVEL'}
                               </div>
                            </td>
                            <td className="px-8 py-4 text-center whitespace-nowrap">
                              <span className="bg-slate-100 px-3 py-1 text-slate-600 font-black text-[10px] border border-slate-200 italic">
                                {perf.EMPRESA || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {profileTotalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <div className="flex items-center gap-8">
                        <span>Página {profileCurrentPage} de {profileTotalPages}</span>
                        <span className="text-slate-200">|</span>
                        <span>{filteredProfileData.length} Correlações Encontradas</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          disabled={profileCurrentPage === 1}
                          onClick={() => setProfileCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-6 py-2 bg-white border border-slate-200 text-slate-900 hover:text-[var(--primary)] transition-all disabled:opacity-30"
                        >
                          ANTERIOR
                        </button>
                        <button 
                          disabled={profileCurrentPage === profileTotalPages}
                          onClick={() => setProfileCurrentPage(prev => Math.min(profileTotalPages, prev + 1))}
                          className="px-6 py-2 bg-slate-900 text-white font-black hover:bg-slate-800 transition-all disabled:opacity-30"
                        >
                          PRÓXIMO
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
                  <XCircle size={64} className="text-slate-300 mb-6" />
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 italic">Shadow Profile Indisponível</p>
                </div>
              )}
            </div>
          </div>
         )}
      </div>

      {/* Sidebar Técnico (Opção B) */}
      <div 
        className={`fixed top-0 right-0 h-full bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[100] transition-all duration-500 ease-in-out transform flex flex-col ${sidebarOpen ? 'translate-x-0 w-[450px]' : 'translate-x-full w-[450px]'}`}
      >
        <button 
          onClick={() => setSidebarOpen(false)}
          className="absolute -left-12 top-6 p-3 bg-white border border-slate-200 rounded-l-xl text-slate-400 hover:text-[var(--primary)] shadow-[-5px_0_15px_rgba(0,0,0,0.05)] transition-all"
        >
          <X size={20} />
        </button>

        {/* Lógica de Extração de Metadados (Fix: Oracle Aliases in Uppercase) */}
        {(() => {
          const activeSpecs = metadata.find(m => m.STATUS_ATIVO === 'S' && m.IDENTIFICADOR_LAYOUT === 'RELATORIO') 
                           || metadata.find(m => m.STATUS_ATIVO === 'S');
          
          const hasTestVersion = metadata.some(m => m.CODIGO_TIPO_VERSAO === 1);
          const publishedRow = metadata.find(m => m.CODIGO_TIPO_VERSAO === 3);

          return (
            <>
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 bg-[var(--primary)] text-white text-[9px] font-black rounded uppercase tracking-wider">
                    Document Specs
                  </span>
                  {hasTestVersion && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Versão de Teste
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight italic">
                  {metadata[0]?.DESCRICAO_DOCUMENTO || 'Detalhes Técnicos'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                  Oracle Identifier: <b className="text-[var(--primary)]">{selectedDoc}</b>
                </p>
              </div>

              <div className="flex border-b border-slate-100 px-8">
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${activeTab === 'specs' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Especificações
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${activeTab === 'history' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Histórico
                </button>
                <button 
                  onClick={() => setActiveTab('actions')}
                  className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${activeTab === 'actions' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Vínculos SQL
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-200">
                {metadataLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                    <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando Banco...</span>
                  </div>
                ) : activeTab === 'specs' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Settings size={14} className="text-slate-400" />
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Configurações da Versão</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { label: 'Identificador do Documento', value: activeSpecs?.IDENTIFICADOR_DOCUMENTO },
                          { label: 'Última Versão Publicada', value: publishedRow?.VALOR_VERSAO || 'N/A' },
                          { label: 'Tipo de Layout Ativo', value: activeSpecs?.DESCRICAO_TIPO_LAYOUT },
                          { label: 'Código do Cabeçalho (Ativo)', value: activeSpecs?.CODIGO_LAYOUT_CABECALHO || 'Sem Cabeçalho' },
                          { label: 'Documento Origem Cabecalho', value: activeSpecs?.DOCUMENTO_CABECALHO },
                          { label: 'Código do Rodapé', value: activeSpecs?.CODIGO_LAYOUT_RODAPE || 'Sem Rodapé' },
                        ].map((item, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-lg group hover:bg-white hover:border-[var(--primary)]/20 transition-all">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                            <span className="block text-xs font-bold text-slate-700 font-mono">{item.value || '--'}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : activeTab === 'history' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                     {metadata.sort((a, b) => b.VALOR_VERSAO - a.VALOR_VERSAO).map((v, idx) => (
                       <div key={idx} className={`relative pl-8 pb-6 border-l-2 ${v.STATUS_ATIVO === 'S' ? 'border-[var(--primary)]' : 'border-slate-100'} last:pb-0`}>
                         <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 bg-white ${v.STATUS_ATIVO === 'S' ? 'border-[var(--primary)] scale-110 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' : 'border-slate-100'}`}></div>
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">
                             Versão {v.VALOR_VERSAO}
                           </span>
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-colors ${
                             v.CODIGO_TIPO_VERSAO === 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-500 ring-1 ring-emerald-500 shadow-sm' : 
                             v.CODIGO_TIPO_VERSAO === 2 ? 'bg-blue-50 text-blue-600 border-blue-500 ring-1 ring-blue-500 shadow-sm' : 
                             v.CODIGO_TIPO_VERSAO === 1 ? 'bg-red-50 text-red-600 border-red-500 ring-1 ring-red-500 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'
                           }`}>
                             {v.DESCRICAO_TIPO_VERSAO}
                           </span>
                         </div>
                         <div className="text-[10px] text-slate-500 font-bold">
                           <div className="flex items-center gap-2 mb-1 uppercase tracking-tighter">
                              <span className="text-slate-300">Layout:</span> {v.DESCRICAO_TIPO_LAYOUT}
                           </div>
                           <div className="flex items-center gap-2 text-slate-400 font-mono text-[9px]">
                              ID Versão: {v.CODIGO_VERSAO_DOCUMENTO}
                           </div>
                         </div>
                         {v.STATUS_ATIVO === 'S' && v.CODIGO_TIPO_VERSAO === 3 && (
                           <div className="mt-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 italic">
                             <Check size={10} strokeWidth={4} /> Versão Ativa em Produção
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-500 fill-amber-500" />
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Fluxos e Relacionamentos</h4>
                        </div>
                        
                        {uniqueRelatedDocs.length > 0 && !metadataActionsLoading && (
                          <div className="flex flex-wrap gap-2 py-2 border-y border-slate-100/50">
                            <button 
                              onClick={() => setActionsFilterDoc(null)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                actionsFilterDoc === null 
                                ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                              }`}
                            >
                              Todos
                            </button>
                            {uniqueRelatedDocs.map(docId => (
                              <button 
                                key={docId}
                                onClick={() => setActionsFilterDoc(docId)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                                  actionsFilterDoc === docId 
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200' 
                                  : 'bg-white text-indigo-500 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50'
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escaneando Scripts...</span>
                      </div>
                    ) : metadataActionsError ? (
                      <div className="py-12 px-6 bg-red-50 border border-red-100 rounded-xl text-center">
                        <AlertTriangle size={32} className="text-red-400 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-red-700 uppercase tracking-[0.2em] mb-2 font-mono">Erro de Query Oracle</p>
                        <p className="text-[9px] text-red-500 font-mono leading-relaxed line-clamp-3 overflow-hidden mb-4">
                          {metadataActionsError}
                        </p>
                        <button 
                          onClick={() => fetchActions(selectedDoc!)}
                          className="px-4 py-2 bg-red-100 text-red-700 text-[9px] font-black rounded uppercase hover:bg-red-200 transition-all shadow-sm"
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
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden group hover:border-[var(--primary)]/30 transition-all shadow-sm">
                            <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-white">
                              <div className="flex-1 mr-2">
                                <span className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1 leading-tight">{action.NOME_CAMPO || 'Campo sem Nome'}</span>
                                <span className="block text-[9px] font-bold text-slate-400 font-mono italic">{action.IDENTIFICADOR_CAMPO}</span>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                {action.DOCUMENTO_RELACIONADO && (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded uppercase tracking-wider border border-emerald-200 shadow-sm">
                                    Doc: {action.DOCUMENTO_RELACIONADO}
                                  </span>
                                )}
                                {action.GRUPO_DOCS_RELACIONADOS && (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[8px] font-black rounded uppercase tracking-wider border border-indigo-200 shadow-sm">
                                    Grupo: {action.GRUPO_DOCS_RELACIONADOS}
                                  </span>
                                )}
                                {!action.DOCUMENTO_RELACIONADO && !action.GRUPO_DOCS_RELACIONADOS && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded uppercase tracking-wider">
                                    S/ Vínculo Direto
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50/50">
                               <div className="flex flex-col gap-2">
                                 <div className="flex items-center justify-between">
                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Escopo da Lógica SQL</span>
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
                                    <pre className="text-[9px] font-mono text-slate-600 bg-white p-3 rounded border border-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto shadow-inner">
                                      {action.SCRIPT_ACAO_COMPLETO}
                                    </pre>
                                 </div>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <Unlink size={32} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum Vínculo Detectado</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center gap-3">
           <button 
             onClick={() => window.open(`http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=${selectedDoc}`, '_blank')}
             className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
           >
             Abrir no Editor
           </button>
           <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)]/20 transition-all shadow-sm">
             <RefreshCw size={16} onClick={() => fetchMetadata(selectedDoc!)} className={metadataLoading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div id="print-area" className="hidden print:block print:bg-white print:text-black w-full" style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999 }}>
        <div className="p-8">
          <div className="mb-8 border-b-4 border-black pb-4">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Relatório de Perfis Vinculados</h1>
            <div className="mt-4 grid grid-cols-3 gap-8 text-[12px] font-mono uppercase">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Identificador do Documento</span>
                <b className="text-lg">{selectedDoc}</b>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Data de Geração</span>
                <b suppressHydrationWarning>{reportDate || '...'}</b>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px]">Total de Perfis</span>
                <b className="text-emerald-700">{filteredProfileData.length}</b>
              </div>
            </div>
          </div>
          
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100 italic border-b-2 border-black">
                <th className="border border-slate-300 px-4 py-3 text-left">CÓD. DOC</th>
                <th className="border border-slate-300 px-4 py-3 text-left">NOME DO DOCUMENTO</th>
                <th className="border border-slate-300 px-4 py-3 text-left">PERFIL AMBULATORIAL</th>
                <th className="border border-slate-300 px-4 py-3 text-center">EMPRESA</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfileData.map((perf, idx) => (
                <tr key={idx} className="border-b border-slate-200 break-inside-avoid">
                  <td className="border border-slate-300 px-4 py-2 font-mono">{perf.CD_DOCUMENTO || selectedDoc}</td>
                  <td className="border border-slate-300 px-4 py-2 uppercase">{perf.NM_TITULO || '-'}</td>
                  <td className="border border-slate-300 px-4 py-2 font-bold">{perf.DS_PERFIL_AMBULATORIAL || '-'}</td>
                  <td className="border border-slate-300 px-4 py-2 text-center uppercase">{perf.EMPRESA || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 italic">
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
