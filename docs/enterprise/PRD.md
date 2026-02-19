# PRD Tecnico - Enterprise Pricing and Recurrence Engine

## 1) Objetivo

Definir o comportamento tecnico do motor enterprise de planejamento e precificacao para uso em:
- avaliacao/admin
- API de orcamento
- contratos versionados
- OS/Extrato (Anexo II)
- auditoria/recalculo
- relatorios operacionais

Escopo: calculo deterministico, versionado por unidade, reprodutivel por hash e auditavel ponta a ponta.

## 2) Assuncoes Aplicadas (Prompt 0)

- Moeda BRL, arredondamento default para 2 casas.
- Estrategias opcionais por unidade: `NEAREST_0_50` e `NEAREST_1_00`.
- Weekend = sabado e domingo.
- Feriado so aplica se configurado por unidade.
- Complexidade por doenca e soma simples dos adicionais selecionados.
- Se complexidade > 100%, nao bloqueia; registra warning.
- Role minima exigida por doencas usa maior nivel: `CUIDADOR < TECNICO < ENFERMEIRO`.
- Imposto sobre lucro bruto: `precoCliente - custoPrestador`.
- Desconto aplicado no final e reduz margem.
- Minicustos podem ser fixos e percentuais, com toggle por item no fechamento.
- Funcoes de calculo/normalizacao sao puras; persistencia em camada de service.

## 3) Escopo Funcional

### 3.1 Entidades de Dominio

- `Unidade`: unidade operacional (cidade/filial).
- `ConfigVersion`: versao imutavel de configuracao por unidade com vigencia.
- `PricingConfig`: base pay por role, adicionais, imposto, margem alvo, regra de paciente extra, arredondamento.
- `DiseaseRule`: regra por doenca (adicional de complexidade e role minima).
- `HourCurve`: curva nao linear por horas (1..12, 24 e pontos custom).
- `PaymentFees`: taxas por metodo e por periodo de cobranca.
- `MiniCosts`: composicao de custos internos (percentual/fixo, opcional/obrigatorio).
- `DiscountPreset`: desconto pre-configurado por unidade.
- `ContractTemplateVersion`: template versionado (`CLIENTE`, `PRESTADOR`) com placeholders detectados.
- `Orcamento/Proposta`: entidade comercial com snapshots (`planningInput`, `normalizedSchedule`, `pricingBreakdown`), hash e referencias de versao.
- `OS` (Ordem de Servico / Extrato): anexo com composicao formal de preco e dados operacionais.
- `NormalizedSchedule`: escala normalizada deterministica (ocorrencias + totais).
- `PricingBreakdown`: composicao numerica auditavel do preco.
- `AuditHash`: hash estavel de input + configVersion + engineVersion.

### 3.2 Fluxos Obrigatorios

1. Admin configura parametros por unidade e publica `ConfigVersion`.
2. Avaliacao/planejamento monta `planningInput` e gera orcamento.
3. Fechamento aplica desconto e toggles de minicustos.
4. Geracao de contrato + OS/Extrato com placeholders.
5. Recalculo de auditoria compara divergencia com log estruturado.
6. Relatorio operacional usa `pricingBreakdown` persistido (sem recalculo).

### 3.3 Tipos de Contrato/Plano

- `AVULSO`
- `SEMANAL`
- `MENSAL`
- `BIMESTRAL`
- `TRIMESTRAL`
- `SEMESTRAL`

## 4) Requisitos Funcionais

- Gerar `NormalizedSchedule` para recorrencia `NONE`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `CUSTOM_DATES`, `PACKAGE`.
- Suportar inclusoes/exclusoes de datas e feriados por unidade.
- Tratar turno que cruza meia-noite sem perda de horas totais.
- Calcular `PricingBreakdown` com componentes auditaveis:
  - `custoPrestador`
  - `adicionais` (weekend, holiday, diseaseComplexity, patientExtra, technicalManual)
  - `miniCosts` (percentual/fixo, com toggle)
  - `lucroAlvo`
  - `impostoSobreLucroBruto`
  - `paymentFee`
  - `desconto`
  - `precoFinal`
- Suportar plantao emergencial com sobretaxa configuravel.
- Gerar contrato versionado com placeholders e lista de pendencias.
- Gerar Anexo II (OS/Extrato) com:
  - `Valor do Prestador`
  - `Taxa Maos Amigas`
  - `Total`
  - metodo de pagamento e vencimento
- Gerar Anexo III com clausulas parametrizadas de cancelamento/reagendamento/estorno.
- Persistir snapshots e `AuditHash` em toda proposta/orcamento.

## 5) Requisitos Nao Funcionais

- Determinismo: mesma entrada + mesma config + mesma versao de engine -> mesmo resultado.
- Reprodutibilidade: recalculo por `configVersionId` original, nunca por "ultima versao ativa".
- Auditabilidade: diffs estruturados de before/after no recalc.
- Seguranca operacional: feature flag por unidade para rollout seguro.
- Tolerancia de legado: registros sem campos novos devem ser tratados sem quebra.
- Performance: cache por request para `resolveConfig`.

## 6) Formula de Referencia (alto nivel)

1. `custoPrestador` derivado de role, curva de horas e ocorrencias.
2. `adicionais` aplicados por regra de evento e complexidade.
3. `subtotalOperacional = custoPrestador + adicionais + miniCosts`.
4. `lucroAlvo` aplicado sobre custoPrestador.
5. `precoAntesImposto = subtotalOperacional + lucroAlvo`.
6. `imposto = impostoPercent * (precoAntesImposto - custoPrestador)`.
7. `paymentFee` conforme metodo/periodo.
8. `desconto` aplicado no final.
9. `precoFinal` arredondado por estrategia da unidade.
10. Invariante: `precoFinal >= custoPrestador` (clamp com warning quando necessario).

## 7) Matriz de Cenarios

| ID | Contrato | Recorrencia | Exemplo | Variacoes criticas | Resultado esperado |
|---|---|---|---|---|---|
| C01 | AVULSO | NONE | 12h unica | doenca simples, sem fee | breakdown completo + hash |
| C02 | SEMANAL | WEEKLY | 2x por semana | weekend parcial | totalHours consistente e adicional weekend |
| C03 | SEMANAL | BIWEEKLY | quinzenal | fee por semana | fee por periodo refletido |
| C04 | MENSAL | MONTHLY | 3x/semana por 30 dias | feriado nacional | ocorrencias HOLIDAY marcadas |
| C05 | MENSAL | PACKAGE | 240h/mes | distribuicao por janela | totalHours exato em 240h |
| C06 | BIMESTRAL | WEEKLY | 24x7 60 dias | cruzamento de meia-noite | sem perda de horas |
| C07 | TRIMESTRAL | CUSTOM_DATES | datas fixas | includes/excludes | somente datas finais validas |
| C08 | SEMESTRAL | WEEKLY | paciente extra | `patientExtra%` ativo | margem e custo ajustados |
| C09 | MENSAL | WEEKLY | multiplas doencas | role minima elevada | role final = maior nivel |
| C10 | AVULSO | NONE | plantao emergencial | sobretaxa emergencia | sobretaxa separada no breakdown |
| C11 | MENSAL | MONTHLY | desconto agressivo | abaixo do custo | clamp para custo + warning |
| C12 | SEMANAL | WEEKLY | cartao mensal | fee metodo+periodo | fee auditavel em linha separada |

## 8) Edge Cases Obrigatorios

- Turno cruzando meia-noite (ex.: 19:00 -> 07:00).
- Janela parcial com inicio/fim em meio de semana.
- Inclusao manual de data fora do padrao de recorrencia.
- Exclusao de ocorrencia que cairia em feriado.
- Feriado recorrente anual por unidade.
- Mudanca de horario (DST) sem perder determinismo de horas.
- Multiplos pacientes e multiplas doencas na mesma proposta.
- Metodo de pagamento sem fee configurada (default 0).
- Cancelamento/reagendamento com placeholders faltantes (gera pendencia explicita).
- Registros legados sem `pricingBreakdown` completo (relatorio trata ausentes como 0 e loga warning).

## 9) Hipoteses Nao Citadas (aplicadas por padrao)

- H1: `contractType` influencia janela/prazo comercial e clausulas, nao altera sozinho a formula de custo.
- H2: `paymentPeriod` e opcional e, quando ausente, usa default da `ConfigVersion`.
- H3: `plantaoEmergencial` e boolean + percentual de sobretaxa configuravel por unidade.
- H4: `OS` e sempre gerada a partir do breakdown persistido (nunca de recalculo na hora da emissao).
- H5: placeholders desconhecidos no template nao quebram render; entram em lista de pendencias.
- H6: arredondamento ocorre no final do calculo e tambem por linha quando exigido para auditoria.

## 10) Criterios de Aceite do Prompt 1

- Existe documento tecnico unico em `docs/enterprise/PRD.md`.
- Documento contem entidades obrigatorias, fluxos, tipos de contrato e cenarios enterprise.
- Matriz cobre recorrencia semanal/quinzenal/mensal, pacote de horas e plantao emergencial.
- Edge cases e hipoteses estao explicitos para guiar implementacao sem perguntas.
