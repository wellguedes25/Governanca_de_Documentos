"use client";

import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, Database, ChevronLeft, ChevronRight, ScanEye } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUI } from '@/context/UIContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUI();

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-[var(--border)] h-screen fixed left-0 top-0 transition-all duration-300 z-50 flex flex-col shadow-xl shadow-slate-200/40 overflow-hidden print:hidden`}>
      <div className={`p-6 border-b border-[var(--border)] flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
        {sidebarOpen && (
          <h1 className="text-xl font-black bg-gradient-to-r from-[var(--primary)] to-emerald-600 bg-clip-text text-transparent italic animate-in slide-in-from-left-2 transition-all">
            DocOracle Pro
          </h1>
        )}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-slate-500 hover:text-[var(--primary)] transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-8">
        <div>
          {sidebarOpen && (
            <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 animate-in fade-in">Principal</h3>
          )}
          <ul className="space-y-2">
            <li>
              <Link href="/" title={!sidebarOpen ? 'Dashboard' : ''} className={`flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] transition-all ${pathname === '/' ? 'bg-[var(--primary)] text-white' : 'text-slate-500 hover:bg-[var(--accent)] hover:text-[var(--primary)]'} ${!sidebarOpen && 'justify-center'}`}>
                <LayoutDashboard size={18} className="shrink-0" />
                {sidebarOpen && <span className="font-semibold text-sm animate-in slide-in-from-left-2">Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link href="/documentos" title={!sidebarOpen ? 'Documentos' : ''} className={`flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] transition-all ${pathname === '/documentos' ? 'bg-[var(--primary)] text-white' : 'text-slate-500 hover:bg-[var(--accent)] hover:text-[var(--primary)]'} ${!sidebarOpen && 'justify-center'}`}>
                <FileText size={18} className="shrink-0" />
                {sidebarOpen && <span className="font-semibold text-sm animate-in slide-in-from-left-2">Documentos</span>}
              </Link>
            </li>
            <li>
              <Link href="/similaridade" title={!sidebarOpen ? 'Similaridade' : ''} className={`flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius)] transition-all ${pathname === '/similaridade' ? 'bg-[var(--primary)] text-white' : 'text-slate-500 hover:bg-[var(--accent)] hover:text-[var(--primary)]'} ${!sidebarOpen && 'justify-center'}`}>
                <ScanEye size={18} className="shrink-0" />
                {sidebarOpen && <span className="font-semibold text-sm animate-in slide-in-from-left-2">Similaridade</span>}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          {sidebarOpen && (
            <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 animate-in fade-in">Configurações</h3>
          )}
          <ul className="space-y-1">
            <li>
              <Link href="/configuracoes/conexoes" title={!sidebarOpen ? 'Conexões' : ''} className={`flex items-center gap-3 px-4 py-2 rounded-[var(--radius)] transition-all ${pathname === '/configuracoes/conexoes' ? 'bg-[var(--primary)] text-white' : 'text-slate-500 hover:bg-[var(--accent)] hover:text-[var(--primary)]'} ${!sidebarOpen && 'justify-center'}`}>
                <Settings size={18} className="shrink-0" />
                {sidebarOpen && <span className="font-semibold text-sm animate-in slide-in-from-left-2">Infra de Conexão</span>}
              </Link>
            </li>
            <li>
              <Link href="/configuracoes/consultas" title={!sidebarOpen ? 'Motor SQL' : ''} className={`flex items-center gap-3 px-4 py-2 rounded-[var(--radius)] transition-all ${pathname === '/configuracoes/consultas' ? 'bg-[var(--primary)] text-white' : 'text-slate-500 hover:bg-[var(--accent)] hover:text-[var(--primary)]'} ${!sidebarOpen && 'justify-center'}`}>
                <Database size={18} className="shrink-0" />
                {sidebarOpen && <span className="font-semibold text-sm animate-in slide-in-from-left-2">Motor SQL</span>}
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {sidebarOpen && (
        <div className="p-6">
          <div className="p-4 rounded-[var(--radius)] bg-[var(--accent)] border border-[var(--border)] text-[9px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold tracking-wider">ESTADO ORACLE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <p className="font-mono text-slate-600">v5.5.0 Thick Mode</p>
          </div>
        </div>
      )}
    </aside>
  );
}
