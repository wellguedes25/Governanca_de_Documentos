"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  oracleData: Record<string, unknown>[] | null;
  setOracleData: (data: Record<string, unknown>[] | null) => void;
  columnWidths: Record<string, number>;
  setColumnWidth: (column: string, width: number) => void;
  docVersion: 'V2' | 'V3' | null;
  setDocVersion: (version: 'V2' | 'V3' | null) => void;
  isMounted: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [oracleData, setOracleData] = useState<Record<string, unknown>[] | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [docVersion, setDocVersionState] = useState<'V2' | 'V3' | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Carregar preferências salvas no navegador após a montagem inicial
  useEffect(() => {
    setIsMounted(true);

    try {
      const savedSidebar = localStorage.getItem('sidebarOpen');
      if (savedSidebar !== null) {
        setSidebarOpen(savedSidebar === 'true');
      }

      const savedVersion = sessionStorage.getItem('app_doc_version') as 'V2' | 'V3' | null;
      if (savedVersion === 'V2' || savedVersion === 'V3') {
        setDocVersionState(savedVersion);
      }
    } catch {
      // Ambientes restritos ou SSR
    }
  }, []);

  const setDocVersion = (version: 'V2' | 'V3' | null) => {
    setDocVersionState(version);
    setOracleData(null); // Limpar dados do contexto React para que a nova versão recarregue
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
  };

  const handleSetSidebarOpen = (open: boolean) => {
    setSidebarOpen(open);
    try {
      localStorage.setItem('sidebarOpen', String(open));
    } catch {
      // Ignore
    }
  };

  const setColumnWidth = (column: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [column]: width }));
  };

  return (
    <UIContext.Provider value={{ 
      sidebarOpen, 
      setSidebarOpen: handleSetSidebarOpen, 
      oracleData, 
      setOracleData,
      columnWidths,
      setColumnWidth,
      docVersion,
      setDocVersion,
      isMounted
    }}>
      {children}
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
