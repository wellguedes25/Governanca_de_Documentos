"use client";

import { useState, useEffect } from 'react';
import { BookOpen, ShieldAlert, Library } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
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
    <div className="min-h-screen bg-card flex flex-col p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-5 duration-700 pb-24 text-foreground">
      {/* Header */}
      <PageHeader 
        title="Siglário Clínico"
        subtitle="Gestão do dicionário de siglas e auditoria de conformidade em laudos."
        icon={BookOpen}
      />

      {/* Tabs */}
      <div className="flex gap-1 -background p-1 rounded-none w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-none text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
              activeTab === tab.id
                ? 'bg-background text-[var(--primary)] shadow-none border border-border'
                : 'text-muted -muted'
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
