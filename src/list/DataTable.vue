<script setup lang="ts" generic="Row extends object">
// DataTable (05) — Faz 2–3b: toolbar, ızgara, footer, durumlar, veri akışı (`@request`), sıralama, sayfalama, sütun yönetimi,
// tercihler, filtreler, görünümler. Paket veri çekmez (D18): sorguyu yayar, `rows`/`hasMore`/`loading`/`error` alır.
// Seçim ve satır menüsü Faz 4.
import { PhCheck, PhCircleNotch, PhFunnel, PhPlus, PhWarning } from '@phosphor-icons/vue'
import {
  computed,
  defineAsyncComponent,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { optionLabel } from '../core/cells/format'
import { RemoteLabels } from '../core/cells/remoteLabels'
import { TYPE_SPECS } from '../core/cells/specs'
import { readPath } from '../core/columns/readPath'
import { useColumnLayout } from '../core/columns/useColumnLayout'
import ColumnPicker from '../core/filters/ColumnPicker.vue'
import FilterBar from '../core/filters/FilterBar.vue'
import { defaultOperator, isComplete, summarize, toCondition, type Chip, type Summary } from '../core/filters/model'
import { getFormat } from '../core/format'
import GridRoot from '../core/grid/GridRoot.vue'
import { useDelegatedTooltip } from '../core/grid/useDelegatedTooltip'
import { isTextInput } from '../core/interaction/isInteractive'
import { useDataTableContext } from '../core/plugin'
import { usePreferences } from '../core/preferences/usePreferences'
import StateMessage from '../core/states/StateMessage.vue'
import DisplayPopover from '../core/toolbar/DisplayPopover.vue'
import type { ColumnsDraft } from '../core/toolbar/ColumnsDialog.vue'
import MoreMenu from '../core/toolbar/MoreMenu.vue'
import Toolbar from '../core/toolbar/Toolbar.vue'
import ConfirmDialog from '../core/ui/ConfirmDialog.vue'
import { nameError, type NameError } from '../core/views/model'
import { useViews } from '../core/views/useViews'
import ViewDialog from '../core/views/ViewDialog.vue'
import ViewMenu from '../core/views/ViewMenu.vue'
import type {
  BulkAction,
  ColumnDef,
  Density,
  ExpandOptions,
  Plural,
  RowAction,
  RowClickMode,
  TableId,
  View,
  ViewPatch,
  ViewState,
} from '../types'
import type {
  CountRequest,
  FilterCondition,
  QueryWithoutPage,
  SortRule,
  TableError,
  TableQuery,
  TableRequest,
} from '../types/query'
import BulkBar from './BulkBar.vue'
import Footer from './footer/Footer.vue'
import { isSearchable, useListTable } from './useListTable'
import { useRequest } from './useRequest'

// Telefon alt sayfaları yalnızca telefonda yüklenir: çekirdek paket boyutu (10 · ≤ 60 kB).
const FiltersSheet = defineAsyncComponent(() => import('../core/filters/FiltersSheet.vue'))
const PhoneMoreSheet = defineAsyncComponent(() => import('../core/toolbar/PhoneMoreSheet.vue'))

const props = withDefaults(
  defineProps<{
    tableId: TableId
    columns: Array<ColumnDef<Row>>
    rows: Row[]
    rowKey?: string
    /** Verilmezse tercihten (Display › Density), o da yoksa standard. */
    density?: Density
    entityName?: Plural
    /** Tek harfli kısayollar (/, F, R). Oklar, Enter, Space, Esc ve Alt←/→ her zaman. */
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
    /** Kodla tanımlı görünümler (kind: 'system'); adapter'daki kişisel görünümlerle birleştirilir (04 §7). */
    views?: View[]
    /** Seçim sütunu; seçim sayfa kapsamlıdır (D19). */
    selectable?: boolean
    /** Seçim çubuğu: yüzer (varsayılan) ya da toolbar'ın yerine. */
    selectionBar?: 'floating' | 'toolbar'
    bulkActions?: Array<BulkAction<Row>>
    /** Satır menüsü (⋯, sağ tık, ⇧F10): Open / Copy yerleşik + bunlar. */
    rowActions?: Array<RowAction<Row>>
    /** Satır gövdesine tıklama (D6). Varsayılan 'none'. */
    rowClick?: RowClickMode
    expand?: boolean | ExpandOptions<Row>
    /** Satır hatası (D35): metin/metin listesi → `--dt-r-bg` + ⋯ hücresinde uyarı ikonu + satırda tooltip. Harita uygulamanın. */
    rowError?: (row: Row) => string | string[] | null | undefined
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
    views: () => [],
    selectable: false,
    selectionBar: 'floating',
    rowClick: 'none',
    expand: false,
  },
)
const emit = defineEmits<{
  /** Sunucu modunda her talep; istemci modunda yalnızca `refresh()`. */
  request: [request: TableRequest]
  count: [request: CountRequest]
  /** Etkileşimli hedef, metin seçimi ve değiştirici tuş dışındaki satır tıklamaları (`rowClick`'ten bağımsız). */
  'row-click': [payload: { row: Row; event: MouseEvent }]
  /** Birincil linke düz sol tık, satırda ↵, menüde Open, `row-click="open"`. Paket preventDefault yapmaz (05 §7). */
  'row-open': [payload: { row: Row; href: string; event: MouseEvent }]
  /** Seçim her değiştiğinde; sayfa kapsamlı yüklü satırlar (D19). */
  'selection-change': [rows: Row[]]
  export: [payload: { format: 'csv' | 'xlsx'; query: QueryWithoutPage; selection: Row[]; visibleColumns: string[] }]
  import: []
  print: [payload: { query: QueryWithoutPage; visibleColumns: string[] }]
  'view-change': [payload: { id: string; kind: View['kind'] }]
}>()
defineSlots<{
  empty?: () => unknown
  'toolbar-end'?: (props: { compact: boolean }) => unknown
  /** Satır detayı; veriyi slot bileşeni çeker (05 §7). */
  expanded?: (props: { row: Row; close: () => void }) => unknown
  /** bulkActions yerine özel seçim çubuğu içeriği. */
  'selection-actions'?: (props: { rows: Row[]; clear: () => void }) => unknown
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

// Telefon düzeni (05 §11, handoff 04): kartın kendi genişliği < 640 → is-phone; Toolbar daralma eşikleri de buradan (ResizeObserver).
const rootEl = ref<HTMLElement | null>(null)
const width = ref(1440)
const size = computed(() => (width.value >= 1024 ? 'full' : width.value >= 640 ? 'narrow' : 'phone'))
const phone = computed(() => size.value === 'phone')
let ro: ResizeObserver | undefined
onMounted(() => {
  const measure = () => (width.value = rootEl.value?.clientWidth || 1440)
  measure()
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    ro = new ResizeObserver(measure)
    ro.observe(rootEl.value)
  }
})

// Tercihler (05 §9): yoğunluk, dikey çizgiler, sayfa boyutu; adapter yoksa oturumluk.
const pref = usePreferences(() => props.tableId, ctx.preferences, {
  density: 'standard',
  verticalLines: false,
  pageSize: props.pageSize,
  defaultViewId: null,
})
const density = computed<Density>(() => props.density ?? pref.prefs.density)

// Varsayılan sütun genişlikleri 13 px yazıya göre (03); yoğunluğun hücre yazısı (--dt-fs) büyüdükçe o oranda genişler.
const colScale = ref(1)
watch(
  [density, rootEl],
  () => {
    const fs = rootEl.value ? parseFloat(getComputedStyle(rootEl.value).getPropertyValue('--dt-fs')) : NaN
    colScale.value = Number.isFinite(fs) ? fs / 13 : 1
  },
  { flush: 'post' },
)
const layout = useColumnLayout<Row>({
  columns: () => props.columns,
  rows: () => props.rows,
  rowKey: () => props.rowKey,
  phone: () => phone.value,
  scale: colScale,
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

// Filtreler (04): çipler ekranda; yalnızca tam olanlar sorguya girer (D2: sütun başına tek çip).
const chips = ref<Chip[]>([])
const editing = ref<string | null>(null)
const pickerOpen = ref(false)
const labels = new RemoteLabels()
const fmt = getFormat(ctx.locale)
const defs = computed(() => new Map(props.columns.map((c) => [c.id as string, c as ColumnDef])))
const typeOf = (column: string) => defs.value.get(column)?.type ?? 'string'
const filters = computed<FilterCondition[]>(() =>
  chips.value.filter((c) => isComplete(c, typeOf(c.column))).map(toCondition),
)
const filteredColumns = computed(() => new Set(filters.value.map((f) => f.column)))
const hasFilter = computed(
  () => props.toolbar === 'auto' && props.columns.some((c) => c.filterable ?? TYPE_SPECS[c.type].filterable),
)
const labelOf = (def: ColumnDef) => (v: string | number) => {
  if (def.type === 'select' || def.type === 'multiselect' || (def.type === 'user' && def.options))
    return optionLabel(def.options, v)
  if ((def.type === 'user' || def.type === 'ajax') && def.remote) return labels.label(def.id as string, def.remote, v)
  return String(v)
}
const summaryOf = (chip: Chip): Summary => {
  const def = defs.value.get(chip.column)!
  return summarize(chip, def, { i18n, fmt, labelOf: labelOf(def) })
}
const currenciesOf = (def: ColumnDef): string[] => {
  if (def.type !== 'currency') return []
  if (typeof def.currency === 'string') return [def.currency]
  return [...new Set(props.rows.map((r) => (def.currency as (row: Row) => string)(r)))]
}
/** Picker / header: var olan çipi açar, yoksa tipin varsayılan operatörüyle oluşturup editörünü açar; boolean doğrudan uygulanır. */
const pick = (column: string) => {
  const def = defs.value.get(column)
  if (!def) return
  if (phone.value) {
    filtersSheet.value?.show(column)
    return
  }
  if (!chips.value.some((c) => c.column === column)) {
    const op = defaultOperator(def)
    chips.value = [...chips.value, def.type === 'boolean' ? { column, op, value: true } : { column, op }]
    if (def.type === 'boolean') return
  }
  editing.value = column
}
const updateChip = (chip: Chip) => (chips.value = chips.value.map((c) => (c.column === chip.column ? chip : c)))
const removeChip = (column: string) => {
  chips.value = chips.value.filter((c) => c.column !== column)
  if (editing.value === column) editing.value = null
}
/** Editör değer seçilmeden kapanırsa çip kaldırılır (04 §1). */
const setEditing = (column: string | null) => {
  const prev = editing.value
  editing.value = column
  if (prev && prev !== column) {
    const c = chips.value.find((x) => x.column === prev)
    if (c && !isComplete(c, typeOf(prev))) removeChip(prev)
  }
}
const clearFilters = () => {
  chips.value = []
  editing.value = null
}
/** Telefon Filters sayfası (04 §9): çipler ve sıralama Show results'la tek adımda uygulanır. */
const filtersSheet = ref<{ show: (column?: string) => void } | null>(null)
const applySheet = (next: Chip[], s: SortRule[]) => {
  chips.value = next
  editing.value = null
  sort.value = s
  goTo(1)
}

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
  filters: filters.value,
  sort: sort.value,
  page: page.value,
  columns: visibleColumns.value,
  fields: fields.value,
}))
const queryWithoutPage = (): QueryWithoutPage => {
  const { search, filters, sort, columns, fields } = query.value
  return { search, filters, sort, columns, fields }
}

// Ekran okuyucu bölgeleri (08 §5); görünüm/filtre/sıralama duyuruları buraya yazar.
const polite = ref('')
const assertive = ref('')

// Görünümler (04 §7, D4, D5): görünüm = filtre + sıralama + sütun düzeni; uygulama tek adımda (aynı tick) → tek talep.
const current = (): ViewState => ({ filters: filters.value, sort: sort.value, columns: layout.state.value })
const applyView = (p: ViewPatch) => {
  chips.value = (p.filters ?? []).map((f) => ({ ...f }))
  editing.value = null
  sort.value = p.sort ?? []
  layout.apply(p.columns)
  goTo(1)
}
const vw = useViews({
  tableId: () => props.tableId,
  system: () => props.views,
  adapter: ctx.viewsAdapter,
  locale: () => ctx.locale,
  defaultViewId: () => pref.prefs.defaultViewId,
  setDefaultViewId: (id) => pref.set({ defaultViewId: id }),
  prefsReady: pref.ready,
  current,
  apply: applyView,
  onChange: (v) => {
    emit('view-change', { id: v.id, kind: v.kind })
    polite.value = i18n.t('sr.view', { name: v.name })
  },
})
const viewMenuOpen = ref(false)
const viewSummary = (s: ViewState) => {
  const first = s.sort[0]
  const more = s.sort.length > 1 ? ` +${s.sort.length - 1}` : ''
  const pinned = [...s.columns.pinned.left, ...s.columns.pinned.right].map(headerOf).join(', ')
  return {
    filters: s.filters.map((f) => headerOf(f.column)).join(' · ') || i18n.t('common.empty'),
    sort: first ? `${headerOf(first.column)} ${first.dir === 'asc' ? '↑' : '↓'}${more}` : i18n.t('common.empty'),
    columns: [
      i18n.t('views.columnsSummary', { shown: s.columns.visible.length, total: props.columns.length }),
      ...(pinned ? [i18n.t('views.pinnedSummary', { name: pinned })] : []),
    ].join(' · '),
  }
}
const resolveState = (v: View): ViewState => ({
  filters: v.state.filters ?? [],
  sort: v.state.sort ?? [],
  columns: layout.resolve(v.state.columns),
})
interface ViewDialogState {
  mode: 'create' | 'rename'
  name: string
  state: ViewState
  summary: ReturnType<typeof viewSummary> | null
  view?: View
  /** Mevcut düzenleme yeni görünüme taşınır (Save as new / New view); Duplicate'te aktif görünümün taslağı kalır. */
  fromCurrent: boolean
}
const viewDialog = ref<ViewDialogState | null>(null)
const viewDialogOpen = computed({
  get: () => !!viewDialog.value,
  set: (o: boolean) => {
    if (!o) viewDialog.value = null
  },
})
const confirmDelete = ref<View | null>(null)
/** Save as new view / Save as my view / New view: mevcut durum, ad boş. Duplicate: kaynağın kayıtlı durumu, "{ad} copy". */
const openSaveAs = (view?: View) => {
  const state = view ? resolveState(view) : current()
  viewDialog.value = {
    mode: 'create',
    name: view ? i18n.t('views.copyName', { name: view.name }) : '',
    state,
    summary: viewSummary(state),
    view,
    fromCurrent: !view,
  }
}
const openRename = (view: View) =>
  (viewDialog.value = { mode: 'rename', name: view.name, state: current(), summary: null, view, fromCurrent: false })
const validateViewName = (name: string): NameError | null => {
  const d = viewDialog.value
  return nameError(name, vw.all.value, ctx.locale, d?.mode === 'rename' ? d.view?.id : undefined)
}
const onViewDialogSave = (input: { name: string; makeDefault: boolean }) => {
  const d = viewDialog.value
  if (!d) return
  if (d.mode === 'rename' && d.view) void vw.rename(d.view.id, input.name)
  else
    void vw.create({
      name: input.name,
      state: d.state,
      makeDefault: input.makeDefault,
      fromCurrent: d.fromCurrent,
    })
}
const removeView = () => {
  const v = confirmDelete.value
  if (v) void vw.remove(v.id)
}

// Seçim ve expand (05 §6–7): durum TanStack'te (D23); seçim sayfa kapsamlı (D19), expand anahtarla (refresh'te açık kalır).
const rowSelection = ref<Record<string, true>>({})
const expanded = ref<Record<string, boolean>>({})
const expandOn = computed(() => !!props.expand)
const canExpandFn = computed(() => (typeof props.expand === 'object' ? props.expand.canExpand : undefined))
const list = useListTable<Row>({
  columns: () => props.columns,
  rows: () => props.rows,
  rowKey: () => props.rowKey,
  mode: () => props.mode,
  locale: ctx.locale,
  sort,
  filters,
  page,
  search,
  hasMore: () => props.hasMore,
  selectable: () => props.selectable,
  rowSelection,
  expanded,
  canExpand: () => canExpandFn.value,
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
const bodyState = computed<'error' | 'noResults' | 'noRowsOnPage' | 'empty' | null>(() => {
  if (skeleton.value || hasRows.value || pending.value) return null
  if (req.errorKind.value === 'error') return 'error'
  if (search.value || filters.value.length) return 'noResults'
  if (page.value.number > 1) return 'noRowsOnPage'
  return 'empty'
})
const errorInfo = computed(() => {
  const e = props.error
  return typeof e === 'object' && e ? e : typeof e === 'string' ? { message: e } : {}
})
const noResultsTitle = computed(() => {
  const count = filters.value.length
  const params = { entity: entity.value, q: search.value, count }
  if (search.value && count) return i18n.t('state.noResultsBoth', params)
  if (search.value) return i18n.t('state.noResultsSearch', params)
  return i18n.t('state.noResults', params)
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
    polite.value = i18n.t('sr.total', { count: fmt.int(t), entity: entity.value })
  },
)
watch(
  () => JSON.stringify([search.value, sort.value, filters.value]),
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
// Her filtre değişikliğinde sayfa 1, gövde başa (04 §3); ekran okuyucuya eklenen/kaldırılan filtre (08 §5).
watch(
  () => JSON.stringify(filters.value),
  (now, before) => {
    goTo(1)
    grid.value?.scrollToTop()
    const prev = new Map((JSON.parse(before) as FilterCondition[]).map((f) => [f.column, JSON.stringify(f)]))
    const next = new Map((JSON.parse(now) as FilterCondition[]).map((f) => [f.column, JSON.stringify(f)]))
    for (const [column, key] of next)
      if (prev.get(column) !== key) {
        const chip = chips.value.find((c) => c.column === column)
        if (chip) {
          const sm = summaryOf(chip)
          polite.value = i18n.t('sr.filterAdded', { summary: `${headerOf(column)} ${sm.text}`.trim() })
        }
      }
    for (const column of prev.keys())
      if (!next.has(column)) polite.value = i18n.t('sr.filterRemoved', { column: headerOf(column) })
  },
)

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
const displayProps = computed(() => ({
  density: density.value,
  verticalLines: pref.prefs.verticalLines,
  columns: layout.panel.value,
  counts: layout.counts.value,
  persistent: pref.persistent,
}))
// v-on nesnesi: anahtarlar olay adı (Vue `on` önekini kendisi ekler).
const displayOn = {
  'update:density': (d: Density) => pref.set({ density: d }),
  'columns-save': (d: ColumnsDraft) => layout.arrange(d),
  // Display › Reset: tercihler + sütun düzeni aktif görünümün kayıtlı haline; filtre ve sıralama korunur.
  reset: () => {
    pref.reset()
    layout.reset(vw.active.value?.state.columns)
  },
}
// Telefon ⋯ sayfasında Sort › kalır (masaüstü Display'de yok).
const phoneSortOn = {
  'sort-dir': (column: string, dir: 'asc' | 'desc') => {
    sort.value = sort.value.map((s) => (s.column === column ? { column, dir } : s))
    goTo(1)
  },
  'sort-remove': (column: string) => onSortSet(column, null),
  'sort-clear': () => {
    sort.value = []
    goTo(1)
  },
}
const onExport = (format: 'csv' | 'xlsx') =>
  emit('export', {
    format,
    query: queryWithoutPage(),
    selection: list.selectedRows.value,
    visibleColumns: visibleColumns.value,
  })

// Birincil hücre (D6): link, aria etiketleri ve Copy için metin; ⋯ sütunu birincil sütun ya da rowActions varsa.
const primaryDef = computed(() => props.columns.find((c) => c.primary))
const primaryHref = (row: Row) => primaryDef.value?.href?.(row)
const primaryLabel = (row: Row): string => {
  const d = primaryDef.value
  const v = d ? (d.accessor ? d.accessor(row) : readPath(row, d.id as string)) : readPath(row, props.rowKey)
  return v === null || v === undefined ? '' : String(v)
}
const rowMenu = computed(() => !!props.rowActions?.length || !!primaryDef.value)
const selectedRows = list.selectedRows
const clearSelection = () => (rowSelection.value = {})
const selectRows = (ids: string[], value: boolean) => {
  const next = { ...rowSelection.value }
  for (const id of ids) {
    if (value) next[id] = true
    else delete next[id]
  }
  rowSelection.value = next
}
// Sayfa, sayfa boyutu, filtre, arama, sıralama → seçim temizlenir, açıklar kapanır (D19, 05 §7); refresh'te korunur.
watch(
  () => JSON.stringify([search.value, filters.value, sort.value, page.value]),
  () => {
    rowSelection.value = {}
    expanded.value = {}
    grid.value?.measure()
  },
)
// Yeni veride olmayan anahtarlar süzülür (05 §12).
watch(
  () => props.rows,
  (rows) => {
    const ids = new Set(rows.map(list.rowId))
    const keep = (o: Record<string, boolean>) => Object.fromEntries(Object.entries(o).filter(([id]) => ids.has(id)))
    if (Object.keys(rowSelection.value).some((id) => !ids.has(id)))
      rowSelection.value = keep(rowSelection.value) as Record<string, true>
    if (Object.keys(expanded.value).some((id) => !ids.has(id))) expanded.value = keep(expanded.value)
  },
)
watch(selectedRows, (rows) => {
  emit('selection-change', rows)
  if (rows.length) polite.value = i18n.t('selection.selected', { count: rows.length })
})
const toggleExpand = (id: string, value: boolean) => {
  const next = { ...expanded.value }
  if (value) next[id] = true
  else delete next[id]
  expanded.value = next
  if (!value) return
  void nextTick(() => {
    const row = props.rows.find((r) => list.rowId(r) === id)
    const sub = [
      ...((grid.value?.$el as HTMLElement | undefined)?.querySelectorAll<HTMLElement>('.dt-subrow') ?? []),
    ].find((el) => el.id.endsWith(`-sub-${id}`))
    if (row)
      polite.value = i18n.t('sr.expanded', {
        label: primaryLabel(row),
        count: sub ? sub.querySelectorAll('[role="row"], tr').length : 0,
      })
  })
}
/** Satır gövdesi (D6): her zaman `row-click`; `rowClick` modu açar ya da detayı açıp kapatır. */
const onRowClick = (row: Row, event: MouseEvent) => {
  emit('row-click', { row, event })
  if (props.rowClick === 'open') {
    ;(event.target as Element | null)
      ?.closest('.dt-row')
      ?.querySelector<HTMLElement>('.dt-cell.is-primary a.dt-link')
      ?.click()
  } else if (props.rowClick === 'expand' && expandOn.value && (canExpandFn.value?.(row) ?? true)) {
    const id = list.rowId(row)
    toggleExpand(id, !expanded.value[id])
  }
}
const onRowOpen = (row: Row, event: MouseEvent) => emit('row-open', { row, href: primaryHref(row) ?? '', event })
// Toast: yalnızca "Copied" (handoff 02 §6); bulk aksiyonlar için toast uygulamanındır (D20).
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
const copyId = (row: Row) => {
  void navigator.clipboard?.writeText(primaryLabel(row))
  toast.value = i18n.t('cell.copied')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 2000)
}
const onPrint = () => emit('print', { query: queryWithoutPage(), visibleColumns: visibleColumns.value })
const copyErrorId = () => void navigator.clipboard?.writeText(errorInfo.value.id ?? '')

// Kısayollar (08 §3): `/` arama, `F` filtre, `V` görünüm, `R` yenile, `⌘S` görünümü kaydet; Alt←/→ sayfa (her zaman).
// Kapsam sayfa; tek harfliler odak metin alanındayken kapalı.
const onKey = (e: KeyboardEvent) => {
  if (e.defaultPrevented) return
  const target = e.target instanceof Element ? e.target : null
  // Seçim checkbox'ları Tab durağı (D38): odakları kısayolları ve Esc'i kapatmaz.
  const typing = !!target && isTextInput(target) && !(target instanceof HTMLInputElement && target.type === 'checkbox')
  // Esc sırayla: açık popover/menü/dialog (odak içindedir) → seçim (05 §6); metin alanında aramanın Esc'i.
  if (e.key === 'Escape') {
    const inLayer = !!target?.closest('[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"], .dt-pop')
    if (!e.defaultPrevented && !inLayer && selectedRows.value.length && !typing) clearSelection()
    return
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    if (busy.value) return
    const next = e.key === 'ArrowLeft' ? page.value.number - 1 : page.value.number + 1
    if (next >= 1 && (e.key === 'ArrowLeft' || footerHasMore.value)) {
      e.preventDefault()
      goTo(next)
    }
    return
  }
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
    if (!props.shortcuts || !vw.edited.value || !ctx.viewsAdapter || viewDialog.value) return
    e.preventDefault()
    if (vw.writable(vw.active.value)) void vw.saveChanges()
    else openSaveAs()
    return
  }
  if (!props.shortcuts || e.ctrlKey || e.metaKey || e.altKey || typing) return
  if (e.key === '/' && hasSearch.value) {
    e.preventDefault()
    toolbarRef.value?.focusSearch()
  } else if ((e.key === 'f' || e.key === 'F') && hasFilter.value) {
    e.preventDefault()
    if (phone.value) filtersSheet.value?.show()
    else pickerOpen.value = true
  } else if ((e.key === 'r' || e.key === 'R') && listens('onRequest')) {
    e.preventDefault()
    req.refresh()
  } else if ((e.key === 'v' || e.key === 'V') && vw.hasViews.value && props.toolbar === 'auto') {
    e.preventDefault()
    viewMenuOpen.value = true
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  ro?.disconnect()
  clearTimeout(slowTimer)
  clearTimeout(barTimer)
  clearInterval(autoTimer)
  clearTimeout(toastTimer)
  countCtl?.abort()
})

// Ekran okuyucu duyuruları (08 §5): tek polite + tek assertive bölge.
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

// Tek tooltip, kart kökünde: hücreler, başlıklar ve çipler (02 · Tooltip).
const tooltip = useDelegatedTooltip(rootEl)

defineExpose({ refresh: req.refresh, clearSelection })
</script>

<template>
  <div ref="rootEl" class="dt dt-list" :class="{ 'is-phone': phone }" :data-density="density">
    <BulkBar
      v-if="selectionBar === 'toolbar' && selectedRows.length && toolbar !== false"
      variant="toolbar"
      :rows="selectedRows"
      :actions="bulkActions ?? []"
      @clear="clearSelection"
    >
      <slot v-if="$slots['selection-actions']" name="selection-actions" :rows="selectedRows" :clear="clearSelection" />
    </BulkBar>
    <Toolbar
      v-else-if="toolbar !== false"
      ref="toolbarRef"
      :size="size"
      :search="hasSearch ? search : null"
      :search-placeholder="searchPlaceholder"
      :has-filter="hasFilter"
      :has-display="hasDisplay"
      :has-more="hasMore"
      @update:search="setSearch"
    >
      <template v-if="vw.hasViews.value && toolbar === 'auto'" #view>
        <ViewMenu
          v-model:open="viewMenuOpen"
          :sections="vw.sections.value"
          :active="vw.active.value"
          :edited="vw.edited.value"
          :has-draft="vw.hasDraft"
          :default-id="pref.prefs.defaultViewId"
          :can-save="!!ctx.viewsAdapter"
          :can-write="vw.writable(vw.active.value)"
          :sheet="phone"
          @select="vw.select"
          @save-changes="vw.saveChanges()"
          @save-as="openSaveAs()"
          @discard="vw.discard()"
          @new="openSaveAs()"
          @rename="openRename"
          @duplicate="openSaveAs"
          @set-default="(id) => pref.set({ defaultViewId: id })"
          @delete="(v) => (confirmDelete = v)"
        />
      </template>
      <template #filter="{ iconOnly, phone: p }">
        <button
          v-if="p"
          type="button"
          class="dt-btn dt-btn-icon dt-filter-trigger"
          :class="{ 'is-active': filters.length }"
          :aria-label="i18n.t('toolbar.filter')"
          @click="filtersSheet?.show()"
        >
          <PhFunnel :size="20" aria-hidden="true" />
          <span v-if="filters.length" class="dt-counter">{{ filters.length }}</span>
        </button>
        <ColumnPicker v-else v-model:open="pickerOpen" :columns="columns" :chips="chips" @pick="pick">
          <template #trigger>
            <button
              type="button"
              class="dt-btn has-icon dt-filter-trigger"
              :class="{ 'is-active': filters.length, 'dt-btn-icon': iconOnly && !filters.length }"
              :aria-label="iconOnly ? i18n.t('toolbar.filter') : undefined"
            >
              <PhFunnel :size="16" aria-hidden="true" />
              <span v-if="!iconOnly">{{ i18n.t('toolbar.filter') }}</span>
              <span v-if="filters.length" class="dt-counter">{{ filters.length }}</span>
            </button>
          </template>
        </ColumnPicker>
      </template>
      <template #display="{ iconOnly }">
        <DisplayPopover
          v-bind="displayProps"
          :icon-only="iconOnly"
          v-on="displayOn"
          @update:vertical-lines="(on) => pref.set({ verticalLines: on })"
        />
      </template>
      <template #more="{ phone: p }">
        <PhoneMoreSheet
          v-if="p"
          v-bind="more"
          :density="density"
          :columns="layout.panel.value"
          :counts="layout.counts.value"
          :sort="sort"
          :persistent="pref.persistent"
          :auto-refresh-on="autoRefreshOn"
          v-on="{ ...displayOn, ...phoneSortOn }"
          @update:auto-refresh-on="(v) => (autoRefreshOn = v)"
          @refresh="req.refresh()"
          @export="onExport"
          @import="emit('import')"
          @print="onPrint"
        />
        <MoreMenu
          v-else
          v-bind="more"
          :auto-refresh-on="autoRefreshOn"
          @update:auto-refresh-on="(v) => (autoRefreshOn = v)"
          @refresh="req.refresh()"
          @export="onExport"
          @import="emit('import')"
          @print="onPrint"
        />
      </template>
      <template v-if="$slots['toolbar-end']" #end="{ compact }">
        <slot name="toolbar-end" :compact="compact" />
      </template>
    </Toolbar>

    <FilterBar
      v-if="chips.length"
      :chips="chips"
      :defs="defs"
      :editing="editing"
      :rows="rows"
      :labels="labels"
      :summary-of="summaryOf"
      :currencies-of="currenciesOf"
      :phone="phone"
      @open="(c) => filtersSheet?.show(c)"
      @update:chip="updateChip"
      @remove="removeChip"
      @update:editing="setEditing"
      @clear-all="clearFilters"
    >
      <template #add>
        <ColumnPicker :columns="columns" :chips="chips" @pick="pick">
          <template #trigger>
            <button type="button" class="dt-btn dt-btn-ghost dt-btn-sm has-icon dt-filter-add dt-filter-trigger">
              <PhPlus :size="14" aria-hidden="true" />
              {{ i18n.t('filter.addFilter') }}
            </button>
          </template>
        </ColumnPicker>
      </template>
    </FilterBar>

    <FiltersSheet
      v-if="phone && hasFilter"
      ref="filtersSheet"
      :columns="columns"
      :chips="chips"
      :sort="sort"
      :rows="rows"
      :labels="labels"
      :summary-of="summaryOf"
      :currencies-of="currenciesOf"
      @apply="applySheet"
    />

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
      :filtered-columns="filteredColumns"
      :labels="labels"
      sortable
      :selectable="selectable"
      :selection="rowSelection"
      :expandable="expandOn"
      :expanded="expanded"
      :can-expand="canExpandFn"
      :row-menu="rowMenu"
      :row-actions="rowActions"
      :row-error="rowError"
      :primary-href="primaryHref"
      :primary-label="primaryLabel"
      :primary-header="primaryDef?.header"
      :phone="phone"
      @header-filter="pick"
      @row-click="(row, e) => onRowClick(row as Row, e)"
      @row-open="(row, e) => onRowOpen(row as Row, e)"
      @select-rows="selectRows"
      @select-page="list.toggleAllPage"
      @toggle-expand="toggleExpand"
      @copy-id="(row) => copyId(row as Row)"
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
          v-else-if="bodyState === 'noResults'"
          :kind="search ? 'noResultsSearch' : 'noResults'"
          :title="noResultsTitle"
        >
          <button v-if="filters.length === 1" type="button" class="dt-btn" @click="removeChip(filters[0]!.column)">
            {{ i18n.t('state.removeFilter', { column: headerOf(filters[0]!.column) }) }}
          </button>
          <button v-else-if="filters.length" type="button" class="dt-btn" @click="clearFilters">
            {{ i18n.t('state.clearAllFilters') }}
          </button>
          <button v-if="search" type="button" class="dt-btn" @click="setSearch('')">
            {{ i18n.t('state.clearSearch') }}
          </button>
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
      <template v-if="$slots.expanded" #expanded="{ row, close }">
        <slot name="expanded" :row="row as Row" :close="close" />
      </template>
    </GridRoot>
    <BulkBar
      v-if="selectionBar === 'floating' && selectedRows.length"
      variant="floating"
      :phone="phone"
      :rows="selectedRows"
      :actions="bulkActions ?? []"
      @clear="clearSelection"
    >
      <slot v-if="$slots['selection-actions']" name="selection-actions" :rows="selectedRows" :clear="clearSelection" />
    </BulkBar>
    <div
      v-if="toast"
      class="dt-toast"
      :class="{ 'is-raised': selectionBar === 'floating' && selectedRows.length }"
      role="status"
    >
      <PhCheck :size="16" aria-hidden="true" />
      {{ toast }}
    </div>

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
      :phone="phone"
      @count="count"
      @page="goTo"
      @page-size="setPageSize"
      @refresh="req.refresh()"
    />
    <span class="dt-sr-only" aria-live="polite">{{ polite }}</span>
    <span class="dt-sr-only" aria-live="assertive">{{ assertive }}</span>
    <div
      v-show="tooltip.open.value"
      class="dt-tip"
      :class="{ 'is-multi': tooltip.text.value.includes('\n') }"
      role="tooltip"
      :style="tooltip.style.value"
    >
      {{ tooltip.text.value }}
    </div>
    <ViewDialog
      v-if="viewDialog"
      v-model:open="viewDialogOpen"
      :mode="viewDialog.mode"
      :name="viewDialog.name"
      :summary="viewDialog.summary"
      :validate="validateViewName"
      @save="onViewDialogSave"
    />
    <ConfirmDialog
      :open="!!confirmDelete"
      :title="i18n.t('views.delete.title', { name: confirmDelete?.name ?? '' })"
      :body="i18n.t('views.delete.body')"
      :confirm-label="i18n.t('views.delete')"
      danger
      @update:open="(o) => !o && (confirmDelete = null)"
      @confirm="removeView"
    />
  </div>
</template>
