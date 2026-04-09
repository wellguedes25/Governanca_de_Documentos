"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Filter, FileText, Download, GripVertical, Check, X, ChevronUp, ChevronDown, ListFilter, XCircle, FileSpreadsheet, Printer, AlertTriangle, Loader2 } from 'lucide-react';
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

        <div className={`bg-white rounded-[var(--radius)] border border-slate-200 flex flex-col overflow-hidden shadow-md w-full max-w-full transition-all duration-500 ease-in-out ${selectedDoc ? 'min-h-[300px] max-h-[300px]' : 'min-h-[600px]'}`}>
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 w-full relative">
            {paginatedData.length > 0 ? (
              <table className="w-full text-left border-collapse table-auto select-none min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 shadow-sm border-b border-slate-200">
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
                        onClick={() => setSelectedDoc(docCode)}
                        className={`transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-[var(--primary)]/5 border-[var(--primary)] text-slate-900' : 'hover:bg-slate-50 border-transparent text-slate-600'}`}
                      >
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
                              if (strVal === '0') return <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mx-auto" />;
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
