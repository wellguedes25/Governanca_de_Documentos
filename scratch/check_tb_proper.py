import oracledb
import json

def test():
    with open('data/storage.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        conn_id = data.get('activeConnectionId')
        conn_data = next((c for c in data['connections'] if str(c['id']) == str(conn_id)), None)
        oracle_path = data.get('oracleClient_Path', data.get('oracleClientPath'))
        
    if oracle_path:
        oracledb.init_oracle_client(lib_dir=oracle_path)

    conn = oracledb.connect(user=conn_data['user'], password=conn_data['password'], dsn=conn_data['connectString'])
    cursor = conn.cursor()
    
    cursor.execute("SELECT CD_DOCUMENTO, COUNT(*) FROM DBAMV.TB_AUDITORIA_SIMILARIDADE WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - 15 GROUP BY CD_DOCUMENTO")
    rows = cursor.fetchall()
    print("TB_AUDITORIA_SIMILARIDADE contents:")
    for r in rows:
        print(r)
        
    conn.close()

if __name__ == "__main__":
    test()
