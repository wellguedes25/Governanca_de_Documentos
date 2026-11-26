import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ConfiguracoesHub } from '@/components/configuracoes/ConfiguracoesHub';

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div className="sylva-glass rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
          <Loader2 size={28} className="animate-spin text-[var(--lime)]" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Carregando Central de Configurações...
          </span>
        </div>
      }
    >
      <ConfiguracoesHub />
    </Suspense>
  );
}
