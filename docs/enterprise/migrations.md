# Migrations Enterprise - Guia Operacional

## Contexto

Quando `prisma migrate dev` falhar por problema de shadow DB, usar fluxo nao destrutivo:

1. Gerar migration `create-only` com SQL rastreavel.
2. Aplicar `prisma db push` somente no ambiente de desenvolvimento local.
3. Manter migration versionada no repositorio para auditoria.

## Migration atual (Prompt 2)

- `prisma/migrations/20260218235500_pr3_effective_range_orcamento_audit/migration.sql`

Escopo:
- vigencia de configuracao por unidade (`effectiveFrom`, `effectiveTo`)
- metadados de auditoria em `Orcamento` (`auditHash`, `createdBy`)
- nova trilha `OrcamentoAuditLog` para recalc/divergencia

## Passos recomendados em dev

```bash
npx prisma migrate dev --create-only --name pr3_effective_range_orcamento_audit
npx prisma db push
npx prisma generate
```

Se `prisma generate` falhar por lock de arquivo no Windows (`EPERM`), fechar processos que usem Prisma Client
e repetir o comando.
