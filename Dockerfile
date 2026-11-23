# ==========================================
# Estágio 1: Dependências de Produção/Build
# ==========================================
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps

# ==========================================
# Estágio 2: Build Next.js (Standalone)
# ==========================================
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p data && npm run build

# ==========================================
# Estágio 3: Runner + Oracle Instant Client
# ==========================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instala dependências nativas e Oracle Instant Client Basic Light (Linux x64)
RUN apt-get update && apt-get install -y --no-install-recommends \
      libaio1 \
      unzip \
      curl \
      ca-certificates \
    && mkdir -p /opt/oracle \
    && curl -fL -o /tmp/instantclient.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip \
    && unzip -q /tmp/instantclient.zip -d /opt/oracle \
    && rm -f /tmp/instantclient.zip \
    && ln -s /opt/oracle/instantclient_* /opt/oracle/instantclient \
    && echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig \
    && apt-get purge -y unzip \
    && rm -rf /var/lib/apt/lists/*

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
ENV ORACLE_CLIENT_PATH=/opt/oracle/instantclient

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
