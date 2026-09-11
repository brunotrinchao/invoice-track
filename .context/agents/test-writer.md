---
type: agent
name: Test Writer
description: Write comprehensive unit and integration tests
agentType: test-writer
phases: [E, V]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Test Writer Agent Playbook

## Mission

Estabelecer primeira suite formal de testes (hoje: apenas scripts ad-hoc) e garantir exatidão do domínio financeiro. Prioridade: `financialEngine` (cálculo) e parsers (extração) — erros aqui = dinheiro errado na tela.

## Responsibilities

- Propor/adicionar Vitest (ecossistema Vite já presente) ao projeto
- Unit tests: `financialEngine.ts` — `classifyItemType`, `addMonthsToYearMonth`, `processInvoiceConfirmation` (soma, arredondamento, referência de mês)
- Unit tests: parsers por emissor com texto real de PDF como fixture
- Unit tests: `regexExtractor` (incl. `PdfPasswordRequiredError`)
- Integration: fluxo rota `/api/reports` com dados de confirmação
- Regression tests de bugs passados (ex: float `108.61000000000001`)

## Best Practices

- Fixtures de parser: usar texto extraído real via `parsePdfInvoice`, não texto inventado
- Cálculo financeiro: testar arredondamento com casos float (0.1+0.2, somas acumuladas)
- Mês de referência: testar bordas (janeiro→dezembro, ano novo)
- `addMonthsToYearMonth("2025-01", -1)` deve dar `2024-12` — caso de borda obrigatório
- Mock Gemini em `extractWithAI` — nunca chamar API real em teste
- Testes independentes, sem ordem

## Key Project Resources

- [docs index](../docs/README.md)
- [Testing Strategy](../docs/testing-strategy.md) — meta formalização
- [Development Workflow](../docs/development-workflow.md)

## Repository Starting Points

- `server/services/` — alvo principal de unit tests
- `server/services/parsers/` — fixtures de parsers
- `server/tests/` — scripts ad-hoc a converter em tests formais
- `src/` — tests de componentes se/when Vitest configurado

## Key Files

- `server/services/financialEngine.ts` — cálculo (prioridade 1)
- `server/services/regexExtractor.ts` — fallback + erro de senha
- `server/services/pdfParser.ts` — parse de texto
- `server/services/parsers/MercadoPagoParser.ts` — exemplo de parser (script ad-hoc existente)
- `server/tests/ScannerTest.ts` — base p/ converter
- `src/types/index.ts` — types para fixtures

## Key Symbols for This Agent

- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `classifyItemType` @ [financialEngine.ts:20](../../server/services/financialEngine.ts#L20)
- `addMonthsToYearMonth` @ [financialEngine.ts:51](../../server/services/financialEngine.ts#L51)
- `extractWithRegex` @ [regexExtractor.ts:12](../../server/services/regexExtractor.ts#L12)
- `parseMercadoPagoText` @ [ScannerTest.ts:3](../../server/tests/ScannerTest.ts#L3)
- `InvoiceParserFactory` @ [InvoiceParserFactory.ts:9](../../server/services/parsers/InvoiceParserFactory.ts#L9)

## Architecture Context

- **Services** — funções puras majoritárias → fácil de testar unit
- **Routes** — teste de integração com supertest-like sobre Express
- **Components** — teste de componente possível c/ Vitest + Testing Library

## Documentation Touchpoints

- [Testing Strategy](../docs/testing-strategy.md) — atualizar ao introduzir Vitest
- [Project Overview](../docs/project-overview.md)

## Collaboration Checklist

1. Confirmar com usuário introdução de Vitest (adiciona devDependency)
2. Escrever teste primeiro (RED) → implementar/ajustar (GREEN)
3. Fixtures de parser com texto real de PDF
4. Cobrir: happy path, borda de mês, float, erro de senha PDF, fallback regex
5. Rodar suite; reportar coverage
6. Atualizar Testing Strategy docs

## Hand-off Notes

Reportar: suite adicionada (config, comandos), coverage por área, casos de borda cobertos, gaps restantes.