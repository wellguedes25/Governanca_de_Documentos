import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';
import { DEFAULT_SQL_QUERIES } from '@/lib/default-queries';
import { isDemoConnection, buildDemoVersionCompare } from '@/lib/demo-mock';
import { computeVersionDiff, extractReferencedDocs } from '@/lib/version-diff';
import {
  groupMetadataByVersion,
  getVersionLifecycleMeta,
  type VersionMetadataRow,
} from '@/lib/version-status';
import type {
  VersionCompareResponse,
  VersionFieldSnapshot,
  VersionRuleSnapshot,
  VersionSqlActionSnapshot,
  VersionSummary,
} from '@/types/version-diff.types';

const COMPARE_CACHE_TTL = 300;

function parseVersionNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function isValidDocId(docId: string): boolean {
  return /^[A-Za-z0-9_-]{1,32}$/.test(docId);
}

/**
 * Legacy POST handler used by DocumentGraph.tsx when comparing two V2 versions
 * via { docId, vA, vB }.
 */
async function handleLegacyGraphCompare(docId: string, vA: unknown, vB: unknown) {
  const data = await getData();
  const activeConn = data.connections.find((c) => c.id === data.activeConnectionId);

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa.' }, { status: 400 });
  }

  const fieldsQuery = `
    SELECT
        evd.vl_versao as VERSAO,
        ec.cd_campo as CD_CAMPO,
        ec.ds_identificador as IDENTIFICADOR,
        ec.ds_campo as NOME_CAMPO
    FROM dbamv.editor_versao_documento evd
    JOIN dbamv.editor_layout el ON el.cd_versao_documento = evd.cd_versao_documento
    JOIN dbamv.editor_layout_campo elc ON elc.cd_layout = el.cd_layout
    JOIN dbamv.editor_campo ec ON ec.cd_campo = elc.cd_campo
    JOIN dbamv.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
    WHERE evd.cd_documento = :DOC_ID
    AND etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
    AND evd.vl_versao IN (:VA, :VB)
  `;

  const rulesQuery = `
    SELECT
        evd.vl_versao as VERSAO,
        er.cd_regra as CD_REGRA,
        er.ds_regra as NOME_REGRA
    FROM dbamv.editor_versao_documento evd
    JOIN dbamv.editor_layout el ON el.cd_versao_documento = evd.cd_versao_documento
    JOIN dbamv.editor_layout_regra elr ON elr.cd_layout = el.cd_layout
    JOIN dbamv.editor_regra er ON er.cd_regra = elr.cd_regra
    JOIN dbamv.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
    WHERE evd.cd_documento = :DOC_ID
    AND etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
    AND evd.vl_versao IN (:VA, :VB)
  `;

  const [fieldsData, rulesData] = await Promise.all([
    executeQuery(activeConn, fieldsQuery, { DOC_ID: docId, VA: vA, VB: vB }, { ttlSeconds: COMPARE_CACHE_TTL }),
    executeQuery(activeConn, rulesQuery, { DOC_ID: docId, VA: vA, VB: vB }, { ttlSeconds: COMPARE_CACHE_TTL }),
  ]);

  return NextResponse.json({
    fieldsA: fieldsData.filter((f) => Number(f.VERSAO) === Number(vA)),
    fieldsB: fieldsData.filter((f) => Number(f.VERSAO) === Number(vB)),
    rulesA: rulesData.filter((r) => Number(r.VERSAO) === Number(vA)),
    rulesB: rulesData.filter((r) => Number(r.VERSAO) === Number(vB)),
  });
}

async function handleV3VersionCompare(params: {
  docId: string;
  base?: number;
  target?: number;
  engine?: string;
}) {
  const engine = (params.engine || 'V3').toUpperCase();
  if (engine === 'V2') {
    return NextResponse.json(
      {
        error: 'A comparação detalhada de versões está disponível atualmente apenas para documentos do Editor 3.0 (V3).',
        unsupportedEngine: true,
      },
      { status: 400 }
    );
  }

  if (!params.docId || !isValidDocId(params.docId)) {
    return NextResponse.json({ error: 'Parâmetro docId inválido ou ausente.' }, { status: 400 });
  }

  const data = await getData();
  const activeConn = data.connections.find((c) => c.id === data.activeConnectionId);

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa.' }, { status: 400 });
  }

  if (isDemoConnection(activeConn)) {
    return NextResponse.json(buildDemoVersionCompare(params.docId, params.base, params.target));
  }

  const metadataSql = data.docMetadataQueryV3 || DEFAULT_SQL_QUERIES.docMetadataQueryV3;
  const metadataRows = (await executeQuery(
    activeConn,
    metadataSql,
    { CD_DOCUMENTO: params.docId },
    { ttlSeconds: COMPARE_CACHE_TTL }
  )) as VersionMetadataRow[];

  if (!metadataRows || metadataRows.length === 0) {
    return NextResponse.json(
      { error: `Nenhuma versão encontrada para o documento #${params.docId} no Editor 3.0 (V3).` },
      { status: 404 }
    );
  }

  const groupedVersions = groupMetadataByVersion(metadataRows);
  const versions: VersionSummary[] = groupedVersions.map((gv) => {
    const meta = getVersionLifecycleMeta(gv.lifecycle, 'V3');
    return {
      versionNumber: gv.versionNumber,
      versionId: gv.versionId,
      lifecycle: gv.lifecycle,
      label: meta.label,
      badgeLabel: meta.badgeLabel,
      tpVersao: gv.tpVersao ?? null,
      snPublicado: gv.lifecycle === 'published' ? 1 : 0,
      fieldsCount: gv.totalFields,
      rulesCount: gv.totalRules,
      layouts: gv.layouts.map((l) => l.layoutName),
    };
  });

  const docName =
    String(metadataRows[0]?.DESCRICAO_DOCUMENTO || '').trim() || `Documento #${params.docId}`;
  const docIdentifier = String(metadataRows[0]?.IDENTIFICADOR_DOCUMENTO || '').trim();

  // Pick default target (published or latest) and base (most recent history < target, or previous version)
  const targetVersion =
    (params.target !== undefined
      ? versions.find((v) => v.versionNumber === params.target)
      : undefined) ??
    versions.find((v) => v.lifecycle === 'published') ??
    versions[0] ??
    null;

  const baseVersion =
    (params.base !== undefined
      ? versions.find((v) => v.versionNumber === params.base)
      : undefined) ??
    versions.find(
      (v) =>
        v.lifecycle === 'history' &&
        targetVersion !== null &&
        v.versionNumber < targetVersion.versionNumber
    ) ??
    versions.find(
      (v) =>
        targetVersion !== null &&
        v.versionNumber < targetVersion.versionNumber
    ) ??
    versions.find(
      (v) => targetVersion !== null && v.versionNumber !== targetVersion.versionNumber
    ) ??
    versions[0] ??
    null;

  if (versions.length < 2 || !baseVersion || !targetVersion) {
    const emptyDiff = computeVersionDiff({
      baseFields: [],
      targetFields: [],
      baseRules: [],
      targetRules: [],
      baseSqlActions: [],
      targetSqlActions: [],
    });

    const singleVersionResponse: VersionCompareResponse = {
      docId: params.docId,
      docName,
      docIdentifier,
      engine: 'V3',
      versions,
      baseVersion,
      targetVersion,
      ...emptyDiff,
      warnings: ['Este documento possui apenas uma versão cadastrada no Editor 3.0.'],
    };
    return NextResponse.json(singleVersionResponse);
  }

  const fieldsSql = `
    SELECT evd.vl_versao                                      AS "VL_VERSAO",
           ec.cd_campo                                        AS "CD_CAMPO",
           ec.cd_metadado                                     AS "CD_METADADO",
           ec.ds_identificador                                AS "DS_IDENTIFICADOR",
           ec.ds_campo                                        AS "DS_CAMPO",
           NVL(ec.sn_ativo, 0)                                AS "SN_ATIVO",
           NVL(etv.ds_tipo_visualizacao, 'Desconhecido')      AS "DS_TIPO_VISUALIZACAO",
           NVL(etl.cd_tipo_layout, 0)                         AS "CD_TIPO_LAYOUT",
           NVL(etl.ds_tipo_layout, 'Layout Padrão')           AS "DS_TIPO_LAYOUT"
      FROM editor.editor_versao_documento evd
      JOIN editor.editor_layout el           ON el.cd_versao_documento = evd.cd_versao_documento
      LEFT JOIN editor.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
      JOIN editor.editor_layout_campo elc    ON elc.cd_layout = el.cd_layout
      JOIN editor.editor_campo ec            ON ec.cd_campo = elc.cd_campo
      LEFT JOIN editor.editor_tipo_visualizacao etv ON etv.cd_tipo_visualizacao = ec.cd_tipo_visualizacao
     WHERE evd.cd_documento = :CD_DOCUMENTO
       AND evd.vl_versao IN (:BASE_VER, :TARGET_VER)
       AND (etl.ds_identificador IS NULL OR etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE'))
     ORDER BY evd.vl_versao DESC, NVL(etl.cd_tipo_layout, 0), ec.ds_identificador
  `;

  const rulesSql = `
    SELECT evd.vl_versao                                      AS "VL_VERSAO",
           er.cd_regra                                        AS "CD_REGRA",
           er.num_ordem                                       AS "NUM_ORDEM",
           er.ds_identificador                                AS "DS_REGRA",
           NVL(er.ativa, 0)                                   AS "ATIVA",
           NVL(etr.ds_identificador, 'AÇÃO')                  AS "TIPO_REGRA",
           er.ds_alerta                                       AS "DS_ALERTA",
           NVL(etl.cd_tipo_layout, 0)                         AS "CD_TIPO_LAYOUT",
           NVL(etl.ds_tipo_layout, 'Layout Padrão')           AS "DS_TIPO_LAYOUT",
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
           )                                                  AS "CONDICAO",
           (
             SELECT LISTAGG(ec_sub.ds_identificador, ', ') WITHIN GROUP (ORDER BY ec_sub.ds_identificador)
               FROM editor.editor_regra_campo erc_sub
               JOIN editor.editor_campo ec_sub ON erc_sub.cd_campo = ec_sub.cd_campo
              WHERE erc_sub.cd_regra = er.cd_regra
           )                                                  AS "CAMPOS_AFETADOS",
           (
             SELECT DBMS_LOB.SUBSTR(erpv_sub.lo_valor, 4000, 1)
               FROM editor.editor_regra_prop_val erpv_sub
              WHERE erpv_sub.cd_regra = er.cd_regra
                AND erpv_sub.cd_propriedade IN (4, 36)
                AND erpv_sub.lo_valor IS NOT NULL
                AND ROWNUM = 1
           )                                                  AS "SCRIPT"
      FROM editor.editor_versao_documento evd
      JOIN editor.editor_layout el           ON el.cd_versao_documento = evd.cd_versao_documento
      LEFT JOIN editor.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
      JOIN editor.editor_regra er            ON er.cd_layout = el.cd_layout
      LEFT JOIN editor.editor_tipo_regra etr ON er.cd_tipo_regra = etr.cd_tipo_regra
     WHERE evd.cd_documento = :CD_DOCUMENTO
       AND evd.vl_versao IN (:BASE_VER, :TARGET_VER)
       AND (etl.ds_identificador IS NULL OR etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE'))
     ORDER BY evd.vl_versao DESC, NVL(etl.cd_tipo_layout, 0), er.num_ordem ASC, er.cd_regra ASC
  `;

  const sqlActionsSql = `
    SELECT DISTINCT
           evd.vl_versao                                      AS "VL_VERSAO",
           NVL(etl.cd_tipo_layout, 0)                         AS "CD_TIPO_LAYOUT",
           NVL(etl.ds_tipo_layout, 'Layout Padrão')           AS "DS_TIPO_LAYOUT",
           ec.cd_campo                                        AS "CD_CAMPO",
           ec.cd_metadado                                     AS "CD_METADADO",
           ec.ds_identificador                                AS "DS_IDENTIFICADOR",
           ec.ds_campo                                        AS "NOME_CAMPO",
           ev.cd_propriedade                                  AS "CODIGO_PROPRIEDADE",
           DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1)              AS "SCRIPT"
      FROM editor.editor_versao_documento evd
      JOIN editor.editor_layout el           ON el.cd_versao_documento = evd.cd_versao_documento
      LEFT JOIN editor.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
      JOIN editor.editor_layout_campo elc    ON elc.cd_layout = el.cd_layout
      JOIN editor.editor_campo ec            ON ec.cd_campo = elc.cd_campo
      JOIN editor.editor_campo_prop_val ev   ON ev.cd_campo = NVL(ec.cd_metadado, ec.cd_campo)
     WHERE evd.cd_documento = :CD_DOCUMENTO
       AND evd.vl_versao IN (:BASE_VER, :TARGET_VER)
       AND (etl.ds_identificador IS NULL OR etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE'))
       AND ev.cd_propriedade = 4
       AND ev.lo_valor IS NOT NULL
     ORDER BY evd.vl_versao DESC, NVL(etl.cd_tipo_layout, 0), ec.ds_identificador
  `;

  const binds = {
    CD_DOCUMENTO: params.docId,
    BASE_VER: baseVersion.versionNumber,
    TARGET_VER: targetVersion.versionNumber,
  };

  const [rawFields, rawRules, rawSqlActions] = await Promise.all([
    executeQuery(activeConn, fieldsSql, binds, { ttlSeconds: COMPARE_CACHE_TTL }),
    executeQuery(activeConn, rulesSql, binds, { ttlSeconds: COMPARE_CACHE_TTL }),
    executeQuery(activeConn, sqlActionsSql, binds, { ttlSeconds: COMPARE_CACHE_TTL }),
  ]);

  const mapField = (r: Record<string, unknown>): VersionFieldSnapshot => ({
    cdCampo: Number(r.CD_CAMPO ?? 0),
    cdMetadado:
      r.CD_METADADO !== null && r.CD_METADADO !== undefined && r.CD_METADADO !== ''
        ? Number(r.CD_METADADO)
        : null,
    dsIdentificador: String(r.DS_IDENTIFICADOR ?? ''),
    dsCampo: String(r.DS_CAMPO ?? ''),
    dsTipoVisualizacao: String(r.DS_TIPO_VISUALIZACAO ?? 'Desconhecido'),
    snAtivo: Number(r.SN_ATIVO ?? 0),
    cdTipoLayout: Number(r.CD_TIPO_LAYOUT ?? 0),
    dsTipoLayout: String(r.DS_TIPO_LAYOUT ?? 'Layout Padrão'),
  });

  const mapRule = (r: Record<string, unknown>): VersionRuleSnapshot => ({
    cdRegra: Number(r.CD_REGRA ?? 0),
    numOrdem:
      r.NUM_ORDEM !== null && r.NUM_ORDEM !== undefined && r.NUM_ORDEM !== ''
        ? Number(r.NUM_ORDEM)
        : null,
    dsRegra: String(r.DS_REGRA ?? ''),
    ativa: Number(r.ATIVA ?? 0),
    tipoRegra: String(r.TIPO_REGRA ?? ''),
    dsAlerta: r.DS_ALERTA !== null && r.DS_ALERTA !== undefined ? String(r.DS_ALERTA) : null,
    condicao: r.CONDICAO !== null && r.CONDICAO !== undefined ? String(r.CONDICAO) : null,
    camposAfetados:
      r.CAMPOS_AFETADOS !== null && r.CAMPOS_AFETADOS !== undefined
        ? String(r.CAMPOS_AFETADOS)
        : null,
    script: r.SCRIPT !== null && r.SCRIPT !== undefined ? String(r.SCRIPT) : null,
    cdTipoLayout: Number(r.CD_TIPO_LAYOUT ?? 0),
    dsTipoLayout: String(r.DS_TIPO_LAYOUT ?? 'Layout Padrão'),
  });

  const mapSqlAction = (r: Record<string, unknown>): VersionSqlActionSnapshot => {
    const script = r.SCRIPT !== null && r.SCRIPT !== undefined ? String(r.SCRIPT) : '';
    return {
      cdCampo: Number(r.CD_CAMPO ?? 0),
      cdMetadado:
        r.CD_METADADO !== null && r.CD_METADADO !== undefined && r.CD_METADADO !== ''
          ? Number(r.CD_METADADO)
          : null,
      dsIdentificador: String(r.DS_IDENTIFICADOR ?? ''),
      nomeCampo: String(r.NOME_CAMPO ?? ''),
      cdPropriedade: Number(r.CODIGO_PROPRIEDADE ?? 4),
      script,
      cdTipoLayout: Number(r.CD_TIPO_LAYOUT ?? 0),
      dsTipoLayout: String(r.DS_TIPO_LAYOUT ?? 'Layout Padrão'),
      docsRelacionados: extractReferencedDocs(script),
    };
  };

  const baseVer = baseVersion.versionNumber;
  const targetVer = targetVersion.versionNumber;

  const diffResult = computeVersionDiff({
    baseFields: rawFields.filter((r) => Number(r.VL_VERSAO) === baseVer).map(mapField),
    targetFields: rawFields.filter((r) => Number(r.VL_VERSAO) === targetVer).map(mapField),
    baseRules: rawRules.filter((r) => Number(r.VL_VERSAO) === baseVer).map(mapRule),
    targetRules: rawRules.filter((r) => Number(r.VL_VERSAO) === targetVer).map(mapRule),
    baseSqlActions: rawSqlActions.filter((r) => Number(r.VL_VERSAO) === baseVer).map(mapSqlAction),
    targetSqlActions: rawSqlActions
      .filter((r) => Number(r.VL_VERSAO) === targetVer)
      .map(mapSqlAction),
  });

  const warnings: string[] = [];
  if (baseVer === targetVer) {
    warnings.push('Versão Base e Versão Alvo selecionadas são iguais.');
  }

  const response: VersionCompareResponse = {
    docId: params.docId,
    docName,
    docIdentifier,
    engine: 'V3',
    versions,
    baseVersion,
    targetVersion,
    ...diffResult,
    warnings,
  };

  return NextResponse.json(response);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = (searchParams.get('docId') || '').trim();
    const base = parseVersionNumber(searchParams.get('base'));
    const target = parseVersionNumber(searchParams.get('target'));
    const engine = searchParams.get('engine') || 'V3';

    return await handleV3VersionCompare({ docId, base, target, engine });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao comparar versões do documento.';
    console.error('Error in GET /api/documentos/compare:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const docId = String(body?.docId ?? '').trim();

    if (!docId) {
      return NextResponse.json({ error: 'docId é obrigatório.' }, { status: 400 });
    }

    // Preserve legacy DocumentGraph.tsx contract when vA & vB are passed without base/target
    if (
      body?.vA !== undefined &&
      body?.vB !== undefined &&
      body?.base === undefined &&
      body?.target === undefined
    ) {
      return await handleLegacyGraphCompare(docId, body.vA, body.vB);
    }

    return await handleV3VersionCompare({
      docId,
      base: parseVersionNumber(body?.base),
      target: parseVersionNumber(body?.target),
      engine: body?.engine || 'V3',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao comparar versões do documento.';
    console.error('Error in POST /api/documentos/compare:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
