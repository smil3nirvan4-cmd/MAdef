# Definition of Done - Enterprise Engine

Status da rodada:

- [x] PRD tecnico consolidado (`docs/enterprise/PRD.md`)
- [x] Recurrence engine deterministico com edge cases
- [x] Pricing engine com breakdown auditavel e invariantes
- [x] API `/api/orcamento` com modo enterprise + legado
- [x] Input hash canonico e reproducivel
- [x] Config engine com vigencia e fallback default por unidade
- [x] Contratos versionados: endpoints templates/render + geracao por orcamento
- [x] PDF em runtime Node usando fontes TTF locais
- [x] Recalculate com diff estruturado e recomendacao (`OK/WARNING/BREAKING`)
- [x] Relatorio de precificacao com filtros + export CSV
- [x] Rate limit em endpoints criticos (`orcamento`, `recalculate`, `contrato`)
- [x] Feature flag por unidade para enterprise pricing

Checklist de validacao tecnica:

- [x] `npx.cmd tsc --noEmit`
- [x] `npx.cmd vitest run` (31 files, 184 testes passados, validado em 2026-02-19)
- [x] `npm.cmd run lint` (sem erros; warnings existentes no baseline)
- [x] `npm.cmd run build`

Metas de testes por dominio (Prompt 12):

- [x] recurrence-engine >= 15 (atual: 16) - `src/lib/scheduling/recurrence-engine.test.ts`
- [x] enterprise-pricing >= 20 (atual: 28) - `src/lib/pricing/calculator.test.ts`, `src/lib/pricing/calculator.enterprise.test.ts`, `src/lib/pricing/enterprise-engine.test.ts`
- [x] config-engine >= 10 (atual: 12) - `src/lib/enterprise/config-engine.test.ts`
- [x] contract rendering >= 10 (atual: 10) - `src/lib/contracts/template-engine.test.ts`
- [x] endpoints >= 10 (atual: 11) - `src/app/api/orcamento/route.test.ts`

Checklist operacional de release:

- [x] migration SQL versionada (`prisma/migrations/20260218235500_pr3_effective_range_orcamento_audit/migration.sql`)
- [x] seed idempotente com tratamento de corrida (`prisma/seed.ts`)
- [x] alternativa para shadow DB documentada (`docs/enterprise/migrations.md`)
- [x] fallback seguro por feature flag
- [x] rollback via `ENTERPRISE_PRICING_ENABLED=false`

Seguranca operacional (Prompt 11):

- [x] varredura `rg "localhost|127.0.0.1|NEXT_PUBLIC_URL" src` executada
- [x] ocorrencias concentradas em testes/utilitarios locais e bridge local (`src/lib/config/public-url.ts`, `src/lib/whatsapp/server.ts`, `src/lib/whatsapp/bridge-config.ts`)
- [x] validacao de URL publica em producao coberta por testes (`src/lib/config/public-url.test.ts`)

Procedimento de migracao (dev e prod):

1. Definir `DATABASE_URL` do ambiente alvo.
2. Executar `npx.cmd prisma migrate status` e confirmar pendencias/drift.
3. Aplicar migrations rastreaveis:
   - padrao: `npx.cmd prisma migrate deploy`
   - se houver falha de SQL especifica do provider (ex.: SQLite):
     - `npx.cmd prisma migrate resolve --rolled-back <migration>`
     - `npx.cmd prisma migrate resolve --applied <migration>`
     - `npx.cmd prisma db execute --schema prisma/schema.prisma --file prisma/migrations/<migration>/migration.sql`
4. Gerar client: `npx.cmd prisma generate`.
5. Validar colunas criticas:
   - `Orcamento.auditHash`
   - `Orcamento.createdBy`
   - `UnidadeConfiguracaoVersao.effectiveFrom/effectiveTo`
   - tabela `OrcamentoAuditLog`

Como validar `dbSchemaOk`:

1. Chamar `GET /api/health` e verificar:
   - `dbSchemaOk: true`
   - `missingColumns: []`
   - `databaseProvider` coerente com o ambiente.
2. Chamar `GET /api/admin/capabilities` (autenticado) e validar os mesmos campos.
3. Confirmar que a UI nao exibe alerta de drift em:
   - `/admin/logs`
   - `/admin/whatsapp`
   - `/admin/avaliacoes/[id]` (botoes de envio habilitados).
