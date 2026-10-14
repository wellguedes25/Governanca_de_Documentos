import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const data = await getData();
  const activeConn = data.connections.find(c => String(c.id) === String(data.activeConnectionId));

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa.' }, { status: 400 });
  }

  try {
    const slaRes = await executeQuery(activeConn, GLOBAL_SLA_QUERY, {}, { ttlSeconds: 600, forceRefresh: force });

    // Calcular SLA Global (< 24h)
    const totalSigned = (slaRes || []).reduce((acc: number, r: any) => acc + Number(r.TOTAL), 0);
    const within24h = (slaRes || [])
      .filter((r: any) => r.FAIXA_SLA !== 'Mais de 24h')
      .reduce((acc: number, r: any) => acc + Number(r.TOTAL), 0);
    const slaPercent = totalSigned > 0 ? ((within24h / totalSigned) * 100).toFixed(1) : '100.0';

    return NextResponse.json({
      sla24h: slaPercent
    });
  } catch (error: any) {
    console.error('Error in global quality:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
