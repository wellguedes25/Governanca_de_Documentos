"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Database,
  Save,
  Loader2,
  CircleX,
  CircleCheck,
  BarChart3,
  Clock,
  TrendingUp,
  Search,
  FileText,
  Settings2,
  Terminal,
  Printer,
  Check,
  Code2,
  Building2,
  SlidersHorizontal,
  GitBranch,
  Activity,
  ShieldCheck,
  CalendarRange,
  Settings,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useUI } from '@/context/UIContext';
import { DEFAULT_SQL_QUERIES } from '@/lib/default-queries';
import { cn } from '@/lib/utils';
import {
  SqlQueryEditorModal,
  type SqlQueryEditorTarget,
} from '@/components/configuracoes/SqlQueryEditorModal';
import { OracleConnectionsTab } from '@/components/configuracoes/OracleConnectionsTab';
import { UsersAccessTab } from '@/components/configuracoes/UsersAccessTab';
import { SimilarityDdlModal } from '@/components/similaridade/SimilarityDdlModal';
import { sanitizeAuditOwner } from '@/lib/similarity';

export type SettingsTab =
  | 'conexoes'
  | 'v3'
  | 'v2'
  | 'instituicoes'
  | 'parametros'
  | 'usuarios';

const VALID_TABS: readonly SettingsTab[] = [
  'conexoes',
  'v3',
  'v2',
  'instituicoes',
  'parametros',
  'usuarios',
];

type ModuleId = 'all' | 'catalogo' | 'kpis' | 'analiticos' | 'hospitais' | 'metadados';

interface QueryDef {
  id: string;
  title: string;
  defaultTitle?: string;
  description: string;
  module: Exclude<ModuleId, 'all'>;
  moduleLabel: string;
  engine: 'V3' | 'V2';
  saveType: string;
  defaultSql: string;
  enabledKey?: string;
  supportsTitleEdit?: boolean;
  requiredBinds?: string[];
  fixedWindowBadge?: string;
  aiContext: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const MODULE_LABELS: Record<ModuleId, string> = {
  all: 'Todos os Módulos',
  catalogo: 'Catálogo & Perfis',
  kpis: 'KPIs Dashboard',
  analiticos: 'Analíticos Dashboard',
  hospitais: 'Hospitais (Unidades)',
  metadados: 'Metadados & Regras',
};

const QUERY_DEFINITIONS: QueryDef[] = [
  // ===================== EDITOR 3.0 (V3) =====================
  {
    id: 'v3_active',
    title: 'Catálogo Mestre de Documentos',
    description: 'Lista todos os formulários do Editor 3.0 com pivot dinâmico de produção por unidade e período.',
    module: 'catalogo',
    moduleLabel: MODULE_LABELS.catalogo,
    engine: 'V3',
    saveType: 'SAVE_QUERY_V3',
    defaultSql: DEFAULT_SQL_QUERIES.activeQueryV3,
    aiContext: 'Consulta principal do catálogo de documentos Editor 3.0 (schema EDITOR) com pivot por unidade',
    icon: FileText,
  },
  {
    id: 'v3_profile',
    title: 'Reconciliação de Perfis Assistenciais',
    description: 'Identifica os perfis ambulatoriais vinculados a um documento clínico no Editor 3.0.',
    module: 'catalogo',
    moduleLabel: MODULE_LABELS.catalogo,
    engine: 'V3',
    saveType: 'SAVE_PROFILE_QUERY_V3',
    defaultSql: DEFAULT_SQL_QUERIES.profileQueryV3,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Busca de perfis de atendimento vinculados a um documento no Editor 3.0 usando :CD_DOCUMENTO',
    icon: Search,
  },
  {
    id: 'v3_kpi_total',
    title: 'Volume Geral no Período',
    defaultTitle: 'Volume Geral no Período',
    description: 'Contagem global de prontuários fechados/assinados na janela de período selecionada.',
    module: 'kpis',
    moduleLabel: MODULE_LABELS.kpis,
    engine: 'V3',
    saveType: 'SAVE_KPI_TOTAL_V3',
    defaultSql: DEFAULT_SQL_QUERIES.kpiQueriesV3.total,
    enabledKey: 'total',
    supportsTitleEdit: true,
    aiContext: 'KPI de volume total de documentos clínicos preenchidos no Editor 3.0',
    icon: BarChart3,
  },
  {
    id: 'v3_kpi_24h',
    title: 'Produção Recente (24h)',
    defaultTitle: 'Produção Recente (24h)',
    description: 'Volume de registros criados nas últimas 24 horas nas unidades ativas.',
    module: 'kpis',
    moduleLabel: MODULE_LABELS.kpis,
    engine: 'V3',
    saveType: 'SAVE_KPI_24H_V3',
    defaultSql: DEFAULT_SQL_QUERIES.kpiQueriesV3.prod24h,
    enabledKey: 'prod24h',
    supportsTitleEdit: true,
    fixedWindowBadge: 'Fixo 24h',
    aiContext: 'KPI de produção recente nas últimas 24 horas no Editor 3.0',
    icon: Clock,
  },
  {
    id: 'v3_kpi_assinados',
    title: 'Taxa de Assinatura Digital',
    defaultTitle: 'Taxa de Assinatura',
    description: 'Compara documentos assinados e fechados no período selecionado para calcular a adesão à assinatura.',
    module: 'kpis',
    moduleLabel: MODULE_LABELS.kpis,
    engine: 'V3',
    saveType: 'SAVE_KPI_ASSINADOS_V3',
    defaultSql: DEFAULT_SQL_QUERIES.kpiQueriesV3.assinados,
    enabledKey: 'assinados',
    supportsTitleEdit: true,
    aiContext: 'KPI de taxa de documentos assinados versus fechados no Editor 3.0',
    icon: ShieldCheck,
  },
  {
    id: 'v3_ana_top10',
    title: 'Curva ABC · Top 10 Documentos',
    defaultTitle: 'Ranking Top 10',
    description: 'Os 10 documentos com maior volume de preenchimento dentro do período selecionado.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_TOP10_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.top10,
    enabledKey: 'top10',
    supportsTitleEdit: true,
    aiContext: 'Ranking dos 10 documentos mais utilizados (Curva ABC) no Editor 3.0',
    icon: TrendingUp,
  },
  {
    id: 'v3_ana_idle',
    title: 'Templates Ociosos (Saneamento)',
    defaultTitle: 'Documentos Ociosos',
    description: 'Lista templates ativos do Editor 3.0 sem nenhum registro no período selecionado.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_IDLE_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.idle,
    enabledKey: 'idle',
    supportsTitleEdit: true,
    aiContext: 'Listagem de documentos sem preenchimento no período no Editor 3.0',
    icon: CircleX,
  },
  {
    id: 'v3_ana_volume3m',
    title: 'Volume Consolidado do Período',
    defaultTitle: 'Volume no Período',
    description: 'Totalizador analítico da série consolidada usado nos indicadores de volume do Dashboard.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_VOLUME3M_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.volume3m,
    enabledKey: 'volume3m',
    supportsTitleEdit: true,
    aiContext: 'Volume consolidado de documentos no período selecionado (Editor 3.0)',
    icon: Activity,
  },
  {
    id: 'v3_ana_unit_adherence',
    title: 'Adesão por Unidade Hospitalar',
    defaultTitle: 'Adesão por Unidade',
    description: 'Distribuição do volume de documentos preenchidos agrupada por empresa MV.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_UNIT_ADHERENCE_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.unitAdherence,
    enabledKey: 'unitAdherence',
    supportsTitleEdit: true,
    aiContext: 'Totalização de documentos preenchidos por unidade hospitalar no Editor 3.0',
    icon: Building2,
  },
  {
    id: 'v3_ana_unit_inactivity',
    title: 'Inatividade por Unidade',
    defaultTitle: 'Inatividade por Unidade',
    description: 'Último uso e dias sem preenchimento por documento e hospital.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_UNIT_INACTIVITY_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.unitInactivity,
    enabledKey: 'unitInactivity',
    supportsTitleEdit: true,
    aiContext: 'Dias sem uso por documento e empresa no Editor 3.0',
    icon: Clock,
  },
  {
    id: 'v3_ana_turno',
    title: 'Dinâmica de Turnos (Dia / Noite)',
    description: 'Distribuição assistencial entre plantão diurno (07h-18h) e noturno nos últimos 7 dias.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_VOLUME_TURNO_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.volumeTurno,
    fixedWindowBadge: 'Fixo 7d',
    aiContext: 'Distribuição de preenchimentos por turno dia e noite nos últimos 7 dias',
    icon: Activity,
  },
  {
    id: 'v3_ana_sla',
    title: 'SLA de Assinatura (Tempo de Fechamento)',
    description: 'Faixas de tempo entre criação e fechamento dos documentos assinados nos últimos 30 dias.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V3',
    saveType: 'SAVE_KPI_SLA_ASSINATURA_V3',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueriesV3.slaAssinatura,
    requiredBinds: [':ID'],
    fixedWindowBadge: 'Fixo 30d',
    aiContext: 'Faixas de SLA de assinatura por empresa nos últimos 30 dias usando :ID',
    icon: ShieldCheck,
  },
  {
    id: 'v3_hosp_kpis',
    title: 'KPIs Operacionais da Unidade',
    description: 'Total de preenchimentos, documentos únicos ativos e última ocorrência da empresa selecionada.',
    module: 'hospitais',
    moduleLabel: MODULE_LABELS.hospitais,
    engine: 'V3',
    saveType: 'SAVE_HOSPITAL_KPIS_V3',
    defaultSql: DEFAULT_SQL_QUERIES.hospitalQueriesV3.kpis,
    requiredBinds: [':ID'],
    aiContext: 'KPIs operacionais de uma unidade hospitalar usando :ID no Editor 3.0',
    icon: Building2,
  },
  {
    id: 'v3_hosp_detail',
    title: 'Detalhamento Recente por Unidade',
    description: 'Documentos mais recentes da unidade com versão publicada e volume no período.',
    module: 'hospitais',
    moduleLabel: MODULE_LABELS.hospitais,
    engine: 'V3',
    saveType: 'SAVE_HOSPITAL_DETAIL_V3',
    defaultSql: DEFAULT_SQL_QUERIES.hospitalQueriesV3.detailTable,
    requiredBinds: [':ID'],
    aiContext: 'Tabela detalhada de documentos recentes por empresa usando :ID no Editor 3.0',
    icon: FileText,
  },
  {
    id: 'v3_hosp_top5',
    title: 'Top 5 Documentos da Unidade',
    description: 'Ranking dos 5 formulários mais utilizados na unidade hospitalar selecionada.',
    module: 'hospitais',
    moduleLabel: MODULE_LABELS.hospitais,
    engine: 'V3',
    saveType: 'SAVE_HOSPITAL_TOP5_V3',
    defaultSql: DEFAULT_SQL_QUERIES.hospitalQueriesV3.top5,
    requiredBinds: [':ID'],
    aiContext: 'Ranking Top 5 de documentos por empresa usando :ID no Editor 3.0',
    icon: TrendingUp,
  },
  {
    id: 'v3_doc_metadata',
    title: 'Metadados, Versões & Cabeçalho/Rodapé',
    description: 'Alimenta o modal de detalhes com versões, layouts, contagem de regras e campos no schema EDITOR.',
    module: 'metadados',
    moduleLabel: MODULE_LABELS.metadados,
    engine: 'V3',
    saveType: 'SAVE_DOC_METADATA_QUERY_V3',
    defaultSql: DEFAULT_SQL_QUERIES.docMetadataQueryV3,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Consulta de metadados técnicos, regras e campos do Editor 3.0 usando :CD_DOCUMENTO',
    icon: Settings2,
  },
  {
    id: 'v3_doc_actions',
    title: 'Vínculos SQL & Ações entre Documentos',
    description: 'Extrai chamadas dinâmicas SQL na propriedade de ação (cd_propriedade = 4) para linhagem.',
    module: 'metadados',
    moduleLabel: MODULE_LABELS.metadados,
    engine: 'V3',
    saveType: 'SAVE_DOC_ACTIONS_QUERY_V3',
    defaultSql: DEFAULT_SQL_QUERIES.docActionsQueryV3,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Consulta de ações e vínculos SQL entre documentos no Editor 3.0 usando :CD_DOCUMENTO',
    icon: Terminal,
  },
  {
    id: 'v3_doc_rules',
    title: 'Regras de Negócio & Alertas Clínicos',
    description: 'Extrai condições, operadores, campos afetados e scripts SQL vinculados às regras do documento.',
    module: 'metadados',
    moduleLabel: MODULE_LABELS.metadados,
    engine: 'V3',
    saveType: 'SAVE_DOC_RULES_QUERY_V3',
    defaultSql: DEFAULT_SQL_QUERIES.docRulesQueryV3,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Consulta de regras, condições e campos afetados no Editor 3.0 usando :CD_DOCUMENTO',
    icon: GitBranch,
  },

  // ===================== EDITOR 2.0 (V2) =====================
  {
    id: 'v2_active',
    title: 'Catálogo Mestre de Documentos (Flex)',
    description: 'Lista todos os formulários do Editor 2.0 (DBAMV) com pivot de uso por empresa e período.',
    module: 'catalogo',
    moduleLabel: MODULE_LABELS.catalogo,
    engine: 'V2',
    saveType: 'SAVE_QUERY',
    defaultSql: DEFAULT_SQL_QUERIES.activeQuery,
    aiContext: 'Consulta principal do catálogo de documentos Editor 2.0 (DBAMV) com pivot por unidade',
    icon: FileText,
  },
  {
    id: 'v2_profile',
    title: 'Reconciliação de Perfis Assistenciais (Flex)',
    description: 'Identifica os perfis ambulatoriais vinculados a um documento clínico no Editor 2.0.',
    module: 'catalogo',
    moduleLabel: MODULE_LABELS.catalogo,
    engine: 'V2',
    saveType: 'SAVE_PROFILE_QUERY',
    defaultSql: DEFAULT_SQL_QUERIES.profileQuery,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Busca de perfis de atendimento vinculados a um documento no Editor 2.0 Flex usando :CD_DOCUMENTO',
    icon: Search,
  },
  {
    id: 'v2_kpi_total',
    title: 'Volume Geral no Período (Flex)',
    defaultTitle: 'Volume Geral no Período',
    description: 'Contagem global de documentos fechados/assinados na janela selecionada no DBAMV.',
    module: 'kpis',
    moduleLabel: MODULE_LABELS.kpis,
    engine: 'V2',
    saveType: 'SAVE_KPI_TOTAL',
    defaultSql: DEFAULT_SQL_QUERIES.kpiQueries.total,
    enabledKey: 'total',
    supportsTitleEdit: true,
    aiContext: 'KPI de volume total de documentos clínicos preenchidos no Editor 2.0 Flex',
    icon: BarChart3,
  },
  {
    id: 'v2_kpi_24h',
    title: 'Produção Recente (24h · Flex)',
    defaultTitle: 'Produção Recente (24h)',
    description: 'Volume de registros criados nas últimas 24 horas no Editor 2.0.',
    module: 'kpis',
    moduleLabel: MODULE_LABELS.kpis,
    engine: 'V2',
    saveType: 'SAVE_KPI_24H',
    defaultSql: DEFAULT_SQL_QUERIES.kpiQueries.prod24h,
    enabledKey: 'prod24h',
    supportsTitleEdit: true,
    fixedWindowBadge: 'Fixo 24h',
    aiContext: 'KPI de produção nas últimas 24 horas no Editor 2.0 Flex',
    icon: Clock,
  },
  {
    id: 'v2_kpi_assinados',
    title: 'Taxa de Assinatura Digital (Flex)',
    defaultTitle: 'Taxa de Assinatura',
    description: 'Compara documentos assinados e fechados no período selecionado (Editor 2.0).',
    module: 'kpis',
    moduleLabel: MODULE_LABELS.kpis,
    engine: 'V2',
    saveType: 'SAVE_KPI_ASSINADOS',
    defaultSql: DEFAULT_SQL_QUERIES.kpiQueries.assinados,
    enabledKey: 'assinados',
    supportsTitleEdit: true,
    aiContext: 'KPI de taxa de assinatura digital no Editor 2.0 Flex',
    icon: ShieldCheck,
  },
  {
    id: 'v2_ana_top10',
    title: 'Curva ABC · Top 10 Documentos (Flex)',
    defaultTitle: 'Ranking Top 10',
    description: 'Os 10 documentos do Editor 2.0 mais preenchidos no período selecionado.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_TOP10',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.top10,
    enabledKey: 'top10',
    supportsTitleEdit: true,
    aiContext: 'Ranking dos 10 documentos mais utilizados (Curva ABC) no Editor 2.0 Flex',
    icon: TrendingUp,
  },
  {
    id: 'v2_ana_idle',
    title: 'Templates Ociosos (Flex)',
    defaultTitle: 'Documentos Ociosos',
    description: 'Lista templates do Editor 2.0 sem preenchimento no período selecionado.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_IDLE',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.idle,
    enabledKey: 'idle',
    supportsTitleEdit: true,
    aiContext: 'Listagem de documentos ociosos no período (Editor 2.0 Flex)',
    icon: CircleX,
  },
  {
    id: 'v2_ana_volume3m',
    title: 'Volume Consolidado do Período (Flex)',
    defaultTitle: 'Volume no Período',
    description: 'Totalizador analítico do período selecionado no Editor 2.0.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_VOLUME3M',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.volume3m,
    enabledKey: 'volume3m',
    supportsTitleEdit: true,
    aiContext: 'Volume consolidado no período selecionado (Editor 2.0 Flex)',
    icon: Activity,
  },
  {
    id: 'v2_ana_unit_adherence',
    title: 'Adesão por Unidade Hospitalar (Flex)',
    defaultTitle: 'Adesão por Unidade',
    description: 'Volume preenchido por empresa MV no período selecionado (Editor 2.0).',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_UNIT_ADHERENCE',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.unitAdherence,
    enabledKey: 'unitAdherence',
    supportsTitleEdit: true,
    aiContext: 'Adesão por unidade hospitalar no Editor 2.0 Flex',
    icon: Building2,
  },
  {
    id: 'v2_ana_unit_inactivity',
    title: 'Inatividade por Unidade (Flex)',
    defaultTitle: 'Inatividade por Unidade',
    description: 'Último uso e dias sem preenchimento por documento e hospital (Editor 2.0).',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_UNIT_INACTIVITY',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.unitInactivity,
    enabledKey: 'unitInactivity',
    supportsTitleEdit: true,
    aiContext: 'Dias sem uso por documento e empresa no Editor 2.0 Flex',
    icon: Clock,
  },
  {
    id: 'v2_ana_turno',
    title: 'Dinâmica de Turnos (Dia / Noite)',
    description: 'Distribuição dia vs. noite nos últimos 7 dias no DBAMV.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_VOLUME_TURNO',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.volumeTurno,
    fixedWindowBadge: 'Fixo 7d',
    aiContext: 'Distribuição por turno dia e noite nos últimos 7 dias',
    icon: Activity,
  },
  {
    id: 'v2_ana_sla',
    title: 'SLA de Assinatura (Tempo de Fechamento)',
    description: 'Faixas de tempo até fechamento nos últimos 30 dias.',
    module: 'analiticos',
    moduleLabel: MODULE_LABELS.analiticos,
    engine: 'V2',
    saveType: 'SAVE_KPI_SLA_ASSINATURA',
    defaultSql: DEFAULT_SQL_QUERIES.analyticQueries.slaAssinatura,
    requiredBinds: [':ID'],
    fixedWindowBadge: 'Fixo 30d',
    aiContext: 'Faixas de SLA de assinatura nos últimos 30 dias usando :ID',
    icon: ShieldCheck,
  },
  {
    id: 'v2_hosp_kpis',
    title: 'KPIs Operacionais da Unidade (Flex)',
    description: 'Total, documentos ativos e último registro para a empresa selecionada.',
    module: 'hospitais',
    moduleLabel: MODULE_LABELS.hospitais,
    engine: 'V2',
    saveType: 'SAVE_HOSPITAL_KPIS',
    defaultSql: DEFAULT_SQL_QUERIES.hospitalQueries.kpis,
    requiredBinds: [':ID'],
    aiContext: 'KPIs da unidade hospitalar usando :ID no Editor 2.0 Flex',
    icon: Building2,
  },
  {
    id: 'v2_hosp_detail',
    title: 'Detalhamento Recente por Unidade (Flex)',
    description: 'Documentos mais recentes da empresa com versão ativa no DBAMV.',
    module: 'hospitais',
    moduleLabel: MODULE_LABELS.hospitais,
    engine: 'V2',
    saveType: 'SAVE_HOSPITAL_DETAIL',
    defaultSql: DEFAULT_SQL_QUERIES.hospitalQueries.detailTable,
    requiredBinds: [':ID'],
    aiContext: 'Tabela detalhada da unidade usando :ID no Editor 2.0 Flex',
    icon: FileText,
  },
  {
    id: 'v2_hosp_top5',
    title: 'Top 5 Documentos da Unidade (Flex)',
    description: 'Ranking dos 5 formulários mais usados na empresa selecionada.',
    module: 'hospitais',
    moduleLabel: MODULE_LABELS.hospitais,
    engine: 'V2',
    saveType: 'SAVE_HOSPITAL_TOP5',
    defaultSql: DEFAULT_SQL_QUERIES.hospitalQueries.top5,
    requiredBinds: [':ID'],
    aiContext: 'Ranking Top 5 da unidade usando :ID no Editor 2.0 Flex',
    icon: TrendingUp,
  },
  {
    id: 'v2_doc_metadata',
    title: 'Metadados, Versões & Cabeçalho/Rodapé (Flex)',
    description: 'Alimenta o modal de detalhes com versões, layouts, regras e campos no DBAMV.',
    module: 'metadados',
    moduleLabel: MODULE_LABELS.metadados,
    engine: 'V2',
    saveType: 'SAVE_DOC_METADATA_QUERY',
    defaultSql: DEFAULT_SQL_QUERIES.docMetadataQuery,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Metadados técnicos no Editor 2.0 Flex usando :CD_DOCUMENTO',
    icon: Settings2,
  },
  {
    id: 'v2_doc_actions',
    title: 'Vínculos SQL & Ações entre Documentos (Flex)',
    description: 'Mapeamento de chamadas dinâmicas na propriedade de ação (cd_propriedade = 4).',
    module: 'metadados',
    moduleLabel: MODULE_LABELS.metadados,
    engine: 'V2',
    saveType: 'SAVE_DOC_ACTIONS_QUERY',
    defaultSql: DEFAULT_SQL_QUERIES.docActionsQuery,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Ações e vínculos SQL no Editor 2.0 Flex usando :CD_DOCUMENTO',
    icon: Terminal,
  },
  {
    id: 'v2_doc_rules',
    title: 'Regras de Negócio & Alertas Clínicos (Flex)',
    description: 'Extrai condições, operações, campos afetados e scripts SQL no schema DBAMV.',
    module: 'metadados',
    moduleLabel: MODULE_LABELS.metadados,
    engine: 'V2',
    saveType: 'SAVE_DOC_RULES_QUERY',
    defaultSql: DEFAULT_SQL_QUERIES.docRulesQuery,
    requiredBinds: [':CD_DOCUMENTO'],
    aiContext: 'Regras e condições no Editor 2.0 Flex usando :CD_DOCUMENTO',
    icon: GitBranch,
  },
];

interface HospitalMappingItem {
  id: number;
  nome: string;
  sigla: string;
  ativo: boolean;
}

interface DbHospitalRow {
  CD_MULTI_EMPRESA: number;
  NM_FANTASIA: string;
  DS_RAZAO_SOCIAL?: string;
}

interface StorageApiResponse {
  activeQuery?: string;
  activeQueryV3?: string;
  profileQuery?: string;
  profileQueryV3?: string;
  kpiQueries?: { total?: string; prod24h?: string; assinados?: string };
  kpiQueriesV3?: { total?: string; prod24h?: string; assinados?: string };
  analyticQueries?: {
    top10?: string;
    idle?: string;
    volume3m?: string;
    unitAdherence?: string;
    unitInactivity?: string;
    volumeTurno?: string;
    slaAssinatura?: string;
  };
  analyticQueriesV3?: {
    top10?: string;
    idle?: string;
    volume3m?: string;
    unitAdherence?: string;
    unitInactivity?: string;
    volumeTurno?: string;
    slaAssinatura?: string;
  };
  hospitalQueries?: { kpis?: string; detailTable?: string; top5?: string };
  hospitalQueriesV3?: { kpis?: string; detailTable?: string; top5?: string };
  docMetadataQuery?: string;
  docMetadataQueryV3?: string;
  docActionsQuery?: string;
  docActionsQueryV3?: string;
  docRulesQuery?: string;
  docRulesQueryV3?: string;
  enabledQueries?: Record<string, boolean>;
  cardSettings?: Record<string, { title?: string }>;
  reportBaseUrl?: string;
  auditDays?: number;
  auditDocId?: string | number;
  auditSchemaOwner?: string;
  hospitalsMapping?: HospitalMappingItem[];
  connections?: Array<{ id: string; name: string }>;
  activeConnectionId?: string | null;
}

function extractSqlValuesFromStorage(storage: StorageApiResponse): Record<string, string> {
  return {
    v3_active: storage.activeQueryV3 || '',
    v3_profile: storage.profileQueryV3 || '',
    v3_kpi_total: storage.kpiQueriesV3?.total || '',
    v3_kpi_24h: storage.kpiQueriesV3?.prod24h || '',
    v3_kpi_assinados: storage.kpiQueriesV3?.assinados || '',
    v3_ana_top10: storage.analyticQueriesV3?.top10 || '',
    v3_ana_idle: storage.analyticQueriesV3?.idle || '',
    v3_ana_volume3m: storage.analyticQueriesV3?.volume3m || '',
    v3_ana_unit_adherence: storage.analyticQueriesV3?.unitAdherence || '',
    v3_ana_unit_inactivity: storage.analyticQueriesV3?.unitInactivity || '',
    v3_ana_turno: storage.analyticQueriesV3?.volumeTurno || '',
    v3_ana_sla: storage.analyticQueriesV3?.slaAssinatura || '',
    v3_hosp_kpis: storage.hospitalQueriesV3?.kpis || '',
    v3_hosp_detail: storage.hospitalQueriesV3?.detailTable || '',
    v3_hosp_top5: storage.hospitalQueriesV3?.top5 || '',
    v3_doc_metadata: storage.docMetadataQueryV3 || '',
    v3_doc_actions: storage.docActionsQueryV3 || '',
    v3_doc_rules: storage.docRulesQueryV3 || '',

    v2_active: storage.activeQuery || '',
    v2_profile: storage.profileQuery || '',
    v2_kpi_total: storage.kpiQueries?.total || '',
    v2_kpi_24h: storage.kpiQueries?.prod24h || '',
    v2_kpi_assinados: storage.kpiQueries?.assinados || '',
    v2_ana_top10: storage.analyticQueries?.top10 || '',
    v2_ana_idle: storage.analyticQueries?.idle || '',
    v2_ana_volume3m: storage.analyticQueries?.volume3m || '',
    v2_ana_unit_adherence: storage.analyticQueries?.unitAdherence || '',
    v2_ana_unit_inactivity: storage.analyticQueries?.unitInactivity || '',
    v2_ana_turno: storage.analyticQueries?.volumeTurno || '',
    v2_ana_sla: storage.analyticQueries?.slaAssinatura || '',
    v2_hosp_kpis: storage.hospitalQueries?.kpis || '',
    v2_hosp_detail: storage.hospitalQueries?.detailTable || '',
    v2_hosp_top5: storage.hospitalQueries?.top5 || '',
    v2_doc_metadata: storage.docMetadataQuery || '',
    v2_doc_actions: storage.docActionsQuery || '',
    v2_doc_rules: storage.docRulesQuery || '',
  };
}

export function ConfiguracoesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCache, setActiveConnInfo, activeConnInfo } = useUI();

  const rawTab = searchParams.get('tab');
  const activeTab: SettingsTab = (VALID_TABS as readonly string[]).includes(rawTab || '')
    ? (rawTab as SettingsTab)
    : 'conexoes';

  const setActiveTab = (tab: SettingsTab) => {
    router.replace(`/configuracoes?tab=${tab}`, { scroll: false });
  };

  const [selectedModule, setSelectedModule] = useState<ModuleId>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [sqlByKey, setSqlByKey] = useState<Record<string, string>>({});
  const [enabledQueries, setEnabledQueries] = useState<Record<string, boolean>>({});
  const [cardSettings, setCardSettings] = useState<Record<string, { title?: string }>>({});

  // Parâmetros & Report Web
  const [reportBaseUrl, setReportBaseUrl] = useState('');
  const [auditDays, setAuditDays] = useState(15);
  const [auditDocId, setAuditDocId] = useState<string>('0');
  const [auditSchemaOwner, setAuditSchemaOwner] = useState('DBAMV');
  const [ddlModalOpen, setDdlModalOpen] = useState(false);

  // Hospitais / Empresas
  const [hospitalsMapping, setHospitalsMapping] = useState<HospitalMappingItem[]>([]);
  const [dbHospitals, setDbHospitals] = useState<DbHospitalRow[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalsError, setHospitalsError] = useState<string | null>(null);

  // Modal & Estado Global
  const [editingDef, setEditingDef] = useState<QueryDef | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [paramsSaving, setParamsSaving] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeConnName, setActiveConnName] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadConfigData = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      const storage: StorageApiResponse = await res.json();
      setSqlByKey(extractSqlValuesFromStorage(storage));
      setEnabledQueries(storage.enabledQueries || {});
      setCardSettings(storage.cardSettings || {});
      setReportBaseUrl(
        storage.reportBaseUrl || 'http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId='
      );
      setAuditDays(storage.auditDays || 15);
      setAuditDocId(storage.auditDocId !== undefined ? String(storage.auditDocId) : '0');
      setAuditSchemaOwner(sanitizeAuditOwner(storage.auditSchemaOwner));
      setHospitalsMapping(storage.hospitalsMapping || []);

      const conn = storage.connections?.find((c) => c.id === storage.activeConnectionId);
      if (conn) {
        setActiveConnName(conn.name);
        setLoadingHospitals(true);
        setHospitalsError(null);
        fetch('/api/empresas')
          .then((r) => r.json())
          .then((data) => {
            if (data.rows) {
              setDbHospitals(data.rows);
            } else if (data.error) {
              setHospitalsError(data.error);
            }
          })
          .catch((err) => {
            setHospitalsError(err.message || 'Erro ao buscar empresas no banco ativo.');
          })
          .finally(() => {
            setLoadingHospitals(false);
          });
      } else {
        setActiveConnName('');
        setDbHospitals([]);
      }
    } catch {
      notify('Erro ao carregar configurações.', 'error');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigData();
  }, [loadConfigData]);

  const invalidateClientCaches = () => {
    clearCache();
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage).forEach((k) => {
        if (
          k.startsWith('oracle_documentos_data_') ||
          k.startsWith('dashboard_') ||
          k.startsWith('hospital_data_')
        ) {
          sessionStorage.removeItem(k);
        }
      });
    }
  };

  const handleToggleQuery = async (enabledKey: string) => {
    const nextState = {
      ...enabledQueries,
      [enabledKey]: enabledQueries[enabledKey] === false,
    };
    setEnabledQueries(nextState);

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SAVE_SETTINGS',
          enabledQueries: nextState,
          cardSettings,
        }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar toggle');
      invalidateClientCaches();
      notify('Visibilidade da consulta atualizada.');
    } catch {
      notify('Erro ao salvar visibilidade.', 'error');
    }
  };

  const handleSaveModalQuery = async (payload: { sql: string; customTitle?: string }) => {
    if (!editingDef) return;
    setModalSaving(true);

    let nextCardSettings = cardSettings;
    if (editingDef.supportsTitleEdit && editingDef.enabledKey && payload.customTitle !== undefined) {
      nextCardSettings = {
        ...cardSettings,
        [editingDef.enabledKey]: {
          ...(cardSettings[editingDef.enabledKey] || {}),
          title: payload.customTitle,
        },
      };
    }

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingDef.saveType,
          query: payload.sql,
          enabledQueries,
          cardSettings: nextCardSettings,
        }),
      });
      if (!res.ok) throw new Error('Falha no salvamento');

      setSqlByKey((prev) => ({ ...prev, [editingDef.id]: payload.sql }));
      setCardSettings(nextCardSettings);
      invalidateClientCaches();
      setEditingDef(null);
      notify(`Consulta "${editingDef.title}" salva e cache atualizado.`);
    } catch {
      notify('Erro ao salvar consulta SQL.', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const saveHospitalsMapping = async (newMapping: HospitalMappingItem[]) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SAVE_HOSPITALS_MAPPING',
          hospitalsMapping: newMapping,
        }),
      });
      if (!res.ok) throw new Error('Falha no salvamento');

      invalidateClientCaches();
      const activeHospList = newMapping.filter((h) => h.ativo);
      if (activeConnInfo) {
        setActiveConnInfo({
          ...activeConnInfo,
          activeHospitals: activeHospList,
        });
      }
      notify('Mapeamento de instituições salvo!');
    } catch {
      notify('Erro ao salvar mapeamento.', 'error');
    }
  };

  const toggleHospitalActive = (hospital: DbHospitalRow) => {
    const existing = hospitalsMapping.find((h) => h.id === hospital.CD_MULTI_EMPRESA);
    const next = existing
      ? hospitalsMapping.map((h) =>
          h.id === hospital.CD_MULTI_EMPRESA ? { ...h, ativo: !h.ativo } : h
        )
      : [
          ...hospitalsMapping,
          { id: hospital.CD_MULTI_EMPRESA, nome: hospital.NM_FANTASIA, sigla: '', ativo: true },
        ];
    setHospitalsMapping(next);
    saveHospitalsMapping(next);
  };

  const updateHospitalSiglaLocal = (hospitalId: number, nome: string, sigla: string) => {
    const existing = hospitalsMapping.find((h) => h.id === hospitalId);
    const next = existing
      ? hospitalsMapping.map((h) => (h.id === hospitalId ? { ...h, sigla } : h))
      : [...hospitalsMapping, { id: hospitalId, nome, sigla, ativo: false }];
    setHospitalsMapping(next);
  };

  const saveParams = async (type: 'SAVE_REPORT_URL' | 'SAVE_AUDIT_PARAMS') => {
    setParamsSaving(type);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          url: type === 'SAVE_REPORT_URL' ? reportBaseUrl : undefined,
          auditDays: type === 'SAVE_AUDIT_PARAMS' ? auditDays : undefined,
          auditDocId: type === 'SAVE_AUDIT_PARAMS' ? auditDocId : undefined,
          auditSchemaOwner:
            type === 'SAVE_AUDIT_PARAMS' ? sanitizeAuditOwner(auditSchemaOwner) : undefined,
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar parâmetros');
      if (type === 'SAVE_AUDIT_PARAMS') {
        setAuditSchemaOwner((prev) => sanitizeAuditOwner(prev));
      }
      notify('Parâmetro salvo com sucesso!');
    } catch {
      notify('Erro ao salvar parâmetro.', 'error');
    } finally {
      setParamsSaving(null);
    }
  };

  const engineFilter: 'V3' | 'V2' | null =
    activeTab === 'v3' ? 'V3' : activeTab === 'v2' ? 'V2' : null;

  const engineQueries = useMemo(() => {
    if (!engineFilter) return [];
    return QUERY_DEFINITIONS.filter((q) => q.engine === engineFilter);
  }, [engineFilter]);

  const filteredQueries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return engineQueries.filter((q) => {
      if (selectedModule !== 'all' && q.module !== selectedModule) return false;
      if (!term) return true;
      const sql = (sqlByKey[q.id] || q.defaultSql || '').toLowerCase();
      return (
        q.title.toLowerCase().includes(term) ||
        q.description.toLowerCase().includes(term) ||
        q.moduleLabel.toLowerCase().includes(term) ||
        sql.includes(term)
      );
    });
  }, [engineQueries, selectedModule, searchTerm, sqlByKey]);

  const groupedSections = useMemo(() => {
    const order: Exclude<ModuleId, 'all'>[] = [
      'catalogo',
      'kpis',
      'analiticos',
      'hospitais',
      'metadados',
    ];
    return order
      .map((mod) => ({
        module: mod,
        label: MODULE_LABELS[mod],
        items: filteredQueries.filter((q) => q.module === mod),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [filteredQueries]);

  const editorModalTarget: SqlQueryEditorTarget | null = editingDef
    ? {
        id: editingDef.id,
        title: editingDef.title,
        defaultTitle: editingDef.defaultTitle,
        description: editingDef.description,
        moduleLabel: editingDef.moduleLabel,
        engine: editingDef.engine,
        sql: sqlByKey[editingDef.id] ?? editingDef.defaultSql,
        defaultSql: editingDef.defaultSql,
        requiredBinds: editingDef.requiredBinds,
        supportsTitleEdit: editingDef.supportsTitleEdit,
        customTitle:
          editingDef.enabledKey ? cardSettings[editingDef.enabledKey]?.title || '' : '',
        aiContext: editingDef.aiContext,
      }
    : null;

  const activeHospitalsCount = hospitalsMapping.filter((h) => h.ativo).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Unificado */}
      <div className="pb-3 border-b border-[var(--border-subtle)]">
        <PageHeader
          kicker="ADMINISTRAÇÃO • INFRAESTRUTURA & GOVERNANÇA"
          title="Central de Configurações"
          subtitle="Gerencie conexões Oracle, motores SQL (V3/V2), instituições MV, parâmetros do portal e acesso de usuários."
          icon={Settings}
          badge={
            activeConnName ? (
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)]"
              >
                Ativo: {activeConnName}
              </Badge>
            ) : undefined
          }
        />
      </div>

      {/* Toast Global para SQL / Instituições / Parâmetros */}
      {toast && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-1',
            toast.type === 'error' ? 'tone-danger' : 'tone-success'
          )}
        >
          {toast.type === 'error' ? <CircleX size={16} /> : <CircleCheck size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Abas Unificadas */}
      <div className="sylva-dock p-1.5 rounded-2xl border border-[var(--border)] inline-flex flex-wrap items-center gap-1.5 w-full">
        <button
          type="button"
          onClick={() => setActiveTab('conexoes')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            activeTab === 'conexoes'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
        >
          <Database size={14} />
          <span>Conexões Oracle</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('v3')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            activeTab === 'v3'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
        >
          <Code2 size={14} />
          <span>Editor 3.0 (HTML5)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 tabular-nums">
            {QUERY_DEFINITIONS.filter((q) => q.engine === 'V3').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('v2')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            activeTab === 'v2'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
        >
          <Terminal size={14} />
          <span>Editor 2.0 (Flex)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 tabular-nums">
            {QUERY_DEFINITIONS.filter((q) => q.engine === 'V2').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('instituicoes')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            activeTab === 'instituicoes'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
        >
          <Building2 size={14} />
          <span>Instituições (MV)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 tabular-nums">
            {activeHospitalsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parametros')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            activeTab === 'parametros'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
        >
          <SlidersHorizontal size={14} />
          <span>Parâmetros &amp; Report Web</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('usuarios')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            activeTab === 'usuarios'
              ? 'bg-[var(--lime)] text-[var(--lime-ink)] shadow-2xs'
              : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
          )}
        >
          <Users size={14} />
          <span>Usuários &amp; Acesso</span>
        </button>
      </div>

      {/* Conteúdo por Aba */}
      {activeTab === 'conexoes' ? (
        <OracleConnectionsTab onConnectionChanged={loadConfigData} />
      ) : activeTab === 'usuarios' ? (
        <UsersAccessTab />
      ) : isInitialLoading ? (
        <div className="sylva-glass rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
          <Loader2 size={28} className="animate-spin text-[var(--lime)]" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Carregando catálogo de configurações...
          </span>
        </div>
      ) : activeTab === 'v3' || activeTab === 'v2' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter Toolbar */}
          <div className="sylva-glass rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, módulo, tabela ou macro SQL..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(MODULE_LABELS) as ModuleId[]).map((mod) => {
                const isSelected = selectedModule === mod;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setSelectedModule(mod)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer',
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]'
                        : 'bg-[var(--card-subtle)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] border border-[var(--border-subtle)]'
                    )}
                  >
                    {MODULE_LABELS[mod]}
                  </button>
                );
              })}
            </div>
          </div>

          {groupedSections.length === 0 ? (
            <div className="sylva-glass rounded-3xl p-12 text-center space-y-2">
              <Search size={30} className="mx-auto text-[var(--muted)]" />
              <p className="text-sm font-bold text-[var(--foreground)]">
                Nenhuma consulta encontrada
              </p>
              <p className="text-xs text-[var(--muted)]">
                Ajuste o filtro de módulo ou limpe a busca para visualizar todas as queries.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {groupedSections.map((section) => (
                <section key={section.module} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-5 rounded-full bg-[var(--lime)]" />
                      <h2 className="text-sm font-bold text-[var(--foreground)] tracking-tight uppercase">
                        {section.label}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--card-subtle)] text-[var(--muted)] border border-[var(--border-subtle)] tabular-nums">
                        {section.items.length}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {section.items.map((def) => {
                      const Icon = def.icon;
                      const currentSql = sqlByKey[def.id] || def.defaultSql || '';
                      const isEnabled = def.enabledKey
                        ? enabledQueries[def.enabledKey] !== false
                        : true;
                      const customTitle = def.enabledKey
                        ? cardSettings[def.enabledKey]?.title
                        : undefined;
                      const isDynamicPeriod =
                        currentSql.includes('/* DYNAMIC_PERIOD_DAYS */') ||
                        /TRUNC\s*\(\s*SYSDATE\s*\)\s*-\s*90/i.test(currentSql) ||
                        /ADD_MONTHS\s*\(\s*SYSDATE\s*,\s*-3\s*\)/i.test(currentSql);
                      const isDynamicHospitals = currentSql.includes('/* DYNAMIC_HOSPITALS_');
                      const isCustomized =
                        Boolean(sqlByKey[def.id]) &&
                        sqlByKey[def.id].trim() !== def.defaultSql.trim();
                      const lineCount = currentSql ? currentSql.split('\n').length : 0;

                      return (
                        <div
                          key={def.id}
                          className={cn(
                            'sylva-glass rounded-[22px] p-4 flex flex-col justify-between gap-3.5 transition-all hover:border-[var(--border-strong)]',
                            !isEnabled && 'opacity-55'
                          )}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--accent-ink)]">
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-[13px] font-bold text-[var(--foreground)] leading-snug truncate">
                                    {customTitle || def.title}
                                  </h3>
                                  <p className="text-[11px] text-[var(--foreground-secondary)] line-clamp-2 mt-0.5 leading-relaxed">
                                    {def.description}
                                  </p>
                                </div>
                              </div>

                              {def.enabledKey && (
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isEnabled}
                                  onClick={() => handleToggleQuery(def.enabledKey!)}
                                  title={isEnabled ? 'Desativar consulta' : 'Ativar consulta'}
                                  className={cn(
                                    'w-9 h-5 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer flex items-center',
                                    isEnabled
                                      ? 'bg-[var(--lime)] justify-end'
                                      : 'bg-[var(--card-subtle)] border border-[var(--border)] justify-start'
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'w-4 h-4 rounded-full transition-transform',
                                      isEnabled ? 'bg-[var(--lime-ink)]' : 'bg-[var(--muted)]'
                                    )}
                                  />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {isDynamicPeriod && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tone-success border">
                                  <CalendarRange size={10} />
                                  Período Dinâmico
                                </span>
                              )}
                              {def.fixedWindowBadge && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tone-neutral border">
                                  <Clock size={10} />
                                  {def.fixedWindowBadge}
                                </span>
                              )}
                              {isDynamicHospitals && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tone-info border">
                                  <Building2 size={10} />
                                  Empresas Ativas
                                </span>
                              )}
                              {def.requiredBinds?.map((bind) => (
                                <span
                                  key={bind}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border border-[var(--border-subtle)]"
                                >
                                  {bind}
                                </span>
                              ))}
                              {isCustomized && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tone-warning border">
                                  Customizada
                                </span>
                              )}
                            </div>

                            <div className="rounded-xl bg-[var(--card-subtle)] border border-[var(--border-subtle)] px-3 py-2">
                              <p className="text-[11px] font-mono text-[var(--muted)] line-clamp-2 break-all leading-relaxed">
                                {currentSql || 'Consulta não definida.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                            <span className="text-[10.5px] font-mono text-[var(--muted)] tabular-nums">
                              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
                            </span>

                            <button
                              type="button"
                              onClick={() => setEditingDef(def)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full sylva-pill text-[11px] font-bold text-[var(--foreground)] hover:border-[var(--lime)] hover:text-[var(--accent-ink)] transition-all cursor-pointer"
                            >
                              <Code2 size={13} />
                              <span>Editar SQL</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'instituicoes' ? (
        <div className="sylva-glass rounded-3xl p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">
                Mapeamento de Multi-Empresas (DBAMV)
              </h2>
              <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
                Selecione quais hospitais participam das consultas dinâmicas (/* DYNAMIC_HOSPITALS_* */) e defina suas siglas.
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-bold px-3 py-1 rounded-full border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)] self-start sm:self-auto"
            >
              {activeHospitalsCount} ativas
            </Badge>
          </div>

          {loadingHospitals ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
              <Loader2 size={16} className="animate-spin text-[var(--lime)]" />
              <span>Consultando DBAMV.MULTI_EMPRESAS...</span>
            </div>
          ) : hospitalsError ? (
            <div className="p-4 rounded-2xl tone-danger border text-xs font-medium">
              {hospitalsError}
            </div>
          ) : dbHospitals.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--muted)]">
              Nenhuma empresa retornada pela conexão ativa.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {dbHospitals.map((hosp) => {
                const mapped = hospitalsMapping.find((m) => m.id === hosp.CD_MULTI_EMPRESA);
                const isAtivo = Boolean(mapped?.ativo);
                const siglaVal = mapped?.sigla || '';

                return (
                  <div
                    key={hosp.CD_MULTI_EMPRESA}
                    className={cn(
                      'rounded-2xl p-4 border transition-all flex flex-col gap-3',
                      isAtivo
                        ? 'bg-[var(--card-subtle)] border-[var(--tint-olive-border)]'
                        : 'bg-[var(--card-bg)] border-[var(--border-subtle)] opacity-75'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-[var(--muted)]">
                          CD_MULTI_EMPRESA = {hosp.CD_MULTI_EMPRESA}
                        </span>
                        <h3 className="text-xs font-bold text-[var(--foreground)] truncate mt-0.5">
                          {hosp.NM_FANTASIA || hosp.DS_RAZAO_SOCIAL || `Empresa ${hosp.CD_MULTI_EMPRESA}`}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleHospitalActive(hosp)}
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0',
                          isAtivo
                            ? 'bg-[var(--lime)] text-[var(--lime-ink)] border-transparent'
                            : 'sylva-pill text-[var(--muted)]'
                        )}
                        title={isAtivo ? 'Desativar unidade' : 'Ativar unidade'}
                      >
                        <Check size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={siglaVal}
                        onChange={(e) =>
                          updateHospitalSiglaLocal(
                            hosp.CD_MULTI_EMPRESA,
                            hosp.NM_FANTASIA,
                            e.target.value.toUpperCase()
                          )
                        }
                        onBlur={() => saveHospitalsMapping(hospitalsMapping)}
                        placeholder="Sigla (ex: HVA)"
                        maxLength={12}
                        className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[var(--foreground)] uppercase focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveHospitalsMapping(hospitalsMapping)}
                        className="px-3 py-1.5 rounded-xl sylva-pill text-[11px] font-bold text-[var(--foreground)] hover:border-[var(--lime)] cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {/* Report Web URL */}
          <div className="sylva-glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] flex items-center justify-center">
                <Printer size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  Vínculo Report Web (Laudos PDF MV)
                </h2>
                <p className="text-xs text-[var(--foreground-secondary)]">
                  URL base usada para abrir documentos registrados diretamente no portal MV.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                URL Base (+ CD_REGISTRO)
              </label>
              <input
                type="text"
                value={reportBaseUrl}
                onChange={(e) => setReportBaseUrl(e.target.value)}
                placeholder="http://dev3-mvh5.acsc.org.br:84/mveditor/report?regId="
                className="w-full bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                disabled={paramsSaving === 'SAVE_REPORT_URL'}
                onClick={() => saveParams('SAVE_REPORT_URL')}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full sylva-lime-btn text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {paramsSaving === 'SAVE_REPORT_URL' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Salvar URL</span>
              </button>
            </div>
          </div>

          {/* Parâmetros de Auditoria */}
          <div className="sylva-glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] flex items-center justify-center">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  Parâmetros da Rota de Auditoria
                </h2>
                <p className="text-xs text-[var(--foreground-secondary)]">
                  Janela padrão em dias e documento de foco para trilhas de auditoria operacional.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Dias de Auditoria
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={auditDays}
                  onChange={(e) => setAuditDays(Number(e.target.value) || 15)}
                  className="w-full bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Documento Foco (0 = Todos)
                </label>
                <input
                  type="text"
                  value={auditDocId}
                  onChange={(e) => setAuditDocId(e.target.value)}
                  className="w-full bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Schema / Owner de Auditoria
                </label>
                <input
                  type="text"
                  value={auditSchemaOwner}
                  onChange={(e) => setAuditSchemaOwner(e.target.value.toUpperCase())}
                  placeholder="DBAMV"
                  className="w-full bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--foreground)] focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-[var(--muted)]">
              Schema ativo: <code className="font-mono text-[var(--foreground)]">{sanitizeAuditOwner(auditSchemaOwner)}</code>. Altere caso o hospital exija criar <code className="font-mono">TB_AUDITORIA_SIMILARIDADE</code> e <code className="font-mono">V_AUDITORIA_COPIA_COLA</code> em um schema próprio (fora do <code className="font-mono">DBAMV</code>).
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setDdlModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground)] hover:border-[var(--lime)] cursor-pointer"
              >
                <Database size={14} className="text-[var(--lime-dark)] dark:text-[var(--lime)]" />
                <span>Ver Script DDL (Tabela + View)</span>
              </button>

              <button
                type="button"
                disabled={paramsSaving === 'SAVE_AUDIT_PARAMS'}
                onClick={() => saveParams('SAVE_AUDIT_PARAMS')}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full sylva-lime-btn text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {paramsSaving === 'SAVE_AUDIT_PARAMS' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Salvar Parâmetros</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal DDL Auditoria de Similaridade */}
      <SimilarityDdlModal
        isOpen={ddlModalOpen}
        onClose={() => setDdlModalOpen(false)}
        schemaOwner={auditSchemaOwner}
      />

      {/* Modal SQL Editor */}
      <SqlQueryEditorModal
        open={Boolean(editingDef)}
        target={editorModalTarget}
        saving={modalSaving}
        onClose={() => setEditingDef(null)}
        onSave={handleSaveModalQuery}
      />
    </div>
  );
}
