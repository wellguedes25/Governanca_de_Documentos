// @ts-expect-error - oracledb types may not be fully resolved in build env
import * as oracledb from 'oracledb';
import { getData, saveData, DbConnection, HospitalMapping } from './storage';
import { decrypt } from './encryption';
import { queryCache, generateCacheKey } from './cache';

interface CustomPool extends oracledb.Pool {
  currentAlias?: string;
  activeHospitals?: HospitalMapping[];
  close(timeout: number): Promise<void>;
  getConnection(): Promise<oracledb.Connection>;
  poolMin?: number;
  poolMax?: number;
}

// Tipagem explícita do global em vez de `global as any` — mais seguro em multi-worker
declare global {
  var oraclePool: CustomPool | undefined;
  var clientInitialized: boolean | undefined;
  var __oracleShutdownRegistered: boolean | undefined;
}

export function generateAcronym(name: string): string {
  if (!name) return 'UNID';
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  
  const stopWords = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'EM', 'PARA', 'COM', 'A', 'O', 'AS', 'OS']);
  const words = normalized.split(/[^A-Z0-9]+/).filter(w => w.length > 0);
  
  if (words.length === 0) return 'UNID';
  if (words.length === 1) {
    return words[0].substring(0, 4);
  }
  
  const relevantWords = words.filter(w => !stopWords.has(w));
  const wordsToUse = relevantWords.length > 0 ? relevantWords : words;
  
  let acronym = wordsToUse.map(w => w.charAt(0)).join('');
  
  if (acronym.length < 2 && wordsToUse[0].length > 1) {
    acronym = wordsToUse[0].substring(0, 3);
  }
  
  return acronym.substring(0, 6);
}

async function fetchActiveHospitals(pool: CustomPool): Promise<HospitalMapping[]> {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute(
      `SELECT CD_MULTI_EMPRESA, DS_MULTI_EMPRESA FROM DBAMV.MULTI_EMPRESAS WHERE SN_ATIVO = 'S' ORDER BY CD_MULTI_EMPRESA`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const rows = (result.rows || []) as Array<{ CD_MULTI_EMPRESA: number; DS_MULTI_EMPRESA: string }>;
    return rows.map(row => {
      const id = row.CD_MULTI_EMPRESA;
      const nome = row.DS_MULTI_EMPRESA;
      const sigla = generateAcronym(nome);
      return {
        id,
        nome,
        sigla,
        ativo: true
      };
    });
  } catch (err) {
    console.error('[Oracle] Erro ao buscar empresas ativas:', err);
    return [];
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {}
    }
  }
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
  globalThis.__oracleShutdownRegistered = true;
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
    } catch (err) {
      const error = err as Error;
      // NJS-011 / NJS-077: já inicializado em hot-reloads — comportamento esperado
      if (error.message.includes('NJS-011') || error.message.includes('NJS-077')) {
        globalThis.clientInitialized = true;
        return;
      }
      console.error('❌ Error initializing Oracle Client:', error.message);
      throw new Error(`Falha crítica ao carregar Oracle Client: ${error.message}`);
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
export async function getPool(connection: DbConnection): Promise<CustomPool> {
  await initOracle();

  const alias = connection.id;
  const connectString = normalizeConnectString(connection.connectString);
  const decryptedPassword = decrypt(connection.password || '');

  // Reutiliza pool existente se for da mesma conexão
  if (globalThis.oraclePool && globalThis.oraclePool.currentAlias === alias) {
    return globalThis.oraclePool;
  }

  // Fecha pool antigo antes de criar um novo
  if (globalThis.oraclePool) {
    console.log(`[Oracle] Closing old pool (${globalThis.oraclePool.currentAlias}) to switch to ${alias}`);
    try {
      await globalThis.oraclePool.close(5);
    } catch (err) {
      console.error('[Oracle] Error closing old pool:', err);
    }
  }

  console.log(`[Oracle] Creating new pool for: ${connection.name} (${alias})`);
  const pool = await oracledb.createPool({
    user: connection.user,
    password: decryptedPassword,
    connectString: connectString,
    poolMin: 2,
    poolMax: 15,
    poolIncrement: 2,
    poolTimeout: 60,
    stmtCacheSize: 60,
  }) as CustomPool;

  pool.currentAlias = alias;

  try {
    // Busca as empresas ativas dinamicamente
    console.log(`[Oracle] Fetching active companies dynamically for connection: ${connection.name}`);
    const dbHospitals = await fetchActiveHospitals(pool);
    pool.activeHospitals = dbHospitals;
    console.log(`[Oracle] Active companies loaded from database: ${dbHospitals.map(h => `${h.sigla} (${h.id})`).join(', ')}`);

    // Sincroniza com o storage.json
    const storageData = await getData();
    const existingMappings = storageData.hospitalsMapping || [];
    const updatedMappings: HospitalMapping[] = [];
    let changed = false;

    dbHospitals.forEach(dbH => {
      const match = existingMappings.find(h => h.id === dbH.id);
      if (match) {
        updatedMappings.push({
          id: dbH.id,
          nome: dbH.nome,
          sigla: match.sigla || dbH.sigla,
          ativo: match.ativo
        });
        if (match.nome !== dbH.nome || !match.sigla) {
          changed = true;
        }
      } else {
        updatedMappings.push(dbH);
        changed = true;
      }
    });

    // Se houve alguma empresa removida do banco, removemos também do storage para limpar lixo
    if (existingMappings.length !== updatedMappings.length) {
      changed = true;
    }

    if (changed) {
      storageData.hospitalsMapping = updatedMappings;
      await saveData(storageData);
      console.log('[Oracle] storage.json hospitalsMapping updated successfully.');
    }
  } catch (syncErr) {
    console.error('[Oracle] Error synchronizing active companies in getPool:', syncErr);
  }

  globalThis.oraclePool = pool;
  return pool;
}

export async function executeQuery(
  connection: DbConnection, 
  sql: string, 
  binds: Record<string, unknown> | unknown[] = {},
  options?: { ttlSeconds?: number, forceRefresh?: boolean }
) {
  let conn;
  try {
    const cacheKey = generateCacheKey(connection.id, sql, binds);
    
    // Check cache first
    if (options?.ttlSeconds && options.ttlSeconds > 0 && !options?.forceRefresh) {
      const cached = queryCache.get(cacheKey);
      if (cached !== undefined) {
        console.log(`[Oracle Cache Hit] Returning cached result for query.`);
        return cached;
      }
    }

    const pool = await getPool(connection);
    conn = await pool.getConnection();

    if (!sql) {
      throw new Error('A query SQL fornecida é nula ou indefinida. Verifique o arquivo storage.json.');
    }

    // Process SQL Macros for dynamic hospitals
    let finalSql = sql;
    const data = await getData();
    
    // Mescla os dados do banco (pool) com as preferências de ativação/siglas do storage.json
    const dbHospitals = pool.activeHospitals || [];
    let activeHospitals: HospitalMapping[] = [];
    if (dbHospitals.length > 0) {
      activeHospitals = dbHospitals.map(dbH => {
        const match = (data.hospitalsMapping || []).find(h => h.id === dbH.id);
        return {
          id: dbH.id,
          nome: dbH.nome,
          sigla: match ? (match.sigla || dbH.sigla) : dbH.sigla,
          ativo: match ? match.ativo : true
        };
      }).filter(h => h.ativo);
    } else {
      activeHospitals = (data.hospitalsMapping || []).filter(h => h.ativo);
    }
    
    // Legacy support for older variables if any still exist
    if (finalSql.includes(':EMPRESAS_ATIVAS')) {
      const idsString = activeHospitals.length > 0 ? activeHospitals.map((h: HospitalMapping) => h.id).join(', ') : '-1';
      finalSql = finalSql.replace(/:EMPRESAS_ATIVAS/g, idsString);
    }
    if (finalSql.includes(':DECODE_EMPRESAS')) {
      const decodeSequence = activeHospitals.length > 0 ? activeHospitals.map((h: HospitalMapping) => `${h.id}, '${h.sigla}'`).join(', ') : "0, 'N/A'";
      finalSql = finalSql.replace(/:DECODE_EMPRESAS/g, decodeSequence);
    }

    const decodeSnippet = activeHospitals.flatMap((h: HospitalMapping) => [h.id, `'${h.sigla}'`]).join(',');

    // Parameterized DYNAMIC_HOSPITALS_DECODE(col) macro
    const decodeParamRegex = /\/\*\s*DYNAMIC_HOSPITALS_DECODE\(([^)]+)\)\s*\*\//gi;
    finalSql = finalSql.replace(decodeParamRegex, (match, col) => {
      return decodeSnippet ? `Decode(${col}, ${decodeSnippet})` : "'NO_HOSPITALS'";
    });

    // New DYNAMIC_HOSPITALS_* macros
    if (finalSql.includes('/* DYNAMIC_HOSPITALS_PIVOT */')) {
      const pivotSnippet = activeHospitals.map((h: HospitalMapping) => `MAX(CASE WHEN CD_MULTI_EMPRESA = ${h.id} THEN '1' ELSE '0' END) AS "${h.sigla}"`).join(', ');
      // If no active hospitals, we still need a valid column for Oracle
      finalSql = finalSql.replace(/\/\* DYNAMIC_HOSPITALS_PIVOT \*\//g, pivotSnippet || "'1' AS \"NO_HOSPITALS\"");
    }
    
    if (finalSql.includes('/* DYNAMIC_HOSPITALS_DECODE */')) {
      // If no active hospitals, default to 'NO_HOSPITALS'
      finalSql = finalSql.replace(/\/\*\s*DYNAMIC_HOSPITALS_DECODE\s*\*\/(?:\s*AS\s+EMPRESA)?/gi, decodeSnippet ? `Decode(NVL(PA.CD_MULTI_EMPRESA, PAE.CD_MULTI_EMPRESA),${decodeSnippet}) AS EMPRESA` : "'NO_HOSPITALS' AS EMPRESA");
    }
    
    if (finalSql.includes('/* DYNAMIC_HOSPITALS_IN */')) {
      const inSnippet = activeHospitals.map((h: HospitalMapping) => h.id).join(', ');
      // IN () is invalid in Oracle. We must provide at least one value. '-1' or 'NULL' works if no IDs exist.
      finalSql = finalSql.replace(/\/\* DYNAMIC_HOSPITALS_IN \*\//g, inSnippet || "-1");
    }

    // Remove ponto e vírgula final se houver
    const cleanSql = finalSql.trim().replace(/;$/, '');

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

    // Save to cache if requested
    if (options?.ttlSeconds && options.ttlSeconds > 0) {
      queryCache.set(cacheKey, result.rows, options.ttlSeconds);
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
    const decryptedPassword = decrypt(connection.password || '');
    conn = await oracledb.getConnection({
      user: connection.user,
      password: decryptedPassword,
      connectString: connectString,
    });
    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {}
    }
  }
}

/** Retorna o status atual do pool para o healthcheck da Sidebar */
export function getPoolStatus(): { active: boolean; alias?: string; poolMin?: number; poolMax?: number } {
  if (!globalThis.oraclePool) {
    return { active: false };
  }
  const pool = globalThis.oraclePool;
  return {
    active: true,
    alias: pool.currentAlias,
    poolMin: pool.poolMin,
    poolMax: pool.poolMax,
  };
}
