---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code. Use when Writing tests for new functionality, Adding tests for bug fixes (regression tests), or Improving test coverage for existing code
skillSlug: test-generation
phases: [E, V]
generated: 2026-09-11
status: filled
scaffoldVersion: "2.0.0"
---

# Test Generation

## Workflow

1. Identificar alvo: função/Parser/componente
2. Projeto sem suite formal — propor Vitest (devDependency) se primeira suite; senão seguir padrão existente
3. Fixtures de parser: texto real via `parsePdfInvoice`, nunca texto inventado
4. Casos: happy path + bordas de mês (jan→dez, ano novo) + float (108.61...) + erro de senha PDF + fallback regex
5. Mock `extractWithAI` (Gemini) — nunca API real
6. Rodar; reportar coverage

## Examples

**Unit test de engine (Vitest):**
```typescript
import { describe, it, expect } from "vitest";
import { addMonthsToYearMonth } from "../services/financialEngine.js";

describe("addMonthsToYearMonth", () => {
  it("rolls back across year boundary", () => {
    expect(addMonthsToYearMonth("2025-01", -1)).toBe("2024-12");
  });

  it("keeps year when month is mid-year", () => {
    expect(addMonthsToYearMonth("2025-06", -1)).toBe("2025-05");
  });
});
```

**Fixture de parser com texto real:**
```typescript
// server/tests/fixtures/mercadoPago.sample.ts — texto copiado de parsePdfInvoice de um PDF real
export const MERCADO_PAGO_SAMPLE = `
MERCADO PAGO
Data      Descrição                    Valor
10/09/2025 ALUGUEL                     R$ 1.500,00
...
`;
```

## Quality Bar

- Fixture de parser = texto real de PDF, não inventado
- Teste comportamento, não implementação
- Casos de borda obrigatórios: mês (jan↔dez), float, PDF com senha (`PdfPasswordRequiredError`)
- Mock Gemini na fronteira — teste não faz rede
- Testes independentes, determinísticos
- Nome descreve comportamento ("rolls back across year boundary")

## Resource Strategy

- Sem recursos extras — fixtures em `server/tests/fixtures/`
- Texto de PDF real como fixture é a prática central deste repo