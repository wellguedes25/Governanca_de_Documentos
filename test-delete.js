async function test() {
  try {
    // 1. Create a card
    const cardId = 'test-' + Date.now();
    const createRes = await fetch('http://localhost:3000/api/dashboard/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cardId,
        title: 'Test Card',
        query: 'SELECT 1 FROM DUAL',
        type: 'kpi',
        icon: 'Activity',
        color: 'from-blue-500 to-indigo-600',
        enabled: true,
        order: 99
      })
    });
    console.log('Create status:', createRes.status);
    
    // 2. Verify it exists
    const listRes = await fetch('http://localhost:3000/api/dashboard/custom');
    const cards = await listRes.json();
    const found = cards.find(c => c.id === cardId);
    console.log('Card created & found:', !!found);
    
    // 3. Delete it
    const deleteRes = await fetch(`http://localhost:3000/api/dashboard/custom?id=${cardId}`, {
      method: 'DELETE'
    });
    console.log('Delete status:', deleteRes.status);
    const deleteData = await deleteRes.json();
    console.log('Delete response:', deleteData);
    
    // 4. Verify it's gone
    const listRes2 = await fetch('http://localhost:3000/api/dashboard/custom');
    const cards2 = await listRes2.json();
    const stillFound = cards2.find(c => c.id === cardId);
    console.log('Card still exists:', !!stillFound);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
