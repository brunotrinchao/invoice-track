---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Development Workflow

Projeto individual (single-dev) focado em ferramenta de previsibilidade de faturas. Fluxo típico: alterar código → verificar com `tsc`/`vite build` → testar parser afetado com scripts ad-hoc (`server/tests/`) → commit. Prioridade: correção dos valores financeiros (arredondamento, mês de referência) e robustez dos parsers.

## Branching & Releases

- Projeto ainda **não é repositório git** (`Is a git repository: false`). Ao versionar: suggested `feature/<nome>` e `fix/<nome>`.
- Sem releases/tagging — versão estática `1.0.0` em `package.json`.
- Conventional commits (`feat:`, `fix:`, `refactor:`, ...) recomendados desde o início.

## Local Development

```
- Install:      npm install
- Dev (full):   npm run dev          # concurrently: tsx watch server + vite
- Dev backend:  npm run dev:backend  # tsx watch server/index.ts
- Dev frontend: npm run dev:frontend # vite
- Build:        npm run build        # tsc && vite build
- DB schema:    npm run db:generate  # prisma generate
- DB push:      npm run db:push
- DB reset:     npm run db:refresh   # prisma db push --force-reset (DESTRUTIVO)
```

Ambiente: `.env` com `DATABASE_URL` (MySQL) e credenciais Gemini. Backend roda em modo watch — não há build de servidor para dev.

## Code Review Expectations

- Mudanças em `server/services/financialEngine.ts` exigem verificação extra: é o núcleo de cálculo (somas, arredondamento, mês de referência). Erros conhecidos em sessões anteriores envolvem soma de ponto flutuante e subtestes do parser.
- Novo parser de emissor deve implementar `InvoiceParserStrategy` e ser registrado no `InvoiceParserFactory`.
- Extração IA (`aiExtractor.ts`) tem fallback regex (`regexExtractor.ts`) — mudanças na extração devem preservar esse duplo caminho.
- Sem framework de teste formal; validação via scripts em `server/tests/` e build limpo.

## Onboarding Tasks

1. Rodar `npm run dev` e importar um PDF de fatura real pela UI.
2. Ler `server/services/financialEngine.ts` (núcleo) e `InvoiceParserFactory` (extensão).
3. Ver [Testing Strategy](./testing-strategy.md) para como validar mudanças sem suite formal.
