# Fixtures Enterprise (Golden)

## Fixture A - Semanal 2x (12h)

Input base:

```json
{
  "planningInput": {
    "recurrenceType": "WEEKLY",
    "startDate": "2026-02-02",
    "endDate": "2026-03-01",
    "daysOfWeek": [1, 3],
    "shiftType": "DIURNO",
    "hoursPerOccurrence": 12,
    "quantityPatients": 1
  },
  "paymentMethod": "PIX",
  "diseaseComplexity": "LOW",
  "unitCode": "MATRIZ",
  "contractType": "MENSAL"
}
```

Expected (resumo):

- `normalizedSchedule.totalDays = 8`
- `normalizedSchedule.totalHours = 96`
- `pricingBreakdown.finalPrice >= pricingBreakdown.costProfessional`
- `inputHash` estavel para mesma entrada/config/version

## Fixture B - Noturno + Feriado + Paciente Extra

Input base:

```json
{
  "planningInput": {
    "recurrenceType": "NONE",
    "startDate": "2026-02-18",
    "shiftType": "NOTURNO",
    "shiftStart": "22:00",
    "shiftEnd": "06:00",
    "hoursPerOccurrence": 12,
    "holidays": ["2026-02-18"],
    "quantityPatients": 2
  },
  "paymentMethod": "BOLETO",
  "paymentPeriod": "MENSAL",
  "diseaseComplexity": "HIGH",
  "unitCode": "MATRIZ",
  "contractType": "AVULSO"
}
```

Expected (resumo):

- `normalizedSchedule.totalOccurrences = 2` (split cross-midnight)
- `pricingBreakdown.breakdown.adicionais_por_evento.holiday > 0`
- `pricingBreakdown.breakdown.adicionais_por_evento.night > 0`
- `pricingBreakdown.breakdown.adicionais_por_evento.patient_extra > 0`

## Fixture C - Contrato Render

Template:

```text
Contrato <<orcamento.id>>
Paciente <<paciente.nome>>
Total <<preco.total>>
```

Expected:

- sem `pending` quando dados completos
- erro/pendencia explicita quando `paciente.nome` ausente
