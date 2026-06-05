"use client";

import { useRouter } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import { 
  Zap, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  BarChart3,
  Layers,
  Activity
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { setDocVersion } = useUI();

  const handleSelectVersion = (version: 'V2' | 'V3') => {
    setDocVersion(version);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden selection:bg-[var(--primary)] selection:text-black">
      {/* 10% Asymmetric Left Bar (Gateway Sidebar) */}
      <div className="hidden md:flex w-24 border-r border-border flex-col items-center justify-between py-8 z-10 bg-background">
        <div className="w-12 h-12 bg-foreground text-background flex items-center justify-center font-black text-xl">
          MP
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-[10px] font-black tracking-[0.3em] uppercase text-muted-foreground">
            System Selection // Gateway
          </div>
        </div>
        <div className="text-muted-foreground">
          <Activity size={24} />
        </div>
      </div>

      {/* 90% Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Editor V2 - Top Half */}
        <button 
          onClick={() => handleSelectVersion('V2')}
          className="group relative flex-1 border-b border-border bg-background overflow-hidden text-left flex items-center transition-colors duration-500 hover:bg-muted/50"
        >
          {/* Huge Background Typography */}
          <div className="absolute -left-10 -bottom-10 text-[25vw] leading-none font-black text-foreground opacity-5 tracking-tighter pointer-events-none transition-transform duration-700 group-hover:translate-x-10">
            V2
          </div>

          <div className="relative z-10 w-full px-8 md:px-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-block px-3 py-1 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest">
                Stable Release
              </div>
              <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-foreground">
                Editor <span className="text-muted-foreground">V2</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base font-medium max-w-lg uppercase tracking-tight">
                VOLUME GERAL E TELEMETRIA OPERACIONAL DOS DOCUMENTOS CLÍNICOS DO MVEDITOR 2.0 FLEX. FOCO EM INDICADORES.
              </p>
              
              <div className="flex flex-wrap gap-6 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-4 group-hover:translate-y-0">
                {[
                  { icon: <Zap size={16} />, label: 'Volume Geral' },
                  { icon: <BarChart3 size={16} />, label: 'Ranking ABC' },
                  { icon: <Building2 size={16} />, label: '7 Unidades' },
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-widest">
                    <span className="text-muted-foreground">{feat.icon}</span>
                    {feat.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4 text-muted-foreground transition-colors duration-300">
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                System_Init
              </span>
              <div className="w-16 h-16 border border-border flex items-center justify-center group-hover:border-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                <ChevronRight size={32} />
              </div>
            </div>
          </div>
        </button>

        {/* Editor V3 - Bottom Half */}
        <button 
          onClick={() => handleSelectVersion('V3')}
          className="group relative flex-1 bg-background overflow-hidden text-left flex items-center transition-colors duration-500 hover:bg-[var(--primary)] group-hover-v3"
        >
          {/* Huge Background Typography */}
          <div className="absolute -left-10 -bottom-10 text-[25vw] leading-none font-black text-foreground opacity-5 group-hover:opacity-10 tracking-tighter pointer-events-none transition-transform duration-700 group-hover:translate-x-10">
            V3
          </div>

          <div className="relative z-10 w-full px-8 md:px-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-black group-hover:text-[var(--primary)] text-[10px] font-bold uppercase tracking-widest transition-colors duration-300">
                Advanced Build
              </div>
              <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-foreground group-hover:text-black transition-colors duration-300">
                Editor <span className="text-emerald-600 dark:text-emerald-400 group-hover:text-black/50 transition-colors duration-300">V3</span>
              </h2>
              <p className="text-muted-foreground group-hover:text-black/70 text-sm md:text-base font-medium max-w-lg uppercase tracking-tight transition-colors duration-300">
                Nova arquitetura. Granularidade total. Dados consolidados e telemetria da Empresa 63.
              </p>
              
              <div className="flex flex-wrap gap-6 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-4 group-hover:translate-y-0">
                {[
                  { icon: <Activity size={16} />, label: 'Granularidade' },
                  { icon: <Layers size={16} />, label: 'Empresa 63 (HR)' },
                  { icon: <ShieldCheck size={16} />, label: 'Consolidado' },
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-foreground group-hover:text-black uppercase tracking-widest">
                    <span className="text-muted-foreground group-hover:text-black/50">{feat.icon}</span>
                    {feat.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4 text-emerald-600 dark:text-emerald-400 group-hover:text-black transition-colors duration-300">
              <span className="text-xs font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                System_Init
              </span>
              <div className="w-16 h-16 border border-emerald-500/30 group-hover:border-black flex items-center justify-center group-hover:bg-black group-hover:text-[var(--primary)] transition-all duration-300">
                <ChevronRight size={32} />
              </div>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
}
