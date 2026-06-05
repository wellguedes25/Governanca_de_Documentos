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
        
        print("Testando JOIN da view com EDITOR_CAMPO para filtrar tipo de visualização (1,2)...")
        # Query experimental unindo a view com a tabela de campos
        query = """
            SELECT COUNT(*) 
            FROM DBAMV.V_AUDITORIA_COPIA_COLA V
            JOIN DBAMV.EDITOR_CAMPO EC ON EC.DS_IDENTIFICADOR = V.IDENTIFICADOR_FILTRO
            WHERE V.DH_FECHAMENTO >= TRUNC(SYSDATE) - 15
              AND V.CD_DOCUMENTO = 772
              AND EC.CD_TIPO_VISUALIZACAO IN (1, 2)
        """
        cursor.execute(query)
        count = cursor.fetchone()[0]
        print(f"Total de registros filtrados por tipo (1,2): {count}")
        
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    test()
