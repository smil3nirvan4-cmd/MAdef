# CLAUDE.md — MAdef (Maos Amigas)

Healthcare management platform for home care services. Manages patients, caregivers, evaluations, budgets, allocations, and WhatsApp communication.

## Quick Reference

```bash
npm run dev          # Start Next.js + WhatsApp bridge
npm run dev:web      # Start Next.js only
npm run test:ci      # Run all tests (208 tests, 35 files)
npm run test:coverage # Run tests with coverage report
npm run lint         # ESLint
npm run check        # TypeScript + lint + tests
npm run db:push      # Push schema to SQLite
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Regenerate Prisma client
```

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router, Turbopack)
- **Language**: TypeScript 5.9.3 (strict mode)
- **Database**: SQLite via Prisma 6
- **Auth**: NextAuth v5 (beta) with email/password credentials
- **UI**: React 19, Tailwind CSS 4, Lucide icons, TanStack Table/Query
- **WhatsApp**: Baileys library via external bridge process (`whatsapp-bridge/`)
- **Testing**: Vitest 4
- **Logging**: Custom structured logger persisting to `SystemLog` table
- **PDF**: PDFKit for proposals and contracts

## Project Structure

```
src/
  app/                    # Next.js App Router
    api/                  # API routes
      admin/              # Protected admin API (15 route groups)
      auth/               # NextAuth endpoints
      health/             # Health check
      alocacao/           # Public allocation endpoints
      avaliacoes/         # Public evaluation endpoints
      orcamento/          # Public budget endpoints
      pacientes/          # Public patient endpoints
      propostas/          # Proposal sending
      whatsapp/           # WhatsApp webhook + status
    admin/                # Admin dashboard pages (30 pages)
    login/                # Login page
  components/             # React components
    ui/                   # Base UI primitives
    data-display/         # Tables, stats
    layout/               # Sidebar, navigation
    admin/                # Admin-specific components
  hooks/                  # Custom React hooks
  lib/                    # Core business logic
    api/                  # API utilities (response helpers, error codes, rate limit)
    auth/                 # Role-based access control (6 roles, 19 capabilities)
    allocation/           # Caregiver allocation logic
    contracts/            # Contract template engine (Markdown-based)
    documents/            # PDF generation (proposals, contracts)
    enterprise/           # Multi-unit config engine + feature flags
    evaluation/           # Clinical evaluation (ABEMID, Katz, Lawton scales)
    observability/        # Structured logger + request context (AsyncLocalStorage)
    pricing/              # Pricing calculator (legacy + enterprise engine)
    repositories/         # Repository pattern (IDatabaseFactory interface)
    scheduling/           # Recurrence engine for scheduling
    whatsapp/             # WhatsApp integration
      outbox/             # Reliable message delivery (DB-backed queue + worker)
      handlers/           # Conversation flow handlers
  types/                  # TypeScript type definitions
  styles/                 # Global styles
prisma/
  schema.prisma           # 33 models, SQLite provider
  migrations/             # 6 migrations
  seed.ts                 # Database seeder
whatsapp-bridge/          # Standalone WhatsApp bridge (Node.js + Baileys)
```

## Architecture Patterns

### Repository Pattern
`src/lib/repositories/types.ts` defines `IDatabaseFactory` with 8 sub-repositories (cuidador, paciente, whatsapp, messaging, form, avaliacao, orcamento, alocacao). Concrete implementation in `prisma-db.ts`, mock in `mock-db.ts` for tests.

**Note:** Many admin API routes still use `prisma` directly rather than going through the repository layer. New routes should prefer using the repository pattern.

### API Response Pattern
All API routes should use helpers from `src/lib/api/response.ts`:
- `ok(data)` / `ok(data, 201)` for success
- `fail(E.NOT_FOUND, "message")` for client errors
- `serverError(error)` for 500s
- `withErrorBoundary(handler)` wraps routes with consistent error handling

Error codes defined in `src/lib/api/error-codes.ts` (enum `E`).

### Auth & RBAC
- **NextAuth v5** with credentials provider (email/password from env vars)
- **6 roles**: ADMIN, SUPERVISOR, FINANCEIRO, RH, OPERADOR, LEITURA
- **19 capabilities** mapped per role in `src/lib/auth/roles.ts`
- Role assignment via env vars: `ADMIN_EMAILS`, `SUPERVISOR_EMAILS`, etc.
- Middleware in `src/proxy.ts` enforces auth on `/admin/*` and `/api/admin/*`
- `requireCapability(role, 'MANAGE_PACIENTES')` throws `{code:'FORBIDDEN'}` if missing

### Logging
Single unified logger at `src/lib/observability/logger.ts`, re-exported from `src/lib/logger.ts`:
```ts
import logger from '@/lib/logger';
await logger.info('action_name', 'Human-readable message', { metadata });
await logger.error('action_name', 'Error message', error);
```
Logs persist to `SystemLog` table with request context (requestId, route, role, durationMs).

### Request Context
`src/lib/observability/request-context.ts` uses `AsyncLocalStorage` for per-request correlation IDs. Automatically populated by the middleware proxy. Access via `RequestContext.getRequestId()`.

### WhatsApp Outbox
Reliable message delivery via database-backed queue (not Redis):
1. `src/lib/whatsapp/outbox/service.ts` enqueues messages to `WhatsAppQueueItem` table
2. `src/lib/whatsapp/outbox/worker.ts` polls and processes with backoff retry
3. Database locks via `WhatsAppLock` model prevent concurrent processing
4. Circuit breaker in `src/lib/whatsapp/circuit-breaker.ts`

### Enterprise Pricing
Dual pricing system:
- **Legacy**: `src/lib/pricing/calculator.ts` — single-unit, hardcoded rates
- **Enterprise**: `src/lib/pricing/enterprise-engine.ts` — multi-unit, DB-configured rates via `Unidade` + `UnidadeConfiguracaoVersao` models
- Feature-flagged via `ENTERPRISE_PRICING_ENABLED` env var
- Full audit trail via `OrcamentoAuditLog` and `ConfigAuditLog` tables

## Database

### Provider
SQLite (`file:./dev.db`). Schema in `prisma/schema.prisma`.

### Key Models
| Domain | Models |
|--------|--------|
| Core | Cuidador, Paciente, Mensagem, Avaliacao, Orcamento, Alocacao, FormSubmission |
| WhatsApp | WhatsAppSession, WhatsAppFlowState, WhatsAppContact, WhatsAppMessage, WhatsAppQueueItem, WhatsAppLock, WhatsAppCooldown, + 8 more |
| Enterprise | Unidade, UnidadeConfiguracaoVersao, UnidadeDoencaRegra, UnidadeRegraHora, UnidadeTaxaPagamento, UnidadeMinicusto, UnidadePercentualComissao, UnidadeDescontoPreset, UnidadeContratoTemplate, OrcamentoSimulacao |
| Audit | ConfigAuditLog, OrcamentoAuditLog, SystemLog |

### Migrations
Run `npm run db:push` for development (applies schema directly). Prisma migrations in `prisma/migrations/` for production tracking.

## Testing

- **Framework**: Vitest 4 with globals enabled
- **208 tests across 35 files**, all passing
- **Path alias**: `@/` maps to `./src/`
- **Coverage scope**: `src/lib/**/*.ts` only
- Tests colocated with source files (e.g., `calculator.test.ts` next to `calculator.ts`)
- Mock DB available at `src/lib/repositories/mock-db.ts`

### Running Tests
```bash
npm run test:ci        # Single run, verbose
npm run test:coverage  # With coverage report
npx vitest run src/lib/pricing  # Run specific module tests
```

## Environment Variables

Required variables documented in `.env.example`. Key ones:
- `DATABASE_URL` — SQLite path (default: `file:./dev.db`)
- `NEXTAUTH_SECRET` — Session encryption key
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Default admin credentials
- `WA_BRIDGE_URL` — WhatsApp bridge endpoint
- `ENTERPRISE_PRICING_ENABLED` — Enable multi-unit pricing

## Conventions

### Code Style
- TypeScript strict mode, path alias `@/*` for `src/*`
- Brazilian Portuguese for domain terms (paciente, cuidador, avaliacao, orcamento, alocacao)
- English for technical terms (logger, repository, handler, service)
- Zod for runtime validation on API inputs
- No semicolons optional — codebase uses semicolons

### File Naming
- `kebab-case.ts` for all files
- `.test.ts` suffix for tests, colocated with source
- `route.ts` for Next.js API routes
- `page.tsx` for Next.js pages

### API Routes
- Admin routes under `src/app/api/admin/[resource]/`
- Use `withErrorBoundary()` wrapper for consistent error handling
- Use `ok()`, `fail()`, `serverError()` response helpers
- Check capabilities with `requireCapability(role, capability)`

### Known Issues
- Build requires network access (Google Fonts). Use `next dev` for local development.
- `src/app/admin/ashboard/` exists (typo of "dashboard") alongside `src/app/admin/dashboard/`
- Phone validator auto-corrects 8-digit mobile numbers by prepending '9' (intentional behavior)
