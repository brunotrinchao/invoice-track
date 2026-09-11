---
type: agent
name: Performance Optimizer
description: Identify performance bottlenecks
agentType: performance-optimizer
phases: [E, V]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Performance Optimizer Agent Playbook

## Mission

Identificar e eliminar gargalos no pipeline PDF→extração→consolidação e na UI de relatórios. Domínios prováveis: parse de PDF grande, latência de chamada Gemini, re-renders React em listas de itens, bundle do Vite.

## Responsibilities

- Perfil de `parsePdfInvoice` com PDFs grandes (múltiplas páginas)
- Latência `extractWithAI` (Gemini) — timeout, retry, payload
- Regex de `extractWithRegex` — catastrophic backtracking em texto longo
- Re-renders React: `InvoiceManagement` (listas grandes), `PredictabilityChart` (Recharts)
- Bundle: análise de chunks Vite, tree-shaking de `lucide-react`/`recharts`

## Best Practices

- Medir antes de otimizar — profile real, não palpite
- Regex: testar com texto de PDF real (mín. 10k chars) para backtracking
- Recharts: `React.memo` nos componentes de gráfico; dados como props estáveis
- Listas React: keys estáveis (id do item, não índice)
- IA: considerar cache por hash de PDF para evitar re-extração
- Bundle: imports nomeados de `lucide-react` (sem namespace import)

## Key Project Resources

- [docs index](../docs/README.md)
- [Testing Strategy](../docs/testing-strategy.md)
- [Tooling](../docs/tooling.md) — scripts

## Repository Starting Points

- `server/services/` — parse/extração (backend hot path)
- `src/components/` — render UI
- `server/routes/` — endpoints

## Key Files

- `server/services/pdfParser.ts` — `parsePdfInvoice` (pdf-parse)
- `server/services/regexExtractor.ts` — `extractWithRegex`
- `server/services/aiExtractor.ts` — `extractWithAI` (latência de rede)
- `server/services/parsers/*` — regex por emissor
- `src/components/InvoiceManagement.tsx` — listas/estado
- `src/components/PredictabilityChart.tsx` — Recharts

## Key Symbols for This Agent

- `parsePdfInvoice` @ [pdfParser.ts:5](../../server/services/pdfParser.ts#L5)
- `extractWithRegex` @ [regexExtractor.ts:12](../../server/services/regexExtractor.ts#L12)
- `extractWithAI` @ [aiExtractor.ts:5](../../server/services/aiExtractor.ts#L5)
- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `InvoiceManagement` @ [InvoiceManagement.tsx](../../src/components/InvoiceManagement.tsx)
- `PredictabilityChart` @ [PredictabilityChart.tsx](../../src/components/PredictabilityChart.tsx)

## Architecture Context

- **Services** — CPU-bound (regex) + IO-bound (Gemini); separar perfil por tipo
- **Components** — client-side render; Recharts é o mais pesado em bundle/runtime

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md)
- [Testing Strategy](../docs/testing-strategy.md)

## Collaboration Checklist

1. Confirmar sintoma com usuário (latência? onde: upload, relatório, gráfico?)
2. Medir baseline (tempo de parse, tempo de extração, render count)
3. Identificar bottleneck real com profile
4. Otimizar ponto único; medir delta
5. `npm run build` limpo; verificar bundle se mudou import
6. Reportar antes/depois com números

## Hand-off Notes

Reportar: bottleneck confirmado com números (antes/depois), files alterados, riscos (ex: cache invalidation), próximos alvos priorizados.