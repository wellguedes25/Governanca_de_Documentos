import fs from 'fs';
import path from 'path';

const getStoragePaths = () => {
  const root = process.cwd();
  const dataDir = path.join(root, 'data');
  const storageFile = path.join(dataDir, 'storage.json');
  return { root, dataDir, storageFile };
};

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
  docMetadataQuery: string;
  docActionsQuery: string;
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
    T.CD_ATENDIMENTO as ATENDIMENTO,
    T.CD_DOCUMENTO as DOCUMENTO,
    T.DS_DOCUMENTO as NOME_DOCUMENTO,
    T.IDENTIFICADOR_FILTRO as IDENTIFICADOR,
    T.DH_FECHAMENTO as DATA_HORA,
    T.CD_PRESTADOR || ' - ' || P.NM_PRESTADOR as PRESTADOR,
    T.LEITO,
    T.UNIDADE,
    T.GRAU_SIMILARIDADE as SCORE
FROM 
    DBAMV.TB_AUDITORIA_SIMILARIDADE T
LEFT JOIN 
    DBAMV.PRESTADOR P ON P.CD_PRESTADOR = T.CD_PRESTADOR
WHERE 
    T.CD_DOCUMENTO = :CD_DOCUMENTO
    AND T.IDENTIFICADOR_FILTRO = :IDENTIFICADOR
    AND T.DH_FECHAMENTO BETWEEN TO_DATE(:DATA_INI, 'YYYY-MM-DD') AND TO_DATE(:DATA_FIM, 'YYYY-MM-DD') + 1
ORDER BY 
    T.CD_ATENDIMENTO DESC, T.DH_FECHAMENTO DESC`,
  docMetadataQuery: `SELECT DISTINCT
       edo.cd_documento             AS Codigo_Documento,
       edo.ds_documento             AS Descricao_Documento,
       edo.ds_identificador         AS Identificador_Documento,
       evd.cd_versao_documento      AS Codigo_Versao_Documento,
       etl.cd_tipo_layout           AS Codigo_Tipo_Layout,
       etl.ds_identificador         AS Identificador_Layout,
       etl.ds_tipo_layout           AS Descricao_Tipo_Layout,
       evd.vl_versao                AS Valor_Versao,
       evd.sn_ativo                 AS Status_Ativo,
       evd.cd_tipo_versao           AS Codigo_Tipo_Versao,
       etv.ds_tipo_versao           AS Descricao_Tipo_Versao,
       edl.cd_layout_cabecalho      AS Codigo_Layout_Cabecalho,
       (SELECT evdo.cd_documento
          FROM dbamv.editor_layout el
         INNER JOIN dbamv.editor_versao_documento evdo
            ON el.cd_versao_documento = evdo.cd_versao_documento
         WHERE el.cd_layout = edl.cd_layout_cabecalho) AS Documento_Cabecalho,
       edl.cd_layout_rodape         AS Codigo_Layout_Rodape
  FROM dbamv.editor_documento edo
 INNER JOIN dbamv.editor_versao_documento evd ON edo.cd_documento = evd.cd_documento
 INNER JOIN dbamv.editor_tipo_versao etv      ON etv.cd_tipo_versao = evd.cd_tipo_versao
 INNER JOIN dbamv.editor_layout edl           ON evd.cd_versao_documento = edl.cd_versao_documento
 INNER JOIN dbamv.editor_tipo_layout etl      ON edl.cd_tipo_layout = etl.cd_tipo_layout
 WHERE etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
   AND edo.cd_documento = :CD_DOCUMENTO
 ORDER BY Codigo_Documento`,
  docActionsQuery: `SELECT DISTINCT
       ed.cd_documento               AS Codigo_Origem,
       ed.ds_documento               AS Descricao_Origem,
       ec.cd_metadado                AS Codigo_Metadado,
       ec.ds_campo                   AS Nome_Campo,
       ec.ds_identificador           AS Identificador_Campo,

       CASE 
           WHEN REGEXP_LIKE(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'CD_DOCUMENTO[[:space:]]+IN[[:space:]]*\\(', 'i')
           THEN REGEXP_SUBSTR(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'IN[[:space:]]*\\(([^)]+)\\)', 1, 1, 'i', 1)
       END                           AS Grupo_Docs_Relacionados,

       REGEXP_SUBSTR(
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
           'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
           1, 1, 'i', 1
       )                             AS Documento_Relacionado,

       DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1) AS Script_Acao_Completo

  FROM dbamv.editor_documento ed
 INNER JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
 INNER JOIN dbamv.editor_layout el            ON evd.cd_versao_documento = el.cd_versao_documento
 INNER JOIN dbamv.editor_layout_campo elc     ON el.cd_layout = elc.cd_layout
 INNER JOIN dbamv.editor_campo ec             ON elc.cd_campo = ec.cd_campo
 INNER JOIN dbamv.editor_campo_prop_val ev    ON ec.cd_metadado = ev.cd_campo

 WHERE evd.cd_tipo_versao = 3  -- Apenas versões publicadas
   AND ev.cd_propriedade = 4   -- Focado na Propriedade de Ação
   AND ev.lo_valor IS NOT NULL
   AND REGEXP_LIKE(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'CD_DOCUMENTO[[:space:]](=|IN[[:space:]]\\()', 'i')
   AND ed.cd_documento = :CD_DOCUMENTO
 ORDER BY ec.ds_identificador`,
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
  const { dataDir } = getStoragePaths();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function getData(): Promise<StorageData> {
  const { storageFile, root } = getStoragePaths();
  ensureDataDir();
  console.log('DEBUG: process.cwd():', root);
  console.log('DEBUG: storageFile path:', storageFile);
  
  if (!fs.existsSync(storageFile)) {
    console.log('DEBUG: storageFile not found, returning INITIAL_DATA');
    return INITIAL_DATA;
  }
  
  const fileContent = fs.readFileSync(storageFile, 'utf-8');
  console.log('DEBUG: storageFile size:', fileContent.length);
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
    console.error('DEBUG: JSON parse error in storage.json:', e);
    return INITIAL_DATA;
  }
}

export async function saveData(data: StorageData) {
  const { storageFile } = getStoragePaths();
  ensureDataDir();
  fs.writeFileSync(storageFile, JSON.stringify(data, null, 2));
}

// Para exportação de debug
export const STORAGE_FILE = getStoragePaths().storageFile;
