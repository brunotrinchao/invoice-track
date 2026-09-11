---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices. Use when Reviewing code changes for quality, Checking adherence to coding standards, or Identifying potential bugs or issues
skillSlug: code-review
phases: [R, V]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---
# Code Review

## Workflow

1. `git diff` (quando repo versionado) ou comparar files alterados — entender mudança completa
2. `npm run build` — build limpo é gate mínimo
3. Priorizar: cálculo financeiro (`financialEngine`) > parsers > rotas > UI
4. Verificar: float em somas, mês de referência (M lista M-1), fallback regex↔IA intacto
5. Novo parser: implementa `InvoiceParserStrategy`? registrado em `InvoiceParserFactory`?
6. React: imutabilidade de state, keys estáveis, handlers sem lógica de negócio

## Examples

**Review de cálculo financeiro:**
```typescript
// 🔴 Blocker: soma de float sem arredondamento
const total = items.reduce((acc, i) => acc + i.amount, 0);
// 108.61000000000001 ≠ 1987.88 em comparação exata

// ✅ Arredondar na consolidação
const total = Math.round(items.reduce((acc, i) => acc + i.amount, 0) * 100) / 100;
```

**Review de parser:**
```typescript
// 🔴 Parser direto, sem interface — quebra Strategy
export class XParser { ... }

// ✅ Implementa contract + registro na factory
export class XInvoiceParser implements InvoiceParserStrategy { ... }
// + registrar em InvoiceParserFactory
```

## Quality Bar

- Blocker = erro financeiro/parse errado; suggestion = estilo — separar severidades
- Sempre verificar fallback regex após mudanças em `aiExtractor`
- Indicar file:linha em cada finding
- Verificar com script de repro (`server/tests/`) quando possível
- Mudança cirúrgica: flag refactor incidental não relacionado

## Resource Strategy

- Sem recursos extras — checklist embutida
- Se catálogo de bugs recorrentes crescer, criar fixture em `server/tests/`