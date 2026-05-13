import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, model = 'nemotron3:33b', system = '' } = body;

    // Tenta comunicar com o Ollama local
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false, // Começamos com stream false para simplicidade
        options: {
          temperature: 0.2, // Baixa temperatura para queries SQL
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Ollama error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    return NextResponse.json(
      { error: 'Falha ao conectar com o Ollama local. Certifique-se de que ele está rodando em http://localhost:11434' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error('Ollama not reachable');
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Ollama offline' }, { status: 503 });
  }
}
