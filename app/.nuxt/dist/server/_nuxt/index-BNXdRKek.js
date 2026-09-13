import __nuxt_component_0 from "./Icon-CNMaiXvA.js";
import { _ as __nuxt_component_0$1 } from "./nuxt-link-ZmhhTiTw.js";
import { defineComponent, ref, withAsyncContext, computed, resolveComponent, mergeProps, unref, withCtx, createVNode, createTextVNode, isRef, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent, ssrRenderList } from "vue/server-renderer";
import { u as useInvoices } from "./useInvoices-DvgMZgEJ.js";
import { u as useCardStore } from "./cardStore-d4GdWPm2.js";
import "@iconify/vue/dist/offline";
import "@iconify/vue";
import "./index-CuGVVMHD.js";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/klona/dist/index.mjs";
import "../server.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/hookable/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/unctx/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/h3/dist/index.mjs";
import "vue-router";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/defu/dist/defu.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/ufo/dist/index.mjs";
import "./_plugin-vue_export-helper-1tPrXgE0.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { list } = useInvoices();
    const cardStore = useCardStore();
    const loading = ref(true);
    const error = ref("");
    const invoices = ref([]);
    const filterCardId = ref("");
    const openAddModal = ref(false);
    async function load() {
      loading.value = true;
      error.value = "";
      try {
        invoices.value = await list();
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Error al cargar faturas";
      } finally {
        loading.value = false;
      }
    }
    [__temp, __restore] = withAsyncContext(() => Promise.all([load(), cardStore.fetchAll()])), await __temp, __restore();
    const filterOptions = computed(
      () => cardStore.cards.map((card) => ({
        value: card.id,
        label: `${card.bankName} ${card.last4Digits}`
      }))
    );
    const filteredInvoices = computed(() => {
      if (!filterCardId.value) return invoices.value;
      return invoices.value.filter((inv) => inv.cardId === filterCardId.value);
    });
    function onRecurringCreated() {
      openAddModal.value = false;
    }
    function monthLabel(monthYear) {
      const [year, month] = monthYear.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    function cardLabel(invoice) {
      const card = invoice.card ?? cardStore.cards.find((c) => c.id === invoice.cardId);
      return card ? `${card.bankName} ${card.last4Digits}` : "Fatura";
    }
    function formatMoney(value) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_AppButton = resolveComponent("AppButton");
      const _component_Icon = __nuxt_component_0;
      const _component_AppSelect = resolveComponent("AppSelect");
      const _component_NuxtLink = __nuxt_component_0$1;
      const _component_AppBadge = resolveComponent("AppBadge");
      const _component_AddRecurringModal = resolveComponent("AddRecurringModal");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-col gap-6" }, _attrs))}><header class="flex items-center justify-between"><div><h1 class="text-2xl font-bold text-white">Faturas</h1><p class="text-sm text-dark-muted">${ssrInterpolate(unref(invoices).length)} faturas</p></div>`);
      _push(ssrRenderComponent(_component_AppButton, {
        onClick: ($event) => openAddModal.value = true
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(_component_Icon, {
              name: "lucide:plus",
              class: "h-4 w-4"
            }, null, _parent2, _scopeId));
            _push2(` Nueva recurrente `);
          } else {
            return [
              createVNode(_component_Icon, {
                name: "lucide:plus",
                class: "h-4 w-4"
              }),
              createTextVNode(" Nueva recurrente ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</header>`);
      if (unref(error)) {
        _push(`<div class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">${ssrInterpolate(unref(error))}</div>`);
      } else if (unref(loading)) {
        _push(`<div class="py-8 text-center text-sm text-dark-muted">Cargando…</div>`);
      } else {
        _push(`<!--[--><div class="flex items-center gap-3">`);
        _push(ssrRenderComponent(_component_AppSelect, {
          modelValue: unref(filterCardId),
          "onUpdate:modelValue": ($event) => isRef(filterCardId) ? filterCardId.value = $event : null,
          label: "Filtrar por cartão",
          options: unref(filterOptions),
          placeholder: "Todas",
          class: "max-w-xs"
        }, null, _parent));
        _push(`</div><div class="flex flex-col gap-2"><!--[-->`);
        ssrRenderList(unref(filteredInvoices), (inv) => {
          _push(ssrRenderComponent(_component_NuxtLink, {
            key: inv.id,
            to: `/invoices/${inv.id}`,
            class: "flex items-center justify-between rounded-xl bg-dark-card px-4 py-3 transition-colors hover:border-brand-500/50"
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`<div class="flex min-w-0 flex-1 flex-col"${_scopeId}><p class="text-sm font-semibold text-white"${_scopeId}>${ssrInterpolate(monthLabel(inv.monthYear))}</p><p class="text-xs text-dark-muted"${_scopeId}>${ssrInterpolate(cardLabel(inv))}</p></div><div class="flex items-center gap-2"${_scopeId}>`);
                _push2(ssrRenderComponent(_component_AppBadge, {
                  tone: inv.isPaid ? "green" : "amber"
                }, {
                  default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                    if (_push3) {
                      _push3(`${ssrInterpolate(inv.isPaid ? "Pagada" : "Pendiente")}`);
                    } else {
                      return [
                        createTextVNode(toDisplayString(inv.isPaid ? "Pagada" : "Pendiente"), 1)
                      ];
                    }
                  }),
                  _: 2
                }, _parent2, _scopeId));
                _push2(`<span class="text-sm font-semibold text-white"${_scopeId}>${ssrInterpolate(formatMoney(inv.totalAmount))}</span></div>`);
              } else {
                return [
                  createVNode("div", { class: "flex min-w-0 flex-1 flex-col" }, [
                    createVNode("p", { class: "text-sm font-semibold text-white" }, toDisplayString(monthLabel(inv.monthYear)), 1),
                    createVNode("p", { class: "text-xs text-dark-muted" }, toDisplayString(cardLabel(inv)), 1)
                  ]),
                  createVNode("div", { class: "flex items-center gap-2" }, [
                    createVNode(_component_AppBadge, {
                      tone: inv.isPaid ? "green" : "amber"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(inv.isPaid ? "Pagada" : "Pendiente"), 1)
                      ]),
                      _: 2
                    }, 1032, ["tone"]),
                    createVNode("span", { class: "text-sm font-semibold text-white" }, toDisplayString(formatMoney(inv.totalAmount)), 1)
                  ])
                ];
              }
            }),
            _: 2
          }, _parent));
        });
        _push(`<!--]--></div>`);
        if (unref(filteredInvoices).length === 0) {
          _push(`<p class="py-8 text-center text-sm text-dark-muted">Sin faturas para este filtro.</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<!--]-->`);
      }
      _push(ssrRenderComponent(_component_AddRecurringModal, {
        open: unref(openAddModal),
        cards: unref(cardStore).cards,
        onClose: ($event) => openAddModal.value = false,
        onSubmitted: onRecurringCreated
      }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/invoices/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=index-BNXdRKek.js.map
