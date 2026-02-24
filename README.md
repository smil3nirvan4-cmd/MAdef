# MAdef -- Home Care Management Platform

MAdef (Maos Amigas) is a home care management platform for coordinating patients, caregivers, schedules, budgets, and contracts. It integrates WhatsApp for real-time communication with caregivers and families, supports role-based access for back-office teams, and provides operational dashboards for monitoring system health.

## Quick Start (Development)

### Prerequisites

- Node.js >= 20.0.0
- npm (ships with Node)
- SQLite (bundled, no install needed)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url> MAdef && cd MAdef

# 2. Install dependencies
npm install

# 3. Copy environment file and configure
cp .env.example .env
# Edit .env -- at minimum set NEXTAUTH_SECRET:
#   openssl rand -base64 32

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. (Optional) Seed test data
npm run db:seed

# 6. Start the development server
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000). The WhatsApp bridge starts alongside via `npm run dev` (uses `scripts/dev-with-whatsapp.cjs`). To run only the web server: `npm run dev:web`.

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server + WhatsApp bridge |
| `npm run dev:web` | Start dev server only |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx tsc --noEmit` | Type-check without emitting |
| `npx vitest run` | Run all tests |
| `npx vitest run src/path/to/file.test.ts` | Run a single test file |
| `npm run check` | Type-check + lint + test |
| `npm run check:full` | check + build |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run routes:print` | Print all registered routes |
| `npm run diagnose:whatsapp` | Diagnose WhatsApp bridge issues |

## Deploy Production

### Docker Compose (recommended)

```bash
# 1. Clone and enter the project
git clone <repo-url> MAdef && cd MAdef

# 2. Create .env with production values (see Environment Variables below)
cp .env.example .env
# Edit .env with production values

# 3. Start all services
docker compose up -d

# 4. Run database migrations against PostgreSQL
docker compose exec app npx prisma migrate deploy

# 5. Verify health
curl http://localhost:3000/api/health
```

This starts four containers:

| Service | Description | Port |
|---------|-------------|------|
| `app` | Next.js application | 3000 |
| `postgres` | PostgreSQL 16 database | 5432 |
| `redis` | Redis 7 (L2 cache) | 6379 |
| `backup` | Automated PostgreSQL backups via cron | -- |

### Environment Variables

All variables from `.env.example`, with production guidance:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Set to `production` |
| `DATABASE_URL` | Yes | `file:./dev.db` | PostgreSQL connection string in production: `postgresql://user:pass@host:5432/madef` |
| `NEXTAUTH_SECRET` | Yes | -- | Generate with `openssl rand -base64 32`. Must be stable across deploys. |
| `NEXT_PUBLIC_URL` | Yes | `http://localhost:3000` | Public-facing URL of the application |
| `APP_URL` | Yes | `http://localhost:3000` | Internal application URL |
| `ADMIN_EMAIL` | Yes | `admin@example.com` | Primary admin email for login |
| `ADMIN_PASSWORD` | Yes | `change-me-in-production` | Admin password. Change in production. |
| `ADMIN_EMAILS` | No | `admin@example.com` | Comma-separated admin emails |
| `SUPERVISOR_EMAILS` | No | -- | Comma-separated supervisor emails |
| `FINANCEIRO_EMAILS` | No | -- | Comma-separated finance role emails |
| `RH_EMAILS` | No | -- | Comma-separated HR role emails |
| `OPERADOR_EMAILS` | No | -- | Comma-separated operator emails |
| `LEITURA_EMAILS` | No | -- | Comma-separated read-only emails |
| `WA_BRIDGE_HOST` | No | `127.0.0.1` | WhatsApp bridge host |
| `WA_BRIDGE_PORT` | No | `3001` | WhatsApp bridge port |
| `WA_BRIDGE_URL` | No | `http://127.0.0.1:3001` | WhatsApp bridge full URL |
| `WA_BRIDGE_PORT_FILE` | No | `.wa-bridge-port` | File storing the bridge port |
| `WA_SESSION_FILE` | No | `.wa-session.json` | WhatsApp session persistence file |
| `WA_STANDALONE` | No | `false` | Run WhatsApp bridge as standalone process |
| `WA_WEBHOOK_SECRET` | No | -- | HMAC secret for webhook signature verification |
| `WHATSAPP_WEBHOOK_SECRET` | No | -- | Alternative webhook secret key |
| `WHATSAPP_ALLOWED_ORIGINS` | No | -- | Comma-separated allowed origins for webhook |
| `WHATSAPP_WEBHOOK_MAX_AGE_SECONDS` | No | `300` | Max age for webhook timestamp validation |
| `WA_CIRCUIT_FAILURE_THRESHOLD` | No | `5` | Failures before circuit breaker opens |
| `WA_CIRCUIT_OPEN_MS` | No | `30000` | Duration circuit breaker stays open (ms) |
| `REDIS_URL` | No | -- | Redis connection URL (e.g., `redis://redis:6379`). Optional L2 cache. |
| `SLACK_WEBHOOK_URL` | No | -- | Slack incoming webhook for alerts |
| `TELEGRAM_BOT_TOKEN` | No | -- | Telegram bot token for alerts |
| `TELEGRAM_CHAT_ID` | No | -- | Telegram chat ID for alerts |
| `EMERGENCY_NOTIFICATION_EMAIL` | No | -- | Email for critical alerts |
| `ENTERPRISE_PRICING_ENABLED` | No | `false` | Enable enterprise pricing module |
| `ENTERPRISE_PRICING_ENABLED_UNITS` | No | -- | Units with enterprise pricing enabled |
| `ENTERPRISE_PRICING_DISABLED_UNITS` | No | -- | Units with enterprise pricing disabled |
| `USE_MOCK_DB` | No | `false` | Use in-memory mock database (testing) |
| `USE_MEMORY_STATE` | No | `false` | Use in-memory state (testing) |
| `SIGNATURE_PROVIDER` | No | `mock` | Signature provider (`mock` or production provider) |

### Bare Metal Deployment

```bash
# 1. Install Node.js 20+ and PostgreSQL 16+
# 2. Clone and install
git clone <repo-url> MAdef && cd MAdef
npm ci --omit=dev

# 3. Configure environment
cp .env.example .env
# Set DATABASE_URL to PostgreSQL, NEXTAUTH_SECRET, NODE_ENV=production, etc.

# 4. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# 5. Build the application
npm run build

# 6. Start with a process manager
npm run start
# Or with PM2:
#   pm2 start npm --name madef -- start
```

## Architecture

```
                          +------------------+
                          |     Browser      |
                          +--------+---------+
                                   |
                                   v
                          +------------------+
                          |  Next.js 16 App  |
                          |  (App Router)    |
                          +--+----+----+----++
                             |    |    |    |
                    +--------+    |    |    +---------+
                    |             |    |              |
                    v             v    v              v
            +-------+---+  +-----+----+--+  +--------+--------+
            | PostgreSQL |  |   Redis     |  |   WhatsApp      |
            | (Prisma 6) |  |   (L2 Cache)|  |   (Baileys)     |
            | SQLite dev |  |   Optional  |  |   Bridge :3001  |
            +------------+  +-----+-------+  +---------+-------+
                                  |                    |
                                  v                    v
                           +------+------+    +--------+-------+
                           |   BullMQ    |    | Outbox Pattern |
                           | (Job Queue) |    | (Msg Delivery) |
                           +-------------+    +----------------+
```

### Component Descriptions

- **Next.js 16 (App Router)**: Server-side rendered React 19 application. API routes under `src/app/api/` export method handlers (GET, POST, PUT, PATCH, DELETE). Auth handled by `src/proxy.ts` (NOT middleware.ts).

- **PostgreSQL / SQLite**: Prisma 6 ORM. SQLite for development (`file:./dev.db`), PostgreSQL 16 for production. Schema in `prisma/schema.prisma`. Supports soft delete and audit trail.

- **Redis**: Optional L2 cache layer. Used for rate limiting, session caching, and BullMQ job queue backing. System works without Redis (graceful degradation).

- **BullMQ**: Async job processing queue backed by Redis. Handles background tasks like notification delivery and scheduled operations.

- **WhatsApp (Baileys)**: WhatsApp Web bridge running on port 3001. Uses the outbox pattern for reliable message delivery with exponential backoff. Circuit breaker protects against cascade failures. Conversational bot handles multi-step workflows (onboarding, scheduling, contract signing).

- **Repository Pattern**: Database access through `src/lib/repositories/` using a factory pattern. Supports swapping between Prisma (`prisma-db.ts`) and mock (`mock-db.ts`) implementations for testing.

## API

### Authentication

All API routes are protected by NextAuth 5 session cookies. Authentication is enforced via `src/proxy.ts`. Public routes (health check, WhatsApp webhook) are explicitly allowlisted.

### Authorization (RBAC)

Role-Based Access Control with deny-by-default. Six roles with granular capabilities:

| Role | Description | Key Capabilities |
|------|-------------|-----------------|
| `ADMIN` | Full access | All capabilities |
| `SUPERVISOR` | Team lead | Manage patients, assessments, allocations, HR, view logs |
| `OPERADOR` | Day-to-day operator | Manage patients, assessments, WhatsApp, queue operations |
| `FINANCEIRO` | Finance team | Manage budgets, send proposals/contracts |
| `RH` | Human resources | Manage HR, view patients |
| `LEITURA` | Read-only auditor | View-only access to patients, assessments, budgets, logs, analytics |

Roles are assigned via environment variables (comma-separated emails). Users not matching any role list default to `LEITURA`.

Route handlers use `guardCapability()` from `src/lib/auth/capability-guard.ts`:

```typescript
const authResult = await guardCapability("MANAGE_PACIENTES")
if (authResult instanceof NextResponse) return authResult
// authResult.role and authResult.userId available
```

### OpenAPI

API documentation available at `/api/docs` (when enabled).

## Operations

### Health Check

```bash
GET /api/health
```

Returns system health with subsystem checks:
- **database**: Connection and latency
- **redis**: Connection and latency (or `not_configured`)
- **whatsapp**: Bridge status, connection state, message timestamps, error counts
- **memory**: Heap usage percentage
- **fileSystem**: Required files presence

Response status: `200` (healthy/degraded), `503` (unhealthy).

```json
{
  "status": "healthy",
  "timestamp": "2026-02-24T10:00:00.000Z",
  "uptime": 86400,
  "version": "0.1.0",
  "dbSchemaOk": true,
  "databaseProvider": "postgresql",
  "checks": {
    "database": { "status": "ok", "latency": 2 },
    "redis": { "status": "ok", "latencyMs": 1 },
    "whatsapp": { "status": "ok", "connected": true },
    "memory": { "used": 128, "total": 256, "percentage": 50 }
  }
}
```

### Metrics

```bash
GET /api/metrics
```

Returns application metrics snapshot (request counts, latencies, error rates). No authentication required. Response cached with `no-store`.

### System Status (Admin)

```bash
GET /api/admin/system/status
```

Detailed system status for administrators. Requires `ADMIN` role.

### Backups

Automated PostgreSQL backups run via the `backup` container in Docker Compose. The script (`scripts/backup.sh`) performs:

- `pg_dump` compressed with gzip to `/backups/madef_YYYYMMDD_HHMMSS.sql.gz`
- Automatic cleanup of backups older than 7 days
- Backups stored in the `./backups/` directory on the host

Manual backup:

```bash
docker compose exec backup /backup.sh
```

### Logs

Structured JSON logging via Pino. In development, use `pino-pretty` for human-readable output. In production, pipe JSON logs to your log aggregation system (ELK, Datadog, etc.).

## Security

- **RBAC deny-by-default**: 6 roles with 21 granular capabilities. Unrecognized users get read-only access.
- **Rate limiting**: Per-endpoint rate limiting via `checkRateLimit()` in `src/lib/api/rate-limit.ts`.
- **Input validation**: Zod 4 schemas validate all request bodies and query parameters.
- **Error boundaries**: `withErrorBoundary()` wraps route handlers to prevent stack trace leaks.
- **Security headers**: OWASP-recommended headers configured in Next.js.
- **Soft delete**: Records are marked as deleted rather than physically removed, preserving audit trail.
- **Audit trail**: Mutations are logged with user, timestamp, and action.
- **LGPD compliance**: Data protection capabilities (`MANAGE_LGPD`) for handling personal data requests under Brazilian data protection law.
- **WhatsApp webhook security**: HMAC signature verification, timestamp validation, and origin allowlisting.
- **Circuit breaker**: WhatsApp bridge uses circuit breaker pattern to prevent cascade failures (configurable threshold and open duration).

## Troubleshooting

### Database connection fails

**Symptom**: `PrismaClientInitializationError` or health check shows `database: error`.

**Solution**:
```bash
# Check DATABASE_URL in .env
# For development (SQLite):
npx prisma migrate dev
# For production (PostgreSQL):
npx prisma migrate deploy
# Verify connection:
npx prisma db pull
```

### WhatsApp bridge not connecting

**Symptom**: Health check shows `whatsapp: disconnected` or `not_configured`.

**Solution**:
```bash
# Run diagnostics
npm run diagnose:whatsapp

# Check bridge is running
curl http://localhost:3001/status

# Restart bridge
# In dev: restart npm run dev
# Standalone: node whatsapp-bridge/server.js
```

### WhatsApp circuit breaker open

**Symptom**: Messages not being sent, circuit breaker reported as open.

**Solution**: The circuit breaker opens after 5 consecutive failures (configurable via `WA_CIRCUIT_FAILURE_THRESHOLD`). It auto-recovers after 30 seconds (`WA_CIRCUIT_OPEN_MS`). Check WhatsApp bridge connectivity first, then verify the circuit breaker state via `/api/health`.

### Build fails with middleware error

**Symptom**: Build error related to middleware.

**Solution**: Ensure `src/middleware.ts` does NOT exist. MAdef uses `src/proxy.ts` for the proxy/middleware pattern (Next.js 16). Having both files breaks the build.

### Redis connection refused

**Symptom**: `ECONNREFUSED` errors for Redis, or health check shows `redis: error`.

**Solution**: Redis is optional. If not using Redis, ensure `REDIS_URL` is not set. If using Redis:
```bash
# Docker:
docker compose up redis -d
# Verify:
redis-cli -u $REDIS_URL ping
```

### Prisma schema out of sync

**Symptom**: Runtime errors about missing columns or tables.

**Solution**:
```bash
npx prisma generate
npx prisma migrate dev  # development
npx prisma migrate deploy  # production
```

### Tests failing

**Symptom**: `npx vitest run` reports failures.

**Solution**:
```bash
# Run with verbose output
npx vitest run --reporter=verbose

# Run a single failing test
npx vitest run src/path/to/file.test.ts

# Check types first
npx tsc --noEmit
```

## Architecture Decisions

Architecture Decision Records are maintained in `docs/adr/`. Each ADR documents the context, decision, and consequences of significant architectural choices.
