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

    // Helper robusto para pegar valor por nome de coluna (case-insensitive)
    const getCol = (row: any, colName: string) => {
      if (!row) return 0;
      const key = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === colName.toUpperCase());
      return key ? row[key] : 0;
    };

    // Consultas individuais para refresh granular
    if (type) {
      if (type === 'assinados') {
        const [totalRes, assinadosRes] = await Promise.all([
          safeExecute(activeConn, kpiQueries.total, 'total'),
          safeExecute(activeConn, kpiQueries.assinados, 'assinados')
        ]);
        const total = Number(getCol(totalRes?.[0], 'TOTAL_GERAL_PREENCHIDO') || getCol(totalRes?.[0], 'TOTAL_GERAL') || getCol(totalRes?.[0], Object.keys(totalRes?.[0] || {})[0]) || 0);
        // Pega QTD_ASSINADO explicitamente — corrige o bug de pegar TOTAL_GERAL
        const assinadoVal = Number(getCol(assinadosRes?.[0], 'QTD_ASSINADO') || 0);
        const percent = total > 0 ? ((assinadoVal / total) * 100).toFixed(1) : '0.0';
        
        return NextResponse.json({ 
          assinadosRaw: Number(assinadoVal).toLocaleString('pt-BR'),
          assinadosPercent: percent + '%'
        });
      }

      if (type === 'prod24h') {
        const res = await safeExecute(activeConn, kpiQueries.prod24h, 'prod24h');
        const totalGeral = Number(getCol(res?.[0], 'TOTAL_GERAL') || getCol(res?.[0], Object.keys(res?.[0] || {})[0]) || 0);
        return NextResponse.json({ prod24h: Number(totalGeral).toLocaleString('pt-BR') });
      }

      if (type === 'total') {
        const res = await safeExecute(activeConn, kpiQueries.total, 'total');
        const value = Number(getCol(res?.[0], 'TOTAL_GERAL_PREENCHIDO') || getCol(res?.[0], Object.keys(res?.[0] || {})[0]) || 0);
        return NextResponse.json({ total: Number(value).toLocaleString('pt-BR') });
      }
      
      // Se não for um tipo nativo, pode ser um customId
      const customCard = (data.customCards || []).find(c => String(c.id) === String(type));
      if (customCard) {
        const res = await safeExecute(activeConn, customCard.query, type);
        const value = res?.[0]?.[Object.keys(res[0])[0]] || 0;
        return NextResponse.json({ value });
      }
      return NextResponse.json({ error: 'Tipo ou ID customizado inválido' }, { status: 400 });
    }
    
    // Executa as 3 queries principais em paralelo (comportamento original)
    const [totalRes, prod24hRes, assinadosRes] = await Promise.all([
      safeExecute(activeConn, kpiQueries.total, 'total'),
      safeExecute(activeConn, kpiQueries.prod24h, 'prod24h'),
      safeExecute(activeConn, kpiQueries.assinados, 'assinados')
    ]);

    const total = Number(getCol(totalRes?.[0], 'TOTAL_GERAL_PREENCHIDO') || getCol(totalRes?.[0], Object.keys(totalRes?.[0] || {})[0]) || 0);
    const prod24h = Number(getCol(prod24hRes?.[0], 'TOTAL_GERAL') || getCol(prod24hRes?.[0], Object.keys(prod24hRes?.[0] || {})[0]) || 0);
    // Fix: pega QTD_ASSINADO explicitamente em vez da primeira coluna
    const assinadosVal = Number(getCol(assinadosRes?.[0], 'QTD_ASSINADO') || 0);

    // Calcula taxa de assinatura (evita divisão por zero)
    const assinaturaPercent = total > 0 ? ((assinadosVal / total) * 100).toFixed(1) : '0.0';

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
