import type {
  LineageClusterSummary,
  LineageDepth,
  LineageDocFieldEntry,
  LineageFieldItem,
  LineageLinkKind,
} from '@/types/lineage.types';

export interface DocMapEntry {
  title: string;
  version: number;
  versionType: string;
  tech: string;
  engineOrigin: 'V3' | 'V2' | 'BROKEN';
  isLegacyV2: boolean;
  isBroken: boolean;
  fields: Map<string, LineageDocFieldEntry>;
}

export interface RawPairInput {
  sourceDocId: number;
  targetDocId: number;
  fieldsMap: LineageFieldItem[];
}

/**
 * Divide um array em blocos menores (ex.: 900 itens) para evitar erro ORA-01795 (> 1000 itens em IN).
 */
export function chunkArray<T>(items: T[], size = 900): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove comentários SQL (-- linha e /* bloco *\/) preservando literais entre aspas simples.
 */
export function stripSqlComments(sql: string): string {
  if (!sql) return '';
  let out = '';
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') {
        inLineComment = false;
        out += ch;
      } else {
        out += ' ';
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        out += '  ';
        i++;
      } else {
        out += ch === '\n' || ch === '\r' ? ch : ' ';
      }
      continue;
    }

    if (inSingleQuote) {
      out += ch;
      if (ch === "'" && sql[i - 1] !== '\\') {
        if (next === "'") {
          out += next;
          i++;
        } else {
          inSingleQuote = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      out += ch;
      continue;
    }

    if (ch === '-' && next === '-') {
      inLineComment = true;
      out += '  ';
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      out += '  ';
      i++;
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Encontra o índice do parêntese de fechamento correspondente, ignorando literais entre aspas simples.
 */
export function findMatchingParen(sql: string, openIdx: number): number {
  let depth = 0;
  let inSingleQuote = false;

  for (let i = openIdx; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        i++;
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
 * Divide o SQL por UNION / UNION ALL somente no nível superior (profundidade de parênteses 0 e fora de aspas).
 */
export function splitTopLevelUnions(sql: string): string[] {
  if (!sql) return [];
  const branches: string[] = [];
  let depth = 0;
  let inSingleQuote = false;
  let lastStart = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (inSingleQuote) continue;

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      if (depth > 0) depth--;
      continue;
    }

    if (depth === 0) {
      const slice = sql.slice(i);
      const prevChar = i === 0 ? ' ' : sql[i - 1];
      if (!/[A-Za-z0-9_]/.test(prevChar)) {
        const unionMatch = /^UNION(?:\s+ALL)?\b/i.exec(slice);
        if (unionMatch) {
          const branch = sql.slice(lastStart, i).trim();
          if (branch) branches.push(branch);
          i += unionMatch[0].length - 1;
          lastStart = i + 1;
        }
      }
    }
  }

  const tail = sql.slice(lastStart).trim();
  if (tail) branches.push(tail);
  return branches;
}

/**
 * Extrai todos os códigos de documento referenciados via CD_DOCUMENTO (=, IN, TO_CHAR) em SQL sem comentários.
 */
export function extractDocIdsFromSql(sqlText: string): number[] {
  // Remove comentários e mascara literais textuais (mantendo literais numéricos como '9001')
  const clean = stripSqlComments(sqlText).replace(/'((?:''|[^'])*)'/g, (full, inner: string) => {
    return /^\s*\d+\s*$/.test(inner) ? full : "''";
  });
  const ids = new Set<number>();

  // CD_DOCUMENTO = 916 ou CD_DOCUMENTO = '916'
  const eqRegex = /(?<![A-Z0-9_])CD_DOCUMENTO\s*=\s*['"]?(\d+)['"]?/gi;
  for (const match of clean.matchAll(eqRegex)) {
    const num = Number(match[1]);
    if (num > 0) ids.add(num);
  }

  // TO_CHAR(alias.cd_documento) = '916' ou TO_CHAR(cd_documento) = 916
  const toCharRegex = /\bTO_CHAR\s*\(\s*(?:[A-Za-z0-9_]+\.)?CD_DOCUMENTO\s*\)\s*=\s*['"]?(\d+)['"]?/gi;
  for (const match of clean.matchAll(toCharRegex)) {
    const num = Number(match[1]);
    if (num > 0) ids.add(num);
  }

  // CD_DOCUMENTO IN (916, '917', 918) ou TO_CHAR(CD_DOCUMENTO) IN (...)
  const inRegex = /(?<![A-Z0-9_])(?:TO_CHAR\s*\(\s*(?:[A-Za-z0-9_]+\.)?CD_DOCUMENTO\s*\)|CD_DOCUMENTO)\s+IN\s*\(([^)]+)\)/gi;
  for (const match of clean.matchAll(inRegex)) {
    match[1].split(',').forEach((part) => {
      const cleanedPart = part.trim().replace(/^['"]|['"]$/g, '');
      if (/^\d+$/.test(cleanedPart)) {
        const num = Number(cleanedPart);
        if (num > 0) ids.add(num);
      }
    });
  }

  return Array.from(ids);
}

/**
 * Extrai blocos NOT EXISTS (...) mantendo os índices originais no branch.
 */
export function extractNotExistsBlocks(branch: string): Array<{ start: number; end: number; inner: string }> {
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
 * Se o branch contiver múltiplos CD_DOCUMENTO em subqueries distintas, isola o menor bloco
 * parentetizado contendo SELECT e aquele sourceDocId para reduzir vazamento de tags entre origens.
 */
export function extractBestContextForDoc(branch: string, sourceDocId: number): string {
  const allDocIds = extractDocIdsFromSql(branch);
  if (allDocIds.length <= 1) return branch;

  let bestInner = branch;
  let inSingleQuote = false;

  for (let i = 0; i < branch.length; i++) {
    const ch = branch[i];
    if (ch === "'" && branch[i - 1] !== '\\') {
      if (inSingleQuote && branch[i + 1] === "'") {
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (inSingleQuote) continue;

    if (ch === '(') {
      const closeIdx = findMatchingParen(branch, i);
      if (closeIdx === -1) continue;
      const inner = branch.slice(i + 1, closeIdx);
      if (inner.length < bestInner.length && /\bSELECT\b/i.test(inner)) {
        const innerIds = extractDocIdsFromSql(inner);
        if (innerIds.includes(sourceDocId) && innerIds.length < allDocIds.length) {
          bestInner = inner;
        }
      }
    }
  }

  return bestInner;
}

/**
 * Remove subqueries LEFT JOIN (...) não referenciadas na consulta externa.
 */
export function pruneUnusedLeftJoins(sqlBlock: string): string {
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
 * Verifica se alguma projeção SELECT ... FROM no bloco projeta conteúdo de campos (lo_conteudo / lo_valor / ds_conteudo / ds_identificador).
 */
export function hasFieldContentProjection(sqlBlock: string): boolean {
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
      } else if (
        depth === 0 &&
        /\bFROM\b/i.test(sqlBlock.slice(i, i + 6)) &&
        (i === 0 || !/[A-Za-z0-9_]/.test(sqlBlock[i - 1]))
      ) {
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
 * Verifica se o bloco realiza agregação de registro histórico (para auto-herança legítima).
 */
export function hasHistoryRecordAggregation(sqlBlock: string): boolean {
  return (
    /\bMAX\s*\([^)]*(?:cd_editor_registro|dh_criacao|edreg)\b/i.test(sqlBlock) ||
    /\bORDER\s+BY\b[\s\S]*?\bdh_criacao\s+DESC\b/i.test(sqlBlock)
  );
}

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

function extractNumericFieldCodes(sqlBlock: string): number[] {
  const codes = new Set<number>();
  const eqRegex = /(?<![A-Z0-9_])CD_CAMPO\s*=\s*['"]?(\d+)['"]?/gi;
  for (const match of sqlBlock.matchAll(eqRegex)) {
    const n = Number(match[1]);
    if (n > 0) codes.add(n);
  }
  const inRegex = /(?<![A-Z0-9_])CD_CAMPO\s+IN\s*\(([^)]+)\)/gi;
  for (const match of sqlBlock.matchAll(inRegex)) {
    match[1].split(',').forEach((part) => {
      const cleaned = part.trim().replace(/^['"]|['"]$/g, '');
      if (/^\d+$/.test(cleaned)) {
        const n = Number(cleaned);
        if (n > 0) codes.add(n);
      }
    });
  }
  return Array.from(codes);
}

/**
 * Resolve o mapeamento preciso dos campos de origem para um par (sourceDocId -> targetDocId) dentro de um contexto SQL.
 */
export function resolveSourceFieldsForPair(
  sourceDocId: number,
  sourceDoc: DocMapEntry,
  contextBlock: string,
  isInNotExists: boolean
): {
  matchedFields: LineageDocFieldEntry[];
  sourceTag?: string;
  sourceName?: string;
  isDocLevel: boolean;
  linkKind: LineageLinkKind;
} {
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
  const numericCodes = extractNumericFieldCodes(effectiveContext);

  const matchedFields: LineageDocFieldEntry[] = [];
  const seenTag = new Set<string>();

  for (const tokenUpper of quotedTokens) {
    const field = sourceDoc.fields.get(tokenUpper);
    if (field && !seenTag.has(field.tag.toUpperCase())) {
      seenTag.add(field.tag.toUpperCase());
      matchedFields.push(field);
    }
  }

  if (numericCodes.length > 0) {
    const codeSet = new Set(numericCodes);
    for (const field of sourceDoc.fields.values()) {
      if (codeSet.has(field.code) && !seenTag.has(field.tag.toUpperCase())) {
        seenTag.add(field.tag.toUpperCase());
        matchedFields.push(field);
      }
    }
  }

  const transfersContent = !isInNotExists && hasFieldContentProjection(effectiveContext);
  if (!transfersContent) {
    const primaryField = matchedFields[0];
    return {
      matchedFields,
      sourceTag: primaryField ? primaryField.tag : 'STATUS_FECHADO',
      sourceName: primaryField ? `${primaryField.name} (Validação/Filtro)` : 'Validação de Status / Existência',
      isDocLevel: true,
      linkKind: 'VALIDATION',
    };
  }

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
 * Mescla ou adiciona item em fieldsMap mantendo chaves distintas para Ações vs Regras SQL.
 */
export function upsertLineageFieldItem(
  targetList: LineageFieldItem[],
  item: LineageFieldItem,
  newSourceFields: LineageDocFieldEntry[]
): void {
  const buildKey = (f: LineageFieldItem) =>
    `${f.targetTag.trim().toUpperCase()}::${f.linkKind}::${f.originKind}::${(f.ruleName || '').trim().toUpperCase()}`;

  const itemKey = buildKey(item);
  const existing = targetList.find((f) => buildKey(f) === itemKey);

  if (!existing) {
    targetList.push(item);
    return;
  }

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

/**
 * Agrupa documentos em cadeias/componentes conectados via BFS não-direcionado,
 * atribuindo clusterId ordenado por tamanho e relevância.
 */
export function computeClusters(
  docIds: number[],
  edges: Array<{ sourceDocId: number; targetDocId: number; fieldsCount: number }>,
  docMap: Map<number, DocMapEntry>
): {
  docClusterMap: Map<number, number>;
  clusters: LineageClusterSummary[];
} {
  const adj = new Map<number, Set<number>>();
  const degree = new Map<number, number>();

  docIds.forEach((id) => {
    adj.set(id, new Set());
    degree.set(id, 0);
  });

  edges.forEach((e) => {
    if (!adj.has(e.sourceDocId)) adj.set(e.sourceDocId, new Set());
    if (!adj.has(e.targetDocId)) adj.set(e.targetDocId, new Set());
    adj.get(e.sourceDocId)!.add(e.targetDocId);
    adj.get(e.targetDocId)!.add(e.sourceDocId);
    degree.set(e.sourceDocId, (degree.get(e.sourceDocId) || 0) + e.fieldsCount);
    degree.set(e.targetDocId, (degree.get(e.targetDocId) || 0) + e.fieldsCount);
  });

  const visited = new Set<number>();
  const rawComponents: Array<{
    docIds: number[];
    edgeCount: number;
    totalFieldsLinked: number;
    hasBroken: boolean;
    hasLegacyV2: boolean;
    hubDocId: number;
  }> = [];

  for (const id of docIds) {
    if (visited.has(id)) continue;
    const queue = [id];
    const componentIds: number[] = [];
    visited.add(id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      componentIds.push(curr);
      for (const nb of adj.get(curr) || []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }

    const compSet = new Set(componentIds);
    const compEdges = edges.filter((e) => compSet.has(e.sourceDocId) && compSet.has(e.targetDocId));
    const totalFieldsLinked = compEdges.reduce((acc, e) => acc + e.fieldsCount, 0);

    let hasBroken = false;
    let hasLegacyV2 = false;
    let hubDocId = componentIds[0];
    let bestHubScore = -1;

    componentIds.forEach((docId) => {
      const doc = docMap.get(docId);
      if (doc?.isBroken) hasBroken = true;
      if (doc?.isLegacyV2) hasLegacyV2 = true;
      const score = (degree.get(docId) || 0) + (doc?.isBroken ? -0.5 : 0);
      if (score > bestHubScore) {
        bestHubScore = score;
        hubDocId = docId;
      }
    });

    rawComponents.push({
      docIds: componentIds.sort((a, b) => a - b),
      edgeCount: compEdges.length,
      totalFieldsLinked,
      hasBroken,
      hasLegacyV2,
      hubDocId,
    });
  }

  rawComponents.sort((a, b) => {
    if (b.docIds.length !== a.docIds.length) return b.docIds.length - a.docIds.length;
    if (b.edgeCount !== a.edgeCount) return b.edgeCount - a.edgeCount;
    return b.totalFieldsLinked - a.totalFieldsLinked;
  });

  const docClusterMap = new Map<number, number>();
  const clusters: LineageClusterSummary[] = rawComponents.map((comp, idx) => {
    const clusterId = idx + 1;
    comp.docIds.forEach((id) => docClusterMap.set(id, clusterId));
    const hubDoc = docMap.get(comp.hubDocId);
    const hubShortName = hubDoc?.isBroken
      ? `Doc ${comp.hubDocId}`
      : (hubDoc?.title || `Doc ${comp.hubDocId}`).slice(0, 32);

    return {
      clusterId,
      label: `Cadeia ${clusterId} · ${hubShortName}`,
      docIds: comp.docIds,
      docCount: comp.docIds.length,
      edgeCount: comp.edgeCount,
      totalFieldsLinked: comp.totalFieldsLinked,
      hasBroken: comp.hasBroken,
      hasLegacyV2: comp.hasLegacyV2,
    };
  });

  return { docClusterMap, clusters };
}

/**
 * Filtra os nós conectados ao rootDocId respeitando a profundidade configurável (1, 2 ou 'all'),
 * retornando o conjunto de documentos ativos e a distância direcional de saltos (negativo = upstream, 0 = foco, positivo = downstream).
 */
export function filterByFocusAndDepth(
  rootDocId: number,
  depth: LineageDepth,
  pairs: RawPairInput[],
  selfFieldsMap: Map<number, LineageFieldItem[]>
): {
  activeDocIds: Set<number>;
  hopDistance: Map<number, number>;
} {
  const maxDepth = depth === 'all' ? Number.POSITIVE_INFINITY : depth;
  const activeDocIds = new Set<number>([rootDocId]);
  const hopDistance = new Map<number, number>([[rootDocId, 0]]);

  // BFS Upstream (documentos que alimentam o foco)
  const upQueue: Array<{ docId: number; dist: number }> = [{ docId: rootDocId, dist: 0 }];
  const upVisited = new Set<number>([rootDocId]);
  while (upQueue.length > 0) {
    const { docId, dist } = upQueue.shift()!;
    if (dist >= maxDepth) continue;

    for (const p of pairs) {
      if (p.fieldsMap.length === 0) continue;
      if (p.targetDocId === docId && !upVisited.has(p.sourceDocId)) {
        upVisited.add(p.sourceDocId);
        activeDocIds.add(p.sourceDocId);
        const nextDist = dist + 1;
        if (!hopDistance.has(p.sourceDocId)) {
          hopDistance.set(p.sourceDocId, -nextDist);
        }
        upQueue.push({ docId: p.sourceDocId, dist: nextDist });
      }
    }
  }

  // BFS Downstream (documentos alimentados pelo foco)
  const downQueue: Array<{ docId: number; dist: number }> = [{ docId: rootDocId, dist: 0 }];
  const downVisited = new Set<number>([rootDocId]);
  while (downQueue.length > 0) {
    const { docId, dist } = downQueue.shift()!;
    if (dist >= maxDepth) continue;

    for (const p of pairs) {
      if (p.fieldsMap.length === 0) continue;
      if (p.sourceDocId === docId && !downVisited.has(p.targetDocId)) {
        downVisited.add(p.targetDocId);
        activeDocIds.add(p.targetDocId);
        const nextDist = dist + 1;
        if (!hopDistance.has(p.targetDocId)) {
          hopDistance.set(p.targetDocId, nextDist);
        }
        downQueue.push({ docId: p.targetDocId, dist: nextDist });
      }
    }
  }

  // Se o próprio rootDocId tiver apenas auto-herança, garante inclusão
  if ((selfFieldsMap.get(rootDocId)?.length || 0) > 0) {
    activeDocIds.add(rootDocId);
  }

  return { activeDocIds, hopDistance };
}
