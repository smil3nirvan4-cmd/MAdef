# CLAUDE.md — MAdef (Maos Amigas)

Healthcare management platform for home care services. Manages patients, caregivers, evaluations, budgets, allocations, and WhatsApp communication.

## Quick Reference

```bash
npm run dev          # Start Next.js + WhatsApp bridge
npm run dev:web      # Start Next.js only
npm run test:ci      # Run all tests (356 tests, 49 files)
npm run test:coverage # Run tests with coverage report
npm run lint         # ESLint
npm run check        # TypeScript + lint + tests
npm run db:push      # Push schema to PostgreSQL
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Regenerate Prisma client
```

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router, Turbopack)
- **Language**: TypeScript 5.9.3 (strict mode)
- **Database**: PostgreSQL via Prisma 6
- **Cache**: Redis (optional, graceful degradation) + in-memory L1 cache
- **Queue**: BullMQ for WhatsApp outbox processing (falls back to DB polling)
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
      admin/              # Protected admin API (15+ route groups)
        lgpd/             # LGPD endpoints (export, anonymize, consent)
      auth/               # NextAuth endpoints
      health/             # Health check (DB, Redis, WhatsApp, memory)
      openapi/            # OpenAPI 3.0 spec endpoint
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
  instrumentation.ts      # Next.js instrumentation hook (starts BullMQ worker)
  lib/                    # Core business logic
    api/                  # API utilities (response, error codes, rate limit, parse-body)
    audit/                # Audit logging (logAudit, computeChanges)
    auth/                 # Role-based access control (6 roles, 48 capabilities)
    allocation/           # Caregiver allocation logic
    cache/                # Two-level cache (L1 memory + L2 Redis)
    contracts/            # Contract template engine (Markdown-based)
    db/                   # Soft-delete utilities
    documents/            # PDF generation (proposals, contracts)
    enterprise/           # Multi-unit config engine + feature flags
    evaluation/           # Clinical evaluation (ABEMID, Katz, Lawton scales)
    jobs/                 # BullMQ queues and workers
    lgpd/                 # LGPD services (consent, data export, anonymization)
    observability/        # Structured logger + request context (AsyncLocalStorage)
    openapi/              # OpenAPI 3.0 spec definition
    pricing/              # Pricing calculator (legacy + enterprise engine)
    redis/                # Redis client singleton (graceful degradation)
    repositories/         # Repository pattern (per-entity + IDatabaseFactory)
    scheduling/           # Recurrence engine for scheduling
    security/             # Security headers (OWASP best practices)
    whatsapp/             # WhatsApp integration
      outbox/             # Reliable message delivery (DB-backed + BullMQ)
      handlers/           # Conversation flow handlers
  types/                  # TypeScript type definitions
  styles/                 # Global styles
prisma/
  schema.prisma           # 35 models, PostgreSQL provider
  migrations/             # Prisma migrations
  seed.ts                 # Database seeder
whatsapp-bridge/          # Standalone WhatsApp bridge (Node.js + Baileys)
```

## Architecture Patterns

### Security Layer
All admin API routes are protected with a consistent security stack:
1. **`guardCapability(cap)`** — checks RBAC capability (returns `NextResponse` or `{role, userId}`)
2. **`withErrorBoundary(handler)`** — catches errors, returns structured `serverError()` responses
3. **`withRateLimit(handler, {max, windowSec})`** — IP-based rate limiting with `Retry-After` header
4. **`parseBody(request, zodSchema)`** — Zod validation with structured error responses

```ts
// Standard route pattern
async function handlePost(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;
    const body = await parseBody(request, myZodSchema);
    if (isFailResponse(body)) return body;
    // ... business logic
    return ok(result);
}
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 30, windowSec: 60 });
```

### Repository Pattern
Individual entity repositories in `src/lib/repositories/`:
- `paciente.repository.ts` — findAll, findById, findLeads, update (with cache invalidation)
- `cuidador.repository.ts` — findAll, findById, create, update (with cache invalidation)
- `avaliacao.repository.ts` — findById, update, delete
- `orcamento.repository.ts` — findById, update
- `alocacao.repository.ts` — findAll, create, update

Legacy `IDatabaseFactory` interface still in `types.ts`/`prisma-db.ts`/`mock-db.ts`.

### API Response Pattern
All API routes use helpers from `src/lib/api/response.ts`:
- `ok(data)` / `ok(data, 201)` for success
- `fail(E.NOT_FOUND, "message")` for client errors
- `serverError(error)` for 500s
- `paginated(items, {page, pageSize, total})` for list endpoints

Error codes defined in `src/lib/api/error-codes.ts` (enum `E`).

### Caching
Two-level cache in `src/lib/cache/index.ts`:
- **L1**: In-memory `Map` (per-process, instant)
- **L2**: Redis (shared across processes, configurable TTL)
- Falls back gracefully if Redis is unavailable
- `cached<T>(key, fetcher, ttlSec)` — read-through cache
- `invalidate(prefix)` — evict by key prefix (called on mutations)

### Auth & RBAC
- **NextAuth v5** with credentials provider (email/password from env vars)
- **6 roles**: ADMIN, SUPERVISOR, FINANCEIRO, RH, OPERADOR, LEITURA
- **48 capabilities** mapped per role in `src/lib/auth/roles.ts`
- Role assignment via env vars: `ADMIN_EMAILS`, `SUPERVISOR_EMAILS`, etc.
- Middleware in `src/proxy.ts` enforces auth and applies security headers
- `guardCapability(cap)` is the preferred guard pattern for API routes

### Audit Logging
`src/lib/audit/audit.service.ts`:
```ts
import { logAudit, computeChanges } from '@/lib/audit/audit.service';
await logAudit({ entity: 'Paciente', entityId: id, action: 'UPDATE', changes: computeChanges(before, after) });
```
Persists to `AuditLog` table. Actions: CREATE, UPDATE, DELETE, ANONYMIZE.

### Soft Delete
Models with `deletedAt DateTime?`: Paciente, Cuidador, Avaliacao, Orcamento, Alocacao.
Utilities in `src/lib/db/soft-delete.ts`: `notDeleted`, `softDeleteData()`, `includeDeleted`.

### Logging
Single unified logger at `src/lib/observability/logger.ts`, re-exported from `src/lib/logger.ts`:
```ts
import logger from '@/lib/logger';
await logger.info('action_name', 'Human-readable message', { metadata });
await logger.error('action_name', 'Error message', error);
```
Logs persist to `SystemLog` table with request context (requestId, route, role, durationMs).

### WhatsApp Outbox
Reliable message delivery via database-backed queue + BullMQ:
1. `src/lib/whatsapp/outbox/service.ts` enqueues messages to `WhatsAppQueueItem` table
2. On enqueue, triggers BullMQ job (if Redis available) for immediate processing
3. `src/lib/jobs/whatsapp.worker.ts` processes via BullMQ (started in `instrumentation.ts`)
4. Falls back to DB polling (`processWhatsAppOutboxOnce`) when Redis is unavailable
5. Circuit breaker in `src/lib/whatsapp/circuit-breaker.ts`

### LGPD Compliance
- **Consent management**: `src/lib/lgpd/consent.service.ts` — grant, revoke, query consents
- **Data export**: `src/lib/lgpd/data-export.service.ts` — export all patient data as JSON
- **Anonymization**: Replaces PII with placeholders + audit log entry
- API endpoints: `/api/admin/lgpd/{export,anonymize,consent}/[pacienteId]`

### OpenAPI
OpenAPI 3.0 spec served at `GET /api/openapi`. Defined in `src/lib/openapi/spec.ts`.
Documents all admin endpoints, security schemes, request/response schemas.

### Security Headers
Applied via middleware (`src/proxy.ts`) and `next.config.ts` fallback:
- X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- Referrer-Policy, Permissions-Policy, Strict-Transport-Security
- Defined centrally in `src/lib/security/headers.ts`

## Database

### Provider
PostgreSQL. Connection via `DATABASE_URL` env var. Schema in `prisma/schema.prisma`.

### Key Models
| Domain | Models |
|--------|--------|
| Core | Cuidador, Paciente, Mensagem, Avaliacao, Orcamento, Alocacao, FormSubmission |
| WhatsApp | WhatsAppSession, WhatsAppFlowState, WhatsAppContact, WhatsAppMessage, WhatsAppQueueItem, WhatsAppLock, WhatsAppCooldown, + 8 more |
| Enterprise | Unidade, UnidadeConfiguracaoVersao, UnidadeDoencaRegra, + 7 more |
| Audit | AuditLog, ConfigAuditLog, OrcamentoAuditLog, SystemLog |
| LGPD | ConsentRecord |

### Migrations
Run `npm run db:push` for development (applies schema directly). Prisma migrations in `prisma/migrations/` for production tracking.

## Testing

- **Framework**: Vitest 4 with globals enabled
- **356 tests across 49 files**, all passing
- **Path alias**: `@/` maps to `./src/`
- **Coverage scope**: `src/lib/**/*.ts` and `src/app/api/**/*.ts`
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
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Session encryption key
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Default admin credentials
- `WA_BRIDGE_URL` — WhatsApp bridge endpoint
- `ENTERPRISE_PRICING_ENABLED` — Enable multi-unit pricing
- `REDIS_URL` — Redis connection (optional, graceful degradation)

## Conventions

### Code Style
- TypeScript strict mode, path alias `@/*` for `src/*`
- Brazilian Portuguese for domain terms (paciente, cuidador, avaliacao, orcamento, alocacao)
- English for technical terms (logger, repository, handler, service)
- Zod for runtime validation on API inputs
- Codebase uses semicolons

### File Naming
- `kebab-case.ts` for all files
- `.test.ts` suffix for tests, colocated with source
- `route.ts` for Next.js API routes
- `page.tsx` for Next.js pages

### API Routes
- Admin routes under `src/app/api/admin/[resource]/`
- Use `guardCapability()` + `withErrorBoundary()` + `withRateLimit()` wrapper stack
- Use `ok()`, `fail()`, `serverError()`, `paginated()` response helpers
- Use `parseBody(request, zodSchema)` for request validation

### Known Issues
- Build requires network access (Google Fonts). Use `next dev` for local development.
- `src/app/admin/ashboard/` exists (typo of "dashboard") alongside `src/app/admin/dashboard/`
- Phone validator auto-corrects 8-digit mobile numbers by prepending '9' (intentional behavior)
