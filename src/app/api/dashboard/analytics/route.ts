import { NextResponse } from 'next/server';
import { getData, INITIAL_DATA } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  const data = await getData();
  const activeConn = data.connections.find(c => c.id === data.activeConnectionId);

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa' }, { status: 400 });
  }

  try {
    const analyticQueries = data.analyticQueries || INITIAL_DATA.analyticQueries;
    const enabledQueries = data.enabledQueries || {};
    
    if (!analyticQueries) {
      return NextResponse.json({ error: 'Configuração de queries analíticas não encontrada' }, { status: 500 });
    }

    const safeExecute = async (conn: any, sql: string, queryKey?: string, fallbackRows: any[] = []) => {
      // Se a query estiver desativada, não executa
      if (queryKey && enabledQueries[queryKey] === false) {
        return fallbackRows;
      }

      if (!sql || sql.trim() === '' || sql === 'SELECT * FROM DUAL') {
        return fallbackRows;
      }
      return executeQuery(conn, sql);
    };

    // Consultas individuais para economizar recursos e permitir refresh granular
    if (type) {
      let result: any;
      switch (type) {
        case 'top10': result = await safeExecute(activeConn, analyticQueries.top10, 'top10'); break;
        case 'idle': result = await safeExecute(activeConn, analyticQueries.idle, 'idle'); break;
        case 'volume3m': 
          const volRes = await safeExecute(activeConn, analyticQueries.volume3m, 'volume3m', [{ TOTAL: 0 }]);
          result = volRes?.[0]?.[Object.keys(volRes[0])[0]] || 0;
          break;
        case 'unitAdherence': result = await safeExecute(activeConn, analyticQueries.unitAdherence, 'unitAdherence'); break;
        case 'unitInactivity': result = await safeExecute(activeConn, analyticQueries.unitInactivity, 'unitInactivity'); break;
        default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
      }
      return NextResponse.json({ [type]: result });
    }

    // Execução total (comportamento original)
    const [top10Res, idleRes, volume3mRes, adherenceRes, inactivityRes] = await Promise.all([
      safeExecute(activeConn, analyticQueries.top10, 'top10'),
      safeExecute(activeConn, analyticQueries.idle, 'idle'),
      safeExecute(activeConn, analyticQueries.volume3m, 'volume3m', [{ TOTAL: 0 }]),
      safeExecute(activeConn, analyticQueries.unitAdherence, 'unitAdherence'),
      safeExecute(activeConn, analyticQueries.unitInactivity, 'unitInactivity')
    ]);

    return NextResponse.json({
      top10: top10Res || [],
      idle: idleRes || [],
      volume3m: volume3mRes?.[0]?.[Object.keys(volume3mRes[0])[0]] || 0,
      unitAdherence: adherenceRes || [],
      unitInactivity: inactivityRes || [],
    });
  } catch (error: any) {
    console.error('Erro ao buscar Analytics do Dashboard:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao processar análises',
    }, { status: 500 });
  }
}
