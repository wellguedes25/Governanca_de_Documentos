import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery, testConnection } from '@/lib/oracle';

// Validação rigorosa de segurança para queries personalizadas
function validateSafeSqlQuery(sql: string): { safe: boolean; reason?: string } {
  const trimmed = sql.trim();
  
  // 1. Deve ser exclusivamente query de leitura (SELECT ou WITH)
  if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
    return { 
      safe: false, 
      reason: 'Apenas consultas de leitura (SELECT ou WITH) são permitidas nesta API.' 
    };
  }

  // 2. Não deve conter múltiplos statements encadeados
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    return { 
      safe: false, 
      reason: 'Execução de múltiplos comandos SQL encadeados é bloqueada por segurança.' 
    };
  }

  // 3. Proibir comandos DDL, DML e transacionais
  const forbiddenKeywords = [
    /\bDROP\b/i,
    /\bTRUNCATE\b/i,
    /\bDELETE\b/i,
    /\bUPDATE\b/i,
    /\bINSERT\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bMERGE\b/i,
    /\bEXECUTE\b/i,
    /\bEXEC\b/i,
    /\bBEGIN\b/i,
    /\bDECLARE\b/i,
    /\bCALL\b/i,
    /\bLOCK\b/i,
  ];

  for (const pattern of forbiddenKeywords) {
    if (pattern.test(trimmed)) {
      return { 
        safe: false, 
        reason: 'Operação destrutiva ou DDL/DML detectada: comando bloqueado por segurança.' 
      };
    }
  }

  // 4. Proibir acesso a esquemas administrativos críticos do Oracle
  const forbiddenAdminObjects = [
    /\bSYS\./i,
    /\bSYSTEM\./i,
    /\bDBA_USERS\b/i,
    /\bV\$SESSION\b/i,
    /\bV\$PROCESS\b/i,
  ];

  for (const pattern of forbiddenAdminObjects) {
    if (pattern.test(trimmed)) {
      return { 
        safe: false, 
        reason: 'Acesso a objetos administrativos internos do Oracle é restrito.' 
      };
    }
  }

  return { safe: true };
}

export async function POST(request: Request) {
  const body = await request.json();
  const data = await getData();

  const connection = data.connections.find(c => c.id === data.activeConnectionId);

  if (!connection) {
    return NextResponse.json({ error: 'Nenhuma conexão ativa selecionada.' }, { status: 400 });
  }

  try {
    if (body.type === 'TEST') {
      const result = await testConnection(connection);
      return NextResponse.json(result);
    }

    // Busca a query correspondente no storage
    let sql: string;
    let isPredefined = true;

    if (body.query === 'PROFILE') {
      sql = (body.version === 'V3' ? (data.profileQueryV3 || data.profileQuery) : data.profileQuery);
    } else if (body.query === 'METADATA') {
      sql = (body.version === 'V3' ? (data.docMetadataQueryV3 || data.docMetadataQuery) : data.docMetadataQuery);
    } else if (body.query === 'ACTIONS') {
      sql = (body.version === 'V3' ? (data.docActionsQueryV3 || data.docActionsQuery) : data.docActionsQuery);
    } else if (body.query === 'RULES' || body.query === 'DOC_RULES') {
      sql = data.docRulesQueryV3 || data.docActionsQueryV3 || data.docActionsQuery;
    } else if (body.query === 'AMBULATORY_PROFILES') {
      sql = data.ambulatoryProfilesQuery;
    } else if (body.query === 'AMBULATORY_PROFILE_DETAILS') {
      sql = data.ambulatoryProfileDetailsQuery;
    } else if (body.query === 'DOCUMENTOS' || body.query === 'V3' || body.query === 'V2') {
      const isV3 = body.version === 'V3' || body.query === 'V3';
      sql = isV3 ? (data.activeQueryV3 || data.activeQuery) : data.activeQuery;
    } else if (body.query && typeof body.query === 'string') {
      sql = body.query;
      isPredefined = false;
    } else {
      sql = (body.version === 'V3') ? (data.activeQueryV3 || data.activeQuery) : data.activeQuery;
    }

    if (!sql) {
      return NextResponse.json({ error: 'Query SQL não encontrada.' }, { status: 400 });
    }

    // Se for query personalizada dinâmica do cliente, submeter à trava de segurança
    if (!isPredefined) {
      const validation = validateSafeSqlQuery(sql);
      if (!validation.safe) {
        console.warn(`[Security Alert] Query bloqueada em /api/oracle/execute: ${validation.reason}`);
        return NextResponse.json({ error: validation.reason }, { status: 403 });
      }
    }

    // Usa bind variables nomeados do oracledb — elimina SQL Injection.
    const binds = body.params && typeof body.params === 'object' ? body.params : {};

    const rows = await executeQuery(connection, sql, binds);
    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
