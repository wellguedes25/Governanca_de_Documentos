import { NextResponse } from 'next/server';
import { getData, saveData, DbConnection } from '@/lib/storage';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = await getData();

  if (body.type === 'SAVE_CONNECTION') {
    const conn: DbConnection = body.connection;
    const index = data.connections.findIndex(c => c.id === conn.id);
    if (index > -1) {
      data.connections[index] = conn;
    } else {
      data.connections.push(conn);
    }
  } else if (body.type === 'DELETE_CONNECTION') {
    console.log(`[API] Deletando conexão: ${body.id}`);
    const initialCount = data.connections.length;
    data.connections = data.connections.filter(c => c.id !== body.id);
    console.log(`[API] Conexões restantes: ${data.connections.length} (Removidos: ${initialCount - data.connections.length})`);
    if (data.activeConnectionId === body.id) {
        data.activeConnectionId = null;
    }
  } else if (body.type === 'SET_ACTIVE') {
    data.activeConnectionId = body.id;
  } else if (body.type === 'SAVE_QUERY') {
    data.activeQuery = body.query;
  } else if (body.type === 'SAVE_PROFILE_QUERY') {
    data.profileQuery = body.query;
  } else if (body.type === 'SAVE_SIMILARITY_QUERY') {
    data.similarityQuery = body.query;
  } else if (body.type === 'SAVE_CLIENT_PATH') {
    data.oracleClientPath = body.path;
  } else if (body.type === 'SAVE_KPI_TOTAL') {
    data.kpiQueries.total = body.query;
  } else if (body.type === 'SAVE_KPI_24H') {
    data.kpiQueries.prod24h = body.query;
  } else if (body.type === 'SAVE_KPI_ASSINADOS') {
    data.kpiQueries.assinados = body.query;
  } else if (body.type === 'SAVE_KPI_TOP10') {
    data.analyticQueries.top10 = body.query;
  } else if (body.type === 'SAVE_KPI_IDLE') {
    data.analyticQueries.idle = body.query;
  } else if (body.type === 'SAVE_KPI_VOLUME3M') {
    data.analyticQueries.volume3m = body.query;
  } else if (body.type === 'SAVE_KPI_UNIT_ADHERENCE') {
    data.analyticQueries.unitAdherence = body.query;
  } else if (body.type === 'SAVE_KPI_UNIT_INACTIVITY') {
    data.analyticQueries.unitInactivity = body.query;
  }

  if (body.enabledQueries) {
    data.enabledQueries = { ...data.enabledQueries, ...body.enabledQueries };
  }
  if (body.cardSettings) {
    data.cardSettings = { ...data.cardSettings, ...body.cardSettings };
  }

  await saveData(data);
  return NextResponse.json(data);
}
