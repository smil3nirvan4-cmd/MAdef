# Plano de Convergência Enterprise — MAdef (Mãos Amigas)

> Plano completo de reestruturação para levar o MAdef ao nível enterprise (10/10)
> em segurança, escalabilidade, performance, qualidade de código e operações.
>
> Baseado em auditoria completa: 69 API routes, 37 modelos Prisma, 200+ arquivos TS,
> 6.493 erros TypeScript, 47 `as any`, 16 vulnerabilidades npm, 34 testes (5.7% cobertura API).

---

## Visão Geral das Fases

| Fase | Nome | Foco | Duração Est. |
|------|------|------|-------------|
| **0** | Fundação Crítica | Segurança P0, TypeScript compilável, vulnerabilidades | Semana 1-2 |
| **1** | Fortalecimento de Segurança | Auth completa, CSRF, validação, rate-limit universal | Semana 3-4 |
| **2** | Migração de Infraestrutura | PostgreSQL, Docker, CI/CD, env management | Semana 5-7 |
| **3** | Qualidade de Código | Eliminar `as any`, tipagem estrita, padronização | Semana 8-9 |
| **4** | Cobertura de Testes | 80%+ cobertura, testes de integração, E2E | Semana 10-12 |
| **5** | Performance & Escalabilidade | Caching, connection pooling, otimização de queries | Semana 13-14 |
| **6** | Observabilidade & Operações | APM, alertas, health checks avançados, runbooks | Semana 15-16 |
| **7** | Multi-tenancy & Governança | Isolamento de dados, audit trail completo, compliance | Semana 17-18 |
| **8** | API & Documentação | OpenAPI spec, versionamento, SDK client | Semana 19-20 |
| **9** | Hardening Final | Pen test, chaos engineering, disaster recovery | Semana 21-22 |

---

## FASE 0 — Fundação Crítica (P0)

### 0.1 Corrigir Vulnerabilidades npm

**Problema:** 16 vulnerabilidades (15 high, 1 moderate) incluindo DoS no Next.js Image Optimizer e React Server Components.

**Ações:**
- [ ] `npm audit fix --force` → atualizar `next` para 16.1.6+
- [ ] Atualizar `react` e `react-dom` para 19.2.4 (patch de segurança)
- [ ] Atualizar `@prisma/client` de 6.0.0 para 6.x latest (ou avaliar 7.x)
- [ ] Atualizar `lucide-react` para 0.575.0+
- [ ] Configurar `npm audit` no pre-commit hook
- [ ] Adicionar Dependabot ou Renovate para alertas automáticos de vulnerabilidade

**Arquivos:** `package.json`, `package-lock.json`

---

### 0.2 Corrigir 6.493 Erros TypeScript

**Problema:** 5.388 erros TS7026 (JSX IntrinsicElements — configuração React 19), 522 TS7006 (implicit any), 316 TS2307 (módulos não encontrados), 134 TS2580 (process/Buffer).

**Ações:**

**Subetapa 0.2.1 — Resolver TS7026 (5.388 erros):**
- [ ] Verificar/atualizar `@types/react` e `@types/react-dom` para versão compatível com React 19
- [ ] Confirmar `"jsx": "react-jsx"` no `tsconfig.json`
- [ ] Adicionar `"types": ["react/next", "node"]` se necessário
- [ ] Testar com `npx tsc --noEmit` até zero erros JSX

**Subetapa 0.2.2 — Resolver TS7006 (522 erros):**
- [ ] Adicionar tipos explícitos a todos os parâmetros de funções
- [ ] Priorizar: handlers de API, callbacks de WhatsApp, event handlers de componentes
- [ ] Usar `unknown` em vez de `any` onde tipo exato é incerto

**Subetapa 0.2.3 — Resolver TS2307 (316 erros):**
- [ ] Instalar `@types/node` se ausente
- [ ] Adicionar declarações de módulo para pacotes sem tipos (`*.d.ts`)
- [ ] Corrigir imports quebrados (paths relativos → `@/` alias)

**Subetapa 0.2.4 — Resolver TS2580 (134 erros):**
- [ ] Garantir `"types": ["node"]` no `tsconfig.json`
- [ ] Verificar `compilerOptions.lib` inclui `esnext`

**Meta:** `npm run check:types` passa com ZERO erros.

**Arquivos:** `tsconfig.json`, todos os arquivos `.ts`/`.tsx` em `src/`

---

### 0.3 Hash de Senha Admin

**Problema:** Senha admin armazenada em texto plano no env var, comparada sem hashing via `timingSafeCompare()`.

**Ações:**
- [ ] Instalar `bcryptjs` (ou `argon2`)
- [ ] Criar script `scripts/hash-password.ts` para gerar hash de senha
- [ ] Modificar `src/auth.ts` para comparar com `bcrypt.compare()`
- [ ] Atualizar `.env.example` com instrução para usar hash
- [ ] Documentar processo de rotação de senha

**Arquivos:** `src/auth.ts` (linhas 31-40), `package.json`, `.env.example`

---

### 0.4 Remover Dados Sensíveis do Git

**Problema:** `.wa-session.json`, `.wa-state.json`, `auth_info/` com tokens WhatsApp e número de telefone commitados no histórico.

**Ações:**
- [ ] Verificar `.gitignore` inclui todos os patterns sensíveis
- [ ] Executar `git filter-repo` ou BFG Repo Cleaner para limpar histórico
- [ ] Rotacionar tokens WhatsApp comprometidos
- [ ] Adicionar pre-commit hook para detectar secrets (usando `git-secrets` ou `detect-secrets`)
- [ ] Auditar todos os `console.log` que imprimem PII (66 instâncias em rotas API)

**Arquivos:** `.gitignore`, histórico git, `scripts/`

---

### 0.5 Proteger Rotas API Públicas Críticas

**Problema:** 5 endpoints públicos expõem dados de pacientes e permitem mutações sem autenticação:
- `POST /api/alocacao/iniciar` — dispara alocação sem auth
- `POST /api/avaliacoes/hospital` — cria pacientes emergência sem auth
- `GET /api/pacientes/search` — expõe dados de pacientes sem auth
- `POST /api/orcamento` — calcula preços e persiste sem auth
- `POST /api/propostas/enviar` — cria pacientes e envia WhatsApp sem auth

**Ações:**
- [ ] Criar `src/middleware.ts` com proteção global para `/api/admin/*` e `/api/` (exceto health, webhook, auth)
- [ ] Adicionar session check ou API key em cada endpoint público crítico
- [ ] Para endpoints que PRECISAM ser públicos (webhook), manter verificação HMAC
- [ ] Implementar API keys para integrações externas (hospital → `/api/avaliacoes/hospital`)

**Arquivos:** `src/middleware.ts` (novo), rotas em `src/app/api/`

---

## FASE 1 — Fortalecimento de Segurança

### 1.1 Proteção CSRF

**Problema:** Nenhuma proteção CSRF em endpoints de mutação.

**Ações:**
- [ ] Implementar tokens CSRF double-submit cookie pattern
- [ ] Criar middleware `src/lib/api/csrf.ts`
- [ ] Aplicar em todos os endpoints POST/PUT/DELETE
- [ ] Configurar `SameSite=Strict` nos cookies de sessão
- [ ] Adicionar header `X-Requested-With` validation

**Arquivos:** `src/lib/api/csrf.ts` (novo), `src/auth.ts`

---

### 1.2 Validação Universal com Zod

**Problema:** Apenas ~3 de 15 endpoints críticos usam Zod. A maioria aceita `request.json()` sem validação.

**Ações:**
- [ ] Criar schemas Zod para TODOS os 69 endpoints que aceitam body
- [ ] Organizar schemas em `src/lib/validation/schemas/` por domínio
- [ ] Criar helper `parseBody<T>(request, schema)` que retorna `fail()` automaticamente em erro
- [ ] Migrar todos os endpoints para usar o helper
- [ ] Adicionar validação de query params com Zod (`parseQuery<T>()`)

**Estrutura proposta:**
```
src/lib/validation/
├── schemas/
│   ├── paciente.ts
│   ├── avaliacao.ts
│   ├── orcamento.ts
│   ├── alocacao.ts
│   ├── whatsapp.ts
│   └── common.ts       # Telefone, CPF, email, paginação
├── parse-body.ts
├── parse-query.ts
└── index.ts
```

---

### 1.3 Rate Limiting Universal

**Problema:** Apenas 4 endpoints usam rate limiting. Rate limit é in-memory (não sobrevive restart).

**Ações:**
- [ ] Aplicar rate limiting em TODOS os endpoints públicos
- [ ] Criar configuração por tier de rota:
  - Auth: 5 req/min (brute force protection)
  - Public: 30 req/min
  - Admin read: 100 req/min
  - Admin write: 20 req/min
  - WhatsApp: 50 req/min
- [ ] Migrar para Redis-backed rate limiting (Fase 2)
- [ ] Adicionar rate limit headers na resposta (`X-RateLimit-*`)

**Arquivos:** `src/lib/api/rate-limit.ts`, `src/middleware.ts`

---

### 1.4 Corrigir Authorization Defaults

**Problema:** `canAccessAdminPage()` e `canAccessAdminApi()` retornam `true` como default — qualquer rota desconhecida é permitida.

**Ações:**
- [ ] Alterar `return true` para `return false` como default em `canAccessAdminPage()` (linha 191)
- [ ] Alterar `return true` para `return false` como default em `canAccessAdminApi()` (linha 243)
- [ ] Adicionar testes para cada rota verificando acesso por role
- [ ] Criar whitelist explícita de rotas por role

**Arquivos:** `src/lib/auth/roles.ts` (linhas 191, 243)

---

### 1.5 Content Security Policy (CSP)

**Problema:** Todos os security headers configurados EXCETO CSP.

**Ações:**
- [ ] Adicionar header `Content-Security-Policy` em `next.config.ts`
- [ ] Configurar nonce-based CSP para scripts inline
- [ ] Bloquear `unsafe-inline` e `unsafe-eval`
- [ ] Permitir apenas domínios confiáveis para recursos externos

**Arquivos:** `next.config.ts`

---

### 1.6 Eliminar Console Logging de PII

**Problema:** 66 instâncias de `console.log` em rotas API imprimindo nomes de pacientes, telefones e dados de fluxo.

**Ações:**
- [ ] Substituir todos os `console.log` em `src/app/api/` por `logger.info()` / `logger.debug()`
- [ ] Implementar PII scrubbing no logger (mascarar telefone, CPF, nome)
- [ ] Configurar log levels por ambiente (debug apenas em dev)
- [ ] ESLint rule `no-console: error` para prevenir regressão

**Arquivos:** Todas as rotas em `src/app/api/`, `src/lib/observability/logger.ts`, `eslint.config.mjs`

---

## FASE 2 — Migração de Infraestrutura

### 2.1 Migrar SQLite → PostgreSQL

**Problema:** SQLite não suporta acesso concorrente, não tem JSONB, sem full-text search nativo.

**Ações:**
- [ ] Atualizar `prisma/schema.prisma`: `provider = "postgresql"`
- [ ] Converter 11 campos JSON String → `Json` type nativo do Prisma
  - `Avaliacao.dadosDetalhados`
  - `Orcamento.snapshotInput/snapshotOutput/planningInput/normalizedSchedule/pricingBreakdown`
  - `OrcamentoSimulacao.inputSnapshot/outputSnapshot`
  - `SystemLog.metadata`
  - `WhatsAppMessage.metadata`
- [ ] Adicionar indexes compostos faltando:
  - `Paciente: @@index([status, createdAt])`
  - `Avaliacao: @@index([pacienteId, status])`
  - `Mensagem: @@index([cuidadorId])`
  - `WhatsAppFlowState: @@index([currentFlow])`
- [ ] Criar migration script SQLite → PostgreSQL
- [ ] Configurar connection pooling (PgBouncer ou Prisma Data Proxy)
- [ ] Testar todas as queries com PostgreSQL
- [ ] Implementar soft deletes nos modelos de negócio (`deletedAt DateTime?`)

**Arquivos:** `prisma/schema.prisma`, `src/lib/prisma.ts`, `.env`

---

### 2.2 Dockerização

**Ações:**
- [ ] Criar `Dockerfile` multi-stage (builder + runner)
- [ ] Criar `docker-compose.yml` com serviços:
  - `app` (Next.js)
  - `db` (PostgreSQL)
  - `redis` (cache + rate-limit + sessions)
  - `whatsapp-bridge` (standalone)
- [ ] Criar `docker-compose.dev.yml` com hot-reload
- [ ] Criar `.dockerignore`
- [ ] Health checks para todos os containers
- [ ] Volume mounts para persistência de dados

**Arquivos novos:** `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `.dockerignore`

---

### 2.3 Pipeline CI/CD

**Ações:**
- [ ] Criar `.github/workflows/ci.yml`:
  ```yaml
  Jobs:
    - lint (ESLint)
    - typecheck (tsc --noEmit)
    - test (vitest run --coverage)
    - security (npm audit, Snyk/Trivy scan)
    - build (next build)
    - deploy (staging → production)
  ```
- [ ] Configurar branch protection rules em `main`
- [ ] Exigir PR review + CI green para merge
- [ ] Configurar preview deployments para PRs
- [ ] Adicionar code coverage badge e threshold (mínimo 80%)

**Arquivos:** `.github/workflows/ci.yml` (novo), `.github/workflows/deploy.yml` (novo)

---

### 2.4 Gerenciamento de Variáveis de Ambiente

**Problema:** 20+ locais com `process.env` direto, sem validação centralizada.

**Ações:**
- [ ] Criar `src/lib/env.ts` com schema Zod para TODAS as env vars:
  ```typescript
  const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD_HASH: z.string(),
    NODE_ENV: z.enum(['development', 'test', 'production']),
    WA_BRIDGE_URL: z.string().url().optional(),
    // ... todas as outras
  });
  export const env = envSchema.parse(process.env);
  ```
- [ ] Substituir TODOS os `process.env.X` por `env.X`
- [ ] Falhar no boot se variáveis obrigatórias ausentes
- [ ] Separar `.env.development`, `.env.test`, `.env.production`

**Arquivos:** `src/lib/env.ts` (novo/reescrever), todos os arquivos com `process.env`

---

### 2.5 Redis para State Management

**Ações:**
- [ ] Instalar `ioredis`
- [ ] Criar `src/lib/redis.ts` (singleton client)
- [ ] Migrar rate limiting: in-memory → Redis (`src/lib/api/rate-limit.ts`)
- [ ] Migrar sessions: JWT → Redis-backed sessions
- [ ] Migrar WhatsApp state: `globalThis as any` → Redis
- [ ] Migrar message queue: in-memory → Redis (Bull/BullMQ)

---

## FASE 3 — Qualidade de Código

### 3.1 Eliminar Todos os `as any` (47 instâncias)

**Ações:**
- [ ] Criar tipos corretos para cada caso:
  - `src/lib/repositories/mock-db.ts` — tipar store com interfaces concretas
  - `src/lib/state/memory.ts` — usar `declare global` em vez de `globalThis as any`
  - `src/app/admin/avaliacoes/nova/steps/StepABEMID.tsx` — usar `Partial<AbemidData>`
  - `src/app/admin/whatsapp/page.tsx` — tipar rows com interface específica
  - Todos os outros 40+ casos
- [ ] ESLint: mudar `@typescript-eslint/no-explicit-any` de `warn` → `error`
- [ ] Meta: ZERO `as any` no codebase

**Arquivos:** 14 arquivos com `as any` (listados na auditoria)

---

### 3.2 Padronizar Error Handling

**Problema:** Apenas ~15% das rotas usam `withErrorBoundary()`. 85% usam try/catch manual.

**Ações:**
- [ ] Envolver TODAS as 69 rotas com `withErrorBoundary()`
- [ ] Criar composição: `withAuth(withRateLimit(withErrorBoundary(handler)))`
- [ ] Padronizar: nenhuma rota deve ter try/catch manual no nível de handler
- [ ] Adicionar request context automático via `withRequestContext()`

**Pattern final para todas as rotas:**
```typescript
// src/app/api/admin/pacientes/route.ts
export const GET = withAuth('VIEW_PATIENTS',
  withRateLimit('admin-read', 100, 60_000,
    withErrorBoundary(async (request) => {
      // Lógica pura, sem try/catch
      const data = await prisma.paciente.findMany({ ... });
      return ok(data);
    })
  )
);
```

**Arquivos:** `src/lib/api/with-error-boundary.ts`, `src/lib/api/middleware-compose.ts` (novo), todas as rotas

---

### 3.3 Consolidar Acesso ao Banco de Dados

**Problema:** Duas camadas de abstração — `src/lib/db.ts` (factory) e `src/lib/prisma.ts` (direto). Uso inconsistente.

**Ações:**
- [ ] Decidir: manter APENAS `src/lib/prisma.ts` como fonte única
- [ ] Migrar todos os imports de `@/lib/db` → `@/lib/prisma`
- [ ] Remover `src/lib/db.ts` e `src/lib/database/index.ts`
- [ ] Mock database: usar Prisma com SQLite in-memory para testes
- [ ] Remover `src/lib/repositories/mock-db.ts`

**Arquivos:** `src/lib/db.ts`, `src/lib/database/`, `src/lib/repositories/mock-db.ts`, todos os importadores

---

### 3.4 Eliminar Duplicação de Código

**Problema:** Padrões repetidos em 30+ rotas (pagination, guard, filter parsing).

**Ações:**
- [ ] Criar `src/lib/api/pagination.ts` — helper universal de paginação
- [ ] Criar `src/lib/api/filters.ts` — parsing de filtros com Zod
- [ ] Integrar guard no middleware compose (3.2)
- [ ] Extrair `src/lib/api/prisma-helpers.ts` — helpers de count, aggregation
- [ ] Padronizar normalização de telefone: usar `phone-validator.ts` em TODOS os lugares

---

### 3.5 Remover Dependências Não Utilizadas

**Problema:** `@tanstack/react-query` instalado mas ZERO hooks no codebase. `@hapi/boom` não importado.

**Ações:**
- [ ] Remover `@tanstack/react-query` (ou implementar uso real)
- [ ] Remover `@hapi/boom` se não usado
- [ ] Auditar todas as dependências com `depcheck`
- [ ] Documentar propósito de cada dependência em `package.json`

---

### 3.6 ESLint Strict Mode

**Ações:**
- [ ] `@typescript-eslint/no-explicit-any`: `warn` → `error`
- [ ] `@typescript-eslint/no-unused-vars`: `warn` → `error`
- [ ] `no-console`: `off` → `error` (com exceção para `logger`)
- [ ] `@next/next/no-img-element`: `warn` → `error`
- [ ] Adicionar regra `import/no-cycle` para prevenir dependências circulares
- [ ] Adicionar `eslint-plugin-security` para detectar patterns inseguros

---

## FASE 4 — Cobertura de Testes

### 4.1 Corrigir Configuração Vitest

**Problema:** Ambiente `node` para componentes React, missing `.test.tsx` pattern.

**Ações:**
- [ ] Atualizar `vitest.config.ts`:
  ```typescript
  {
    test: {
      environment: 'jsdom',
      include: ['**/*.test.{ts,tsx}'],
      setupFiles: ['./vitest.setup.ts'],
      coverage: {
        include: ['src/**/*.{ts,tsx}'],  // Expandir para todo src/
        thresholds: { lines: 80, branches: 70, functions: 80 },
      },
    },
  }
  ```
- [ ] Criar `vitest.setup.ts` com React 19 setup
- [ ] Instalar `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

---

### 4.2 Testes de API Routes (82 rotas sem cobertura)

**Prioridade 1 — Rotas críticas de negócio:**
- [ ] `POST /api/admin/pacientes` — CRUD de pacientes
- [ ] `POST /api/admin/avaliacoes` — CRUD de avaliações
- [ ] `POST /api/admin/orcamentos` — CRUD de orçamentos
- [ ] `POST /api/admin/alocacoes` — CRUD de alocações
- [ ] `POST /api/alocacao/iniciar` — iniciar alocação
- [ ] `POST /api/propostas/enviar` — enviar propostas
- [ ] `POST /api/avaliacoes/hospital` — criar paciente hospital

**Prioridade 2 — Rotas WhatsApp:**
- [ ] `POST /api/admin/whatsapp/broadcast` — broadcast
- [ ] `GET/POST /api/admin/whatsapp/contacts` — contatos
- [ ] `GET/POST /api/admin/whatsapp/templates` — templates
- [ ] `GET /api/admin/whatsapp/analytics` — analytics
- [ ] `POST /api/whatsapp/webhook` — webhook

**Prioridade 3 — Todas as demais 60+ rotas**

**Pattern de teste:**
```typescript
import { GET, POST } from './route';

describe('POST /api/admin/pacientes', () => {
  it('cria paciente com dados válidos', async () => { ... });
  it('retorna 401 sem sessão', async () => { ... });
  it('retorna 403 sem capability', async () => { ... });
  it('retorna 400 com dados inválidos', async () => { ... });
  it('retorna 429 com rate limit excedido', async () => { ... });
});
```

---

### 4.3 Testes de WhatsApp Handlers (9 handlers sem cobertura)

- [ ] `cadastro-cuidador.ts` — fluxo de cadastro
- [ ] `aceite-orcamento.ts` — aceitação de orçamento
- [ ] `confirmacao-proposta.ts` — confirmação de proposta
- [ ] `assinatura-contrato.ts` — assinatura de contrato
- [ ] `checkin.ts` — check-in de plantão
- [ ] `escolha-slot.ts` — escolha de horário
- [ ] `oferta-plantao.ts` — oferta de plantão
- [ ] `onboarding.ts` — onboarding
- [ ] `quiz.ts` — quiz do cuidador

---

### 4.4 Testes de Componentes UI

- [ ] `Button.tsx` — variantes, estados, acessibilidade
- [ ] `Modal.tsx` — abrir/fechar, keyboard trap, backdrop
- [ ] `DataTable.tsx` — paginação, sort, filtros
- [ ] `TanStackDataTable.tsx` — integração TanStack Table
- [ ] `MaskedInput.tsx` — máscaras de telefone, CPF
- [ ] Todos os 13 componentes restantes

---

### 4.5 Testes E2E

**Ações:**
- [ ] Instalar Playwright
- [ ] Criar testes E2E para fluxos críticos:
  - Login → Dashboard → Criar paciente → Criar avaliação → Gerar orçamento
  - Login → WhatsApp → Enviar broadcast
  - Webhook WhatsApp → Bot response → Flow completion
- [ ] Configurar no CI/CD pipeline

**Meta geral:** 80%+ cobertura de linhas, 70%+ branches, 80%+ funções.

---

## FASE 5 — Performance & Escalabilidade

### 5.1 Otimização de Queries Prisma

**Ações:**
- [ ] Auditar N+1 queries em todas as rotas (usar Prisma `include` em vez de queries separadas)
- [ ] Implementar `select` em todas as queries (buscar apenas campos necessários)
- [ ] Adicionar indexes compostos baseados em padrões de acesso real
- [ ] Implementar cursor-based pagination para listagens grandes
- [ ] Usar `prisma.$transaction` para operações atômicas
- [ ] Configurar Prisma query logging em desenvolvimento

---

### 5.2 Caching Strategy

**Ações:**
- [ ] Instalar Redis (se não feito na Fase 2)
- [ ] Implementar cache layers:
  - **L1:** In-memory LRU (dados hot, TTL curto: 30s)
  - **L2:** Redis (dados mornos, TTL médio: 5-15min)
  - **L3:** CDN/Edge (assets estáticos, headers, páginas)
- [ ] Cache candidates:
  - Dashboard stats: Redis, TTL 5min
  - Lista de cuidadores: Redis, TTL 2min
  - Configuração de pricing: Redis, TTL 15min
  - WhatsApp templates: Redis, TTL 10min
- [ ] Implementar cache invalidation por domínio
- [ ] Criar `src/lib/cache/` com interface abstrata

---

### 5.3 Connection Pooling

**Ações:**
- [ ] Configurar PgBouncer ou Prisma Data Proxy
- [ ] Limitar conexões Prisma por ambiente:
  - Dev: 5 conexões
  - Staging: 10 conexões
  - Production: 25 conexões
- [ ] Monitorar connection pool metrics

---

### 5.4 Background Jobs

**Problema:** WhatsApp message queue é in-memory. Broadcasts são síncronos.

**Ações:**
- [ ] Instalar BullMQ (Redis-backed job queue)
- [ ] Migrar WhatsApp queue → BullMQ com:
  - Retries exponenciais
  - Dead letter queue
  - Priorização
  - Rate limiting por contato
- [ ] Mover operações pesadas para background:
  - PDF generation
  - Broadcast WhatsApp
  - Relatórios
  - Audit log writes
- [ ] Dashboard de monitoramento de jobs (Bull Board)

---

### 5.5 Next.js Performance

**Ações:**
- [ ] Habilitar React Compiler (resolver issues de setState)
- [ ] Implementar Streaming SSR para páginas admin
- [ ] Route-level code splitting (já automático com App Router)
- [ ] Otimizar bundle size: analisar com `@next/bundle-analyzer`
- [ ] Implementar `loading.tsx` e `error.tsx` em todas as rotas de página
- [ ] Lazy load componentes pesados (TanStackDataTable, FlowBuilder)

---

## FASE 6 — Observabilidade & Operações

### 6.1 APM (Application Performance Monitoring)

**Ações:**
- [ ] Integrar OpenTelemetry para tracing distribuído
- [ ] Instrumentar:
  - HTTP requests (tempo de resposta, status codes)
  - Prisma queries (duração, query plan)
  - WhatsApp bridge calls (latência, erros)
  - Background jobs (tempo de processamento, falhas)
- [ ] Exportar para Grafana/Datadog/New Relic
- [ ] Dashboards:
  - Request latency P50/P95/P99
  - Error rate por endpoint
  - Database query performance
  - WhatsApp delivery rate

---

### 6.2 Health Checks Avançados

**Problema:** Endpoint `/api/health` retorna apenas status básico.

**Ações:**
- [ ] Expandir health check para verificar:
  - Database connectivity + latência
  - Redis connectivity
  - WhatsApp bridge status
  - Disk space
  - Memory usage
- [ ] Criar `/api/health/ready` (readiness probe para K8s)
- [ ] Criar `/api/health/live` (liveness probe para K8s)
- [ ] Implementar graceful shutdown

---

### 6.3 Structured Logging Completo

**Ações:**
- [ ] Migrar de logger custom → Pino (já na lista de dependências externas)
- [ ] Formato JSON para production, pretty para dev
- [ ] Campos padrão em todos os logs:
  ```json
  {
    "timestamp": "ISO8601",
    "level": "info",
    "requestId": "uuid",
    "userId": "...",
    "route": "/api/...",
    "action": "...",
    "durationMs": 42,
    "metadata": {}
  }
  ```
- [ ] Log rotation e retenção configuráveis
- [ ] Alertas automáticos em error rate > threshold

---

### 6.4 Alerting & Monitoring

**Ações:**
- [ ] Configurar alertas para:
  - Error rate > 1% por 5 min
  - P95 latency > 2s
  - Database connections > 80% pool
  - WhatsApp circuit breaker OPEN
  - Failed login attempts > 10/min
  - Disk > 80%
- [ ] Integrar com Slack/Teams/PagerDuty
- [ ] Criar runbooks para cada tipo de alerta

---

## FASE 7 — Multi-tenancy & Governança

### 7.1 Multi-tenancy

**Problema:** Nenhum filtro `organizationId` nas queries. Todos os usuários veem todos os dados.

**Ações:**
- [ ] Adicionar modelo `Organization` ao schema Prisma
- [ ] Adicionar `organizationId` em todos os modelos de negócio:
  - Cuidador, Paciente, Avaliacao, Orcamento, Alocacao, Mensagem
- [ ] Criar middleware Prisma para filtro automático por organização
- [ ] Atualizar User model para incluir `organizationId`
- [ ] Criar admin de organizações (CRUD)
- [ ] Migrar dados existentes para organização default

---

### 7.2 User Model Completo

**Problema:** Auth é 100% baseada em env vars. Não existe modelo User no banco.

**Ações:**
- [ ] Criar modelo `User` no Prisma:
  ```prisma
  model User {
    id             String   @id @default(cuid())
    email          String   @unique
    name           String?
    passwordHash   String
    role           String   @default("LEITURA")
    organizationId String
    isActive       Boolean  @default(true)
    lastLoginAt    DateTime?
    createdAt      DateTime @default(now())
    updatedAt      DateTime @updatedAt
    organization   Organization @relation(fields: [organizationId], references: [id])
  }
  ```
- [ ] Migrar auth de env vars → database lookup
- [ ] Implementar convite de usuários por email
- [ ] Implementar reset de senha
- [ ] Histórico de login (audit)

---

### 7.3 Audit Trail Completo

**Ações:**
- [ ] Expandir `ConfigAuditLog` para cobrir TODAS as entidades
- [ ] Registrar: quem, quando, o quê, valor anterior, valor novo
- [ ] Implementar via Prisma middleware (automático em toda operação CUD)
- [ ] UI para visualizar histórico de alterações
- [ ] Retenção: mínimo 2 anos
- [ ] Export para compliance (CSV/JSON)

---

### 7.4 Soft Deletes

**Problema:** Deleções são hard delete. Dados perdidos permanentemente.

**Ações:**
- [ ] Adicionar `deletedAt DateTime?` em todos os modelos de negócio
- [ ] Criar middleware Prisma para filtrar registros deletados automaticamente
- [ ] UI para "lixeira" com opção de restaurar
- [ ] Purge automático após 90 dias

---

## FASE 8 — API & Documentação

### 8.1 OpenAPI / Swagger

**Ações:**
- [ ] Gerar spec OpenAPI 3.1 para todos os 69 endpoints
- [ ] Documentar request/response schemas, auth requirements, rate limits
- [ ] Montar Swagger UI em `/api/docs` (apenas em dev/staging)
- [ ] Validar spec com ferramentas automatizadas
- [ ] Gerar SDK client TypeScript a partir da spec

---

### 8.2 Versionamento de API

**Ações:**
- [ ] Implementar versionamento via header `Accept-Version` ou path prefix `/api/v1/`
- [ ] Manter compatibilidade com v1 enquanto v2 evolui
- [ ] Deprecation notices em headers de resposta
- [ ] Documentar política de versionamento

---

### 8.3 WhatsApp API Oficial

**Problema:** Baileys viola TOS do WhatsApp. Risco de ban da conta.

**Ações:**
- [ ] Avaliar migração para WhatsApp Business API oficial (Cloud API)
- [ ] Implementar adapter pattern para trocar Baileys → Cloud API sem mudar handlers
- [ ] Manter Baileys como fallback para desenvolvimento/teste
- [ ] Criar interface abstrata `IWhatsAppProvider`:
  ```typescript
  interface IWhatsAppProvider {
    sendMessage(to: string, content: MessageContent): Promise<MessageResult>;
    onMessage(handler: MessageHandler): void;
    getStatus(): ConnectionStatus;
  }
  ```

---

## FASE 9 — Hardening Final

### 9.1 Penetration Testing

**Ações:**
- [ ] Executar OWASP ZAP scan automatizado
- [ ] Teste manual de OWASP Top 10
- [ ] Teste de authorization bypass (IDOR, privilege escalation)
- [ ] Teste de rate limiting e DDoS resilience
- [ ] Relatório de findings + remediation
- [ ] Re-teste após correções

---

### 9.2 Chaos Engineering

**Ações:**
- [ ] Testar cenários de falha:
  - Database down → circuit breaker + retry
  - Redis down → fallback para in-memory
  - WhatsApp bridge down → queue + retry
  - High load → rate limiting + graceful degradation
- [ ] Documentar recovery procedures
- [ ] Testar failover automático

---

### 9.3 Disaster Recovery

**Ações:**
- [ ] Backup automático de PostgreSQL (diário, retenção 30 dias)
- [ ] Backup de Redis (RDB snapshots)
- [ ] Testar restauração de backup periodicamente
- [ ] Documentar RPO (Recovery Point Objective) e RTO (Recovery Time Objective)
- [ ] Implementar database replication (primary + read replica)

---

### 9.4 Compliance & Governança de Dados

**Ações:**
- [ ] LGPD compliance:
  - Consentimento para coleta de dados pessoais
  - Direito de acesso aos dados (endpoint de exportação)
  - Direito de exclusão (soft delete + purge)
  - Registro de processamento de dados
- [ ] Criptografia de dados sensíveis at rest (CPF, telefone)
- [ ] Data retention policies documentadas
- [ ] Privacy by design review

---

## Métricas de Convergência (10/10)

### Scoreboard por Dimensão

| Dimensão | Estado Atual | Meta 10/10 | Critérios |
|----------|-------------|-----------|-----------|
| **Segurança** | 3/10 | 10/10 | Zero vulns críticas, OWASP compliant, pen-tested |
| **TypeScript** | 2/10 | 10/10 | Zero erros, zero `any`, strict mode enforced |
| **Testes** | 3/10 | 10/10 | 80%+ cobertura, E2E, CI gate |
| **Performance** | 5/10 | 10/10 | P95 < 500ms, caching, pooling, background jobs |
| **Escalabilidade** | 3/10 | 10/10 | PostgreSQL, Redis, Docker, horizontal scaling |
| **Observabilidade** | 4/10 | 10/10 | APM, alerting, structured logs, dashboards |
| **Code Quality** | 4/10 | 10/10 | Zero duplicação, padrões consistentes, DRY |
| **Documentação** | 3/10 | 10/10 | OpenAPI, runbooks, architecture docs |
| **Operações** | 2/10 | 10/10 | CI/CD, Docker, backups, DR tested |
| **Governança** | 2/10 | 10/10 | Multi-tenant, audit trail, LGPD, User model |

### Definição de Done por Fase

| Fase | Critério de Conclusão |
|------|----------------------|
| **0** | `npm run check` passa, zero vulnerabilidades críticas, senha hashada |
| **1** | CSRF ativo, Zod em 100% endpoints, rate limit universal, CSP configurado |
| **2** | PostgreSQL rodando, Docker funcional, CI/CD green, env validado |
| **3** | Zero `as any`, error boundary em 100% rotas, DB access unificado |
| **4** | 80%+ cobertura, E2E para fluxos críticos, CI gate configurado |
| **5** | P95 < 500ms, cache hit rate > 70%, background jobs funcionando |
| **6** | APM integrado, alertas configurados, dashboards operacionais |
| **7** | Multi-tenant ativo, User model completo, audit trail 100% |
| **8** | OpenAPI spec publicada, API versionada, WhatsApp abstracted |
| **9** | Pen test clean, DR testado, LGPD compliant |

---

## Dependências entre Fases

```
Fase 0 (Fundação) ──────────────┐
                                 ├── Fase 1 (Segurança)
                                 ├── Fase 3 (Qualidade) ──── Fase 4 (Testes)
                                 │
                                 └── Fase 2 (Infra) ───────── Fase 5 (Performance)
                                                       │
                                                       └── Fase 6 (Observabilidade)
                                                       │
                                                       └── Fase 7 (Multi-tenancy)
                                                              │
                                                              └── Fase 8 (API/Docs)
                                                                     │
                                                                     └── Fase 9 (Hardening)
```

- **Fase 0** é pré-requisito para TUDO
- **Fases 1, 2, 3** podem rodar em paralelo após Fase 0
- **Fase 4** depende de Fase 3 (código limpo antes de testar)
- **Fases 5, 6** dependem de Fase 2 (PostgreSQL, Redis, Docker)
- **Fase 7** depende de Fase 2 (User model precisa de PostgreSQL)
- **Fase 8** depende de Fase 7 (API docs refletem multi-tenancy)
- **Fase 9** é a última (testa tudo que foi construído)

---

## Stack Final Enterprise

| Camada | Tecnologia |
|--------|-----------|
| **Runtime** | Node.js 20+ LTS |
| **Framework** | Next.js 16.x (App Router) |
| **UI** | React 19 + Tailwind CSS v4 |
| **Language** | TypeScript 5.9+ (strict) |
| **Database** | PostgreSQL 16 + Prisma 7.x |
| **Cache** | Redis 7.x |
| **Queue** | BullMQ (Redis-backed) |
| **Auth** | NextAuth v5 + bcrypt + RBAC |
| **Testing** | Vitest + Testing Library + Playwright |
| **Observability** | OpenTelemetry + Pino + Grafana |
| **CI/CD** | GitHub Actions |
| **Container** | Docker + Docker Compose |
| **WhatsApp** | Cloud API (oficial) + Baileys (dev) |
| **API Docs** | OpenAPI 3.1 + Swagger UI |
