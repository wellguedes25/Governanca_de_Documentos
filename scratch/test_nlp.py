import re

BLOCKLIST_SISTEMA = {
    'dbamv', 'mvpep', 'mveditor', 'oracle', 'select', 'insert', 'update',
    'delete', 'from', 'where', 'join', 'null', 'true', 'false',
    # Templates MV comuns
    'sem', 'nao', 'sim', 'com', 'para', 'por', 'uma', 'uns', 'mas',
    'que', 'dos', 'das', 'nos', 'nas', 'seu', 'sua', 'foi', 'era',
    'esta', 'este', 'isso', 'pois', 'como', 'aquele', 'aquela', 'pelo', 'pela',
    # Palavras de aviso de template em caps
    'paciente', 'medico', 'inicial', 'final', 'inicio', 'atendimento',
    'diagnóstico', 'diagnostico', 'liberado', 'valida', 'acesso',
    'informado', 'selecione', 'preencha', 'recomendamos', 'convenio',
    'hospital', 'unidade', 'setor', 'leito', 'equipe', 'data', 'hora',
    'evolução', 'evolucao', 'conduta', 'exame', 'anexo', 'observação', 'observacao',
    'atendimentos', 'atendimento.', 'atend.', 'atd', 'proc', 'prescr', 'visto', 'conforme',
}

REGEX_UPPER  = re.compile(r'\b[A-Z]{2,6}\b')
REGEX_DOT    = re.compile(r'\b(?:[A-Za-z]\.){2,}')
REGEX_ABBREV = re.compile(r'\b[a-zA-Z]{2,4}\.')

def test_detection(texto):
    print(f"Testing text: {texto}")
    candidatos = (
        list(REGEX_UPPER.finditer(texto)) +
        list(REGEX_DOT.finditer(texto))   +
        list(REGEX_ABBREV.finditer(texto))
    )
    for m in candidatos:
        sigla = m.group()
        s_low = sigla.lower().strip('.,; ')
        print(f"  Match: '{sigla}' (s_low: '{s_low}')")
        if s_low in BLOCKLIST_SISTEMA:
            print(f"    - Skipped: In blocklist")
            continue
        if sigla.isupper() and len(sigla) > 6:
            print(f"    - Skipped: Too long (>6)")
            continue
        print(f"    - INFRACTION detected!")

test_detection("SEM O PACIENTE EM AVALIAÇÃO INICIAL")
test_detection("ATENDIMENTO. CONFORME LIBERADO")
test_detection("atendimento. alongada.")
test_detection("pac. med. pt.")
test_detection("CRM - RJ:1381868")
test_detection("MVPEP DBAMV")
test_detection("VALIDA LIBERADO")
test_detection("DBAMV.")
