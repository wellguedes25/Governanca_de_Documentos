import type { DbConnection, HospitalMapping } from './storage';

export const DEMO_CONNECTION_ID = 'demo-sandbox';

export const DEMO_CONNECTION: DbConnection = {
  id: DEMO_CONNECTION_ID,
  name: 'DEMONSTRAÇÃO (SANDBOX)',
  user: 'DEMO_MV',
  password: '',
  connectString: 'DEMO://SANDBOX.GOVERDOC.LOCAL/DBAMV',
};

export const DEFAULT_DEMO_HOSPITALS: HospitalMapping[] = [
  { id: 1, sigla: 'HCA', nome: 'HOSPITAL CENTRAL ALFA (DEMO)', ativo: true },
  { id: 2, sigla: 'HSB', nome: 'HOSPITAL SANTA BEATRIZ (DEMO)', ativo: true },
  { id: 3, sigla: 'HMI', nome: 'HOSPITAL MATERNO INFANTIL (DEMO)', ativo: true },
  { id: 4, sigla: 'UPA', nome: 'UNIDADE PRONTO ATENDIMENTO SUL (DEMO)', ativo: true },
];

export function isDemoConnection(conn?: Partial<DbConnection> | null): boolean {
  if (!conn) return false;
  return (
    conn.id === DEMO_CONNECTION_ID ||
    Boolean(conn.connectString && conn.connectString.startsWith('DEMO://'))
  );
}

interface DemoDocDef {
  id: number;
  name: string;
  identifier: string;
  version: number;
  engines: Array<'V3' | 'V2'>;
  total90d: number;
  lastUsedHoursAgo: number;
  idle?: boolean;
  weights: number[]; // relative distribution across hospitals
  fields: Array<{
    cdCampo: number;
    cdMetadado: number;
    tag: string;
    name: string;
    visualType: string;
    rulesCount: number;
  }>;
  rules: Array<{
    cdRegra: number;
    numOrdem: number;
    dsRegra: string;
    ativa: number;
    tipoRegra: string;
    dsAlerta: string | null;
    condicao: string;
    camposAfetados: string;
    script: string | null;
  }>;
  actions: Array<{
    cdCampo: number;
    cdMetadado: number;
    nomeCampo: string;
    identificador: string;
    targetDocId?: number;
    targetGroup?: string;
    script: string;
  }>;
}

const DEMO_DOCS: DemoDocDef[] = [
  {
    id: 382,
    name: 'EVOLUCAO MEDICA DIARIA',
    identifier: 'DOC_EVOLUCAO_MEDICA',
    version: 10,
    engines: ['V3', 'V2'],
    total90d: 34280,
    lastUsedHoursAgo: 0.2,
    weights: [0.38, 0.27, 0.2, 0.15],
    fields: [
      { cdCampo: 38201, cdMetadado: 9001, tag: 'ALERGIA_RESUMO', name: 'Resumo de Alergias (Herdado)', visualType: 'Caixa de Texto', rulesCount: 2 },
      { cdCampo: 38202, cdMetadado: 9002, tag: 'SINAIS_VITAIS_ULT', name: 'Últimos Sinais Vitais', visualType: 'Grade Dinâmica', rulesCount: 1 },
      { cdCampo: 38203, cdMetadado: 9003, tag: 'BALANCO_24H', name: 'Balanço Hídrico 24h', visualType: 'Numérico Calculado', rulesCount: 1 },
      { cdCampo: 38204, cdMetadado: 9004, tag: 'EVOLUCAO', name: 'Texto da Evolução Clínica', visualType: 'Editor Rico', rulesCount: 3 },
      { cdCampo: 38205, cdMetadado: 9005, tag: 'CONDUTA_DIA', name: 'Conduta Médica do Dia', visualType: 'Editor Rico', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 7001,
        numOrdem: 1,
        dsRegra: 'REG_ALERTA_SEPSE_MEWS',
        ativa: 1,
        tipoRegra: 'ALERTA',
        dsAlerta: 'Atenção: sinais de alerta clínico compatíveis com protocolo de sepse. Avaliar pacote 1h.',
        condicao: 'SINAIS_VITAIS_ULT >= "38.5" OR EVOLUCAO = "INSTAVEL"',
        camposAfetados: 'EVOLUCAO, CONDUTA_DIA',
        script: null,
      },
      {
        cdRegra: 7002,
        numOrdem: 2,
        dsRegra: 'REG_OBRIGA_ALERGIA_REVISADA',
        ativa: 1,
        tipoRegra: 'VALIDACAO',
        dsAlerta: 'Confirme ou atualize o campo de alergias antes de assinar a evolução.',
        condicao: 'ALERGIA_RESUMO = ""',
        camposAfetados: 'ALERGIA_RESUMO',
        script: null,
      },
    ],
    actions: [
      {
        cdCampo: 38201,
        cdMetadado: 9001,
        nomeCampo: 'Resumo de Alergias (Herdado)',
        identificador: 'ALERGIA_RESUMO',
        targetDocId: 101,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 101 AND EC.DS_IDENTIFICADOR = 'ALERGIA_IDENTIFICADA' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 38202,
        cdMetadado: 9002,
        nomeCampo: 'Últimos Sinais Vitais',
        identificador: 'SINAIS_VITAIS_ULT',
        targetDocId: 215,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 215 AND EC.DS_IDENTIFICADOR = 'PA_SISTOLICA' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 38203,
        cdMetadado: 9003,
        nomeCampo: 'Balanço Hídrico 24h',
        identificador: 'BALANCO_24H',
        targetDocId: 410,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 410 AND EC.DS_IDENTIFICADOR = 'SALDO_HIDRICO_TOTAL' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
    ],
  },
  {
    id: 622,
    name: 'RESUMO DE ALTA HOSPITALAR',
    identifier: 'DOC_RESUMO_ALTA',
    version: 6,
    engines: ['V3'],
    total90d: 18940,
    lastUsedHoursAgo: 0.5,
    weights: [0.34, 0.31, 0.21, 0.14],
    fields: [
      { cdCampo: 62201, cdMetadado: 9101, tag: 'HISTORIA_CLINICA', name: 'Síntese da Anamnese', visualType: 'Editor Rico', rulesCount: 1 },
      { cdCampo: 62202, cdMetadado: 9102, tag: 'EVOLUCAO_SINTESE', name: 'Resumo da Evolução', visualType: 'Editor Rico', rulesCount: 2 },
      { cdCampo: 62203, cdMetadado: 9103, tag: 'EXAMES_CRITICOS', name: 'Principais Exames da Internação', visualType: 'Caixa de Texto', rulesCount: 0 },
      { cdCampo: 62204, cdMetadado: 9104, tag: 'CONDUTA_ALTA', name: 'Orientações de Alta', visualType: 'Editor Rico', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 7101,
        numOrdem: 1,
        dsRegra: 'REG_VALIDA_CONDUTA_ALTA',
        ativa: 1,
        tipoRegra: 'VALIDACAO',
        dsAlerta: 'O resumo de alta exige preenchimento explícito das orientações pós-alta.',
        condicao: 'CONDUTA_ALTA = ""',
        camposAfetados: 'CONDUTA_ALTA',
        script: null,
      },
    ],
    actions: [
      {
        cdCampo: 62201,
        cdMetadado: 9101,
        nomeCampo: 'Síntese da Anamnese',
        identificador: 'HISTORIA_CLINICA',
        targetDocId: 101,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 101 AND EC.DS_IDENTIFICADOR = 'QUEIXA_PRINCIPAL' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 62202,
        cdMetadado: 9102,
        nomeCampo: 'Resumo da Evolução',
        identificador: 'EVOLUCAO_SINTESE',
        targetDocId: 382,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 382 AND EC.DS_IDENTIFICADOR = 'EVOLUCAO' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 62203,
        cdMetadado: 9103,
        nomeCampo: 'Principais Exames da Internação',
        identificador: 'EXAMES_CRITICOS',
        targetDocId: 504,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 504 AND EC.DS_IDENTIFICADOR = 'RESULTADO_CRITICO' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 62204,
        cdMetadado: 9104,
        nomeCampo: 'Orientações de Alta',
        identificador: 'CONDUTA_ALTA',
        targetDocId: 580,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 580 AND EC.DS_IDENTIFICADOR = 'PLANO_TERAPEUTICO' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
    ],
  },
  {
    id: 101,
    name: 'ANAMNESE MEDICA INICIAL',
    identifier: 'DOC_ANAMNESE_MEDICA',
    version: 8,
    engines: ['V3', 'V2'],
    total90d: 24110,
    lastUsedHoursAgo: 0.7,
    weights: [0.35, 0.25, 0.22, 0.18],
    fields: [
      { cdCampo: 10101, cdMetadado: 9201, tag: 'QUEIXA_PRINCIPAL', name: 'Queixa Principal e Duração', visualType: 'Caixa de Texto', rulesCount: 1 },
      { cdCampo: 10102, cdMetadado: 9202, tag: 'ALERGIA_IDENTIFICADA', name: 'Alergias Medicamentosas', visualType: 'Lista Seleção', rulesCount: 2 },
      { cdCampo: 10103, cdMetadado: 9203, tag: 'DX_PRINCIPAL', name: 'Hipótese Diagnóstica (CID-10)', visualType: 'Pesquisa CID', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 7201,
        numOrdem: 1,
        dsRegra: 'REG_ALERTA_ALERGIA_GRAVE',
        ativa: 1,
        tipoRegra: 'ALERTA',
        dsAlerta: 'Registrar imediatamente em pulseira de identificação e notificar farmácia clínica.',
        condicao: 'ALERGIA_IDENTIFICADA = "SIM"',
        camposAfetados: 'ALERGIA_IDENTIFICADA',
        script: null,
      },
    ],
    actions: [],
  },
  {
    id: 215,
    name: 'FOLHA DE SINAIS VITAIS',
    identifier: 'DOC_SINAIS_VITAIS',
    version: 5,
    engines: ['V3', 'V2'],
    total90d: 21850,
    lastUsedHoursAgo: 0.3,
    weights: [0.32, 0.28, 0.22, 0.18],
    fields: [
      { cdCampo: 21501, cdMetadado: 9301, tag: 'PA_SISTOLICA', name: 'Pressão Arterial Sistólica (mmHg)', visualType: 'Numérico', rulesCount: 2 },
      { cdCampo: 21502, cdMetadado: 9302, tag: 'SAT_O2', name: 'Saturação Periférica O2 (%)', visualType: 'Numérico', rulesCount: 1 },
      { cdCampo: 21503, cdMetadado: 9303, tag: 'ESCORE_NEWS', name: 'Escore NEWS2 Calculado', visualType: 'Numérico Calculado', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 7301,
        numOrdem: 1,
        dsRegra: 'REG_CALC_NEWS2',
        ativa: 1,
        tipoRegra: 'CALCULO',
        dsAlerta: 'Escore NEWS2 >= 5: acionar time de resposta rápida em até 15 minutos.',
        condicao: 'PA_SISTOLICA < "90" OR SAT_O2 < "92"',
        camposAfetados: 'ESCORE_NEWS',
        script: null,
      },
    ],
    actions: [],
  },
  {
    id: 410,
    name: 'BALANCO HIDRICO UTI',
    identifier: 'DOC_BALANCO_UTI',
    version: 4,
    engines: ['V3', 'V2'],
    total90d: 8420,
    lastUsedHoursAgo: 1.4,
    weights: [0.46, 0.34, 0.15, 0.05],
    fields: [
      { cdCampo: 41001, cdMetadado: 9401, tag: 'GANHOS_TOTAIS', name: 'Volume Infundido Total (mL)', visualType: 'Numérico', rulesCount: 0 },
      { cdCampo: 41002, cdMetadado: 9402, tag: 'PERDAS_TOTAIS', name: 'Diurese e Drenos Total (mL)', visualType: 'Numérico', rulesCount: 0 },
      { cdCampo: 41003, cdMetadado: 9403, tag: 'SALDO_HIDRICO_TOTAL', name: 'Saldo Hídrico 24h (mL)', visualType: 'Numérico Calculado', rulesCount: 1 },
    ],
    rules: [],
    actions: [],
  },
  {
    id: 504,
    name: 'EXAMES E PROCEDIMENTOS DIAGNOSTICOS',
    identifier: 'DOC_EXAMES_PROC',
    version: 3,
    engines: ['V3'],
    total90d: 10960,
    lastUsedHoursAgo: 2.1,
    weights: [0.36, 0.29, 0.2, 0.15],
    fields: [
      { cdCampo: 50401, cdMetadado: 9501, tag: 'RESULTADO_CRITICO', name: 'Resultados Críticos / Achados', visualType: 'Caixa de Texto', rulesCount: 1 },
      { cdCampo: 50402, cdMetadado: 9502, tag: 'SINAIS_REFERENCIA', name: 'Parâmetros Basais Associados', visualType: 'Texto', rulesCount: 0 },
    ],
    rules: [],
    actions: [
      {
        cdCampo: 50402,
        cdMetadado: 9502,
        nomeCampo: 'Parâmetros Basais Associados',
        identificador: 'SINAIS_REFERENCIA',
        targetDocId: 215,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PEC.CD_DOCUMENTO = 215`,
      },
    ],
  },
  {
    id: 580,
    name: 'PLANO TERAPEUTICO MULTIPROFISSIONAL',
    identifier: 'DOC_PLANO_TERAPEUTICO',
    version: 4,
    engines: ['V3'],
    total90d: 7850,
    lastUsedHoursAgo: 3.0,
    weights: [0.39, 0.28, 0.23, 0.1],
    fields: [
      { cdCampo: 58001, cdMetadado: 9581, tag: 'PLANO_TERAPEUTICO', name: 'Metas Assistenciais da Equipe', visualType: 'Editor Rico', rulesCount: 1 },
      { cdCampo: 58002, cdMetadado: 9582, tag: 'CID_BASE', name: 'Diagnóstico Referência', visualType: 'Texto', rulesCount: 0 },
    ],
    rules: [],
    actions: [
      {
        cdCampo: 58002,
        cdMetadado: 9582,
        nomeCampo: 'Diagnóstico Referência',
        identificador: 'CID_BASE',
        targetDocId: 101,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PEC.CD_DOCUMENTO = 101`,
      },
    ],
  },
  {
    id: 710,
    name: 'SUMARIO DE TRANSFERENCIA INTERNA',
    identifier: 'DOC_SUMARIO_TRANSF',
    version: 3,
    engines: ['V3', 'V2'],
    total90d: 5340,
    lastUsedHoursAgo: 4.5,
    weights: [0.37, 0.3, 0.18, 0.15],
    fields: [
      { cdCampo: 71001, cdMetadado: 9711, tag: 'RESUMO_EVOLUCAO_TRANSF', name: 'Síntese Clínica Pré-Transferência', visualType: 'Editor Rico', rulesCount: 0 },
      { cdCampo: 71002, cdMetadado: 9712, tag: 'VIT_TRANSF', name: 'Sinais Vitais na Saída', visualType: 'Grade Dinâmica', rulesCount: 0 },
    ],
    rules: [],
    actions: [
      {
        cdCampo: 71001,
        cdMetadado: 9711,
        nomeCampo: 'Síntese Clínica Pré-Transferência',
        identificador: 'RESUMO_EVOLUCAO_TRANSF',
        targetDocId: 382,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PEC.CD_DOCUMENTO IN (382, 215)`,
      },
    ],
  },
  {
    id: 772,
    name: 'EVOLUCAO DE ENFERMAGEM ADMISSIONAL',
    identifier: 'DOC_EVOL_ENF_ADM',
    version: 7,
    engines: ['V3', 'V2'],
    total90d: 14680,
    lastUsedHoursAgo: 1.1,
    weights: [0.33, 0.27, 0.24, 0.16],
    fields: [
      { cdCampo: 77201, cdMetadado: 9771, tag: 'EVOLUCAO', name: 'Anotação de Enfermagem', visualType: 'Editor Rico', rulesCount: 1 },
      { cdCampo: 77202, cdMetadado: 9772, tag: 'BRADEN_SCORE', name: 'Escala de Braden', visualType: 'Numérico Calculado', rulesCount: 1 },
    ],
    rules: [],
    actions: [],
  },
  {
    id: 845,
    name: 'CHECKLIST DE CIRURGIA SEGURA OMS',
    identifier: 'DOC_CHECKLIST_CIRURGIA',
    version: 5,
    engines: ['V3'],
    total90d: 6120,
    lastUsedHoursAgo: 5.2,
    weights: [0.42, 0.35, 0.18, 0.05],
    fields: [
      { cdCampo: 84501, cdMetadado: 9841, tag: 'TIME_OUT_OK', name: 'Pausa Cirúrgica Confirmada', visualType: 'CheckBox', rulesCount: 1 },
      { cdCampo: 84502, cdMetadado: 9842, tag: 'LATERALIDADE', name: 'Demarcação de Lateralidade', visualType: 'Lista Seleção', rulesCount: 1 },
    ],
    rules: [],
    actions: [],
  },
  {
    id: 916,
    name: 'EVOLUCAO PEDIATRICA ESTRUTURADA',
    identifier: 'DOC_EVOL_PEDIATRICA',
    version: 4,
    engines: ['V3', 'V2'],
    total90d: 4890,
    lastUsedHoursAgo: 6.4,
    weights: [0.15, 0.18, 0.57, 0.1],
    fields: [
      { cdCampo: 91601, cdMetadado: 9916, tag: 'EVOLUCAO', name: 'Evolução Clínica Pediátrica', visualType: 'Editor Rico', rulesCount: 1 },
    ],
    rules: [],
    actions: [],
  },
  // Legacy V2-only docs awaiting migration to V3
  {
    id: 142,
    name: 'FICHA DE AVALIACAO NUTRICIONAL FLEX',
    identifier: 'DOC_NUTRI_V2',
    version: 2,
    engines: ['V2'],
    total90d: 3120,
    lastUsedHoursAgo: 9.0,
    weights: [0.4, 0.3, 0.2, 0.1],
    fields: [
      { cdCampo: 14201, cdMetadado: 8142, tag: 'IMC_ATUAL', name: 'Índice de Massa Corporal', visualType: 'Numérico', rulesCount: 0 },
    ],
    rules: [],
    actions: [],
  },
  {
    id: 208,
    name: 'BOLETIM ANESTESICO PRE-OPERATORIO FLEX',
    identifier: 'DOC_ANEST_V2',
    version: 3,
    engines: ['V2'],
    total90d: 4250,
    lastUsedHoursAgo: 11.5,
    weights: [0.45, 0.35, 0.15, 0.05],
    fields: [
      { cdCampo: 20801, cdMetadado: 8208, tag: 'ASA_CLASS', name: 'Classificação ASA', visualType: 'Lista Seleção', rulesCount: 0 },
    ],
    rules: [],
    actions: [],
  },
  // Idle documents (0 use in 90d)
  {
    id: 991,
    name: 'PROTOCOLO LEGADO GRIPE SAZONAL 2021',
    identifier: 'DOC_IDLE_991',
    version: 1,
    engines: ['V3', 'V2'],
    total90d: 0,
    lastUsedHoursAgo: 2800,
    idle: true,
    weights: [0.25, 0.25, 0.25, 0.25],
    fields: [],
    rules: [],
    actions: [],
  },
  {
    id: 994,
    name: 'FORMULARIO TRANSITORIO TRIAGEM COVID LEGADO',
    identifier: 'DOC_IDLE_994',
    version: 1,
    engines: ['V3', 'V2'],
    total90d: 0,
    lastUsedHoursAgo: 3200,
    idle: true,
    weights: [0.25, 0.25, 0.25, 0.25],
    fields: [],
    rules: [],
    actions: [],
  },
  {
    id: 997,
    name: 'FICHA EXPERIMENTO AMBULATORIO DESATIVADA',
    identifier: 'DOC_IDLE_997',
    version: 2,
    engines: ['V3', 'V2'],
    total90d: 0,
    lastUsedHoursAgo: 4100,
    idle: true,
    weights: [0.25, 0.25, 0.25, 0.25],
    fields: [],
    rules: [],
    actions: [],
  },
];

const DEMO_SIMILARITY_RECORDS = [
  {
    ATENDIMENTO: 849201,
    DOCUMENTO: 382,
    NOME_DOCUMENTO: 'EVOLUCAO MEDICA DIARIA',
    IDENTIFICADOR: 'EVOLUCAO',
    DATA_HORA_ISO: '2026-11-23 14:15:00',
    DATA_HORA: '2026-11-23T14:15:00',
    PRESTADOR: '10421',
    NOME_PRESTADOR: 'DR. MARCUS VINICIUS ALMEIDA (DEMO)',
    LEITO: 'UTI-04',
    UNIDADE: 'UTI ADULTO',
    SCORE: 97.4,
    CD_EMPRESA: 1,
    NOME_EMPRESA: 'HOSPITAL CENTRAL ALFA (DEMO)',
    TEXTO_ATUAL:
      'Paciente consciente, orientado, afebril nas últimas 24h. Mantém estabilidade hemodinâmica sem drogas vasoativas. Murmúrio vesicular presente bilateralmente sem ruídos adventícios. Abdome flácido, indolor à palpação, RHA presentes. Diurese espontânea satisfatória. Conduta: manter antibioticoterapia D4, fisioterapia motora e programar alta da UTI amanhã.',
    TEXTO_ANTERIOR:
      'Paciente consciente, orientado, afebril nas últimas 24h. Mantém estabilidade hemodinâmica sem drogas vasoativas. Murmúrio vesicular presente bilateralmente sem ruídos adventícios. Abdome flácido, indolor à palpação, RHA presentes. Diurese espontânea satisfatória. Conduta: manter antibioticoterapia D3, fisioterapia motora e reavaliar alta da UTI.',
  },
  {
    ATENDIMENTO: 849188,
    DOCUMENTO: 382,
    NOME_DOCUMENTO: 'EVOLUCAO MEDICA DIARIA',
    IDENTIFICADOR: 'EVOLUCAO',
    DATA_HORA_ISO: '2026-11-23 11:40:00',
    DATA_HORA: '2026-11-23T11:40:00',
    PRESTADOR: '10421',
    NOME_PRESTADOR: 'DR. MARCUS VINICIUS ALMEIDA (DEMO)',
    LEITO: 'UTI-07',
    UNIDADE: 'UTI ADULTO',
    SCORE: 92.8,
    CD_EMPRESA: 1,
    NOME_EMPRESA: 'HOSPITAL CENTRAL ALFA (DEMO)',
    TEXTO_ATUAL:
      'Em acompanhamento pós-operatório D2 de colecistectomia videolaparoscópica. Ferida operatória limpa e seca, sem sinais flogísticos. Aceitando dieta branda sem náuseas ou vômitos. Boa perfusão periférica e débito urinário adequado.',
    TEXTO_ANTERIOR:
      'Em acompanhamento pós-operatório D1 de colecistectomia videolaparoscópica. Ferida operatória limpa e seca, sem sinais flogísticos. Aceitando dieta líquida sem náuseas ou vômitos. Boa perfusão periférica e débito urinário adequado.',
  },
  {
    ATENDIMENTO: 849150,
    DOCUMENTO: 382,
    NOME_DOCUMENTO: 'EVOLUCAO MEDICA DIARIA',
    IDENTIFICADOR: 'EVOLUCAO',
    DATA_HORA_ISO: '2026-11-23 09:20:00',
    DATA_HORA: '2026-11-23T09:20:00',
    PRESTADOR: '11890',
    NOME_PRESTADOR: 'DRA. CAROLINA FERREIRA MENDES (DEMO)',
    LEITO: 'ENF-214',
    UNIDADE: 'CLÍNICA MÉDICA 2º ANDAR',
    SCORE: 83.5,
    CD_EMPRESA: 2,
    NOME_EMPRESA: 'HOSPITAL SANTA BEATRIZ (DEMO)',
    TEXTO_ATUAL:
      'Paciente refere melhora da dispneia em ar ambiente. Saturação 96%, FR 18 irpm, PA 120x80 mmHg. Edema de MMII em regressão (+/4+). Aguarda ecocardiograma transtorácico para ajuste de diurético.',
    TEXTO_ANTERIOR:
      'Paciente refere discreta dispneia aos esforços em cateter nasal 2L/min. Saturação 94%, FR 20 irpm, PA 130x80 mmHg. Edema de MMII ++/4+. Solicitado ecocardiograma transtorácico para ajuste de diurético.',
  },
  {
    ATENDIMENTO: 849099,
    DOCUMENTO: 382,
    NOME_DOCUMENTO: 'EVOLUCAO MEDICA DIARIA',
    IDENTIFICADOR: 'EVOLUCAO',
    DATA_HORA_ISO: '2026-11-22 18:10:00',
    DATA_HORA: '2026-11-22T18:10:00',
    PRESTADOR: '12504',
    NOME_PRESTADOR: 'DR. RAFAEL COSTA NOGUEIRA (DEMO)',
    LEITO: 'ENF-109',
    UNIDADE: 'CLÍNICA CIRÚRGICA',
    SCORE: 64.2,
    CD_EMPRESA: 2,
    NOME_EMPRESA: 'HOSPITAL SANTA BEATRIZ (DEMO)',
    TEXTO_ATUAL:
      'Evolução vespertina: apresenta picos febris isolados (37.9°C). Realizada coleta de hemoculturas pareadas e escalonamento antimicrobiano conforme protocolo institucional. Paciente orientado e colaborativo.',
    TEXTO_ANTERIOR:
      'Evolução matinal: paciente sem queixas álgicas importantes, normotenso, afebril no período noturno. Mantido em observação clínica.',
  },
  {
    ATENDIMENTO: 849042,
    DOCUMENTO: 382,
    NOME_DOCUMENTO: 'EVOLUCAO MEDICA DIARIA',
    IDENTIFICADOR: 'EVOLUCAO',
    DATA_HORA_ISO: '2026-11-22 14:05:00',
    DATA_HORA: '2026-11-22T14:05:00',
    PRESTADOR: '13012',
    NOME_PRESTADOR: 'DRA. JULIANA ROCHA SILVEIRA (DEMO)',
    LEITO: 'PED-12',
    UNIDADE: 'ENFERMARIA PEDIÁTRICA',
    SCORE: 29.4,
    CD_EMPRESA: 3,
    NOME_EMPRESA: 'HOSPITAL MATERNO INFANTIL (DEMO)',
    TEXTO_ATUAL:
      'Criança hidratada, ativa e reativa ao exame físico, aceitando bem via oral e aleitamento complementar. Sibilância resolvida após ciclo de broncodilatador inalatório. Pais orientados quanto aos sinais de alarme para possível alta hospitalar.',
    TEXTO_ANTERIOR:
      'Admissão com esforço respiratório moderado, tiragem subcostal discreta e sibilos expiratórios difusos. Iniciado oxigenioterapia em cateter nasal e broncodilatador de resgate.',
  },
  {
    ATENDIMENTO: 848980,
    DOCUMENTO: 916,
    NOME_DOCUMENTO: 'EVOLUCAO PEDIATRICA ESTRUTURADA',
    IDENTIFICADOR: 'EVOLUCAO',
    DATA_HORA_ISO: '2026-11-23 10:00:00',
    DATA_HORA: '2026-11-23T10:00:00',
    PRESTADOR: '13012',
    NOME_PRESTADOR: 'DRA. JULIANA ROCHA SILVEIRA (DEMO)',
    LEITO: 'PED-05',
    UNIDADE: 'ENFERMARIA PEDIÁTRICA',
    SCORE: 88.1,
    CD_EMPRESA: 3,
    NOME_EMPRESA: 'HOSPITAL MATERNO INFANTIL (DEMO)',
    TEXTO_ATUAL:
      'Lactente corado, hidratado, acianótico, eupneico em ar ambiente. Ausculta pulmonar limpa. Mantém boa aceitação alimentar e peso estável.',
    TEXTO_ANTERIOR:
      'Lactente corado, hidratado, acianótico, eupneico em ar ambiente. Ausculta pulmonar com discretos roncos de transmissão. Boa aceitação alimentar.',
  },
];

function formatDateBr(date: Date): string {
  return date.toISOString();
}

function getBindValue(binds: Record<string, unknown> | unknown[] | undefined, key: string): string {
  if (!binds || Array.isArray(binds)) return '';
  const direct = binds[key] ?? binds[key.toUpperCase()] ?? binds[key.toLowerCase()];
  return direct !== undefined && direct !== null ? String(direct) : '';
}

function distributeByHospital(total: number, weights: number[], hospitals: HospitalMapping[]): Record<string, number> {
  const result: Record<string, number> = {};
  const active = hospitals.filter((h) => h.ativo !== false);
  const list = active.length > 0 ? active : DEFAULT_DEMO_HOSPITALS;
  let assigned = 0;
  list.forEach((h, idx) => {
    if (idx === list.length - 1) {
      result[h.sigla] = Math.max(0, total - assigned);
    } else {
      const w = weights[idx % weights.length] ?? 1 / list.length;
      const val = Math.round((total * w) / list.reduce((acc, _, i) => acc + (weights[i % weights.length] ?? 1 / list.length), 0));
      result[h.sigla] = val;
      assigned += val;
    }
  });
  return result;
}

function parseInIds(sql: string): number[] {
  const match = sql.match(/\bIN\s*\(\s*([0-9,\s]+)\s*\)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

/**
 * Executes a deterministic synthetic response matching the Oracle SQL query patterns used across Goverdoc Pro.
 */
export function executeDemoQuery(
  sql: string,
  binds?: Record<string, unknown> | unknown[],
  hospitalsInput?: HospitalMapping[]
): Record<string, unknown>[] {
  const upperSql = (sql || '').toUpperCase();
  const hospitals =
    hospitalsInput && hospitalsInput.length > 0 ? hospitalsInput : DEFAULT_DEMO_HOSPITALS;
  const activeHospitals = hospitals.filter((h) => h.ativo !== false);
  const effectiveHospitals = activeHospitals.length > 0 ? activeHospitals : DEFAULT_DEMO_HOSPITALS;
  const now = Date.now();

  // 1. Similarity Diff Modal Query (TEXTO_ATUAL / TEXTO_ANTERIOR)
  if (upperSql.includes('TEXTO_ATUAL') && upperSql.includes('TEXTO_ANTERIOR')) {
    const cdAtend = Number(getBindValue(binds, 'CD_ATENDIMENTO'));
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO'));
    const match =
      DEMO_SIMILARITY_RECORDS.find((r) => r.ATENDIMENTO === cdAtend && (!cdDoc || r.DOCUMENTO === cdDoc)) ||
      DEMO_SIMILARITY_RECORDS[0];

    return [
      {
        TEXTO_ATUAL: match.TEXTO_ATUAL,
        DATA_HORA_ATUAL: '23/11/2026 14:15:00',
        CD_DOCUMENTO_ATUAL: 991240,
        CD_REGISTRO_ATUAL: 551020,
        TEXTO_ANTERIOR: match.TEXTO_ANTERIOR,
        DATA_HORA_ANTERIOR: '22/11/2026 14:05:00',
        CD_DOCUMENTO_ANTERIOR: 990812,
        CD_REGISTRO_ANTERIOR: 550418,
      },
    ];
  }

  // 2. Similarity Audit Search Query
  if (upperSql.includes('GRAU_SIMILARIDADE') || upperSql.includes('TB_AUDITORIA_SIMILARIDADE')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO'));
    const cdEmp = Number(getBindValue(binds, 'CD_EMPRESA'));
    let filtered = DEMO_SIMILARITY_RECORDS;
    if (cdDoc) {
      const byDoc = filtered.filter((r) => r.DOCUMENTO === cdDoc);
      filtered = byDoc.length > 0 ? byDoc : filtered.slice(0, 4).map((r) => ({ ...r, DOCUMENTO: cdDoc }));
    }
    if (cdEmp) {
      filtered = filtered.filter((r) => r.CD_EMPRESA === cdEmp);
    }
    return filtered.map(({ TEXTO_ATUAL: _ta, TEXTO_ANTERIOR: _tp, ...row }) => row);
  }

  // 3. Lineage Graph Query 1: Action scripts reading external docs
  if (upperSql.includes('TARGET_DOC_ID') && upperSql.includes('SCRIPT_P1')) {
    const rows: Record<string, unknown>[] = [];
    DEMO_DOCS.forEach((doc) => {
      doc.actions.forEach((act) => {
        const f = doc.fields.find((item) => item.cdCampo === act.cdCampo);
        rows.push({
          TARGET_DOC_ID: doc.id,
          TARGET_DOC_NAME: doc.name,
          TARGET_VERSION: doc.version,
          TARGET_TP_VERSAO: 'PUBLISHED',
          TARGET_FIELD_ID: act.cdCampo,
          TARGET_METADATA_ID: act.cdMetadado,
          TARGET_FIELD_TAG: act.identificador,
          TARGET_FIELD_NAME: act.nomeCampo || f?.name || act.identificador,
          SCRIPT_P1: act.script,
          SCRIPT_P2: null,
          SCRIPT_P3: null,
        });
      });
    });
    return rows;
  }

  // 4. Lineage Graph Query 2: Involved Document Field Details (V3 or V2)
  if (upperSql.includes('DS_IDENTIFICADOR') && upperSql.includes('CD_CAMPO') && upperSql.includes('IN (')) {
    const requestedIds = new Set(parseInIds(sql));
    const isV2Only = upperSql.includes('DBAMV.EDITOR_DOCUMENTO') && !upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const rows: Record<string, unknown>[] = [];

    DEMO_DOCS.filter((d) => requestedIds.size === 0 || requestedIds.has(d.id)).forEach((d) => {
      if (isV2Only && !d.engines.includes('V2')) return;
      d.fields.forEach((f) => {
        rows.push({
          CD_DOCUMENTO: d.id,
          DS_DOCUMENTO: d.name,
          VL_VERSAO: d.version,
          TP_VERSAO: isV2Only ? 'PUBLICADO (V2)' : 'PUBLISHED',
          CD_CAMPO: f.cdCampo,
          CD_METADADO: f.cdMetadado,
          DS_IDENTIFICADOR: f.tag,
          DS_CAMPO: f.name,
        });
      });
    });
    return rows;
  }

  // 5. Lineage Graph Query 3: V2 Header fallback
  if (upperSql.includes('FROM DBAMV.EDITOR_DOCUMENTO') && upperSql.includes('IN (')) {
    const requestedIds = new Set(parseInIds(sql));
    return DEMO_DOCS.filter((d) => requestedIds.size === 0 || requestedIds.has(d.id)).map((d) => ({
      CD_DOCUMENTO: d.id,
      DS_DOCUMENTO: d.name,
    }));
  }

  // 6. Ambulatory Profile Details
  if (upperSql.includes('COD_PERFIL_MODULO') || upperSql.includes('CD_PERFIL_AMBULATORIAL = :CD_PERFIL')) {
    const cdPerfil = Number(getBindValue(binds, 'CD_PERFIL')) || 1;
    const docsSlice = DEMO_DOCS.slice(0, 4);
    return docsSlice.map((d, i) => ({
      COD_PERFIL_MODULO: 5000 + cdPerfil * 10 + i,
      MODULO: 'PEP_DOC_CLINICO',
      COD_PERFIL_MODULO_PAI: 5000,
      TITULO: d.name,
      AGRUPADOR: 'DOCUMENTOS CLÍNICOS',
      COD_MOD_PARAMETRO: 8000 + i,
      MODULO_PARAMETRO: 'PEP_DOC_CLINICO',
      PARAMETRO: 'CD_DOCUMENTO',
      COD_PERFIL_MOD_ORIGEM: 5000 + cdPerfil * 10 + i,
      VALOR_PARAMETRO: `${d.id} - ${d.name}`,
      DESC_VALOR_PARAMETRO: 'Documento clínico habilitado no perfil',
    }));
  }

  // 7. Ambulatory Profiles List
  if (upperSql.includes('COD_PERFIL') && upperSql.includes('NOME_PERFIL')) {
    return [
      { COD_PERFIL: 12, NOME_PERFIL: 'CLÍNICA MÉDICA - INTERNAÇÃO (DEMO)', COD_ESPECIALIDADE: 10, ESPECIALIDADE: 'CLÍNICA MÉDICA', SISTEMA: 'PEP', PORTA_ENTRADA: 'I', TIPO_ATENDIMENTO: 'I', COD_TIPO_PRESTADOR: 1, NOME_TIPO_PRESTADOR: 'MÉDICO', COD_SETOR: 101, NOME_SETOR: 'ENFERMARIA CLÍNICA', EMPRESA_FIXA: 1 },
      { COD_PERFIL: 18, NOME_PERFIL: 'UTI ADULTO - PLANTÃO MÉDICO (DEMO)', COD_ESPECIALIDADE: 22, ESPECIALIDADE: 'MEDICINA INTENSIVA', SISTEMA: 'PEP', PORTA_ENTRADA: 'I', TIPO_ATENDIMENTO: 'I', COD_TIPO_PRESTADOR: 1, NOME_TIPO_PRESTADOR: 'MÉDICO', COD_SETOR: 204, NOME_SETOR: 'UTI ADULTO A', EMPRESA_FIXA: 1 },
      { COD_PERFIL: 24, NOME_PERFIL: 'ENFERMAGEM ASSISTENCIAL (DEMO)', COD_ESPECIALIDADE: null, ESPECIALIDADE: 'MULTIDISCIPLINAR', SISTEMA: 'PEP', PORTA_ENTRADA: 'I', TIPO_ATENDIMENTO: 'I', COD_TIPO_PRESTADOR: 2, NOME_TIPO_PRESTADOR: 'ENFERMEIRO', COD_SETOR: 101, NOME_SETOR: 'ENFERMARIA CLÍNICA', EMPRESA_FIXA: null },
      { COD_PERFIL: 31, NOME_PERFIL: 'PRONTO SOCORRO ADULTO (DEMO)', COD_ESPECIALIDADE: 14, ESPECIALIDADE: 'EMERGÊNCIA', SISTEMA: 'PEP', PORTA_ENTRADA: 'U', TIPO_ATENDIMENTO: 'U', COD_TIPO_PRESTADOR: 1, NOME_TIPO_PRESTADOR: 'MÉDICO', COD_SETOR: 301, NOME_SETOR: 'PRONTO ATENDIMENTO', EMPRESA_FIXA: 4 },
      { COD_PERFIL: 45, NOME_PERFIL: 'PEDIATRIA HOSPITALAR (DEMO)', COD_ESPECIALIDADE: 35, ESPECIALIDADE: 'PEDIATRIA', SISTEMA: 'PEP', PORTA_ENTRADA: 'I', TIPO_ATENDIMENTO: 'I', COD_TIPO_PRESTADOR: 1, NOME_TIPO_PRESTADOR: 'MÉDICO', COD_SETOR: 402, NOME_SETOR: 'PEDIATRIA', EMPRESA_FIXA: 3 },
    ];
  }

  // 8. Document Profile Bindings (:CD_DOCUMENTO)
  if (upperSql.includes('DS_PERFIL_AMBULATORIAL')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 382;
    const empLabel = effectiveHospitals.map((h) => h.sigla).slice(0, 3).join(', ');
    return [
      { CD_DOCUMENTO: cdDoc, NM_TITULO: 'Documentos Clínicos > Evolução/Registro', DS_PERFIL_AMBULATORIAL: 'CLÍNICA MÉDICA - INTERNAÇÃO (DEMO)', EMPRESA: empLabel || 'TODAS' },
      { CD_DOCUMENTO: cdDoc, NM_TITULO: 'Prontuário > Terapia Intensiva', DS_PERFIL_AMBULATORIAL: 'UTI ADULTO - PLANTÃO MÉDICO (DEMO)', EMPRESA: effectiveHospitals[0]?.sigla || 'HCA' },
      { CD_DOCUMENTO: cdDoc, NM_TITULO: 'Urgência e Emergência', DS_PERFIL_AMBULATORIAL: 'PRONTO SOCORRO ADULTO (DEMO)', EMPRESA: effectiveHospitals[effectiveHospitals.length - 1]?.sigla || 'UPA' },
    ];
  }

  // 9. Document Metadata (Versions & Layouts)
  if (upperSql.includes('CODIGO_DOCUMENTO') && upperSql.includes('VALOR_VERSAO')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 382;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc) || DEMO_DOCS[0];
    return [
      {
        CODIGO_DOCUMENTO: doc.id,
        DESCRICAO_DOCUMENTO: doc.name,
        IDENTIFICADOR_DOCUMENTO: doc.identifier,
        CODIGO_VERSAO_DOCUMENTO: doc.id * 10 + doc.version,
        CODIGO_TIPO_LAYOUT: 1,
        IDENTIFICADOR_LAYOUT: 'CORPO_PRINCIPAL',
        DESCRICAO_TIPO_LAYOUT: 'Corpo Principal do Documento',
        VALOR_VERSAO: doc.version,
        STATUS_ATIVO: 1,
        CODIGO_TIPO_VERSAO: 3,
        DESCRICAO_TIPO_VERSAO: 'Publicado',
        CODIGO_LAYOUT_CABECALHO: 901,
        DOCUMENTO_CABECALHO: 50,
        CODIGO_LAYOUT_RODAPE: 902,
        QUANTIDADE_REGRAS: doc.rules.length,
        QUANTIDADE_CAMPOS: doc.fields.length || 4,
      },
      {
        CODIGO_DOCUMENTO: doc.id,
        DESCRICAO_DOCUMENTO: doc.name,
        IDENTIFICADOR_DOCUMENTO: doc.identifier,
        CODIGO_VERSAO_DOCUMENTO: doc.id * 10 + Math.max(1, doc.version - 1),
        CODIGO_TIPO_LAYOUT: 1,
        IDENTIFICADOR_LAYOUT: 'CORPO_PRINCIPAL',
        DESCRICAO_TIPO_LAYOUT: 'Versão Anterior (Histórico)',
        VALOR_VERSAO: Math.max(1, doc.version - 1),
        STATUS_ATIVO: 0,
        CODIGO_TIPO_VERSAO: 2,
        DESCRICAO_TIPO_VERSAO: 'Histórico',
        CODIGO_LAYOUT_CABECALHO: 901,
        DOCUMENTO_CABECALHO: 50,
        CODIGO_LAYOUT_RODAPE: 902,
        QUANTIDADE_REGRAS: Math.max(0, doc.rules.length - 1),
        QUANTIDADE_CAMPOS: Math.max(2, doc.fields.length - 1),
      },
    ];
  }

  // 10. Document Actions (SQL Queries on fields)
  if (upperSql.includes('CODIGO_ORIGEM') && upperSql.includes('SCRIPT_ACAO_COMPLETO')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 382;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc);
    if (!doc) return [];
    return doc.actions.map((a) => ({
      CODIGO_ORIGEM: doc.id,
      DESCRICAO_ORIGEM: doc.name,
      CODIGO_CAMPO: a.cdCampo,
      CODIGO_METADADO: a.cdMetadado,
      NOME_CAMPO: a.nomeCampo,
      DESCRICAO_REGRA: a.nomeCampo,
      IDENTIFICADOR_CAMPO: a.identificador,
      CODIGO_PROPRIEDADE: 4,
      GRUPO_DOCS_RELACIONADOS: a.targetGroup || null,
      DOCUMENTO_RELACIONADO: a.targetDocId ? String(a.targetDocId) : null,
      SCRIPT_ACAO_COMPLETO: a.script,
    }));
  }

  // 11. Document Rules
  if (upperSql.includes('TIPO_REGRA') && upperSql.includes('CAMPOS_AFETADOS')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 382;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc);
    if (!doc) return [];
    return doc.rules.map((r) => ({
      CD_DOCUMENTO: doc.id,
      DS_DOCUMENTO: doc.name,
      CD_VERSAO_DOCUMENTO: doc.id * 10 + doc.version,
      VL_VERSAO: doc.version,
      TP_VERSAO: 'PUBLISHED',
      SN_PUBLICADO: 1,
      CD_REGRA: r.cdRegra,
      NUM_ORDEM: r.numOrdem,
      DS_REGRA: r.dsRegra,
      ATIVA: r.ativa,
      TIPO_REGRA: r.tipoRegra,
      DS_ALERTA: r.dsAlerta,
      CONDICAO: r.condicao,
      QTD_CAMPOS: r.camposAfetados.split(',').filter(Boolean).length,
      CAMPOS_AFETADOS: r.camposAfetados,
      SCRIPT: r.script,
    }));
  }

  // 12. Document Fields
  if (upperSql.includes('DS_TIPO_VISUALIZACAO') && upperSql.includes('CD_CAMPO')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 382;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc);
    const fields = doc?.fields.length
      ? doc.fields
      : [
          { cdCampo: cdDoc * 100 + 1, cdMetadado: 9901, tag: 'CAMPO_DESCRICAO', name: 'Registro Clínico Principal', visualType: 'Editor Rico', rulesCount: 0 },
          { cdCampo: cdDoc * 100 + 2, cdMetadado: 9902, tag: 'DATA_AVALIACAO', name: 'Data/Hora da Avaliação', visualType: 'Data/Hora', rulesCount: 0 },
        ];
    const targetDoc = doc || { id: cdDoc, version: 1 };
    return fields.map((f) => ({
      CD_CAMPO: f.cdCampo,
      DS_IDENTIFICADOR: f.tag,
      DS_CAMPO: f.name,
      CD_METADADO: f.cdMetadado,
      SN_ATIVO: 1,
      CD_TIPO_VISUALIZACAO: 1,
      DS_TIPO_VISUALIZACAO: f.visualType,
      CD_LAYOUT: targetDoc.id * 10 + 1,
      CD_TIPO_LAYOUT: 1,
      DS_TIPO_LAYOUT: 'Corpo Principal',
      VL_VERSAO: targetDoc.version,
      TP_VERSAO: 'PUBLISHED',
      SN_PUBLICADO: 1,
      QTD_REGRAS: f.rulesCount,
    }));
  }

  // 13. Hospital KPIs (/api/hospitals/stats)
  if (upperSql.includes('TOTAL_DOCS') && upperSql.includes('DOCS_ATIVOS')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 1;
    const hIndex = Math.max(0, effectiveHospitals.findIndex((h) => h.id === hospId));
    const scale = [1.0, 0.78, 0.58, 0.42][hIndex % 4] ?? 0.5;
    return [
      {
        TOTAL_DOCS: Math.round(48200 * scale),
        DOCS_ATIVOS: 9 + (hIndex % 3),
        ULTIMO_REGISTRO: new Date(now - (hIndex + 1) * 14 * 60_000),
      },
    ];
  }

  // 14. Hospital Detail Table (/api/hospitals/stats)
  if (upperSql.includes('USO_UNIDADE')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 1;
    const hIndex = Math.max(0, effectiveHospitals.findIndex((h) => h.id === hospId));
    return DEMO_DOCS.filter((d) => !d.idle && d.engines.includes('V3'))
      .map((d) => {
        const w = d.weights[hIndex % d.weights.length] ?? 0.25;
        return {
          CD_DOCUMENTO: d.id,
          NOME: d.name,
          VERSAO: d.version,
          USO_UNIDADE: Math.round(d.total90d * w),
          ULTIMO_USO: new Date(now - (d.lastUsedHoursAgo + hIndex * 0.4) * 3600_000),
        };
      })
      .sort((a, b) => b.USO_UNIDADE - a.USO_UNIDADE);
  }

  // 15. Hospital Top 5 Chart (/api/hospitals/stats)
  if (upperSql.includes('AS USO') && upperSql.includes('ROWNUM <= 5')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 1;
    const hIndex = Math.max(0, effectiveHospitals.findIndex((h) => h.id === hospId));
    return DEMO_DOCS.filter((d) => !d.idle)
      .map((d) => ({
        NOME: d.name,
        USO: Math.round(d.total90d * (d.weights[hIndex % d.weights.length] ?? 0.25)),
      }))
      .sort((a, b) => b.USO - a.USO)
      .slice(0, 5);
  }

  // 16. SLA Assinatura (Dashboard & Hospital Quality)
  if (upperSql.includes('FAIXA_SLA')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 0;
    const factor = hospId ? Math.max(0.2, 1 / ((hospId % 4) + 1)) : 1;
    return [
      { FAIXA_SLA: 'Até 1 hora', TOTAL: Math.round(89420 * factor) },
      { FAIXA_SLA: '1 a 6 horas', TOTAL: Math.round(24150 * factor) },
      { FAIXA_SLA: '6 a 24 horas', TOTAL: Math.round(9840 * factor) },
      { FAIXA_SLA: 'Acima de 24 horas', TOTAL: Math.round(3120 * factor) },
      { FAIXA_SLA: 'Pendente de Assinatura', TOTAL: Math.round(1900 * factor) },
    ];
  }

  // 17. Shift Volume (volumeTurno)
  if (upperSql.includes('TURNO')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 1;
    const factor = 1 / ((hospId % 3) + 1);
    return [
      { TURNO: 'Manhã', TOTAL: Math.round(14200 * factor) },
      { TURNO: 'Tarde', TOTAL: Math.round(11850 * factor) },
      { TURNO: 'Noite', TOTAL: Math.round(7420 * factor) },
      { TURNO: 'Madrugada', TOTAL: Math.round(3190 * factor) },
    ];
  }

  // 18. Dashboard Top 10
  if (upperSql.includes('QTD_TOTAL') && upperSql.includes('ROWNUM <= 10')) {
    return DEMO_DOCS.filter((d) => !d.idle)
      .sort((a, b) => b.total90d - a.total90d)
      .slice(0, 10)
      .map((d) => ({
        CD_DOCUMENTO: d.id,
        DS_DOCUMENTO: d.name,
        QTD_TOTAL: d.total90d,
      }));
  }

  // 19. Dashboard Idle Docs
  if (upperSql.includes('STATUS_OCIOSIDADE')) {
    return DEMO_DOCS.filter((d) => d.idle).map((d) => ({
      CD_DOCUMENTO: d.id,
      DS_DOCUMENTO: d.name,
      STATUS_OCIOSIDADE: 'SEM USO NOS ÚLTIMOS 3 MESES',
    }));
  }

  // 20. Dashboard 3M Volume
  if (upperSql.includes('TOTAL_GERAL_PREENCHIDO')) {
    const sum = DEMO_DOCS.reduce((acc, d) => acc + d.total90d, 0);
    return [{ TOTAL_GERAL_PREENCHIDO: sum }];
  }

  // 21. Dashboard Unit Adherence
  if (upperSql.includes('QTD_TOTAL_PREENCHIDA')) {
    const total = DEMO_DOCS.reduce((acc, d) => acc + d.total90d, 0);
    const dist = distributeByHospital(total, [0.37, 0.28, 0.21, 0.14], effectiveHospitals);
    return effectiveHospitals
      .map((h) => ({
        CD_MULTI_EMPRESA: h.id,
        SIGLA_UNIDADE: h.sigla,
        QTD_TOTAL_PREENCHIDA: dist[h.sigla] ?? 0,
      }))
      .sort((a, b) => Number(b.QTD_TOTAL_PREENCHIDA) - Number(a.QTD_TOTAL_PREENCHIDA));
  }

  // 22. Dashboard Unit Inactivity
  if (upperSql.includes('DIAS_SEM_USO')) {
    return [
      { CD_DOCUMENTO: 916, DS_DOCUMENTO: 'EVOLUCAO PEDIATRICA ESTRUTURADA', SIGLA_UNIDADE: effectiveHospitals[3]?.sigla || 'UPA', ULTIMA_DATA_USO: new Date(now - 68 * 86400_000), DIAS_SEM_USO: 68 },
      { CD_DOCUMENTO: 410, DS_DOCUMENTO: 'BALANCO HIDRICO UTI', SIGLA_UNIDADE: effectiveHospitals[2]?.sigla || 'HMI', ULTIMA_DATA_USO: new Date(now - 45 * 86400_000), DIAS_SEM_USO: 45 },
      { CD_DOCUMENTO: 845, DS_DOCUMENTO: 'CHECKLIST DE CIRURGIA SEGURA OMS', SIGLA_UNIDADE: effectiveHospitals[3]?.sigla || 'UPA', ULTIMA_DATA_USO: new Date(now - 39 * 86400_000), DIAS_SEM_USO: 39 },
      { CD_DOCUMENTO: 710, DS_DOCUMENTO: 'SUMARIO DE TRANSFERENCIA INTERNA', SIGLA_UNIDADE: effectiveHospitals[1]?.sigla || 'HSB', ULTIMA_DATA_USO: new Date(now - 24 * 86400_000), DIAS_SEM_USO: 24 },
      { CD_DOCUMENTO: 580, DS_DOCUMENTO: 'PLANO TERAPEUTICO MULTIPROFISSIONAL', SIGLA_UNIDADE: effectiveHospitals[0]?.sigla || 'HCA', ULTIMA_DATA_USO: new Date(now - 14 * 86400_000), DIAS_SEM_USO: 14 },
    ];
  }

  // 23. Main Documents Catalog (activeQuery / activeQueryV3)
  if (upperSql.includes('NM_TITULO') && upperSql.includes('CD_DOCUMENTO')) {
    const isV3 = upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const docs = DEMO_DOCS.filter((d) => !d.idle && d.engines.includes(isV3 ? 'V3' : 'V2'));
    return docs.map((d) => {
      const hospCols = distributeByHospital(d.total90d, d.weights, effectiveHospitals);
      return {
        CÓDIGO: d.id,
        NOME: d.name,
        TOTAL: d.total90d,
        'ÚLTIMO USO': formatDateBr(new Date(now - d.lastUsedHoursAgo * 3600_000)),
        ...hospCols,
      };
    });
  }

  // 24. Dashboard & Generic KPI Counts
  if (upperSql.includes('SYSDATE - 1')) {
    return [{ TOTAL: 1428 }];
  }
  if (upperSql.includes("'ASSINADO'")) {
    return [{ TOTAL: 39840 }];
  }
  if (upperSql.includes('AS TOTAL') || upperSql.includes('COUNT(')) {
    const sum = DEMO_DOCS.reduce((acc, d) => acc + d.total90d, 0);
    return [{ TOTAL: sum }];
  }

  return [];
}
