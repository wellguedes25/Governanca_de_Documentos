import { NextResponse } from 'next/server';
import { getData, saveData } from '@/lib/storage';
import { testConnection } from '@/lib/oracle';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/session';
import { formatDatabaseError } from '@/lib/error-formatter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getData();
    const connectionsList = (data.connections || []).map(conn => {
      const hostDisplay = conn.connectString ? conn.connectString.split('/')[0] : 'Oracle Host';
      return {
        id: conn.id,
        name: conn.name,
        user: conn.user,
        host: hostDisplay,
      };
    });

    return NextResponse.json({
      connections: connectionsList,
      defaultActiveId: data.activeConnectionId || connectionsList[0]?.id || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { connectionId, version } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Nenhuma conexão foi selecionada.' }, { status: 400 });
    }

    const docVersion: 'V2' | 'V3' = version === 'V2' ? 'V2' : 'V3';
    const data = await getData();
    const connection = data.connections.find(c => c.id === connectionId);

    if (!connection) {
      return NextResponse.json({ error: 'Conexão informada não foi encontrada no cadastro.' }, { status: 404 });
    }

    // Executa handshake de teste de conexão com o banco Oracle
    console.log(`[Auth/Connect] Validando conexão com o Oracle: ${connection.name} (${connection.connectString})...`);
    const testResult = await testConnection(connection);

    if (!testResult.success) {
      console.warn(`[Auth/Connect] Falha ao testar conexão ${connection.name}:`, testResult.error);
      const friendly = formatDatabaseError(testResult.error);
      return NextResponse.json({
        success: false,
        error: friendly.message,
        friendlyError: friendly,
      }, { status: 502 });
    }

    // Se OK, define como conexão ativa no storage.json
    if (data.activeConnectionId !== connection.id) {
      data.activeConnectionId = connection.id;
      await saveData(data);
    }

    // Cria o token assinado de sessão
    const token = await createSessionToken({
      connectionId: connection.id,
      connectionName: connection.name,
      version: docVersion,
    });

    const response = NextResponse.json({
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
      },
      version: docVersion,
    });

    // Define cookie HttpOnly persistente
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (err: any) {
    console.error('[Auth/Connect] Erro interno:', err);
    const friendly = formatDatabaseError(err);
    return NextResponse.json({
      success: false,
      error: friendly.message,
      friendlyError: friendly,
    }, { status: 500 });
  }
}
