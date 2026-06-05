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
