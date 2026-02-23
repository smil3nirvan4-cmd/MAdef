# CLAUDE.md — MAdef (Mãos Amigas) Developer Guide

> Comprehensive guide for AI assistants and developers working on the MAdef codebase.
> Last updated: 2026-02-23

## Project Overview

MAdef is a **home care management platform** (Mãos Amigas) built for managing caregivers (cuidadores), patients (pacientes), clinical evaluations (avaliacoes), pricing/budgets (orcamentos), and WhatsApp-based communication. It serves the Brazilian home care market with features for patient triage, caregiver allocation, enterprise pricing, and automated WhatsApp workflows.

**Domain language is Portuguese** — all models, fields, UI labels, and business logic use Portuguese naming.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.4 |
| UI | React + Tailwind CSS v4 | 19.2.3 |
| Language | TypeScript (strict mode) | 5.9.3 |
| Database | Prisma + SQLite | Prisma 6.x |
| Auth | NextAuth v5 beta (Credentials) | 5.0.0-beta.30 |
| WhatsApp | Baileys (unofficial API) | 7.x |
| Testing | Vitest + Testing Library | Vitest 4.x |
| State | TanStack Query + TanStack Table | 5.x / 8.x |
| Validation | Zod | 4.x |
| Logging | Custom structured logger → SystemLog table | — |
| PDF | PDFKit | 0.17.x |
| Icons | Lucide React | 0.563.x |

## Quick Start

```bash
# Prerequisites: Node.js >= 20
cp .env.example .env        # Edit with real values
npm install                  # Also runs prisma generate (postinstall)
npx prisma db push           # Create/sync SQLite database
npm run dev                  # Starts Next.js + WhatsApp bridge
```

### Key Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + WhatsApp bridge together |
| `npm run dev:web` | Start Next.js only |
| `npm run build` | Production build |
| `npm run whatsapp` | WhatsApp bridge standalone |
| `npm test` | Run tests (vitest watch) |
| `npm run test:ci` | Run tests once with verbose output |
| `npm run test:coverage` | Tests with coverage report |
| `npm run check` | tsc + lint + test:ci |
| `npm run check:types` | TypeScript check only |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database |
| `npm run diagnose:whatsapp` | WhatsApp connection diagnostics |

## Project Structure

```
MAdef/
├── prisma/
│   ├── schema.prisma          # Database schema (37 models)
│   └── seed.ts                # Database seeder
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes (67 endpoints)
│   │   │   ├── admin/         # Protected admin API (53 endpoints)
│   │   │   ├── auth/          # NextAuth handlers
│   │   │   ├── health/        # Health check
│   │   │   ├── whatsapp/      # WhatsApp API (10 endpoints)
│   │   │   ├── alocacao/      # Allocation API
│   │   │   ├── avaliacoes/    # Evaluations API
│   │   │   ├── orcamento/     # Pricing API
│   │   │   ├── pacientes/     # Patient search API
│   │   │   └── propostas/     # Proposals API
│   │   ├── admin/             # Admin pages (32 pages)
│   │   ├── login/             # Login page
│   │   └── page.tsx           # Landing page
│   ├── auth.ts                # NextAuth configuration
│   ├── auth.config.ts         # Auth middleware config
│   ├── components/            # Reusable UI components (19 files)
│   │   ├── ui/                # Base UI: Button, Card, Modal, Input, etc.
│   │   ├── data-display/      # DataTable, StatCard, TanStackDataTable
│   │   ├── layout/            # PageHeader
│   │   └── admin/             # Admin-specific components
│   ├── lib/                   # Core business logic
│   │   ├── api/               # API helpers: response, rate-limit, error-codes
│   │   ├── auth/              # RBAC: roles, capabilities, guards
│   │   ├── allocation/        # Caregiver allocation algorithms
│   │   ├── contracts/         # Contract template rendering
│   │   ├── documents/         # PDF generation, proposals, contracts
│   │   ├── enterprise/        # Enterprise config, feature flags
│   │   ├── evaluation/        # Clinical scales (ABEMID, Katz, Lawton)
│   │   ├── notifications/     # Emergency notifications
│   │   ├── observability/     # Logger, request context
│   │   ├── pricing/           # Pricing calculator, enterprise engine
│   │   ├── repositories/      # Data access (Prisma + mock)
│   │   ├── scheduling/        # Recurrence engine, presets
│   │   ├── services/          # Signature service
│   │   ├── state/             # State management (memory + Prisma)
│   │   ├── whatsapp/          # WhatsApp client, handlers, bot, queue
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── db.ts              # Re-export of prisma
│   │   ├── logger.ts          # Re-export of observability/logger
│   │   └── utils.ts           # General utilities
│   └── types/                 # TypeScript type declarations
├── whatsapp-bridge/           # Standalone WhatsApp bridge (Node.js)
│   ├── server.js              # Express + Baileys bridge server
│   └── package.json           # Bridge dependencies
├── scripts/                   # Dev scripts
├── docs/                      # Documentation and audits
└── public/                    # Static assets
```

## Database Schema

### Core Business Models

| Model | Purpose | Key Relations |
|-------|---------|--------------|
| **Cuidador** | Caregiver profile | → Alocacao[], Mensagem[] |
| **Paciente** | Patient profile | → Alocacao[], Avaliacao[], Mensagem[], Orcamento[] |
| **Avaliacao** | Clinical evaluation (ABEMID/Katz/Lawton scores) | → Paciente, Orcamento[], OrcamentoSimulacao[] |
| **Orcamento** | Budget/pricing quote | → Paciente, Unidade?, ConfigVersion?, Avaliacao? |
| **Alocacao** | Caregiver-patient assignment | → Cuidador, Paciente? |
| **Mensagem** | Message log | → Cuidador?, Paciente? |
| **FormSubmission** | External form data | (standalone) |

### WhatsApp Models (14 models)

WhatsAppSession, WhatsAppFlowState, WhatsAppContact, WhatsAppMessage, WhatsAppTemplate, WhatsAppQuickReply, WhatsAppAutoReply, WhatsAppScheduled, WhatsAppQueueItem, WhatsAppLabel, WhatsAppBlacklist, WhatsAppWebhook, WhatsAppFlowDefinition, WhatsAppSetting, WhatsAppAnalytics, WhatsAppLock, WhatsAppCooldown

### Enterprise Pricing Models (9 models)

Unidade (business unit), UnidadeConfiguracaoVersao (pricing config versions), UnidadeDoencaRegra (disease rules), UnidadeRegraHora (hourly rules), UnidadeTaxaPagamento (payment taxes), UnidadeMinicusto (mini-costs), UnidadePercentualComissao (commissions), UnidadeDescontoPreset (discount presets), UnidadeContratoTemplate (contract templates)

### System Models

OrcamentoSimulacao, ConfigAuditLog, OrcamentoAuditLog, SystemLog

## Authentication & Authorization

### Auth System

- **NextAuth v5** with Credentials provider
- **Single admin account** via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars
- **JWT-based sessions** (not database sessions)
- Password comparison uses `crypto.timingSafeEqual` (but NO hashing)
- Roles resolved from env var email lists at runtime

### RBAC System

6 roles with 18+ capabilities:

| Role | Description | Key Capabilities |
|------|-------------|-----------------|
| ADMIN | Full access | All capabilities |
| SUPERVISOR | Team lead | Manage patients, evaluations, allocations, HR |
| FINANCEIRO | Finance | Manage budgets, send proposals/contracts |
| RH | Human Resources | Manage/view HR |
| OPERADOR | Operator | View/manage patients, evaluations, WhatsApp |
| LEITURA | Read-only | View-only access |

Roles are assigned by matching user email against env vars:
- `ADMIN_EMAILS`, `SUPERVISOR_EMAILS`, `FINANCEIRO_EMAILS`, `RH_EMAILS`, `OPERADOR_EMAILS`, `LEITURA_EMAILS`

### Authorization Flow

1. `auth.config.ts` → NextAuth `authorized` callback checks page/API access
2. `src/lib/auth/roles.ts` → `resolveUserRole()`, `hasCapability()`, `canAccessAdminApi()`
3. `src/lib/auth/capability-guard.ts` → `guardCapability()` for route-level checks
4. `src/lib/auth/method-guard.ts` → Write method blocking for read-only roles

## API Conventions

### Response Format

All API responses follow a consistent structure:

```typescript
// Success
{ success: true, data: T, meta: { requestId, durationMs, timestamp } }

// Paginated
{ success: true, data: T[], pagination: { page, pageSize, total, totalPages, hasNext, hasPrev }, meta }

// Error
{ success: false, error: { code: string, message: string, details?, field? }, meta }
```

Helpers in `src/lib/api/response.ts`: `ok()`, `paginated()`, `fail()`, `serverError()`

### Error Codes

Defined in `src/lib/api/error-codes.ts` as `E.VALIDATION_ERROR`, `E.NOT_FOUND`, `E.UNAUTHORIZED`, `E.FORBIDDEN`, `E.INTERNAL_ERROR`, etc.

### Error Boundary

Wrap route handlers with `withErrorBoundary()` from `src/lib/api/with-error-boundary.ts` for automatic error catching and structured error responses.

### Rate Limiting

In-memory rate limiter in `src/lib/api/rate-limit.ts`:
```typescript
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
const ip = getClientIp(request);
const result = checkRateLimit(`endpoint:${ip}`, 100, 60_000);
if (!result.allowed) return fail(E.RATE_LIMITED, '...', { status: 429 });
```

### Request Context

`src/lib/observability/request-context.ts` provides `RequestContext` with `runWithContext()` for automatic requestId, route, userId, and timing tracking through async operations.

### Logging

```typescript
import logger from '@/lib/logger';
await logger.info('action_name', 'Human readable message', { key: 'value' });
await logger.error('action_name', 'Error message', error);
await logger.whatsapp('wa_event', 'WhatsApp specific log', { phone });
```

Logs are persisted to the `SystemLog` table with automatic request context enrichment.

## WhatsApp Integration

### Architecture

```
[WhatsApp Cloud] ←→ [whatsapp-bridge/server.js (Baileys)] ←→ [Next.js API routes]
                          ↕
                    [auth_info/]  ← session persistence
```

- **Bridge**: Standalone Node.js server (`whatsapp-bridge/server.js`) using Baileys
- **Client**: `src/lib/whatsapp/client.ts` communicates with bridge via HTTP
- **Handlers**: `src/lib/whatsapp/handlers/` — flow-specific message handlers
- **Bot**: `src/lib/whatsapp/conversation-bot.ts` — conversation state machine
- **Queue**: `src/lib/whatsapp/queue.ts` — message queue with retries
- **Outbox**: `src/lib/whatsapp/outbox/` — outbox pattern for reliable delivery
- **Security**: HMAC webhook verification in `src/lib/whatsapp/webhook-security.ts`
- **Circuit Breaker**: `src/lib/whatsapp/circuit-breaker.ts` — prevents cascading failures

### WhatsApp Flows

Patient and caregiver triage flows managed via `WhatsAppFlowState` and `WhatsAppFlowDefinition` models. Key flows:
- Caregiver registration (`cadastro-cuidador`)
- Patient intake
- Proposal acceptance (`aceite-orcamento`, `confirmacao-proposta`)
- Contract signing (`assinatura-contrato`)
- Shift check-in (`checkin`)
- Slot selection (`escolha-slot`)
- Shift offers (`oferta-plantao`)

## Coding Conventions

### File Organization

- **API routes**: `src/app/api/[domain]/route.ts` — export HTTP method handlers (GET, POST, PUT, DELETE)
- **Pages**: `src/app/[section]/page.tsx` — use `"use client"` directive for interactive pages
- **Components**: PascalCase filenames, e.g., `Button.tsx`, `DataTable.tsx`
- **Lib modules**: camelCase filenames, organized by domain

### TypeScript

- `strict: true` enabled in tsconfig
- Path alias `@/*` maps to `./src/*`
- Use Zod for runtime validation, infer types with `z.infer<typeof schema>`
- Prefer explicit types over `any` — the project has 47 `as any` occurrences to reduce

### React Patterns

- App Router with Server Components by default
- `"use client"` only where needed (interactivity, hooks)
- TanStack Query for server state management
- TanStack Table for data grids
- Tailwind CSS v4 for styling (utility-first)
- Component library in `src/components/ui/` (Button, Card, Modal, Input, Badge, etc.)

### Database Access

```typescript
import { prisma } from '@/lib/prisma';

// Always use select/include to avoid over-fetching
const patients = await prisma.paciente.findMany({
  select: { id: true, nome: true, telefone: true },
  orderBy: { createdAt: 'desc' },
});
```

### Testing

- Vitest for unit and integration tests
- Test files: `*.test.ts` co-located with source files
- Existing tests cover: rate-limit, capability-guard, roles, phone-validator, pricing calculator, template-engine, circuit-breaker, webhook-security, and more
- Run: `npm test` (watch) or `npm run test:ci` (single run)

## Known Issues & Technical Debt

### Critical (P0)

1. **~6,500 TypeScript errors** — 5,388 are TS7026 (missing JSX IntrinsicElements, React 19 type config issue), 522 implicit `any`, 316 missing modules
2. **Secrets in git history** — WhatsApp session data, PII (CPF, names, emails), encryption keys were committed. Removed from tracking but still in git history. Needs `git filter-branch` or BFG cleanup.
3. **Plaintext password auth** — Admin password stored as env var, compared without hashing

### High (P1)

4. **SQLite** — Not suitable for production concurrent access. Migrate to PostgreSQL.
5. **No security headers** — CSP, HSTS, X-Frame-Options, etc. not configured
6. **No CSRF protection** on mutation endpoints
7. **Unofficial WhatsApp API** — Baileys violates WhatsApp TOS; risk of account ban
8. **No multi-tenancy isolation** — No organizationId filtering in queries

### Medium (P2)

9. **In-memory rate limiting** — Doesn't survive restarts or scale across instances
10. **JSON strings in database** — Multiple fields store JSON as String instead of proper relations
11. **No soft delete** on business models
12. **47 `as any` type assertions** — Reduce for type safety
13. **No User model** — Auth entirely env-var based

### Low (P3)

14. **No Docker configuration**
15. **No CI/CD pipeline**
16. **Missing API documentation** (OpenAPI/Swagger)
17. **Console.log usage** in some files instead of structured logger

## Environment Variables

See `.env.example` for the complete list. Critical variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `NEXTAUTH_SECRET` | Yes | NextAuth encryption secret |
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password |
| `NEXT_PUBLIC_URL` | Yes | Public-facing URL |
| `WA_BRIDGE_URL` | No | WhatsApp bridge URL (default: http://127.0.0.1:3001) |
| `WA_WEBHOOK_SECRET` | No | HMAC secret for webhook verification |

## Security Notes

- **Never commit** `.env`, `auth_info/`, `.wa-session.json`, `.wa-state.json`
- These files are in `.gitignore` — verify they stay untracked
- WhatsApp session tokens must be rotated if compromised
- Admin credentials should use strong passwords in production
- All admin routes are protected by NextAuth middleware in `auth.config.ts`
- WhatsApp webhook endpoint (`POST /api/whatsapp/webhook`) is public but HMAC-verified

## Development Workflow

1. Create a feature branch from `main`
2. Make changes following the conventions above
3. Run `npm run check` (types + lint + tests) before committing
4. Ensure `npm run build` succeeds
5. Submit PR for review

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/auth.ts` | NextAuth setup, credentials provider, JWT/session callbacks |
| `src/auth.config.ts` | Route protection middleware |
| `src/lib/auth/roles.ts` | RBAC: roles, capabilities, route access control |
| `src/lib/api/response.ts` | Standardized API response helpers |
| `src/lib/api/rate-limit.ts` | Rate limiting implementation |
| `src/lib/api/with-error-boundary.ts` | Error boundary for API routes |
| `src/lib/observability/logger.ts` | Structured logging to SystemLog |
| `src/lib/observability/request-context.ts` | Request context tracking |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/pricing/calculator.ts` | Core pricing calculation engine |
| `src/lib/pricing/enterprise-engine.ts` | Enterprise multi-unit pricing |
| `src/lib/whatsapp/client.ts` | WhatsApp bridge HTTP client |
| `src/lib/whatsapp/conversation-bot.ts` | WhatsApp conversation state machine |
| `src/lib/whatsapp/circuit-breaker.ts` | WhatsApp circuit breaker |
| `prisma/schema.prisma` | Database schema (37 models) |
| `whatsapp-bridge/server.js` | Standalone WhatsApp bridge server |
