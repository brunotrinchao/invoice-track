---
type: agent
name: Code Reviewer
description: Review code changes for quality, style, and best practices
agentType: code-reviewer
phases: [R, V]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Code Reviewer Agent Playbook

## Mission

Garantir qualidade das mudanças antes de consolidar: corretude de cálculo financeiro, robustez de parsers, consistência arquitetural (Strategy/factory), e integridade do fallback regex↔IA. Engage após implementação, antes de commit.

## Responsibilities

- Revisar mudanças em `server/services/` com foco em aritmética financeira (float, arredondamento)
- Verificar novo parser: implementa `InvoiceParserStrategy`? registrado em `InvoiceParserFactory`?
- Verificar mudanças de extração preservam duplo caminho IA + regex
- Checar consistência de tipos entre `src/types/index.ts` e tipos do server
- Checar UI: estado React (mutação direta proibida), tratamento de erro de upload/senha

## Best Practices

- Corretude > estilo: erro de centavo em `financialEngine` é blocker; nomenclatura é sugestão
- Verificar mês de referência: fatura do mês M lista compras de M-1 (`getPreviousMonthReference`)
- Cuidado com comparação de float (`108.61000000000001 ~ 1987.88` tipo de erro conhecido) — exigir epsilon ou arredondamento explícito
- Mudança cirúrgica: flag refactor incidental não relacionado
- Imutabilidade em handlers React: spread, nunca mutação de state

## Key Project Resources

- [docs index](../docs/README.md)
- [Testing Strategy](../docs/testing-strategy.md) — gates de qualidade
- [Development Workflow](../docs/development-workflow.md) — expectativas de revisão

## Repository Starting Points

- `server/services/` — alvo principal de revisão (cálculo + extração)
- `server/services/parsers/` — padrão Strategy a manter
- `src/components/` — revisão de estado/handlers React
- `src/types/index.ts` — fonte de verdade dos tipos frontend

## Key Files

- `server/services/financialEngine.ts` — cálculo: `processInvoiceConfirmation`, `classifyItemType`, `addMonthsToYearMonth`
- `server/services/aiExtractor.ts` — `extractWithAI` (Gemini)
- `server/services/regexExtractor.ts` — `extractWithRegex`, `PdfPasswordRequiredError`
- `server/services/parsers/InvoiceParserFactory.ts` — registro de parsers
- `server/routes/reports.ts` — rotas de relatório
- `src/App.tsx` — estado global (cards, faturas, toasts)

## Key Symbols for This Agent

- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `classifyItemType` @ [financialEngine.ts:20](../../server/services/financialEngine.ts#L20)
- `addMonthsToYearMonth` @ [financialEngine.ts:51](../../server/services/financialEngine.ts#L51)
- `InvoiceParserFactory` @ [InvoiceParserFactory.ts:9](../../server/services/parsers/InvoiceParserFactory.ts#L9)
- `InvoiceParserStrategy` @ [InvoiceParserInterface.ts:27](../../server/services/parsers/InvoiceParserInterface.ts#L27)
- `extractWithAI` @ [aiExtractor.ts:5](../../server/services/aiExtractor.ts#L5)
- `App` @ [App.tsx:22](../../src/App.tsx#L22)

## Architecture Context

- **Services** (`server/services`, `server/services/parsers`) — lógica pura; Strategy pattern; ~8 classes parser + engine
- **Routes** (`server/routes`) — camada fina sobre services
- **Components** (`src/components`) — 11+ componentes React com props types definidos inline

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md) — mapa de arquivos
- [Development Workflow](../docs/development-workflow.md) — critérios de review

## Collaboration Checklist

1. Confirmar escopo da revisão com autor (quais files, qual objetivo)
2. Ler mudança completa antes de comentar; `npm run build` limpo
3. Priorizar: cálculo financeiro > parsers > rotas > UI > estilo
4. Indicar file:linha em cada finding
5. Verificar fallback regex após mudanças em extração IA
6. Aprovar só com build limpo + valores conferidos

## Hand-off Notes

Reportar: findings por severidade (blocker/warning/suggestion) com file:linha, verificação executada (build, script de teste), riscos residuais e sugestões de follow-up.