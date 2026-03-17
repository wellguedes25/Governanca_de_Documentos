import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function GET() {
  const data = getData();
  const activeConn = data.connections.find(c => c.id === data.activeConnectionId);

  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa' }, { status: 400 });
  }

  try {
    const kpiQueries = data.kpiQueries;
    
    // Executa as 3 queries principais em paralelo
    const [totalRes, prod24hRes, assinadosRes] = await Promise.all([
      executeQuery(activeConn, kpiQueries.total),
      executeQuery(activeConn, kpiQueries.prod24h),
      executeQuery(activeConn, kpiQueries.assinados)
    ]);

    // Extrai os valores (assume-se que a query retorna uma coluna TOTAL ou similar no primeiro registro)
    const total = totalRes.rows?.[0]?.[Object.keys(totalRes.rows[0])[0]] || 0;
    const prod24h = prod24hRes.rows?.[0]?.[Object.keys(prod24hRes.rows[0])[0]] || 0;
    const assinadosRaw = assinadosRes.rows?.[0]?.[Object.keys(assinadosRes.rows[0])[0]] || 0;

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
