"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Stethoscope, RefreshCw, Printer } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AmbulatoryProfilesView,
  type ProfileModuleNode,
  type HospitalRef
} from '@/components/documentos/AmbulatoryProfilesView';
import { cn } from '@/lib/utils';

function buildModuleTree(rows: Record<string, unknown>[]): ProfileModuleNode[] {
  const nodeMap = new Map<string, ProfileModuleNode>();
  const seenParams = new Map<string, Set<string>>();

  for (const row of rows) {
    const codPerfilModulo = String(row.COD_PERFIL_MODULO ?? row.Cod_Perfil_Modulo ?? '').trim();
    if (!codPerfilModulo) continue;

    if (!nodeMap.has(codPerfilModulo)) {
      const rawPai = row.COD_PERFIL_MODULO_PAI ?? row.Cod_Perfil_Modulo_Pai;
      const parentId =
        rawPai !== null && rawPai !== undefined && String(rawPai).trim() !== ''
          ? String(rawPai).trim()
          : null;

      const rawOrdem = row.ORDEM ?? row.Ordem ?? row.NR_ORDEM;
      const parsedOrdem =
        rawOrdem !== null &&
        rawOrdem !== undefined &&
        String(rawOrdem).trim() !== '' &&
        !Number.isNaN(Number(rawOrdem))
          ? Number(rawOrdem)
          : null;

      const moduloName = String(row.MODULO ?? row.Modulo ?? '').trim();
      const tituloModulo = String(row.TITULO ?? row.Titulo ?? '').trim();

      nodeMap.set(codPerfilModulo, {
        id: codPerfilModulo,
        parentId,
        ordem: parsedOrdem,
        ModuloId: moduloName,
        Titulo: tituloModulo,
        Parametros: [],
        children: [],
      });
      seenParams.set(codPerfilModulo, new Set());
    }

    const parametro = String(row.PARAMETRO ?? row.Parametro ?? '').trim();
    if (parametro) {
      const codModParam = String(row.COD_MOD_PARAMETRO ?? row.Cod_Mod_Parametro ?? '').trim();
      const valor = String(row.VALOR_PARAMETRO ?? row.Valor_Parametro ?? '').trim();
      const descValor = String(row.DESC_VALOR_PARAMETRO ?? row.Desc_Valor_Parametro ?? '').trim();
      const dedupeKey = `${codModParam}::${parametro}::${valor}`;
      const paramSet = seenParams.get(codPerfilModulo)!;
      if (!paramSet.has(dedupeKey)) {
        paramSet.add(dedupeKey);
        nodeMap.get(codPerfilModulo)!.Parametros.push({
          Parametro: parametro,
          Valor: valor,
          Descricao: descValor,
        });
      }
    }
  }

  const roots: ProfileModuleNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && node.parentId !== node.id && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: ProfileModuleNode[]) => {
    nodes.sort(
      (a, b) =>
        (a.ordem ?? 999999) - (b.ordem ?? 999999) ||
        (Number(a.id) || 0) - (Number(b.id) || 0) ||
        a.id.localeCompare(b.id)
    );
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(roots);
  return roots;
}

export default function PerfisClinicosPage() {
  const { getCached, setCached, clearCache, activeConnInfo } = useUI();
  const [profilesData, setProfilesData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPerfilId, setSelectedPerfilId] = useState<string | null>(null);
  const [profileDetailsCache, setProfileDetailsCache] = useState<Record<string, ProfileModuleNode[]>>({});
  const [profileDetailsLoading, setProfileDetailsLoading] = useState(false);

  const activeHospitals = useMemo<HospitalRef[]>(() => {
    const list = activeConnInfo?.activeHospitals;
    if (!Array.isArray(list)) return [];
    return list.map((h) => ({
      id: h.id as number | string,
      nome: String(h.nome || ''),
      sigla: String(h.sigla || ''),
    }));
  }, [activeConnInfo?.activeHospitals]);

  const fetchProfiles = useCallback(async (force = false) => {
    const cacheKey = 'ambulatory_profiles_v2';
    if (!force) {
      const cached = getCached<Record<string, unknown>[]>(cacheKey);
      if (
        cached &&
        (cached.length === 0 ||
          'EMPRESAS_VINCULADAS' in cached[0] ||
          'TIPOS_PRESTADOR' in cached[0])
      ) {
        setProfilesData(cached);
        setError('');
        return;
      }
    } else {
      clearCache('ambulatory_profiles_');
      setProfileDetailsCache({});
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'AMBULATORY_PROFILES', forceRefresh: force })
      });
      const result = await res.json();
      if (res.ok && !result.error) {
        const rows = (result.rows || []) as Record<string, unknown>[];
        setProfilesData(rows);
        setCached(cacheKey, rows);
      } else {
        setError(result.error || 'Erro ao carregar perfis clínicos.');
      }
    } catch {
      setError('Erro de conexão ao buscar perfis clínicos.');
    } finally {
      setLoading(false);
    }
  }, [getCached, setCached, clearCache]);

  useEffect(() => {
    fetchProfiles(false);
  }, [fetchProfiles]);

  useEffect(() => {
    if (!selectedPerfilId || profileDetailsCache[selectedPerfilId]) return;

    let cancelled = false;
    const fetchDetails = async () => {
      setProfileDetailsLoading(true);
      try {
        const res = await fetch('/api/oracle/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'AMBULATORY_PROFILE_DETAILS',
            params: { CD_PERFIL: selectedPerfilId }
          })
        });
        const result = await res.json();
        if (cancelled) return;

        const rows = Array.isArray(result.rows) ? (result.rows as Record<string, unknown>[]) : [];
        const tree = buildModuleTree(rows);

        setProfileDetailsCache((prev) => ({
          ...prev,
          [selectedPerfilId]: tree
        }));
      } catch (err) {
        console.error('Erro ao carregar detalhes do perfil:', err);
      } finally {
        if (!cancelled) {
          setProfileDetailsLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedPerfilId, profileDetailsCache]);

  const handleExportPerfilCSV = () => {
    if (!selectedPerfilId || !profileDetailsCache[selectedPerfilId]) return;
    const tree = profileDetailsCache[selectedPerfilId];
    const profileRow = profilesData.find(
      (r) => String(r.COD_PERFIL ?? r.Cod_Perfil ?? '') === selectedPerfilId
    );
    const profileName = String(profileRow?.NOME_PERFIL ?? profileRow?.Nome_Perfil ?? '');
    const empresasRaw = String(profileRow?.EMPRESAS_VINCULADAS ?? profileRow?.Empresas_Vinculadas ?? '');
    const tiposRaw = String(profileRow?.TIPOS_PRESTADOR ?? profileRow?.Tipos_Prestador ?? '');

    const rows: string[][] = [
      ['ID Perfil', selectedPerfilId],
      ...(profileName ? [['Nome do Perfil', profileName]] : []),
      ...(empresasRaw ? [['Empresas Vinculadas', empresasRaw.split('|').map((s) => s.split('::')[1] || s).join(', ')]] : []),
      ...(tiposRaw ? [['Tipos de Prestador', tiposRaw.split('|').map((s) => s.split('::')[1] || s).join(', ')]] : []),
      [],
      ['Nível', 'Módulo Pai', 'Ordem', 'Código Módulo', 'Título', 'Parâmetro', 'Valor Atribuído', 'Descrição']
    ];

    const walk = (nodes: ProfileModuleNode[], level: number, parentLabel: string) => {
      for (const node of nodes) {
        const displayModId = node.ModuloId || node.id;
        const titulo = node.Titulo || `Módulo ${displayModId}`;
        const ordemStr = node.ordem !== null ? String(node.ordem) : '';

        if (!node.Parametros || node.Parametros.length === 0) {
          rows.push([
            String(level),
            parentLabel,
            ordemStr,
            displayModId,
            titulo,
            node.children.length > 0 ? '(Subsegmento / Agrupador)' : 'Sem parâmetros',
            '',
            ''
          ]);
        } else {
          for (const param of node.Parametros) {
            rows.push([
              String(level),
              parentLabel,
              ordemStr,
              displayModId,
              titulo,
              param.Parametro,
              param.Valor || 'Não definido',
              param.Descricao || ''
            ]);
          }
        }

        if (node.children.length > 0) {
          walk(node.children, level + 1, titulo);
        }
      }
    };

    walk(tree, 1, '(Raiz)');

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Perfil_${selectedPerfilId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-5">
      <div className="pb-3 border-b border-[var(--border)]">
        <PageHeader
          title="Perfis Clínicos"
          subtitle="Catálogo de perfis assistenciais do ambiente, módulos habilitados e parâmetros configurados"
          icon={Stethoscope}
          badge={
            profilesData.length > 0 ? (
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border-[var(--tint-olive-border)] bg-[var(--accent)] text-[var(--accent-ink)] font-mono"
              >
                {profilesData.length} perfis
              </Badge>
            ) : undefined
          }
          action={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchProfiles(true)}
                disabled={loading}
                className="h-8 gap-1.5"
              >
                <RefreshCw size={13} className={cn(loading && 'animate-spin text-[var(--lime)]')} />
                <span>Atualizar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 gap-1.5"
              >
                <Printer size={13} />
                <span>Imprimir</span>
              </Button>
            </>
          }
        />
      </div>

      <AmbulatoryProfilesView
        data={profilesData}
        loading={loading}
        error={error}
        selectedPerfilId={selectedPerfilId}
        setSelectedPerfilId={setSelectedPerfilId}
        profileDetailsCache={profileDetailsCache}
        profileDetailsLoading={profileDetailsLoading}
        onExportCSV={handleExportPerfilCSV}
        activeHospitals={activeHospitals}
      />
    </div>
  );
}
