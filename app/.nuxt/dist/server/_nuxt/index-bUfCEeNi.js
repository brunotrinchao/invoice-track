import { defineComponent, withAsyncContext, ref, watch, computed, resolveComponent, mergeProps, withCtx, unref, createVNode, toDisplayString, isRef, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate } from "vue/server-renderer";
import { d as defineStore } from "../server.mjs";
import { u as useCardStore } from "./cardStore-d4GdWPm2.js";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/hookable/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/unctx/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/h3/dist/index.mjs";
import "vue-router";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/defu/dist/defu.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/ufo/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/klona/dist/index.mjs";
const useInvoiceStore = defineStore("invoices", {
  state: () => ({
    invoices: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/invoices");
        if (!res.ok) throw new Error(`GET /api/invoices -> ${res.status}`);
        this.invoices = await res.json();
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },
    async fetchOne(id) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error(`GET /api/invoices/${id} -> ${res.status}`);
        const invoice = await res.json();
        const idx = this.invoices.findIndex((i) => i.id === id);
        if (idx >= 0) this.invoices[idx] = invoice;
        else this.invoices.push(invoice);
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },
    async remove(id) {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /api/invoices/${id} -> ${res.status}`);
      this.invoices = this.invoices.filter((i) => i.id !== id);
    },
    async togglePaid(id, isPaid) {
      const res = await fetch(`/api/invoices/${id}/toggle-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid })
      });
      if (!res.ok) throw new Error(`PATCH /api/invoices/${id}/toggle-paid -> ${res.status}`);
      const invoice = await res.json();
      const idx = this.invoices.findIndex((i) => i.id === id);
      if (idx >= 0) this.invoices[idx] = invoice;
    },
    async bulkDelete(ids) {
      const res = await fetch("/api/invoices/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error(`POST /api/invoices/bulk-delete -> ${res.status}`);
      this.invoices = this.invoices.filter((i) => !ids.includes(i.id));
    }
  }
});
const useRecurringStore = defineStore("recurring", {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/recurring");
        if (!res.ok) throw new Error(`GET /api/recurring -> ${res.status}`);
        this.items = await res.json();
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
        this.items = [];
      } finally {
        this.loading = false;
      }
    },
    async create(input) {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!res.ok) throw new Error(`POST /api/recurring -> ${res.status}`);
      this.items.push(await res.json());
    },
    async remove(id) {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /api/recurring/${id} -> ${res.status}`);
      this.items = this.items.filter((r) => r.id !== id);
    },
    async setActive(id, active) {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      if (!res.ok) throw new Error(`PATCH /api/recurring/${id} -> ${res.status}`);
      const updated = await res.json();
      const idx = this.items.findIndex((r) => r.id === id);
      if (idx >= 0) this.items[idx] = updated;
    }
  }
});
function useReports() {
  async function predictability(params = {}) {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.cardIds?.length) query.set("cardIds", params.cardIds.join(","));
    const qs = query.toString();
    const res = await fetch(`/api/reports/predictability${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error(`GET /api/reports/predictability -> ${res.status}`);
    return res.json();
  }
  async function getRecurringReport(params = {}) {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.cardIds?.length) query.set("cardIds", params.cardIds.join(","));
    const qs = query.toString();
    const res = await fetch(`/api/reports/recurring${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error(`GET /api/reports/recurring -> ${res.status}`);
    return res.json();
  }
  return { predictability, getRecurringReport };
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const invoiceStore = useInvoiceStore();
    const cardStore = useCardStore();
    const recurringStore = useRecurringStore();
    [__temp, __restore] = withAsyncContext(() => Promise.all([
      invoiceStore.fetchAll(),
      cardStore.fetchAll(),
      recurringStore.fetchAll()
    ])), await __temp, __restore();
    const selectedCardIds = ref([]);
    const from = ref("");
    const to = ref("");
    const { predictability: fetchPredictability } = useReports();
    const predictability = ref(null);
    const predictabilityError = ref("");
    async function loadPredictability() {
      predictabilityError.value = "";
      try {
        predictability.value = await fetchPredictability({
          cardIds: selectedCardIds.value.length ? selectedCardIds.value : void 0,
          from: from.value || void 0,
          to: to.value || void 0
        });
      } catch (e) {
        predictabilityError.value = e instanceof Error ? e.message : "Error al cargar el reporte";
        predictability.value = null;
      }
    }
    watch([selectedCardIds, from, to], loadPredictability);
    [__temp, __restore] = withAsyncContext(() => loadPredictability()), await __temp, __restore();
    function onDateRange(value) {
      from.value = value.from;
      to.value = value.to;
    }
    function formatMoney(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
    }
    const summary = computed(
      () => JSON.stringify(
        {
          invoices: invoiceStore.invoices.map((i) => i.id),
          cards: cardStore.cards.map((c) => `${c.bankName} ${c.last4Digits}`),
          recurring: recurringStore.items.map((r) => r.description),
          errors: {
            invoices: invoiceStore.error,
            cards: cardStore.error,
            recurring: recurringStore.error,
            predictability: predictabilityError
          }
        },
        null,
        2
      )
    );
    return (_ctx, _push, _parent, _attrs) => {
      const _component_AppCard = resolveComponent("AppCard");
      const _component_CardFilter = resolveComponent("CardFilter");
      const _component_DateRangePicker = resolveComponent("DateRangePicker");
      const _component_RecurringChart = resolveComponent("RecurringChart");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-col gap-6" }, _attrs))}><header class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-white">Invoice Track</h1><p class="text-sm text-dark-muted">Nuevo frontend Nuxt 3 — Fase 0 (bootstrap)</p></div><div class="flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600"><span class="h-2 w-2 rounded-full bg-brand-500"></span> Nuxt 3 + Vue 3 + Pinia + Tailwind </div></header><section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">`);
      _push(ssrRenderComponent(_component_AppCard, { title: "Faturas" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(unref(invoiceStore).invoices.length)}</p>`);
          } else {
            return [
              createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(unref(invoiceStore).invoices.length), 1)
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_AppCard, { title: "Tarjetas" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(unref(cardStore).cards.length)}</p>`);
          } else {
            return [
              createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(unref(cardStore).cards.length), 1)
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(ssrRenderComponent(_component_AppCard, { title: "Recorrentes" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(unref(recurringStore).items.length)}</p>`);
          } else {
            return [
              createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(unref(recurringStore).items.length), 1)
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</section><section class="glass-card rounded-2xl p-5"><h2 class="text-sm font-semibold uppercase tracking-wide text-dark-muted">Filtros</h2><div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">`);
      _push(ssrRenderComponent(_component_CardFilter, {
        modelValue: unref(selectedCardIds),
        "onUpdate:modelValue": ($event) => isRef(selectedCardIds) ? selectedCardIds.value = $event : null,
        label: "Cartões"
      }, null, _parent));
      _push(ssrRenderComponent(_component_DateRangePicker, {
        from: unref(from),
        to: unref(to),
        onUpdate: onDateRange
      }, null, _parent));
      _push(`</div></section><section class="grid grid-cols-1 gap-4">`);
      _push(ssrRenderComponent(_component_RecurringChart, {
        "card-ids": unref(selectedCardIds),
        from: unref(from),
        to: unref(to)
      }, null, _parent));
      _push(`</section>`);
      if (unref(predictability)) {
        _push(`<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">`);
        _push(ssrRenderComponent(_component_AppCard, { title: "Mes actual" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(formatMoney(unref(predictability).metrics.currentMonthTotal))}</p>`);
            } else {
              return [
                createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(formatMoney(unref(predictability).metrics.currentMonthTotal)), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(ssrRenderComponent(_component_AppCard, { title: "Próximo mes" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(formatMoney(unref(predictability).metrics.nextMonthTotal))}</p>`);
            } else {
              return [
                createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(formatMoney(unref(predictability).metrics.nextMonthTotal)), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(ssrRenderComponent(_component_AppCard, { title: "Comprometido futuro" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(formatMoney(unref(predictability).metrics.totalCommittedFuture))}</p>`);
            } else {
              return [
                createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(formatMoney(unref(predictability).metrics.totalCommittedFuture)), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(ssrRenderComponent(_component_AppCard, { title: "Promedio mensual" }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`<p class="text-3xl font-bold text-white"${_scopeId}>${ssrInterpolate(formatMoney(unref(predictability).metrics.averageMonthly))}</p>`);
            } else {
              return [
                createVNode("p", { class: "text-3xl font-bold text-white" }, toDisplayString(formatMoney(unref(predictability).metrics.averageMonthly)), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</section>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<section class="glass-card rounded-2xl p-5"><h2 class="text-sm font-semibold uppercase tracking-wide text-dark-muted"> Estado del store </h2><pre class="mt-3 overflow-x-auto rounded-xl bg-dark-card p-4 text-xs text-slate-300">${ssrInterpolate(unref(summary))}</pre></section><footer class="text-xs text-dark-muted"> API backend Express en <code class="rounded bg-dark-card px-1.5 py-0.5">/api/*</code> — proxy configurado en dev vía <code class="rounded bg-dark-card px-1.5 py-0.5">NITRO_PORT</code> / reverse proxy en prod. </footer></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=index-bUfCEeNi.js.map
