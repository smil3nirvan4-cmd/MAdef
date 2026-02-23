# MAdef — Mãos Amigas

**Plataforma de gestão de home care** para gerenciamento de cuidadores, pacientes, avaliações clínicas, precificação e comunicação via WhatsApp.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)

## Funcionalidades

- **Gestão de Pacientes** — Cadastro, triagem, avaliações clínicas (ABEMID, Katz, Lawton)
- **Gestão de Cuidadores** — Cadastro, qualificação, alocação de plantões
- **Precificação Enterprise** — Motor de cálculo multi-unidade com cenários econômico/recomendado/premium
- **Orçamentos & Contratos** — Geração de propostas e contratos em PDF
- **WhatsApp Integrado** — Bot de triagem, envio de propostas/contratos, fila de mensagens
- **Painel Administrativo** — Dashboard, relatórios, logs, gestão de usuários
- **RBAC** — 6 perfis de acesso com 18+ permissões granulares

## Quick Start

### Pré-requisitos

- Node.js >= 20
- npm

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/smil3nirvan4-cmd/MAdef.git
cd MAdef

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com seus valores (ADMIN_EMAIL, ADMIN_PASSWORD, NEXTAUTH_SECRET)

# 3. Instale dependências e configure o banco
npm install                  # Também executa prisma generate
npx prisma db push           # Cria/sincroniza o banco SQLite

# 4. Inicie o servidor de desenvolvimento
npm run dev                  # Next.js + WhatsApp bridge
```

Acesse [http://localhost:3000](http://localhost:3000)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia Next.js + WhatsApp bridge |
| `npm run dev:web` | Inicia apenas o Next.js |
| `npm run build` | Build de produção |
| `npm start` | Inicia em modo produção |
| `npm test` | Executa testes (modo watch) |
| `npm run test:ci` | Executa testes uma vez |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run check` | TypeScript + ESLint + testes |
| `npm run check:types` | Apenas verificação de tipos |
| `npm run db:push` | Sincroniza schema Prisma com banco |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:seed` | Popula banco com dados iniciais |
| `npm run lint` | Executa ESLint |

## Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL do banco de dados (padrão: `file:./dev.db`) |
| `NEXTAUTH_SECRET` | Sim | Secret para criptografia de sessão |
| `ADMIN_EMAIL` | Sim | Email de login do administrador |
| `ADMIN_PASSWORD` | Sim | Senha do administrador |
| `NEXT_PUBLIC_URL` | Sim | URL pública da aplicação |
| `ADMIN_EMAILS` | Não | Lista de emails com perfil Admin |
| `SUPERVISOR_EMAILS` | Não | Lista de emails com perfil Supervisor |
| `WA_BRIDGE_URL` | Não | URL do WhatsApp bridge (padrão: `http://127.0.0.1:3001`) |
| `WA_WEBHOOK_SECRET` | Não | Secret HMAC para webhooks WhatsApp |

Veja `.env.example` para a lista completa.

## Estrutura do Projeto

```
MAdef/
├── prisma/schema.prisma       # Schema do banco (29 modelos)
├── src/
│   ├── app/api/               # 67 endpoints API
│   ├── app/admin/             # 32 páginas administrativas
│   ├── components/            # 19 componentes UI reutilizáveis
│   └── lib/                   # Lógica de negócio
│       ├── api/               # Helpers de API (response, rate-limit, errors)
│       ├── auth/              # RBAC (roles, capabilities, guards)
│       ├── pricing/           # Motor de precificação
│       ├── evaluation/        # Escalas clínicas (ABEMID, Katz, Lawton)
│       ├── whatsapp/          # Cliente WhatsApp, handlers, bot, fila
│       └── observability/     # Logger estruturado, request context
├── whatsapp-bridge/           # Servidor WhatsApp standalone (Baileys)
├── docs/                      # Documentação e auditorias
└── CLAUDE.md                  # Guia completo para desenvolvedores/IA
```

## Perfis de Acesso (RBAC)

| Perfil | Acesso |
|--------|--------|
| **ADMIN** | Acesso total a todas as funcionalidades |
| **SUPERVISOR** | Gestão de pacientes, avaliações, alocações, RH |
| **FINANCEIRO** | Orçamentos, propostas, contratos |
| **RH** | Gestão de cuidadores e candidatos |
| **OPERADOR** | Operação diária, WhatsApp, pacientes |
| **LEITURA** | Visualização somente leitura |

## Testes

```bash
npm test              # Modo watch
npm run test:ci       # Execução única
npm run test:coverage # Com cobertura
```

Testes existentes cobrem: rate-limit, RBAC, validação de telefone, motor de precificação, template engine, circuit breaker, webhook security, conversation bot, e mais.

## Documentação

- [CLAUDE.md](./CLAUDE.md) — Guia completo do codebase para desenvolvedores e IA
- [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) — Mapeamento estrutural detalhado
- [docs/SECURITY_AUDIT.md](./docs/SECURITY_AUDIT.md) — Auditoria de segurança
- [docs/SCHEMA_AUDIT.md](./docs/SCHEMA_AUDIT.md) — Auditoria do schema Prisma
- [docs/CODE_QUALITY_AUDIT.md](./docs/CODE_QUALITY_AUDIT.md) — Auditoria de qualidade de código
- [docs/enterprise.md](./docs/enterprise.md) — Documentação do sistema enterprise
- [docs/whatsapp-bridge-runbook.md](./docs/whatsapp-bridge-runbook.md) — Runbook do WhatsApp bridge

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Linguagem**: TypeScript 5.9 (strict mode)
- **Banco de Dados**: Prisma 6 + SQLite
- **Autenticação**: NextAuth v5 (Credentials)
- **WhatsApp**: Baileys 7 (API não-oficial)
- **Testes**: Vitest 4 + Testing Library
- **CSS**: Tailwind CSS 4
- **Validação**: Zod 4
- **PDF**: PDFKit
- **Ícones**: Lucide React

## Licença

Proprietário — Todos os direitos reservados.
