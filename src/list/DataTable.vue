<script setup lang="ts" generic="Row extends object">
// DataTable (05) — Faz 2: toolbar, ızgara, footer, durumlar, veri akışı (`@request`), sıralama, sayfalama, sütun yönetimi,
// tercihler. Paket veri çekmez (D18): sorguyu yayar, `rows`/`hasMore`/`loading`/`error` alır. Seçim ve satır menüsü Faz 4.
import { PhCircleNotch, PhWarning } from '@phosphor-icons/vue'
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useColumnLayout } from '../core/columns/useColumnLayout'
import GridRoot from '../core/grid/GridRoot.vue'
import { isTextInput } from '../core/interaction/isInteractive'
import { useDataTableContext } from '../core/plugin'
import { usePreferences } from '../core/preferences/usePreferences'
import StateMessage from '../core/states/StateMessage.vue'
import DisplayPopover from '../core/toolbar/DisplayPopover.vue'
import MoreMenu from '../core/toolbar/MoreMenu.vue'
import Toolbar from '../core/toolbar/Toolbar.vue'
import type { ColumnDef, Density, Plural, TableId } from '../types'
import type { CountRequest, QueryWithoutPage, SortRule, TableError, TableQuery, TableRequest } from '../types/query'
import Footer from './footer/Footer.vue'
import { isSearchable, useListTable } from './useListTable'
import { useRequest } from './useRequest'

const props = withDefaults(
  defineProps<{
    tableId: TableId
    columns: Array<ColumnDef<Row>>
    rows: Row[]
    rowKey?: string
    /** Verilmezse tercihten (Display › Density), o da yoksa standard. */
    density?: Density
    entityName?: Plural
    /** Tek harfli kısayollar (/, R). Oklar, Enter, Space, Esc ve Alt←/→ her zaman. */
    shortcuts?: boolean
    /** client: tüm satırlar verilir, arama/sıralama/sayfalama yerelde. server: `@request` ile uygulama çeker. */
    mode?: 'client' | 'server'
    loading?: boolean
    error?: TableError
    /** Sunucu modu: sonraki sayfa var mı (Laravel `next_page_url !== null`). */
    hasMore?: boolean
    /** Biliniyorsa toplam; istemci modunda otomatik. */
    total?: number
    /** Sunucu modu: footer'da "Count total" → `@count`. */
    countable?: boolean
    /** Her talepte `query.fields`'e eklenecek ek alanlar. */
    fields?: string[]
    /** Yeni görünen sütunun yolu son talepte yoksa `reason: 'columns'` talebi (400 ms birleştirme). */
    requestOnColumnChange?: boolean
    /** auto: yapılandırılana göre yuvalar; minimal: yalnızca arama + `#toolbar-end`; false: toolbar yok. */
    toolbar?: 'auto' | 'minimal' | false
    searchPlaceholder?: string
    /** Varsayılan 100; tercih varsa o. */
    pageSize?: number
    pageSizes?: number[]
    /** Saniye. Verilmezse More menüsünde Auto-refresh görünmez. */
    autoRefresh?: number
  }>(),
  {
    rowKey: 'id',
    shortcuts: true,
    mode: 'client',
    countable: false,
    requestOnColumnChange: true,
    toolbar: 'auto',
    pageSize: 100,
    pageSizes: () => [50, 100, 250, 500],
  },
)
const emit = defineEmits<{
  /** Sunucu modunda her talep; istemci modunda yalnızca `refresh()`. */
  request: [request: TableRequest]
  count: [request: CountRequest]
  'row-click': [row: Row, event: MouseEvent]
  'row-open': [row: Row]
  export: [payload: { format: 'csv' | 'xlsx'; query: QueryWithoutPage; selection: Row[]; visibleColumns: string[] }]
  import: []
  print: [payload: { query: QueryWithoutPage; visibleColumns: string[] }]
}>()
defineSlots<{
  empty?: () => unknown
  'toolbar-end'?: (props: { compact: boolean }) => unknown
}>()

const ctx = useDataTableContext()
const { i18n } = ctx
// Toolbar yuvaları ve Retry yalnızca uygulama ilgili olayı dinliyorsa (05 §3, §10).
const vnodeProps = getCurrentInstance()?.vnode.props ?? {}
const listens = (name: string) => name in vnodeProps
const isServer = computed(() => props.mode === 'server')
if (import.meta.env?.DEV && props.mode === 'server' && !listens('onRequest'))
  console.warn(`[data-table] "${props.tableId}": mode="server" ama @request dinleyicisi yok; satırlar hiç gelmeyecek.`)

const entity = computed<Plural>(() => props.entityName ?? { one: props.tableId, other: props.tableId })
const ariaLabel = computed(() => entity.value.other)

// Tercihler (05 §9): yoğunluk, dikey çizgiler, sayfa boyutu; adapter yoksa oturumluk.
const pref = usePreferences(() => props.tableId, ctx.preferences, {
  density: 'standard',
  verticalLines: false,
  pageSize: props.pageSize,
})
const density = computed<Density>(() => props.density ?? pref.prefs.density)

const layout = useColumnLayout<Row>({
  columns: () => props.columns,
  rows: () => props.rows,
  rowKey: () => props.rowKey,
})

// Sorgu durumu. Arama/sıralama değişince sayfa 1 (aynı tick → tek talep).
const search = ref('')
const sort = ref<SortRule[]>([])
const page = ref({ number: 1, size: pref.prefs.pageSize })
const goTo = (number: number) => (page.value = { ...page.value, number })
const setSearch = (value: string) => {
  if (value === search.value) return
  search.value = value
  goTo(1)
}
watch(
  () => pref.prefs.pageSize,
  (size) => (page.value = { number: 1, size }),
)

const visibleColumns = computed(() => layout.columns.value.map((c) => c.id))
const fields = computed(() => {
  const out = new Set<string>([props.rowKey])
  for (const c of layout.columns.value) {
    if (!c.def.accessor) out.add(c.id)
    for (const f of c.def.fields ?? []) out.add(f)
  }
  for (const f of props.fields ?? []) out.add(f)
  return [...out]
})
const query = computed<TableQuery>(() => ({
  search: search.value,
  filters: [],
  sort: sort.value,
  page: page.value,
  columns: visibleColumns.value,
  fields: fields.value,
}))
const queryWithoutPage = (): QueryWithoutPage => {
  const { search, filters, sort, columns, fields } = query.value
  return { search, filters, sort, columns, fields }
}

const list = useListTable<Row>({
  columns: () => props.columns,
  rows: () => props.rows,
  rowKey: () => props.rowKey,
  mode: () => props.mode,
  locale: ctx.locale,
  sort,
  page,
  search,
  hasMore: () => props.hasMore,
})
const req = useRequest<Row>({
  mode: () => props.mode,
  hasListener: listens('onRequest'),
  query: () => query.value,
  rows: () => props.rows,
  hasMore: () => props.hasMore,
  loading: () => props.loading,
  error: () => props.error,
  requestOnColumnChange: () => props.requestOnColumnChange,
  emit: (r) => emit('request', r),
})

// Sıralama (04 §6): tık asc → desc → kapalı; ⇧ ikincil (en fazla 3); menüden yön.
const onSort = (id: string, additive: boolean) => {
  list.toggleSort(id, additive)
  goTo(1)
}
const onSortSet = (id: string, dir: 'asc' | 'desc' | null) => {
  list.setSort(id, dir)
  goTo(1)
}
const sortMap = computed(
  () => new Map(sort.value.map((s, i) => [s.column, { dir: s.dir, index: sort.value.length > 1 ? i + 1 : null }])),
)
const headerOf = (id: string) => props.columns.find((c) => c.id === id)?.header ?? id

// Durumlar (05 §10): üç girdi — pending/sebep, satır var mı, hata.
const reason = req.reason
const pending = req.pending
const rowsShown = computed<Row[]>(() => (req.errorKind.value === 'error' ? [] : list.rows.value))
const hasRows = computed(() => rowsShown.value.length > 0)
const identityChange = computed(() => pending.value && (reason.value === 'query' || reason.value === 'page'))
const dim = computed(() => identityChange.value && hasRows.value)
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
watch(dim, (on) => {
  clearTimeout(slowTimer)
  slow.value = false
  if (on) slowTimer = setTimeout(() => (slow.value = true), 400)
})
const skeleton = computed(
  () => (pending.value && !hasRows.value) || (!!props.loading && !hasRows.value && !props.error) || slow.value,
)
const refreshing = computed(
  () =>
    (pending.value && (reason.value === 'refresh' || reason.value === 'columns')) ||
    (!!props.loading && hasRows.value && !identityChange.value),
)
const refreshBar = ref(false)
let barTimer: ReturnType<typeof setTimeout> | undefined
watch(refreshing, (on) => {
  clearTimeout(barTimer)
  refreshBar.value = false
  if (on) barTimer = setTimeout(() => (refreshBar.value = true), 150)
})
const busy = computed(() => identityChange.value || (skeleton.value && !hasRows.value))
const bodyState = computed<'error' | 'noResultsSearch' | 'noRowsOnPage' | 'empty' | null>(() => {
  if (skeleton.value || hasRows.value || pending.value) return null
  if (req.errorKind.value === 'error') return 'error'
  if (search.value) return 'noResultsSearch'
  if (page.value.number > 1) return 'noRowsOnPage'
  return 'empty'
})
const errorInfo = computed(() => {
  const e = props.error
  return typeof e === 'object' && e ? e : typeof e === 'string' ? { message: e } : {}
})
const clock = (d: Date) => d.toLocaleTimeString(ctx.locale, { hour: '2-digit', minute: '2-digit' })

// Footer yalnızca snapshot'tan okur (05 §8); istemci modunda satır modeli zaten yerel.
const snap = req.snapshot
const footerRows = computed(() =>
  req.errorKind.value === 'error' ? 0 : isServer.value ? (snap.value?.rows.length ?? 0) : list.rows.value.length,
)
const footerPage = computed(() => (isServer.value ? (snap.value?.page ?? page.value) : page.value))
const footerHasMore = computed(() => (isServer.value ? (snap.value?.hasMore ?? false) : list.canNext.value))
const total = computed(() => (isServer.value ? props.total : list.total.value))

// Count total → @count; sonuç sorgu değişene kadar geçerli.
let countCtl: AbortController | null = null
const counting = ref(false)
const countedAt = ref<Date | null>(null)
const count = () => {
  countCtl?.abort()
  countCtl = new AbortController()
  counting.value = true
  emit('count', { query: queryWithoutPage(), signal: countCtl.signal })
}
watch(
  () => props.total,
  (t) => {
    if (t === undefined) return
    counting.value = false
    countedAt.value = isServer.value ? new Date() : null
  },
)
watch(
  () => JSON.stringify([search.value, sort.value]),
  () => {
    countCtl?.abort()
    counting.value = false
    countedAt.value = null
  },
)

// Sayfa değişince gövde başa kayar (05 §8).
const grid = ref<InstanceType<typeof GridRoot> | null>(null)
watch(
  () => page.value.number,
  () => grid.value?.scrollToTop(),
)
const setPageSize = (size: number) => pref.set({ pageSize: size })

// Auto-refresh (05 §3): açıkken footer "Live".
const autoRefreshOn = ref(false)
let autoTimer: ReturnType<typeof setInterval> | undefined
watch(autoRefreshOn, (on) => {
  clearInterval(autoTimer)
  if (on && props.autoRefresh) autoTimer = setInterval(() => req.refresh(), props.autoRefresh * 1000)
})
const freshness = computed<'normal' | 'refreshing' | 'stale' | 'live'>(() =>
  autoRefreshOn.value ? 'live' : refreshing.value ? 'refreshing' : req.errorKind.value === 'stale' ? 'stale' : 'normal',
)

// Toolbar yuvaları (05 §3): yalnızca yapılandırılmış olanlar.
const hasSearch = computed(() => props.toolbar !== false && props.columns.some(isSearchable))
const hasDisplay = computed(() => props.toolbar === 'auto')
const more = computed(() => ({
  refresh: listens('onRequest'),
  export: listens('onExport'),
  import: listens('onImport'),
  print: listens('onPrint'),
  autoRefresh: props.autoRefresh !== undefined,
}))
const hasMore = computed(() => props.toolbar === 'auto' && Object.values(more.value).some(Boolean))
const searchPlaceholder = computed(() => props.searchPlaceholder ?? i18n.t('toolbar.search', { entity: entity.value }))
const toolbarRef = ref<InstanceType<typeof Toolbar> | null>(null)
const moreMenu = ref<InstanceType<typeof MoreMenu> | null>(null)
const displayOpen = ref(false)
// ⋯ menüsü kapanırken dışarı tıklama katmanı yeni popover'ı da kapatmasın: bir makro görev sonra aç.
const openDisplayLater = () => setTimeout(() => (displayOpen.value = true), 0)
const displayProps = computed(() => ({
  density: density.value,
  verticalLines: pref.prefs.verticalLines,
  columns: layout.panel.value,
  counts: layout.counts.value,
  sort: sort.value,
  persistent: pref.persistent,
}))
// v-on nesnesi: anahtarlar olay adı (Vue `on` önekini kendisi ekler).
const displayOn = {
  'update:density': (d: Density) => pref.set({ density: d }),
  'update:verticalLines': (on: boolean) => pref.set({ verticalLines: on }),
  'column-visible': (id: string, visible: boolean) => layout.setVisible(id, visible),
  'column-move': (id: string, delta: -1 | 1) => layout.move(id, delta),
  'columns-all': (visible: boolean) => {
    for (const c of layout.panel.value) if (!c.pinned && c.canHide) layout.setVisible(c.id, visible)
  },
  'columns-reset': () => layout.reset(),
  'sort-dir': (column: string, dir: 'asc' | 'desc') => {
    sort.value = sort.value.map((s) => (s.column === column ? { column, dir } : s))
    goTo(1)
  },
  'sort-remove': (column: string) => onSortSet(column, null),
  'sort-clear': () => {
    sort.value = []
    goTo(1)
  },
  reset: () => pref.reset(),
}
const onExport = (format: 'csv' | 'xlsx') =>
  emit('export', { format, query: queryWithoutPage(), selection: [], visibleColumns: visibleColumns.value })
const onPrint = () => emit('print', { query: queryWithoutPage(), visibleColumns: visibleColumns.value })
const copyErrorId = () => void navigator.clipboard?.writeText(errorInfo.value.id ?? '')

// Kısayollar (08 §3): `/` arama, `R` yenile; Alt←/→ sayfa (her zaman). Kapsam sayfa; odak metin alanındayken kapalı.
const onKey = (e: KeyboardEvent) => {
  if (e.defaultPrevented) return
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    if (busy.value) return
    const next = e.key === 'ArrowLeft' ? page.value.number - 1 : page.value.number + 1
    if (next >= 1 && (e.key === 'ArrowLeft' || footerHasMore.value)) {
      e.preventDefault()
      goTo(next)
    }
    return
  }
  const target = e.target instanceof Element ? e.target : null
  if (!props.shortcuts || e.ctrlKey || e.metaKey || e.altKey || (target && isTextInput(target))) return
  if (e.key === '/' && hasSearch.value) {
    e.preventDefault()
    toolbarRef.value?.focusSearch()
  } else if ((e.key === 'r' || e.key === 'R') && listens('onRequest')) {
    e.preventDefault()
    req.refresh()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(slowTimer)
  clearTimeout(barTimer)
  clearInterval(autoTimer)
  countCtl?.abort()
})

// Ekran okuyucu duyuruları (08 §5): tek polite + tek assertive bölge.
const polite = ref('')
const assertive = ref('')
watch(
  () => rowsShown.value.length,
  (n) => {
    if (!pending.value) polite.value = i18n.t('sr.loaded', { count: n })
  },
)
watch(req.updatedAt, () => (polite.value = i18n.t('sr.loaded', { count: rowsShown.value.length })))
watch(sort, (s) => {
  const first = s[0]
  if (first)
    polite.value = i18n.t('sr.sorted', {
      column: headerOf(first.column),
      dir: i18n.t(first.dir === 'asc' ? 'sr.asc' : 'sr.desc'),
    })
})
watch(req.errorKind, (k) => {
  if (k === 'error')
    assertive.value = `${i18n.t('state.errorTitle', { entity: entity.value })} ${i18n.t('state.tryAgain')}`
})

defineExpose({ refresh: req.refresh })
</script>

<template>
  <div class="dt dt-list" :data-density="density">
    <Toolbar
      v-if="toolbar !== false"
      ref="toolbarRef"
      :search="hasSearch ? search : null"
      :search-placeholder="searchPlaceholder"
      :has-display="hasDisplay"
      :has-more="hasMore"
      @update:search="setSearch"
    >
      <template #display="{ iconOnly }">
        <DisplayPopover v-bind="displayProps" :icon-only="iconOnly" v-on="displayOn" />
      </template>
      <template #more="{ withDisplay }">
        <MoreMenu
          ref="moreMenu"
          v-bind="more"
          :display="withDisplay"
          :auto-refresh-on="autoRefreshOn"
          @update:auto-refresh-on="(v) => (autoRefreshOn = v)"
          @refresh="req.refresh()"
          @export="onExport"
          @import="emit('import')"
          @print="onPrint"
          @display="openDisplayLater"
        />
        <DisplayPopover
          v-if="withDisplay"
          v-bind="displayProps"
          v-model:open="displayOpen"
          :anchor="moreMenu?.trigger ?? null"
          v-on="displayOn"
        />
      </template>
      <template v-if="$slots['toolbar-end']" #end="{ compact }">
        <slot name="toolbar-end" :compact="compact" />
      </template>
    </Toolbar>

    <div v-if="req.errorKind.value === 'stale' && req.updatedAt.value" class="dt-strip" role="status">
      <PhWarning :size="16" aria-hidden="true" />
      <span>{{ i18n.t('state.stale', { time: clock(req.updatedAt.value) }) }}</span>
      <button type="button" class="dt-strip-action" :disabled="pending" @click="req.retry()">
        {{ i18n.t('common.retry') }}
      </button>
    </div>

    <GridRoot
      ref="grid"
      :layout="layout"
      :rows="rowsShown"
      :density="density"
      :label="ariaLabel"
      :loading="pending || !!loading"
      :skeleton="skeleton"
      :dim="dim"
      :refreshing="refreshBar"
      :vertical-lines="pref.prefs.verticalLines"
      :row-count="total ?? -1"
      :row-index-offset="(footerPage.number - 1) * footerPage.size"
      :sort="sortMap"
      sortable
      @row-click="(row, e) => emit('row-click', row as Row, e)"
      @row-enter="(row) => emit('row-open', row as Row)"
      @sort="onSort"
      @sort-set="onSortSet"
    >
      <template v-if="req.stillLoading.value" #notice>
        <PhCircleNotch :size="14" class="dt-spin" aria-hidden="true" />
        {{ i18n.t('state.stillLoading') }}
      </template>
      <template v-if="bodyState" #state>
        <StateMessage
          v-if="bodyState === 'error'"
          kind="error"
          :title="i18n.t('state.errorTitle', { entity })"
          :lines="[errorInfo.message, i18n.t('state.errorKept')].filter((l): l is string => !!l)"
        >
          <button v-if="listens('onRequest')" type="button" class="dt-btn" :disabled="pending" @click="req.retry()">
            {{ i18n.t('state.tryAgain') }}
          </button>
          <template v-if="errorInfo.id" #after>
            <div class="dt-state-id">
              <button type="button" class="dt-btn dt-btn-ghost dt-btn-xs" @click="copyErrorId">
                {{ i18n.t('state.copyErrorId') }}
              </button>
              <code class="dt-state-code">{{ errorInfo.id }}</code>
            </div>
          </template>
        </StateMessage>
        <StateMessage
          v-else-if="bodyState === 'noResultsSearch'"
          kind="noResultsSearch"
          :title="i18n.t('state.noResultsSearch', { entity, q: search })"
        >
          <button type="button" class="dt-btn" @click="setSearch('')">{{ i18n.t('state.clearSearch') }}</button>
        </StateMessage>
        <StateMessage v-else-if="bodyState === 'noRowsOnPage'" kind="noRowsOnPage" :title="i18n.t('page.noneOnPage')">
          <button type="button" class="dt-btn" @click="goTo(page.number - 1)">{{ i18n.t('page.previousPage') }}</button>
        </StateMessage>
        <template v-else>
          <slot name="empty">
            <StateMessage kind="empty" :title="i18n.t('state.emptyTitle', { entity })" />
          </slot>
        </template>
      </template>
    </GridRoot>

    <Footer
      :row-count="footerRows"
      :page="footerPage"
      :has-more="footerHasMore"
      :total="total"
      :countable="isServer && countable && listens('onCount')"
      :counting="counting"
      :counted-at="countedAt"
      :busy="busy"
      :first-load="skeleton && !hasRows"
      :empty="bodyState === 'empty'"
      :page-sizes="pageSizes"
      :updated-at="listens('onRequest') ? req.updatedAt.value : null"
      :freshness="freshness"
      :can-refresh="listens('onRequest')"
      @count="count"
      @page="goTo"
      @page-size="setPageSize"
      @refresh="req.refresh()"
    />
    <span class="dt-sr-only" aria-live="polite">{{ polite }}</span>
    <span class="dt-sr-only" aria-live="assertive">{{ assertive }}</span>
  </div>
</template>
