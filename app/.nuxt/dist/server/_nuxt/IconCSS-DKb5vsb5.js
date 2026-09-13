import { defineComponent, computed, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs } from "vue/server-renderer";
import { u as useAppConfig, r as resolveIconName } from "./index-CuGVVMHD.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
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
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "IconCSS",
  __ssrInlineRender: true,
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: String,
      default: ""
    }
  },
  setup(__props) {
    const appConfig = useAppConfig();
    const props = __props;
    const iconName = computed(() => {
      if (appConfig.nuxtIcon?.aliases?.[props.name]) {
        return appConfig.nuxtIcon.aliases[props.name];
      }
      return props.name;
    });
    const resolvedIcon = computed(() => resolveIconName(iconName.value));
    const iconUrl = computed(() => {
      const customUrl = appConfig.nuxtIcon?.iconifyApiOptions?.url;
      if (customUrl) {
        try {
          new URL(customUrl);
        } catch (e) {
          console.warn("Nuxt IconCSS: Invalid custom Iconify API URL");
          return;
        }
      }
      const baseUrl = customUrl || "https://api.iconify.design";
      return `url('${baseUrl}/${resolvedIcon.value.prefix}/${resolvedIcon.value.name}.svg')`;
    });
    const sSize = computed(() => {
      if (!props.size && typeof appConfig.nuxtIcon?.size === "boolean" && !appConfig.nuxtIcon?.size) {
        return void 0;
      }
      const size = props.size || appConfig.nuxtIcon?.size || "1em";
      if (String(Number(size)) === size) {
        return `${size}px`;
      }
      return size;
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _cssVars = { style: {
        ":--efdb04fa": iconUrl.value
      } };
      _push(`<span${ssrRenderAttrs(mergeProps({
        style: { width: sSize.value, height: sSize.value }
      }, _attrs, _cssVars))} data-v-41e8d397></span>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt-icon/dist/runtime/IconCSS.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const IconCSS = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-41e8d397"]]);
export {
  IconCSS as default
};
//# sourceMappingURL=IconCSS-DKb5vsb5.js.map
