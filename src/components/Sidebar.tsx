"use client";

import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, Database, Building2 } from 'lucide-react';
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

  const statusConfig: Record<OracleStatus, { color: string; label: string; dot: string }> = {
    unknown:  { color: 'text-muted',  label: 'CHK',  dot: 'bg-zinc-500 animate-pulse' },
    active:   { color: 'text-[var(--primary)]', label: 'ON',   dot: 'bg-[var(--primary)] animate-pulse' },
    inactive: { color: 'text-amber-500',  label: 'OFF',  dot: 'bg-amber-500' },
    error:    { color: 'text-red-500',    label: 'ERR',  dot: 'bg-red-500' },
  };
  const status = statusConfig[oracleStatus];

  return (
    <header className="bg-[#0A1118] border-b border-white/5 fixed top-0 left-0 w-full z-50 flex items-center justify-between h-16 print:hidden font-mono text-white shadow-lg">
      
      {/* Brand & Mode */}
      <div className="flex items-center h-full">
        <Link href="/" className="flex items-center justify-center w-16 h-full bg-[var(--primary)] text-white font-black text-xl hover:bg-white hover:text-black transition-colors">
          MP
        </Link>
        <div className="hidden md:flex items-center px-6 border-r border-white/5 h-full">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[var(--primary)] animate-pulse"></div>
            {docVersion}
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="hidden md:flex items-center h-full flex-1 px-4 gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
                isActive
                  ? "text-white border-[var(--primary)] bg-white/5"
                  : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
        
        <div className="w-px h-6 bg-white/10 mx-2 shrink-0"></div>
        
        {configItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
                isActive
                  ? "text-white border-[var(--primary)] bg-white/5"
                  : "text-slate-400 border-transparent hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center h-full border-l border-white/5 px-6 gap-3 group cursor-default shrink-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hidden lg:block">
          ORACLE
        </span>
        <div className={cn("w-2 h-2", status.dot)}></div>
        <span className={cn("text-[10px] font-black", status.color)}>
          {status.label}
        </span>
      </div>
      
    </header>
  );
}
