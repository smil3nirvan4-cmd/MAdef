-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "subjectPhone" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "consentido" BOOLEAN NOT NULL,
    "versaoTermos" TEXT NOT NULL DEFAULT '1.0',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentRecord_subjectPhone_tipo_idx" ON "ConsentRecord"("subjectPhone", "tipo");

-- CreateIndex
CREATE INDEX "ConsentRecord_subjectPhone_createdAt_idx" ON "ConsentRecord"("subjectPhone", "createdAt");
