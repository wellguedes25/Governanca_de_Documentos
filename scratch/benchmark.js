const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

async function run() {
  const storage = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/storage.json'), 'utf8'));
  const connInfo = storage.connections.find(c => c.id === storage.activeConnectionId);
  const libDir = storage.oracleClientPath;

  try {
    oracledb.initOracleClient({ libDir });
  } catch (e) {}

  console.log('--- Benchmarking Oracle Queries ---');
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: connInfo.user,
      password: connInfo.password,
      connectString: connInfo.connectString
    });

    const queries = [
        { name: 'Total KPI', sql: storage.kpiQueries.total },
        { name: 'Prod 24h', sql: storage.kpiQueries.prod24h },
        { name: 'Unit Adherence', sql: storage.analyticQueries.unitAdherence }
    ];

    for (const q of queries) {
        const start = Date.now();
        console.log(`Executing ${q.name}...`);
        await connection.execute(q.sql, [], { prefetchRows: 100, fetchArraySize: 100 });
        const end = Date.now();
        console.log(`✅ ${q.name} took ${end - start}ms`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

run();
