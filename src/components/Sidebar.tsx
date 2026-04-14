"use client";

import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, Database, ChevronLeft, ChevronRight, ScanEye, BookOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';

const navItems = [
  { 
    group: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/documentos', label: 'Documentos', icon: FileText },
      { href: '/similaridade', label: 'Similaridade', icon: ScanEye },
      { href: '/auditoria-siglario', label: 'Siglário', icon: BookOpen },
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

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUI();

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
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-8 space-y-8">
        {navItems.map((section) => (
          <div key={section.group}>
            {sidebarOpen && (
              <h3 className="px-4 text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mb-3 animate-in fade-in">
                {section.group}
              </h3>
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
                        <span className="font-semibold text-sm animate-in slide-in-from-left-2">
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
      </nav>

      {/* Footer Status */}
      {sidebarOpen && (
        <div className="p-5">
          <div className="p-4 rounded-[var(--radius)] bg-[var(--accent)] border border-[var(--border)] text-[9px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold tracking-wider">ESTADO ORACLE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
            </div>
            <p className="font-mono text-slate-600">v5.5.0 Thick Mode</p>
          </div>
        </div>
      )}
    </aside>
  );
}
