"use client";

import { useState, useEffect } from 'react';

/**
 * Hook para garantir que renderizações dependentes do cliente (localStorage,
 * sessionStorage, dimensões de tela, etc.) só ocorram após a hidratação completa
 * pelo React, prevenindo 100% dos erros de Hydration Mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
