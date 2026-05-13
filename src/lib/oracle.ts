// @ts-ignore
import * as oracledb from 'oracledb';
import { getData, DbConnection } from './storage';

// Tipagem explícita do global em vez de `global as any` — mais seguro em multi-worker
declare global {
  var oraclePool: any | undefined;
  var clientInitialized: boolean | undefined;
  var __oracleShutdownRegistered: boolean | undefined;
}

// Handler de shutdown gracioso — fecha o pool ao encerrar o servidor
// Garante que conexões Oracle não fiquem abertas após hot-reload ou SIGTERM
if (typeof process !== 'undefined' && !globalThis.__oracleShutdownRegistered) {
  const closePool = async () => {
    if (globalThis.oraclePool) {
      try {
        console.log('[Oracle] Fechando pool de conexões (shutdown)...');
        await globalThis.oraclePool.close(5);
        globalThis.oraclePool = undefined;
        console.log('[Oracle] Pool fechado com sucesso.');
      } catch (err) {
        console.error('[Oracle] Erro ao fechar pool no shutdown:', err);
      }
    }
  };
  process.on('SIGTERM', closePool);
  process.on('SIGINT', closePool);
  // Flag para evitar múltiplos registros em hot-reloads
  (globalThis as any).__oracleShutdownRegistered = true;
}

async function initOracle() {
  if (!globalThis.clientInitialized) {
    try {
      const data = await getData();
      const libDir = data.oracleClientPath;

      if (!libDir) {
        console.error('❌ Oracle Client Path is not defined in storage.');
        return;
      }

      console.log(`Attempting to initialize Oracle Client (v5 Thick) with libDir: ${libDir}`);
      oracledb.initOracleClient({ libDir });
      globalThis.clientInitialized = true;
      console.log('✅ Oracle Client initialized successfully (Thick Mode v5).');
    } catch (err: any) {
      // NJS-011 / NJS-077: já inicializado em hot-reloads — comportamento esperado
      if (err.message.includes('NJS-011') || err.message.includes('NJS-077')) {
        globalThis.clientInitialized = true;
        return;
      }
      console.error('❌ Error initializing Oracle Client:', err.message);
      throw new Error(`Falha crítica ao carregar Oracle Client: ${err.message}`);
    }
  }
}

function normalizeConnectString(connectString: string): string {
  // Normalização: converte host:port:SID para host:port/service_name (Easy Connect)
  const parts = connectString.split(':');
  if (parts.length === 3 && !connectString.includes('/')) {
    return `${parts[0]}:${parts[1]}/${parts[2]}`;
  }
  return connectString;
}

/**
 * Obtém ou cria o pool de conexões para a conexão ativa.
 * Gerencia a destruição do pool anterior se a conexão mudar.
 */
export async function getPool(connection: DbConnection) {
  await initOracle();

  const alias = connection.id;
  const connectString = normalizeConnectString(connection.connectString);

  // Reutiliza pool existente se for da mesma conexão
  if (globalThis.oraclePool && (globalThis.oraclePool as any).currentAlias === alias) {
    return globalThis.oraclePool;
  }

  // Fecha pool antigo antes de criar um novo
  if (globalThis.oraclePool) {
    console.log(`[Oracle] Closing old pool (${(globalThis.oraclePool as any).currentAlias}) to switch to ${alias}`);
    try {
      await globalThis.oraclePool.close(5);
    } catch (err) {
      console.error('[Oracle] Error closing old pool:', err);
    }
  }

  console.log(`[Oracle] Creating new pool for: ${connection.name} (${alias})`);
  globalThis.oraclePool = await oracledb.createPool({
    user: connection.user,
    password: connection.password,
    connectString: connectString,
    poolMin: 2,
    poolMax: 15,
    poolIncrement: 2,
    poolTimeout: 60,
    stmtCacheSize: 60,
  });

  (globalThis.oraclePool as any).currentAlias = alias;

  return globalThis.oraclePool;
}

export async function executeQuery(connection: DbConnection, sql: string, binds: Record<string, any> | any[] = {}) {
  let conn;
  try {
    const pool = await getPool(connection);
    conn = await pool.getConnection();

    if (!sql) {
      throw new Error('A query SQL fornecida é nula ou indefinida. Verifique o arquivo storage.json.');
    }

    // Remove ponto e vírgula final se houver
    const cleanSql = sql.trim().replace(/;$/, '');

    const start = Date.now();
    const result = await conn.execute(cleanSql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      prefetchRows: 100,
      fetchArraySize: 100,
    });
    const elapsed = Date.now() - start;

    if (elapsed > 5000) {
      console.warn(`[Oracle] Slow query (${elapsed}ms): ${cleanSql.substring(0, 100)}...`);
    }

    return result.rows;
  } catch (err) {
    console.error('[Oracle] Database error:', err);
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error('[Oracle] Error returning connection to pool:', err);
      }
    }
  }
}

export async function testConnection(connection: DbConnection) {
  await initOracle();
  let conn;
  try {
    const connectString = normalizeConnectString(connection.connectString);
    conn = await oracledb.getConnection({
      user: connection.user,
      password: connection.password,
      connectString: connectString,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {}
    }
  }
}

/** Retorna o status atual do pool para o healthcheck da Sidebar */
export function getPoolStatus(): { active: boolean; alias?: string; poolMin?: number; poolMax?: number } {
  if (!globalThis.oraclePool) {
    return { active: false };
  }
  const pool = globalThis.oraclePool as any;
  return {
    active: true,
    alias: pool.currentAlias,
    poolMin: pool.poolMin,
    poolMax: pool.poolMax,
  };
}
