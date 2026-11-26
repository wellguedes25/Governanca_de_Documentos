export type LineageEngine = 'V3' | 'V2';
export type LineageDepth = 1 | 2 | 'all';
export type LineageOriginKind = 'FIELD_ACTION' | 'DOC_RULE';
export type LineageLinkKind = 'CONTENT' | 'VALIDATION' | 'BROKEN';
export type LineageNodeRole = 'SOURCE' | 'BRIDGE' | 'SINK' | 'ISOLATED';

export interface LineageFieldItem {
  sourceTag?: string;
  sourceName?: string;
  sourceFields?: Array<{ tag: string; name: string }>;
  targetTag: string;
  targetName: string;
  script: string;
  isDocLevel: boolean;
  linkKind: LineageLinkKind;
  originKind: LineageOriginKind;
  ruleName?: string;
  ruleType?: string;
}

export interface ExecutiveEdgeData {
  id: string;
  sourceDocId: string;
  targetDocId: string;
  totalFields: number;
  fieldsMap: LineageFieldItem[];
  label: string;
  type: 'SQL_QUERY';
  hasFieldActions: boolean;
  hasDocRules: boolean;
  isHybridV2?: boolean;
  isBroken?: boolean;
}

export interface LineageDocFieldEntry {
  code: number;
  tag: string;
  name: string;
  metadataId?: number;
  hasLink: boolean;
}

export interface LineageDocNodeData {
  id: string;
  docId: number;
  title: string;
  version: number;
  versionType: string;
  tech: string;
  engineOrigin: 'V3' | 'V2' | 'BROKEN';
  clusterId: number;
  role: LineageNodeRole;
  hopDistance?: number;
  totalFields: number;
  upstreamCount: number;
  downstreamCount: number;
  selfLinksCount: number;
  selfFields: LineageFieldItem[];
  isFocus?: boolean;
  isLegacyV2?: boolean;
  isBroken?: boolean;
  fields: LineageDocFieldEntry[];
}

export interface LineageClusterSummary {
  clusterId: number;
  label: string;
  docIds: number[];
  docCount: number;
  edgeCount: number;
  totalFieldsLinked: number;
  hasBroken: boolean;
  hasLegacyV2: boolean;
}

export interface LineageAvailableDoc {
  id: number;
  title: string;
  totalLinks: number;
  upstreamCount: number;
  downstreamCount: number;
  clusterId: number;
  isBroken?: boolean;
  isLegacyV2?: boolean;
}

export interface LineageSummary {
  totalDocs: number;
  totalEdges: number;
  totalFieldsLinked: number;
  totalClusters: number;
  totalBrokenDocs: number;
  totalActionLinks: number;
  totalRuleLinks: number;
}

export interface LineageApiResponse {
  engine: LineageEngine;
  nodes: LineageDocNodeData[];
  edges: ExecutiveEdgeData[];
  clusters: LineageClusterSummary[];
  availableDocs: LineageAvailableDoc[];
  focusDocId: number | null;
  depth: LineageDepth;
  summary: LineageSummary;
}
