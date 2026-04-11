// @ts-ignore
import * as oracledb from 'oracledb';
import { getData, DbConnection } from './storage';

let clientInitialized = false;

async function initOracle() {
  if (!clientInitialized) {
    try {
      const data = await getData();
      const libDir = data.oracleClientPath;
      
      if (!libDir) {
        console.error('❌ Oracle Client Path is not defined in storage.');
        return;
      }

      console.log(`Attempting to initialize Oracle Client (v5 Thick) with libDir: ${libDir}`);
      oracledb.initOracleClient({ libDir });
      clientInitialized = true;
      console.log('✅ Oracle Client initialized successfully (Thick Mode v5).');
    } catch (err: any) {
      // Se já estiver inicializado (NJS-011 ou NJS-077), ignoramos o erro em hot-reloads.
      if (err.message.includes('NJS-011') || err.message.includes('NJS-077')) {
        clientInitialized = true;
        return;
      }
      console.error('❌ Error initializing Oracle Client:', err.message);
      throw new Error(`Falha crítica ao carregar Oracle Client: ${err.message}`);
    }
  }
}

export async function executeQuery(connection: DbConnection, sql: string) {
  await initOracle();
  
  let conn;
  try {
    // Normalização básica: se houver dois colons e nenhuma barra, 
    // provavelmente é o formato antigo host:port:SID.
    // O Easy Connect prefere host:port/service_name
    let connectString = connection.connectString;
    const parts = connectString.split(':');
    if (parts.length === 3 && !connectString.includes('/')) {
      connectString = `${parts[0]}:${parts[1]}/${parts[2]}`;
    }

    conn = await oracledb.getConnection({
      user: connection.user,
      password: connection.password,
      connectString: connectString,
    });

    // O driver Oracle Thick v5 não aceita semicolon no final de statements simples.
    // Removemos qualquer semicolon que esteja no final do comando, 
    // mesmo se seguido por espaços ou comentários de linha.
    const cleanSql = sql.trim().replace(/;[\s\n]*(--.*)?$/, '');
    const result = await conn.execute(cleanSql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } catch (err) {
    console.error('Database error:', err);
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

export async function testConnection(connection: DbConnection) {
    await initOracle();
    let conn;
    try {
      let connectString = connection.connectString;
      const parts = connectString.split(':');
      if (parts.length === 3 && !connectString.includes('/')) {
        connectString = `${parts[0]}:${parts[1]}/${parts[2]}`;
      }

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
