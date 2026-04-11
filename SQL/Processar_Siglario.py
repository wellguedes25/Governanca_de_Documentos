import oracledb
import os
import json
import re
from datetime import datetime
from dotenv import load_dotenv

# ==========================================
# CONFIGURAÇÕES
# ==========================================
load_dotenv()

DB_USER = os.getenv("ORACLE_USER")
DB_PASS = os.getenv("ORACLE_PASS")
DB_DSN  = os.getenv("ORACLE_DSN")        # Ex: ip:1521/servico
ORACLE_CLIENT_PATH = os.getenv("ORACLE_CLIENT_PATH")

# Ativa Thick Mode (igual ao Processar_Similaridade.py)
if ORACLE_CLIENT_PATH:
    try:
        oracledb.init_oracle_client(lib_dir=ORACLE_CLIENT_PATH)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Thick Mode ativado com: {ORACLE_CLIENT_PATH}")
    except Exception as e:
        print(f"AVISO: Falha ao carregar Oracle Client: {e}")

# ==========================================
# PARÂMETROS DE PROCESSAMENTO
# ==========================================
DIAS_A_PROCESSAR = 7       # Janela de análise (dias atrás)
CD_DOCUMENTO_ALVO = 916    # 0 = todos os documentos

# ==========================================
# CARREGA DICIONÁRIO DO STORAGE.JSON
# ==========================================
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_FILE = os.path.join(BASE_DIR, 'data', 'storage.json')

def load_siglario():
    if not os.path.exists(STORAGE_FILE):
        print(f"AVISO: {STORAGE_FILE} não encontrado. Usando listas vazias.")
        return set(), set()
    with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
        storage = json.load(f)
    allowed   = set(s.lower() for s in storage.get('siglarioAllowed',   []))
    forbidden = set(s.lower() for s in storage.get('siglarioForbidden', []))
    return allowed, forbidden

ALLOWED, FORBIDDEN = load_siglario()
print(f"[{datetime.now().strftime('%H:%M:%S')}] Siglário: {len(ALLOWED)} permitidas | {len(FORBIDDEN)} proibidas")

# ==========================================
# REGRAS REGEX
# ==========================================
REGEX_UPPER   = re.compile(r'\b[A-Z]{2,}\b')           # Ex: IAM, SVO
REGEX_DOT     = re.compile(r'\b(?:[A-Za-z]\.){2,}')   # Ex: S.V.O.
REGEX_ABBREV  = re.compile(r'\b[a-zA-Z]{2,}\.')        # Ex: pac. med.

def detectar_infracoes(texto, sigla_doc):
    """Retorna lista de (sigla, contexto) detectadas no texto."""
    encontrados = set()
    resultados  = []

    for m in list(REGEX_UPPER.finditer(texto)) + list(REGEX_DOT.finditer(texto)) + list(REGEX_ABBREV.finditer(texto)):
        sigla = m.group()
        s_low = sigla.lower()

        if s_low in encontrados:
            continue  # já detectada neste doc — evita avalanche de duplicatas

        is_invalid = False
        if s_low in FORBIDDEN:
            is_invalid = True
        elif s_low not in ALLOWED:
            if sigla.isupper() and len(sigla) >= 3:
                is_invalid = True  # maiúscula não cadastrada
            elif '.' in sigla:
                is_invalid = True  # pontuada não cadastrada

        if is_invalid:
            encontrados.add(s_low)
            # Gera snippet de contexto
            start   = max(0, m.start() - 40)
            end     = min(len(texto), m.end() + 40)
            snippet = ('...' if start > 0 else '') + texto[start:end].replace('\r', ' ').replace('\n', ' ').strip() + ('...' if end < len(texto) else '')
            resultados.append((sigla, snippet[:490]))

    return resultados

def main():
    if not all([DB_USER, DB_PASS, DB_DSN]):
        print("ERRO: Credenciais não encontradas no arquivo .env")
        return

    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Conectando ao Oracle...")
        conn   = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cursor = conn.cursor()

        # ----------------------------------------------------------
        # 1. EXTRAÇÃO — reutiliza a mesma view da Similaridade
        # ----------------------------------------------------------
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Extraindo documentos dos últimos {DIAS_A_PROCESSAR} dias...")

        query_ext = f"""
            SELECT 
                CD_ATENDIMENTO,
                CD_DOCUMENTO,
                TEXTO_ATUAL AS TEXTO,
                DH_FECHAMENTO,
                CD_PRESTADOR,
                UNIDADE
            FROM DBAMV.V_AUDITORIA_COPIA_COLA
            WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - {DIAS_A_PROCESSAR}
        """
        if CD_DOCUMENTO_ALVO:
            query_ext += f" AND CD_DOCUMENTO = {CD_DOCUMENTO_ALVO}"

        cursor.execute(query_ext)
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Total de documentos para auditoria: {len(rows)}")

        if not rows:
            print("Nenhum documento no período. Encerrando.")
            return

        # ----------------------------------------------------------
        # 2. LIMPEZA — remove infrações antigas do mesmo período
        # ----------------------------------------------------------
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Limpando registros do período na tabela...")
        del_q = f"DELETE FROM DBAMV.TB_AUDITORIA_SIGLARIO WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - {DIAS_A_PROCESSAR}"
        if CD_DOCUMENTO_ALVO:
            del_q += f" AND CD_DOCUMENTO = {CD_DOCUMENTO_ALVO}"
        cursor.execute(del_q)

        # ----------------------------------------------------------
        # 3. PROCESSAMENTO NLP
        # ----------------------------------------------------------
        COL = {c: i for i, c in enumerate(cols)}

        infracoes = []
        for row in rows:
            texto = row[COL['TEXTO']]
            if not texto:
                continue
            if hasattr(texto, 'read'):   # CLOB
                texto = texto.read()

            for sigla, contexto in detectar_infracoes(texto, row[COL['CD_DOCUMENTO']]):
                infracoes.append((
                    row[COL['CD_ATENDIMENTO']],
                    row[COL['CD_DOCUMENTO']],
                    0,  # CD_EDITOR_REGISTRO — não exposto na view
                    0,  # CD_DOCUMENTO_CLINICO — não exposto na view
                    sigla,
                    contexto,
                    row[COL['DH_FECHAMENTO']],
                    row[COL['CD_PRESTADOR']],
                    row[COL['UNIDADE']],
                ))

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Infrações detectadas: {len(infracoes)}")

        # ----------------------------------------------------------
        # 4. CARGA
        # ----------------------------------------------------------
        if infracoes:
            insert_q = """
                INSERT INTO DBAMV.TB_AUDITORIA_SIGLARIO (
                    CD_ATENDIMENTO, CD_DOCUMENTO, CD_EDITOR_REGISTRO, CD_DOCUMENTO_CLINICO,
                    SIGLA_DETECTADA, CONTEXTO, DH_FECHAMENTO, CD_PRESTADOR, UNIDADE
                ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)
            """
            cursor.executemany(insert_q, infracoes)
            conn.commit()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] SUCESSO! {cursor.rowcount} registros gravados.")
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Nenhuma infração para gravar.")

    except Exception as e:
        print(f"ERRO: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Processo finalizado.")

if __name__ == "__main__":
    main()
