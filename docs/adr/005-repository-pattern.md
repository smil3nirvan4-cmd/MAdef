# ADR-005: Repository pattern with factory (mock vs Prisma)

**Status:** Accepted
**Date:** 2024-12-01

## Context
The application needs to interact with database records for caregivers, patients, assessments, budgets, allocations, messages, and WhatsApp sessions. During early development, the Prisma schema was evolving rapidly and running a real database for every test or prototype iteration was slow. Additionally, the WhatsApp flow handlers needed to be testable without hitting a real database. A data access abstraction was needed that could swap implementations without changing business logic.

## Decision
We implemented a repository pattern using TypeScript interfaces and a factory. The `src/lib/repositories/types.ts` file defines interfaces for each domain (`ICuidadorRepository`, `IPacienteRepository`, `IAvaliacaoRepository`, `IOrcamentoRepository`, `IAlocacaoRepository`, `IMessagingRepository`, `IFormSubmissionRepository`, `IWhatsAppSessionRepository`) unified under an `IDatabaseFactory` aggregate. Two implementations exist: `prisma-db.ts` delegates to the Prisma client for production use, while `mock-db.ts` uses in-memory arrays with a `globalThis`-based store that survives HMR reloads during development. The factory selection is driven by environment configuration.

## Consequences
**Positive:**
- WhatsApp flow handlers and business logic can be tested with `mock-db.ts` without any database setup, enabling fast unit tests
- The `IDatabaseFactory` interface serves as living documentation of the data access contract for each domain
- The mock implementation's `globalThis` persistence across HMR reloads means developers see consistent data during `npm run dev` without reseeding

**Negative:**
- The mock and Prisma implementations can drift: the mock may return slightly different shapes or miss edge cases (e.g., unique constraint violations, cascade deletes)
- Many newer API routes bypass the repository layer and call `prisma` directly (as seen in the admin routes), reducing the pattern's coverage
- Maintaining two implementations for every new repository method doubles the surface area of data access code
