#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Goverdoc Pro - Instalador Automatizado (Linux + Docker Compose)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=============================================="
echo "  Goverdoc Pro - Implantacao Hospitalar"
echo "=============================================="

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERRO] Docker nao encontrado. Instale o Docker Engine antes de continuar."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERRO] Docker Compose v2 nao encontrado (docker compose)."
  exit 1
fi

mkdir -p "$ROOT_DIR/data"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "[INFO] Criando arquivo .env a partir de .env.example..."
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

CURRENT_KEY="$(grep -E '^ENCRYPTION_KEY=' "$ROOT_DIR/.env" | cut -d'=' -f2- | tr -d '[:space:]' || true)"
if [ -z "$CURRENT_KEY" ]; then
  if command -v openssl >/dev/null 2>&1; then
    GENERATED_KEY="$(openssl rand -hex 32)"
  else
    GENERATED_KEY="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi

  if grep -qE '^ENCRYPTION_KEY=' "$ROOT_DIR/.env"; then
    sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${GENERATED_KEY}|" "$ROOT_DIR/.env" && rm -f "$ROOT_DIR/.env.bak"
  else
    printf "\nENCRYPTION_KEY=%s\n" "$GENERATED_KEY" >> "$ROOT_DIR/.env"
  fi
  echo "[OK] ENCRYPTION_KEY AES-256 gerada automaticamente em .env."
else
  echo "[OK] ENCRYPTION_KEY ja configurada em .env."
fi

echo "[INFO] Construindo imagem e iniciando container Goverdoc Pro..."
docker compose up -d --build

echo "[INFO] Aguardando aplicacao responder na porta 3000..."
ATTEMPTS=0
MAX_ATTEMPTS=24
until curl -fsS "http://127.0.0.1:3000/api/auth/connect" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "[AVISO] A aplicacao demorou para responder ao healthcheck. Verifique: docker compose logs -f"
    exit 0
  fi
  sleep 2
done

echo ""
echo "=============================================="
echo "  Goverdoc Pro ONLINE!"
echo "=============================================="
echo "  URL Local:  http://localhost:3000"
echo "  Usuario:    admin"
echo "  Persistencia: $ROOT_DIR/data"
echo ""
echo "  Proximo passo:"
echo "  1. Acesse /connect e troque a senha do admin em /configuracoes?tab=usuarios"
echo "  2. Execute SQL/00_grants_minimos_governanca_mv.sql no Oracle do hospital"
echo "  3. Cadastre a conexao Read-Only em /configuracoes?tab=conexoes"
echo "=============================================="
