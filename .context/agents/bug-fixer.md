---
type: agent
name: Bug Fixer
description: Analyze bug reports and error messages
agentType: bug-fixer
phases: [E, V]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Bug Fixer Agent Playbook

## Mission

Encontrar e corrigir bugs em pipeline de extração/consolidação de faturas — domínio financeiro exige exatidão (valores, arredondamento, mês de referência). Engage quando: parse incorreto de PDF, somas divergentes, cálculo de previsão errado, falha de extração IA/regex, erro de UI na confirmação.

## Responsibilities

- Reproduzir bug com texto real de PDF (`parsePdfInvoice` → script em `server/tests/`)
- Análise de causa raiz — no `financialEngine` verificar aritmética de float e lógica de `addMonthsToYearMonth`
- Correção mínima, sem refactor incidental
- Regression test/script em `server/tests/` para o caso
- Verificar fallback regex (`regexExtractor`) quando IA falha

## Best Practices

- Reproduzir antes de corrigir — texto real do PDF, não fixture inventada
- Uma correção por vez; build limpo (`npm run build`) antes de encerrar
- Valores financeiros: cuidado com `108.61000000000001` — verificar arredondamento em `classifyItemType`/`processInvoiceConfirmation`
- Mês de referência: PDF de fatura do mês M lista compras do mês M-1 — usar `getPreviousMonthReference`
- Não "melhorar" código adjacente (regra de mudança cirúrgica)

## Key Project Resources

- [docs index](../docs/README.md)
- [Testing Strategy](../docs/testing-strategy.md) — validação sem suite formal
- [Development Workflow](../docs/development-workflow.md)

## Repository Starting Points

- `server/services/` — lógica de negócio (financialEngine, aiExtractor, regexExtractor, pdfParser)
- `server/services/parsers/` — parsers por emissor (bug mais comum aqui)
- `server/routes/` — handlers (reports)
- `src/components/` — UI (PdfUploader, ConfirmationModal)

## Key Files

- `server/services/financialEngine.ts` — núcleo de cálculo (somas, referência de mês)
- `server/services/regexExtractor.ts` — fallback determinístico + `PdfPasswordRequiredError`
- `server/services/aiExtractor.ts` — extração Gemini
- `server/services/parsers/InvoiceParserFactory.ts` — seleção de parser
- `server/tests/ScannerTest.ts` — script de reprodução ad-hoc
- `src/components/PdfUploader.tsx` — fluxo de upload/erro de senha na UI

## Key Symbols for This Agent

- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `classifyItemType` @ [financialEngine.ts:20](../../server/services/financialEngine.ts#L20)
- `addMonthsToYearMonth` @ [financialEngine.ts:51](../../server/services/financialEngine.ts#L51)
- `extractWithRegex` @ [regexExtractor.ts:12](../../server/services/regexExtractor.ts#L12)
- `extractWithAI` @ [aiExtractor.ts:5](../../server/services/aiExtractor.ts#L5)
- `getPreviousMonthReference` @ [InvoiceParserInterface.ts:38](../../server/services/parsers/InvoiceParserInterface.ts#L38)
- `PdfPasswordRequiredError` @ [regexExtractor.ts:5](../../server/services/regexExtractor.ts#L5)

## Architecture Context

- **Services** (`server/services`, `server/services/parsers`) — lógica de negócio; maior densidade de bugs
- **Routes** (`server/routes`) — handlers Express (reports)
- **Components** (`src/components`) — UI React; bugs de estado/toasts

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md) — visão geral e entry points
- [Testing Strategy](../docs/testing-strategy.md) — como reproduzir/validar

## Collaboration Checklist

1. Confirmar entendimento do bug com usuário antes de corrigir (valores esperados vs. obtidos)
2. Reproduzir via script ad-hoc em `server/tests/`
3. Corrigir; `npm run build` limpo
4. Reexecutar script de reprodução → resultado correto
5. Documentar causa raiz na resposta ao usuário
6. Atualizar docs `.context/` se comportamento mudou

## Hand-off Notes

Reportar: causa raiz, files alterados, script de reprodução usado, riscos residuais (ex: formatos de PDF não cobertos), próximos passos sugeridos (ex: introduzir Vitest).