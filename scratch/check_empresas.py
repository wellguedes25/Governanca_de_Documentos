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
    
    try:
        cursor.execute("SELECT CD_MULTI_EMPRESA, DS_MULTI_EMPRESA AS NM_FANTASIA FROM DBAMV.MULTI_EMPRESAS WHERE SN_ATIVO = 'S' ORDER BY CD_MULTI_EMPRESA")
        rows = cursor.fetchall()
        print(f"Total empresas ativas: {len(rows)}")
        for r in rows:
            print(r)
    except Exception as e:
        print(f"Error: {e}")
        
    try:
        cursor.execute("SELECT * FROM DBAMV.MULTI_EMPRESAS")
        rows = cursor.fetchall()
        print(f"Total empresas (todas): {len(rows)}")
    except Exception as e:
        print(f"Error querying all: {e}")
        
    conn.close()

if __name__ == "__main__":
    test()
