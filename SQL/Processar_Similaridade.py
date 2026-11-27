import os
import json
import re
import oracledb
import pandas as pd
from difflib import SequenceMatcher
from datetime import datetime
import time

# ==============================================================================
# CONFIGURAÇÃO E CONEXÃO
# ==============================================================================

STORAGE_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'storage.json')


def sanitize_owner(raw_owner):
    if not raw_owner or not isinstance(raw_owner, str):
        return 'DBAMV'
    cleaned = re.sub(r'[^A-Za-z0-9_$#]', '', raw_owner.strip().upper())
    if not cleaned or not re.match(r'^[A-Z][A-Z0-9_$#]{0,127}$', cleaned):
        return 'DBAMV'
    return cleaned


def load_db_config():
    if not os.path.exists(STORAGE_PATH):
        raise FileNotFoundError(f"Arquivo de configuração não encontrado: {STORAGE_PATH}")

    with open(STORAGE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    active_id = data.get('activeConnectionId')
    connections = data.get('connections', [])
    active_conn = next((c for c in connections if c['id'] == active_id), None)

    if not active_conn:
        raise ValueError("Nenhuma conexão ativa encontrada em storage.json")

    audit_days = int(data.get('auditDays', 15) or 15)
    audit_doc_id = str(data.get('auditDocId', '0') or '0')
    schema_owner = sanitize_owner(data.get('auditSchemaOwner', 'DBAMV'))
    doc_mappings = data.get('docMappings', []) or []

    return {
        'conn': active_conn,
        'audit_days': audit_days,
        'audit_doc_id': audit_doc_id,
        'schema_owner': schema_owner,
        'doc_mappings': doc_mappings,
        'client_path': data.get('oracleClientPath')
    }


def get_oracle_connection(config):
    conn_info = config['conn']
    user = conn_info['user']
    password = os.environ.get('DB_PASSWORD') or conn_info.get('password', '')
    dsn = conn_info['connectString']

    if password.startswith('encrypted:'):
        raise ValueError(
            "Senha criptografada em storage.json. Utilize o motor nativo Node.js via /api/scripts "
            "ou informe a variável de ambiente DB_PASSWORD."
        )

    parts = dsn.split(':')
    if len(parts) == 3 and '/' not in dsn:
        dsn = f"{parts[0]}:{parts[1]}/{parts[2]}"

    client_path = config.get('client_path')
    try:
        if client_path and os.path.exists(client_path):
            oracledb.init_oracle_client(lib_dir=client_path)
    except Exception:
        pass

    return oracledb.connect(user=user, password=password, dsn=dsn)


def calcular_similaridade(texto_a, texto_b):
    if not texto_a or not texto_b:
        return 0.0
    return round(SequenceMatcher(None, str(texto_a).strip(), str(texto_b).strip()).ratio() * 100, 2)


def build_mapping_filter(config):
    doc_mappings = config.get('doc_mappings') or []
    clauses = []
    binds = {'p_days': config['audit_days']}
    mapped_doc_ids = []

    for idx, mapping in enumerate(doc_mappings):
        raw_doc_id = str(mapping.get('id', '')).strip()
        if not raw_doc_id.isdigit():
            continue
        doc_id = int(raw_doc_id)
        mapped_doc_ids.append(doc_id)

        fields = [
            str(f.get('id', '')).strip().upper()
            for f in (mapping.get('fields') or [])
            if str(f.get('id', '')).strip()
        ]
        doc_bind = f"p_doc_{idx}"
        binds[doc_bind] = doc_id

        if fields:
            fld_binds = []
            for f_idx, fld in enumerate(fields):
                f_bind = f"p_fld_{idx}_{f_idx}"
                binds[f_bind] = fld
                fld_binds.append(f":{f_bind}")
            clauses.append(
                f"(CD_DOCUMENTO = :{doc_bind} AND UPPER(IDENTIFICADOR_FILTRO) IN ({', '.join(fld_binds)}))"
            )
        else:
            clauses.append(f"(CD_DOCUMENTO = :{doc_bind})")

    if clauses:
        return f"AND ({' OR '.join(clauses)})", binds, mapped_doc_ids

    raw_ids = [d.strip() for d in config['audit_doc_id'].split(',') if d.strip().isdigit() and int(d.strip()) > 0]
    if raw_ids:
        doc_binds = []
        for idx, d in enumerate(raw_ids):
            b = f"p_legacy_doc_{idx}"
            binds[b] = int(d)
            doc_binds.append(f":{b}")
            mapped_doc_ids.append(int(d))
        return f"AND CD_DOCUMENTO IN ({', '.join(doc_binds)})", binds, mapped_doc_ids

    return "", binds, []


# ==============================================================================
# EXECUÇÃO PRINCIPAL
# ==============================================================================

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando Motor Python de Auditoria de Similaridade...")
    start_time = time.time()

    try:
        config = load_db_config()
        owner = config['schema_owner']
        print(f"[*] Conexão ativa: {config['conn']['name']} | Schema: {owner} | Janela: {config['audit_days']} dias")

        conn = get_oracle_connection(config)
        cursor = conn.cursor()

        filter_sql, binds, mapped_doc_ids = build_mapping_filter(config)
        query_view = f"""
            SELECT
                CD_ATENDIMENTO,
                CD_DOCUMENTO,
                DS_DOCUMENTO,
                IDENTIFICADOR_FILTRO,
                DH_FECHAMENTO,
                CD_PRESTADOR,
                LEITO,
                UNIDADE,
                TEXTO_ATUAL,
                TEXTO_ANTERIOR
            FROM {owner}.V_AUDITORIA_COPIA_COLA
            WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - :p_days
              AND TEXTO_ATUAL IS NOT NULL
              AND TEXTO_ANTERIOR IS NOT NULL
              {filter_sql}
        """

        print(f"[{datetime.now().strftime('%H:%M:%S')}] Lendo {owner}.V_AUDITORIA_COPIA_COLA...")
        cursor.execute(query_view, binds)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()

        if not rows:
            print("[!] Nenhum registro elegível encontrado para o período e mapeamentos configurados.")
            conn.close()
            return

        df = pd.DataFrame(rows, columns=columns)
        print(f"[*] Calculando similaridade para {len(df)} evoluções clínicas...")
        df['GRAU_SIMILARIDADE'] = [
            calcular_similaridade(a, b)
            for a, b in zip(df['TEXTO_ATUAL'], df['TEXTO_ANTERIOR'])
        ]

        del_binds = {'p_days': config['audit_days']}
        del_doc_filter = ""
        if mapped_doc_ids:
            del_doc_binds = []
            for idx, doc_id in enumerate(mapped_doc_ids):
                b = f"p_del_doc_{idx}"
                del_binds[b] = doc_id
                del_doc_binds.append(f":{b}")
            del_doc_filter = f"AND CD_DOCUMENTO IN ({', '.join(del_doc_binds)})"

        cursor.execute(
            f"DELETE FROM {owner}.TB_AUDITORIA_SIMILARIDADE WHERE DH_FECHAMENTO >= TRUNC(SYSDATE) - :p_days {del_doc_filter}",
            del_binds
        )

        insert_sql = f"""
            INSERT INTO {owner}.TB_AUDITORIA_SIMILARIDADE (
                CD_ATENDIMENTO, CD_DOCUMENTO, DS_DOCUMENTO, IDENTIFICADOR_FILTRO,
                DH_FECHAMENTO, CD_PRESTADOR, LEITO, UNIDADE, GRAU_SIMILARIDADE, DT_PROCESSAMENTO
            ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, SYSDATE)
        """

        batch_data = [
            (
                int(r['CD_ATENDIMENTO']),
                int(r['CD_DOCUMENTO']),
                str(r['DS_DOCUMENTO'])[:150] if pd.notnull(r['DS_DOCUMENTO']) else None,
                str(r['IDENTIFICADOR_FILTRO'])[:150] if pd.notnull(r['IDENTIFICADOR_FILTRO']) else None,
                r['DH_FECHAMENTO'].to_pydatetime() if hasattr(r['DH_FECHAMENTO'], 'to_pydatetime') else r['DH_FECHAMENTO'],
                int(r['CD_PRESTADOR']) if pd.notnull(r['CD_PRESTADOR']) else None,
                str(r['LEITO'])[:60] if pd.notnull(r['LEITO']) else None,
                str(r['UNIDADE'])[:120] if pd.notnull(r['UNIDADE']) else None,
                float(r['GRAU_SIMILARIDADE'])
            )
            for _, r in df.iterrows()
        ]

        cursor.executemany(insert_sql, batch_data)
        conn.commit()
        elapsed = round(time.time() - start_time, 2)
        print(f"[SUCCESS] Auditoria concluída em {elapsed}s! {len(batch_data)} registros gravados em {owner}.TB_AUDITORIA_SIMILARIDADE.")
        conn.close()

    except Exception as e:
        print(f"[ERRO CRÍTICO] {str(e)}")
        raise


if __name__ == "__main__":
    main()
