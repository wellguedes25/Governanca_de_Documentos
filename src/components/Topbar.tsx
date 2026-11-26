"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  Layers,
  Database,
  UserCheck
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

type OracleStatus = 'unknown' | 'active' | 'inactive' | 'error';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Visão Geral',
  '/documentos': 'Catálogo de Documentos',
  '/perfis-clinicos': 'Perfis Clínicos',
  '/migracao': 'Governança de Migração',
  '/linhagem': 'Linhagem Global',
  '/hospitais': 'Hospitais & Unidades',
  '/similaridade': 'Auditoria Similaridade',
  '/dependencias-bi': 'Dependências BI & Indicadores',
  '/configuracoes': 'Central de Configurações',
  '/configuracoes/consultas': 'Motores SQL',
  '/configuracoes/conexoes': 'Conexões Oracle',
  '/configuracoes/usuarios': 'Usuários & Controle de Acesso',
};

export function Topbar({ onOpenMobileMenu, onOpenSearch }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, docVersion, setDocVersion, clearCache, setActiveConnInfo } = useUI();
  const [oracleStatus, setOracleStatus] = useState<OracleStatus>('unknown');
  const [sessionConnName, setSessionConnName] = useState<string>('');
  const [sessionUser, setSessionUser] = useState<{
    name: string;
    username: string;
    role: 'ADMIN' | 'ANALISTA';
  } | null>(null);

  const activeVersion = docVersion || 'V3';

  const currentLabel =
    Object.entries(ROUTE_LABELS).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] ||
    'Visão Geral';

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.session?.connectionName) {
          setSessionConnName(d.session.connectionName);
        }
        if (d.session?.username) {
          setSessionUser({
            name: d.session.userName || d.session.username,
            username: d.session.username,
            role: d.session.role === 'ADMIN' ? 'ADMIN' : 'ANALISTA',
          });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    let mounted = true;
    async function checkHealth() {
      try {
        const res = await fetch('/api/oracle/health');
        if (!res.ok) {
          if (mounted) setOracleStatus('error');
          return;
        }
        const data = await res.json();
        if (mounted) {
          setOracleStatus(data.pool?.active ? 'active' : 'inactive');
        }
      } catch {
        if (mounted) setOracleStatus('error');
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/disconnect', { method: 'POST' });
    } catch {}
    clearCache();
    setActiveConnInfo(null);
    setDocVersion(null);
    router.push('/connect');
    router.refresh();
  };

  const statusConfig: Record<OracleStatus, { dot: string; title: string; ring: string }> = {
    unknown:  { dot: 'bg-[var(--muted)] animate-pulse', title: 'Verificando Oracle...', ring: '' },
    active:   { dot: 'bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]', title: 'Oracle Online', ring: 'border-[var(--tint-olive-border)]' },
    inactive: { dot: 'bg-amber-400', title: 'Oracle Inativo', ring: 'border-amber-400/25' },
    error:    { dot: 'bg-rose-400', title: 'Erro de Conexão Oracle', ring: 'border-rose-400/30' },
  };
  const status = statusConfig[oracleStatus];

  return (
    <header className="sticky top-0 z-30 h-16 px-4 md:px-7 lg:px-9 flex items-center justify-between gap-3 print:hidden bg-[var(--canvas-bg)]/85 backdrop-blur-md border-b border-[var(--border-subtle)]/50 transition-colors">
      {/* Esquerda: Menu Mobile + Mini Space Pills (no modo Dock) + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden w-9 h-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground)] cursor-pointer shrink-0"
          title="Abrir menu de navegação"
        >
          <Menu size={17} />
        </button>

        {/* Mini-pílulas de ambiente quando o Dock está recolhido — igual à imagem 2 do Sylva */}
        {!sidebarOpen && (
          <div className="hidden lg:inline-flex items-center gap-1 p-1 rounded-full sylva-pill shrink-0">
            <button
              type="button"
              onClick={() => setDocVersion('V3')}
              title="Editor 3.0 (HTML5)"
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
                activeVersion === 'V3'
                  ? "bg-[var(--lime)] text-[var(--lime-ink)] shadow-xs scale-105"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Sparkles size={13} strokeWidth={2.3} />
            </button>
            <button
              type="button"
              onClick={() => setDocVersion('V2')}
              title="Editor 2.0 (Flex)"
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
                activeVersion === 'V2'
                  ? "bg-[var(--coral)] text-[#1A1311] shadow-xs scale-105"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              <Layers size={13} strokeWidth={2.3} />
            </button>
          </div>
        )}

        {/* Breadcrumb limpo estilo "Fjellgrønn / Reports" */}
        <div className="flex items-center gap-2 text-[13px] min-w-0 truncate">
          <span className="font-medium text-[var(--foreground-secondary)] truncate">
            Editor {activeVersion === 'V3' ? '3.0' : '2.0'}
          </span>
          <span className="text-[var(--muted)]">/</span>
          <span className="font-semibold text-[var(--foreground)] truncate">
            {currentLabel}
          </span>
        </div>
      </div>

      {/* Direita: Busca Global ⌘K + Botão Lime Primário + Status Oracle + Logout */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center justify-between gap-3 w-44 sm:w-64 lg:w-72 h-10 px-3.5 rounded-full sylva-pill text-left text-[12.5px] text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer group"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search size={14} className="text-[var(--muted)] group-hover:text-[var(--foreground)] shrink-0" />
            <span className="truncate">Buscar docs, tags, SQL...</span>
          </span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--card-subtle)] border border-[var(--border)] text-[10px] font-mono font-semibold text-[var(--muted)] shrink-0">
            ⌘K
          </kbd>
        </button>

        {/* CTA Neon Lime igual ao "+ New" do Sylva */}
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full sylva-lime-btn text-[12.5px] font-bold tracking-tight shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span className="hidden sm:inline">Catálogo</span>
        </Link>

        {/* Usuário Logado & Perfil */}
        {sessionUser && (
          sessionUser.role === 'ADMIN' ? (
            <Link
              href="/configuracoes?tab=usuarios"
              title={`Gerenciar usuários (${sessionUser.name} • ADMIN)`}
              className="hidden xl:inline-flex items-center gap-2 h-10 px-3 rounded-full sylva-pill text-[11.5px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
            >
              <UserCheck size={13} className="text-[var(--accent-ink)] shrink-0" />
              <span className="truncate max-w-[110px] font-semibold text-[var(--foreground)]">
                {sessionUser.name}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)]">
                ADMIN
              </span>
            </Link>
          ) : (
            <div
              title={`${sessionUser.name} • ANALISTA`}
              className="hidden xl:inline-flex items-center gap-2 h-10 px-3 rounded-full sylva-pill text-[11.5px] font-medium text-[var(--foreground-secondary)]"
            >
              <UserCheck size={13} className="text-[var(--muted)] shrink-0" />
              <span className="truncate max-w-[110px] font-semibold text-[var(--foreground)]">
                {sessionUser.name}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border tone-info">
                ANALISTA
              </span>
            </div>
          )
        )}

        {/* Indicador Oracle / Instância */}
        {sessionUser?.role === 'ADMIN' ? (
          <Link
            href="/configuracoes?tab=conexoes"
            title={sessionConnName ? `${status.title} — ${sessionConnName}` : status.title}
            className={cn(
              "relative h-10 px-3 rounded-full sylva-pill flex items-center gap-2 text-[11.5px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)]",
              status.ring
            )}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", status.dot)} />
            <Database size={13} className="hidden md:inline text-[var(--muted)]" />
            <span className="hidden md:inline font-mono text-[11px] max-w-[110px] truncate">
              {sessionConnName || (oracleStatus === 'active' ? 'Oracle' : 'DB')}
            </span>
          </Link>
        ) : (
          <div
            title={sessionConnName ? `${status.title} — ${sessionConnName}` : status.title}
            className={cn(
              "relative h-10 px-3 rounded-full sylva-pill flex items-center gap-2 text-[11.5px] font-medium text-[var(--foreground-secondary)]",
              status.ring
            )}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", status.dot)} />
            <Database size={13} className="hidden md:inline text-[var(--muted)]" />
            <span className="hidden md:inline font-mono text-[11px] max-w-[110px] truncate">
              {sessionConnName || (oracleStatus === 'active' ? 'Oracle' : 'DB')}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleDisconnect}
          title="Desconectar ou Trocar Base de Dados"
          className="h-10 w-10 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-rose-400 hover:border-rose-400/30 cursor-pointer"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
