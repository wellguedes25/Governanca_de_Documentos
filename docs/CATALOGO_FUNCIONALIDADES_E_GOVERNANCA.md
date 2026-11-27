# Catálogo de Funcionalidades e Importância para a Governança Clínica

Este documento descreve todas as funcionalidades operacionais e estratégicas do **Goverdoc Pro** e o impacto direto de cada módulo na **Governança de Documentos Clínicos** hospitalar (segurança do paciente, padronização de prontuários, acreditação ONA/JCI e gestão de mudanças de TI).

---

## 1. Seletor Global de Motor (`Editor 3.0` vs. `Editor 2.0`) e Janela de Período

- **Onde atua**: Sidebar (seletor rápido `Editor 3.0 HTML5` / `Editor 2.0 Flex`) e cabeçalho dos módulos analíticos (`30d | 60d | 90d | 180d | 365d` + `Período` personalizado até 365 dias, sempre iniciando em `30d`).
- **O que faz**: Alterna dinamicamente todas as consultas entre as tabelas legadas (`DBAMV.EDITOR_*`) e as do novo motor (`EDITOR.EDITOR_*`), além de filtrar volumes históricos sem reescrever SQL manualmente.
- **Importância para a Governança**: Permite acompanhar a transição tecnológica sem pontos cegos — comparando uso real recente (`30d`), sazonalidade (`90d`/`180d`/`365d`) ou fechamentos mensais auditáveis (período personalizado).

---

## 2. Portal de Acesso, Multi-Instância Oracle & Modo Sandbox (`/connect`)

- **O que faz**:
  - Autenticação individual de usuários (`ADMIN` e `ANALISTA`).
  - Seleção da instância Oracle de destino (ex.: Produção, Data Guard/Leitura, Homologação, Dev) logo no login.
  - **Modo Demonstração (Sandbox)** integrado com dados fictícios realistas (2 unidades fictícias e 10 documentos modelo), sem necessidade de banco Oracle conectado.
- **Importância para a Governança**: Garante rastreabilidade por perfil de acesso (RBAC), evita que analistas alterem configurações críticas de conexão/SQL e viabiliza treinamentos e validações de layout com zero risco em produção.

---

## 3. Visão Geral — Cockpit Executivo (`/dashboard`)

- **O que faz**:
  - **4 KPIs Principais**:
    1. *Volume Geral no período selecionado* (total de prontuários fechados/assinados).
    2. *Produção Recente (24h)* (termômetro operacional em tempo real).
    3. *SLA de Fechamento (24h) & Taxa de Assinatura Digital*.
    4. *Saúde do Catálogo Clínico* (percentual de templates ativos versus ociosos).
  - **Gráfico de Barras Assimétrico**: alternância entre **Curva ABC · Top 10 Documentos** e **Produção por Unidade Hospitalar**, com linha de média e destaque visual para o líder.
  - **Dinâmica Assistencial de Turnos (7d fixo)**: proporção de preenchimentos em plantão **Dia (07h–18h)** versus **Noite (19h–06h)**.
  - **Card de Saneamento de Catálogo**: quantitativo de templates sem nenhum uso no período, com atalho direto para revisão.
- **Importância para a Governança**: Oferece à Diretoria Clínica, Enfermagem e TI uma visão única da adesão ao prontuário eletrônico, identificando imediatamente quedas de assinatura digital (risco legal/faturamento) e proliferação de formulários sem uso.

---

## 4. Catálogo Mestre de Documentos Clínicos (`/documentos` e `/documentos/[id]/campos`)

- **O que faz**:
  - Matriz completa de todos os documentos publicados no Editor 2.0 ou 3.0 com busca instantânea, ordenação e visualização em **Tabela** ou **Grid de Cards**.
  - **Matriz Pivot Multi-Empresa**: mostra exatamente em quais hospitais da rede cada documento teve uso e a data do último preenchimento.
  - **Modal Unificado 360° de Detalhes** ao selecionar qualquer documento:
    - Histórico de versões (`PUBLISHED`, `EDITABLE`/`TEST`, `HISTORY`), cabeçalho/rodapé vinculados, contagem de campos e regras.
    - **Perfis Ambulatoriais** vinculados (onde o documento aparece no PEP).
    - **Ações SQL / Vínculos** entre documentos.
    - **Regras de Negócio & Alertas Clínicos** (condições, operadores e campos afetados).
  - **Página Dedicada de Inspeção de Campos** (`/documentos/[id]/campos`): detalha todos os identificadores técnicos (`DS_IDENTIFICADOR`), metadados e tipos de visualização dos campos, além de exportação para CSV.
- **Importância para a Governança**: É o inventário oficial do prontuário da instituição. Elimina duplicidade de formulários (ex.: três fichas diferentes de anamnese para a mesma especialidade) e acelera o diagnóstico de suporte e engenharia clínica.

---

## 5. Perfis Clínicos & Árvore de Módulos (`/perfis-clinicos`)

- **O que faz**:
  - Consulta todos os perfis ambulatoriais ativos (`DBAMV.PERFIL_AMBULATORIAL` com `TP_PERFIL = 'SIS'`), exibindo especialidade, setor, tipo de atendimento, tipos de prestador e hospitais vinculados.
  - Reconstrói a **árvore hierárquica completa** de pastas, módulos e parâmetros (`CD_DOCUMENTO`, `CD_DOCUMENTO_EDITOR_3`, `CD_DOCUMENTO_OBRIG_TELA`, `CD_OBJETO`), com modo de impressão.
- **Importância para a Governança**: Responde em segundos à pergunta *"Onde esse documento está disponibilizado no prontuário e para quais especialidades/prestadores?"*, evitando alterações cegas que impactam fluxos assistenciais errados.

---

## 6. Governança de Migração Editor 2.0 → Editor 3.0 (`/migracao`)

- **O que faz**:
  - **Kanban & Tabela de Migração** com acompanhamento do ciclo completo: *Não Iniciado*, *Planejado*, *Em Andamento*, *Em Homologação* e *Migrado*.
  - **Backlog Inteligente**: cruza automaticamente documentos ativos do Editor 2.0 ainda não migrados com o histórico de preenchimentos e vínculos.
  - **Comparador Estrutural V2 × V3** (`/api/documentos/compare` com `diff`): compara versões Flex e HTML5 antes da virada.
- **Importância para a Governança**: Transforma a migração tecnológica do MV Editor 2.0 (Flex descontinuado) para o Editor 3.0 (HTML5) em um projeto auditável, priorizado por volume assistencial real em vez de tentativa e erro.

---

## 7. Grafo Híbrido de Linhagem & Dependências (`/linhagem`)

- **O que faz**:
  - Analisa automaticamente todas as **Ações SQL** (`cd_propriedade = 4`) e **Regras de Negócio** (`dbamv.editor_regra` / `editor.editor_regra`) buscando referências cruzadas (`CD_DOCUMENTO = X`, `CD_DOCUMENTO IN (...)`, etc.).
  - Oferece duas visões complementares:
    1. **Fluxo em Colunas**: agrupa documentos por camadas (*Origens Primárias*, *Camadas Intermediárias*, *Destinos Finais*) e permite filtrar cadeias isoladas sem poluição visual.
    2. **Mapa em Rede (Cytoscape + ELK)**: visualização interativa de topologia de dependências.
  - Destaca **Vínculos Quebrados** (quando um script referencia um `CD_DOCUMENTO` inexistente ou inativo) e permite clicar em qualquer aresta para ler o script SQL exato que cria o vínculo.
- **Importância para a Governança**: Previne incidentes graves em produção. Antes de inativar ou alterar o identificador de um documento clínico, a equipe enxerga exatamente quais outros formulários dependem dele para puxar dados (ex.: anamnese alimentando ficha de UTI ou prescrição).

---

## 8. Hospitais & Unidades Operacionais (`/hospitais`)

- **O que faz**:
  - Visão dedicada por unidade hospitalar selecionada (`CD_MULTI_EMPRESA`), respeitando o período escolhido (`30d`..`365d` ou personalizado):
    - Total de preenchimentos da unidade e participação relativa na rede.
    - Documentos únicos em uso e timestamp do último registro.
    - **SLA de Assinatura (30d fixo)** por faixas de tempo (`0-2h`, `2-6h`, `6-12h`, `12-24h`, `> 24h`) + **Dinâmica de Turnos**.
    - **Ranking Top 5** da unidade e **Tabela Detalhada** com acesso direto ao modal de metadados/regras de cada documento.
- **Importância para a Governança**: Permite comparar maturidade assistencial entre hospitais de uma mesma rede (ou setores equivalentes), identificando unidades com gargalo no tempo de assinatura médica ou de enfermagem.

---

## 9. Auditoria de Similaridade / Cópia e Cola (`/similaridade`)

- **O que faz**:
  - Executa motor nativo Node.js de NLP (Ratcliff/Obershelp) via botão **Rodar Auditoria NLP** diretamente no portal, sem exigir instalação de Python/pandas no servidor, filtrando pela janela configurada (`auditDays`) e pelo escopo selecionado de documentos e campos.
  - Consulta registros auditados de similaridade com filtros por documento, identificador de campo, hospital/empresa (`CD_MULTI_EMPRESA`), intervalo de datas, score mínimo e prestador, utilizando o schema/owner configurado (`DBAMV` ou schema dedicado do hospital).
  - Exibe **Diff lado a lado** seguro via rota backend dedicada (`SIMILARITY_COMPARE` para V2 e V3) destacando trechos idênticos copiados versus trechos alterados, gráfico de incidência por médico/unidade e exportação em Excel/impressão.
  - Inclui aba de **Mapeamentos Oracle** integrada ao catálogo real do banco (`DOCUMENTOS` + `DOC_FIELDS`) para selecionar documentos e campos textuais (`TEXTO` / `TEXTAREA`) em 1 clique, além de **Modal Gerador de Script DDL** para DBA criar `<OWNER>.TB_AUDITORIA_SIMILARIDADE` e `<OWNER>.V_AUDITORIA_COPIA_COLA`.
- **Importância para a Governança**: Apoia o Núcleo de Qualidade, Auditoria Médica e Comissão de Prontuários no combate ao *"copy & paste"* excessivo de evoluções clínicas — prática que compromete a segurança do paciente e glosa contas hospitalares.

---

## 10. Dependências BI & Indicadores (`/dependencias-bi`)

- **O que faz**:
  - Inventário centralizado de artefatos externos que leem campos de documentos do prontuário: painéis Power BI, relatórios Tasy/MV Report, views SQL, jobs ETL e indicadores estratégicos.
  - Permite classificar criticidade (*Crítico*, *Alto*, *Médio*, *Baixo*), ferramenta, responsável, unidade e campos exatos consumidos, além de **Importação/Exportação em Excel (`.xlsx`)**.
- **Importância para a Governança**: Protege o BI corporativo e indicadores assistenciais/ONA contra quebras silenciosas quando um analista renomeia ou remove um campo (`DS_IDENTIFICADOR`) dentro de um documento clínico.

---

## 11. Central Unificada de Configurações (`/configuracoes`)

Restrita a usuários **`ADMIN`**, consolida em 6 abas toda a administração do portal:
1. **Conexões Oracle**: cadastro criptografado (`AES-256-CBC`) de múltiplas instâncias DBAMV, teste de latência em tempo real e configuração do caminho do Instant Client (Thick Mode).
2. **Editor 3.0 (HTML5)**: catálogo modular das consultas Oracle V3 com edição em modal, inserção de macros por clique, restauração para o padrão e **Otimizador SQL com IA** (via Ollama).
3. **Editor 2.0 (Flex)**: catálogo completo equivalente das consultas DBAMV legadas.
4. **Instituições (MV)**: consulta dinâmica em `DBAMV.MULTI_EMPRESAS` para ativar hospitais e definir siglas exibidas nas colunas.
5. **Parâmetros & Report Web**: URL base de visualização de laudos PDF do MV, janela em dias (`auditDays`), documento foco e **Schema / Owner de Auditoria** (`DBAMV` ou schema customizado do hospital) com gerador integrado de Script DDL.
6. **Usuários & Acesso**: gestão completa de contas (`ADMIN` e `ANALISTA`), senhas e ativação/bloqueio de usuários.
