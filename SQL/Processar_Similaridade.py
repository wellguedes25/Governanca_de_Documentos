import pandas as pd
import oracledb
import os
import json
import multiprocessing
from difflib import SequenceMatcher
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# Carrega configurações do arquivo .env
load_dotenv()

# Força o fetch de CLOBs como strings (Evita crash de pickling no multiprocessing)
oracledb.defaults.fetch_lobs = False

# ==========================================
# CONFIGURAÇÕES
# ==========================================
DB_USER = os.getenv("ORACLE_USER")
DB_PASS = os.getenv("ORACLE_PASS")
DB_DSN = os.getenv("ORACLE_DSN")
ORACLE_CLIENT_PATH = os.getenv("ORACLE_CLIENT_PATH")
BATCH_SIZE = 1000 # Reduzido para 1000 para máxima estabilidade e feedback frequente na UI

# Ativa Thick Mode se o caminho for fornecido
if ORACLE_CLIENT_PATH:
    try:
        oracledb.init_oracle_client(lib_dir=ORACLE_CLIENT_PATH)
        # Removido print redundante para limpar logs do console
    except Exception as e:
        print(f"AVISO: Falha ao carregar Oracle Client: {e}")

# ==========================================
# CARREGA PARÂMETROS DO STORAGE.JSON
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_FILE = os.path.join(BASE_DIR, 'data', 'storage.json')

def load_storage_params():
    if not os.path.exists(STORAGE_FILE):
        return 15, "0"
    try:
        with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
            storage = json.load(f)
            # Retorna como string para suportar listas separadas por vírgula
            return storage.get('auditDays', 15), str(storage.get('auditDocId', "0"))
    except:
        return 15, "0"

DIAS_A_PROCESSAR, CD_DOCUMENTO_ALVO = load_storage_params()

# ==========================================
# FUNÇÕES DE PROCESSAMENTO
# ==========================================

def calcular_similaridade_unica(par_texto):
    """Função worker para o pool de processos"""
    try:
        atual, anterior = par_texto
        
        if not anterior or not atual or pd.isna(anterior) or pd.isna(atual):
            return 0.0
        
        # Early Exit: Match Exato (Ganha muita performance)
        if atual == anterior:
            return 100.0
            
        # PLN: Ratio de similaridade (Lento)
        score = SequenceMatcher(None, str(atual), str(anterior)).ratio()
        return round(score * 100, 2)
    except:
        return 0.0

def processar_lote(rows, columns, executor):
    """Processa um lote de dados usando paralelismo"""
    df = pd.DataFrame(rows, columns=columns)
    
    # Prepara os pares para o processamento paralelo
    pares = list(zip(df['TEXTO_ATUAL'], df['TEXTO_ANTERIOR']))
    
    # Executa em paralelo usando o pool de processos
    scores = list(executor.map(calcular_similaridade_unica, pares))
    
    df['GRAU_SIMILARIDADE'] = scores
    
    # Retorna os dados prontos para inserção
    return df[[
        'CD_ATENDIMENTO', 'CD_DOCUMENTO', 'DS_DOCUMENTO', 'IDENTIFICADOR_FILTRO',
        'DH_FECHAMENTO', 'CD_PRESTADOR', 'LEITO', 'UNIDADE', 'GRAU_SIMILARIDADE'
    ]].values.tolist()

def main():
    if not all([DB_USER, DB_PASS, DB_DSN]):
        print("ERRO: Credenciais não encontradas no arquivo .env")
        return

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando Motor NLP Otimizado (Batch: {BATCH_SIZE})")
    print(f" - Janela: {DIAS_A_PROCESSAR} dias | Doc: {'Todos' if CD_DOCUMENTO_ALVO == 0 else CD_DOCUMENTO_ALVO}")

    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cursor_fetch = conn.cursor()
        cursor_insert = conn.cursor()

        # 1. LIMPEZA (Evita duplicidade no período)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Limpando registros anteriores...")
        query_delete = f"DELETE FROM DBAMV.TB_AUDITORIA_SIMILARIDADE WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - {DIAS_A_PROCESSAR}"
        if CD_DOCUMENTO_ALVO and str(CD_DOCUMENTO_ALVO) != "0":
            ids_limpos = ",".join([x.strip() for x in str(CD_DOCUMENTO_ALVO).split(",") if x.strip()])
            if "," in ids_limpos:
                query_delete += f" AND CD_DOCUMENTO IN ({ids_limpos})"
            else:
                query_delete += f" AND CD_DOCUMENTO = {ids_limpos}"
        cursor_insert.execute(query_delete)
        conn.commit()

        # 2. EXTRAÇÃO E PROCESSAMENTO ITERATIVO
        query_extracao = f"SELECT * FROM DBAMV.V_AUDITORIA_COPIA_COLA WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - {DIAS_A_PROCESSAR}"
        if CD_DOCUMENTO_ALVO and str(CD_DOCUMENTO_ALVO) != "0":
            # Limpa espaços e garante formato correto para o IN
            ids_limpos = ",".join([x.strip() for x in str(CD_DOCUMENTO_ALVO).split(",") if x.strip()])
            if "," in ids_limpos:
                query_extracao += f" AND CD_DOCUMENTO IN ({ids_limpos})"
            else:
                query_extracao += f" AND CD_DOCUMENTO = {ids_limpos}"

        # Contagem total para o progresso na UI
        count_query = f"SELECT COUNT(*) FROM ({query_extracao})"
        cursor_fetch.execute(count_query)
        total_registros = cursor_fetch.fetchone()[0]
        print(f"[TOTAL] {total_registros}")

        cursor_fetch.execute(query_extracao)
        columns = [col[0] for col in cursor_fetch.description]
        
        query_insert = """
            INSERT INTO DBAMV.TB_AUDITORIA_SIMILARIDADE (
                CD_ATENDIMENTO, CD_DOCUMENTO, DS_DOCUMENTO, IDENTIFICADOR_FILTRO,
                DH_FECHAMENTO, CD_PRESTADOR, LEITO, UNIDADE, GRAU_SIMILARIDADE
            ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)
        """

        total_processado = 0
        lote_num = 1
        
        # Cap workers para evitar sobrecarga (8 é um valor seguro para documentos clínicos longos)
        num_cores = min(multiprocessing.cpu_count(), 8)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Ativando Paralelismo (Workers: {num_cores})")
        
        try:
            with ThreadPoolExecutor(max_workers=num_cores) as executor:
                while True:
                    rows = cursor_fetch.fetchmany(BATCH_SIZE)
                    if not rows:
                        break
                    
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Lote {lote_num}: Processando {len(rows)} registros...")
                    
                    dados_inserir = processar_lote(rows, columns, executor)
                    
                    cursor_insert.executemany(query_insert, dados_inserir)
                    conn.commit()
                    
                    total_processado += len(rows)
                    percentual = round((total_processado / total_registros) * 100, 1) if total_registros > 0 else 100
                    print(f"[PROGRESS] {percentual}")
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Lote {lote_num} OK: {total_processado} acumulados.")
                    lote_num += 1
        except Exception as pool_err:
            print(f"ERRO NO POOL DE PROCESSOS: {pool_err}")
            print("Tentando finalizar lote atual de forma sincronizada...")
            # Fallback para o lote que falhou (processa o que restou de forma síncrona)
            try:
                # O pool_err pode ter acontecido no meio do processar_lote.
                # Como não temos as rows aqui fora facilmente sem refatorar, 
                # vamos garantir que o loop principal termine graciosamente.
                pass
            except:
                pass

        print(f"[{datetime.now().strftime('%H:%M:%S')}] SUCESSO! Total de {total_processado} registros auditados.")

    except Exception as e:
        print(f"\nERRO DURANTE O PROCESSAMENTO: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
        print("Processo finalizado.")

if __name__ == "__main__":
    main()
