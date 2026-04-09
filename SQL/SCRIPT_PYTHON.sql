2. O Script Python de Processamento (ETL e PLN)
Este script foi desenhado focado em performance. Em vez de fazer um INSERT linha por linha (o que seria lento), ele usa o método executemany do Oracle, que grava milhares de registros em frações de segundo.

Para rodar este código, você precisará instalar as bibliotecas no seu ambiente Python:
pip install pandas oracledb

import pandas as pd
import oracledb
from difflib import SequenceMatcher
from datetime import datetime

# ==========================================
# 1. FUNÇÃO DE SIMILARIDADE
# ==========================================
def calcular_similaridade(texto_atual, texto_anterior):
    if pd.isna(texto_anterior) or pd.isna(texto_atual):
        return 0.0
    score = SequenceMatcher(None, str(texto_atual), str(texto_anterior)).ratio()
    return round(score * 100, 2)

# ==========================================
# 2. CONFIGURAÇÃO DE BANCO DE DADOS
# ==========================================
# Substitua com as credenciais do seu banco de dados
USER = 'seu_usuario'
PASSWORD = 'sua_senha'
DSN = 'ip_do_servidor:1521/nome_do_servico'

try:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Conectando ao Oracle...")
    conexao = oracledb.connect(user=USER, password=PASSWORD, dsn=DSN)
    cursor = conexao.cursor()

    # ==========================================
    # 3. EXTRAÇÃO (Lendo a View Otimizada)
    # ==========================================
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Extraindo dados da View...")
    query_extracao = "SELECT * FROM DBAMV.V_AUDITORIA_COPIA_COLA" # Nome da view que criamos

    # Carrega direto para um DataFrame Pandas
    df = pd.read_sql(query_extracao, conexao)
    print(f"Total de evoluções extraídas: {len(df)}")

    # ==========================================
    # 4. PROCESSAMENTO (Calculando o Score)
    # ==========================================
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Calculando similaridade textual...")
    df['GRAU_SIMILARIDADE'] = df.apply(
        lambda row: calcular_similaridade(row['TEXTO_ATUAL'], row['TEXTO_ANTERIOR']), axis=1
    )

    # Prepara os dados para inserção (removemos os textos longos, enviamos só os metadados e o score)
    # A ordem das colunas aqui DEVE ser a mesma da tabela TB_AUDITORIA_SIMILARIDADE
    dados_para_inserir = df[[
        'CD_ATENDIMENTO', 'CD_DOCUMENTO', 'DS_DOCUMENTO', 'IDENTIFICADOR_FILTRO',
        'DH_FECHAMENTO', 'CD_PRESTADOR', 'LEITO', 'UNIDADE', 'GRAU_SIMILARIDADE'
    ]].values.tolist()

    # ==========================================
    # 5. CARGA (Inserindo na Tabela Final)
    # ==========================================
    if dados_para_inserir:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Gravando resultados no banco...")

        query_insert = """
            INSERT INTO DBAMV.TB_AUDITORIA_SIMILARIDADE (
                CD_ATENDIMENTO, CD_DOCUMENTO, DS_DOCUMENTO, IDENTIFICADOR_FILTRO,
                DH_FECHAMENTO, CD_PRESTADOR, LEITO, UNIDADE, GRAU_SIMILARIDADE
            ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)
        """

        # executemany é a forma mais rápida de gravar dados no Oracle via Python
        cursor.executemany(query_insert, dados_para_inserir)
        conexao.commit()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Sucesso! {cursor.rowcount} registros inseridos.")
    else:
        print("Nenhum dado para processar hoje.")

except oracledb.Error as e:
    print(f"Erro de Banco de Dados: {e}")
finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conexao' in locals():
        conexao.close()
    print("Processo finalizado.")