---
type: skill
name: Bug Investigation
description: Investigate bugs systematically and perform root cause analysis. Use when Investigating reported bugs, Diagnosing unexpected behavior, or Finding the root cause of issues
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Bug Investigation

## Workflow

1. Reproduzir: extrair texto real do PDF (`parsePdfInvoice`) → colar em script `server/tests/ScannerTest.ts` → rodar `npx tsx server/tests/ScannerTest.ts`
2. Isolar estágio: PDF→texto (`pdfParser`), texto→itens (parser/IA/regex), itens→relatório (`financialEngine`)
3. Verificar categoria do bug — float (`108.61000000000001`), mês de referência (M lista M-1), regex por emissor
4. Hipótese única por vez; verificar com log temporário ou `console.log` no script de repro
5. Corrigir ponto exato; reexecutar script de repro
6. Corrigir também no script ad-hoc se fixture embutida estiver errada

## Examples

**Repro de bug de parser:**
```typescript
// server/tests/ScannerTest.ts — colar texto real do PDF
const TEXT = `
MERCADO PAGO
TOTAL A PAGAR: R$ 1.987,88
...
`;
const result = parseMercadoPagoText(TEXT);
console.log(JSON.stringify(result, null, 2));
// Compara manualmente com esperado
```

**Bug de float:**
```
Sintoma: soma dos itens 108.61000000000001, boleto 1987.88 não casa
Causa: aritmética de float sem arredondamento em financialEngine
Fix: arredondar na consolidação (não no item individual)
```

## Quality Bar

- Sempre reproduzir com dados reais antes de corrigir
- Isolar estágio do pipeline antes de abrir o service
- Correção no ponto exato — não "consertar" estágio adjacente
- Reexecutar repro → resultado correto antes de reportar
- Documentar causa raiz (não só sintoma) na resposta

## Resource Strategy

- Sem recursos extras — scripts de repro já existem em `server/tests/`
- Se padrão de bug recorrente por emissor: adicionar fixture em `server/tests/` (não em `references/`)