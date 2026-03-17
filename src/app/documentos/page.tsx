"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, RefreshCw, Filter, FileText, Download, GripVertical, Check, X, ChevronUp, ChevronDown, ListFilter, XCircle, FileSpreadsheet, Printer } from 'lucide-react';
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
    if (!profileData.length) return;
    
    // Função auxiliar para escapar CSV padrão (delimitador vírgula)
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      let s = String(val).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
      return `"${s}"`;
    };

    const headers = ['Cód. Doc', 'Nome Documento', 'Perfil Ambulatorial', 'Empresa'];
    const rows = profileData.map(p => [
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
        body: JSON.stringify({ type: 'EXECUTE' }),
      });
      
      const result = await execRes.json();
      if (execRes.ok) {
        setOracleData(result.rows || []);
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

  const profileTotalPages = Math.ceil(profileData.length / profilePageSize);
  const paginatedProfileData = useMemo(() => {
    const start = (profileCurrentPage - 1) * profilePageSize;
    return profileData.slice(start, start + profilePageSize);
  }, [profileData, profileCurrentPage]);

  return (
    <div className="min-h-screen flex flex-col space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="print:hidden space-y-6">
        <header className="flex justify-between items-center gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-[var(--primary)]" size={24} />
              Documentos em Uso
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visualização em Tempo Real</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${activeConnName ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20 italic'}`}>
                  {activeConnName || 'SEM CONEXÃO'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[var(--primary)] transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Pesquisar registros..."
                className="bg-[var(--card)]/50 border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-[var(--primary)]/50 w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchInitialData(true)}
              disabled={loading}
              title="Atualizar Dados do Oracle"
              className="p-2 bg-[var(--primary)] hover:brightness-110 text-white rounded-lg shadow-lg shadow-[var(--primary)]/20 transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="text-xs font-bold uppercase tracking-tight pr-1">Atualizar</span>
            </button>
            <button 
              title="Exportar CSV"
              className="p-2 bg-[var(--card)] hover:bg-[var(--accent)] text-slate-400 hover:text-white rounded-lg border border-[var(--border)] transition-all"
            >
              <Download size={14} />
            </button>
          </div>
        </header>
        
        <div className="bg-[var(--card)]/30 border border-[var(--border)] rounded-xl p-3 flex flex-wrap items-center gap-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-top duration-700 relative overflow-visible">
          <div className="flex items-center gap-2 text-slate-400">
            <ListFilter size={16} className="text-[var(--primary)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest min-w-fit">Filtros:</span>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <input 
              type="text" 
              placeholder="CÓDIGO..."
              className="bg-[var(--background)]/50 border border-[var(--border)] rounded-md px-3 py-1 text-[10px] text-slate-300 outline-none focus:border-[var(--primary)] w-24 transition-all"
              value={columnFilters.CÓDIGO}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, CÓDIGO: e.target.value }))}
            />
            <input 
              type="text" 
              placeholder="NOME DO DOCUMENTO..."
              className="bg-[var(--background)]/50 border border-[var(--border)] rounded-md px-3 py-1 text-[10px] text-slate-300 outline-none focus:border-[var(--primary)] flex-1 min-w-[200px] transition-all"
              value={columnFilters.NOME}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, NOME: e.target.value }))}
            />
            <select 
              className="bg-[var(--background)]/50 border border-[var(--border)] rounded-md px-3 py-1 text-[10px] text-slate-300 outline-none focus:border-[var(--primary)] w-32 transition-all cursor-pointer"
              value={columnFilters.EMPRESA}
              onChange={(e) => setColumnFilters(pf => ({ ...pf, EMPRESA: e.target.value }))}
            >
              <option value="">EMPRESA (TODAS)</option>
              <option value="HSC">HSC</option>
              <option value="CSSJ">CSSJ</option>
              <option value="HST">HST</option>
              <option value="HSJ">HSJ</option>
              <option value="HMRP">HMRP</option>
              <option value="HCNSC">HCNSC</option>
              <option value="HR">HR</option>
            </select>
          </div>

          {(columnFilters.CÓDIGO || columnFilters.NOME || columnFilters.EMPRESA) && (
            <button 
              onClick={() => {
                setColumnFilters({ CÓDIGO: '', NOME: '', EMPRESA: '' });
                setSelectedDoc(null);
                setProfileData([]);
              }}
              className="p-1 px-3 text-[9px] font-bold text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-md transition-all flex items-center gap-1.5 uppercase"
            >
              <X size={10} /> Limpar
            </button>
          )}
        </div>

        <div className={`glass rounded-xl border border-slate-700/50 flex flex-col overflow-hidden shadow-2xl w-full max-w-full transition-all duration-500 ease-in-out ${selectedDoc ? 'min-h-[250px] max-h-[250px]' : 'min-h-[500px]'}`}>
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 w-full relative">
            {paginatedData.length > 0 ? (
              <table className="w-full text-left border-collapse table-auto select-none min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--accent)] shadow-sm">
                    {Object.keys(paginatedData[0]).map((key) => {
                      const cleanKey = key.replace(/"/g, '');
                      const isName = cleanKey.toUpperCase() === 'NOME';
                      const width = columnWidths[key] || (isName ? 150 : 65);
                      return (
                        <th 
                          key={key} 
                          style={{ width, minWidth: width, maxWidth: isName ? 150 : 'none' }}
                          onClick={() => handleSort(key)}
                          className={`relative px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-100 transition-colors border-r border-[var(--border)]/50 whitespace-nowrap cursor-pointer group/th ${isName ? 'overflow-hidden text-ellipsis' : 'text-center'} ${sortConfig.key === key ? 'bg-[var(--primary)]/5 text-white' : ''}`}
                        >
                          <div className={`flex items-center gap-1.5 ${!isName ? 'justify-center' : ''}`}>
                            <Filter size={8} className={`transition-colors ${sortConfig.key === key ? 'text-[var(--primary)]' : 'text-slate-600 group-hover/th:text-slate-400'}`} />
                            {cleanKey}
                            {sortConfig.key === key && (
                              <span className="text-[var(--primary)]">
                                {sortConfig.direction === 'asc' ? <ChevronUp size={10} strokeWidth={3} /> : <ChevronDown size={10} strokeWidth={3} />}
                              </span>
                            )}
                          </div>
                          <div 
                            onMouseDown={(e) => handleMouseDown(e, key)}
                            className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-[var(--primary)]/30 group/resizer flex items-center justify-center transition-colors"
                          >
                            <GripVertical size={10} className="text-slate-700 group-hover/resizer:text-[var(--primary)] opacity-0 group-hover/resizer:opacity-100 transition-opacity" />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/30 font-mono">
                  {paginatedData.map((row, idx) => {
                    const docCode = String(row['CÓDIGO'] || row['\"CÓDIGO\"'] || '');
                    const isSelected = selectedDoc === docCode;
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedDoc(docCode)}
                        className={`transition-all group cursor-pointer border-l-2 ${isSelected ? 'bg-[var(--primary)]/10 border-[var(--primary)]' : 'hover:bg-[var(--primary)]/5 border-transparent'}`}
                      >
                        {Object.entries(row).map(([key, val], vIdx) => {
                          const isName = key.replace(/"/g, '').toUpperCase() === 'NOME';
                          const width = columnWidths[key] || (isName ? 150 : 65);
                          const renderValue = () => {
                            if (val === null || val === undefined) return <span className="text-slate-700 italic opacity-50">null</span>;
                            const strVal = String(val);
                            const cleanKey = key.replace(/"/g, '').toUpperCase();
                            const companyCols = ['HSC', 'CSSJ', 'HST', 'HSJ', 'HCNSC', 'HMRP', 'HR'];
                            if (companyCols.includes(cleanKey)) {
                              if (strVal === '1') return <Check size={14} className="text-emerald-500 mx-auto" />;
                              if (strVal === '0') return <X size={14} className="text-rose-500 mx-auto" />;
                            }
                            if (strVal.includes('T') && !isNaN(Date.parse(strVal))) {
                              return <span suppressHydrationWarning>{new Date(strVal).toLocaleString('pt-BR')}</span>;
                            }
                            if (/^\d{2}\.\d{2}\.\d{4}/.test(strVal)) {
                              return strVal.split(' ').map((part, i) => i === 0 ? part.replaceAll('.', '/') : part).join(' ');
                            }
                            return strVal;
                          };
                          return (
                            <td 
                              key={vIdx} 
                              style={{ width, minWidth: width, maxWidth: isName ? 150 : 'none' }}
                              className={`px-3 py-1.5 text-[10px] text-slate-300 group-hover:text-[var(--foreground)] border-r border-[var(--border)]/20 last:border-r-0 transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${!isName ? 'text-center' : ''}`}
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
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-40 py-20">
                <div className="text-5xl animate-bounce">📦</div>
                <div className="text-center">
                  <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">
                    {loading ? 'Consultando Oracle...' : searchTerm ? 'Nenhum resultado' : 'Nenhum dado em memória'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic max-w-xs">
                    {oracleData ? 'Ajuste sua busca' : 'Clique no botão Atualizar para buscar novos dados do banco.'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--background)]/90 backdrop-blur-md border-t border-[var(--border)] text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></div>
                PÁGINA <b className="text-[var(--primary)]">{currentPage}</b> DE <b className="text-slate-300">{totalPages || 1}</b>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 uppercase tracking-tighter">
                EXIBINDO <b className="text-slate-200">{paginatedData.length}</b> DE <b className="text-slate-200">{filteredData.length}</b> REGISTROS
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-6 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-black text-slate-300 hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] hover:shadow-[0_0_15px_var(--primary)]/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  ANTERIOR
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-6 py-2 rounded-lg bg-[var(--primary)] border border-transparent text-xs font-black text-white hover:brightness-110 hover:shadow-[0_0_20px_var(--primary)]/40 transition-all disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  PRÓXIMO
                </button>
              </div>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"></span>
                  <span className="text-[var(--primary)] font-bold uppercase">Cache Ativo</span>
              </div>
            </div>
          </div>
        </div>

        {selectedDoc && (
          <div id="perfil-detalhes" className="glass rounded-xl border border-[var(--primary)]/30 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 shadow-2xl shadow-[var(--primary)]/5">
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--primary)]/10 border-b border-[var(--primary)]/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)] shadow-inner">
                  <ListFilter size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Perfis Vinculados ao Documento</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">Identificador: <b className="text-[var(--primary)]">{selectedDoc}</b></p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToCSV}
                  title="Exportar Excel (CSV)"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)]/20 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white rounded-lg border border-[var(--primary)]/30 transition-all text-[10px] font-bold uppercase tracking-tight"
                >
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
                <button 
                  onClick={exportToPDF}
                  title="Imprimir / PDF"
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/30 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-600/30 transition-all text-[10px] font-bold uppercase tracking-tight"
                >
                  <Printer size={14} />
                  PDF
                </button>
                <div className="w-px h-6 bg-[var(--primary)]/20 mx-1"></div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all hover:rotate-90 duration-300"
                  title="Fechar Detalhes"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <RefreshCw className="text-[var(--primary)] animate-spin" size={32} />
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">Sincronizando Perfis...</span>
                </div>
              ) : profileData.length > 0 ? (
                <>
                  <div className="overflow-x-auto border border-[var(--border)]/30 rounded-xl bg-[var(--background)]/40 backdrop-blur-md scrollbar-thin scrollbar-thumb-slate-700">
                    <table className="w-full text-left border-collapse table-auto min-w-max">
                      <thead>
                        <tr className="bg-[var(--accent)] text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-[var(--border)]/50">
                          <th className="px-6 py-3 border-r border-[var(--border)]/10 whitespace-nowrap">Cód. Doc</th>
                          <th className="px-6 py-3 border-r border-[var(--border)]/10 whitespace-nowrap">Nome Documento</th>
                          <th className="px-6 py-3 border-r border-[var(--border)]/10 whitespace-nowrap">Perfil Ambulatorial</th>
                          <th className="px-6 py-3 text-center whitespace-nowrap">Empresa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]/20 font-mono">
                        {paginatedProfileData.map((perf, pIdx) => (
                          <tr key={pIdx} className="hover:bg-[var(--primary)]/5 transition-all group">
                            <td className="px-6 py-3.5 text-[10px] text-slate-400 group-hover:text-[var(--primary)] border-r border-[var(--border)]/5 whitespace-nowrap">{perf.CD_DOCUMENTO || selectedDoc}</td>
                            <td className="px-6 py-3.5 text-[10px] text-slate-300 border-r border-[var(--border)]/5 uppercase whitespace-nowrap">{perf.NM_TITULO || '-'}</td>
                            <td className="px-6 py-3.5 text-[11px] text-[var(--primary)] font-bold border-r border-[var(--border)]/5 uppercase bg-[var(--primary)]/5 whitespace-nowrap">
                               <div className="flex items-center gap-3">
                                 <div className="w-1.5 h-4 bg-[var(--primary)] rounded-full shadow-[0_0_8px_var(--primary)]/50"></div>
                                 {perf.DS_PERFIL_AMBULATORIAL || 'SEM PERFIL'}
                               </div>
                            </td>
                            <td className="px-6 py-3.5 text-[10px] text-center whitespace-nowrap">
                              <span className="bg-[var(--card)] px-3 py-1 rounded-full border border-[var(--border)] text-slate-300 font-bold text-[9px] shadow-sm">
                                {perf.EMPRESA || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {profileTotalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between px-2 text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                      <div className="flex items-center gap-6">
                        <span className="flex items-center gap-2">
                          PÁGINA <b className="text-[var(--primary)] text-xs">{profileCurrentPage}</b> DE <b className="text-slate-300 text-xs">{profileTotalPages}</b>
                        </span>
                        <span className="text-slate-800">|</span>
                        <span>
                          <b className="text-slate-300">{profileData.length}</b> PERFIS VINCULADOS
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-center">
                        <button 
                          disabled={profileCurrentPage === 1}
                          onClick={() => setProfileCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-5 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--primary)] font-black hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-20 shadow-lg"
                        >
                          ANTERIOR
                        </button>
                        <button 
                          disabled={profileCurrentPage === profileTotalPages}
                          onClick={() => setProfileCurrentPage(prev => Math.min(profileTotalPages, prev + 1))}
                          className="px-5 py-2 rounded-lg bg-[var(--primary)] border border-transparent text-white font-black hover:brightness-110 transition-all disabled:opacity-20 shadow-lg shadow-[var(--primary)]/20"
                        >
                          PRÓXIMO
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center">
                  <XCircle size={48} className="text-slate-500 mb-4" />
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Nenhum vínculo detectado</p>
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">Verifique as permissões de acesso no Oracle para este documento.</p>
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
                <b className="text-emerald-700">{profileData.length}</b>
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
              {profileData.map((perf, idx) => (
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
