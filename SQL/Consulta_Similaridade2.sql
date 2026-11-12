WITH DADOS_EVOLUCAO AS (
    SELECT
        cd_atendimento,
        cd_paciente,
        cd_prestador_criou,
        dh_fechamento,
        ds_resposta AS texto_atual
    FROM dbamv.vdic_pw_resposta_documento
    WHERE cd_documento = 916
      AND tp_status IN ('FECHADO', 'ASSINADO')
      AND ds_identificador_metadado = 'CX_TXT_EVOLUCAO_1'
      -- Ajuste para incluir as horas, garantindo o dia completo
      AND dh_fechamento BETWEEN TO_DATE('01/03/2026 00:00:00', 'DD/MM/YYYY HH24:MI:SS')
                            AND TO_DATE('02/03/2026 23:59:59', 'DD/MM/YYYY HH24:MI:SS')
      AND ds_resposta IS NOT NULL
)
SELECT
    cd_atendimento,
    cd_paciente,
    cd_prestador_criou,
    dh_fechamento AS data_evolucao_atual,
    texto_atual,

    -- Traz o texto e a data da evolução IMEDIATAMENTE ANTERIOR do mesmo paciente
    LAG(texto_atual) OVER (PARTITION BY cd_paciente ORDER BY dh_fechamento) AS texto_anterior,
    LAG(dh_fechamento) OVER (PARTITION BY cd_paciente ORDER BY dh_fechamento) AS data_evolucao_anterior

FROM DADOS_EVOLUCAO;



