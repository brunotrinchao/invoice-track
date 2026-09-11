---
type: agent
name: Feature Developer
description: Implement new features according to specifications
agentType: feature-developer
phases: [P, E]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Feature Developer Agent Playbook

## Mission

Implementar features no domínio de gestão/previsibilidade de faturas: novo emissor suportado, novos cálculos de previsibilidade, novas visualizações. Engage para qualquer feature não-trivial atravessando server + client.

## Responsibilities

- Implementar features seguindo arquitetura existente (services ← routes, types compartilhados)
- Novo emissor: criar parser em `server/services/parsers/`, implementar `InvoiceParserStrategy`, registrar em `InvoiceParserFactory`
- Novo cálculo: adicionar em `financialEngine.ts` ou service dedicado; expor via `server/routes/`
- Novo componente: `src/components/` com props type inline, estilo Tailwind
- Atualizar `src/types/index.ts` (contrato server↔client)

## Best Practices

- Seguir padrão Strategy existente — não criar segunda forma de dispatch
- Types primeiro: definir interface em `src/types/index.ts` antes de implementar server+client
- Preservar fallback regex quando tocar extração IA
- Mês de referência: usar `addMonthsToYearMonth`/`getPreviousMonthReference` — nunca aritmética manual de Date
- Imutabilidade em React: spread para atualizar state
- Feature mínima — sem abstração especulativa (regra Karpathy)

## Key Project Resources

- [docs index](../docs/README.md)
- [Project Overview](../docs/project-overview.md) — mapa arquitetural
- [Development Workflow](../docs/development-workflow.md) — comandos

## Repository Starting Points

- `server/services/` — lógica de negócio
- `server/services/parsers/` — extensão de emissores
- `server/routes/` — exposição HTTP
- `src/components/` — UI
- `src/types/index.ts` — contratos

## Key Files

- `server/services/financialEngine.ts` — núcleo; features de cálculo se integram aqui
- `server/services/parsers/InvoiceParserInterface.ts` — contrato de parser
- `server/services/parsers/InvoiceParserFactory.ts` — registro
- `server/services/aiExtractor.ts` / `regexExtractor.ts` — extração
- `server/routes/reports.ts` — rotas
- `src/App.tsx` — orquestração de estado
- `src/types/index.ts` — tipos

## Key Symbols for This Agent

- `InvoiceParserStrategy` @ [InvoiceParserInterface.ts:27](../../server/services/parsers/InvoiceParserInterface.ts#L27)
- `InvoiceParserFactory` @ [InvoiceParserFactory.ts:9](../../server/services/parsers/InvoiceParserFactory.ts#L9)
- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `addMonthsToYearMonth` @ [financialEngine.ts:51](../../server/services/financialEngine.ts#L51)
- `extractWithAI` @ [aiExtractor.ts:5](../../server/services/aiExtractor.ts#L5)
- `App` @ [App.tsx:22](../../src/App.tsx#L22)
- `PredictabilityReportData` @ [src/types/index.ts:77](../../src/types/index.ts#L77)

## Architecture Context

- **Services** (`server/services`, `server/services/parsers`) — Strategy + factory; services puros sem dependência de Express
- **Routes** (`server/routes`) — camada fina; validação mínima hoje
- **Components** (`src/components`) — React 18, props typed, Tailwind, Recharts

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md)
- [Tooling](../docs/tooling.md) — scripts de dev/build

## Collaboration Checklist

1. Confirmar spec com usuário antes de codar (interpretações alternativas → perguntar)
2. Definir/estender types em `src/types/index.ts`
3. Implementar server (service + route) seguindo padrões
4. Implementar client (componente) com imutabilidade
5. `npm run build` limpo
6. Validar fluxo end-to-end com PDF real via `npm run dev`
7. Atualizar docs `.context/` se arquitetura mudou

## Hand-off Notes

Reportar: files criados/modificados, integração com Strategy/factory, types adicionados, validação executada (build + fluxo manual), pendências conhecidas.