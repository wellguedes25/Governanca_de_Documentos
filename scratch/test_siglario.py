import oracledb
import os
import json
import sys

def test():
    try:
        with open('data/storage.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            conn_id = data.get('activeConnectionId')
            conn_data = next((c for c in data['connections'] if str(c['id']) == str(conn_id)), None)
            oracle_path = data.get('oracleClient_Path', data.get('oracleClientPath'))
            
        if not conn_data:
            print("Erro: Nenhuma conexão ativa.")
            return

        if oracle_path:
            try:
                oracledb.init_oracle_client(lib_dir=oracle_path)
            except Exception as e:
                print(f"Aviso init client: {e}")

        conn = oracledb.connect(
            user=conn_data['user'], 
            password=conn_data['password'], 
            dsn=conn_data['connectString']
        )
        cursor = conn.cursor()
        
        print("Testando acesso à tabela TB_AUDITORIA_SIGLARIO...")
        cursor.execute("SELECT COUNT(*) FROM DBAMV.TB_AUDITORIA_SIGLARIO")
        count = cursor.fetchone()[0]
        print(f"Sucesso! Total de registros: {count}")
        
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test()
