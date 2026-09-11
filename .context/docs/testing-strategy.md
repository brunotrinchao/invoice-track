---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Testing Strategy

Sem framework de teste instalado (`testFrameworks: []`). Qualidade hoje é mantida por: build TypeScript limpo (`npm run build`), scripts ad-hoc em `server/tests/` e `server/test_parser.ts`, e validação manual da UI com PDFs reais. Meta de médio prazo: introduzir Vitest (ecossistema Vite) para unit tests do `financialEngine` e dos parsers.

## Test Types

- **Unit (atual)**: scripts ad-hoc — `server/tests/ScannerTest.ts` (ex: `parseMercadoPagoText`, `extractItemsFromSectionText`), `server/test_parser.ts` (`runTests`).
- **Unit (alvo)**: Vitest, arquivos `*.test.ts`, cobrindo `financialEngine.ts` (soma, arredondamento, `addMonthsToYearMonth`), parsers por emissor, `regexExtractor`.
- **Integration**: cenários — upload PDF → parse → confirmação → relatório de previsibilidade (`server/routes/reports.ts`).
- **E2E**: ainda não implementado; fluxo crítico = importar PDF, revisar itens, confirmar, ver previsão.

## Running Tests

```
- Build check:           npm run build
- Parser ad-hoc:         npx tsx server/test_parser.ts
- Scanner ad-hoc:        npx tsx server/tests/ScannerTest.ts
- Coverage (alvo):       vitest run --coverage
```

## Quality Gates

- `npm run build` limpo (zero erros `tsc`) antes de qualquer commit.
- Parsers: novo emissor obrigatoriamente testado com PDF real antes de merge.
- `financialEngine`: mudanças em cálculo devem manter consistência de soma (cuidado com float — erro conhecido: `soma 108.61000000000001 ~ boleto 1987.88`).
- Mudanças em extração IA devem preservar fallback regex funcional.

## Troubleshooting

- Erros de parse flutuam com formato do PDF do emissor — reproduzir com o texto extraído real (`parsePdfInvoice`) colado no script de teste, não com fixture inventada.
- Falha na extração IA → verificar chave Gemini no `.env` e quota; fallback regex deve assumir quando IA falha.
- PDF com senha → classe `PdfPasswordRequiredError` @ `server/services/regexExtractor.ts:5`; UI (`PdfUploader`) trata via prompt.
