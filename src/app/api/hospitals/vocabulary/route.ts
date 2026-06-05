import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';


const VOCABULARY_QUALITY_QUERY = `
WITH DOCS_COM_SIGLA_PROIBIDA AS (
    SELECT DISTINCT S.CD_DOCUMENTO_CLINICO
    FROM DBAMV.TB_AUDITORIA_SIGLARIO S
    JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = S.CD_ATENDIMENTO
    WHERE A.CD_MULTI_EMPRESA = :ID
      AND S.DH_FECHAMENTO >= TRUNC(SYSDATE) - 90
),
TOTAL_DOCS AS (
    SELECT COUNT(1) AS TOTAL
    FROM DBAMV.PW_DOCUMENTO_CLINICO PDC
    JOIN DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = PDC.CD_ATENDIMENTO
    WHERE A.CD_MULTI_EMPRESA = :ID
      AND PDC.TP_STATUS IN ('FECHADO', 'ASSINADO')
      AND PDC.DH_CRIACAO >= TRUNC(SYSDATE) - 90
)
SELECT 
    T.TOTAL AS TOTAL_DOCUMENTOS,
    (T.TOTAL - (SELECT COUNT(1) FROM DOCS_COM_SIGLA_PROIBIDA)) AS DOCUMENTOS_LIMPOS,
    ROUND((T.TOTAL - (SELECT COUNT(1) FROM DOCS_COM_SIGLA_PROIBIDA)) * 100 / NULLIF(T.TOTAL, 0), 2) AS INDICE_ADERENCIA
FROM TOTAL_DOCS T
`;

const VOCABULARY_RANKING_QUERY = `
SELECT 
    S.SIGLA_DETECTADA AS SIGLA,
    COUNT(1) AS TOTAL_OCORRENCIAS
FROM 
    DBAMV.TB_AUDITORIA_SIGLARIO S
JOIN 
    DBAMV.ATENDIME A ON A.CD_ATENDIMENTO = S.CD_ATENDIMENTO
WHERE 
    A.CD_MULTI_EMPRESA = :ID
    AND S.DH_FECHAMENTO >= TRUNC(SYSDATE) - 90
GROUP BY 
    S.SIGLA_DETECTADA
ORDER BY 
    TOTAL_OCORRENCIAS DESC
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

  const force = searchParams.get('force') === 'true';

  try {
    const [qualityRes, rankingRes] = await Promise.all([
      executeQuery(activeConn, VOCABULARY_QUALITY_QUERY, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, VOCABULARY_RANKING_QUERY, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force })
    ]);

    const result = {
      adherence: qualityRes[0] || { TOTAL_DOCUMENTOS: 0, DOCUMENTOS_LIMPOS: 0, INDICE_ADERENCIA: 100 },
      ranking: rankingRes
    };

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching vocabulary quality stats:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
