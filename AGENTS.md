# AGENTS.md

## Language
- **User communication**: Always communicate, explain concepts, and respond to the user in Portuguese (pt-BR).
- **Codebase & Artifacts**: Write all code, comments, variable names, functions, tests, commit messages, and documentation exclusively in English.

## Dev environment tips
- Install dependencies with `npm install` before running scaffolds.
- Use `npm run dev` for the interactive TypeScript session that powers local experimentation.
- Run `npm run build` to refresh the CommonJS bundle in `dist/` before shipping changes.
- Store generated artefacts in `.context/` so reruns stay deterministic.

## Testing instructions
- Execute `npm run test` to run both backend (`tsx`) and frontend (`vitest`) test suites.
- Run `npm run test:backend` or `npm run test:frontend` for targeted runs.
- Trigger `npm run build && npm run test` before opening a PR to mimic CI.
- Add or update tests alongside any generator or CLI changes.

## PR instructions
- Follow Conventional Commits (for example, `feat(scaffolding): add doc links`).
- Cross-link new scaffolds in `docs/README.md` and `agents/README.md` so future agents can find them.
- Attach sample CLI output or generated markdown when behaviour shifts.
- Confirm the built artefacts match the new source changes.

## Repository map
- `app/` — Nuxt 3 Vue frontend application (components, pages, composables, stores).
- `docker-compose.yml` — Docker services configuration.
- `package.json` — Root dependencies and scripts for backend/frontend execution.
- `prisma/` — Database schema definitions and migrations.
- `server/` — Express backend server (routes, services, parser engines, tests).

## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `CONTRIBUTING.md`
