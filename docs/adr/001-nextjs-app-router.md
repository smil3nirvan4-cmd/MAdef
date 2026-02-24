# ADR-001: Next.js 16 with App Router as full-stack framework

**Status:** Accepted
**Date:** 2024-12-01

## Context
The MAdef home care platform requires both a rich admin dashboard and a robust API layer for WhatsApp integrations, pricing engines, and patient management. Maintaining separate frontend and backend codebases would increase deployment complexity and slow down iteration speed for a small team. The platform also needs server-side rendering for admin pages and type-safe API routes that share models with the frontend.

## Decision
We adopted Next.js 16 (currently v16.1.4) with the App Router as our single full-stack framework. All API endpoints live under `src/app/api/` as route handlers exporting named HTTP method functions (GET, POST, PUT, PATCH, DELETE). The admin UI is colocated in `src/app/admin/`. Authentication uses `proxy.ts` instead of the traditional `middleware.ts` file, following Next.js 16's proxy pattern. React 19 is used on the frontend with React Server Components where applicable.

## Consequences
**Positive:**
- Single deployment artifact simplifies infrastructure and CI/CD
- Shared TypeScript types between API routes and frontend components eliminate contract drift
- App Router's file-based routing provides a clear, discoverable project structure with 60+ API routes organized by domain
- Server Components reduce client-side JavaScript bundle size

**Negative:**
- Tight coupling to the Next.js release cycle; major version upgrades (e.g., the proxy.ts change in v16) require codebase-wide adjustments
- Long-running background tasks (e.g., WhatsApp bridge polling, queue workers) do not fit naturally into the request/response model and require separate processes
- The `proxy.ts` pattern is specific to Next.js 16 and less documented than the traditional middleware approach, increasing onboarding friction
