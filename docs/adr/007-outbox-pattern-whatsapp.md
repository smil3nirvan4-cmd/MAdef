# ADR-007: Outbox pattern for WhatsApp message delivery

**Status:** Accepted
**Date:** 2024-12-01

## Context
WhatsApp message delivery through the Baileys bridge is inherently unreliable -- the bridge process may be down, the WhatsApp session may be disconnected, or rate limits may be hit. When an operator sends a proposal or a system event triggers a notification, the message must eventually be delivered even if the bridge is temporarily unavailable. Sending messages synchronously within API request handlers would block responses and lose messages on failure. The platform needed a durable, retry-capable message delivery mechanism with deduplication guarantees.

## Decision
We implemented an outbox pattern in `src/lib/whatsapp/outbox/`. Messages are enqueued as `WhatsAppQueueItem` records in the database with a `pending` status, an idempotency key, and an internal message ID. The outbox service (`service.ts`) provides typed enqueue functions for each intent: `enqueueWhatsAppTextJob`, `enqueueWhatsAppTemplateJob`, `enqueueWhatsAppDocumentJob`, `enqueueWhatsAppPropostaJob`, and `enqueueWhatsAppContratoJob`. Each payload is validated with Zod schemas (`types.ts`) using a discriminated union on the `intent` field. A worker (`worker.ts`) polls for pending items, and a backoff module (`backoff.ts`) handles exponential retry with configurable limits. Idempotency is enforced at enqueue time via `upsertByIdempotency`, returning the existing record if a duplicate key is found.

## Consequences
**Positive:**
- Messages survive application restarts and bridge outages because they are persisted in the database before delivery is attempted
- Idempotency keys prevent duplicate sends when API handlers retry or users double-click send buttons
- The typed payload system (discriminated union with Zod validation) ensures each intent carries exactly the required fields, catching malformed messages at enqueue time
- Correlation IDs (`internalMessageId`) enable end-to-end tracing from enqueue through delivery

**Negative:**
- Database polling for pending items adds latency compared to an in-memory queue or push-based system like BullMQ (which is available but not used for this path)
- The `WhatsAppQueueItem` table grows unboundedly; old sent/dead items need periodic cleanup that is not yet automated
- The worker process must be running alongside the web server, adding operational complexity to the deployment
