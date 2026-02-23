# Security Audit Report: MAdef Project

**Document Classification:** CONFIDENTIAL
**Audit Date:** February 23, 2026
**Auditor:** Internal Security Review
**Scope:** Full application security assessment
**Framework:** OWASP Top 10 (2021), CWE/SANS Top 25

---

## Executive Summary

This security audit identifies **10 findings** across the MAdef project, a Next.js-based WhatsApp automation and management platform. The audit reveals **2 critical**, **4 high**, and **4 medium** severity issues that require immediate attention. The most urgent concern is the presence of real personally identifiable information (PII) and session credentials persisted in the Git history, even though the files have been removed from tracking. The second critical issue is the use of plaintext password authentication without hashing.

The application does demonstrate several good security practices, including timing-safe comparisons, a role-based access control system, structured logging, and circuit breaker patterns. However, significant gaps remain that must be addressed before any production deployment.

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 4     |
| MEDIUM   | 4     |
| LOW      | 0     |

**Overall Risk Rating: HIGH**

---

## Table of Contents

1. [Critical Findings](#critical-findings)
2. [High Severity Findings](#high-severity-findings)
3. [Medium Severity Findings](#medium-severity-findings)
4. [Existing Good Practices](#existing-good-practices)
5. [OWASP Top 10 Assessment](#owasp-top-10-assessment)
6. [Prioritized Remediation Plan](#prioritized-remediation-plan)
7. [Appendix: Methodology](#appendix-methodology)

---

## Critical Findings

### FINDING-001: Secrets and PII Committed to Git History

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | CRITICAL                                               |
| **CVSS Score**    | 9.8 (Critical)                                         |
| **CWE**           | CWE-540 (Inclusion of Sensitive Information in Source Code) |
| **OWASP**         | A02:2021 - Cryptographic Failures                      |
| **Status**        | Open                                                   |

**Description:**

The following files containing secrets and real PII were committed to the Git repository. Although they have since been removed from tracking via `git rm --cached`, the data remains fully accessible in the Git history:

- **`.wa-session.json`** - Contains a phone number (`5514981229679`) tied to an active WhatsApp session.
- **`.wa-state.json`** - Contains real PII including:
  - CPF (Brazilian tax ID): `86247362501`
  - Full name: `Jose Alves`
  - Email: `smilenfc@icloud.com`
- **`auth_info/`** - Contains WhatsApp encryption keys and session authentication material.
- **`.wa-automation-settings.json`** - Contains automation configuration that may reveal internal business logic.

**Impact:**

Any person with read access to the repository (including forks, clones, or backups) can extract these credentials and PII. This constitutes a potential data protection violation (LGPD in Brazil) and enables session hijacking of the WhatsApp account.

**Evidence:**

Files were removed from the working tree but remain in Git object storage. Running `git log --all --full-history -- .wa-state.json` will confirm the presence of these files in historical commits.

**Remediation:**

1. **IMMEDIATE (within 24 hours):**
   - Rotate all WhatsApp session credentials. Revoke and re-establish sessions.
   - Notify the affected individual (`Jose Alves`) of the PII exposure per LGPD requirements.
   - Revoke any API keys or tokens that may have been associated with the exposed sessions.

2. **SHORT-TERM (within 72 hours):**
   - Purge Git history using BFG Repo-Cleaner (preferred) or `git filter-branch`:
     ```bash
     # Using BFG Repo-Cleaner (recommended)
     bfg --delete-files .wa-session.json
     bfg --delete-files .wa-state.json
     bfg --delete-folders auth_info
     bfg --delete-files .wa-automation-settings.json
     git reflog expire --expire=now --all
     git gc --prune=now --aggressive
     ```
   - Force-push the cleaned repository and notify all collaborators to re-clone.

3. **LONG-TERM:**
   - Implement pre-commit hooks (e.g., `git-secrets`, `truffleHog`, or `gitleaks`) to prevent future secret commits.
   - Add all sensitive file patterns to `.gitignore` and validate the ignore rules in CI.
   - Establish a secrets management policy using a vault solution (e.g., HashiCorp Vault, AWS Secrets Manager, or Doppler).

---

### FINDING-002: Plaintext Password Authentication (No Hashing)

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | CRITICAL                                               |
| **CVSS Score**    | 9.1 (Critical)                                         |
| **CWE**           | CWE-256 (Plaintext Storage of a Password)              |
| **OWASP**         | A07:2021 - Identification and Authentication Failures  |
| **Status**        | Open                                                   |

**Description:**

The authentication system in `src/auth.ts` compares user-supplied passwords directly against the value stored in the `ADMIN_PASSWORD` environment variable. While the comparison itself uses a timing-safe function (which is good), the password is never hashed. The credential is stored as plaintext in the environment configuration.

**Impact:**

- Anyone with access to the server environment, process listing, or deployment configuration can read the admin password in plaintext.
- Environment variables are frequently logged by orchestration tools, crash reporters, and monitoring systems, increasing exposure surface.
- If the environment is compromised, the password is immediately usable without any cracking effort.
- Only a single admin account is supported, making credential sharing likely.

**Evidence:**

Location: `src/auth.ts` - password comparison logic references `process.env.ADMIN_PASSWORD` directly without any hash function invocation.

**Remediation:**

1. **IMMEDIATE:**
   - Implement password hashing using `bcrypt` (cost factor >= 12) or `argon2id`:
     ```typescript
     import bcrypt from 'bcrypt';

     // At account setup / password change
     const hashedPassword = await bcrypt.hash(plaintextPassword, 12);

     // At login
     const isValid = await bcrypt.compare(suppliedPassword, storedHash);
     ```
   - Store the hashed password in a database rather than an environment variable.

2. **SHORT-TERM:**
   - Migrate to a database-backed user management system (see FINDING-003).
   - Implement password complexity requirements (minimum 12 characters, no common passwords).
   - Add account lockout after 5 failed attempts within a 15-minute window.

---

## High Severity Findings

### FINDING-003: Single-User Environment-Variable-Based Auth System

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | HIGH                                                   |
| **CVSS Score**    | 7.5 (High)                                             |
| **CWE**           | CWE-287 (Improper Authentication)                      |
| **OWASP**         | A07:2021 - Identification and Authentication Failures  |
| **Status**        | Open                                                   |

**Description:**

The entire user and role management system is driven by environment variables (`ADMIN_EMAILS`, `SUPERVISOR_EMAILS`, etc.). There is no database-backed user model, no user registration flow, no password reset mechanism, no account lockout policy, and no multi-factor authentication (MFA).

**Impact:**

- Adding or removing users requires redeployment or environment variable changes followed by a restart.
- No audit trail for user management changes.
- No ability to enforce per-user password policies, session management, or account lifecycle controls.
- No MFA significantly increases the risk of credential-based attacks.

**Remediation:**

1. Implement a `User` model in the database (via Prisma) with fields for email, hashed password, role, status, created/updated timestamps, and last login.
2. Build user registration and invitation workflows with email verification.
3. Implement password reset via secure, time-limited tokens.
4. Add MFA support (TOTP via authenticator apps as a minimum).
5. Implement account lockout after repeated failed login attempts.
6. Maintain an audit log for all user management actions.

---

### FINDING-004: Missing Security Headers

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | HIGH                                                   |
| **CVSS Score**    | 7.1 (High)                                             |
| **CWE**           | CWE-693 (Protection Mechanism Failure)                 |
| **OWASP**         | A05:2021 - Security Misconfiguration                   |
| **Status**        | Open                                                   |

**Description:**

The `next.config.ts` file does not configure any HTTP security headers. The following headers are absent:

- **Content-Security-Policy (CSP):** No restrictions on script sources, enabling XSS exploitation.
- **Strict-Transport-Security (HSTS):** No enforcement of HTTPS connections.
- **X-Frame-Options:** No clickjacking protection.
- **X-Content-Type-Options:** No MIME-type sniffing prevention.
- **Referrer-Policy:** No control over referrer information leakage.
- **Permissions-Policy:** No restriction on browser feature access (camera, microphone, geolocation).

**Impact:**

The application is vulnerable to clickjacking, MIME-type confusion attacks, and has a larger XSS attack surface. Without HSTS, users may be subject to protocol downgrade attacks.

**Remediation:**

Add the following to `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

// In the Next.js config:
async headers() {
  return [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ];
}
```

---

### FINDING-005: SQLite Used as Production Database

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | HIGH                                                   |
| **CVSS Score**    | 7.0 (High)                                             |
| **CWE**           | CWE-1188 (Insecure Default Initialization of Resource) |
| **OWASP**         | A04:2021 - Insecure Design                             |
| **Status**        | Open                                                   |

**Description:**

The Prisma configuration uses SQLite (`file:./dev.db`) as the database provider. SQLite is a file-based database designed for embedded and single-user scenarios.

**Impact:**

- **Concurrency:** SQLite uses file-level locking. Under concurrent write loads from multiple users, requests will queue or fail with `SQLITE_BUSY` errors.
- **Scalability:** Cannot scale horizontally. The database file must reside on a single filesystem.
- **Durability:** A single file on disk with no replication. Hardware failure or accidental deletion results in total data loss.
- **Security:** The database file may be accessible via path traversal or misconfigured static file serving, exposing all application data.
- **Backup:** No built-in point-in-time recovery or streaming replication.

**Remediation:**

1. Migrate to PostgreSQL for production deployments:
   - Update `prisma/schema.prisma` to use `provider = "postgresql"`.
   - Update the `DATABASE_URL` environment variable to a PostgreSQL connection string.
   - Run `npx prisma migrate dev` to generate migration files for the new provider.
2. Configure connection pooling (e.g., PgBouncer or Prisma Accelerate).
3. Set up automated backups with point-in-time recovery.
4. Ensure the database is not accessible from the public internet.
5. SQLite may remain acceptable for local development only.

---

### FINDING-006: Insufficient Input Validation on API Endpoints

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | HIGH                                                   |
| **CVSS Score**    | 7.3 (High)                                             |
| **CWE**           | CWE-20 (Improper Input Validation)                     |
| **OWASP**         | A03:2021 - Injection                                   |
| **Status**        | Open                                                   |

**Description:**

While the Zod validation library is installed as a dependency, it is only applied to the authentication credentials check. The majority of API routes accept and process request bodies without schema validation.

**Impact:**

- Unexpected input types or structures may cause unhandled exceptions, leading to 500 errors or information disclosure via error messages.
- Although Prisma ORM protects against SQL injection, the lack of validation opens the door to business logic abuse (e.g., negative quantities, oversized strings, malformed phone numbers).
- Without validation, API contracts are implicit and fragile.

**Remediation:**

1. Define Zod schemas for every API endpoint's request body, query parameters, and path parameters.
2. Create a reusable validation middleware or wrapper:
   ```typescript
   import { z } from 'zod';
   import { NextRequest, NextResponse } from 'next/server';

   function withValidation<T>(schema: z.ZodSchema<T>, handler: (req: NextRequest, data: T) => Promise<NextResponse>) {
     return async (req: NextRequest) => {
       const body = await req.json();
       const result = schema.safeParse(body);
       if (!result.success) {
         return NextResponse.json(
           { error: 'Validation failed', details: result.error.flatten() },
           { status: 400 }
         );
       }
       return handler(req, result.data);
     };
   }
   ```
3. Validate all string lengths, numeric ranges, email formats, phone number formats, and enum values.
4. Add integration tests that submit invalid payloads and verify 400 responses.

---

### FINDING-007: Use of Unofficial WhatsApp API (Baileys)

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | HIGH                                                   |
| **CVSS Score**    | 7.0 (High)                                             |
| **CWE**           | N/A (Business/Compliance Risk)                         |
| **OWASP**         | A04:2021 - Insecure Design                             |
| **Status**        | Open                                                   |

**Description:**

The application uses the Baileys library, an unofficial, reverse-engineered WhatsApp Web API client. This is not sanctioned by Meta/WhatsApp and explicitly violates the WhatsApp Terms of Service.

**Impact:**

- **Account Ban:** WhatsApp actively detects and bans accounts using unofficial APIs. This can result in permanent loss of the phone number's WhatsApp access.
- **No SLA or Support:** Baileys is a community-maintained project with no uptime guarantees, no security patch SLA, and no commercial support.
- **Legal Risk:** Violation of TOS may expose the organization to legal action from Meta.
- **Breaking Changes:** WhatsApp protocol changes can break Baileys without warning, causing unplanned downtime.
- **No Migration Path:** There is currently no documented migration strategy to the official WhatsApp Business API.

**Remediation:**

1. **SHORT-TERM:** Document the risk and obtain explicit business stakeholder sign-off acknowledging the TOS violation and ban risk.
2. **MEDIUM-TERM:** Evaluate migration to the official WhatsApp Business API (via a Business Solution Provider such as Twilio, MessageBird, or direct Meta Cloud API access).
3. **LONG-TERM:** Implement an abstraction layer around the messaging provider to enable switching between Baileys and official APIs without rewriting application logic:
   ```typescript
   interface MessagingProvider {
     sendMessage(to: string, content: MessageContent): Promise<MessageResult>;
     onMessage(handler: MessageHandler): void;
     getConnectionStatus(): ConnectionStatus;
   }
   ```

---

## Medium Severity Findings

### FINDING-008: No CSRF Protection on Mutation Endpoints

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | MEDIUM                                                 |
| **CVSS Score**    | 5.4 (Medium)                                           |
| **CWE**           | CWE-352 (Cross-Site Request Forgery)                   |
| **OWASP**         | A08:2021 - Software and Data Integrity Failures        |
| **Status**        | Open                                                   |

**Description:**

No CSRF tokens are generated or validated on state-changing (POST/PUT/DELETE) endpoints. The application relies solely on NextAuth's `SameSite` cookie attribute for CSRF mitigation.

**Impact:**

- `SameSite=Lax` (the NextAuth default) does not protect against top-level navigation POST requests in some browsers.
- Older browsers may not enforce `SameSite` at all.
- An attacker could craft a malicious page that triggers state-changing requests to the application on behalf of an authenticated user.

**Remediation:**

1. Implement CSRF token validation using NextAuth's built-in CSRF protection or a dedicated library.
2. For API routes, require a custom header (e.g., `X-Requested-With`) that cannot be set by cross-origin form submissions.
3. Ensure all cookies are set with `SameSite=Strict` where possible, falling back to `Lax` only where cross-site navigation is required.

---

### FINDING-009: In-Memory-Only Rate Limiting

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | MEDIUM                                                 |
| **CVSS Score**    | 5.3 (Medium)                                           |
| **CWE**           | CWE-770 (Allocation of Resources Without Limits)       |
| **OWASP**         | A04:2021 - Insecure Design                             |
| **Status**        | Open                                                   |

**Description:**

The rate limiting implementation in `src/lib/api/rate-limit.ts` uses an in-memory `Map` to track request counts per client.

**Impact:**

- **Server Restart:** All rate limit counters reset on application restart or redeployment, allowing burst abuse.
- **Multi-Instance:** In a horizontally scaled environment (multiple server instances), each instance maintains its own independent counter. An attacker can distribute requests across instances to bypass limits entirely.
- **Memory Leak Potential:** Without periodic cleanup of stale entries, the Map may grow unbounded over time.
- **Incomplete Coverage:** Rate limiting is not applied to all endpoints, leaving some routes unprotected against abuse.

**Remediation:**

1. Replace the in-memory store with a Redis-backed rate limiter (e.g., `@upstash/ratelimit` or `rate-limiter-flexible` with Redis adapter).
2. Apply rate limiting middleware globally, with per-route overrides for sensitive endpoints (login, password reset, API key generation).
3. Implement sliding window or token bucket algorithms for smoother rate limiting.
4. Add rate limit headers to responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

---

### FINDING-010: Environment Variable Exposure Risk

| Attribute         | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Severity**      | MEDIUM                                                 |
| **CVSS Score**    | 5.0 (Medium)                                           |
| **CWE**           | CWE-798 (Use of Hard-coded Credentials)                |
| **OWASP**         | A05:2021 - Security Misconfiguration                   |
| **Status**        | Open                                                   |

**Description:**

The `.env.example` file contains example admin credentials. There is no documentation or inline comments warning developers about the importance of changing these values for production deployments.

**Impact:**

- Developers may copy `.env.example` to `.env` without changing credentials, deploying with known default values.
- If `.env.example` values are realistic (rather than obviously placeholder), they may be mistaken for valid production credentials.

**Remediation:**

1. Replace all credential values in `.env.example` with clearly placeholder values:
   ```
   ADMIN_PASSWORD=CHANGE_ME_BEFORE_PRODUCTION
   ADMIN_EMAILS=admin@example.com
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   ```
2. Add prominent comments in `.env.example`:
   ```
   # WARNING: Do NOT use these values in production.
   # Generate unique secrets using: openssl rand -base64 32
   ```
3. Add a startup check that refuses to start if known placeholder values are detected in production mode.
4. Document credential management procedures in the deployment guide.

---

## Existing Good Practices

The following positive security measures were identified during the audit and should be maintained:

| Practice | Details |
|----------|---------|
| **Timing-Safe Comparison** | Authentication uses constant-time string comparison to prevent timing side-channel attacks on password verification. |
| **RBAC with Capabilities** | A role-based access control system is implemented with 6 distinct roles and 18+ granular capabilities, providing defense-in-depth for authorization. |
| **Error Boundary Wrapper** | Structured error responses prevent stack traces and internal details from leaking to clients. |
| **Request Context Tracking** | Each request is assigned a unique ID for traceability across logs and error reports. |
| **Structured Logging** | Application events are logged to a `SystemLog` database table with structured fields, enabling audit and forensic analysis. |
| **WhatsApp Webhook HMAC Verification** | Incoming webhook requests are verified using HMAC signatures to ensure authenticity. |
| **Circuit Breaker Pattern** | The WhatsApp connection uses a circuit breaker to gracefully handle downstream failures and prevent cascade failures. |
| **Prisma ORM** | Use of Prisma eliminates the risk of SQL injection through parameterized queries. |

---

## OWASP Top 10 (2021) Assessment

| Category | Rating | Assessment |
|----------|--------|------------|
| **A01: Broken Access Control** | PARTIAL | RBAC system exists with capabilities but is not universally enforced. Some API endpoints may lack authorization checks. Requires audit of all route handlers. |
| **A02: Cryptographic Failures** | FAIL | Plaintext password storage (FINDING-002). WhatsApp session tokens were exposed in Git history (FINDING-001). No encryption at rest for sensitive database fields. |
| **A03: Injection** | PASS | Prisma ORM provides parameterized queries. No raw SQL detected. Input validation gaps exist (FINDING-006) but do not directly enable injection. |
| **A04: Insecure Design** | FAIL | Single-user auth system (FINDING-003). SQLite in production (FINDING-005). Environment-variable-based role assignment. In-memory rate limiting (FINDING-009). |
| **A05: Security Misconfiguration** | FAIL | No security headers (FINDING-004). No CORS configuration. No Content Security Policy. Default-like credential examples (FINDING-010). |
| **A06: Vulnerable and Outdated Components** | UNKNOWN | A full `npm audit` was not run as part of this review. Recommendation: Run `npm audit` and address all high/critical vulnerabilities. Automate with Dependabot or Snyk. |
| **A07: Identification and Authentication Failures** | FAIL | No password hashing (FINDING-002). No account lockout. No MFA. No password complexity enforcement. Single admin account (FINDING-003). |
| **A08: Software and Data Integrity Failures** | PARTIAL | No CSRF protection (FINDING-008). No subresource integrity (SRI) for external scripts. No code signing or integrity verification on deployments. |
| **A09: Security Logging and Monitoring** | PASS | Structured logging to `SystemLog` table exists. Request IDs enable traceability. Recommendation: Add alerting on authentication failures and suspicious patterns. |
| **A10: Server-Side Request Forgery** | PASS | No user-controlled URL fetching was identified. The application does not proxy external requests based on user input. Low SSRF risk. |

---

## Prioritized Remediation Plan

### Phase 1: Emergency (0-48 hours)

| Priority | Finding | Action |
|----------|---------|--------|
| P0 | FINDING-001 | Rotate all WhatsApp session credentials immediately. |
| P0 | FINDING-001 | Notify affected individual of PII exposure (LGPD compliance). |
| P0 | FINDING-001 | Purge Git history using BFG Repo-Cleaner. Force-push and notify collaborators. |
| P0 | FINDING-001 | Install pre-commit hooks (`gitleaks` or `git-secrets`) to prevent future secret commits. |

### Phase 2: Critical (1-2 weeks)

| Priority | Finding | Action |
|----------|---------|--------|
| P1 | FINDING-002 | Implement bcrypt/argon2 password hashing. |
| P1 | FINDING-004 | Add all security headers to `next.config.ts`. |
| P1 | FINDING-006 | Add Zod validation to all API endpoints. |
| P1 | N/A | Run `npm audit fix` and address all critical/high dependency vulnerabilities. |

### Phase 3: High Priority (2-4 weeks)

| Priority | Finding | Action |
|----------|---------|--------|
| P2 | FINDING-003 | Design and implement database-backed user management. |
| P2 | FINDING-005 | Migrate from SQLite to PostgreSQL. |
| P2 | FINDING-007 | Evaluate official WhatsApp Business API migration. Create abstraction layer. |
| P2 | FINDING-008 | Implement CSRF token validation. |

### Phase 4: Hardening (1-3 months)

| Priority | Finding | Action |
|----------|---------|--------|
| P3 | FINDING-003 | Add MFA support (TOTP). |
| P3 | FINDING-009 | Migrate rate limiting to Redis-backed store. Apply globally. |
| P3 | FINDING-010 | Add startup validation for placeholder credentials. Document credential management. |
| P3 | N/A | Implement automated security scanning in CI/CD (SAST, DAST, dependency scanning). |
| P3 | N/A | Conduct penetration testing after remediation phases 1-3 are complete. |

---

## Appendix: Methodology

### Scope

This audit covered the following areas of the MAdef project:

- **Source code review:** All TypeScript/JavaScript source files under `src/`.
- **Configuration review:** `next.config.ts`, `prisma/schema.prisma`, `.env.example`, `package.json`.
- **Git history analysis:** Review of committed secrets and sensitive files.
- **Architecture review:** Authentication flow, authorization model, database design, external integrations.

### Tools and Techniques

- Manual source code review
- Git history inspection (`git log`, `git show`)
- Configuration file analysis
- OWASP Top 10 (2021) framework mapping
- CWE classification for identified vulnerabilities

### Limitations

- No dynamic testing (DAST) was performed.
- No penetration testing was conducted.
- Dependency vulnerability analysis (`npm audit`) was not executed as part of this review.
- Third-party services and infrastructure configuration were not assessed.
- Client-side JavaScript was not reviewed for DOM-based XSS.

### Severity Rating Criteria

| Severity | CVSS Range | Description |
|----------|------------|-------------|
| CRITICAL | 9.0 - 10.0 | Immediate exploitation likely. Data breach or full system compromise possible. |
| HIGH | 7.0 - 8.9 | Exploitation feasible with moderate effort. Significant impact on confidentiality, integrity, or availability. |
| MEDIUM | 4.0 - 6.9 | Exploitation requires specific conditions. Moderate impact. |
| LOW | 0.1 - 3.9 | Difficult to exploit. Limited impact. |

---

*End of Security Audit Report*

*This document should be treated as confidential and distributed only to authorized personnel. The findings and recommendations herein are based on the state of the codebase at the time of review and should be re-evaluated after remediation efforts are completed.*
