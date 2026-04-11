import os
import json
import re
import cx_Oracle
import time
from datetime import datetime
from dotenv import load_dotenv

# Configura o diretório base
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'storage.json')
ENV_PATH = os.path.join(BASE_DIR, 'SQL', '.env')

load_dotenv(ENV_PATH)

print(f"[START] Iniciando Processador de Siglario - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def get_storage_data():
    if not os.path.exists(DATA_PATH):
        print(f"[ERRO] Arquivo storage.json nao encontrado em: {DATA_PATH}")
        return None
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERRO] Falha ao ler storage.json: {e}")
        return None

storage = get_storage_data()
if not storage:
    exit(1)

# Pega o cliente Oracle configurado
oracle_client_path = storage.get('oracleClientPath', r'C:\orant\Client\instantclient_23_0')
if not os.path.exists(oracle_client_path):
    print(f"[ERRO] Oracle Client nao encontrado no diretorio: {oracle_client_path}")
    exit(1)

try:
    cx_Oracle.init_oracle_client(lib_dir=oracle_client_path)
    print(f"[INFO] Oracle Client inicializado: {oracle_client_path}")
except cx_Oracle.ProgrammingError as e:
    if "Oracle Client library has already been initialized" in str(e):
        pass # Ignora
    else:
        print(f"[ERRO] cx_Oracle init falhou: {e}")
        exit(1)
except Exception as e:
    print(f"[ERRO] Nao foi possivel inicializar o oracledb: {e}")
    exit(1)

# Carrega Whitelist (tudo case-insensitive idealmente)
allow_list = storage.get('siglarioAllowed', [])
forbidden_list = storage.get('siglarioForbidden', [])

# Adiciona o próprio nome "Sigla" que as vezes escapa do parser
allow_list_lower = set([a.lower() for a in allow_list])
forbidden_list_lower = set([f.lower() for f in forbidden_list])

print(f"[INFO] Siglario Carregado: {len(allow_list_lower)} Permitidas | {len(forbidden_list_lower)} Proibidas")

def get_connection():
    active_id = storage.get('activeConnectionId')
    conns = storage.get('connections', [])
    active_conn = next((c for c in conns if c['id'] == active_id), None)
    
    if not active_conn:
        print("[ERRO] Nenhuma conexao ativa configurada.")
        return None

    try:
        if active_conn.get('user') and active_conn.get('password') and active_conn.get('connectString'):
            conn = cx_Oracle.connect(
                user=active_conn['user'],
                password=active_conn['password'],
                dsn=active_conn['connectString'],
                encoding="UTF-8"
            )
        else:
            print("[ERRO] Credenciais incompletas.")
            return None
        return conn
    except Exception as e:
        print(f"[ERRO] Falha de conexao BD: {e}")
        return None


# Regex builder
# 1. Palavras que sejam apenas Maiusculas com 2 ou mais letras (ex: IAM, SVO)
REGEX_UPPER_ACRONYM = re.compile(r'\b[A-Z]{2,}\b')
# 2. Siglas do tipo A.B.C ou S.V.O.
REGEX_DOT_ACRONYM = re.compile(r'\b(?:[A-Za-z]\.){2,}')
# 3. Abreviações que terminam com um ponto logo apos texto normal (ex: pac., med., hc.)
REGEX_WORD_DOT = re.compile(r'\b[a-zA-Z]{2,}\.') 

def extract_snippet(text, match_start, match_end, padding=40):
    start = max(0, match_start - padding)
    end = min(len(text), match_end + padding)
    snippet = text[start:end]
    # Limpa quebras de linha excessivas
    snippet = snippet.replace('\r', ' ').replace('\n', ' ')
    if start > 0: snippet = '...' + snippet
    if end < len(text): snippet = snippet + '...'
    return snippet.strip()

def process():
    conn = get_connection()
    if not conn: return
    
    try:
        cursor = conn.cursor()
        
        # Pega a query ativa q tras os documentos (reaproveitando a general scope)
        query = storage.get('profileQuery', '')
        if not query or query == 'SELECT * FROM DUAL':
            print("[ERRO] Sem query de V_AUDITORIA para extrair textos.")
            return
            
        print("[INFO] Buscando documentos para auditoria de Siglario...")
        # Adiciona condição de rownum < 500 caso seja mto pesado
        cursor.execute(f"SELECT * FROM ({query}) WHERE ROWNUM <= 200")
        docs = cursor.fetchall()
        cols = [col[0].upper() for col in cursor.description]
        
        # Mapping index
        idx_cd_atend = cols.index('CD_ATENDIMENTO') if 'CD_ATENDIMENTO' in cols else -1
        idx_cd_doc = cols.index('CD_DOCUMENTO') if 'CD_DOCUMENTO' in cols else -1
        idx_ds_doc = cols.index('DS_DOCUMENTO') if 'DS_DOCUMENTO' in cols else -1
        idx_id_filtro = cols.index('IDENTIFICADOR_FILTRO') if 'IDENTIFICADOR_FILTRO' in cols else -1
        idx_texto = cols.index('TEXTO') if 'TEXTO' in cols else -1
        idx_dh_fech = cols.index('DH_FECHAMENTO') if 'DH_FECHAMENTO' in cols else -1
        idx_cd_prest = cols.index('CD_PRESTADOR') if 'CD_PRESTADOR' in cols else -1
        idx_unidade = cols.index('UNIDADE') if 'UNIDADE' in cols else -1
        idx_cd_doc_clinico = cols.index('CD_DOCUMENTO_CLINICO') if 'CD_DOCUMENTO_CLINICO' in cols else -1
        idx_cd_reg = cols.index('CD_REGISTRO') if 'CD_REGISTRO' in cols else -1

        if idx_texto == -1:
            print("[ERRO] 'TEXTO' ausente na V_AUDITORIA.")
            return

        insert_sql = """
            INSERT INTO DBAMV.TB_AUDITORIA_SIGLARIO (
                CD_ATENDIMENTO, CD_DOCUMENTO, CD_EDITOR_REGISTRO, CD_DOCUMENTO_CLINICO, 
                SIGLA_DETECTADA, CONTEXTO, DH_FECHAMENTO, CD_PRESTADOR, UNIDADE
            ) VALUES (
                :1, :2, :3, :4, :5, :6, :7, :8, :9
            )
        """
        
        print(f"[INFO] Analisando {len(docs)} documentos...")
        
        infracoes_batch = []
        
        for row in docs:
            texto = row[idx_texto]
            if not texto: continue
            
            # Lida com CLOB
            if hasattr(texto, 'read'):
                texto = texto.read()
                
            resultados = []
            
            # 1. upper
            for m in REGEX_UPPER_ACRONYM.finditer(texto):
                resultados.append(m)
            # 2. dots
            for m in REGEX_DOT_ACRONYM.finditer(texto):
                resultados.append(m)
            # 3. words ending in dot
            for m in REGEX_WORD_DOT.finditer(texto):
                resultados.append(m)
                
            infracoes_doc = set() # Evitar dup
            
            for m in resultados:
                sigla = m.group()
                sigla_lower = sigla.lower()
                
                # Regras de Negocio:
                is_invalid = False
                
                # Se esta na blacklist
                if sigla_lower in forbidden_list_lower:
                    is_invalid = True
                else:
                    # Se NÃO está na whitelist e tem caracteristicas suspeitas
                    if sigla_lower not in allow_list_lower:
                        # Precisamos evitar falsos positivos pesados (nomes, inicios de frase, etc)
                        # Essa heurística pode ser ajustada.
                        if sigla.isupper() and len(sigla) >= 3: # Sigla inteira maiuscula não cadastrada
                            is_invalid = True
                        elif '.' in sigla: # Qualquer pontuada n cadastrada
                            is_invalid = True
                            
                if is_invalid and sigla_lower not in infracoes_doc:
                    contexto = extract_snippet(texto, m.start(), m.end())
                    
                    infracoes_doc.add(sigla_lower)
                    
                    cd_atend = row[idx_cd_atend] if idx_cd_atend != -1 else 0
                    cd_doc = row[idx_cd_doc] if idx_cd_doc != -1 else 0
                    cd_editor_reg = row[idx_cd_reg] if idx_cd_reg != -1 else 0
                    cd_doc_clinico = row[idx_cd_doc_clinico] if idx_cd_doc_clinico != -1 else 0
                    dh_fech = row[idx_dh_fech] if idx_dh_fech != -1 else datetime.now()
                    cd_prest = row[idx_cd_prest] if idx_cd_prest != -1 else None
                    unidade = row[idx_unidade] if idx_unidade != -1 else None
                    
                    infracoes_batch.append((
                        cd_atend, cd_doc, cd_editor_reg, cd_doc_clinico,
                        sigla, contexto[:490], dh_fech, cd_prest, unidade
                    ))

        if len(infracoes_batch) > 0:
            print(f"[INFO] Inserindo {len(infracoes_batch)} infracoes detectadas no Dicionario...")
            # Limpa tabela base ou loga? Vamos apenas inserir. Pra esse teste, 
            # podemos limpar caso seja rodada de homologacao, ou confiar que a view ja limita a data.
            # cursor.execute("DELETE FROM DBAMV.TB_AUDITORIA_SIGLARIO")
            cursor.executemany(insert_sql, infracoes_batch)
            conn.commit()
            print("[SUCCESS] Lote de Siglario salvo com sucesso.")
        else:
            print("[INFO] Nenhuma infracao detectada no lote de documentos analisado.")
            
    except Exception as e:
        print(f"[ERRO] Falha no processamento NLP: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    process()
    print(f"[END] Processamento finalizado - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
