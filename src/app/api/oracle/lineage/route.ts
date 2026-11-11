import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export const dynamic = 'force-dynamic';

interface LineageField {
  id: string;
  code: number;
  tag: string;
  name: string;
  metadataId?: number;
  hasLink: boolean;
  isSource?: boolean;
  isTarget?: boolean;
}

interface LineageDocNode {
  id: string;
  docId: number;
  title: string;
  version: number;
  versionType: string;
  tech: string;
  totalFields: number;
  linkedFieldsCount: number;
  fields: LineageField[];
  unlinkedFields: LineageField[];
}

interface LineageEdge {
  id: string;
  sourceDocId: string;
  sourceFieldTag?: string;
  targetDocId: string;
  targetFieldTag?: string;
  type: 'SQL_QUERY' | 'INHERITANCE';
  label?: string;
  script?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(tag: string): string[] {
  return (tag || '')
    .replace(/^(TXT|CB|CXT|RB|DS|VL|DT|CK)_/i, '')
    .split('_')
    .map(t => t.toUpperCase())
    .filter(t => t.length > 1 || t === 'N');
}

function computeSimilarity(sourceTag: string, targetTag: string): number {
  const sTokens = tokenize(sourceTag);
  const tTokens = tokenize(targetTag);
  let matches = 0;
  for (const st of sTokens) {
    if (tTokens.includes(st)) {
      matches += 2;
    } else if (st === 'NR' && tTokens.includes('N')) {
      matches += 1.5;
    } else if (st === 'N' && tTokens.includes('NR')) {
      matches += 1.5;
    }
  }
  return matches;
}

function getMainSelectProjection(sql: string): string {
  const m = sql.match(/^\s*SELECT\s+(?:DISTINCT\s+)?([\s\S]+?)\s+FROM\b/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function findBestSourceField(
  sourceFields: LineageField[],
  targetTag: string,
  script: string
): { field: LineageField | null; isDocLevelOnly: boolean } {
  const projection = getMainSelectProjection(script);

  // Se o SELECT projeta exclusivamente metadados/auditoria do documento de origem (ex: dh_criacao, dh_fechamento)
  // e não o conteúdo de campos (lo_conteudo), o vínculo é a nível de Documento clínico, não de campo individual.
  const isDocLevelOnly = /\b(dh_criacao|dh_fechamento|cd_documento_clinico|cd_atendimento)\b/i.test(projection)
    && !/lo_conteudo|lo_valor|ds_conteudo/i.test(projection);

  if (isDocLevelOnly) {
    return { field: null, isDocLevelOnly: true };
  }

  const candidates: Array<{ field: LineageField; score: number }> = [];

  for (const field of sourceFields) {
    const sTag = field.tag;
    if (!sTag) continue;

    // A tag deve aparecer entre aspas ou delimitada por limites de palavra/sublinhado
    const tagPattern = new RegExp(`['"]${escapeRegex(sTag)}['"]|(?:\\b|_)` + escapeRegex(sTag) + `(?:\\b|_)`, 'i');
    if (!tagPattern.test(script)) continue;

    let score = 10;

    // 1. O script possui subquery com alias projetado no SELECT externo?
    // Ex: SELECT solicitacao as tipo FROM ... LEFT JOIN (... as solicitacao WHERE ds_identificador = 'TXT_NR_SOLICITACAO')
    const subqueryMatch = new RegExp(
      `SELECT[\\s\\S]*?lo_conteudo[\\s\\S]*?\\bAS\\s+([a-zA-Z0-9_]+)[\\s\\S]*?ds_identificador\\s*=\\s*['"]${escapeRegex(sTag)}['"]`,
      'i'
    ).exec(script);

    if (subqueryMatch) {
      const alias = subqueryMatch[1];
      const aliasInProjection = new RegExp(`(?:\\b|_)${escapeRegex(alias)}(?:\\b|_)`, 'i').test(projection);
      if (aliasInProjection) {
        score += 100; // Coluna cujo valor alimenta diretamente a saída
      } else {
        score += 15;
      }
    } else {
      // 2. Consulta direta de lo_conteudo/lo_valor associado a este ds_identificador
      const directSelect = new RegExp(
        `SELECT[\\s\\S]*?(?:lo_conteudo|lo_valor)[\\s\\S]*?FROM[\\s\\S]*?ds_identificador[\\s\\S]*?['"]${escapeRegex(sTag)}['"]`,
        'i'
      ).test(script);
      if (directSelect) {
        score += 80;
      }
    }

    // 3. Similaridade semântica entre tags (ex: TXT_NR_SOLICITACAO <-> TXT_N_SOLICITACAO_RECEB)
    const sim = computeSimilarity(sTag, targetTag);
    score += sim * 15;

    // 4. Correspondência de tipo/prefixo de widget (ex: TXT_ com TXT_, CXT_ com CXT_)
    const sPrefix = (sTag.match(/^[A-Z]+/i) || [''])[0].toUpperCase();
    const tPrefix = (targetTag.match(/^[A-Z]+/i) || [''])[0].toUpperCase();
    if (sPrefix && sPrefix === tPrefix) {
      score += 5;
    }

    candidates.push({ field, score });
  }

  if (candidates.length === 0) {
    return { field: null, isDocLevelOnly: false };
  }

  candidates.sort((a, b) => b.score - a.score);
  return { field: candidates[0].field, isDocLevelOnly: false };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rootDocId = searchParams.get('rootDocId');
  const onlyLinked = searchParams.get('onlyLinked') !== 'false';

  const data = await getData();
  const connection = data.connections.find(c => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    // 1. Busca todas as ações SQL com referências de documentos clínicos
    const actionsSql = `
      SELECT DISTINCT
             ed.cd_documento                       AS "TARGET_DOC_ID",
             UPPER(ed.ds_documento)                AS "TARGET_DOC_NAME",
             evd.vl_versao                         AS "TARGET_VERSION",
             evd.tp_versao                         AS "TARGET_TP_VERSAO",
             ec.cd_campo                           AS "TARGET_FIELD_ID",
             ec.cd_metadado                        AS "TARGET_METADATA_ID",
             ec.ds_identificador                   AS "TARGET_FIELD_TAG",
             ec.ds_campo                           AS "TARGET_FIELD_NAME",
             REGEXP_SUBSTR(
                 DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
                 'CD_DOCUMENTO[[:space:]]+IN[[:space:]]*\\(([0-9[:space:],]+)\\)',
                 1, 1, 'i', 1
             )                                     AS "REF_DOC_IN",
             REGEXP_SUBSTR(
                 DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1),
                 'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
                 1, 1, 'i', 1
             )                                     AS "REF_DOC_EQ",
             DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1) AS "SCRIPT"
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
           REGEXP_LIKE(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'CD_DOCUMENTO[[:space:]]*=', 'i')
           OR REGEXP_LIKE(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'CD_DOCUMENTO[[:space:]]+IN', 'i')
           OR REGEXP_LIKE(DBMS_LOB.SUBSTR(ev.lo_valor, 4000, 1), 'EDITOR_REGISTRO_CAMPO', 'i')
         )
    `;

    const actionRows = await executeQuery(connection, actionsSql, {});

    // Parse de arestas preliminares
    const rawEdges: Array<{
      sourceDocId: string;
      targetDocId: string;
      targetFieldTag: string;
      targetFieldId: number;
      script: string;
    }> = [];

    const involvedDocIds = new Set<number>();

    actionRows.forEach((row: any) => {
      const targetDoc = Number(row.TARGET_DOC_ID);
      const targetTag = String(row.TARGET_FIELD_TAG || '').trim();
      const script = String(row.SCRIPT || '');

      // Extrai documentos fontes referenciados
      const sources: string[] = [];
      if (row.REF_DOC_EQ) {
        sources.push(String(row.REF_DOC_EQ).trim());
      }
      if (row.REF_DOC_IN) {
        String(row.REF_DOC_IN).split(',').forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed && /^\d+$/.test(trimmed)) sources.push(trimmed);
        });
      }

      sources.forEach(src => {
        const srcNum = Number(src);
        if (srcNum && srcNum !== targetDoc) {
          rawEdges.push({
            sourceDocId: String(srcNum),
            targetDocId: String(targetDoc),
            targetFieldTag: targetTag,
            targetFieldId: Number(row.TARGET_FIELD_ID),
            script
          });
          involvedDocIds.add(srcNum);
          involvedDocIds.add(targetDoc);
        }
      });
    });

    // Se usuário especificou um documento raiz, filtramos os documentos conectados
    let filteredDocIds = Array.from(involvedDocIds);
    if (rootDocId && /^\d+$/.test(rootDocId)) {
      const rootNum = Number(rootDocId);
      const connected = new Set<number>([rootNum]);
      rawEdges.forEach(e => {
        const s = Number(e.sourceDocId);
        const t = Number(e.targetDocId);
        if (s === rootNum || t === rootNum) {
          connected.add(s);
          connected.add(t);
        }
      });
      filteredDocIds = Array.from(connected);
    } else if (!onlyLinked) {
      // Se não filtrar apenas conectados, adicionamos alguns documentos adicionais
      const extraDocsSql = `
        SELECT cd_documento
          FROM (SELECT cd_documento FROM editor.editor_documento ORDER BY cd_documento DESC)
         WHERE ROWNUM <= 8
      `;
      const extraRows = await executeQuery(connection, extraDocsSql, {});
      extraRows.forEach((r: any) => filteredDocIds.push(Number(r.CD_DOCUMENTO)));
      filteredDocIds = Array.from(new Set(filteredDocIds));
    }

    if (filteredDocIds.length === 0) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        summary: { totalDocs: 0, totalEdges: 0, linkedDocs: 0 }
      });
    }

    // 2. Busca informações completas dos documentos e seus campos
    const inDocsList = filteredDocIds.join(', ');
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

    const docDetailRows = await executeQuery(connection, docsDetailsSql, {});

    // Agrupa campos por documento
    const docMap = new Map<number, {
      title: string;
      version: number;
      versionType: string;
      fields: Map<string, LineageField>;
    }>();

    docDetailRows.forEach((r: any) => {
      const docId = Number(r.CD_DOCUMENTO);
      if (!docMap.has(docId)) {
        docMap.set(docId, {
          title: r.DS_DOCUMENTO || `Documento ${docId}`,
          version: r.VL_VERSAO || 1,
          versionType: r.TP_VERSAO || 'PUBLISHED',
          fields: new Map()
        });
      }

      const docObj = docMap.get(docId)!;
      const tag = String(r.DS_IDENTIFICADOR || '').trim();
      if (tag && !docObj.fields.has(tag)) {
        docObj.fields.set(tag, {
          id: `field_${docId}_${r.CD_CAMPO}`,
          code: Number(r.CD_CAMPO),
          tag,
          name: String(r.DS_CAMPO || tag),
          metadataId: r.CD_METADADO ? Number(r.CD_METADADO) : undefined,
          hasLink: false
        });
      }
    });

    // 3. Monta as arestas e detecta o campo exato de origem
    const edges: LineageEdge[] = [];
    const edgeKeySet = new Set<string>();

    rawEdges.forEach((re, idx) => {
      const sDocNum = Number(re.sourceDocId);
      const tDocNum = Number(re.targetDocId);

      // Apenas processa se ambos os documentos estiverem no escopo
      if (!docMap.has(sDocNum) || !docMap.has(tDocNum)) return;

      const sourceDoc = docMap.get(sDocNum)!;
      const targetDoc = docMap.get(tDocNum)!;

      // Detecta com heurística avançada qual campo do documento de origem é o verdadeiro provedor do dado
      const sourceFieldsList = Array.from(sourceDoc.fields.values());
      const { field: bestSourceField, isDocLevelOnly } = findBestSourceField(
        sourceFieldsList,
        re.targetFieldTag,
        re.script
      );

      // Se não encontrou campo correspondente e não é um vínculo a nível de documento, ignora
      if (!bestSourceField && !isDocLevelOnly) {
        return;
      }

      // Marca campo alvo
      const targetField = targetDoc.fields.get(re.targetFieldTag);
      if (targetField) {
        targetField.hasLink = true;
        targetField.isTarget = true;
      }

      // Marca campo origem (se for a nível de campo)
      let matchedSourceFieldTag: string | undefined = undefined;
      if (bestSourceField) {
        matchedSourceFieldTag = bestSourceField.tag;
        bestSourceField.hasLink = true;
        bestSourceField.isSource = true;
      }

      const edgeKey = `${sDocNum}_${matchedSourceFieldTag || 'DOC'}->${tDocNum}_${re.targetFieldTag}`;
      if (!edgeKeySet.has(edgeKey)) {
        edgeKeySet.add(edgeKey);
        edges.push({
          id: `edge_sql_${idx}_${sDocNum}_${tDocNum}`,
          sourceDocId: String(sDocNum),
          sourceFieldTag: matchedSourceFieldTag,
          targetDocId: String(tDocNum),
          targetFieldTag: re.targetFieldTag,
          type: 'SQL_QUERY',
          label: isDocLevelOnly ? 'Auditoria (Doc)' : 'Consulta SQL',
          script: re.script
        });
      }
    });

    // 4. Monta os nós no formato React Flow Custom Node
    let nodes: LineageDocNode[] = [];
    docMap.forEach((docData, docId) => {
      const allFields = Array.from(docData.fields.values());
      const linked = allFields.filter(f => f.hasLink);
      const unlinked = allFields.filter(f => !f.hasLink);

      // Se estiver em modo "apenas vinculados" e o doc não tiver campos vinculados, pula
      if (onlyLinked && linked.length === 0) {
        return;
      }

      nodes.push({
        id: `doc_${docId}`,
        docId,
        title: docData.title,
        version: docData.version,
        versionType: docData.versionType,
        tech: 'HTML5',
        totalFields: allFields.length,
        linkedFieldsCount: linked.length,
        fields: linked,
        unlinkedFields: unlinked
      });
    });

    // 5. Integridade Referencial Estrita:
    // Apenas arestas cujos nós de origem E destino existem no grafo são mantidas
    const nodeIds = new Set(nodes.map(n => n.id));
    const validEdges = edges.filter(e => 
      nodeIds.has(`doc_${e.sourceDocId}`) && nodeIds.has(`doc_${e.targetDocId}`)
    );

    // Em modo "apenas vinculados", elimina qualquer bloco isolado:
    // Todo nó retornado DEVE obrigatoriamente possuir ao menos uma aresta válida conectada
    if (onlyLinked) {
      const connectedDocIds = new Set<string>();
      validEdges.forEach(e => {
        connectedDocIds.add(e.sourceDocId);
        connectedDocIds.add(e.targetDocId);
      });
      nodes = nodes.filter(n => connectedDocIds.has(String(n.docId)));
    }

    return NextResponse.json({
      nodes,
      edges: validEdges,
      summary: {
        totalDocs: nodes.length,
        totalEdges: validEdges.length,
        linkedDocs: nodes.filter(n => n.linkedFieldsCount > 0).length
      }
    });
  } catch (err: any) {
    console.error('[Lineage API Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar linhagem' }, { status: 500 });
  }
}

