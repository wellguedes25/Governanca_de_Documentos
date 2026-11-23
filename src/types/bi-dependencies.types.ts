export type BiArtifactType =
  | 'RELATORIO'
  | 'PAINEL_BI'
  | 'INDICADOR'
  | 'EXTRACAO'
  | 'QUERY_VIEW';

export type BiToolType =
  | 'Power BI'
  | 'Qlik'
  | 'Tableau'
  | 'MV'
  | 'Oracle / View'
  | 'Excel / Integrador'
  | 'Outro';

export type BiCriticality = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface BiDocumentLink {
  docId: string;
  docName: string;
  motor?: 'V2' | 'V3';
  fields: string[]; // DS_IDENTIFICADOR opcionais
  observacao?: string;
}

export interface BiArtifact {
  id: string;
  nome: string;
  descricao?: string;
  tipo: BiArtifactType;
  ferramenta: BiToolType | string;
  responsavel: string;
  area?: string;
  url?: string;
  criticidade: BiCriticality;
  unidades: string[]; // Siglas (ex: ['HSC', 'CSSJ']) ou [] para Todas
  documentosVinculados: BiDocumentLink[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface BiCatalogDocOption {
  id: string;
  nome: string;
  motor: 'V2' | 'V3';
  totalUsos?: number;
}
