# Guia de Contribuição — MAdef

## Configuração do Ambiente

### Pré-requisitos

- Node.js >= 20
- npm
- Git

### Setup

```bash
git clone https://github.com/smil3nirvan4-cmd/MAdef.git
cd MAdef
cp .env.example .env
# Configure as variáveis em .env
npm install
npx prisma db push
npm run dev
```

## Git Workflow

### Branches

- `main` — Branch principal, sempre estável
- `develop` — Branch de desenvolvimento (quando existir)
- `feature/nome-da-feature` — Features novas
- `fix/descricao-do-bug` — Correções de bugs
- `chore/descricao` — Tarefas de manutenção

### Convenção de Commits

Formato: `tipo: descrição curta em português`

Tipos:
- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `refactor:` — Refatoração sem mudança de comportamento
- `docs:` — Documentação
- `test:` — Testes
- `chore:` — Manutenção, dependências, CI
- `style:` — Formatação, espaçamento
- `perf:` — Otimização de performance

Exemplos:
```
feat: adicionar filtro por status na listagem de pacientes
fix: corrigir cálculo de precificação para turnos noturnos
refactor: extrair lógica de validação de telefone para módulo separado
test: adicionar testes para motor de precificação enterprise
```

## Código

### Estilo

- TypeScript strict mode — sem `any` quando possível
- ESLint configurado — `npm run lint`
- Tailwind CSS v4 para estilos
- Componentes React em PascalCase
- Módulos lib em camelCase
- Nomes de variáveis, modelos e campos em **português**

### Antes de Submeter

```bash
# Executar verificação completa
npm run check

# Ou individualmente:
npm run check:types    # TypeScript
npm run lint           # ESLint
npm run test:ci        # Testes
npm run build          # Build
```

### Testes

- Testes unitários co-localizados com o código fonte (`*.test.ts`)
- Use Vitest para novos testes
- Mínimo: teste caso de sucesso, validação, e caso de erro
- Execute: `npm test` (watch) ou `npm run test:ci` (CI)

## Pull Requests

### Checklist do PR

- [ ] Código segue as convenções do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] `npm run check` passa sem erros novos
- [ ] `npm run build` funciona
- [ ] Documentação atualizada (se aplicável)

### Template do PR

```markdown
## O que mudou

Descrição clara da mudança.

## Por que

Motivação e contexto.

## Como testar

Passos para verificar a mudança.

## Checklist

- [ ] Testes adicionados
- [ ] Verificação de tipos passa
- [ ] Build funciona
```

## Estrutura de Código

### Adicionando um novo endpoint API

1. Crie `src/app/api/[dominio]/route.ts`
2. Use `withErrorBoundary()` para tratamento de erros
3. Use `guardCapability()` para verificação de permissão
4. Valide input com Zod
5. Use helpers de resposta: `ok()`, `fail()`, `paginated()`
6. Adicione rate limiting quando apropriado

```typescript
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';

export const GET = withErrorBoundary(async (request) => {
  const guard = await guardCapability('VIEW_PACIENTES');
  if (guard instanceof Response) return guard;

  // ... lógica do endpoint
  return ok(data);
});
```

### Adicionando um novo componente UI

1. Crie em `src/components/ui/NomeComponente.tsx`
2. Use TypeScript com props tipadas
3. Use Tailwind CSS para estilos
4. Adicione `"use client"` se necessário
5. Exporte como default

### Adicionando um novo handler WhatsApp

1. Crie em `src/lib/whatsapp/handlers/nome-handler.ts`
2. Registre no `src/lib/whatsapp/handlers/index.ts`
3. Implemente a interface de handler existente
4. Adicione testes

## Segurança

- **Nunca** commite `.env`, `auth_info/`, `.wa-session.json`, `.wa-state.json`
- **Nunca** use `eval()`, `Function()`, `dangerouslySetInnerHTML` sem sanitização
- **Sempre** valide input do usuário com Zod
- **Sempre** verifique permissões em endpoints de mutação
- **Sempre** use `prisma` (ORM) em vez de SQL raw
