ALTER TABLE "UnidadeConfiguracaoVersao" ADD COLUMN "effectiveFrom" DATETIME NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
ALTER TABLE "UnidadeConfiguracaoVersao" ADD COLUMN "effectiveTo" DATETIME;

UPDATE "UnidadeConfiguracaoVersao"
SET "effectiveFrom" = COALESCE("effectiveAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "effectiveFrom" = '1970-01-01T00:00:00.000Z';

CREATE INDEX "UnidadeConfiguracaoVersao_unidadeId_isActive_effectiveFrom_effectiveTo_idx"
ON "UnidadeConfiguracaoVersao"("unidadeId", "isActive", "effectiveFrom", "effectiveTo");

ALTER TABLE "Orcamento" ADD COLUMN "auditHash" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN "createdBy" TEXT;

CREATE INDEX "Orcamento_auditHash_idx" ON "Orcamento"("auditHash");

CREATE TABLE "OrcamentoAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orcamentoId" TEXT NOT NULL,
    "configVersionId" TEXT,
    "acao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "diffSnapshot" TEXT,
    "inputHash" TEXT,
    "requestId" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrcamentoAuditLog_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrcamentoAuditLog_configVersionId_fkey" FOREIGN KEY ("configVersionId") REFERENCES "UnidadeConfiguracaoVersao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "OrcamentoAuditLog_orcamentoId_createdAt_idx"
ON "OrcamentoAuditLog"("orcamentoId", "createdAt");

CREATE INDEX "OrcamentoAuditLog_configVersionId_createdAt_idx"
ON "OrcamentoAuditLog"("configVersionId", "createdAt");

CREATE INDEX "OrcamentoAuditLog_acao_createdAt_idx"
ON "OrcamentoAuditLog"("acao", "createdAt");

CREATE INDEX "OrcamentoAuditLog_status_createdAt_idx"
ON "OrcamentoAuditLog"("status", "createdAt");

CREATE INDEX "OrcamentoAuditLog_requestId_idx"
ON "OrcamentoAuditLog"("requestId");
