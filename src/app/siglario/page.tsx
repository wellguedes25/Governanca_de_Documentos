"use client";

import { useState, useEffect } from 'react';
import { BookOpen, ShieldAlert, Library } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import AuditoriaTab from './AuditoriaTab';
import DicionarioTab from './DicionarioTab';

type Tab = 'auditoria' | 'dicionario';

export default function SiglarioPage() {
  const { docVersion } = useUI();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dicionario');

  // Proteção de rota
  useEffect(() => {
    const savedVersion = sessionStorage.getItem('app_doc_version');
    if (!docVersion && !savedVersion) {
      router.push('/');
    }
  }, [docVersion, router]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'dicionario', label: 'Dicionário', icon: <Library size={16} />, desc: 'Cadastro de siglas permitidas e proibidas' },
    { id: 'auditoria', label: 'Auditoria', icon: <ShieldAlert size={16} />, desc: 'Detecção de infrações em laudos clínicos' },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700 pb-24 text-slate-800">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic tracking-tighter">
            <BookOpen className="text-[var(--primary)]" size={32} />
            Siglário Clínico
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
            Gestão do dicionário de siglas e auditoria de conformidade em laudos.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-[var(--radius)] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[var(--primary)] shadow-sm border border-slate-200'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'dicionario' && <DicionarioTab />}
        {activeTab === 'auditoria' && <AuditoriaTab />}
      </div>
    </div>
  );
}
