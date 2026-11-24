import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';
import { DEMO_CONNECTION_ID, DEMO_MIGRATION_DEMANDS, getDemoMigrationCatalog } from '@/lib/demo-mock';
import { DocumentoMigracao, MigracaoKpisData, DocumentoFlexItem } from '@/types/migracao.types';

let demoDemandsMemory: DocumentoMigracao[] | null = null;
function getDemoDemands(): DocumentoMigracao[] {
  if (!demoDemandsMemory) {
    demoDemandsMemory = JSON.parse(JSON.stringify(DEMO_MIGRATION_DEMANDS));
  }
  return demoDemandsMemory!;
}

function getDemandsFilePath(connectionId: string | null): string {
  const safeId = (connectionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(process.cwd(), 'data', `migration-demands-${safeId}.json`);
}

function getCatalogCachePath(connectionId: string | null, version: 'v2' | 'v3'): string {
  const safeId = (connectionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(process.cwd(), 'data', `${version}-catalog-cache-${safeId}.json`);
}

const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos de TTL para catálogo Oracle

function isCacheStale(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return true;
    const stats = fs.statSync(filePath);
    return (Date.now() - stats.mtimeMs) > CACHE_MAX_AGE_MS;
  } catch {
    return true;
  }
}

function getStoredDemands(connectionId: string | null): DocumentoMigracao[] {
  try {
    const filePath = getDemandsFilePath(connectionId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Erro ao ler ${getDemandsFilePath(connectionId)}:`, err);
    return [];
  }
}

function saveStoredDemands(connectionId: string | null, demands: DocumentoMigracao[]) {
  try {
    const filePath = getDemandsFilePath(connectionId);
    fs.writeFileSync(filePath, JSON.stringify(demands, null, 2), 'utf8');
  } catch (err) {
    console.error(`Erro ao salvar ${getDemandsFilePath(connectionId)}:`, err);
    throw err;
  }
}

function readCachedDocs(filePath: string, tecnologia: 'FLEX' | 'HTML5'): DocumentoFlexItem[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const rows = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r: any) => ({
          id: String(r['CÓDIGO'] || r.cd_documento || r.id),
          cd_documento_mv: Number(r['CÓDIGO'] || r.cd_documento || r.id),
          nome: String(r['NOME'] || r.ds_documento || r.nome || `Documento #${r['CÓDIGO']}`).trim(),
          tecnologia,
          total_usos: Number(r['TOTAL'] || 0),
          ultimo_uso: r['ÚLTIMO USO'] || undefined,
        }));
      }
    }
  } catch (err) {
    console.error(`Erro ao ler cache ${filePath}:`, err);
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('sync') === 'true';
    const storageData = await getData();
    const connId = storageData.activeConnectionId;
    const isDemo = connId === DEMO_CONNECTION_ID;

    const demands = isDemo ? getDemoDemands() : getStoredDemands(connId);
    let docsFlexTotal: DocumentoFlexItem[] = [];
    let docsHtml5Total: DocumentoFlexItem[] = [];

    if (isDemo) {
      const demoCatalog = getDemoMigrationCatalog();
      docsFlexTotal = demoCatalog.docsFlexTotal;
      docsHtml5Total = demoCatalog.docsHtml5Total;
    } else {
      const v2CacheFile = getCatalogCachePath(connId, 'v2');
      const v3CacheFile = getCatalogCachePath(connId, 'v3');
      docsFlexTotal = readCachedDocs(v2CacheFile, 'FLEX');
      docsHtml5Total = readCachedDocs(v3CacheFile, 'HTML5');

      // Se o cache estiver vazio, expirado ou for solicitado sync=true, consulta Oracle diretamente
      const shouldSyncV2 = forceSync || docsFlexTotal.length === 0 || isCacheStale(v2CacheFile);
      const shouldSyncV3 = forceSync || docsHtml5Total.length === 0 || isCacheStale(v3CacheFile);

      if (shouldSyncV2 || shouldSyncV3) {
        const connection = storageData.connections.find(c => c.id === connId);
        if (connection) {
          try {
            if (shouldSyncV2) {
              const sqlV2 = storageData.activeQuery;
              if (sqlV2) {
                const resV2 = await executeQuery(connection, sqlV2, {}, { ttlSeconds: 300, forceRefresh: forceSync });
                const rowsV2 = Array.isArray(resV2) ? resV2 : ((resV2 as any)?.rows || []);
                if (rowsV2.length > 0) {
                  fs.writeFileSync(v2CacheFile, JSON.stringify(rowsV2, null, 2), 'utf8');
                  docsFlexTotal = readCachedDocs(v2CacheFile, 'FLEX');
                }
              }
            }

            if (shouldSyncV3) {
              const sqlV3 = storageData.activeQueryV3 || storageData.activeQuery;
              if (sqlV3) {
                const resV3 = await executeQuery(connection, sqlV3, {}, { ttlSeconds: 300, forceRefresh: forceSync });
                const rowsV3 = Array.isArray(resV3) ? resV3 : ((resV3 as any)?.rows || []);
                if (rowsV3.length > 0) {
                  fs.writeFileSync(v3CacheFile, JSON.stringify(rowsV3, null, 2), 'utf8');
                  docsHtml5Total = readCachedDocs(v3CacheFile, 'HTML5');
                }
              }
            }
          } catch (oracleErr) {
            console.error('[API Migração] Erro ao sincronizar catálogo com Oracle:', oracleErr);
          }
        }
      }
    }

    // Ordenar listas numericamente por código para facilitar localização
    docsFlexTotal.sort((a, b) => Number(a.cd_documento_mv) - Number(b.cd_documento_mv));
    docsHtml5Total.sort((a, b) => Number(a.cd_documento_mv) - Number(b.cd_documento_mv));

    // Mapas para enriquecimento ágil de demandas
    const flexDocMap = new Map<string, DocumentoFlexItem>();
    docsFlexTotal.forEach(d => flexDocMap.set(String(d.cd_documento_mv), d));

    const html5DocMap = new Map<string, DocumentoFlexItem>();
    docsHtml5Total.forEach(d => html5DocMap.set(String(d.cd_documento_mv), d));

    // Enriquecer demandas com dados atualizados do catálogo Oracle
    const enrichedDemands: DocumentoMigracao[] = demands.map(d => {
      const flexDoc = flexDocMap.get(String(d.documento_flex_id)) || d.documento_flex;
      const html5Doc = d.documento_html5_id ? (html5DocMap.get(String(d.documento_html5_id)) || d.documento_html5) : null;
      return {
        ...d,
        documento_flex: flexDoc,
        documento_html5: html5Doc || null
      };
    });

    // Documentos Flex que ainda não possuem demanda iniciada (Backlog puro da V2 do Oracle)
    const demandFlexIds = new Set(demands.map(d => String(d.documento_flex_id)));
    const docsFlexSemMigracao = docsFlexTotal.filter(d => !demandFlexIds.has(String(d.cd_documento_mv)));

    // Cálculo dinâmico dos KPIs de Governança de Migração
    const totalFlex = docsFlexTotal.length;
    const totalHtml5 = docsHtml5Total.length;
    const totalMigrados = demands.filter(d => d.status === 'EM_PRODUCAO').length;
    const totalEmAndamento = demands.filter(d => d.status === 'DESENVOLVIMENTO').length;
    const totalHomologacao = demands.filter(d => ['HOMOLOGACAO', 'CONFIGURACAO_PERFIL', 'AGENDADO'].includes(d.status)).length;
    const totalPlanejados = demands.filter(d => d.status === 'PENDENTES').length;
    const totalNaoIniciados = docsFlexSemMigracao.length;
    const percentualConcluido = totalFlex > 0 ? Number(((totalMigrados / totalFlex) * 100).toFixed(1)) : 0;

    const kpis: MigracaoKpisData = {
      totalFlex,
      totalHtml5,
      totalMigrados,
      totalEmAndamento,
      totalHomologacao,
      totalPlanejados,
      totalNaoIniciados,
      percentualConcluido
    };

    return NextResponse.json({
      migracoes: enrichedDemands,
      docsFlexSemMigracao,
      docsFlexTotal,
      docsHtml5Total,
      kpis,
      origem: 'Oracle Database V2/V3 Catalog'
    });
  } catch (err: any) {
    console.error('Erro no GET /api/migracao:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar migrações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storageData = await getData();
    const connId = storageData.activeConnectionId;
    const isDemo = connId === DEMO_CONNECTION_ID;
    const demands = isDemo ? getDemoDemands() : getStoredDemands(connId);

    if (!body.documento_flex_id) {
      return NextResponse.json({ error: 'Documento Flex de origem é obrigatório' }, { status: 400 });
    }

    const id = body.id || `demanda-${Date.now()}`;
    const now = new Date().toISOString();

    const demoCatalog = isDemo ? getDemoMigrationCatalog() : null;
    const v2CacheFile = getCatalogCachePath(connId, 'v2');
    const v3CacheFile = getCatalogCachePath(connId, 'v3');
    const flexDocs = demoCatalog ? demoCatalog.docsFlexTotal : readCachedDocs(v2CacheFile, 'FLEX');
    const flexDoc = flexDocs.find(d => String(d.cd_documento_mv) === String(body.documento_flex_id));

    let html5Doc = null;
    if (body.documento_html5_id) {
      const html5Docs = demoCatalog ? demoCatalog.docsHtml5Total : readCachedDocs(v3CacheFile, 'HTML5');
      html5Doc = html5Docs.find(d => String(d.cd_documento_mv) === String(body.documento_html5_id));
    }

    const newDemand: DocumentoMigracao = {
      id,
      documento_flex_id: String(body.documento_flex_id),
      documento_html5_id: body.documento_html5_id ? String(body.documento_html5_id) : null,
      status: body.status || 'PENDENTES',
      complexidade: body.complexidade || 'MEDIA',
      responsavel: body.responsavel || body.responsavel_dev || null,
      responsavel_dev: body.responsavel_dev || body.responsavel || null,
      responsavel_perfil: body.responsavel_perfil || null,
      lecom: body.lecom || null,
      codigo_objeto: body.codigo_objeto || null,
      tipo_documento: body.tipo_documento || null,
      campos_relacionados: body.campos_relacionados || null,
      regras_negocio: body.regras_negocio || null,
      observacoes: body.observacoes || null,
      checklist: Array.isArray(body.checklist) ? body.checklist : [],
      data_inicio: body.data_inicio || null,
      data_conclusao_prevista: body.data_conclusao_prevista || null,
      data_conclusao_efetiva: body.data_conclusao_efetiva || null,
      created_at: body.created_at || now,
      updated_at: now,
      documento_flex: flexDoc || body.documento_flex,
      documento_html5: html5Doc || body.documento_html5,
    };

    const existingIndex = demands.findIndex(d => d.id === id);
    if (existingIndex >= 0) {
      demands[existingIndex] = {
        ...demands[existingIndex],
        ...newDemand,
        updated_at: now
      };
    } else {
      demands.unshift(newDemand);
    }

    if (!isDemo) {
      saveStoredDemands(connId, demands);
    }

    return NextResponse.json({
      success: true,
      demanda: newDemand
    });
  } catch (err: any) {
    console.error('Erro no POST /api/migracao:', err);
    return NextResponse.json({ error: err.message || 'Erro ao salvar demanda' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios' }, { status: 400 });
    }

    const storageData = await getData();
    const connId = storageData.activeConnectionId;
    const isDemo = connId === DEMO_CONNECTION_ID;
    const demands = isDemo ? getDemoDemands() : getStoredDemands(connId);
    const demandIndex = demands.findIndex(d => d.id === id);

    if (demandIndex === -1) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 });
    }

    demands[demandIndex].status = status;
    demands[demandIndex].updated_at = new Date().toISOString();

    if (status === 'EM_PRODUCAO' && !demands[demandIndex].data_conclusao_efetiva) {
      demands[demandIndex].data_conclusao_efetiva = new Date().toISOString().split('T')[0];
    }

    if (!isDemo) {
      saveStoredDemands(connId, demands);
    }

    return NextResponse.json({
      success: true,
      demanda: demands[demandIndex]
    });
  } catch (err: any) {
    console.error('Erro no PATCH /api/migracao:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar status' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const storageData = await getData();
    const connId = storageData.activeConnectionId;
    const isDemo = connId === DEMO_CONNECTION_ID;
    const demands = isDemo ? getDemoDemands() : getStoredDemands(connId);
    const filtered = demands.filter(d => d.id !== id);

    if (filtered.length === demands.length) {
      return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 });
    }

    if (isDemo) {
      demoDemandsMemory = filtered;
    } else {
      saveStoredDemands(connId, filtered);
    }

    return NextResponse.json({ success: true, message: 'Demanda excluída com sucesso' });
  } catch (err: any) {
    console.error('Erro no DELETE /api/migracao:', err);
    return NextResponse.json({ error: err.message || 'Erro ao excluir demanda' }, { status: 500 });
  }
}
