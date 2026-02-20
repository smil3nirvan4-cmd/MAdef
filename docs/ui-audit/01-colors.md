# 01 - Color & Contrast Palette

**Data da Auditoria e Implementação:** 20/02/2026
**Objetivo:** Eliminar falhas de acessibilidade (WCAG AA) causadas por tons "lavados" e estabelecer uma paleta "Calm & Modern" perfeitamente escalada para o Admin B2B (estilo Linear/Stripe). 

## 1. Mapeamento de Cores e Resolução de Problemas
O diagnóstico inicial (`00-baseline.md`) revelou que:
- O teal antigo (`#229494`) não passava em WCAG AA contra texto branco (Contraste de ~3.6:1).
- Os textos secundários `neutral-400` fundiam-se com fundos claros, falhando miseravelmente para legibilidade contínua de tabelas.
- O azul de fundo da sidebar (`#1e293b`) pesava o layout.

## 2. A Nova Paleta (Tokens HSL/Hex Enterprise)

### Primeária (Clinical Depth Teal - `0F766E`)
Deslocamos a identidade da marca para um Teal super denso. Isso nos permite usar branco (`#ffffff`) por cima de qualquer botão ou badge e passar com facilidade do patamar WCAG AA.
- `--primary-50:` `#f0fdfa` (Fundo sutil, hover state suave)
- `--primary-300:` `#5eead4` (Anéis de foco / Rings)
- `--primary-700:` `#0f766e` (**A cor da Marca e Fundo Primário**)
- `--primary-800:` `#115e59` (Estado de Hover e "Pressed" nos botões)

### Escala Neutral (Calm Slate)
Substituímos o fundo muito estourado (`#f8fafc`) por uma escala cadenciada.
- `--background:` `#f8fafc` (O fundo oficial, neutro iluminado, descola dos cards brancos).
- `--card:` `#ffffff` (O plano principal de leitura limpa).
- `--muted-foreground:` `#475569` (Substitui o antigo `#94a3b8`, passando o contraste para leituras em listas).

## 3. Papéis Semânticos Mapeados no Tailwind v4
Para garantir que desenvolvedores nunca errem ao importar as cores (ex: "Devo usar texto azul ou preto?"), expusemos o `theme inline` contendo apelos absolutos na raiz do `globals.css`:
- `bg-background`
- `bg-card` e `text-card-foreground`
- `bg-primary` e `text-primary-foreground`
- `text-muted-foreground`
- `border-border` e `ring-ring`

## 4. Próximo Passo
Com a fundação de contraste pronta, devemos amarrar a métrica exata de leitura via **Tipografia**.
