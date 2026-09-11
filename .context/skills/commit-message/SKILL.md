---
type: skill
name: Commit Message
description: Generate commit messages that follow conventional commits and repository scope conventions. Use when Creating git commits after code changes, Writing commit messages for staged changes, or Following conventional commit format for the project
skillSlug: commit-message
phases: [E, C]
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Commit Message

## Workflow

1. `git status` + `git diff --staged` — entender mudança
2. Type: feat | fix | refactor | docs | test | chore
3. Scope opcional: `parsers`, `engine`, `ui`, `db` — conforme área alterada
4. Subject ≤ 50 chars, imperativo, sem ponto final
5. Body explica por quê (não o quê); float/parse issues merecem body
6. Trailer obrigatório: `Co-Authored-By: Claude Code <noreply@anthropic.com>`

## Examples

**Feature:**
```
feat(parsers): add Nubank invoice parser

Novo emissor com formato de fatura PDF parseado pelo InvoiceParserFactory.
Registrado no factory e testado com fatura real de 3 páginas.

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

**Fix financeiro:**
```
fix(engine): round consolidated total to avoid float drift

Soma acumulada produzia 108.61000000000001 em vez de 108.61,
quebrando comparação com o total do boleto. Arredondamento
movido para a consolidação (não por item).

Co-Authored-By: Claude Code <noreply@anthropic.com>
```

## Quality Bar

- Imperativo ("add" não "added"/"adds")
- Subject ≤ 50 chars, sem ponto final
- Linha em branco entre subject e body
- Body explica por quê; código mostra o quê
- Um change lógico por commit
- Trailer `Co-Authored-By: Claude Code <noreply@anthropic.com>` sempre no fim

## Resource Strategy

- Sem recursos extras — formato embutido
- Histórico real de commits (quando repo versionado) serve de referência de estilo