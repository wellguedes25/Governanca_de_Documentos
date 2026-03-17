"use client";

import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUI } from '@/context/UIContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUI();

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[var(--background)] border-r border-[var(--border)] h-screen fixed left-0 top-0 transition-all duration-300 z-50 flex flex-col shadow-2xl shadow-black/50 overflow-hidden print:hidden`}>
      <div className={`p-6 border-b border-[var(--border)] flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
        {sidebarOpen && (
          <h1 className="text-xl font-black bg-gradient-to-r from-[var(--primary)] to-emerald-300 bg-clip-text text-transparent italic animate-in slide-in-from-left-2 transition-all">
            DocOracle Pro
          </h1>
        )}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg bg-[var(--card)] text-slate-400 hover:text-[var(--foreground)] transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-8">
        <div>
          {sidebarOpen && (
            <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 animate-in fade-in">Principal</h3>
          )}
          <ul className="space-y-2">
            <li>
              <Link href="/" title={!sidebarOpen ? 'Dashboard' : ''} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'text-slate-400 hover:bg-[var(--card)] hover:text-slate-200'} ${!sidebarOpen && 'justify-center'}`}>
                <LayoutDashboard size={20} className="shrink-0" />
                {sidebarOpen && <span className="font-medium animate-in slide-in-from-left-2">Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link href="/documentos" title={!sidebarOpen ? 'Documentos' : ''} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/documentos' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'text-slate-400 hover:bg-[var(--card)] hover:text-slate-200'} ${!sidebarOpen && 'justify-center'}`}>
                <FileText size={20} className="shrink-0" />
                {sidebarOpen && <span className="font-medium animate-in slide-in-from-left-2">Documentos</span>}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          {sidebarOpen && (
            <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 animate-in fade-in">Config</h3>
          )}
          <ul className="space-y-2">
            <li>
              <Link href="/configuracoes/consultas" title={!sidebarOpen ? 'SQL' : ''} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/configuracoes/consultas' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'text-slate-400 hover:bg-[var(--card)] hover:text-slate-200'} ${!sidebarOpen && 'justify-center'}`}>
                <Database size={20} className="shrink-0" />
                {sidebarOpen && <span className="font-medium animate-in slide-in-from-left-2 text-sm">Queries & SQL</span>}
              </Link>
            </li>
            <li>
              <Link href="/configuracoes/conexoes" title={!sidebarOpen ? 'Conexões' : ''} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/configuracoes/conexoes' ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'text-slate-400 hover:bg-[var(--card)] hover:text-slate-200'} ${!sidebarOpen && 'justify-center'}`}>
                <Settings size={20} className="shrink-0" />
                {sidebarOpen && <span className="font-medium animate-in slide-in-from-left-2 text-sm">Conexões</span>}
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {sidebarOpen && (
        <div className="p-6">
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[10px] text-slate-500 space-y-2">
            <div className="flex items-center justify-between">
              <span>ESTADO ORACLE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"></span>
            </div>
            <p className="font-mono text-[var(--foreground)]/60">Thick v5.5.0</p>
          </div>
        </div>
      )}
    </aside>
  );
}
