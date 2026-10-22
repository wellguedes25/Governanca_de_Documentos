"use client";

import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, Database, Building2, Activity, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/hospitais', label: 'Hospitais', icon: Building2 },
  { href: '/documentos', label: 'Documentos', icon: FileText },
];

const configItems = [
  { href: '/configuracoes/conexoes', label: 'Conexões', icon: Settings },
  { href: '/configuracoes/consultas', label: 'Motor SQL', icon: Database },
];

type OracleStatus = 'unknown' | 'active' | 'inactive' | 'error';

export default function Sidebar() {
  const pathname = usePathname();
  const { docVersion } = useUI();
  const [oracleStatus, setOracleStatus] = useState<OracleStatus>('unknown');

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

  const statusConfig: Record<OracleStatus, { color: string; label: string; dot: string; bg: string }> = {
    unknown:  { color: 'text-slate-400', label: 'Checando...', dot: 'bg-slate-400 animate-pulse', bg: 'bg-slate-800' },
    active:   { color: 'text-emerald-400', label: 'Oracle Online', dot: 'bg-emerald-400 animate-pulse', bg: 'bg-emerald-950/40 border-emerald-800/40' },
    inactive: { color: 'text-amber-400', label: 'Oracle Off', dot: 'bg-amber-400', bg: 'bg-amber-950/40 border-amber-800/40' },
    error:    { color: 'text-rose-400', label: 'Erro Conexão', dot: 'bg-rose-400', bg: 'bg-rose-950/40 border-rose-800/40' },
  };
  const status = statusConfig[oracleStatus];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 fixed top-0 left-0 w-full z-50 flex items-center justify-between h-16 print:hidden text-slate-200 shadow-md transition-colors">
      
      {/* Brand & Version Badge */}
      <div className="flex items-center h-full pl-4 md:pl-6 gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-sky-600 group-hover:bg-sky-500 text-white flex items-center justify-center font-bold text-base shadow-xs shadow-sky-500/20 transition-all">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white leading-none flex items-center gap-1">
              Goverdoc <span className="text-sky-400 font-extrabold">Pro</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Governança Clínica
            </span>
          </div>
        </Link>

        {docVersion && (
          <div className="hidden sm:flex items-center ml-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/50 flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              {docVersion}
            </span>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex items-center h-full px-4 gap-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-normal transition-all whitespace-nowrap",
                isActive
                  ? "bg-sky-600/15 text-sky-400 shadow-xs border border-sky-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
        
        <div className="w-px h-5 bg-slate-800 mx-2 shrink-0 hidden md:block"></div>
        
        {configItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-normal transition-all whitespace-nowrap",
                isActive
                  ? "bg-sky-600/15 text-sky-400 shadow-xs border border-sky-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Oracle Health Status */}
      <div className="flex items-center h-full pr-4 md:pr-6 shrink-0">
        <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all shadow-xs", status.bg)}>
          <span className={cn("w-2 h-2 rounded-full shrink-0", status.dot)}></span>
          <span className={cn("hidden sm:inline font-semibold", status.color)}>
            {status.label}
          </span>
        </div>
      </div>
      
    </header>
  );
}
