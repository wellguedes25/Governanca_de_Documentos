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

export function generateCacheKey(connectionId: string, sql: string, binds: any): string {
  // Uma hash simples baseada na string. 
  // O stringify de binds precisa ser determinístico se for objeto, mas para Oracle via API normalmente é simples.
  const bindsString = typeof binds === 'object' ? JSON.stringify(binds) : String(binds);
  return `${connectionId}|${sql.length}|${sql.slice(0, 50)}|${bindsString}`;
}
