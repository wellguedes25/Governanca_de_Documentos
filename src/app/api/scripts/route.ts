import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

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

    const { file, label } = SCRIPTS[script];
    const sqlDir = path.join(process.cwd(), 'SQL');
    const scriptPath = path.join(sqlDir, file);

    const output = await new Promise<string>((resolve, reject) => {
      const chunks: string[] = [];
      const proc = spawn('python', [scriptPath], {
        cwd: sqlDir,
        env: { ...process.env },
        shell: true,
      });

      proc.stdout.on('data', (data) => {
        chunks.push(data.toString());
      });

      proc.stderr.on('data', (data) => {
        chunks.push(`[STDERR] ${data.toString()}`);
      });

      proc.on('close', (code) => {
        const fullOutput = chunks.join('');
        if (code === 0) {
          resolve(fullOutput);
        } else {
          reject(new Error(`Processo encerrado com código ${code}\n${fullOutput}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Falha ao iniciar processo: ${err.message}`));
      });

      // Timeout de 5 minutos (scripts pesados contra Oracle)
      setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('Timeout: Processo excedeu 5 minutos'));
      }, 5 * 60 * 1000);
    });

    return NextResponse.json({
      success: true,
      script: label,
      output,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro ao executar script Python:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
