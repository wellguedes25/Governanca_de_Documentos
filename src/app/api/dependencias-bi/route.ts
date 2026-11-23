import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getData } from '@/lib/storage';
import { BiArtifact, BiCatalogDocOption } from '@/types/bi-dependencies.types';

const BI_DEPS_FILE = path.join(process.cwd(), 'data', 'bi-dependencies.json');
const V2_CACHE_FILE = path.join(process.cwd(), 'data', 'v2-catalog-cache.json');
const V3_CACHE_FILE = path.join(process.cwd(), 'data', 'v3-catalog-cache.json');

const SEED_ARTIFACTS: BiArtifact[] = [
  {
    id: 'bi-seed-1',
    nome: 'Painel de Adesão e Qualidade da Evolução Médica',
    descricao: 'Monitora tempo de fechamento, completude clínica e adesão assistencial das evoluções médicas diárias nas unidades de internação.',
    tipo: 'PAINEL_BI',
    ferramenta: 'Power BI',
    responsavel: 'Núcleo de Inteligência Clínica / Qualidade',
    area: 'Qualidade Assistencial',
    url: '',
    criticidade: 'ALTA',
    unidades: ['HSC', 'CSSJ', 'HST'],
    documentosVinculados: [
      {
        docId: '382',
        docName: 'EVOLUÇÃO MÉDICA DIÁRIA',
        motor: 'V3',
        fields: ['DS_EVOLUCAO_CLINICA', 'CONDUTA_MEDICA', 'HIPOTESE_DIAGNOSTICA'],
        observacao: 'Extrai texto de evolução e conduta para indicadores de conformidade ONA/JCI.'
      }
    ],
    criadoEm: '2026-11-01T10:00:00.000Z',
    atualizadoEm: '2026-11-01T10:00:00.000Z'
  },
  {
    id: 'bi-seed-2',
    nome: 'Indicador de Plano Terapêutico nas Primeiras 24h',
    descricao: 'KPI regulatório que mede o percentual de pacientes internados com avaliação inicial e plano terapêutico preenchidos dentro do prazo.',
    tipo: 'INDICADOR',
    ferramenta: 'Qlik',
    responsavel: 'Escritório de Valor em Saúde',
    area: 'Diretoria Técnica',
    url: '',
    criticidade: 'ALTA',
    unidades: [],
    documentosVinculados: [
      {
        docId: '362',
        docName: 'AVALIAÇÃO INICIAL PLANO TERAPÊUTICO INTERNAÇÃO ADULTO',
        motor: 'V3',
        fields: ['PLANO_TERAPEUTICO', 'RISCO_ASSISTENCIAL'],
        observacao: 'Obrigatório para fechamento de metas assistenciais corporativas.'
      }
    ],
    criadoEm: '2026-11-02T14:30:00.000Z',
    atualizadoEm: '2026-11-02T14:30:00.000Z'
  },
  {
    id: 'bi-seed-3',
    nome: 'Relatório de Desospitalização & Resumo de Alta',
    descricao: 'Consolida orientações de alta, pendências pós-internação e tempo médio de permanência por especialidade.',
    tipo: 'RELATORIO',
    ferramenta: 'MV',
    responsavel: 'Gestão de Leitos / NIR',
    area: 'Operações Hospitalares',
    url: '',
    criticidade: 'MEDIA',
    unidades: ['HSC', 'HSJ'],
    documentosVinculados: [
      {
        docId: '622',
        docName: 'RESUMO DE ALTA',
        motor: 'V3',
        fields: ['CONDICOES_ALTA', 'ORIENTACOES_ALTA'],
        observacao: 'Base para painel de giro de leitos e transição segura do cuidado.'
      },
      {
        docId: '382',
        docName: 'EVOLUÇÃO MÉDICA DIÁRIA',
        motor: 'V3',
        fields: [],
        observacao: 'Cruzamento da última evolução médica pré-alta.'
      }
    ],
    criadoEm: '2026-11-05T09:15:00.000Z',
    atualizadoEm: '2026-11-05T09:15:00.000Z'
  }
];

function ensureDataDir() {
  const dir = path.dirname(BI_DEPS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getStoredArtifacts(): BiArtifact[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(BI_DEPS_FILE)) {
      fs.writeFileSync(BI_DEPS_FILE, JSON.stringify(SEED_ARTIFACTS, null, 2), 'utf8');
      return SEED_ARTIFACTS;
    }
    const raw = fs.readFileSync(BI_DEPS_FILE, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler bi-dependencies.json:', err);
    return [];
  }
}

function saveStoredArtifacts(artifacts: BiArtifact[]) {
  ensureDataDir();
  fs.writeFileSync(BI_DEPS_FILE, JSON.stringify(artifacts, null, 2), 'utf8');
}

function readCatalogCache(filePath: string, motor: 'V2' | 'V3'): BiCatalogDocOption[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r: any) => {
        const id = String(r['CÓDIGO'] || r['CODIGO'] || r['CD_DOCUMENTO'] || r.cd_documento || r.id || '').trim();
        const nome = String(r['NOME'] || r['DOCUMENTO CLÍNICO'] || r['DS_DOCUMENTO'] || r.ds_documento || r.nome || `Documento #${id}`).trim();
        const totalUsos = Number(r['TOTAL'] || r.total_usos || 0);
        return { id, nome, motor, totalUsos: isNaN(totalUsos) ? 0 : totalUsos };
      })
      .filter(d => d.id.length > 0);
  } catch (err) {
    console.error(`Erro ao ler cache ${filePath}:`, err);
    return [];
  }
}

export async function GET() {
  try {
    const artifacts = getStoredArtifacts();
    const storageData = await getData();

    const v3Docs = readCatalogCache(V3_CACHE_FILE, 'V3');
    const v2Docs = readCatalogCache(V2_CACHE_FILE, 'V2');

    // Deduplica priorizando V3 se o mesmo ID existir nos dois caches
    const docsMap = new Map<string, BiCatalogDocOption>();
    v2Docs.forEach(d => docsMap.set(`${d.motor}:${d.id}`, d));
    v3Docs.forEach(d => docsMap.set(`${d.motor}:${d.id}`, d));

    const catalogDocs = Array.from(docsMap.values()).sort((a, b) => (b.totalUsos || 0) - (a.totalUsos || 0));
    const hospitals = (storageData.hospitalsMapping || []).filter(h => h.ativo);

    return NextResponse.json({
      artifacts,
      catalogDocs,
      hospitals
    });
  } catch (err: any) {
    console.error('GET /api/dependencias-bi erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar dependências BI.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const artifacts = getStoredArtifacts();
    const now = new Date().toISOString();

    if (body.action === 'IMPORT_BATCH' && Array.isArray(body.artifacts)) {
      const incoming: Partial<BiArtifact>[] = body.artifacts;
      const byNameOrId = new Map<string, BiArtifact>();
      artifacts.forEach(a => byNameOrId.set(a.id, a));

      let createdCount = 0;
      let updatedCount = 0;

      for (const item of incoming) {
        if (!item.nome || !String(item.nome).trim()) continue;
        const cleanNome = String(item.nome).trim();
        const existing =
          (item.id && byNameOrId.get(item.id)) ||
          Array.from(byNameOrId.values()).find(
            a => a.nome.toLowerCase() === cleanNome.toLowerCase() && a.tipo === (item.tipo || a.tipo)
          );

        if (existing) {
          const mergedDocs = [...(existing.documentosVinculados || [])];
          for (const docLink of item.documentosVinculados || []) {
            const idx = mergedDocs.findIndex(d => d.docId === docLink.docId);
            if (idx >= 0) {
              const unionFields = Array.from(new Set([...(mergedDocs[idx].fields || []), ...(docLink.fields || [])]));
              mergedDocs[idx] = {
                ...mergedDocs[idx],
                docName: docLink.docName || mergedDocs[idx].docName,
                fields: unionFields,
                observacao: docLink.observacao || mergedDocs[idx].observacao
              };
            } else {
              mergedDocs.push(docLink);
            }
          }

          const updated: BiArtifact = {
            ...existing,
            descricao: item.descricao ?? existing.descricao,
            ferramenta: item.ferramenta || existing.ferramenta,
            responsavel: item.responsavel || existing.responsavel,
            area: item.area ?? existing.area,
            url: item.url ?? existing.url,
            criticidade: item.criticidade || existing.criticidade,
            unidades: item.unidades && item.unidades.length > 0 ? item.unidades : existing.unidades,
            documentosVinculados: mergedDocs,
            atualizadoEm: now
          };
          byNameOrId.set(existing.id, updated);
          updatedCount++;
        } else {
          const newId = item.id && String(item.id).trim()
            ? String(item.id).trim()
            : `bi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          const created: BiArtifact = {
            id: newId,
            nome: cleanNome,
            descricao: item.descricao ? String(item.descricao).trim() : '',
            tipo: item.tipo || 'RELATORIO',
            ferramenta: item.ferramenta || 'Power BI',
            responsavel: item.responsavel ? String(item.responsavel).trim() : 'Não informado',
            area: item.area ? String(item.area).trim() : '',
            url: item.url ? String(item.url).trim() : '',
            criticidade: item.criticidade || 'MEDIA',
            unidades: Array.isArray(item.unidades) ? item.unidades : [],
            documentosVinculados: Array.isArray(item.documentosVinculados) ? item.documentosVinculados : [],
            criadoEm: now,
            atualizadoEm: now
          };
          byNameOrId.set(newId, created);
          createdCount++;
        }
      }

      const nextList = Array.from(byNameOrId.values());
      saveStoredArtifacts(nextList);
      return NextResponse.json({
        artifacts: nextList,
        summary: { createdCount, updatedCount }
      });
    }

    if (!body.nome || !String(body.nome).trim()) {
      return NextResponse.json({ error: 'Nome do artefato é obrigatório.' }, { status: 400 });
    }

    const newArtifact: BiArtifact = {
      id: `bi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome: String(body.nome).trim(),
      descricao: body.descricao ? String(body.descricao).trim() : '',
      tipo: body.tipo || 'RELATORIO',
      ferramenta: body.ferramenta || 'Power BI',
      responsavel: body.responsavel ? String(body.responsavel).trim() : 'Não informado',
      area: body.area ? String(body.area).trim() : '',
      url: body.url ? String(body.url).trim() : '',
      criticidade: body.criticidade || 'MEDIA',
      unidades: Array.isArray(body.unidades) ? body.unidades : [],
      documentosVinculados: Array.isArray(body.documentosVinculados) ? body.documentosVinculados : [],
      criadoEm: now,
      atualizadoEm: now
    };

    const next = [newArtifact, ...artifacts];
    saveStoredArtifacts(next);
    return NextResponse.json({ artifact: newArtifact, artifacts: next }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/dependencias-bi erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao salvar artefato BI.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID do artefato é obrigatório.' }, { status: 400 });
    }

    const artifacts = getStoredArtifacts();
    const idx = artifacts.findIndex(a => a.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Artefato não encontrado.' }, { status: 404 });
    }

    const updated: BiArtifact = {
      ...artifacts[idx],
      nome: body.nome !== undefined ? String(body.nome).trim() : artifacts[idx].nome,
      descricao: body.descricao !== undefined ? String(body.descricao).trim() : artifacts[idx].descricao,
      tipo: body.tipo || artifacts[idx].tipo,
      ferramenta: body.ferramenta || artifacts[idx].ferramenta,
      responsavel: body.responsavel !== undefined ? String(body.responsavel).trim() : artifacts[idx].responsavel,
      area: body.area !== undefined ? String(body.area).trim() : artifacts[idx].area,
      url: body.url !== undefined ? String(body.url).trim() : artifacts[idx].url,
      criticidade: body.criticidade || artifacts[idx].criticidade,
      unidades: Array.isArray(body.unidades) ? body.unidades : artifacts[idx].unidades,
      documentosVinculados: Array.isArray(body.documentosVinculados)
        ? body.documentosVinculados
        : artifacts[idx].documentosVinculados,
      atualizadoEm: new Date().toISOString()
    };

    const next = [...artifacts];
    next[idx] = updated;
    saveStoredArtifacts(next);

    return NextResponse.json({ artifact: updated, artifacts: next });
  } catch (err: any) {
    console.error('PUT /api/dependencias-bi erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar artefato BI.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Parâmetro id é obrigatório.' }, { status: 400 });
    }

    const artifacts = getStoredArtifacts();
    const next = artifacts.filter(a => a.id !== id);
    if (next.length === artifacts.length) {
      return NextResponse.json({ error: 'Artefato não encontrado.' }, { status: 404 });
    }

    saveStoredArtifacts(next);
    return NextResponse.json({ artifacts: next });
  } catch (err: any) {
    console.error('DELETE /api/dependencias-bi erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao excluir artefato BI.' }, { status: 500 });
  }
}
