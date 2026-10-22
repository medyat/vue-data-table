<script setup lang="ts">
// Sheet ızgarası (07 §2–10, 08 §2 sheet, handoff 06 §5): tek kayan alan, sticky header (yerel sıralama oku), gutter
// (56 px) + sola sabit sütunlar, sanal satırlar (aktif satır DOM'da kalır); hücre odaklı klavye (roving tabindex = aktif
// hücre), fare ile hücre / aralık seçimi (TanStack handler'ları, gutter = satır, kenarda otomatik kaydırma), fill handle
// sürükleme, pano olayları, hücre menüsü (sağ tık / ⇧F10), düzenleme başlatma ve onaylama kuralları. Veri, seçim ve
// düzenleme durumu `sheet` nesnesinden (DataSheet kurar); bu dosya yalnızca DOM, odak ve kaydırmayı yönetir.
import { PhArrowUp, PhLock } from '@phosphor-icons/vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { ContextMenuRoot, ContextMenuTrigger } from 'reka-ui'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch, watchEffect } from 'vue'
import { RemoteLabels } from '../core/cells/remoteLabels'
import type { RenderEnv } from '../core/cells/renderCell'
import { alignOf, isNumericType } from '../core/cells/specs'
import type { ColumnLayoutApi, LayoutColumn } from '../core/columns/useColumnLayout'
import { getFormat } from '../core/format'
import SkeletonRow from '../core/grid/SkeletonRow'
import { INTERACTIVE_SELECTOR, isInteractive, isTextInput } from '../core/interaction/isInteractive'
import { useDataTableContext } from '../core/plugin'
import type { ColumnDef } from '../types/columns'
import type { Density, Plural } from '../types/core'
import SheetMenu from './SheetMenu.vue'
import SheetRow, { type CellEditing, type RowFill, type RowSelection } from './SheetRow'
import type { SheetApi } from './useSheetEditing'
import type { Direction } from './useSheetTable'

// İç bileşen: satır tipi DataSheet'te tiplidir.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
const GUTTER_FULL = 56
/** Sürüklerken bu kadar yakınken kenar kaydırır (px / kare). */
const EDGE = 24
const SCROLL_STEP = 12

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
    /** Find in grid eşleşmeleri: satır anahtarı → sütunlar. */
    found?: Map<string, Set<string>> | null
    /** Kaydederken (07 §14): aria-readonly; kaydırma, Find ve seçim serbest. */
    readOnly?: boolean
    /** Yerel sıralama (07 §10): sütun → yön ve öncelik. */
    sort?: ReadonlyMap<string, { dir: 'asc' | 'desc'; index: number | null }>
    entity: Plural
    /** Telefon (D14, 07 §17): gutter ve işaret yok, seçim aralığı ve fill handle yok; dokunma hücreyi odaklar. */
    phone?: boolean
  }>(),
  {
    density: 'compact',
    loading: false,
    skeleton: false,
    verticalLines: true,
    found: null,
    readOnly: false,
    phone: false,
  },
)
defineSlots<{ state?: () => unknown }>()

const ctx = useDataTableContext()
const uid = useId()
const root = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const layout = props.layout
const sheet = props.sheet
const table = sheet.table
const store = sheet.store
const keyOf = store.keyOf

const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const density = computed<Density>(() => (coarse && props.density === 'compact' ? 'standard' : props.density))

const GUTTER_W = computed(() => (props.phone ? 0 : GUTTER_FULL))
// Gutter track'i başa eklenir; sola sabit sütunların ofseti o kadar kayar (GridRoot ile aynı yöntem).
watchEffect(
  () => {
    const el = root.value
    if (!el) return
    const g = GUTTER_W.value
    el.style.setProperty('--cols', `${g ? `${g}px ` : ''}${layout.colsVar.value}`)
    el.style.setProperty('--dt-min-w', `${layout.minWidth.value + g}px`)
    const startVars = new Set(layout.start.value.map((c) => c.offsetVar))
    for (const [name, value] of Object.entries(layout.offsetVars.value))
      el.style.setProperty(name, startVars.has(name) ? `${parseFloat(value) + g}px` : value)
  },
  { flush: 'sync' },
)

const rowHeight = ref(32)
// Sticky header akış içinde: sanal öğeler header kadar aşağıda başlar (TanStack `scrollMargin`), header görünür alanın üstünü
// (`scrollPaddingStart`), yatay kaydırma çubuğu altını (`scrollPaddingEnd`) örter. Yoksa ↓ ile inen satır tam bir header
// yüksekliği kadar kabın altında kalır (08 §2).
const headH = ref(32)
const barH = ref(0)
const readBarH = () => {
  const el = scrollEl.value
  barH.value = el ? Math.max(0, el.offsetHeight - el.clientHeight) : 0
}
const readRowHeight = () => {
  const v = root.value ? parseFloat(getComputedStyle(root.value).getPropertyValue('--dt-row-h')) : NaN
  rowHeight.value = Number.isFinite(v) ? v : 32
  headH.value = root.value?.querySelector<HTMLElement>('.dt-head')?.offsetHeight ?? headH.value
  readBarH()
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
/** Fill handle: tek hücrede aktif hücre, aralıkta sağ alt köşe. */
const handleFor = (i: number): string | null => {
  const b = table.bounds.value
  if (!b || fillDrag.value || props.phone) return null
  if (!multi.value) return i === activeIndex.value ? (active.value?.columnId ?? null) : null
  return i === b.maxRowIndex ? (columns.value[b.maxColumnIndex]?.id ?? null) : null
}
const editingFor = (i: number): CellEditing | null => {
  const e = sheet.edit.editing.value
  const row = props.rows[i]
  return e && row && keyOf(e.row) === keyOf(row)
    ? { columnId: e.def.id as string, value: e.value, inCell: e.inCell }
    : null
}
const foundFor = (i: number) => {
  const row = props.rows[i]
  return row ? props.found?.get(keyOf(row)) : undefined
}

const count = computed(() => (props.skeleton ? 24 : props.rows.length))
const virtualizer = useVirtualizer(
  computed(() => ({
    count: count.value,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => rowHeight.value + 1,
    scrollMargin: headH.value,
    scrollPaddingStart: headH.value,
    scrollPaddingEnd: barH.value,
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
  readBarH()
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
/** Aktif hücreyi DOM'a getirip odaklar: önce üst bileşenin `rows` prop'u gelsin (görünüm değişimi, yeni/geri gelen satır
 *  dizini kaydırır), sonra sanal listede sonraki karede DOM'a girsin. */
const focusActive = () => void nextTick(() => focusNow(0))
const focusNow = (round: number) => {
  const a = active.value
  // Hücre editörü açıksa odak ondadır (Add row → anahtar hücresi düzenlemede); çalınmaz.
  if (!a || sheet.edit.editing.value?.inCell) return
  const i = indexByKey.value.get(a.rowId)
  if (i === undefined) {
    if (round < 3) requestAnimationFrame(() => focusNow(round + 1))
    return
  }
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
const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

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
    case 'ContextMenu':
    case 'F10':
      if (e.key === 'F10' && !e.shiftKey) return
      e.preventDefault()
      openMenuAt(cell)
      return
  }
  if (mod) {
    // ⌘C / ⌘X / ⌘V tarayıcının copy/cut/paste olaylarıyla gelir (aşağıda); burada yalnızca kısayol tuşları.
    const k = e.key.toLowerCase()
    if (k === 'a' && !e.shiftKey) {
      e.preventDefault()
      table.selectAll()
    } else if (k === 's') {
      e.preventDefault()
      sheet.save()
    } else if (k === 'd' && !e.shiftKey) {
      e.preventDefault()
      sheet.fillDown()
    } else if (k === 'z' && !e.shiftKey) {
      e.preventDefault()
      sheet.undo()
    } else if ((k === 'z' && e.shiftKey) || (k === 'y' && !mac)) {
      e.preventDefault()
      sheet.redo()
    } else if (e.key === '-' || e.key === 'Subtract') {
      e.preventDefault()
      sheet.removeSelectedRows()
    }
    return
  }
  // Yazmaya başlamak: düzenleme açılır, içerik yazılanla değiştirilir (07 §5).
  if (e.key.length === 1 && !e.altKey && editable) {
    e.preventDefault()
    sheet.edit.start(row, def, { inCell: true, replace: e.key })
  }
}

/** Pano (07 §7): odak hücredeyken (editör ya da widget input'u değilken). */
const clipboard = (e: ClipboardEvent, action: 'copy' | 'cut' | 'paste') => {
  if (sheet.edit.editing.value?.inCell || isTextInput(e.target as Element)) return
  if (!(e.target as HTMLElement).closest('.dt-cell[data-col]')) return
  if (sheet[action](e.clipboardData)) e.preventDefault()
}

interface Hit {
  index: number
  row: AnyRow
  columnId: string
  cell: HTMLElement
  target: HTMLElement
}
const hitAt = (target: HTMLElement | null): Hit | null => {
  const cell = target?.closest<HTMLElement>('.dt-cell[data-col]')
  const rowEl = target?.closest<HTMLElement>('.dt-row[data-index]')
  if (!cell || !rowEl || props.skeleton) return null
  const index = Number(rowEl.dataset.index)
  const row = props.rows[index]
  return row ? { index, row, columnId: cell.dataset.col!, cell, target: target! } : null
}
const hit = (e: Event): Hit | null => hitAt(e.target as HTMLElement)

// Sürükleme (seçim ya da doldurma): kenara yaklaşınca otomatik kayar, kayan içerikte imlecin altındaki hücre izlenir.
const dragging = shallowRef<'select' | 'fill' | null>(null)
const fillDrag = shallowRef<{ fromRow: number; toRow: number; cols: [number, number]; target: number } | null>(null)
const fillLabel = shallowRef<{ left: number; top: number; text: string } | null>(null)
let pointer = { x: 0, y: 0 }
let scrollRaf = 0
const extendTo = (h: Hit | null) => {
  if (!h) return
  if (dragging.value === 'fill') {
    const f = fillDrag.value!
    const target = h.index > f.toRow ? h.index : h.index < f.fromRow ? h.index : f.toRow
    if (target !== f.target) {
      fillDrag.value = { ...f, target }
      updateFillLabel()
    }
  } else table.extendHandler(keyOf(h.row), h.columnId)?.(new MouseEvent('mouseover'))
}
const autoScroll = () => {
  scrollRaf = 0
  const sc = scrollEl.value
  if (!dragging.value || !sc) return
  const r = sc.getBoundingClientRect()
  let dy = 0
  if (pointer.y < r.top + EDGE) dy = -SCROLL_STEP
  else if (pointer.y > r.bottom - EDGE) dy = SCROLL_STEP
  let dx = 0
  if (dragging.value === 'select') {
    if (pointer.x < r.left + pinnedWidth() + EDGE) dx = -SCROLL_STEP
    else if (pointer.x > r.right - EDGE) dx = SCROLL_STEP
  }
  if (dy || dx) {
    sc.scrollTop += dy
    sc.scrollLeft += dx
    extendTo(hitAt(document.elementFromPoint(pointer.x, pointer.y) as HTMLElement | null))
    scrollRaf = requestAnimationFrame(autoScroll)
  }
}
const onMousemove = (e: MouseEvent) => {
  if (!dragging.value) return
  pointer = { x: e.clientX, y: e.clientY }
  if (dragging.value === 'fill') extendTo(hit(e))
  if (!scrollRaf) scrollRaf = requestAnimationFrame(autoScroll)
}
const updateFillLabel = () => {
  const f = fillDrag.value
  if (!f || f.target === f.toRow) {
    fillLabel.value = null
    return
  }
  const last = f.target > f.toRow ? f.target : f.target
  const el = cellEl(last, columns.value[f.cols[1]]!.id)
  const rootRect = root.value?.getBoundingClientRect()
  if (!el || !rootRect) {
    fillLabel.value = null
    return
  }
  const r = el.getBoundingClientRect()
  fillLabel.value = {
    left: r.right - rootRect.left + 10,
    top: r.bottom - rootRect.top - 13,
    text: sheet.fillLabel(f.fromRow, f.toRow, f.cols, f.target),
  }
}
const onDocMouseup = () => {
  if (dragging.value === 'fill' && fillDrag.value) {
    const f = fillDrag.value
    if (f.target !== f.toRow) sheet.fill(f.fromRow, f.toRow, f.cols, f.target)
    fillDrag.value = null
    fillLabel.value = null
    focusActive()
  }
  dragging.value = null
  cancelAnimationFrame(scrollRaf)
  scrollRaf = 0
}
onMounted(() => document.addEventListener('mouseup', onDocMouseup))
onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onDocMouseup)
  cancelAnimationFrame(scrollRaf)
})

let rowAnchor = -1
const onMousedown = (e: MouseEvent) => {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  // Fill handle (07 §8): 4 px dışarı taştığı için alt satırın hücresi hedef olabilir; dikdörtgenle tespit.
  const handle = root.value?.querySelector<HTMLElement>('.dt-fill-handle')
  const hr = handle?.getBoundingClientRect()
  if (
    hr &&
    e.clientX >= hr.left - 2 &&
    e.clientX <= hr.right + 2 &&
    e.clientY >= hr.top - 2 &&
    e.clientY <= hr.bottom + 2
  ) {
    const b = table.bounds.value
    if (!b) return
    e.preventDefault()
    sheet.edit.commit()
    fillDrag.value = {
      fromRow: b.minRowIndex,
      toRow: b.maxRowIndex,
      cols: [b.minColumnIndex, b.maxColumnIndex],
      target: b.maxRowIndex,
    }
    dragging.value = 'fill'
    pointer = { x: e.clientX, y: e.clientY }
    return
  }
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
  if (props.phone) {
    // Telefon: dokunma yalnızca hücreyi odaklar (kaydırma serbest, aralık yok).
    table.focus(keyOf(h.row), h.columnId)
    return
  }
  if (!isInteractive(h.target, h.cell)) e.preventDefault()
  table.startHandler(keyOf(h.row), h.columnId)?.(e)
  dragging.value = 'select'
  pointer = { x: e.clientX, y: e.clientY }
  h.cell.focus({ preventScroll: true })
}
const onMouseover = (e: MouseEvent) => {
  if (dragging.value === 'fill') return
  const h = hit(e)
  if (h) table.extendHandler(keyOf(h.row), h.columnId)?.(e)
}
const onDblclick = (e: MouseEvent) => {
  const h = hit(e)
  if (!h || isInteractive(h.target, h.cell)) return
  const def = defById.value.get(h.columnId)
  if (def) sheet.edit.start(h.row, def, { inCell: true })
}
const fillFor = (i: number): RowFill | null => {
  const f = fillDrag.value
  if (!f || f.target === f.toRow) return null
  const down = f.target > f.toRow
  const inRange = down ? i > f.toRow && i <= f.target : i < f.fromRow && i >= f.target
  if (!inRange) return null
  return { from: f.cols[0], to: f.cols[1], last: down ? i === f.target : i === f.fromRow - 1 }
}

/** Sağ tık (07 §9): hedef hücre seçimin dışındaysa aktif olur; hücre dışı (header, boş alan) için menü açılmaz. */
const onContextmenuCapture = (e: MouseEvent) => {
  const h = hit(e)
  if (!h || props.skeleton) {
    e.stopPropagation()
    return
  }
  const b = table.bounds.value
  const ci = columns.value.findIndex((c) => c.id === h.columnId)
  const inside =
    !!b && h.index >= b.minRowIndex && h.index <= b.maxRowIndex && ci >= b.minColumnIndex && ci <= b.maxColumnIndex
  if (!inside) {
    sheet.edit.commit()
    table.focus(keyOf(h.row), h.columnId)
    h.cell.focus({ preventScroll: true })
  }
}
/** ⇧F10 / Menü tuşu: menü hücrenin köşesinde (reka tetikleyicisi contextmenu olayından konum alır). */
const openMenuAt = (cell: HTMLElement) => {
  const r = cell.getBoundingClientRect()
  cell.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 8, clientY: r.bottom - 4 }),
  )
}
const menuHref = computed(() => {
  const row = props.rows[activeIndex.value]
  return row ? sheet.openHref(row) : undefined
})
const sortOf = (id: string) => props.sort?.get(id)

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
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        ref="root"
        class="dt-grid dt-sheet-grid"
        :class="{
          'is-scrolled-start': scrolledStart,
          'is-skeleton': skeleton,
          'has-vlines': verticalLines,
          'is-filling': dragging === 'fill',
          'is-phone': phone,
        }"
        role="grid"
        :aria-label="label"
        :aria-rowcount="skeleton ? -1 : rows.length"
        :aria-colcount="columns.length + (phone ? 0 : 1)"
        :aria-busy="loading || readOnly ? 'true' : undefined"
        :aria-readonly="readOnly ? 'true' : undefined"
        :data-density="density"
        @keydown="onKeydown"
        @mousedown="onMousedown"
        @mousemove="onMousemove"
        @mouseover="onMouseover"
        @dblclick="onDblclick"
        @contextmenu.capture="onContextmenuCapture"
        @copy="clipboard($event, 'copy')"
        @cut="clipboard($event, 'cut')"
        @paste="clipboard($event, 'paste')"
      >
        <div ref="scrollEl" class="dt-scroll" @scroll.passive="onScroll">
          <div class="dt-head" role="row" aria-rowindex="1">
            <div v-if="!phone" class="dt-head-cell dt-gutter is-pinned-start" style="left: 0px" role="columnheader">
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
              :aria-sort="
                sortOf(col.id)?.dir === 'asc' ? 'ascending' : sortOf(col.id)?.dir === 'desc' ? 'descending' : undefined
              "
              :data-col="col.id"
            >
              <PhLock v-if="col.id === keyColumn" :size="12" class="dt-head-lock" aria-hidden="true" />
              <button
                type="button"
                class="dt-head-label"
                tabindex="-1"
                :data-dt-tip="
                  col.id === keyColumn ? ctx.i18n.t('sheet.keyTooltip', { key: col.def.header }) : undefined
                "
                @click="sheet.sort(col.id, $event.shiftKey)"
              >
                <span class="dt-head-text">{{ col.def.header }}</span>
                <span v-if="col.def.required" class="dt-head-required" :aria-label="requiredLabel">*</span>
                <span v-if="unitOf(col.def)" class="dt-head-unit">{{ unitOf(col.def) }}</span>
                <span v-if="sortOf(col.id)" class="dt-head-sort" aria-hidden="true">
                  <PhArrowUp :size="12" :class="{ 'is-desc': sortOf(col.id)!.dir === 'desc' }" />
                  <span v-if="sortOf(col.id)!.index" class="dt-head-sort-index">{{ sortOf(col.id)!.index }}</span>
                </span>
              </button>
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
              :style="{ transform: `translateY(${item.start - headH}px)` }"
            >
              <SkeletonRow v-if="skeleton" :index="item.index" :columns="columns" :gutter="!phone" />
              <SheetRow
                v-else
                :row="rows[item.index]!"
                :index="item.index"
                :row-no="store.rowNoOf(keyOf(rows[item.index]))"
                :gutter="!phone"
                :uid="uid"
                :columns="columns"
                :env="env"
                :key-column="keyColumn"
                :read="store.read"
                :original="store.original"
                :can-edit="sheet.canEdit"
                :editor-for="sheet.editorFor"
                :draft="store.rowDraft(keyOf(rows[item.index]))"
                :issues="store.rowIssues(keyOf(rows[item.index]))"
                :is-new="store.isNew(keyOf(rows[item.index]))"
                :key-state="store.keyState(keyOf(rows[item.index]))"
                :row-error="store.rowError(keyOf(rows[item.index]))"
                :active="activeIndex === item.index ? active!.columnId : null"
                :selection="selectionFor(item.index)"
                :handle-at="handleFor(item.index)"
                :fill="fillFor(item.index)"
                :found="foundFor(item.index)"
                :editing="editingFor(item.index)"
                :tip-below="item.index === 0"
                @edit-value="(v) => sheet.edit.setValue(v)"
                @use-suggestion="(def, v) => sheet.useSuggestion(rows[item.index], def, v)"
              />
            </div>
          </div>
        </div>
        <div
          v-if="fillLabel"
          class="dt-fill-label"
          role="status"
          :style="{ left: `${fillLabel.left}px`, top: `${fillLabel.top}px` }"
        >
          {{ fillLabel.text }}
        </div>
        <div v-if="$slots.state && !skeleton && rows.length === 0" class="dt-body-state"><slot name="state" /></div>
        <SheetMenu :sheet="sheet" :entity="entity" :href="menuHref" :read-only="readOnly || loading" />
      </div>
    </ContextMenuTrigger>
  </ContextMenuRoot>
</template>
