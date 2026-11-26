"use client";

import React, { useState, useMemo } from 'react';
import {
  Search, RefreshCw, Database, Layout, ChevronRight,
  ChevronDown, Layers, FileSpreadsheet, Folder, FolderOpen,
  FileText, Link2, ChevronsUpDown, Building2, UserCheck, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProfileParameter {
  Parametro: string;
  Valor: string;
  Descricao: string;
}

export interface ProfileModuleNode {
  id: string;
  parentId: string | null;
  ordem: number | null;
  ModuloId: string;
  Titulo: string;
  Parametros: ProfileParameter[];
  children: ProfileModuleNode[];
}

export interface HospitalRef {
  id: number | string;
  nome: string;
  sigla: string;
}

interface AmbulatoryProfilesViewProps {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string;
  selectedPerfilId: string | null;
  setSelectedPerfilId: (id: string | null) => void;
  profileDetailsCache: Record<string, ProfileModuleNode[]>;
  profileDetailsLoading: boolean;
  onExportCSV: () => void;
  activeHospitals?: HospitalRef[];
}

interface ParsedEmpresa {
  id: string;
  nome: string;
  sigla: string;
}

interface ParsedTipPresta {
  id: string;
  nome: string;
}

interface MasterProfileItem {
  id: string;
  Nome_Perfil: string;
  Especialidade: string;
  Sistema: string;
  Nome_Tipo_Prestador: string;
  Nome_Setor: string;
  empresas: ParsedEmpresa[];
  tiposPrestador: ParsedTipPresta[];
}

interface TreeFilterResult {
  filtered: ProfileModuleNode[];
  autoExpanded: Record<string, boolean>;
}

const IGNORED_SIGLA_WORDS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'NSRA', 'NSRA.', 'SENHORA']);

function buildFallbackSigla(name: string): string {
  const words = name
    .replace(/\(.*\)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  const meaningful = words.filter((w) => !IGNORED_SIGLA_WORDS.has(w.toUpperCase()));
  const source = meaningful.length > 0 ? meaningful : words;
  return source
    .slice(0, 4)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function parsePipeEntries(raw: unknown): Array<{ id: string; nome: string }> {
  const str = String(raw ?? '').trim();
  if (!str) return [];
  const seen = new Set<string>();
  const items: Array<{ id: string; nome: string }> = [];

  for (const part of str.split('|')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const sepIdx = trimmed.indexOf('::');
    const id = sepIdx >= 0 ? trimmed.slice(0, sepIdx).trim() : trimmed;
    const nome = sepIdx >= 0 ? trimmed.slice(sepIdx + 2).trim() : trimmed;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, nome: nome || id });
  }
  return items;
}

function countTreeStats(nodes: ProfileModuleNode[]): { roots: number; subCount: number } {
  const countDescendants = (list: ProfileModuleNode[]): number =>
    list.reduce((acc, node) => acc + node.children.length + countDescendants(node.children), 0);
  return {
    roots: nodes.length,
    subCount: countDescendants(nodes),
  };
}

function collectExpandableIds(nodes: ProfileModuleNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: ProfileModuleNode[]) => {
    for (const node of list) {
      if (node.children.length > 0 || node.Parametros.length > 0 || node.ModuloId === 'MVPEP_SUBSEGMENTO') {
        ids.push(node.id);
      }
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

function filterModuleTree(nodes: ProfileModuleNode[], query: string): TreeFilterResult {
  const term = query.trim().toLowerCase();
  if (!term) {
    return { filtered: nodes, autoExpanded: {} };
  }

  const autoExpanded: Record<string, boolean> = {};

  const filterNodes = (list: ProfileModuleNode[]): ProfileModuleNode[] => {
    const result: ProfileModuleNode[] = [];
    for (const node of list) {
      const nodeMatches =
        node.Titulo.toLowerCase().includes(term) ||
        node.ModuloId.toLowerCase().includes(term) ||
        node.id.toLowerCase().includes(term);

      const paramMatches = node.Parametros.some(
        (p) =>
          p.Parametro.toLowerCase().includes(term) ||
          p.Valor.toLowerCase().includes(term) ||
          p.Descricao.toLowerCase().includes(term)
      );

      const filteredChildren = filterNodes(node.children);
      const hasChildMatch = filteredChildren.length > 0;

      if (hasChildMatch) {
        autoExpanded[node.id] = true;
      }
      if (paramMatches) {
        autoExpanded[node.id] = true;
      }

      if (nodeMatches || paramMatches || hasChildMatch) {
        result.push({
          ...node,
          children: hasChildMatch ? filteredChildren : nodeMatches ? node.children : [],
        });
      }
    }
    return result;
  };

  return {
    filtered: filterNodes(nodes),
    autoExpanded,
  };
}

function renderModuleIcon(node: ProfileModuleNode, isExpanded: boolean, isGroup: boolean) {
  if (isGroup) {
    return isExpanded ? (
      <FolderOpen size={15} className="text-[var(--accent-ink)] shrink-0" />
    ) : (
      <Folder size={15} className="text-[var(--accent-ink)] shrink-0" />
    );
  }
  if (node.ModuloId === 'MVPEP_TEMA_DOC_ELETRONICO') {
    return <FileText size={15} className="text-[var(--accent-ink)] shrink-0" />;
  }
  if (node.ModuloId === 'MVPEP_LINK_URL') {
    return <Link2 size={15} className="text-[var(--accent-ink)] shrink-0" />;
  }
  return <Layout size={15} className="text-[var(--accent-ink)] shrink-0" />;
}

interface ModuleTreeItemProps {
  node: ProfileModuleNode;
  level: number;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
}

function ModuleTreeItem({ node, level, expandedMap, onToggle }: ModuleTreeItemProps) {
  const isGroup = node.children.length > 0 || node.ModuloId === 'MVPEP_SUBSEGMENTO';
  const isHybrid = node.children.length > 0 && node.Parametros.length > 0;
  const isExpanded = Boolean(expandedMap[node.id]);

  return (
    <div
      className={cn(
        'border rounded-2xl overflow-hidden text-xs transition-colors',
        level === 0
          ? 'border-[var(--border)] bg-[var(--card)]/40'
          : 'border-[var(--border-subtle)] bg-[var(--card-subtle)]/70'
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className={cn(
          'w-full text-left p-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer',
          level === 0
            ? 'bg-[var(--card-subtle)] hover:bg-[var(--card-hover)]'
            : 'bg-transparent hover:bg-[var(--card-hover)]'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {renderModuleIcon(node, isExpanded, isGroup)}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[var(--foreground)] truncate">
                {node.Titulo || `Módulo ${node.ModuloId || node.id}`}
              </span>
              {node.ordem !== null && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                  Ordem {node.ordem}
                </span>
              )}
              {node.ModuloId === 'MVPEP_SUBSEGMENTO' && (
                <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                  Subsegmento
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--muted)] font-mono mt-0.5 block truncate">
              Código: {node.ModuloId || node.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[var(--muted)]">
          {isGroup && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
              {node.children.length} {node.children.length === 1 ? 'submódulo' : 'submódulos'}
            </span>
          )}
          {(!isGroup || isHybrid) && (
            <span className="text-[11px] font-semibold">
              {node.Parametros.length > 0
                ? `${node.Parametros.length} ${node.Parametros.length === 1 ? 'parâmetro' : 'parâmetros'}`
                : 'Sem parâmetros'}
            </span>
          )}
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3.5 border-t border-[var(--border-subtle)] space-y-3 bg-[var(--card)]/30">
          {node.Parametros.length > 0 && (
            <div className="space-y-2">
              {isGroup && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Parâmetros deste módulo
                </p>
              )}
              {node.Parametros.map((param, pIdx) => (
                <div
                  key={`${param.Parametro}-${pIdx}`}
                  className="p-2.5 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
                    <span className="font-bold text-[var(--foreground)] font-mono text-[11px] break-all">
                      {param.Parametro}
                    </span>
                    <span className="font-mono text-[var(--accent-ink)] bg-[var(--accent)] px-2.5 py-0.5 rounded-full border border-[var(--tint-olive-border)] text-[10.5px] break-all self-start sm:self-auto">
                      {param.Valor || 'Sem valor'}
                    </span>
                  </div>
                  {param.Descricao && (
                    <p className="text-[11px] text-[var(--muted)] mt-1 break-words">
                      {param.Descricao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {node.children.length > 0 && (
            <div className="space-y-2">
              {isHybrid && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Submódulos ({node.children.length})
                </p>
              )}
              <div className="border-l-2 border-[var(--tint-olive-border)] ml-1.5 pl-3 space-y-2">
                {node.children.map((child) => (
                  <ModuleTreeItem
                    key={child.id}
                    node={child}
                    level={level + 1}
                    expandedMap={expandedMap}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          )}

          {node.Parametros.length === 0 && node.children.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic">
              Nenhum parâmetro ou submódulo vinculado a este módulo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AmbulatoryProfilesView({
  data,
  loading,
  error,
  selectedPerfilId,
  setSelectedPerfilId,
  profileDetailsCache,
  profileDetailsLoading,
  onExportCSV,
  activeHospitals = []
}: AmbulatoryProfilesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleSearchTerm, setModuleSearchTerm] = useState('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('ALL');
  const [selectedTipPrestaId, setSelectedTipPrestaId] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const pageSize = 8;

  const hospitalRefMap = useMemo(() => {
    const map = new Map<string, HospitalRef>();
    for (const h of activeHospitals) {
      map.set(String(h.id), h);
    }
    return map;
  }, [activeHospitals]);

  const masterList = useMemo<MasterProfileItem[]>(() => {
    return data
      .map((row) => {
        const rawEmpresas = parsePipeEntries(row.EMPRESAS_VINCULADAS ?? row.Empresas_Vinculadas);
        const empFixa = row.EMPRESA_FIXA ?? row.Empresa_Fixa;
        if (rawEmpresas.length === 0 && empFixa !== null && empFixa !== undefined && String(empFixa).trim() !== '') {
          const empId = String(empFixa).trim();
          const ref = hospitalRefMap.get(empId);
          rawEmpresas.push({ id: empId, nome: ref?.nome || `Empresa ${empId}` });
        }

        const empresas: ParsedEmpresa[] = rawEmpresas.map((item) => {
          const ref = hospitalRefMap.get(item.id);
          const sigla = (ref?.sigla && ref.sigla.trim()) || buildFallbackSigla(item.nome) || item.id;
          return {
            id: item.id,
            nome: item.nome,
            sigla,
          };
        });

        const tiposPrestador = parsePipeEntries(row.TIPOS_PRESTADOR ?? row.Tipos_Prestador);
        const codTipFixo = row.COD_TIPO_PRESTADOR ?? row.Cod_Tipo_Prestador;
        const nomeTipFixo = String(row.NOME_TIPO_PRESTADOR ?? row.Nome_Tipo_Prestador ?? '').trim();
        if (tiposPrestador.length === 0 && nomeTipFixo) {
          const tipId =
            codTipFixo !== null && codTipFixo !== undefined && String(codTipFixo).trim() !== ''
              ? String(codTipFixo).trim()
              : nomeTipFixo;
          tiposPrestador.push({ id: tipId, nome: nomeTipFixo });
        }

        return {
          id: String(row.COD_PERFIL || row.Cod_Perfil || row['"COD_PERFIL"'] || ''),
          Nome_Perfil: String(row.NOME_PERFIL || row.Nome_Perfil || row['"NOME_PERFIL"'] || ''),
          Especialidade: String(row.ESPECIALIDADE || row.Especialidade || row['"ESPECIALIDADE"'] || ''),
          Sistema: String(row.SISTEMA || row.Sistema || row['"SISTEMA"'] || ''),
          Nome_Tipo_Prestador: nomeTipFixo,
          Nome_Setor: String(row.NOME_SETOR || row.Nome_Setor || ''),
          empresas,
          tiposPrestador,
        };
      })
      .filter((p) => p.id);
  }, [data, hospitalRefMap]);

  const empresaOptions = useMemo(() => {
    const counts = new Map<string, { id: string; sigla: string; nome: string; count: number }>();
    let noneCount = 0;

    for (const p of masterList) {
      if (p.empresas.length === 0) {
        noneCount++;
        continue;
      }
      for (const emp of p.empresas) {
        const existing = counts.get(emp.id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(emp.id, { ...emp, count: 1 });
        }
      }
    }

    const items = Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || a.sigla.localeCompare(b.sigla)
    );

    return { items, noneCount };
  }, [masterList]);

  const profilesByEmpresa = useMemo(() => {
    if (selectedEmpresaId === 'ALL') return masterList;
    if (selectedEmpresaId === 'NONE') return masterList.filter((p) => p.empresas.length === 0);
    return masterList.filter((p) => p.empresas.some((e) => e.id === selectedEmpresaId));
  }, [masterList, selectedEmpresaId]);

  const tipPrestaOptions = useMemo(() => {
    const counts = new Map<string, { id: string; nome: string; count: number }>();
    let noneCount = 0;

    for (const p of profilesByEmpresa) {
      if (p.tiposPrestador.length === 0) {
        noneCount++;
        continue;
      }
      for (const tip of p.tiposPrestador) {
        const existing = counts.get(tip.id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(tip.id, { ...tip, count: 1 });
        }
      }
    }

    const items = Array.from(counts.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    return { items, noneCount };
  }, [profilesByEmpresa]);

  const filteredList = useMemo(() => {
    let base = profilesByEmpresa;

    if (selectedTipPrestaId === 'NONE') {
      base = base.filter((p) => p.tiposPrestador.length === 0);
    } else if (selectedTipPrestaId !== 'ALL') {
      base = base.filter((p) => p.tiposPrestador.some((t) => t.id === selectedTipPrestaId));
    }

    if (!searchTerm.trim()) return base;
    const term = searchTerm.trim().toLowerCase();
    return base.filter(
      (p) =>
        p.Nome_Perfil.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term) ||
        p.Especialidade.toLowerCase().includes(term) ||
        p.empresas.some(
          (e) => e.sigla.toLowerCase().includes(term) || e.nome.toLowerCase().includes(term)
        ) ||
        p.tiposPrestador.some((t) => t.nome.toLowerCase().includes(term))
    );
  }, [profilesByEmpresa, selectedTipPrestaId, searchTerm]);

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage]);

  const handleSelectEmpresa = (empId: string) => {
    setSelectedEmpresaId(empId);
    setCurrentPage(1);

    if (selectedTipPrestaId !== 'ALL') {
      const subset =
        empId === 'ALL'
          ? masterList
          : empId === 'NONE'
            ? masterList.filter((p) => p.empresas.length === 0)
            : masterList.filter((p) => p.empresas.some((e) => e.id === empId));

      const stillValid =
        selectedTipPrestaId === 'NONE'
          ? subset.some((p) => p.tiposPrestador.length === 0)
          : subset.some((p) => p.tiposPrestador.some((t) => t.id === selectedTipPrestaId));

      if (!stillValid) {
        setSelectedTipPrestaId('ALL');
      }
    }
  };

  const handleSelectTipPresta = (tipId: string) => {
    setSelectedTipPrestaId(tipId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedEmpresaId('ALL');
    setSelectedTipPrestaId('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedEmpresaId !== 'ALL' || selectedTipPrestaId !== 'ALL' || searchTerm.trim().length > 0;

  const handleSelectPerfil = (id: string) => {
    setSelectedPerfilId(id);
    setExpandedModules({});
    setModuleSearchTerm('');
  };

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedPerfil = useMemo(() => {
    return masterList.find((p) => p.id === selectedPerfilId);
  }, [masterList, selectedPerfilId]);

  const activeTree = useMemo(
    () => (selectedPerfilId ? profileDetailsCache[selectedPerfilId] || [] : []),
    [selectedPerfilId, profileDetailsCache]
  );

  const treeStats = useMemo(() => countTreeStats(activeTree), [activeTree]);
  const expandableIds = useMemo(() => collectExpandableIds(activeTree), [activeTree]);

  const { filtered: filteredTree, autoExpanded } = useMemo(
    () => filterModuleTree(activeTree, moduleSearchTerm),
    [activeTree, moduleSearchTerm]
  );

  const effectiveExpandedMap = useMemo(() => {
    if (!moduleSearchTerm.trim()) return expandedModules;
    return { ...expandedModules, ...autoExpanded };
  }, [expandedModules, autoExpanded, moduleSearchTerm]);

  const allExpanded =
    expandableIds.length > 0 && expandableIds.every((id) => Boolean(expandedModules[id]));

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedModules({});
    } else {
      const next: Record<string, boolean> = {};
      for (const id of expandableIds) {
        next[id] = true;
      }
      setExpandedModules(next);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de Filtros: Empresa (Hospital) e Tipo de Prestador */}
      {!loading && masterList.length > 0 && (
        <div className="sylva-glass rounded-[20px] p-4 flex flex-col gap-3">
          {/* Linha 1: Empresa (Hospital) */}
          <div className="flex items-start sm:items-center gap-2.5 flex-wrap">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 shrink-0 mr-1">
              <Building2 size={13} className="text-[var(--accent-ink)]" />
              Empresa:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleSelectEmpresa('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                  selectedEmpresaId === 'ALL'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)] font-bold'
                    : 'bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border-[var(--border)] hover:bg-[var(--card-hover)] font-medium'
                )}
              >
                Todas ({masterList.length})
              </button>

              {empresaOptions.items.map((emp) => (
                <button
                  type="button"
                  key={emp.id}
                  title={emp.nome}
                  onClick={() => handleSelectEmpresa(emp.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                    selectedEmpresaId === emp.id
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)] font-bold'
                      : 'bg-[var(--card-subtle)] text-[var(--foreground-secondary)] border-[var(--border)] hover:bg-[var(--card-hover)] font-medium'
                  )}
                >
                  {emp.sigla}{' '}
                  <span className="font-mono text-[10px] opacity-80">({emp.count})</span>
                </button>
              ))}

              {empresaOptions.noneCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectEmpresa('NONE')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                    selectedEmpresaId === 'NONE'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)] font-bold'
                      : 'bg-[var(--card-subtle)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--card-hover)] font-medium'
                  )}
                >
                  Sem empresa ({empresaOptions.noneCount})
                </button>
              )}
            </div>
          </div>

          {/* Linha 2: Tipo de Prestador + Resumo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
              <label
                htmlFor="tip-presta-filter"
                className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 shrink-0"
              >
                <UserCheck size={13} className="text-[var(--accent-ink)]" />
                Tipo de Prestador:
              </label>
              <select
                id="tip-presta-filter"
                value={selectedTipPrestaId}
                onChange={(e) => handleSelectTipPresta(e.target.value)}
                className="bg-[var(--card-solid)] border border-[var(--border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--lime)] focus:ring-2 focus:ring-[var(--lime)]/20 transition-all max-w-full sm:min-w-[280px] cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--card-solid)] text-[var(--foreground)]">
                  Todos os tipos de prestador ({profilesByEmpresa.length})
                </option>
                {tipPrestaOptions.items.map((tip) => (
                  <option
                    key={tip.id}
                    value={tip.id}
                    className="bg-[var(--card-solid)] text-[var(--foreground)]"
                  >
                    {tip.nome} ({tip.count})
                  </option>
                ))}
                {tipPrestaOptions.noneCount > 0 && (
                  <option value="NONE" className="bg-[var(--card-solid)] text-[var(--foreground)]">
                    Sem tipo de prestador ({tipPrestaOptions.noneCount})
                  </option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[11px] font-mono text-[var(--muted)]">
                Exibindo <strong className="text-[var(--foreground)]">{filteredList.length}</strong> de{' '}
                {masterList.length} perfis
              </span>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-7 px-2.5 text-[11px] gap-1"
                >
                  <RotateCcw size={11} />
                  <span>Limpar filtros</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Master-Detail */}
      <div className="flex flex-col md:flex-row gap-5 min-h-[500px]">
        {/* Master: Lista de Perfis */}
        <div className="w-full md:w-96 sylva-glass rounded-[22px] flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide flex items-center gap-2">
                <Layers size={14} className="text-[var(--accent-ink)]" />
                Perfis Cadastrados
              </h3>
              <span className="text-[11px] font-bold text-[var(--accent-ink)] bg-[var(--accent)] px-2.5 py-0.5 rounded-full border border-[var(--tint-olive-border)] font-mono">
                {filteredList.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={13} />
              <input
                type="text"
                placeholder="Buscar perfil por nome, id, empresa, prestador..."
                className="w-full bg-[var(--card-subtle)] border border-[var(--border)] rounded-full pl-9 pr-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lime)] focus:ring-2 focus:ring-[var(--lime)]/20 transition-all"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Profile list items */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
            {loading ? (
              <div className="p-6 text-center text-[var(--muted)]">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[var(--accent-ink)]" />
                <p className="text-xs font-medium">Carregando perfis...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-xs tone-danger border rounded-xl m-2">
                {error}
              </div>
            ) : paginatedList.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)] text-xs">
                Nenhum perfil encontrado para os filtros aplicados
              </div>
            ) : (
              paginatedList.map((perfil) => {
                const isSelected = selectedPerfilId === perfil.id;
                return (
                  <button
                    type="button"
                    key={perfil.id}
                    onClick={() => handleSelectPerfil(perfil.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-2xl transition-all flex items-start gap-2.5 border cursor-pointer',
                      isSelected
                        ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] shadow-2xs'
                        : 'bg-transparent border-transparent hover:border-[var(--border)] hover:bg-[var(--card-subtle)]'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-1 w-2 h-2 rounded-full shrink-0',
                        isSelected ? 'bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]' : 'bg-[var(--border-strong)]'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          'text-xs font-bold leading-tight truncate normal-case tracking-normal',
                          isSelected ? 'text-[var(--accent-ink)] font-extrabold' : 'text-[var(--foreground)]'
                        )}
                      >
                        {perfil.Nome_Perfil}
                      </h4>
                      <p className="text-[10px] text-[var(--muted)] font-mono mt-0.5">
                        ID: {perfil.id}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {perfil.empresas.slice(0, 2).map((emp) => (
                          <span
                            key={emp.id}
                            title={emp.nome}
                            className="text-[9.5px] px-2 py-0.5 bg-[var(--card)] text-[var(--foreground)] rounded-full font-bold border border-[var(--border)] font-mono"
                          >
                            {emp.sigla}
                          </span>
                        ))}
                        {perfil.empresas.length > 2 && (
                          <span
                            title={perfil.empresas.map((e) => e.sigla).join(', ')}
                            className="text-[9.5px] px-1.5 py-0.5 bg-[var(--card)] text-[var(--muted)] rounded-full font-mono border border-[var(--border)]"
                          >
                            +{perfil.empresas.length - 2}
                          </span>
                        )}
                        {perfil.tiposPrestador.length > 0 && (
                          <span
                            title={perfil.tiposPrestador.map((t) => t.nome).join(' | ')}
                            className="text-[9.5px] px-2 py-0.5 bg-[var(--card-subtle)] text-[var(--foreground-secondary)] rounded-full font-medium border border-[var(--border)] max-w-[180px] truncate"
                          >
                            {perfil.tiposPrestador[0].nome}
                            {perfil.tiposPrestador.length > 1 ? ` +${perfil.tiposPrestador.length - 1}` : ''}
                          </span>
                        )}
                        {perfil.Sistema && (
                          <span className="text-[9.5px] px-2 py-0.5 bg-[var(--card-subtle)] text-[var(--foreground-secondary)] rounded-full font-medium border border-[var(--border)]">
                            {perfil.Sistema}
                          </span>
                        )}
                        {perfil.Especialidade && (
                          <span className="text-[9.5px] px-2 py-0.5 bg-[var(--card-subtle)] text-[var(--foreground-secondary)] rounded-full font-medium border border-[var(--border)]">
                            {perfil.Especialidade}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        'shrink-0 mt-1 transition-all',
                        isSelected ? 'text-[var(--accent-ink)] translate-x-0.5' : 'text-[var(--muted)]'
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--foreground-secondary)]">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-full sylva-pill disabled:opacity-30 disabled:pointer-events-none text-[11px] font-semibold text-[var(--foreground)] cursor-pointer"
              >
                Anterior
              </button>
              <span className="font-mono text-[11px] font-bold text-[var(--foreground)]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-full sylva-pill disabled:opacity-30 disabled:pointer-events-none text-[11px] font-semibold text-[var(--foreground)] cursor-pointer"
              >
                Próximo
              </button>
            </div>
          )}
        </div>

        {/* Detail: Árvore Hierárquica de Módulos & Parâmetros */}
        <div className="flex-1 sylva-glass rounded-[22px] p-6 flex flex-col min-w-0">
          {!selectedPerfilId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] py-16">
              <Database size={40} className="mb-3 opacity-35 text-[var(--muted)]" />
              <p className="text-xs font-semibold">
                Selecione um perfil clínico ao lado para visualizar módulos e parâmetros
              </p>
            </div>
          ) : selectedPerfil ? (
            <div className="space-y-5">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[var(--accent-ink)] bg-[var(--accent)] px-2.5 py-0.5 rounded-full border border-[var(--tint-olive-border)]">
                      ID #{selectedPerfil.id}
                    </span>
                    <span className="text-xs text-[var(--muted)] font-medium">
                      {selectedPerfil.Sistema || 'SIS'}
                    </span>
                    {selectedPerfil.Nome_Setor && (
                      <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)] font-medium">
                        {selectedPerfil.Nome_Setor}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-[var(--foreground)] break-words">
                      {selectedPerfil.Nome_Perfil}
                    </h2>
                    {selectedPerfil.Especialidade && (
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Especialidade:{' '}
                        <span className="font-semibold text-[var(--foreground-secondary)]">
                          {selectedPerfil.Especialidade}
                        </span>
                      </p>
                    )}
                  </div>

                  {(selectedPerfil.empresas.length > 0 || selectedPerfil.tiposPrestador.length > 0) && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {selectedPerfil.empresas.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1 mr-0.5">
                            <Building2 size={11} className="text-[var(--accent-ink)]" />
                            Empresas:
                          </span>
                          {selectedPerfil.empresas.map((emp) => (
                            <span
                              key={emp.id}
                              title={emp.nome}
                              className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)] font-medium"
                            >
                              <strong className="font-mono text-[var(--foreground)]">{emp.sigla}</strong>
                              {emp.nome !== emp.sigla ? ` — ${emp.nome}` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {selectedPerfil.tiposPrestador.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1 mr-0.5">
                            <UserCheck size={11} className="text-[var(--accent-ink)]" />
                            Prestadores:
                          </span>
                          {selectedPerfil.tiposPrestador.map((tip) => (
                            <span
                              key={tip.id}
                              className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--foreground-secondary)] font-medium"
                            >
                              {tip.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportCSV}
                  className="h-8 text-xs gap-1.5 self-start shrink-0"
                >
                  <FileSpreadsheet size={13} />
                  <span>Exportar CSV</span>
                </Button>
              </div>

              {/* Modules Tree */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider">
                      Módulos do Perfil
                    </h3>
                    {!profileDetailsLoading && activeTree.length > 0 && (
                      <span className="text-[10.5px] font-mono text-[var(--foreground-secondary)] bg-[var(--card-subtle)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                        {treeStats.roots} {treeStats.roots === 1 ? 'módulo principal' : 'módulos principais'}
                        {treeStats.subCount > 0 &&
                          ` • ${treeStats.subCount} ${treeStats.subCount === 1 ? 'submódulo' : 'submódulos'}`}
                      </span>
                    )}
                  </div>

                  {!profileDetailsLoading && activeTree.length > 0 && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                          size={12}
                        />
                        <input
                          type="text"
                          placeholder="Filtrar módulo, código, parâmetro ou valor..."
                          className="w-full bg-[var(--card-subtle)] border border-[var(--border)] rounded-full pl-8 pr-3 py-1.5 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--lime)] focus:ring-2 focus:ring-[var(--lime)]/20 transition-all"
                          value={moduleSearchTerm}
                          onChange={(e) => setModuleSearchTerm(e.target.value)}
                        />
                      </div>
                      {expandableIds.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleToggleAll}
                          className="h-7 px-2.5 text-[11px] gap-1 shrink-0"
                        >
                          <ChevronsUpDown size={12} />
                          <span>{allExpanded ? 'Recolher tudo' : 'Expandir tudo'}</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {profileDetailsLoading ? (
                  <div className="space-y-3 py-6">
                    <div className="skeleton h-14 w-full" />
                    <div className="skeleton h-14 w-full" />
                  </div>
                ) : filteredTree.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredTree.map((node) => (
                      <ModuleTreeItem
                        key={node.id}
                        node={node}
                        level={0}
                        expandedMap={effectiveExpandedMap}
                        onToggle={toggleModule}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--muted)] text-xs">
                    {moduleSearchTerm.trim()
                      ? 'Nenhum módulo ou parâmetro corresponde ao filtro informado.'
                      : 'Nenhum módulo vinculado encontrado para este perfil.'}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
