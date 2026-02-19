ALTER TABLE "Orcamento" ADD COLUMN "planningInput" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN "normalizedSchedule" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN "pricingBreakdown" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN "calculationHash" TEXT;
ALTER TABLE "Orcamento" ADD COLUMN "engineVersion" TEXT;

CREATE INDEX "Orcamento_calculationHash_idx" ON "Orcamento"("calculationHash");

ALTER TABLE "OrcamentoSimulacao" ADD COLUMN "inputHash" TEXT;
ALTER TABLE "OrcamentoSimulacao" ADD COLUMN "engineVersion" TEXT;
