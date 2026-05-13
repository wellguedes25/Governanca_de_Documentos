import urllib.request
import json

url = 'http://localhost:3000/api/oracle/execute'
data = {
    'query': "SELECT A.CD_ATENDIMENTO as ATENDIMENTO, A.CD_DOCUMENTO as DOCUMENTO, A.DS_DOCUMENTO as NOME_DOCUMENTO, A.IDENTIFICADOR_FILTRO as IDENTIFICADOR, TO_CHAR(A.DH_FECHAMENTO, 'YYYY-MM-DD HH24:MI:SS') as DATA_HORA_ISO, A.DH_FECHAMENTO as DATA_HORA, A.CD_PRESTADOR as PRESTADOR, A.LEITO, A.UNIDADE, A.GRAU_SIMILARIDADE as SCORE FROM DBAMV.TB_AUDITORIA_SIMILARIDADE A WHERE A.CD_DOCUMENTO = :CD_DOCUMENTO AND A.IDENTIFICADOR_FILTRO = :IDENTIFICADOR AND A.DH_FECHAMENTO BETWEEN TO_DATE(:DATA_INI, 'YYYY-MM-DD') AND TO_DATE(:DATA_FIM, 'YYYY-MM-DD') + 1 ORDER BY A.GRAU_SIMILARIDADE DESC",
    'params': {
        'CD_DOCUMENTO': '916',
        'IDENTIFICADOR': 'CX_TXT_EVOLUCAO_1',
        'DATA_INI': '2026-05-01',
        'DATA_FIM': '2026-05-15'
    }
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as f:
        res = json.loads(f.read().decode('utf-8'))
        print('Rows returned:', len(res.get('rows', [])))
        if 'error' in res:
            print('Error:', res['error'])
except Exception as e:
    print('HTTP Exception:', str(e))
