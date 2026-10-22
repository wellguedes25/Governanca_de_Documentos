
SELECT ed.cd_documento,
       ed.ds_identificador,
       ed.ds_documento,
       evd.cd_versao_documento,
       evd.vl_versao,
       evd.tp_versao,
       evd.sn_publicado,
       er.cd_regra,
       er.ds_identificador,
       er.ativa,
       er.num_ordem,
       er.cd_layout,
       er.cd_tipo_regra,
       er.ds_identificador,
       erpv.cd_propriedade,
       ep.ds_propriedade,
       erpv.lo_valor
  FROM editor.editor_documento ed,
       editor.editor_versao_documento evd,
       editor.editor_layout el,
       editor.editor_regra er,
       editor.editor_regra_campo erc,
       editor.editor_tipo_regra etr,
       editor.editor_regra_prop_val erpv,
       editor.editor_propriedade ep
WHERE ed.cd_documento = evd.cd_documento
  AND evd.cd_versao_documento = el.cd_versao_documento
  AND el.cd_layout = er.cd_layout
  AND er.cd_regra = erc.cd_regra
  AND er.cd_tipo_regra = etr.cd_tipo_regra
  AND erc.cd_regra = erpv.cd_regra
  AND erpv.cd_propriedade = ep.cd_propriedade
  AND ed.cd_documento = 382



