import oracledb
import os
import json

def test():
    try:
        with open('data/storage.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            conn_id = data.get('activeConnectionId')
            conn_data = next((c for c in data['connections'] if str(c['id']) == str(conn_id)), None)
            oracle_path = data.get('oracleClient_Path', data.get('oracleClientPath'))
            
        if oracle_path:
            oracledb.init_oracle_client(lib_dir=oracle_path)

        conn = oracledb.connect(user=conn_data['user'], password=conn_data['password'], dsn=conn_data['connectString'])
        cursor = conn.cursor()
        
        print("Buscando top 10 identificadores de filtro na view...")
        cursor.execute("SELECT IDENTIFICADOR_FILTRO, COUNT(*) FROM DBAMV.V_AUDITORIA_COPIA_COLA WHERE ROWNUM <= 10000 GROUP BY IDENTIFICADOR_FILTRO ORDER BY 2 DESC")
        rows = cursor.fetchall()
        for r in rows:
            print(f"ID: {r[0]} | Count: {r[1]}")
        
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test()
