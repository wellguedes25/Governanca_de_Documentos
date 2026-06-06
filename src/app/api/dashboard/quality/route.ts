import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

const GLOBAL_SIMILARITY_QUERY = `
SELECT 
    COUNT(CASE WHEN T.GRAU_SIMILARIDADE >= 80 THEN 1 END) AS QTD_SIMILAR_80,
    COUNT(1) AS TOTAL_AUDITADO,
    ROUND(COUNT(CASE WHEN T.GRAU_SIMILARIDADE >= 80 THEN 1 END) * 100 / NULLIF(COUNT(1), 0), 2) AS PERCENTUAL_PLAGIO
FROM 
    DBAMV.TB_AUDITORIA_SIMILARIDADE T
JOIN 
    DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = T.CD_ATENDIMENTO
WHERE 
    A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
    AND T.DH_FECHAMENTO >= TRUNC(SYSDATE) - 90
`;

const GLOBAL_SLA_QUERY = `
SELECT 
    CASE 
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 2 THEN '0-2h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 6 THEN '2-6h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 12 THEN '6-12h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 24 THEN '12-24h'
        ELSE 'Mais de 24h'
    END AS FAIXA_SLA,
    COUNT(1) AS TOTAL
FROM 
    DBAMV.PW_DOCUMENTO_CLINICO PDC
JOIN 
    DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
WHERE 
    A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
    AND PDC.TP_STATUS = 'ASSINADO'
    AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 30
GROUP BY 
    CASE 
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 2 THEN '0-2h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 6 THEN '2-6h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 12 THEN '6-12h'
        WHEN (PDC.DH_FECHAMENTO - PDC.DH_CRIACAO) * 24 <= 24 THEN '12-24h'
        ELSE 'Mais de 24h'
    END
`;

const GLOBAL_VOCAB_QUERY = `
WITH DOCS_COM_SIGLA_PROIBIDA AS (
    SELECT DISTINCT S.CD_DOCUMENTO_CLINICO
    FROM DBAMV.TB_AUDITORIA_SIGLARIO S
    JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = S.CD_ATENDIMENTO
    WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
      AND S.DH_FECHAMENTO >= TRUNC(SYSDATE) - 90
),
TOTAL_DOCS AS (
    SELECT COUNT(1) AS TOTAL
    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
    JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
    WHERE A.CD_MULTI_EMPRESA IN (/* DYNAMIC_HOSPITALS_IN */)
      AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
      AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 90
)
SELECT 
    T.TOTAL AS TOTAL_DOCUMENTOS,
    (T.TOTAL - (SELECT COUNT(1) FROM DOCS_COM_SIGLA_PROIBIDA)) AS DOCUMENTOS_LIMPOS,
    ROUND((T.TOTAL - (SELECT COUNT(1) FROM DOCS_COM_SIGLA_PROIBIDA)) * 100 / NULLIF(T.TOTAL, 0), 2) AS INDICE_ADERENCIA
FROM TOTAL_DOCS T
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const data = await getData();
  const activeConn = data.connections.find(c => String(c.id) === String(data.activeConnectionId));

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa.' }, { status: 400 });
  }

  try {
    const [simRes, slaRes, vocabRes] = await Promise.all([
      executeQuery(activeConn, GLOBAL_SIMILARITY_QUERY, {}, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, GLOBAL_SLA_QUERY, {}, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, GLOBAL_VOCAB_QUERY, {}, { ttlSeconds: 600, forceRefresh: force })
    ]);

    // Calcular Redundância Global
    const totalAudit = Number(simRes[0]?.TOTAL_AUDITADO || 0);
    const totalSim = Number(simRes[0]?.QTD_SIMILAR_80 || 0);
    const redundancia = totalAudit > 0 ? ((totalSim / totalAudit) * 100).toFixed(1) : '0.0';

    // Calcular SLA Global (< 24h)
    const totalSigned = slaRes.reduce((acc: number, r: any) => acc + Number(r.TOTAL), 0);
    const within24h = slaRes
      .filter((r: any) => r.FAIXA_SLA !== 'Mais de 24h')
      .reduce((acc: number, r: any) => acc + Number(r.TOTAL), 0);
    const slaPercent = totalSigned > 0 ? ((within24h / totalSigned) * 100).toFixed(1) : '100.0';

    // Aderência
    const adherencia = vocabRes[0]?.INDICE_ADERENCIA !== undefined ? Number(vocabRes[0].INDICE_ADERENCIA).toFixed(1) : '100.0';

    return NextResponse.json({
      redundancia,
      sla24h: slaPercent,
      aderencia: adherencia
    });
  } catch (error: any) {
    console.error('Error in global quality:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
