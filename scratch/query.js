async function main() {
  const query = process.argv[2];
  console.log('Query:', query);
  try {
    const res = await fetch('http://localhost:3000/api/oracle/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}

main();
