import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery, testConnection } from '@/lib/oracle';
import { normalizePeriodFilter } from '@/lib/period';
import { sanitizeAuditOwner, type EditorEngineVersion } from '@/lib/similarity';

function buildSimilarityCompareSql(engine: EditorEngineVersion): string {
  const isV3 = engine !== 'V2';
  const ercTable = isV3 ? 'EDITOR.EDITOR_REGISTRO_CAMPO' : 'DBAMV.EDITOR_REGISTRO_CAMPO';
  const ecaTable = isV3 ? 'EDITOR.EDITOR_CAMPO' : 'DBAMV.EDITOR_CAMPO';
  const lobCol = isV3 ? 'ERC.LO_CONTEUDO' : 'ERC.LO_VALOR';
  const prevLobCol = isV3 ? 'ERC2.LO_CONTEUDO' : 'ERC2.LO_VALOR';

  return `
    WITH BaseDoc AS (
        SELECT * FROM (
            SELECT
                ATE.CD_PACIENTE,
                ECA.CD_CAMPO,
                ECA.DS_IDENTIFICADOR,
                NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) AS DH_REF,
                PDC.CD_DOCUMENTO_CLINICO AS CD_DOC_CLINICO,
                PEC.CD_EDITOR_REGISTRO AS CD_REG_ATUAL,
                DBMS_LOB.SUBSTR(${lobCol}, 4000, 1) AS TEXTO_ATUAL
            FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
            JOIN DBAMV.PW_EDITOR_CLINICO PEC ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
            JOIN ${ercTable} ERC ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO
            JOIN ${ecaTable} ECA ON ECA.CD_CAMPO = ERC.CD_CAMPO
            JOIN DBAMV.ATENDIME ATE ON ATE.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
            WHERE PDC.CD_ATENDIMENTO = :CD_ATENDIMENTO
              AND PEC.CD_DOCUMENTO = :CD_DOCUMENTO
              AND UPPER(ECA.DS_IDENTIFICADOR) = UPPER(:IDENTIFICADOR)
              AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
              AND ${lobCol} IS NOT NULL
              AND (
                :DATA_HORA IS NULL
                OR ABS(NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) - TO_DATE(:DATA_HORA, 'YYYY-MM-DD HH24:MI:SS')) <= (5 / 86400)
              )
            ORDER BY
              CASE
                WHEN :DATA_HORA IS NULL THEN 0
                ELSE ABS(NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) - TO_DATE(:DATA_HORA, 'YYYY-MM-DD HH24:MI:SS'))
              END ASC,
              NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) DESC,
              PDC.CD_DOCUMENTO_CLINICO DESC
        )
        WHERE ROWNUM = 1
    )
    SELECT
        B.TEXTO_ATUAL,
        TO_CHAR(B.DH_REF, 'DD/MM/YYYY HH24:MI:SS') AS DATA_HORA_ATUAL,
        B.CD_DOC_CLINICO AS CD_DOCUMENTO_ATUAL,
        B.CD_REG_ATUAL AS CD_REGISTRO_ATUAL,
        (
            SELECT TEXTO_PREV FROM (
                SELECT DBMS_LOB.SUBSTR(${prevLobCol}, 4000, 1) AS TEXTO_PREV
                FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                JOIN ${ercTable} ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                JOIN ${ecaTable} ECA2 ON ECA2.CD_CAMPO = ERC2.CD_CAMPO
                JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                  AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                  AND UPPER(ECA2.DS_IDENTIFICADOR) = UPPER(B.DS_IDENTIFICADOR)
                  AND NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) < B.DH_REF
                  AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                  AND ${prevLobCol} IS NOT NULL
                ORDER BY NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) DESC, PDC2.CD_DOCUMENTO_CLINICO DESC
            ) WHERE ROWNUM = 1
        ) AS TEXTO_ANTERIOR,
        (
            SELECT TO_CHAR(DH_PREV, 'DD/MM/YYYY HH24:MI:SS') FROM (
                SELECT NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) AS DH_PREV
                FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                JOIN ${ercTable} ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                JOIN ${ecaTable} ECA2 ON ECA2.CD_CAMPO = ERC2.CD_CAMPO
                JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                  AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                  AND UPPER(ECA2.DS_IDENTIFICADOR) = UPPER(B.DS_IDENTIFICADOR)
                  AND NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) < B.DH_REF
                  AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                  AND ${prevLobCol} IS NOT NULL
                ORDER BY NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) DESC, PDC2.CD_DOCUMENTO_CLINICO DESC
            ) WHERE ROWNUM = 1
        ) AS DATA_HORA_ANTERIOR,
        (
            SELECT CD_PREV FROM (
                SELECT PDC2.CD_DOCUMENTO_CLINICO AS CD_PREV
                FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                JOIN ${ercTable} ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                JOIN ${ecaTable} ECA2 ON ECA2.CD_CAMPO = ERC2.CD_CAMPO
                JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                  AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                  AND UPPER(ECA2.DS_IDENTIFICADOR) = UPPER(B.DS_IDENTIFICADOR)
                  AND NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) < B.DH_REF
                  AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                  AND ${prevLobCol} IS NOT NULL
                ORDER BY NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) DESC, PDC2.CD_DOCUMENTO_CLINICO DESC
            ) WHERE ROWNUM = 1
        ) AS CD_DOCUMENTO_ANTERIOR,
        (
            SELECT CD_REG_PREV FROM (
                SELECT PEC2.CD_EDITOR_REGISTRO AS CD_REG_PREV
                FROM DBAMV.PW_DOCUMENTO_CLINICO PDC2
                JOIN DBAMV.PW_EDITOR_CLINICO PEC2 ON PEC2.CD_DOCUMENTO_CLINICO = PDC2.CD_DOCUMENTO_CLINICO
                JOIN ${ercTable} ERC2 ON ERC2.CD_REGISTRO = PEC2.CD_EDITOR_REGISTRO
                JOIN ${ecaTable} ECA2 ON ECA2.CD_CAMPO = ERC2.CD_CAMPO
                JOIN DBAMV.ATENDIME ATE2 ON ATE2.CD_ATENDIMENTO = PDC2.CD_ATENDIMENTO
                WHERE ATE2.CD_PACIENTE = B.CD_PACIENTE
                  AND PEC2.CD_DOCUMENTO = :CD_DOCUMENTO
                  AND UPPER(ECA2.DS_IDENTIFICADOR) = UPPER(B.DS_IDENTIFICADOR)
                  AND NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) < B.DH_REF
                  AND PDC2.TP_STATUS IN ('FECHADO', 'ASSINADO')
                  AND ${prevLobCol} IS NOT NULL
                ORDER BY NVL(PDC2.DH_FECHAMENTO, PDC2.DH_CRIACAO) DESC, PDC2.CD_DOCUMENTO_CLINICO DESC
            ) WHERE ROWNUM = 1
        ) AS CD_REGISTRO_ANTERIOR
    FROM BaseDoc B
  `;
}

// Validacao rigorosa de seguranca para queries personalizadas (Cloudflare Security Pattern)
function validateSafeSqlQuery(sql: string): { safe: boolean; reason?: string } {
  // 1. Remover comentarios SQL (-- e /* ... */) para evitar evasao de filtros
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  // 2. Deve ser exclusivamente query de leitura (SELECT ou WITH)
  if (!/^(SELECT|WITH)\b/i.test(cleanSql)) {
    return {
      safe: false,
      reason: 'Apenas consultas de leitura (SELECT ou WITH) sao permitidas nesta API.'
    };
  }

  // 3. Nao deve conter multiplos statements encadeados
  const withoutTrailingSemicolon = cleanSql.replace(/;+\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    return {
      safe: false,
      reason: 'Execucao de multiplos comandos SQL encadeados e bloqueada por seguranca.'
    };
  }

  // 4. Proibir comandos DDL, DML, transacionais e procedural
  const forbiddenKeywords = [
    /\bDROP\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\b/i,
    /\bUPDATE\b/i,
    /\bINSERT\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bMERGE\b/i,
    /\bEXECUTE\b/i,
    /\bEXEC\b/i,
    /\bBEGIN\b/i,
    /\bDECLARE\b/i,
    /\bCALL\b/i,
    /\bLOCK\b/i,
    /\bRENAME\b/i,
  ];

  for (const pattern of forbiddenKeywords) {
    if (pattern.test(cleanSql)) {
      return {
        safe: false,
        reason: 'Operacao destrutiva, DDL/DML ou procedural bloqueada por seguranca.'
      };
    }
  }

  // 5. Proibir acesso a pacotes de rede/arquivo e esquemas administrativos do Oracle
  const forbiddenAdminObjects = [
    /\bSYS\./i,
    /\bSYSTEM\./i,
    /\bDBA_/i,
    /\bV\$/i,
    /\bGV\$/i,
    /\bALL_USERS\b/i,
    /\bUTL_FILE\b/i,
    /\bUTL_HTTP\b/i,
    /\bUTL_TCP\b/i,
    /\bDBMS_SCHEDULER\b/i,
    /\bDBMS_LOB\b/i,
    /\bDBMS_SQL\b/i,
  ];

  for (const pattern of forbiddenAdminObjects) {
    if (pattern.test(cleanSql)) {
      return {
        safe: false,
        reason: 'Acesso a objetos administrativos ou pacotes de sistema do Oracle e restrito.'
      };
    }
  }

  return { safe: true };
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = await getData();

  const connection = data.connections.find(c => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    if (body.type === 'TEST') {
      const result = await testConnection(connection);
      return NextResponse.json(result);
    }

    // Busca a query correspondente no storage
    let sql: string;
    let isPredefined = true;

    if (body.query === 'PROFILE') {
      sql = (body.version === 'V3' ? (data.profileQueryV3 || data.profileQuery) : data.profileQuery);
    } else if (body.query === 'METADATA') {
      sql = (body.version === 'V3' ? (data.docMetadataQueryV3 || data.docMetadataQuery) : data.docMetadataQuery);
    } else if (body.query === 'ACTIONS') {
      sql = (body.version === 'V3' ? (data.docActionsQueryV3 || data.docActionsQuery) : data.docActionsQuery);
    } else if (body.query === 'RULES' || body.query === 'DOC_RULES') {
      sql = body.version === 'V2'
        ? (data.docRulesQuery || '')
        : (data.docRulesQueryV3 || data.docActionsQueryV3 || data.docActionsQuery);
    } else if (body.query === 'FIELDS' || body.query === 'DOC_FIELDS') {
      if (body.version === 'V2') {
        sql = `
          SELECT ec.cd_campo                                              AS "CD_CAMPO",
                 ec.ds_identificador                                      AS "DS_IDENTIFICADOR",
                 ec.ds_campo                                              AS "DS_CAMPO",
                 ec.cd_metadado                                           AS "CD_METADADO",
                 CASE WHEN UPPER(ec.sn_ativo) = 'S' THEN 1 ELSE 0 END     AS "SN_ATIVO",
                 ec.cd_tipo_visualizacao                                  AS "CD_TIPO_VISUALIZACAO",
                 NVL(etv.ds_tipo_visualizacao, 'Desconhecido')            AS "DS_TIPO_VISUALIZACAO",
                 el.cd_layout                                             AS "CD_LAYOUT",
                 etl.cd_tipo_layout                                       AS "CD_TIPO_LAYOUT",
                 NVL(etl.ds_tipo_layout, 'Layout Padrão')                 AS "DS_TIPO_LAYOUT",
                 evd.vl_versao                                            AS "VL_VERSAO",
                 CASE evd.cd_tipo_versao
                   WHEN 3 THEN 'PUBLISHED'
                   WHEN 1 THEN 'EDITABLE'
                   WHEN 2 THEN 'HISTORY'
                   ELSE 'INACTIVE'
                 END                                                      AS "TP_VERSAO",
                 CASE WHEN evd.cd_tipo_versao = 3 THEN 1 ELSE 0 END       AS "SN_PUBLICADO",
                 (
                   SELECT COUNT(DISTINCT erc.cd_regra)
                     FROM dbamv.editor_regra_campo erc
                    WHERE erc.cd_campo = ec.cd_campo
                 )                                                        AS "QTD_REGRAS"
            FROM dbamv.editor_documento ed
            JOIN dbamv.editor_versao_documento evd ON evd.cd_documento = ed.cd_documento
            JOIN dbamv.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
            JOIN dbamv.editor_tipo_layout etl      ON etl.cd_tipo_layout = el.cd_tipo_layout
            JOIN dbamv.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
            JOIN dbamv.editor_campo ec             ON ec.cd_campo = elc.cd_campo
            LEFT JOIN dbamv.editor_tipo_visualizacao etv ON etv.cd_tipo_visualizacao = ec.cd_tipo_visualizacao
           WHERE ed.cd_documento = :CD_DOCUMENTO
             AND etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
             AND (
               evd.cd_tipo_versao IN (1, 3)
               OR evd.vl_versao = (
                 SELECT MAX(evd2.vl_versao)
                   FROM dbamv.editor_versao_documento evd2
                  WHERE evd2.cd_documento = ed.cd_documento
               )
             )
           ORDER BY evd.vl_versao DESC, el.cd_tipo_layout, ec.ds_identificador
        `;
      } else {
        sql = `
          SELECT ec.cd_campo                                              AS "CD_CAMPO",
                 ec.ds_identificador                                      AS "DS_IDENTIFICADOR",
                 ec.ds_campo                                              AS "DS_CAMPO",
                 ec.cd_metadado                                           AS "CD_METADADO",
                 ec.sn_ativo                                              AS "SN_ATIVO",
                 ec.cd_tipo_visualizacao                                  AS "CD_TIPO_VISUALIZACAO",
                 NVL(etv.ds_tipo_visualizacao, 'Desconhecido')             AS "DS_TIPO_VISUALIZACAO",
                 el.cd_layout                                             AS "CD_LAYOUT",
                 etl.cd_tipo_layout                                       AS "CD_TIPO_LAYOUT",
                 NVL(etl.ds_tipo_layout, 'Layout Padrão')                 AS "DS_TIPO_LAYOUT",
                 evd.vl_versao                                            AS "VL_VERSAO",
                 evd.tp_versao                                            AS "TP_VERSAO",
                 evd.sn_publicado                                         AS "SN_PUBLICADO",
                 (
                   SELECT COUNT(DISTINCT erc.cd_regra)
                     FROM editor.editor_regra_campo erc
                    WHERE erc.cd_campo = ec.cd_campo
                 )                                                        AS "QTD_REGRAS"
            FROM editor.editor_documento ed
            JOIN editor.editor_versao_documento evd ON evd.cd_documento = ed.cd_documento
            JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
            JOIN editor.editor_tipo_layout etl      ON etl.cd_tipo_layout = el.cd_tipo_layout
            JOIN editor.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
            JOIN editor.editor_campo ec             ON ec.cd_campo = elc.cd_campo
            LEFT JOIN editor.editor_tipo_visualizacao etv ON etv.cd_tipo_visualizacao = ec.cd_tipo_visualizacao
           WHERE ed.cd_documento = :CD_DOCUMENTO
           ORDER BY NVL(evd.sn_publicado, 0) DESC, evd.vl_versao DESC, el.cd_tipo_layout, ec.ds_identificador
        `;
      }
    } else if (body.query === 'AMBULATORY_PROFILES') {
      sql = data.ambulatoryProfilesQuery;
    } else if (body.query === 'AMBULATORY_PROFILE_DETAILS') {
      sql = data.ambulatoryProfileDetailsQuery;
    } else if (body.query === 'SIMILARIDADE' || body.query === 'SIMILARITY_SEARCH') {
      const owner = sanitizeAuditOwner(data.auditSchemaOwner);
      const hasEmpresaFilter = Boolean(body.params?.CD_EMPRESA);
      const empresaClause = hasEmpresaFilter ? 'AND ATE.CD_MULTI_EMPRESA = :CD_EMPRESA' : '';
      sql = `
        SELECT
            A.CD_ATENDIMENTO AS ATENDIMENTO,
            A.CD_DOCUMENTO AS DOCUMENTO,
            A.DS_DOCUMENTO AS NOME_DOCUMENTO,
            A.IDENTIFICADOR_FILTRO AS IDENTIFICADOR,
            TO_CHAR(A.DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') AS DATA_HORA_ISO,
            A.DH_FECHAMENTO AS DATA_HORA,
            A.CD_PRESTADOR AS PRESTADOR,
            P.NM_PRESTADOR AS NOME_PRESTADOR,
            A.LEITO,
            A.UNIDADE,
            A.GRAU_SIMILARIDADE AS SCORE,
            ATE.CD_MULTI_EMPRESA AS CD_EMPRESA,
            ME.DS_MULTI_EMPRESA AS NOME_EMPRESA
        FROM ${owner}.TB_AUDITORIA_SIMILARIDADE A
        LEFT JOIN DBAMV.PRESTADOR P
          ON P.CD_PRESTADOR = A.CD_PRESTADOR
        LEFT JOIN DBAMV.ATENDIME ATE
          ON ATE.CD_ATENDIMENTO = A.CD_ATENDIMENTO
        LEFT JOIN DBAMV.MULTI_EMPRESAS ME
          ON ME.CD_MULTI_EMPRESA = ATE.CD_MULTI_EMPRESA
        WHERE A.CD_DOCUMENTO = :CD_DOCUMENTO
          AND UPPER(A.IDENTIFICADOR_FILTRO) = UPPER(:IDENTIFICADOR)
          AND A.DH_FECHAMENTO BETWEEN TO_DATE(:DATA_INI, 'YYYY-MM-DD') AND TO_DATE(:DATA_FIM, 'YYYY-MM-DD') + 1
          ${empresaClause}
        ORDER BY A.CD_ATENDIMENTO DESC, A.DH_FECHAMENTO DESC
      `;
    } else if (body.query === 'SIMILARITY_COMPARE') {
      const targetEngine: EditorEngineVersion = body.version === 'V2' ? 'V2' : 'V3';
      sql = buildSimilarityCompareSql(targetEngine);
    } else if (body.query === 'DOCUMENTOS' || body.query === 'V3' || body.query === 'V2') {
      const isV3 = body.version === 'V3' || body.query === 'V3';
      sql = isV3 ? (data.activeQueryV3 || data.activeQuery) : data.activeQuery;
    } else if (body.query && typeof body.query === 'string') {
      sql = body.query;
      isPredefined = false;
    } else {
      sql = (body.version === 'V3') ? (data.activeQueryV3 || data.activeQuery) : data.activeQuery;
    }

    if (!sql) {
      return NextResponse.json({ error: 'Query SQL não encontrada.' }, { status: 400 });
    }

    // Se for query personalizada dinâmica do cliente, submeter à trava de segurança
    if (!isPredefined) {
      const validation = validateSafeSqlQuery(sql);
      if (!validation.safe) {
        console.warn(`[Security Alert] Query bloqueada em /api/oracle/execute: ${validation.reason}`);
        return NextResponse.json({ error: validation.reason }, { status: 403 });
      }
    }

    // Usa bind variables nomeados do oracledb — elimina SQL Injection.
    const rawBinds = body.params && typeof body.params === 'object' ? { ...body.params } : {};
    if (body.query === 'SIMILARIDADE' || body.query === 'SIMILARITY_SEARCH') {
      if (!rawBinds.CD_EMPRESA) {
        delete rawBinds.CD_EMPRESA;
      }
    }
    const binds = rawBinds;
    const forceRefresh = body.forceRefresh === true || body.force === true;
    const ttlSeconds = typeof body.ttlSeconds === 'number' ? body.ttlSeconds : 600; // 10 minutos padrão para consultas de leitura
    const period = normalizePeriodFilter(
      body.period ?? { days: body.periodDays, startDate: body.startDate, endDate: body.endDate }
    );

    let rows: any[];
    if (body.query === 'SIMILARITY_COMPARE') {
      const compareBinds = {
        CD_ATENDIMENTO: binds.CD_ATENDIMENTO,
        CD_DOCUMENTO: binds.CD_DOCUMENTO,
        IDENTIFICADOR: binds.IDENTIFICADOR,
        DATA_HORA: binds.DATA_HORA || null,
      };
      const primaryEngine: EditorEngineVersion = body.version === 'V2' ? 'V2' : 'V3';
      const fallbackEngine: EditorEngineVersion = primaryEngine === 'V3' ? 'V2' : 'V3';

      try {
        rows = await executeQuery(connection, sql, compareBinds, { ttlSeconds, forceRefresh, period });
      } catch (primaryErr) {
        try {
          rows = await executeQuery(
            connection,
            buildSimilarityCompareSql(fallbackEngine),
            compareBinds,
            { ttlSeconds, forceRefresh, period }
          );
        } catch {
          throw primaryErr;
        }
      }

      if (rows.length === 0) {
        try {
          const fallbackRows = await executeQuery(
            connection,
            buildSimilarityCompareSql(fallbackEngine),
            compareBinds,
            { ttlSeconds, forceRefresh, period }
          );
          if (fallbackRows.length > 0) {
            rows = fallbackRows;
          }
        } catch {
          // Ignore fallback errors when primary engine succeeded with 0 rows
        }
      }
    } else {
      rows = await executeQuery(connection, sql, binds, { ttlSeconds, forceRefresh, period });
    }
    return NextResponse.json({ rows, cached: !forceRefresh });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
