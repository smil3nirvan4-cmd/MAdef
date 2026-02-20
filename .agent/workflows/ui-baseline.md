---
description: ui-baseline
---
Objetivo: criar baseline verificável do estado atual antes do redesign.

Tarefas:
1) Identificar stack (Next/React, Tailwind, libs de UI, estrutura de pastas).
2) Localizar:
   - layout principal do admin (sidebar/topbar)
   - página do dashboard
   - componentes reutilizáveis (Button/Card/Input/etc)
   - tema atual (globals.css, tailwind config, tokens existentes).
3) Iniciar o app (usar o package manager existente) e abrir no Browser integrado:
   - /admin/dashboard (ou rota equivalente)
4) Capturar Artifacts:
   - Screenshot BEFORE (desktop)
   - Browser Recording rápido: navegar sidebar → voltar dashboard.
5) Gerar um relatório em Markdown (docs/ui-audit/00-baseline.md) com:
   - lista de páginas do Admin
   - inventário de componentes
   - problemas de contraste/legibilidade observados
   - inconsistências (spacing/radius/shadows/estados)
   - riscos do refactor
6) Encerrar com um Task List e um Implementation Plan incremental (marcos).

Critérios de aceite:
- Existe 1 screenshot before + 1 recording before.
- Existe relatório baseline com inventário e plano.
