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

      // Procura se o script cita expressamente algum campo do documento de origem
      let matchedSourceFieldTag: string | undefined = undefined;
      for (const [sTag, sField] of sourceDoc.fields.entries()) {
        const tagRegex = new RegExp(`['"]?${sTag}['"]?`, 'i');
        if (tagRegex.test(re.script)) {
          matchedSourceFieldTag = sTag;
          sField.hasLink = true;
          sField.isSource = true;
          break;
        }
      }

      // Se não encontrou campo correspondente no documento de origem, não cria vínculo espúrio
      if (!matchedSourceFieldTag) {
        return;
      }

      // Marca o campo alvo como tendo vínculo legítimo
      const targetField = targetDoc.fields.get(re.targetFieldTag);
      if (targetField) {
        targetField.hasLink = true;
        targetField.isTarget = true;
      }

      const edgeKey = `${sDocNum}_${matchedSourceFieldTag}->${tDocNum}_${re.targetFieldTag}`;
      if (!edgeKeySet.has(edgeKey)) {
        edgeKeySet.add(edgeKey);
        edges.push({
          id: `edge_sql_${idx}_${sDocNum}_${tDocNum}`,
          sourceDocId: String(sDocNum),
          sourceFieldTag: matchedSourceFieldTag,
          targetDocId: String(tDocNum),
          targetFieldTag: re.targetFieldTag,
          type: 'SQL_QUERY',
          label: 'Consulta SQL',
          script: re.script.slice(0, 500)
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

