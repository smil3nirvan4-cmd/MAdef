# ADR-006: Soft delete with Prisma extension

**Status:** Accepted
**Date:** 2024-12-01

## Context
The home care domain handles sensitive records -- patient data, caregiver profiles, clinical assessments, budget proposals, and care allocations. Regulatory requirements (including LGPD compliance) and operational needs demand that deleted records remain recoverable for audit trails and dispute resolution. Hard deletes would permanently destroy data that may be needed for compliance reviews or to restore accidentally removed records. At the same time, application code should not need to manually add `deletedAt: null` filters to every query.

## Decision
We implemented soft delete as a Prisma client extension in `src/lib/db/soft-delete.extension.ts`. The extension intercepts `findMany`, `findFirst`, `findUnique`, `delete`, and `deleteMany` operations on a defined set of models (`Cuidador`, `Paciente`, `Avaliacao`, `Orcamento`, `Alocacao`). Read operations automatically inject a `deletedAt: null` filter. Delete operations are transparently rewritten as updates that set `deletedAt` to the current timestamp. The `findUnique` case is handled with a post-hoc null check since Prisma's `findUnique` does not support arbitrary where clause extensions.

## Consequences
**Positive:**
- Application code calls `prisma.paciente.delete()` normally and gets soft-delete behavior without any special handling
- All read queries automatically exclude soft-deleted records, preventing accidental display of "deleted" data
- Records can be restored by setting `deletedAt` back to `null`, supporting operational recovery and LGPD data subject requests
- The extension is model-scoped via the `SOFT_DELETE_MODELS` array, so models without a `deletedAt` column (e.g., `WhatsAppMessage`) behave normally

**Negative:**
- The `findUnique` workaround fetches the record and then checks `deletedAt` post-hoc, meaning a soft-deleted record is still loaded from the database before being filtered out
- No built-in way to query soft-deleted records (e.g., for an admin "trash" view) without bypassing the extension
- Database indexes do not automatically account for the `deletedAt` filter, potentially impacting query performance on large tables without a partial index
