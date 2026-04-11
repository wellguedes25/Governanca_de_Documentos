import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'storage.json');

export interface DbConnection {
  id: string;
  name: string;
  user: string;
  password?: string;
  connectString: string;
}

export interface CustomCard {
  id: string;
  title: string;
  query: string;
  type: 'kpi' | 'chart';
  icon: string;
  color: string;
  enabled: boolean;
  order: number;
  valueType?: 'number' | 'percent';
}

export interface FieldMapping {
  id: string;   // Nome técnico (ex: EVOLUCAO)
  name: string; // Descrição amigável (ex: Evolução Clínica)
}

export interface DocMapping {
  id: string;
  name: string;
  fields: FieldMapping[];
}

export interface StorageData {
  connections: DbConnection[];
  activeConnectionId: string | null;
  activeQuery: string;
  profileQuery: string;
  oracleClientPath: string;
  kpiQueries: {
    total: string;
    prod24h: string;
    assinados: string;
  };
  analyticQueries: {
    top10: string;
    idle: string;
    volume3m: string;
    unitAdherence: string;
    unitInactivity: string;
  };
  similarityQuery: string;
  enabledQueries: Record<string, boolean>;
  customCards: CustomCard[];
  cardSettings: Record<string, { title?: string; icon?: string; color?: string }>;
  docMappings: DocMapping[];
  reportBaseUrl?: string;
  siglarioAllowed?: string[];
  siglarioForbidden?: string[];
  auditDays?: number;
  auditDocId?: number;
}

export const INITIAL_DATA: StorageData = {
  connections: [],
  activeConnectionId: null,
  activeQuery: 'SELECT * FROM DUAL',
  profileQuery: 'SELECT * FROM DUAL',
  oracleClientPath: 'C:\\orant\\Client\\instantclient_23_0',
  kpiQueries: {
    total: 'SELECT COUNT(*) as TOTAL FROM DBAMV.PW_DOCUMENTO_CLINICO',
    prod24h: "SELECT COUNT(*) as TOTAL FROM DBAMV.PW_DOCUMENTO_CLINICO WHERE DH_CRIACAO >= SYSDATE - 1",
    assinados: "SELECT COUNT(*) as TOTAL FROM DBAMV.PW_DOCUMENTO_CLINICO WHERE TP_STATUS = 'ASSINADO' AND DH_CRIACAO >= SYSDATE - 30"
  },
  analyticQueries: {
    top10: `SELECT * FROM (
    SELECT CAST(ED.CD_DOCUMENTO AS NUMBER) AS CD_DOCUMENTO,
           UPPER(ED.DS_DOCUMENTO) AS DS_DOCUMENTO,
           COUNT(PDC.CD_DOCUMENTO_CLINICO) AS QTD_TOTAL
      FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
      JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
      JOIN EDITOR_DOCUMENTO ED ON TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)
      JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
     WHERE A.CD_MULTI_EMPRESA IN (3, 4, 7, 10, 11, 25, 63)
       AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
       AND ED.CD_TIPO_ITEM = 13
       AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)
     GROUP BY CAST(ED.CD_DOCUMENTO AS NUMBER), UPPER(ED.DS_DOCUMENTO)
     ORDER BY QTD_TOTAL DESC
) 
WHERE ROWNUM <= 10`,
    idle: `WITH FT_DOC_USO AS (
    SELECT PEC.CD_DOCUMENTO
      FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
      JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
      JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
     WHERE A.CD_MULTI_EMPRESA IN (3, 4, 7, 10, 11, 25, 63)
       AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
       AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)
     GROUP BY PEC.CD_DOCUMENTO
)
SELECT CAST(ED.CD_DOCUMENTO AS NUMBER) AS CD_DOCUMENTO,
       UPPER(ED.DS_DOCUMENTO) AS DS_DOCUMENTO,
       'SEM USO NOS ÚLTIMOS 3 MESES' AS STATUS_OCIOSIDADE
  FROM EDITOR_DOCUMENTO ED
  LEFT JOIN FT_DOC_USO F ON TO_CHAR(F.CD_DOCUMENTO) = TO_CHAR(ED.CD_DOCUMENTO)
 WHERE ED.CD_TIPO_ITEM = 13
   AND F.CD_DOCUMENTO IS NULL
 ORDER BY ED.DS_DOCUMENTO`,
    volume3m: `SELECT COUNT(PDC.CD_DOCUMENTO_CLINICO) AS TOTAL_GERAL_PREENCHIDO
  FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
  JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
  JOIN EDITOR_DOCUMENTO ED ON TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)
  JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
 WHERE A.CD_MULTI_EMPRESA IN (3, 4, 7, 10, 11, 25, 63)
   AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
   AND ED.CD_TIPO_ITEM = 13
   AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)`,
    unitAdherence: `SELECT A.CD_MULTI_EMPRESA,
       CASE A.CD_MULTI_EMPRESA
            WHEN 3 THEN 'CSSJ'
            WHEN 4 THEN 'HST'
            WHEN 7 THEN 'HSC'
            WHEN 10 THEN 'HSJ'
            WHEN 11 THEN 'HMRP'
            WHEN 25 THEN 'HCNSC'
            WHEN 63 THEN 'HR'
       END AS SIGLA_UNIDADE,
       COUNT(PDC.CD_DOCUMENTO_CLINICO) AS QTD_TOTAL_PREENCHIDA
  FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
  JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
  JOIN EDITOR_DOCUMENTO ED ON TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)
  JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
 WHERE A.CD_MULTI_EMPRESA IN (3, 4, 7, 10, 11, 25, 63)
   AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
   AND ED.CD_TIPO_ITEM = 13
   AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)
 GROUP BY A.CD_MULTI_EMPRESA
 ORDER BY QTD_TOTAL_PREENCHIDA DESC`,
    unitInactivity: `SELECT CAST(ED.CD_DOCUMENTO AS NUMBER) AS CD_DOCUMENTO,
       UPPER(ED.DS_DOCUMENTO) AS DS_DOCUMENTO,
       CASE A.CD_MULTI_EMPRESA
            WHEN 3 THEN 'CSSJ'
            WHEN 4 THEN 'HST'
            WHEN 7 THEN 'HSC'
            WHEN 10 THEN 'HSJ'
            WHEN 11 THEN 'HMRP'
            WHEN 25 THEN 'HCNSC'
            WHEN 63 THEN 'HR'
       END AS SIGLA_UNIDADE,
       MAX(PDC.DH_CRIACAO) AS ULTIMA_DATA_USO,
       TRUNC(SYSDATE) - TRUNC(MAX(PDC.DH_CRIACAO)) AS DIAS_SEM_USO
  FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
  JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
  JOIN EDITOR_DOCUMENTO ED ON TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)
  JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
 WHERE A.CD_MULTI_EMPRESA IN (3, 4, 7, 10, 11, 25, 63)
   AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
   AND ED.CD_TIPO_ITEM = 13
   AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)
 GROUP BY CAST(ED.CD_DOCUMENTO AS NUMBER),
          UPPER(ED.DS_DOCUMENTO),
          A.CD_MULTI_EMPRESA
 ORDER BY DIAS_SEM_USO DESC`
  },
  similarityQuery: `SELECT 
    CD_ATENDIMENTO as ATENDIMENTO,
    CD_DOCUMENTO as DOCUMENTO,
    DS_DOCUMENTO as NOME_DOCUMENTO,
    IDENTIFICADOR_FILTRO as IDENTIFICADOR,
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
    CD_ATENDIMENTO DESC, DH_FECHAMENTO DESC`,
  enabledQueries: {
    total: true,
    prod24h: true,
    assinados: true,
    top10: true,
    idle: true,
    volume3m: true,
    unitAdherence: true,
    unitInactivity: true
  },
  cardSettings: {},
  customCards: [],
  docMappings: [
    { 
      id: '916', 
      name: 'Evolução Médica/Enf', 
      fields: [
        { id: 'EVOLUCAO', name: 'Evolução Clínica' }
      ] 
    }
  ],
  reportBaseUrl: 'http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=',
  siglarioAllowed: [],
  siglarioForbidden: [],
  auditDays: 15,
  auditDocId: 0
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function getData(): Promise<StorageData> {
  ensureDataDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return INITIAL_DATA;
  }
  const fileContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
  try {
    const data = JSON.parse(fileContent);
    return {
      ...INITIAL_DATA,
      ...data,
      enabledQueries: {
        ...INITIAL_DATA.enabledQueries,
        ...(data.enabledQueries || {})
      },
      cardSettings: data.cardSettings || {},
      customCards: data.customCards || [],
      docMappings: (data.docMappings || INITIAL_DATA.docMappings).map((m: any) => ({
        ...m,
        fields: m.fields.map((f: any) => typeof f === 'string' ? { id: f, name: f } : f)
      })),
      reportBaseUrl: data.reportBaseUrl || INITIAL_DATA.reportBaseUrl,
      siglarioAllowed: data.siglarioAllowed || INITIAL_DATA.siglarioAllowed,
      siglarioForbidden: data.siglarioForbidden || INITIAL_DATA.siglarioForbidden,
      auditDays: typeof data.auditDays === 'number' ? data.auditDays : INITIAL_DATA.auditDays,
      auditDocId: typeof data.auditDocId === 'number' ? data.auditDocId : INITIAL_DATA.auditDocId
    };
  } catch (e) {
    return INITIAL_DATA;
  }
}

export async function saveData(data: StorageData) {
  ensureDataDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}
