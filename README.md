# Goverdoc Pro — Governança de Documentos Clínicos (MV)

Plataforma corporativa de **Governança, Auditoria e Observabilidade de Documentos Clínicos** para hospitais que operam os prontuários eletrônicos **MV Editor 2.0 (Flex / `DBAMV`)** e **MV Editor 3.0 (HTML5 / `EDITOR`)**.

Projetada com execução **100% Read-Only** no banco Oracle do hospital, criptografia **AES-256** para credenciais e instalação simplificada em 1 comando via **Docker** (já com Oracle Instant Client embutido) ou Node.js.

---

## Implantação Rápida no Servidor do Hospital

### 1. Criar Usuário Oracle Somente Leitura
Peça ao DBA para executar o script de privilégios mínimos em `SYS` / `SYSTEM`:
- [`SQL/00_grants_minimos_governanca_mv.sql`](SQL/00_grants_minimos_governanca_mv.sql)

### 2. Subir a Aplicação em 1 Comando

**Linux (Docker + Instant Client pré-instalado):**
```bash
chmod +x scripts/deploy-linux.sh
./scripts/deploy-linux.sh
```

**Windows Server (PowerShell — Docker ou Node.js):**
```powershell
.\scripts\deploy-windows.ps1
```

Após subir, acesse **`http://localhost:3000`**, autentique-se com `admin` (senha configurada em `DEFAULT_ADMIN_PASSWORD` no `.env`) ou explore primeiro no **Modo Demonstração (Sandbox)**.

---

## Principais Módulos

- **Visão Geral (`/dashboard`)**: KPIs assistenciais, Produção 24h, Taxa de Assinatura, Curva ABC (Top 10), Adesão por Unidade, Dinâmica de Turnos (Dia/Noite) e Saneamento de Templates Ociosos, com filtro global (`30d | 60d | 90d | 180d | 365d` ou intervalo personalizado até 365 dias).
- **Catálogo de Documentos & Inspector 360° (`/documentos` e `/documentos/[id]/campos`)**: Matriz multi-empresa de uso, histórico de versões, metadados técnicos, ações SQL, regras clínicas e inspeção completa de campos.
- **Perfis Clínicos (`/perfis-clinicos`)**: Mapeamento de perfis ambulatoriais (`SIS`), especialidades, setores e árvore hierárquica de módulos/parâmetros do PEP.
- **Migração Flex → HTML5 (`/migracao`)**: Quadro Kanban, backlog priorizado por uso real e comparador estrutural V2 × V3.
- **Grafo de Linhagem & Dependências (`/linhagem`)**: Visão híbrida (**Fluxo em Colunas** + **Mapa em Rede Cytoscape/ELK**) rastreando dependências SQL e alertas de vínculos quebrados antes de alterações em produção.
- **Unidades Hospitalares (`/hospitais`)**: Indicadores, SLA de assinatura e detalhamento por `CD_MULTI_EMPRESA`.
- **Auditoria de Similaridade (`/similaridade`)**: Análise comparativa (*diff*) de cópia e cola em evoluções clínicas.
- **Dependências BI & Indicadores (`/dependencias-bi`)**: Inventário de impacto em Power BI, relatórios e views corporativas com exportação/importação Excel.
- **Central de Configurações (`/configuracoes`)**: Hub unificado (exclusivo `ADMIN`) para **Conexões Oracle**, **Motores SQL (Editor 3.0 & 2.0 com IA)**, **Instituições (MV)**, **Parâmetros & Report Web** e **Usuários & Acesso (RBAC)**.

---

## Documentação Completa

| Documento | Conteúdo |
| :--- | :--- |
| [**Especificação Técnica**](docs/ESPECIFICACAO_TECNICA.md) | Arquitetura, diagrama Mermaid, stacks/versões, segurança Read-Only & AES-256, macros SQL e catálogo de APIs |
| [**Catálogo de Funcionalidades & Governança**](docs/CATALOGO_FUNCIONALIDADES_E_GOVERNANCA.md) | Detalhamento completo de todas as telas e seu valor estratégico para Governança Clínica, ONA/JCI e TI |
| [**Guia de Implantação Hospitalar**](docs/GUIA_IMPLANTACAO_HOSPITALAR.md) | Passo a passo para Linux/Windows/Coolify, onboarding em 5 minutos, backup de `./data` e troubleshooting Oracle |
| [**Script Oracle Read-Only**](SQL/00_grants_minimos_governanca_mv.sql) | Grants mínimos `SELECT` para `DBAMV` e `EDITOR` |
