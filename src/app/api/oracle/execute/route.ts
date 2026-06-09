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
    let sql: string;
    if (body.query === 'PROFILE') {
      sql = data.profileQuery;
    } else if (body.query === 'METADATA') {
      sql = data.docMetadataQuery;
    } else if (body.query === 'ACTIONS') {
      sql = data.docActionsQuery;
    } else if (body.query === 'AMBULATORY_PROFILES') {
      sql = data.ambulatoryProfilesQuery;
    } else if (body.query === 'AMBULATORY_PROFILE_DETAILS') {
      sql = data.ambulatoryProfileDetailsQuery;
    } else if (body.query === 'V3') {
      sql = data.activeQueryV3;
    } else if (body.query === 'V2') {
      sql = data.activeQuery;
    } else {
      sql = body.query || data.activeQuery;
    }

    if (!sql) {
      return NextResponse.json({ error: 'Query SQL não encontrada.' }, { status: 400 });
    }

    // Usa bind variables nomeados do oracledb — elimina SQL Injection.
    // O oracledb aceita um objeto { KEY: value } para placeholders :KEY na query.
    const binds = body.params && typeof body.params === 'object' ? body.params : {};

    // Macros são resolvidos centralmente em lib/oracle.ts

    const rows = await executeQuery(connection, sql, binds);
    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
