import { _ as __nuxt_component_0 } from "./nuxt-link-ZmhhTiTw.js";
import __nuxt_component_0$1 from "./Icon-CNMaiXvA.js";
import { defineComponent, ref, withAsyncContext, computed, resolveComponent, mergeProps, withCtx, createVNode, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate } from "vue/server-renderer";
import { u as useInvoices } from "./useInvoices-DvgMZgEJ.js";
import { u as useRoute } from "../server.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/ufo/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/defu/dist/defu.mjs";
import "@iconify/vue/dist/offline";
import "@iconify/vue";
import "./index-CuGVVMHD.js";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/klona/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/hookable/dist/index.mjs";
import "./_plugin-vue_export-helper-1tPrXgE0.js";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/unctx/dist/index.mjs";
import "/home/brunotrinchao/Documentos/Bruno/Invoice-Track/app/node_modules/h3/dist/index.mjs";
import "vue-router";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { getInvoice, list } = useInvoices();
    const route = useRoute();
    const id = route.params.id;
    const loading = ref(true);
    const error = ref("");
    const invoice = ref(null);
    const invoices = ref([]);
    const openSetModal = ref(false);
    const selectedItem = ref(null);
    async function load() {
      loading.value = true;
      error.value = "";
      try {
        invoice.value = await getInvoice(id);
        const all = await list();
        invoices.value = all.filter((inv) => inv.cardId === invoice.value.cardId && !inv.isPaid).sort((a, b) => a.monthYear.localeCompare(b.monthYear));
      } catch (e) {
        error.value = e instanceof Error ? e.message : "Error al cargar la fatura";
      } finally {
        loading.value = false;
      }
    }
    [__temp, __restore] = withAsyncContext(() => load()), await __temp, __restore();
    const unpaidInvoices = computed(() => invoices.value);
    function onSetRecurring(item) {
      if (item.isRecurring) {
        return;
      }
      selectedItem.value = item;
      openSetModal.value = true;
    }
    async function onRecurringSubmitted() {
      openSetModal.value = false;
      await load();
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      const _component_Icon = __nuxt_component_0$1;
      const _component_InvoiceDetail = resolveComponent("InvoiceDetail");
      const _component_SetRecurringModal = resolveComponent("SetRecurringModal");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-col gap-6" }, _attrs))}><div class="flex items-center gap-2">`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/invoices",
        class: "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200",
        "aria-label": "Volver a faturas"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(_component_Icon, { name: "lucide:arrow-left" }, null, _parent2, _scopeId));
          } else {
            return [
              createVNode(_component_Icon, { name: "lucide:arrow-left" })
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
      if (unref(error)) {
        _push(`<div class="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">${ssrInterpolate(unref(error))}</div>`);
      } else if (unref(loading)) {
        _push(`<div class="py-8 text-center text-sm text-dark-muted">Cargando…</div>`);
      } else {
        _push(ssrRenderComponent(_component_InvoiceDetail, {
          invoice: unref(invoice),
          onSetRecurring
        }, null, _parent));
      }
      _push(ssrRenderComponent(_component_SetRecurringModal, {
        open: unref(openSetModal),
        item: unref(selectedItem),
        invoices: unref(unpaidInvoices),
        "card-id": unref(invoice)?.cardId,
        onClose: ($event) => openSetModal.value = false,
        onSubmitted: onRecurringSubmitted
      }, null, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/invoices/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=_id_-YS1ozOW6.js.map
