
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

interface _GlobalComponents {
  CardsCardFilter: typeof import("../../components/cards/CardFilter.vue")['default']
  ChartsAreaChart: typeof import("../../components/charts/AreaChart.vue")['default']
  ChartsBarChart: typeof import("../../components/charts/BarChart.vue")['default']
  ChartsBaseChart: typeof import("../../components/charts/BaseChart.vue")['default']
  ChartsPieChart: typeof import("../../components/charts/PieChart.vue")['default']
  DashboardRecurringChart: typeof import("../../components/dashboard/RecurringChart.vue")['default']
  InvoicesInvoiceDetail: typeof import("../../components/invoices/InvoiceDetail.vue")['default']
  InvoicesInvoiceItemRow: typeof import("../../components/invoices/InvoiceItemRow.vue")['default']
  InvoicesInvoiceList: typeof import("../../components/invoices/InvoiceList.vue")['default']
  InvoicesRecurringAddRecurringModal: typeof import("../../components/invoices/recurring/AddRecurringModal.vue")['default']
  InvoicesRecurringSetRecurringModal: typeof import("../../components/invoices/recurring/SetRecurringModal.vue")['default']
  UiAppBadge: typeof import("../../components/ui/AppBadge.vue")['default']
  UiAppButton: typeof import("../../components/ui/AppButton.vue")['default']
  UiAppCard: typeof import("../../components/ui/AppCard.vue")['default']
  UiAppInput: typeof import("../../components/ui/AppInput.vue")['default']
  UiAppModal: typeof import("../../components/ui/AppModal.vue")['default']
  UiAppSelect: typeof import("../../components/ui/AppSelect.vue")['default']
  UiDateRangePicker: typeof import("../../components/ui/DateRangePicker.vue")['default']
  NuxtWelcome: typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtImg: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  Icon: typeof import("../../node_modules/nuxt-icon/dist/runtime/Icon.vue")['default']
  IconCSS: typeof import("../../node_modules/nuxt-icon/dist/runtime/IconCSS.vue")['default']
  NuxtPage: typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyCardsCardFilter: LazyComponent<typeof import("../../components/cards/CardFilter.vue")['default']>
  LazyChartsAreaChart: LazyComponent<typeof import("../../components/charts/AreaChart.vue")['default']>
  LazyChartsBarChart: LazyComponent<typeof import("../../components/charts/BarChart.vue")['default']>
  LazyChartsBaseChart: LazyComponent<typeof import("../../components/charts/BaseChart.vue")['default']>
  LazyChartsPieChart: LazyComponent<typeof import("../../components/charts/PieChart.vue")['default']>
  LazyDashboardRecurringChart: LazyComponent<typeof import("../../components/dashboard/RecurringChart.vue")['default']>
  LazyInvoicesInvoiceDetail: LazyComponent<typeof import("../../components/invoices/InvoiceDetail.vue")['default']>
  LazyInvoicesInvoiceItemRow: LazyComponent<typeof import("../../components/invoices/InvoiceItemRow.vue")['default']>
  LazyInvoicesInvoiceList: LazyComponent<typeof import("../../components/invoices/InvoiceList.vue")['default']>
  LazyInvoicesRecurringAddRecurringModal: LazyComponent<typeof import("../../components/invoices/recurring/AddRecurringModal.vue")['default']>
  LazyInvoicesRecurringSetRecurringModal: LazyComponent<typeof import("../../components/invoices/recurring/SetRecurringModal.vue")['default']>
  LazyUiAppBadge: LazyComponent<typeof import("../../components/ui/AppBadge.vue")['default']>
  LazyUiAppButton: LazyComponent<typeof import("../../components/ui/AppButton.vue")['default']>
  LazyUiAppCard: LazyComponent<typeof import("../../components/ui/AppCard.vue")['default']>
  LazyUiAppInput: LazyComponent<typeof import("../../components/ui/AppInput.vue")['default']>
  LazyUiAppModal: LazyComponent<typeof import("../../components/ui/AppModal.vue")['default']>
  LazyUiAppSelect: LazyComponent<typeof import("../../components/ui/AppSelect.vue")['default']>
  LazyUiDateRangePicker: LazyComponent<typeof import("../../components/ui/DateRangePicker.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyIcon: LazyComponent<typeof import("../../node_modules/nuxt-icon/dist/runtime/Icon.vue")['default']>
  LazyIconCSS: LazyComponent<typeof import("../../node_modules/nuxt-icon/dist/runtime/IconCSS.vue")['default']>
  LazyNuxtPage: LazyComponent<typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
