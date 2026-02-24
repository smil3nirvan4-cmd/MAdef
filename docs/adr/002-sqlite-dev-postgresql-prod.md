# ADR-002: SQLite for development, PostgreSQL for production

**Status:** Accepted
**Date:** 2024-12-01

## Context
During early development, the team needed a zero-configuration database to enable rapid prototyping without requiring every developer to run a PostgreSQL instance. At the same time, production workloads demand a robust, concurrent-safe relational database that supports advanced indexing, JSON operations, and horizontal read scaling. The Prisma ORM used in the project supports multiple database providers through its datasource configuration, making a dual-provider strategy feasible.

## Decision
We use PostgreSQL as the canonical database provider declared in `prisma/schema.prisma` (`provider = "postgresql"`). For local development, the `DATABASE_URL` environment variable can point to a SQLite file (e.g., `file:./dev.db`). The `src/lib/db/database-target.ts` module auto-detects the provider from the URL prefix (`file:` for SQLite, `postgresql://` for PostgreSQL) and resolves connection details accordingly. This detection supports SQLite, PostgreSQL, MySQL, SQL Server, and MongoDB URL schemes, though only the first two are actively used.

## Consequences
**Positive:**
- Developers can start working immediately with `file:./dev.db` -- no Docker or PostgreSQL installation required
- The `resolveDatabaseTargetInfo()` utility provides runtime awareness of which database is active, enabling provider-specific logging and diagnostics
- Production uses PostgreSQL's full feature set including concurrent connections, row-level locking, and JSONB

**Negative:**
- SQLite lacks features used in production (e.g., `@@index` behavior differs, no true concurrent writes), so some bugs only surface in staging/production
- Prisma migrations generated for PostgreSQL may not apply cleanly to SQLite, requiring developers to use `db push` instead of `migrate dev` locally
- The schema uses PostgreSQL-compatible syntax (`@default(cuid())`, `DateTime` types) which constrains SQLite usage to Prisma's compatibility layer
