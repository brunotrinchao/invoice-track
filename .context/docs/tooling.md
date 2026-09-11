---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Tooling & Productivity Guide

Toolchain enxuta: TypeScript strict via `tsc`, Vite para frontend, `tsx` para rodar backend sem build, Prisma CLI para MySQL. Automação mínima — sem pre-commit hooks; o gate principal é `npm run build`.

## Required Tooling

- **Node.js** (LTS ≥ 18) + **npm** — runtime e package manager.
- **MySQL 8** — banco; acessível via `DATABASE_URL` no `.env`.
- **tsx** — executa `server/index.ts` em dev com watch (`npm run dev:backend`).
- **Vite 5** — dev server e build do frontend (`npm run dev:frontend` / `npm run build`).
- **Prisma 5 CLI** — gera client e aplica schema (`npm run db:*`).

## Recommended Automation

- `npm run dev` — `concurrently` sobe backend (`tsx watch`) + frontend (Vite) juntos, com HMR.
- `npm run build` — `tsc && vite build`; use como verificação de tipos antes de commit (não há lint hook).
- `npm run db:push` — aplica `prisma/schema.prisma` ao banco sem migration.
- `npm run db:refresh` — **destrutivo**: `--force-reset` apaga dados; usar só para reseed.
- Scripts de parser: `npx tsx server/test_parser.ts` e `npx tsx server/tests/ScannerTest.ts` para iterar em regex/parsers com texto real de PDF.

## IDE / Editor Setup

- Extensão TypeScript/ESLint padrão — erro de tipo aparece no editor antes do build.
- Prettier não configurado no projeto; manter estilo existente dos arquivos ao editar.

## Productivity Tips

- Para depurar parser de emissor específico, extraia o texto com `parsePdfInvoice` e cole no script de teste correspondente (`server/tests/ScannerTest.ts`) — mais rápido que re-upload na UI.
- `npm run dev:frontend` sozinho basta para trabalho só em `src/`; backend não precisa restart para mudanças em `src/`.
- Mudanças em `prisma/schema.prisma`: `npm run db:generate` + `npm run db:push`; nunca resetar sem backup.

## Cross-References

- [Development Workflow](./development-workflow.md) — comandos no fluxo diário.
- [Testing Strategy](./testing-strategy.md) — como validar sem suite formal.
