"use client";

import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, Database, ChevronLeft, ChevronRight, ScanEye, BookOpen, Building2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const navItems = [
  {
    group: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/hospitais', label: 'Hospitais', icon: Building2 },
      { href: '/documentos', label: 'Documentos', icon: FileText },
      { href: '/similaridade', label: 'Similaridade', icon: ScanEye },
      { href: '/siglario', label: 'Siglário', icon: BookOpen },
    ]
  },
  {
    group: 'Configurações',
    items: [
      { href: '/configuracoes/conexoes', label: 'Infra de Conexão', icon: Settings },
      { href: '/configuracoes/consultas', label: 'Motor SQL', icon: Database },
    ]
  }
];

type OracleStatus = 'unknown' | 'active' | 'inactive' | 'error';

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, docVersion } = useUI();

  const [oracleStatus, setOracleStatus] = useState<OracleStatus>('unknown');
  const [connName, setConnName] = useState<string>('');

  // Verifica o status real do pool Oracle a cada 30 segundos
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
          setConnName(data.connection?.name || '');
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

  const statusConfig: Record<OracleStatus, { color: string; label: string; dot: string }> = {
    unknown:  { color: 'text-slate-400',  label: 'Verificando...',  dot: 'bg-slate-300 animate-pulse' },
    active:   { color: 'text-emerald-600', label: 'Pool Ativo',     dot: 'bg-emerald-500 animate-pulse' },
    inactive: { color: 'text-amber-600',  label: 'Pool Inativo',    dot: 'bg-amber-400' },
    error:    { color: 'text-rose-600',   label: 'Erro de Conexão', dot: 'bg-rose-500' },
  };

  const status = statusConfig[oracleStatus];

  return (
    <aside className={cn(
      "bg-white border-r border-[var(--border)] h-screen fixed left-0 top-0 z-50 flex flex-col overflow-hidden print:hidden",
      "shadow-[var(--shadow-lg)] transition-all duration-300",
      sidebarOpen ? 'w-64' : 'w-20'
    )}>
      {/* Logo */}
      <div className="p-5 py-8 border-b border-[var(--border)] flex flex-col items-center justify-center min-h-[120px] relative">
        <div className={cn(
          "flex items-center justify-center transition-all duration-500 animate-in zoom-in-95",
          sidebarOpen ? 'w-48' : 'w-12'
        )}>
          <img
            src="/brand/logo.png"
            alt="Medlytics Pro"
            className="w-full h-auto object-contain transition-transform hover:scale-105 duration-300"
          />
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute -right-0 top-2 p-1.5 rounded-l-[var(--radius)] bg-slate-50 border border-slate-200",
            "text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5",
            "transition-all cursor-pointer"
          )}
          title={sidebarOpen ? "Recolher Menu" : "Expandir Menu"}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {docVersion && (
          <div className={cn(
            "mt-4 flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-700 shadow-lg animate-in fade-in zoom-in-95",
            !sidebarOpen && "px-1.5"
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {sidebarOpen ? (
              <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{docVersion} Mode</span>
            ) : (
              <span className="text-[9px] font-black text-white">{docVersion}</span>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-8 space-y-8">
        {navItems.map((section) => (
          <div key={section.group}>
            {sidebarOpen && (
              <h4 className="px-4 text-[11px] font-extrabold text-[var(--muted)] uppercase tracking-[0.2em] mb-3 animate-in fade-in font-inter">
                {section.group}
              </h4>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!sidebarOpen ? item.label : ''}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] transition-all cursor-pointer group/link",
                        isActive
                          ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                          : "text-slate-500 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]",
                        !sidebarOpen && 'justify-center'
                      )}
                    >
                      <Icon size={18} className={cn(
                        "shrink-0 transition-transform",
                        !isActive && "group-hover/link:scale-110"
                      )} />
                      {sidebarOpen && (
                        <span className="font-bold text-xs tracking-tight animate-in slide-in-from-left-2">
                          {item.label}
                        </span>
                      )}
                      {isActive && sidebarOpen && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        
        {/* Switch Version Action */}
        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/"
            title={!sidebarOpen ? 'Trocar Versão' : ''}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] transition-all cursor-pointer group/link",
              "text-slate-400 hover:bg-rose-50 hover:text-rose-600",
              !sidebarOpen && 'justify-center'
            )}
          >
            <LayoutDashboard size={18} className="shrink-0 transition-transform group-hover/link:rotate-12" />
            {sidebarOpen && (
              <span className="font-bold text-xs tracking-tight">Trocar Versão</span>
            )}
          </Link>
        </div>
      </nav>

      {/* Footer Status — status real do pool Oracle */}
      {sidebarOpen && (
        <div className="p-5">
          <div className="p-4 rounded-[var(--radius)] bg-[var(--accent)] border border-[var(--border)] text-[9px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold tracking-wider">ESTADO ORACLE</span>
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
            </div>
            <p className={cn('font-mono font-bold text-[10px]', status.color)}>
              {status.label}
            </p>
            {connName && (
              <p className="font-mono text-slate-500 truncate" title={connName}>
                {connName}
              </p>
            )}
            <p className="font-mono text-slate-400">v5.5.0 Thick Mode</p>
          </div>
        </div>
      )}
    </aside>
  );
}
