import { NextResponse } from 'next/server';
import { getData } from '@/lib/storage';
import { executeQuery } from '@/lib/oracle';

export async function POST(request: Request) {
  try {
    const { docId, vA, vB } = await request.json();

    if (!docId || vA === undefined || vB === undefined) {
      return NextResponse.json({ error: 'docId, vA, and vB are required' }, { status: 400 });
    }

    const data = await getData();
    const activeConn = data.connections.find(c => c.id === data.activeConnectionId);

    if (!activeConn) {
      return NextResponse.json({ error: 'Nenhuma conexão ativa.' }, { status: 400 });
    }

    const fieldsQuery = `
      SELECT 
          evd.vl_versao as VERSAO,
          ec.cd_campo as CD_CAMPO,
          ec.ds_identificador as IDENTIFICADOR,
          ec.ds_campo as NOME_CAMPO
      FROM dbamv.editor_versao_documento evd
      JOIN dbamv.editor_layout el ON el.cd_versao_documento = evd.cd_versao_documento
      JOIN dbamv.editor_layout_campo elc ON elc.cd_layout = el.cd_layout
      JOIN dbamv.editor_campo ec ON ec.cd_campo = elc.cd_campo
      JOIN dbamv.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
      WHERE evd.cd_documento = :DOC_ID
      AND etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
      AND evd.vl_versao IN (:VA, :VB)
    `;

    const rulesQuery = `
      SELECT 
          evd.vl_versao as VERSAO,
          er.cd_regra as CD_REGRA,
          er.ds_regra as NOME_REGRA
      FROM dbamv.editor_versao_documento evd
      JOIN dbamv.editor_layout el ON el.cd_versao_documento = evd.cd_versao_documento
      JOIN dbamv.editor_layout_regra elr ON elr.cd_layout = el.cd_layout
      JOIN dbamv.editor_regra er ON er.cd_regra = elr.cd_regra
      JOIN dbamv.editor_tipo_layout etl ON etl.cd_tipo_layout = el.cd_tipo_layout
      WHERE evd.cd_documento = :DOC_ID
      AND etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
      AND evd.vl_versao IN (:VA, :VB)
    `;

    const [fieldsData, rulesData] = await Promise.all([
      executeQuery(activeConn, fieldsQuery, { DOC_ID: docId, VA: vA, VB: vB }),
      executeQuery(activeConn, rulesQuery, { DOC_ID: docId, VA: vA, VB: vB })
    ]);

    // Grouping
    const result = {
      fieldsA: fieldsData.filter((f: any) => f.VERSAO === Number(vA)),
      fieldsB: fieldsData.filter((f: any) => f.VERSAO === Number(vB)),
      rulesA: rulesData.filter((r: any) => r.VERSAO === Number(vA)),
      rulesB: rulesData.filter((r: any) => r.VERSAO === Number(vB)),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching diff:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
