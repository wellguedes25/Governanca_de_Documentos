async function testPost() {
    console.log("Chamando POST /api/siglario...");
    try {
        const res = await fetch('http://localhost:3000/api/siglario', { method: 'POST' });
        console.log("Status:", res.status);
        const json = await res.json();
        console.log("Resposta:", json);
    } catch (e) {
        console.error("Erro na requisição:", e);
    }
}

testPost();
