# Compras Recorrentes — Documento de Design

**Data:** 2026-09-12
**Repo:** Invoice-Track
**Stack:** Express + Prisma 5 + MySQL, React 18 + Tailwind + Recharts
**Status:** Rascunho para revisão

## 1. Objetivo

Marcar item de fatura como **recorrente**. O item se propaga às faturas do mesmo cartão. O intervalo é definido pelo usuário. O dashboard mostra gráfico de previsão de recorrentes. O gráfico segue os filtros existentes.

## 2. Decisões de produto

| # | Decisão | Detalle |
|---|----------|---------|
| 1 | **Ativar** | Toggle em item. Modal: "A partir de qual fatura?" Opções = faturas NÃO PAGAS. Default = primeira não paga. Campo "Até qual fatura?" opcional. Sem término = para sempre. Valor fixo, herdado do item. |
| 2 | **Desativar** | Remove instâncias de faturas NÃO PAGAS. Faturas PAGAS conservam o item como histórico. |
| 3 | **Adicionar manual** | Formulário: cartão, descrição, valor, mês início, mês fin (opcional). Para assinaturas ainda não vistas em PDF. |
| 4 | **Dashboard** | Gráfico de recorrentes que segue filtros (cartões, intervalo). Previsão: histórico materializado + projeção futura até término. |
| 5 | **Valor** | Fixo propagado. Edição manual por fatura continua possível. A propagação não reescribe valores editados. |

## 3. Arquitetura

### 3.1 Modelo de dados (Prisma)

**Novo modelo `RecurringItem`** (registro = fonte de verdade):

```prisma
model RecurringItem {
  id             String    @id @default(uuid())
  cardId         String    @map("card_id")
  card           Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
  description    String
  amount         Decimal   @map("amount") @db.Decimal(10, 2)
  startMonthYear String    @map("start_month_year") // "YYYY-MM" — primeira fatura onde aparece
  endMonthYear   String?   @map("end_month_year")   // null = para sempre
  active         Boolean   @default(true)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  items          InvoiceItem[]

  @@index([cardId])
  @@map("recurring_items")
}
```

**Campos novos em `InvoiceItem`** (instância materializada):

```prisma
model InvoiceItem {
  // ... campos existentes ...
  isRecurring     Boolean        @default(false) @map("is_recurring")
  recurringItemId String?        @map("recurring_item_id")
  recurringItem   RecurringItem? @relation(fields: [recurringItemId], references: [id], onDelete: SetNull)

  @@index([recurringItemId])
}
```

**Card**: adicionar `recurringItems RecurringItem[]`.

**Migração:** `prisma migrate dev --name add_recurring_items`. Tabela nova + 2 colunas + índice. Rollback: `prisma migrate resolve`.

### 3.2 serviço de propagação

Arquivo: `server/services/recurringService.ts`. Todas as operações em transação.

| Função | Comportamento |
|--------|---------------|
| `createRecurring(...)` | Valida `start <= end`. Valida `start >= primeira fatura não paga`. Cria registro. Chama `backfill()`. |
| `createRecurringFromItem(...)` | Cria registro copiando description e amount do item. Adopta o item origem. Chama `backfill()`. |
| `updateRecurring(...)` | Atualiza registro. Adiciona a meses novos. Remove instâncias de faturas não pagas fora do novo intervalo. |
| `deleteRecurring(id)` | Remove instâncias com `recurringItemId = id` em faturas NÃO PAGAS. Faturas pagadas ficam. Remove registro. |
| `backfill(...)` | Para cada fatura do cartão no intervalo: existe item com mesmo `recurringItemId`? Skip. Existe item com mesma descrição + mesmo amount? Adoptar. Senão criar item novo. |
| `applyRecurringToInvoice(cardId, monthYear)` | Chamada por financialEngine após confirmar fatura. Aplica recorrentes ativos. Mesma lógica de dedup. |
| `recalculateCardTotals(cardId)` | Reutiliza lógica de financialEngine. Chamada ao final de cada operação. |

**Regras clave:**
- **Adopt vs criar**: PDF real já tem "NETFLIX 21,99" + recorrência coincide (descrição + amount)? Adopta o item real. Não duplica. Amount diferente? Cria instância separada.
- **Parcelas**: item parcelado como recorrente = flat. `totalInstallments=1`, `currentInstallment=1`. Usa `originalAmount`.
- **overwriteExisting=true**: depois de limpar items do mês, financialEngine chama `applyRecurringToInvoice` para re-materializar.

### 3.3 Integração financialEngine

Em `processInvoiceConfirmation`, depois do loop de items e antes do recálculo de totals:

```ts
await applyRecurringToInvoice(card.id, monthReferenced);
```

A propagação deve rodar antes do recálculo. Assim os totals incluem os recorrentes.

### 3.4 Endpoints

**`server/routes/recurring.ts`** — novo router, montado em `/api/recurring`:

| Método | Ruta | Body / Query | Resposta |
|--------|------|--------------|-----------|
| GET | `/` | `?cardId=` | Lista registros + contagem de instâncias |
| GET | `/:id` | — | Registro + instâncias |
| POST | `/` | `{cardId, description, amount, startMonthYear, endMonthYear?}` | Registro criado + instâncias |
| POST | `/from-item` | `{itemId, startMonthYear, endMonthYear?}` | Registro + instâncias |
| PATCH | `/:id` | `{amount?, endMonthYear?, active?}` | Registro atualizado + re-propagação |
| DELETE | `/:id` | — | Desativar + instâncias não pagas removidas |

**`GET /api/reports/recurring`** — novo em `reports.ts`:
- Query: `cardIds` (comma), `from` (YYYY-MM), `to` (YYYY-MM)
- Resposta:
```json
{
  "months": [
    {
      "monthYear": "2026-09",
      "total": 89.97,
      "isProjected": false,
      "items": [{ "description": "Netflix", "amount": 21.99, "cardId": "..." }]
    }
  ],
  "summary": { "monthlyAverage": 89.97, "nextMonthTotal": 89.97, "activeCount": 4 }
}
```
- Materializado: meses com fatura existente. Soma `InvoiceItem.isRecurring=true`.
- Proyectado: meses futuros sem fatura. Soma `RecurringItem.active` no intervalo. `isProjected: true`.
- Respeita filtro `cardIds`.

### 3.5 Frontend

**Componentes novos:**

| Componente | Arquivo | Descrição |
|------------|---------|-------------|
| `SetRecurringModal.tsx` | `src/components/` | Modal ativar. Select "A partir de" (faturas não pagas). Select "Até" (opcional). Preview "Se aplicará a N faturas". POST `/from-item`. |
| `AddRecurringModal.tsx` | `src/components/` | Form manual: cartão, descrição, valor, mês início, mês fin opcional. POST `/`. |
| `RecurringChart.tsx` | `src/components/` | Chart Recharts. Total recorrente por mês. Sólido = realizado. Dashed = projetado. Tooltip com breakdown de items. Segue filtros do dashboard. |

**Cambios em existentes:**
- `InvoiceManagement.tsx`: botão toggle (ícone Repeat, lucide-react) em cada item. Item com `isRecurring` → badge "Recorrente" + menu. Toggle on → `SetRecurringModal`. Desativar → confirmação → DELETE.
- Dashboard: card nova com `RecurringChart`. Respeta `MultiSelectCardFilter` + `DateRangePicker`.

**Copy PT-BR:**
- Toggle: "Marcar como recorrente" / "Recorrente"
- Modal: "A partir de qual fatura?", "Até qual fatura?" (opcional), "Esta compra se repetirá em N faturas", "Cancelar" / "Confirmar"
- Desativar: "Desativar recorrência", "Será removida de N faturas não pagas. Faturas pagadas conservan o histórico."
- Badge: "Recorrente" · tooltip: "Se repite automaticamente em cada fatura"

### 3.6 Edge cases

| Caso | Tratamento |
|------|--------|
| `start > end` | 400 validation |
| Sem faturas não pagas | Start options = próximo mês depois de última fatura. "Próxima fatura (projetada)". Sem faturas? Mês actual. |
| Fatura paga dentro do intervalo | Se adiciona instância igualmente. Ao desativar se conserva. |
| Término editado a pasado | Se removem instâncias de faturas não pagas fora do novo intervalo. Pagadas ficam. |
| Item real do PDF duplicado | Adopt (dedup por descrição + amount) |
| Cambio de preço em PDF real | Instância separada (adopt não corresponde) |
| Cartão eliminado | Cascade remove RecurringItem. `InvoiceItem.recurringItemId` → SetNull |
| bulk-delete faturas | Instâncias morrem com fatura. Registro intacto. Projeção futura segue. |
| overwriteExisting em confirm | Re-aplicar recorrentes depois de limpeza |
| Item parcelado como recorrente | Flat mensual (`totalInstallments=1`) |
| Concurrent toggles | Transação por operação. Last-write-wins em registro. |

### 3.7 Tests

- **Unit** (`server/tests/recurring.test.ts`): create/backfill, adopt vs criar, desativar (não pagas removidas, pagadas ficam), update término (adiciona/remove), validações (start>end), recalc totals.
- **Integração**: confirm flow + `applyRecurringToInvoice` (dedup com overwrite). Endpoint report (materializado + projetado, filtro cardIds).
- **Frontend**: mocks fetch para SetRecurringModal (lista não pagas, default primeira), AddRecurringModal, RecurringChart render.

## 4. Scope

**MVP:**
- Schema + migração
- recurringService (create/update/delete/backfill/apply)
- Integração financialEngine
- Endpoints recurring + report
- Toggle + SetRecurringModal + AddRecurringModal
- RecurringChart no dashboard

**v2 (fora de escopo):**
- Detección automática de recorrências (heurística sobre histórico)
- Edición de valor por instância com re-propagação inteligente
- Notificações de variação de preço
- Export CSV de recorrentes

## 5. Riscos

- **Duplicados com PDF real**: mitigado por adopt-dedup. Risco residual: amounts idénticos de compras distintas (adopt incorrecto). Aceptable — usuario pode desmarcar.
- **Recalc totals**: propagação antes de recálculo em confirm. Test de integração obrigatorio.
- **Faturas projetadas vs materializadas**: chart mistura ambas. Distinguir visualmente (dashed = projeção).
- **Migração em prod**: tabela nova + colunas nullable. Sem backfill de dados. Risco baixo.

## 6. Refactorização Frontend: React → Vue 3 + Nuxt

Decisão estratégica: migrar frontend de React 18 + Vite a **Vue 3 + Nuxt 3**. Objetivo: componentização total, base mais sólida para evolução do produto.

### 6.1 Por qué Nuxt

| Razón | Detalle |
|-------|---------|
| Ecosistema Vue 3 | Composition API, `<script setup>`, directives nativas |
| Nuxt 3 | Auto-import de componentes, server routes, SSR/SSG, módulos |
| Performance | Auto-import, lazy loading, tree-shaking |
| DX | Convenções de directorios, `nuxt build`, dev server integrado |
| Comunidade | Módulos: pinia (state), nuxt-ui (UI kit), nuxt-icon |

### 6.2 Estrutura de componentes (componentização total)

```
app/
├── components/
│   ├── ui/                    # primitivos reutilizables
│   │   ├── AppButton.vue
│   │   ├── AppInput.vue
│   │   ├── AppSelect.vue
│   │   ├── AppModal.vue
│   │   ├── AppBadge.vue
│   │   └── AppCard.vue
│   ├── charts/
│   │   ├── AreaChart.vue      # wrapper Recharts→ECharts/Vega
│   │   ├── PieChart.vue
│   │   └── BarChart.vue
│   ├── cards/
│   │   ├── CreditCardWidget.vue
│   │   └── CardFilter.vue
│   ├── invoices/
│   │   ├── InvoiceList.vue
│   │   ├── InvoiceItemRow.vue
│   │   ├── InvoiceDetail.vue
│   │   └── recurring/
│   │       ├── SetRecurringModal.vue
│   │       ├── AddRecurringModal.vue
│   │       └── RecurringToggle.vue
│   ├── upload/
│   │   └── PdfUploader.vue
│   └── dashboard/
│       ├── RecurringChart.vue
│       ├── PredictabilityChart.vue
│       └── ReportStats.vue
├── composables/                # lógica reutilizable
│   ├── useInvoices.ts
│   ├── useRecurring.ts
│   └── useReports.ts
├── stores/                     # Pinia
│   ├── invoiceStore.ts
│   ├── cardStore.ts
│   └── recurringStore.ts
├── pages/
│   ├── index.vue               # dashboard
│   ├── invoices/
│   │   └── [id].vue
│   └── upload.vue
├── server/
│   └── api/                    # proxy a Express API
└── assets/css/main.css
```

### 6.3 Mapeo React → Vue

| React atual | Vue 3 + Nuxt |
|-------------|--------------|
| `InvoiceManagement.tsx` | `pages/invoices/[id].vue` + `components/invoices/*` |
| `PredictabilityChart.tsx` | `components/dashboard/PredictabilityChart.vue` |
| `ReportStats.tsx` | `components/dashboard/ReportStats.vue` |
| `PieCharts.tsx` | `components/charts/PieChart.vue` |
| `BankBarChart.tsx` | `components/charts/BarChart.vue` |
| `CreditCardWidget.tsx` | `components/cards/CreditCardWidget.vue` |
| `MultiSelectCardFilter.tsx` | `components/cards/CardFilter.vue` |
| `DateRangePicker.tsx` | `components/ui/DateRangePicker.vue` |
| `PdfUploader.tsx` | `components/upload/PdfUploader.vue` |
| `Header.tsx` | `components/layout/AppHeader.vue` |
| `ConfirmationModal.tsx` | `components/ui/AppModal.vue` |
| Recharts | ECharts (nuxt module `nuxt-echarts`) o Vega-Lite |

### 6.4 Estado e API

- **Pinia** stores: invoiceStore, cardStore, recurringStore — substituye useState/context manual
- **Composables**: useInvoices, useRecurring, useReports — encapsulan fetch a `/api/*` (Express backend se mantiene)
- **Nuxt server routes** (`server/api/*`): proxy a Express API, evita CORS en prod
- **Tipos compartidos**: `types/` — contratos de API (Invoice, InvoiceItem, RecurringItem)

### 6.5 Migração por fases (feature-first)

1. **Fase 0 — Bootstrap**: Nuxt 3 + Tailwind + Pinia + ECharts. Página dashboard con datos mock.
2. **Fase 1 — Componentes UI base**: AppButton, AppInput, AppSelect, AppModal, AppBadge, AppCard. Test visual.
3. **Fase 2 — Migração por dominio**: upload → invoices → cards → dashboard. Cada dominio: componentes Vue + composable + store + tests.
4. **Fase 3 — Charts**: migrar Recharts → ECharts. RecurringChart novo (feature recorrentes).
5. **Fase 4 — Eliminar React**: remover `src/` React, Vite config, dependencias react/recharts. `npm run build` → `nuxt build`.
6. **Fase 5 — Feature recorrentes** (sección 3) sobre base Vue.

### 6.6 Riscos migração

| Risco | Mitigação |
|-------|-----------|
| Regresión funcional | Test E2E por dominio antes de eliminar React (Playwright) |
| Charts distintos (Recharts→ECharts) | Comparar visual side-by-side por chart |
| Estado global | Pinia stores com contratos testados |
| Curva Vue | Skills Vue + code review dedicado |

## 7. Agentes e Skills por etapa

### 7.1 Etapas do processo

| Etapa | Agente(s) | Skill(s) | Output |
|-------|-----------|----------|--------|
| **1. Planificação** | `oh-my-claudecode:planner` (Opus) + `oh-my-claudecode:analyst` | `superpowers:brainstorming`, `superpowers:writing-plans` | Design doc + implementation plan |
| **2. Migração frontend** | `frontend-developer` (Vue) + `oh-my-claudecode:executor` | `frontend-design`, `ui-ux-pro-max`, `vue-*` skills, `tailwind-patterns` | Componentes Vue + stores + tests |
| **3. Backend recorrentes** | `backend-architect` + `oh-my-claudecode:executor` | `onfly-php` (se aplica), `database-migration`, `testing-patterns` | Schema + servicio + endpoints |
| **4. Charts** | `frontend-developer` + `oh-my-claudecode:designer` | `dataviz`, `frontend-design`, `ui-ux-pro-max` | RecurringChart + migração ECharts |
| **5. QA/Tests** | `oh-my-claudecode:qa-tester` + `test-engineer` | `e2e-testing`, `playwright-skill`, `testing-patterns` | Suites unit + integração + E2E |
| **6. Revisão** | `oh-my-claudecode:code-reviewer` + `security-reviewer` | `code-review`, `security-review`, `verify-before-complete` | Findings + fix |
| **7. Deploy** | `devops-automator` | `docker-expert`, `cicd-automation` | Build Nuxt + deploy |

### 7.2 Skills principais por dominio

| Domínio | Skills |
|---------|--------|
| Vue/Nuxt | `vue-*` (disponibles en el entorno), `frontend-design`, `ui-ux-pro-max`, `tailwind-patterns`, `nuxt-*` |
| Charts | `dataviz` (obrigatório antes de escribir chart), `frontend-design` |
| Backend | `database-migration`, `database-design`, `testing-patterns`, `api-design-principles` |
| QA | `e2e-testing`, `playwright-skill`, `test-driven-development` |
| Seguridad | `security-review`, `secrets-management` |
| Git/PR | `commit`, `git-pr-workflows-*`, `finishing-a-development-branch` |

### 7.3 Orden de ejecución com agentes

```
1. planner + analyst        → plan detalhado (writing-plans)
2. frontend-developer       → Fase 0-1 (bootstrap + UI base, ui-ux-pro-max)
3. frontend-developer       → Fase 2 (migração por dominio, com qa-tester paralelo)
4. backend-architect        → schema + recurringService (paralelo com Fase 2)
5. frontend-developer       → Fase 3 (charts) + RecurringChart
6. test-engineer + qa       → suites completas
7. code-reviewer + security → revisão final
8. devops-automator         → build + deploy
```

Nota: agentes com modelo roto (sonnet/opus) requieren `model: sonnet` explícito ou fallback a `oh-my-claudecode:executor` com `model: haiku`.

## 8. Idioma obrigatório

- **Comunicación com usuário**: toda comunicação, explicación de conceptos e respostas ao usuário DEVE ser em português (pt-BR). Obrigatório em todas as etapas e agentes.
- **Código e artefatos técnicos**: código, comentários, nomes de variáveis, tests, commit messages e documentação técnica em inglês (convenção do repo, ver AGENTS.md).
- **Copy de produto (UI)**: labels, tooltips, mensagens de error e confirmaciones em pt-BR.
- **Specs e docs de produto**: este documento e futuros design docs em pt-BR.
