# PR-1 - Especificacao Fechada de Precificacao Enterprise

## Escopo
Implementar base de dados e contrato funcional para precificacao multi-unidade com configuracao versionada, snapshot de simulacao/orcamento e auditoria.

## Entidades
- `Unidade`: filial/cidade operacional.
- `UnidadeConfiguracaoVersao`: versao imutavel dos parametros de precificacao.
- `UnidadeDoencaRegra`: tabela de doencas com complexidade, profissional minimo e adicional percentual.
- `UnidadeRegraHora`: fator nao linear por hora (`1..12`).
- `UnidadeTaxaPagamento`: taxa percentual por metodo x periodo.
- `UnidadeMinicusto`: custos fixos opcionais/obrigatorios no fechamento.
- `UnidadePercentualComissao`: percentuais incidentes sobre comissao bruta.
- `UnidadeDescontoPreset`: descontos pre-configurados por unidade/versao.
- `UnidadeContratoTemplate`: templates versionados de contrato por unidade.
- `OrcamentoSimulacao`: snapshot deterministico de input/output da simulacao.
- `ConfigAuditLog`: trilha auditavel de alteracoes de configuracao.
- Extensoes em `Orcamento`: referencia de unidade, versao de config e snapshots usados no fechamento.

## Regras de Negocio (ordem de calculo)
1. `R_base = R0_profissional_12h * fatorHoras(h)`.
2. Adicionais sobre `R_base`: segundo paciente, noturno, fim de semana, feriado, alto risco, etc.
3. `R_profissional_total = R_base + adicionais (+ AT/AA conforme flags de escala por horas)`.
4. `lucro = (margemPercent * R_profissional_total) + lucroFixo`.
5. `comissaoBruta = lucro`.
6. `gastosSobreComissao = soma(percentuaisComissaoAtivos) * comissaoBruta`.
7. `imposto = impostoSobreComissaoPercent * comissaoBruta`.
8. `minicustos = soma(minicustos ativos)` com possibilidade de desativar os opcionais no fechamento.
9. `taxaPagamento = taxaPercent(metodo, periodo) * baseTaxa` (base definida pela versao de config).
10. Aplicar desconto preset/manual no ponto definido pela configuracao (`aplicarTaxaAntesDesconto`).
11. `precoFinalCliente = soma componentes`.

## Decisoes Fechadas
- Margem e imposto sao modelados sobre comissao bruta.
- Regra de horas e tabela de doencas sao versionadas por `UnidadeConfiguracaoVersao`.
- Snapshot de simulacao e snapshot final de orcamento sao persistidos em JSON (`inputSnapshot`, `outputSnapshot`).
- Multi-unidade usa heranca operacional por copia de configuracao (matriz -> filial), mantendo versoes independentes.
- Alteracoes de parametros devem gerar `ConfigAuditLog`.

## Criterios de Aceite PR-1
- Schema Prisma contem todas as entidades acima com relacionamentos e indices.
- `Orcamento` referencia unidade e versao usada no fechamento.
- Existe trilha de auditoria de configuracao por unidade.
- Migrations Prisma geradas sem reset destrutivo do banco.
