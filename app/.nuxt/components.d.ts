
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const CardsCardFilter: typeof import("../components/cards/CardFilter.vue")['default']
export const ChartsAreaChart: typeof import("../components/charts/AreaChart.vue")['default']
export const ChartsBarChart: typeof import("../components/charts/BarChart.vue")['default']
export const ChartsBaseChart: typeof import("../components/charts/BaseChart.vue")['default']
export const ChartsPieChart: typeof import("../components/charts/PieChart.vue")['default']
export const DashboardRecurringChart: typeof import("../components/dashboard/RecurringChart.vue")['default']
export const InvoicesInvoiceDetail: typeof import("../components/invoices/InvoiceDetail.vue")['default']
export const InvoicesInvoiceItemRow: typeof import("../components/invoices/InvoiceItemRow.vue")['default']
export const InvoicesInvoiceList: typeof import("../components/invoices/InvoiceList.vue")['default']
export const InvoicesRecurringAddRecurringModal: typeof import("../components/invoices/recurring/AddRecurringModal.vue")['default']
export const InvoicesRecurringSetRecurringModal: typeof import("../components/invoices/recurring/SetRecurringModal.vue")['default']
export const UiAppBadge: typeof import("../components/ui/AppBadge.vue")['default']
export const UiAppButton: typeof import("../components/ui/AppButton.vue")['default']
export const UiAppCard: typeof import("../components/ui/AppCard.vue")['default']
export const UiAppInput: typeof import("../components/ui/AppInput.vue")['default']
export const UiAppModal: typeof import("../components/ui/AppModal.vue")['default']
export const UiAppSelect: typeof import("../components/ui/AppSelect.vue")['default']
export const UiDateRangePicker: typeof import("../components/ui/DateRangePicker.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const Icon: typeof import("../node_modules/nuxt-icon/dist/runtime/Icon.vue")['default']
export const IconCSS: typeof import("../node_modules/nuxt-icon/dist/runtime/IconCSS.vue")['default']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyCardsCardFilter: LazyComponent<typeof import("../components/cards/CardFilter.vue")['default']>
export const LazyChartsAreaChart: LazyComponent<typeof import("../components/charts/AreaChart.vue")['default']>
export const LazyChartsBarChart: LazyComponent<typeof import("../components/charts/BarChart.vue")['default']>
export const LazyChartsBaseChart: LazyComponent<typeof import("../components/charts/BaseChart.vue")['default']>
export const LazyChartsPieChart: LazyComponent<typeof import("../components/charts/PieChart.vue")['default']>
export const LazyDashboardRecurringChart: LazyComponent<typeof import("../components/dashboard/RecurringChart.vue")['default']>
export const LazyInvoicesInvoiceDetail: LazyComponent<typeof import("../components/invoices/InvoiceDetail.vue")['default']>
export const LazyInvoicesInvoiceItemRow: LazyComponent<typeof import("../components/invoices/InvoiceItemRow.vue")['default']>
export const LazyInvoicesInvoiceList: LazyComponent<typeof import("../components/invoices/InvoiceList.vue")['default']>
export const LazyInvoicesRecurringAddRecurringModal: LazyComponent<typeof import("../components/invoices/recurring/AddRecurringModal.vue")['default']>
export const LazyInvoicesRecurringSetRecurringModal: LazyComponent<typeof import("../components/invoices/recurring/SetRecurringModal.vue")['default']>
export const LazyUiAppBadge: LazyComponent<typeof import("../components/ui/AppBadge.vue")['default']>
export const LazyUiAppButton: LazyComponent<typeof import("../components/ui/AppButton.vue")['default']>
export const LazyUiAppCard: LazyComponent<typeof import("../components/ui/AppCard.vue")['default']>
export const LazyUiAppInput: LazyComponent<typeof import("../components/ui/AppInput.vue")['default']>
export const LazyUiAppModal: LazyComponent<typeof import("../components/ui/AppModal.vue")['default']>
export const LazyUiAppSelect: LazyComponent<typeof import("../components/ui/AppSelect.vue")['default']>
export const LazyUiDateRangePicker: LazyComponent<typeof import("../components/ui/DateRangePicker.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyIcon: LazyComponent<typeof import("../node_modules/nuxt-icon/dist/runtime/Icon.vue")['default']>
export const LazyIconCSS: LazyComponent<typeof import("../node_modules/nuxt-icon/dist/runtime/IconCSS.vue")['default']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
