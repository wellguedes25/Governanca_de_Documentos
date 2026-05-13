"use client";

import { useRouter } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import { 
  FileText, 
  Zap, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  BarChart3,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const router = useRouter();
  const { setDocVersion } = useUI();

  const handleSelectVersion = (version: 'V2' | 'V3') => {
    setDocVersion(version);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[var(--primary)]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl w-full relative z-10 space-y-12">
        {/* Branding & Welcome */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 mb-4">
            <Badge className="bg-[var(--primary)] text-white border-none text-[10px] font-black tracking-widest uppercase">
              System Selection
            </Badge>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Oracle ACSC Gateway
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic">
            Medlytics <span className="text-[var(--primary)]">Pro</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-500 font-bold uppercase tracking-tight text-sm">
            Selecione a versão do ecossistema de dados para iniciar o monitoramento e auditoria clínica.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          {/* Editor V2 Card */}
          <button 
            onClick={() => handleSelectVersion('V2')}
            className="group relative bg-white border border-slate-200 p-8 rounded-[40px] text-left transition-all hover:border-[var(--primary)] hover:shadow-2xl hover:shadow-[var(--primary)]/10 hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Layers size={120} className="text-slate-900" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-500 shadow-inner">
                <FileText size={32} />
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Editor V2</h2>
                  <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-400 group-hover:border-[var(--primary-light)] group-hover:text-[var(--primary-light)]">STABLE</Badge>
                </div>
                <p className="text-slate-500 text-xs font-bold leading-relaxed uppercase">
                  Versão clássica focada em volume geral e telemetria operacional padrão de 90 dias.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Zap size={14} />, label: 'Volume Geral' },
                  { icon: <BarChart3 size={14} />, label: 'Ranking ABC' },
                  { icon: <Building2 size={14} />, label: '7 Unidades' },
                  { icon: <ShieldCheck size={14} />, label: 'Assinaturas' }
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="text-[var(--primary-light)]">{feat.icon}</span>
                    {feat.label}
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between text-[var(--primary)]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">Acessar Sistema</span>
                <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          </button>

          {/* Editor V3 Card */}
          <button 
            onClick={() => handleSelectVersion('V3')}
            className="group relative bg-slate-900 border border-slate-800 p-8 rounded-[40px] text-left transition-all hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={120} className="text-white" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner border border-white/5">
                <Zap size={32} />
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Editor V3</h2>
                  <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black animate-pulse">ADVANCED</Badge>
                </div>
                <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase">
                  Nova arquitetura com dados consolidados, detalhamento granular por unidade e empresa 63.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Zap size={14} />, label: 'Granularidade' },
                  { icon: <BarChart3 size={14} />, label: 'Empresa 63 (HR)' },
                  { icon: <Building2 size={14} />, label: 'Consolidado' },
                  { icon: <ShieldCheck size={14} />, label: 'Versão Ativa' }
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="text-emerald-500">{feat.icon}</span>
                    {feat.label}
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between text-emerald-500">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">Acessar Sistema</span>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-8 animate-in fade-in duration-1000 delay-700">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Medlytics Pro • Dashboard Analytics v3.1.0 • 2026
          </p>
        </div>
      </div>
    </div>
  );
}
