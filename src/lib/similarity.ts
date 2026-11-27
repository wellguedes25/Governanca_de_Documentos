export const DEFAULT_AUDIT_SCHEMA_OWNER = 'DBAMV';

/**
 * Sanitizes an Oracle schema/owner identifier used for similarity audit objects.
 * Accepts only valid unquoted Oracle identifier characters (A-Z, 0-9, _, $, #),
 * preventing SQL injection when interpolating `<OWNER>.TB_AUDITORIA_SIMILARIDADE`
 * and `<OWNER>.V_AUDITORIA_COPIA_COLA`.
 */
export function sanitizeAuditOwner(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_AUDIT_SCHEMA_OWNER;
  }

  const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9_$#]/g, '');
  if (!normalized || !/^[A-Z][A-Z0-9_$#]{0,127}$/.test(normalized)) {
    return DEFAULT_AUDIT_SCHEMA_OWNER;
  }

  return normalized;
}

export type EditorEngineVersion = 'V2' | 'V3';

/**
 * Builds the Oracle DDL script (Table, Indexes, and View) for the Similarity Audit module
 * using the configured schema owner (defaults to DBAMV) and selected Editor motor (V3 or V2).
 */
export function buildSimilarityDdl(
  ownerRaw?: string | null,
  version: EditorEngineVersion = 'V3'
): string {
  const owner = sanitizeAuditOwner(ownerRaw);
  const isV3 = version !== 'V2';
  const ercTable = isV3 ? 'EDITOR.EDITOR_REGISTRO_CAMPO' : 'DBAMV.EDITOR_REGISTRO_CAMPO';
  const ecaTable = isV3 ? 'EDITOR.EDITOR_CAMPO' : 'DBAMV.EDITOR_CAMPO';
  const lobCol = isV3 ? 'ERC.LO_CONTEUDO' : 'ERC.LO_VALOR';

  return `-- ============================================================================
-- Script DDL de Auditoria de Similaridade (Schema: ${owner} | Motor: ${isV3 ? 'Editor 3.0 HTML5' : 'Editor 2.0 Flex'})
-- ============================================================================
-- Execute este script no banco Oracle com um usuário que possua privilégio de
-- criação no schema "${owner}" e permissão de leitura nas tabelas clínicas do DBAMV${isV3 ? ' e EDITOR' : ''}.

-- 1. Tabela de Resultados de Similaridade
CREATE TABLE ${owner}.TB_AUDITORIA_SIMILARIDADE (
    CD_ATENDIMENTO        NUMBER(10),
    CD_DOCUMENTO          NUMBER(10),
    DS_DOCUMENTO          VARCHAR2(150),
    IDENTIFICADOR_FILTRO  VARCHAR2(150),
    DH_FECHAMENTO         DATE,
    CD_PRESTADOR          NUMBER(10),
    LEITO                 VARCHAR2(60),
    UNIDADE               VARCHAR2(120),
    GRAU_SIMILARIDADE     NUMBER(5,2),
    DT_PROCESSAMENTO      DATE DEFAULT SYSDATE
);

-- Índices para consultas rápidas no Dashboard e no BI
CREATE INDEX ${owner}.IDX_AUD_SIMILARIDADE_DT
    ON ${owner}.TB_AUDITORIA_SIMILARIDADE (DH_FECHAMENTO);

CREATE INDEX ${owner}.IDX_AUD_SIMILARIDADE_PREST
    ON ${owner}.TB_AUDITORIA_SIMILARIDADE (CD_PRESTADOR);

CREATE INDEX ${owner}.IDX_AUD_SIMILARIDADE_DOC
    ON ${owner}.TB_AUDITORIA_SIMILARIDADE (CD_DOCUMENTO);

-- 2. View Analítica para Comparação de Textos Clínicos (${isV3 ? 'Editor 3.0 - EDITOR' : 'Editor 2.0 - DBAMV'})
CREATE OR REPLACE VIEW ${owner}.V_AUDITORIA_COPIA_COLA AS
SELECT
    PDC.CD_ATENDIMENTO,
    PEC.CD_DOCUMENTO,
    PTD.DS_TIPO_DOCUMENTO AS DS_DOCUMENTO,
    ECA.DS_IDENTIFICADOR  AS IDENTIFICADOR_FILTRO,
    DECODE(ECA.CD_TIPO_VISUALIZACAO, 1, 'TEXTO', 2, 'TEXTAREA', 'OUTRO') AS TIPO_CAMPO,
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
  AND NVL(PDC.DH_FECHAMENTO, PDC.DH_CRIACAO) >= TRUNC(SYSDATE) - 90
  AND ${lobCol} IS NOT NULL;
${owner !== DEFAULT_AUDIT_SCHEMA_OWNER ? `
-- Caso o usuário de conexão da aplicação seja diferente de ${owner}, conceda acesso:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ${owner}.TB_AUDITORIA_SIMILARIDADE TO <USUARIO_APP>;
-- GRANT SELECT ON ${owner}.V_AUDITORIA_COPIA_COLA TO <USUARIO_APP>;` : ''}
`;
}

/**
 * Computes Gestalt Pattern Matching (Ratcliff/Obershelp) similarity percentage
 * (0 to 100, rounded to 2 decimals), matching Python's difflib.SequenceMatcher.ratio().
 */
export function calculateSimilarityPercent(textA: string, textB: string): number {
  const a = (textA || '').trim();
  const b = (textB || '').trim();

  if (!a || !b) return 0;
  if (a === b) return 100;

  const totalLen = a.length + b.length;
  let matchingChars = 0;

  // Iterative queue avoids call-stack limits on fragmented strings
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]];

  while (queue.length > 0) {
    const [aStart, aEnd, bStart, bEnd] = queue.pop()!;
    let subAStart = aStart;
    let subAEnd = aEnd;
    let subBStart = bStart;
    let subBEnd = bEnd;

    // For very large slices, strip exact prefix/suffix first to keep 1D DP fast
    if ((subAEnd - subAStart) * (subBEnd - subBStart) > 2_000_000) {
      while (subAStart < subAEnd && subBStart < subBEnd && a[subAStart] === b[subBStart]) {
        matchingChars++;
        subAStart++;
        subBStart++;
      }
      while (subAEnd > subAStart && subBEnd > subBStart && a[subAEnd - 1] === b[subBEnd - 1]) {
        matchingChars++;
        subAEnd--;
        subBEnd--;
      }
    }

    const aLen = subAEnd - subAStart;
    const bLen = subBEnd - subBStart;
    if (aLen === 0 || bLen === 0) continue;

    let bestLen = 0;
    let bestAEnd = 0;
    let bestBEnd = 0;

    // 1D rolling DP over B for longest contiguous substring
    let prev = new Uint16Array(bLen + 1);
    let curr = new Uint16Array(bLen + 1);

    for (let i = 1; i <= aLen; i++) {
      const chA = a.charCodeAt(subAStart + i - 1);
      curr.fill(0);
      for (let j = 1; j <= bLen; j++) {
        if (chA === b.charCodeAt(subBStart + j - 1)) {
          const val = prev[j - 1] + 1;
          curr[j] = val;
          if (val > bestLen) {
            bestLen = val;
            bestAEnd = subAStart + i;
            bestBEnd = subBStart + j;
          }
        }
      }
      const tmp = prev;
      prev = curr;
      curr = tmp;
    }

    if (bestLen > 0) {
      matchingChars += bestLen;
      const bestAStart = bestAEnd - bestLen;
      const bestBStart = bestBEnd - bestLen;

      if (subAStart < bestAStart && subBStart < bestBStart) {
        queue.push([subAStart, bestAStart, subBStart, bestBStart]);
      }
      if (bestAEnd < subAEnd && bestBEnd < subBEnd) {
        queue.push([bestAEnd, subAEnd, bestBEnd, subBEnd]);
      }
    }
  }

  return Math.round(((2 * matchingChars) / totalLen) * 10000) / 100;
}
