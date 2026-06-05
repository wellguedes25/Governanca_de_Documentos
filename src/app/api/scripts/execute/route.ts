import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function POST(request: Request) {
  const { filename } = await request.json();

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  const data = await getData();
  const connection = data.connections.find((c: any) => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  const sqlDir = path.join(process.cwd(), 'SQL');
  const safeFilename = path.basename(filename);
  const filePath = path.join(sqlDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Script não encontrado no servidor.' }, { status: 404 });
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Remove block comments /* ... */
    let cleanSql = fileContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove inline comments -- ...
    cleanSql = cleanSql.replace(/--.*$/gm, '');
    
    // Split by semicolon
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let executedCount = 0;

    // Execute sequentially
    for (const stmt of statements) {
      // Basic safeguard: don't execute empty or weird artifact lines
      if (stmt.length > 5) {
        console.log('[API Execute Scripts] Executing statement:', stmt.substring(0, 50) + '...');
        // executeQuery usa oracledb com autoCommit true implicitamente no modo DDL (oracledb já o faz, mas executeQuery garante transações lidas)
        // DDLs no Oracle sofrem auto-commit.
        await executeQuery(connection, stmt, {});
        executedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${executedCount} declarações executadas com sucesso.` 
    });

  } catch (err: any) {
    console.error('[API Execute Scripts] Erro ao executar script:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
