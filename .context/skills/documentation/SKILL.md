---
type: skill
name: Documentation
description: Generate and update technical documentation. Use when Documenting new features or APIs, Updating docs for code changes, or Creating README or getting started guides
skillSlug: documentation
phases: [P, C]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Documentation

## Workflow

1. Ler código alterado antes de escrever — docs a partir do código, não da memória
2. Identificar qual doc `.context/docs/` afetada (overview, workflow, testing, tooling)
3. Atualizar lista de parsers em [Project Overview](../docs/project-overview.md) se novo emissor
4. Endpoints novos → documentar em overview (Key Exports) ou workflow
5. Manter PT-BR como idioma das docs
6. Verificar links relativos (`../docs/...`)

## Examples

**Doc de novo parser:**
```markdown
### Parsers (strategy pattern)
- Interface: `InvoiceParserStrategy` @ `server/services/parsers/InvoiceParserInterface.ts:27`
- Implementações: `AtacadaoInvoiceParser`, `BradescoInvoiceParser`, `InterInvoiceParser`,
  `MercadoPagoInvoiceParser`, `PicPayInvoiceParser`, `GenericInvoiceParser`, `NubankParser` ← novo
```

**Doc de endpoint:**
```markdown
- `server/routes/reports.ts` — POST `/api/confirm` — recebe `ConfirmInvoicePayload`,
  retorna relatório de previsibilidade via `processInvoiceConfirmation`
```

## Quality Bar

- Paths reais, sem placeholders
- Exemplos a partir do código real (file:linha)
- Docs no mesmo commit da mudança de código
- PT-BR consistente
- Links relativos verificados

## Resource Strategy

- Sem recursos extras — docs vivem em `.context/docs/`
- Referência viva de parsers: `InvoiceParserFactory` no código (docs apontam para lá)