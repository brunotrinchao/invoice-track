---
type: agent
name: Refactoring Specialist
description: Identify code smells and improvement opportunities
agentType: refactoring-specialist
phases: [E]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Refactoring Specialist Agent Playbook

## Mission

Melhorar estrutura sem alterar comportamento — alvo principal: `financialEngine.ts` (funções longas, helpers repetidos `upper`/`errMsg` duplicados entre files) e parsers com regex inline longos. Engage quando mudança estrutural facilita próxima feature, não por estética.

## Responsibilities

- Extrair helpers duplicados: `upper` (financialEngine.ts:24 e ConfirmationModal.tsx:25), `errMsg` (regexExtractor.ts:21, pdfParser.ts:25, aiExtractor.ts:198)
- Quebrar funções longas em `financialEngine.ts` (266+ linhas)
- Consolidar regex de parsers por emissor
- Types duplicados entre `src/types/index.ts` e `InvoiceParserInterface.ts` (`ExtractedInvoiceResult`, `ParsedCardTransactions` duplicados) — unificar origem

## Best Practices

- Comportamento-preservante: nada de "aproveitar e ajustar" lógica
- Passo pequeno, build após cada passo (`npm run build`)
- Sem suite de testes formal — refactor mais profundo exige script de repro primeiro (`server/tests/`)
- Não refactor código que mudará em breve (feature planejada)
- Types duplicados: escolher `src/types/index.ts` como fonte única, server importa

## Key Project Resources

- [docs index](../docs/README.md)
- [Testing Strategy](../docs/testing-strategy.md)
- [Development Workflow](../docs/development-workflow.md)

## Repository Starting Points

- `server/services/` — alvo principal
- `server/services/parsers/` — consolidação de regex
- `src/components/` — helpers duplicados na UI

## Key Files

- `server/services/financialEngine.ts` — função principal longa (266+ linhas)
- `server/services/parsers/InvoiceParserInterface.ts` — types duplicados com src/types
- `server/services/regexExtractor.ts` / `pdfParser.ts` / `aiExtractor.ts` — `errMsg` duplicado
- `src/components/ConfirmationModal.tsx` — `upper` duplicado com financialEngine

## Key Symbols for This Agent

- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `classifyItemType` @ [financialEngine.ts:20](../../server/services/financialEngine.ts#L20)
- `InvoiceParserStrategy` @ [InvoiceParserInterface.ts:27](../../server/services/parsers/InvoiceParserInterface.ts#L27)
- `upper` @ [financialEngine.ts:24](../../server/services/financialEngine.ts#L24) e @ [ConfirmationModal.tsx:25](../../src/components/ConfirmationModal.tsx#L25)
- `errMsg` (3 ocorrências nos services)

## Architecture Context

- **Services** — lógica centralizada em financialEngine; oportunidadade de extração de módulos (classificação, consolidação, projeção)
- **Components** — helpers utilitários duplicados entre componentes

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md)
- [Testing Strategy](../docs/testing-strategy.md) — requisito: script de repro antes de refactor profundo

## Collaboration Checklist

1. Confirmar com usuário que refactor é desejado (não misturar com fix)
2. Garantir script de repro (`server/tests/`) cobrindo comportamento atual
3. Um passo por vez; `npm run build` após cada
4. Executar script de repro → saída idêntica
5. Commit separado de fixes (conventional commits)
6. Atualizar docs se estrutura mudou

## Hand-off Notes

Reportar: refactorings aplicados, evidência de comportamento-preservação (script + saída), dívida técnica restante priorizada.