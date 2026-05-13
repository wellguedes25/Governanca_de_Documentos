import os
import json
import oracledb

with open('data/storage.json', 'r') as f:
    data = json.load(f)
    conn_id = data.get('activeConnectionId')
    conn_data = next((c for c in data['connections'] if c['id'] == conn_id), None)
    oracle_path = data.get('oracleClientPath')

if oracle_path:
    oracledb.init_oracle_client(lib_dir=oracle_path)

if conn_data:
    conn = oracledb.connect(user=conn_data['user'], password=conn_data['password'], dsn=conn_data['connectString'])
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM DBAMV.TB_AUDITORIA_SIMILARIDADE WHERE CD_DOCUMENTO = 916 AND IDENTIFICADOR_FILTRO = 'CX_TXT_EVOLUCAO_1'")
    print('Total CX_TXT_EVOLUCAO_1 em 916:', cursor.fetchone()[0])
