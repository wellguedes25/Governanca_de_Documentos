import { NextResponse, NextRequest } from 'next/server';
import { executeQuery } from '@/lib/oracle';
import { getData } from '@/lib/storage';
import { spawn } from 'child_process';
import path from 'path';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get('dataInicio') || '';
  const dataFim = searchParams.get('dataFim') || '';

  if (!dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros dataInicio e dataFim são obrigatórios.' }, { status: 400 });
  }

  // Validação básica do formato de data (YYYY-MM-DD) — defesa extra além dos bind vars
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dataInicio) || !dateRegex.test(dataFim)) {
    return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD.' }, { status: 400 });
  }

  const storage = await getData();
  const activeConn = storage.connections.find(c => c.id === storage.activeConnectionId);
  if (!activeConn) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa configurada.' }, { status: 503 });
  }

  // Bind variables posicionais (:1, :2) — elimina SQL Injection por completo
  const query = `
    SELECT 
      S.CD_ATENDIMENTO AS ATENDIMENTO,
      S.CD_DOCUMENTO AS DOCUMENTO,
      S.CD_EDITOR_REGISTRO,
      S.CD_DOCUMENTO_CLINICO,
      S.SIGLA_DETECTADA,
      S.CONTEXTO,
      TO_CHAR(S.DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') AS DATA_HORA,
      S.CD_PRESTADOR AS PRESTADOR,
      S.UNIDADE
    FROM DBAMV.TB_AUDITORIA_SIGLARIO S
    WHERE S.DH_FECHAMENTO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') 
                               AND TO_DATE(:2, 'YYYY-MM-DD') + 1
    ORDER BY S.DH_FECHAMENTO DESC, S.SIGLA_DETECTADA ASC
  `;

  try {
    const rows = await executeQuery(activeConn, query, [dataInicio, dataFim]);
    return NextResponse.json({ rows });
  } catch (err: any) {
    console.error('[API Siglario]', err);
    return NextResponse.json({ error: err.message || 'Erro ao executar consulta.' }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const scriptPath = path.join(process.cwd(), 'SQL', 'Processar_Siglario.py');
    console.log(`[API] Iniciando processamento de siglário: ${scriptPath}`);

    // -u para unbuffered output (essencial para ver logs em tempo real)
    const pythonProcess = spawn('python', ['-u', scriptPath]);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error(`[API] Erro no script Python (Code ${exitCode}):`, error);
      return NextResponse.json({ error: 'Erro ao processar siglário no motor Python.', details: error }, { status: 500 });
    }

    console.log('[API] Processamento concluído:', output);
    return NextResponse.json({ message: 'Processamento concluído com sucesso!', output });
  } catch (err: any) {
    console.error('[API Siglario POST]', err);
    return NextResponse.json({ error: err.message || 'Falha ao iniciar processamento.' }, { status: 500 });
  }
}
