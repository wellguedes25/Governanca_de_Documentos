import { useState, useEffect } from 'react';

export function useOllama() {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch('/api/ai/ollama');
      if (res.ok) {
        const data = await res.json();
        setModels(data.models?.map((m: any) => m.name) || []);
      }
    } catch (err) {
      console.error('Failed to fetch Ollama models');
    }
  }

  async function generate(prompt: string, model?: string, system?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, system })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      return data.response;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    models,
    loading,
    error,
    generate,
    refreshModels: fetchModels
  };
}
