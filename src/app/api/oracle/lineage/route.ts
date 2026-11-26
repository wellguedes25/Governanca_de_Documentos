import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';
import {
  chunkArray,
  computeClusters,
  extractBestContextForDoc,
  extractDocIdsFromSql,
  extractNotExistsBlocks,
  filterByFocusAndDepth,
  hasFieldContentProjection,
  hasHistoryRecordAggregation,
  pruneUnusedLeftJoins,
  resolveSourceFieldsForPair,
  splitTopLevelUnions,
  stripSqlComments,
  upsertLineageFieldItem,
  type DocMapEntry,
} from '@/lib/lineage-parser';
import type {
  ExecutiveEdgeData,
  LineageAvailableDoc,
  LineageDepth,
  LineageDocNodeData,
  LineageEngine,
  LineageFieldItem,
  LineageNodeRole,
  LineageOriginKind,
} from '@/types/lineage.types';

export type {
  ExecutiveEdgeData,
  LineageAvailableDoc,
  LineageClusterSummary,
  LineageDepth,
  LineageDocNodeData,
  LineageEngine,
  LineageFieldItem,
  LineageNodeRole,
  LineageOriginKind,
} from '@/types/lineage.types';

export const dynamic = 'force-dynamic';

interface ScriptQueryRow {
  TARGET_DOC_ID?: number | string;
  TARGET_DOC_NAME?: string;
  TARGET_VERSION?: number;
  TARGET_TP_VERSAO?: string;
  TARGET_FIELD_ID?: number;
  TARGET_METADATA_ID?: number;
  TARGET_FIELD_TAG?: string;
  TARGET_FIELD_NAME?: string;
  RULE_NAME?: string;
  RULE_TYPE?: string;
  SCRIPT_P1?: string | null;
  SCRIPT_P2?: string | null;
  SCRIPT_P3?: string | null;
}

interface DocDetailSafeRow {
  DOC_ID?: number | string;
  CD_DOCUMENTO?: number | string;
  ['CÓDIGO']?: number | string;
  DOC_NAME?: string;
  DS_DOCUMENTO?: string;
  NOME?: string;
  DOC_VERSION?: number;
  VL_VERSAO?: number;
  DOC_TP_VERSAO?: string;
  TP_VERSAO?: string;
  FIELD_ID?: number | string;
  CD_CAMPO?: number | string;
  FIELD_METADATA_ID?: number | string | null;
  CD_METADADO?: number | string | null;
  FIELD_TAG?: string;
  DS_IDENTIFICADOR?: string;
  FIELD_NAME?: string;
  DS_CAMPO?: string;
}

interface RawPairOccurrence {
  sourceDocId: number;
  targetDocId: number;
  targetFieldTag: string;
  targetFieldName: string;
  fullScript: string;
  contextBlock: string;
  isInNotExists: boolean;
  originKind: LineageOriginKind;
  ruleName?: string;
  ruleType?: string;
}

function readDocId(r: DocDetailSafeRow): number {
  return Number(r.DOC_ID ?? r.CD_DOCUMENTO ?? r['CÓDIGO'] ?? 0);
}

function readDocName(r: DocDetailSafeRow, fallback: string): string {
  const val = r.DOC_NAME ?? r.DS_DOCUMENTO ?? r.NOME;
  return val ? String(val).trim() : fallback;
}

function parseDepthParam(raw: string | null): LineageDepth {
  if (raw === '1') return 1;
  if (raw === '2') return 2;
  return 'all';
}

function parseVersionParam(raw: string | null): LineageEngine {
  return raw?.toUpperCase() === 'V2' ? 'V2' : 'V3';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rootDocId = searchParams.get('rootDocId');
  const engine = parseVersionParam(searchParams.get('version'));
  const depth = parseDepthParam(searchParams.get('depth'));
  const force = searchParams.get('force') === 'true' || searchParams.get('forceRefresh') === 'true';

  const data = await getData();
  const connection = data.connections.find((c) => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    // 1. Coleta de ações SQL em campos (Prop 4) + regras SQL de documentos (motor ativo V3 ou V2)
    const actionsSqlV3 = `
      SELECT DISTINCT
             ed.cd_documento                          AS "TARGET_DOC_ID",
             UPPER(ed.ds_documento)                   AS "TARGET_DOC_NAME",
             evd.vl_versao                            AS "TARGET_VERSION",
             evd.tp_versao                            AS "TARGET_TP_VERSAO",
             ec.cd_campo                              AS "TARGET_FIELD_ID",
             ec.cd_metadado                           AS "TARGET_METADATA_ID",
             ec.ds_identificador                      AS "TARGET_FIELD_TAG",
             NVL(ec.ds_campo, ec.ds_identificador)    AS "TARGET_FIELD_NAME",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1)    AS "SCRIPT_P1",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 4001) AS "SCRIPT_P2",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 8001) AS "SCRIPT_P3"
        FROM editor.editor_documento ed
        JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
        JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
        LEFT JOIN editor.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
        JOIN editor.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
        JOIN editor.editor_campo ec             ON ec.cd_campo = elc.cd_campo
        JOIN editor.editor_campo_prop_val ev    ON ev.cd_campo = NVL(ec.cd_metadado, ec.cd_campo)
       WHERE evd.sn_publicado = 1
         AND (etl.ds_identificador IS NULL OR UPPER(etl.ds_identificador) NOT IN ('CABECALHO', 'RODAPE'))
         AND ev.cd_propriedade = 4
         AND ev.lo_valor IS NOT NULL
         AND REGEXP_LIKE(ev.lo_valor, 'CD_DOCUMENTO', 'i')
    `;

    const rulesSqlV3 = `
      SELECT DISTINCT
             ed.cd_documento                            AS "TARGET_DOC_ID",
             UPPER(ed.ds_documento)                     AS "TARGET_DOC_NAME",
             evd.vl_versao                              AS "TARGET_VERSION",
             evd.tp_versao                              AS "TARGET_TP_VERSAO",
             er.ds_identificador                        AS "RULE_NAME",
             etr.ds_identificador                       AS "RULE_TYPE",
             er.ds_identificador                        AS "TARGET_FIELD_TAG",
             er.ds_identificador                        AS "TARGET_FIELD_NAME",
             DBMS_LOB.SUBSTR(erpv.lo_valor, 4000, 1)    AS "SCRIPT_P1",
             DBMS_LOB.SUBSTR(erpv.lo_valor, 4000, 4001) AS "SCRIPT_P2",
             DBMS_LOB.SUBSTR(erpv.lo_valor, 4000, 8001) AS "SCRIPT_P3"
        FROM editor.editor_documento ed
        JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
        JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
        LEFT JOIN editor.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
        JOIN editor.editor_regra er             ON er.cd_layout = el.cd_layout
        JOIN editor.editor_regra_prop_val erpv  ON erpv.cd_regra = er.cd_regra
        LEFT JOIN editor.editor_tipo_regra etr  ON er.cd_tipo_regra = etr.cd_tipo_regra
       WHERE evd.sn_publicado = 1
         AND (etl.ds_identificador IS NULL OR UPPER(etl.ds_identificador) NOT IN ('CABECALHO', 'RODAPE'))
         AND er.ativa = 1
         AND erpv.cd_propriedade IN (4, 36)
         AND erpv.lo_valor IS NOT NULL
         AND REGEXP_LIKE(erpv.lo_valor, 'CD_DOCUMENTO', 'i')
    `;

    const actionsSqlV2 = `
      SELECT DISTINCT
             ed.cd_documento                          AS "TARGET_DOC_ID",
             UPPER(ed.ds_documento)                   AS "TARGET_DOC_NAME",
             evd.vl_versao                            AS "TARGET_VERSION",
             'PUBLISHED'                              AS "TARGET_TP_VERSAO",
             ec.cd_campo                              AS "TARGET_FIELD_ID",
             ec.cd_metadado                           AS "TARGET_METADATA_ID",
             ec.ds_identificador                      AS "TARGET_FIELD_TAG",
             NVL(ec.ds_campo, ec.ds_identificador)    AS "TARGET_FIELD_NAME",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1)    AS "SCRIPT_P1",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 4001) AS "SCRIPT_P2",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 8001) AS "SCRIPT_P3"
        FROM dbamv.editor_documento ed
        JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
        JOIN dbamv.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
        LEFT JOIN dbamv.editor_tipo_layout etl  ON etl.cd_tipo_layout = el.cd_tipo_layout
        JOIN dbamv.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
        JOIN dbamv.editor_campo ec             ON ec.cd_campo = elc.cd_campo
        JOIN dbamv.editor_campo_prop_val ev    ON ev.cd_campo = NVL(ec.cd_metadado, ec.cd_campo)
       WHERE evd.cd_tipo_versao = 3
         AND (etl.ds_identificador IS NULL OR UPPER(etl.ds_identificador) NOT IN ('CABECALHO', 'RODAPE'))
         AND ev.cd_propriedade = 4
         AND ev.lo_valor IS NOT NULL
         AND REGEXP_LIKE(ev.lo_valor, 'CD_DOCUMENTO', 'i')
    `;

    const rulesSqlV2 = `
      SELECT ed.cd_documento                            AS "TARGET_DOC_ID",
             UPPER(ed.ds_documento)                     AS "TARGET_DOC_NAME",
             evd.vl_versao                              AS "TARGET_VERSION",
             'PUBLISHED'                                AS "TARGET_TP_VERSAO",
             er.ds_regra                                AS "RULE_NAME",
             etr.ds_identificador                       AS "RULE_TYPE",
             er.ds_regra                                AS "TARGET_FIELD_TAG",
             er.ds_regra                                AS "TARGET_FIELD_NAME",
             er.ds_acao_sql                             AS "SCRIPT_P1"
        FROM dbamv.editor_documento ed
        JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
        JOIN dbamv.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
        LEFT JOIN dbamv.editor_tipo_layout etl  ON etl.cd_tipo_layout = el.cd_tipo_layout
        JOIN dbamv.editor_layout_regra elr     ON elr.cd_layout = el.cd_layout
        JOIN dbamv.editor_regra er             ON er.cd_regra = elr.cd_regra
        LEFT JOIN dbamv.editor_tipo_regra etr  ON er.cd_tipo_regra = etr.cd_tipo_regra
       WHERE evd.cd_tipo_versao = 3
         AND (etl.ds_identificador IS NULL OR UPPER(etl.ds_identificador) NOT IN ('CABECALHO', 'RODAPE'))
         AND UPPER(er.sn_ativo) = 'S'
         AND er.ds_acao_sql IS NOT NULL
         AND REGEXP_LIKE(er.ds_acao_sql, 'CD_DOCUMENTO', 'i')
    `;

    const actionRows = await executeQuery(
      connection,
      engine === 'V2' ? actionsSqlV2 : actionsSqlV3,
      {},
      { ttlSeconds: 120, forceRefresh: force }
    );

    let ruleRows: unknown[] = [];
    try {
      ruleRows = await executeQuery(
        connection,
        engine === 'V2' ? rulesSqlV2 : rulesSqlV3,
        {},
        { ttlSeconds: 120, forceRefresh: force }
      );
    } catch (ruleErr) {
      console.warn(`[Lineage API] Falha não-crítica ao consultar regras SQL (${engine}):`, ruleErr);
      ruleRows = [];
    }

    const rawPairs: RawPairOccurrence[] = [];
    const involvedDocIds = new Set<number>();

    const collectFromRows = (rows: ScriptQueryRow[], originKind: LineageOriginKind) => {
      rows.forEach((row) => {
        const targetDoc = Number(row.TARGET_DOC_ID);
        if (!targetDoc || Number.isNaN(targetDoc)) return;

        const targetTag = String(row.TARGET_FIELD_TAG || row.RULE_NAME || 'DOC_RULE').trim();
        const targetName = String(row.TARGET_FIELD_NAME || row.RULE_NAME || targetTag).trim();
        const fullScript = [row.SCRIPT_P1, row.SCRIPT_P2, row.SCRIPT_P3].filter(Boolean).join('');
        if (!fullScript) return;

        const cleanedScript = stripSqlComments(fullScript);
        const branches = splitTopLevelUnions(cleanedScript);

        branches.forEach((branch) => {
          const notExistsBlocks = extractNotExistsBlocks(branch);

          let branchWithoutNotExists = '';
          let cursor = 0;
          notExistsBlocks.forEach((b) => {
            branchWithoutNotExists += branch.slice(cursor, b.start) + ' ';
            cursor = b.end;
          });
          branchWithoutNotExists += branch.slice(cursor);

          const outsideDocIds = extractDocIdsFromSql(branchWithoutNotExists);
          const branchAllDocIds = new Set<number>(outsideDocIds);
          notExistsBlocks.forEach((b) => {
            extractDocIdsFromSql(b.inner).forEach((id) => branchAllDocIds.add(id));
          });

          if (branchAllDocIds.size === 0) return;

          branchAllDocIds.forEach((srcNum) => {
            const appearsOutside = outsideDocIds.includes(srcNum);

            if (appearsOutside) {
              const isolatedContext = extractBestContextForDoc(branchWithoutNotExists, srcNum);
              rawPairs.push({
                sourceDocId: srcNum,
                targetDocId: targetDoc,
                targetFieldTag: targetTag,
                targetFieldName: targetName,
                fullScript,
                contextBlock: isolatedContext,
                isInNotExists: false,
                originKind,
                ruleName: row.RULE_NAME ? String(row.RULE_NAME).trim() : undefined,
                ruleType: row.RULE_TYPE ? String(row.RULE_TYPE).trim() : undefined,
              });
            } else {
              const matchingNe = notExistsBlocks
                .filter((b) => extractDocIdsFromSql(b.inner).includes(srcNum))
                .map((b) => b.inner)
                .join('\n');

              rawPairs.push({
                sourceDocId: srcNum,
                targetDocId: targetDoc,
                targetFieldTag: targetTag,
                targetFieldName: targetName,
                fullScript,
                contextBlock: matchingNe || branch,
                isInNotExists: true,
                originKind,
                ruleName: row.RULE_NAME ? String(row.RULE_NAME).trim() : undefined,
                ruleType: row.RULE_TYPE ? String(row.RULE_TYPE).trim() : undefined,
              });
            }

            involvedDocIds.add(srcNum);
            involvedDocIds.add(targetDoc);
          });
        });
      });
    };

    collectFromRows(actionRows as ScriptQueryRow[], 'FIELD_ACTION');
    collectFromRows(ruleRows as ScriptQueryRow[], 'DOC_RULE');

    if (involvedDocIds.size === 0) {
      return NextResponse.json({
        engine,
        nodes: [],
        edges: [],
        clusters: [],
        availableDocs: [],
        focusDocId: null,
        depth,
        summary: {
          totalDocs: 0,
          totalEdges: 0,
          totalFieldsLinked: 0,
          totalClusters: 0,
          totalBrokenDocs: 0,
          totalActionLinks: 0,
          totalRuleLinks: 0,
        },
      });
    }

    // 2. Busca metadados dos documentos participantes com aliases seguros (livres de normalizeRowKeys)
    const docMap = new Map<number, DocMapEntry>();

    const registerDocRows = (
      rows: DocDetailSafeRow[],
      options: { tech: string; isLegacyV2: boolean; engineOrigin: 'V3' | 'V2' }
    ) => {
      rows.forEach((r) => {
        const docId = readDocId(r);
        if (!docId || Number.isNaN(docId)) return;

        if (!docMap.has(docId)) {
          docMap.set(docId, {
            title: readDocName(r, `Documento ${docId}`),
            version: Number(r.DOC_VERSION ?? r.VL_VERSAO ?? 1) || 1,
            versionType: options.isLegacyV2
              ? 'LEGACY_V2'
              : String(r.DOC_TP_VERSAO ?? r.TP_VERSAO ?? 'PUBLISHED'),
            tech: options.tech,
            engineOrigin: options.engineOrigin,
            isLegacyV2: options.isLegacyV2,
            isBroken: false,
            fields: new Map(),
          });
        }

        const docObj = docMap.get(docId)!;
        const tag = String(r.FIELD_TAG ?? r.DS_IDENTIFICADOR ?? '').trim();
        const tagKey = tag.toUpperCase();
        if (tag && !docObj.fields.has(tagKey)) {
          docObj.fields.set(tagKey, {
            code: Number(r.FIELD_ID ?? r.CD_CAMPO ?? 0),
            tag,
            name: String(r.FIELD_NAME ?? r.DS_CAMPO ?? tag),
            metadataId:
              r.FIELD_METADATA_ID ?? r.CD_METADADO
                ? Number(r.FIELD_METADATA_ID ?? r.CD_METADADO)
                : undefined,
            hasLink: false,
          });
        }
      });
    };

    const queryV3Details = async (ids: number[]) => {
      for (const chunk of chunkArray(ids, 900)) {
        const sql = `
          SELECT ed.cd_documento                         AS "DOC_ID",
                 UPPER(ed.ds_documento)                  AS "DOC_NAME",
                 evd.vl_versao                           AS "DOC_VERSION",
                 evd.tp_versao                           AS "DOC_TP_VERSAO",
                 ec.cd_campo                             AS "FIELD_ID",
                 ec.cd_metadado                          AS "FIELD_METADATA_ID",
                 ec.ds_identificador                     AS "FIELD_TAG",
                 NVL(ec.ds_campo, ec.ds_identificador)   AS "FIELD_NAME"
            FROM editor.editor_documento ed
            JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
            JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
            JOIN editor.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
            JOIN editor.editor_campo ec             ON ec.cd_campo = elc.cd_campo
           WHERE ed.cd_documento IN (${chunk.join(', ')})
             AND evd.sn_publicado = 1
           ORDER BY ed.cd_documento, ec.ds_identificador
        `;
        const rows = await executeQuery(connection, sql, {}, { ttlSeconds: 120, forceRefresh: force });
        registerDocRows(rows as DocDetailSafeRow[], {
          tech: 'HTML5',
          isLegacyV2: false,
          engineOrigin: 'V3',
        });
      }
    };

    const queryV3Headers = async (ids: number[]) => {
      for (const chunk of chunkArray(ids, 900)) {
        const sql = `
          SELECT cd_documento        AS "DOC_ID",
                 UPPER(ds_documento) AS "DOC_NAME"
            FROM editor.editor_documento
           WHERE cd_documento IN (${chunk.join(', ')})
        `;
        const rows = await executeQuery(connection, sql, {}, { ttlSeconds: 120, forceRefresh: force });
        (rows as DocDetailSafeRow[]).forEach((r) => {
          const docId = readDocId(r);
          if (!docId || Number.isNaN(docId) || docMap.has(docId)) return;
          docMap.set(docId, {
            title: readDocName(r, `Documento ${docId}`),
            version: 0,
            versionType: 'UNPUBLISHED',
            tech: 'HTML5 (Sem Publicação)',
            engineOrigin: 'V3',
            isLegacyV2: false,
            isBroken: false,
            fields: new Map(),
          });
        });
      }
    };

    const queryV2Details = async (ids: number[]) => {
      for (const chunk of chunkArray(ids, 900)) {
        const sql = `
          SELECT ed.cd_documento                         AS "DOC_ID",
                 UPPER(ed.ds_documento)                  AS "DOC_NAME",
                 evd.vl_versao                           AS "DOC_VERSION",
                 'LEGACY_V2'                             AS "DOC_TP_VERSAO",
                 ec.cd_campo                             AS "FIELD_ID",
                 ec.cd_metadado                          AS "FIELD_METADATA_ID",
                 ec.ds_identificador                     AS "FIELD_TAG",
                 NVL(ec.ds_campo, ec.ds_identificador)   AS "FIELD_NAME"
            FROM dbamv.editor_documento ed
            JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
            JOIN dbamv.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
            JOIN dbamv.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
            JOIN dbamv.editor_campo ec             ON ec.cd_campo = elc.cd_campo
           WHERE ed.cd_documento IN (${chunk.join(', ')})
             AND evd.cd_tipo_versao = 3
           ORDER BY ed.cd_documento, ec.ds_identificador
        `;
        const rows = await executeQuery(connection, sql, {}, { ttlSeconds: 120, forceRefresh: force });
        registerDocRows(rows as DocDetailSafeRow[], {
          tech: 'FLEX V2',
          isLegacyV2: true,
          engineOrigin: 'V2',
        });
      }
    };

    const queryV2Headers = async (ids: number[]) => {
      for (const chunk of chunkArray(ids, 900)) {
        const sql = `
          SELECT cd_documento        AS "DOC_ID",
                 UPPER(ds_documento) AS "DOC_NAME"
            FROM dbamv.editor_documento
           WHERE cd_documento IN (${chunk.join(', ')})
        `;
        const rows = await executeQuery(connection, sql, {}, { ttlSeconds: 120, forceRefresh: force });
        (rows as DocDetailSafeRow[]).forEach((r) => {
          const docId = readDocId(r);
          if (!docId || Number.isNaN(docId) || docMap.has(docId)) return;
          docMap.set(docId, {
            title: readDocName(r, `Documento V2 ${docId}`),
            version: 1,
            versionType: 'LEGACY_V2',
            tech: 'FLEX V2',
            engineOrigin: 'V2',
            isLegacyV2: true,
            isBroken: false,
            fields: new Map(),
          });
        });
      }
    };

    const allInvolved = Array.from(involvedDocIds);

    if (engine === 'V3') {
      await queryV3Details(allInvolved);
      const missingAfterV3Details = allInvolved.filter((id) => !docMap.has(id));
      if (missingAfterV3Details.length > 0) {
        await queryV3Headers(missingAfterV3Details);
      }
      // Ponte híbrida V2 para origens legadas referenciadas por documentos V3
      const missingFromV3 = allInvolved.filter((id) => !docMap.has(id));
      if (missingFromV3.length > 0) {
        await queryV2Details(missingFromV3);
        const stillMissingV2 = missingFromV3.filter((id) => !docMap.has(id));
        if (stillMissingV2.length > 0) {
          await queryV2Headers(stillMissingV2);
        }
      }
    } else {
      await queryV2Details(allInvolved);
      const missingAfterV2Details = allInvolved.filter((id) => !docMap.has(id));
      if (missingAfterV2Details.length > 0) {
        await queryV2Headers(missingAfterV2Details);
      }
    }

    // Documentos que não existem em nenhuma base consultada -> Vínculo Quebrado real
    involvedDocIds.forEach((id) => {
      if (!docMap.has(id)) {
        docMap.set(id, {
          title: 'DOCUMENTO INEXISTENTE (VÍNCULO QUEBRADO)',
          version: 0,
          versionType: 'BROKEN',
          tech: 'ERRO SQL',
          engineOrigin: 'BROKEN',
          isLegacyV2: false,
          isBroken: true,
          fields: new Map(),
        });
      }
    });

    // 3. Resolução de vínculos: arestas externas (Source -> Target) e auto-herança (Self)
    const pairMap = new Map<
      string,
      {
        sourceDocId: number;
        targetDocId: number;
        fieldsMap: LineageFieldItem[];
      }
    >();
    const selfFieldsMap = new Map<number, LineageFieldItem[]>();

    rawPairs.forEach((pair) => {
      const sourceDoc = docMap.get(pair.sourceDocId);
      const targetDoc = docMap.get(pair.targetDocId);
      if (!sourceDoc || !targetDoc) return;

      if (pair.sourceDocId === pair.targetDocId) {
        if (pair.isInNotExists) return;
        const effectiveContext = pruneUnusedLeftJoins(pair.contextBlock);
        if (
          pair.originKind === 'FIELD_ACTION' &&
          (!hasFieldContentProjection(effectiveContext) || !hasHistoryRecordAggregation(effectiveContext))
        ) {
          return;
        }

        const resolvedSelf = resolveSourceFieldsForPair(
          pair.sourceDocId,
          sourceDoc,
          pair.contextBlock,
          false
        );

        resolvedSelf.matchedFields.forEach((f) => {
          f.hasLink = true;
        });
        const tField = targetDoc.fields.get(pair.targetFieldTag.toUpperCase());
        if (tField) tField.hasLink = true;

        if (!selfFieldsMap.has(pair.targetDocId)) {
          selfFieldsMap.set(pair.targetDocId, []);
        }

        upsertLineageFieldItem(
          selfFieldsMap.get(pair.targetDocId)!,
          {
            sourceTag: resolvedSelf.sourceTag,
            sourceName: resolvedSelf.sourceName,
            sourceFields: resolvedSelf.matchedFields.map((f) => ({ tag: f.tag, name: f.name })),
            targetTag: pair.targetFieldTag,
            targetName: pair.targetFieldName,
            script: pair.fullScript,
            isDocLevel: resolvedSelf.isDocLevel,
            linkKind: resolvedSelf.linkKind,
            originKind: pair.originKind,
            ruleName: pair.ruleName,
            ruleType: pair.ruleType,
          },
          resolvedSelf.matchedFields
        );
        return;
      }

      const resolved = resolveSourceFieldsForPair(
        pair.sourceDocId,
        sourceDoc,
        pair.contextBlock,
        pair.isInNotExists
      );

      resolved.matchedFields.forEach((f) => {
        f.hasLink = true;
      });
      const tField = targetDoc.fields.get(pair.targetFieldTag.toUpperCase());
      if (tField) tField.hasLink = true;

      const pairKey = `${pair.sourceDocId}_${pair.targetDocId}`;
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          sourceDocId: pair.sourceDocId,
          targetDocId: pair.targetDocId,
          fieldsMap: [],
        });
      }

      upsertLineageFieldItem(
        pairMap.get(pairKey)!.fieldsMap,
        {
          sourceTag: resolved.sourceTag,
          sourceName: resolved.sourceName,
          sourceFields: resolved.matchedFields.map((f) => ({ tag: f.tag, name: f.name })),
          targetTag: pair.targetFieldTag,
          targetName: pair.targetFieldName,
          script: pair.fullScript,
          isDocLevel: resolved.isDocLevel,
          linkKind: resolved.linkKind,
          originKind: pair.originKind,
          ruleName: pair.ruleName,
          ruleType: pair.ruleType,
        },
        resolved.matchedFields
      );
    });

    // 4. Cálculo global de cadeias/clusters sobre todos os documentos conectados
    const allPairsList = Array.from(pairMap.values()).filter((p) => p.fieldsMap.length > 0);
    const connectedDocSet = new Set<number>();
    allPairsList.forEach((p) => {
      connectedDocSet.add(p.sourceDocId);
      connectedDocSet.add(p.targetDocId);
    });
    selfFieldsMap.forEach((items, docId) => {
      if (items.length > 0) connectedDocSet.add(docId);
    });

    const { docClusterMap, clusters } = computeClusters(
      Array.from(connectedDocSet),
      allPairsList.map((p) => ({
        sourceDocId: p.sourceDocId,
        targetDocId: p.targetDocId,
        fieldsCount: p.fieldsMap.length,
      })),
      docMap
    );

    // 5. Filtro por Modo Foco + Profundidade vs Visão Global
    const rootNum = rootDocId && /^\d+$/.test(rootDocId) ? Number(rootDocId) : null;
    let activeDocIds: Set<number>;
    let hopDistance = new Map<number, number>();

    if (rootNum && docMap.has(rootNum)) {
      const filtered = filterByFocusAndDepth(rootNum, depth, allPairsList, selfFieldsMap);
      activeDocIds = filtered.activeDocIds;
      hopDistance = filtered.hopDistance;
    } else {
      activeDocIds = connectedDocSet;
    }

    // 6. Montagem das arestas finais
    const executiveEdges: ExecutiveEdgeData[] = [];
    pairMap.forEach((p, key) => {
      if (!activeDocIds.has(p.sourceDocId) || !activeDocIds.has(p.targetDocId)) return;
      if (p.fieldsMap.length === 0) return;

      const sourceDoc = docMap.get(p.sourceDocId);
      const isHybridV2 = engine === 'V3' && Boolean(sourceDoc?.isLegacyV2);
      const isBroken = Boolean(sourceDoc?.isBroken);
      const hasFieldActions = p.fieldsMap.some((f) => f.originKind === 'FIELD_ACTION');
      const hasDocRules = p.fieldsMap.some((f) => f.originKind === 'DOC_RULE');

      const totalFields = p.fieldsMap.length;
      const baseLabel = totalFields === 1 ? '1 vínculo' : `${totalFields} vínculos`;
      const label = isBroken
        ? `⚠️ ${baseLabel} (Quebrado)`
        : isHybridV2
          ? `${baseLabel} (Legado V2)`
          : baseLabel;

      executiveEdges.push({
        id: `edge_${key}`,
        sourceDocId: String(p.sourceDocId),
        targetDocId: String(p.targetDocId),
        totalFields,
        fieldsMap: p.fieldsMap,
        label,
        type: 'SQL_QUERY',
        hasFieldActions,
        hasDocRules,
        isHybridV2,
        isBroken,
      });
    });

    // 7. Montagem dos nós finais
    const upstreamCounters = new Map<number, number>();
    const downstreamCounters = new Map<number, number>();

    executiveEdges.forEach((e) => {
      const s = Number(e.sourceDocId);
      const t = Number(e.targetDocId);
      downstreamCounters.set(s, (downstreamCounters.get(s) || 0) + 1);
      upstreamCounters.set(t, (upstreamCounters.get(t) || 0) + 1);
    });

    const executiveNodes: LineageDocNodeData[] = [];
    activeDocIds.forEach((docId) => {
      const docData = docMap.get(docId);
      if (!docData) return;

      const allFields = Array.from(docData.fields.values());
      const selfFields = selfFieldsMap.get(docId) || [];
      const up = upstreamCounters.get(docId) || 0;
      const down = downstreamCounters.get(docId) || 0;

      const role: LineageNodeRole =
        up > 0 && down > 0
          ? 'BRIDGE'
          : down > 0
            ? 'SOURCE'
            : up > 0
              ? 'SINK'
              : 'ISOLATED';

      executiveNodes.push({
        id: `doc_${docId}`,
        docId,
        title: docData.title,
        version: docData.version,
        versionType: docData.versionType,
        tech: docData.tech,
        engineOrigin: docData.engineOrigin,
        clusterId: docClusterMap.get(docId) || 1,
        role,
        hopDistance: hopDistance.has(docId) ? hopDistance.get(docId) : undefined,
        totalFields: allFields.length,
        upstreamCount: up,
        downstreamCount: down,
        selfLinksCount: selfFields.length,
        selfFields,
        isFocus: rootNum === docId,
        isLegacyV2: docData.isLegacyV2,
        isBroken: docData.isBroken,
        fields: allFields.filter((f) => f.hasLink),
      });
    });

    // 8. Lista de documentos disponíveis para o seletor pesquisável (visão global completa)
    const globalUp = new Map<number, number>();
    const globalDown = new Map<number, number>();
    const docTotalLinks = new Map<number, number>();

    allPairsList.forEach((p) => {
      globalDown.set(p.sourceDocId, (globalDown.get(p.sourceDocId) || 0) + 1);
      globalUp.set(p.targetDocId, (globalUp.get(p.targetDocId) || 0) + 1);
      docTotalLinks.set(p.sourceDocId, (docTotalLinks.get(p.sourceDocId) || 0) + p.fieldsMap.length);
      docTotalLinks.set(p.targetDocId, (docTotalLinks.get(p.targetDocId) || 0) + p.fieldsMap.length);
    });
    selfFieldsMap.forEach((items, docId) => {
      docTotalLinks.set(docId, (docTotalLinks.get(docId) || 0) + items.length);
    });

    const availableDocs: LineageAvailableDoc[] = Array.from(docMap.entries())
      .filter(([id]) => (docTotalLinks.get(id) || 0) > 0)
      .map(([id, doc]) => ({
        id,
        title: doc.title,
        totalLinks: docTotalLinks.get(id) || 0,
        upstreamCount: globalUp.get(id) || 0,
        downstreamCount: globalDown.get(id) || 0,
        clusterId: docClusterMap.get(id) || 1,
        isBroken: doc.isBroken,
        isLegacyV2: doc.isLegacyV2,
      }))
      .sort((a, b) => b.totalLinks - a.totalLinks);

    const totalActionLinks = executiveEdges.reduce(
      (acc, e) => acc + e.fieldsMap.filter((f) => f.originKind === 'FIELD_ACTION').length,
      0
    );
    const totalRuleLinks = executiveEdges.reduce(
      (acc, e) => acc + e.fieldsMap.filter((f) => f.originKind === 'DOC_RULE').length,
      0
    );
    const activeClusters = new Set(executiveNodes.map((n) => n.clusterId));

    return NextResponse.json({
      engine,
      nodes: executiveNodes,
      edges: executiveEdges,
      clusters,
      availableDocs,
      focusDocId: rootNum,
      depth,
      summary: {
        totalDocs: executiveNodes.length,
        totalEdges: executiveEdges.length,
        totalFieldsLinked: executiveEdges.reduce((acc, e) => acc + e.totalFields, 0),
        totalClusters: activeClusters.size,
        totalBrokenDocs: executiveNodes.filter((n) => n.isBroken).length,
        totalActionLinks,
        totalRuleLinks,
      },
    });
  } catch (err: unknown) {
    console.error('[Lineage API Error]:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Erro ao processar linhagem executiva' }, { status: 500 });
  }
}
