import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

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
    const slaSql = data.analyticQueries?.slaAssinatura || DEFAULT_SLA_QUERY;
    const slaRes = await executeQuery(activeConn, slaSql, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force });

    const result = {
      sla: slaRes || []
    };

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching quality indicators:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
