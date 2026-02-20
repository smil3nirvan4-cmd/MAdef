# 00 - Baseline & Audit Map

**Data da Auditoria:** 20/02/2026
**Objetivo:** Estabelecer o marco zero visual e estrutural do Admin antes da aplicação do Design System B2B "Calm & Modern".

## 1. Stack e Arquitetura Identificada
- **Framework:** Next.js (App Router)
- **Estilização:** Tailwind CSS (Custom config via CSS variables no `globals.css`)
- **Linguagem:** TypeScript
- **UI Libs Externas:** Nenhuma biblioteca de componentes pré-construída (como Shadcn) dominando globalmente. A maioria dos elementos primitivos reside em `src/components/ui/` ou está solta nos arquivos de página.

## 2. Inventário de Páginas (Superfícies Principais)
O Admin é composto pelas seguintes interfaces chave:
1. `/admin/dashboard`: Visão geral, KPIs, e atalhos de navegação (Cards).
2. `/admin/pacientes`: Listagem densa de dados em tabelas + filtros laterais/superiores.
3. `/admin/avaliacoes/nova`: Formulário ultra-complexo e extenso (Wizard de 9 passos contendo chips, segmented controls, textareas, e seletores rádio).
4. `/admin/logs`: Visualização "crua" e tabular de dados do sistema, exigindo leitura extensa.

## 3. Inventário de Componentes Primitivos (Core)
- **Button:** Fragmentado em usos utilitários sem um sistema central forte de variantes (ghost, outline, destrutivo).
- **Input / Select:** Possuem `h-10` na listagem, mas carecem de padronização nas telas de cadastro. Bordas pesadas.
- **Card / SectionCard:** Aplicam sombras variadas (`shadow-sm`, `shadow-md`) e bordas arredondadas exageradas (até `rounded-2xl` dependendo da tela).
- **Badge / Chip:** Possuem bordas escuras em listagens vazias, gerando aspecto de protótipo.
- **Table / DataTable:** Não usam largura total, sofrem com hierarquia tipográfica apagada (`neutral-400` vs background branco).

## 4. Problemas de UX e Legibilidade Observados
### Contraste e Espaçamento:
- A interface sofre com uma "paleta azul/cinza pesada" em fundo e sidebar, porém esvaziada de hierarquia forte de leitura.
- O texto cinza claro "muted" não passa em acessibilidade WCAG AA sobre branco.
- O espaço da página, especialmente em `/pacientes`, não é bem aproveitado (conteúdo encolhido no centro com área vazia desperdiçada).

### Inconsistências de Estilo:
- **Border Radius:** Variância entre `.rounded-sm` e `.rounded-2xl`. Em sistemas Enterprise, a previsibilidade (um raio de `8px` a `12px` global) é imperativa.
- **Hierarquia:** Gradientes desnecessários e exageros chamam atenção na topbar, mas botões primários ficam ofuscados por não terem contraste WCAG contra o texto embutido neles.

## 5. Captura Visual (Before)
O Browser Subagent navegou e registrou a rota `/admin/dashboard` para registrar o "estado wireframe/lavado" antes deste redesign:

![Dashboard Before Redesign](file:///C:/Users/marcus/.gemini/antigravity/brain/f912e589-af25-43d3-a93e-7a71a575a072/baseline_admin_dashboard_1771563036175.webp)

## 6. Riscos do Refatoramento
- **Rupturas de Layout:** Transformar tabelas centrais em telas Full Width pode quebrar limites em modais soltos caso o flexbox não esteja amarrado globalmente.
- **Side effects:** Mudar variáveis CSS que hoje resolvem um problema local temporário (como a cor do texto de logs) no `globals.css` sem testar em todos os componentes. *(Mitigado pelo typescript typechecker).*
