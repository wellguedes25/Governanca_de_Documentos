SELECT ev.cd_campo,
       ev.lo_valor,
       ec.cd_campo,

        REGEXP_SUBSTR(
       ev.lo_valor,
       'CD_DOCUMENTO[[:space:]]*IN[[:space:]]*\(([^)]*)\)',
       1,
       1,
       'i',
       1
) AS Grupo_Docs_Relacionados,
REGEXP_SUBSTR(
    ev.lo_valor,
    'CD_DOCUMENTO[[:space:]]*=[[:space:]]*([0-9]+)',
    1,
    1,
    'in',
    1
) Documento_Relacionado,




       ec.cd_metadado,
       ec.ds_campo,
       ec.ds_identificador,
       evd.cd_documento,
       evd.vl_versao,
       ed.ds_documento
  FROM dbamv.editor_campo_prop_val ev,
       dbamv.editor_campo ec,
       dbamv.editor_layout_campo elc,
       dbamv.editor_layout el,
       dbamv.editor_versao_documento evd,
       dbamv.editor_documento ed
  WHERE ev.cd_campo = ec.cd_metadado
    AND ec.cd_campo = elc.cd_campo
    AND elc.cd_layout = el.cd_layout
    AND el.cd_versao_documento = evd.cd_versao_documento
    AND evd.cd_documento = ed.cd_documento
    AND evd.cd_tipo_versao = 3  --- Versão publicada
    AND evd.cd_documento = 916
    AND ev.cd_propriedade = 4  --- Propriedade de Ação
    AND ev.lo_valor IS NOT NULL
    AND REGEXP_LIKE(ev.lo_valor,'CD_DOCUMENTO[[:space:]](=|IN[[:space:]]\()','i')

