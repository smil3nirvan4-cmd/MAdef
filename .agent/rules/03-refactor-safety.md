# Refactor Safety Rules (Large UI overhaul)

1) Fazer mudanças em etapas pequenas e revisáveis.
2) Sempre gerar um plano e pedir validação quando a mudança for ampla.
3) Antes de mudanças grandes:
   - identificar arquivos impactados
   - propor estratégia incremental
4) Não rodar comandos destrutivos.
   - Qualquer comando que delete/limpe/force precisa de confirmação explícita do usuário.
5) Preferir reutilizar o sistema existente (Tailwind/config). Não introduzir libs novas sem justificar.
6) Sempre produzir:
   - Diff claro
   - Passos de teste
   - Screenshots antes/depois (via Browser).
