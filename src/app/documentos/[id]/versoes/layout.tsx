import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Histórico de Mudanças • Doc #${id} | Goverdoc Pro`,
    description: `Comparação detalhada de campos, regras clínicas e consultas SQL entre versões do documento #${id} no Editor 3.0 (V3).`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function DocumentVersionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
