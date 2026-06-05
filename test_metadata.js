fetch('http://localhost:3000/api/oracle/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: "METADATA", params: { CD_DOCUMENTO: '1914' } })
}).then(r => r.json()).then(console.log);
