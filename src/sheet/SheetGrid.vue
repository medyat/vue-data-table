<script setup lang="ts">
// Sheet ızgarası (07 §2–6, 08 §2 sheet, handoff 06 §5): tek kayan alan, sticky header, gutter (56 px) + sola sabit
// sütunlar, sanal satırlar (aktif satır DOM'da kalır); hücre odaklı klavye (roving tabindex = aktif hücre), fare ile
// hücre / aralık seçimi (TanStack handler'ları, gutter = satır), düzenleme başlatma ve onaylama kuralları. Veri, seçim
// ve düzenleme durumu `sheet` nesnesinden (DataSheet kurar); bu dosya yalnızca DOM, odak ve kaydırmayı yönetir.
import { PhLock } from '@phosphor-icons/vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'
import { RemoteLabels } from '../core/cells/remoteLabels'
import type { RenderEnv } from '../core/cells/renderCell'
import { alignOf, isNumericType } from '../core/cells/specs'
import type { ColumnLayoutApi, LayoutColumn } from '../core/columns/useColumnLayout'
import { getFormat } from '../core/format'
import SkeletonRow from '../core/grid/SkeletonRow'
import { INTERACTIVE_SELECTOR, isInteractive } from '../core/interaction/isInteractive'
import { useDataTableContext } from '../core/plugin'
import type { ColumnDef } from '../types/columns'
import type { Density } from '../types/core'
import SheetRow, { type CellEditing, type RowSelection } from './SheetRow'
import type { SheetApi } from './useSheetEditing'
import type { Direction } from './useSheetTable'

// İç bileşen: satır tipi DataSheet'te tiplidir.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
const GUTTER_W = 56

const props = withDefaults(
  defineProps<{
    sheet: SheetApi<AnyRow>
    layout: ColumnLayoutApi<AnyRow>
    rows: AnyRow[]
    density?: Density
    /** role=grid aria-label. */
    label: string
    /** aria-busy. */
    loading?: boolean
    /** Açılış: 24 iskelet satır (07 §15). */
    skeleton?: boolean
    verticalLines?: boolean
    keyColumn: string
  }>(),
  { density: 'compact', loading: false, skeleton: false, verticalLines: true },
)
defineSlots<{ state?: () => unknown }>()

const ctx = useDataTableContext()
const root = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const layout = props.layout
const sheet = props.sheet
const table = sheet.table
const store = sheet.store
const keyOf = store.keyOf

const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const density = computed<Density>(() => (coarse && props.density === 'compact' ? 'standard' : props.density))

// Gutter track'i başa eklenir; sola sabit sütunların ofseti o kadar kayar (GridRoot ile aynı yöntem).
watchEffect(
  () => {
    const el = root.value
    if (!el) return
    el.style.setProperty('--cols', `${GUTTER_W}px ${layout.colsVar.value}`)
    el.style.setProperty('--dt-min-w', `${layout.minWidth.value + GUTTER_W}px`)
    const startVars = new Set(layout.start.value.map((c) => c.offsetVar))
    for (const [name, value] of Object.entries(layout.offsetVars.value))
      el.style.setProperty(name, startVars.has(name) ? `${parseFloat(value) + GUTTER_W}px` : value)
  },
  { flush: 'sync' },
)

const rowHeight = ref(32)
const readRowHeight = () => {
  const v = root.value ? parseFloat(getComputedStyle(root.value).getPropertyValue('--dt-row-h')) : NaN
  rowHeight.value = Number.isFinite(v) ? v : 32
}
onMounted(readRowHeight)
watch(density, () => requestAnimationFrame(readRowHeight))

const labels = new RemoteLabels()
const env = computed<RenderEnv>(() => ({
  fmt: getFormat(ctx.locale),
  i18n: ctx.i18n,
  today: new Date(),
  labels,
  density: density.value,
  coarse,
}))
const columns = computed(() => layout.columns.value)
const defById = computed(() => new Map(columns.value.map((c) => [c.id, c.def])))
const indexByKey = computed(() => {
  const m = new Map<string, number>()
  props.rows.forEach((r, i) => m.set(keyOf(r), i))
  return m
})
const active = table.active
const activeIndex = computed(() => (active.value ? (indexByKey.value.get(active.value.rowId) ?? -1) : -1))
// Aralık görünümü yalnızca birden çok hücrede (tek hücre = aktif çerçeve, 07 §4).
const multi = computed(() => {
  const b = table.bounds.value
  return !!b && (b.maxRowIndex > b.minRowIndex || b.maxColumnIndex > b.minColumnIndex)
})
const selectionFor = (i: number): RowSelection | null => {
  const b = table.bounds.value
  if (!b || !multi.value || i < b.minRowIndex || i > b.maxRowIndex) return null
  return { from: b.minColumnIndex, to: b.maxColumnIndex, top: i === b.minRowIndex, bottom: i === b.maxRowIndex }
}
const editingFor = (i: number): CellEditing | null => {
  const e = sheet.edit.editing.value
  const row = props.rows[i]
  return e && row && keyOf(e.row) === keyOf(row)
    ? { columnId: e.def.id as string, value: e.value, inCell: e.inCell }
    : null
}

const count = computed(() => (props.skeleton ? 24 : props.rows.length))
const virtualizer = useVirtualizer(
  computed(() => ({
    count: count.value,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => rowHeight.value + 1,
    overscan: 10,
    getItemKey: (i: number) => (props.skeleton ? `sk-${i}` : keyOf(props.rows[i]!)),
    // Aktif satır her zaman DOM'da (08 §2): kaydırma odağı kaybettirmez.
    rangeExtractor: (range: { startIndex: number; endIndex: number; overscan: number; count: number }) => {
      const start = Math.max(0, range.startIndex - range.overscan)
      const end = Math.min(range.count - 1, range.endIndex + range.overscan)
      const out: number[] = []
      const a = props.skeleton ? -1 : activeIndex.value
      if (a >= 0 && a < start) out.push(a)
      for (let i = start; i <= end; i++) out.push(i)
      if (a > end && a < range.count) out.push(a)
      return out
    },
  })),
)
const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())
watch(rowHeight, () => virtualizer.value.measure())

const scrolledStart = shallowRef(false)
const onScroll = () => {
  scrolledStart.value = (scrollEl.value?.scrollLeft ?? 0) > 0
}

/** Hücre elemanı (id'de nokta olabilir: dataset karşılaştırması). */
const cellEl = (i: number, columnId: string): HTMLElement | null => {
  const row = root.value?.querySelector<HTMLElement>(`.dt-row[data-index="${i}"]`)
  if (!row) return null
  for (const c of row.querySelectorAll<HTMLElement>('.dt-cell[data-col]')) if (c.dataset.col === columnId) return c
  return null
}
const pinnedWidth = (): number => {
  let w = 0
  for (const c of root.value?.querySelectorAll<HTMLElement>('.dt-head .is-pinned-start') ?? []) w += c.offsetWidth
  return w
}
/** Yatayda görünüre getir: sola sabit sütunların altında kalmasın. */
const revealX = (el: HTMLElement) => {
  const sc = scrollEl.value
  if (!sc || el.classList.contains('is-pinned-start')) return
  const r = el.getBoundingClientRect()
  const s = sc.getBoundingClientRect()
  const left = s.left + pinnedWidth()
  if (r.left < left) sc.scrollLeft -= left - r.left
  else if (r.right > s.right) sc.scrollLeft += r.right - s.right
}
/** Aktif hücreyi DOM'a getirip odaklar (sanal listede sonraki karede). */
const focusActive = () => {
  const a = active.value
  if (!a) return
  const i = indexByKey.value.get(a.rowId)
  if (i === undefined) return
  virtualizer.value.scrollToIndex(i, { align: 'auto' })
  const tryFocus = (attempt: number) => {
    const el = cellEl(i, a.columnId)
    if (el) {
      el.focus({ preventScroll: true })
      revealX(el)
    } else if (attempt < 3) requestAnimationFrame(() => tryFocus(attempt + 1))
  }
  tryFocus(0)
}

const focusCell = (i: number, columnId: string) => {
  const row = props.rows[Math.max(0, Math.min(props.rows.length - 1, i))]
  if (!row) return
  table.focus(keyOf(row), columnId)
  focusActive()
}
/** Tab / ⇧Tab: satır sonunda sonraki satırın başına (08 §4). */
const step = (dir: 'left' | 'right') => {
  const a = active.value
  if (!a) return
  const cols = columns.value
  const ci = cols.findIndex((c) => c.id === a.columnId)
  const ri = activeIndex.value
  if (dir === 'right') {
    if (ci < cols.length - 1) table.move('right')
    else if (ri < props.rows.length - 1) table.focus(keyOf(props.rows[ri + 1]), cols[0]!.id)
  } else if (ci > 0) table.move('left')
  else if (ri > 0) table.focus(keyOf(props.rows[ri - 1]), cols[cols.length - 1]!.id)
  focusActive()
}
/** ⌘ + ok: kenara atla. */
const jump = (dir: Direction) => {
  const a = active.value!
  const cols = columns.value
  if (dir === 'left') table.focus(a.rowId, cols[0]!.id)
  else if (dir === 'right') table.focus(a.rowId, cols[cols.length - 1]!.id)
  else {
    const row = props.rows[dir === 'up' ? 0 : props.rows.length - 1]
    if (row) table.focus(keyOf(row), a.columnId)
  }
}
const pageSize = () => Math.max(1, Math.floor((scrollEl.value?.clientHeight ?? 0) / (rowHeight.value + 1)) - 1)
const DIR: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

const onKeydown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement
  const ed = sheet.edit.editing.value
  if (ed?.inCell) {
    // Tab her zaman onaylar (listede olmayan metin olduğu gibi kalır → hata, 07 §5). Enter/Esc: açık combobox
    // (aria-expanded), kendi işini yapmış widget (defaultPrevented) ve düğmeler önce.
    if (e.key === 'Tab') {
      e.preventDefault()
      sheet.edit.commit()
      step(e.shiftKey ? 'left' : 'right')
      return
    }
    if (e.defaultPrevented || target.getAttribute('aria-expanded') === 'true' || target.tagName === 'BUTTON') return
    if (e.key === 'Enter' && !(e.shiftKey && target.tagName === 'TEXTAREA')) {
      e.preventDefault()
      sheet.edit.commit()
      table.move('down')
      focusActive()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      sheet.edit.cancel()
      focusActive()
    }
    return
  }
  const cell = target.closest<HTMLElement>('.dt-cell[data-col]')
  if (!cell) return
  if (target !== cell) {
    // Hücre içi widget: ızgara tuşları kapalı, Esc hücreye döner (08 §2).
    if (e.key === 'Escape') {
      e.preventDefault()
      cell.focus()
    }
    return
  }
  const a = active.value
  const row = props.rows[activeIndex.value]
  const def = a ? defById.value.get(a.columnId) : undefined
  if (!a || !row || !def) return
  const editable = sheet.canEdit(row, def)
  const mod = e.metaKey || e.ctrlKey
  const dir = DIR[e.key]
  if (dir) {
    e.preventDefault()
    if (e.shiftKey) table.extend(dir)
    else if (mod) jump(dir)
    else table.move(dir)
    focusActive()
    return
  }
  switch (e.key) {
    case 'Tab':
      e.preventDefault()
      step(e.shiftKey ? 'left' : 'right')
      return
    case 'Enter': {
      e.preventDefault()
      const widget = editable ? null : cell.querySelector<HTMLElement>(INTERACTIVE_SELECTOR)
      if (widget) widget.focus()
      else {
        table.move('down')
        focusActive()
      }
      return
    }
    case 'F2':
      e.preventDefault()
      sheet.edit.start(row, def, { inCell: true })
      return
    case 'Escape':
      e.preventDefault()
      table.focus(a.rowId, a.columnId)
      return
    case ' ':
      e.preventDefault()
      if (def.type === 'boolean' && editable) sheet.toggle(row, def)
      return
    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      sheet.clearCells()
      return
    case 'Home':
      e.preventDefault()
      focusCell(mod ? 0 : activeIndex.value, columns.value[0]!.id)
      return
    case 'End':
      e.preventDefault()
      focusCell(mod ? props.rows.length - 1 : activeIndex.value, columns.value[columns.value.length - 1]!.id)
      return
    case 'PageDown':
      e.preventDefault()
      focusCell(activeIndex.value + pageSize(), a.columnId)
      return
    case 'PageUp':
      e.preventDefault()
      focusCell(activeIndex.value - pageSize(), a.columnId)
      return
    case 'F8':
      e.preventDefault()
      sheet.goToError(e.shiftKey ? -1 : 1)
      return
  }
  if (mod) {
    const k = e.key.toLowerCase()
    if (k === 'a' && !e.shiftKey) {
      e.preventDefault()
      table.selectAll()
    } else if (k === 's') {
      e.preventDefault()
      sheet.save()
    }
    return
  }
  // Yazmaya başlamak: düzenleme açılır, içerik yazılanla değiştirilir (07 §5).
  if (e.key.length === 1 && !e.altKey && editable) {
    e.preventDefault()
    sheet.edit.start(row, def, { inCell: true, replace: e.key })
  }
}

interface Hit {
  index: number
  row: AnyRow
  columnId: string
  cell: HTMLElement
  target: HTMLElement
}
const hit = (e: Event): Hit | null => {
  const target = e.target as HTMLElement
  const cell = target.closest<HTMLElement>('.dt-cell[data-col]')
  const rowEl = target.closest<HTMLElement>('.dt-row[data-index]')
  if (!cell || !rowEl || props.skeleton) return null
  const index = Number(rowEl.dataset.index)
  const row = props.rows[index]
  return row ? { index, row, columnId: cell.dataset.col!, cell, target } : null
}
let rowAnchor = -1
const onMousedown = (e: MouseEvent) => {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  const rowEl = target.closest<HTMLElement>('.dt-row[data-index]')
  if (target.closest('.dt-gutter') && rowEl && !props.skeleton) {
    // Gutter: satırın tamamı, ⇧ ile satır aralığı (07 §6).
    e.preventDefault()
    const i = Number(rowEl.dataset.index)
    const cols = columns.value
    const from = e.shiftKey && rowAnchor >= 0 ? rowAnchor : i
    rowAnchor = from
    sheet.edit.commit()
    table.selectRange({
      anchorRowId: keyOf(props.rows[from]),
      anchorColumnId: cols[0]!.id,
      focusRowId: keyOf(props.rows[i]),
      focusColumnId: cols[cols.length - 1]!.id,
    })
    focusActive()
    return
  }
  const h = hit(e)
  if (!h) return
  rowAnchor = -1
  const ed = sheet.edit.editing.value
  if (ed?.inCell && h.cell.classList.contains('is-editing')) return
  // Başka hücreye mousedown onaylar (07 §5); hücredeki düğme hücreyi aktif yapar ama düzenlemez.
  sheet.edit.commit()
  if (!isInteractive(h.target, h.cell)) e.preventDefault()
  table.startHandler(keyOf(h.row), h.columnId)?.(e)
  h.cell.focus({ preventScroll: true })
}
const onMouseover = (e: MouseEvent) => {
  const h = hit(e)
  if (h) table.extendHandler(keyOf(h.row), h.columnId)?.(e)
}
const onDblclick = (e: MouseEvent) => {
  const h = hit(e)
  if (!h || isInteractive(h.target, h.cell)) return
  const def = defById.value.get(h.columnId)
  if (def) sheet.edit.start(h.row, def, { inCell: true })
}

const unitOf = (def: ColumnDef<AnyRow>) => (typeof def.unit === 'string' ? def.unit : undefined)
const resize = (col: LayoutColumn<AnyRow>, e: MouseEvent | TouchEvent) => {
  const cell = (e.currentTarget as HTMLElement).parentElement!
  layout.setWidth(col.id, cell.getBoundingClientRect().width)
  col.header.getResizeHandler()(e)
}
const requiredLabel = ctx.i18n.t('sheet.required').toLocaleLowerCase(ctx.locale)

defineExpose({ focusActive, scrollToIndex: (i: number) => virtualizer.value.scrollToIndex(i) })
</script>

<template>
  <div
    ref="root"
    class="dt-grid dt-sheet-grid"
    :class="{ 'is-scrolled-start': scrolledStart, 'is-skeleton': skeleton, 'has-vlines': verticalLines }"
    role="grid"
    :aria-label="label"
    :aria-rowcount="skeleton ? -1 : rows.length"
    :aria-colcount="columns.length + 1"
    :aria-busy="loading ? 'true' : undefined"
    :data-density="density"
    @keydown="onKeydown"
    @mousedown="onMousedown"
    @mouseover="onMouseover"
    @dblclick="onDblclick"
  >
    <div ref="scrollEl" class="dt-scroll" @scroll.passive="onScroll">
      <div class="dt-head" role="row" aria-rowindex="1">
        <div class="dt-head-cell dt-gutter is-pinned-start" style="left: 0px" role="columnheader">
          {{ ctx.i18n.t('sheet.err.row') }}
        </div>
        <div
          v-for="col in columns"
          :key="col.id"
          class="dt-head-cell"
          :class="[
            `is-${alignOf(col.def)}`,
            {
              'is-numeric': isNumericType(col.def.type),
              'is-key': col.id === keyColumn,
              'is-pinned-start': col.pinned === 'start',
              'is-pin-edge': col.pinEdge,
              'is-resizing': layout.resizing.value?.id === col.id,
            },
          ]"
          :style="col.pinned === 'start' ? { left: `var(${col.offsetVar})` } : undefined"
          role="columnheader"
          :data-col="col.id"
        >
          <PhLock v-if="col.id === keyColumn" :size="12" class="dt-head-lock" aria-hidden="true" />
          <span
            class="dt-head-text"
            :data-dt-tip="col.id === keyColumn ? ctx.i18n.t('sheet.keyTooltip', { key: col.def.header }) : undefined"
          >
            {{ col.def.header }}
          </span>
          <span v-if="col.def.required" class="dt-head-required" :aria-label="requiredLabel">*</span>
          <span v-if="unitOf(col.def)" class="dt-head-unit">{{ unitOf(col.def) }}</span>
          <span class="dt-head-sep" aria-hidden="true" />
          <span
            class="dt-resize"
            aria-hidden="true"
            @mousedown="resize(col, $event)"
            @touchstart.passive="resize(col, $event)"
          >
            <span v-if="layout.resizing.value?.id === col.id" class="dt-resize-badge">
              {{ Math.round(layout.resizing.value!.size) }} px
            </span>
          </span>
        </div>
        <div class="dt-head-cell dt-cell-fill" role="presentation" aria-hidden="true" />
      </div>
      <div class="dt-body" role="presentation" :style="{ height: `${totalSize}px` }">
        <div
          v-for="item in virtualRows"
          :key="String(item.key)"
          class="dt-item"
          :data-index="item.index"
          :style="{ transform: `translateY(${item.start}px)` }"
        >
          <SkeletonRow v-if="skeleton" :index="item.index" :columns="columns" gutter />
          <SheetRow
            v-else
            :row="rows[item.index]!"
            :index="item.index"
            :row-no="item.index + 1"
            :columns="columns"
            :env="env"
            :key-column="keyColumn"
            :read="store.read"
            :original="store.original"
            :can-edit="sheet.canEdit"
            :editor-for="sheet.editorFor"
            :draft="store.rowDraft(keyOf(rows[item.index]))"
            :issues="store.rowIssues(keyOf(rows[item.index]))"
            :active="activeIndex === item.index ? active!.columnId : null"
            :selection="selectionFor(item.index)"
            :editing="editingFor(item.index)"
            :tip-below="item.index === 0"
            @edit-value="(v) => sheet.edit.setValue(v)"
          />
        </div>
      </div>
    </div>
    <div v-if="$slots.state && !skeleton && rows.length === 0" class="dt-body-state"><slot name="state" /></div>
  </div>
</template>
