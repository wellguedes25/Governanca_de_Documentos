// @ts-ignore
import * as oracledb from 'oracledb';
import { getData, DbConnection } from './storage';

// Usamos o globalThis para persistir o pool e o estado de inicialização entre hot-reloads do Next.js
const globalWithOracle = global as any;

async function initOracle() {
  if (!globalWithOracle.clientInitialized) {
    try {
      const data = await getData();
      const libDir = data.oracleClientPath;
      
      if (!libDir) {
        console.error('❌ Oracle Client Path is not defined in storage.');
        return;
      }

      console.log(`Attempting to initialize Oracle Client (v5 Thick) with libDir: ${libDir}`);
      oracledb.initOracleClient({ libDir });
      globalWithOracle.clientInitialized = true;
      console.log('✅ Oracle Client initialized successfully (Thick Mode v5).');
    } catch (err: any) {
      // Se já estiver inicializado (NJS-011 ou NJS-077), ignoramos o erro em hot-reloads.
      if (err.message.includes('NJS-011') || err.message.includes('NJS-077')) {
        globalWithOracle.clientInitialized = true;
        return;
      }
      console.error('❌ Error initializing Oracle Client:', err.message);
      throw new Error(`Falha crítica ao carregar Oracle Client: ${err.message}`);
    }
  }
}

function normalizeConnectString(connectString: string): string {
    // Normalização básica: se houver dois colons e nenhuma barra, 
    // provavelmente é o formato antigo host:port:SID.
    // O Easy Connect prefere host:port/service_name
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
  
  // Se já existe um pool e o alias (ID da conexão) é o mesmo, retorna o pool existente
  if (globalWithOracle.oraclePool && globalWithOracle.oraclePool.currentAlias === alias) {
    return globalWithOracle.oraclePool;
  }
  
  // Se existe um pool antigo com alias diferente, tentamos fechar antes de criar o novo
  if (globalWithOracle.oraclePool) {
    console.log(`[Oracle] Closing old pool (${globalWithOracle.oraclePool.currentAlias}) to switch to ${alias}`);
    try {
      await globalWithOracle.oraclePool.close(5);
    } catch (err) {
      console.error('[Oracle] Error closing old pool:', err);
    }
  }
  
  console.log(`[Oracle] Creating new pool for: ${connection.name} (${alias})`);
  globalWithOracle.oraclePool = await oracledb.createPool({
    user: connection.user,
    password: connection.password,
    connectString: connectString,
    poolMin: 2,
    poolMax: 15,
    poolIncrement: 2,
    poolTimeout: 60,
    stmtCacheSize: 60,
  });
  
  // Marcamos o pool com o ID da conexão atual
  globalWithOracle.oraclePool.currentAlias = alias;
  
  return globalWithOracle.oraclePool;
}

export async function executeQuery(connection: DbConnection, sql: string, binds: any = []) {
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
        fetchArraySize: 100
    });
    const end = Date.now();
    
    if (end - start > 5000) {
        console.warn(`[Oracle] Slow query (${end - start}ms): ${cleanSql.substring(0, 100)}...`);
    }

    return result.rows;
  } catch (err) {
    console.error('Database error:', err);
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close(); // Retorna ao pool
      } catch (err) {
        console.error('Error returning connection to pool:', err);
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
