import { NextResponse } from 'next/server';
import { getData, saveData, DbConnection } from '@/lib/storage';
import { clearQueryCache } from '@/lib/cache';
import { resetOraclePool } from '@/lib/oracle';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getData();
  
  // Hide passwords before sending to frontend
  const dataToSend = JSON.parse(JSON.stringify(data));
  if (dataToSend.connections) {
    dataToSend.connections.forEach((conn: any) => {
      if (conn.password) {
        conn.password = '********';
      }
    });
  }
  
  return NextResponse.json(dataToSend);
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = await getData();

  if (body.type === 'SAVE_CONNECTION') {
    const conn: DbConnection = body.connection;
    const index = data.connections.findIndex(c => c.id === conn.id);
    
    // If the frontend sends back the masked password, recover the real one from disk
    if (conn.password === '********') {
      if (index > -1) {
        conn.password = data.connections[index].password;
      } else {
        conn.password = undefined;
      }
    }
    
    if (index > -1) {
      data.connections[index] = conn;
    } else {
      data.connections.push(conn);
    }
  } else if (body.type === 'DELETE_CONNECTION') {
    console.log(`[API] Deletando conexão: ${body.id}`);
    const initialCount = data.connections.length;
    data.connections = data.connections.filter(c => c.id !== body.id);
    console.log(`[API] Conexões restantes: ${data.connections.length} (Removidos: ${initialCount - data.connections.length})`);
    if (data.activeConnectionId === body.id) {
        data.activeConnectionId = null;
    }
    clearQueryCache();
    await resetOraclePool();
  } else if (body.type === 'SET_ACTIVE') {
    data.activeConnectionId = body.id;
    clearQueryCache();
    await resetOraclePool();
  } else if (body.type === 'SAVE_QUERY') {
    data.activeQuery = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_QUERY_V3') {
    data.activeQueryV3 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_PROFILE_QUERY') {
    data.profileQuery = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_PROFILE_QUERY_V3') {
    data.profileQueryV3 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_METADATA_QUERY') {
    data.docMetadataQuery = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_METADATA_QUERY_V3') {
    data.docMetadataQueryV3 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_ACTIONS_QUERY') {
    data.docActionsQuery = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_ACTIONS_QUERY_V3') {
    data.docActionsQueryV3 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_RULES_QUERY') {
    data.docRulesQuery = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_RULES_QUERY_V3') {
    data.docRulesQueryV3 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_CLIENT_PATH') {
    data.oracleClientPath = body.path;
  } else if (body.type === 'SAVE_KPI_TOTAL') {
    data.kpiQueries.total = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_TOTAL_V3') {
    if (!data.kpiQueriesV3) data.kpiQueriesV3 = { total: '', prod24h: '', assinados: '' };
    data.kpiQueriesV3.total = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_24H') {
    data.kpiQueries.prod24h = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_24H_V3') {
    if (!data.kpiQueriesV3) data.kpiQueriesV3 = { total: '', prod24h: '', assinados: '' };
    data.kpiQueriesV3.prod24h = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_ASSINADOS') {
    data.kpiQueries.assinados = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_ASSINADOS_V3') {
    if (!data.kpiQueriesV3) data.kpiQueriesV3 = { total: '', prod24h: '', assinados: '' };
    data.kpiQueriesV3.assinados = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_TOP10') {
    data.analyticQueries.top10 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_TOP10_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.top10 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_IDLE') {
    data.analyticQueries.idle = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_IDLE_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.idle = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_VOLUME3M') {
    data.analyticQueries.volume3m = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_VOLUME3M_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.volume3m = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_UNIT_ADHERENCE') {
    data.analyticQueries.unitAdherence = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_UNIT_ADHERENCE_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.unitAdherence = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_UNIT_INACTIVITY') {
    data.analyticQueries.unitInactivity = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_UNIT_INACTIVITY_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.unitInactivity = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_VOLUME_TURNO') {
    data.analyticQueries.volumeTurno = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_VOLUME_TURNO_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.volumeTurno = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_SLA_ASSINATURA') {
    data.analyticQueries.slaAssinatura = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_KPI_SLA_ASSINATURA_V3') {
    if (!data.analyticQueriesV3) data.analyticQueriesV3 = { ...data.analyticQueries };
    data.analyticQueriesV3.slaAssinatura = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_HOSPITAL_KPIS') {
    if (!data.hospitalQueries) data.hospitalQueries = { kpis: '', detailTable: '', top5: '' };
    data.hospitalQueries.kpis = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_HOSPITAL_KPIS_V3') {
    if (!data.hospitalQueriesV3) data.hospitalQueriesV3 = { kpis: '', detailTable: '', top5: '' };
    data.hospitalQueriesV3.kpis = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_HOSPITAL_DETAIL') {
    if (!data.hospitalQueries) data.hospitalQueries = { kpis: '', detailTable: '', top5: '' };
    data.hospitalQueries.detailTable = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_HOSPITAL_DETAIL_V3') {
    if (!data.hospitalQueriesV3) data.hospitalQueriesV3 = { kpis: '', detailTable: '', top5: '' };
    data.hospitalQueriesV3.detailTable = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_HOSPITAL_TOP5') {
    if (!data.hospitalQueries) data.hospitalQueries = { kpis: '', detailTable: '', top5: '' };
    data.hospitalQueries.top5 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_HOSPITAL_TOP5_V3') {
    if (!data.hospitalQueriesV3) data.hospitalQueriesV3 = { kpis: '', detailTable: '', top5: '' };
    data.hospitalQueriesV3.top5 = body.query;
    clearQueryCache();
  } else if (body.type === 'SAVE_DOC_MAPPINGS') {
    data.docMappings = body.mappings;
  } else if (body.type === 'SAVE_REPORT_URL') {
    data.reportBaseUrl = body.url;
  } else if (body.type === 'SAVE_AUDIT_PARAMS') {
    if (body.auditDays !== undefined) data.auditDays = Number(body.auditDays);
    if (body.auditDocId !== undefined) data.auditDocId = body.auditDocId;
  } else if (body.type === 'SAVE_HOSPITALS_MAPPING') {
    data.hospitalsMapping = body.hospitalsMapping;
    clearQueryCache();
  }

  if (body.enabledQueries) {
    data.enabledQueries = { ...data.enabledQueries, ...body.enabledQueries };
  }
  if (body.cardSettings) {
    data.cardSettings = { ...data.cardSettings, ...body.cardSettings };
  }

  await saveData(data);
  return NextResponse.json(data);
}
