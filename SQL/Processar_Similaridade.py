import pandas as pd
import oracledb
import os
from difflib import SequenceMatcher
from datetime import datetime
from dotenv import load_dotenv

# Carrega configurações do arquivo .env
load_dotenv()

# ==========================================
# CONFIGURAÇÕES
# ==========================================
DB_USER = os.getenv("ORACLE_USER")
DB_PASS = os.getenv("ORACLE_PASS")
DB_DSN = os.getenv("ORACLE_DSN")  # Ex: ip:1521/servico
ORACLE_CLIENT_PATH = os.getenv("ORACLE_CLIENT_PATH") # Caminho do Instant Client

# Ativa Thick Mode se o caminho for fornecido
if ORACLE_CLIENT_PATH:
    try:
        oracledb.init_oracle_client(lib_dir=ORACLE_CLIENT_PATH)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Thick Mode ativado com: {ORACLE_CLIENT_PATH}")
    except Exception as e:
        print(f"AVISO: Falha ao carregar Oracle Client: {e}")

# Filtro de processamento (Opcional)
CD_DOCUMENTO_ALVO = 0
DIAS_A_PROCESSAR = 15

# ==========================================
# FUNÇÃO DE SIMILARIDADE
# ==========================================
def calcular_similaridade(texto_atual, texto_anterior):
    if pd.isna(texto_anterior) or pd.isna(texto_atual) or not texto_anterior or not texto_atual:
        return 0.0
    # ratio() retorna um valor entre 0 e 1
    score = SequenceMatcher(None, str(texto_atual), str(texto_anterior)).ratio()
    return round(score * 100, 2)

def main():
    if not all([DB_USER, DB_PASS, DB_DSN]):
        print("ERRO: Credenciais não encontradas no arquivo .env")
        return

    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Conectando ao Oracle...")
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cursor = conn.cursor()

        # 1. EXTRAÇÃO
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Extraindo dados dos últimos {DIAS_A_PROCESSAR} dias...")
        
        query_extracao = f"SELECT * FROM DBAMV.V_AUDITORIA_COPIA_COLA WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - {DIAS_A_PROCESSAR}"
        if CD_DOCUMENTO_ALVO:
            query_extracao += f" AND CD_DOCUMENTO = {CD_DOCUMENTO_ALVO}"
            
        cursor.execute(query_extracao)
        
        # Obtém os nomes das colunas e os dados nativamente (evita o aviso do Pandas)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        
        df = pd.DataFrame(rows, columns=columns)
        total = len(df)
        print(f"Total de registros para análise: {total}")

        if total == 0:
            print("Nenhum dado encontrado no período selecionado.")
            return

        # 2. LIMPEZA (Remove dados anteriores do mesmo período para evitar duplicidade)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Limpando registros antigos do período de {DIAS_A_PROCESSAR} dias...")
        query_delete = f"DELETE FROM DBAMV.TB_AUDITORIA_SIMILARIDADE WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - {DIAS_A_PROCESSAR}"
        if CD_DOCUMENTO_ALVO:
            query_delete += f" AND CD_DOCUMENTO = {CD_DOCUMENTO_ALVO}"
        cursor.execute(query_delete)

        # 3. PROCESSAMENTO (PLN)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Calculando similaridade textual em {total} linhas...")
        
        # Filtramos apenas linhas que possuem texto anterior para não processar desnecessariamente
        df['GRAU_SIMILARIDADE'] = df.apply(
            lambda row: calcular_similaridade(row['TEXTO_ATUAL'], row['TEXTO_ANTERIOR']), axis=1
        )

        # 3. FILTRAGEM (Opcional: Salvar apenas o que tem alguma similaridade relevante ou tudo?)
        # Vamos salvar tudo para o Dashboard mostrar o histórico completo
        
        # Prepara lista para executemany
        dados_para_inserir = df[[
            'CD_ATENDIMENTO', 'CD_DOCUMENTO', 'DS_DOCUMENTO', 'IDENTIFICADOR_FILTRO',
            'DH_FECHAMENTO', 'CD_PRESTADOR', 'LEITO', 'UNIDADE', 'GRAU_SIMILARIDADE'
        ]].values.tolist()

        # 4. LIMPEZA (Opcional: Limpar dados anteriores para o mesmo documento antes de inserir novos?)
        # cursor.execute(f"DELETE FROM DBAMV.TB_AUDITORIA_SIMILARIDADE WHERE CD_DOCUMENTO = {CD_DOCUMENTO_ALVO}")

        # 5. CARGA
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Gravando resultados em TB_AUDITORIA_SIMILARIDADE...")
        
        query_insert = """
            INSERT INTO DBAMV.TB_AUDITORIA_SIMILARIDADE (
                CD_ATENDIMENTO, CD_DOCUMENTO, DS_DOCUMENTO, IDENTIFICADOR_FILTRO,
                DH_FECHAMENTO, CD_PRESTADOR, LEITO, UNIDADE, GRAU_SIMILARIDADE
            ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)
        """

        cursor.executemany(query_insert, dados_para_inserir)
        conn.commit()
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] SUCESSO! {cursor.rowcount} registros inseridos.")

    except Exception as e:
        print(f"ERRO DURANTE O PROCESSAMENTO: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
        print("Processo finalizado.")

if __name__ == "__main__":
    main()
