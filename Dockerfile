# --- STAGE 1: BUILD ---
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Instalar dependências de build se necessário
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código e gerar build standalone
COPY . .
RUN npm run build

# --- STAGE 2: RUNTIME ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 1. Instalar dependências do Sistema (Oracle + Python)
RUN apt-get update && apt-get install -y \
    libaio1 \
    python3 \
    python3-pip \
    python3-venv \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar Oracle Instant Client (Thick Mode)
RUN mkdir -p /opt/oracle
WORKDIR /opt/oracle
RUN wget https://download.oracle.com/otn_software/linux/instantclient/211000/instantclient-basic-linux.x64-21.1.0.0.0dbru.zip \
    && unzip instantclient-basic-linux.x64-21.1.0.0.0dbru.zip \
    && rm instantclient-basic-linux.x64-21.1.0.0.0dbru.zip \
    && echo /opt/oracle/instantclient_21_1 > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_1

# 3. Configurar Python e bibliotecas
WORKDIR /app
RUN python3 -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
RUN pip install --no-cache-dir pandas oracledb python-dotenv

# 4. Copiar artefatos do Next.js Standalone
# O modo standalone gera uma pasta compacta com tudo que o app precisa
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/data ./data
COPY --from=builder /app/SQL ./SQL

# Criar pasta para persistência de dados se não existir
RUN mkdir -p /app/data

EXPOSE 3000

# Comando para rodar a aplicação
# Nota: nextjs standalone usa 'server.js' como entrada
CMD ["node", "server.js"]
