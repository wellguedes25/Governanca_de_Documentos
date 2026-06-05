import { NextResponse } from 'next/server';
import { getData, STORAGE_FILE } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get('id');
  const force = searchParams.get('force') === 'true';

  if (!hospitalId) {
    return NextResponse.json({ error: 'Hospital ID is required' }, { status: 400 });
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
    const queries = (data as any).hospitalQueries;
    
    const [kpisRes, detailRes, top5Res, globalRes] = await Promise.all([
      executeQuery(activeConn, queries.kpis, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, queries.detailTable, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, queries.top5, { ID: hospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, (data as any).kpiQueries.total, {}, { ttlSeconds: 600, forceRefresh: force })
    ]);

    const result = {
      kpis: kpisRes[0] || {},
      details: detailRes,
      top5: top5Res,
      globalTotal: globalRes[0]?.TOTAL_GERAL_PREENCHIDO || 0
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching hospital stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
