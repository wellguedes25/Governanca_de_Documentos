SELECT

       pa.cd_perfil_ambulatorial AS cod_Perfil,
       pa.ds_perfil_ambulatorial AS Nome_Perfil,
       pa.cd_especialidade AS Cod_Especialidade,
       (SELECT ds_especialid FROM dbamv.especialid WHERE cd_especialid = pa.cd_especialidade)Especialidade,
       pa.cd_sistema AS Sistema,
       pa.tp_porta_entrada AS Porta_Entrada,
       pa.tp_atendimento AS Tipo_Atendimento,
       pa.cd_tip_presta AS Tipo_Prestador,
       (SELECT nm_tip_presta FROM dbamv.tip_presta WHERE cd_tip_presta = pa.cd_tip_presta)Tipo_Prestador,
       pa.cd_setor AS Setor,
       (SELECT nm_setor FROM dbamv.setor WHERE cd_setor = pa.cd_Setor)Nome_Setor,
       pa.cd_multi_empresa AS Empresa_Fixa,
       pm.cd_perfil_modulo AS Cod_Perfil_Modulo,
       pm.cd_modulo AS Modulo ,
       pm.cd_perfil_modulo_pai AS Cod_Perfil_Modulo_Pai,
       pm.nm_titulo AS Titulo,
       pm.cd_perfil_modulo_agrupador AS Agrupador,
       pmp.cd_perfil_modulo_parametro AS Cod_Mod_Parametro,
       pmp.cd_modulo AS ModuloParametro,
       pmp.cd_parametro AS Parametro,
       pmp.cd_Perfil_modulo AS Cod_Perfil_Mod_Origem,
       pmp.nm_valor AS Valor_Parametro,
       pmp.ds_valor AS Desc_Valor_Parametro

 FROM dbamv.perfil_ambulatorial pa,
      dbamv.pw_perfil_modulo pm,
      dbamv.pw_perfil_modulo_parametro pmp
 WHERE pa.cd_perfil_ambulatorial = pm.cd_perfil_ambulatorial
   AND pm.cd_perfil_modulo = pmp.cd_perfil_modulo
   AND pa.sn_ativo = 'S'
   AND pa.tp_perfil = 'SIS'