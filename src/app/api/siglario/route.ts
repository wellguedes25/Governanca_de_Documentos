import { NextResponse, NextRequest } from 'next/server';
import { executeQuery } from '@/lib/oracle';
import { getData } from '@/lib/storage';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get('dataInicio') || '';
  const dataFim = searchParams.get('dataFim') || '';

  if (!dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros dataInicio e dataFim são obrigatórios.' }, { status: 400 });
  }

  const storage = await getData();
  const activeConn = storage.connections.find(c => c.id === storage.activeConnectionId);
  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa configurada.' }, { status: 503 });
  }

  const query = `
    SELECT 
      S.CD_ATENDIMENTO AS ATENDIMENTO,
      S.CD_DOCUMENTO AS DOCUMENTO,
      S.CD_EDITOR_REGISTRO,
      S.CD_DOCUMENTO_CLINICO,
      S.SIGLA_DETECTADA,
      S.CONTEXTO,
      TO_CHAR(S.DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') AS DATA_HORA,
      S.CD_PRESTADOR AS PRESTADOR,
      S.UNIDADE
    FROM DBAMV.TB_AUDITORIA_SIGLARIO S
    WHERE S.DH_FECHAMENTO BETWEEN TO_DATE('${dataInicio}', 'YYYY-MM-DD') 
                               AND TO_DATE('${dataFim}', 'YYYY-MM-DD') + 1
    ORDER BY S.DH_FECHAMENTO DESC, S.SIGLA_DETECTADA ASC
  `;

  try {
    const rows = await executeQuery(activeConn, query);
    return NextResponse.json({ rows });
  } catch (err: any) {
    console.error('[API Siglario]', err);
    return NextResponse.json({ error: err.message || 'Erro ao executar consulta.' }, { status: 500 });
  }
}
