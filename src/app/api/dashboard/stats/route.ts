import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
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
    const kpiQueries = data.kpiQueries;
    const enabledQueries = data.enabledQueries || {};

    const safeExecute = async (conn: any, sql: string, queryKey?: string) => {
      // Se a query estiver desativada, não executa
      if (queryKey && enabledQueries[queryKey] === false) {
        return [{ TOTAL: 0 }];
      }
      
      if (!sql || sql.trim() === '') {
        return [{ TOTAL: 0 }];
      }
      return executeQuery(conn, sql);
    };

    // Consultas individuais para refresh granular
    if (type) {
      if (type === 'assinados') {
        const [totalRes, assinadosRes] = await Promise.all([
          safeExecute(activeConn, kpiQueries.total, 'total'),
          safeExecute(activeConn, kpiQueries.assinados, 'assinados')
        ]);
        const total = totalRes?.[0]?.[Object.keys(totalRes[0])[0]] || 0;
        const raw = assinadosRes?.[0]?.[Object.keys(assinadosRes[0])[0]] || 0;
        const percent = total > 0 ? ((Number(raw) / Number(total)) * 100).toFixed(1) : 0;
        
        return NextResponse.json({ 
          assinadosRaw: Number(raw).toLocaleString('pt-BR'),
          assinadosPercent: percent + '%'
        });
      }

      let sql = '';
      switch (type) {
        case 'total': sql = kpiQueries.total; break;
        case 'prod24h': sql = kpiQueries.prod24h; break;
        default: 
          // Se não for um tipo nativo, pode ser um customId
          const customCard = (data.customCards || []).find(c => String(c.id) === String(type));
          if (customCard) {
            sql = customCard.query;
            const res = await safeExecute(activeConn, sql, type);
            const value = res?.[0]?.[Object.keys(res[0])[0]] || 0;
            return NextResponse.json({ value });
          }
          return NextResponse.json({ error: 'Tipo ou ID customizado inválido' }, { status: 400 });
      }
      const res = await safeExecute(activeConn, sql, type);
      const value = res?.[0]?.[Object.keys(res[0])[0]] || 0;
      return NextResponse.json({ [type]: Number(value).toLocaleString('pt-BR') });
    }
    
    // Executa as 3 queries principais em paralelo (comportamento original)
    const [totalRes, prod24hRes, assinadosRes] = await Promise.all([
      safeExecute(activeConn, kpiQueries.total, 'total'),
      safeExecute(activeConn, kpiQueries.prod24h, 'prod24h'),
      safeExecute(activeConn, kpiQueries.assinados, 'assinados')
    ]);

    const total = totalRes?.[0]?.[Object.keys(totalRes[0])[0]] || 0;
    const prod24h = prod24hRes?.[0]?.[Object.keys(prod24hRes[0])[0]] || 0;
    const assinadosRaw = assinadosRes?.[0]?.[Object.keys(assinadosRes[0])[0]] || 0;

    // Calcula taxa de assinatura (evita divisão por zero)
    const assinaturaPercent = total > 0 ? ((Number(assinadosRaw) / Number(total)) * 100).toFixed(1) : 0;

    return NextResponse.json({
      total: Number(total).toLocaleString('pt-BR'),
      prod24h: Number(prod24h).toLocaleString('pt-BR'),
      assinadosPercent: `${assinaturaPercent}%`,
      status: 'Online'
    });
  } catch (error: any) {
    console.error('Erro ao buscar KPIs do Dashboard:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao processar métricas',
      status: 'Erro'
    }, { status: 500 });
  }
}
