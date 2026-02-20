# 02 - Typography System

**Data da Auditoria e Implementação:** 20/02/2026
**Objetivo:** Elevar a tipografia do Admin a padrões Enterprise B2B exigentes (alta densidade de dados, foco profundo) eliminando cinzas apagados e mantendo legibilidade absoluta. 

## 1. Família Tipográfica e Problemas Resolvidos
O Admin utiliza `Inter`. A fonte é perfeita para cenários Enterprise, no entanto a **escala** e a **cor** falhavam:
- O contraste em descrições era muito baixo (falha WCAG).
- Diferenciação visual entre Títulos de Painéis e Títulos de Cards era confusa, gerando ruído excessivo de tamanhos na tela.

## 2. A Nova Escala Semântica Enterprise (globals.css)
Estruturamos regras globais no CSS reduzindo o tamanho base para o sweet-spot de dashboards (`14px`) em vez de inflar os elementos.
- **Page Title (`H1`):** `24px` / `line-height 32px` / Semibold. Letras apertadas (`-0.025em`) para ar premium.
- **Section Title (`H2`):** `18px` / `line-height 28px` / Semibold.
- **Card Title (`H3`):** `14px` / `line-height 20px` / Semibold.
- **Body (`14px` padrão):** Font weight regular / Medium. É a âncora do sistema para qualquer formulário.
- **Label (`13px`):** Para títulos de formulários e filtros. Menor que o body para focar atenção no dado inserido.
- **Caption/Helper (`12px`):** Texto de apoio sutil, agora mapeado para a cor `--muted-foreground` (`#475569`) para garantir o contraste AA obrigatório.
- **Table Data / Numbers:** Habilitado `font-variant-numeric: tabular-nums` via classe auxiliar (`tabular-nums`) e default global nas tags `td` para perfeito alinhamento de colunas em numerais no grid `/pacientes`.

## 3. Diretrizes de Uso Expresso ("Do's and Don'ts")
- **DON'T:** Reutilizar textos muito claros tentando dar "leveza" a tela. A hierarquia agora se faz pelo peso e tamanho, não diluindo a cor (WCAG AA Strict).
- **DO:** Usar a classe `.text-body` ou deixar que a herança lide com o texto normal. A tag `body` base agora propaga o novo contraste via variável direta `--foreground` e `--background`.

## 4. Próximo Passo
A malha visual (cor) e a textura (tipografia) estão solidificadas globalmente. O passo prático massivo começa no Workflow 4: limpar todos os componentes arcaicos "Hardcoded" para que consumam as novas variáveis do Tailwind no arquivo nativo Next.js.
