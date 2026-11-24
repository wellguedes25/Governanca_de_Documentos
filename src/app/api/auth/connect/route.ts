import { NextResponse } from 'next/server';
import { getData, saveData } from '@/lib/storage';
import { testConnection, resetOraclePool } from '@/lib/oracle';
import { clearQueryCache } from '@/lib/cache';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/session';
import { formatDatabaseError } from '@/lib/error-formatter';
import { isDemoConnection, DEMO_CONNECTION, DEMO_CONNECTION_ID } from '@/lib/demo-mock';
import { encrypt } from '@/lib/encryption';
import { authenticateUser } from '@/lib/users';

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
        isDemo: isDemoConnection(conn),
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

    if (body.action === 'DEMO_ACCESS') {
      const docVersion: 'V2' | 'V3' = body.version === 'V2' ? 'V2' : 'V3';
      try {
        const data = await getData();
        if (data.activeConnectionId !== DEMO_CONNECTION_ID) {
          data.activeConnectionId = DEMO_CONNECTION_ID;
          await saveData(data);
          clearQueryCache();
          await resetOraclePool();
        }
      } catch (persistErr) {
        console.warn('[Auth/Connect] Aviso ao persistir modo sandbox em storage:', persistErr);
      }

      const token = await createSessionToken({
        userId: 'usr-demo-guest',
        username: 'visitante',
        userName: 'Visitante Demo',
        role: 'ANALISTA',
        connectionId: DEMO_CONNECTION_ID,
        connectionName: DEMO_CONNECTION.name,
        version: docVersion,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: 'usr-demo-guest',
          username: 'visitante',
          name: 'Visitante Demo',
          role: 'ANALISTA',
        },
        connection: {
          id: DEMO_CONNECTION_ID,
          name: DEMO_CONNECTION.name,
        },
        version: docVersion,
      });

      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(SESSION_DURATION_MS / 1000),
      });

      return response;
    }

    if (body.action === 'LOGIN') {
      const authUser = authenticateUser(body.username, body.password);
      if (!authUser) {
        return NextResponse.json(
          { error: 'Usuário ou senha inválidos, ou conta inativa.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: authUser.id,
          username: authUser.username,
          name: authUser.name,
          role: authUser.role,
        },
      });
    }

    if (body.action === 'CREATE_CONNECTION') {
      const authUser = authenticateUser(body.authUsername, body.authPassword);
      if (!authUser) {
        return NextResponse.json(
          { error: 'Autenticação de usuário necessária para cadastrar conexões.' },
          { status: 401 }
        );
      }
      if (authUser.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Apenas administradores podem cadastrar novas conexões Oracle.' },
          { status: 403 }
        );
      }

      const name = String(body.name || '').trim();
      const user = String(body.user || '').trim();
      const password = String(body.password || '');
      const connectString = String(body.connectString || '').trim();

      if (!name || !user || !password || !connectString) {
        return NextResponse.json(
          { error: 'Preencha Nome, Usuário, Senha e Connect String para cadastrar a conexão.' },
          { status: 400 }
        );
      }

      const data = await getData();
      const newConn = {
        id: `conn-${Date.now()}`,
        name,
        user,
        password: encrypt(password),
        connectString,
      };

      data.connections = [...(data.connections || []), newConn];
      data.activeConnectionId = newConn.id;
      await saveData(data);

      const hostDisplay = newConn.connectString.split('/')[0] || 'Oracle Host';
      return NextResponse.json({
        success: true,
        connection: {
          id: newConn.id,
          name: newConn.name,
          user: newConn.user,
          host: hostDisplay,
          isDemo: false,
        },
      });
    }

    const { connectionId, version, username, password } = body;

    const authUser = authenticateUser(username, password);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Usuário ou senha inválidos, ou conta inativa.' },
        { status: 401 }
      );
    }

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
    let changed = false;
    if (data.activeConnectionId !== connection.id) {
      data.activeConnectionId = connection.id;
      changed = true;
    }

    // Se o storage tiver apenas hospitais de demonstração (901, 902), limpa para o banco real carregar suas empresas
    const hasOnlyDemoHospitals = (data.hospitalsMapping || []).length > 0 && 
      (data.hospitalsMapping || []).every(h => h.id === 901 || h.id === 902);
    if (hasOnlyDemoHospitals) {
      data.hospitalsMapping = [];
      changed = true;
    }

    if (changed) {
      await saveData(data);
      clearQueryCache();
      await resetOraclePool();
    }

    // Cria o token assinado de sessão com os dados do usuário autenticado
    const token = await createSessionToken({
      userId: authUser.id,
      username: authUser.username,
      userName: authUser.name,
      role: authUser.role,
      connectionId: connection.id,
      connectionName: connection.name,
      version: docVersion,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        username: authUser.username,
        name: authUser.name,
        role: authUser.role,
      },
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
