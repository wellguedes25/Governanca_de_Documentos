"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  ScanEye,
  ChevronUp,
  ListFilter,
  XCircle,
  Printer,
  Download,
  Play,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Database,
  SearchCode,
  Settings as SettingsIcon,
  Calendar,
  User,
  X,
  BarChart3 as ChartIcon,
  Building2,
  Stethoscope,
  ClipboardList,
  Split,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { DocMapping } from '@/lib/storage';
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { getToday, get30DaysAgo, getVal } from '@/lib/utils';

// Componentes modulares
import { DiffText } from '@/components/similaridade/DiffText';
import { EnhancedMultiSelect } from '@/components/similaridade/EnhancedMultiSelect';
import { MapeamentosTab } from '@/components/similaridade/MapeamentosTab';
import { SimilarityDdlModal } from '@/components/similaridade/SimilarityDdlModal';
import { sanitizeAuditOwner } from '@/lib/similarity';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─────────────────────────────────────────────────────────────────────────────

type SimilarityRow = Record<string, unknown>;

interface SimilarityFiltersState {
  documento: string;
  campo: string;
  prestador: string;
  empresa: string;
  dataInicio: string;
  dataFim: string;
  minScore: number;
}

interface SimilarityCachedState {
  similarityData: SimilarityRow[];
  hasSearched: boolean;
  filters: SimilarityFiltersState;
  searchTerm: string;
  filterAtendimento: string;
  selectedUnidades: string[];
  selectedPrestadores: string[];
  currentPage: number;
  activeTab: 'consulta' | 'mapeamentos';
  cachedAt: number;
}

interface ComparisonTextsState {
  atual: string;
  anterior: string;
  dataAtual?: string;
  dataAnterior?: string;
  cdAtual?: string | number;
  cdAnterior?: string | number;
  regAtual?: string | number;
  regAnterior?: string | number;
}

function createDefaultFilters(): SimilarityFiltersState {
  return {
    documento: '',
    campo: '',
    prestador: '',
    empresa: '',
    dataInicio: get30DaysAgo(),
    dataFim: getToday(),
    minScore: 0,
  };
}

export default function SimilaridadePage() {
  const { docVersion, activeConnInfo, setActiveConnInfo, getCached, setCached, clearCache } = useUI();
  const router = useRouter();
  const [similarityData, setSimilarityData] = useState<SimilarityRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Proteção de rota
  useEffect(() => {
    const savedVersion = sessionStorage.getItem('app_doc_version');
    if (!docVersion && !savedVersion) {
      router.push('/');
    }
  }, [docVersion, router]);

  const activeEngine: 'V2' | 'V3' = docVersion === 'V2' ? 'V2' : 'V3';
  const stateCacheKey = `similaridade_state_${activeEngine}`;
  const filtersCacheKey = `similaridade_filters_${activeEngine}`;
  const scopeKey = `${activeConnInfo?.id || 'default'}_${activeEngine}`;
  const restoredScopeRef = useRef<string | null>(null);

  const [auditSchemaOwner, setAuditSchemaOwner] = useState('DBAMV');
  const [ddlModalOpen, setDdlModalOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [docMappings, setDocMappings] = useState<DocMapping[]>([]);
  const [activeTab, setActiveTab] = useState<'consulta' | 'mapeamentos'>('consulta');
  const [reportUrl, setReportUrl] = useState('http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=');

  // Hospitais (Empresas)
  const [hospitals, setHospitals] = useState<{id: number, sigla: string, nome: string}[]>([]);

  // Filtros
  const [filters, setFilters] = useState<SimilarityFiltersState>(createDefaultFilters);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Estado para Modal de Comparação
  const [comparingDoc, setComparingDoc] = useState<SimilarityRow | null>(null);
  const [comparisonTexts, setComparisonTexts] = useState<ComparisonTextsState | null>(null);
  const [compLoading, setCompLoading] = useState(false);

  // Efeito interativo do gráfico e filtros avançados
  const [filterAtendimento, setFilterAtendimento] = useState('');
  const [selectedUnidades, setSelectedUnidades] = useState<string[]>([]);
  const [selectedPrestadores, setSelectedPrestadores] = useState<string[]>([]);

  // Estado para execução do motor Nativo Node.js em background
  const [isRunningScript, setIsRunningScript] = useState(false);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptStats, setScriptStats] = useState<{
    stage: 'COUNT' | 'EXTRACT' | 'LOAD' | 'DONE';
    totalRaw: number;
    loaded: number;
    scored: number;
    inserted: number;
    totalPairs: number;
    critical: number;
  } | null>(null);

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restaura resultados, filtros e seleções em cache ao voltar para a página ou alternar motor/conexão
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const cachedState = getCached<SimilarityCachedState>(stateCacheKey);
      if (cachedState) {
        setSimilarityData(Array.isArray(cachedState.similarityData) ? cachedState.similarityData : []);
        setHasSearched(Boolean(cachedState.hasSearched));
        setFilters(cachedState.filters || createDefaultFilters());
        setSearchTerm(cachedState.searchTerm || '');
        setFilterAtendimento(cachedState.filterAtendimento || '');
        setSelectedUnidades(Array.isArray(cachedState.selectedUnidades) ? cachedState.selectedUnidades : []);
        setSelectedPrestadores(Array.isArray(cachedState.selectedPrestadores) ? cachedState.selectedPrestadores : []);
        setCurrentPage(Number(cachedState.currentPage) || 1);
        setActiveTab(cachedState.activeTab === 'mapeamentos' ? 'mapeamentos' : 'consulta');
        setCachedAt(cachedState.cachedAt || null);
        setSearchError(null);
      } else {
        const cachedFilters = getCached<SimilarityFiltersState>(filtersCacheKey);
        setSimilarityData([]);
        setHasSearched(false);
        setFilters(cachedFilters || createDefaultFilters());
        setSearchTerm('');
        setFilterAtendimento('');
        setSelectedUnidades([]);
        setSelectedPrestadores([]);
        setCurrentPage(1);
        setCachedAt(null);
        setSearchError(null);
      }
      restoredScopeRef.current = scopeKey;
    });

    return () => window.cancelAnimationFrame(raf);
  }, [scopeKey, stateCacheKey, filtersCacheKey, getCached]);

  // Persiste continuamente estado e filtros enquanto o usuário navega/filtra na tabela
  useEffect(() => {
    if (restoredScopeRef.current !== scopeKey || loading) return;

    if (hasSearched) {
      setCached<SimilarityCachedState>(stateCacheKey, {
        similarityData,
        hasSearched,
        filters,
        searchTerm,
        filterAtendimento,
        selectedUnidades,
        selectedPrestadores,
        currentPage,
        activeTab,
        cachedAt: cachedAt ?? Date.now(),
      });
    }

    if (filters.documento || filters.campo || filters.empresa) {
      setCached<SimilarityFiltersState>(filtersCacheKey, filters);
    }
  }, [
    scopeKey,
    loading,
    hasSearched,
    similarityData,
    filters,
    searchTerm,
    filterAtendimento,
    selectedUnidades,
    selectedPrestadores,
    currentPage,
    activeTab,
    cachedAt,
    stateCacheKey,
    filtersCacheKey,
    setCached,
  ]);

  async function checkConnection() {
    try {
      const resConn = await fetch('/api/connections');
      const storage = await resConn.json();
      setAuditSchemaOwner(sanitizeAuditOwner(storage.auditSchemaOwner));
      if (storage.docMappings) setDocMappings(storage.docMappings);
      if (storage.reportBaseUrl) setReportUrl(storage.reportBaseUrl);

      const activeHospitals = Array.isArray(storage.hospitalsMapping)
        ? storage.hospitalsMapping
            .filter((h: { ativo?: boolean }) => h.ativo)
            .map((h: { id: number; sigla: string; nome?: string }) => ({
              id: h.id,
              sigla: h.sigla,
              nome: h.nome || h.sigla,
            }))
        : [];
      setHospitals(activeHospitals);

      if (!activeConnInfo && storage.activeConnectionId && Array.isArray(storage.connections)) {
        const activeConn = storage.connections.find(
          (c: { id: string; name?: string }) => c.id === storage.activeConnectionId
        );
        if (activeConn) {
          setActiveConnInfo({
            id: activeConn.id,
            name: activeConn.name || activeConn.id,
            activeHospitals,
          });
        }
      }
    } catch (err) {
      console.error('[Similaridade] Falha ao verificar conexão:', err);
    }
  }

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('Nenhum dado para exportar.');
      return;
    }

    const exportRows = filteredData.map(row => {
      const score = Number(getVal(row, 'SCORE')) || 0;
      const prestador = String(getVal(row, 'PRESTADOR') || '');
      const prestadorNome = String(getVal(row, 'NOME_PRESTADOR') || '');
      const atend = String(getVal(row, 'ATENDIMENTO') || '');
      const docId = String(getVal(row, 'DOCUMENTO') || '');
      const docNome = String(getVal(row, 'NOME_DOCUMENTO') || '');
      const dataHora = String(getVal(row, 'DATA_HORA_ISO') || getVal(row, 'DATA_HORA') || '');
      const unidade = String(getVal(row, 'UNIDADE') || '');
      const leito = String(getVal(row, 'LEITO') || '');
      const empresa = String(getVal(row, 'NOME_EMPRESA') || getVal(row, 'CD_EMPRESA') || '');

      return {
        'Atendimento': atend,
        'Cód. Documento': docId,
        'Nome Documento': docNome,
        'Identificador': String(getVal(row, 'IDENTIFICADOR') || ''),
        'Data Fechamento': dataHora,
        'Prestador': prestadorNome ? `${prestador} - ${prestadorNome}` : prestador,
        'Hospital/Empresa': empresa,
        'Unidade': unidade,
        'Leito': leito,
        'Similaridade (%)': score,
        'Classificação': score >= 80 ? 'Crítico (>=80%)' : score >= 50 ? 'Moderado (50-79%)' : 'Baixo (<50%)'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria_Similaridade');
    XLSX.writeFile(workbook, `Goverdoc_Similaridade_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Relatório Excel exportado com sucesso!');
  };

  const handleRunAuditScript = async () => {
    if (isRunningScript) return;
    setIsRunningScript(true);
    setScriptStats(null);
    setScriptLogs(['[INFO] Conectando ao serviço de execução de scripts...']);
    setScriptModalOpen(true);

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'similaridade', version: docVersion === 'V2' ? 'V2' : 'V3' })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao acionar motor de auditoria.');
      }

      if (!res.body) throw new Error('Fluxo de dados indisponível.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let lineBuffer = '';

      const processStreamLines = (rawLines: string[]) => {
        const visibleLines: string[] = [];
        for (const rawLine of rawLines) {
          const trimmed = rawLine.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('[STATS] ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(8));
              setScriptStats(parsed);
            } catch {
              // ignore malformed stats chunk
            }
          } else {
            visibleLines.push(rawLine);
          }
        }
        if (visibleLines.length > 0) {
          setScriptLogs(prev => [...prev.slice(-300), ...visibleLines]);
        }
      };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          lineBuffer += decoder.decode(value, { stream: true });
          const parts = lineBuffer.split('\n');
          lineBuffer = parts.pop() || '';
          processStreamLines(parts);
        }
      }
      if (lineBuffer.trim()) {
        processStreamLines([lineBuffer]);
      }

      clearCache('similaridade_state_');
      clearCache('similaridade_compare_');
      toast.success('Auditoria de similaridade concluída!');
    } catch (e: any) {
      setScriptLogs(prev => [...prev, `[ERRO] ${e.message}`]);
      toast.error(e.message || 'Erro durante a auditoria.');
    } finally {
      setIsRunningScript(false);
    }
  };

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
      } else {
        throw new Error('Falha ao salvar os mapeamentos.');
      }
    } catch (err) {
      console.error('Erro ao salvar mapeamentos:', err);
      throw err;
    }
  }

  async function handleSearch(overrideFilters?: Partial<SimilarityFiltersState>, forceRefresh = false) {
    const effectiveFilters = overrideFilters ? { ...filters, ...overrideFilters } : filters;

    // Validação de Campos Obrigatórios
    if (!effectiveFilters.documento || !effectiveFilters.campo || !effectiveFilters.dataInicio || !effectiveFilters.dataFim) {
      toast.error('Por favor, preencha o Cód. Documento, Identificador Campo e o período para consultar.');
      return;
    }

    // Validação de Lógica de Datas
    if (effectiveFilters.dataFim < effectiveFilters.dataInicio) {
      toast.error('A Data Fim não pode ser anterior à Data Início.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setSearchError(null);
    setSimilarityData([]);
    setCurrentPage(1);
    
    // Reset de seleções locais ao buscar novos dados
    setSearchTerm('');
    setFilterAtendimento('');
    setSelectedUnidades([]);
    setSelectedPrestadores([]);

    try {
      const params: Record<string, string> = {
        CD_DOCUMENTO: effectiveFilters.documento,
        IDENTIFICADOR: effectiveFilters.campo,
        DATA_INI: effectiveFilters.dataInicio,
        DATA_FIM: effectiveFilters.dataFim
      };
      if (effectiveFilters.empresa) {
        params.CD_EMPRESA = effectiveFilters.empresa;
      }

      const execRes = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'SIMILARIDADE',
          version: docVersion || 'V3',
          forceRefresh,
          params
        }),
      });

      const result = await execRes.json();
      if (execRes.ok) {
        const rows = (result.rows || []) as SimilarityRow[];
        const now = Date.now();
        setSimilarityData(rows);
        setCachedAt(now);
        setCached<SimilarityCachedState>(stateCacheKey, {
          similarityData: rows,
          hasSearched: true,
          filters: effectiveFilters,
          searchTerm: '',
          filterAtendimento: '',
          selectedUnidades: [],
          selectedPrestadores: [],
          currentPage: 1,
          activeTab,
          cachedAt: now,
        });
        setCached<SimilarityFiltersState>(filtersCacheKey, effectiveFilters);
      } else {
        const msg = result.error || 'Erro ao consultar similaridade.';
        setSearchError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error('Erro de rede:', err);
      setSearchError('Erro de comunicação com o servidor.');
      toast.error('Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchComparison(doc: SimilarityRow) {
    setCompLoading(true);
    setComparisonTexts(null);
    try {
      const cdAtendimento = getVal(doc, 'ATENDIMENTO');
      const docId = getVal(doc, 'DOCUMENTO');
      const fieldId = getVal(doc, 'IDENTIFICADOR');
      let dataHoraIso = getVal(doc, 'DATA_HORA_ISO');

      if (!dataHoraIso) {
        const rawDate = getVal(doc, 'DATA_HORA');
        if (rawDate) {
          const d = new Date(rawDate);
          const pad = (n: number) => n.toString().padStart(2, '0');
          dataHoraIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
      }

      const compareKey = `similaridade_compare_${activeEngine}_${cdAtendimento}_${docId}_${fieldId}_${dataHoraIso || ''}`;
      const cachedComparison = getCached<ComparisonTextsState>(compareKey);
      if (cachedComparison) {
        setComparisonTexts(cachedComparison);
        setCompLoading(false);
        return;
      }

      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'SIMILARITY_COMPARE',
          version: docVersion || 'V3',
          params: {
            CD_ATENDIMENTO: cdAtendimento,
            CD_DOCUMENTO: docId,
            IDENTIFICADOR: fieldId,
            DATA_HORA: dataHoraIso || ''
          }
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Falha ao carregar comparação textual.');
        return;
      }
      if (result.rows && result.rows.length > 0) {
        const payload: ComparisonTextsState = {
          atual: getVal(result.rows[0], 'TEXTO_ATUAL') || '',
          anterior: getVal(result.rows[0], 'TEXTO_ANTERIOR') || 'Sem registro anterior para comparação.',
          dataAtual: getVal(result.rows[0], 'DATA_HORA_ATUAL'),
          dataAnterior: getVal(result.rows[0], 'DATA_HORA_ANTERIOR'),
          cdAtual: getVal(result.rows[0], 'CD_DOCUMENTO_ATUAL'),
          cdAnterior: getVal(result.rows[0], 'CD_DOCUMENTO_ANTERIOR'),
          regAtual: getVal(result.rows[0], 'CD_REGISTRO_ATUAL'),
          regAnterior: getVal(result.rows[0], 'CD_REGISTRO_ANTERIOR')
        };
        setComparisonTexts(payload);
        setCached(compareKey, payload);
      }
    } catch (err) {
      console.error('Erro ao buscar comparação:', err);
    } finally {
      setCompLoading(false);
    }
  }

  const filteredDocMappings = useMemo(
    () => docMappings.filter((m) => !m.engine || m.engine === activeEngine),
    [docMappings, activeEngine]
  );

  const fieldOptions = useMemo(() => {
    if (!filters.documento) return [];
    const mapping = filteredDocMappings.find(m => m.id === filters.documento);
    return mapping ? mapping.fields : [];
  }, [filters.documento, filteredDocMappings]);

  // 1. Base Filtered Data
  const baseFilteredData = useMemo(() => {
    let data = [...(similarityData || [])];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(term))
      );
    }

    if (filters.minScore > 0) {
      data = data.filter(row => (Number(getVal(row, 'SCORE')) || 0) >= filters.minScore);
    }

    if (filterAtendimento) {
      data = data.filter(row => String(getVal(row, 'ATENDIMENTO') || '').includes(filterAtendimento));
    }

    return data;
  }, [similarityData, searchTerm, filters.minScore, filterAtendimento]);

  // 2. Gráfico Top 10 Prestadores
  const chartData = useMemo(() => {
    if (!baseFilteredData || baseFilteredData.length === 0) return [];

    const totalRecords = baseFilteredData.length;
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
      const fullLabel = data.name && data.name !== code ? `${code} - ${data.name}` : code;
      
      return {
        name: code,
        fullName: fullLabel,
        shortLabel: shortName,
        value: data.count,
        percentage: percentage,
        code: fullLabel
      };
    });
  }, [baseFilteredData]);

  // 3. Opções para Filtros
  const filterOptions = useMemo(() => {
    if (!baseFilteredData || baseFilteredData.length === 0) return { unidades: [], prestadores: [] };

    const unidadesMap: Record<string, number> = {};
    const prestadoresMap: Record<string, number> = {};

    baseFilteredData.forEach(r => {
      const u = String(getVal(r, 'UNIDADE') || '');
      const pCode = String(getVal(r, 'PRESTADOR') || '');
      const pName = String(getVal(r, 'NOME_PRESTADOR') || pCode);
      const pLabel = pCode ? `${pCode} - ${pName}` : '';
      
      if (u) unidadesMap[u] = (unidadesMap[u] || 0) + 1;
      if (pLabel) prestadoresMap[pLabel] = (prestadoresMap[pLabel] || 0) + 1;
    });

    return {
      unidades: Object.entries(unidadesMap).sort((a, b) => b[1] - a[1]),
      prestadores: Object.entries(prestadoresMap).sort((a, b) => b[1] - a[1])
    };
  }, [baseFilteredData]);

  // 4. Final Filtered Data
  const filteredData = useMemo(() => {
    let data = [...baseFilteredData];

    if (selectedUnidades.length > 0) {
      data = data.filter(row => selectedUnidades.includes(String(getVal(row, 'UNIDADE') || '')));
    }

    if (selectedPrestadores.length > 0) {
      data = data.filter(row => {
        const fullPrestador = String(getVal(row, 'PRESTADOR') || '');
        let pLabel = fullPrestador;
        if (!fullPrestador.includes(' - ')) {
          const pName = String(getVal(row, 'NOME_PRESTADOR') || '');
          if (pName) pLabel = `${fullPrestador} - ${pName}`;
        }
        return selectedPrestadores.includes(pLabel);
      });
    }

    return data;
  }, [baseFilteredData, selectedUnidades, selectedPrestadores]);

  // 5. Ticks do Eixo Y
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
    if (score >= 80) return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    if (score >= 50) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  };

  return (
    <div className="flex flex-col space-y-5">
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* 1. Header Padronizado Sylva */}
      <div className="pb-3 border-b border-[var(--border-subtle)]">
        <PageHeader 
          title="Auditoria de Similaridade NLP"
          subtitle={`Detecção de cópia e cola textual, plágio e redundância clínica em prontuários eletrônicos (${auditSchemaOwner})`}
          icon={ScanEye}
          badge={
            <Badge 
              variant="outline" 
              suppressHydrationWarning
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[var(--lime)]/30 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)]"
            >
              Motor {docVersion || 'V3'} • Schema {auditSchemaOwner}
            </Badge>
          }
          action={
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Filtro instantâneo..."
                  className="pl-8 pr-3 py-1.5 bg-[var(--card-bg)]/80 border border-[var(--border-subtle)] rounded-full text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)]/20 w-52 shadow-xs transition-all disabled:opacity-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!hasSearched || loading}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDdlModalOpen(true)}
                className="gap-2 text-xs font-semibold rounded-full sylva-pill text-[var(--foreground)] hover:text-[var(--lime-dark)] dark:hover:text-[var(--lime)] shadow-xs cursor-pointer h-9 px-4"
              >
                <Database className="w-3.5 h-3.5 text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                <span>Script DDL</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={!hasSearched || loading || filteredData.length === 0}
                className="gap-2 text-xs font-semibold rounded-full sylva-pill text-[var(--foreground)] hover:text-[var(--lime-dark)] dark:hover:text-[var(--lime)] shadow-xs cursor-pointer h-9 px-4 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                <span>Exportar Excel</span>
              </Button>

              <Button
                size="sm"
                onClick={handleRunAuditScript}
                disabled={isRunningScript}
                className="gap-2 text-xs font-bold rounded-full bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 shadow-[0_4px_14px_rgba(204,243,82,0.25)] cursor-pointer h-9 px-4 disabled:opacity-40"
              >
                <Play className={`w-3.5 h-3.5 ${isRunningScript ? 'animate-spin' : ''}`} />
                <span>{isRunningScript ? 'Auditando...' : 'Rodar Auditoria NLP'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="p-0 w-9 h-9 flex items-center justify-center rounded-full sylva-pill text-[var(--muted)] hover:text-[var(--foreground)] shadow-xs cursor-pointer"
                title="Imprimir Relatório"
              >
                <Printer className="w-3.5 h-3.5" />
              </Button>
            </>
          }
        />
      </div>

      {/* Navigation Tabs Pill Style Sylva Dock */}
      <div className="sylva-dock p-1 inline-flex items-center gap-1.5 self-start">
        <button
          onClick={() => setActiveTab('consulta')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'consulta'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] font-bold shadow-xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
          }`}
        >
          <SearchCode size={14} />
          <span>Painel de Auditoria</span>
        </button>
        <button
          onClick={() => setActiveTab('mapeamentos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'mapeamentos'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] font-bold shadow-xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
          }`}
        >
          <BookOpen size={14} />
          <span>Mapeamentos Oracle</span>
        </button>
      </div>

      <div className={activeTab === 'consulta' ? 'space-y-6 animate-in fade-in duration-300' : 'hidden'}>
        {/* Painel de Filtros Sylva Bento Card */}
        <div className="sylva-card border border-[var(--border-subtle)] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-end gap-3.5">
            {/* Empresa (Hospital) */}
            {hospitals.length > 0 && (
              <div className="w-44 space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
                  <Building2 size={13} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> Empresa / Unidade
                </label>
                <select
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--foreground)] outline-none focus:border-[var(--lime)] transition-all shadow-xs"
                  value={filters.empresa}
                  onChange={(e) => setFilters(f => ({ ...f, empresa: e.target.value }))}
                >
                  <option value="">Todas as Empresas</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={String(h.id)}>{h.sigla} - {h.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Documento (Selector) */}
            <div className="flex-1 min-w-[260px] space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
                <ClipboardList size={13} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> Documento Alvo *
              </label>
              <select
                className={`w-full bg-[var(--canvas-bg)] border rounded-xl px-3 py-2 text-xs font-medium text-[var(--foreground)] outline-none transition-all shadow-xs focus:border-[var(--lime)] ${!filters.documento && hasSearched ? 'border-rose-400' : 'border-[var(--border-subtle)]'}`}
                value={filters.documento}
                onChange={(e) => {
                  const newDoc = e.target.value;
                  setFilters(f => ({ ...f, documento: newDoc, campo: '' }));
                }}
              >
                <option value="">Selecione o Documento Clínico...</option>
                {filteredDocMappings.map(m => (
                  <option key={`${m.engine || 'V3'}-${m.id}`} value={m.id}>{m.id} - {m.name}</option>
                ))}
              </select>
            </div>

            {/* Identificador (Selector Dependente) */}
            <div className="flex-1 min-w-[220px] space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
                <Split size={13} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> Campo / Identificador *
              </label>
              <select
                className={`w-full bg-[var(--canvas-bg)] border rounded-xl px-3 py-2 text-xs font-medium text-[var(--foreground)] outline-none transition-all shadow-xs focus:border-[var(--lime)] ${!filters.campo && hasSearched ? 'border-rose-400' : 'border-[var(--border-subtle)]'}`}
                value={filters.campo}
                onChange={(e) => setFilters(f => ({ ...f, campo: e.target.value }))}
                disabled={!filters.documento}
              >
                <option value="">{filters.documento ? 'Selecione o Campo Clínico...' : 'Aguardando Documento...'}</option>
                {fieldOptions.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('mapeamentos')}
              className="h-9 w-9 p-0 rounded-xl sylva-pill text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              title="Gerenciar Mapeamentos de Documentos"
            >
              <SettingsIcon size={16} />
            </Button>

            {/* Período */}
            <div className="flex items-center gap-2">
              <div className="w-32 space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1">
                  <Calendar size={12} className="text-[var(--muted)]" /> De
                </label>
                <input
                  type="date"
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)] shadow-xs"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters(f => ({ ...f, dataInicio: e.target.value }))}
                />
              </div>
              <div className="w-32 space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1">
                  <ArrowRight size={12} className="text-[var(--muted)]" /> Até
                </label>
                <input
                  type="date"
                  className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)] shadow-xs"
                  value={filters.dataFim}
                  min={filters.dataInicio}
                  onChange={(e) => setFilters(f => ({ ...f, dataFim: e.target.value }))}
                />
              </div>
            </div>

            {/* Sensibilidade */}
            <div className="w-36 space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1">
                <ChevronUp size={12} className="text-[var(--muted)]" /> Similaridade Mín.
              </label>
              <select
                className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)] shadow-xs"
                value={filters.minScore}
                onChange={(e) => setFilters(f => ({ ...f, minScore: Number(e.target.value) }))}
              >
                <option value="0">Todos (0% a 100%)</option>
                <option value="50">A partir de 50%</option>
                <option value="80">≥ 80% (Crítico / Plágio)</option>
                <option value="95">≥ 95% (Cópia Integral)</option>
              </select>
            </div>

            {/* Botão de Busca */}
            <Button
              onClick={() => handleSearch(undefined, true)}
              disabled={loading}
              className="h-9 px-5 bg-[var(--lime)] text-[var(--lime-ink)] hover:brightness-105 rounded-xl text-xs font-bold gap-2 shadow-[0_4px_14px_rgba(204,243,82,0.25)] cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <SearchCode size={15} />}
              <span>Consultar</span>
            </Button>
          </div>

          {hasSearched && !loading && cachedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)]/60 text-[11px] text-[var(--muted)]">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="sylva-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-[var(--foreground-secondary)]">
                  <RefreshCw size={10} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                  <span>
                    Em cache •{' '}
                    {new Date(cachedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
                <span>
                  {similarityData.length.toLocaleString('pt-BR')} registro(s) preservado(s) durante a navegação
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSearch(undefined, true)}
                title="Reconsultar no Oracle"
                className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[var(--lime-dark)] dark:text-[var(--lime)] hover:underline"
              >
                <RefreshCw size={11} />
                <span>Atualizar do Oracle</span>
              </button>
            </div>
          )}
        </div>

        {/* Erro explícito de consulta Oracle (ex.: ORA-00942 Tabela/View ausente) */}
        {searchError && (
          <div className="tone-warning flex flex-col justify-between gap-3 rounded-2xl border px-5 py-4 text-xs sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Falha ao consultar tabela de resultados ({auditSchemaOwner}.TB_AUDITORIA_SIMILARIDADE)</p>
                <p className="mt-0.5 opacity-90">{searchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDdlModalOpen(true)}
              className="sylva-lime-btn inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold"
            >
              <Database size={14} />
              <span>Abrir Script DDL ({auditSchemaOwner})</span>
            </button>
          </div>
        )}

        {/* Estado Inicial ou Carregando */}
        {!hasSearched ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--card-bg)]/40 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 flex items-center justify-center mb-4">
              <ScanEye size={32} />
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight mb-1.5">Pronto para Iniciar a Auditoria</h3>
            <p className="text-xs text-[var(--foreground-secondary)] font-normal text-center max-w-md leading-relaxed">
              Selecione o <strong className="text-[var(--foreground)]">Documento Alvo</strong> e o <strong className="text-[var(--foreground)]">Identificador do Campo</strong> no painel de filtros acima para extrair e cruzar os registros clínicos auditados.
            </p>
          </div>
        ) : loading ? (
          <div className="flex-1 space-y-6 animate-in fade-in duration-500">
            {/* Skeleton KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 sylva-card border border-[var(--border-subtle)] rounded-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--card-bg)] to-transparent -translate-x-full animate-shimmer"></div>
                </div>
              ))}
            </div>
            {/* Skeleton Chart */}
            <div className="h-[380px] sylva-card border border-[var(--border-subtle)] rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--card-bg)] to-transparent -translate-x-full animate-shimmer"></div>
            </div>
            {/* Skeleton Table */}
            <div className="sylva-card border border-[var(--border-subtle)] rounded-2xl p-6 space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-[var(--canvas-bg)] rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--card-bg)] to-transparent -translate-x-full animate-shimmer"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-rose-500/30 rounded-2xl bg-[var(--card-bg)]/40 shadow-xs">
            <div className="p-6 bg-rose-500/10 rounded-2xl mb-6 border border-rose-500/20">
              <Search size={44} className="text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">Nenhum Registro Encontrado</h3>
            <p className="text-xs text-[var(--foreground-secondary)] font-medium text-center max-w-md">
              Não encontramos dados para os filtros selecionados. Tente ajustar o período ou a sensibilidade de similaridade.
            </p>
            <button 
              onClick={() => {
                const expanded = { dataInicio: '2026-01-01', dataFim: getToday() };
                setFilters(f => ({ ...f, ...expanded }));
                handleSearch(expanded);
              }}
              className="mt-6 px-6 py-2.5 bg-[var(--lime)] text-[var(--lime-ink)] font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer hover:brightness-105"
            >
              Ampliar Período (2026+)
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Bento Grid: 4 KPIs Tinted Glass Sylva */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* KPI 1: Dataset Total (Olive Tint) */}
              <div 
                className="sylva-card rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all relative overflow-hidden flex flex-col justify-between min-h-[145px]"
                style={{ background: 'var(--tint-olive)' }}
              >
                <div className="flex justify-between items-start z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">Dataset Total</p>
                  <div className="p-2.5 bg-[var(--card-bg)]/80 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--border-subtle)] rounded-xl shadow-xs">
                    <ClipboardList size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="z-10 mt-4">
                  <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight font-mono">
                    {similarityData.length}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--muted)] mt-1 flex items-center gap-1.5">
                    <Database size={11} /> Analisados na base Oracle
                  </p>
                </div>
              </div>

              {/* KPI 2: Média (Mocha Tint) */}
              <div 
                className="sylva-card rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all relative overflow-hidden flex flex-col justify-between min-h-[145px]"
                style={{ background: 'var(--tint-mocha)' }}
              >
                <div className="flex justify-between items-start z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">Média de Risco</p>
                  <div className="p-2.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl shadow-xs">
                    <AlertTriangle size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="z-10 mt-4">
                  <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight font-mono">
                    {(similarityData.reduce((acc, r) => acc + (Number(getVal(r, 'SCORE')) || 0), 0) / (similarityData.length || 1)).toFixed(1)}
                    <span className="text-lg text-[var(--muted)] ml-0.5">%</span>
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--muted)] mt-1 flex items-center gap-1.5">
                    <ChartIcon size={11} className="text-amber-500" /> Score médio da seleção
                  </p>
                </div>
              </div>

              {/* KPI 3: Críticos (Slate Tint) */}
              <div 
                className="sylva-card rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all relative overflow-hidden flex flex-col justify-between min-h-[145px]"
                style={{ background: 'var(--tint-slate)' }}
              >
                <div className="flex justify-between items-start z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">Docs Críticos</p>
                  <div className={`p-2.5 rounded-xl transition-colors shadow-xs ${similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>
                    <ScanEye size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="z-10 mt-4">
                  <h3 className={`text-2xl font-bold tracking-tight font-mono ${similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--foreground)]'}`}>
                    {similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length}
                  </h3>
                  <p className="text-[11px] font-medium text-[var(--muted)] mt-1 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-rose-500" /> Acima de 80% similaridade
                  </p>
                </div>
              </div>

              {/* KPI 4: Filtrados (Frosted Sylva Glass) */}
              <div className="sylva-glass bg-[var(--card-bg)]/80 border border-[var(--border-subtle)] rounded-2xl p-5 shadow-xs hover:-translate-y-0.5 transition-all relative overflow-hidden flex flex-col justify-between min-h-[145px]">
                <div className="flex justify-between items-start z-10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">Seleção Ativa</p>
                  <div className="p-2.5 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 rounded-xl shadow-xs">
                    <ShieldCheck size={18} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="z-10 mt-4">
                  <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight font-mono">{filteredData.length}</h3>
                  <p className="text-[11px] font-medium text-[var(--muted)] mt-1 flex items-center gap-1.5">
                    <Filter size={11} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> Volume após filtros em cascata
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfico Top 10 Prestadores: Sylva Card Bento */}
            <div className="sylva-card p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs relative overflow-hidden h-[380px] flex flex-col group">
              <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <h4 className="text-base font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
                    <ChartIcon size={20} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> 
                    Top 10 Prestadores por Volume
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]"></div>
                    <p className="text-[11px] text-[var(--muted)] font-medium">Distribuição de Similaridade por CRM/Registro</p>
                  </div>
                </div>
                
                {selectedPrestadores.length > 0 && (
                  <button
                    onClick={() => setSelectedPrestadores([])}
                    className="px-3.5 py-1.5 sylva-pill text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer group/reset text-[var(--foreground)] hover:text-[var(--lime-dark)] dark:hover:text-[var(--lime)]"
                  >
                    <RefreshCw size={13} className="group-hover/reset:rotate-180 transition-transform duration-500" /> 
                    Limpar Seleção ({selectedPrestadores.length})
                  </button>
                )}
              </div>
              
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const item = chartData.find(d => d.name === payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={20} textAnchor="middle" fill="var(--muted)" style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.08em' }}>
                              {payload.value}
                            </text>
                            <text x={0} y={35} textAnchor="middle" fill="var(--foreground)" style={{ fontSize: '11px', fontWeight: '800' }}>
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
                      tick={{ fill: 'var(--muted)', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--card-bg)', opacity: 0.4, radius: 8 }}
                      position={{ y: 280 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[var(--dock-bg)] border border-[var(--border-subtle)] p-4 shadow-2xl rounded-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 min-w-[260px]">
                              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--border-subtle)]">
                                  <div className="p-2 bg-[var(--lime)] text-[var(--lime-ink)] rounded-xl font-bold">
                                    <Stethoscope size={15} />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-[var(--foreground)] text-xs font-bold truncate">{data.fullName}</p>
                                    <p className="text-[var(--muted)] text-[10px] font-medium mt-0.5">Prestador Clínico</p>
                                  </div>
                              </div>
                              <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--foreground-secondary)] text-[11px] font-semibold">Volume de Docs</span>
                                    <p className="text-[var(--foreground)] text-base font-bold font-mono">{data.value} <small className="text-[10px] text-[var(--muted)] font-sans">UN</small></p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--foreground-secondary)] text-[11px] font-semibold">Participação</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--lime)]" style={{ width: `${data.percentage}%` }}></div>
                                      </div>
                                      <p className="text-[var(--lime-dark)] dark:text-[var(--lime)] text-base font-bold font-mono">{data.percentage}%</p>
                                    </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-center">
                                <p className="text-[var(--muted)] text-[10px] font-medium">Clique na barra para isolar o prestador</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 6, 6]}
                      barSize={16}
                      onClick={(data: any) => {
                        if (data?.code) {
                          const code = data.code as string;
                          setSelectedPrestadores(prev =>
                            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
                          );
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {chartData.map((entry, index) => {
                        const isSelected = selectedPrestadores.includes(entry.code);
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={isSelected ? '#CCF352' : (index === 0 ? '#f43f5e' : index < 3 ? '#f59e0b' : '#10b981')}
                            className="transition-all duration-300 hover:opacity-80"
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Filtros Horizontais (Dynamic Toolbar) */}
            <div className="sylva-card rounded-2xl p-5 border border-[var(--border-subtle)] border-l-4 border-l-[var(--lime)] shadow-xs relative overflow-visible">
              <div className="flex flex-col lg:flex-row items-end gap-5 relative z-10">
                <div className="flex items-center gap-3 pr-5 border-r border-[var(--border-subtle)]">
                  <div className="p-2.5 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 rounded-xl">
                    <ListFilter size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[var(--foreground)]">Filtros Dinâmicos</h5>
                    <p className="text-[11px] text-[var(--muted)] font-medium mt-0.5">Refinamento Instantâneo</p>
                  </div>
                </div>

                {/* Atendimento */}
                <div className="flex-1 w-full lg:w-48 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--foreground-secondary)] flex items-center gap-1.5">
                    <Search size={12} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" /> Atendimento
                  </label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--lime-dark)] dark:group-focus-within:text-[var(--lime)] transition-colors" size={14} />
                    <input
                      type="text"
                      placeholder="Filtrar atendimento..."
                      value={filterAtendimento}
                      onChange={(e) => setFilterAtendimento(e.target.value)}
                      className="w-full bg-[var(--canvas-bg)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)]/20 transition-all"
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
                  }}
                  className="h-[38px] px-4 sylva-pill rounded-xl text-xs font-semibold transition-all text-[var(--foreground-secondary)] hover:text-rose-500 hover:border-rose-500/30 flex items-center justify-center gap-2 group whitespace-nowrap cursor-pointer shadow-xs"
                  title="Resetar todos os filtros"
                >
                  <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
                  <span>Limpar</span>
                </button>
              </div>
            </div>

            {/* Tabela de Resultados Final */}
            <div className="sylva-card rounded-2xl border border-[var(--border-subtle)] flex flex-col shadow-xs overflow-hidden relative">
              <div className="flex-1 overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse table-auto min-w-max">
                  <thead>
                    <tr className="bg-[var(--dock-bg)] text-[var(--foreground-secondary)] border-b border-[var(--border-subtle)]">
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Atendimento</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Registro Clínico</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Empresa</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Data e Hora</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Prestador</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Localização</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Similaridade</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]/50">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-24 text-center bg-[var(--card-bg)]">
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <div className="w-14 h-14 border-4 border-[var(--border-subtle)] border-t-[var(--lime)] rounded-full animate-spin"></div>
                              <ScanEye className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--lime-dark)] dark:text-[var(--lime)]" size={22} />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] block">Processando Similaridade</span>
                              <span className="text-[11px] font-medium text-[var(--muted)] block">Isolando padrões de texto via NLP Oracle...</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((row, idx) => {
                        const score = Number(getVal(row, 'SCORE')) || 0;
                        return (
                          <tr key={idx} className="hover:bg-[var(--hover-bg)] transition-colors group/tr">
                            <td className="px-4 py-3.5 text-xs font-bold text-center text-[var(--foreground)] font-mono">{getVal(row, 'ATENDIMENTO')}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 rounded-xl flex items-center justify-center shrink-0">
                                  <FileText size={16} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-[var(--foreground)] leading-tight mb-1">{getVal(row, 'NOME_DOCUMENTO')}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--canvas-bg)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md font-mono">ID: {getVal(row, 'DOCUMENTO')}</span>
                                    <span className="text-[10px] font-semibold text-[var(--lime-dark)] dark:text-[var(--lime)] bg-[var(--lime)]/10 px-2 py-0.5 rounded-md font-mono">{getVal(row, 'IDENTIFICADOR')}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <Building2 size={13} className="text-[var(--muted)]" />
                                <span className="text-[11px] font-semibold text-[var(--foreground-secondary)]">{getVal(row, 'NOME_EMPRESA') || getVal(row, 'CD_EMPRESA') || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-[var(--foreground-secondary)]">
                                <Calendar size={13} className="text-[var(--muted)]" />
                                <span className="text-[11px] font-medium font-mono">
                                  {(() => {
                                    const iso = getVal(row, 'DATA_HORA_ISO');
                                    const raw = getVal(row, 'DATA_HORA');
                                    const d = iso ? new Date(iso.replace(' ', 'T')) : new Date(raw);
                                    return isNaN(d.getTime()) ? 'Data Inválida' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                  })()}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                               <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--canvas-bg)] border border-[var(--border-subtle)] text-[var(--foreground-secondary)] group-hover/tr:border-[var(--lime)] group-hover/tr:text-[var(--lime-dark)] dark:group-hover/tr:text-[var(--lime)] transition-all" title={getVal(row, 'PRESTADOR')}>
                                 <User size={16} />
                               </div>
                               <p className="text-[10px] font-bold text-[var(--foreground-secondary)] mt-1 font-mono">{getVal(row, 'PRESTADOR')}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]"></div>
                                  <span className="text-xs font-bold text-[var(--foreground)]">{getVal(row, 'LEITO') || 'N/A'}</span>
                                </div>
                                <span className="text-[10px] font-medium text-[var(--muted)]">{getVal(row, 'UNIDADE') || 'SETOR EXTERNO'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-full max-w-[80px] h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-1000 ${score >= 80 ? 'bg-rose-500' : score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${score}%` }}></div>
                                </div>
                                <span className={`text-xs font-bold font-mono ${score >= 80 ? 'text-rose-600 dark:text-rose-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {score.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => {
                                  setComparingDoc(row);
                                  fetchComparison(row);
                                }}
                                className="w-9 h-9 inline-flex items-center justify-center sylva-pill text-[var(--foreground)] hover:bg-[var(--lime)] hover:text-[var(--lime-ink)] rounded-xl transition-all cursor-pointer group/btn-audit shadow-xs"
                                title="Audit NLP Lado a Lado"
                              >
                                <Split size={17} className="group-hover/btn-audit:rotate-12 transition-transform" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-24 text-center bg-[var(--card-bg)]">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-6 bg-[var(--canvas-bg)] rounded-2xl mb-4 border border-[var(--border-subtle)]">
                              <XCircle size={40} className="text-[var(--muted)]" />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--foreground)]">Sem Resultados no Refinamento</h3>
                            <p className="text-xs text-[var(--muted)] font-medium max-w-xs mt-1.5 leading-relaxed">
                              Não encontramos registros que correspondam aos filtros aplicados nesta janela de tempo.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação Sylva Dock */}
              <div className="bg-[var(--dock-bg)] border-t border-[var(--border-subtle)] px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-5 bg-[var(--lime)] rounded-full"></div>
                    <span className="text-xs font-bold text-[var(--foreground)]">
                      {filteredData.length} <span className="text-[var(--muted)] font-medium">Matches Analisados</span>
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[var(--card-bg)] rounded-xl border border-[var(--border-subtle)]">
                     <p className="text-[11px] font-semibold text-[var(--foreground-secondary)]">Página {currentPage} de {totalPages || 1}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="w-9 h-9 flex items-center justify-center sylva-pill rounded-xl text-[var(--foreground-secondary)] disabled:opacity-35 hover:text-[var(--foreground)] transition-all cursor-pointer"
                  >
                    <ChevronFirst size={16} />
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="w-9 h-9 flex items-center justify-center sylva-pill rounded-xl text-[var(--foreground-secondary)] disabled:opacity-35 hover:text-[var(--foreground)] transition-all cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex items-center gap-1 px-2">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentPage === pageNum ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-xs' : 'sylva-pill text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="w-9 h-9 flex items-center justify-center sylva-pill rounded-xl text-[var(--foreground-secondary)] disabled:opacity-35 hover:text-[var(--foreground)] transition-all cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-9 h-9 flex items-center justify-center sylva-pill rounded-xl text-[var(--foreground-secondary)] disabled:opacity-35 hover:text-[var(--foreground)] transition-all cursor-pointer"
                  >
                    <ChevronLast size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drawer de Comparação Slide-over Side-by-Side Sylva */}
        {comparingDoc && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setComparingDoc(null)}></div>
            
            <div className="relative w-full max-w-6xl bg-[var(--canvas-bg)] h-full shadow-2xl border-l border-[var(--border-subtle)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
              <header className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--card-bg)]/80 backdrop-blur-md">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 rounded-xl">
                    <ScanEye size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
                      Auditoria NLP Lado a Lado
                    </h2>
                    <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                      Doc: {getVal(comparingDoc, 'DOCUMENTO')} | <b className="text-[var(--lime-dark)] dark:text-[var(--lime)]">{(Number(getVal(comparingDoc, 'SCORE')) || 0).toFixed(1)}% SIMILAR</b>
                    </p>
                  </div>
                </div>
                <button onClick={() => setComparingDoc(null)} className="p-2 sylva-pill rounded-xl transition-colors text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer">
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] relative">
                {/* Texto Anterior */}
                <div className="flex-1 flex flex-col h-1/2 md:h-full bg-[var(--canvas-bg)]">
                  <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--foreground)]">Documento Anterior (Original)</span>
                      {comparisonTexts?.dataAnterior && (
                        <span className="text-[11px] font-medium text-[var(--muted)] mt-0.5 flex items-center gap-2">
                          <span>{comparisonTexts.dataAnterior} {comparisonTexts.cdAnterior && `| DOC: ${comparisonTexts.cdAnterior}`}</span>
                          {comparisonTexts.regAnterior && (
                            <a
                              href={`${reportUrl}${comparisonTexts.regAnterior}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[var(--card-bg)] hover:bg-[var(--lime)] text-[var(--foreground)] hover:text-[var(--lime-ink)] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors font-semibold text-[10px]"
                            >
                              <Printer size={10} /> PDF
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="px-2.5 py-0.5 bg-[var(--card-bg)] text-[var(--muted)] border border-[var(--border-subtle)] rounded-full text-[10px] font-bold tracking-wide">ORIGINAL</div>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto font-serif text-[var(--foreground)] leading-relaxed text-sm scrollbar-thin">
                    {compLoading ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-[var(--lime)]" size={32} />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        <DiffText
                          oldText={comparisonTexts?.anterior ?? ''}
                          newText={comparisonTexts?.atual ?? ''}
                          type="previous"
                          score={Number(getVal(comparingDoc, 'SCORE')) || 0}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Divisor Visual central para telas grandes */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--dock-bg)] border border-[var(--border-subtle)] p-2.5 rounded-xl shadow-md z-10 text-[var(--lime-dark)] dark:text-[var(--lime)]">
                  <Split size={18} strokeWidth={2.5} />
                </div>

                {/* Texto Atual */}
                <div className="flex-1 flex flex-col h-1/2 md:h-full bg-[var(--canvas-bg)]">
                  <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--lime-dark)] dark:text-[var(--lime)]">Documento Atual (Auditoria)</span>
                      {comparisonTexts?.dataAtual && (
                        <span className="text-[11px] font-medium text-[var(--muted)] mt-0.5 flex items-center gap-2">
                          <span>{comparisonTexts.dataAtual} {comparisonTexts.cdAtual && `| DOC: ${comparisonTexts.cdAtual}`}</span>
                          {comparisonTexts.regAtual && (
                            <a
                              href={`${reportUrl}${comparisonTexts.regAtual}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[var(--card-bg)] hover:bg-[var(--lime)] text-[var(--foreground)] hover:text-[var(--lime-ink)] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors font-semibold text-[10px]"
                            >
                              <Printer size={10} /> PDF
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${getScoreColor(Number(getVal(comparingDoc, 'SCORE')) || 0)}`}>
                      {(Number(getVal(comparingDoc, 'SCORE')) || 0).toFixed(1)}% SIMILAR
                    </div>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto font-serif text-[var(--foreground)] leading-relaxed text-sm scrollbar-thin">
                    {compLoading ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-[var(--lime)]" size={32} />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        <DiffText
                          oldText={comparisonTexts?.anterior ?? ''}
                          newText={comparisonTexts?.atual ?? ''}
                          type="current"
                          score={Number(getVal(comparingDoc, 'SCORE')) || 0}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <footer className="px-6 py-4 bg-[var(--dock-bg)] border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                    <span className="text-xs font-semibold text-[var(--foreground)]">{getVal(comparingDoc, 'LEITO')} | {getVal(comparingDoc, 'UNIDADE')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                    <span className="text-xs font-semibold text-[var(--foreground)]">{getVal(comparingDoc, 'PRESTADOR')}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2 bg-[var(--lime)] text-[var(--lime-ink)] font-bold rounded-xl text-xs transition-all cursor-pointer shadow-[0_4px_14px_rgba(204,243,82,0.25)] hover:brightness-105"
                >
                  <Printer size={15} /> Imprimir Laudo
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Acompanhamento do Script Python */}
      {scriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="sylva-card bg-[var(--dock-bg)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <header className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--card-bg)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--lime)]/15 text-[var(--lime-dark)] dark:text-[var(--lime)] border border-[var(--lime)]/30 rounded-xl">
                  <Play size={18} className={isRunningScript ? "animate-spin" : ""} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Motor Nativo de Auditoria NLP (Node.js)</h3>
                  <p className="text-xs text-[var(--muted)]">Schema {auditSchemaOwner} — Processamento assíncrono de similaridade e cópia/cola</p>
                </div>
              </div>
              <button
                onClick={() => setScriptModalOpen(false)}
                className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-bg)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </header>

            {/* Painel de Telemetria em Tempo Real */}
            {scriptStats && (
              <div className="border-b border-[var(--border-subtle)] bg-[var(--card-subtle)] px-6 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Registros no Período
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-[var(--foreground)]">
                      {scriptStats.totalRaw.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Pares c/ Histórico (LAG)
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-[var(--foreground)]">
                      {(scriptStats.totalPairs || scriptStats.loaded).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Gravados no Oracle
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-[var(--lime-dark)] dark:text-[var(--lime)]">
                      {scriptStats.inserted.toLocaleString('pt-BR')}
                      {scriptStats.totalPairs > 0 ? ` / ${scriptStats.totalPairs.toLocaleString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Críticos (&ge; 80%)
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-rose-500">
                      {scriptStats.critical.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {(() => {
                  const pct =
                    scriptStats.stage === 'DONE'
                      ? 100
                      : scriptStats.totalPairs > 0
                        ? Math.max(40, Math.round((scriptStats.inserted / scriptStats.totalPairs) * 100))
                        : scriptStats.totalRaw > 0
                          ? Math.min(40, Math.round((scriptStats.loaded / scriptStats.totalRaw) * 40))
                          : scriptStats.loaded > 0
                            ? 30
                            : 8;
                  const stageLabel =
                    scriptStats.stage === 'COUNT'
                      ? 'Volumetria identificada — iniciando extração de textos...'
                      : scriptStats.stage === 'EXTRACT'
                        ? 'Extraindo evoluções e pareando texto anterior no Oracle...'
                        : scriptStats.stage === 'LOAD'
                          ? 'Calculando NLP (Ratcliff/Obershelp) e gravando lotes...'
                          : 'Processamento finalizado';
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--foreground-secondary)]">{stageLabel}</span>
                        <span className="font-mono font-bold text-[var(--lime-dark)] dark:text-[var(--lime)]">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                        <div
                          className="h-full rounded-full bg-[var(--lime)] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="p-6 bg-black/60 font-mono text-xs text-[var(--foreground)] overflow-y-auto flex-1 space-y-1 scrollbar-thin">
              {scriptLogs.map((log, i) => (
                <div key={i} className={log.includes('[ERRO') || log.includes('[ERROR]') ? 'text-rose-400' : log.includes('[SUCCESS]') || log.includes('[SUCESSO]') || log.includes('[FINISH]') ? 'text-[var(--lime)] font-bold' : log.includes('[VOLUME]') ? 'text-sky-300 font-semibold' : log.includes('[PROGRESS]') ? 'text-emerald-300' : log.includes('[AVISO]') || log.includes('[DICA]') ? 'text-amber-300' : 'text-slate-300'}>
                  {log}
                </div>
              ))}
              {isRunningScript && (
                <div className="flex items-center gap-2 text-[var(--lime)] pt-2 animate-pulse">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processando registros clínicos via Oracle...</span>
                </div>
              )}
            </div>

            <footer className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--card-bg)] flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">
                {isRunningScript ? 'Execução em andamento. Não feche a conexão.' : 'Processo concluído.'}
              </span>
              <button
                onClick={() => {
                  setScriptModalOpen(false);
                  if (!isRunningScript && filters.documento && filters.campo) {
                    handleSearch(undefined, true);
                  }
                }}
                className="px-4 py-2 bg-[var(--lime)] text-[var(--lime-ink)] font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer hover:brightness-105"
              >
                {isRunningScript ? 'Ocultar' : 'Fechar e Atualizar'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Aba de Mapeamentos */}
      <div className={activeTab === 'mapeamentos' ? 'mt-4 animate-in fade-in duration-300' : 'hidden'}>
        <MapeamentosTab
          docMappings={docMappings}
          onSave={handleSaveMappings}
          docVersion={docVersion || 'V3'}
          schemaOwner={auditSchemaOwner}
          onOpenDdlModal={() => setDdlModalOpen(true)}
        />
      </div>

      {/* Modal DDL Tabela + View */}
      <SimilarityDdlModal
        isOpen={ddlModalOpen}
        onClose={() => setDdlModalOpen(false)}
        schemaOwner={auditSchemaOwner}
        docVersion={docVersion || 'V3'}
      />
    </div>
  );
}
