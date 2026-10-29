import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery, testConnection } from '@/lib/oracle';

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
      sql = data.docRulesQueryV3 || data.docActionsQueryV3 || data.docActionsQuery;
    } else if (body.query === 'FIELDS' || body.query === 'DOC_FIELDS') {
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
         ORDER BY evd.vl_versao DESC, el.cd_tipo_layout, ec.ds_identificador
      `;
    } else if (body.query === 'AMBULATORY_PROFILES') {
      sql = data.ambulatoryProfilesQuery;
    } else if (body.query === 'AMBULATORY_PROFILE_DETAILS') {
      sql = data.ambulatoryProfileDetailsQuery;
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
    const binds = body.params && typeof body.params === 'object' ? body.params : {};

    const rows = await executeQuery(connection, sql, binds);
    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
