
async function testApi() {
  const res = await fetch('http://localhost:3000/api/connections');
  const connections = await res.json();
  console.log('Active Connection:', connections.activeConnectionId);

  const query = `SELECT * FROM DBAMV.TB_AUDITORIA_SIMILARIDADE FETCH FIRST 1 ROWS ONLY`;
  const execRes = await fetch('http://localhost:3000/api/oracle/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const result = await execRes.json();
  console.log('Data Sample:', JSON.stringify(result.rows, null, 2));
}

testApi();
