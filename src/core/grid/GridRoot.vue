<script setup lang="ts">
// Izgara kökü (05 §2–4, §6–8, §10; 08 §1–3; brief §5.5): tek kayan alan, sticky header, sabit sütunlar + koşullu kenar gölgesi,
// sanal satırlar (@tanstack/vue-virtual; öğe = satır + açık detay, ölçülen yükseklik), header klavyesi ve sütun menüsü (D38: satır
// klavyesi yok, widget'lar doğal Tab sırasında), seçim sütunu (40 px) ve ⋯ sütunu (44 px; hatalı satır varken 66), satır menüsü, kaydırma hapı. Veri çekmez, sütun düzenini dışarıdan
// (useColumnLayout) alır; seçim/expand durumunu üstten alır ve niyet olarak yayar.
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, useId, watch, watchEffect } from 'vue'

// İç bileşen: satır tipi dış bileşende (DataTable) tiplidir; accessor/cell parametreleri karşıt değişken olduğundan burada any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
import type { Density } from '../../types/core'
import type { RowAction } from '../../types/list'
import { RemoteLabels } from '../cells/remoteLabels'
import type { RenderEnv } from '../cells/renderCell'
import { TYPE_SPECS } from '../cells/specs'
import type { ColumnLayoutApi, LayoutColumn } from '../columns/useColumnLayout'
import { getFormat } from '../format'
import { isPlainRowClick } from '../interaction/isInteractive'
import { useDataTableContext } from '../plugin'
import HeaderCell from './HeaderCell.vue'
import type { HeaderAction } from './headerActions'
import { inlineActionsOf } from './inlineActions'
import Row from './Row'
import SkeletonRow from './SkeletonRow'

const props = withDefaults(
  defineProps<{
    layout: ColumnLayoutApi<AnyRow>
    rows: AnyRow[]
    density?: Density
    /** role=grid aria-label. */
    label: string
    /** aria-busy. */
    loading?: boolean
    /** 12 iskelet satır (First load, 400 ms'yi aşan sorgu değişimi). */
    skeleton?: boolean
    /** Sorgu değişimi: eski satırlar soluk + inert (05 §10 · Query change). */
    dim?: boolean
    /** Header altında 2 px belirsiz çubuk (Refreshing). */
    refreshing?: boolean
    verticalLines?: boolean
    /** aria-rowcount; bilinmiyorsa -1. */
    rowCount?: number
    /** Sayfa ofseti: aria-rowindex ve kaydırma hapı (05 §8). */
    rowIndexOffset?: number
    sort?: ReadonlyMap<string, { dir: 'asc' | 'desc'; index: number | null }>
    filteredColumns?: ReadonlySet<string>
    sortable?: boolean
    /** `ajax`/`user` etiket önbelleği; DataTable filtre çipleriyle paylaşır. */
    labels?: RemoteLabels
    /** Seçim sütunu (05 §6); durum `selection` (anahtar → seçili). */
    selectable?: boolean
    selection?: Record<string, boolean>
    /** Birincil hücrede chevron + alt satır (05 §7); durum `expanded` (anahtar → açık). */
    expandable?: boolean
    expanded?: Record<string, boolean>
    canExpand?: (row: AnyRow) => boolean
    /** ⋯ sütunu ve satır menüsü: Open / Copy yerleşik, `rowActions` uygulamanın. */
    rowMenu?: boolean
    rowActions?: RowAction[]
    /** Satır hatası (05 §4, D35): metin/metin listesi; boş → yok. */
    rowError?: (row: AnyRow) => string | string[] | null | undefined
    primaryHref?: (row: AnyRow) => string | undefined
    primaryLabel?: (row: AnyRow) => string
    primaryHeader?: string
    /** Telefon (05 §11): seçim sütunu 48, satır 48 px, kısa header; sabitleme useColumnLayout'ta. */
    phone?: boolean
  }>(),
  { density: 'standard', loading: false, rowCount: -1, rowIndexOffset: 0, sortable: false },
)
const emit = defineEmits<{
  'row-click': [row: AnyRow, event: MouseEvent]
  /** Birincil linke düz sol tık, satırda ↵, menüde Open (05 §7). Native navigasyon dinleyicide durdurulabilir. */
  'row-open': [row: AnyRow, event: MouseEvent]
  'select-rows': [ids: string[], value: boolean]
  'select-page': [value: boolean]
  'toggle-expand': [id: string, value: boolean]
  'copy-id': [row: AnyRow]
  sort: [columnId: string, additive: boolean]
  'sort-set': [columnId: string, dir: 'asc' | 'desc' | null]
  'header-filter': [columnId: string]
}>()
defineSlots<{
  notice?: () => unknown
  state?: () => unknown
  expanded?: (props: { row: AnyRow; close: () => void }) => unknown
}>()

const ctx = useDataTableContext()
const root = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const layout = props.layout

// Dokunmatikte Compact → Standard (02 · Yoğunluk); satır yüksekliği buna göre.
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const density = computed<Density>(() => (coarse && props.density === 'compact' ? 'standard' : props.density))

// Seçim (40; telefonda 48) ve ⋯ sütunları düzenin dışında: track'ler başa/sona eklenir, sabit sütun ofsetleri o kadar kayar.
// ⋯ sütunu içeriğe göre (05 §4): 8 + ⋯ 28 + 8 = 44; sayfada hatalı satır varsa (D35) + 14 + 8; inline aksiyon başına (D36,
// sayfadaki en kalabalık satır) + 28 + 8. CSS: .dt-cell-menu (dolgu 8, gap 8).
const SELECT_W = 40
const SELECT_W_PHONE = 48
const MENU_PAD = 8
const MORE_W = 28
const ERROR_SLOT = 14 + 8
const INLINE_SLOT = 28 + 8
const selW = computed(() => (props.selectable ? (props.phone ? SELECT_W_PHONE : SELECT_W) : 0))
const anyError = computed(() => !!props.rowError && props.rows.some((r) => errorOf(r).length > 0))
const maxInline = computed(() => {
  const actions = props.rowActions ?? []
  if (!actions.some((a) => a.inline)) return 0
  return props.rows.reduce((m, r) => Math.max(m, inlineActionsOf(actions, r).length), 0)
})
const menuW = computed(() =>
  props.rowMenu ? MENU_PAD + (anyError.value ? ERROR_SLOT : 0) + maxInline.value * INLINE_SLOT + MORE_W + MENU_PAD : 0,
)
// Genişlikler ve sabit ofsetleri Vue render'ı dışında, senkron (05 · Resize: kare başına < 1 ms).
watchEffect(
  () => {
    const el = root.value
    if (!el) return
    const cols = [selW.value ? `${selW.value}px` : '', layout.colsVar.value, menuW.value ? `${menuW.value}px` : '']
    el.style.setProperty('--cols', cols.filter(Boolean).join(' '))
    el.style.setProperty('--dt-min-w', `${layout.minWidth.value + selW.value + menuW.value}px`)
    el.style.setProperty('--dt-sel-w', `${selW.value}px`)
    el.style.setProperty('--dt-menu-w', `${menuW.value}px`)
    const startVars = new Set(layout.start.value.map((c) => c.offsetVar))
    const endVars = new Set(layout.end.value.map((c) => c.offsetVar))
    for (const [name, value] of Object.entries(layout.offsetVars.value)) {
      const extra = startVars.has(name) ? selW.value : endVars.has(name) ? menuW.value : 0
      el.style.setProperty(name, extra ? `${parseFloat(value) + extra}px` : value)
    }
  },
  { flush: 'sync' },
)

// Satır yüksekliği token'dan (02): yoğunluk değişince yeniden okunur; jsdom'da boş gelir → 40.
const rowHeight = ref(40)
// Sticky header akış içinde: sanal öğeler header kadar aşağıda başlar (TanStack `scrollMargin`), header görünür alanın üstünü
// (`scrollPaddingStart`), yatay kaydırma çubuğu altını (`scrollPaddingEnd`) örter. Yoksa ↓ ile inen satır tam bir header
// yüksekliği kadar kabın altında kalır (08 §2).
const headH = ref(36)
const barH = ref(0)
const readBarH = () => {
  const el = scrollEl.value
  barH.value = el ? Math.max(0, el.offsetHeight - el.clientHeight) : 0
}
const readRowHeight = () => {
  const v = root.value ? parseFloat(getComputedStyle(root.value).getPropertyValue('--dt-row-h')) : NaN
  rowHeight.value = Number.isFinite(v) ? v : 40
  headH.value = root.value?.querySelector<HTMLElement>('.dt-head')?.offsetHeight ?? headH.value
  readBarH()
}
onMounted(readRowHeight)
watch([density, () => props.phone], () => requestAnimationFrame(readRowHeight))

const env = computed<RenderEnv>(() => ({
  fmt: getFormat(ctx.locale),
  i18n: ctx.i18n,
  today: new Date(),
  labels,
  density: density.value,
  coarse,
}))
const labels = props.labels ?? new RemoteLabels()

/** Sütunun header ve gövde hücreleri (id'de nokta olabilir: CSS.escape yerine dataset karşılaştırması). */
const cellsOf = (id: string) =>
  [...(root.value?.querySelectorAll<HTMLElement>('[data-col]') ?? [])].filter((c) => c.dataset.col === id)

const rowIdAt = (i: number) => layout.rowId(props.rows[i]!)
const isSelected = (i: number) => !!props.selection?.[rowIdAt(i)]
const isExpanded = (row: AnyRow) => !!props.expanded?.[layout.rowId(row)]
const canExpandRow = (row: AnyRow) => !!props.expandable && (props.canExpand?.(row) ?? true)
const labelOf = (row: AnyRow) => props.primaryLabel?.(row) ?? layout.rowId(row)
const uid = useId()
const subrowId = (row: AnyRow) => `${uid}-sub-${layout.rowId(row)}`
const rowUid = (row: AnyRow) => `${uid}-r-${layout.rowId(row)}`
/** `rowError` sonucunu mesaj listesine indirger; boş metinler düşer, boş liste = hata yok. */
const errorOf = (row: AnyRow): string[] => {
  const e = props.rowError?.(row)
  return (Array.isArray(e) ? e : [e]).filter((m): m is string => !!m)
}
// Odak bir satırdaki widget'tayken o satır DOM'da kalır (08 §2): kaydırma odağı kaybettirmez.
const focusedIndex = ref(-1)
const onFocusin = (e: FocusEvent) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('.dt-row[data-index]')
  focusedIndex.value = row ? Number(row.dataset.index) : -1
}

// Checkbox ⇧ aralığının çapası (05 §6).
let anchor = -1
const idsBetween = (a: number, b: number) => {
  const [from, to] = a < b ? [a, b] : [b, a]
  return props.rows.slice(from, to + 1).map((r) => layout.rowId(r))
}
const menuIndex = ref(-1)
/** Checkbox: ⇧ ile son tıklanan satırla arasındaki aralık aynı değere (05 §6). */
const onSelect = (i: number, value: boolean, shift: boolean) => {
  emit('select-rows', shift && anchor >= 0 ? idsBetween(anchor, i) : [rowIdAt(i)], value)
  anchor = i
}
const selectedCount = computed(() =>
  props.selectable ? props.rows.reduce((n, r) => n + (props.selection?.[layout.rowId(r)] ? 1 : 0), 0) : 0,
)
const allSelected = computed(() => props.rows.length > 0 && selectedCount.value === props.rows.length)
const someSelected = computed(() => selectedCount.value > 0 && !allSelected.value)

const skeleton = computed(() => !!props.skeleton)
const count = computed(() => (skeleton.value ? 12 : props.rows.length))

const virtualizer = useVirtualizer(
  computed(() => ({
    count: count.value,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => rowHeight.value + 1, // + 1 px alt kenarlık (02)
    scrollMargin: headH.value,
    scrollPaddingStart: headH.value,
    scrollPaddingEnd: barH.value,
    overscan: 10,
    getItemKey: (i: number) => (skeleton.value ? `sk-${i}` : layout.rowId(props.rows[i]!)),
    // Odaklı satır her zaman DOM'da (08 §2).
    rangeExtractor: (range: { startIndex: number; endIndex: number; overscan: number; count: number }) => {
      const start = Math.max(0, range.startIndex - range.overscan)
      const end = Math.min(range.count - 1, range.endIndex + range.overscan)
      const out: number[] = []
      const f = focusedIndex.value
      if (!skeleton.value && f >= 0 && f < start && f < range.count) out.push(f)
      for (let i = start; i <= end; i++) out.push(i)
      if (!skeleton.value && f > end && f < range.count) out.push(f)
      return out
    },
  })),
)
const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())
// Açık detay: öğe (satır + alt satır) ölçülür, anahtarla önbellekte kalır; kapanınca satır yüksekliğine döner (05 §7).
const measureItem = (el: Element | null, index: number) => {
  if (el && !skeleton.value && isExpanded(props.rows[index])) virtualizer.value.measureElement(el)
}
watch(
  () => new Set(Object.keys(props.expanded ?? {}).filter((k) => props.expanded![k])),
  (now, before) => {
    for (const key of before ?? []) {
      if (now.has(key)) continue
      const i = props.rows.findIndex((r) => layout.rowId(r) === key)
      if (i >= 0) virtualizer.value.resizeItem(i, rowHeight.value + 1)
    }
  },
)

// Sabit sütun kenar gölgesi yalnızca o yöne kaydırılmışken (05 §4 · Pinned). Dikey kaydırmada konum hapı (05 §8).
const scrolledStart = shallowRef(false)
const scrolledEnd = shallowRef(false)
const pill = shallowRef<{ from: number; to: number } | null>(null)
let pillTimer: ReturnType<typeof setTimeout> | undefined
let lastTop = 0
const onScroll = () => {
  const el = scrollEl.value
  if (!el) return
  readBarH()
  scrolledStart.value = el.scrollLeft > 0
  scrolledEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
  if (el.scrollTop === lastTop) return
  lastTop = el.scrollTop
  const range = virtualizer.value.range
  if (!range || skeleton.value) return
  pill.value = { from: props.rowIndexOffset + range.startIndex + 1, to: props.rowIndexOffset + range.endIndex + 1 }
  clearTimeout(pillTimer)
  pillTimer = setTimeout(() => (pill.value = null), 900)
}
const pillText = computed(() =>
  pill.value ? ctx.i18n.t('page.scrollPos', { from: pill.value.from, to: pill.value.to }) : '',
)
onMounted(() => {
  onScroll()
  if (scrollEl.value && typeof ResizeObserver !== 'undefined') new ResizeObserver(onScroll).observe(scrollEl.value)
})
onBeforeUnmount(() => clearTimeout(pillTimer))

// Satır tıklaması: tek guard (05 §7). Sürükleme tespiti için mousedown noktası.
let downPoint: { x: number; y: number } | null = null
const onMousedown = (e: MouseEvent) => {
  downPoint = { x: e.clientX, y: e.clientY }
}
const onClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const rowEl = target.closest<HTMLElement>('.dt-row[data-index]')
  if (!rowEl) return
  const row = props.rows[Number(rowEl.dataset.index)]
  if (!row) return
  // Birincil linke düz sol tık → row-open; değiştirici tuş / orta tık tarayıcıya (D6).
  const link = target.closest('a.dt-link')
  if (link && link.closest('.dt-cell.is-primary') && rowEl.contains(link)) {
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) emit('row-open', toRaw(row), e)
    return
  }
  if (isPlainRowClick(e, rowEl, downPoint)) emit('row-click', toRaw(row), e)
}

const sortOf = (id: string) => props.sort?.get(id)
const columnSortable = (c: LayoutColumn<AnyRow>) =>
  props.sortable && (c.def.sortable ?? TYPE_SPECS[c.def.type].sortable)

/** Çift tık / menü: içeriğe sığdır (görünür satırlar + header). */
const fitToContent = (col: LayoutColumn<AnyRow>) => {
  const el = root.value
  if (!el) return
  const items = cellsOf(col.id).flatMap((c) => [...c.querySelectorAll<HTMLElement>('.dt-cell-content, .dt-head-text')])
  // Blok eleman hücre genişken onu doldurur; içeriğin gerçek genişliği için geçici max-content (tek reflow: önce yaz, sonra oku).
  // max-width: 100% kesilmiş içeriği hücreye, flex-shrink header metnini düğmeye sıkıştırır; ölçüm için ikisi de kalkar.
  for (const c of items) {
    c.style.width = 'max-content'
    c.style.maxWidth = 'none'
    c.style.flex = 'none'
  }
  const max = items.reduce((m, c) => Math.max(m, c.getBoundingClientRect().width), 0)
  for (const c of items) {
    c.style.width = ''
    c.style.maxWidth = ''
    c.style.flex = ''
  }
  const pad = parseFloat(getComputedStyle(el).getPropertyValue('--dt-cell-x')) || 12
  // 24 px: hover'da beliren hücre aksiyonları ve header'daki ok/⋯ için pay.
  layout.setWidth(col.id, Math.ceil(max) + pad * 2 + 24)
}

/** Sütun menüsü ve ⌥⇧←/→ (05 §4): sıralama dışındakiler düzenin kendi işi. Taşınan başlığın odağı korunur. */
const onHeaderAction = (col: LayoutColumn<AnyRow>, action: HeaderAction) => {
  switch (action) {
    case 'filter':
      emit('header-filter', col.id)
      return
    case 'sort-asc':
    case 'sort-desc':
    case 'sort-clear':
      emit('sort-set', col.id, action === 'sort-clear' ? null : action === 'sort-asc' ? 'asc' : 'desc')
      return
    case 'pin-left':
      layout.pin(col.id, 'start')
      return
    case 'pin-right':
      layout.pin(col.id, 'end')
      return
    case 'unpin':
      layout.pin(col.id, null)
      return
    case 'fit':
      fitToContent(col)
      return
    case 'hide':
      layout.setVisible(col.id, false)
      return
    case 'move-left':
    case 'move-right': {
      const focused = document.activeElement?.closest<HTMLElement>('.dt-head-cell')?.dataset.col === col.id
      layout.move(col.id, action === 'move-left' ? -1 : 1)
      if (focused) void nextTick(() => cellsOf(col.id)[0]?.querySelector<HTMLElement>('.dt-head-label')?.focus())
    }
  }
}
// Sayfa/sorgu değişiminde ⇧ aralığının çapası sıfırlanır. Dizi kimliği değil anahtar dizisi izlenir: seçim değişince satır modeli
// yeniden hesaplanır ama satırlar aynıdır.
watch(
  () => props.rows.map((r) => layout.rowId(r)).join('\u0000'),
  () => (anchor = -1),
)
// estimateSize değişimi ölçüm önbelleğini yenilemez (virtual-core memo'su count/getItemKey'e bağlı): yoğunluk değişince sıfırla.
watch(rowHeight, () => virtualizer.value.measure())

defineExpose({
  scrollToIndex: (i: number) => virtualizer.value.scrollToIndex(i),
  scrollToTop: () => {
    if (scrollEl.value) scrollEl.value.scrollTop = 0
  },
  /** Ölçüm önbelleğini sıfırlar (sorgu/sayfa sonrası açıklar kapanınca, 05 §7). */
  measure: () => virtualizer.value.measure(),
})
</script>

<template>
  <div
    ref="root"
    class="dt-grid"
    :class="{
      'is-scrolled-start': scrolledStart,
      'is-scrolled-end': scrolledEnd,
      'is-skeleton': skeleton,
      'is-dim': dim,
      'has-vlines': verticalLines,
      'is-phone': phone,
    }"
    role="table"
    :aria-label="label"
    :aria-rowcount="rowCount"
    :aria-colcount="layout.columns.value.length + (selectable ? 1 : 0) + (rowMenu ? 1 : 0)"
    :aria-busy="loading || dim ? 'true' : undefined"
    :data-density="density"
    @mousedown="onMousedown"
    @focusin="onFocusin"
    @click="onClick"
  >
    <!-- Tab ile odaklanan widget'ı tarayıcı kaydırır: sticky header ve yatay çubuk payı (08 §2). -->
    <div
      ref="scrollEl"
      class="dt-scroll"
      :style="{ scrollPaddingTop: `${headH}px`, scrollPaddingBottom: `${barH}px` }"
      @scroll.passive="onScroll"
    >
      <div class="dt-head" role="row" aria-rowindex="1">
        <div
          v-if="selectable"
          class="dt-head-cell dt-head-select is-pinned-start"
          :class="{ 'is-pin-edge': !layout.start.value.length }"
          style="left: 0px"
          role="columnheader"
        >
          <input
            type="checkbox"
            class="dt-checkbox"
            :checked="allSelected"
            :indeterminate="someSelected"
            :aria-label="ctx.i18n.t('row.selectPageAria')"
            @click="emit('select-page', !allSelected)"
          />
        </div>
        <HeaderCell
          v-for="col in [...layout.start.value, ...layout.center.value]"
          :key="col.id"
          :column="col"
          :sort="sortOf(col.id)?.dir ?? null"
          :sort-index="sortOf(col.id)?.index ?? null"
          :filtered="filteredColumns?.has(col.id) ?? false"
          :resizing="layout.resizing.value?.id === col.id ? layout.resizing.value.size : null"
          :sortable="columnSortable(col)"
          :phone="phone"
          @sort="(c, additive) => emit('sort', c.id, additive)"
          @filter="(c) => emit('header-filter', c.id)"
          @action="onHeaderAction"
          @resize-by="(c, d) => layout.setWidth(c.id, layout.widthOf(c.id) + d)"
          @resize-start="(c, w) => layout.setWidth(c.id, w)"
        />
        <div class="dt-head-cell dt-cell-fill" role="presentation" aria-hidden="true" />
        <HeaderCell
          v-for="col in layout.end.value"
          :key="col.id"
          :column="col"
          :sort="sortOf(col.id)?.dir ?? null"
          :sort-index="sortOf(col.id)?.index ?? null"
          :filtered="filteredColumns?.has(col.id) ?? false"
          :resizing="layout.resizing.value?.id === col.id ? layout.resizing.value.size : null"
          :sortable="columnSortable(col)"
          :phone="phone"
          @sort="(c, additive) => emit('sort', c.id, additive)"
          @filter="(c) => emit('header-filter', c.id)"
          @action="onHeaderAction"
          @resize-by="(c, d) => layout.setWidth(c.id, layout.widthOf(c.id) + d)"
          @resize-start="(c, w) => layout.setWidth(c.id, w)"
        />
        <div
          v-if="rowMenu"
          class="dt-head-cell dt-head-menu-col is-pinned-end"
          :class="{ 'is-pin-edge': !layout.end.value.length }"
          style="right: 0px"
          role="columnheader"
        />
      </div>
      <div class="dt-body" role="presentation" :inert="dim || undefined" :style="{ height: `${totalSize}px` }">
        <div
          v-for="item in virtualRows"
          :key="String(item.key)"
          :ref="(el) => measureItem(el as Element | null, item.index)"
          class="dt-item"
          :data-index="item.index"
          :style="{ transform: `translateY(${item.start - headH}px)` }"
        >
          <SkeletonRow v-if="skeleton" :index="item.index" :columns="layout.columns.value" />
          <template v-else>
            <Row
              :row="rows[item.index]!"
              :index="item.index"
              :row-index="2 + rowIndexOffset + item.index"
              :columns="layout.columns.value"
              :env="env"
              :secondary-visible="density === 'comfortable'"
              :label="labelOf(rows[item.index])"
              :selectable="selectable"
              :selected="isSelected(item.index)"
              :select-edge="!layout.start.value.length"
              :expandable="expandable"
              :can-expand="canExpandRow(rows[item.index])"
              :expanded="isExpanded(rows[item.index])"
              :subrow-id="subrowId(rows[item.index])"
              :menu="rowMenu"
              :menu-open="menuIndex === item.index"
              :menu-edge="!layout.end.value.length"
              :row-actions="rowActions"
              :error="errorOf(rows[item.index])"
              :uid="rowUid(rows[item.index])"
              :href="primaryHref?.(rows[item.index])"
              :primary-header="primaryHeader"
              @select="(v, shift) => onSelect(item.index, v, shift)"
              @expand="emit('toggle-expand', rowIdAt(item.index), !isExpanded(rows[item.index]))"
              @menu-open="(o) => (menuIndex = o ? item.index : -1)"
              @open="(e) => emit('row-open', toRaw(rows[item.index]), e)"
              @copy="emit('copy-id', toRaw(rows[item.index]))"
            />
            <div
              v-if="isExpanded(rows[item.index])"
              :id="subrowId(rows[item.index])"
              class="dt-subrow"
              role="row"
              :aria-rowindex="2 + rowIndexOffset + item.index"
            >
              <div role="cell" :aria-colspan="layout.columns.value.length">
                <slot
                  name="expanded"
                  :row="toRaw(rows[item.index])"
                  :close="() => emit('toggle-expand', rowIdAt(item.index), false)"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-if="refreshing" class="dt-refresh-bar" aria-hidden="true" />
    <div v-if="$slots.notice" class="dt-notice" role="status"><slot name="notice" /></div>
    <div v-if="$slots.state && !skeleton && rows.length === 0" class="dt-body-state"><slot name="state" /></div>
    <div class="dt-scroll-pill" :class="{ 'is-visible': pill }" aria-hidden="true">{{ pillText }}</div>
  </div>
</template>
