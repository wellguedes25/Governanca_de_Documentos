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
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [oracleData, setOracleData] = useState<Record<string, unknown>[] | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [docVersion, setDocVersionState] = useState<'V2' | 'V3' | null>(null);

  // Carregar estado do sessionStorage no client
  useEffect(() => {
    const savedSidebar = localStorage.getItem('sidebarOpen');
    if (savedSidebar !== null) {
      setTimeout(() => {
        setSidebarOpen(savedSidebar === 'true');
      }, 0);
    }

    const savedVersion = sessionStorage.getItem('app_doc_version') as 'V2' | 'V3' | null;
    if (savedVersion) {
      setTimeout(() => {
        setDocVersionState(savedVersion);
      }, 0);
    }
  }, []);

  const setDocVersion = (version: 'V2' | 'V3' | null) => {
    setDocVersionState(version);
    if (version) {
      sessionStorage.setItem('app_doc_version', version);
      // Limpar cache de dados ao trocar de versão para forçar recarga
      sessionStorage.removeItem('oracle_documentos_data');
    } else {
      sessionStorage.removeItem('app_doc_version');
    }
  };

  const handleSetSidebarOpen = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem('sidebarOpen', String(open));
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
      setDocVersion
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
