import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { getData } from '@/lib/storage';

const SCRIPTS: Record<string, { file: string; label: string }> = {
  siglario: { file: 'Processar_Siglario.py', label: 'Auditoria de Siglário' },
  similaridade: { file: 'Processar_Similaridade.py', label: 'Auditoria de Similaridade' },
};

export async function POST(request: Request) {
  try {
    const { script } = await request.json();

    if (!script || !SCRIPTS[script]) {
      return NextResponse.json(
        { error: `Script inválido. Opções: ${Object.keys(SCRIPTS).join(', ')}` },
        { status: 400 }
      );
    }

    const { file } = SCRIPTS[script];
    const sqlDir = path.join(process.cwd(), 'SQL');
    const scriptPath = path.join(sqlDir, file);

    const storageData = await getData();
    const activeConn = storageData.connections.find(c => c.id === storageData.activeConnectionId);
    
    const procEnv: Record<string, string | undefined> = { ...process.env };
    if (activeConn) {
      procEnv.ORACLE_USER = activeConn.user;
      if (activeConn.password) procEnv.ORACLE_PASS = activeConn.password;
      procEnv.ORACLE_DSN = activeConn.connectString;
    }
    if (storageData.oracleClientPath) {
      procEnv.ORACLE_CLIENT_PATH = storageData.oracleClientPath;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const proc = spawn('python', ['-u', scriptPath], {
          cwd: sqlDir,
          env: procEnv as NodeJS.ProcessEnv,
          shell: true,
        });

        const send = (data: string) => {
          controller.enqueue(encoder.encode(data));
        };

        proc.stdout.on('data', (data) => {
          send(data.toString());
        });

        proc.stderr.on('data', (data) => {
          send(`[ERRO] ${data.toString()}`);
        });

        proc.on('close', (code) => {
          if (code === 0) {
            send('\n[FINISH] Processo concluído com sucesso.');
          } else {
            send(`\n[ERROR] Processo encerrado com código ${code}`);
          }
          controller.close();
        });

        proc.on('error', (err) => {
          send(`\n[FATAL] Falha ao iniciar: ${err.message}`);
          controller.close();
        });

        // Kill after 60 mins (Aumentado para suportar grandes volumes)
        setTimeout(() => {
          proc.kill('SIGTERM');
          send('\n[TIMEOUT] Processo interrompido após 60 minutos.');
          controller.close();
        }, 60 * 60 * 1000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
