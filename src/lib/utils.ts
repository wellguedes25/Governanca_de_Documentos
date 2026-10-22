import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getToday = () => new Date().toISOString().split('T')[0];

export const get30DaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

/** 
 * Helper robusto para buscar valor de chave independente de case ou aspas 
 * Comum em resultados do oracledb
 */
export const getVal = (row: any, key: string) => {
  if (!row) return undefined;
  const target = key.toUpperCase();
  const foundKey = Object.keys(row).find(k => k.replace(/"/g, '').toUpperCase() === target);
  return foundKey ? row[foundKey] : undefined;
};

/**
 * Formata data e hora no padrão DD/MM/YYYY HH24:MI:SS
 */
export function formatDateTime(val: any): string {
  if (val === undefined || val === null || val === '') return '—';
  
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) {
    return String(val);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Detecta se uma coluna ou valor representa uma data/hora
 */
export function isDateLike(val: any, colName?: string): boolean {
  if (val === undefined || val === null) return false;
  if (val instanceof Date) return true;
  if (colName) {
    const colUpper = colName.toUpperCase();
    if (
      colUpper.includes('USO') || 
      colUpper.includes('DATA') || 
      colUpper.includes('DH_') || 
      colUpper.includes('CRIACAO') ||
      colUpper.includes('ATUALIZACAO')
    ) {
      return !isNaN(new Date(val).getTime());
    }
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(val)) {
    return !isNaN(new Date(val).getTime());
  }
  return false;
}
