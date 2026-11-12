import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export const dynamic = 'force-dynamic';

export interface LineageFieldItem {
  sourceTag?: string;
  sourceName?: string;
  targetTag: string;
  targetName: string;
  script: string;
  isDocLevel: boolean;
}

export interface ExecutiveEdgeData {
  id: string;
  sourceDocId: string;
  targetDocId: string;
  totalFields: number;
  fieldsMap: LineageFieldItem[];
  label: string;
  type: 'SQL_QUERY';
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
  isFocus?: boolean;
  fields: Array<{
    code: number;
    tag: string;
    name: string;
    metadataId?: number;
    hasLink: boolean;
  }>;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encontra com rigor estrito se algum campo do documento de origem é explicitamente citado no script.
 * Não utiliza aproximações de similaridade ou chutes: a tag deve constar delimitada no código SQL.
 */
function findStrictSourceField(
  sourceFields: Map<string, { tag: string; name: string }>,
  script: string
): { tag: string; name: string } | null {
  for (const [tag, field] of sourceFields.entries()) {
    // Procura por 'TAG_NAME' ou "TAG_NAME" ou ds_identificador = 'TAG_NAME'
    const pattern = new RegExp(`['"]${escapeRegex(tag)}['"]`, 'i');
    if (pattern.test(script)) {
      return field;
    }
  }
  return null;
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
             NVL(ec.ds_campo, ec.ds_identificador) AS "TARGET_FIELD_NAME",
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

    // Coleta todos os documentos participantes preliminares
    const rawPairs: Array<{
      sourceDocId: number;
      targetDocId: number;
      targetFieldTag: string;
      targetFieldName: string;
      script: string;
    }> = [];

    const involvedDocIds = new Set<number>();

    actionRows.forEach((row: any) => {
      const targetDoc = Number(row.TARGET_DOC_ID);
      const targetTag = String(row.TARGET_FIELD_TAG || '').trim();
      const targetName = String(row.TARGET_FIELD_NAME || targetTag).trim();
      const script = String(row.SCRIPT || '');

      const sources: number[] = [];
      if (row.REF_DOC_EQ && /^\d+$/.test(String(row.REF_DOC_EQ).trim())) {
        sources.push(Number(String(row.REF_DOC_EQ).trim()));
      }
      if (row.REF_DOC_IN) {
        String(row.REF_DOC_IN).split(',').forEach((s: string) => {
          const t = s.trim();
          if (t && /^\d+$/.test(t)) sources.push(Number(t));
        });
      }

      sources.forEach(srcNum => {
        if (srcNum && srcNum !== targetDoc) {
          rawPairs.push({
            sourceDocId: srcNum,
            targetDocId: targetDoc,
            targetFieldTag: targetTag,
            targetFieldName: targetName,
            script
          });
          involvedDocIds.add(srcNum);
          involvedDocIds.add(targetDoc);
        }
      });
    });

    if (involvedDocIds.size === 0) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        availableDocs: [],
        summary: { totalDocs: 0, totalEdges: 0, linkedDocs: 0 }
      });
    }

    // 2. Busca todos os campos e nomes dos documentos participantes
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

    const docDetailRows = await executeQuery(connection, docsDetailsSql, {});

    // Mapeamento em memória de cada documento e seus campos
    const docMap = new Map<number, {
      title: string;
      version: number;
      versionType: string;
      fields: Map<string, { code: number; tag: string; name: string; metadataId?: number; hasLink: boolean }>;
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
          code: Number(r.CD_CAMPO),
          tag,
          name: String(r.DS_CAMPO || tag),
          metadataId: r.CD_METADADO ? Number(r.CD_METADADO) : undefined,
          hasLink: false
        });
      }
    });

    // 3. Validação Estrita de Vínculos & Consolidação por Par (Source ➔ Target)
    const pairMap = new Map<string, {
      sourceDocId: number;
      targetDocId: number;
      fieldsMap: LineageFieldItem[];
    }>();

    rawPairs.forEach(pair => {
      const sourceDoc = docMap.get(pair.sourceDocId);
      const targetDoc = docMap.get(pair.targetDocId);
      if (!sourceDoc || !targetDoc) return;

      // Validação Estrita do Campo de Origem
      const matchedSource = findStrictSourceField(sourceDoc.fields, pair.script);
      const isDocLevel = !matchedSource;

      // Marca que o campo tem vínculo ativo
      if (matchedSource) {
        const sField = sourceDoc.fields.get(matchedSource.tag);
        if (sField) sField.hasLink = true;
      }
      const tField = targetDoc.fields.get(pair.targetFieldTag);
      if (tField) tField.hasLink = true;

      const pairKey = `${pair.sourceDocId}_${pair.targetDocId}`;
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          sourceDocId: pair.sourceDocId,
          targetDocId: pair.targetDocId,
          fieldsMap: []
        });
      }

      // Evita duplicatas exatas dentro do mesmo par
      const existingFields = pairMap.get(pairKey)!.fieldsMap;
      const alreadyAdded = existingFields.some(
        f => f.targetTag === pair.targetFieldTag && f.sourceTag === (matchedSource?.tag || undefined)
      );

      if (!alreadyAdded) {
        existingFields.push({
          sourceTag: matchedSource?.tag,
          sourceName: matchedSource?.name,
          targetTag: pair.targetFieldTag,
          targetName: pair.targetFieldName,
          script: pair.script,
          isDocLevel
        });
      }
    });

    // 4. Modo Foco (Single-Doc Explorer) vs Visão Global
    let activeDocIds = new Set<number>();
    const rootNum = rootDocId && /^\d+$/.test(rootDocId) ? Number(rootDocId) : null;

    if (rootNum && docMap.has(rootNum)) {
      activeDocIds.add(rootNum);
      // Upstream: quem alimenta o root
      // Downstream: quem o root alimenta
      pairMap.forEach(p => {
        if (p.targetDocId === rootNum) {
          activeDocIds.add(p.sourceDocId);
        }
        if (p.sourceDocId === rootNum) {
          activeDocIds.add(p.targetDocId);
        }
      });
    } else {
      // Visão Global: inclui todos os documentos que possuem ao menos 1 aresta válida
      pairMap.forEach(p => {
        if (p.fieldsMap.length > 0) {
          activeDocIds.add(p.sourceDocId);
          activeDocIds.add(p.targetDocId);
        }
      });
    }

    // 5. Montagem das Arestas Executivas Finais
    const executiveEdges: ExecutiveEdgeData[] = [];
    pairMap.forEach((p, key) => {
      // Apenas inclui arestas cujos dois documentos estejam no escopo ativo
      if (!activeDocIds.has(p.sourceDocId) || !activeDocIds.has(p.targetDocId)) return;
      if (p.fieldsMap.length === 0) return;

      const totalFields = p.fieldsMap.length;
      const label = totalFields === 1 ? '1 campo vinculado' : `${totalFields} campos vinculados`;

      executiveEdges.push({
        id: `edge_${key}`,
        sourceDocId: String(p.sourceDocId),
        targetDocId: String(p.targetDocId),
        totalFields,
        fieldsMap: p.fieldsMap,
        label,
        type: 'SQL_QUERY'
      });
    });

    // 6. Montagem dos Nós Executivos Finais
    const upstreamCounters = new Map<number, number>();
    const downstreamCounters = new Map<number, number>();

    executiveEdges.forEach(e => {
      const s = Number(e.sourceDocId);
      const t = Number(e.targetDocId);
      downstreamCounters.set(s, (downstreamCounters.get(s) || 0) + 1);
      upstreamCounters.set(t, (upstreamCounters.get(t) || 0) + 1);
    });

    const executiveNodes: LineageDocNodeData[] = [];
    activeDocIds.forEach(docId => {
      const docData = docMap.get(docId);
      if (!docData) return;

      const allFields = Array.from(docData.fields.values());
      executiveNodes.push({
        id: `doc_${docId}`,
        docId,
        title: docData.title,
        version: docData.version,
        versionType: docData.versionType,
        tech: 'HTML5',
        totalFields: allFields.length,
        upstreamCount: upstreamCounters.get(docId) || 0,
        downstreamCount: downstreamCounters.get(docId) || 0,
        isFocus: rootNum === docId,
        fields: allFields.filter(f => f.hasLink)
      });
    });

    // 7. Lista de Documentos Disponíveis Ordenada por Relevância de Vínculos
    const docTotalLinks = new Map<number, number>();
    pairMap.forEach(p => {
      docTotalLinks.set(p.sourceDocId, (docTotalLinks.get(p.sourceDocId) || 0) + p.fieldsMap.length);
      docTotalLinks.set(p.targetDocId, (docTotalLinks.get(p.targetDocId) || 0) + p.fieldsMap.length);
    });

    const availableDocs = Array.from(docMap.entries())
      .filter(([id]) => (docTotalLinks.get(id) || 0) > 0)
      .map(([id, doc]) => ({
        id,
        title: doc.title,
        totalLinks: docTotalLinks.get(id) || 0
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
        totalFieldsLinked: executiveEdges.reduce((acc, e) => acc + e.totalFields, 0)
      }
    });

  } catch (err: any) {
    console.error('[Lineage API Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar linhagem executiva' }, { status: 500 });
  }
}
