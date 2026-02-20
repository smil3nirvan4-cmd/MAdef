---
description: ui-design-tokens-implementation
---
Objetivo: implementar tokens (cores, radius, shadow, spacing base) no código.

Tarefas:
1) Criar/atualizar tokens em globals.css usando CSS variables (preferir HSL).
2) Mapear tokens no tailwind.config para usar:
   - bg-background, text-foreground, bg-card, text-muted-foreground, etc.
3) Remover hard-coded colors nos componentes principais, migrando para tokens.
4) Definir:
   - radius padrão
   - shadows (3 níveis)
   - ring/focus tokens.
5) Garantir que o build e lint continuem funcionando.

Critérios de aceite:
- Componentes base usam tokens semânticos.
- Não há regressão visual grande sem ser intencional.
- Gerar screenshot AFTER do dashboard para comparação.
