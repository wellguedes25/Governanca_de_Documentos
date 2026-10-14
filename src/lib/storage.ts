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

export interface HospitalMapping {
  id: number;
  nome: string;
  sigla: string;
  ativo: boolean;
}

export interface StorageData {
  connections: DbConnection[];
  activeConnectionId: string | null;
  activeQuery: string;
  activeQueryV3: string;
  profileQuery: string;
  profileQueryV3?: string;
  oracleClientPath: string;
  kpiQueries: {
    total: string;
    prod24h: string;
    assinados: string;
  };
  kpiQueriesV3?: {
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
    volumeTurno: string;
    slaAssinatura: string;
  };
  analyticQueriesV3?: {
    top10: string;
    idle: string;
    volume3m: string;
    unitAdherence: string;
    unitInactivity: string;
    volumeTurno: string;
    slaAssinatura: string;
  };
  docMetadataQuery: string;
  docMetadataQueryV3?: string;
  docActionsQuery: string;
  docActionsQueryV3?: string;
  ambulatoryProfilesQuery: string;
  ambulatoryProfileDetailsQuery: string;
  enabledQueries: Record<string, boolean>;
  customCards: CustomCard[];
  cardSettings: Record<string, { title?: string; icon?: string; color?: string }>;
  docMappings: DocMapping[];
  reportBaseUrl?: string;
  auditDays?: number;
  auditDocId?: string | number;
  hospitalsMapping?: HospitalMapping[];
}

export const INITIAL_DATA: StorageData = {
  connections: [],
  activeConnectionId: null,
  activeQuery: 'SELECT CD_DOCUMENTO AS "CÓDIGO", NM_TITULO AS "NOME", COUNT(1) AS "TOTAL", MAX(DH_CRIACAO) AS "ÚLTIMO USO", /* DYNAMIC_HOSPITALS_PIVOT */ FROM (SELECT DISTINCT ED.CD_DOCUMENTO, UPPER(ED.DS_DOCUMENTO) AS NM_TITULO, A.CD_MULTI_EMPRESA, PDC.DH_CRIACAO FROM DBAMV.PW_EDITOR_CLINICO PEC JOIN DBAMV.EDITOR_DOCUMENTO ED ON ED.CD_DOCUMENTO = PEC.CD_DOCUMENTO JOIN DBAMV.PW_DOCUMENTO_CLINICO PDC ON PDC.CD_DOCUMENTO_CLINICO = PEC.CD_DOCUMENTO_CLINICO JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO WHERE ED.CD_TIPO_ITEM = 13 AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 90) GROUP BY CD_DOCUMENTO, NM_TITULO ORDER BY NM_TITULO',
  activeQueryV3: 'SELECT CD_DOCUMENTO AS "CÓDIGO", NM_TITULO AS "NOME", COUNT(1) AS "TOTAL", MAX(DH_CRIACAO) AS "ÚLTIMO USO", /* DYNAMIC_HOSPITALS_PIVOT */ FROM (SELECT DISTINCT ED.CD_DOCUMENTO, UPPER(ED.DS_DOCUMENTO) AS NM_TITULO, A.CD_MULTI_EMPRESA, PDC.DH_CRIACAO FROM DBAMV.PW_EDITOR_CLINICO PEC JOIN EDITOR.EDITOR_DOCUMENTO ED ON ED.CD_DOCUMENTO = PEC.CD_DOCUMENTO JOIN DBAMV.PW_DOCUMENTO_CLINICO PDC ON PDC.CD_DOCUMENTO_CLINICO = PEC.CD_DOCUMENTO_CLINICO JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO WHERE ED.CD_TIPO_ITEM = 13 AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 90) GROUP BY CD_DOCUMENTO, NM_TITULO ORDER BY NM_TITULO',
  profileQuery: 'SELECT DISTINCT CD_DOCUMENTO, NM_TITULO, DS_PERFIL_AMBULATORIAL, EMPRESA FROM (SELECT PMP.NM_VALOR AS CD_DOCUMENTO, PM.NM_TITULO, PA.DS_PERFIL_AMBULATORIAL, /* DYNAMIC_HOSPITALS_DECODE */ FROM DBAMV.PERFIL_AMBULATORIAL PA JOIN DBAMV.PW_PERFIL_MODULO PM ON PA.CD_PERFIL_AMBULATORIAL = PM.CD_PERFIL_AMBULATORIAL JOIN DBAMV.PW_PERFIL_MODULO_PARAMETRO PMP ON PM.CD_PERFIL_MODULO = PMP.CD_PERFIL_MODULO LEFT JOIN DBAMV.PERFIL_AMBULATORIAL_EMPRESA PAE ON PA.CD_PERFIL_AMBULATORIAL = PAE.CD_PERFIL_AMBULATORIAL WHERE PMP.CD_PARAMETRO = \'CD_DOCUMENTO\' AND PA.SN_ATIVO = \'S\' AND PA.TP_PERFIL = \'SIS\' AND PMP.NM_VALOR = :CD_DOCUMENTO UNION ALL SELECT TB_OBJETO.CD_DOCUMENTO, PM.NM_TITULO, PA.DS_PERFIL_AMBULATORIAL, /* DYNAMIC_HOSPITALS_DECODE */ FROM DBAMV.PERFIL_AMBULATORIAL PA JOIN DBAMV.PW_PERFIL_MODULO PM ON PA.CD_PERFIL_AMBULATORIAL = PM.CD_PERFIL_AMBULATORIAL JOIN DBAMV.PW_PERFIL_MODULO_PARAMETRO PMP ON PM.CD_PERFIL_MODULO = PMP.CD_PERFIL_MODULO LEFT JOIN DBAMV.PERFIL_AMBULATORIAL_EMPRESA PAE ON PA.CD_PERFIL_AMBULATORIAL = PAE.CD_PERFIL_AMBULATORIAL JOIN (SELECT NM_VALOR AS CD_DOCUMENTO, TO_CHAR(PTDC.CD_OBJETO) AS CD_OBJETO FROM DBAMV.PW_TIPO_DOCUMENTO_CONSULTA PTDC JOIN DBAMV.PW_TIPO_DOCUMENTO_MODULO PTDM ON PTDC.CD_TIPO_DOCUMENTO_CONSULTA = PTDM.CD_TIPO_DOCUMENTO_CONSULTA JOIN DBAMV.PW_TIPO_DOCUMENTO_MODULO_PARAM PTDMP ON PTDM.CD_TIPO_DOCUMENTO_MODULO = PTDMP.CD_TIPO_DOCUMENTO_MODULO WHERE PTDMP.CD_PARAMETRO = \'CD_DOCUMENTO\' AND NM_VALOR = :CD_DOCUMENTO) TB_OBJETO ON PMP.NM_VALOR = TB_OBJETO.CD_OBJETO WHERE PA.SN_ATIVO = \'S\' AND PA.TP_PERFIL = \'SIS\')',
  profileQueryV3: 'SELECT DISTINCT CD_DOCUMENTO, NM_TITULO, DS_PERFIL_AMBULATORIAL, EMPRESA FROM (SELECT PMP.NM_VALOR AS CD_DOCUMENTO, PM.NM_TITULO, PA.DS_PERFIL_AMBULATORIAL, /* DYNAMIC_HOSPITALS_DECODE */ FROM DBAMV.PERFIL_AMBULATORIAL PA JOIN DBAMV.PW_PERFIL_MODULO PM ON PA.CD_PERFIL_AMBULATORIAL = PM.CD_PERFIL_AMBULATORIAL JOIN DBAMV.PW_PERFIL_MODULO_PARAMETRO PMP ON PM.CD_PERFIL_MODULO = PMP.CD_PERFIL_MODULO LEFT JOIN DBAMV.PERFIL_AMBULATORIAL_EMPRESA PAE ON PA.CD_PERFIL_AMBULATORIAL = PAE.CD_PERFIL_AMBULATORIAL WHERE PMP.CD_PARAMETRO IN (\'CD_DOCUMENTO_EDITOR_3\', \'CD_DOCUMENTO\') AND PA.SN_ATIVO = \'S\' AND PA.TP_PERFIL = \'SIS\' AND PMP.NM_VALOR = :CD_DOCUMENTO UNION ALL SELECT TB_OBJETO.CD_DOCUMENTO, PM.NM_TITULO, PA.DS_PERFIL_AMBULATORIAL, /* DYNAMIC_HOSPITALS_DECODE */ FROM DBAMV.PERFIL_AMBULATORIAL PA JOIN DBAMV.PW_PERFIL_MODULO PM ON PA.CD_PERFIL_AMBULATORIAL = PM.CD_PERFIL_AMBULATORIAL JOIN DBAMV.PW_PERFIL_MODULO_PARAMETRO PMP ON PM.CD_PERFIL_MODULO = PMP.CD_PERFIL_MODULO LEFT JOIN DBAMV.PERFIL_AMBULATORIAL_EMPRESA PAE ON PA.CD_PERFIL_AMBULATORIAL = PAE.CD_PERFIL_AMBULATORIAL JOIN (SELECT NM_VALOR AS CD_DOCUMENTO, TO_CHAR(PTDC.CD_OBJETO) AS CD_OBJETO FROM DBAMV.PW_TIPO_DOCUMENTO_CONSULTA PTDC JOIN DBAMV.PW_TIPO_DOCUMENTO_MODULO PTDM ON PTDC.CD_TIPO_DOCUMENTO_CONSULTA = PTDM.CD_TIPO_DOCUMENTO_CONSULTA JOIN DBAMV.PW_TIPO_DOCUMENTO_MODULO_PARAM PTDMP ON PTDM.CD_TIPO_DOCUMENTO_MODULO = PTDMP.CD_TIPO_DOCUMENTO_MODULO WHERE PTDMP.CD_PARAMETRO IN (\'CD_DOCUMENTO_EDITOR_3\', \'CD_DOCUMENTO\') AND NM_VALOR = :CD_DOCUMENTO) TB_OBJETO ON PMP.NM_VALOR = TB_OBJETO.CD_OBJETO WHERE PA.SN_ATIVO = \'S\' AND PA.TP_PERFIL = \'SIS\')',
  ambulatoryProfilesQuery: `SELECT pa.cd_perfil_ambulatorial AS Cod_Perfil, pa.ds_perfil_ambulatorial AS Nome_Perfil, pa.cd_especialidade AS Cod_Especialidade, esp.ds_especialid AS Especialidade, pa.cd_sistema AS Sistema, pa.tp_porta_entrada AS Porta_Entrada, pa.tp_atendimento AS Tipo_Atendimento, pa.cd_tip_presta AS Cod_Tipo_Prestador, tp.nm_tip_presta AS Nome_Tipo_Prestador, pa.cd_setor AS Cod_Setor, seto.nm_setor AS Nome_Setor, pa.cd_multi_empresa AS Empresa_Fixa FROM dbamv.perfil_ambulatorial pa LEFT JOIN dbamv.especialid esp ON esp.cd_especialid = pa.cd_especialidade LEFT JOIN dbamv.tip_presta tp ON tp.cd_tip_presta = pa.cd_tip_presta LEFT JOIN dbamv.setor seto ON seto.cd_setor = pa.cd_setor WHERE pa.sn_ativo = 'S' AND pa.tp_perfil = 'SIS'`,
  ambulatoryProfileDetailsQuery: `SELECT pm.cd_perfil_modulo AS Cod_Perfil_Modulo, pm.cd_modulo AS Modulo, pm.cd_perfil_modulo_pai AS Cod_Perfil_Modulo_Pai, pm.nm_titulo AS Titulo, pm.cd_perfil_modulo_agrupador AS Agrupador, pmp.cd_perfil_modulo_parametro AS Cod_Mod_Parametro, pmp.cd_modulo AS Modulo_Parametro, pmp.cd_parametro AS Parametro, pmp.cd_perfil_modulo AS Cod_Perfil_Mod_Origem, CASE WHEN pmp.cd_parametro = 'CD_OBJETO' AND po.nm_objeto IS NOT NULL THEN pmp.nm_valor || ' - ' || po.nm_objeto WHEN pmp.cd_parametro = 'CD_DOCUMENTO' AND ed.ds_documento IS NOT NULL THEN pmp.nm_valor || ' - ' || ed.ds_documento ELSE pmp.nm_valor END AS Valor_Parametro, pmp.ds_valor AS Desc_Valor_Parametro FROM dbamv.perfil_ambulatorial pa INNER JOIN dbamv.pw_perfil_modulo pm ON pa.cd_perfil_ambulatorial = pm.cd_perfil_ambulatorial INNER JOIN dbamv.pw_perfil_modulo_parametro pmp ON pm.cd_perfil_modulo = pmp.cd_perfil_modulo LEFT JOIN dbamv.pagu_objeto po ON pmp.cd_parametro = 'CD_OBJETO' AND TO_CHAR(po.cd_objeto) = pmp.nm_valor LEFT JOIN dbamv.editor_documento ed ON pmp.cd_parametro = 'CD_DOCUMENTO' AND TO_CHAR(ed.cd_documento) = pmp.nm_valor WHERE pa.sn_ativo = 'S' AND pa.tp_perfil = 'SIS' AND pa.cd_perfil_ambulatorial = :CD_PERFIL`,
  oracleClientPath: 'C:\\orant\\Client\\instantclient_23_0',
  hospitalsMapping: [],
  kpiQueries: {
    total: 'SELECT COUNT(*) as TOTAL FROM DBAMV.PW_DOCUMENTO_CLINICO',
    prod24h: "SELECT COUNT(*) as TOTAL FROM DBAMV.PW_DOCUMENTO_CLINICO WHERE DH_CRIACAO >= SYSDATE - 1",
    assinados: "SELECT COUNT(*) as TOTAL FROM DBAMV.PW_DOCUMENTO_CLINICO WHERE TP_STATUS = 'ASSINADO' AND DH_CRIACAO >= SYSDATE - 30"
  },
  kpiQueriesV3: {
    total: '',
    prod24h: '',
    assinados: ''
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
     WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
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
     WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
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
 WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
   AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
   AND ED.CD_TIPO_ITEM = 13
   AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)`,
    unitAdherence: `SELECT A.CD_MULTI_EMPRESA,
       /* DYNAMIC_HOSPITALS_DECODE(A.CD_MULTI_EMPRESA) */ AS SIGLA_UNIDADE,
       COUNT(PDC.CD_DOCUMENTO_CLINICO) AS QTD_TOTAL_PREENCHIDA
  FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
  JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
  JOIN EDITOR_DOCUMENTO ED ON TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)
  JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
 WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
   AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
   AND ED.CD_TIPO_ITEM = 13
   AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)
 GROUP BY A.CD_MULTI_EMPRESA
 ORDER BY QTD_TOTAL_PREENCHIDA DESC`,
    unitInactivity: `SELECT CAST(ED.CD_DOCUMENTO AS NUMBER) AS CD_DOCUMENTO,
       UPPER(ED.DS_DOCUMENTO) AS DS_DOCUMENTO,
       /* DYNAMIC_HOSPITALS_DECODE(A.CD_MULTI_EMPRESA) */ AS SIGLA_UNIDADE,
       MAX(PDC.DH_CRIACAO) AS ULTIMA_DATA_USO,
       TRUNC(SYSDATE) - TRUNC(MAX(PDC.DH_CRIACAO)) AS DIAS_SEM_USO
  FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
  JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
  JOIN EDITOR_DOCUMENTO ED ON TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)
  JOIN DBAMV.ATENDIME A ON PDC.CD_ATENDIMENTO = A.CD_ATENDIMENTO
 WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
   AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
   AND ED.CD_TIPO_ITEM = 13
   AND PDC.DH_CRIACAO >= ADD_MONTHS(SYSDATE, -3)
 GROUP BY CAST(ED.CD_DOCUMENTO AS NUMBER),
          UPPER(ED.DS_DOCUMENTO),
          A.CD_MULTI_EMPRESA
 ORDER BY DIAS_SEM_USO DESC`,
    volumeTurno: `SELECT 
    CASE 
        WHEN TO_NUMBER(TO_CHAR(PDC.DH_CRIACAO, 'HH24')) BETWEEN 7 AND 12 THEN 'Manhã'
        WHEN TO_NUMBER(TO_CHAR(PDC.DH_CRIACAO, 'HH24')) BETWEEN 13 AND 18 THEN 'Tarde'
        WHEN TO_NUMBER(TO_CHAR(PDC.DH_CRIACAO, 'HH24')) BETWEEN 19 AND 23 THEN 'Noite'
        ELSE 'Madrugada'
    END AS TURNO,
    COUNT(1) AS TOTAL
FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
WHERE A.CD_MULTI_EMPRESA = :ID
  AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 30
GROUP BY 
    CASE 
        WHEN TO_NUMBER(TO_CHAR(PDC.DH_CRIACAO, 'HH24')) BETWEEN 7 AND 12 THEN 'Manhã'
        WHEN TO_NUMBER(TO_CHAR(PDC.DH_CRIACAO, 'HH24')) BETWEEN 13 AND 18 THEN 'Tarde'
        WHEN TO_NUMBER(TO_CHAR(PDC.DH_CRIACAO, 'HH24')) BETWEEN 19 AND 23 THEN 'Noite'
        ELSE 'Madrugada'
    END`,
    slaAssinatura: `SELECT 
    CASE 
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 2 THEN '0-2h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 6 THEN '2-6h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 12 THEN '6-12h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 24 THEN '12-24h'
        ELSE 'Mais de 24h'
    END AS FAIXA_SLA,
    COUNT(1) AS TOTAL
FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
WHERE A.CD_MULTI_EMPRESA = :ID
  AND PDC.TP_STATUS = 'ASSINADO'
  AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 30
GROUP BY 
    CASE 
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 2 THEN '0-2h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 6 THEN '2-6h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 12 THEN '6-12h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 24 THEN '12-24h'
        ELSE 'Mais de 24h'
    END`,
  },
  analyticQueriesV3: {
    top10: '',
    idle: '',
    volume3m: '',
    unitAdherence: '',
    unitInactivity: '',
    volumeTurno: '',
    slaAssinatura: '',
  },
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
       edl.cd_layout_rodape         AS Codigo_Layout_Rodape,
       (SELECT COUNT(DISTINCT elr.cd_regra) FROM dbamv.editor_layout_regra elr WHERE elr.cd_layout = edl.cd_layout) AS Quantidade_Regras,
       (SELECT COUNT(DISTINCT elc.cd_campo) FROM dbamv.editor_layout_campo elc WHERE elc.cd_layout = edl.cd_layout) AS Quantidade_Campos
  FROM dbamv.editor_documento edo
 INNER JOIN dbamv.editor_versao_documento evd ON edo.cd_documento = evd.cd_documento
 INNER JOIN dbamv.editor_tipo_versao etv      ON etv.cd_tipo_versao = evd.cd_tipo_versao
 INNER JOIN dbamv.editor_layout edl           ON evd.cd_versao_documento = edl.cd_versao_documento
 INNER JOIN dbamv.editor_tipo_layout etl      ON edl.cd_tipo_layout = etl.cd_tipo_layout
 WHERE etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
   AND edo.cd_documento = :CD_DOCUMENTO
 ORDER BY Codigo_Documento`,
  docMetadataQueryV3: `SELECT DISTINCT
       edo.cd_documento             AS "CODIGO_DOCUMENTO",
       edo.ds_documento             AS "DESCRICAO_DOCUMENTO",
       edo.ds_identificador         AS "IDENTIFICADOR_DOCUMENTO",
       evd.cd_versao_documento      AS "CODIGO_VERSAO_DOCUMENTO",
       etl.cd_tipo_layout           AS "CODIGO_TIPO_LAYOUT",
       etl.ds_identificador         AS "IDENTIFICADOR_LAYOUT",
       etl.ds_tipo_layout           AS "DESCRICAO_TIPO_LAYOUT",
       evd.vl_versao                AS "VALOR_VERSAO",
       evd.sn_ativo                 AS "STATUS_ATIVO",
       CASE WHEN evd.sn_ativo = 1 THEN 3 ELSE 1 END AS "CODIGO_TIPO_VERSAO",
       CASE WHEN evd.sn_ativo = 1 THEN 'Publicado' ELSE 'Rascunho' END AS "DESCRICAO_TIPO_VERSAO",
       edl.cd_layout_cabecalho      AS "CODIGO_LAYOUT_CABECALHO",
       (SELECT evdo.cd_documento
          FROM editor.editor_layout el
         INNER JOIN editor.editor_versao_documento evdo
            ON el.cd_versao_documento = evdo.cd_versao_documento
         WHERE el.cd_layout = edl.cd_layout_cabecalho) AS "DOCUMENTO_CABECALHO",
       edl.cd_layout_rodape         AS "CODIGO_LAYOUT_RODAPE",
       (SELECT COUNT(DISTINCT er.cd_regra) FROM editor.editor_regra er WHERE er.cd_layout = edl.cd_layout) AS "QUANTIDADE_REGRAS",
       (SELECT COUNT(DISTINCT elc.cd_campo) FROM editor.editor_layout_campo elc WHERE elc.cd_layout = edl.cd_layout) AS "QUANTIDADE_CAMPOS"
  FROM editor.editor_documento edo
 INNER JOIN editor.editor_versao_documento evd ON edo.cd_documento = evd.cd_documento
 INNER JOIN editor.editor_layout edl           ON evd.cd_versao_documento = edl.cd_versao_documento
 INNER JOIN editor.editor_tipo_layout etl      ON edl.cd_tipo_layout = etl.cd_tipo_layout
 WHERE etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
   AND edo.cd_documento = :CD_DOCUMENTO
 ORDER BY evd.vl_versao DESC, etl.cd_tipo_layout ASC`,
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
  docActionsQueryV3: `SELECT DISTINCT
       ed.cd_documento               AS "CODIGO_ORIGEM",
       ed.ds_documento               AS "DESCRICAO_ORIGEM",
       ec.cd_campo                   AS "CODIGO_METADADO",
       ec.ds_campo                   AS "NOME_CAMPO",
       ec.ds_identificador           AS "IDENTIFICADOR_CAMPO",
       CASE 
           WHEN REGEXP_LIKE(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'CD_DOCUMENTO[[:space:]]+IN[[:space:]]*\\(', 'i')
           THEN REGEXP_SUBSTR(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'IN[[:space:]]*\\(([^)]+)\\)', 1, 1, 'i', 1)
       END                           AS "GRUPO_DOCS_RELACIONADOS",
       REGEXP_SUBSTR(
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
           'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
           1, 1, 'i', 1
       )                             AS "DOCUMENTO_RELACIONADO",
       DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1) AS "SCRIPT_ACAO_COMPLETO"
  FROM editor.editor_documento ed
 INNER JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
 INNER JOIN editor.editor_layout el            ON evd.cd_versao_documento = el.cd_versao_documento
 INNER JOIN editor.editor_layout_campo elc     ON el.cd_layout = elc.cd_layout
 INNER JOIN editor.editor_campo ec             ON elc.cd_campo = ec.cd_campo
 INNER JOIN editor.editor_campo_prop_val ev    ON ec.cd_campo = ev.cd_campo
 WHERE evd.sn_ativo = 1
   AND ev.cd_propriedade = 4
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
    },
    { 
      id: '1048', 
      name: 'Evolução Médica - 1048', 
      fields: [
        { id: 'EVOLUCAO', name: 'Evolução Clínica' }
      ] 
    },
    { 
      id: '772', 
      name: 'Evolução Médica - 772', 
      fields: [
        { id: 'EVOLUCAO', name: 'Evolução Clínica' }
      ] 
    }
  ],
  reportBaseUrl: 'http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId=',
  auditDays: 15,
  auditDocId: "916,1048,772"
};

function ensureDataDir() {
  const { dataDir } = getStoragePaths();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function getData(): Promise<StorageData> {
  const { storageFile } = getStoragePaths();
  ensureDataDir();

  if (!fs.existsSync(storageFile)) {
    return INITIAL_DATA;
  }
  
  const fileContent = fs.readFileSync(storageFile, 'utf-8');
  try {
    const data = JSON.parse(fileContent);
    return {
      ...INITIAL_DATA,
      ...data,
      activeQueryV3: data.activeQueryV3 || INITIAL_DATA.activeQueryV3,
      profileQuery: data.profileQuery || INITIAL_DATA.profileQuery,
      profileQueryV3: data.profileQueryV3 || INITIAL_DATA.profileQueryV3,
      docMetadataQueryV3: data.docMetadataQueryV3 || INITIAL_DATA.docMetadataQueryV3,
      docActionsQueryV3: data.docActionsQueryV3 || INITIAL_DATA.docActionsQueryV3,
      kpiQueriesV3: data.kpiQueriesV3 || INITIAL_DATA.kpiQueriesV3,
      analyticQueriesV3: data.analyticQueriesV3 || INITIAL_DATA.analyticQueriesV3,
      ambulatoryProfilesQuery: data.ambulatoryProfilesQuery || INITIAL_DATA.ambulatoryProfilesQuery,
      enabledQueries: {
        ...INITIAL_DATA.enabledQueries,
        ...(data.enabledQueries || {})
      },
      cardSettings: data.cardSettings || {},
      customCards: data.customCards || [],
      docMappings: (data.docMappings || INITIAL_DATA.docMappings).map((m: DocMapping) => ({
        ...m,
        fields: m.fields.map((f: FieldMapping | string) => typeof f === 'string' ? { id: f, name: f } : f)
      })),
      reportBaseUrl: data.reportBaseUrl || INITIAL_DATA.reportBaseUrl,
      auditDays: data.auditDays !== undefined ? Number(data.auditDays) : INITIAL_DATA.auditDays,
      auditDocId: data.auditDocId !== undefined ? data.auditDocId : INITIAL_DATA.auditDocId
    };
  } catch (e) {
    console.error('[Storage] Erro ao parsear storage.json:', e);
    return INITIAL_DATA;
  }
}

import { encrypt } from './encryption';

export async function saveData(data: StorageData) {
  const { storageFile } = getStoragePaths();
  ensureDataDir();
  
  // Clone data to avoid mutating the in-memory object directly
  const dataToSave = JSON.parse(JSON.stringify(data));
  if (dataToSave.connections) {
    dataToSave.connections.forEach((conn: DbConnection) => {
      if (conn.password && !conn.password.startsWith('encrypted:')) {
        conn.password = encrypt(conn.password);
      }
    });
  }

  fs.writeFileSync(storageFile, JSON.stringify(dataToSave, null, 2));
}

// Para exportação de debug
export const STORAGE_FILE = getStoragePaths().storageFile;
