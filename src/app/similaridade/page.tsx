"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Filter, 
  ScanEye, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  ListFilter, 
  XCircle, 
  Printer, 
  AlertTriangle, 
  Loader2, 
  ArrowRight,
  Database,
  SearchCode,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Calendar,
  User,
  X,
  Split
} from 'lucide-react';

import type { DocMapping } from '@/lib/storage';

export default function SimilaridadePage() {
  const [similarityData, setSimilarityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeConnName, setActiveConnName] = useState('');
  const [similarityQuery, setSimilarityQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [docMappings, setDocMappings] = useState<DocMapping[]>([]);
  const [showMappingsModal, setShowMappingsModal] = useState(false);
  const [reportUrl, setReportUrl] = useState('http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=');

  // Filtros
  const [filters, setFilters] = useState({
    documento: '',
    campo: '',
    prestador: '',
    dataInicio: '',
    dataFim: '',
    minScore: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Estado para Modal de Comparação
  const [comparingDoc, setComparingDoc] = useState<any | null>(null);
  const [comparisonTexts, setComparisonTexts] = useState<any | null>(null);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const resConn = await fetch('/api/connections');
      const storage = await resConn.json();
      const active = storage.connections.find((c: any) => c.id === storage.activeConnectionId);
      if (active) setActiveConnName(active.name);
      if (storage.similarityQuery) setSimilarityQuery(storage.similarityQuery);
      if (storage.docMappings) setDocMappings(storage.docMappings);
      if (storage.reportBaseUrl) setReportUrl(storage.reportBaseUrl);
    } catch (err) {}
  }

  async function handleSaveMappings(newMappings: DocMapping[]) {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'SAVE_DOC_MAPPINGS',
          mappings: newMappings
        }),
      });
      if (res.ok) {
        setDocMappings(newMappings);
        setShowMappingsModal(false);
      }
    } catch (err) {
      console.error('Erro ao salvar mapeamentos:', err);
    }
  }

  // Helper para buscar valor de chave independente de case ou aspas
  const getVal = (row: any, key: string) => {
    const target = key.toUpperCase();
    const foundKey = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === target);
    return foundKey ? row[foundKey] : undefined;
  };

  async function handleSearch() {
    // Validação de Campos Obrigatórios
    if (!filters.documento || !filters.campo || !filters.dataInicio || !filters.dataFim) {
      setError('Por favor, preencha o Cód. Documento, Identificador Campo e o período para consultar.');
      return;
    }

    // Validação de Lógica de Datas
    if (filters.dataFim < filters.dataInicio) {
      setError('A Data Fim não pode ser anterior à Data Início.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    setSimilarityData([]);
    setCurrentPage(1);

    try {
      // Usar query dinâmica do Motor SQL se disponível, caso contrário usar fallback
      const query = similarityQuery || `
        SELECT 
            CD_ATENDIMENTO as ATENDIMENTO,
            CD_DOCUMENTO as DOCUMENTO,
            DS_DOCUMENTO as NOME_DOCUMENTO,
            IDENTIFICADOR_FILTRO as IDENTIFICADOR,
            TO_CHAR(DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') as DATA_HORA_ISO,
            DH_FECHAMENTO as DATA_HORA,
            CD_PRESTADOR as PRESTADOR,
            LEITO,
            UNIDADE,
            GRAU_SIMILARIDADE as SCORE
        FROM 
            DBAMV.TB_AUDITORIA_SIMILARIDADE
        WHERE 
            CD_DOCUMENTO = :CD_DOCUMENTO
            AND IDENTIFICADOR_FILTRO = :IDENTIFICADOR
            AND DH_FECHAMENTO BETWEEN TO_DATE(:DATA_INI, 'YYYY-MM-DD') AND TO_DATE(:DATA_FIM, 'YYYY-MM-DD') + 1
        ORDER BY 
            CD_ATENDIMENTO DESC, DH_FECHAMENTO DESC
      `;

      const execRes = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          params: {
            CD_DOCUMENTO: filters.documento,
            IDENTIFICADOR: filters.campo,
            CD_CAMPO: filters.campo, // Mantém compatibilidade com queries salvas antigas no storage
            DATA_INI: filters.dataInicio,
            DATA_FIM: filters.dataFim
          }
        }),
      });
      
      const result = await execRes.json();
      if (execRes.ok) {
        setSimilarityData(result.rows || []);
      } else {
        setError(result.error || 'Erro ao consultar similaridade.');
      }
    } catch (err) {
      setError('Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchComparison(doc: any) {
    setCompLoading(true);
    setComparisonTexts(null);
    try {
      // Otimização de Performance: Ignoramos a View analítica (lenta para registros únicos) 
      // e fazemos uma busca cirúrgica direta pelos índices do banco.
      const query = `
        WITH BaseDoc AS (
            SELECT 
                ATE.CD_PACIENTE,
                ECA.CD_CAMPO,
                PDC.DH_FECHAMENTO,
                PDC.CD_DOCUMENTO_CLINICO as CD_DOC_CLINICO,
                PEC.CD_EDITOR_REGISTRO as CD_REG_ATUAL,
                DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) as TEXTO_ATUAL
            FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
            JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
            JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO
            JOIN DBAMV.EDITOR_CAMPO ECA ON ECA.CD_CAMPO = ERC.CD_CAMPO
            JOIN DBAMV.ATENDIME ATE ON ATE.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
            WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO
              AND PEC.CD_DOCUMENTO = :CD_DOCUMENTO
              AND ECA.DS_IDENTIFICADOR = :IDENTIFICADOR
              AND TO_CHAR(PDC.DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') = :DATA_HORA
              AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
              AND ROWNUM = 1
        )
        SELECT 
            B.TEXTO_ATUAL,
            TO_CHAR(B.DH_FECHAMENTO, 'DD/MM/YYYY HH24:MI:SS') as DATA_HORA_ATUAL,
            B.CD_DOC_CLINICO as CD_DOCUMENTO_ATUAL,
            B.CD_REG_ATUAL as CD_REGISTRO_ATUAL,
            (
                SELECT TEXTO_PREV FROM (
                    SELECT DBMS_LOB.SUBSTR(ERC2.LO_VALOR, 4000, 1) as TEXTO_PREV
                    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                    JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                    JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                    JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                    WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                      AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                      AND ERC2.CD_CAMPO = B.CD_CAMPO
                      AND PDC2.DH_FECHAMENTO < B.DH_FECHAMENTO
                      AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                    ORDER BY PDC2.DH_FECHAMENTO DESC
                ) WHERE ROWNUM = 1
            ) as TEXTO_ANTERIOR,
            (
                SELECT TO_CHAR(DH_PREV, 'DD/MM/YYYY HH24:MI:SS') FROM (
                    SELECT PDC2.DH_FECHAMENTO as DH_PREV
                    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                    JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                    JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                    JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                    WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                      AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                      AND ERC2.CD_CAMPO = B.CD_CAMPO
                      AND PDC2.DH_FECHAMENTO < B.DH_FECHAMENTO
                      AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                    ORDER BY PDC2.DH_FECHAMENTO DESC
                ) WHERE ROWNUM = 1
            ) as DATA_HORA_ANTERIOR,
            (
                SELECT CD_PREV FROM (
                    SELECT PDC2.CD_DOCUMENTO_CLINICO as CD_PREV
                    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                    JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                    JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                    JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                    WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                      AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                      AND ERC2.CD_CAMPO = B.CD_CAMPO
                      AND PDC2.DH_FECHAMENTO < B.DH_FECHAMENTO
                      AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                    ORDER BY PDC2.DH_FECHAMENTO DESC
                ) WHERE ROWNUM = 1
            ) as CD_DOCUMENTO_ANTERIOR,
            (
                SELECT CD_REG_PREV FROM (
                    SELECT PEC2.CD_EDITOR_REGISTRO as CD_REG_PREV
                    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                    JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                    JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                    JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                    WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                      AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                      AND ERC2.CD_CAMPO = B.CD_CAMPO
                      AND PDC2.DH_FECHAMENTO < B.DH_FECHAMENTO
                      AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                    ORDER BY PDC2.DH_FECHAMENTO DESC
                ) WHERE ROWNUM = 1
            ) as CD_REGISTRO_ANTERIOR
        FROM BaseDoc B
      `;

      // Extraímos os valores usando o helper robusto
      const cdAtendimento = getVal(doc, 'ATENDIMENTO');
      const docId = getVal(doc, 'DOCUMENTO');
      const fieldId = getVal(doc, 'IDENTIFICADOR');
      let dataHoraIso = getVal(doc, 'DATA_HORA_ISO');

      // Correção: Se a consulta do usuário não retornou DATA_HORA_ISO, fazemos o parse localmente resgatando o Timezone
      if (!dataHoraIso) {
        const rawDate = getVal(doc, 'DATA_HORA');
        if (rawDate) {
           const d = new Date(rawDate);
           const pad = (n: number) => n.toString().padStart(2, '0');
           // Retorna o horário local do navegador (-3h) que anula o shift UTC do JSON
           dataHoraIso = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
      }

      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          params: { 
            CD_ATENDIMENTO: cdAtendimento,
            CD_DOCUMENTO: docId,
            IDENTIFICADOR: fieldId,
            DATA_HORA: dataHoraIso || '' // Previne undefined
          } 
        }),
      });
      
      const result = await res.json();
              if (result.rows && result.rows.length > 0) {
                setComparisonTexts({
                  atual: getVal(result.rows[0], 'TEXTO_ATUAL') || '',
                  anterior: getVal(result.rows[0], 'TEXTO_ANTERIOR') || 'Sem registro anterior para comparação.',
                  dataAtual: getVal(result.rows[0], 'DATA_HORA_ATUAL'),
                  dataAnterior: getVal(result.rows[0], 'DATA_HORA_ANTERIOR'),
                  cdAtual: getVal(result.rows[0], 'CD_DOCUMENTO_ATUAL'),
                  cdAnterior: getVal(result.rows[0], 'CD_DOCUMENTO_ANTERIOR'),
                  regAtual: getVal(result.rows[0], 'CD_REGISTRO_ATUAL'),
                  regAnterior: getVal(result.rows[0], 'CD_REGISTRO_ANTERIOR')
                });
              }
    } catch (err) {
      console.error('Erro ao buscar comparação:', err);
    } finally {
      setCompLoading(false);
    }
  }

  const filteredData = useMemo(() => {
    let data = [...(similarityData || [])];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some(v => String(v).toLowerCase().includes(term))
      );
    }

    if (filters.prestador) {
      data = data.filter(row => String(getVal(row, 'PRESTADOR') || '').includes(filters.prestador));
    }

    if (filters.minScore > 0) {
      data = data.filter(row => (Number(getVal(row, 'SCORE')) || 0) >= filters.minScore);
    }

    return data;
  }, [similarityData, searchTerm, filters.prestador, filters.minScore]);
  
  // Opções para o select de Identificadores baseado no Doc selecionado
  const fieldOptions = useMemo(() => {
    if (!filters.documento) return [];
    const mapping = docMappings.find(m => m.id === filters.documento);
    return mapping ? mapping.fields : [];
  }, [filters.documento, docMappings]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="min-h-screen flex flex-col space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center gap-4 border-b border-slate-200 pb-6">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic tracking-tighter">
            <ScanEye className="text-[var(--primary)]" size={28} />
            Auditoria de Similaridade
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">EMR Redundancy Audit Engine</span>
            <span className={`px-2 py-0.5 rounded-[var(--radius)] text-[9px] font-black uppercase border ${activeConnName ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200 italic'}`}>
                {activeConnName || 'DISCONNECTED'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--primary)] transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Filtro rápido nos resultados..."
              className="bg-white border border-slate-200 rounded-[var(--radius)] pl-9 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-[var(--primary)] w-72 transition-all shadow-sm disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!hasSearched || loading}
            />
          </div>
        </div>
      </header>

      {/* Painel de Filtros Ultra-Compacto (Single Line) */}
      <div className="bg-white border border-slate-200 rounded-[var(--radius)] p-4 shadow-sm relative group overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 lg:gap-4">
          {/* Documento (Selector) - Ampliado conforme solicitado */}
          <div className="flex-1 min-w-[280px] max-w-[400px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
              Documento <span className="text-rose-500">*</span>
            </label>
            <select 
              className={`w-full bg-slate-50 border rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none transition-all ${!filters.documento && hasSearched ? 'border-rose-300' : 'border-slate-200 focus:border-[var(--primary)]'}`}
              value={filters.documento}
              onChange={(e) => {
                const newDoc = e.target.value;
                setFilters(f => ({...f, documento: newDoc, campo: ''}));
              }}
            >
              <option value="">Selecione o Documento...</option>
              {docMappings.map(m => (
                <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
              ))}
            </select>
          </div>

          {/* Identificador (Selector Dependente) - Ampliado conforme solicitado */}
          <div className="flex-1 min-w-[220px] max-w-[320px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
              Campo (Identificador) <span className="text-rose-500">*</span>
            </label>
            <select 
              className={`w-full bg-slate-50 border rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none transition-all ${!filters.campo && hasSearched ? 'border-rose-300' : 'border-slate-200 focus:border-[var(--primary)]'}`}
              value={filters.campo}
              onChange={(e) => setFilters(f => ({...f, campo: e.target.value}))}
              disabled={!filters.documento}
            >
              <option value="">{filters.documento ? 'Selecione o Identificador...' : 'Aguardando Documento...'}</option>
              {fieldOptions.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setShowMappingsModal(true)}
            className="h-[34px] w-[34px] min-w-[34px] bg-slate-50 border border-slate-200 text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)] rounded-[var(--radius)] flex items-center justify-center transition-all shadow-sm"
            title="Gerenciar Documentos e Campos"
          >
            <SettingsIcon size={16} />
          </button>

          {/* Datas */}
          <div className="w-[130px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} /> Início <span className="text-rose-500">*</span>
            </label>
            <input 
              type="date" 
              className={`w-full bg-slate-50 border rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none transition-all ${!filters.dataInicio && hasSearched ? 'border-rose-300' : 'border-slate-200 focus:border-[var(--primary)]'}`}
              value={filters.dataInicio}
              onChange={(e) => {
                const initDate = e.target.value;
                setFilters(f => {
                  const payload = { ...f, dataInicio: initDate };
                  if (f.dataFim && initDate > f.dataFim) {
                    payload.dataFim = initDate;
                  }
                  return payload;
                });
              }}
            />
          </div>
          <div className="w-[130px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} /> Fim <span className="text-rose-500">*</span>
            </label>
            <input 
              type="date" 
              className={`w-full bg-slate-50 border rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none transition-all ${!filters.dataFim && hasSearched ? 'border-rose-300' : 'border-slate-200 focus:border-[var(--primary)]'}`}
              value={filters.dataFim}
              min={filters.dataInicio}
              onChange={(e) => setFilters(f => ({...f, dataFim: e.target.value}))}
            />
          </div>

          {/* Prestador (10 chars aprox) */}
          <div className="w-[110px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <User size={10} /> Prestador
            </label>
            <input 
              type="text" 
              placeholder="000000"
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none focus:border-[var(--primary)] transition-all"
              value={filters.prestador}
              onChange={(e) => setFilters(f => ({...f, prestador: e.target.value}))}
            />
          </div>

          {/* Score - Redimensionado conforme solicitado */}
          <div className="w-[115px] space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ChevronUp size={10} /> Score Mín.
            </label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-[var(--radius)] px-2 py-1.5 text-[11px] font-bold outline-none focus:border-[var(--primary)] transition-all"
              value={filters.minScore}
              onChange={(e) => setFilters(f => ({...f, minScore: Number(e.target.value)}))}
            >
              <option value="0">Todos</option>
              <option value="50">+50%</option>
              <option value="80">+80%</option>
              <option value="90">+90%</option>
              <option value="95">+95%</option>
            </select>
          </div>

          {/* Botão de Busca (Icon-only Dark) */}
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="h-[34px] w-[45px] bg-slate-900 hover:bg-black text-white rounded-[var(--radius)] flex items-center justify-center transition-all shadow-lg hover:shadow-slate-200 disabled:opacity-50"
            title="Executar Auditoria"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <SearchCode size={20} />}
          </button>
        </div>
      </div>

      {/* Tabela de Resultados ou Estado Inicial */}
      {!hasSearched ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-[var(--radius)] bg-slate-50/50">
            <div className="p-6 bg-white rounded-full shadow-xl mb-6 text-slate-300">
                <Search size={64} strokeWidth={1} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Aguardando Parâmetros</h3>
            <p className="text-sm text-slate-400 font-medium max-w-xs text-center mt-2 leading-relaxed">
                Preencha o <b className="text-slate-600">Código do Documento</b> e o <b className="text-slate-600">Período</b> acima para iniciar a auditoria na base de dados.
            </p>
        </div>
      ) : (
        <div className="bg-white rounded-[var(--radius)] border border-slate-200 flex flex-col overflow-hidden shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-collapse table-auto min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Atend..</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Documento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Prestador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Localização</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Similaridade</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Consultando Base de Similaridade...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((row, idx) => {
                    const score = Number(getVal(row, 'SCORE')) || 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-3 text-[11px] font-mono text-center text-slate-400">{getVal(row, 'ATENDIMENTO')}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800">{getVal(row, 'NOME_DOCUMENTO')}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">ID: {getVal(row, 'DOCUMENTO')} | {getVal(row, 'IDENTIFICADOR')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-[10px] font-bold text-slate-600">
                          {new Date(getVal(row, 'DATA_HORA')).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-3 text-center text-[10px] font-black text-slate-400">
                          {getVal(row, 'PRESTADOR')}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-700">{getVal(row, 'LEITO') || 'N/A'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{getVal(row, 'UNIDADE') || 'EXTERNO'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${getScoreColor(score)}`}>
                            {score.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button 
                            onClick={() => {
                              setComparingDoc(row);
                              fetchComparison(row);
                            }}
                            className="p-2 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-[var(--radius)] transition-all"
                            title="Comparar Lado a Lado"
                          >
                            <Split size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-24 text-center opacity-40">
                      <XCircle size={48} className="mx-auto mb-4 text-slate-300" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nenhum registro encontrado para este critério</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
               <span>Volume: <b className="text-slate-900">{filteredData.length}</b> registros analíticos</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
              >
                Anterior
              </button>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-4 py-1.5 bg-slate-900 border border-slate-900 text-white rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-800 transition-all shadow-sm"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comparação Side-by-Side */}
      {comparingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setComparingDoc(null)}></div>
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[var(--radius)] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-[var(--radius)] shadow-lg shadow-slate-200">
                  <ScanEye size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                    Medlytics Pro Audit
                  </h2>
                  <p className="text-slate-500 font-bold mt-0.5 text-[10px] tracking-[0.2em] uppercase">Auditoria de Similaridade Inteligente • PLN</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Doc: {getVal(comparingDoc, 'DOCUMENTO')} | Similaridade: <b className="text-[var(--primary)]">{(Number(getVal(comparingDoc, 'SCORE')) || 0).toFixed(1)}%</b>
                  </p>
                </div>
              </div>
              <button onClick={() => setComparingDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-hidden flex divide-x divide-slate-100">
              {/* Texto Anterior */}
              <div className="flex-1 flex flex-col">
                <div className="px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico (Anterior)</span>
                    {comparisonTexts?.dataAnterior && (
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5 opacity-80 flex items-center gap-2">
                        <span>{comparisonTexts.dataAnterior} {comparisonTexts.cdAnterior && `| DOC: ${comparisonTexts.cdAnterior}`}</span>
                        {comparisonTexts.regAnterior && (
                          <a 
                            href={`${reportUrl}${comparisonTexts.regAnterior}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-slate-200/60 hover:bg-slate-300 text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors" 
                            title="Imprimir Registro Anterior"
                          >
                            <Printer size={10} /> PDF
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-black">ORIGINAL/ANTERIOR</div>
                </div>
                <div className="flex-1 p-8 overflow-y-auto font-serif text-slate-600 leading-relaxed bg-slate-50/30">
                  {compLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                       <Loader2 className="animate-spin text-slate-200" size={32} />
                       <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Recuperando Histórico...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{comparisonTexts?.anterior || 'Sem registro anterior para comparação.'}</div>
                  )}
                </div>
              </div>

              {/* Divisor Visual */}
              <div className="relative group overflow-visible">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 p-2 rounded-full shadow-lg z-10 text-[var(--primary)]">
                    <ArrowRight size={16} strokeWidth={3} />
                 </div>
              </div>

              {/* Texto Atual */}
              <div className="flex-1 flex flex-col">
                <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">Auditoria (Atual)</span>
                    {comparisonTexts?.dataAtual && (
                      <span className="text-[9px] font-bold text-[var(--primary)] mt-0.5 opacity-80 flex items-center gap-2">
                        <span>{comparisonTexts.dataAtual} {comparisonTexts.cdAtual && `| DOC: ${comparisonTexts.cdAtual}`}</span>
                        {comparisonTexts.regAtual && (
                          <a 
                            href={`${reportUrl}${comparisonTexts.regAtual}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors" 
                            title="Imprimir Registro Atual"
                          >
                            <Printer size={10} /> PDF
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-black border ${getScoreColor(Number(getVal(comparingDoc, 'SCORE')) || 0)}`}>
                    {(Number(getVal(comparingDoc, 'SCORE')) || 0).toFixed(1)}% SIMILAR
                  </div>
                </div>
                <div className="flex-1 p-8 overflow-y-auto font-serif text-slate-800 leading-relaxed bg-white">
                  {compLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                       <Loader2 className="animate-spin text-slate-200" size={32} />
                       <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Recuperando Texto Atual...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {comparisonTexts?.atual || 'Texto atual indisponível.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prestador:</span>
                    <span className="text-[11px] font-black text-slate-700">{getVal(comparingDoc, 'PRESTADOR')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Local:</span>
                    <span className="text-[11px] font-black text-slate-700">{getVal(comparingDoc, 'LEITO')} | {getVal(comparingDoc, 'UNIDADE')}</span>
                 </div>
              </div>
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
              >
                <Printer size={16} /> Imprimir Laudo Auditoria
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Mapeamentos (DOC/CAMPO) */}
      {showMappingsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setShowMappingsModal(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[var(--radius)] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900 text-white rounded-[var(--radius)]">
                    <SettingsIcon size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">Gerenciar Mapeamentos</h3>
               </div>
               <button onClick={() => setShowMappingsModal(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={20} />
               </button>
            </header>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
               <div className="space-y-4">
                 {docMappings.map((mapping, mIdx) => (
                   <div key={mIdx} className="p-4 border border-slate-200 rounded-[var(--radius)] bg-slate-50 relative group/card">
                     <button 
                       onClick={() => handleSaveMappings(docMappings.filter((_, i) => i !== mIdx))}
                       className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                     >
                       <Trash2 size={14} />
                     </button>
                     
                     <div className="grid grid-cols-2 gap-4 mb-4">
                       <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cód. Documento</label>
                         <input 
                           type="text" 
                           className="w-full bg-white border border-slate-200 rounded-[var(--radius)] px-3 py-1.5 text-xs font-bold"
                           value={mapping.id}
                           onChange={(e) => {
                             const newList = [...docMappings];
                             newList[mIdx].id = e.target.value;
                             setDocMappings(newList);
                           }}
                         />
                       </div>
                       <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome Amigável</label>
                         <input 
                           type="text" 
                           className="w-full bg-white border border-slate-200 rounded-[var(--radius)] px-3 py-1.5 text-xs font-bold"
                           value={mapping.name}
                           onChange={(e) => {
                             const newList = [...docMappings];
                             newList[mIdx].name = e.target.value;
                             setDocMappings(newList);
                           }}
                         />
                       </div>
                     </div>

                     <div>
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Campos (Identificadores)</label>
                       <div className="flex flex-wrap gap-2 mb-4">
                         {mapping.fields.map((field, fIdx) => (
                           <div key={fIdx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full group/tag">
                             <div className="flex flex-col leading-none">
                               <span className="text-[10px] font-bold text-slate-800">{field.name}</span>
                               <span className="text-[7px] font-mono text-slate-400 uppercase">{field.id}</span>
                             </div>
                             <button 
                               onClick={() => {
                                 const newList = [...docMappings];
                                 newList[mIdx].fields = mapping.fields.filter((_, i) => i !== fIdx);
                                 setDocMappings(newList);
                               }}
                               className="text-slate-300 hover:text-rose-500 ml-1"
                             >
                               <X size={10} />
                             </button>
                           </div>
                         ))}
                       </div>

                       <div className="bg-slate-100/50 p-3 rounded-[var(--radius)] border border-slate-200 border-dashed">
                         <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 block">ID Técnico (Oracle)</label>
                              <input 
                                id={`new-field-id-${mIdx}`}
                                type="text"
                                placeholder="EX: EVOLUCAO"
                                className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-[var(--radius)] text-[10px] font-bold outline-none focus:border-[var(--primary)]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 block">Descrição Amigável</label>
                              <input 
                                id={`new-field-name-${mIdx}`}
                                type="text"
                                placeholder="EX: Evolução Médica"
                                className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-[var(--radius)] text-[10px] font-bold outline-none focus:border-[var(--primary)]"
                              />
                            </div>
                            <button 
                              onClick={() => {
                                const idInput = document.getElementById(`new-field-id-${mIdx}`) as HTMLInputElement;
                                const nameInput = document.getElementById(`new-field-name-${mIdx}`) as HTMLInputElement;
                                const id = idInput.value.trim().toUpperCase();
                                const name = nameInput.value.trim();
                                
                                if (id && name) {
                                  const newList = [...docMappings];
                                  newList[mIdx].fields.push({ id, name });
                                  setDocMappings(newList);
                                  idInput.value = '';
                                  nameInput.value = '';
                                } else {
                                  alert('Por favor, preencha o ID Técnico e a Descrição.');
                                }
                              }}
                              className="h-[30px] px-4 bg-slate-900 text-white rounded-[var(--radius)] text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                              Vincular Campo
                            </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>

               <button 
                 onClick={() => setDocMappings([...docMappings, { id: '', name: '', fields: [] }])}
                 className="w-full py-3 border-2 border-dashed border-slate-200 rounded-[var(--radius)] text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-bold text-sm"
               >
                 <Plus size={18} /> Adicionar Novo Documento
               </button>
            </div>

            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={() => setShowMappingsModal(false)}
                 className="px-6 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700"
               >
                 Cancelar
               </button>
               <button 
                 onClick={() => handleSaveMappings(docMappings)}
                 className="px-8 py-2 bg-slate-900 text-white rounded-[var(--radius)] text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-md"
               >
                 Salvar Mapeamentos
               </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
