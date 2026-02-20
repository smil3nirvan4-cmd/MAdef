---
description: ui-component-library-refactor
---
Objetivo: padronizar TODOS os componentes reutilizáveis com estados e acessibilidade.

Escopo mínimo:
- Button (primary/secondary/ghost/destructive)
- Input + Select (se existir)
- Card (base + variants)
- Badge/Tag
- Sidebar item (default/hover/active/focus)
- Topbar search
- Table styles (se existirem)

Tarefas:
1) Identificar onde ficam os componentes compartilhados.
2) Para cada componente:
   - aplicar tokens
   - garantir focus-visible
   - garantir disabled/hover/active
   - garantir tamanho de alvo e aria quando aplicável
3) Criar uma página /admin/styleguide (ou /styleguide) com exemplos visuais dos componentes.

Critérios de aceite:
- Existe uma página de styleguide mostrando estados.
- Screenshot BEFORE/AFTER dessa página.
