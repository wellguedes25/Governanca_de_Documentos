import type { VersionLifecycle } from '@/lib/version-status';

export type DiffChangeStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffCounts {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  totalChanged: number;
}

export interface PropertyDelta {
  field: string;
  label: string;
  before: string | number | null;
  after: string | number | null;
}

export interface SqlDiffChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface VersionSummary {
  versionNumber: number;
  versionId: string;
  lifecycle: VersionLifecycle;
  label: string;
  badgeLabel: string;
  tpVersao: string | null;
  snPublicado: number;
  fieldsCount: number;
  rulesCount: number;
  layouts: string[];
}

export interface VersionFieldSnapshot {
  cdCampo: number;
  cdMetadado: number | null;
  dsIdentificador: string;
  dsCampo: string;
  dsTipoVisualizacao: string;
  snAtivo: number;
  cdTipoLayout: number;
  dsTipoLayout: string;
}

export interface VersionRuleSnapshot {
  cdRegra: number;
  numOrdem: number | null;
  dsRegra: string;
  ativa: number;
  tipoRegra: string;
  dsAlerta: string | null;
  condicao: string | null;
  camposAfetados: string | null;
  script: string | null;
  cdTipoLayout: number;
  dsTipoLayout: string;
}

export interface VersionSqlActionSnapshot {
  cdCampo: number;
  cdMetadado: number | null;
  dsIdentificador: string;
  nomeCampo: string;
  cdPropriedade: number;
  script: string;
  cdTipoLayout: number;
  dsTipoLayout: string;
  docsRelacionados: string[];
}

export interface BaseDiffItem<T> {
  key: string;
  status: DiffChangeStatus;
  layoutId: number;
  layoutName: string;
  identifier: string;
  base: T | null;
  target: T | null;
  changes: PropertyDelta[];
  scriptDiff?: SqlDiffChunk[];
}

export type FieldDiffItem = BaseDiffItem<VersionFieldSnapshot> & {
  isVisualElement: boolean;
};

export type RuleDiffItem = BaseDiffItem<VersionRuleSnapshot> & {
  displayTitle: string;
};

export type SqlActionDiffItem = BaseDiffItem<VersionSqlActionSnapshot>;

export interface VersionCompareResponse {
  docId: string;
  docName: string;
  docIdentifier: string;
  engine: 'V3';
  versions: VersionSummary[];
  baseVersion: VersionSummary | null;
  targetVersion: VersionSummary | null;
  summary: {
    fields: DiffCounts;
    clinicalFields: DiffCounts;
    visualElementsCount: number;
    visualElementsChanged: number;
    rules: DiffCounts;
    sqlActions: DiffCounts;
    totalChanges: number;
  };
  fields: FieldDiffItem[];
  rules: RuleDiffItem[];
  sqlActions: SqlActionDiffItem[];
  warnings: string[];
}
