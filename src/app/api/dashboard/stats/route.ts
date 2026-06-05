import { NextResponse } from 'next/server';
import { getData, STORAGE_FILE } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

// Cache simples em memória para evitar sobrecarga no Oracle em requisições paralelas
const globalCache = global as any;
if (!globalCache.dashboardCache) {
  globalCache.dashboardCache = new Map();
}

const CACHE_TTL = 60 * 1000; // 1 minuto

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const force = searchParams.get('force') === 'true';
  const version = searchParams.get('version') || 'V2';

  const cacheKey = `${type}_${version}`;

  // Verifica cache (se não for force refresh)
  if (!force) {
    const cached = globalCache.dashboardCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return NextResponse.json(cached.data);
    }
  }

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
    const kpiQueries = version === 'V3' ? (data.kpiQueriesV3 || data.kpiQueries) : data.kpiQueries;
    const enabledQueries = data.enabledQueries || {};

    const safeExecute = async (conn: any, sql: string, queryKey?: string) => {
      if (queryKey && enabledQueries[queryKey] === false) {
        return [{ TOTAL: 0 }];
      }
      if (!sql || sql.trim() === '') {
        return [{ TOTAL: 0 }];
      }
      return executeQuery(conn, sql, {}, { ttlSeconds: 300, forceRefresh: force });
    };

    const getCol = (row: any, colName: string) => {
      if (!row) return 0;
      const key = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === colName.toUpperCase());
      return key ? row[key] : 0;
    };

    let responseData: any;

    if (type !== 'all') {
      if (type === 'assinados') {
        const [totalRes, assinadosRes] = await Promise.all([
          safeExecute(activeConn, kpiQueries.total, 'total'),
          safeExecute(activeConn, kpiQueries.assinados, 'assinados')
        ]);
        const total = Number(getCol(totalRes?.[0], 'TOTAL_GERAL_PREENCHIDO') || getCol(totalRes?.[0], 'TOTAL_GERAL') || 0);
        const assinadoVal = Number(getCol(assinadosRes?.[0], 'QTD_ASSINADO') || 0);
        const percent = total > 0 ? ((assinadoVal / total) * 100).toFixed(1) : '0.0';
        
        responseData = { 
          totalRaw: Number(total).toLocaleString('pt-BR'),
          assinadosRaw: Number(assinadoVal).toLocaleString('pt-BR'),
          assinadosPercent: percent + '%'
        };
      } else if (type === 'prod24h') {
        const res = await safeExecute(activeConn, kpiQueries.prod24h, 'prod24h');
        const totalGeral = Number(getCol(res?.[0], 'TOTAL_GERAL') || 0);
        responseData = { prod24h: Number(totalGeral).toLocaleString('pt-BR') };
      } else if (type === 'total') {
        const res = await safeExecute(activeConn, kpiQueries.total, 'total');
        const value = Number(getCol(res?.[0], 'TOTAL_GERAL_PREENCHIDO') || 0);
        responseData = { total: Number(value).toLocaleString('pt-BR') };
      } else {
        const customCard = (data.customCards || []).find(c => String(c.id) === String(type));
        if (customCard) {
          const res = await safeExecute(activeConn, customCard.query, type);
          const value = res?.[0]?.[Object.keys(res[0])[0]] || 0;
          responseData = { value };
        } else {
          return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
      }
    } else {
      const [totalRes, prod24hRes, assinadosRes] = await Promise.all([
        safeExecute(activeConn, kpiQueries.total, 'total'),
        safeExecute(activeConn, kpiQueries.prod24h, 'prod24h'),
        safeExecute(activeConn, kpiQueries.assinados, 'assinados')
      ]);

      const total = Number(getCol(totalRes?.[0], 'TOTAL_GERAL_PREENCHIDO') || 0);
      const prod24h = Number(getCol(prod24hRes?.[0], 'TOTAL_GERAL') || 0);
      const assinadosVal = Number(getCol(assinadosRes?.[0], 'QTD_ASSINADO') || 0);
      const assinaturaPercent = total > 0 ? ((assinadosVal / total) * 100).toFixed(1) : '0.0';

      responseData = {
        total: Number(total).toLocaleString('pt-BR'),
        prod24h: Number(prod24h).toLocaleString('pt-BR'),
        assinadosRaw: Number(assinadosVal).toLocaleString('pt-BR'),
        totalRaw: Number(total).toLocaleString('pt-BR'),
        assinadosPercent: `${assinaturaPercent}%`,
        status: 'Online'
      };
    }

    // Salva no cache
    globalCache.dashboardCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Erro ao buscar KPIs:', error);
    return NextResponse.json({ error: error.message || 'Erro no processamento' }, { status: 500 });
  }
}
