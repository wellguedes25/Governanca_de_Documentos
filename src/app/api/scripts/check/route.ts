import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function GET() {
  const data = await getData();
  const connection = data.connections.find((c: any) => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    const query = `
      SELECT OBJECT_NAME 
      FROM ALL_OBJECTS 
      WHERE OWNER = 'DBAMV' 
      AND OBJECT_NAME IN ('TB_AUDITORIA_SIGLARIO', 'TB_AUDITORIA_SIMILARIDADE', 'V_AUDITORIA_COPIA_COLA')
    `;

    const rows = await executeQuery(connection, query, {});
    
    // Converte o array de objetos retornado em um map booleano mais fácil pro frontend consumir
    const existingObjects = rows.map((r: any) => r.OBJECT_NAME || r.object_name);

    return NextResponse.json({ 
      TB_AUDITORIA_SIGLARIO: existingObjects.includes('TB_AUDITORIA_SIGLARIO'),
      TB_AUDITORIA_SIMILARIDADE: existingObjects.includes('TB_AUDITORIA_SIMILARIDADE'),
      V_AUDITORIA_COPIA_COLA: existingObjects.includes('V_AUDITORIA_COPIA_COLA')
    });

  } catch (err: any) {
    console.error('[API Check Scripts] Erro:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
