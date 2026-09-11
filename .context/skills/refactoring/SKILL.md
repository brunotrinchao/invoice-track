---
type: skill
name: Refactoring
description: Refactor code safely with a step-by-step approach. Use when Improving code structure without changing behavior, Reducing code duplication, or Simplifying complex logic
skillSlug: refactoring
phases: [E]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Refactoring

## Workflow

1. Script de repro primeiro (`server/tests/`) — sem suite formal, é a única proteção de comportamento
2. Rodar script → capturar saída de referência
3. Um passo por vez: extrair helper, unificar types, quebrar função longa
4. `npm run build` após cada passo
5. Reexecutar script → saída idêntica
6. Commit separado de fixes — `refactor:` puro, sem mudança comportamental

## Examples

**Extrair helper duplicado:**
```typescript
// Antes: upper() duplicado em financialEngine.ts:24 e ConfirmationModal.tsx:25
// Depois: src/utils/string.ts
export const upper = (s: string): string => s.toUpperCase();

// Ambos importam de lá; behavior idêntico verificado via repro script
```

**Unificar types duplicados:**
```typescript
// Antes: ExtractedInvoiceResult em src/types/index.ts:34
//        E em server/services/parsers/InvoiceParserInterface.ts:19
// Depois: fonte única em src/types/index.ts; server importa do client types
// (ou inverte a direção — escolher uma e documentar)
```

## Quality Bar

- Repro script antes, durante, depois — saída idêntica
- Um tipo de mudança por commit
- Se script diverge → você mudou comportamento → reverter passo
- `npm run build` limpo a cada passo
- Não refactor código que mudará em breve (feature planejada)
- Não "melhorar" código adjacente (mudança cirúrgica)

## Resource Strategy

- Sem recursos extras — processo embutido
- Fixtures de repro ficam em `server/tests/`, não no skill