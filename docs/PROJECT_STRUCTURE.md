# MAdef — Project Structure Report

> Generated: 2026-02-23

## Summary

| Category | Count |
|----------|-------|
| Prisma Models | 29 |
| API Endpoints | 67 route files |
| Admin API Endpoints | 53 |
| Public API Endpoints | 14 |
| Admin Pages | 32 |
| UI Components | 19 |
| Lib Modules | 80+ files |
| Test Files | 27 |
| Dependencies | 18 |
| Dev Dependencies | 13 |

## API Endpoints (67 total)

### Admin API (`/api/admin/`) — 53 endpoints

#### Dashboard & Debug
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/_debug/routes` | GET | Admin | Debug route listing |
| `/api/admin/dashboard/stats` | GET | Auth | Dashboard statistics |
| `/api/admin/capabilities` | GET | Auth | Current user capabilities |

#### Patients (Pacientes)
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/pacientes` | GET, POST | Auth | List/create patients |
| `/api/admin/pacientes/[id]` | GET, PUT, DELETE | Auth | Patient CRUD |

#### Evaluations (Avaliacoes)
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/avaliacoes` | GET, POST | Auth | List/create evaluations |
| `/api/admin/avaliacoes/[id]` | GET, PUT, DELETE | Auth | Evaluation CRUD |
| `/api/admin/avaliacoes/[id]/orcamento-preview` | GET | Auth | Budget preview for evaluation |
| `/api/admin/avaliacoes/[id]/preview-document` | GET | Auth | Document preview |
| `/api/admin/avaliacoes/[id]/send-contrato` | POST | Auth | Send contract via WhatsApp |
| `/api/admin/avaliacoes/[id]/send-proposta` | POST | Auth | Send proposal via WhatsApp |
| `/api/admin/avaliacoes/reenviar-whatsapp` | POST | Auth | Resend WhatsApp message |

#### Budgets (Orcamentos)
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/orcamentos` | GET, POST | Auth | List/create budgets |
| `/api/admin/orcamentos/[id]` | GET, PUT, DELETE | Auth | Budget CRUD |
| `/api/admin/orcamentos/[id]/contrato` | GET | Auth | Get contract for budget |
| `/api/admin/orcamentos/[id]/enviar-contrato` | POST | Auth | Send contract |
| `/api/admin/orcamentos/[id]/enviar-proposta` | POST | Auth | Send proposal |
| `/api/admin/orcamentos/[id]/gerar-contrato` | POST | Auth | Generate contract PDF |
| `/api/admin/orcamentos/[id]/gerar-proposta` | POST | Auth | Generate proposal PDF |
| `/api/admin/orcamentos/[id]/recalculate` | POST | Auth | Recalculate pricing |

#### Candidates & Allocations
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/candidatos` | GET, POST | Auth | List/create candidates |
| `/api/admin/candidatos/[id]` | GET, PUT, DELETE | Auth | Candidate CRUD |
| `/api/admin/alocacoes` | GET, POST | Auth | List/create allocations |
| `/api/admin/alocacoes/[id]` | GET, PUT, DELETE | Auth | Allocation CRUD |

#### Users & Logs
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/usuarios` | GET | Auth | List users |
| `/api/admin/usuarios/[telefone]/logs` | GET | Auth | User activity logs |
| `/api/admin/auth/me` | GET | Auth | Current user info |
| `/api/admin/leads` | GET | Auth | List leads |
| `/api/admin/logs` | GET | Auth | System logs |
| `/api/admin/logs/[id]` | GET | Auth | Log detail |

#### Contracts & Reports
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/contratos/render` | POST | Auth | Render contract template |
| `/api/admin/contratos/templates` | GET, POST | Auth | Contract templates |
| `/api/admin/relatorios/precificacao` | GET | Auth | Pricing reports |

#### WhatsApp Admin (18 endpoints)
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/admin/whatsapp/analytics` | GET | Auth | Message analytics |
| `/api/admin/whatsapp/autoreplies` | GET, POST, PUT, DELETE | Auth | Auto-reply rules |
| `/api/admin/whatsapp/blacklist` | GET, POST, DELETE | Auth | Blocked contacts |
| `/api/admin/whatsapp/broadcast` | POST | Auth | Broadcast messages |
| `/api/admin/whatsapp/chat/[phone]` | GET, POST | Auth | Chat with contact |
| `/api/admin/whatsapp/circuit-status` | GET | Auth | Circuit breaker status |
| `/api/admin/whatsapp/contacts` | GET | Auth | Contact list |
| `/api/admin/whatsapp/export` | GET | Auth | Export data |
| `/api/admin/whatsapp/flow-definitions` | GET, POST, PUT, DELETE | Auth | Flow definitions |
| `/api/admin/whatsapp/flows` | GET | Auth | Active flows |
| `/api/admin/whatsapp/labels` | GET, POST, PUT, DELETE | Auth | Contact labels |
| `/api/admin/whatsapp/queue` | GET | Auth | Message queue |
| `/api/admin/whatsapp/queue/[id]` | GET, DELETE | Auth | Queue item |
| `/api/admin/whatsapp/queue/[id]/cancel` | POST | Auth | Cancel queue item |
| `/api/admin/whatsapp/queue/[id]/retry` | POST | Auth | Retry queue item |
| `/api/admin/whatsapp/quick-replies` | GET, POST, PUT, DELETE | Auth | Quick replies |
| `/api/admin/whatsapp/scheduled` | GET, POST, PUT, DELETE | Auth | Scheduled messages |
| `/api/admin/whatsapp/settings` | GET, PUT | Auth | WhatsApp settings |
| `/api/admin/whatsapp/templates` | GET, POST, PUT, DELETE | Auth | Message templates |
| `/api/admin/whatsapp/webhooks` | GET, POST, PUT, DELETE | Auth | Webhook configs |

### Public/Semi-Public API — 14 endpoints

| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | Public | NextAuth handlers |
| `/api/health` | GET | Public | Health check |
| `/api/whatsapp/webhook` | POST | HMAC | WhatsApp webhook receiver |
| `/api/whatsapp/status` | GET | Auth | Bridge connection status |
| `/api/whatsapp/connect` | POST | Auth | Connect to WhatsApp |
| `/api/whatsapp/disconnect` | POST | Auth | Disconnect WhatsApp |
| `/api/whatsapp/pair` | POST | Auth | Pair device |
| `/api/whatsapp/reset-auth` | POST | Auth | Reset WhatsApp auth |
| `/api/whatsapp/messages` | GET | Auth | Message history |
| `/api/whatsapp/queue` | GET | Auth | Public queue view |
| `/api/whatsapp/data-dump` | GET | Admin | Export all WhatsApp data |
| `/api/alocacao/iniciar` | POST | Auth | Start allocation |
| `/api/avaliacoes/hospital` | GET, POST | Auth | Hospital evaluations |
| `/api/orcamento` | POST | Auth | Create budget |
| `/api/pacientes/search` | GET | Auth | Search patients |
| `/api/propostas/enviar` | POST | Auth | Send proposal |

## Pages (32 total)

### Public Pages
- `/` — Landing page
- `/login` — Login page

### Admin Pages (30)
- `/admin` — Admin home
- `/admin/dashboard` — Dashboard with stats
- `/admin/ashboard` — (typo — duplicate dashboard page)
- `/admin/pacientes` — Patient list
- `/admin/pacientes/[id]` — Patient detail
- `/admin/avaliacoes` — Evaluations list
- `/admin/avaliacoes/nova` — New evaluation wizard
- `/admin/avaliacoes/[id]` — Evaluation detail
- `/admin/orcamentos` — Budgets list
- `/admin/orcamentos/novo` — New budget
- `/admin/orcamentos/[id]` — Budget detail
- `/admin/candidatos` — Candidate list
- `/admin/candidatos/[id]` — Candidate detail
- `/admin/cuidadores` — Caregiver list
- `/admin/cuidadores/[id]` — Caregiver detail
- `/admin/alocacao` — Allocation management
- `/admin/leads` — Leads list
- `/admin/leads/[id]` — Lead detail
- `/admin/triagens` — Triage list
- `/admin/formularios` — Form submissions
- `/admin/usuarios` — User management
- `/admin/usuarios/logs/[telefone]` — User logs by phone
- `/admin/logs` — System logs
- `/admin/logs/[id]` — Log detail
- `/admin/whatsapp` — WhatsApp management
- `/admin/whatsapp/[tab]` — WhatsApp tabs (contacts, templates, etc.)
- `/admin/whatsapp/queue` — Message queue
- `/admin/whatsapp/queue/[queueItemId]` — Queue item detail
- `/admin/relatorios/precificacao` — Pricing reports
- `/admin/styleguide` — UI style guide

## Dependencies

### Production (18)
- `@hapi/boom` — HTTP error utilities
- `@prisma/client` — Database ORM
- `@tanstack/react-query` — Server state management
- `@tanstack/react-table` — Data table component
- `@types/pdfkit` — PDF type definitions
- `baileys` — WhatsApp Web API (unofficial)
- `clsx` — Conditional CSS classes
- `date-fns` — Date utilities
- `jimp` — Image processing
- `lucide-react` — Icon library
- `next` — Framework
- `next-auth` — Authentication
- `pdfkit` — PDF generation
- `pino` — Structured logging
- `qrcode` — QR code generation
- `react` / `react-dom` — UI library
- `tailwind-merge` — Tailwind class merging
- `zod` — Runtime validation

### Dev Dependencies (13)
- `@tailwindcss/postcss` — Tailwind PostCSS plugin
- `@testing-library/jest-dom` — DOM test matchers
- `@testing-library/react` — React test utilities
- `@types/node` / `@types/qrcode` / `@types/react` / `@types/react-dom` — Type definitions
- `eslint` + `eslint-config-next` — Linting
- `pino-pretty` — Log formatting
- `prisma` — Schema management CLI
- `tailwindcss` — CSS framework
- `tsx` — TypeScript execution
- `typescript` — Language
- `vitest` — Testing framework

## Notes

- There is a typo: `/admin/ashboard/page.tsx` should likely be removed (duplicate of `/admin/dashboard/page.tsx`)
- WhatsApp bridge is a separate Node.js process in `whatsapp-bridge/`
- The `scripts/` directory contains: `dev-with-whatsapp.cjs`, `diagnose-whatsapp.ts`, `print-routes.mjs`
