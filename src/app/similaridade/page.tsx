"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  ScanEye,
  ChevronUp,
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
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  Hash,
  Layers,
  Link as LinkIcon,
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
import toast, { Toaster } from 'react-hot-toast';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { cn, getToday, get30DaysAgo, getVal } from '@/lib/utils';

// Novos componentes modulares
import { DiffText } from '@/components/similaridade/DiffText';
import { EnhancedMultiSelect } from '@/components/similaridade/EnhancedMultiSelect';
import { MapeamentosTab } from '@/components/similaridade/MapeamentosTab';
import { PageHeader } from '@/components/ui/PageHeader';

// ─────────────────────────────────────────────────────────────────────────────

export default function SimilaridadePage() {
  const { docVersion } = useUI();
  const router = useRouter();
  const [similarityData, setSimilarityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Proteção de rota
  useEffect(() => {
    const savedVersion = sessionStorage.getItem('app_doc_version');
    if (!docVersion && !savedVersion) {
      router.push('/');
    }
  }, [docVersion, router]);

  const [error, setError] = useState('');
  const [activeConnName, setActiveConnName] = useState('');
  const [similarityQuery, setSimilarityQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [docMappings, setDocMappings] = useState<DocMapping[]>([]);
  const [activeTab, setActiveTab] = useState<'consulta' | 'mapeamentos'>('consulta');
  const [reportUrl, setReportUrl] = useState('http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=');

  // Hospitais (Empresas)
  const [hospitals, setHospitals] = useState<{id: number, sigla: string, nome: string}[]>([]);

  // Filtros

  const [filters, setFilters] = useState({
    documento: '',
    campo: '',
    prestador: '',
    empresa: '' as string,
    dataInicio: get30DaysAgo(),
    dataFim: getToday(),
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
      if (storage.hospitalsMapping) {
        const activeHospitals = storage.hospitalsMapping
          .filter((h: any) => h.ativo)
          .map((h: any) => ({ id: h.id, sigla: h.sigla, nome: h.nome || h.sigla }));
        setHospitals(activeHospitals);
      }
    } catch (err) {
      console.error('[Similaridade] Falha ao verificar conexão:', err);
    }
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
      } else {
        throw new Error('Falha ao salvar os mapeamentos.');
      }
    } catch (err) {
      console.error('Erro ao salvar mapeamentos:', err);
      throw err;
    }
  }


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
    console.log('--- INICIANDO BUSCA DE SIMILARIDADE ---');
    console.log('Filtros:', filters);
    console.log('Query SQL:', similarityQuery ? 'Personalizada (Storage)' : 'Padrão (Fallback)');

    setLoading(true);
    setError('');
    setHasSearched(true);
    
    // Reset de seleções locais ao buscar novos dados
    setSearchTerm('');
    setFilterAtendimento('');
    setSelectedUnidades([]);
    setSelectedPrestadores([]);

    try {
      // Montar cláusula de empresa dinamicamente
      const empresaClause = filters.empresa
        ? 'AND ATE.CD_MULTI_EMPRESA = :CD_EMPRESA'
        : '';

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
            A.GRAU_SIMILARIDADE as SCORE,
            ATE.CD_MULTI_EMPRESA as CD_EMPRESA,
            ME.DS_MULTI_EMPRESA as NOME_EMPRESA
        FROM 
            DBAMV.TB_AUDITORIA_SIMILARIDADE A
        LEFT JOIN
            DBAMV.PRESTADOR P ON P.CD_PRESTADOR = A.CD_PRESTADOR
        JOIN
            DBAMV.ATENDIME ATE ON ATE.CD_ATENDIMENTO = A.CD_ATENDIMENTO
        LEFT JOIN
            DBAMV.MULTI_EMPRESA ME ON ME.CD_MULTI_EMPRESA = ATE.CD_MULTI_EMPRESA
        WHERE 
            A.CD_DOCUMENTO = :CD_DOCUMENTO
            AND A.IDENTIFICADOR_FILTRO = :IDENTIFICADOR
            AND A.DH_FECHAMENTO BETWEEN TO_DATE(:DATA_INI, 'YYYY-MM-DD') AND TO_DATE(:DATA_FIM, 'YYYY-MM-DD') + 1
            ${empresaClause}
        ORDER BY 
            A.CD_ATENDIMENTO DESC, A.DH_FECHAMENTO DESC
      `;

      // Montar params dinamicamente
      const params: Record<string, string> = {
        CD_DOCUMENTO: filters.documento,
        IDENTIFICADOR: filters.campo,
        DATA_INI: filters.dataInicio,
        DATA_FIM: filters.dataFim
      };
      if (filters.empresa) {
        params.CD_EMPRESA = filters.empresa;
      }

      const execRes = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          params
        }),
      });

      const result = await execRes.json();
      if (execRes.ok) {
        console.log('Sucesso! Registros encontrados:', result.rows?.length || 0);
        setSimilarityData(result.rows || []);
      } else {
        console.error('Erro na API:', result.error);
        setError(result.error || 'Erro ao consultar similaridade.');
      }
    } catch (err) {
      console.error('Erro de rede:', err);
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
      const fullLabel = data.name && data.name !== code ? `${code} - ${data.name}` : code;
      
      return {
        name: code,
        fullName: fullLabel,
        shortLabel: shortName,
        value: data.count,
        percentage: percentage,
        code: fullLabel // Usa o label completo para sincronizar com o filtro
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

  // 4. Final Filtered Data: Aplica os filtros de Multiseleção ao resultado base
  const filteredData = useMemo(() => {
    let data = [...baseFilteredData];

    // Filtro por Unidade (Multi)
    if (selectedUnidades.length > 0) {
      data = data.filter(row => selectedUnidades.includes(String(getVal(row, 'UNIDADE') || '')));
    }

    // Filtro por Prestador (Multi)
    if (selectedPrestadores.length > 0) {
      data = data.filter(row => {
        const fullPrestador = String(getVal(row, 'PRESTADOR') || '');
        // Se já vier formatado "ID - NOME", usamos direto. Se não, montamos.
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
    if (score >= 80) return 'bg-rose-100 text-rose-700 border-red-500/50/20';
    if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-500/20';
  };

  return (
    <div className="min-h-screen bg-card flex flex-col p-4 md:p-8 space-y-10 font-sans text-foreground selection:bg-blue-100 selection:text-blue-900">
      <Toaster position="top-right" reverseOrder={false} />
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-8 relative overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--primary)]/5 blur-[100px] rounded-none pointer-events-none"></div>
        
        <div className="flex-1 relative z-10">
          <PageHeader 
            title="Similaridade NLP"
            subtitle="EMR Redundancy Audit Engine • v2.0"
            icon={ScanEye}
            badge={activeConnName || 'DISCONNECTED'}
          />
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted group-focus-within:text-[var(--primary)] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Filtro instantâneo..."
              className="bg-background border border-border rounded-none pl-10 pr-4 py-2.5 text-xs text-foreground outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-72 transition-all shadow-none font-bold -muted disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!hasSearched || loading}
            />
          </div>
          
          <button 
            onClick={() => window.print()}
            className="p-2.5 bg-background border border-border text-muted -foreground hover:border-slate-400 rounded-none transition-all shadow-none group"
            title="Imprimir Relatório"
          >
            <Printer size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        <button
          onClick={() => setActiveTab('consulta')}
          className={`flex items-center gap-2 px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all font-mono border-b-2 -mb-px ${
            activeTab === 'consulta'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-muted hover:text-foreground hover:border-[var(--primary)]'
          }`}
        >
          <SearchCode size={14} />
          Consulta
        </button>
        <button
          onClick={() => setActiveTab('mapeamentos')}
          className={`flex items-center gap-2 px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all font-mono border-b-2 -mb-px ${
            activeTab === 'mapeamentos'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-muted hover:text-foreground hover:border-[var(--primary)]'
          }`}
        >
          <BookOpen size={14} />
          Mapeamentos
        </button>
      </div>

      <div className={activeTab === 'consulta' ? 'space-y-10 animate-in fade-in duration-300' : 'hidden'}>
      {/* Painel de Filtros Ultra-Compacto (Single Line) */}
      <div className="-background backdrop-blur-md border border-border rounded-3xl p-6 shadow-none relative group overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30"></div>
        <div className="flex flex-wrap items-end gap-6">
          {/* Empresa (Hospital) */}
          {hospitals.length > 0 && (
            <div className="w-[200px] space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} className="text-[var(--primary)]" /> Empresa
              </label>
              <select
                className="w-full bg-background border-2 border-border rounded-none px-4 py-2.5 text-xs font-black text-foreground outline-none focus:border-[var(--primary)] transition-all shadow-none"
                value={filters.empresa}
                onChange={(e) => setFilters(f => ({ ...f, empresa: e.target.value }))}
              >
                <option value="">Todas</option>
                {hospitals.map(h => (
                  <option key={h.id} value={String(h.id)}>{h.sigla}</option>
                ))}
              </select>
            </div>
          )}

          {/* Documento (Selector) */}
          <div className="flex-1 min-w-[300px] space-y-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={12} className="text-[var(--primary)]" /> Documento Alvo
            </label>
            <select
              className={`w-full bg-background border-2 rounded-none px-4 py-2.5 text-xs font-black text-foreground outline-none transition-all shadow-none hover:shadow-none ${!filters.documento && hasSearched ? 'border-rose-400 animate-shake' : 'border-border focus:border-[var(--primary)]'}`}
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

          {/* Identificador (Selector Dependente) */}
          <div className="flex-1 min-w-[250px] space-y-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
              <Split size={12} className="text-[var(--primary)]" /> Identificador Campo
            </label>
            <select
              className={`w-full bg-background border-2 rounded-none px-4 py-2.5 text-xs font-black text-foreground outline-none transition-all shadow-none hover:shadow-none ${!filters.campo && hasSearched ? 'border-rose-400 animate-shake' : 'border-border focus:border-[var(--primary)]'}`}
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
            onClick={() => setActiveTab('mapeamentos')}
            className="h-[46px] w-[46px] min-w-[46px] bg-background border-2 border-border text-muted hover:text-[var(--primary)] hover:border-[var(--primary)] rounded-none flex items-center justify-center transition-all shadow-none hover:shadow-none hover:-translate-y-0.5 group"
            title="Gerenciar Mapeamentos"
          >
            <SettingsIcon size={18} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>

          {/* Datas */}
          <div className="flex gap-4">
            <div className="w-[140px] space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-[var(--primary)]" /> Período De
              </label>
              <input
                type="date"
                className="w-full bg-background border-2 border-border rounded-none px-3 py-2.5 text-xs font-black text-foreground outline-none focus:border-[var(--primary)] transition-all shadow-none"
                value={filters.dataInicio}
                onChange={(e) => setFilters(f => ({ ...f, dataInicio: e.target.value }))}
              />
            </div>
            <div className="w-[140px] space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                <ArrowRight size={12} className="text-[var(--primary)]" /> Até
              </label>
              <input
                type="date"
                className="w-full bg-background border-2 border-border rounded-none px-3 py-2.5 text-xs font-black text-foreground outline-none focus:border-[var(--primary)] transition-all shadow-none"
                value={filters.dataFim}
                min={filters.dataInicio}
                onChange={(e) => setFilters(f => ({ ...f, dataFim: e.target.value }))}
              />
            </div>
          </div>

          {/* Score */}
          <div className="w-[120px] space-y-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
              <ChevronUp size={12} className="text-[var(--primary)]" /> Sensibilidade
            </label>
            <select
              className="w-full bg-background border-2 border-border rounded-none px-3 py-2.5 text-xs font-black text-foreground outline-none focus:border-[var(--primary)] transition-all shadow-none"
              value={filters.minScore}
              onChange={(e) => setFilters(f => ({ ...f, minScore: Number(e.target.value) }))}
            >
              <option value="0">Padrão</option>
              <option value="50">+50%</option>
              <option value="80">+80% (Crítico)</option>
              <option value="95">+95% (Cópia)</option>
            </select>
          </div>

          {/* Botão de Busca */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="h-[46px] px-8 bg-card hover:bg-black text-foreground rounded-none flex items-center justify-center gap-3 transition-all shadow-none shadow-slate-200 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 relative overflow-hidden group/search"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/0 via-white/10 to-[var(--primary)]/0 -translate-x-full group-hover/search:animate-shimmer"></div>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <SearchCode size={20} />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Consultar</span>
          </button>
        </div>
      </div>

      {/* Tabela de Resultados ou Estado Inicial */}
      {!hasSearched ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-none -background">
          <div className="p-8 bg-background rounded-none shadow-none shadow-blue-100 mb-8 border border-border">
            <ScanEye size={64} className="text-blue-500 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-3">Pronto para Auditar</h3>
          <p className="text-muted font-medium text-center max-w-md leading-relaxed">
            Selecione o <span className="text-blue-600 font-bold italic underline underline-offset-4 decoration-blue-200">documento</span> e o <span className="text-blue-600 font-bold italic underline underline-offset-4 decoration-blue-200">campo</span> acima para iniciar o cruzamento de dados na base Oracle.
          </p>
        </div>
      ) : loading ? (
        <div className="flex-1 space-y-10 animate-in fade-in duration-500">
          {/* Skeleton KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-background border border-border rounded-[32px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent -translate-x-full animate-shimmer"></div>
              </div>
            ))}
          </div>
          {/* Skeleton Chart */}
          <div className="h-[380px] bg-background border border-border rounded-[32px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent -translate-x-full animate-shimmer"></div>
          </div>
          {/* Skeleton Table */}
          <div className="bg-background border border-border rounded-[32px] p-6 space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 bg-card rounded-none relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent -translate-x-full animate-shimmer"></div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 border-2 border-dashed border-red-500/50/20 rounded-none bg-rose-50/50">
          <div className="p-8 bg-background rounded-none shadow-none shadow-rose-100 mb-8 border border-rose-100">
            <Search size={64} className="text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-rose-800 uppercase tracking-tighter mb-3">Nenhum Registro</h3>
          <p className="text-rose-500 font-medium text-center max-w-md">
            Não encontramos dados para os filtros selecionados. Tente ajustar o <span className="text-red-500 font-bold">período</span> ou a <span className="text-red-500 font-bold">sensibilidade</span>.
          </p>
          <button 
            onClick={() => {
              setFilters(f => ({ ...f, dataInicio: '2026-01-01', dataFim: getToday() }));
              setTimeout(handleSearch, 100);
            }}
            className="mt-6 px-8 py-3 bg-rose-600 hover:bg-rose-700 text-foreground rounded-none text-[10px] font-black uppercase tracking-widest transition-all shadow-none shadow-rose-200 active:scale-95"
          >
            Ampliar Período (2026+)
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Total */}
            <div className="-background backdrop-blur-xl border -border rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-none blur-[40px] group-hover:bg-blue-500/20 transition-colors"></div>
              <div className="flex justify-between items-start z-10">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Dataset Total</p>
                <div className="p-2.5 bg-blue-50/80 text-blue-600 rounded-[14px] group-hover:bg-blue-600 -foreground transition-colors duration-500 shadow-none">
                  <ClipboardList size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="z-10 mt-4">
                <h3 className="text-4xl font-black text-foreground tracking-tighter">{similarityData.length}</h3>
                <p className="text-[10px] font-bold text-muted mt-1 flex items-center gap-1.5">
                  <Database size={10} /> Analisados na base Oracle
                </p>
              </div>
            </div>

            {/* KPI 2: Média */}
            <div className="-background backdrop-blur-xl border -border rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-none blur-[40px] group-hover:bg-amber-500/20 transition-colors"></div>
              <div className="flex justify-between items-start z-10">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Média de Risco</p>
                <div className="p-2.5 bg-amber-50/80 text-amber-600 rounded-[14px] group-hover:bg-amber-500 -foreground transition-colors duration-500 shadow-none">
                  <AlertTriangle size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="z-10 mt-4">
                <h3 className="text-4xl font-black text-foreground tracking-tighter">
                  {(similarityData.reduce((acc, r) => acc + (Number(getVal(r, 'SCORE')) || 0), 0) / (similarityData.length || 1)).toFixed(1)}<span className="text-2xl text-muted ml-1">%</span>
                </h3>
                <p className="text-[10px] font-bold text-muted mt-1 flex items-center gap-1.5">
                  <ChartIcon size={10} className="text-amber-500" /> Score médio da seleção
                </p>
              </div>
            </div>

            {/* KPI 3: Críticos */}
            <div className={`-background backdrop-blur-xl border -border rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px] ${similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length > 0 ? "shadow-rose-100/50 border-rose-100" : "hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-none blur-[40px] group-hover:bg-rose-500/20 transition-colors"></div>
              <div className="flex justify-between items-start z-10">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Docs Críticos</p>
                <div className={`p-2.5 rounded-[14px] shadow-none transition-colors duration-500 ${similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length > 0 ? 'bg-rose-500 text-foreground animate-pulse' : 'bg-red-500/10 text-rose-500 group-hover:bg-rose-500 -foreground'}`}>
                  <ScanEye size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="z-10 mt-4">
                <h3 className={`text-4xl font-black tracking-tighter ${similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length > 0 ? 'text-red-500' : 'text-foreground'}`}>
                  {similarityData.filter(r => Number(getVal(r, 'SCORE')) >= 80).length}
                </h3>
                <p className="text-[10px] font-bold text-muted mt-1 flex items-center gap-1.5">
                  <AlertTriangle size={10} className="text-rose-500" /> Acima de 80% similaridade
                </p>
              </div>
            </div>

            {/* KPI 4: Filtrados */}
            <div className="-background backdrop-blur-xl border -border rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-none blur-[40px] group-hover:bg-emerald-500/20 transition-colors"></div>
              <div className="flex justify-between items-start z-10">
                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Seleção Ativa</p>
                <div className="p-2.5 bg-emerald-50/80 text-emerald-600 rounded-[14px] group-hover:bg-emerald-500 -foreground transition-colors duration-500 shadow-none">
                  <ShieldCheck size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div className="z-10 mt-4">
                <h3 className="text-4xl font-black text-foreground tracking-tighter">{filteredData.length}</h3>
                <p className="text-[10px] font-bold text-muted mt-1 flex items-center gap-1.5">
                  <Filter size={10} /> Volume após filtros em cascata
                </p>
              </div>
            </div>
          </div>

          <div className="bg-background p-8 rounded-[32px] border border-border shadow-none relative overflow-hidden h-[380px] flex flex-col group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-none -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h4 className="text-xl font-black text-foreground uppercase italic tracking-tighter flex items-center gap-3">
                  <ChartIcon size={22} className="text-blue-600" /> 
                  Top 10 Prestadores por Volume
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-none bg-emerald-500"></div>
                  <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em]">Distribuição de Similaridade por CRM/Registro</p>
                </div>
              </div>
              
              {selectedPrestadores.length > 0 && (
                <button
                  onClick={() => setSelectedPrestadores([])}
                  className="px-5 py-2.5 bg-card text-foreground rounded-none text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-none active:scale-95 group/reset"
                >
                  <RefreshCw size={14} className="group-hover/reset:rotate-180 transition-transform duration-500" /> 
                  Limpar Seleção
                </button>
              )}
            </div>
            
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
                          <text x={0} y={20} textAnchor="middle" fill="#94a3b8" style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em' }}>
                            {payload.value}
                          </text>
                          <text x={0} y={35} textAnchor="middle" fill="#0ea5e9" style={{ fontSize: '11px', fontWeight: '900' }}>
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
                    tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 8 }}
                    position={{ y: 330 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="-background backdrop-blur-xl border border-border p-5 shadow-none rounded-none animate-in zoom-in-95 duration-200 min-w-[260px]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b -border">
                                <div className="p-2 bg-blue-600 rounded-none">
                                  <Stethoscope size={16} className="text-foreground" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-foreground text-[11px] font-black uppercase tracking-widest truncate">{data.fullName}</p>
                                  <p className="text-muted text-[8px] font-bold uppercase tracking-widest mt-0.5">Prestador Clínico</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <span className="text-muted text-[9px] font-black uppercase tracking-widest">Volume de Docs</span>
                                  <p className="text-foreground text-[18px] font-black italic">{data.value} <small className="text-[10px] opacity-40 italic">UN</small></p>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-muted text-[9px] font-black uppercase tracking-widest">Similaridade</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 h-1.5 -background rounded-none overflow-hidden">
                                      <div className="h-full bg-blue-500" style={{ width: `${data.percentage}%` }}></div>
                                    </div>
                                    <p className="text-blue-400 text-[18px] font-black">{data.percentage}%</p>
                                  </div>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t -border text-center">
                              <p className="text-muted text-[8px] font-black uppercase tracking-widest animate-pulse italic">Clique para isolar prestador</p>
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                          fill={isSelected ? '#2563eb' : (index === 0 ? '#ef4444' : index < 3 ? '#f59e0b' : '#3b82f6')}
                          className="transition-all duration-500 hover:fill-blue-400"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Filtros Horizontais Pro Max (Dynamic Toolbar) */}
          <div className="bg-card rounded-none p-5 text-foreground shadow-none relative overflow-visible border-b-4 border-blue-600">
            <div className="flex flex-col lg:flex-row items-end gap-6 relative z-10">

              <div className="flex items-center gap-3 pr-6 border-r border-border">
                <div className="p-2.5 bg-blue-600 text-foreground rounded-none shadow-none">
                  <ListFilter size={20} />
                </div>
                <div>
                  <h5 className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground italic">Filtros Dinâmicos</h5>
                  <p className="text-[9px] text-muted font-bold uppercase mt-0.5">Refinamento Instantâneo</p>
                </div>
              </div>

              {/* Atendimento */}
              <div className="flex-1 w-full lg:w-48 space-y-1.5">
                <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                  <Search size={10} /> Atendimento
                </label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-blue-500 transition-colors" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar atendimento..."
                    value={filterAtendimento}
                    onChange={(e) => setFilterAtendimento(e.target.value)}
                    className="w-full -background border-2 -border rounded-none pl-9 pr-3 py-1.5 text-[11px] font-bold text-foreground -muted outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                className="h-[38px] px-6 -background hover:bg-rose-900 border-2 -border rounded-none text-[10px] font-black uppercase tracking-widest transition-all text-muted -foreground flex items-center justify-center gap-2 group whitespace-nowrap"
                title="Resetar todos os filtros"
              >
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Tabela de Resultados Final */}
          <div className="bg-background rounded-[32px] border border-border flex flex-col overflow-hidden shadow-none relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500"></div>
            <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
              <table className="w-full text-left border-collapse table-auto min-w-max">
                <thead>
                  <tr className="-background border-b border-border">
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-center">Atendimento</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Registro Clínico</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Empresa</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Data e Hora</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-center">Prestador</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Localização</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-center">Similaridade</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-center">Auditoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-border border-t-[var(--primary)] rounded-none animate-spin"></div>
                            <ScanEye className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--primary)]" size={24} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[12px] font-black uppercase tracking-[0.4em] text-foreground block">Processando Similaridade</span>
                            <span className="text-[9px] font-bold text-muted uppercase tracking-widest block">Isolando padrões de texto via NLP Oracle...</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((row, idx) => {
                      const score = Number(getVal(row, 'SCORE')) || 0;
                      return (
                        <tr key={idx} className="-background transition-all group/tr">
                          <td className="px-8 py-4 text-[12px] font-black text-center text-muted font-mono group-hover/-foreground transition-colors">{getVal(row, 'ATENDIMENTO')}</td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 -background rounded-none flex items-center justify-center text-muted group-hover/tr:bg-blue-500/10 group-hover/tr:text-blue-600 transition-all">
                                <FileText size={18} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[12px] font-black text-foreground tracking-tight leading-none mb-1">{getVal(row, 'NOME_DOCUMENTO')}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-muted uppercase tracking-tighter -background px-1.5 py-0.5 rounded">ID: {getVal(row, 'DOCUMENTO')}</span>
                                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-1.5 py-0.5 rounded italic">{getVal(row, 'IDENTIFICADOR')}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={12} className="text-muted opacity-40" />
                              <span className="text-[10px] font-black text-muted uppercase tracking-widest">{getVal(row, 'NOME_EMPRESA') || getVal(row, 'CD_EMPRESA') || '—'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2 text-muted">
                              <Calendar size={12} className="opacity-40" />
                              <span className="text-[11px] font-bold">
                                {(() => {
                                  const iso = getVal(row, 'DATA_HORA_ISO');
                                  const raw = getVal(row, 'DATA_HORA');
                                  const d = iso ? new Date(iso.replace(' ', 'T')) : new Date(raw);
                                  return isNaN(d.getTime()) ? 'Data Inválida' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                             <div className="inline-flex items-center justify-center w-10 h-10 rounded-none -background border-2 border-white shadow-none overflow-hidden group-hover/tr:border-blue-200 transition-all" title={getVal(row, 'PRESTADOR')}>
                               <User size={18} className="text-muted group-hover/tr:text-blue-500" />
                             </div>
                             <p className="text-[9px] font-black text-muted mt-1 uppercase italic tracking-tighter group-hover/-muted">{getVal(row, 'PRESTADOR')}</p>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-none bg-slate-400"></div>
                                <span className="text-[11px] font-black text-foreground uppercase italic tracking-tighter">{getVal(row, 'LEITO') || 'N/A'}</span>
                              </div>
                              <span className="text-[9px] font-bold text-muted uppercase tracking-[0.1em]">{getVal(row, 'UNIDADE') || 'SETOR EXTERNO'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-full max-w-[80px] h-1.5 -background rounded-none overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ${score >= 80 ? 'bg-rose-500' : score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${score}%` }}></div>
                              </div>
                              <span className={`text-[12px] font-black italic tracking-tighter ${score >= 80 ? 'text-red-500' : score >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {score.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <button
                              onClick={() => {
                                setComparingDoc(row);
                                fetchComparison(row);
                              }}
                              className="w-10 h-10 flex items-center justify-center bg-card text-foreground rounded-none hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all shadow-none shadow-slate-200 group/btn-audit"
                              title="Audit NLP Lado a Lado"
                            >
                              <Split size={20} className="group-hover/btn-audit:rotate-12 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-48 text-center -background">
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-8 bg-background rounded-none shadow-none mb-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white"></div>
                            <XCircle size={64} className="-foreground relative z-10" />
                          </div>
                          <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter">Vácuo de Similaridade</h3>
                          <p className="text-sm text-muted font-medium max-w-xs mt-3 leading-relaxed">
                            Não encontramos registros que correspondam aos filtros aplicados nesta janela de tempo.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação Premium */}
            <div className="bg-background border-t border-border px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-none"></div>
                  <span className="text-[11px] font-black text-foreground uppercase tracking-widest italic">
                    {filteredData.length} <span className="text-muted">Matches Analisados</span>
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-card rounded-none border border-border">
                   <p className="text-[9px] font-black text-muted uppercase tracking-widest">Página {currentPage} de {totalPages || 1}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-10 h-10 flex items-center justify-center bg-background border-2 border-border rounded-none text-muted disabled:opacity-30 hover:border-blue-500 hover:text-blue-600 transition-all shadow-none"
                >
                  <ChevronFirst size={18} />
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-background border-2 border-border rounded-none text-muted disabled:opacity-30 hover:border-blue-500 hover:text-blue-600 transition-all shadow-none"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1 px-4">
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
                        className={`w-10 h-10 rounded-none text-xs font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-foreground shadow-none shadow-blue-200' : 'bg-card text-muted -background'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="w-10 h-10 flex items-center justify-center bg-background border-2 border-border rounded-none text-muted disabled:opacity-30 hover:border-blue-500 hover:text-blue-600 transition-all shadow-none"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-10 h-10 flex items-center justify-center bg-background border-2 border-border rounded-none text-muted disabled:opacity-30 hover:border-blue-500 hover:text-blue-600 transition-all shadow-none"
                >
                  <ChevronLast size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Comparação Slide-over Side-by-Side */}
      {comparingDoc && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 -background backdrop-blur-sm transition-opacity" onClick={() => setComparingDoc(null)}></div>
          
          <div className="relative w-full max-w-6xl bg-background h-full shadow-none flex flex-col animate-in slide-in-from-right duration-500 ease-out">
            <header className="px-8 py-6 border-b border-border flex items-center justify-between -background backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-card text-foreground rounded-none shadow-none shadow-slate-200">
                  <ScanEye size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-3">
                    Auditoria NLP
                  </h2>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                    Doc: {getVal(comparingDoc, 'DOCUMENTO')} | <b className="text-[var(--primary)]">{(Number(getVal(comparingDoc, 'SCORE')) || 0).toFixed(1)}% SIMILAR</b>
                  </p>
                </div>
              </div>
              <button onClick={() => setComparingDoc(null)} className="p-2 -card rounded-none transition-colors text-muted">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Texto Anterior */}
              <div className="flex-1 flex flex-col h-1/2 md:h-full -background">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">Documento Anterior (Original)</span>
                    {comparisonTexts?.dataAnterior && (
                      <span className="text-[9px] font-bold text-muted mt-0.5 opacity-80 flex items-center gap-2">
                        <span>{comparisonTexts.dataAnterior} {comparisonTexts.cdAnterior && `| DOC: ${comparisonTexts.cdAnterior}`}</span>
                        {comparisonTexts.regAnterior && (
                          <a
                            href={`${reportUrl}${comparisonTexts.regAnterior}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="-card -accent text-muted px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                          >
                            <Printer size={10} /> PDF
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-1 -card text-muted rounded text-[9px] font-black tracking-widest">ORIGINAL</div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto font-serif text-muted leading-relaxed text-sm">
                  {compLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="animate-spin -muted" size={32} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      <DiffText
                        oldText={comparisonTexts?.anterior}
                        newText={comparisonTexts?.atual}
                        type="previous"
                        score={Number(getVal(comparingDoc, 'SCORE')) || 0}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Divisor Visual central para telas grandes */}
              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border p-2.5 rounded-none shadow-none z-10 text-[var(--primary)]">
                <Split size={18} strokeWidth={2.5} />
              </div>

              {/* Texto Atual */}
              <div className="flex-1 flex flex-col h-1/2 md:h-full bg-background">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">Documento Atual (Auditoria)</span>
                    {comparisonTexts?.dataAtual && (
                      <span className="text-[9px] font-bold text-[var(--primary)] mt-0.5 opacity-80 flex items-center gap-2">
                        <span>{comparisonTexts.dataAtual} {comparisonTexts.cdAtual && `| DOC: ${comparisonTexts.cdAtual}`}</span>
                        {comparisonTexts.regAtual && (
                          <a
                            href={`${reportUrl}${comparisonTexts.regAtual}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                          >
                            <Printer size={10} /> PDF
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-[9px] font-black border tracking-widest ${getScoreColor(Number(getVal(comparingDoc, 'SCORE')) || 0)}`}>
                    {(Number(getVal(comparingDoc, 'SCORE')) || 0).toFixed(1)}% SIMILAR
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto font-serif text-foreground leading-relaxed text-sm">
                  {compLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="animate-spin text-[var(--primary)]/50" size={32} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      <DiffText
                        oldText={comparisonTexts?.anterior}
                        newText={comparisonTexts?.atual}
                        type="current"
                        score={Number(getVal(comparingDoc, 'SCORE')) || 0}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className="px-8 py-5 bg-card border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-muted" />
                  <span className="text-[11px] font-black text-foreground">{getVal(comparingDoc, 'LEITO')} | {getVal(comparingDoc, 'UNIDADE')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope size={14} className="text-muted" />
                  <span className="text-[11px] font-black text-foreground">{getVal(comparingDoc, 'PRESTADOR')}</span>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-2.5 bg-card text-foreground rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-black hover:shadow-none hover:-translate-y-0.5 transition-all"
              >
                <Printer size={16} /> Imprimir Laudo
              </button>
            </footer>
          </div>
        </div>
      )}

      </div>

      {/* Aba de Mapeamentos */}
      <div className={activeTab === 'mapeamentos' ? 'mt-8 animate-in fade-in duration-300' : 'hidden'}>
        <MapeamentosTab docMappings={docMappings} onSave={handleSaveMappings} />
      </div>
    </div>
  );
}
