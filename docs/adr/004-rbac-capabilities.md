# ADR-004: RBAC with capability-based access control

**Status:** Accepted
**Date:** 2024-12-01

## Context
The admin panel serves multiple user profiles -- administrators, operators handling day-to-day patient intake, financial staff managing proposals and contracts, HR reviewing caregiver candidates, and supervisors overseeing operations. A simple admin/non-admin binary was insufficient because operators needed write access to patient records but not to system settings, while financial users needed proposal management but not caregiver data. The access control system needed to be granular enough for these distinctions but simple enough to maintain without a full permissions database.

## Decision
We implemented a role-based access control (RBAC) system with a capability abstraction layer. Six roles are defined (`ADMIN`, `OPERADOR`, `LEITURA`, `FINANCEIRO`, `RH`, `SUPERVISOR`), each mapped to a subset of 20 fine-grained capabilities (e.g., `MANAGE_PACIENTES`, `VIEW_ORCAMENTOS`, `SEND_PROPOSTA`). Role assignment is environment-variable driven (`ADMIN_EMAILS`, `OPERADOR_EMAILS`, etc.) via `resolveUserRole()` in `src/lib/auth/roles.ts`. Route handlers call `guardCapability()` from `src/lib/auth/capability-guard.ts`, which resolves the session, determines the role, and returns either the authenticated context or a 401/403 `NextResponse`. This keeps authorization checks to a single line per handler.

## Consequences
**Positive:**
- Adding a new capability requires only updating the `CAPABILITIES` array and the relevant `ROLE_CAPABILITIES` mapping -- no database migration needed
- `guardCapability()` provides a consistent, one-line authorization pattern across all 60+ API routes
- Capabilities decouple route protection from roles: the same capability can be granted to multiple roles without duplicating route-level logic
- Page-level access (`canAccessAdminPage`) and API-level access (`canAccessAdminApi`) share the same capability definitions

**Negative:**
- Role assignment via environment variables does not scale beyond a small team; adding or removing a user requires a redeployment or environment variable change
- No per-user capability overrides -- a user gets exactly the capabilities of their role with no exceptions
- The capability list is defined in code, not in a database, making runtime role management impossible without a code change
