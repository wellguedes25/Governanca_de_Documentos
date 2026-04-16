import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery, testConnection } from '@/lib/oracle';

export async function POST(request: Request) {
  const body = await request.json();
  const data = await getData();

  const connection = data.connections.find(c => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    if (body.type === 'TEST') {
        const result = await testConnection(connection);
        return NextResponse.json(result);
    }
    
    // Busca a query correspondente no storage
    let sql;
    if (body.query === 'PROFILE') {
      sql = data.profileQuery;
    } else if (body.query === 'METADATA') {
      sql = data.docMetadataQuery;
    } else if (body.query === 'ACTIONS') {
      sql = data.docActionsQuery;
    } else {
      sql = body.query || data.activeQuery;
    }
    
    // Substituição de parâmetros (ex: :CD_DOCUMENTO -> '1050')
    if (body.params) {
      Object.entries(body.params).forEach(([key, value]) => {
        const regex = new RegExp(`:${key}`, 'g');
        sql = sql.replace(regex, `'${value}'`);
      });
    }

    const rows = await executeQuery(connection, sql);
    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
