import { NextResponse } from 'next/server';
import { getData, saveData, DbConnection } from '@/lib/storage';

export async function GET() {
  const data = getData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = getData();

  if (body.type === 'SAVE_CONNECTION') {
    const conn: DbConnection = body.connection;
    const index = data.connections.findIndex(c => c.id === conn.id);
    if (index > -1) {
      data.connections[index] = conn;
    } else {
      data.connections.push(conn);
    }
  } else if (body.type === 'DELETE_CONNECTION') {
    data.connections = data.connections.filter(c => c.id !== body.id);
    if (data.activeConnectionId === body.id) {
        data.activeConnectionId = null;
    }
  } else if (body.type === 'SET_ACTIVE') {
    data.activeConnectionId = body.id;
  } else if (body.type === 'SAVE_QUERY') {
    data.activeQuery = body.query;
  } else if (body.type === 'SAVE_PROFILE_QUERY') {
    data.profileQuery = body.query;
  } else if (body.type === 'SAVE_CLIENT_PATH') {
    data.oracleClientPath = body.path;
  }

  saveData(data);
  return NextResponse.json(data);
}
