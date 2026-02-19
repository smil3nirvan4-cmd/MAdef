-- Hotfix marker for Orcamento audit hash drift.
-- Column creation is performed by 20260218235500_pr3_effective_range_orcamento_audit.
-- This migration is safe to re-run and guarantees index presence for audit lookups.
CREATE INDEX IF NOT EXISTS "Orcamento_auditHash_fix_idx" ON "Orcamento"("auditHash");
