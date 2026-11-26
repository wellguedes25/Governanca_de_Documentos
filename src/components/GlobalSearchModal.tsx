"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  LayoutGrid,
  FileText,
  ArrowLeftRight,
  GitFork,
  Building2,
  Activity,
  Database,
  Settings,
  Users,
  ArrowRight,
  CornerDownLeft,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchAction {
  id: string;
  label: string;
  description: string;
  href: string;
  category: 'Ação Direta' | 'Módulo';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const MODULE_ITEMS: SearchAction[] = [
  {
    id: 'mod-dashboard',
    label: 'Visão Geral de Governança',
    description: 'Cockpit executivo, KPIs clínicos, Curva ABC e aderência',
    href: '/dashboard',
    category: 'Módulo',
    icon: LayoutGrid,
  },
  {
    id: 'mod-documentos',
    label: 'Catálogo de Documentos',
    description: 'Matriz completa de modelos clínicos, campos e perfis',
    href: '/documentos',
    category: 'Módulo',
    icon: FileText,
  },
  {
    id: 'mod-perfis-clinicos',
    label: 'Perfis Clínicos',
    description: 'Perfis assistenciais do ambiente, módulos e parâmetros',
    href: '/perfis-clinicos',
    category: 'Módulo',
    icon: Stethoscope,
  },
  {
    id: 'mod-migracao',
    label: 'Governança de Migração',
    description: 'Esteira Kanban V2 Flex ➔ V3 HTML5, backlog e prazos',
    href: '/migracao',
    category: 'Módulo',
    icon: ArrowLeftRight,
  },
  {
    id: 'mod-linhagem',
    label: 'Linhagem Global',
    description: 'Grafo interativo de dependências SQL, V2/V3 e auditoria',
    href: '/linhagem',
    category: 'Módulo',
    icon: GitFork,
  },
  {
    id: 'mod-hospitais',
    label: 'Hospitais & Unidades',
    description: 'Produção clínica e cumprimento de SLA por unidade',
    href: '/hospitais',
    category: 'Módulo',
    icon: Building2,
  },
  {
    id: 'mod-similaridade',
    label: 'Auditoria NLP (Similaridade)',
    description: 'Detecção de cópia e cola e redundância em prontuários',
    href: '/similaridade',
    category: 'Módulo',
    icon: Activity,
  },
  {
    id: 'mod-conexoes',
    label: 'Configurações · Conexões Oracle',
    description: 'Instâncias DBAMV, strings de conexão e Instant Client',
    href: '/configuracoes?tab=conexoes',
    category: 'Módulo',
    icon: Settings,
  },
  {
    id: 'mod-consultas',
    label: 'Configurações · Motores SQL',
    description: 'Queries V2/V3, KPIs, parâmetros e mapeamento de instituições',
    href: '/configuracoes?tab=v3',
    category: 'Módulo',
    icon: Database,
  },
  {
    id: 'mod-usuarios',
    label: 'Configurações · Usuários & Acesso',
    description: 'Contas do portal, perfis RBAC e permissões',
    href: '/configuracoes?tab=usuarios',
    category: 'Módulo',
    icon: Users,
  },
];

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  if (!open) return null;
  return <GlobalSearchModalBody onClose={onClose} />;
}

function GlobalSearchModalBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();

  const results = useMemo<SearchAction[]>(() => {
    const directActions: SearchAction[] = [];

    if (trimmed) {
      const encoded = encodeURIComponent(trimmed);
      directActions.push({
        id: 'act-docs',
        label: `Buscar "${trimmed}" no Catálogo de Documentos`,
        description: 'Filtrar por código MV, nome clínico ou identificador',
        href: `/documentos?search=${encoded}`,
        category: 'Ação Direta',
        icon: FileText,
      });
      directActions.push({
        id: 'act-migracao',
        label: `Buscar "${trimmed}" na Governança de Migração`,
        description: 'Filtrar demandas Kanban, código Flex ou chamado LECOM',
        href: `/migracao?search=${encoded}`,
        category: 'Ação Direta',
        icon: ArrowLeftRight,
      });

      if (/^\d+$/.test(trimmed)) {
        directActions.push({
          id: 'act-linhagem',
          label: `Focar Doc ${trimmed} no Grafo de Linhagem`,
          description: 'Abrir linhagem centrada nas dependências deste documento',
          href: `/linhagem?focus=${encoded}`,
          category: 'Ação Direta',
          icon: GitFork,
        });
      }
    }

    const lower = trimmed.toLowerCase();
    const filteredModules = !lower
      ? MODULE_ITEMS
      : MODULE_ITEMS.filter(
          (item) =>
            item.label.toLowerCase().includes(lower) ||
            item.description.toLowerCase().includes(lower)
        );

    return [...directActions, ...filteredModules];
  }, [trimmed]);

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleNavigate(results[0].href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/65 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl sylva-dock rounded-[24px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--lime)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar código MV (ex: 382), Tag, documento ou módulo..."
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[55vh] overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--muted)]">
              Nenhum módulo correspondente encontrado.
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all cursor-pointer group border",
                    idx === 0
                      ? "bg-[var(--card-hover)] border-[var(--border-strong)]"
                      : "border-transparent hover:bg-[var(--card-subtle)]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                        item.category === 'Ação Direta'
                          ? "bg-[var(--lime)] text-[var(--lime-ink)] border-[var(--lime)]"
                          : "bg-[var(--card-subtle)] text-[var(--foreground)] border-[var(--border)]"
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                          {item.label}
                        </span>
                        <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--card-subtle)] border border-[var(--border)] text-[var(--muted)] shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[var(--muted)] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-[var(--muted)] group-hover:text-[var(--lime)] group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer Dicas */}
        <div className="px-5 py-3 bg-[var(--card-subtle)] border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft size={11} />
              <span>Enter para abrir</span>
            </span>
            <span>·</span>
            <span>Esc para fechar</span>
            <span>·</span>
            <span>⌘B alterna o Dock</span>
          </div>
          <span className="font-mono font-bold text-[var(--lime)]">⌘K</span>
        </div>
      </div>
    </div>
  );
}
