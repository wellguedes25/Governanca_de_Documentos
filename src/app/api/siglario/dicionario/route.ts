import { NextResponse, NextRequest } from 'next/server';
import { getData, saveData, SiglarioEntry } from '@/lib/storage';
export const dynamic = 'force-dynamic';

// GET — Lista todas as entradas do dicionário
export async function GET() {
  const data = await getData();

  // Merge: se existem entries novos, usa. Senão, converte listas legacy.
  let entries = data.siglarioEntries || [];

  if (entries.length === 0) {
    // Migração automática: converte listas flat antigas para SiglarioEntry[]
    const allowed = data.siglarioAllowed || [];
    const forbidden = data.siglarioForbidden || [];

    entries = [
      ...allowed.map((s, i) => ({
        id: `legacy-a-${i}`,
        sigla: s,
        tipo: 'allowed' as const,
        significado: '',
        criadoEm: new Date().toISOString(),
      })),
      ...forbidden.map((s, i) => ({
        id: `legacy-f-${i}`,
        sigla: s,
        tipo: 'forbidden' as const,
        significado: '',
        criadoEm: new Date().toISOString(),
      })),
    ];
  }

  return NextResponse.json({ 
    entries,
    params: {
      docIds: data.siglarioDocIds || data.auditDocId || "916,1048,772",
      fieldId: data.siglarioFieldId || "",
      days: data.siglarioAuditDays || data.auditDays || 15
    }
  });
}

// POST — Adiciona entradas ou salva parâmetros
export async function POST(request: NextRequest) {
  const body = await request.json();
  const data = await getData();

  if (body.type === 'SAVE_SIGLARIO_PARAMS') {
    if (body.docIds !== undefined) data.siglarioDocIds = body.docIds;
    if (body.fieldId !== undefined) data.siglarioFieldId = body.fieldId;
    if (body.days !== undefined) data.siglarioAuditDays = Number(body.days);
    await saveData(data);
    return NextResponse.json({ message: 'Parâmetros salvos com sucesso!' });
  }

  const newEntries: SiglarioEntry[] = Array.isArray(body.entries)
    ? body.entries
    : [body];

  // Validação
  for (const entry of newEntries) {
    if (!entry.sigla || !entry.tipo) {
      return NextResponse.json(
        { error: 'Campos "sigla" e "tipo" são obrigatórios.' },
        { status: 400 }
      );
    }
    if (!['allowed', 'forbidden'].includes(entry.tipo)) {
      return NextResponse.json(
        { error: 'Campo "tipo" deve ser "allowed" ou "forbidden".' },
        { status: 400 }
      );
    }
  }

  const entriesToAdd: SiglarioEntry[] = newEntries.map((e: any) => ({
    id: e.id || `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sigla: e.sigla.trim(),
    tipo: e.tipo,
    significado: e.significado?.trim() || '',
    criadoEm: e.criadoEm || new Date().toISOString(),
  }));

  // Evita duplicatas (mesma sigla normalizada)
  const existingNorm = new Set(
    (data.siglarioEntries || []).map((e) => e.sigla.toLowerCase().trim())
  );

  const unique = entriesToAdd.filter(
    (e) => !existingNorm.has(e.sigla.toLowerCase().trim())
  );

  data.siglarioEntries = [...(data.siglarioEntries || []), ...unique];

  // Sync listas legacy para compatibilidade com Python
  syncLegacyLists(data);

  await saveData(data);
  return NextResponse.json({
    added: unique.length,
    skipped: entriesToAdd.length - unique.length,
    total: data.siglarioEntries.length,
  });
}

// PUT — Atualiza uma entrada existente
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const data = await getData();

  if (!body.id) {
    return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
  }

  const idx = (data.siglarioEntries || []).findIndex((e) => e.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Entrada não encontrada.' }, { status: 404 });
  }

  data.siglarioEntries[idx] = {
    ...data.siglarioEntries[idx],
    sigla: body.sigla?.trim() || data.siglarioEntries[idx].sigla,
    tipo: body.tipo || data.siglarioEntries[idx].tipo,
    significado: body.significado !== undefined ? body.significado.trim() : data.siglarioEntries[idx].significado,
  };

  syncLegacyLists(data);
  await saveData(data);
  return NextResponse.json({ entry: data.siglarioEntries[idx] });
}

// DELETE — Remove por ID ou IDs (bulk)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const ids = searchParams.get('ids'); // comma-separated

  const data = await getData();

  if (ids) {
    const idSet = new Set(ids.split(','));
    data.siglarioEntries = (data.siglarioEntries || []).filter(
      (e) => !idSet.has(e.id)
    );
  } else if (id) {
    data.siglarioEntries = (data.siglarioEntries || []).filter(
      (e) => e.id !== id
    );
  } else {
    return NextResponse.json({ error: 'Parâmetro "id" ou "ids" é obrigatório.' }, { status: 400 });
  }

  syncLegacyLists(data);
  await saveData(data);
  return NextResponse.json({ total: data.siglarioEntries.length });
}

// Helper: mantém siglarioAllowed/Forbidden sincronizados para o Python
function syncLegacyLists(data: any) {
  const entries: SiglarioEntry[] = data.siglarioEntries || [];
  data.siglarioAllowed = entries
    .filter((e) => e.tipo === 'allowed')
    .map((e) => e.sigla.toLowerCase());
  data.siglarioForbidden = entries
    .filter((e) => e.tipo === 'forbidden')
    .map((e) => e.sigla.toLowerCase());
}
