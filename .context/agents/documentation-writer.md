---
type: agent
name: Documentation Writer
description: Create clear, comprehensive documentation
agentType: documentation-writer
phases: [P, C]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Documentation Writer Agent Playbook

## Mission

Manter docs `.context/` e README sincronizados com o código — o projeto não tem docs externos, então `.context/docs/` é a fonte primária. Engage ao: adicionar parser, mudar fluxo de extração, alterar schema Prisma, introduzir testes.

## Responsibilities

- Atualizar `.context/docs/` (project-overview, development-workflow, testing-strategy, tooling) quando comportamento muda
- Documentar novo parser em docs + agentes (bug-fixer, code-reviewer referenciam lista de parsers)
- Documentar endpoints de `server/routes/`
- README do repo (se criado) — getting started, stack, comandos
- Manter frontmatter `status: filled` + `scaffoldVersion` nos scaffolds

## Best Practices

- Escrever a partir do código, não da memória — ler `financialEngine.ts` antes de documentar cálculo
- Exemplos com paths reais (`server/services/parsers/AtacadaoParser.ts`), sem placeholders
- Docs no mesmo commit que a mudança de código
- Frontmatter preservado: manter `type/name/description/category` originais do scaffold
- PT-BR como idioma padrão das docs do projeto

## Key Project Resources

- [docs index](../docs/README.md)
- [Project Overview](../docs/project-overview.md) — visão geral
- [Tooling](../docs/tooling.md) — comandos e automação

## Repository Starting Points

- `.context/docs/` — docs de referência a manter atualizadas
- `server/routes/` — endpoints a documentar
- `src/types/index.ts` — contratos de tipos a descrever
- `package.json` — scripts (fonte dos comandos documentados)

## Key Files

- `server/services/financialEngine.ts` — núcleo de cálculo (doc de negócio mais importante)
- `server/services/parsers/InvoiceParserInterface.ts` — contrato de parsers
- `server/services/parsers/InvoiceParserFactory.ts` — registro de parsers
- `server/routes/reports.ts` — endpoints
- `src/types/index.ts` — tipos compartilhados
- `package.json` — scripts e dependências

## Key Symbols for This Agent

- `processInvoiceConfirmation` @ [financialEngine.ts:73](../../server/services/financialEngine.ts#L73)
- `InvoiceParserStrategy` @ [InvoiceParserInterface.ts:27](../../server/services/parsers/InvoiceParserInterface.ts#L27)
- `InvoiceParserFactory` @ [InvoiceParserFactory.ts:9](../../server/services/parsers/InvoiceParserFactory.ts#L9)
- `extractWithAI` / `extractWithRegex` — duplo caminho de extração (sempre mencionar fallback)
- `PredictabilityReportData` @ [src/types/index.ts:77](../../src/types/index.ts#L77)

## Architecture Context

- **Services** (`server/services`, `server/services/parsers`) — lógica; documentar padrão Strategy e fallback IA→regex
- **Routes** (`server/routes`) — endpoints Express
- **Components** (`src/components`) — UI; documentar fluxos de import/confirm

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md) — precisa da lista atual de parsers
- [Testing Strategy](../docs/testing-strategy.md) — comandos de teste

## Collaboration Checklist

1. Confirmar com autor o que mudou no comportamento (não só o que mudou no código)
2. Ler files alterados antes de escrever
3. Atualizar docs `.context/` afetadas
4. Verificar links relativos entre docs (ex: `../docs/testing-strategy.md`)
5. Frontmatter `status: filled` preservado
6. Sugerir atualização de README se houver

## Hand-off Notes

Reportar: docs atualizadas (paths), o que foi documentado, links verificados, gaps identificados (ex: sem README, sem suite de testes formal).