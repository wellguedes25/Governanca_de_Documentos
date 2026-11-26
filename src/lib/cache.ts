import { createHash } from 'crypto';
import NodeCache from 'node-cache';

// Tipagem explícita para o cache global no Node.js
declare global {
  var _oracleCache: NodeCache | undefined;
}

// Inicializa a instância do cache apenas uma vez no ambiente de desenvolvimento
// O NodeCache por padrão varre chaves expiradas a cada 60 segundos (checkperiod)
export const queryCache = globalThis._oracleCache || new NodeCache({ stdTTL: 600, checkperiod: 60 });

if (process.env.NODE_ENV !== 'production') {
  globalThis._oracleCache = queryCache;
}

export function clearQueryCache(): void {
  try {
    queryCache.flushAll();
    (globalThis as { dashboardCache?: Map<string, unknown> }).dashboardCache?.clear();
    console.log('[Cache] Backend query cache flushed successfully.');
  } catch (err) {
    console.error('[Cache] Error flushing backend query cache:', err);
  }
}

export function generateCacheKey(connectionId: string, sql: string, binds: unknown): string {
  const sqlHash = createHash('sha256').update(sql).digest('hex');
  const bindsString = typeof binds === 'object' ? JSON.stringify(binds) : String(binds);
  return `${connectionId}|${sqlHash}|${bindsString}`;
}
