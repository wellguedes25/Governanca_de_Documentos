"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConfirmModal, ConfirmOptions } from '@/components/ui/ConfirmModal';
import { safeSessionSetItem } from '@/lib/safe-storage';

export type AppTheme = 'dark' | 'light';

export interface ActiveConnInfo {
  id: string;
  name: string;
  activeHospitals: any[];
}

interface UIContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  oracleData: Record<string, unknown>[] | null;
  setOracleData: (data: Record<string, unknown>[] | null) => void;
  columnWidths: Record<string, number>;
  setColumnWidth: (column: string, width: number) => void;
  docVersion: 'V2' | 'V3' | null;
  setDocVersion: (version: 'V2' | 'V3' | null) => void;
  isMounted: boolean;
  activeConnInfo: ActiveConnInfo | null;
  setActiveConnInfo: (info: ActiveConnInfo | null) => void;
  getCached: <T>(key: string) => T | null;
  setCached: <T>(key: string, value: T) => void;
  clearCache: (prefix?: string) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setThemeState] = useState<AppTheme>('dark');
  const [oracleData, setOracleData] = useState<Record<string, unknown>[] | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [docVersion, setDocVersionState] = useState<'V2' | 'V3' | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeConnInfo, setActiveConnInfo] = useState<ActiveConnInfo | null>(null);
  const [memoryCache] = useState<Map<string, { value: any; timestamp: number }>>(() => new Map());
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((val: boolean) => void) | null;
  }>({
    open: false,
    options: { title: '', description: '' },
    resolve: null,
  });

  const confirmAction = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmResolve = useCallback((result: boolean) => {
    setConfirmState((prev) => {
      prev.resolve?.(result);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  // Cache helper: lê da memória ou sessionStorage com escopo da conexão ativa
  const getCached = useCallback(<T,>(key: string): T | null => {
    const scopedKey = activeConnInfo?.id ? `${activeConnInfo.id}_${key}` : key;
    // 1. Tenta memória viva
    const inMem = memoryCache.get(scopedKey);
    if (inMem && Date.now() - inMem.timestamp < 1000 * 60 * 30) {
      return inMem.value as T;
    }
    // 2. Tenta sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const item = sessionStorage.getItem(`sylva_cache_${scopedKey}`);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && Date.now() - parsed.timestamp < 1000 * 60 * 30) {
            memoryCache.set(scopedKey, parsed);
            return parsed.value as T;
          }
        }
      } catch {
        // Ignore
      }
    }
    return null;
  }, [memoryCache, activeConnInfo?.id]);

  // Cache helper: salva na memória e no sessionStorage com escopo da conexão ativa
  const setCached = useCallback(<T,>(key: string, value: T): void => {
    const scopedKey = activeConnInfo?.id ? `${activeConnInfo.id}_${key}` : key;
    const payload = { value, timestamp: Date.now() };
    memoryCache.set(scopedKey, payload);
    if (typeof window !== 'undefined') {
      safeSessionSetItem(`sylva_cache_${scopedKey}`, JSON.stringify(payload));
    }
  }, [memoryCache, activeConnInfo?.id]);

  // Limpa cache seletivo ou total (remove tanto sylva_cache_ quanto oracle_ e lineage_)
  const clearCache = useCallback((prefix?: string) => {
    if (prefix) {
      for (const key of Array.from(memoryCache.keys())) {
        if (key.includes(prefix)) {
          memoryCache.delete(key);
        }
      }
      if (typeof window !== 'undefined') {
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.includes(prefix)) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => sessionStorage.removeItem(k));
      }
    } else {
      memoryCache.clear();
      setOracleData(null);
      if (typeof window !== 'undefined') {
        const toRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (
            k &&
            (k.startsWith('sylva_cache_') ||
              k.startsWith('oracle_') ||
              k.startsWith('lineage_') ||
              k.startsWith('profile_') ||
              k.startsWith('meta_') ||
              k.startsWith('actions_') ||
              k.startsWith('rules_') ||
              k.startsWith('fields_'))
          ) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => sessionStorage.removeItem(k));
      }
    }
  }, [memoryCache]);

  const applyThemeToDom = useCallback((nextTheme: AppTheme) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Carregar preferências salvas no navegador após a montagem inicial
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setIsMounted(true);

      try {
        const savedSidebar = localStorage.getItem('sidebarOpen');
        if (savedSidebar !== null) {
          setSidebarOpen(savedSidebar === 'true');
        }

        const savedTheme = localStorage.getItem('sylva_theme') as AppTheme | null;
        const resolvedTheme: AppTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
        setThemeState(resolvedTheme);
        applyThemeToDom(resolvedTheme);

        const savedVersion = sessionStorage.getItem('app_doc_version') as 'V2' | 'V3' | null;
        if (savedVersion === 'V2' || savedVersion === 'V3') {
          setDocVersionState(savedVersion);
        }
      } catch {
        applyThemeToDom('dark');
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [applyThemeToDom]);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyThemeToDom(nextTheme);
    try {
      localStorage.setItem('sylva_theme', nextTheme);
    } catch {
      // Ignore
    }
  }, [applyThemeToDom]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: AppTheme = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDom(next);
      try {
        localStorage.setItem('sylva_theme', next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, [applyThemeToDom]);

  const setDocVersion = useCallback((version: 'V2' | 'V3' | null) => {
    setDocVersionState(version);
    setOracleData(null);
    clearCache('doc_');
    try {
      if (version) {
        sessionStorage.setItem('app_doc_version', version);
        sessionStorage.removeItem('oracle_documentos_data');
        sessionStorage.removeItem('oracle_documentos_data_V2');
        sessionStorage.removeItem('oracle_documentos_data_V3');
      } else {
        sessionStorage.removeItem('app_doc_version');
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSetSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpen(open);
    try {
      localStorage.setItem('sidebarOpen', String(open));
    } catch {
      // Ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebarOpen', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const setColumnWidth = useCallback((column: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [column]: width }));
  }, []);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen: handleSetSidebarOpen,
        toggleSidebar,
        theme,
        setTheme,
        toggleTheme,
        oracleData,
        setOracleData,
        columnWidths,
        setColumnWidth,
        docVersion,
        setDocVersion,
        isMounted,
        activeConnInfo,
        setActiveConnInfo,
        getCached,
        setCached,
        clearCache,
        confirmAction,
      }}
    >
      {children}
      <ConfirmModal
        open={confirmState.open}
        options={confirmState.options}
        onConfirm={() => handleConfirmResolve(true)}
        onCancel={() => handleConfirmResolve(false)}
      />
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
