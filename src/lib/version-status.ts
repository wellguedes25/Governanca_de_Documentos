export type VersionLifecycle = 'published' | 'test' | 'history' | 'inactive';

export interface VersionMetadataRow {
  CODIGO_DOCUMENTO?: string | number;
  DESCRICAO_DOCUMENTO?: string;
  IDENTIFICADOR_DOCUMENTO?: string;
  CODIGO_VERSAO_DOCUMENTO?: string | number;
  CODIGO_TIPO_LAYOUT?: number | null;
  IDENTIFICADOR_LAYOUT?: string | null;
  DESCRICAO_TIPO_LAYOUT?: string | null;
  VALOR_VERSAO?: number | string | null;
  STATUS_ATIVO?: number | string | null;
  SN_PUBLICADO?: number | string | null;
  TP_VERSAO?: string | null;
  CODIGO_TIPO_VERSAO?: number | string | null;
  DESCRICAO_TIPO_VERSAO?: string | null;
  CODIGO_LAYOUT_CABECALHO?: number | string | null;
  DOCUMENTO_CABECALHO?: number | string | null;
  CODIGO_LAYOUT_RODAPE?: number | string | null;
  QUANTIDADE_REGRAS?: number | null;
  QUANTIDADE_CAMPOS?: number | null;
}

export interface VersionLifecycleMeta {
  label: string;
  badgeLabel: string;
  badgeClass: string;
  cardClass: string;
}

export interface VersionLayoutSummary {
  layoutTypeId: number | null;
  layoutIdentifier: string | null;
  layoutName: string;
  fieldsCount: number;
  rulesCount: number;
}

export interface GroupedDocumentVersion {
  versionKey: string;
  versionId: string;
  versionNumber: number;
  lifecycle: VersionLifecycle;
  statusAtivo: number | string | null | undefined;
  snPublicado: number | string | null | undefined;
  tpVersao: string | null | undefined;
  codigoTipoVersao: number | string | null | undefined;
  descricaoTipoVersao: string | null | undefined;
  layouts: VersionLayoutSummary[];
  totalFields: number;
  totalRules: number;
  telaFields: number;
  relatorioFields: number;
  primaryRow: VersionMetadataRow;
}

const LIFECYCLE_PRIORITY: Record<VersionLifecycle, number> = {
  published: 4,
  test: 3,
  history: 2,
  inactive: 1,
};

export function resolveVersionLifecycle(row: VersionMetadataRow | null | undefined): VersionLifecycle {
  if (!row) return 'history';

  const snPublicado = row.SN_PUBLICADO;
  const tpVersao = String(row.TP_VERSAO ?? '').trim().toUpperCase();
  const codTipoVersao =
    row.CODIGO_TIPO_VERSAO !== null && row.CODIGO_TIPO_VERSAO !== undefined && row.CODIGO_TIPO_VERSAO !== ''
      ? Number(row.CODIGO_TIPO_VERSAO)
      : NaN;
  const descTipoVersao = String(row.DESCRICAO_TIPO_VERSAO ?? '').trim();

  // 1. Publicada (ativa em produção)
  if (
    snPublicado === 1 ||
    snPublicado === '1' ||
    String(snPublicado ?? '').trim().toUpperCase() === 'S' ||
    tpVersao === 'PUBLISHED' ||
    codTipoVersao === 3 ||
    /PUBLICAD/i.test(descTipoVersao)
  ) {
    return 'published';
  }

  // 2. Teste (V3) / Editável (V2)
  if (
    ['TEST', 'EDITABLE', 'EDITAVEL', 'DRAFT'].includes(tpVersao) ||
    codTipoVersao === 1 ||
    /TEST|EDIT[AÁ]VEL|RASCUNH|ELABORA/i.test(descTipoVersao)
  ) {
    return 'test';
  }

  // 3. Histórico
  if (
    tpVersao === 'HISTORY' ||
    codTipoVersao === 2 ||
    /HIST[OÓ]RIC/i.test(descTipoVersao)
  ) {
    return 'history';
  }

  // 4. Inativa explícita
  const statusAtivo = row.STATUS_ATIVO;
  if (
    statusAtivo === 0 ||
    statusAtivo === '0' ||
    String(statusAtivo ?? '').trim().toUpperCase() === 'N'
  ) {
    return 'inactive';
  }

  // Fallback seguro: nunca promover para publicada apenas por STATUS_ATIVO === 1 ou 'S'
  return 'history';
}

export function getVersionLifecycleMeta(
  lifecycle: VersionLifecycle,
  docEngine?: string
): VersionLifecycleMeta {
  const isV2 = String(docEngine ?? '').toUpperCase() === 'V2';

  switch (lifecycle) {
    case 'published':
      return {
        label: 'Publicada',
        badgeLabel: 'Publicada • Ativa',
        badgeClass: 'tone-success border',
        cardClass: 'tone-success border ring-1 ring-[var(--tone-success-border)]',
      };
    case 'test':
      return {
        label: isV2 ? 'Editável' : 'Em Teste',
        badgeLabel: isV2 ? 'Editável' : 'Em Teste',
        badgeClass: 'tone-warning border',
        cardClass: 'tone-warning border ring-1 ring-[var(--tone-warning-border)]',
      };
    case 'inactive':
      return {
        label: 'Inativa',
        badgeLabel: 'Inativa',
        badgeClass: 'tone-neutral border opacity-75',
        cardClass: 'bg-[var(--card-subtle)] border-[var(--border)] opacity-75',
      };
    case 'history':
    default:
      return {
        label: 'Histórico',
        badgeLabel: 'Histórico',
        badgeClass: 'tone-neutral border',
        cardClass: 'bg-[var(--card-subtle)] border-[var(--border)]',
      };
  }
}

export function groupMetadataByVersion(
  metadata: VersionMetadataRow[] | null | undefined
): GroupedDocumentVersion[] {
  if (!metadata || metadata.length === 0) return [];

  const groups = new Map<string, {
    group: GroupedDocumentVersion;
    layoutKeys: Set<string>;
  }>();

  for (const row of metadata) {
    const hasVersionId =
      row.CODIGO_VERSAO_DOCUMENTO !== null &&
      row.CODIGO_VERSAO_DOCUMENTO !== undefined &&
      String(row.CODIGO_VERSAO_DOCUMENTO).trim() !== '';

    const versionId = hasVersionId
      ? String(row.CODIGO_VERSAO_DOCUMENTO).trim()
      : '';
    const rawVersionNum = Number(row.VALOR_VERSAO);
    const versionNumber = Number.isFinite(rawVersionNum) ? rawVersionNum : 0;
    const versionKey = versionId || `ver_${row.VALOR_VERSAO ?? 'unknown'}`;

    const rowLifecycle = resolveVersionLifecycle(row);

    let entry = groups.get(versionKey);
    if (!entry) {
      entry = {
        group: {
          versionKey,
          versionId: versionId || String(row.VALOR_VERSAO ?? '—'),
          versionNumber,
          lifecycle: rowLifecycle,
          statusAtivo: row.STATUS_ATIVO,
          snPublicado: row.SN_PUBLICADO,
          tpVersao: row.TP_VERSAO,
          codigoTipoVersao: row.CODIGO_TIPO_VERSAO,
          descricaoTipoVersao: row.DESCRICAO_TIPO_VERSAO,
          layouts: [],
          totalFields: 0,
          totalRules: 0,
          telaFields: 0,
          relatorioFields: 0,
          primaryRow: row,
        },
        layoutKeys: new Set<string>(),
      };
      groups.set(versionKey, entry);
    } else if (LIFECYCLE_PRIORITY[rowLifecycle] > LIFECYCLE_PRIORITY[entry.group.lifecycle]) {
      entry.group.lifecycle = rowLifecycle;
      entry.group.primaryRow = row;
    }

    const layoutTypeId =
      row.CODIGO_TIPO_LAYOUT !== null && row.CODIGO_TIPO_LAYOUT !== undefined
        ? Number(row.CODIGO_TIPO_LAYOUT)
        : null;
    const layoutName = String(row.DESCRICAO_TIPO_LAYOUT ?? '').trim();
    const layoutIdentifier = row.IDENTIFICADOR_LAYOUT ? String(row.IDENTIFICADOR_LAYOUT).trim() : null;

    if (layoutTypeId !== null || layoutName) {
      const dedupKey = `${layoutTypeId ?? ''}_${layoutName.toUpperCase()}`;
      if (!entry.layoutKeys.has(dedupKey)) {
        entry.layoutKeys.add(dedupKey);
        const fieldsCount = Number(row.QUANTIDADE_CAMPOS ?? 0) || 0;
        const rulesCount = Number(row.QUANTIDADE_REGRAS ?? 0) || 0;
        const displayName = layoutName || (layoutTypeId === 1 ? 'Tela' : layoutTypeId === 2 ? 'Relatório' : 'Layout');

        entry.group.layouts.push({
          layoutTypeId,
          layoutIdentifier,
          layoutName: displayName,
          fieldsCount,
          rulesCount,
        });

        entry.group.totalFields += fieldsCount;
        entry.group.totalRules += rulesCount;
        if (layoutTypeId === 1 || /TELA/i.test(displayName)) {
          entry.group.telaFields += fieldsCount;
        } else if (layoutTypeId === 2 || /RELAT[OÓ]RIO/i.test(displayName)) {
          entry.group.relatorioFields += fieldsCount;
        }
      }
    }

    // Prefer Tela as primaryRow if same priority, for consistent specs fallback
    if (
      layoutTypeId === 1 &&
      LIFECYCLE_PRIORITY[rowLifecycle] >= LIFECYCLE_PRIORITY[entry.group.lifecycle]
    ) {
      entry.group.primaryRow = row;
    }
  }

  return Array.from(groups.values())
    .map(item => {
      item.group.layouts.sort((a, b) => (a.layoutTypeId ?? 99) - (b.layoutTypeId ?? 99));
      return item.group;
    })
    .sort((a, b) => {
      if (b.versionNumber !== a.versionNumber) {
        return b.versionNumber - a.versionNumber;
      }
      const idA = Number(a.versionId);
      const idB = Number(b.versionId);
      if (Number.isFinite(idA) && Number.isFinite(idB)) {
        return idB - idA;
      }
      return b.versionId.localeCompare(a.versionId);
    });
}
