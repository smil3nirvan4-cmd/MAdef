---
description: ui-color-audit-and-palette
---
Objetivo: corrigir contraste e definir uma paleta completa e consistente.

Entradas conhecidas:
- Primária atual aproximada: #229394
- Sidebar: #2E343E
- Background: #E1E7EF

Tarefas:
1) Levantar todas as cores reais usadas (CSS vars + classes + hard-coded).
2) Identificar falhas WCAG AA (texto normal e pequeno).
3) Propor:
   - escala primary (50–950) mantendo identidade teal
   - escala neutral (50–950) para fundo/cards/bordas/textos
   - cores semânticas: success/warning/danger/info (50–950)
4) Definir “roles” semânticos:
   - background / foreground
   - card / card-foreground
   - muted / muted-foreground
   - primary / primary-foreground
   - border / ring / input
5) Entregar em docs/ui-audit/01-colors.md:
   - tabela antes/depois (hex)
   - justificativas
   - regras de uso (do/don’t)
   - notas de acessibilidade

Critérios de aceite:
- A paleta garante AA para textos comuns.
- Tokens semânticos definidos.
