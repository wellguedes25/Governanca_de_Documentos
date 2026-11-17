import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export const dynamic = 'force-dynamic';

export interface LineageFieldItem {
  sourceTag?: string;
  sourceName?: string;
  sourceFields?: Array<{ tag: string; name: string }>;
  targetTag: string;
  targetName: string;
  script: string;
  isDocLevel: boolean;
  linkKind?: 'CONTENT' | 'VALIDATION' | 'BROKEN';
}

export interface ExecutiveEdgeData {
  id: string;
  sourceDocId: string;
  targetDocId: string;
  totalFields: number;
  fieldsMap: LineageFieldItem[];
  label: string;
  type: 'SQL_QUERY';
  isHybridV2?: boolean;
  isBroken?: boolean;
}

export interface LineageDocNodeData {
  id: string;
  docId: number;
  title: string;
  version: number;
  versionType: string;
  tech: string;
  totalFields: number;
  upstreamCount: number;
  downstreamCount: number;
  selfLinksCount?: number;
  selfFields?: LineageFieldItem[];
  isFocus?: boolean;
  isLegacyV2?: boolean;
  isBroken?: boolean;
  fields: Array<{
    code: number;
    tag: string;
    name: string;
    metadataId?: number;
    hasLink: boolean;
  }>;
}

interface DocFieldEntry {
  code: number;
  tag: string;
  name: string;
  metadataId?: number;
  hasLink: boolean;
}

interface DocMapEntry {
  title: string;
  version: number;
  versionType: string;
  tech: string;
  isLegacyV2: boolean;
  isBroken: boolean;
  fields: Map<string, DocFieldEntry>;
}

interface ActionQueryRow {
  TARGET_DOC_ID: number | string;
  TARGET_DOC_NAME?: string;
  TARGET_VERSION?: number;
  TARGET_TP_VERSAO?: string;
  TARGET_FIELD_ID?: number;
  TARGET_METADATA_ID?: number;
  TARGET_FIELD_TAG?: string;
  TARGET_FIELD_NAME?: string;
  SCRIPT_P1?: string | null;
  SCRIPT_P2?: string | null;
  SCRIPT_P3?: string | null;
}

interface DocDetailQueryRow {
  CD_DOCUMENTO: number | string;
  DS_DOCUMENTO?: string;
  VL_VERSAO?: number;
  TP_VERSAO?: string;
  CD_CAMPO: number | string;
  CD_METADADO?: number | string | null;
  DS_IDENTIFICADOR?: string;
  DS_CAMPO?: string;
}

interface V2HeaderQueryRow {
  CD_DOCUMENTO: number | string;
  DS_DOCUMENTO?: string;
}

/**
 * Encontra o índice do parêntese de fechamento correspondente, ignorando literais entre aspas simples.
 */
function findMatchingParen(sql: string, openIdx: number): number {
  let depth = 0;
  let inSingleQuote = false;

  for (let i = openIdx; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        i++; // Skip escaped single quote ''
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (inSingleQuote) continue;

    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extrai todos os códigos de documento referenciados via CD_DOCUMENTO = X ou CD_DOCUMENTO IN (X, Y).
 */
function extractDocIdsFromSql(sqlText: string): number[] {
  const ids = new Set<number>();

  const eqRegex = /(?<![A-Z0-9_])CD_DOCUMENTO\s*=\s*(\d+)/gi;
  for (const match of sqlText.matchAll(eqRegex)) {
    const num = Number(match[1]);
    if (num > 0) ids.add(num);
  }

  const inRegex = /(?<![A-Z0-9_])CD_DOCUMENTO\s+IN\s*\(([\d\s,]+)\)/gi;
  for (const match of sqlText.matchAll(inRegex)) {
    match[1].split(',').forEach((part) => {
      const trimmed = part.trim();
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (num > 0) ids.add(num);
      }
    });
  }

  return Array.from(ids);
}

/**
 * Extrai blocos NOT EXISTS (...) mantendo os índices originais no branch.
 */
function extractNotExistsBlocks(branch: string): Array<{ start: number; end: number; inner: string }> {
  const blocks: Array<{ start: number; end: number; inner: string }> = [];
  const regex = /\bNOT\s+EXISTS\s*\(/gi;

  for (const match of branch.matchAll(regex)) {
    const start = match.index ?? 0;
    const openParenIdx = start + match[0].length - 1;
    const closeParenIdx = findMatchingParen(branch, openParenIdx);
    if (closeParenIdx !== -1) {
      blocks.push({
        start,
        end: closeParenIdx + 1,
        inner: branch.slice(openParenIdx + 1, closeParenIdx),
      });
    }
  }

  return blocks;
}

/**
 * Remove subqueries LEFT JOIN (...) não referenciadas na consulta externa (projeção SELECT, outros JOINs ou WHERE).
 */
function pruneUnusedLeftJoins(sqlBlock: string): string {
  const leftJoinRegex = /\bLEFT\s+(?:OUTER\s+)?JOIN\s*\(/gi;
  const removals: Array<{ start: number; end: number }> = [];
  const keyAliases = new Set(['cd_registro', 'cd_documento_clinico', 'cd_atendimento', 'cd_paciente', 'cd_campo']);

  let match: RegExpExecArray | null;
  while ((match = leftJoinRegex.exec(sqlBlock)) !== null) {
    const start = match.index;
    const openParenIdx = start + match[0].length - 1;
    const closeParenIdx = findMatchingParen(sqlBlock, openParenIdx);
    if (closeParenIdx === -1) continue;

    const afterParen = sqlBlock.slice(closeParenIdx + 1);
    const aliasMatch = /^\s*(?:AS\s+)?([A-Za-z0-9_]+)\s+ON\b/i.exec(afterParen);
    if (!aliasMatch) continue;

    const tableAlias = aliasMatch[1];
    const onOffset = closeParenIdx + 1 + aliasMatch[0].length;
    const restAfterOn = sqlBlock.slice(onOffset);
    const nextClauseMatch = /\b(?:LEFT|RIGHT|INNER|FULL|CROSS)?\s*JOIN\b|\bWHERE\b|\bGROUP\s+BY\b|\bORDER\s+BY\b|\bUNION\b|\)/i.exec(restAfterOn);
    const end = nextClauseMatch ? onOffset + nextClauseMatch.index : sqlBlock.length;

    const innerSql = sqlBlock.slice(openParenIdx + 1, closeParenIdx);
    const colAliases: string[] = [];
    const asRegex = /\bAS\s+([A-Za-z0-9_]+)/gi;
    for (const am of innerSql.matchAll(asRegex)) {
      const col = am[1];
      if (!keyAliases.has(col.toLowerCase())) {
        colAliases.push(col);
      }
    }

    const remainingQuery = sqlBlock.slice(0, start) + ' ' + sqlBlock.slice(end);
    const tableUsed = new RegExp(`\\b${tableAlias}\\b`, 'i').test(remainingQuery);
    const colUsed = colAliases.some((col) => new RegExp(`\\b${col}\\b`, 'i').test(remainingQuery));

    if (!tableUsed && !colUsed) {
      removals.push({ start, end });
    }
  }

  if (removals.length === 0) return sqlBlock;

  let result = '';
  let cursor = 0;
  for (const r of removals) {
    if (r.start >= cursor) {
      result += sqlBlock.slice(cursor, r.start) + ' ';
      cursor = r.end;
    }
  }
  result += sqlBlock.slice(cursor);
  return result;
}

/**
 * Verifica se alguma projeção SELECT ... FROM no bloco projeta conteúdo de campos (lo_conteudo / lo_valor / ds_conteudo).
 */
function hasFieldContentProjection(sqlBlock: string): boolean {
  const selectRegex = /\bSELECT\b/gi;
  let inSingleQuote = false;
  const quoteMask = new Array<boolean>(sqlBlock.length).fill(false);

  for (let i = 0; i < sqlBlock.length; i++) {
    const ch = sqlBlock[i];
    if (ch === "'" && sqlBlock[i - 1] !== '\\') {
      if (inSingleQuote && sqlBlock[i + 1] === "'") {
        quoteMask[i] = true;
        quoteMask[i + 1] = true;
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    }
    quoteMask[i] = inSingleQuote;
  }

  let match: RegExpExecArray | null;
  while ((match = selectRegex.exec(sqlBlock)) !== null) {
    if (quoteMask[match.index]) continue;

    let depth = 0;
    let fromIdx = -1;
    for (let i = match.index + match[0].length; i < sqlBlock.length; i++) {
      if (quoteMask[i]) continue;
      const ch = sqlBlock[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && /\bFROM\b/i.test(sqlBlock.slice(i, i + 6)) && (i === 0 || !/[A-Za-z0-9_]/.test(sqlBlock[i - 1]))) {
        fromIdx = i;
        break;
      }
    }

    if (fromIdx !== -1) {
      const projection = sqlBlock.slice(match.index + match[0].length, fromIdx);
      if (/\b(?:lo_conteudo|lo_valor|ds_conteudo|ds_identificador)\b/i.test(projection)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extrai todos os tokens entre aspas simples ou duplas presentes no bloco SQL.
 */
function extractQuotedTokens(sqlBlock: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  const regex = /['"]([A-Za-z0-9_]+)['"]/g;

  for (const match of sqlBlock.matchAll(regex)) {
    const raw = match[1].trim();
    const upper = raw.toUpperCase();
    if (raw && !seen.has(upper)) {
      seen.add(upper);
      tokens.push(upper);
    }
  }
  return tokens;
}

/**
 * Verifica se o bloco realiza agregação de registro histórico (para caracterizar auto-herança legítima).
 */
function hasHistoryRecordAggregation(sqlBlock: string): boolean {
  return (
    /\bMAX\s*\([^)]*(?:cd_editor_registro|dh_criacao|edreg)\b/i.test(sqlBlock) ||
    /\bORDER\s+BY\b[\s\S]*?\bdh_criacao\s+DESC\b/i.test(sqlBlock)
  );
}

/**
 * Resolve o mapeamento preciso dos campos de origem para um par (sourceDocId -> targetDocId) dentro de um contexto SQL.
 */
function resolveSourceFieldsForPair(
  sourceDocId: number,
  sourceDoc: DocMapEntry,
  contextBlock: string,
  isInNotExists: boolean
): {
  matchedFields: DocFieldEntry[];
  sourceTag?: string;
  sourceName?: string;
  isDocLevel: boolean;
  linkKind: 'CONTENT' | 'VALIDATION' | 'BROKEN';
} | null {
  // Caso 1: Documento de origem inexistente (Vínculo Quebrado)
  if (sourceDoc.isBroken) {
    const identMatch = /ds_identificador\s*(?:=|IN)\s*\(?\s*['"]([A-Za-z0-9_]+)['"]/i.exec(contextBlock);
    const missingTag = identMatch ? identMatch[1] : undefined;
    return {
      matchedFields: [],
      sourceTag: missingTag || 'DOC_INEXISTENTE',
      sourceName: `Referência órfã (Doc ${sourceDocId} não existe)`,
      isDocLevel: false,
      linkKind: 'BROKEN',
    };
  }

  const effectiveContext = pruneUnusedLeftJoins(contextBlock);
  const quotedTokens = extractQuotedTokens(effectiveContext);
  const matchedFields: DocFieldEntry[] = [];

  for (const tokenUpper of quotedTokens) {
    const field = sourceDoc.fields.get(tokenUpper);
    if (field) {
      matchedFields.push(field);
    }
  }

  // Caso 2: Vínculo de validação/status/metadado (NOT EXISTS ou SELECT sem projeção de conteúdo de campos)
  const transfersContent = !isInNotExists && hasFieldContentProjection(effectiveContext);
  if (!transfersContent) {
    const primaryField = matchedFields[0];
    return {
      matchedFields,
      sourceTag: primaryField ? primaryField.tag : 'STATUS_FECHADO',
      sourceName: primaryField
        ? `${primaryField.name} (Validação/Filtro)`
        : 'Validação de Status / Existência',
      isDocLevel: true,
      linkKind: 'VALIDATION',
    };
  }

  // Caso 3: Transferência de conteúdo (1:1 ou N:1)
  if (matchedFields.length === 1) {
    return {
      matchedFields,
      sourceTag: matchedFields[0].tag,
      sourceName: matchedFields[0].name,
      isDocLevel: false,
      linkKind: 'CONTENT',
    };
  }

  if (matchedFields.length > 1) {
    const first = matchedFields[0];
    const restCount = matchedFields.length - 1;
    return {
      matchedFields,
      sourceTag: `${first.tag} (+${restCount} ${restCount === 1 ? 'campo' : 'campos'})`,
      sourceName: `${first.name} e mais ${restCount} ${restCount === 1 ? 'metadado' : 'metadados'}`,
      isDocLevel: false,
      linkKind: 'CONTENT',
    };
  }

  return {
    matchedFields: [],
    sourceTag: undefined,
    sourceName: undefined,
    isDocLevel: true,
    linkKind: 'CONTENT',
  };
}

/**
 * Mescla ou adiciona um item de mapeamento dentro de um array de fieldsMap consolidando pelo targetTag.
 */
function upsertLineageFieldItem(
  targetList: LineageFieldItem[],
  item: LineageFieldItem,
  newSourceFields: DocFieldEntry[]
) {
  const existing = targetList.find(
    (f) => f.targetTag === item.targetTag && f.linkKind === item.linkKind
  );

  if (!existing) {
    targetList.push(item);
    return;
  }

  // Consolida múltiplos campos de origem (ex: branches UNION ALL distintos para o mesmo targetTag)
  const merged = new Map<string, { tag: string; name: string }>();
  (existing.sourceFields || []).forEach((sf) => merged.set(sf.tag.toUpperCase(), sf));
  newSourceFields.forEach((nf) => merged.set(nf.tag.toUpperCase(), { tag: nf.tag, name: nf.name }));

  const mergedList = Array.from(merged.values());
  if (mergedList.length > 0) {
    existing.sourceFields = mergedList;
    if (mergedList.length === 1) {
      existing.sourceTag = mergedList[0].tag;
      existing.sourceName = mergedList[0].name;
    } else {
      const rest = mergedList.length - 1;
      existing.sourceTag = `${mergedList[0].tag} (+${rest} ${rest === 1 ? 'campo' : 'campos'})`;
      existing.sourceName = `${mergedList[0].name} e mais ${rest} ${rest === 1 ? 'metadado' : 'metadados'}`;
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rootDocId = searchParams.get('rootDocId');

  const data = await getData();
  const connection = data.connections.find((c) => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    // 1. Busca todas as ações SQL com leitura completa de CLOB (até 12.000 caracteres em 3 partes)
    const actionsSql = `
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
        JOIN editor.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
        JOIN editor.editor_campo ec             ON ec.cd_campo = elc.cd_campo
        JOIN editor.editor_campo_prop_val ev    ON ev.cd_campo = NVL(ec.cd_metadado, ec.cd_campo)
       WHERE evd.sn_publicado = 1
         AND ev.cd_propriedade = 4
         AND ev.lo_valor IS NOT NULL
         AND (
           REGEXP_LIKE(ev.lo_valor, 'CD_DOCUMENTO[[:space:]]*=', 'i')
           OR REGEXP_LIKE(ev.lo_valor, 'CD_DOCUMENTO[[:space:]]+IN', 'i')
           OR REGEXP_LIKE(ev.lo_valor, 'EDITOR_REGISTRO_CAMPO', 'i')
         )
    `;

    const actionRows = await executeQuery(connection, actionsSql, {}, { ttlSeconds: 120 });

    // Coleta pares contextuais por branch UNION / bloco NOT EXISTS
    const rawPairs: Array<{
      sourceDocId: number;
      targetDocId: number;
      targetFieldTag: string;
      targetFieldName: string;
      fullScript: string;
      contextBlock: string;
      isInNotExists: boolean;
    }> = [];

    const involvedDocIds = new Set<number>();

    (actionRows as ActionQueryRow[]).forEach((row) => {
      const targetDoc = Number(row.TARGET_DOC_ID);
      const targetTag = String(row.TARGET_FIELD_TAG || '').trim();
      const targetName = String(row.TARGET_FIELD_NAME || targetTag).trim();
      const fullScript = [row.SCRIPT_P1, row.SCRIPT_P2, row.SCRIPT_P3].filter(Boolean).join('');

      if (!fullScript) return;

      // Divide o script pelos ramos UNION / UNION ALL para manter contexto isolado de tabelas e campos
      const branches = fullScript.split(/\bUNION(?:\s+ALL)?\b/i);

      branches.forEach((branch) => {
        const notExistsBlocks = extractNotExistsBlocks(branch);

        // Constrói versão do branch sem os blocos NOT EXISTS para avaliar referências da query principal
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
            rawPairs.push({
              sourceDocId: srcNum,
              targetDocId: targetDoc,
              targetFieldTag: targetTag,
              targetFieldName: targetName,
              fullScript,
              contextBlock: branchWithoutNotExists,
              isInNotExists: false,
            });
          } else {
            // Aparece exclusivamente dentro de blocos NOT EXISTS (...)
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
            });
          }

          involvedDocIds.add(srcNum);
          involvedDocIds.add(targetDoc);
        });
      });
    });

    if (involvedDocIds.size === 0) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        availableDocs: [],
        summary: { totalDocs: 0, totalEdges: 0, totalFieldsLinked: 0 },
      });
    }

    // 2. Busca metadados dos documentos participantes no Editor V3 (schema EDITOR)
    const inDocsList = Array.from(involvedDocIds).join(', ');
    const docsDetailsSql = `
      SELECT ed.cd_documento                         AS "CD_DOCUMENTO",
             UPPER(ed.ds_documento)                  AS "DS_DOCUMENTO",
             evd.vl_versao                           AS "VL_VERSAO",
             evd.tp_versao                           AS "TP_VERSAO",
             ec.cd_campo                             AS "CD_CAMPO",
             ec.cd_metadado                          AS "CD_METADADO",
             ec.ds_identificador                     AS "DS_IDENTIFICADOR",
             NVL(ec.ds_campo, ec.ds_identificador)   AS "DS_CAMPO"
        FROM editor.editor_documento ed
        JOIN editor.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
        JOIN editor.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
        JOIN editor.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
        JOIN editor.editor_campo ec             ON ec.cd_campo = elc.cd_campo
       WHERE ed.cd_documento IN (${inDocsList})
         AND evd.sn_publicado = 1
       ORDER BY ed.cd_documento, ec.ds_identificador
    `;

    const docDetailRows = await executeQuery(connection, docsDetailsSql, {}, { ttlSeconds: 120 });

    const docMap = new Map<number, DocMapEntry>();

    const registerDocRows = (rows: DocDetailQueryRow[], options: { tech: string; isLegacyV2: boolean }) => {
      rows.forEach((r) => {
        const docId = Number(r.CD_DOCUMENTO);
        if (!docMap.has(docId)) {
          docMap.set(docId, {
            title: r.DS_DOCUMENTO || `Documento ${docId}`,
            version: r.VL_VERSAO || 1,
            versionType: options.isLegacyV2 ? 'LEGACY_V2' : r.TP_VERSAO || 'PUBLISHED',
            tech: options.tech,
            isLegacyV2: options.isLegacyV2,
            isBroken: false,
            fields: new Map(),
          });
        }

        const docObj = docMap.get(docId)!;
        const tag = String(r.DS_IDENTIFICADOR || '').trim();
        const tagKey = tag.toUpperCase();
        if (tag && !docObj.fields.has(tagKey)) {
          docObj.fields.set(tagKey, {
            code: Number(r.CD_CAMPO),
            tag,
            name: String(r.DS_CAMPO || tag),
            metadataId: r.CD_METADADO ? Number(r.CD_METADADO) : undefined,
            hasLink: false,
          });
        }
      });
    };

    registerDocRows(docDetailRows as DocDetailQueryRow[], { tech: 'HTML5', isLegacyV2: false });

    // 2.1 Suporte Híbrido: busca documentos ausentes no V3 na base legada V2 (DBAMV)
    const missingFromV3 = Array.from(involvedDocIds).filter((id) => !docMap.has(id));
    if (missingFromV3.length > 0) {
      const missingInList = missingFromV3.join(', ');
      const v2DocsDetailsSql = `
        SELECT ed.cd_documento                         AS "CD_DOCUMENTO",
               UPPER(ed.ds_documento)                  AS "DS_DOCUMENTO",
               evd.vl_versao                           AS "VL_VERSAO",
               ec.cd_campo                             AS "CD_CAMPO",
               ec.cd_metadado                          AS "CD_METADADO",
               ec.ds_identificador                     AS "DS_IDENTIFICADOR",
               NVL(ec.ds_campo, ec.ds_identificador)   AS "DS_CAMPO"
          FROM dbamv.editor_documento ed
          JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
          JOIN dbamv.editor_layout el            ON el.cd_versao_documento = evd.cd_versao_documento
          JOIN dbamv.editor_layout_campo elc     ON elc.cd_layout = el.cd_layout
          JOIN dbamv.editor_campo ec             ON ec.cd_campo = elc.cd_campo
         WHERE ed.cd_documento IN (${missingInList})
           AND evd.cd_tipo_versao = 3
         ORDER BY ed.cd_documento, ec.ds_identificador
      `;

      const v2DocDetailRows = await executeQuery(connection, v2DocsDetailsSql, {}, { ttlSeconds: 120 });
      registerDocRows(v2DocDetailRows as DocDetailQueryRow[], { tech: 'FLEX V2', isLegacyV2: true });

      // Fallback para documentos V2 publicados sem layout/campos ou cujo cd_tipo_versao difere
      const stillMissingHeaderCheck = missingFromV3.filter((id) => !docMap.has(id));
      if (stillMissingHeaderCheck.length > 0) {
        const v2HeaderSql = `
          SELECT cd_documento AS "CD_DOCUMENTO",
                 UPPER(ds_documento) AS "DS_DOCUMENTO"
            FROM dbamv.editor_documento
           WHERE cd_documento IN (${stillMissingHeaderCheck.join(', ')})
        `;
        const v2HeaderRows = await executeQuery(connection, v2HeaderSql, {}, { ttlSeconds: 120 });
        (v2HeaderRows as V2HeaderQueryRow[]).forEach((r) => {
          const docId = Number(r.CD_DOCUMENTO);
          if (!docMap.has(docId)) {
            docMap.set(docId, {
              title: r.DS_DOCUMENTO || `Documento V2 ${docId}`,
              version: 1,
              versionType: 'LEGACY_V2',
              tech: 'FLEX V2',
              isLegacyV2: true,
              isBroken: false,
              fields: new Map(),
            });
          }
        });
      }
    }

    // 2.2 Marca documentos inexistentes como Vínculos Quebrados para auditoria
    involvedDocIds.forEach((id) => {
      if (!docMap.has(id)) {
        docMap.set(id, {
          title: 'DOCUMENTO INEXISTENTE (VÍNCULO QUEBRADO)',
          version: 0,
          versionType: 'BROKEN',
          tech: 'ERRO SQL',
          isLegacyV2: false,
          isBroken: true,
          fields: new Map(),
        });
      }
    });

    // 3. Resolução estrita de vínculos: arestas externas (Source -> Target) e auto-herança (Self)
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

      // Auto-referência (continuidade clínica vs filtro na própria tabela)
      if (pair.sourceDocId === pair.targetDocId) {
        if (pair.isInNotExists) return;
        const effectiveContext = pruneUnusedLeftJoins(pair.contextBlock);
        if (!hasFieldContentProjection(effectiveContext) || !hasHistoryRecordAggregation(effectiveContext)) {
          return;
        }

        const resolvedSelf = resolveSourceFieldsForPair(
          pair.sourceDocId,
          sourceDoc,
          pair.contextBlock,
          false
        );
        if (!resolvedSelf) return;

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
          },
          resolvedSelf.matchedFields
        );
        return;
      }

      // Vínculo entre documentos distintos
      const resolved = resolveSourceFieldsForPair(
        pair.sourceDocId,
        sourceDoc,
        pair.contextBlock,
        pair.isInNotExists
      );
      if (!resolved) return;

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
        },
        resolved.matchedFields
      );
    });

    // 4. Modo Foco (Single-Doc Explorer) vs Visão Global
    const activeDocIds = new Set<number>();
    const rootNum = rootDocId && /^\d+$/.test(rootDocId) ? Number(rootDocId) : null;

    if (rootNum && docMap.has(rootNum)) {
      activeDocIds.add(rootNum);
      pairMap.forEach((p) => {
        if (p.targetDocId === rootNum) {
          activeDocIds.add(p.sourceDocId);
        }
        if (p.sourceDocId === rootNum) {
          activeDocIds.add(p.targetDocId);
        }
      });
    } else {
      pairMap.forEach((p) => {
        if (p.fieldsMap.length > 0) {
          activeDocIds.add(p.sourceDocId);
          activeDocIds.add(p.targetDocId);
        }
      });
      selfFieldsMap.forEach((items, docId) => {
        if (items.length > 0) activeDocIds.add(docId);
      });
    }

    // 5. Montagem das Arestas Executivas Finais
    const executiveEdges: ExecutiveEdgeData[] = [];
    pairMap.forEach((p, key) => {
      if (!activeDocIds.has(p.sourceDocId) || !activeDocIds.has(p.targetDocId)) return;
      if (p.fieldsMap.length === 0) return;

      const sourceDoc = docMap.get(p.sourceDocId);
      const isHybridV2 = Boolean(sourceDoc?.isLegacyV2);
      const isBroken = Boolean(sourceDoc?.isBroken);

      const totalFields = p.fieldsMap.length;
      const baseLabel = totalFields === 1 ? '1 campo vinculado' : `${totalFields} campos vinculados`;
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
        isHybridV2,
        isBroken,
      });
    });

    // 6. Montagem dos Nós Executivos Finais
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

      executiveNodes.push({
        id: `doc_${docId}`,
        docId,
        title: docData.title,
        version: docData.version,
        versionType: docData.versionType,
        tech: docData.tech,
        totalFields: allFields.length,
        upstreamCount: upstreamCounters.get(docId) || 0,
        downstreamCount: downstreamCounters.get(docId) || 0,
        selfLinksCount: selfFields.length,
        selfFields,
        isFocus: rootNum === docId,
        isLegacyV2: docData.isLegacyV2,
        isBroken: docData.isBroken,
        fields: allFields.filter((f) => f.hasLink),
      });
    });

    // 7. Lista de Documentos Disponíveis Ordenada por Relevância de Vínculos
    const docTotalLinks = new Map<number, number>();
    pairMap.forEach((p) => {
      docTotalLinks.set(p.sourceDocId, (docTotalLinks.get(p.sourceDocId) || 0) + p.fieldsMap.length);
      docTotalLinks.set(p.targetDocId, (docTotalLinks.get(p.targetDocId) || 0) + p.fieldsMap.length);
    });
    selfFieldsMap.forEach((items, docId) => {
      docTotalLinks.set(docId, (docTotalLinks.get(docId) || 0) + items.length);
    });

    const availableDocs = Array.from(docMap.entries())
      .filter(([id]) => (docTotalLinks.get(id) || 0) > 0)
      .map(([id, doc]) => ({
        id,
        title: doc.title,
        totalLinks: docTotalLinks.get(id) || 0,
      }))
      .sort((a, b) => b.totalLinks - a.totalLinks);

    return NextResponse.json({
      nodes: executiveNodes,
      edges: executiveEdges,
      availableDocs,
      focusDocId: rootNum,
      summary: {
        totalDocs: executiveNodes.length,
        totalEdges: executiveEdges.length,
        totalFieldsLinked: executiveEdges.reduce((acc, e) => acc + e.totalFields, 0),
      },
    });
  } catch (err: unknown) {
    console.error('[Lineage API Error]:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Erro ao processar linhagem executiva' }, { status: 500 });
  }
}
