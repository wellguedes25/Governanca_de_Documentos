---- documentos mais copiados que são de versões diferentes
SELECT doc.cd_documento AS Cod_Documento,
       doc.ds_documento AS nome_documento,
       v_atual.versao_maxima AS versao_atual_publicada,
       lay.cd_versao_documento AS versao_copiada_desatualizada,
       COUNT(pec.cd_documento) AS qtd_ocorrencias
  FROM dbamv.pw_editor_clinico pec
 INNER JOIN dbamv.pw_documento_clinico pdc
    ON pdc.cd_documento_clinico = pec.cd_documento_clinico
 INNER JOIN dbamv.editor_registro er
    ON er.cd_registro = pec.cd_editor_registro
 INNER JOIN dbamv.editor_layout lay
    ON lay.cd_layout = er.cd_layout
 INNER JOIN dbamv.editor_documento doc
    ON doc.cd_documento = pec.cd_documento
 INNER JOIN (
        SELECT versao.cd_documento,
               MAX(versao.cd_versao_documento) AS versao_maxima
          FROM dbamv.editor_versao_documento versao
         WHERE versao.cd_tipo_versao = 3
           AND versao.sn_foi_publicado = 'S'
         GROUP BY versao.cd_documento
       ) v_atual
    ON v_atual.cd_documento = pec.cd_documento
 WHERE lay.cd_tipo_layout = 1
   AND pdc.dh_fechamento >= TRUNC(SYSDATE) - 30
   AND pdc.tp_status IN ('FECHADO', 'ASSINADO')
   AND lay.cd_versao_documento < v_atual.versao_maxima
 GROUP BY doc.cd_Documento,
          doc.ds_documento,
          v_atual.versao_maxima,
          lay.cd_versao_documento
 ORDER BY qtd_ocorrencias DESC,
          nome_documento
 FETCH FIRST 10 ROWS ONLY;

-----


