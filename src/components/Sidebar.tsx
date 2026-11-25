"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  ArrowLeftRight,
  GitFork,
  Building2,
  Activity,
  Database,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sun,
  Moon,
  Sparkles,
  Layers,
  BarChart3,
  Users
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const mainMenuItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutGrid },
  { href: '/documentos', label: 'Catálogo', icon: FileText },
  { href: '/migracao', label: 'Migração', icon: ArrowLeftRight },
  { href: '/linhagem', label: 'Linhagem', icon: GitFork },
  { href: '/hospitais', label: 'Unidades', icon: Building2 },
  { href: '/similaridade', label: 'Auditoria Similaridade', icon: Activity },
  { href: '/dependencias-bi', label: 'Dependências BI', icon: BarChart3 },
];

const infraMenuItems = [
  { href: '/configuracoes/consultas', label: 'Motores SQL', icon: Database },
  { href: '/configuracoes/conexoes', label: 'Conexões Oracle', icon: Settings },
  { href: '/configuracoes/usuarios', label: 'Usuários & Acesso', icon: Users },
];

const COMPACT_ROUTES = ['/linhagem', '/migracao'];

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, docVersion, setDocVersion, theme, toggleTheme } = useUI();
  const lastPathnameRef = useRef<string | null>(null);
  const [userRole, setUserRole] = useState<'ADMIN' | 'ANALISTA' | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (mounted && d?.session?.role) {
          setUserRole(d.session.role);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Auto-recolhe para Dock ao entrar em telas horizontais densas (/linhagem e /migracao)
  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;

    const shouldCollapse = COMPACT_ROUTES.some((route) => pathname.startsWith(route));
    if (shouldCollapse) {
      setSidebarOpen(false);
    }
  }, [pathname, setSidebarOpen]);

  const activeVersion = docVersion || 'V3';

  const renderExpandedContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full justify-between py-4 px-3.5 select-none overflow-y-auto scrollbar-thin">
      <div className="space-y-5">
        {/* Branding Header — Estilo Sylva */}
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            href="/"
            onClick={() => isMobile && onCloseMobile?.()}
            className="flex items-center gap-2.5 min-w-0 group"
            title="Voltar à Seleção de Editor (V2 / V3)"
          >
            <Image
              src="/brand/goverdoc-icon.png"
              alt="Goverdoc Pro"
              width={32}
              height={32}
              className="w-8 h-8 rounded-[9px] object-contain shadow-[0_4px_14px_rgba(204,243,82,0.22)] ring-1 ring-[var(--border-strong)] group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="flex items-baseline gap-1.5 truncate">
              <span className="text-[15px] font-bold tracking-tight text-[var(--foreground)] font-[family-name:var(--font-manrope)]">
                Goverdoc
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--muted)]">
                PRO
              </span>
            </div>
          </Link>

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
              title="Fechar menu"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer shrink-0"
              title="Dobrar em Dock (⌘B)"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        {/* Seção AMBIENTES (Estilo SPACES do Sylva) */}
        <div className="space-y-1.5">
          <div className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            Ambientes
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setDocVersion('V3')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-2xl text-left cursor-pointer border transition-all",
                activeVersion === 'V3'
                  ? "bg-[var(--card-hover)] border-[var(--border-strong)] shadow-xs"
                  : "bg-transparent border-transparent hover:bg-[var(--card-subtle)]"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--lime)] text-[var(--lime-ink)] flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={17} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">
                  Editor 3.0
                </div>
                <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                  HTML5 · Motor Atual
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDocVersion('V2')}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-2xl text-left cursor-pointer border transition-all",
                activeVersion === 'V2'
                  ? "bg-[var(--card-hover)] border-[var(--border-strong)] shadow-xs"
                  : "bg-transparent border-transparent hover:bg-[var(--card-subtle)]"
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--coral)] text-[#1A1311] flex items-center justify-center shrink-0 shadow-xs">
                <Layers size={17} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">
                  Editor 2.0
                </div>
                <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                  Flex · Legado MV
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Seção MENU */}
        <div className="space-y-1.5">
          <div className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            Menu
          </div>
          <nav className="space-y-0.5">
            {mainMenuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && onCloseMobile?.()}
                  className={cn(
                    "flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all group",
                    isActive
                      ? "bg-[var(--card-hover)] text-[var(--foreground)] font-semibold border border-[var(--border)]"
                      : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-subtle)] font-medium border border-transparent"
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.1 : 1.75}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-[var(--foreground)]" : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] shadow-[0_0_8px_var(--lime)] shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Rodapé — Infraestrutura (Apenas ADMIN) + Toggle Dark Mode estilo Sylva */}
      <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-1">
        {userRole === 'ADMIN' && infraMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && onCloseMobile?.()}
              className={cn(
                "flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[12.5px] transition-all",
                isActive
                  ? "bg-[var(--card-hover)] text-[var(--foreground)] font-semibold"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-subtle)] font-medium"
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon size={15} strokeWidth={1.8} className="shrink-0 text-[var(--muted)]" />
                <span className="truncate">{item.label}</span>
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] shrink-0" />
              )}
            </Link>
          );
        })}

        {/* Dark mode switch igual à screenshot 1 do Sylva */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-subtle)] cursor-pointer"
        >
          <span className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Sun size={15} strokeWidth={1.8} className="text-[var(--muted)]" />
            ) : (
              <Moon size={15} strokeWidth={1.8} className="text-[var(--muted)]" />
            )}
            <span>Dark mode</span>
          </span>
          <span
            className={cn(
              "w-9 h-5 rounded-full p-0.5 flex items-center transition-colors",
              theme === 'dark' ? "bg-[var(--lime)] justify-end" : "bg-[var(--border-strong)] justify-start"
            )}
          >
            <span
              className={cn(
                "w-4 h-4 rounded-full shadow-xs transition-transform",
                theme === 'dark' ? "bg-[#151513]" : "bg-white"
              )}
            />
          </span>
        </button>
      </div>
    </div>
  );

  // Modo Dock Vertical Flutuante — fiel à screenshot 2 do Sylva
  const renderDockContent = () => (
    <div className="flex flex-col items-center justify-between h-full py-3 px-1.5 select-none">
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          title="Expandir sidebar (⌘B)"
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] cursor-pointer mb-1"
        >
          <PanelLeftOpen size={17} strokeWidth={1.8} />
        </button>

        {mainMenuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "relative w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isActive
                  ? "bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border-strong)] shadow-xs"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-subtle)]"
              )}
            >
              <Icon size={17} strokeWidth={isActive ? 2.1 : 1.75} />
              {isActive && (
                <span className="absolute -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-[var(--border-subtle)]">
        {userRole === 'ADMIN' && infraMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "relative w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isActive
                  ? "bg-[var(--card-hover)] text-[var(--foreground)] border border-[var(--border-strong)]"
                  : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card-subtle)]"
              )}
            >
              <Icon size={16} strokeWidth={1.8} />
            </Link>
          );
        })}

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--lime)] hover:bg-[var(--card-subtle)] cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar <-> Folding Floating Dock */}
      <div className="hidden lg:flex shrink-0 print:hidden pl-3.5 py-3.5">
        <aside
          className={cn(
            "sticky sylva-spring z-40 flex flex-col",
            sidebarOpen
              ? "top-3.5 h-[calc(100vh-1.75rem)] w-[252px] rounded-[24px] sylva-sidebar"
              : "top-[76px] h-fit max-h-[calc(100vh-6rem)] w-[58px] rounded-[30px] sylva-dock"
          )}
        >
          {sidebarOpen ? renderExpandedContent(false) : renderDockContent()}
        </aside>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm flex"
          onClick={onCloseMobile}
        >
          <aside
            className="w-72 max-w-[85vw] h-full sylva-sidebar rounded-r-[24px]"
            onClick={(e) => e.stopPropagation()}
          >
            {renderExpandedContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
