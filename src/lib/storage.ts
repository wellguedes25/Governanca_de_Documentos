import fs from 'fs';
import path from 'path';
import {
  DEMO_CONNECTION,
  DEMO_CONNECTION_ID,
  DEFAULT_DEMO_HOSPITALS,
  DEMO_DOC_MAPPINGS,
  DEMO_AUDIT_DOC_ID,
  DEMO_REPORT_BASE_URL,
} from './demo-mock';
import { DEFAULT_SQL_QUERIES } from './default-queries';

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
  engine?: 'V2' | 'V3';
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
  hospitalQueries?: {
    kpis: string;
    detailTable: string;
    top5: string;
  };
  hospitalQueriesV3?: {
    kpis: string;
    detailTable: string;
    top5: string;
  };
  similarityQuery?: string;
  docMetadataQuery: string;
  docMetadataQueryV3?: string;
  docActionsQuery: string;
  docActionsQueryV3?: string;
  docRulesQuery?: string;
  docRulesQueryV3?: string;
  ambulatoryProfilesQuery: string;
  ambulatoryProfileDetailsQuery: string;
  enabledQueries: Record<string, boolean>;
  customCards: CustomCard[];
  cardSettings: Record<string, { title?: string; icon?: string; color?: string }>;
  docMappings: DocMapping[];
  reportBaseUrl?: string;
  auditDays?: number;
  auditDocId?: string | number;
  auditSchemaOwner?: string;
  hospitalsMapping?: HospitalMapping[];
}

export const INITIAL_DATA: StorageData = {
  connections: [],
  activeConnectionId: null,
  activeQuery: DEFAULT_SQL_QUERIES.activeQuery,
  activeQueryV3: DEFAULT_SQL_QUERIES.activeQueryV3,
  profileQuery: DEFAULT_SQL_QUERIES.profileQuery,
  profileQueryV3: DEFAULT_SQL_QUERIES.profileQueryV3,
  ambulatoryProfilesQuery: `SELECT pa.cd_perfil_ambulatorial AS Cod_Perfil,
       pa.ds_perfil_ambulatorial AS Nome_Perfil,
       pa.cd_especialidade       AS Cod_Especialidade,
       esp.ds_especialid         AS Especialidade,
       pa.cd_sistema             AS Sistema,
       pa.tp_porta_entrada       AS Porta_Entrada,
       pa.tp_atendimento         AS Tipo_Atendimento,
       pa.cd_tip_presta          AS Cod_Tipo_Prestador,
       tp.nm_tip_presta          AS Nome_Tipo_Prestador,
       pa.cd_setor               AS Cod_Setor,
       seto.nm_setor             AS Nome_Setor,
       pa.cd_multi_empresa       AS Empresa_Fixa,
       (
         SELECT LISTAGG(e.emp_id || '::' || TRIM(NVL(me.ds_multi_empresa, 'Empresa ' || e.emp_id)), '|')
                WITHIN GROUP (ORDER BY e.emp_id)
           FROM (
             SELECT pa.cd_multi_empresa AS emp_id FROM dual WHERE pa.cd_multi_empresa IS NOT NULL
             UNION
             SELECT pae.cd_multi_empresa AS emp_id
               FROM dbamv.perfil_ambulatorial_empresa pae
              WHERE pae.cd_perfil_ambulatorial = pa.cd_perfil_ambulatorial
                AND pae.cd_multi_empresa IS NOT NULL
           ) e
           LEFT JOIN dbamv.multi_empresas me ON me.cd_multi_empresa = e.emp_id
       )                         AS Empresas_Vinculadas,
       (
         SELECT LISTAGG(t.cd_tip_presta || '::' || TRIM(tp2.nm_tip_presta), '|')
                WITHIN GROUP (ORDER BY TRIM(tp2.nm_tip_presta))
           FROM (
             SELECT pa.cd_tip_presta AS cd_tip_presta FROM dual WHERE pa.cd_tip_presta IS NOT NULL
             UNION
             SELECT pat.cd_tip_presta AS cd_tip_presta
               FROM dbamv.perfil_ambulatorial_tip_prest pat
              WHERE pat.cd_perfil_ambulatorial = pa.cd_perfil_ambulatorial
                AND pat.cd_tip_presta IS NOT NULL
           ) t
           JOIN dbamv.tip_presta tp2 ON tp2.cd_tip_presta = t.cd_tip_presta
       )                         AS Tipos_Prestador
  FROM dbamv.perfil_ambulatorial pa
  LEFT JOIN dbamv.especialid esp ON esp.cd_especialid = pa.cd_especialidade
  LEFT JOIN dbamv.tip_presta tp  ON tp.cd_tip_presta = pa.cd_tip_presta
  LEFT JOIN dbamv.setor seto     ON seto.cd_setor = pa.cd_setor
 WHERE pa.sn_ativo = 'S'
   AND pa.tp_perfil = 'SIS'
 ORDER BY pa.ds_perfil_ambulatorial`,
  ambulatoryProfileDetailsQuery: `SELECT pm.cd_perfil_modulo            AS Cod_Perfil_Modulo,
       pm.cd_modulo                   AS Modulo,
       pm.cd_perfil_modulo_pai        AS Cod_Perfil_Modulo_Pai,
       pm.nr_ordem                    AS Ordem,
       pm.nm_titulo                   AS Titulo,
       pm.cd_perfil_modulo_agrupador  AS Agrupador,
       pmp.cd_perfil_modulo_parametro AS Cod_Mod_Parametro,
       pmp.cd_modulo                  AS Modulo_Parametro,
       pmp.cd_parametro               AS Parametro,
       pmp.cd_perfil_modulo           AS Cod_Perfil_Mod_Origem,
       CASE
         WHEN pmp.cd_parametro IN ('CD_OBJETO', 'CD_OBJETO_COLETA_SINAL_VITAL', 'CD_OBJETO_DIAGNOSTICO_ENFERMAGEM', 'CD_OBJETO_PRESC') AND po.nm_objeto IS NOT NULL
           THEN pmp.nm_valor || ' - ' || po.nm_objeto
         WHEN pmp.cd_parametro IN ('CD_DOCUMENTO', 'CD_DOCUMENTO_OBRIG_TELA') AND ed.ds_documento IS NOT NULL
           THEN pmp.nm_valor || ' - ' || ed.ds_documento
         WHEN pmp.cd_parametro = 'CD_DOCUMENTO_EDITOR_3' AND ed3.ds_documento IS NOT NULL
           THEN pmp.nm_valor || ' - ' || ed3.ds_documento
         ELSE pmp.nm_valor
       END                            AS Valor_Parametro,
       pmp.ds_valor                   AS Desc_Valor_Parametro
  FROM dbamv.perfil_ambulatorial pa
 INNER JOIN dbamv.pw_perfil_modulo pm
    ON pa.cd_perfil_ambulatorial = pm.cd_perfil_ambulatorial
  LEFT JOIN dbamv.pw_perfil_modulo_parametro pmp
    ON pm.cd_perfil_modulo = pmp.cd_perfil_modulo
  LEFT JOIN dbamv.pagu_objeto po
    ON pmp.cd_parametro IN ('CD_OBJETO', 'CD_OBJETO_COLETA_SINAL_VITAL', 'CD_OBJETO_DIAGNOSTICO_ENFERMAGEM', 'CD_OBJETO_PRESC')
   AND TO_CHAR(po.cd_objeto) = pmp.nm_valor
  LEFT JOIN dbamv.editor_documento ed
    ON pmp.cd_parametro IN ('CD_DOCUMENTO', 'CD_DOCUMENTO_OBRIG_TELA')
   AND TO_CHAR(ed.cd_documento) = pmp.nm_valor
  LEFT JOIN editor.editor_documento ed3
    ON pmp.cd_parametro = 'CD_DOCUMENTO_EDITOR_3'
   AND TO_CHAR(ed3.cd_documento) = pmp.nm_valor
 WHERE pa.sn_ativo = 'S'
   AND pa.tp_perfil = 'SIS'
   AND pa.cd_perfil_ambulatorial = :CD_PERFIL
 ORDER BY NVL(pm.nr_ordem, 999999), pm.cd_perfil_modulo, pmp.cd_parametro`,
  oracleClientPath: 'C:\\orant\\Client\\instantclient_23_0',
  hospitalsMapping: [],
  kpiQueries: { ...DEFAULT_SQL_QUERIES.kpiQueries },
  kpiQueriesV3: { ...DEFAULT_SQL_QUERIES.kpiQueriesV3 },
  analyticQueries: { ...DEFAULT_SQL_QUERIES.analyticQueries },
  analyticQueriesV3: { ...DEFAULT_SQL_QUERIES.analyticQueriesV3 },
  hospitalQueries: { ...DEFAULT_SQL_QUERIES.hospitalQueries },
  hospitalQueriesV3: { ...DEFAULT_SQL_QUERIES.hospitalQueriesV3 },
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
       CASE WHEN evd.cd_tipo_versao = 3 THEN 1 ELSE 0 END AS Sn_Publicado,
       CASE evd.cd_tipo_versao
         WHEN 3 THEN 'PUBLISHED'
         WHEN 1 THEN 'EDITABLE'
         WHEN 2 THEN 'HISTORY'
         ELSE 'INACTIVE'
       END                          AS Tp_Versao,
       evd.cd_tipo_versao           AS Codigo_Tipo_Versao,
       CASE evd.cd_tipo_versao
         WHEN 3 THEN 'Publicada'
         WHEN 1 THEN 'Editável'
         WHEN 2 THEN 'Histórico'
         ELSE NVL(etv.ds_tipo_versao, 'Inativa')
       END                          AS Descricao_Tipo_Versao,
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
  LEFT JOIN dbamv.editor_tipo_versao etv      ON etv.cd_tipo_versao = evd.cd_tipo_versao
  LEFT JOIN dbamv.editor_layout edl           ON evd.cd_versao_documento = edl.cd_versao_documento
  LEFT JOIN dbamv.editor_tipo_layout etl      ON edl.cd_tipo_layout = etl.cd_tipo_layout
 WHERE (etl.ds_identificador IS NULL OR etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE'))
   AND edo.cd_documento = :CD_DOCUMENTO
 ORDER BY evd.vl_versao DESC, etl.cd_tipo_layout ASC`,
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
       evd.sn_publicado             AS "SN_PUBLICADO",
       evd.tp_versao                AS "TP_VERSAO",
       CASE
         WHEN evd.sn_publicado = 1 OR UPPER(evd.tp_versao) = 'PUBLISHED' THEN 3
         WHEN UPPER(evd.tp_versao) = 'TEST' THEN 1
         WHEN UPPER(evd.tp_versao) = 'HISTORY' THEN 2
         ELSE 0
       END                          AS "CODIGO_TIPO_VERSAO",
       CASE
         WHEN evd.sn_publicado = 1 OR UPPER(evd.tp_versao) = 'PUBLISHED' THEN 'Publicada'
         WHEN UPPER(evd.tp_versao) = 'TEST' THEN 'Teste'
         WHEN UPPER(evd.tp_versao) = 'HISTORY' THEN 'Histórico'
         ELSE NVL(evd.tp_versao, 'Inativa')
       END                          AS "DESCRICAO_TIPO_VERSAO",
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
  LEFT JOIN editor.editor_layout edl           ON evd.cd_versao_documento = edl.cd_versao_documento
  LEFT JOIN editor.editor_tipo_layout etl      ON edl.cd_tipo_layout = etl.cd_tipo_layout
 WHERE (etl.ds_identificador IS NULL OR etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE'))
   AND edo.cd_documento = :CD_DOCUMENTO
 ORDER BY evd.vl_versao DESC, etl.cd_tipo_layout ASC`,
  docActionsQuery: `SELECT DISTINCT
       ed.cd_documento                       AS "CODIGO_ORIGEM",
       ed.ds_documento                       AS "DESCRICAO_ORIGEM",
       ec.cd_campo                           AS "CODIGO_CAMPO",
       ec.cd_metadado                        AS "CODIGO_METADADO",
       ec.ds_campo                           AS "NOME_CAMPO",
       ec.ds_campo                           AS "DESCRICAO_REGRA",
       ec.ds_identificador                   AS "IDENTIFICADOR_CAMPO",
       ev.cd_propriedade                     AS "CODIGO_PROPRIEDADE",
       REGEXP_SUBSTR(
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
           'CD_DOCUMENTO[[:space:]]+IN[[:space:]]*\(([0-9[:space:],]+)\)',
           1, 1, 'i', 1
       )                                     AS "GRUPO_DOCS_RELACIONADOS",
       REGEXP_SUBSTR(
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
           'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
           1, 1, 'i', 1
       )                                     AS "DOCUMENTO_RELACIONADO",
       DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1) AS "SCRIPT_ACAO_COMPLETO"
  FROM dbamv.editor_documento ed
 INNER JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
 INNER JOIN dbamv.editor_layout el            ON evd.cd_versao_documento = el.cd_versao_documento
 INNER JOIN dbamv.editor_layout_campo elc     ON el.cd_layout = elc.cd_layout
 INNER JOIN dbamv.editor_campo ec             ON elc.cd_campo = ec.cd_campo
 INNER JOIN dbamv.editor_campo_prop_val ev    ON ev.cd_campo = NVL(ec.cd_metadado, ec.cd_campo)
 WHERE evd.cd_tipo_versao = 3
   AND ev.cd_propriedade = 4
   AND ev.lo_valor IS NOT NULL
   AND ed.cd_documento = :CD_DOCUMENTO
 ORDER BY ec.ds_identificador`,
  docActionsQueryV3: `SELECT DISTINCT
       ed.cd_documento                       AS "CODIGO_ORIGEM",
       ed.ds_documento                       AS "DESCRICAO_ORIGEM",
       ec.cd_campo                           AS "CODIGO_CAMPO",
       ec.cd_metadado                        AS "CODIGO_METADADO",
       ec.ds_campo                           AS "NOME_CAMPO",
       ec.ds_campo                           AS "DESCRICAO_REGRA",
       ec.ds_identificador                   AS "IDENTIFICADOR_CAMPO",
       ev.cd_propriedade                     AS "CODIGO_PROPRIEDADE",
       REGEXP_SUBSTR(
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
           'CD_DOCUMENTO[[:space:]]+IN[[:space:]]*\(([0-9[:space:],]+)\)',
           1, 1, 'i', 1
       )                                     AS "GRUPO_DOCS_RELACIONADOS",
       REGEXP_SUBSTR(
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
           'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
           1, 1, 'i', 1
       )                                     AS "DOCUMENTO_RELACIONADO",
       DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1) AS "SCRIPT_ACAO_COMPLETO"
  FROM editor.editor_documento ed
  JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
  JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
  JOIN editor.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
  JOIN editor.editor_campo ec             ON ec.cd_campo = elc.cd_campo
  JOIN editor.editor_campo_prop_val ev    ON ev.cd_campo = NVL(ec.cd_metadado, ec.cd_campo)
 WHERE ed.cd_documento = :CD_DOCUMENTO
   AND ev.cd_propriedade = 4
   AND ev.lo_valor IS NOT NULL
 ORDER BY ec.ds_identificador`,
  docRulesQuery: `SELECT ed.cd_documento                         AS "CD_DOCUMENTO",
       ed.ds_documento                         AS "DS_DOCUMENTO",
       evd.cd_versao_documento                 AS "CD_VERSAO_DOCUMENTO",
       evd.vl_versao                           AS "VL_VERSAO",
       CASE evd.cd_tipo_versao
         WHEN 3 THEN 'PUBLISHED'
         WHEN 1 THEN 'EDITABLE'
         WHEN 2 THEN 'HISTORY'
         ELSE 'INACTIVE'
       END                                     AS "TP_VERSAO",
       CASE WHEN evd.cd_tipo_versao = 3 THEN 1 ELSE 0 END AS "SN_PUBLICADO",
       er.cd_regra                             AS "CD_REGRA",
       elr.nr_ordem                            AS "NUM_ORDEM",
       er.ds_regra                             AS "DS_REGRA",
       CASE WHEN UPPER(er.sn_ativo) = 'S' THEN 1 ELSE 0 END AS "ATIVA",
       etr.ds_identificador                    AS "TIPO_REGRA",
       er.ds_mensagem                          AS "DS_ALERTA",
       (
         SELECT LISTAGG(
                  NVL2(etc.ds_identificador, etc.ds_identificador || ' ', '') ||
                  ec_cond.ds_identificador || ' ' ||
                  NVL(eto.ds_identificador, '') ||
                  NVL2(erc_sub.vl_inicial, ' "' || erc_sub.vl_inicial || '"', '') ||
                  NVL2(erc_sub.vl_final, ' .. "' || erc_sub.vl_final || '"', ''),
                  ' '
                ) WITHIN GROUP (ORDER BY erc_sub.cd_regra_condicao ASC)
           FROM dbamv.editor_regra_condicao erc_sub
           LEFT JOIN dbamv.editor_tipo_conector etc ON erc_sub.cd_tipo_conector = etc.cd_tipo_conector
           LEFT JOIN dbamv.editor_tipo_operacao eto ON erc_sub.cd_tipo_operacao = eto.cd_tipo_operacao
           LEFT JOIN dbamv.editor_campo ec_cond ON erc_sub.cd_campo = ec_cond.cd_campo
          WHERE erc_sub.cd_regra = er.cd_regra
       ) AS "CONDICAO",
       (
         SELECT COUNT(DISTINCT erc_sub.cd_campo)
           FROM dbamv.editor_regra_campo erc_sub
          WHERE erc_sub.cd_regra = er.cd_regra
       ) AS "QTD_CAMPOS",
       (
         SELECT LISTAGG(ec_sub.ds_identificador, ', ') WITHIN GROUP (ORDER BY ec_sub.ds_identificador)
           FROM dbamv.editor_regra_campo erc_sub
           JOIN dbamv.editor_campo ec_sub ON erc_sub.cd_campo = ec_sub.cd_campo
          WHERE erc_sub.cd_regra = er.cd_regra
       ) AS "CAMPOS_AFETADOS",
       er.ds_acao_sql                          AS "SCRIPT"
  FROM dbamv.editor_documento ed
  JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
  JOIN dbamv.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
  JOIN dbamv.editor_layout_regra elr     ON elr.cd_layout = el.cd_layout
  JOIN dbamv.editor_regra er             ON er.cd_regra = elr.cd_regra
  LEFT JOIN dbamv.editor_tipo_regra etr  ON er.cd_tipo_regra = etr.cd_tipo_regra
 WHERE ed.cd_documento = :CD_DOCUMENTO
   AND (
     evd.cd_tipo_versao IN (1, 3)
     OR evd.vl_versao = (
       SELECT MAX(evd2.vl_versao)
         FROM dbamv.editor_versao_documento evd2
        WHERE evd2.cd_documento = ed.cd_documento
     )
   )
 ORDER BY evd.vl_versao DESC, elr.nr_ordem ASC, er.cd_regra ASC`,
  docRulesQueryV3: `SELECT ed.cd_documento                         AS "CD_DOCUMENTO",
       ed.ds_documento                         AS "DS_DOCUMENTO",
       evd.cd_versao_documento                 AS "CD_VERSAO_DOCUMENTO",
       evd.vl_versao                           AS "VL_VERSAO",
       evd.tp_versao                           AS "TP_VERSAO",
       evd.sn_publicado                        AS "SN_PUBLICADO",
       er.cd_regra                             AS "CD_REGRA",
       er.num_ordem                            AS "NUM_ORDEM",
       er.ds_identificador                     AS "DS_REGRA",
       er.ativa                                AS "ATIVA",
       etr.ds_identificador                    AS "TIPO_REGRA",
       er.ds_alerta                            AS "DS_ALERTA",
       (
         SELECT LISTAGG(
                  NVL2(er_conn.ds_identificador, er_conn.ds_identificador || ' ', '') ||
                  ec_cond.ds_identificador || ' ' ||
                  CASE er_op.ds_identificador
                    WHEN 'EQUAL' THEN '='
                    WHEN 'DIFFERENT' THEN '<>'
                    WHEN 'BIGGER' THEN '>'
                    WHEN 'BIGGER_OR_EQUAL' THEN '>='
                    WHEN 'LESSER' THEN '<'
                    WHEN 'LESSER_OR_EQUAL' THEN '<='
                    WHEN 'ISCLICK' THEN 'ao clicar'
                    ELSE er_op.ds_identificador
                  END ||
                  NVL2(erc_sub.valor, ' "' || erc_sub.valor || '"', ''),
                  ' '
                ) WITHIN GROUP (ORDER BY erc_sub.cd_regra_condicao ASC)
           FROM editor.editor_regra_condicao erc_sub
           LEFT JOIN editor.editor_regra_conector er_conn ON erc_sub.cd_conector = er_conn.cd_regra_conector
           LEFT JOIN editor.editor_regra_operador er_op ON erc_sub.cd_operador = er_op.cd_regra_operador
           LEFT JOIN editor.editor_campo ec_cond ON erc_sub.cd_campo = ec_cond.cd_campo
          WHERE erc_sub.cd_regra = er.cd_regra
       ) AS "CONDICAO",
       (
         SELECT COUNT(DISTINCT erc_sub.cd_campo)
           FROM editor.editor_regra_campo erc_sub
          WHERE erc_sub.cd_regra = er.cd_regra
       ) AS "QTD_CAMPOS",
       (
         SELECT LISTAGG(ec_sub.ds_identificador, ', ') WITHIN GROUP (ORDER BY ec_sub.ds_identificador)
           FROM editor.editor_regra_campo erc_sub
           JOIN editor.editor_campo ec_sub ON erc_sub.cd_campo = ec_sub.cd_campo
          WHERE erc_sub.cd_regra = er.cd_regra
       ) AS "CAMPOS_AFETADOS",
       (
         SELECT DBMS_LOB.SUBSTR(erpv_sub.lo_valor, 4000, 1)
           FROM editor.editor_regra_prop_val erpv_sub
          WHERE erpv_sub.cd_regra = er.cd_regra
            AND erpv_sub.cd_propriedade IN (4, 36)
            AND erpv_sub.lo_valor IS NOT NULL
            AND ROWNUM = 1
       ) AS "SCRIPT"
  FROM editor.editor_documento ed
  JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
  JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
  JOIN editor.editor_regra er             ON el.cd_layout = er.cd_layout
  LEFT JOIN editor.editor_tipo_regra etr  ON er.cd_tipo_regra = etr.cd_tipo_regra
 WHERE ed.cd_documento = :CD_DOCUMENTO
 ORDER BY evd.vl_versao DESC, er.num_ordem ASC, er.cd_regra ASC`,
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
  docMappings: [],
  reportBaseUrl: '',
  auditDays: 15,
  auditDocId: '0',
  auditSchemaOwner: 'DBAMV'
};

function isDemoDocMapping(mapping: DocMapping): boolean {
  const idStr = String(mapping?.id ?? '').trim();
  const nameStr = String(mapping?.name ?? '');
  return (
    DEMO_DOC_MAPPINGS.some((demo) => demo.id === idStr) ||
    /\(demo\)|sandbox|fict[ií]cio/i.test(nameStr)
  );
}

function isDemoHospitalMapping(hospital: HospitalMapping): boolean {
  const nameStr = String(hospital?.nome ?? '');
  return (
    hospital?.id === 901 ||
    hospital?.id === 902 ||
    /fict[ií]cio|vale da aurora|serra do mar/i.test(nameStr)
  );
}

function ensureDataDir() {
  const { dataDir } = getStoragePaths();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function withDemoInjected(data: StorageData): StorageData {
  const userConnections = (data.connections || []).filter((c) => c.id !== DEMO_CONNECTION_ID);
  const isDemoActive = data.activeConnectionId === DEMO_CONNECTION_ID;

  if (isDemoActive) {
    return {
      ...data,
      connections: [...userConnections, DEMO_CONNECTION],
      hospitalsMapping: DEFAULT_DEMO_HOSPITALS,
      docMappings: DEMO_DOC_MAPPINGS,
      auditDocId: DEMO_AUDIT_DOC_ID,
      reportBaseUrl: DEMO_REPORT_BASE_URL,
      customCards: [],
    };
  }

  return {
    ...data,
    connections: userConnections,
    hospitalsMapping: (data.hospitalsMapping || []).filter((h) => !isDemoHospitalMapping(h)),
    docMappings: (data.docMappings || []).filter((m) => !isDemoDocMapping(m)),
    auditDocId: data.auditDocId === DEMO_AUDIT_DOC_ID ? '0' : data.auditDocId,
    reportBaseUrl: data.reportBaseUrl === DEMO_REPORT_BASE_URL ? '' : data.reportBaseUrl,
  };
}

function mergeNonEmptyQueries<T extends Record<string, string>>(saved: Partial<T> | undefined, defaults: T): T {
  const result = { ...defaults };
  if (saved) {
    (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
      const val = saved[key];
      if (typeof val === 'string' && val.trim().length > 0) {
        result[key] = val as T[keyof T];
      }
    });
  }
  return result;
}

export async function getData(): Promise<StorageData> {
  const { storageFile } = getStoragePaths();
  ensureDataDir();

  if (!fs.existsSync(storageFile)) {
    return withDemoInjected(INITIAL_DATA);
  }
  
  const fileContent = fs.readFileSync(storageFile, 'utf-8');
  try {
    const data = JSON.parse(fileContent);
    const savedV3Meta = typeof data.docMetadataQueryV3 === 'string' ? data.docMetadataQueryV3 : '';
    const isLegacyV3Meta =
      !savedV3Meta ||
      savedV3Meta.includes('CASE WHEN evd.sn_ativo = 1 THEN 3 ELSE 1 END') ||
      (savedV3Meta.includes('editor.editor_versao_documento') && !savedV3Meta.toLowerCase().includes('sn_publicado'));

    const savedV2Meta = typeof data.docMetadataQuery === 'string' ? data.docMetadataQuery : '';
    const isLegacyV2Meta =
      !savedV2Meta ||
      (savedV2Meta.includes('ORDER BY Codigo_Documento') && !savedV2Meta.toLowerCase().includes('sn_publicado'));

    const savedProfileDetails = typeof data.ambulatoryProfileDetailsQuery === 'string' ? data.ambulatoryProfileDetailsQuery : '';
    const isLegacyProfileDetails =
      !savedProfileDetails ||
      /INNER\s+JOIN\s+dbamv\.pw_perfil_modulo_parametro/i.test(savedProfileDetails) ||
      !savedProfileDetails.toLowerCase().includes('nr_ordem');

    const savedProfilesList = typeof data.ambulatoryProfilesQuery === 'string' ? data.ambulatoryProfilesQuery : '';
    const isLegacyProfilesList =
      !savedProfilesList ||
      !savedProfilesList.toLowerCase().includes('empresas_vinculadas') ||
      !savedProfilesList.toLowerCase().includes('tipos_prestador');

    return withDemoInjected({
      ...INITIAL_DATA,
      ...data,
      activeQueryV3: data.activeQueryV3 || INITIAL_DATA.activeQueryV3,
      profileQuery: data.profileQuery || INITIAL_DATA.profileQuery,
      profileQueryV3: data.profileQueryV3 || INITIAL_DATA.profileQueryV3,
      docMetadataQuery: isLegacyV2Meta ? INITIAL_DATA.docMetadataQuery : savedV2Meta,
      docMetadataQueryV3: isLegacyV3Meta ? INITIAL_DATA.docMetadataQueryV3 : savedV3Meta,
      docActionsQueryV3: data.docActionsQueryV3 || INITIAL_DATA.docActionsQueryV3,
      docRulesQuery: data.docRulesQuery || INITIAL_DATA.docRulesQuery,
      docRulesQueryV3: data.docRulesQueryV3 || INITIAL_DATA.docRulesQueryV3,
      kpiQueries: mergeNonEmptyQueries(data.kpiQueries, INITIAL_DATA.kpiQueries),
      kpiQueriesV3: mergeNonEmptyQueries(data.kpiQueriesV3, INITIAL_DATA.kpiQueriesV3!),
      analyticQueries: mergeNonEmptyQueries(data.analyticQueries, INITIAL_DATA.analyticQueries),
      analyticQueriesV3: mergeNonEmptyQueries(data.analyticQueriesV3, INITIAL_DATA.analyticQueriesV3!),
      hospitalQueries: mergeNonEmptyQueries(data.hospitalQueries, INITIAL_DATA.hospitalQueries!),
      hospitalQueriesV3: mergeNonEmptyQueries(data.hospitalQueriesV3, INITIAL_DATA.hospitalQueriesV3!),
      ambulatoryProfilesQuery: isLegacyProfilesList ? INITIAL_DATA.ambulatoryProfilesQuery : savedProfilesList,
      ambulatoryProfileDetailsQuery: isLegacyProfileDetails ? INITIAL_DATA.ambulatoryProfileDetailsQuery : savedProfileDetails,
      enabledQueries: {
        ...INITIAL_DATA.enabledQueries,
        ...(data.enabledQueries || {})
      },
      cardSettings: data.cardSettings || {},
      customCards: data.customCards || [],
      docMappings: (data.docMappings || INITIAL_DATA.docMappings)
        .map((m: DocMapping) => ({
          ...m,
          fields: m.fields.map((f: FieldMapping | string) => typeof f === 'string' ? { id: f, name: f } : f)
        }))
        .filter((m: DocMapping) => !isDemoDocMapping(m)),
      reportBaseUrl:
        data.reportBaseUrl && data.reportBaseUrl !== DEMO_REPORT_BASE_URL
          ? data.reportBaseUrl
          : INITIAL_DATA.reportBaseUrl,
      similarityQuery: data.similarityQuery || INITIAL_DATA.similarityQuery,
      auditDays: data.auditDays !== undefined ? Number(data.auditDays) : INITIAL_DATA.auditDays,
      auditDocId:
        data.auditDocId !== undefined && data.auditDocId !== DEMO_AUDIT_DOC_ID
          ? data.auditDocId
          : INITIAL_DATA.auditDocId
    });
  } catch (e) {
    console.error('[Storage] Erro ao parsear storage.json:', e);
    return withDemoInjected(INITIAL_DATA);
  }
}

import { encrypt } from './encryption';

export async function saveData(data: StorageData) {
  const { storageFile } = getStoragePaths();
  ensureDataDir();
  
  // Clone data to avoid mutating the in-memory object directly
  const dataToSave = JSON.parse(JSON.stringify(data));
  if (dataToSave.connections) {
    // Keep built-in sandbox connection virtual so it is never persisted as a real credential
    dataToSave.connections = dataToSave.connections.filter(
      (conn: DbConnection) => conn.id !== DEMO_CONNECTION_ID
    );
    dataToSave.connections.forEach((conn: DbConnection) => {
      if (conn.password && !conn.password.startsWith('encrypted:')) {
        conn.password = encrypt(conn.password);
      }
    });
  }

  // Never persist demo/mock entities for real administrators or analysts
  if (Array.isArray(dataToSave.docMappings)) {
    dataToSave.docMappings = dataToSave.docMappings.filter(
      (m: DocMapping) => !isDemoDocMapping(m)
    );
  }
  if (Array.isArray(dataToSave.hospitalsMapping)) {
    dataToSave.hospitalsMapping = dataToSave.hospitalsMapping.filter(
      (h: HospitalMapping) => !isDemoHospitalMapping(h)
    );
  }
  if (dataToSave.auditDocId === DEMO_AUDIT_DOC_ID) {
    dataToSave.auditDocId = '0';
  }
  if (dataToSave.reportBaseUrl === DEMO_REPORT_BASE_URL) {
    dataToSave.reportBaseUrl = '';
  }

  // Never overwrite real hospital/doc configurations on disk with virtual sandbox defaults
  if (dataToSave.activeConnectionId === DEMO_CONNECTION_ID && fs.existsSync(storageFile)) {
    try {
      const existingOnDisk = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
      if (Array.isArray(existingOnDisk.hospitalsMapping)) {
        dataToSave.hospitalsMapping = existingOnDisk.hospitalsMapping;
      }
      if (Array.isArray(existingOnDisk.docMappings)) {
        dataToSave.docMappings = existingOnDisk.docMappings;
      }
      if (existingOnDisk.auditDays !== undefined) {
        dataToSave.auditDays = existingOnDisk.auditDays;
      }
      if (existingOnDisk.auditDocId !== undefined) {
        dataToSave.auditDocId = existingOnDisk.auditDocId;
      }
      if (existingOnDisk.auditSchemaOwner !== undefined) {
        dataToSave.auditSchemaOwner = existingOnDisk.auditSchemaOwner;
      }
      if (existingOnDisk.reportBaseUrl !== undefined) {
        dataToSave.reportBaseUrl = existingOnDisk.reportBaseUrl;
      }
      if (Array.isArray(existingOnDisk.customCards)) {
        dataToSave.customCards = existingOnDisk.customCards;
      }
    } catch {
      // Ignore parse error if existing file is corrupted
    }
  }

  fs.writeFileSync(storageFile, JSON.stringify(dataToSave, null, 2));
}

// Para exportação de debug
export const STORAGE_FILE = getStoragePaths().storageFile;
