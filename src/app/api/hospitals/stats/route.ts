import { NextResponse } from 'next/server';
import { getData, STORAGE_FILE } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get('id');
  const force = searchParams.get('force') === 'true';
  const version = (searchParams.get('version') || 'V2').toUpperCase();
  const isV3 = version === 'V3';

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
      error: `Nenhuma conexao ativa encontrada. Info: ${JSON.stringify(debugInfo)}` 
    }, { status: 400 });
  }

  try {
    const rawQueries = isV3 && (data as any).hospitalQueriesV3 
      ? (data as any).hospitalQueriesV3 
      : (data as any).hospitalQueries;

    let kpisQuery = rawQueries?.kpis || '';
    let detailQuery = rawQueries?.detailTable || '';
    let top5Query = rawQueries?.top5 || '';
    let totalQuery = (isV3 && (data as any).kpiQueriesV3?.total)
      ? (data as any).kpiQueriesV3.total
      : (data as any).kpiQueries?.total;

    // Se for V3 e nao houver queries explicitas, aplica transformacoes de schema e tipos
    if (isV3 && !(data as any).hospitalQueriesV3) {
      kpisQuery = kpisQuery.replace(/DBAMV\.EDITOR_DOCUMENTO/gi, 'EDITOR.EDITOR_DOCUMENTO');
      detailQuery = detailQuery
        .replace(/DBAMV\.EDITOR_DOCUMENTO/gi, 'EDITOR.EDITOR_DOCUMENTO')
        .replace(/DBAMV\.EDITOR_VERSAO_DOCUMENTO WHERE SN_ATIVO = 'S'/gi, "EDITOR.EDITOR_VERSAO_DOCUMENTO WHERE SN_PUBLICADO = 1");
      top5Query = top5Query.replace(/DBAMV\.EDITOR_DOCUMENTO/gi, 'EDITOR.EDITOR_DOCUMENTO');
    }

    // Protecao contra ORA-01722: PEC.CD_DOCUMENTO pode conter valores nao numericos no Oracle
    const fixTypes = (sql: string) => {
      return sql
        .replace(/ED\.CD_DOCUMENTO\s*=\s*PEC\.CD_DOCUMENTO/gi, 'TO_CHAR(ED.CD_DOCUMENTO) = TO_CHAR(PEC.CD_DOCUMENTO)')
        .replace(/PEC\.CD_DOCUMENTO\s*=\s*ED\.CD_DOCUMENTO/gi, 'TO_CHAR(PEC.CD_DOCUMENTO) = TO_CHAR(ED.CD_DOCUMENTO)')
        .replace(/V\.CD_DOCUMENTO\s*=\s*ED\.CD_DOCUMENTO/gi, 'TO_CHAR(V.CD_DOCUMENTO) = TO_CHAR(ED.CD_DOCUMENTO)')
        .replace(/SN_PUBLICADO\s*=\s*'S'/gi, 'SN_PUBLICADO = 1');
    };

    kpisQuery = fixTypes(kpisQuery);
    detailQuery = fixTypes(detailQuery);
    top5Query = fixTypes(top5Query);
    if (totalQuery) totalQuery = fixTypes(totalQuery);

    const numericHospitalId = isNaN(Number(hospitalId)) ? hospitalId : Number(hospitalId);

    const [kpisRes, detailRes, top5Res, globalRes] = await Promise.all([
      executeQuery(activeConn, kpisQuery, { ID: numericHospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, detailQuery, { ID: numericHospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, top5Query, { ID: numericHospitalId }, { ttlSeconds: 600, forceRefresh: force }),
      executeQuery(activeConn, totalQuery, {}, { ttlSeconds: 600, forceRefresh: force })
    ]);

    const result = {
      kpis: kpisRes[0] || {},
      details: detailRes || [],
      top5: top5Res || [],
      globalTotal: globalRes[0]?.TOTAL_GERAL_PREENCHIDO || 0,
      versionApplied: isV3 ? 'V3' : 'V2'
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching hospital stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}