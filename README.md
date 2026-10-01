# Invoice Track

Controle de cartões de crédito e faturas a partir dos PDFs dos bancos. O usuário envia o PDF da fatura; a IA extrai cartões, compras, parcelas, tarifas e créditos; o sistema organiza por cartão/mês, projeta faturas futuras de parcelas, rastreia cobranças recorrentes e gera relatórios e exportações.

## Stack

- **Frontend**: Nuxt 3 (SPA), Vue 3, Tailwind, motion-v (Framer Motion para Vue), ECharts, @vuepic/vue-datepicker
- **Backend**: Express (Node/tsx), Prisma + MySQL 8 (Docker), Redis não obrigatório
- **IA**: Gemini (PDF direto multimodal ou texto) com fallback automático para provedores OpenAI-compatíveis (OpenRouter) — configurável por env
- **PDF export**: Puppeteer (Chrome do sistema) + ECharts SSR; **Excel**: exceljs com fórmulas vivas

## Features

- **Importação por IA**: fila de múltiplos PDFs processados 1 a 1 com revisão individual; extração multimodal do PDF (não só texto); instruções dinâmicas por banco (CRUD + extração de meta-instruções a partir de um PDF de exemplo em Configurações)
- **Revisão da fatura**: editar descrição/valor/parcelas, transformar tarifa/crédito em compra, marcar compra como **recorrente** (regra criada na confirmação e adotada sem duplicar), marcar fatura como paga (faturas retroativas nascem pagas), seleção de cartão quando a IA erra
- **Faturas**: agrupadas por banco/mês, ações em lote (pagar/excluir com seleção múltipla), filtro por período (datepicker), status e ordenação
- **Recorrentes**: gestão por cartão na página de Cartões (drawer com CRUD completo: criar/editar/pausar/excluir); itens se materializam em faturas abertas automaticamente (backfill adota itens idênticos)
- **Dashboard**: KPIs executivos, curva de previsibilidade, totais por banco, próximos parcelas por cartão (com barras de progresso), filtros de banco/período/status
- **Exportações** (respeitam filtros): PDF com relatório escrito por IA + gráficos; Excel com aba de dados + dashboard de fórmulas vivas (SUMIF)
- **Configurações**: status da base, limpar tudo (confirmação digitada "LIMPAR TUDO"), instruções da IA por banco

## Arquitetura

```
app/        Nuxt 3 SPA (pages, components, composables, stores, types)
server/     Express API (routes, services, tests via node:test)
prisma/     Schema MySQL (Card, Invoice, InvoiceItem, InvoiceFee, RecurringItem, BankInstruction)
```

Pipeline de extração: `pdfParser.ts` → Gemini PDF direto → Gemini texto → fallback OpenAI-compatível → validação + normalização (parcelas compactas "PARC 11/12" detectadas por regex server-side). Regras de banco vêm do MySQL (`bank_instructions`) e entram no prompt dinamicamente.

## Rodar (dev)

```bash
cp .env.example .env      # DATABASE_URL (MySQL), PORT, GEMINI_API_KEY, FALLBACK_* (opcional)
npm install
npx prisma generate && npx prisma migrate deploy
npm run dev               # front :3000 (Nuxt dev) + API :PORT (Express, tsx watch)
```

`.env`: `NUXT_PUBLIC_API_URL` deve apontar para a URL da API visível pelo browser (ex: `http://localhost:3004`).

## Servidor local (LAN)

O Express serve API + front (SPA) em uma porta só — a API usada pelo browser é **relativa** (mesma origem), então funciona em qualquer IP sem rebuild com IP fixado:

```bash
npm run serve:local    # rebuild c/ API relativa + Express (porta do .env, ex: 3004)
```

Outras máquinas acessam `http://<ip-desta-máquina>:3004`. Requisitos: porta liberada no firewall; `DATABASE_URL` apontando para o MySQL com os dados.

## Testes

```bash
npm test                              # backend (node:test) + frontend (vitest)
```

Regras: testes E2E usam fixtures escopadas (nunca deleteMany global); IA/Puppeteer pular quando indisponíveis.

## Convenções

- Backend: `ActionDomainService`, rotas finas, services com validação zod onde há input do usuário
- Frontend: componentes auto-importados por pasta (`Ui*`, `Cards*`, `Invoices*`, `Upload*`), composables por domínio
- Motion: tokens em `app/utils/motion.ts` (springs Apple-style, reduced-motion respeitado)