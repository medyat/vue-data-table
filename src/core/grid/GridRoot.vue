<script setup lang="ts">
// Izgara kökü (05 §2–4, 08 §1–2, brief §5.5): tek kayan alan, sticky header, sabit sütunlar + koşullu kenar gölgesi,
// sanal satırlar (@tanstack/vue-virtual), satır odaklı klavye, tek tooltip. Veri çekmez; satırları olduğu gibi çizer.
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, onMounted, ref, shallowRef, toRaw, watch, watchEffect } from 'vue'
import type { ColumnDef } from '../../types/columns'

// İç bileşen: satır tipi dış bileşende (DataTable) tiplidir; accessor/cell parametreleri karşıt değişken olduğundan burada any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
import type { Density } from '../../types/core'
import { RemoteLabels } from '../cells/remoteLabels'
import type { RenderEnv } from '../cells/renderCell'
import { TYPE_SPECS } from '../cells/specs'
import { useColumnLayout, type LayoutColumn } from '../columns/useColumnLayout'
import { getFormat } from '../format'
import { isPlainRowClick } from '../interaction/isInteractive'
import { useRovingRows } from '../interaction/useRovingRows'
import { useDataTableContext } from '../plugin'
import HeaderCell from './HeaderCell.vue'
import Row from './Row'
import SkeletonRow from './SkeletonRow'
import { useDelegatedTooltip } from './useDelegatedTooltip'

const props = withDefaults(
  defineProps<{
    columns: Array<ColumnDef<AnyRow>>
    rows: AnyRow[]
    rowKey?: string
    density?: Density
    /** role=grid aria-label. */
    label: string
    /** Satırlar yokken true → 12 iskelet satır (brief §5.6 First load). */
    loading?: boolean
    /** aria-rowcount; bilinmiyorsa -1. */
    rowCount?: number
    /** İlk veri satırının sayfa ofseti (aria-rowindex = 2 + ofset + i). */
    rowIndexOffset?: number
    selectedKeys?: ReadonlySet<string>
    /** Sütun id → sıralama (Faz 2'de doldurulur). */
    sort?: ReadonlyMap<string, { dir: 'asc' | 'desc'; index: number | null }>
    filteredColumns?: ReadonlySet<string>
    sortable?: boolean
  }>(),
  { rowKey: 'id', density: 'standard', loading: false, rowCount: -1, rowIndexOffset: 0, sortable: false },
)
const emit = defineEmits<{
  'row-click': [row: AnyRow, event: MouseEvent]
  'row-enter': [row: AnyRow]
  sort: [columnId: string, additive: boolean]
  'header-menu': [columnId: string, event: Event]
  'header-filter': [columnId: string]
}>()

const ctx = useDataTableContext()
const root = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)

// Dokunmatikte Compact → Standard (02 · Yoğunluk); satır yüksekliği buna göre.
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const density = computed<Density>(() => (coarse && props.density === 'compact' ? 'standard' : props.density))

const layout = useColumnLayout<AnyRow>({
  columns: () => props.columns,
  rows: () => props.rows,
  rowKey: () => props.rowKey,
})

// Genişlikler ve sabit ofsetleri Vue render'ı dışında, senkron (05 · Resize: kare başına < 1 ms).
watchEffect(
  () => {
    const el = root.value
    if (!el) return
    el.style.setProperty('--cols', layout.colsVar.value)
    el.style.setProperty('--dt-min-w', `${layout.minWidth.value}px`)
    for (const [name, value] of Object.entries(layout.offsetVars.value)) el.style.setProperty(name, value)
  },
  { flush: 'sync' },
)

// Satır yüksekliği token'dan (02): yoğunluk değişince yeniden okunur; jsdom'da boş gelir → 40.
const rowHeight = ref(40)
const readRowHeight = () => {
  const v = root.value ? parseFloat(getComputedStyle(root.value).getPropertyValue('--dt-row-h')) : NaN
  rowHeight.value = Number.isFinite(v) ? v : 40
}
onMounted(readRowHeight)
watch(density, () => requestAnimationFrame(readRowHeight))

const env = computed<RenderEnv>(() => ({
  fmt: getFormat(ctx.locale),
  i18n: ctx.i18n,
  today: new Date(),
  labels,
  density: density.value,
  coarse,
}))
const labels = new RemoteLabels()

const roving = useRovingRows({
  count: () => props.rows.length,
  rowEl: (i) => root.value?.querySelector<HTMLElement>(`.dt-row[data-index="${i}"]`) ?? null,
  scrollToIndex: (i) => virtualizer.value.scrollToIndex(i, { align: 'auto' }),
  pageSize: () => Math.max(1, Math.floor((scrollEl.value?.clientHeight ?? 0) / (rowHeight.value + 1)) - 1),
  // Uygulamaya satırın ham nesnesi verilir (proxy değil): kimlik karşılaştırmaları çalışsın.
  onEnter: (i) => {
    const row = props.rows[i]
    if (row) emit('row-enter', toRaw(row))
  },
})

const skeleton = computed(() => props.loading && props.rows.length === 0)
const count = computed(() => (skeleton.value ? 12 : props.rows.length))

const virtualizer = useVirtualizer(
  computed(() => ({
    count: count.value,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => rowHeight.value + 1, // + 1 px alt kenarlık (02)
    overscan: 10,
    getItemKey: (i: number) => (skeleton.value ? `sk-${i}` : layout.rowId(props.rows[i]!)),
    // Odaklı satır her zaman DOM'da (08 §2): kaydırma odağı kaybettirmez.
    rangeExtractor: (range: { startIndex: number; endIndex: number; overscan: number; count: number }) => {
      const start = Math.max(0, range.startIndex - range.overscan)
      const end = Math.min(range.count - 1, range.endIndex + range.overscan)
      const out: number[] = []
      const f = roving.focusedIndex.value
      if (!skeleton.value && f >= 0 && f < start && f < range.count) out.push(f)
      for (let i = start; i <= end; i++) out.push(i)
      if (!skeleton.value && f > end && f < range.count) out.push(f)
      return out
    },
  })),
)
const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// Sabit sütun kenar gölgesi yalnızca o yöne kaydırılmışken (05 §4 · Pinned).
const scrolledStart = shallowRef(false)
const scrolledEnd = shallowRef(false)
const onScroll = () => {
  const el = scrollEl.value
  if (!el) return
  scrolledStart.value = el.scrollLeft > 0
  scrolledEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}
onMounted(() => {
  onScroll()
  if (scrollEl.value && typeof ResizeObserver !== 'undefined') new ResizeObserver(onScroll).observe(scrollEl.value)
})

// Satır tıklaması: tek guard (05 §7). Sürükleme tespiti için mousedown noktası.
let downPoint: { x: number; y: number } | null = null
const onMousedown = (e: MouseEvent) => {
  downPoint = { x: e.clientX, y: e.clientY }
  roving.onMousedown(e)
}
const onClick = (e: MouseEvent) => {
  const rowEl = (e.target as HTMLElement).closest<HTMLElement>('.dt-row[data-index]')
  if (!rowEl || !isPlainRowClick(e, rowEl, downPoint)) return
  const row = props.rows[Number(rowEl.dataset.index)]
  if (row) emit('row-click', toRaw(row), e)
}

const selectedSet = computed(() => props.selectedKeys ?? new Set<string>())
const sortOf = (id: string) => props.sort?.get(id)
const columnSortable = (c: LayoutColumn<AnyRow>) =>
  props.sortable && (c.def.sortable ?? TYPE_SPECS[c.def.type].sortable)

/** Çift tık: içeriğe sığdır (görünür satırlar + header). */
const fitToContent = (col: LayoutColumn<AnyRow>) => {
  const el = root.value
  if (!el) return
  const sel = CSS.escape(col.id)
  const items = [
    ...el.querySelectorAll<HTMLElement>(`[data-col="${sel}"] .dt-cell-content, [data-col="${sel}"] .dt-head-text`),
  ]
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

const tooltip = useDelegatedTooltip(root)

watch(
  () => props.rows.length,
  () => roving.clamp(),
)
// estimateSize değişimi ölçüm önbelleğini yenilemez (virtual-core memo'su count/getItemKey'e bağlı): yoğunluk değişince sıfırla.
watch(rowHeight, () => virtualizer.value.measure())

defineExpose({ focusRow: roving.focusRow, scrollToIndex: (i: number) => virtualizer.value.scrollToIndex(i), layout })
</script>

<template>
  <div
    ref="root"
    class="dt-grid"
    :class="{
      'is-scrolled-start': scrolledStart,
      'is-scrolled-end': scrolledEnd,
      'is-keyboard': roving.keyboard.value,
      'is-skeleton': skeleton,
    }"
    role="grid"
    :aria-label="label"
    :aria-rowcount="rowCount"
    :aria-colcount="layout.columns.value.length"
    :aria-busy="loading ? 'true' : undefined"
    :data-density="density"
    @keydown="roving.onKeydown"
    @mousedown="onMousedown"
    @pointerdown="roving.onPointerdown"
    @focusin="roving.onFocusin"
    @click="onClick"
  >
    <div ref="scrollEl" class="dt-scroll" @scroll.passive="onScroll">
      <div class="dt-head" role="row" aria-rowindex="1">
        <HeaderCell
          v-for="col in layout.columns.value"
          :key="col.id"
          :column="col"
          :sort="sortOf(col.id)?.dir ?? null"
          :sort-index="sortOf(col.id)?.index ?? null"
          :filtered="filteredColumns?.has(col.id) ?? false"
          :resizing="layout.resizing.value?.id === col.id ? layout.resizing.value.size : null"
          :sortable="columnSortable(col)"
          @sort="(c, additive) => emit('sort', c.id, additive)"
          @menu="(c, e) => emit('header-menu', c.id, e)"
          @filter="(c) => emit('header-filter', c.id)"
          @fit="fitToContent"
          @resize-start="(c, w) => layout.setWidth(c.id, w)"
        />
      </div>
      <div class="dt-body" role="presentation" :style="{ height: `${totalSize}px` }">
        <template v-for="item in virtualRows" :key="String(item.key)">
          <SkeletonRow
            v-if="skeleton"
            :index="item.index"
            :columns="layout.columns.value"
            :style="{ transform: `translateY(${item.start}px)`, height: `${item.size}px` }"
          />
          <Row
            v-else
            :row="rows[item.index]!"
            :index="item.index"
            :row-index="2 + rowIndexOffset + item.index"
            :columns="layout.columns.value"
            :env="env"
            :focused="roving.focusedIndex.value === item.index"
            :keyboard-focus="roving.keyboard.value"
            :selected="selectedSet.has(layout.rowId(rows[item.index]!))"
            :secondary-visible="density === 'comfortable'"
            :style="{ transform: `translateY(${item.start}px)`, height: `${item.size}px` }"
          />
        </template>
      </div>
    </div>
    <div v-show="tooltip.open.value" class="dt-tip" role="tooltip" :style="tooltip.style.value">
      {{ tooltip.text.value }}
    </div>
  </div>
</template>
