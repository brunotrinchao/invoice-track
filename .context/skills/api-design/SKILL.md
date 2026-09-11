---
type: skill
name: Api Design
description: Design RESTful APIs following best practices. Use when Designing new API endpoints, Restructuring existing APIs, or Planning API versioning strategy
skillSlug: api-design
phases: [P, R]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# API Design

## Workflow

1. Inspecionar rotas existentes (`server/routes/reports.ts`) — seguir convenções vigentes
2. Definir resource + verbos HTTP apropriados
3. Types de request/response primeiro em `src/types/index.ts` (contrato compartilhado server↔client)
4. Handler fino em `server/routes/` — lógica vai para service em `server/services/`
5. Erros: formato estruturado consistente com handlers existentes (`errMsg` nos services)
6. Validar: build limpo + teste manual do endpoint com curl/`npm run dev`

## Examples

**Estrutura de rota neste repo:**
```typescript
// server/routes/reports.ts — padrão de handler fino
import { processInvoiceConfirmation } from "../services/financialEngine.js";

// Rota Express 4; lógica delega para services
router.post("/api/confirm", async (req, res) => {
  try {
    const result = await processInvoiceConfirmation(req.body as ConfirmInvoicePayload);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});
```

**Contrato de types compartilhado:**
```typescript
// src/types/index.ts — fonte única server↔client
export interface ParseResponse {
  success: boolean;
  data?: ParsedCardTransactions;
  error?: string;
}
```

## Quality Bar

- Handler de rota fino — lógica em `server/services/`
- Types em `src/types/index.ts`, não duplicados no server
- Erros estruturados, nunca stack trace cru ao client
- Compatível com duplo caminho IA→regex (não quebrar fallback)
- Sem estado mutável em módulo (server roda `tsx watch` — módulos persistem entre requests)

## Resource Strategy

- Sem `scripts/` — endpoints validáveis via curl + `npm run dev`
- `references/` só se catálogo de rotas crescer muito
- Manter `SKILL.md` único; contrato de types em `src/types/index.ts` é a referência viva