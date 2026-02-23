# Prisma Schema Audit Report

**Project:** MAdef
**Schema file:** `prisma/schema.prisma`
**Date:** February 23, 2026
**Auditor:** Automated Schema Analysis
**Provider:** SQLite (via Prisma Client JS)

---

## Executive Summary

The schema defines **37 models** covering four functional domains: core business operations (caregiving platform), WhatsApp messaging infrastructure, enterprise multi-unit pricing, and system observability. While the schema demonstrates solid practices in its enterprise pricing tier -- proper cascading deletes, composite unique constraints, and comprehensive indexing -- it carries several critical and high-severity issues that will impede production readiness, data integrity, and long-term maintainability.

The two most urgent findings are the absence of a `User` model for authentication (relying on environment variables instead) and the use of SQLite as the database provider, which is unsuitable for a production multi-tenant application.

---

## Table of Contents

1. [Findings Summary](#findings-summary)
2. [Model-by-Model Audit](#model-by-model-audit)
   - [Core Business Models](#core-business-models)
   - [WhatsApp Infrastructure Models](#whatsapp-infrastructure-models)
   - [Enterprise Pricing Models](#enterprise-pricing-models)
   - [Observability Models](#observability-models)
3. [Cross-Cutting Concerns](#cross-cutting-concerns)
4. [Recommendations](#recommendations)

---

## Findings Summary

| # | Severity | Finding | Affected Models |
|---|----------|---------|-----------------|
| 1 | CRITICAL | No `User` model -- authentication relies on environment variables, not database | System-wide |
| 2 | CRITICAL | SQLite provider -- unsuitable for production; must migrate to PostgreSQL | System-wide |
| 3 | HIGH | Missing `deletedAt` field for soft deletes on core business models | Cuidador, Paciente, Avaliacao, Orcamento, Alocacao |
| 4 | HIGH | `dadosDetalhados` on Avaliacao stored as String (serialized JSON) instead of proper relational structure | Avaliacao |
| 5 | HIGH | Numerous String fields used to store JSON data, losing type safety and queryability | Orcamento, OrcamentoSimulacao, FormSubmission, WhatsAppFlowState, WhatsAppMessage, WhatsAppAnalytics, WhatsAppWebhook, ConfigAuditLog, OrcamentoAuditLog, SystemLog, UnidadeContratoTemplate |
| 6 | MEDIUM | Mensagem has optional `cuidadorId` and `pacienteId` with no `onDelete` cascading rules | Mensagem |
| 7 | MEDIUM | FormSubmission has no foreign key relations -- data is orphaned from all other models | FormSubmission |
| 8 | MEDIUM | WhatsAppWebhook stores `secret` as plain String with no encryption indication | WhatsAppWebhook |
| 9 | LOW | No `@@map` or `@map` directives for SQL table/column naming conventions | All models |
| 10 | GOOD | Comprehensive composite indexes on Orcamento, OrcamentoSimulacao, and audit tables | Orcamento, OrcamentoSimulacao, ConfigAuditLog, OrcamentoAuditLog, SystemLog |
| 11 | GOOD | `onDelete: Cascade` correctly applied on enterprise pricing child models | UnidadeDoencaRegra, UnidadeRegraHora, UnidadeTaxaPagamento, UnidadeMinicusto, UnidadePercentualComissao, UnidadeDescontoPreset, UnidadeContratoTemplate, OrcamentoSimulacao |
| 12 | GOOD | `createdAt` / `updatedAt` present on most models | Majority of models |
| 13 | MISSING | No `@db.VarChar` length constraints on any String field | All models (SQLite limitation; required for PostgreSQL migration) |
| 14 | MISSING | No `enum` types used -- all status, type, and category fields are plain String | All models with status/type fields |

---

## Model-by-Model Audit

### Core Business Models

#### 1. Cuidador

```prisma
model Cuidador {
  id           String     @id @default(cuid())
  telefone     String     @unique
  nome         String?
  area         String?
  status       String     @default("CRIADO")
  quizScore    Int?
  scoreRH      Int?
  competencias String?
  endereco     String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  alocacoes    Alocacao[]
  mensagens    Mensagem[]
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Unique constraints | `telefone` -- good |
| Timestamps | `createdAt`, `updatedAt` -- good |
| Relations | Has `alocacoes` and `mensagens` -- good |
| Indexes | None beyond unique -- consider index on `status` for filtered queries |

**Issues:**
- **[HIGH]** No `deletedAt` field. Deleting a Cuidador is a hard delete that will cascade-fail on Alocacao and Mensagem rows unless those relations define `onDelete` behavior (they do not).
- **[MEDIUM]** `status` is a plain String with default `"CRIADO"`. Should be an enum (e.g., `CRIADO`, `ATIVO`, `INATIVO`, `BLOQUEADO`).
- **[MEDIUM]** `competencias` appears to store structured data (likely comma-separated or JSON) as a plain String. Loses queryability.
- **[LOW]** No index on `status` for listing active caregivers.

---

#### 2. Paciente

```prisma
model Paciente {
  id         String               @id @default(cuid())
  telefone   String               @unique
  nome       String?
  cidade     String?
  bairro     String?
  tipo       String               @default("HOME_CARE")
  hospital   String?
  quarto     String?
  status     String               @default("LEAD")
  prioridade String               @default("NORMAL")
  gqpScore   Int?
  createdAt  DateTime             @default(now())
  updatedAt  DateTime             @updatedAt
  alocacoes  Alocacao[]
  avaliacoes Avaliacao[]
  mensagens  Mensagem[]
  orcamentos Orcamento[]
  simulacoes OrcamentoSimulacao[]
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Unique constraints | `telefone` -- good |
| Timestamps | `createdAt`, `updatedAt` -- good |
| Relations | Rich set of child relations -- good |
| Indexes | None beyond unique -- needs index on `status`, `tipo` |

**Issues:**
- **[HIGH]** No `deletedAt` field. Paciente is the most interconnected model (5 relation sets). Hard deletion risks orphaning or cascade-failing across Alocacao, Avaliacao, Mensagem, Orcamento, and OrcamentoSimulacao.
- **[MEDIUM]** `status` (default `"LEAD"`), `tipo` (default `"HOME_CARE"`), and `prioridade` (default `"NORMAL"`) are all plain Strings. Should be enums.
- **[LOW]** No index on `status` or `tipo` for filtered listing.

---

#### 3. Mensagem

```prisma
model Mensagem {
  id         String    @id @default(cuid())
  telefone   String
  direcao    String
  conteudo   String
  flow       String?
  step       String?
  timestamp  DateTime  @default(now())
  cuidadorId String?
  pacienteId String?
  paciente   Paciente? @relation(fields: [pacienteId], references: [id])
  cuidador   Cuidador? @relation(fields: [cuidadorId], references: [id])
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Timestamps | `timestamp` only -- missing `createdAt`/`updatedAt` pattern |
| Relations | Optional links to Paciente and Cuidador |
| Indexes | None |

**Issues:**
- **[MEDIUM]** Both `cuidadorId` and `pacienteId` are optional with **no `onDelete` rule** defined. If a Cuidador or Paciente is deleted, the default Prisma behavior will either error or leave dangling references depending on the database. Should specify `onDelete: SetNull` explicitly.
- **[MEDIUM]** `direcao` is a plain String. Should be an enum (`INBOUND`, `OUTBOUND`).
- **[LOW]** No indexes on `telefone`, `cuidadorId`, `pacienteId`, or `timestamp`. For a messaging table expected to grow rapidly, this will cause severe query performance degradation.
- **[LOW]** Missing `updatedAt`.

---

#### 4. Avaliacao

```prisma
model Avaliacao {
  id              String    @id @default(cuid())
  pacienteId      String
  abemidScore     Int?
  katzScore       Int?
  lawtonScore     Int?
  gqp             Int?
  nivelSugerido   String?
  cargaSugerida   String?
  nivelFinal      String?
  cargaFinal      String?
  avaliadorId     String?
  validadoEm      DateTime?
  status          String    @default("PENDENTE")
  createdAt       DateTime  @default(now())
  paciente        Paciente  @relation(fields: [pacienteId], references: [id])
  dadosDetalhados String?
  // WhatsApp tracking fields ...
  orcamentos      Orcamento[]
  simulacoes      OrcamentoSimulacao[]
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Timestamps | `createdAt` only -- missing `updatedAt` |
| Relations | Links to Paciente (required), has child Orcamento and OrcamentoSimulacao |
| Indexes | None |

**Issues:**
- **[HIGH]** `dadosDetalhados` stores complex clinical assessment data (discovery, patient profile, clinical scores, ABEMID details) as a serialized JSON String. This should be decomposed into proper relational tables (e.g., `AvaliacaoDiscovery`, `AvaliacaoClinical`) for queryability, validation, and referential integrity.
- **[HIGH]** No `deletedAt` field. Clinical evaluations are regulated data that should never be hard-deleted.
- **[MEDIUM]** `avaliadorId` is a plain String with no foreign key relation. There is no `User` model to reference. This means there is no referential integrity on who performed the evaluation.
- **[MEDIUM]** `status` is a plain String. Should be an enum (e.g., `PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDA`, `VALIDADA`).
- **[LOW]** Missing `updatedAt` -- cannot track when evaluations are modified.
- **[LOW]** No index on `pacienteId`, `status`, or `avaliadorId`.

---

#### 5. Orcamento

```prisma
model Orcamento {
  id                    String    @id @default(cuid())
  pacienteId            String
  unidadeId             String?
  configVersionId       String?
  avaliacaoId           String?
  cenarioEconomico      String?
  cenarioRecomendado    String?
  cenarioPremium        String?
  cenarioSelecionado    String?
  valorFinal            Float?
  snapshotInput         String?
  snapshotOutput        String?
  planningInput         String?
  normalizedSchedule    String?
  pricingBreakdown      String?
  calculationHash       String?
  auditHash             String?
  engineVersion         String?
  createdBy             String?
  descontoManualPercent Float?
  minicustosDesativados String?
  moeda                 String    @default("BRL")
  status                String    @default("RASCUNHO")
  aprovadoPor           String?
  enviadoEm             DateTime?
  aceitoEm              DateTime?
  createdAt             DateTime  @default(now())
  // relations ...

  @@index([pacienteId, createdAt])
  @@index([unidadeId, createdAt])
  @@index([configVersionId])
  @@index([avaliacaoId])
  @@index([calculationHash])
  @@index([auditHash])
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Timestamps | `createdAt` only -- missing `updatedAt` |
| Relations | Links to Paciente (required), Unidade (optional), ConfigVersion (optional), Avaliacao (optional) |
| Indexes | **Excellent** -- 6 indexes covering major query patterns |

**Issues:**
- **[HIGH]** Multiple fields store JSON as String: `cenarioEconomico`, `cenarioRecomendado`, `cenarioPremium`, `cenarioSelecionado`, `snapshotInput`, `snapshotOutput`, `planningInput`, `normalizedSchedule`, `pricingBreakdown`, `minicustosDesativados`. This is 10 JSON-in-String fields on a single model. Type safety is entirely lost.
- **[HIGH]** No `deletedAt` field. Budgets/quotes are financial documents that should support soft deletion.
- **[MEDIUM]** `createdBy` and `aprovadoPor` are plain Strings with no foreign key. No referential integrity on who created or approved the budget.
- **[MEDIUM]** `status` is a plain String. Should be an enum (e.g., `RASCUNHO`, `ENVIADO`, `ACEITO`, `REJEITADO`, `EXPIRADO`).
- **[LOW]** Missing `updatedAt`.
- **[GOOD]** Comprehensive index coverage.

---

#### 6. Alocacao

```prisma
model Alocacao {
  id            String    @id @default(cuid())
  cuidadorId    String
  pacienteId    String?
  slotId        String
  turno         String
  diaSemana     Int
  dataInicio    DateTime
  hospital      String?
  quarto        String?
  status        String    @default("PENDENTE_FEEDBACK")
  ofertadoEm    DateTime  @default(now())
  respondidoEm  DateTime?
  confirmadoT24 DateTime?
  confirmadoT2  DateTime?
  createdAt     DateTime  @default(now())
  paciente      Paciente? @relation(fields: [pacienteId], references: [id])
  cuidador      Cuidador  @relation(fields: [cuidadorId], references: [id])
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Timestamps | `createdAt` -- missing `updatedAt` |
| Relations | Links to Cuidador (required), Paciente (optional) |
| Indexes | None |

**Issues:**
- **[HIGH]** No `deletedAt` field. Allocation records should be kept for historical auditing.
- **[MEDIUM]** `status` and `turno` are plain Strings. Should be enums.
- **[MEDIUM]** No `onDelete` rules on either relation. If a Cuidador is deleted, Alocacao rows become invalid.
- **[LOW]** No indexes on `cuidadorId`, `pacienteId`, `status`, or `dataInicio`. Scheduling queries will be slow.
- **[LOW]** Missing `updatedAt`.
- **[LOW]** `slotId` has no corresponding relation or foreign key.

---

#### 7. FormSubmission

```prisma
model FormSubmission {
  id        String   @id @default(cuid())
  tipo      String
  dados     String
  telefone  String?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

| Aspect | Assessment |
|--------|------------|
| Primary key | `cuid()` -- good |
| Timestamps | `createdAt` only |
| Relations | **None** |
| Indexes | None |

**Issues:**
- **[MEDIUM]** Completely orphaned model. `telefone` could link to Paciente or Cuidador but has no foreign key. Submissions cannot be traced back to any entity.
- **[MEDIUM]** `dados` stores form data as a String (JSON). No type safety or queryability.
- **[LOW]** No index on `tipo`, `telefone`, or `createdAt`.
- **[LOW]** Missing `updatedAt`.

---

### WhatsApp Infrastructure Models

#### 8. WhatsAppSession

```prisma
model WhatsAppSession {
  id             String           @id @default(cuid())
  phone          String?          @unique
  contactId      String?          @unique
  state          String           @default("MENU")
  data           String?
  expiresAt      DateTime?
  status         String           @default("DISCONNECTED")
  qrCode         String?
  connectedAt    DateTime?
  disconnectedAt DateTime?
  lastActivity   DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  contact        WhatsAppContact? @relation(...)
}
```

| Aspect | Assessment |
|--------|------------|
| Unique constraints | `phone`, `contactId` -- good |
| Timestamps | `createdAt`, `updatedAt` -- good |
| Relations | Optional link to WhatsAppContact |

**Issues:**
- **[HIGH]** `data` stores session data as a JSON String. Loses type safety.
- **[MEDIUM]** `state` and `status` are plain Strings. Should be enums.
- **[MEDIUM]** `qrCode` may contain large base64 data stored in a plain String with no length awareness.

---

#### 9. WhatsAppFlowState

```prisma
model WhatsAppFlowState {
  id              String   @id @default(cuid())
  phone           String   @unique
  currentFlow     String   @default("IDLE")
  currentStep     String   @default("")
  data            String
  lastInteraction DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Issues:**
- **[HIGH]** `data` is a required String storing JSON flow state data.
- **[MEDIUM]** `currentFlow` should be an enum.
- **[LOW]** Missing `createdAt`.

---

#### 10. WhatsAppLock

```prisma
model WhatsAppLock {
  id         String   @id @default(cuid())
  resourceId String   @unique
  ownerId    String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

**Issues:**
- **[LOW]** No index on `expiresAt` for cleanup queries that purge expired locks.
- **[LOW]** Minimal model; appropriate for its purpose (distributed locking).

---

#### 11. WhatsAppCooldown

```prisma
model WhatsAppCooldown {
  id        String   @id @default(cuid())
  key       String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

**Issues:**
- **[LOW]** No index on `expiresAt` for cleanup. Same pattern as WhatsAppLock.
- Otherwise well-structured for its purpose.

---

#### 12. WhatsAppContact

```prisma
model WhatsAppContact {
  id          String            @id @default(cuid())
  phone       String            @unique
  name        String?
  jid         String?
  profilePic  String?
  isBlocked   Boolean           @default(false)
  labels      String?
  lastMessage DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  messages    WhatsAppMessage[]
  session     WhatsAppSession?  @relation("ContactSession")
}
```

**Issues:**
- **[MEDIUM]** `labels` is a String (likely comma-separated or JSON). Should be a many-to-many relation with WhatsAppLabel.
- **[LOW]** `profilePic` may store a URL or base64 data. No length constraint.

---

#### 13. WhatsAppMessage

```prisma
model WhatsAppMessage {
  id        String          @id @default(cuid())
  contactId String
  direction String
  type      String
  content   String
  mediaUrl  String?
  status    String          @default("sent")
  metadata  String?
  createdAt DateTime        @default(now())
  contact   WhatsAppContact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, createdAt])
}
```

| Aspect | Assessment |
|--------|------------|
| Cascade | `onDelete: Cascade` -- **good**, deleting a contact removes its messages |
| Indexes | `[contactId, createdAt]` -- good |

**Issues:**
- **[HIGH]** `metadata` is a JSON String.
- **[MEDIUM]** `direction`, `type`, and `status` are plain Strings. Should be enums.
- **[LOW]** Missing `updatedAt`.

---

#### 14. WhatsAppTemplate

```prisma
model WhatsAppTemplate {
  id        String   @id @default(cuid())
  name      String   @unique
  category  String
  content   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Issues:**
- **[MEDIUM]** `category` is a plain String. Should be an enum.
- Otherwise well-structured.

---

#### 15. WhatsAppQuickReply

```prisma
model WhatsAppQuickReply {
  id        String   @id @default(cuid())
  shortcut  String   @unique
  content   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Issues:**
- No significant issues. Well-structured for its purpose.

---

#### 16. WhatsAppAutoReply

```prisma
model WhatsAppAutoReply {
  id        String   @id @default(cuid())
  trigger   String
  condition String?
  response  String
  priority  Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive, priority])
}
```

**Issues:**
- **[LOW]** `condition` likely stores JSON or a DSL expression as a plain String.
- **[GOOD]** Index on `[isActive, priority]` for ordered retrieval.

---

#### 17. WhatsAppScheduled

```prisma
model WhatsAppScheduled {
  id          String    @id @default(cuid())
  to          String
  message     String
  scheduledAt DateTime
  status      String    @default("pending")
  sentAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Issues:**
- **[MEDIUM]** `status` is a plain String. Should be an enum (`pending`, `sent`, `failed`, `cancelled`).
- **[LOW]** No index on `status` + `scheduledAt` for the scheduler query that picks up pending messages.

---

#### 18. WhatsAppQueueItem

```prisma
model WhatsAppQueueItem {
  id                String    @id @default(cuid())
  phone             String
  payload           String
  status            String    @default("pending")
  retries           Int       @default(0)
  error             String?
  scheduledAt       DateTime?
  sentAt            DateTime?
  lastAttemptAt     DateTime?
  idempotencyKey    String?   @unique
  internalMessageId String?   @unique
  providerMessageId String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([status, scheduledAt])
  @@index([status, createdAt])
}
```

| Aspect | Assessment |
|--------|------------|
| Unique constraints | `idempotencyKey`, `internalMessageId` -- good for deduplication |
| Indexes | Two composite indexes -- good |

**Issues:**
- **[HIGH]** `payload` stores message payload as a JSON String.
- **[MEDIUM]** `status` is a plain String. Should be an enum.

---

#### 19. WhatsAppLabel

```prisma
model WhatsAppLabel {
  id        String   @id @default(cuid())
  name      String   @unique
  color     String   @default("#3b82f6")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Issues:**
- **[MEDIUM]** No relation to WhatsAppContact. Labels exist in the database but are referenced by a plain String `labels` field on WhatsAppContact instead of a proper many-to-many join table.

---

#### 20. WhatsAppBlacklist

```prisma
model WhatsAppBlacklist {
  id        String   @id @default(cuid())
  phone     String   @unique
  reason    String?
  createdAt DateTime @default(now())
}
```

**Issues:**
- **[LOW]** Missing `updatedAt`. Minor since records are unlikely to be updated.
- Otherwise well-structured.

---

#### 21. WhatsAppWebhook

```prisma
model WhatsAppWebhook {
  id        String   @id @default(cuid())
  name      String   @default("Webhook")
  url       String
  events    String
  secret    String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Issues:**
- **[MEDIUM]** `secret` is stored as a plain String. Webhook secrets should be encrypted at rest. If the database is compromised, all webhook signatures are exposed. Recommend encrypting this field or storing a hashed version.
- **[MEDIUM]** `events` stores event types as a String (likely comma-separated or JSON). Should be a separate relation or use a proper array type (available in PostgreSQL).
- **[LOW]** `url` has no validation constraint at the schema level.

---

#### 22. WhatsAppFlowDefinition

```prisma
model WhatsAppFlowDefinition {
  id          String   @id @default(cuid())
  name        String
  trigger     String   @default("")
  category    String   @default("geral")
  description String?
  definition  String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([name, category])
}
```

**Issues:**
- **[HIGH]** `definition` stores the entire flow definition as a JSON String. This is a large, complex object with no type safety.
- **[MEDIUM]** `category` is a plain String. Should be an enum.

---

#### 23. WhatsAppSetting

```prisma
model WhatsAppSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Issues:**
- **[LOW]** Generic key-value store pattern. Acceptable for configuration but loses type safety. Consider whether a typed configuration model would be more appropriate.

---

#### 24. WhatsAppAnalytics

```prisma
model WhatsAppAnalytics {
  id             String   @id @default(cuid())
  date           DateTime @unique
  messagesSent   Int      @default(0)
  messagesRecv   Int      @default(0)
  uniqueContacts Int      @default(0)
  avgResponseMs  Int?
  metadata       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Issues:**
- **[HIGH]** `metadata` is a JSON String.
- **[LOW]** `date` as the unique key implies one record per day. Consider whether finer granularity (hourly) is needed.

---

### Enterprise Pricing Models

#### 25. Unidade

```prisma
model Unidade {
  id              String   @id @default(cuid())
  codigo          String   @unique
  nome            String
  cidade          String?
  estado          String?
  timezone        String   @default("America/Sao_Paulo")
  moeda           String   @default("BRL")
  ativa           Boolean  @default(true)
  parentUnidadeId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  parentUnidade   Unidade? @relation("UnidadeHierarchy", ...)
  filiais         Unidade[] @relation("UnidadeHierarchy")
  // ... 10 child relation sets

  @@index([ativa])
}
```

| Aspect | Assessment |
|--------|------------|
| Self-relation | `UnidadeHierarchy` for parent/child units -- good design pattern |
| Indexes | `[ativa]` -- good |
| Relations | Comprehensive child model coverage |

**Issues:**
- **[MEDIUM]** `moeda` should be an enum or validated against ISO 4217 codes.
- **[MEDIUM]** `estado` should be an enum or validated against Brazilian state codes.
- **[LOW]** No index on `parentUnidadeId` for hierarchy traversal queries.
- **[GOOD]** Well-structured model overall. Self-referential hierarchy is properly implemented.

---

#### 26. UnidadeConfiguracaoVersao

```prisma
model UnidadeConfiguracaoVersao {
  id              String   @id @default(cuid())
  unidadeId       String
  version         Int
  isActive        Boolean  @default(false)
  effectiveAt     DateTime @default(now())
  effectiveFrom   DateTime @default(now())
  effectiveTo     DateTime?
  isDraft         Boolean  @default(true)
  // ... 18 pricing configuration fields
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  unidade Unidade @relation(..., onDelete: Cascade)
  // ... 8 child relation sets

  @@unique([unidadeId, version])
  @@index([unidadeId, isActive])
  @@index([unidadeId, isActive, effectiveFrom, effectiveTo])
}
```

| Aspect | Assessment |
|--------|------------|
| Cascade | `onDelete: Cascade` from Unidade -- good |
| Unique constraints | `[unidadeId, version]` -- ensures version uniqueness per unit |
| Indexes | Three indexes including temporal range -- excellent |
| Versioning | `version`, `isDraft`, `effectiveFrom/To` -- well-designed temporal versioning |

**Issues:**
- **[MEDIUM]** `createdBy` is a plain String -- no foreign key to a User model.
- **[LOW]** `effectiveAt` and `effectiveFrom` appear redundant. Consider removing one.
- **[GOOD]** This is one of the best-designed models in the schema. Proper versioning, temporal ranges, and cascading deletes.

---

#### 27-33. Enterprise Child Models

The following models share a common pattern:

- **UnidadeDoencaRegra** -- Disease complexity rules per configuration version
- **UnidadeRegraHora** -- Hour-based pricing factor rules
- **UnidadeTaxaPagamento** -- Payment method/period tax rates
- **UnidadeMinicusto** -- Micro-cost items (materials, supplies)
- **UnidadePercentualComissao** -- Commission percentage tiers
- **UnidadeDescontoPreset** -- Discount presets
- **UnidadeContratoTemplate** -- Contract document templates

| Aspect | Assessment |
|--------|------------|
| Cascade | All define `onDelete: Cascade` on both `unidade` and `configVersion` relations -- **excellent** |
| Unique constraints | All have composite unique constraints preventing duplicates within a config version -- **excellent** |
| Indexes | All have composite indexes for filtered queries -- **good** |
| Timestamps | All have `createdAt` and `updatedAt` -- **good** |

**Issues:**
- **[HIGH]** `UnidadeContratoTemplate.conteudo` stores entire contract templates as a String. `placeholders` is also a JSON String.
- **[MEDIUM]** `UnidadeDoencaRegra.complexidade` and `profissionalMinimo` are plain Strings. Should be enums.
- **[GOOD]** Overall, the enterprise pricing tier is the most well-designed section of the schema. Proper normalization, cascading, constraints, and indexing.

---

#### 34. OrcamentoSimulacao

```prisma
model OrcamentoSimulacao {
  id                    String   @id @default(cuid())
  unidadeId             String
  configVersionId       String
  // ... simulation fields
  inputSnapshot         String
  outputSnapshot        String
  // ...
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  unidade       Unidade                   @relation(..., onDelete: Cascade)
  configVersion UnidadeConfiguracaoVersao @relation(..., onDelete: Cascade)
  orcamento     Orcamento?                @relation(..., onDelete: SetNull)
  paciente      Paciente?                 @relation(..., onDelete: SetNull)
  avaliacao     Avaliacao?                @relation(..., onDelete: SetNull)

  @@index([unidadeId, createdAt])
  @@index([configVersionId, createdAt])
  @@index([orcamentoId])
  @@index([pacienteId])
  @@index([avaliacaoId])
}
```

| Aspect | Assessment |
|--------|------------|
| Cascade | Mixed strategy: `Cascade` for unit/config, `SetNull` for optional links -- **excellent** |
| Indexes | Five composite/single indexes -- **excellent** |

**Issues:**
- **[HIGH]** `inputSnapshot` and `outputSnapshot` are required JSON Strings. `minicustosDesativados` is also a JSON String.
- **[MEDIUM]** `source` and `status` are plain Strings.

---

### Observability Models

#### 35. ConfigAuditLog

```prisma
model ConfigAuditLog {
  id              String   @id @default(cuid())
  unidadeId       String
  configVersionId String?
  entidade        String
  entidadeId      String?
  acao            String
  beforeSnapshot  String?
  afterSnapshot   String?
  actorId         String?
  requestId       String?
  createdAt       DateTime @default(now())

  @@index([unidadeId, createdAt])
  @@index([configVersionId, createdAt])
  @@index([entidade, createdAt])
  @@index([requestId])
}
```

| Aspect | Assessment |
|--------|------------|
| Indexes | Four indexes -- **excellent** for audit query patterns |
| Cascade | `onDelete: Cascade` from Unidade, `SetNull` from ConfigVersion -- appropriate |

**Issues:**
- **[HIGH]** `beforeSnapshot` and `afterSnapshot` are JSON Strings.
- **[MEDIUM]** `actorId` is a plain String with no User foreign key.
- **[GOOD]** Intentionally append-only (no `updatedAt`) -- correct for audit logs.

---

#### 36. OrcamentoAuditLog

```prisma
model OrcamentoAuditLog {
  id              String   @id @default(cuid())
  orcamentoId     String
  configVersionId String?
  acao            String
  status          String
  beforeSnapshot  String?
  afterSnapshot   String?
  diffSnapshot    String?
  inputHash       String?
  requestId       String?
  createdBy       String?
  createdAt       DateTime @default(now())

  @@index([orcamentoId, createdAt])
  @@index([configVersionId, createdAt])
  @@index([acao, createdAt])
  @@index([status, createdAt])
  @@index([requestId])
}
```

| Aspect | Assessment |
|--------|------------|
| Indexes | Five indexes -- **excellent** |
| Cascade | `onDelete: Cascade` from Orcamento -- appropriate |
| Design | Includes `diffSnapshot` for change tracking -- good |

**Issues:**
- **[HIGH]** `beforeSnapshot`, `afterSnapshot`, and `diffSnapshot` are JSON Strings.
- **[MEDIUM]** `createdBy` is a plain String with no User foreign key.
- **[GOOD]** Append-only pattern. Excellent index coverage.

---

#### 37. SystemLog

```prisma
model SystemLog {
  id        String   @id @default(cuid())
  type      String
  action    String
  message   String
  metadata  String?
  stack     String?
  userId    String?
  unidadeId String?
  requestId String?
  ipAddress String?
  userAgent String?
  duration  Int?
  createdAt DateTime @default(now())

  unidade Unidade? @relation(fields: [unidadeId], references: [id])

  @@index([type])
  @@index([action])
  @@index([requestId])
  @@index([createdAt])
  @@index([type, createdAt])
  @@index([unidadeId, createdAt])
}
```

| Aspect | Assessment |
|--------|------------|
| Indexes | Six indexes -- **excellent** for log querying and filtering |
| Fields | Comprehensive: type, action, correlation ID, IP, user agent, duration |

**Issues:**
- **[HIGH]** `metadata` is a JSON String.
- **[MEDIUM]** `type` should be an enum (`ERROR`, `INFO`, `WARNING`, `WHATSAPP`, `DEBUG`).
- **[MEDIUM]** `userId` is a plain String -- no User model to reference.
- **[GOOD]** Append-only (no `updatedAt`). Excellent index coverage for log analysis. `duration` field for performance tracking is a strong design choice.

---

## Cross-Cutting Concerns

### 1. Authentication and Authorization (CRITICAL)

There is **no `User` model** anywhere in the schema. Multiple models reference user identity through plain String fields:

| Model | Field | Purpose |
|-------|-------|---------|
| Avaliacao | `avaliadorId` | Who performed the evaluation |
| Orcamento | `createdBy` | Who created the budget |
| Orcamento | `aprovadoPor` | Who approved the budget |
| UnidadeConfiguracaoVersao | `createdBy` | Who created the config version |
| UnidadeContratoTemplate | `createdBy` | Who created the template |
| OrcamentoSimulacao | `createdBy` | Who ran the simulation |
| ConfigAuditLog | `actorId` | Who performed the audited action |
| OrcamentoAuditLog | `createdBy` | Who made the change |
| SystemLog | `userId` | Who triggered the log event |

All nine of these fields lack referential integrity. The application currently authenticates via environment variables, meaning there is no database-backed user management, no role-based access control at the data level, and no audit trail that can be joined to a user record.

### 2. Database Provider (CRITICAL)

The schema uses `provider = "sqlite"`. SQLite limitations that directly impact this application:

- **No concurrent writes:** SQLite uses file-level locking. A multi-user caregiving platform will experience write contention.
- **No native JSON type:** All JSON-in-String fields cannot leverage `@db.Json` or JSON path queries.
- **No array types:** Fields like WhatsAppWebhook `events` and WhatsAppContact `labels` cannot use native arrays.
- **No `@db.VarChar` constraints:** String fields have no length limits, preventing data validation at the database level.
- **No enum column type:** Prisma enums on SQLite are enforced only at the application layer, not the database.
- **Limited ALTER TABLE:** Schema migrations are more constrained.

### 3. Soft Delete Pattern (HIGH)

The following core business models lack a `deletedAt DateTime?` field:

- **Cuidador** -- Caregiver records with associated allocations and messages
- **Paciente** -- Patient records with the highest number of relations (5 child sets)
- **Avaliacao** -- Clinical evaluations (potentially regulated data)
- **Orcamento** -- Financial quotes/budgets
- **Alocacao** -- Scheduling allocations

Hard-deleting any of these records risks data loss, broken audit trails, and potential regulatory non-compliance for healthcare data.

### 4. JSON-in-String Anti-Pattern (HIGH)

**31 fields** across 11 models store structured data as serialized JSON Strings:

| Model | Fields |
|-------|--------|
| Avaliacao | `dadosDetalhados` |
| Orcamento | `cenarioEconomico`, `cenarioRecomendado`, `cenarioPremium`, `cenarioSelecionado`, `snapshotInput`, `snapshotOutput`, `planningInput`, `normalizedSchedule`, `pricingBreakdown`, `minicustosDesativados` |
| OrcamentoSimulacao | `inputSnapshot`, `outputSnapshot`, `minicustosDesativados` |
| FormSubmission | `dados` |
| WhatsAppSession | `data` |
| WhatsAppFlowState | `data` |
| WhatsAppFlowDefinition | `definition` |
| WhatsAppMessage | `metadata` |
| WhatsAppAnalytics | `metadata` |
| ConfigAuditLog | `beforeSnapshot`, `afterSnapshot` |
| OrcamentoAuditLog | `beforeSnapshot`, `afterSnapshot`, `diffSnapshot` |
| SystemLog | `metadata` |
| UnidadeContratoTemplate | `placeholders` |

**Impact:** No database-level validation, no indexed querying on nested fields, no schema evolution tracking, and no type safety for downstream consumers.

### 5. Missing Enum Types (MISSING)

At least **20 String fields** across the schema represent finite sets of values and should use Prisma `enum` types:

| Field Pattern | Observed Defaults / Values |
|---------------|---------------------------|
| Cuidador.status | `"CRIADO"` |
| Paciente.status | `"LEAD"` |
| Paciente.tipo | `"HOME_CARE"` |
| Paciente.prioridade | `"NORMAL"` |
| Avaliacao.status | `"PENDENTE"` |
| Orcamento.status | `"RASCUNHO"` |
| Orcamento.moeda | `"BRL"` |
| Alocacao.status | `"PENDENTE_FEEDBACK"` |
| Mensagem.direcao | (inbound/outbound) |
| WhatsAppSession.state | `"MENU"` |
| WhatsAppSession.status | `"DISCONNECTED"` |
| WhatsAppMessage.direction | (inbound/outbound) |
| WhatsAppMessage.type | (text/image/document/etc.) |
| WhatsAppMessage.status | `"sent"` |
| WhatsAppScheduled.status | `"pending"` |
| WhatsAppQueueItem.status | `"pending"` |
| WhatsAppTemplate.category | (category values) |
| OrcamentoSimulacao.source | `"ADMIN"` |
| OrcamentoSimulacao.status | `"RASCUNHO"` |
| SystemLog.type | `"ERROR"`, `"INFO"`, `"WARNING"`, `"WHATSAPP"`, `"DEBUG"` |

### 6. SQL Naming Conventions (LOW)

No `@@map` or `@map` directives are used. Prisma model and field names are used directly as table and column names. This means:

- PascalCase table names (e.g., `WhatsAppQueueItem` instead of `whatsapp_queue_items`)
- camelCase column names (e.g., `configVersionId` instead of `config_version_id`)

While functional, this deviates from SQL conventions and may cause friction with direct SQL queries, reporting tools, or BI integrations.

---

## Recommendations

### Priority 1 -- Critical (Address Before Production)

| # | Action | Effort |
|---|--------|--------|
| 1 | **Migrate from SQLite to PostgreSQL.** Update `provider` to `"postgresql"`, add `@db.VarChar()` limits, convert JSON String fields to `Json` type, and add native enums. | High |
| 2 | **Create a `User` model** with at minimum: `id`, `email`, `name`, `role`, `hashedPassword`, `createdAt`, `updatedAt`. Convert all `createdBy`, `aprovadoPor`, `actorId`, `avaliadorId`, and `userId` fields to proper foreign key relations. | High |

### Priority 2 -- High (Address in Next Sprint)

| # | Action | Effort |
|---|--------|--------|
| 3 | **Add `deletedAt DateTime?`** to Cuidador, Paciente, Avaliacao, Orcamento, and Alocacao. Implement soft delete middleware in Prisma. | Medium |
| 4 | **Decompose `Avaliacao.dadosDetalhados`** into proper relational tables for clinical data (discovery, patient profile, clinical scores). | High |
| 5 | **Define Prisma `enum` types** for all status, type, direction, and category fields. Start with the most-queried fields: `Paciente.status`, `Orcamento.status`, `Alocacao.status`. | Medium |
| 6 | **Convert snapshot/metadata fields to `Json` type** after PostgreSQL migration. For fields that should remain serialized (audit snapshots), document the decision. | Medium |

### Priority 3 -- Medium (Address in Backlog)

| # | Action | Effort |
|---|--------|--------|
| 7 | **Add `onDelete` rules to Mensagem** relations: `onDelete: SetNull` for both `cuidadorId` and `pacienteId`. | Low |
| 8 | **Add foreign key relations to FormSubmission.** Link `telefone` to Paciente or Cuidador, or add explicit `pacienteId`/`cuidadorId` fields. | Low |
| 9 | **Encrypt `WhatsAppWebhook.secret`** at the application layer or use a database encryption extension. | Medium |
| 10 | **Connect WhatsAppLabel to WhatsAppContact** via a many-to-many join table (`WhatsAppContactLabel`), replacing the String `labels` field. | Medium |
| 11 | **Add missing indexes** on Mensagem (`telefone`, `timestamp`), Alocacao (`cuidadorId`, `status`, `dataInicio`), Paciente (`status`), and Cuidador (`status`). | Low |

### Priority 4 -- Low (Housekeeping)

| # | Action | Effort |
|---|--------|--------|
| 12 | **Add `@@map` / `@map` directives** for SQL naming conventions if direct SQL access or BI tools are planned. | Medium |
| 13 | **Add `updatedAt DateTime @updatedAt`** to models that are missing it: Mensagem, Avaliacao, Orcamento, Alocacao, FormSubmission, WhatsAppBlacklist. | Low |
| 14 | **Add `@db.VarChar` limits** to all String fields after PostgreSQL migration. Prioritize user-input fields (telefone, nome, email). | Medium |
| 15 | **Review `effectiveAt` vs `effectiveFrom`** on UnidadeConfiguracaoVersao for potential redundancy. | Low |

---

## Appendix: Model Count Verification

| Domain | Models | Count |
|--------|--------|-------|
| Core Business | Cuidador, Paciente, Mensagem, Avaliacao, Orcamento, Alocacao, FormSubmission | 7 |
| WhatsApp Infrastructure | WhatsAppSession, WhatsAppFlowState, WhatsAppLock, WhatsAppCooldown, WhatsAppContact, WhatsAppMessage, WhatsAppTemplate, WhatsAppQuickReply, WhatsAppAutoReply, WhatsAppScheduled, WhatsAppQueueItem, WhatsAppLabel, WhatsAppBlacklist, WhatsAppWebhook, WhatsAppFlowDefinition, WhatsAppSetting, WhatsAppAnalytics | 17 |
| Enterprise Pricing | Unidade, UnidadeConfiguracaoVersao, UnidadeDoencaRegra, UnidadeRegraHora, UnidadeTaxaPagamento, UnidadeMinicusto, UnidadePercentualComissao, UnidadeDescontoPreset, UnidadeContratoTemplate, OrcamentoSimulacao | 10 |
| Observability | ConfigAuditLog, OrcamentoAuditLog, SystemLog | 3 |
| **Total** | | **37** |

---

*End of audit report.*
