export const STATUS_MIGRACAO = [
  'BACKLOG',
  'PENDENTES',
  'DESENVOLVIMENTO',
  'HOMOLOGACAO',
  'CONFIGURACAO_PERFIL',
  'AGENDADO',
  'EM_PRODUCAO',
] as const;

export type StatusMigracao = typeof STATUS_MIGRACAO[number];

export const COMPLEXIDADE_MIGRACAO = [
  'BAIXA',
  'MEDIA',
  'ALTA',
] as const;

export type ComplexidadeMigracao = typeof COMPLEXIDADE_MIGRACAO[number];

export interface ChecklistItem {
  id: string;
  label: string;
  concluido: boolean;
}

export interface DocumentoFlexItem {
  id: string;
  cd_documento_mv: number;
  nome: string;
  tecnologia: 'FLEX' | 'HTML5';
  total_usos?: number;
  ultimo_uso?: string;
}

export interface DocumentoMigracao {
  id: string;
  documento_flex_id: string;
  documento_html5_id?: string | null;
  status: StatusMigracao;
  complexidade: ComplexidadeMigracao;
  responsavel?: string | null;
  responsavel_dev?: string | null;
  responsavel_perfil?: string | null;
  lecom?: string | null;
  codigo_objeto?: string | null;
  tipo_documento?: string | null;
  campos_relacionados?: string | null;
  regras_negocio?: string | null;
  observacoes?: string | null;
  checklist?: ChecklistItem[];
  data_inicio?: string | null;
  data_conclusao_prevista?: string | null;
  data_conclusao_efetiva?: string | null;
  created_at?: string;
  updated_at?: string;
  documento_flex?: DocumentoFlexItem | null;
  documento_html5?: DocumentoFlexItem | null;
}

export interface MigracaoKpisData {
  totalFlex: number;
  totalHtml5: number;
  totalMigrados: number;
  totalEmAndamento: number;
  totalHomologacao: number;
  totalPlanejados: number;
  totalNaoIniciados: number;
  percentualConcluido: number;
}
