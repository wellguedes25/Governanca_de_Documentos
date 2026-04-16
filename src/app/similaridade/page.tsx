"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
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
  BarChart3 as ChartIcon,
  Building2,
  Stethoscope,
  ClipboardList,
  Split,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import {
  Listbox,
  Transition
} from '@headlessui/react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

import {
  Card,
  Metric,
  Text,
  Badge,
  Flex,
  Grid
} from "@tremor/react";

import type { DocMapping } from '@/lib/storage';
import * as Diff from 'diff';

export default function SimilaridadePage() {
  const [similarityData, setSimilarityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Componente para exibir o diff entre dois textos
  const DiffText = ({ oldText, newText, type }: { oldText: string, newText: string, type: 'previous' | 'current' }) => {
    const score = Number(getVal(comparingDoc, 'SCORE')) || 0;

    // Se a similaridade for 100%, exibimos o texto original sem destaques
    if (score >= 100) {
      return <div>{type === 'previous' ? oldText : newText}</div>;
    }

    const diff = Diff.diffWordsWithSpace(oldText || '', newText || '');

    return (
      <>
        {diff.map((part, index) => {
          if (type === 'previous') {
            if (part.removed) {
              return (
                <span key={index} className="bg-rose-100 text-rose-800 line-through font-bold px-0.5 rounded border-b border-rose-300">
                  {part.value}
                </span>
              );
            }
            if (part.added) return null;
            return <span key={index}>{part.value}</span>;
          } else {
            if (part.added) {
              return (
                <span key={index} className="bg-emerald-100 text-emerald-800 font-bold px-0.5 rounded border-b border-emerald-300">
                  {part.value}
                </span>
              );
            }
            if (part.removed) return null;
            return <span key={index}>{part.value}</span>;
          }
        })}
      </>
    );
  };

  // Componente Customizado de Multiseleção (UI Pro Max)
  const EnhancedMultiSelect = ({ label, icon: Icon, options, value, onChange, placeholder }: any) => (
    <div className="flex-1 min-w-[200px] space-y-1.5 h-full">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
        <Icon size={10} /> {label}
      </label>
      <Listbox value={value} onChange={onChange} multiple>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className="relative w-full bg-slate-800 border-2 border-slate-700/50 hover:border-blue-500/50 rounded-[var(--radius)] px-3 py-2 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 group">
              <span className="block truncate text-[11px] font-bold text-slate-300">
                {value.length === 0 ? (
                  <span className="text-slate-600 italic font-medium">{placeholder}</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {value.slice(0, 2).map((v: string) => (
                      <span key={v} className="bg-blue-600 text-[9px] px-1.5 py-0.5 rounded text-white font-black uppercase tracking-tighter">
                        {String(v).split(' - ')[0]}
                      </span>
                    ))}
                    {value.length > 2 && (
                      <span className="text-[9px] text-slate-500 font-bold">+{value.length - 2}</span>
                    )}
                  </div>
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-[100] mt-1.5 max-h-64 w-full overflow-auto rounded-[var(--radius)] bg-slate-900 border border-slate-700 py-1 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none scrollbar-thin scrollbar-thumb-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase italic text-center">Nenhum dado disponível</div>
                ) : (
                  options.map(([item, count]: any) => (
                    <Listbox.Option
                      key={item}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'
                        }`
                      }
                      value={item}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate text-[11px] ${selected ? 'font-black text-blue-400' : 'font-medium'}`}>
                            {item} <span className="opacity-40 text-[9px] ml-1">({count})</span>
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500">
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : (
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                              <div className="h-3 w-3 border-2 border-slate-700 rounded-sm" />
                            </div>
                          )}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
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

  // Efeito interativo do gráfico e filtros avançados
  const [selectedBin, setSelectedBin] = useState<number | null>(null);
  const [filterAtendimento, setFilterAtendimento] = useState('');
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [selectedPrestadores, setSelectedPrestadores] = useState<string[]>([]);

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
    } catch (err) { }
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
    
    // Reset de Filtros Interativos ao realizar nova busca
    setSelectedBin(null);
    setSearchTerm('');
    setFilterAtendimento('');
    setSelectedUnidades([]);
    setSelectedPrestadores([]);

    try {
      // Usar query dinâmica do Motor SQL se disponível, caso contrário usar fallback
      const query = similarityQuery || `
        SELECT 
            A.CD_ATENDIMENTO as ATENDIMENTO,
            A.CD_DOCUMENTO as DOCUMENTO,
            A.DS_DOCUMENTO as NOME_DOCUMENTO,
            A.IDENTIFICADOR_FILTRO as IDENTIFICADOR,
            TO_CHAR(A.DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') as DATA_HORA_ISO,
            A.DH_FECHAMENTO as DATA_HORA,
            A.CD_PRESTADOR as PRESTADOR,
            P.NM_PRESTADOR as NOME_PRESTADOR,
            A.LEITO,
            A.UNIDADE,
            A.GRAU_SIMILARIDADE as SCORE
        FROM 
            DBAMV.TB_AUDITORIA_SIMILARIDADE A
        LEFT JOIN
            DBAMV.PRESTADOR P ON P.CD_PRESTADOR = A.CD_PRESTADOR
        WHERE 
            A.CD_DOCUMENTO = :CD_DOCUMENTO
            AND A.IDENTIFICADOR_FILTRO = :IDENTIFICADOR
            AND A.DH_FECHAMENTO BETWEEN TO_DATE(:DATA_INI, 'YYYY-MM-DD') AND TO_DATE(:DATA_FIM, 'YYYY-MM-DD') + 1
        ORDER BY 
            A.CD_ATENDIMENTO DESC, A.DH_FECHAMENTO DESC
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
              AND PDC.DH_FECHAMENTO = TO_DATE(:DATA_HORA, 'YYYY-MM-DD HH24:MI:SS')
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
          dataHoraIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

  const fieldOptions = useMemo(() => {
    if (!filters.documento) return [];
    const mapping = docMappings.find(m => m.id === filters.documento);
    return mapping ? mapping.fields : [];
  }, [filters.documento, docMappings]);

  // --- LÓGICA DE FILTRAGEM EM CASCATA ---

  // 1. Base Filtered Data: Respeita os filtros "duros" do topo (Score Mínimo, Data e Busca Geral)
  // Isso garante que o Gráfico e os Contadores (parênteses) fiquem sincronizados com a pesquisa.
  const baseFilteredData = useMemo(() => {
    let data = [...(similarityData || [])];

    // Filtro por termo de busca geral
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(term))
      );
    }

    // Filtro por Score Mínimo (Top Bar)
    if (filters.minScore > 0) {
      data = data.filter(row => (Number(getVal(row, 'SCORE')) || 0) >= filters.minScore);
    }

    // Filtro por Atendimento específico
    if (filterAtendimento) {
      data = data.filter(row => String(getVal(row, 'ATENDIMENTO') || '').includes(filterAtendimento));
    }

    return data;
  }, [similarityData, searchTerm, filters.minScore, filterAtendimento]);

  // 2. Lógica do Gráfico de Top 10 Prestadores: Agora usa baseFilteredData
  const chartData = useMemo(() => {
    if (!baseFilteredData || baseFilteredData.length === 0) return [];

    const totalRecords = baseFilteredData.length;

    // Agrupar por Prestador e capturar Nome
    const groups: Record<string, { count: number, name: string }> = {};
    baseFilteredData.forEach(row => {
      const code = String(getVal(row, 'PRESTADOR') || 'N/A');
      const name = String(getVal(row, 'NOME_PRESTADOR') || code);
      if (!groups[code]) {
        groups[code] = { count: 0, name: name };
      }
      groups[code].count++;
    });

    const sorted = Object.entries(groups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return sorted.map(([code, data]) => {
      const percentage = ((data.count / totalRecords) * 100).toFixed(1);
      const shortName = data.name.length > 15 ? data.name.substring(0, 15) + '...' : data.name;
      
      return {
        name: code,
        fullName: `${data.name} (${code})`,
        shortLabel: `${shortName}`,
        value: data.count,
        percentage: percentage,
        code: code
      };
    });
  }, [baseFilteredData]);

  // 3. Opções para Filtros (contagem sincronizada com a pesquisa base)
  const filterOptions = useMemo(() => {
    if (!baseFilteredData || baseFilteredData.length === 0) return { unidades: [], prestadores: [] };

    const unidadesMap: Record<string, number> = {};
    const prestadoresMap: Record<string, number> = {};

    baseFilteredData.forEach(r => {
      const u = String(getVal(r, 'UNIDADE') || '');
      const p = String(getVal(r, 'PRESTADOR') || '');
      if (u) unidadesMap[u] = (unidadesMap[u] || 0) + 1;
      if (p) prestadoresMap[p] = (prestadoresMap[p] || 0) + 1;
    });

    return {
      unidades: Object.entries(unidadesMap).sort((a, b) => b[1] - a[1]),
      prestadores: Object.entries(prestadoresMap).sort((a, b) => b[1] - a[1])
    };
  }, [baseFilteredData]);

  // 4. Final Filtered Data: Aplica os filtros de Multiseleção ao resultado base
  const filteredData = useMemo(() => {
    let data = [...baseFilteredData];

    // Filtro por Unidade (Multi)
    if (selectedUnidades.length > 0) {
      data = data.filter(row => selectedUnidades.includes(String(getVal(row, 'UNIDADE') || '')));
    }

    // Filtro por Prestador (Multi)
    if (selectedPrestadores.length > 0) {
      data = data.filter(row => selectedPrestadores.includes(String(getVal(row, 'PRESTADOR') || '')));
    }

    return data;
  }, [baseFilteredData, selectedUnidades, selectedPrestadores]);

  // 5. Ticks do Eixo Y (Volume) de 10 em 10
  const yAxisTicks = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 10];
    const maxVal = Math.max(...chartData.map(d => d.value), 10);
    const steps = [];
    for (let i = 0; i <= maxVal + 10; i += 10) {
      steps.push(i);
    }
    return steps;
  }, [chartData]);

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
                setFilters(f => ({ ...f, documento: newDoc, campo: '' }));
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
              onChange={(e) => setFilters(f => ({ ...f, campo: e.target.value }))}
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
              id="data-inicio"
              type="date"
              className={`w-full bg-slate-50 border rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none transition-all ${!filters.dataInicio && hasSearched ? 'border-rose-300' : 'border-slate-200 focus:border-[var(--primary)]'}`}
              value={filters.dataInicio}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              onFocus={(e) => (e.currentTarget as any).showPicker?.()}
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
              id="data-fim"
              type="date"
              className={`w-full bg-slate-50 border rounded-[var(--radius)] px-2 py-1.5 text-xs font-bold outline-none transition-all ${!filters.dataFim && hasSearched ? 'border-rose-300' : 'border-slate-200 focus:border-[var(--primary)]'}`}
              value={filters.dataFim}
              min={filters.dataInicio}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              onFocus={(e) => (e.currentTarget as any).showPicker?.()}
              onChange={(e) => setFilters(f => ({ ...f, dataFim: e.target.value }))}
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
              onChange={(e) => setFilters(f => ({ ...f, prestador: e.target.value }))}
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
              onChange={(e) => setFilters(f => ({ ...f, minScore: Number(e.target.value) }))}
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Top KPIs (Tremor) */}
          <Grid numItemsMd={2} numItemsLg={4} className="gap-6">
            <Card decoration="top" decorationColor="blue">
              <Flex alignItems="start">
                <div className="flex flex-col">
                  <Text className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Total Analisado</Text>
                  <Metric className="font-black italic text-slate-900 tracking-tighter">{similarityData.length}</Metric>
                </div>
                <div className="bg-blue-600 text-white px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm shadow-blue-100">
                  <ClipboardList size={12} /> Total
                </div>
              </Flex>
            </Card>

            <Card decoration="top" decorationColor="amber">
              <Flex alignItems="start">
                <div className="flex flex-col">
                  <Text className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Média de Risco</Text>
                  <Metric className="font-black italic text-slate-900 tracking-tighter">
                    {(similarityData.reduce((acc, r) => acc + (Number(getVal(r, 'SCORE')) || 0), 0) / (similarityData.length || 1)).toFixed(1)}%
                  </Metric>
                </div>
                <div className="bg-amber-500 text-white px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm shadow-amber-100">
                  <AlertTriangle size={12} /> Escore Médio
                </div>
              </Flex>
            </Card>

            <Card decoration="top" decorationColor="rose" className={similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length > 0 ? "animate-pulse" : ""}>
              <Flex alignItems="start">
                <div className="flex flex-col">
                  <Text className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">{"Críticos (>80%)"}</Text>
                  <Metric className="font-black italic text-rose-700 tracking-tighter">
                    {similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length}
                  </Metric>
                </div>
                <div className="bg-rose-600 text-white px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm shadow-rose-100 italic">
                  <XCircle size={12} /> Atenção
                </div>
              </Flex>
            </Card>

            <Card decoration="top" decorationColor="emerald">
              <Flex alignItems="start">
                <div className="flex flex-col">
                  <Text className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Filtrados (Exibição)</Text>
                  <Metric className="font-black italic text-emerald-700 tracking-tighter">{filteredData.length}</Metric>
                </div>
                <div className="bg-emerald-600 text-white px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm shadow-emerald-100">
                  <Filter size={12} /> Ativos
                </div>
              </Flex>
            </Card>
          </Grid>

          {/* Visualização de Gráfico Full Width */}
          <div className="bg-white p-6 rounded-[var(--radius)] border border-slate-200 shadow-md relative overflow-hidden h-[340px] flex flex-col">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-[14px] font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2">
                  <ChartIcon size={18} className="text-blue-500" /> Top 10 Prestadores por Volume
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Distribuição de registros entre os principais prestadores</p>
              </div>
              {selectedPrestadores.length > 0 && (
                <button
                  onClick={() => setSelectedPrestadores([])}
                  className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-[var(--radius)] text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-rose-600 hover:text-white transition-all border-2 border-rose-200/50 shadow-sm"
                >
                  <RefreshCw size={10} /> Limpar Filtros do Gráfico
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 bg-slate-50/30 rounded-lg p-4 border border-slate-100 italic font-black text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={60}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const item = chartData.find(d => d.name === payload.value);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={15} textAnchor="middle" fill="#64748b" style={{ fontSize: '10px', fontWeight: '900' }}>
                            {payload.value}
                          </text>
                          <text x={0} y={32} textAnchor="middle" fill="#10b981" style={{ fontSize: '11px', fontWeight: '900' }}>
                            {item?.percentage}%
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    ticks={yAxisTicks}
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                    tickFormatter={(val) => val.toLocaleString()}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-800 p-4 shadow-2xl rounded-lg animate-in zoom-in-95 duration-200 min-w-[240px]">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                                <Stethoscope size={14} className="text-blue-500" />
                                <p className="text-white text-[11px] font-black uppercase tracking-widest truncate">{data.fullName}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Volume</span>
                                <p className="text-blue-400 text-[16px] font-black">{data.value} <small className="text-[10px] opacity-70">REG</small></p>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Representatividade</span>
                                <p className="text-emerald-400 text-[16px] font-black">{data.percentage}%</p>
                            </div>
                            <p className="text-slate-600 text-[8px] font-bold mt-3 uppercase italic text-center text-balance">Pressione para aplicar filtros rápidos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    barSize={14} // Barra "Thin" e elegante
                    onClick={(data) => {
                      if (data && data.code) {
                        const code = data.code;
                        setSelectedPrestadores(prev => 
                          prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
                        );
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => {
                      const isSelected = selectedPrestadores.includes(entry.code);
                      const color = index === 0 ? '#3b82f6' : (index < 3 ? '#60a5fa' : '#94a3b8');
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isSelected ? '#1d4ed8' : color}
                          fillOpacity={selectedPrestadores.length === 0 || isSelected ? 1 : 0.3}
                          stroke={isSelected ? '#fff' : 'none'}
                          strokeWidth={2}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filtros Horizontais Pro Max (Dynamic Toolbar) */}
          <div className="bg-slate-900 rounded-[var(--radius)] p-5 text-white shadow-xl relative overflow-visible border-b-4 border-blue-600">
            <div className="flex flex-col lg:flex-row items-end gap-6 relative z-10">

              <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
                <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-lg">
                  <ListFilter size={20} />
                </div>
                <div>
                  <h5 className="text-[12px] font-black uppercase tracking-[0.2em] text-white italic">Filtros Dinâmicos</h5>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Refinamento Instantâneo</p>
                </div>
              </div>

              {/* Atendimento */}
              <div className="flex-1 w-full lg:w-48 space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Search size={10} /> Atendimento
                </label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar atendimento..."
                    value={filterAtendimento}
                    onChange={(e) => setFilterAtendimento(e.target.value)}
                    className="w-full bg-slate-800 border-2 border-slate-700/50 rounded-[var(--radius)] pl-9 pr-3 py-1.5 text-[11px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Custom Selects Horizontais */}
              <EnhancedMultiSelect
                label="Prestadores"
                icon={Stethoscope}
                options={filterOptions.prestadores}
                value={selectedPrestadores}
                onChange={setSelectedPrestadores}
                placeholder="Filtrar por nome..."
              />

              <EnhancedMultiSelect
                label="Unidades"
                icon={Building2}
                options={filterOptions.unidades}
                value={selectedUnidades}
                onChange={setSelectedUnidades}
                placeholder="Filtrar unidade..."
              />

              {/* Botão de Reset Integrado */}
              <button
                onClick={() => {
                  setFilterAtendimento('');
                  setSelectedUnidades([]);
                  setSelectedPrestadores([]);
                  setSelectedBin(null);
                }}
                className="h-[38px] px-6 bg-slate-800 hover:bg-rose-900 border-2 border-slate-700/50 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white flex items-center justify-center gap-2 group whitespace-nowrap"
                title="Resetar todos os filtros"
              >
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Tabela de Resultados Final */}
          <div className="bg-white rounded-[var(--radius)] border border-slate-200 flex flex-col overflow-hidden shadow-md">
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

            {/* Paginação Avançada */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
                <span>Volume: <b className="text-slate-900">{filteredData.length}</b> registros analíticos</span>
                <span className="hidden sm:inline opacity-30">|</span>
                <span className="hidden sm:inline bg-white px-2 py-0.5 border rounded text-slate-500">
                  Página <b className="text-slate-900">{currentPage}</b> de <b className="text-slate-900">{totalPages || 1}</b>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 bg-white border border-slate-200 rounded-[var(--radius)] text-slate-500 disabled:opacity-30 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                  title="Primeira Página"
                >
                  <ChevronFirst size={14} />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 bg-white border border-slate-200 rounded-[var(--radius)] text-slate-500 disabled:opacity-30 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                  title="Anterior"
                >
                  <ChevronLeft size={14} />
                </button>
                
                <div className="px-3 text-[10px] font-black text-slate-400">
                  {currentPage} / {totalPages || 1}
                </div>

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 bg-white border border-slate-200 rounded-[var(--radius)] text-slate-500 disabled:opacity-30 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                  title="Próxima"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 bg-white border border-slate-200 rounded-[var(--radius)] text-slate-500 disabled:opacity-30 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                  title="Última Página"
                >
                  <ChevronLast size={14} />
                </button>
              </div>
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
                    <div className="whitespace-pre-wrap">
                      <DiffText
                        oldText={comparisonTexts?.anterior}
                        newText={comparisonTexts?.atual}
                        type="previous"
                      />
                    </div>
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
                      <DiffText
                        oldText={comparisonTexts?.anterior}
                        newText={comparisonTexts?.atual}
                        type="current"
                      />
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
