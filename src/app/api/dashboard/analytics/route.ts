import { NextResponse } from 'next/server';
import { getData, INITIAL_DATA, STORAGE_FILE } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const version = searchParams.get('version') || 'V2';
  const force = searchParams.get('force') === 'true';
  
  const data = await getData();
  const activeConn = data.connections.find(c => String(c.id) === String(data.activeConnectionId));
  
  if (!activeConn) {
    const debugInfo = {
      activeId: data.activeConnectionId,
      availableIds: data.connections.map(c => c.id),
      storageFile: STORAGE_FILE
    };
    return NextResponse.json({ 
      error: `Nenhuma conexão ativa encontrada. Info: ${JSON.stringify(debugInfo)}` 
    }, { status: 400 });
  }

  try {
    const analyticQueriesBase = version === 'V3' ? (data.analyticQueriesV3 || data.analyticQueries) : data.analyticQueries;
    const analyticQueries = analyticQueriesBase || INITIAL_DATA.analyticQueries;
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
      return executeQuery(conn, sql, {}, { ttlSeconds: 900, forceRefresh: force });
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
        case 'volumeTurno': result = await safeExecute(activeConn, analyticQueries.volumeTurno, 'volumeTurno'); break;
        case 'slaAssinatura': result = await safeExecute(activeConn, analyticQueries.slaAssinatura, 'slaAssinatura'); break;
        default: return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
      }
      return NextResponse.json({ [type]: result });
    }

    // Execução total (comportamento original)
    const [top10Res, idleRes, volume3mRes, adherenceRes, inactivityRes, turnoRes, slaRes] = await Promise.all([
      safeExecute(activeConn, analyticQueries.top10, 'top10'),
      safeExecute(activeConn, analyticQueries.idle, 'idle'),
      safeExecute(activeConn, analyticQueries.volume3m, 'volume3m', [{ TOTAL: 0 }]),
      safeExecute(activeConn, analyticQueries.unitAdherence, 'unitAdherence'),
      safeExecute(activeConn, analyticQueries.unitInactivity, 'unitInactivity'),
      safeExecute(activeConn, analyticQueries.volumeTurno, 'volumeTurno'),
      safeExecute(activeConn, analyticQueries.slaAssinatura, 'slaAssinatura')
    ]);

    return NextResponse.json({
      top10: top10Res || [],
      idle: idleRes || [],
      volume3m: volume3mRes?.[0]?.[Object.keys(volume3mRes[0])[0]] || 0,
      unitAdherence: adherenceRes || [],
      unitInactivity: inactivityRes || [],
      volumeTurno: turnoRes || [],
      slaAssinatura: slaRes?.[0] || {},
    });
  } catch (error: any) {
    console.error('Erro ao buscar Analytics do Dashboard:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao processar análises',
    }, { status: 500 });
  }
}
