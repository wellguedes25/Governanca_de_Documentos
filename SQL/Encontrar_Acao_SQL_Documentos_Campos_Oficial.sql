SELECT ed.cd_documento               AS Codigo_Documento,
       ed.ds_documento               AS Descricao_Documento,
       evd.vl_versao                 AS Versao_Publicada,
       ec.cd_campo                   AS Codigo_Campo_Layout,
       ec.ds_identificador           AS Identificador_Campo,
       ec.ds_campo                   AS Descricao_Campo,

       -- Extrai múltiplos IDs quando usa a cláusula IN ()
       REGEXP_SUBSTR(
           ev.lo_valor,
           'CD_DOCUMENTO[[:space:]]*IN[[:space:]]*\(([^)]*)\)',
           1, 1, 'i', 1
       )                             AS Grupo_Docs_Relacionados,

       -- Extrai um ID único quando usa a cláusula =
       REGEXP_SUBSTR(
           ev.lo_valor,
           'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
           1, 1, 'i', 1
       )                             AS Documento_Relacionado,

       ev.lo_valor                   AS Script_Acao_Completo

  FROM dbamv.editor_documento ed
 INNER JOIN dbamv.editor_versao_documento evd ON ed.cd_documento = evd.cd_documento
 INNER JOIN dbamv.editor_layout el            ON evd.cd_versao_documento = el.cd_versao_documento
 INNER JOIN dbamv.editor_layout_campo elc     ON el.cd_layout = elc.cd_layout
 INNER JOIN dbamv.editor_campo ec             ON elc.cd_campo = ec.cd_campo
 INNER JOIN dbamv.editor_campo_prop_val ev    ON ec.cd_metadado = ev.cd_campo

 WHERE evd.cd_tipo_versao = 3  -- Apenas versões publicadas
   AND ev.cd_propriedade = 4   -- Focado na Propriedade de Ação
   AND ev.lo_valor IS NOT NULL
   AND REGEXP_LIKE(ev.lo_valor, 'CD_DOCUMENTO[[:space:]](=|IN[[:space:]]\()', 'i')
   -- AND ed.cd_documento = 916 -- Filtro específico para o painel

 ORDER BY ec.ds_identificador;