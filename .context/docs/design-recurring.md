# Design Spec — Compras Recorrentes (Invoice-Track)

Contexto: item table em `InvoiceManagement.tsx` (colunas Descrição | Cartão | Parcela | Tipo | Valor, badges chip `bg-*-100 text-*-700 border-*-200`, montos `font-mono`, `R$ x.toLocaleString('pt-BR', { minimumFractionDigits: 2 })`), status pill Pago/Não Pago (dot emerald/amber), modales overlay `animate-in fade-in zoom-in-95`, palette slate + indigo `#4f46e5`/`#2563eb` (CARD_COLORS), `MultiSelectCardFilter` (empty = todos), `DateRangePicker` (monthYear YYYY-MM), `PredictabilityChart` con viewMode toggle byCard/byBank.

---

## (a) Toggle + modal set-recurring

**Toggle na fila de item** — nova columna `Rec.` na tabla "Compras e Lançamentos no Banco". Switch compacto (icono `Repeat` lucide):

```
┌─ Compras e Lançamentos no Banco (12) ──────────────────────────┐
│ Descrição          Cartão     Parcela  Tipo    Valor     Rec.  │
│ ────────────────────────────────────────────────────────────── │
│ Netflix            •••• 1234  À vista  COMPRA  R$ 19,90  ( )   │
│ Spotify            •••• 4321  1/1      COMPRA  R$ 15,90  (●)   │
│   ↳ [↻ REC · até Jul 2026]   ← chip clicable (editar rango)    │
│ ────────────────────────────────────────────────────────────── │
│ ( ) = OFF gris   (●) = ON indigo #4f46e5 + tooltip rango       │
└────────────────────────────────────────────────────────────────┘
```

- **OFF → click**: abre `SetRecurringModal` (modo crear).
- **ON → click**: abre confirmación destructiva (unset).
- **Chip REC → click**: abre modal pre-llenado (modo editar).
- **Fatura paga**: sin switch; chip gris estático `↻ REC · histórico` con tooltip "Faturas pagadas conservan historial — la recorrência se gestiona en faturas no pagadas".
- **Sin faturas no pagadas del cartão**: switch disabled + tooltip "No hay faturas pendientes para este cartão".

**SetRecurringModal:**

```
┌────────────────────────────────────────────────────────────────┐
│  ↻  Marcar como recorrente                       [✕]          │
│  ──────────────────────────────────────────────────────────── │
│  Item:  Netflix · R$ 19,90 · •••• 1234                        │
│  Valor fijo: R$ 19,90  (se hereda del item)                   │
│                                                               │
│  A partir de qual fatura?  *                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [Set 2026 · R$ 1.234,56        ▾]  ← native select        │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ↳ Solo faturas NO pagadas del cartão · default: 1ª no paga   │
│                                                               │
│  Até qual fatura?  (opcional)                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [Para sempre / Jul 2026 · R$ ...        ▾]                │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ↳ Sin término = recorre para siempre                         │
│                                                               │
│  Se añadirá automáticamente a cada fatura no pagada entre     │
│  Set 2026 y Jul 2026.                                         │
│                                                               │
│                       [Cancelar]  [Guardar recorrente]        │
└────────────────────────────────────────────────────────────────┘
```

- Selects nativos (a11y, sin lib nueva).
- Validación inline: "Até" < "A partir de" → `role="alert"` rojo bajo el select.
- Modo editar: mismo modal + botón texto `Quitar recorrência` (rojo, ghost) abajo.

**Confirm unset (modal chico, patrón ConfirmationModal):**

```
┌─ Quitar recorrência? ─────────────────────────────────────────┐
│  ↻ Spotify · R$ 15,90 · •••• 4321                             │
│  Se eliminará de las faturas NO pagadas a partir de Set 2026. │
│  El historial en faturas pagadas se conserva.                 │
│                    [Cancelar]  [Quitar recorrência]  (rojo)   │
└───────────────────────────────────────────────────────────────┘
```

---

## (b) Modal add-manual

Entry: botón `＋ Recorrente manual` en header de `InvoiceManagement` (junto al filtro status) + link `＋ Manual` en el card del chart. Sin PDF.

```
┌────────────────────────────────────────────────────────────────┐
│  ＋  Nueva compra recorrente                     [✕]          │
│  ──────────────────────────────────────────────────────────── │
│  Descrição *                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [Spotify Premium                                        ] │ │
│  └──────────────────────────────────────────────────────────┘ │
│  Valor (R$) *              Cartão *                           │
│  ┌─────────────────────┐  ┌────────────────────────────────┐ │
│  │ [15,90              ]│  │ [Nubank •••• 1234       ▾]    │ │
│  └─────────────────────┘  └────────────────────────────────┘ │
│  Mês de início *          Mês de fin (opcional)               │
│  ┌─────────────────────┐  ┌───────────────────────────────┐  │
│  │ [2026-09        ▾]  │  │ [Sin fin / 2027-03      ▾]   │  │
│  └─────────────────────┘  └───────────────────────────────┘  │
│  ↳ Se materializará en las faturas no pagadas del cartão     │
│    desde Set 2026.                                            │
│                                                               │
│                       [Cancelar]  [Crear recorrente]          │
└────────────────────────────────────────────────────────────────┘
```

- `Mês de início` default: mes de la 1ª fatura no pagada del cartão seleccionado (o mes actual si no hay).
- Month pickers: selects nativos `YYYY-MM` (mismo formato que `monthYear` del backend).
- Valor: `input type="number" step="0.01"` con prefijo `R$`.

---

## (c) Chart dashboard

Nuevo card `RecurringForecastChart` debajo de `PredictabilityChart` (mismo grid), no integrado como viewMode — dataset distinto (forecast), no inflar chart existente.

```
┌─ ↻ Previsión de Recorrentes ───────────────────────────────────┐
│  Base: 2 cartões filtrados · [＋ Manual]                       │
│  KPI: Próximo mes R$ 54,80 · 4 recorrentes activos             │
│  ────────────────────────────────────────────────────────────  │
│  R$ 80 ┤        ▓▓                                             │
│  R$ 60 ┤   ▓▓   ▓▓   ▒▒▒▒                                      │
│  R$ 40 ┤   ▓▓   ▓▓   ▒▒▒▒   ▒▒▒▒                               │
│  R$ 20 ┤   ▓▓   ▓▓   ▒▒▒▒   ▒▒▒▒   ▒▒▒▒                        │
│        └───┬────┬────┬────┬────┬────┬────                      │
│           May  Jun  Jul  Ago  Set  Oct                         │
│           ▓ confirmado   ▒ proyección      ┊ (linea "hoy")     │
│                                                               │
│  Tooltip Set 2026: "R$ 54,80 · proyección                     │
│     Netflix R$ 19,90 · Spotify R$ 15,90 · ... (N recorrentes)"│
└────────────────────────────────────────────────────────────────┘
```

- Recharts `ComposedChart`: `Bar` sólido indigo `#4f46e5` = meses con faturas materializadas; `Bar` `fillOpacity 0.35` + `strokeDasharray "4 2"` indigo `#a5b4fc` = proyección futura. Distinción por patrón + color (no solo color).
- Línea vertical de referencia en el mes actual (`ReferenceLine`, dashed slate).
- Tooltip custom (patrón `CustomTooltip` existente): total + desglose por recorrente (descripción + monto), etiqueta `confirmado`/`proyección`.
- Y tick formatter idéntico: `R$ ${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`.
- KPI arriba: "Próximo mes R$ X" + "N recorrentes activos" (chip indigo).
- Cuando una proyección se materializa (fatura confirmada), la barra pasa de dashed a sólida automáticamente (server devuelve `historical: true`).

---

## Componentes nuevos

| Componente | Props |
|---|---|
| `RecurringToggle` | `{ item: InvoiceItem; invoice: Invoice; recurring: Recurrence \| null; onEnable(item, invoice): void; onDisable(recurrence): void }` — switch + chip REC + estados disabled |
| `SetRecurringModal` | `{ open: boolean; item: InvoiceItem; invoice: Invoice; unpaidInvoices: Invoice[]; existing?: Recurrence \| null; onSave(payload: SetRecurrencePayload): void; onRemove?(recurrenceId): void; onCancel(): void }` — crear/editar |
| `AddRecurringModal` | `{ open: boolean; cards: Card[]; onSave(payload: CreateRecurrencePayload): void; onCancel(): void }` |
| `ConfirmUnsetRecurringModal` | `{ recurrence: Recurrence; itemLabel: string; onConfirm(): void; onCancel(): void }` |
| `RecurringForecastChart` | `{ data: RecurringForecastPoint[]; cardsCount: number; selectedCardsCount: number; loading: boolean }` |

Types (`src/types/index.ts`):
```ts
interface Recurrence { id: string; itemDescription: string; amount: number; cardId: string;
  startMonth: string; endMonth?: string | null; active: boolean }
interface RecurringForecastPoint { monthYear: string; total: number; historical: boolean;
  recurring: { description: string; amount: number }[] }
interface SetRecurrencePayload { itemId: string; startMonth: string; endMonth?: string | null }
interface CreateRecurrencePayload { description: string; amount: number; cardId: string;
  startMonth: string; endMonth?: string | null }
```
Backend (fuera de scope UI): `GET /api/reports/recurring?cardIds&from&to` + CRUD `/api/recurrences`.

---

## Estados / edge cases

| Caso | Comportamiento |
|---|---|
| Item ya recurrente | Switch ON indigo; chip `↻ REC · até Jul 2026` (o `para sempre`); click chip = editar |
| Item en fatura paga | Sin switch; chip gris `↻ histórico`; tooltip "gestionar en faturas no pagadas" |
| Toggle OFF con término pasado | Chip gris `↻ finalizó Jul 2026`; switch OFF; tooltip "Recorrencia finalizada"; click = reactivar (modal pre-llenado) |
| Dedup visual | 1 chip por recurrencia aunque el item exista en N faturas; tooltip chart agrupa por recurrencia; proyección no duplica meses ya materializados (server: materializado gana) |
| Sin faturas no pagadas del cartão | Toggle disabled + tooltip |
| "Até" anterior a "A partir de" | Error inline `role="alert"`, botón Guardar disabled |
| Valor difiere entre faturas (histórico) | Histórico muestra monto real; proyección usa valor fijo; tooltip marca ambos |
| Fatura con item recurrente se elimina | Recurrencia sobrevive y sigue proyectando (documentar) |
| Rango filtro termina antes del término | Chart corta en `to`; sin barras tras fin de rango |

---

## Copy PT-BR

| Elemento | Copy |
|---|---|
| Switch tooltip OFF | "Marcar como recorrente" |
| Switch tooltip ON | "Recorrente · até {mes} · clic para quitar" |
| Chip | `↻ REC` · `↻ REC · até {Mmm YYYY}` · `↻ histórico` · `↻ finalizó {Mmm YYYY}` |
| Modal título | "Marcar como recorrente" |
| Campo 1 | "A partir de qual fatura?" + help "Solo faturas no pagadas del cartão" |
| Campo 2 | "Até qual fatura? (opcional)" + help "Sin término = para sempre" |
| Valor | "Valor fijo: R$ {x} (se hereda del item)" |
| Nota | "Se añadirá automáticamente a cada fatura no pagada entre {A} y {B}." |
| Botones | "Cancelar" / "Guardar recorrente" / "Quitar recorrência" / "Crear recorrente" |
| Confirm unset | "Se eliminará de las faturas NO pagadas a partir de {mes}. El historial en faturas pagadas se conserva." |
| Modal manual título | "Nueva compra recorrente" |
| Labels manual | "Descrição" · "Valor (R$)" · "Cartão" · "Mês de início" · "Mês de fin (opcional)" |
| Chart título | "Previsión de Recorrentes" |
| Chart leyenda | "Confirmado" / "Proyección" |
| Chart KPI | "Próximo mes R$ {x}" · "{n} recorrentes activos" |
| Tooltip chart | "{Mmm YYYY} · R$ {x} · {confirmado\|proyección}" + desglose |
| Empty state chart | "Sin recorrentes en el período." |
| Error validación | "La fatura final debe ser posterior a la inicial." |
| Error genérico | "Falha ao guardar recorrência." |

---

## Integración con filtros existentes

- **MultiSelectCardFilter**: `selectedCardIds` ya vive en `App.tsx` → se pasa a `RecurringForecastChart` y al fetch `/api/reports/recurring?cardIds=...`. Convención existente: array vacío = todos los cartões (sin cambio de contrato).
- **DateRangePicker**: `from`/`to` (`YYYY-MM`) → mismos params del fetch; proyección se trunca en `to`; `from` limita histórico mostrado. Cambio de rango re-dispara fetch (mismo patrón que `reportData`).
- Ubicación: `App.tsx` tras `<PredictabilityChart ... />` en el mismo contenedor grid, props `{ data, cardsCount, selectedCardsCount, loading }` — el fetch vive en App (mismo patrón que reportData), el componente es puro.
- Los modales no dependen de filtros (operan sobre la fatura/cartão actual).

---

## A11y

- **Switch**: `role="switch"` + `aria-checked`, label visible "Recorrente", `focus-visible` ring indigo, Space/Enter toggle, tooltip también en `aria-describedby`.
- **Modales**: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (título), focus trap, Esc cierra, focus inicial en primer campo, focus restaurado al cerrar, overlay click cierra (excepto confirm destructivo: solo botones).
- **Selects nativos** con `<label>` asociado + `aria-describedby` para texto de ayuda.
- **Chart**: `aria-label` resumen textual ("Gráfico de previsión de recorrentes: R$ 54,80 confirmados en Ago, R$ 54,80 proyectados en Set"); distinción confirmado/proyección por patrón (dashed) + color, no solo color; tooltip Recharts accesible por teclado.
- **Errores inline**: `role="alert"`; botón destructivo rojo con texto de advertencia visible (no solo color).

**Decisión clave**: toggle + chip + modal en modo crear/editar/quitar (3 superficies, 1 modal reutilizado) — minimiza clicks y mantiene el patrón visual existente (chips, glass-card, font-mono, R$ pt-BR).