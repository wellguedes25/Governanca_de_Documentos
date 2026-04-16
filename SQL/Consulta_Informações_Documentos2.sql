SELECT DISTINCT
       edo.cd_documento             AS Codigo_Documento,
       edo.ds_documento             AS Descricao_Documento,
       edo.ds_identificador         AS Identificador_Documento,
       evd.cd_versao_documento      AS Codigo_Versao_Documento,
       etl.cd_tipo_layout           AS Codigo_Tipo_Layout,
       etl.ds_identificador         AS Identificador_Layout,
       etl.ds_tipo_layout           AS Descricao_Tipo_Layout,
       evd.vl_versao                AS Valor_Versao,
       evd.sn_ativo                 AS Status_Ativo,
       evd.cd_tipo_versao           AS Codigo_Tipo_Versao,
       etv.ds_tipo_versao           AS Descricao_Tipo_Versao,
       edl.cd_layout_cabecalho      AS Codigo_Layout_Cabecalho,
       (SELECT evdo.cd_documento
          FROM dbamv.editor_layout el
         INNER JOIN dbamv.editor_versao_documento evdo
            ON el.cd_versao_documento = evdo.cd_versao_documento
         WHERE el.cd_layout = edl.cd_layout_cabecalho) AS Documento_Cabecalho,
       edl.cd_layout_rodape         AS Codigo_Layout_Rodape

  FROM dbamv.editor_documento edo
 INNER JOIN dbamv.editor_versao_documento evd ON edo.cd_documento = evd.cd_documento
 INNER JOIN dbamv.editor_tipo_versao etv      ON etv.cd_tipo_versao = evd.cd_tipo_versao
 INNER JOIN dbamv.editor_layout edl           ON evd.cd_versao_documento = edl.cd_versao_documento
 INNER JOIN dbamv.editor_tipo_layout etl      ON edl.cd_tipo_layout = etl.cd_tipo_layout

 WHERE etl.ds_identificador NOT IN ('CABECALHO', 'RODAPE')
 --  AND etv.cd_tipo_versao = 3
 --  AND edo.cd_documento = 935

 ORDER BY Codigo_Documento;