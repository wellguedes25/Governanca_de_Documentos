import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

// Removido cache customizado para usar o node-cache global em oracle.ts

const DEFAULT_SIMILARITY_QUERY = `
SELECT 
    T.CD_DOCUMENTO,
    T.DS_DOCUMENTO,
    COUNT(CASE WHEN T.GRAU_SIMILARIDADE >= 80 THEN 1 END) AS QTD_SIMILAR_80,
    COUNT(1) AS TOTAL_AUDITADO,
    ROUND(COUNT(CASE WHEN T.GRAU_SIMILARIDADE >= 80 THEN 1 END) * 100 / NULLIF(COUNT(1), 0), 2) AS PERCENTUAL_PLAGIO
FROM 
    DBAMV.TB_AUDITORIA_SIMILARIDADE T
JOIN 
    DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = T.CD_ATENDIMENTO
WHERE 
    A.CD_MULTI_EMPRESA = :ID
    AND T.DH_FECHAMENTO >= TRUNC(SYSDATE) - 90
GROUP BY 
    T.CD_DOCUMENTO, T.DS_DOCUMENTO
ORDER BY 
    QTD_SIMILAR_80 DESC
`;

const DEFAULT_SLA_QUERY = `
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
    A.CD_MULTI_EMPRESA = :ID
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get('id');

  if (!hospitalId) {
    return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
  }

  const data = await getData();
  const activeConn = data.connections.find(c => String(c.id) === String(data.activeConnectionId));

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa encontrada.' }, { status: 400 });
  }

  // Utiliza node-cache do oracle.ts
  const force = searchParams.get('force') === 'true';

  try {
    const similaritySql = data.analyticQueries?.similarityStats || DEFAULT_SIMILARITY_QUERY;
    const slaSql = data.analyticQueries?.slaAssinatura || DEFAULT_SLA_QUERY;

    const [similarityRes, slaRes] = await Promise.all([
      executeQuery(activeConn, similaritySql, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, slaSql, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force })
    ]);

    const result = {
      similarity: similarityRes,
      sla: slaRes
    };

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching quality indicators:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
