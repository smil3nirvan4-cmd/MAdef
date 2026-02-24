# MAdef — Home Care Platform

## Stack
Next.js 16, React 19, TypeScript 5.9, Prisma 6, SQLite, NextAuth 5 beta, Baileys (WhatsApp), Vitest 4, Pino, Zod 4

## Commands
- Build: `npm run build`
- TypeScript: `npx tsc --noEmit`
- Tests: `npx vitest run`
- Single test: `npx vitest run src/path/to/file.test.ts`
- Prisma: `npx prisma migrate dev --name <name>` | `npx prisma generate`
- Branch: `git branch --show-current`

## Architecture
- API routes: src/app/api/ (Next.js App Router)
- Each route exports GET/POST/PUT/PATCH/DELETE handlers
- Auth: src/proxy.ts (NOT middleware.ts — Next.js 16 uses proxy pattern)
- RBAC: guardCapability() from src/lib/auth/capability-guard.ts (takes Capability, not req)
- Error handling: withErrorBoundary() from src/lib/api/with-error-boundary.ts
- Rate limiting: checkRateLimit() from src/lib/api/rate-limit.ts (utility, not wrapper)
- Responses: ok(), fail(), serverError(), paginated() from src/lib/api/response.ts
- DB: Prisma singleton from src/lib/prisma.ts
- Repos: src/lib/repositories/ (factory pattern: mock-db.ts, prisma-db.ts, types.ts)
- WhatsApp: src/lib/whatsapp/ (Baileys bridge, outbox pattern, flow handlers)

## CRITICAL RULES
1. NEVER create src/middleware.ts — proxy.ts handles middleware. Creating both breaks build.
2. NEVER declare done without running: tsc (0 errors) + vitest (all pass)
3. NEVER create files that aren't imported/used by existing code in the SAME commit
4. NEVER use parallel Task agents editing the SAME file
5. NEVER install dependencies not explicitly listed in the task
6. When modifying a route, follow the EXISTING pattern in that file — read it first
7. When adding to schema.prisma, run `npx prisma generate` immediately after
8. Commit after each logical unit of work, not at the end of everything

## Test Pattern
```typescript
import { describe, it, expect, vi } from 'vitest'
```

## Route Pattern (reference — not all routes follow this yet)
```typescript
import { withErrorBoundary } from "@/lib/api/with-error-boundary"
import { guardCapability } from "@/lib/auth/capability-guard"
import { ok, fail, serverError } from "@/lib/api/response"

async function handleGet(req: NextRequest) {
  const authResult = await guardCapability("CAPABILITY_NAME")
  if (authResult instanceof NextResponse) return authResult
  // ... logic
  return ok(data)
}

export const GET = withErrorBoundary(handleGet)
```
