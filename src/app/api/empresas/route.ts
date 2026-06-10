import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/oracle';
import { getData } from '@/lib/storage';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getData();
  const connection = data.connections.find(c => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    const sql = `SELECT CD_MULTI_EMPRESA, DS_MULTI_EMPRESA AS NM_FANTASIA FROM DBAMV.MULTI_EMPRESAS WHERE SN_ATIVO = 'S' ORDER BY CD_MULTI_EMPRESA`;
    const rows = await executeQuery(connection, sql, {});
    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
