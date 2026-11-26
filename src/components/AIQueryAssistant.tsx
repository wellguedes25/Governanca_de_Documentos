import { useState } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { useOllama } from '@/hooks/useOllama';

interface AIQueryAssistantProps {
  currentQuery: string;
  onApply: (query: string) => void;
  context: string;
}

export function AIQueryAssistant({ currentQuery, onApply, context }: AIQueryAssistantProps) {
  const { generate, loading } = useOllama();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function handleOptimize() {
    const prompt = `
      Você é um especialista em banco de dados Oracle. 
      Melhore a seguinte query SQL para o contexto: ${context}.
      
      Query atual:
      ${currentQuery}
      
      Regras:
      1. Retorne APENAS o código SQL.
      2. Mantenha os aliases das colunas originais se houver.
      3. Use boas práticas de performance Oracle.
      4. Não adicione comentários explicativos fora do código SQL.
    `;

    const result = await generate(prompt, 'nemotron3:33b', 'Você é um assistente técnico especialista em SQL Oracle.');
    if (result) {
      // Limpa possíveis marcações de markdown do LLM
      const cleaned = result.replace(/```sql/g, '').replace(/```/g, '').trim();
      setSuggestion(cleaned);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {suggestion ? (
        <button
          type="button"
          onClick={() => {
            onApply(suggestion);
            setSuggestion(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 tone-warning border rounded-full text-[11px] font-bold transition-all cursor-pointer"
        >
          <Wand2 size={12} /> Aplicar Sugestão IA
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOptimize}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 tone-success border rounded-full text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer hover:brightness-105"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {loading ? 'Analisando...' : 'Otimizar com IA'}
        </button>
      )}
    </div>
  );
}
