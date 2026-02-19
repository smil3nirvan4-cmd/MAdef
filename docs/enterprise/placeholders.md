# Placeholders Contratuais (Formal)

Lista base para templates `CLIENTE` e `PRESTADOR`:

- `<<orcamento.id>>`
- `<<paciente.nome>>`
- `<<paciente.telefone>>`
- `<<unidade.nome>>`
- `<<unidade.codigo>>`
- `<<contrato.tipo>>` (`AVULSO`, `SEMANAL`, `MENSAL`, `BIMESTRAL`, `TRIMESTRAL`, `SEMESTRAL`)
- `<<escala.resumo>>`
- `<<datas.inicio>>`
- `<<datas.fim>>`
- `<<preco.prestador>>`
- `<<preco.taxa_maos_amigas>>`
- `<<preco.total>>`
- `<<pagamento.metodo>>`
- `<<pagamento.vencimento>>`
- `<<politica.cancelamento>>`

Placeholders obrigatorios (validados no publish/render):

- `orcamento.id`
- `paciente.nome`
- `unidade.nome`
- `contrato.tipo`
- `preco.total`
- `preco.prestador`
- `preco.taxa_maos_amigas`
- `escala.resumo`
- `datas.inicio`
- `datas.fim`
- `pagamento.metodo`
- `pagamento.vencimento`
