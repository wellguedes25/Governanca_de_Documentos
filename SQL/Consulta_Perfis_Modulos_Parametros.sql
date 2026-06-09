SELECT
       pa.cd_perfil_ambulatorial      AS Cod_Perfil,
       pa.ds_perfil_ambulatorial      AS Nome_Perfil,
       pa.cd_especialidade            AS Cod_Especialidade,
       esp.ds_especialid              AS Especialidade,
       pa.cd_sistema                  AS Sistema,
       pa.tp_porta_entrada            AS Porta_Entrada,
       pa.tp_atendimento              AS Tipo_Atendimento,
       pa.cd_tip_presta               AS Cod_Tipo_Prestador,   -- Correção de alias duplicado
       tp.nm_tip_presta               AS Nome_Tipo_Prestador,  -- Correção de alias duplicado
       pa.cd_setor                    AS Cod_Setor,            -- Padronização de alias
       seto.nm_setor                  AS Nome_Setor,
       pa.cd_multi_empresa            AS Empresa_Fixa,
       pm.cd_perfil_modulo            AS Cod_Perfil_Modulo,
       pm.cd_modulo                   AS Modulo,
       pm.cd_perfil_modulo_pai        AS Cod_Perfil_Modulo_Pai,
        pmp.cd_perfil_modulo           AS Cod_Perfil_Mod_Origem,

       pm.nm_titulo                   AS Titulo,
       pm.cd_perfil_modulo_agrupador  AS Agrupador,
       pmp.cd_perfil_modulo_parametro AS Cod_Mod_Parametro,
       pmp.cd_modulo                  AS Modulo_Parametro,
       pmp.cd_parametro               AS Parametro,

       pmp.nm_valor                   AS Valor_Parametro,
       pmp.ds_valor                   AS Desc_Valor_Parametro

  FROM dbamv.perfil_ambulatorial pa
 INNER JOIN dbamv.pw_perfil_modulo pm
         ON pa.cd_perfil_ambulatorial = pm.cd_perfil_ambulatorial
 INNER JOIN dbamv.pw_perfil_modulo_parametro pmp
         ON pm.cd_perfil_modulo = pmp.cd_perfil_modulo
  LEFT JOIN dbamv.especialid esp
         ON esp.cd_especialid = pa.cd_especialidade
  LEFT JOIN dbamv.tip_presta tp
         ON tp.cd_tip_presta = pa.cd_tip_presta
  LEFT JOIN dbamv.setor seto
         ON seto.cd_setor = pa.cd_setor

 WHERE pa.sn_ativo = 'S'
   AND pa.tp_perfil = 'SIS'
