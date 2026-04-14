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
# CARREGA PARÂMETROS DO STORAGE.JSON
# ==========================================
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_FILE = os.path.join(BASE_DIR, 'data', 'storage.json')

def load_storage_data():
    if not os.path.exists(STORAGE_FILE):
        print(f"AVISO: {STORAGE_FILE} não encontrado. Usando padrões.")
        return set(), set(), 15, 0
    with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
        storage = json.load(f)
    
    allowed    = set(s.lower() for s in storage.get('siglarioAllowed',   []))
    forbidden  = set(s.lower() for s in storage.get('siglarioForbidden', []))
    audit_days = storage.get('auditDays', 15)
    audit_doc  = storage.get('auditDocId', 0)
    
    return allowed, forbidden, audit_days, audit_doc

ALLOWED, FORBIDDEN, DIAS_A_PROCESSAR, CD_DOCUMENTO_ALVO = load_storage_data()

print(f"[{datetime.now().strftime('%H:%M:%S')}] Configurações Medlytics:")
print(f" - Janela: {DIAS_A_PROCESSAR} dias")
print(f" - Documento Alvo: {'Todos' if CD_DOCUMENTO_ALVO == 0 else CD_DOCUMENTO_ALVO}")
print(f" - Siglário: {len(ALLOWED)} permitidas | {len(FORBIDDEN)} proibidas")

# ==========================================
# REGRAS NLP — REFINADAS
# ==========================================

# Siglas médicas reais têm no máximo ~6 letras (IAM, DPOC, BIPAP, APACHE).
# Palavras de template em caps (PACIENTE, INICIAL, LIBERADO) têm 7+ letras.
MAX_SIGLA_LEN = 6

# Palavras de sistema ou template que aparecem em texto gerado automaticamente
# e são escritas em maiúsculas por formatação — NÃO são siglas clínicas.
BLOCKLIST_SISTEMA = {
    'dbamv', 'mvpep', 'mveditor', 'oracle', 'select', 'insert', 'update',
    'delete', 'from', 'where', 'join', 'null', 'true', 'false',
    # Templates MV comuns
    'sem', 'nao', 'sim', 'com', 'para', 'por', 'uma', 'uns', 'mas',
    'que', 'dos', 'das', 'nos', 'nas', 'seu', 'sua', 'foi', 'era', 'em', 'aos', 'aos',
    'esta', 'este', 'isso', 'pois', 'como', 'aquele', 'aquela', 'pelo', 'pela',
    # Palavras de aviso de template em caps
    'paciente', 'medico', 'inicial', 'final', 'inicio', 'atendimento',
    'diagnóstico', 'diagnostico', 'liberado', 'valida', 'acesso',
    'informado', 'selecione', 'preencha', 'recomendamos', 'convenio',
    'hospital', 'unidade', 'setor', 'leito', 'equipe', 'data', 'hora',
    'evolução', 'evolucao', 'conduta', 'exame', 'anexo', 'observação', 'observacao',
    'atendimentos', 'atendimento.', 'atend.', 'atd', 'proc', 'prescr', 'visto', 'conforme',
}

# Regex 1: Siglas puras em maiúsculas — curtas (2 a 6 letras) ex: IAM, HAS, DPOC
REGEX_UPPER  = re.compile(r'\b[A-Z]{2,6}\b')

# Regex 2: Siglas intercaladas com pontos ex: S.V.O.  A.V.C.
REGEX_DOT    = re.compile(r'\b(?:[A-Za-z]\.){2,}')

# Regex 3: Abreviações clínicas curtas (2-4 letras) terminando em ponto
# ex: pac.  med.  pt.  hs.  ampl.      NÃO pega: atendimento.  alongada.
REGEX_ABBREV = re.compile(r'\b[a-zA-Z]{2,4}\.')


def detectar_infracoes(texto, cd_documento):
    """Retorna lista de (sigla, contexto) de termos não padronizados no texto."""
    encontrados = set()
    resultados  = []

    candidatos = (
        list(REGEX_UPPER.finditer(texto)) +
        list(REGEX_DOT.finditer(texto))   +
        list(REGEX_ABBREV.finditer(texto))
    )

    for m in candidatos:
        sigla = m.group()
        # Normalização forte: minúsculo, remove pontos, espaços e vírgulas nas extremidades
        s_low = sigla.lower().strip('.,; ')

        # Já processado neste documento
        if s_low in encontrados:
            continue

        # Filtro 1: Está na blocklist de palavras de sistema/template
        if s_low in BLOCKLIST_SISTEMA:
            continue

        # Filtro 2: Palavra inteiramente maiúscula maior que o limite
        if sigla.isupper() and len(sigla) > MAX_SIGLA_LEN:
            continue

        # Avalia se é infração
        is_invalid = False

        if s_low in FORBIDDEN:
            # Explicitamente proibida pelo dicionário
            is_invalid = True
        elif s_low not in ALLOWED:
            # Não está na whitelist — analisa o padrão
            if sigla.isupper() and len(sigla) >= 2:
                is_invalid = True   # maiúscula curta não cadastrada
            elif re.match(r'^(?:[A-Za-z]\.){2,}$', sigla):
                is_invalid = True   # padrão A.B.C. não cadastrado
            elif re.match(r'^[a-zA-Z]{2,4}\.$', sigla):
                is_invalid = True   # abreviação curta não cadastrada

        if is_invalid:
            encontrados.add(s_low)
            start   = max(0, m.start() - 45)
            end     = min(len(texto), m.end() + 45)
            snippet = ('...' if start > 0 else '') + \
                      texto[start:end].replace('\r', ' ').replace('\n', ' ').strip() + \
                      ('...' if end < len(texto) else '')
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
