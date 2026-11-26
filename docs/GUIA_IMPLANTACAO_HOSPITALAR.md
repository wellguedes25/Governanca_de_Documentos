# Guia de Implantação Hospitalar — Goverdoc Pro

Este guia foi elaborado para que equipes de **TI Hospitalar / DBA Oracle** implantem o **Goverdoc Pro** no servidor do hospital em poucos minutos, com segurança **100% Read-Only** no banco MV.

---

## 1. Pré-requisitos de Infraestrutura

### Requisitos do Servidor de Aplicação
- **CPU / RAM**: mínimo `2 vCPUs` e `2 GB RAM` (recomendado `4 GB RAM` caso o hospital possua > 1.000 templates clínicos e múltiplos analistas simultâneos).
- **Sistema Operacional**:
  - **Linux (Ubuntu 22.04+, Debian 12+, RHEL/Rocky 8/9)** com Docker Engine + Docker Compose v2 (**forma mais rápida e recomendada** — já inclui Node.js 20 e Oracle Instant Client Basic Light x64 pré-instalado no container).
  - **Windows Server (2019/2022)** via Docker Desktop **ou** Node.js 20 LTS + Oracle Instant Client local.
- **Rede**: acesso TCP do servidor da aplicação ao listener do banco Oracle MV (normalmente porta `1521`). Porta HTTP publicada padrão `3000` (recomenda-se publicar via Nginx/Traefik/IIS com HTTPS interno na rede hospitalar).

---

## 2. Passo 1 — Criar Usuário Oracle Somente Leitura (DBA MV)

Por segurança assistencial e auditoria, **nunca utilize o usuário `DBAMV` ou `SYS` em produção** na aplicação.

1. Execute o script oficial [`SQL/00_grants_minimos_governanca_mv.sql`](../SQL/00_grants_minimos_governanca_mv.sql) conectado como DBA (`SYS` / `SYSTEM`).
2. O script cria o usuário dedicado (ex.: `GOVERDOC_RO`) com permissão exclusiva de `CREATE SESSION` e `SELECT` nas tabelas necessárias dos schemas `DBAMV` e `EDITOR`.

---

## 3. Passo 2 — Instalação em 1 Comando

### Opção A — Linux com Docker (Recomendado)

Clone ou copie o repositório para o servidor e execute o instalador automatizado:

```bash
chmod +x scripts/deploy-linux.sh
./scripts/deploy-linux.sh
```

**O que o script faz automaticamente:**
1. Valida `docker` e `docker compose`.
2. Cria o diretório persistente `./data` (onde ficam conexões criptografadas, usuários, migrações e inventário BI).
3. Gera o arquivo `.env` a partir de `.env.example` e cria automaticamente uma chave criptográfica aleatória de 64 caracteres hexadecimais em `ENCRYPTION_KEY` (caso ainda não exista).
4. Solicita ou aplica a senha inicial do administrador (`DEFAULT_ADMIN_PASSWORD`, padrão inicial caso não editado).
5. Executa `docker compose up -d --build` e aguarda o healthcheck responder `200 OK` na porta `3000`.

### Opção B — Windows Server (PowerShell)

Abra o PowerShell na pasta do projeto e execute:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\deploy-windows.ps1
```

O script detecta automaticamente se o servidor possui **Docker** (subindo o container igual ao Linux) ou, na ausência de Docker, gera `.env` + `./data`, instala dependências (`npm ci --legacy-peer-deps`), executa `npm run build` e orienta/inicia a execução na porta `3000`.

### Opção C — Coolify / Portainer / Docker Compose Manual

1. Copie `.env.example` para `.env` e preencha:
   - `ENCRYPTION_KEY`: gere com `openssl rand -hex 32`
   - `DEFAULT_ADMIN_PASSWORD`: senha forte inicial do usuário `admin`
2. Monte um volume persistente em `/app/data` para não perder configurações ao atualizar a imagem.
3. Suba com:
   ```bash
   docker compose up -d --build
   ```

---

## 4. Passo 3 — Onboarding Pós-Instalação no Portal (5 Minutos)

Após acessar `http://SEU_SERVIDOR:3000`:

1. **Primeiro Login & Troca de Senha**:
   - Entre na tela `/connect` com usuário **`admin`** e a senha definida em `DEFAULT_ADMIN_PASSWORD` (no primeiro acesso, você pode selecionar **Modo Demonstração (Sandbox)** para explorar enquanto cadastra o Oracle).
   - Vá em **Configurações (`/configuracoes`) → aba `Usuários & Acesso`** e **altere imediatamente a senha do `admin`** + cadastre as contas `ANALISTA` da equipe de prontuário/qualidade.
2. **Cadastrar a Conexão Oracle do Hospital**:
   - Em **Configurações → aba `Conexões Oracle`**:
     - Informe o **Nome do Ambiente** (ex.: `PRD MV` ou `DG Leitura`).
     - Informe o usuário Read-Only criado no Passo 1 (ex.: `GOVERDOC_RO`) e senha.
     - Informe a Connect String Oracle (ex.: `scan-mv.hospital.local:1521/PRDMV`).
     - Clique em **Registrar Conexão**, depois no ícone de frasco (**Testar Conectividade**) e em **Ativar**.
3. **Ativar Hospitais / Multi-Empresas**:
   - Em **Configurações → aba `Instituições (MV)`**, ative os códigos `CD_MULTI_EMPRESA` que correspondem às unidades assistenciais reais (desativando empresas administrativas/colégios/obras) e defina siglas curtas (ex.: `HOSP1`, `UTI`).
4. **Configurar URL de Laudos (Opcional)**:
   - Em **Configurações → aba `Parâmetros & Report Web`**, ajuste a URL base do MV Editor Report para visualização direta de documentos fechados.

---

## 5. Persistência e Rotina de Backup

O Goverdoc Pro **não grava dados no banco Oracle do hospital**. Toda configuração gerada pelo portal fica armazenada na pasta `./data` (montada em `/app/data` no Docker):

- `data/.encryption_key` *(quando `ENCRYPTION_KEY` não vem do ambiente)*
- `data/storage.json` *(conexões Oracle com senhas AES-256, queries customizadas, mapeamento de empresas)*
- `data/users.json` *(usuários e hashes de autenticação)*
- `data/migracoes.json` *(quadro Kanban de migração Flex → HTML5)*
- `data/dependencias-bi.json` *(inventário de dependências BI)*
- `data/doc-mappings.json` *(tradução amigável de campos para auditoria)*

> **Importante**: inclua a pasta `./data` e o valor de `ENCRYPTION_KEY` (no `.env`) no backup diário do servidor. Se você restaurar `storage.json` em outro servidor usando uma `ENCRYPTION_KEY` diferente, será necessário digitar novamente a senha da conexão Oracle na interface.

---

## 6. Atualização de Versão e Troubleshooting

### Atualizar para uma nova versão
```bash
git pull origin main
docker compose up -d --build
```
Os dados em `./data` são preservados intactos durante a reconstrução.

### Solução rápida de problemas comuns
| Sintoma | Causa Provável | Resolução |
| :--- | :--- | :--- |
| `ORA-01017` / `ORA-12154` / Timeout | Credencial incorreta, firewall porta 1521 ou Service Name errado | Testar conectividade de rede do servidor ao SCAN Oracle e revisar usuário/Connect String na aba `Conexões Oracle`. |
| `NJS-045` / `DPI-1047` (Instant Client não encontrado) | Execução fora do Docker sem Instant Client configurado | No Linux/Docker já vai embutido em `/opt/oracle/instantclient`. No Windows sem Docker, instalar Oracle Instant Client 64-bit e informar o diretório em `Oracle Client Path`. |
| `ORA-00942` (table or view does not exist) | Usuário Oracle sem grant em alguma tabela `DBAMV` ou `EDITOR` | Reexecutar [`SQL/00_grants_minimos_governanca_mv.sql`](../SQL/00_grants_minimos_governanca_mv.sql) validando se o hospital utiliza Editor 3.0 (schema `EDITOR`). |
| Números iguais ao trocar período ou empresa | Cache antigo de browser após ajuste manual | Pressionar **Sincronizar** no cabeçalho da tela ou atualizar a aba. |
