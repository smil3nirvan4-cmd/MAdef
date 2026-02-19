# Enterprise Architecture

## 1. Arquitetura atual
- Edge layer: `src/proxy.ts` aplica RBAC, canonicalizacao de tabs e injeta `x-request-id`.
- Node layer: App Router handlers usam `withRequestContext` para popular `AsyncLocalStorage`.
- Domain layer: servicos em `src/lib/**` (outbox, sender, security, auth, observability).
- Persistence layer: Prisma em `src/lib/prisma.ts` com SQLite (`DATABASE_URL`).

Stack principal:
- Next.js 16 (App Router)
- TypeScript
- Prisma + SQLite
- NextAuth
- Vitest

Modulos:
- WhatsApp pipeline (queue/outbox + worker + circuit breaker)
- Admin UI (`/admin/*`)
- Auth + RBAC/Capabilities
- Observabilidade (requestId + SystemLog)

## 2. Seguranca

### RBAC (roles -> capabilities)
- Roles: `ADMIN`, `OPERADOR`, `LEITURA`, `FINANCEIRO`, `RH`, `SUPERVISOR`.
- Capabilities centralizadas em `src/lib/auth/roles.ts` com `hasCapability` e `getCapabilities`.

### Protecao de rotas
- `/admin/*`: protegido por NextAuth callback + check de role/capability.
- `/api/admin/*`: protegido por NextAuth callback + checks por metodo e guardas de capability.
- `/api/whatsapp/*`: allowlist explicita por rota/metodo com `default deny`.

### Webhook security
- HMAC SHA256 no webhook (`src/lib/whatsapp/webhook-security.ts`).
- Replay protection por timestamp (`WHATSAPP_WEBHOOK_MAX_AGE_SECONDS`, default 300s).
- Em `NODE_ENV=production`, secret e obrigatorio.

### Allowlist WhatsApp API
- Publico: `POST /api/whatsapp/webhook`.
- Operador/Admin: status/connect/disconnect/reset-auth/pair.
- Admin: `GET /api/whatsapp/data-dump`.

## 3. Contratos de API

Padrao em `src/lib/api/types.ts` e `src/lib/api/response.ts`:

- `ApiSuccess<T>`
  - `{ success: true, data, meta }`
- `ApiError`
  - `{ success: false, error: { code, message, details?, field? }, meta }`
- `ApiPaginatedSuccess<T>`
  - `{ success: true, data: T[], pagination, meta }`

`meta` sempre contem:
- `requestId`
- `durationMs`
- `timestamp` (ISO8601)

Query params padrao:
- `page`
- `pageSize`
- `sort=field:asc|desc`
- `filter=campo:valor,campo2:valor2`

Error codes em `src/lib/api/error-codes.ts`:
- Auth: `UNAUTHORIZED`, `FORBIDDEN`, `SESSION_EXPIRED`
- Recursos: `NOT_FOUND`, `CONFLICT`
- Validacao: `VALIDATION_ERROR`, `MISSING_FIELD`, `INVALID_FORMAT`
- WhatsApp: `WHATSAPP_NOT_CONNECTED`, `CIRCUIT_OPEN`, `QUEUE_RETRY_EXCEEDED`, `BRIDGE_UNAVAILABLE`, `INVALID_SIGNATURE`, `REPLAY_DETECTED`
- Sistema: `INTERNAL_ERROR`, `DATABASE_ERROR`

## 4. Pipeline WhatsApp

Estados do queue item:
- `pending -> sending -> sent`
- `pending|retrying -> dead`
- `pending|retrying|dead -> canceled`

Backoff (`src/lib/whatsapp/outbox/backoff.ts`):
- Attempt 1: +5s
- Attempt 2: +30s
- Attempt 3: +120s
- Attempt 4: +600s
- Attempt 5+: +3600s

Circuit breaker (`src/lib/whatsapp/circuit-breaker.ts`):
- Estados: `CLOSED`, `OPEN`, `HALF_OPEN`
- Threshold default: 5 falhas 5xx
- Open duration default: 60s
- Diagnostico: `GET /api/admin/whatsapp/circuit-status`

Dead letter:
- Item excede retries ou erro nao reprocessavel -> `dead`
- Acoes administrativas:
  - `POST /api/admin/whatsapp/queue/[id]/retry`
  - `POST /api/admin/whatsapp/queue/[id]/cancel`

## 5. Observabilidade
- `x-request-id` gerado no Edge proxy.
- `withRequestContext` injeta request context em handlers Node.
- `RequestContext` (`AsyncLocalStorage`) expoe requestId/duration.
- Logger estruturado (`src/lib/observability/logger.ts`) persiste em `SystemLog`.

Correlacao forense:
- `queueItemId`
- `internalMessageId`
- `idempotencyKey`
- `providerMessageId`
- `resolvedMessageId`
- `phone/jid`

Drilldown da fila usa correlacao para timeline + logs.

## 6. Runbook

### Circuit breaker OPEN
1. Consultar `GET /api/admin/whatsapp/circuit-status`.
2. Verificar saúde do bridge e respostas 5xx.
3. Aguardar janela de `WA_CIRCUIT_OPEN_MS` ou corrigir bridge.

### Muitos itens dead
1. Filtrar queue por `status=dead`.
2. Abrir drilldown e validar correlation IDs.
3. Corrigir causa raiz.
4. Reprocessar com endpoint `retry`.

### Webhook rejeitando
1. Verificar `WHATSAPP_WEBHOOK_SECRET`.
2. Validar assinatura HMAC.
3. Verificar sincronismo de clock (timestamp window).

### Build CI falhando
1. `npm run check:types`
2. `npm run lint`
3. `npm run test:ci`
4. `npm run build`
