import { NextRequest, NextResponse } from 'next/server';
import { getData, type DocMapping } from '@/lib/storage';
import { getPool, loadOracleDb } from '@/lib/oracle';
import { isDemoConnection } from '@/lib/demo-mock';
import { clearQueryCache } from '@/lib/cache';
import { calculateSimilarityPercent, sanitizeAuditOwner, type EditorEngineVersion } from '@/lib/similarity';

export const dynamic = 'force-dynamic';

interface NormalizedDocFilter {
  docId: number;
  name: string;
  fieldIds: string[];
}

interface OracleResultSet {
  getRows: (numRows: number) => Promise<unknown[]>;
  close: () => Promise<void>;
}

interface OracleConnectionHandle {
  execute: (
    sql: string,
    binds?: Record<string, string | number | Date | null>,
    options?: Record<string, unknown>
  ) => Promise<{ rows?: unknown[]; resultSet?: OracleResultSet }>;
  executeMany: (
    sql: string,
    binds: Array<Record<string, string | number | Date | null>>,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  close: () => Promise<void>;
}

interface CountRow {
  CD_DOCUMENTO: number | string;
  IDENTIFICADOR_FILTRO: string | null;
  QTD_REGISTROS: number | string;
}

interface ViewRow {
  CD_ATENDIMENTO: number | string;
  CD_DOCUMENTO: number | string;
  DS_DOCUMENTO: string | null;
  IDENTIFICADOR_FILTRO: string | null;
  DH_FECHAMENTO: Date;
  CD_PRESTADOR: number | string | null;
  LEITO: string | null;
  UNIDADE: string | null;
  TEXTO_ATUAL: string | null;
  TEXTO_ANTERIOR: string | null;
}

interface StreamStats {
  stage: 'COUNT' | 'EXTRACT' | 'LOAD' | 'DONE';
  totalRaw: number;
  loaded: number;
  scored: number;
  inserted: number;
  totalPairs: number;
  critical: number;
}

function truncateUtf8Bytes(value: unknown, maxBytes: number): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (Buffer.byteLength(str, 'utf8') <= maxBytes) return str;
  let result = '';
  let byteCount = 0;
  for (const ch of str) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    if (byteCount + chBytes > maxBytes) break;
    result += ch;
    byteCount += chBytes;
  }
  return result;
}

function normalizeMappings(
  mappings: DocMapping[],
  fallbackAuditDocId?: string | number
): {
  items: NormalizedDocFilter[];
  docIds: number[];
} {
  const items: NormalizedDocFilter[] = [];
  const seenDocs = new Set<number>();

  for (const mapping of mappings) {
    const rawId = String(mapping?.id ?? '').trim();
    const docId = Number(rawId);
    if (!rawId || !Number.isInteger(docId) || docId <= 0) continue;

    const fieldIds = Array.from(
      new Set(
        (mapping.fields || [])
          .map((f) => String(f?.id ?? '').trim().toUpperCase())
          .filter(Boolean)
      )
    );

    items.push({
      docId,
      name: String(mapping.name || `Documento ${docId}`).trim(),
      fieldIds,
    });
    seenDocs.add(docId);
  }

  if (items.length === 0 && fallbackAuditDocId !== undefined && fallbackAuditDocId !== null) {
    const rawFallback = String(fallbackAuditDocId).trim();
    if (rawFallback && rawFallback !== '0') {
      for (const token of rawFallback.split(',')) {
        const docId = Number(token.trim());
        if (Number.isInteger(docId) && docId > 0 && !seenDocs.has(docId)) {
          seenDocs.add(docId);
          items.push({
            docId,
            name: `Documento ${docId}`,
            fieldIds: [],
          });
        }
      }
    }
  }

  return {
    items,
    docIds: Array.from(seenDocs),
  };
}

function buildFilterClause(
  items: NormalizedDocFilter[],
  docCol: string,
  fieldCol: string,
  initialBinds: Record<string, string | number>
): { clause: string; binds: Record<string, string | number> } {
  const binds: Record<string, string | number> = { ...initialBinds };
  if (items.length === 0) {
    return { clause: '', binds };
  }

  const orParts: string[] = [];
  items.forEach((item, idx) => {
    const docBind = `p_doc_${idx}`;
    binds[docBind] = item.docId;

    if (item.fieldIds.length > 0) {
      const fldBinds: string[] = [];
      item.fieldIds.forEach((fld, fIdx) => {
        const fldBind = `p_fld_${idx}_${fIdx}`;
        binds[fldBind] = fld;
        fldBinds.push(`:${fldBind}`);
      });
      orParts.push(`(${docCol} = :${docBind} AND UPPER(${fieldCol}) IN (${fldBinds.join(', ')}))`);
    } else {
      orParts.push(`(${docCol} = :${docBind})`);
    }
  });

  return {
    clause: `AND (${orParts.join(' OR ')})`,
    binds,
  };
}

function getEngineTables(version: EditorEngineVersion) {
  const isV3 = version !== 'V2';
  return {
    ercTable: isV3 ? 'EDITOR.EDITOR_REGISTRO_CAMPO' : 'DBAMV.EDITOR_REGISTRO_CAMPO',
    ecaTable: isV3 ? 'EDITOR.EDITOR_CAMPO' : 'DBAMV.EDITOR_CAMPO',
    lobCol: isV3 ? 'ERC.LO_CONTEUDO' : 'ERC.LO_VALOR',
  };
}

function buildCountByDocFieldSql(
  version: EditorEngineVersion,
  innerDocFilterClause: string
): string {
  const { ercTable, ecaTable, lobCol } = getEngineTables(version);
  return `
    SELECT
        PEC.CD_DOCUMENTO AS CD_DOCUMENTO,
        ECA.DS_IDENTIFICADOR AS IDENTIFICADOR_FILTRO,
        COUNT(1) AS QTD_REGISTROS
    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
    INNER JOIN DBAMV.PW_EDITOR_CLINICO PEC
        ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
    INNER JOIN ${ercTable} ERC
        ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO
    INNER JOIN ${ecaTable} ECA
        ON ECA.CD_CAMPO = ERC.CD_CAMPO
    WHERE PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
      AND ECA.CD_TIPO_VISUALIZACAO IN (1, 2)
      AND ${lobCol} IS NOT NULL
      AND NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) >= TRUNC(SYSDATE) - :p_days
      ${innerDocFilterClause}
    GROUP BY PEC.CD_DOCUMENTO, ECA.DS_IDENTIFICADOR
    ORDER BY QTD_REGISTROS DESC
  `;
}

function buildTopFieldsHintSql(version: EditorEngineVersion, docIdBinds: string): string {
  const { ercTable, ecaTable, lobCol } = getEngineTables(version);
  return `
    SELECT * FROM (
      SELECT
          PEC.CD_DOCUMENTO AS CD_DOCUMENTO,
          ECA.DS_IDENTIFICADOR AS IDENTIFICADOR_FILTRO,
          COUNT(1) AS QTD_REGISTROS
      FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
      INNER JOIN DBAMV.PW_EDITOR_CLINICO PEC
          ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
      INNER JOIN ${ercTable} ERC
          ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO
      INNER JOIN ${ecaTable} ECA
          ON ECA.CD_CAMPO = ERC.CD_CAMPO
      WHERE PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
        AND ECA.CD_TIPO_VISUALIZACAO IN (1, 2)
        AND ${lobCol} IS NOT NULL
        AND NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) >= TRUNC(SYSDATE) - :p_days
        AND PEC.CD_DOCUMENTO IN (${docIdBinds})
      GROUP BY PEC.CD_DOCUMENTO, ECA.DS_IDENTIFICADOR
      ORDER BY QTD_REGISTROS DESC
    ) WHERE ROWNUM <= 8
  `;
}

function buildDirectPushedSql(
  version: EditorEngineVersion,
  innerDocFilterClause: string
): string {
  const { ercTable, ecaTable, lobCol } = getEngineTables(version);
  return `
    SELECT * FROM (
      SELECT
          PDC.CD_ATENDIMENTO,
          PEC.CD_DOCUMENTO,
          PTD.DS_TIPO_DOCUMENTO AS DS_DOCUMENTO,
          ECA.DS_IDENTIFICADOR  AS IDENTIFICADOR_FILTRO,
          NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) AS DH_FECHAMENTO,
          PDC.CD_PRESTADOR      AS CD_PRESTADOR,
          LEI.DS_RESUMO         AS LEITO,
          UNI.DS_UNID_INT       AS UNIDADE,
          DBMS_LOB.SUBSTR(${lobCol}, 4000, 1) AS TEXTO_ATUAL,
          LAG(DBMS_LOB.SUBSTR(${lobCol}, 4000, 1)) OVER (
              PARTITION BY ATE.CD_PACIENTE, PEC.CD_DOCUMENTO, UPPER(ECA.DS_IDENTIFICADOR)
              ORDER BY NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO)
          ) AS TEXTO_ANTERIOR
      FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
      INNER JOIN DBAMV.PW_TIPO_DOCUMENTO PTD
          ON PDC.CD_TIPO_DOCUMENTO = PTD.CD_TIPO_DOCUMENTO
      INNER JOIN DBAMV.PW_EDITOR_CLINICO PEC
          ON PEC.CD_DOCUMENTO_CLINICO = PDC.CD_DOCUMENTO_CLINICO
      INNER JOIN ${ercTable} ERC
          ON ERC.CD_REGISTRO = PEC.CD_EDITOR_REGISTRO
      INNER JOIN ${ecaTable} ECA
          ON ECA.CD_CAMPO = ERC.CD_CAMPO
      INNER JOIN DBAMV.ATENDIME ATE
          ON ATE.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
      LEFT JOIN DBAMV.LEITO LEI
          ON ATE.CD_LEITO = LEI.CD_LEITO
      LEFT JOIN DBAMV.UNID_INT UNI
          ON LEI.CD_UNID_INT = UNI.CD_UNID_INT
      WHERE PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
        AND ECA.CD_TIPO_VISUALIZACAO IN (1, 2)
        AND ${lobCol} IS NOT NULL
        AND NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) >= TRUNC(SYSDATE) - (:p_days + 7)
        ${innerDocFilterClause}
    )
    WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - :p_days
      AND TEXTO_ATUAL IS NOT NULL
      AND TEXTO_ANTERIOR IS NOT NULL
  `;
}

async function fetchRowsStreaming(
  oracleConn: OracleConnectionHandle,
  sql: string,
  binds: Record<string, string | number>,
  outFormatObject: unknown,
  onBatch: (loadedSoFar: number) => void
): Promise<ViewRow[]> {
  const BATCH_SIZE = 200;
  const result = await oracleConn.execute(sql, binds, {
    outFormat: outFormatObject,
    resultSet: true,
    fetchArraySize: BATCH_SIZE,
  });

  if (result.resultSet) {
    const rs = result.resultSet;
    const collected: ViewRow[] = [];
    try {
      while (true) {
        const batch = (await rs.getRows(BATCH_SIZE)) as ViewRow[];
        if (!batch || batch.length === 0) break;
        collected.push(...batch);
        onBatch(collected.length);
      }
    } finally {
      try {
        await rs.close();
      } catch {
        // ignore resultSet close errors
      }
    }
    return collected;
  }

  const directRows = (result.rows || []) as ViewRow[];
  if (directRows.length > 0) {
    onBatch(directRows.length);
  }
  return directRows;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scriptName = body.script || 'similaridade';

    if (scriptName !== 'similaridade') {
      return NextResponse.json({ error: 'Script não autorizado ou desconhecido.' }, { status: 400 });
    }

    const data = await getData();
    const activeConn = data.connections.find((c) => c.id === data.activeConnectionId);
    if (!activeConn) {
      return NextResponse.json(
        { error: 'Nenhuma conexão Oracle ativa configurada para executar a auditoria.' },
        { status: 400 }
      );
    }

    const owner = sanitizeAuditOwner(body.schemaOwner ?? data.auditSchemaOwner);
    const auditDays = Math.max(1, Math.min(365, Number(body.auditDays ?? data.auditDays ?? 15) || 15));
    const version: EditorEngineVersion = body.version === 'V2' ? 'V2' : 'V3';
    const versionLabel = version === 'V3' ? 'Editor 3.0 (EDITOR)' : 'Editor 2.0 (DBAMV)';
    const rawMappingsAll: DocMapping[] = Array.isArray(body.docMappings)
      ? body.docMappings
      : data.docMappings || [];
    const rawMappings = rawMappingsAll.filter((m) => !m.engine || m.engine === version);
    const { items, docIds } = normalizeMappings(
      rawMappings,
      rawMappingsAll.length === 0 ? data.auditDocId : undefined
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const log = (msg: string) => {
          const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
          controller.enqueue(encoder.encode(`[${ts}] ${msg}\n`));
        };

        const emitStats = (stats: StreamStats) => {
          controller.enqueue(encoder.encode(`[STATS] ${JSON.stringify(stats)}\n`));
        };

        let conn: OracleConnectionHandle | null = null;
        try {
          const startTime = Date.now();
          log(`Iniciando Motor Nativo Node.js de Auditoria de Similaridade...`);
          log(
            `Conexão: ${activeConn.name} | Motor: ${versionLabel} | Schema/Owner: ${owner} | Janela: últimos ${auditDays} dia(s)`
          );

          if (items.length > 0) {
            const summary = items
              .map((it) =>
                it.fieldIds.length > 0
                  ? `${it.docId} (${it.fieldIds.join(', ')})`
                  : `${it.docId} (todos os campos textuais)`
              )
              .join(' | ');
            log(`Escopo mapeado: ${summary}`);
          } else {
            log(`Escopo mapeado: Todos os documentos e campos de texto no período.`);
          }

          // Modo Sandbox / Demonstração
          if (isDemoConnection(activeConn)) {
            log(`[SANDBOX] Modo Demonstração ativo — simulando cálculo Gestalt (Ratcliff/Obershelp)...`);
            emitStats({
              stage: 'COUNT',
              totalRaw: 12,
              loaded: 0,
              scored: 0,
              inserted: 0,
              totalPairs: 8,
              critical: 0,
            });
            const sampleA =
              'Paciente vígil, comunicativo e afebril nas últimas 24h. Parâmetros hemodinâmicos estáveis em ar ambiente, boa perfusão periférica e aceitação alimentar plena.';
            const sampleB =
              'Paciente vígil, comunicativo e afebril nas últimas 24h. Parâmetros hemodinâmicos estáveis em ar ambiente, boa perfusão periférica e aceitação alimentar satisfatória.';
            const sampleScore = calculateSimilarityPercent(sampleA, sampleB);
            emitStats({
              stage: 'DONE',
              totalRaw: 12,
              loaded: 8,
              scored: 8,
              inserted: 8,
              totalPairs: 8,
              critical: sampleScore >= 80 ? 3 : 0,
            });
            log(`[SANDBOX] Verificação do algoritmo NLP concluída (par exemplo = ${sampleScore}%).`);
            log(
              `[SUCCESS] Auditoria Sandbox finalizada! Utilize os filtros acima para consultar os registros demonstrativos em ${owner}.TB_AUDITORIA_SIMILARIDADE.`
            );
            return;
          }

          const pool = await getPool(activeConn);
          const oracleConn: OracleConnectionHandle = await pool.getConnection();
          conn = oracleConn;
          const oracledb = await loadOracleDb();

          const directFilter = buildFilterClause(
            items,
            'PEC.CD_DOCUMENTO',
            'ECA.DS_IDENTIFICADOR',
            { p_days: auditDays }
          );

          // Fase 1: Contagem rápida de volumetria no período (sem ler CLOB nem executar LAG)
          let totalRaw = 0;

          log(`Estimando quantidade de registros no período (${auditDays} dias) — ${versionLabel}...`);
          try {
            const resCount = await oracleConn.execute(
              buildCountByDocFieldSql(version, directFilter.clause),
              directFilter.binds,
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const countRows = (resCount.rows || []) as CountRow[];

            totalRaw = countRows.reduce((acc, r) => acc + (Number(r.QTD_REGISTROS) || 0), 0);
            emitStats({
              stage: 'COUNT',
              totalRaw,
              loaded: 0,
              scored: 0,
              inserted: 0,
              totalPairs: 0,
              critical: 0,
            });

            if (countRows.length > 0) {
              const breakdown = countRows
                .slice(0, 8)
                .map(
                  (r) =>
                    `Doc ${r.CD_DOCUMENTO} / ${r.IDENTIFICADOR_FILTRO || '-'}: ${Number(
                      r.QTD_REGISTROS
                    ).toLocaleString('pt-BR')} reg.`
                )
                .join(' | ');
              log(
                `[VOLUME] Total identificado no período: ${totalRaw.toLocaleString('pt-BR')} registro(s) clínico(s) (${breakdown})`
              );
            } else {
              log(`[VOLUME] Total identificado no período: 0 registros clínicos para o escopo selecionado no ${versionLabel}.`);
              if (docIds.length > 0) {
                try {
                  const hintBinds: Record<string, string | number> = { p_days: auditDays };
                  const hintPlaceholders: string[] = [];
                  docIds.forEach((id, idx) => {
                    hintBinds[`h_doc_${idx}`] = id;
                    hintPlaceholders.push(`:h_doc_${idx}`);
                  });
                  const hintRes = await oracleConn.execute(
                    buildTopFieldsHintSql(version, hintPlaceholders.join(', ')),
                    hintBinds,
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                  );
                  const hintRows = (hintRes.rows || []) as CountRow[];
                  if (hintRows.length > 0) {
                    log(
                      `[DICA] Campos de texto com dados no período para o(s) documento(s) mapeado(s) (${versionLabel}): ${hintRows
                        .map(
                          (r) =>
                            `${r.IDENTIFICADOR_FILTRO} (${Number(r.QTD_REGISTROS).toLocaleString('pt-BR')})`
                        )
                        .join(', ')}. Ajuste o campo em Mapeamentos Oracle.`
                    );
                  } else {
                    log(
                      `[DICA] Nenhum campo de texto preenchido neste período para o(s) documento(s) no ${versionLabel}. Verifique se o motor selecionado (Editor 2.0 / 3.0) corresponde ao documento.`
                    );
                  }
                } catch {
                  // dica opcional
                }
              }
            }
          } catch (countErr: unknown) {
            const countMsg = String((countErr as { message?: string })?.message || countErr);
            log(`[AVISO] Não foi possível pré-contar volumetria (${countMsg}). Prosseguindo com extração direta...`);
          }

          // Fase 2: Extração com filtros empurrados antes do LAG e streaming via ResultSet (200 em 200)
          log(`Extraindo textos e pareando evolução anterior via cursor Oracle (${versionLabel})...`);
          let rows: ViewRow[] = [];

          const onExtractBatch = (loadedCount: number) => {
            emitStats({
              stage: 'EXTRACT',
              totalRaw,
              loaded: loadedCount,
              scored: 0,
              inserted: 0,
              totalPairs: 0,
              critical: 0,
            });
            log(
              `[PROGRESS] Extraindo do Oracle: ${loadedCount.toLocaleString('pt-BR')} par(es) com histórico carregado(s)${
                totalRaw > 0 ? ` (de ${totalRaw.toLocaleString('pt-BR')} registros no período)` : ''
              }...`
            );
          };

          try {
            rows = await fetchRowsStreaming(
              oracleConn,
              buildDirectPushedSql(version, directFilter.clause),
              directFilter.binds,
              oracledb.OUT_FORMAT_OBJECT,
              onExtractBatch
            );
          } catch (directErr: unknown) {
            const directMsg = String((directErr as { message?: string })?.message || directErr);
            if (!directMsg.includes('ORA-00942')) {
              throw directErr;
            }

            log(
              `[AVISO] Leitura direta nas tabelas base retornou ORA-00942. Consultando view ${owner}.V_AUDITORIA_COPIA_COLA...`
            );
            const viewFilter = buildFilterClause(
              items,
              'CD_DOCUMENTO',
              'IDENTIFICADOR_FILTRO',
              { p_days: auditDays }
            );
            const viewSql = `
              SELECT
                  CD_ATENDIMENTO,
                  CD_DOCUMENTO,
                  DS_DOCUMENTO,
                  IDENTIFICADOR_FILTRO,
                  DH_FECHAMENTO,
                  CD_PRESTADOR,
                  LEITO,
                  UNIDADE,
                  TEXTO_ATUAL,
                  TEXTO_ANTERIOR
              FROM ${owner}.V_AUDITORIA_COPIA_COLA
              WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - :p_days
                AND TEXTO_ATUAL IS NOT NULL
                AND TEXTO_ANTERIOR IS NOT NULL
                ${viewFilter.clause}
            `;
            rows = await fetchRowsStreaming(
              oracleConn,
              viewSql,
              viewFilter.binds,
              oracledb.OUT_FORMAT_OBJECT,
              onExtractBatch
            );
          }

          if (rows.length === 0) {
            emitStats({
              stage: 'DONE',
              totalRaw,
              loaded: 0,
              scored: 0,
              inserted: 0,
              totalPairs: 0,
              critical: 0,
            });
            log(
              '[INFO] Nenhum par elegível (evolução atual + evolução anterior do mesmo paciente/campo) encontrado na janela informada.'
            );
            return;
          }

          const totalPairs = rows.length;
          log(
            `Extração concluída: ${totalPairs.toLocaleString('pt-BR')} par(es) pronto(s) para cálculo NLP e gravação em ${owner}.TB_AUDITORIA_SIMILARIDADE.`
          );

          // Fase 3: Limpeza da janela reprocessada (alinhada ao mesmo escopo de documento+campo) + Cálculo NLP e Gravação em Lotes de 200
          const deleteFilter = buildFilterClause(
            items,
            'CD_DOCUMENTO',
            'IDENTIFICADOR_FILTRO',
            { p_days: auditDays }
          );

          const insertSql = `
            INSERT INTO ${owner}.TB_AUDITORIA_SIMILARIDADE (
                CD_ATENDIMENTO,
                CD_DOCUMENTO,
                DS_DOCUMENTO,
                IDENTIFICADOR_FILTRO,
                DH_FECHAMENTO,
                CD_PRESTADOR,
                LEITO,
                UNIDADE,
                GRAU_SIMILARIDADE,
                DT_PROCESSAMENTO
            ) VALUES (
                :CD_ATENDIMENTO,
                :CD_DOCUMENTO,
                :DS_DOCUMENTO,
                :IDENTIFICADOR_FILTRO,
                :DH_FECHAMENTO,
                :CD_PRESTADOR,
                :LEITO,
                :UNIDADE,
                :GRAU_SIMILARIDADE,
                SYSDATE
            )
          `;

          let criticalCount = 0;
          let insertedCount = 0;
          const CHUNK_SIZE = 200;
          const insertBindDefs = {
            CD_ATENDIMENTO: { type: oracledb.NUMBER },
            CD_DOCUMENTO: { type: oracledb.NUMBER },
            DS_DOCUMENTO: { type: oracledb.STRING, maxSize: 150 },
            IDENTIFICADOR_FILTRO: { type: oracledb.STRING, maxSize: 150 },
            DH_FECHAMENTO: { type: oracledb.DATE },
            CD_PRESTADOR: { type: oracledb.NUMBER },
            LEITO: { type: oracledb.STRING, maxSize: 60 },
            UNIDADE: { type: oracledb.STRING, maxSize: 120 },
            GRAU_SIMILARIDADE: { type: oracledb.NUMBER },
          };

          try {
            await oracleConn.execute(
              `DELETE FROM ${owner}.TB_AUDITORIA_SIMILARIDADE
                WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - :p_days ${deleteFilter.clause}`,
              deleteFilter.binds,
              { autoCommit: false }
            );

            for (let offset = 0; offset < totalPairs; offset += CHUNK_SIZE) {
              const rawSlice = rows.slice(offset, offset + CHUNK_SIZE);
              const scoredSlice = rawSlice.map((row) => {
                const score = calculateSimilarityPercent(
                  String(row.TEXTO_ATUAL ?? ''),
                  String(row.TEXTO_ANTERIOR ?? '')
                );
                if (score >= 80) criticalCount++;
                const rawDate = row.DH_FECHAMENTO;
                const dhFechamento =
                  rawDate instanceof Date ? rawDate : rawDate ? new Date(rawDate) : null;
                return {
                  CD_ATENDIMENTO: Number(row.CD_ATENDIMENTO),
                  CD_DOCUMENTO: Number(row.CD_DOCUMENTO),
                  DS_DOCUMENTO: truncateUtf8Bytes(row.DS_DOCUMENTO, 150),
                  IDENTIFICADOR_FILTRO: truncateUtf8Bytes(row.IDENTIFICADOR_FILTRO, 150),
                  DH_FECHAMENTO: dhFechamento,
                  CD_PRESTADOR:
                    row.CD_PRESTADOR !== null && row.CD_PRESTADOR !== undefined
                      ? Number(row.CD_PRESTADOR)
                      : null,
                  LEITO: truncateUtf8Bytes(row.LEITO, 60),
                  UNIDADE: truncateUtf8Bytes(row.UNIDADE, 120),
                  GRAU_SIMILARIDADE: score,
                };
              });

              await oracleConn.executeMany(insertSql, scoredSlice, {
                autoCommit: false,
                bindDefs: insertBindDefs,
              });
              insertedCount += scoredSlice.length;
              const pct = Math.round((insertedCount / totalPairs) * 100);

              emitStats({
                stage: 'LOAD',
                totalRaw,
                loaded: totalPairs,
                scored: insertedCount,
                inserted: insertedCount,
                totalPairs,
                critical: criticalCount,
              });
              log(
                `[PROGRESS] Processando e gravando lote: ${insertedCount.toLocaleString('pt-BR')} / ${totalPairs.toLocaleString('pt-BR')} pares (${pct}%) — Críticos >= 80%: ${criticalCount}`
              );
            }

            await oracleConn.commit();
            clearQueryCache();
          } catch (writeErr: unknown) {
            try {
              await oracleConn.rollback();
            } catch {
              // ignore rollback errors
            }
            const writeMsg = String((writeErr as { message?: string })?.message || writeErr);
            if (writeMsg.includes('ORA-00942')) {
              log(
                `[ERRO] Tabela ${owner}.TB_AUDITORIA_SIMILARIDADE não existe ou não está acessível ao usuário Oracle conectado.`
              );
              log(
                `[DICA] Clique em "Script DDL" para copiar os comandos de criação no schema ${owner} ou ajuste o Schema/Owner em Configurações > Parâmetros.`
              );
              return;
            }
            throw writeErr;
          }

          emitStats({
            stage: 'DONE',
            totalRaw,
            loaded: totalPairs,
            scored: totalPairs,
            inserted: insertedCount,
            totalPairs,
            critical: criticalCount,
          });
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
          log(
            `[SUCCESS] Auditoria concluída em ${elapsedSec}s! ${insertedCount.toLocaleString('pt-BR')} registros gravados em ${owner}.TB_AUDITORIA_SIMILARIDADE (${criticalCount} críticos >= 80%).`
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log(`[ERRO CRÍTICO] ${message}`);
        } finally {
          if (conn) {
            try {
              await conn.close();
            } catch {
              // ignore close error
            }
          }
          try {
            controller.close();
          } catch {
            // stream already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao executar script';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
