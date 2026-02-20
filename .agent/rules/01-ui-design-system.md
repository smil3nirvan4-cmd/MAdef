# Antigravity UI/UX Design System Rules (Admin)

Objetivo: reestruturar layout, cores, tipografia e componentes com consistência rigorosa.

Regras obrigatórias:
1) NUNCA usar cores hard-coded no JSX/TSX. Toda cor deve vir de tokens (CSS variables) e papéis semânticos (ex.: --primary, --muted-foreground).
2) Usar papéis semânticos e escalas (ex.: primary-50..950, neutral-50..950). Mapear via Tailwind config.
3) Contraste mínimo WCAG AA:
   - Texto normal: >= 4.5:1
   - Texto grande (>= 18pt ou 14pt bold): >= 3:1
4) Estados obrigatórios em componentes interativos:
   - hover, active, focus-visible, disabled, loading (quando aplicável)
   - foco sempre visível (ring + offset).
5) Gradientes:
   - permitidos SOMENTE em superfícies grandes (header/hero/background de seção).
   - proibido gradiente em botões por padrão.
6) Tipografia:
   - Fonte padrão: Inter (ou a atual do projeto).
   - Definir escala tipográfica explícita (H1/H2/H3/CardTitle/Body/Caption/Label).
7) Espaçamento:
   - 8pt grid (múltiplos de 4/8).
   - padding/margins devem vir de uma escala definida.
8) Não alterar lógica de negócio / backend / auth. Apenas UI (layout, estilos, componentes) e, se necessário, pequenos ajustes de markup para acessibilidade.
