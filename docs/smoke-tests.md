# Smoke Tests

## Pre-requisitos
- [ ] `npm run dev` iniciado sem erros
- [ ] Bridge iniciado (`node whatsapp-bridge/server.js`)
- [ ] Variaveis de ambiente configuradas com base em `.env.example`

## Auth + RBAC
- [ ] `GET /admin` sem login redireciona para `/login`
- [ ] Login `LEITURA`: `GET /admin/whatsapp/contacts` retorna 200
- [ ] Login `LEITURA`: `POST /api/admin/whatsapp/chat` retorna 403 + `FORBIDDEN`
- [ ] Login `OPERADOR`: `POST /api/admin/avaliacoes/{id}/send-contrato` retorna 403
- [ ] Login `FINANCEIRO`: `POST /api/admin/avaliacoes/{id}/send-contrato` retorna 200 (ou 400 por validacao)
- [ ] Login `ADMIN`: `GET /api/whatsapp/data-dump` retorna 200
- [ ] Login `OPERADOR`: `GET /api/whatsapp/data-dump` retorna 403

## Webhook security
- [ ] `POST /api/whatsapp/webhook` sem assinatura (prod) retorna 401 + `INVALID_SIGNATURE`
- [ ] `POST /api/whatsapp/webhook` com timestamp antigo (> 5min) retorna 401 + `REPLAY_DETECTED`
- [ ] `POST /api/whatsapp/webhook` com assinatura correta retorna 200

## WhatsApp pipeline
- [ ] Enfileirar proposta: item aparece em `/admin/whatsapp/queue` com `pending`
- [ ] Worker processa: item vira `sent` e logs aparecem no drilldown
- [ ] Drilldown `/admin/whatsapp/queue/[id]`: timeline + logs correlatos com IDs
- [ ] Forcar falha no bridge: item vira `retrying` com `scheduledAt` futuro
- [ ] 5 falhas 5xx seguidas: `GET /api/admin/whatsapp/circuit-status` retorna `OPEN`
- [ ] 5 retries item: status final `dead`
- [ ] `POST /api/admin/whatsapp/queue/[id]/retry` cria novo item `pending`
- [ ] `POST /api/admin/whatsapp/queue/[id]/cancel` em item `dead` seta `canceled`

## Observabilidade
- [ ] Toda resposta admin possui `x-request-id`
- [ ] Logs em `SystemLog` possuem `metadata.requestId`
- [ ] `GET /api/admin/_debug/routes` funciona em `development`

## API contracts
- [ ] `GET /api/admin/whatsapp/queue` retorna `{ success, data, pagination, meta }`
- [ ] `GET /api/admin/whatsapp/queue?page=999` retorna `data: []` com `pagination.total` correto
- [ ] `GET /api/admin/whatsapp/queue/{id-invalido}` retorna 404 + `NOT_FOUND`
- [ ] `GET /api/admin/auth/me` retorna `{ role, capabilities }`

## UI admin
- [ ] `/admin/whatsapp?tab=templates` redireciona para `/admin/whatsapp/templates`
- [ ] `/admin/avaliacoes` usa DataTable com paginação/filtros/export CSV
- [ ] `/admin/avaliacoes?sort=createdAt:asc` mantém ordenação após reload
- [ ] `/admin/avaliacoes/[id]` com role sem capability mostra botões desabilitados
- [ ] `/admin/pacientes/[id]` mostra histórico WhatsApp filtrado por telefone
- [ ] `/admin/logs/[id]` exibe metadata e stack

## CI
- [ ] `npm run check` passa (types + lint + tests)
- [ ] `npm run build` passa em produção

