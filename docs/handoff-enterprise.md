# Handoff Enterprise (Context Package)

Base de referencia interna: `MA OF.pdf` (24 paginas).

## 1) Identidade e objetivo

- Produto: Maos Amigas - Plataforma de Gestao de Cuidadores Domiciliares
- Objetivo: centralizar e automatizar o fluxo completo da agencia:
  lead -> triagem -> avaliacao clinica -> orcamento -> proposta/contrato (PDF) -> assinatura -> alocacao/escala -> operacao e confirmacoes -> logs/auditoria
- Stack atual confirmado:
  Next.js 16 (App Router) + TypeScript + Prisma + SQLite + NextAuth + Vitest
- Estado atual reportado: "Enterprise Production-Ready" com 184 testes passando (`npx.cmd vitest run` em 2026-02-19).

## 2) Arquitetura

### Camadas

- Presentation: `src/app/admin/*`
- API: `src/app/api/admin/*` (+ rotas publicas especificas)
- Business: `src/lib/*` (calculator, mappers, PDF, workers)
- Data: `prisma/*`
- Observability: `src/lib/observability/*`
- Messaging/WhatsApp: `src/lib/whatsapp/*`
- Bridge provider: `whatsapp-bridge/server.js`

### Rotas de topo

- `/admin/*` -> UI/paginas
- `/api/admin/*` -> APIs protegidas por RBAC/capabilities
- `/api/whatsapp/*` -> protegido por proxy + allowlist por rota/metodo (webhook publico com HMAC)

## 3) Modulos do sistema

1. Dashboard
2. Avaliacoes (clinica completa e hospital agile)
3. Pacientes
4. Candidatos
5. Cuidadores
6. Orcamentos
7. Alocacao (escala)
8. Leads e Triagens
9. Usuarios
10. Logs
11. WhatsApp (chats, contatos, fila, templates, flows, auto replies, etc.)

## 4) Status real do codigo

### 4.1 Entregas consolidadas (WhatsApp + Admin)

- Fix definitivo de `messageId`:
  - `provider-message-id.ts` + `provider-message-id.test.ts`
  - sender/docs adapters atualizados
  - bridge padronizado: `{ id, messageId, providerMessageId }`
- Admin WhatsApp path-based:
  - rotas canonicas `/admin/whatsapp/<tab>`
  - compatibilidade com legado `?tab=`
- Queue observability + drilldown:
  - filtros enterprise (intent, idempotencyKey, retries, ranges, sort)
  - detalhe com timeline e correlacao
- RBAC em admin pages e admin APIs:
  - roles + capabilities
  - proxy cobrindo `/admin/*`, `/api/admin/*` e `/api/whatsapp/*`
- Route registry/sanity:
  - `/api/admin/_debug/routes`
  - script `routes:print`

Validacoes reportadas:

- `npx tsc --noEmit` OK
- `npx vitest run` OK
- `npm run routes:print` OK

Ponto de atencao atual:

- manter allowlist de `/api/whatsapp/*` sincronizada com novas rotas para evitar bloqueios indevidos ou aberturas nao intencionais.

### 4.2 Entrega PR-G (Avaliacao -> Orcamento automatico)

- Mapeador clinico para OrcamentoInput:
  - arquivo: `src/lib/pricing/avaliacao-to-orcamento.ts`
  - funcao: `avaliacaoToOrcamentoInputs(avaliacao)`
  - infere complexidade/tipoProfissional/horasDuracao com fallback em `dadosDetalhados`
- Preview endpoint:
  - `GET /api/admin/avaliacoes/[id]/orcamento-preview`
  - guard `VIEW_AVALIACOES`
  - retorna cenarios serializados para UI
- CTA em avaliacao:
  - `/admin/avaliacoes/[id]` -> link para `/admin/orcamentos/novo?avaliacaoId=<id>`
  - respeita `MANAGE_ORCAMENTOS`
- UI de novo orcamento hibrida:
  - sem `avaliacaoId`: fluxo manual
  - com `avaliacaoId`: prefill automatico, cards de cenarios, selecao de `cenarioSelecionado`, auto `valorFinal`
- POST `/api/admin/orcamentos` endurecido:
  - guard `MANAGE_ORCAMENTOS`
  - validacao de `valorFinal` numerico
  - aceita `cenarioSelecionado` e `status`

Validacoes reportadas:

- `npx tsc --noEmit` OK
- `npx vitest run` OK
- smoke sem sessao em preview: 401 (rota existe e guard ativo)

## 5) RBAC e capabilities

Estado atual:

- RBAC ativo para:
  - `/admin/*`
  - `/api/admin/*`
  - `/api/whatsapp/*` (com webhook publico explicitamente allowlisted)

Diretriz enterprise:

- webhook publico com seguranca propria (HMAC + timestamp window + replay protection), sem depender de sessao
- status/health com segredo/allowlist/autenticacao

## 6) Observabilidade e correlacao

Ja existe:

- request context via AsyncLocalStorage
- response envelope padronizado (`ok/fail/paginated` + error codes)
- logs estruturados e telas de logs

Estado do queue drilldown:

- correlacao atual: `queueItemId`, `internalMessageId`, `idempotencyKey`
- melhoria pendente: incluir tambem `providerMessageId` e `resolvedMessageId`

## 7) Banco de dados (shape esperado)

Modelos principais: Paciente, Avaliacao, Orcamento, WhatsAppQueueItem, SystemLog, Cuidador, Alocacao.

Confirmado em runtime:

- Avaliacao contem `abemidScore`, `katzScore`, `lawtonScore`, `dadosDetalhados` (JSON string), `status`
- `dadosDetalhados.orcamento` existe e foi usado como fallback

## 8) O que falta para enterprise completo (fora WhatsApp)

### 8.1 Fechar pos-proposta/contrato

- Portal do paciente para assinatura online (PR-H)
- App/fluxo do cuidador para confirmacao de plantao via WhatsApp (PR-I)

### 8.2 Relatorios e BI (PR-J)

- faturamento, ocupacao, NPS, funil, SLA WhatsApp/outbox, retry rate, DLQ

### 8.3 Modulos core pendentes

- Leads/Triagens
- Alocacao/Escala
- Cuidadores (cadastro completo + docs + historico)
- Candidatos (funil recrutamento)
- Usuarios (CRUD + RBAC + auditoria)

## 9) Definition of Done enterprise

### Seguranca e compliance

- RBAC consistente em todas as superficies
- webhook com HMAC + timestamp + replay protection + trilha auditavel
- PDF com principios LGPD (mascaramento/minimizacao de PII)

### Confiabilidade

- outbox+worker com backoff e DLQ
- circuit breaker visivel
- reprocessamento manual seguro

### Observabilidade

- requestId ponta a ponta
- dashboards de falha/latencia/throughput
- correlacao completa (`idempotencyKey`, `internalMessageId`, `providerMessageId`, `resolvedMessageId`)

### Produto

- lead -> triagem -> avaliacao -> orcamento -> proposta/contrato -> assinatura -> alocacao -> confirmacao -> logs

### Qualidade

- unit + integration tests nos fluxos criticos
- smoke tests roteirizados
- CI com lint + tsc + vitest + build

## 10) Prompt pack enterprise (0 -> 12) - revisao operacional

Pacote de prompts para execucao sequencial (0 -> 12), sem perguntas, cobrindo:
- contrato multi-planos por tipo (Avulso, Semanal, Mensal, Bimestral, Trimestral, Semestral)
- OS/Extrato com composicao (Valor do Prestador, Taxa Maos Amigas, Total)
- politica de cancelamento/reagendamento como template parametrizavel
- cenario de plantao emergencial com possivel sobretaxa

### Prompt 0 - Protocolo sem perguntas + regras de decisao

```text
Voce e um agente de implementacao senior (arquitetura + fullstack) trabalhando num monorepo Next.js (App Router) + TypeScript + Prisma + Vitest.

REGRA ABSOLUTA: nao faca perguntas. Se algo estiver ambiguo, aplique as Regras de Decisao abaixo e siga.

Formato obrigatorio da resposta:
1) Assuncoes aplicadas (curto, bullet)
2) Plano de execucao (checklist)
3) Patch (arquivos alterados/criados + trechos relevantes)
4) Testes adicionados/ajustados e comandos para rodar
5) DoD (Definition of Done) validado

Regras de Decisao (use sempre que faltar definicao):
- Moeda: BRL; arredondar para 2 casas; permitir estrategia opcional por unidade (NEAREST_0_50, NEAREST_1_00) com default 2 casas.
- Weekend: sabado e domingo.
- Feriados: lista por unidade; suporta datas fixas e recorrentes anuais; se nao informado, nao aplica.
- Complexidade por doenca: soma dos adicionais selecionados; sem clamp por padrao; se exceder 100%, loga warning e permite (nao bloqueia).
- Profissional exigido por doencas: pega o maior nivel entre doencas selecionadas (CUIDADOR < TECNICO < ENFERMEIRO).
- Imposto: incide sobre (preco_cliente - custo_prestador) (lucro bruto); default taxa = 0 se nao configurado.
- Desconto: aplica no final do preco (apos composicao e taxas) e reduz margem; deve aparecer no breakdown.
- Minicustos: podem ser percentuais e/ou fixos; sao desativaveis item a item no fechamento.
- Se migracao Prisma falhar por shadow DB: gerar migration create-only + documentar alternativa com prisma db push para dev, mantendo rastreabilidade.
- Sempre preferir funcoes puras para calculo e normalizacao; persistencia fica em services.

Agora, aplique esse protocolo em todos os proximos prompts, sem excecao.
```

### Prompt 1 - PRD tecnico + glossario + matriz de cenarios

```text
Crie um PRD tecnico (curto e objetivo) + glossario + matriz de cenarios para o motor enterprise de precificacao e recorrencia.

Inclua obrigatoriamente:
- Entidades: Unidade (cidade), ConfigVersion, PricingConfig, DiseaseRule, HourCurve, PaymentFees, MiniCosts, DiscountPreset, ContractTemplateVersion, Orcamento/Proposta, OS (Ordem de Servico), NormalizedSchedule, PricingBreakdown, AuditHash.
- Fluxos: (1) Admin configura por unidade; (2) Avaliacao/planejamento gera orcamento; (3) Fechamento aplica desconto e toggles; (4) Geracao de contrato + OS/extrato; (5) Recalcular/auditar divergencia; (6) Relatorio operacional.
- Tipos de contrato/plano: Avulso/Semanal/Mensal/Bimestral/Trimestral/Semestral.
- Casos enterprise adicionais: semanal recorrente (2x/semana), quinzenal, mensal, pacote de horas (240h/mes), janela com datas especificas, plantao emergencial (sobretaxa).
- Edge cases: turno cruza meia-noite, inclusao/exclusao de datas, feriados no meio da janela, DST, multiplos pacientes, multiplas doencas, metodo de pagamento com fee, cancelamento/reagendamento parametrizavel e breakdown reprodutivel.

Saida: docs/enterprise/PRD.md.
Se faltar detalhes, aplique as regras do Prompt 0.
```

### Prompt 2 - Prisma: schema + versionamento por unidade + auditoria

```text
Implemente/ajuste o schema Prisma para suportar o pacote enterprise completo.

Obrigatorio:
- Unidade + relacionamento com ConfigVersion (versionamento por unidade, com effectiveFrom/effectiveTo).
- PricingConfig (base pay por role; mini-costs; lucro alvo; imposto; adicional por paciente extra; adicionais FDS/feriado; flags e defaults).
- HourCurve (1..12, 24 e/ou custom points), por unidade e opcional por role.
- PaymentFees (por metodo e periodo; ex.: PIX/Cartao/Boleto/Link; day/week/month).
- DiseaseRule (nome, complexidade%, role minima).
- DiscountPreset (percent/fixo; nome; ativo).
- ContractTemplateVersion (tipo: CLIENTE, PRESTADOR; versao; conteudo; placeholders detectados).
- Orcamento/Proposta com: planningInput raw, normalizedSchedule, pricingBreakdown, configVersionId, auditHash, createdBy, timestamps.
- Tabela de AuditLog (recalc, divergencia, diff JSON).

Entregaveis:
- prisma/schema.prisma atualizado
- migration(s) novas com nomes claros
- seed minimo por unidade (default)
- servico para getActiveConfig(unitId, atDate) com fallback seguro

Se migrate dev falhar por shadow DB, usar create-only + documentacao + db push em dev.
Adicionar testes de integridade (vitest) para config engine com mock prisma.
```

### Prompt 3 - Config engine multi-unidade source of truth

```text
Implemente src/lib/enterprise/config-engine.ts como fachada unica para resolver config enterprise por unidade.

Requisitos:
- resolveConfig(unitId, atDate): retorna snapshot imutavel com tudo normalizado (hourCurve preenchida, fees resolvidas, diseaseRules, miniCosts).
- caching em memoria (por request) e invalidation simples por versionId.
- validacao: percentuais 0..1, valores >=0; log structured warnings, sem quebrar fluxo.
- exportar tipos TS (EnterpriseConfigSnapshot, Role, PaymentMethod, ContractType etc).

Testes:
- resolve effectiveFrom/effectiveTo
- fallback para config default quando unidade nao tiver versionamento completo
- validacao/normalizacao de hourCurve (interpolacao ou lookup)
```

### Prompt 4 - Recurrence/schedule engine deterministico

```text
Implemente/reforce src/lib/scheduling/recurrence-engine.ts para produzir NormalizedSchedule deterministico.

Obrigatorio suportar:
- NONE (avulso)
- WEEKLY, BIWEEKLY, MONTHLY
- CUSTOM_DATES (lista de datas)
- PACKAGE (X horas dentro de janela, distribuidas por regra)
- inclusoes/exclusoes
- feriados marcando HOLIDAY com adicional aplicavel
- turno start/end; duracao em horas; se cruza meia-noite, dividir em segmentos sem perder total

Saida:
- occurrences[] com: date, startAt, endAt, hours, dayType (WEEKDAY/WEEKEND/HOLIDAY), tags
- totals: totalOccurrences, totalHours, totalDaysActive, windowStart/end

Testes:
- golden tests para presets (2x semana, FDS 24h, 24x7 30 dias, 240h/mes)
- edge: cross-midnight, includes/excludes, feriado no meio, janela parcial
```

### Prompt 5 - Pricing engine enterprise

```text
Implemente/refatore src/lib/pricing/calculator.ts com calculateEnterprisePricing(input, configSnapshot, schedule).

Obrigatorio no breakdown:
- custoPrestador (por role, por ocorrencia, com hourCurve)
- adicionais: weekend%, holiday%, diseaseComplexity%, patientExtra%, technicalManual%
- miniCosts: itens percentuais e fixos (com toggles desligaveis)
- lucro alvo (sobre custoPrestador, nao sobre total)
- imposto sobre (precoCliente - custoPrestador)
- fee por metodo de pagamento (percentual do preco, por periodo quando aplicavel)
- desconto (preset ou manual)
- preco final (com arredondamento)
- explain textual curto + numeros auditaveis

Invariantes:
- nenhum componente gera NaN/Infinity
- preco final >= custoPrestador
- se desconto derrubar abaixo do custoPrestador, clamp para custoPrestador + warning

Testes:
- cenarios calculados com fixtures
- propriedade de monotonicidade (mais horas -> preco >=)
- reprodutibilidade (mesmo input/config -> mesmo output)
```

### Prompt 6 - API: endpoint enterprise + compat legado

```text
Atualize src/app/api/orcamento/route.ts:

- Aceitar payload enterprise:
  { unitId, contractType, paymentMethod, planningInput, pricingOverrides?, discounts?, miniCostsDisabled? }
- Resolver configSnapshot pela unidade
- Normalizar schedule
- Calcular pricingBreakdown
- Persistir Orcamento com raw input, normalizedSchedule, breakdown, configVersionId, auditHash
- Responder com { id, normalizedSchedule, pricingBreakdown, auditHash, configVersionId }

Compat legado:
- Se payload antigo, manter comportamento e adaptar para enterprise internamente quando possivel.

Testes API:
- request enterprise ok
- request legado ok
- validacoes basicas e status codes
```

### Prompt 7 - UI avaliacao 100% enterprise

```text
Atualize src/app/admin/avaliacoes/nova/page.tsx para fluxo enterprise end-to-end.

Obrigatorio:
- builder de recorrencia (NONE/WEEKLY/BIWEEKLY/MONTHLY/CUSTOM_DATES/PACKAGE)
- presets (2x semana, FDS 24h, 240h/mes, 24x7 etc.)
- selecao de doencas (adicional% e role minima)
- pacientes (quantidade) e adicional manual percentual
- metodo de pagamento + periodo
- toggles de miniCosts por item
- desconto preset + manual
- preview com cobertura calculada + breakdown detalhado
- botao Recalcular deterministico

A UI deve:
- chamar /api/orcamento enterprise
- exibir auditHash e configVersionId
- salvar payload final compativel em dadosDetalhados.orcamento

Sem perguntas: se algo for complexo, implementar minimal-first e documentar TODO.
```

### Prompt 8 - Contratos versionados + placeholders + OS/Extrato

```text
Implemente modulo de contratos versionados.

Requisitos:
- Persistir templates CLIENTE e PRESTADOR com versionamento (ContractTemplateVersion).
- Funcao renderContract(template, data): substitui <<...>> e retorna texto final + lista de pendencias.
- Gerar ANEXO II (OS/Extrato) com composicao de preco: Valor do Prestador, Taxa Maos Amigas, Total, metodo e vencimento.
- Gerar ANEXO III com placeholders parametrizados (cancelamento/reagendamento/estornos).

Atencao:
- Contrato do cliente inclui tipo de contrato (Avulso/Semanal/Mensal/Bimestral/Trimestral/Semestral).
- OS/Extrato deve refletir breakdown do pricing engine.

Criar endpoints:
- GET /api/admin/contratos/templates
- POST /api/admin/contratos/render
- POST /api/admin/orcamentos/{id}/contrato

Testes:
- deteccao de placeholders
- render com dados minimos
- pendencias quando faltar campo
```

### Prompt 9 - Auditoria/recalc: hash, divergencia, log

```text
Implemente auditoria completa e reprodutivel.

Obrigatorio:
- src/lib/pricing/input-hash.ts com hash estavel (ordenar chaves, normalizar datas, remover campos volateis).
- Endpoint POST /api/admin/orcamentos/[id]/recalculate:
  - carregar orcamento
  - resolver configSnapshot pela configVersionId (nao pela ultima)
  - recalcular e comparar breakdown (diff)
  - salvar AuditLog com before/after/diff
  - retornar divergencia e recomendacao (OK/WARNING/BREAKING)

Testes:
- hash estavel
- recalc idempotente
- diff detecta alteracoes em config vs input
```

### Prompt 10 - Relatorios operacionais

```text
Implemente relatorios operacionais.

Endpoint:
- /api/admin/relatorios/precificacao
  Filtros: unidade, periodo, contratoTipo, metodoPagamento
  Metricas: totalHours, totalRevenue, totalProviderCost, grossMargin, taxTotal, miniCostsTotal, avgDiscount, topDiseaseAddons, emergencyCount

Pagina UI:
- /admin/relatorios/precificacao
  Tabela + export CSV

Regras:
- Nunca recalcular no relatorio; usar breakdown persistido.
- Registros legados sem campos: tratar como 0 e logar.

Testes:
- agregacoes basicas
- export CSV com schema estavel
```

### Prompt 11 - Seguranca operacional + concorrencia

```text
Implemente protecoes operacionais:

- RBAC minimo para rotas admin (proxy)
- rate limit simples para endpoints criticos (orcamento, recalc)
- logs estruturados (requestId, unitId, configVersionId, auditHash)
- concorrencia robusta na criacao de config default/version (evitar P2002) com retry transacional

Incluir:
- feature flag ENTERPRISE_PRICING_ENABLED por unidade
- fallback: se enterprise falhar, resposta clara e sem corromper dados

Testes:
- proxy protege rotas
- race condition simulada com mocks
```

### Prompt 12 - DoD final + validacao contra planilha

```text
Finalize com DoD rigido e validacao.

Obrigatorio:
- Golden tests comparando resultados do motor enterprise com fixture de planilha (expected values documentados).
- Rodar e registrar: tsc, vitest, eslint, build.
- Checklist de release:
  - migrations aplicadas (ou alternativa documentada)
  - seed por unidade
  - backfill opcional para registros legados
  - observabilidade (logs + audit)
  - rollback strategy (feature flag)

Entregavel:
- docs/enterprise/DoD.md com checklist marcado
- docs/enterprise/fixtures.md com cenarios e expected values
```

### Observacao pratica

Se outro agente tentar interromper para perguntas, o Prompt 0 define as regras de decisao padrao e
permite continuar com consistencia sem bloquear a execucao.

## 11) Nao trivialidade e uso de IA

Nao e trivial. Mesmo com IA, um sistema nesse nivel exige:
- modelagem de dominio financeiro
- determinismo e auditoria
- multi-tenant por unidade
- UX operacional
- integracoes (WhatsApp, PDF)
- seguranca de links/ambiente

Hipotese realista para decisao:
- Muita gente consegue entregar features isoladas com IA.
- Uma minoria consegue entregar enterprise end-to-end com qualidade production sem lideranca tecnica experiente.

Referencias de contexto:
- Stack Overflow Developer Survey 2024 (adocao alta de IA em dev).
- GitHub (ganho de produtividade em tarefas especificas com Copilot).
- McKinsey (adocao corporativa cresce, uso avancado e menor fracao): https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai-2024

## 12) Comandos uteis (operacao local)

- typecheck: `npx tsc --noEmit`
- testes: `npx vitest run`
- sanity de rotas: `npm run routes:print`
- dev app: `npm run dev`
- bridge (se aplicavel): `node whatsapp-bridge/server.js`
