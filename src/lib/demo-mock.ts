import type { DbConnection, DocMapping, HospitalMapping } from './storage';
import type { BiArtifact, BiCatalogDocOption } from '@/types/bi-dependencies.types';
import type { DocumentoFlexItem, DocumentoMigracao } from '@/types/migracao.types';

export const DEMO_CONNECTION_ID = 'demo-sandbox';

export const DEMO_CONNECTION: DbConnection = {
  id: DEMO_CONNECTION_ID,
  name: 'DEMONSTRAÇÃO (SANDBOX)',
  user: 'DEMO_SANDBOX',
  password: '',
  connectString: 'DEMO://SANDBOX.GOVERDOC.LOCAL/PEP_DEMO',
};

// 2 empresas 100% fictícias exclusivas do modo demonstração
export const DEFAULT_DEMO_HOSPITALS: HospitalMapping[] = [
  { id: 901, sigla: 'HVA', nome: 'HOSPITAL VALE DA AURORA (FICTÍCIO)', ativo: true },
  { id: 902, sigla: 'HSM', nome: 'HOSPITAL SERRA DO MAR (FICTÍCIO)', ativo: true },
];

export const DEMO_AUDIT_DOC_ID = '9001,9002,9008';
export const DEMO_REPORT_BASE_URL = 'https://sandbox.goverdoc.local/report?regId=';

export const DEMO_DOC_MAPPINGS: DocMapping[] = [
  {
    id: '9001',
    name: 'Ficha de Avaliação Clínica Geral Aurora (Demo)',
    fields: [{ id: 'REGISTRO_CLINICO', name: 'Registro Clínico Principal' }],
  },
  {
    id: '9002',
    name: 'Boletim de Acompanhamento Diário Integrado (Demo)',
    fields: [{ id: 'REGISTRO_CLINICO', name: 'Registro Clínico Principal' }],
  },
  {
    id: '9008',
    name: 'Guia de Transição Intersetorial Sandbox (Demo)',
    fields: [{ id: 'REGISTRO_CLINICO', name: 'Registro Clínico Principal' }],
  },
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
  weights: [number, number]; // HVA, HSM
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

// 10 documentos 100% fictícios (códigos 9001..9010)
const DEMO_DOCS: DemoDocDef[] = [
  {
    id: 9001,
    name: 'FICHA DE AVALIACAO CLINICA GERAL AURORA',
    identifier: 'SBX_AVAL_GERAL_9001',
    version: 7,
    engines: ['V3', 'V2'],
    total90d: 19450,
    lastUsedHoursAgo: 0.4,
    weights: [0.58, 0.42],
    fields: [
      { cdCampo: 900101, cdMetadado: 99011, tag: 'MOTIVO_ATENDIMENTO', name: 'Motivo Principal da Admissão', visualType: 'Caixa de Texto', rulesCount: 1 },
      { cdCampo: 900102, cdMetadado: 99012, tag: 'SENSIBILIDADE_MED', name: 'Alertas de Sensibilidade Declarada', visualType: 'Lista Seleção', rulesCount: 2 },
      { cdCampo: 900103, cdMetadado: 99013, tag: 'REGISTRO_CLINICO', name: 'Registro Clínico Principal', visualType: 'Editor Rico', rulesCount: 2 },
    ],
    rules: [
      {
        cdRegra: 91001,
        numOrdem: 1,
        dsRegra: 'SBX_REG_SENSIBILIDADE_OBRIGATORIA',
        ativa: 1,
        tipoRegra: 'REQUIRED',
        dsAlerta: 'Confirmar sinalização de sensibilidade medicamentosa antes do salvamento.',
        condicao: 'MOTIVO_ATENDIMENTO <> ""',
        camposAfetados: 'SENSIBILIDADE_MED',
        script: null,
      },
      {
        cdRegra: 91002,
        numOrdem: 2,
        dsRegra: 'SBX_REG_HABILITA_DETALHE_ALERGIA',
        ativa: 1,
        tipoRegra: 'ENABLE',
        dsAlerta: null,
        condicao: 'SENSIBILIDADE_MED = "POSITIVA"',
        camposAfetados: 'SENSIBILIDADE_MED, REGISTRO_CLINICO',
        script: null,
      },
      {
        cdRegra: 91003,
        numOrdem: 3,
        dsRegra: 'SBX_REG_VALIDA_FECHAMENTO_INICIAL',
        ativa: 1,
        tipoRegra: 'ON_CLOSE',
        dsAlerta: 'Preencha o motivo do atendimento e o registro clínico antes de assinar a ficha.',
        condicao: 'MOTIVO_ATENDIMENTO = "" OR REGISTRO_CLINICO = ""',
        camposAfetados: 'MOTIVO_ATENDIMENTO, REGISTRO_CLINICO',
        script: `SELECT CASE WHEN LENGTH(TRIM(:REGISTRO_CLINICO)) < 20 THEN 'INVÁLIDO' ELSE 'OK' END FROM DUAL`,
      },
    ],
    actions: [],
  },
  {
    id: 9002,
    name: 'BOLETIM DE ACOMPANHAMENTO DIARIO INTEGRADO',
    identifier: 'SBX_BOLETIM_DIARIO_9002',
    version: 9,
    engines: ['V3', 'V2'],
    total90d: 28640,
    lastUsedHoursAgo: 0.2,
    weights: [0.55, 0.45],
    fields: [
      { cdCampo: 900201, cdMetadado: 99021, tag: 'ALERTA_BASAL', name: 'Sensibilidades Herdadas (Aurora)', visualType: 'Caixa de Texto', rulesCount: 2 },
      { cdCampo: 900202, cdMetadado: 99022, tag: 'QUADRO_PARAMETROS', name: 'Parâmetros Vitais Recentes', visualType: 'Grade Dinâmica', rulesCount: 2 },
      { cdCampo: 900203, cdMetadado: 99023, tag: 'SALDO_HIDRICO_SBX', name: 'Balanço Hidroeletrolítico 24h', visualType: 'Numérico Calculado', rulesCount: 2 },
      { cdCampo: 900204, cdMetadado: 99024, tag: 'REGISTRO_CLINICO', name: 'Registro Clínico Principal', visualType: 'Editor Rico', rulesCount: 3 },
    ],
    rules: [
      {
        cdRegra: 91011,
        numOrdem: 1,
        dsRegra: 'SBX_REG_PREENCHE_ALERTA_HERDADO',
        ativa: 1,
        tipoRegra: 'ANSWER',
        dsAlerta: null,
        condicao: 'ALERTA_BASAL = ""',
        camposAfetados: 'ALERTA_BASAL',
        script: `SELECT LISTAGG(DS_SUBSTANCIA, ', ') WITHIN GROUP (ORDER BY DS_SUBSTANCIA) FROM DBAMV.SBX_SENSIBILIDADE_PAC WHERE CD_ATENDIMENTO = :CD_ATENDIMENTO`,
      },
      {
        cdRegra: 91012,
        numOrdem: 2,
        dsRegra: 'SBX_REG_PROTOCOLO_ESTABILIDADE',
        ativa: 1,
        tipoRegra: 'VALIDATE',
        dsAlerta: 'Parâmetros críticos detectados: revisar conduta diária e registrar plano assistencial.',
        condicao: 'QUADRO_PARAMETROS >= "38.5" OR SALDO_HIDRICO_SBX < "-500"',
        camposAfetados: 'QUADRO_PARAMETROS, SALDO_HIDRICO_SBX, REGISTRO_CLINICO',
        script: null,
      },
      {
        cdRegra: 91013,
        numOrdem: 3,
        dsRegra: 'SBX_REG_EXIBE_PAINEL_HIDRICO',
        ativa: 1,
        tipoRegra: 'VISIBLE',
        dsAlerta: null,
        condicao: 'SALDO_HIDRICO_SBX <> "0"',
        camposAfetados: 'SALDO_HIDRICO_SBX, ALERTA_BASAL',
        script: null,
      },
      {
        cdRegra: 91014,
        numOrdem: 4,
        dsRegra: 'SBX_REG_VALIDA_TEXTO_MINIMO',
        ativa: 1,
        tipoRegra: 'REQUIRED',
        dsAlerta: 'O boletim diário deve conter descrição clínica antes da assinatura.',
        condicao: 'REGISTRO_CLINICO = ""',
        camposAfetados: 'REGISTRO_CLINICO',
        script: null,
      },
    ],
    actions: [
      {
        cdCampo: 900201,
        cdMetadado: 99021,
        nomeCampo: 'Sensibilidades Herdadas (Aurora)',
        identificador: 'ALERTA_BASAL',
        targetDocId: 9001,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9001 AND EC.DS_IDENTIFICADOR = 'SENSIBILIDADE_MED' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 900202,
        cdMetadado: 99022,
        nomeCampo: 'Parâmetros Vitais Recentes',
        identificador: 'QUADRO_PARAMETROS',
        targetDocId: 9003,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9003 AND EC.DS_IDENTIFICADOR = 'PRESSAO_SISTOLICA' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 900203,
        cdMetadado: 99023,
        nomeCampo: 'Balanço Hidroeletrolítico 24h',
        identificador: 'SALDO_HIDRICO_SBX',
        targetDocId: 9004,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9004 AND EC.DS_IDENTIFICADOR = 'SALDO_FINAL_24H' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
    ],
  },
  {
    id: 9003,
    name: 'MAPA DE MONITORAMENTO DE PARAMETROS VITAIS',
    identifier: 'SBX_PARAM_VITAIS_9003',
    version: 5,
    engines: ['V3', 'V2'],
    total90d: 17280,
    lastUsedHoursAgo: 0.3,
    weights: [0.52, 0.48],
    fields: [
      { cdCampo: 900301, cdMetadado: 99031, tag: 'PRESSAO_SISTOLICA', name: 'Pressão Arterial Sistólica (mmHg)', visualType: 'Numérico', rulesCount: 2 },
      { cdCampo: 900302, cdMetadado: 99032, tag: 'SATURACAO_PERIF', name: 'Oximetria Periférica (%)', visualType: 'Numérico', rulesCount: 2 },
      { cdCampo: 900303, cdMetadado: 99033, tag: 'INDICE_ALERTA_SBX', name: 'Índice de Alerta Precoce Sandbox', visualType: 'Numérico Calculado', rulesCount: 2 },
    ],
    rules: [
      {
        cdRegra: 91021,
        numOrdem: 1,
        dsRegra: 'SBX_REG_INDICE_ALERTA',
        ativa: 1,
        tipoRegra: 'RUN',
        dsAlerta: 'Índice elevado: acionar avaliação clínica prioritária.',
        condicao: 'PRESSAO_SISTOLICA < "90" OR SATURACAO_PERIF < "92"',
        camposAfetados: 'INDICE_ALERTA_SBX',
        script: `SELECT CASE WHEN :PRESSAO_SISTOLICA < 90 THEN 3 WHEN :SATURACAO_PERIF < 92 THEN 2 ELSE 0 END AS ESCORE FROM DUAL`,
      },
      {
        cdRegra: 91022,
        numOrdem: 2,
        dsRegra: 'SBX_REG_FAIXA_SATURACAO',
        ativa: 1,
        tipoRegra: 'VALIDATE',
        dsAlerta: 'Oximetria deve estar entre 40% e 100%.',
        condicao: 'SATURACAO_PERIF < "40" OR SATURACAO_PERIF > "100"',
        camposAfetados: 'PRESSAO_SISTOLICA, SATURACAO_PERIF',
        script: null,
      },
    ],
    actions: [],
  },
  {
    id: 9004,
    name: 'CONTROLE DE EQUILIBRIO HIDROELETROLITICO',
    identifier: 'SBX_EQUIL_HIDRO_9004',
    version: 4,
    engines: ['V3', 'V2'],
    total90d: 7920,
    lastUsedHoursAgo: 1.3,
    weights: [0.64, 0.36],
    fields: [
      { cdCampo: 900401, cdMetadado: 99041, tag: 'ENTRADA_VOL_ML', name: 'Aporte Hídrico Total (mL)', visualType: 'Numérico', rulesCount: 1 },
      { cdCampo: 900402, cdMetadado: 99042, tag: 'ELIMINACAO_VOL_ML', name: 'Eliminação Total (mL)', visualType: 'Numérico', rulesCount: 1 },
      { cdCampo: 900403, cdMetadado: 99043, tag: 'SALDO_FINAL_24H', name: 'Saldo Hídrico Consolidado (mL)', visualType: 'Numérico Calculado', rulesCount: 2 },
    ],
    rules: [
      {
        cdRegra: 91031,
        numOrdem: 1,
        dsRegra: 'SBX_REG_CALC_SALDO_24H',
        ativa: 1,
        tipoRegra: 'ANSWER',
        dsAlerta: null,
        condicao: 'ENTRADA_VOL_ML >= "0" AND ELIMINACAO_VOL_ML >= "0"',
        camposAfetados: 'SALDO_FINAL_24H',
        script: `SELECT NVL(:ENTRADA_VOL_ML, 0) - NVL(:ELIMINACAO_VOL_ML, 0) FROM DUAL`,
      },
      {
        cdRegra: 91032,
        numOrdem: 2,
        dsRegra: 'SBX_REG_DESABILITA_SALDO_MANUAL',
        ativa: 1,
        tipoRegra: 'DISABLE',
        dsAlerta: null,
        condicao: 'ENTRADA_VOL_ML >= "0" OR ELIMINACAO_VOL_ML >= "0"',
        camposAfetados: 'ENTRADA_VOL_ML, ELIMINACAO_VOL_ML, SALDO_FINAL_24H',
        script: null,
      },
    ],
    actions: [],
  },
  {
    id: 9005,
    name: 'SUMARIO DE DESFECHO E ORIENTACAO DOMICILIAR',
    identifier: 'SBX_DESFECHO_9005',
    version: 6,
    engines: ['V3'],
    total90d: 14120,
    lastUsedHoursAgo: 0.7,
    weights: [0.54, 0.46],
    fields: [
      { cdCampo: 900501, cdMetadado: 99051, tag: 'RESUMO_ADMISSAO', name: 'Resumo da Avaliação Inicial', visualType: 'Editor Rico', rulesCount: 1 },
      { cdCampo: 900502, cdMetadado: 99052, tag: 'SINTESE_ACOMP', name: 'Síntese do Acompanhamento Diário', visualType: 'Editor Rico', rulesCount: 1 },
      { cdCampo: 900503, cdMetadado: 99053, tag: 'ACHADOS_DIAG', name: 'Síntese de Exames Relevantes', visualType: 'Caixa de Texto', rulesCount: 1 },
      { cdCampo: 900504, cdMetadado: 99054, tag: 'ORIENTACAO_SAIDA', name: 'Orientações Domiciliares', visualType: 'Editor Rico', rulesCount: 2 },
    ],
    rules: [
      {
        cdRegra: 91041,
        numOrdem: 1,
        dsRegra: 'SBX_REG_ORIENTACAO_SAIDA',
        ativa: 1,
        tipoRegra: 'REQUIRED',
        dsAlerta: 'Preencha as orientações domiciliares antes de encerrar o sumário.',
        condicao: 'ORIENTACAO_SAIDA = ""',
        camposAfetados: 'ORIENTACAO_SAIDA',
        script: null,
      },
      {
        cdRegra: 91042,
        numOrdem: 2,
        dsRegra: 'SBX_REG_INTEGRA_DESFECHO_ALTA',
        ativa: 1,
        tipoRegra: 'ON_SAVE',
        dsAlerta: 'Auditoria automática de completude dos blocos clínicos ao salvar.',
        condicao: 'SINTESE_ACOMP <> ""',
        camposAfetados: 'RESUMO_ADMISSAO, SINTESE_ACOMP, ACHADOS_DIAG, ORIENTACAO_SAIDA',
        script: `SELECT 1 FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9001 AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')`,
      },
    ],
    actions: [
      {
        cdCampo: 900501,
        cdMetadado: 99051,
        nomeCampo: 'Resumo da Avaliação Inicial',
        identificador: 'RESUMO_ADMISSAO',
        targetDocId: 9001,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9001 AND EC.DS_IDENTIFICADOR = 'MOTIVO_ATENDIMENTO' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 900502,
        cdMetadado: 99052,
        nomeCampo: 'Síntese do Acompanhamento Diário',
        identificador: 'SINTESE_ACOMP',
        targetDocId: 9002,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9002 AND EC.DS_IDENTIFICADOR = 'REGISTRO_CLINICO' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 900503,
        cdMetadado: 99053,
        nomeCampo: 'Síntese de Exames Relevantes',
        identificador: 'ACHADOS_DIAG',
        targetDocId: 9006,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9006 AND EC.DS_IDENTIFICADOR = 'LAUDO_CHAVE' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
      {
        cdCampo: 900504,
        cdMetadado: 99054,
        nomeCampo: 'Orientações Domiciliares',
        identificador: 'ORIENTACAO_SAIDA',
        targetDocId: 9007,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9007 AND EC.DS_IDENTIFICADOR = 'META_REABILITACAO' ORDER BY PDC.DH_FECHAMENTO DESC`,
      },
    ],
  },
  {
    id: 9006,
    name: 'PAINEL DE RESULTADOS DIAGNOSTICOS INTERNOS',
    identifier: 'SBX_DIAG_INTERNO_9006',
    version: 3,
    engines: ['V3'],
    total90d: 9640,
    lastUsedHoursAgo: 1.9,
    weights: [0.51, 0.49],
    fields: [
      { cdCampo: 900601, cdMetadado: 99061, tag: 'LAUDO_CHAVE', name: 'Achados Laboratoriais e Imagem', visualType: 'Caixa de Texto', rulesCount: 2 },
      { cdCampo: 900602, cdMetadado: 99062, tag: 'VIT_CONTEXTO', name: 'Contexto Basal Associado', visualType: 'Texto', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 91051,
        numOrdem: 1,
        dsRegra: 'SBX_REG_SINALIZA_LAUDO_CRITICO',
        ativa: 1,
        tipoRegra: 'VALIDATE',
        dsAlerta: 'Achado crítico identificado: validar protocolo de comunicação em até 30 minutos.',
        condicao: 'LAUDO_CHAVE = "CRITICO"',
        camposAfetados: 'LAUDO_CHAVE',
        script: null,
      },
      {
        cdRegra: 91052,
        numOrdem: 2,
        dsRegra: 'SBX_REG_CARREGA_CONTEXTO_BASAL',
        ativa: 1,
        tipoRegra: 'VISIBLE',
        dsAlerta: null,
        condicao: 'VIT_CONTEXTO <> ""',
        camposAfetados: 'LAUDO_CHAVE, VIT_CONTEXTO',
        script: null,
      },
    ],
    actions: [
      {
        cdCampo: 900602,
        cdMetadado: 99062,
        nomeCampo: 'Contexto Basal Associado',
        identificador: 'VIT_CONTEXTO',
        targetDocId: 9003,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PEC.CD_DOCUMENTO = 9003`,
      },
    ],
  },
  {
    id: 9007,
    name: 'ROTEIRO MULTIPROFISSIONAL DE REABILITACAO',
    identifier: 'SBX_REAB_MULTI_9007',
    version: 4,
    engines: ['V3'],
    total90d: 6810,
    lastUsedHoursAgo: 2.8,
    weights: [0.6, 0.4],
    fields: [
      { cdCampo: 900701, cdMetadado: 99071, tag: 'META_REABILITACAO', name: 'Metas Assistenciais Semanais', visualType: 'Editor Rico', rulesCount: 2 },
      { cdCampo: 900702, cdMetadado: 99072, tag: 'FATOR_BASAL', name: 'Fatores Iniciais de Admissão', visualType: 'Texto', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 91061,
        numOrdem: 1,
        dsRegra: 'SBX_REG_META_OBRIGATORIA_REAB',
        ativa: 1,
        tipoRegra: 'REQUIRED',
        dsAlerta: 'Defina pelo menos uma meta funcional antes do fechamento.',
        condicao: 'META_REABILITACAO = ""',
        camposAfetados: 'META_REABILITACAO',
        script: null,
      },
      {
        cdRegra: 91062,
        numOrdem: 2,
        dsRegra: 'SBX_REG_HABILITA_ROTEIRO_BASAL',
        ativa: 1,
        tipoRegra: 'ENABLE',
        dsAlerta: null,
        condicao: 'FATOR_BASAL <> ""',
        camposAfetados: 'META_REABILITACAO, FATOR_BASAL',
        script: null,
      },
    ],
    actions: [
      {
        cdCampo: 900702,
        cdMetadado: 99072,
        nomeCampo: 'Fatores Iniciais de Admissão',
        identificador: 'FATOR_BASAL',
        targetDocId: 9001,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PEC.CD_DOCUMENTO = 9001`,
      },
    ],
  },
  {
    id: 9008,
    name: 'GUIA DE TRANSICAO INTERSETORIAL SANDBOX',
    identifier: 'SBX_TRANSICAO_9008',
    version: 3,
    engines: ['V3', 'V2'],
    total90d: 4980,
    lastUsedHoursAgo: 4.1,
    weights: [0.47, 0.53],
    fields: [
      { cdCampo: 900801, cdMetadado: 99081, tag: 'REGISTRO_CLINICO', name: 'Síntese Pré-Movimentação', visualType: 'Editor Rico', rulesCount: 2 },
      { cdCampo: 900802, cdMetadado: 99082, tag: 'VIT_SAIDA', name: 'Parâmetros Vitais na Saída', visualType: 'Grade Dinâmica', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 91071,
        numOrdem: 1,
        dsRegra: 'SBX_REG_CHECK_TRANSICAO_SEGURA',
        ativa: 1,
        tipoRegra: 'ON_CLOSE',
        dsAlerta: 'Exige síntese clínica e sinais vitais da última 1h para liberar transferência.',
        condicao: 'REGISTRO_CLINICO = "" OR VIT_SAIDA = ""',
        camposAfetados: 'REGISTRO_CLINICO, VIT_SAIDA',
        script: null,
      },
      {
        cdRegra: 91072,
        numOrdem: 2,
        dsRegra: 'SBX_REG_HERDA_RESUMO_MOVIMENTACAO',
        ativa: 1,
        tipoRegra: 'ANSWER',
        dsAlerta: null,
        condicao: 'REGISTRO_CLINICO = ""',
        camposAfetados: 'REGISTRO_CLINICO',
        script: `SELECT DBMS_LOB.SUBSTR(LO_VALOR, 4000, 1) FROM DBAMV.EDITOR_REGISTRO_CAMPO WHERE CD_CAMPO = 900204`,
      },
      {
        cdRegra: 91073,
        numOrdem: 3,
        dsRegra: 'SBX_REG_EXIGE_CHECKLIST_V2',
        ativa: 1,
        tipoRegra: 'VALIDATE',
        dsAlerta: 'Exige confirmação do protocolo pré-procedimento (Doc V2 9009) antes da movimentação.',
        condicao: 'VIT_SAIDA <> ""',
        camposAfetados: 'VIT_SAIDA',
        script: `SELECT 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO JOIN DBAMV.EDITOR_REGISTRO_CAMPO ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO JOIN DBAMV.EDITOR_CAMPO EC ON EC.CD_CAMPO = ERC.CD_CAMPO WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO AND PEC.CD_DOCUMENTO = 9009 AND EC.DS_IDENTIFICADOR = 'CONFERENCIA_SEGURA' AND DBMS_LOB.SUBSTR(ERC.LO_VALOR, 10, 1) = 'S')`,
      },
    ],
    actions: [
      {
        cdCampo: 900801,
        cdMetadado: 99081,
        nomeCampo: 'Síntese Pré-Movimentação',
        identificador: 'REGISTRO_CLINICO',
        targetDocId: 9002,
        script: `SELECT DBMS_LOB.SUBSTR(ERC.LO_VALOR, 4000, 1) FROM DBAMV.PW_DOCUMENTO_CLINICO PDC JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO WHERE PEC.CD_DOCUMENTO IN (9002, 9003)`,
      },
    ],
  },
  {
    id: 9009,
    name: 'PROTOCOLO DE VERIFICACAO PRE-PROCEDIMENTO',
    identifier: 'SBX_PRE_PROC_V2_9009',
    version: 2,
    engines: ['V2'],
    total90d: 3540,
    lastUsedHoursAgo: 7.5,
    weights: [0.53, 0.47],
    fields: [
      { cdCampo: 900901, cdMetadado: 99091, tag: 'CONFERENCIA_SEGURA', name: 'Checklist Pré-Procedimento Confirmado', visualType: 'CheckBox', rulesCount: 1 },
    ],
    rules: [
      {
        cdRegra: 91081,
        numOrdem: 1,
        dsRegra: 'SBX_REG_TRAVA_PRE_PROCEDIMENTO',
        ativa: 1,
        tipoRegra: 'VALIDATE',
        dsAlerta: 'A conferência segura deve estar marcada antes do encaminhamento.',
        condicao: 'CONFERENCIA_SEGURA <> "S"',
        camposAfetados: 'CONFERENCIA_SEGURA',
        script: null,
      },
    ],
    actions: [],
  },
  {
    id: 9010,
    name: 'FORMULARIO HISTORICO INATIVO SANDBOX',
    identifier: 'SBX_INATIVO_9010',
    version: 1,
    engines: ['V3', 'V2'],
    total90d: 0,
    lastUsedHoursAgo: 2950,
    idle: true,
    weights: [0.5, 0.5],
    fields: [],
    rules: [],
    actions: [],
  },
];

export const DEMO_SIMILARITY_RECORDS = [
  {
    ATENDIMENTO: 770412,
    DOCUMENTO: 9002,
    NOME_DOCUMENTO: 'BOLETIM DE ACOMPANHAMENTO DIARIO INTEGRADO',
    IDENTIFICADOR: 'REGISTRO_CLINICO',
    DATA_HORA_ISO: '2026-11-23 14:20:00',
    DATA_HORA: '2026-11-23T14:20:00',
    PRESTADOR: '90011',
    NOME_PRESTADOR: 'DR. ARTHUR SILVEIRA QUEIROZ (FICTÍCIO)',
    LEITO: 'ALA-A-104',
    UNIDADE: 'TERAPIA INTENSIVA VALE DA AURORA',
    SCORE: 96.8,
    CD_EMPRESA: 901,
    NOME_EMPRESA: 'HOSPITAL VALE DA AURORA (FICTÍCIO)',
    TEXTO_ATUAL:
      'Paciente vígil, comunicativo e afebril nas últimas 24h. Parâmetros hemodinâmicos estáveis em ar ambiente, boa perfusão periférica e aceitação alimentar plena. Conduta: manter reabilitação motora assistida e reavaliar critérios de transição para enfermaria.',
    TEXTO_ANTERIOR:
      'Paciente vígil, comunicativo e afebril nas últimas 24h. Parâmetros hemodinâmicos estáveis em ar ambiente, boa perfusão periférica e aceitação alimentar satisfatória. Conduta: manter reabilitação motora assistida e reavaliar critérios de transição.',
  },
  {
    ATENDIMENTO: 770398,
    DOCUMENTO: 9002,
    NOME_DOCUMENTO: 'BOLETIM DE ACOMPANHAMENTO DIARIO INTEGRADO',
    IDENTIFICADOR: 'REGISTRO_CLINICO',
    DATA_HORA_ISO: '2026-11-23 11:05:00',
    DATA_HORA: '2026-11-23T11:05:00',
    PRESTADOR: '90011',
    NOME_PRESTADOR: 'DR. ARTHUR SILVEIRA QUEIROZ (FICTÍCIO)',
    LEITO: 'ALA-A-109',
    UNIDADE: 'TERAPIA INTENSIVA VALE DA AURORA',
    SCORE: 91.2,
    CD_EMPRESA: 901,
    NOME_EMPRESA: 'HOSPITAL VALE DA AURORA (FICTÍCIO)',
    TEXTO_ATUAL:
      'Pós-operatório D2 sem intercorrências clínicas. Curativo limpo e seco, dor controlada com analgesia simples, diurese espontânea preservada.',
    TEXTO_ANTERIOR:
      'Pós-operatório D1 sem intercorrências clínicas. Curativo limpo e seco, dor controlada com analgesia simples, diurese espontânea adequada.',
  },
  {
    ATENDIMENTO: 770355,
    DOCUMENTO: 9002,
    NOME_DOCUMENTO: 'BOLETIM DE ACOMPANHAMENTO DIARIO INTEGRADO',
    IDENTIFICADOR: 'REGISTRO_CLINICO',
    DATA_HORA_ISO: '2026-11-23 08:45:00',
    DATA_HORA: '2026-11-23T08:45:00',
    PRESTADOR: '90024',
    NOME_PRESTADOR: 'DRA. BEATRIZ NOGUEIRA VASCONCELOS (FICTÍCIO)',
    LEITO: 'SERRA-208',
    UNIDADE: 'INTERNAÇÃO CLÍNICA SERRA DO MAR',
    SCORE: 82.4,
    CD_EMPRESA: 902,
    NOME_EMPRESA: 'HOSPITAL SERRA DO MAR (FICTÍCIO)',
    TEXTO_ATUAL:
      'Apresenta redução expressiva da dispneia após ajuste terapêutico. Saturação periférica 97% em ar ambiente. Programação de exame complementar para revisão ambulatorial.',
    TEXTO_ANTERIOR:
      'Refere dispneia leve aos médios esforços em suporte nasal de baixo fluxo. Saturação periférica 94%. Solicitado exame complementar de controle.',
  },
  {
    ATENDIMENTO: 770301,
    DOCUMENTO: 9001,
    NOME_DOCUMENTO: 'FICHA DE AVALIACAO CLINICA GERAL AURORA',
    IDENTIFICADOR: 'REGISTRO_CLINICO',
    DATA_HORA_ISO: '2026-11-22 17:30:00',
    DATA_HORA: '2026-11-22T17:30:00',
    PRESTADOR: '90037',
    NOME_PRESTADOR: 'DR. HENRIQUE MONTEIRO TAVARES (FICTÍCIO)',
    LEITO: 'SERRA-112',
    UNIDADE: 'PRONTO ATENDIMENTO SERRA DO MAR',
    SCORE: 38.5,
    CD_EMPRESA: 902,
    NOME_EMPRESA: 'HOSPITAL SERRA DO MAR (FICTÍCIO)',
    TEXTO_ATUAL:
      'Reavaliação após hidratação venosa e controle sintomático: paciente normotenso, sem dor abdominal à palpação profunda e liberado com plano de acompanhamento.',
    TEXTO_ANTERIOR:
      'Admissão com quadro agudo de desconforto abdominal difuso e náuseas há 12 horas. Iniciada hidratação e investigação diagnóstica.',
  },
];

// Estado em memória isolado para Migração V2 -> V3 no modo Sandbox
export const DEMO_MIGRATION_DEMANDS: DocumentoMigracao[] = [
  {
    id: 'demo-mig-1',
    documento_flex_id: '9001',
    documento_html5_id: '9001',
    status: 'EM_PRODUCAO',
    complexidade: 'MEDIA',
    responsavel: 'Equipe Sandbox Alfa',
    responsavel_dev: 'Analista Demo Alfa',
    responsavel_perfil: 'Coordenação PEP Demo',
    lecom: 'SBX-101',
    codigo_objeto: '401',
    tipo_documento: 'Avaliação Inicial',
    campos_relacionados: 'MOTIVO_ATENDIMENTO, SENSIBILIDADE_MED',
    regras_negocio: 'SBX_REG_SENSIBILIDADE_OBRIGATORIA',
    observacoes: 'Documento fictício migrado integralmente para o Editor HTML5.',
    checklist: [],
    data_inicio: '2026-10-05',
    data_conclusao_prevista: '2026-10-25',
    data_conclusao_efetiva: '2026-10-24',
    created_at: '2026-10-05T10:00:00.000Z',
    updated_at: '2026-10-24T15:00:00.000Z',
  },
  {
    id: 'demo-mig-2',
    documento_flex_id: '9002',
    documento_html5_id: '9002',
    status: 'HOMOLOGACAO',
    complexidade: 'ALTA',
    responsavel: 'Equipe Sandbox Beta',
    responsavel_dev: 'Analista Demo Beta',
    responsavel_perfil: 'Coordenação PEP Demo',
    lecom: 'SBX-102',
    codigo_objeto: '402',
    tipo_documento: 'Boletim Diário',
    campos_relacionados: 'ALERTA_BASAL, QUADRO_PARAMETROS, SALDO_HIDRICO_SBX',
    regras_negocio: 'SBX_REG_PROTOCOLO_ESTABILIDADE',
    observacoes: 'Em validação funcional nas unidades fictícias HVA e HSM.',
    checklist: [],
    data_inicio: '2026-11-02',
    data_conclusao_prevista: '2026-11-28',
    data_conclusao_efetiva: null,
    created_at: '2026-11-02T09:30:00.000Z',
    updated_at: '2026-11-20T14:15:00.000Z',
  },
  {
    id: 'demo-mig-3',
    documento_flex_id: '9009',
    documento_html5_id: null,
    status: 'DESENVOLVIMENTO',
    complexidade: 'BAIXA',
    responsavel: 'Equipe Sandbox Alfa',
    responsavel_dev: 'Analista Demo Alfa',
    responsavel_perfil: null,
    lecom: 'SBX-103',
    codigo_objeto: '409',
    tipo_documento: 'Checklist',
    campos_relacionados: 'CONFERENCIA_SEGURA',
    regras_negocio: 'Validação de etapa pré-procedimento',
    observacoes: 'Conversão em andamento do layout legado Flex.',
    checklist: [],
    data_inicio: '2026-11-12',
    data_conclusao_prevista: '2026-12-05',
    data_conclusao_efetiva: null,
    created_at: '2026-11-12T11:00:00.000Z',
    updated_at: '2026-11-21T16:40:00.000Z',
  },
  {
    id: 'demo-mig-4',
    documento_flex_id: '9008',
    documento_html5_id: '9008',
    status: 'PENDENTES',
    complexidade: 'MEDIA',
    responsavel: 'Equipe Sandbox Beta',
    responsavel_dev: null,
    responsavel_perfil: 'Coordenação PEP Demo',
    lecom: 'SBX-104',
    codigo_objeto: '408',
    tipo_documento: 'Transição de Cuidado',
    campos_relacionados: 'REGISTRO_CLINICO, VIT_SAIDA',
    regras_negocio: null,
    observacoes: 'Aguardando janela de implantação assistencial.',
    checklist: [],
    data_inicio: null,
    data_conclusao_prevista: '2026-12-15',
    data_conclusao_efetiva: null,
    created_at: '2026-11-18T13:20:00.000Z',
    updated_at: '2026-11-18T13:20:00.000Z',
  },
];

// Estado em memória isolado para Dependências BI no modo Sandbox
export const DEMO_BI_ARTIFACTS: BiArtifact[] = [
  {
    id: 'demo-bi-1',
    nome: 'Painel Sandbox de Adesão aos Boletins Diários',
    descricao: 'Dashboard fictício para demonstrar o rastreamento entre campos do PEP e indicadores executivos.',
    tipo: 'PAINEL_BI',
    ferramenta: 'Power BI',
    responsavel: 'Núcleo Analítico Sandbox',
    area: 'Inteligência Assistencial (Demo)',
    url: 'https://sandbox.goverdoc.local/bi/boletins-diarios',
    criticidade: 'ALTA',
    unidades: ['HVA', 'HSM'],
    documentosVinculados: [
      {
        docId: '9002',
        docName: 'BOLETIM DE ACOMPANHAMENTO DIARIO INTEGRADO',
        motor: 'V3',
        fields: ['REGISTRO_CLINICO', 'QUADRO_PARAMETROS'],
        observacao: 'Mapeamento demonstrativo entre boletim diário e painel gerencial.',
      },
    ],
    criadoEm: '2026-11-01T10:00:00.000Z',
    atualizadoEm: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'demo-bi-2',
    nome: 'Indicador Fictício de Desfecho & Giro Hospitalar',
    descricao: 'Indicador demonstrativo que consolida orientações domiciliares e metas multiprofissionais.',
    tipo: 'INDICADOR',
    ferramenta: 'Qlik',
    responsavel: 'Escritório de Qualidade Sandbox',
    area: 'Governança Clínica (Demo)',
    url: 'https://sandbox.goverdoc.local/bi/desfecho-giro',
    criticidade: 'ALTA',
    unidades: ['HVA'],
    documentosVinculados: [
      {
        docId: '9005',
        docName: 'SUMARIO DE DESFECHO E ORIENTACAO DOMICILIAR',
        motor: 'V3',
        fields: ['ORIENTACAO_SAIDA', 'SINTESE_ACOMP'],
        observacao: 'KPI fictício vinculado ao sumário de desfecho.',
      },
      {
        docId: '9007',
        docName: 'ROTEIRO MULTIPROFISSIONAL DE REABILITACAO',
        motor: 'V3',
        fields: ['META_REABILITACAO'],
        observacao: 'Cruzamento de metas atingidas na reabilitação.',
      },
    ],
    criadoEm: '2026-11-04T14:20:00.000Z',
    atualizadoEm: '2026-11-04T14:20:00.000Z',
  },
  {
    id: 'demo-bi-3',
    nome: 'Relatório Demonstrativo de Rastreio Inicial',
    descricao: 'Relatório fictício para auditoria de preenchimento de sensibilidades medicamentosas na admissão.',
    tipo: 'RELATORIO',
    ferramenta: 'MV',
    responsavel: 'Segurança do Paciente Sandbox',
    area: 'Operações Assistenciais (Demo)',
    url: '',
    criticidade: 'MEDIA',
    unidades: ['HSM'],
    documentosVinculados: [
      {
        docId: '9001',
        docName: 'FICHA DE AVALIACAO CLINICA GERAL AURORA',
        motor: 'V3',
        fields: ['SENSIBILIDADE_MED'],
        observacao: 'Monitoramento simulado de alertas iniciais.',
      },
    ],
    criadoEm: '2026-11-08T09:00:00.000Z',
    atualizadoEm: '2026-11-08T09:00:00.000Z',
  },
];

export function getDemoMigrationCatalog(): {
  docsFlexTotal: DocumentoFlexItem[];
  docsHtml5Total: DocumentoFlexItem[];
} {
  const now = Date.now();
  const docsFlexTotal: DocumentoFlexItem[] = DEMO_DOCS.filter((d) => d.engines.includes('V2')).map((d) => ({
    id: String(d.id),
    cd_documento_mv: d.id,
    nome: d.name,
    tecnologia: 'FLEX',
    total_usos: d.total90d,
    ultimo_uso: new Date(now - d.lastUsedHoursAgo * 3600_000).toISOString(),
  }));

  const docsHtml5Total: DocumentoFlexItem[] = DEMO_DOCS.filter((d) => d.engines.includes('V3')).map((d) => ({
    id: String(d.id),
    cd_documento_mv: d.id,
    nome: d.name,
    tecnologia: 'HTML5',
    total_usos: d.total90d,
    ultimo_uso: new Date(now - d.lastUsedHoursAgo * 3600_000).toISOString(),
  }));

  return { docsFlexTotal, docsHtml5Total };
}

export function getDemoBiCatalogDocs(): BiCatalogDocOption[] {
  return DEMO_DOCS.map((d) => ({
    id: String(d.id),
    nome: d.name,
    motor: d.engines.includes('V3') ? 'V3' : 'V2',
    totalUsos: d.total90d,
  }));
}

function getBindValue(binds: Record<string, unknown> | unknown[] | undefined, key: string): string {
  if (!binds || Array.isArray(binds)) return '';
  const direct = binds[key] ?? binds[key.toUpperCase()] ?? binds[key.toLowerCase()];
  return direct !== undefined && direct !== null ? String(direct) : '';
}

function distributeBetweenDemoHospitals(total: number, weights: [number, number]): Record<string, number> {
  const [w0, w1] = weights;
  const sum = w0 + w1 || 1;
  const v0 = Math.round((total * w0) / sum);
  const v1 = Math.max(0, total - v0);
  return {
    [DEFAULT_DEMO_HOSPITALS[0].sigla]: v0,
    [DEFAULT_DEMO_HOSPITALS[1].sigla]: v1,
  };
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
 * Always uses strictly the 2 fictional companies and 10 fictional documents defined in this module.
 */
export function executeDemoQuery(
  sql: string,
  binds?: Record<string, unknown> | unknown[]
): Record<string, unknown>[] {
  const upperSql = (sql || '').toUpperCase();
  const effectiveHospitals = DEFAULT_DEMO_HOSPITALS;
  const now = Date.now();

  // 0. Companies List (/api/empresas)
  if ((upperSql.includes('MULTI_EMPRESAS') || upperSql.includes('NM_FANTASIA')) && !upperSql.includes('PERFIL_AMBULATORIAL')) {
    return effectiveHospitals.map((h) => ({
      CD_MULTI_EMPRESA: h.id,
      NM_FANTASIA: h.nome,
    }));
  }

  // 0b. Document Version Compare (/api/documentos/compare)
  if (upperSql.includes('VL_VERSAO IN (:VA, :VB)')) {
    const docId = Number(getBindValue(binds, 'DOC_ID')) || 9002;
    const vA = Number(getBindValue(binds, 'VA')) || 1;
    const vB = Number(getBindValue(binds, 'VB')) || 2;
    const doc = DEMO_DOCS.find((d) => d.id === docId) || DEMO_DOCS[1];

    if (upperSql.includes('NOME_CAMPO') && upperSql.includes('IDENTIFICADOR')) {
      const fieldsA = doc.fields.slice(0, Math.max(1, doc.fields.length - 1)).map((f) => ({
        VERSAO: vA,
        CD_CAMPO: f.cdCampo,
        IDENTIFICADOR: f.tag,
        NOME_CAMPO: f.name,
      }));
      const fieldsB = doc.fields.map((f) => ({
        VERSAO: vB,
        CD_CAMPO: f.cdCampo,
        IDENTIFICADOR: f.tag,
        NOME_CAMPO: f.name,
      }));
      return [...fieldsA, ...fieldsB];
    }

    if (upperSql.includes('NOME_REGRA') && upperSql.includes('CD_REGRA')) {
      const rulesB = doc.rules.map((r) => ({
        VERSAO: vB,
        CD_REGRA: r.cdRegra,
        NOME_REGRA: r.dsRegra,
      }));
      const rulesA = doc.rules.slice(0, 1).map((r) => ({
        VERSAO: vA,
        CD_REGRA: r.cdRegra,
        NOME_REGRA: r.dsRegra,
      }));
      return [...rulesA, ...rulesB];
    }
  }

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
        DATA_HORA_ATUAL: '23/11/2026 14:20:00',
        CD_DOCUMENTO_ATUAL: 995120,
        CD_REGISTRO_ATUAL: 881020,
        TEXTO_ANTERIOR: match.TEXTO_ANTERIOR,
        DATA_HORA_ANTERIOR: '22/11/2026 14:10:00',
        CD_DOCUMENTO_ANTERIOR: 994810,
        CD_REGISTRO_ANTERIOR: 880415,
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
      filtered = byDoc.length > 0 ? byDoc : filtered.slice(0, 3).map((r) => ({ ...r, DOCUMENTO: cdDoc }));
    }
    if (cdEmp) {
      filtered = filtered.filter((r) => r.CD_EMPRESA === cdEmp);
    }
    return filtered.map(({ TEXTO_ATUAL: _ta, TEXTO_ANTERIOR: _tp, ...row }) => row);
  }

  // 3. Document Rules (checked BEFORE Lineage queries so erpv_sub.cd_propriedade IN (4, 36) never collides,
  //    excluding METADATA queries and Lineage Rule queries that select TARGET_DOC_ID)
  if (
    !upperSql.includes('TARGET_DOC_ID') &&
    !upperSql.includes('VALOR_VERSAO') &&
    !upperSql.includes('QUANTIDADE_CAMPOS') &&
    ((upperSql.includes('TIPO_REGRA') && upperSql.includes('CAMPOS_AFETADOS')) ||
      upperSql.includes('EDITOR_REGRA ER'))
  ) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 9002;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc);
    if (!doc || doc.rules.length === 0) return [];

    const isV2 = upperSql.includes('DBAMV.EDITOR_REGRA') && !upperSql.includes('EDITOR.EDITOR_REGRA');
    const v2RuleTypeMap: Record<string, string> = {
      ENABLE: 'HABILITAR',
      DISABLE: 'DESABILITAR',
      ANSWER: 'RESPONDER',
      VALIDATE: 'VALIDAR',
      REQUIRED: 'VALIDAR',
      ON_CLOSE: 'AO_FINALIZAR',
      ON_SAVE: 'AO_SALVAR',
      RUN: 'RESPONDER',
      VISIBLE: 'HABILITAR',
      FILTER: 'FILTRAR',
    };

    const mapRuleRow = (
      r: DemoDocDef['rules'][number],
      version: number,
      tpVersao: 'PUBLISHED' | 'TEST' | 'EDITABLE' | 'HISTORY',
      snPublicado: number
    ) => ({
      CD_DOCUMENTO: doc.id,
      DS_DOCUMENTO: doc.name,
      CD_VERSAO_DOCUMENTO: doc.id * 100 + version,
      VL_VERSAO: version,
      TP_VERSAO: tpVersao,
      SN_PUBLICADO: snPublicado,
      CD_REGRA: r.cdRegra,
      NUM_ORDEM: r.numOrdem,
      DS_REGRA: r.dsRegra,
      ATIVA: r.ativa,
      TIPO_REGRA: isV2 ? (v2RuleTypeMap[r.tipoRegra] || r.tipoRegra) : r.tipoRegra,
      DS_ALERTA: r.dsAlerta,
      CONDICAO: r.condicao,
      QTD_CAMPOS: r.camposAfetados.split(',').filter(Boolean).length,
      CAMPOS_AFETADOS: r.camposAfetados,
      SCRIPT: r.script,
    });

    const rows = [
      ...doc.rules.map((r) => mapRuleRow(r, doc.version + 1, isV2 ? 'EDITABLE' : 'TEST', 0)),
      ...doc.rules.map((r) => mapRuleRow(r, doc.version, 'PUBLISHED', 1)),
    ];
    if (doc.version > 1) {
      const prevVersion = doc.version - 1;
      doc.rules.slice(0, 1).forEach((r) => {
        rows.push(mapRuleRow(r, prevVersion, 'HISTORY', 0));
      });
    }
    return rows;
  }

  // 4A. Lineage Graph Query 1B: Document Rules with SQL referencing CD_DOCUMENTO
  if (upperSql.includes('TARGET_DOC_ID') && upperSql.includes('RULE_NAME')) {
    const isV2 = upperSql.includes('DBAMV.EDITOR_DOCUMENTO') && !upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const targetEngine = isV2 ? 'V2' : 'V3';
    const rows: Record<string, unknown>[] = [];
    DEMO_DOCS.filter((doc) => doc.engines.includes(targetEngine)).forEach((doc) => {
      doc.rules.forEach((rule) => {
        if (!rule.script || !/CD_DOCUMENTO/i.test(rule.script)) return;
        const firstTag = rule.camposAfetados.split(',')[0]?.trim() || rule.dsRegra;
        const field = doc.fields.find((f) => f.tag === firstTag);
        rows.push({
          TARGET_DOC_ID: doc.id,
          TARGET_DOC_NAME: doc.name,
          TARGET_VERSION: doc.version,
          TARGET_TP_VERSAO: 'PUBLISHED',
          RULE_NAME: rule.dsRegra,
          RULE_TYPE: rule.tipoRegra,
          TARGET_FIELD_ID: field?.cdCampo ?? null,
          TARGET_FIELD_TAG: field?.tag ?? rule.dsRegra,
          TARGET_FIELD_NAME: field?.name ?? rule.dsRegra,
          SCRIPT_P1: rule.script,
          SCRIPT_P2: null,
          SCRIPT_P3: null,
        });
      });
    });
    return rows;
  }

  // 4B. Lineage Graph Query 1A: Action scripts reading external docs
  if (upperSql.includes('TARGET_DOC_ID') && upperSql.includes('SCRIPT_P1')) {
    const isV2 = upperSql.includes('DBAMV.EDITOR_DOCUMENTO') && !upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const targetEngine = isV2 ? 'V2' : 'V3';
    const rows: Record<string, unknown>[] = [];
    DEMO_DOCS.filter((doc) => doc.engines.includes(targetEngine)).forEach((doc) => {
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

  // 5. Lineage Graph Query 2: Involved Document Field Details (V3 or V2) with collision-free aliases
  if (
    (upperSql.includes('FIELD_TAG') || upperSql.includes('DS_IDENTIFICADOR')) &&
    (upperSql.includes('FIELD_ID') || upperSql.includes('CD_CAMPO')) &&
    upperSql.includes('ED.CD_DOCUMENTO IN (')
  ) {
    const requestedIds = new Set(parseInIds(sql));
    const isV2Only = upperSql.includes('DBAMV.EDITOR_DOCUMENTO') && !upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const targetEngine = isV2Only ? 'V2' : 'V3';
    const rows: Record<string, unknown>[] = [];

    DEMO_DOCS.filter(
      (d) => (requestedIds.size === 0 || requestedIds.has(d.id)) && d.engines.includes(targetEngine)
    ).forEach((d) => {
      d.fields.forEach((f) => {
        rows.push({
          DOC_ID: d.id,
          DOC_NAME: d.name,
          DOC_VERSION: d.version,
          DOC_TP_VERSAO: isV2Only ? 'LEGACY_V2' : 'PUBLISHED',
          FIELD_ID: f.cdCampo,
          FIELD_METADATA_ID: f.cdMetadado,
          FIELD_TAG: f.tag,
          FIELD_NAME: f.name,
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

  // 6. Lineage Graph Query 3: V3 / V2 Header fallback
  if (
    (upperSql.includes('FROM DBAMV.EDITOR_DOCUMENTO') || upperSql.includes('FROM EDITOR.EDITOR_DOCUMENTO')) &&
    upperSql.includes('CD_DOCUMENTO IN (')
  ) {
    const requestedIds = new Set(parseInIds(sql));
    const isV2Only = upperSql.includes('DBAMV.EDITOR_DOCUMENTO') && !upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const targetEngine = isV2Only ? 'V2' : 'V3';
    return DEMO_DOCS.filter(
      (d) => (requestedIds.size === 0 || requestedIds.has(d.id)) && d.engines.includes(targetEngine)
    ).map((d) => ({
      DOC_ID: d.id,
      DOC_NAME: d.name,
      CD_DOCUMENTO: d.id,
      DS_DOCUMENTO: d.name,
    }));
  }

  // 6. Ambulatory Profile Details
  if (upperSql.includes('COD_PERFIL_MODULO') || upperSql.includes('CD_PERFIL_AMBULATORIAL = :CD_PERFIL')) {
    const cdPerfil = Number(getBindValue(binds, 'CD_PERFIL')) || 91;
    const base = 5000 + cdPerfil * 100;
    const docsSlice = DEMO_DOCS.slice(0, 3);
    const rows: Record<string, unknown>[] = [
      // Subsegmento raiz (0 parâmetros próprios, agrupa módulos filhos)
      {
        COD_PERFIL_MODULO: base,
        MODULO: 'MVPEP_SUBSEGMENTO',
        COD_PERFIL_MODULO_PAI: null,
        ORDEM: 0,
        TITULO: 'Registro Clínico Assistencial',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: null,
        MODULO_PARAMETRO: null,
        PARAMETRO: null,
        COD_PERFIL_MOD_ORIGEM: null,
        VALOR_PARAMETRO: null,
        DESC_VALOR_PARAMETRO: null,
      },
      // Filho 1: Sinais Vitais
      {
        COD_PERFIL_MODULO: base + 1,
        MODULO: 'MVPEP_TEMA_AFERICAO',
        COD_PERFIL_MODULO_PAI: base,
        ORDEM: 10,
        TITULO: 'Sinais Vitais',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: base * 10 + 1,
        MODULO_PARAMETRO: 'MVPEP_TEMA_AFERICAO',
        PARAMETRO: 'CD_OBJETO',
        COD_PERFIL_MOD_ORIGEM: base + 1,
        VALOR_PARAMETRO: '357 - AFERIÇÃO (SANDBOX)',
        DESC_VALOR_PARAMETRO: 'Objeto de coleta de sinais vitais',
      },
      {
        COD_PERFIL_MODULO: base + 1,
        MODULO: 'MVPEP_TEMA_AFERICAO',
        COD_PERFIL_MODULO_PAI: base,
        ORDEM: 10,
        TITULO: 'Sinais Vitais',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: base * 10 + 2,
        MODULO_PARAMETRO: 'MVPEP_TEMA_AFERICAO',
        PARAMETRO: 'SN_HISTORICO',
        COD_PERFIL_MOD_ORIGEM: base + 1,
        VALOR_PARAMETRO: 'S',
        DESC_VALOR_PARAMETRO: 'Exibir histórico de aferições',
      },
    ];

    // Filhos 2..4: Documentos eletrônicos do subsegmento
    docsSlice.forEach((d, i) => {
      const modId = base + 10 + i;
      const ordem = (i + 2) * 10;
      rows.push(
        {
          COD_PERFIL_MODULO: modId,
          MODULO: 'MVPEP_TEMA_DOC_ELETRONICO',
          COD_PERFIL_MODULO_PAI: base,
          ORDEM: ordem,
          TITULO: d.name,
          AGRUPADOR: null,
          COD_MOD_PARAMETRO: modId * 10 + 1,
          MODULO_PARAMETRO: 'MVPEP_TEMA_DOC_ELETRONICO',
          PARAMETRO: 'CD_DOCUMENTO_EDITOR_3',
          COD_PERFIL_MOD_ORIGEM: modId,
          VALOR_PARAMETRO: `${d.id} - ${d.name}`,
          DESC_VALOR_PARAMETRO: 'Documento clínico V3 vinculado ao tema',
        },
        {
          COD_PERFIL_MODULO: modId,
          MODULO: 'MVPEP_TEMA_DOC_ELETRONICO',
          COD_PERFIL_MODULO_PAI: base,
          ORDEM: ordem,
          TITULO: d.name,
          AGRUPADOR: null,
          COD_MOD_PARAMETRO: modId * 10 + 2,
          MODULO_PARAMETRO: 'MVPEP_TEMA_DOC_ELETRONICO',
          PARAMETRO: 'SN_PERMITE_IMPRIMIR',
          COD_PERFIL_MOD_ORIGEM: modId,
          VALOR_PARAMETRO: 'S',
          DESC_VALOR_PARAMETRO: 'Permite impressão direta no PEP',
        }
      );
    });

    // Módulo raiz híbrido (parâmetros próprios + submódulo filho)
    const allergyId = base + 50;
    const allergyChildId = base + 51;
    rows.push(
      {
        COD_PERFIL_MODULO: allergyId,
        MODULO: 'MVPEP_ALERGIAS_EVENTOS',
        COD_PERFIL_MODULO_PAI: null,
        ORDEM: 30,
        TITULO: 'Alergia do Paciente',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: allergyId * 10 + 1,
        MODULO_PARAMETRO: 'MVPEP_ALERGIAS_EVENTOS',
        PARAMETRO: 'CD_OBJETO',
        COD_PERFIL_MOD_ORIGEM: allergyId,
        VALOR_PARAMETRO: '410 - REGISTRO DE ALERGIAS (SANDBOX)',
        DESC_VALOR_PARAMETRO: null,
      },
      {
        COD_PERFIL_MODULO: allergyId,
        MODULO: 'MVPEP_ALERGIAS_EVENTOS',
        COD_PERFIL_MODULO_PAI: null,
        ORDEM: 30,
        TITULO: 'Alergia do Paciente',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: allergyId * 10 + 2,
        MODULO_PARAMETRO: 'MVPEP_ALERGIAS_EVENTOS',
        PARAMETRO: 'SN_HISTORICO',
        COD_PERFIL_MOD_ORIGEM: allergyId,
        VALOR_PARAMETRO: 'S',
        DESC_VALOR_PARAMETRO: null,
      },
      {
        COD_PERFIL_MODULO: allergyChildId,
        MODULO: 'MVPEP_ALERGIAS_EVENTOS',
        COD_PERFIL_MODULO_PAI: allergyId,
        ORDEM: 10,
        TITULO: 'Alergia Medicamentosa',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: allergyChildId * 10 + 1,
        MODULO_PARAMETRO: 'MVPEP_ALERGIAS_EVENTOS',
        PARAMETRO: 'CD_OBJETO',
        COD_PERFIL_MOD_ORIGEM: allergyChildId,
        VALOR_PARAMETRO: '411 - ALERGIA MEDICAMENTOSA (SANDBOX)',
        DESC_VALOR_PARAMETRO: null,
      },
      {
        COD_PERFIL_MODULO: allergyChildId,
        MODULO: 'MVPEP_ALERGIAS_EVENTOS',
        COD_PERFIL_MODULO_PAI: allergyId,
        ORDEM: 10,
        TITULO: 'Alergia Medicamentosa',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: allergyChildId * 10 + 2,
        MODULO_PARAMETRO: 'MVPEP_ALERGIAS_EVENTOS',
        PARAMETRO: 'SN_EXIGE_JUSTIFICATIVA',
        COD_PERFIL_MOD_ORIGEM: allergyChildId,
        VALOR_PARAMETRO: 'S',
        DESC_VALOR_PARAMETRO: null,
      },
      // Módulo raiz simples
      {
        COD_PERFIL_MODULO: base + 60,
        MODULO: 'MVPEP_EVOLUCAO_MEDICA',
        COD_PERFIL_MODULO_PAI: null,
        ORDEM: 50,
        TITULO: 'Evoluções Anteriores',
        AGRUPADOR: null,
        COD_MOD_PARAMETRO: (base + 60) * 10 + 1,
        MODULO_PARAMETRO: 'MVPEP_EVOLUCAO_MEDICA',
        PARAMETRO: 'QT_DIAS_HISTORICO',
        COD_PERFIL_MOD_ORIGEM: base + 60,
        VALOR_PARAMETRO: '90',
        DESC_VALOR_PARAMETRO: 'Dias exibidos na linha do tempo',
      }
    );

    return rows;
  }

  // 7. Ambulatory Profiles List
  if (upperSql.includes('COD_PERFIL') && upperSql.includes('NOME_PERFIL')) {
    return [
      {
        COD_PERFIL: 91,
        NOME_PERFIL: 'INTERNAÇÃO CLÍNICA AURORA (DEMO)',
        COD_ESPECIALIDADE: 10,
        ESPECIALIDADE: 'CLÍNICA MÉDICA',
        SISTEMA: 'PEP',
        PORTA_ENTRADA: 'I',
        TIPO_ATENDIMENTO: 'I',
        COD_TIPO_PRESTADOR: 1,
        NOME_TIPO_PRESTADOR: 'MÉDICO',
        COD_SETOR: 911,
        NOME_SETOR: 'ALA AURORA SUL',
        EMPRESA_FIXA: 901,
        EMPRESAS_VINCULADAS: '901::HOSPITAL VALE DA AURORA (SANDBOX)',
        TIPOS_PRESTADOR: '1::MÉDICO',
      },
      {
        COD_PERFIL: 92,
        NOME_PERFIL: 'TERAPIA INTENSIVA VALE DA AURORA (DEMO)',
        COD_ESPECIALIDADE: 22,
        ESPECIALIDADE: 'MEDICINA INTENSIVA',
        SISTEMA: 'PEP',
        PORTA_ENTRADA: 'I',
        TIPO_ATENDIMENTO: 'I',
        COD_TIPO_PRESTADOR: 1,
        NOME_TIPO_PRESTADOR: 'MÉDICO',
        COD_SETOR: 912,
        NOME_SETOR: 'UTI AURORA',
        EMPRESA_FIXA: 901,
        EMPRESAS_VINCULADAS: '901::HOSPITAL VALE DA AURORA (SANDBOX)|902::HOSPITAL SERRA DO MAR (SANDBOX)',
        TIPOS_PRESTADOR: '1::MÉDICO|3::INTENSIVISTA',
      },
      {
        COD_PERFIL: 93,
        NOME_PERFIL: 'ENFERMAGEM SERRA DO MAR (DEMO)',
        COD_ESPECIALIDADE: null,
        ESPECIALIDADE: 'MULTIDISCIPLINAR',
        SISTEMA: 'PEP',
        PORTA_ENTRADA: 'I',
        TIPO_ATENDIMENTO: 'I',
        COD_TIPO_PRESTADOR: 2,
        NOME_TIPO_PRESTADOR: 'ENFERMEIRO',
        COD_SETOR: 921,
        NOME_SETOR: 'UNIDADE SERRA B',
        EMPRESA_FIXA: 902,
        EMPRESAS_VINCULADAS: '902::HOSPITAL SERRA DO MAR (SANDBOX)',
        TIPOS_PRESTADOR: '2::ENFERMEIRO',
      },
      {
        COD_PERFIL: 94,
        NOME_PERFIL: 'PRONTO ATENDIMENTO SERRA DO MAR (DEMO)',
        COD_ESPECIALIDADE: 14,
        ESPECIALIDADE: 'URGÊNCIA',
        SISTEMA: 'PEP',
        PORTA_ENTRADA: 'U',
        TIPO_ATENDIMENTO: 'U',
        COD_TIPO_PRESTADOR: 1,
        NOME_TIPO_PRESTADOR: 'MÉDICO',
        COD_SETOR: 922,
        NOME_SETOR: 'PA SERRA',
        EMPRESA_FIXA: 902,
        EMPRESAS_VINCULADAS: '902::HOSPITAL SERRA DO MAR (SANDBOX)',
        TIPOS_PRESTADOR: '1::MÉDICO|4::PLANTONISTA',
      },
    ];
  }

  // 8. Document Profile Bindings (:CD_DOCUMENTO)
  if (upperSql.includes('DS_PERFIL_AMBULATORIAL')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 9002;
    return [
      { CD_DOCUMENTO: cdDoc, NM_TITULO: 'Prontuário Sandbox > Acompanhamento', DS_PERFIL_AMBULATORIAL: 'INTERNAÇÃO CLÍNICA AURORA (DEMO)', EMPRESA: 'HVA' },
      { CD_DOCUMENTO: cdDoc, NM_TITULO: 'Prontuário Sandbox > Terapia Intensiva', DS_PERFIL_AMBULATORIAL: 'TERAPIA INTENSIVA VALE DA AURORA (DEMO)', EMPRESA: 'HVA' },
      { CD_DOCUMENTO: cdDoc, NM_TITULO: 'Prontuário Sandbox > Enfermaria Serra', DS_PERFIL_AMBULATORIAL: 'ENFERMAGEM SERRA DO MAR (DEMO)', EMPRESA: 'HSM' },
    ];
  }

  // 9. Document Metadata (Versions & Layouts)
  if (upperSql.includes('CODIGO_DOCUMENTO') && upperSql.includes('VALOR_VERSAO')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 9002;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc) || DEMO_DOCS[1];
    const isV2 =
      upperSql.includes('DBAMV.EDITOR_VERSAO_DOCUMENTO') &&
      !upperSql.includes('EDITOR.EDITOR_VERSAO_DOCUMENTO');
    const statusAtivo = isV2 ? 'S' : 1;
    const baseId = doc.id * 100;
    const rows = [
      {
        CODIGO_DOCUMENTO: doc.id,
        DESCRICAO_DOCUMENTO: doc.name,
        IDENTIFICADOR_DOCUMENTO: doc.identifier,
        CODIGO_VERSAO_DOCUMENTO: baseId + doc.version + 1,
        CODIGO_TIPO_LAYOUT: null,
        IDENTIFICADOR_LAYOUT: null,
        DESCRICAO_TIPO_LAYOUT: null,
        VALOR_VERSAO: doc.version + 1,
        STATUS_ATIVO: statusAtivo,
        SN_PUBLICADO: 0,
        TP_VERSAO: isV2 ? 'EDITABLE' : 'TEST',
        CODIGO_TIPO_VERSAO: 1,
        DESCRICAO_TIPO_VERSAO: isV2 ? 'Editável' : 'Teste',
        CODIGO_LAYOUT_CABECALHO: null,
        DOCUMENTO_CABECALHO: null,
        CODIGO_LAYOUT_RODAPE: null,
        QUANTIDADE_REGRAS: 0,
        QUANTIDADE_CAMPOS: 0,
      },
      {
        CODIGO_DOCUMENTO: doc.id,
        DESCRICAO_DOCUMENTO: doc.name,
        IDENTIFICADOR_DOCUMENTO: doc.identifier,
        CODIGO_VERSAO_DOCUMENTO: baseId + doc.version,
        CODIGO_TIPO_LAYOUT: 1,
        IDENTIFICADOR_LAYOUT: 'TELA',
        DESCRICAO_TIPO_LAYOUT: 'Tela',
        VALOR_VERSAO: doc.version,
        STATUS_ATIVO: statusAtivo,
        SN_PUBLICADO: 1,
        TP_VERSAO: 'PUBLISHED',
        CODIGO_TIPO_VERSAO: 3,
        DESCRICAO_TIPO_VERSAO: 'Publicada',
        CODIGO_LAYOUT_CABECALHO: 9901,
        DOCUMENTO_CABECALHO: 9000,
        CODIGO_LAYOUT_RODAPE: 9902,
        QUANTIDADE_REGRAS: doc.rules.length,
        QUANTIDADE_CAMPOS: doc.fields.length || 2,
      },
      {
        CODIGO_DOCUMENTO: doc.id,
        DESCRICAO_DOCUMENTO: doc.name,
        IDENTIFICADOR_DOCUMENTO: doc.identifier,
        CODIGO_VERSAO_DOCUMENTO: baseId + doc.version,
        CODIGO_TIPO_LAYOUT: 2,
        IDENTIFICADOR_LAYOUT: 'RELATORIO',
        DESCRICAO_TIPO_LAYOUT: 'Relatório',
        VALOR_VERSAO: doc.version,
        STATUS_ATIVO: statusAtivo,
        SN_PUBLICADO: 1,
        TP_VERSAO: 'PUBLISHED',
        CODIGO_TIPO_VERSAO: 3,
        DESCRICAO_TIPO_VERSAO: 'Publicada',
        CODIGO_LAYOUT_CABECALHO: 9901,
        DOCUMENTO_CABECALHO: 9000,
        CODIGO_LAYOUT_RODAPE: 9902,
        QUANTIDADE_REGRAS: doc.rules.length,
        QUANTIDADE_CAMPOS: doc.fields.length || 2,
      },
    ];
    if (doc.version > 1) {
      rows.push(
        {
          CODIGO_DOCUMENTO: doc.id,
          DESCRICAO_DOCUMENTO: doc.name,
          IDENTIFICADOR_DOCUMENTO: doc.identifier,
          CODIGO_VERSAO_DOCUMENTO: baseId + doc.version - 1,
          CODIGO_TIPO_LAYOUT: 1,
          IDENTIFICADOR_LAYOUT: 'TELA',
          DESCRICAO_TIPO_LAYOUT: 'Tela',
          VALOR_VERSAO: doc.version - 1,
          STATUS_ATIVO: statusAtivo,
          SN_PUBLICADO: 0,
          TP_VERSAO: 'HISTORY',
          CODIGO_TIPO_VERSAO: 2,
          DESCRICAO_TIPO_VERSAO: 'Histórico',
          CODIGO_LAYOUT_CABECALHO: 9901,
          DOCUMENTO_CABECALHO: 9000,
          CODIGO_LAYOUT_RODAPE: 9902,
          QUANTIDADE_REGRAS: doc.rules.length > 0 ? 1 : 0,
          QUANTIDADE_CAMPOS: Math.max(1, doc.fields.length - 1),
        },
        {
          CODIGO_DOCUMENTO: doc.id,
          DESCRICAO_DOCUMENTO: doc.name,
          IDENTIFICADOR_DOCUMENTO: doc.identifier,
          CODIGO_VERSAO_DOCUMENTO: baseId + doc.version - 1,
          CODIGO_TIPO_LAYOUT: 2,
          IDENTIFICADOR_LAYOUT: 'RELATORIO',
          DESCRICAO_TIPO_LAYOUT: 'Relatório',
          VALOR_VERSAO: doc.version - 1,
          STATUS_ATIVO: statusAtivo,
          SN_PUBLICADO: 0,
          TP_VERSAO: 'HISTORY',
          CODIGO_TIPO_VERSAO: 2,
          DESCRICAO_TIPO_VERSAO: 'Histórico',
          CODIGO_LAYOUT_CABECALHO: 9901,
          DOCUMENTO_CABECALHO: 9000,
          CODIGO_LAYOUT_RODAPE: 9902,
          QUANTIDADE_REGRAS: doc.rules.length > 0 ? 1 : 0,
          QUANTIDADE_CAMPOS: Math.max(1, doc.fields.length - 1),
        }
      );
    }
    return rows;
  }

  // 10. Document Actions (SQL Queries on fields)
  if (upperSql.includes('CODIGO_ORIGEM') && upperSql.includes('SCRIPT_ACAO_COMPLETO')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 9002;
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

  // 12. Document Fields
  if (upperSql.includes('DS_TIPO_VISUALIZACAO') && upperSql.includes('CD_CAMPO')) {
    const cdDoc = Number(getBindValue(binds, 'CD_DOCUMENTO')) || 9002;
    const doc = DEMO_DOCS.find((d) => d.id === cdDoc);
    const isV2 = upperSql.includes('DBAMV.EDITOR_CAMPO') && !upperSql.includes('EDITOR.EDITOR_CAMPO');
    const baseFields = doc?.fields.length
      ? doc.fields
      : [
          { cdCampo: cdDoc * 100 + 1, cdMetadado: 99901, tag: 'REGISTRO_CLINICO', name: 'Registro Clínico Principal', visualType: 'Editor Rico', rulesCount: 0 },
          { cdCampo: cdDoc * 100 + 2, cdMetadado: 99902, tag: 'DATA_REGISTRO', name: 'Data/Hora da Avaliação', visualType: 'Data/Hora', rulesCount: 0 },
        ];
    const targetDoc = doc || { id: cdDoc, version: 1 };

    const buildVersionLayoutFields = (
      version: number,
      tpVersao: 'PUBLISHED' | 'TEST' | 'EDITABLE' | 'HISTORY',
      snPublicado: number,
      list: typeof baseFields
    ) =>
      [
        { typeId: 1, typeName: 'Tela' },
        { typeId: 2, typeName: 'Relatório' },
      ].flatMap((layout) =>
        list.map((f) => ({
          CD_CAMPO: f.cdCampo,
          DS_IDENTIFICADOR: f.tag,
          DS_CAMPO: f.name,
          CD_METADADO: f.cdMetadado,
          SN_ATIVO: 1,
          CD_TIPO_VISUALIZACAO: 1,
          DS_TIPO_VISUALIZACAO: f.visualType,
          CD_LAYOUT: targetDoc.id * 100 + version * 10 + layout.typeId,
          CD_TIPO_LAYOUT: layout.typeId,
          DS_TIPO_LAYOUT: layout.typeName,
          VL_VERSAO: version,
          TP_VERSAO: tpVersao,
          SN_PUBLICADO: snPublicado,
          QTD_REGRAS: layout.typeId === 1 ? f.rulesCount : 0,
        }))
      );

    return [
      ...buildVersionLayoutFields(targetDoc.version + 1, isV2 ? 'EDITABLE' : 'TEST', 0, baseFields),
      ...buildVersionLayoutFields(targetDoc.version, 'PUBLISHED', 1, baseFields),
      ...(targetDoc.version > 1
        ? buildVersionLayoutFields(targetDoc.version - 1, 'HISTORY', 0, baseFields.slice(0, Math.max(1, baseFields.length - 1)))
        : []),
    ];
  }

  // 13. Hospital KPIs (/api/hospitals/stats)
  if (upperSql.includes('TOTAL_DOCS') && upperSql.includes('DOCS_ATIVOS')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 901;
    const hIndex = hospId === 902 ? 1 : 0;
    const activeCount = DEMO_DOCS.filter((d) => !d.idle).length;
    const totalPerHosp = DEMO_DOCS.filter((d) => !d.idle).reduce((acc, d) => {
      const dist = distributeBetweenDemoHospitals(d.total90d, d.weights);
      const sigla = effectiveHospitals[hIndex].sigla;
      return acc + (dist[sigla] ?? 0);
    }, 0);

    return [
      {
        TOTAL_DOCS: totalPerHosp,
        DOCS_ATIVOS: activeCount - hIndex,
        ULTIMO_REGISTRO: new Date(now - (hIndex + 1) * 12 * 60_000),
      },
    ];
  }

  // 14. Hospital Detail Table (/api/hospitals/stats)
  if (upperSql.includes('USO_UNIDADE')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 901;
    const hIndex = hospId === 902 ? 1 : 0;
    const sigla = effectiveHospitals[hIndex].sigla;
    return DEMO_DOCS.filter((d) => !d.idle)
      .map((d) => {
        const dist = distributeBetweenDemoHospitals(d.total90d, d.weights);
        return {
          CD_DOCUMENTO: d.id,
          NOME: d.name,
          VERSAO: d.version,
          USO_UNIDADE: dist[sigla] ?? 0,
          ULTIMO_USO: new Date(now - (d.lastUsedHoursAgo + hIndex * 0.5) * 3600_000),
        };
      })
      .sort((a, b) => b.USO_UNIDADE - a.USO_UNIDADE);
  }

  // 15. Hospital Top 5 Chart (/api/hospitals/stats)
  if (upperSql.includes('AS USO') && upperSql.includes('ROWNUM <= 5')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 901;
    const hIndex = hospId === 902 ? 1 : 0;
    const sigla = effectiveHospitals[hIndex].sigla;
    return DEMO_DOCS.filter((d) => !d.idle)
      .map((d) => {
        const dist = distributeBetweenDemoHospitals(d.total90d, d.weights);
        return {
          NOME: d.name,
          USO: dist[sigla] ?? 0,
        };
      })
      .sort((a, b) => b.USO - a.USO)
      .slice(0, 5);
  }

  // 16. SLA Assinatura (Dashboard & Hospital Quality)
  if (upperSql.includes('FAIXA_SLA')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 0;
    const factor = hospId === 901 ? 0.55 : hospId === 902 ? 0.45 : 1;
    return [
      { FAIXA_SLA: 'Até 1 hora', TOTAL: Math.round(74200 * factor) },
      { FAIXA_SLA: '1 a 6 horas', TOTAL: Math.round(21800 * factor) },
      { FAIXA_SLA: '6 a 24 horas', TOTAL: Math.round(9120 * factor) },
      { FAIXA_SLA: 'Acima de 24 horas', TOTAL: Math.round(2640 * factor) },
      { FAIXA_SLA: 'Pendente de Assinatura', TOTAL: Math.round(1620 * factor) },
    ];
  }

  // 17. Shift Volume (volumeTurno)
  if (upperSql.includes('TURNO')) {
    const hospId = Number(getBindValue(binds, 'ID')) || 0;
    const factor = hospId === 901 ? 0.56 : hospId === 902 ? 0.44 : 1;
    const dia = Math.round(78420 * factor);
    const noite = Math.round(39750 * factor);
    return [
      { TURNO: 'DIA', QTD: dia, TOTAL: dia },
      { TURNO: 'NOITE', QTD: noite, TOTAL: noite },
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

  // 20. Dashboard 24h KPI (prod24h - checked BEFORE TOTAL_GERAL_PREENCHIDO / TOTAL_GERAL)
  if (upperSql.includes('SYSDATE - 1')) {
    return [{ TOTAL_GERAL: 1210, QTD_ASSINADO: 1125, QTD_FECHADO: 85, TOTAL: 1210 }];
  }

  // 21. Dashboard Signed KPI (assinados - checked BEFORE TOTAL_GERAL_PREENCHIDO)
  if (upperSql.includes('QTD_ASSINADO') || upperSql.includes("TP_STATUS = 'ASSINADO'")) {
    const sum = DEMO_DOCS.reduce((acc, d) => acc + d.total90d, 0);
    const assinados = Math.round(sum * 0.954);
    const fechados = Math.max(0, sum - assinados);
    return [{ TOTAL_GERAL: sum, QTD_ASSINADO: assinados, QTD_FECHADO: fechados, TOTAL: assinados }];
  }

  // 22. Dashboard 3M Volume & Total KPI (volume3m / total / globalTotal)
  if (upperSql.includes('TOTAL_GERAL_PREENCHIDO')) {
    const sum = DEMO_DOCS.reduce((acc, d) => acc + d.total90d, 0);
    return [{ TOTAL_GERAL_PREENCHIDO: sum, TOTAL_GERAL: sum, TOTAL: sum }];
  }

  // 23. Dashboard Unit Adherence (always strictly 2 fictional companies)
  if (upperSql.includes('QTD_TOTAL_PREENCHIDA')) {
    const totals: Record<number, number> = { 901: 0, 902: 0 };
    DEMO_DOCS.forEach((d) => {
      const dist = distributeBetweenDemoHospitals(d.total90d, d.weights);
      totals[901] += dist.HVA;
      totals[902] += dist.HSM;
    });
    return effectiveHospitals
      .map((h) => ({
        CD_MULTI_EMPRESA: h.id,
        SIGLA_UNIDADE: h.sigla,
        QTD_TOTAL_PREENCHIDA: totals[h.id] ?? 0,
      }))
      .sort((a, b) => Number(b.QTD_TOTAL_PREENCHIDA) - Number(a.QTD_TOTAL_PREENCHIDA));
  }

  // 24. Dashboard Unit Inactivity
  if (upperSql.includes('DIAS_SEM_USO')) {
    return [
      { CD_DOCUMENTO: 9010, DS_DOCUMENTO: 'FORMULARIO HISTORICO INATIVO SANDBOX', SIGLA_UNIDADE: 'HSM', ULTIMA_DATA_USO: new Date(now - 74 * 86400_000), DIAS_SEM_USO: 74 },
      { CD_DOCUMENTO: 9009, DS_DOCUMENTO: 'PROTOCOLO DE VERIFICACAO PRE-PROCEDIMENTO', SIGLA_UNIDADE: 'HVA', ULTIMA_DATA_USO: new Date(now - 38 * 86400_000), DIAS_SEM_USO: 38 },
      { CD_DOCUMENTO: 9008, DS_DOCUMENTO: 'GUIA DE TRANSICAO INTERSETORIAL SANDBOX', SIGLA_UNIDADE: 'HSM', ULTIMA_DATA_USO: new Date(now - 21 * 86400_000), DIAS_SEM_USO: 21 },
    ];
  }

  // 25. Main Documents Catalog (activeQuery / activeQueryV3)
  if (upperSql.includes('NM_TITULO') && upperSql.includes('CD_DOCUMENTO')) {
    const isV3 = upperSql.includes('EDITOR.EDITOR_DOCUMENTO');
    const docs = DEMO_DOCS.filter((d) => !d.idle && d.engines.includes(isV3 ? 'V3' : 'V2'));
    return docs.map((d) => {
      const hospCols = distributeBetweenDemoHospitals(d.total90d, d.weights);
      return {
        CÓDIGO: d.id,
        NOME: d.name,
        TOTAL: d.total90d,
        'ÚLTIMO USO': new Date(now - d.lastUsedHoursAgo * 3600_000).toISOString(),
        ...hospCols,
      };
    });
  }

  // 26. Generic KPI Fallback
  if (upperSql.includes('AS TOTAL') || upperSql.includes('COUNT(')) {
    const sum = DEMO_DOCS.reduce((acc, d) => acc + d.total90d, 0);
    return [{ TOTAL_GERAL_PREENCHIDO: sum, TOTAL_GERAL: sum, TOTAL: sum }];
  }

  return [];
}
