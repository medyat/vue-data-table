<script setup lang="ts" generic="Row extends object">
// DataSheet (07, brief §8, handoff 06) — Faz 6a + 6b: ızgara, editörler, doğrulama, taslak deposu; toolbar'da Find,
// Undo/Redo, Display + Save kontrolleri; formül çubuğu; status bar sayaçları + seçim özeti; açılış ilerlemesi + skeleton;
// `maxRows` şeridi; pano (kopyala / kes / yapıştır), fill handle + ⌘D, komut yığını, yapıştırma toast'ı. Satır partisi,
// sıralama, filtreler ve kayıt teslimi (6c), içe/dışa aktarma ve telefon düzeni (6d) sonraki fazlarda. Veri çekmez,
// kaydetmez (D18): yalnızca `@save` yayar; `rows` dizisine dokunmaz.
import { PhArrowUUpLeft, PhArrowUUpRight, PhCheck, PhWarning } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type Component } from 'vue'
import { formatCell, isEmptyValue, optionLabel, type FormatEnv } from '../core/cells/format'
import { RemoteLabels } from '../core/cells/remoteLabels'
import { TYPE_SPECS, typeLabelKey } from '../core/cells/specs'
import { useColumnLayout } from '../core/columns/useColumnLayout'
import { getFormat } from '../core/format'
import { useDelegatedTooltip } from '../core/grid/useDelegatedTooltip'
import { FIND_KBD, REDO_KBD, SAVE_KBD, UNDO_KBD } from '../core/interaction/kbd'
import { useDataTableContext } from '../core/plugin'
import { usePreferences } from '../core/preferences/usePreferences'
import StateMessage from '../core/states/StateMessage.vue'
import DisplayPopover from '../core/toolbar/DisplayPopover.vue'
import SearchBox from '../core/toolbar/SearchBox.vue'
import ConfirmDialog from '../core/ui/ConfirmDialog.vue'
import type { ColumnDef, ColumnType } from '../types/columns'
import type { Density, Plural, TableId } from '../types/core'
import type { Progress, SheetChanges, SheetStatus } from '../types/sheet'
import { matrixFromClipboard, toHtml, toTsv } from './clipboard'
import DateCell from './editors/DateCell.vue'
import NumberCell from './editors/NumberCell.vue'
import OptionCell from './editors/OptionCell.vue'
import TextCell from './editors/TextCell.vue'
import { fillValues } from './fill'
import { inferDecimal, inputText, parseInput, type ParseEnv } from './parse'
import SheetGrid from './SheetGrid.vue'
import { useSheetEditing, type SheetApi } from './useSheetEditing'
import { useSheetStore, type Change, type Step } from './useSheetStore'
import { useSheetTable } from './useSheetTable'

const props = withDefaults(
  defineProps<{
    tableId: TableId
    columns: Array<ColumnDef<Row>>
    rows: Row[]
    rowKey?: string
    /** Verilmezse tercihten (Display › Density), o da yoksa compact (02 · Yoğunluk). */
    density?: Density
    entityName?: Plural
    /** Upsert anahtarı olan sütun (ör. "sku"). Yüklenmiş satırlarda salt okunur; `rowKey`'den ayrıdır. */
    keyColumn: string
    /** Uygulama satırları yüklerken; sayaç verilirse "Loading… 6,200 of 10,000". Düzenleme false olunca açılır. */
    loading?: Progress
    /** Aşılırsa ilk `maxRows` satır kullanılır ve şerit uyarır (07 §15); yapıştırma bu sınırı aşamaz. */
    maxRows?: number
    /** Bu genişliğin altında veya yalnızca dokunmatikte salt okunur (D14); karar açılışta. */
    readOnlyBelow?: number
  }>(),
  { rowKey: 'id', loading: false, maxRows: 10_000, readOnlyBelow: 768 },
)
const emit = defineEmits<{
  /** Save: doğrulama geçen değişmiş + yeni satırlar. Uygulama kaydeder (6c: `saving`, `applyResult`). */
  save: [changes: SheetChanges]
}>()
defineSlots<{ empty?: () => unknown }>()

const ctx = useDataTableContext()
const { i18n } = ctx
const fmt = getFormat(ctx.locale)
const entity = computed<Plural>(() => props.entityName ?? { one: props.tableId, other: props.tableId })

const pref = usePreferences(() => props.tableId, ctx.preferences, {
  density: props.density ?? 'compact',
  verticalLines: true,
  pageSize: 0,
  defaultViewId: null,
})
const density = computed<Density>(() => props.density ?? pref.prefs.density)

const overLimit = computed(() => props.rows.length > props.maxRows)
const loadedRows = computed(() => (overLimit.value ? props.rows.slice(0, props.maxRows) : props.rows))
const loadingNow = computed(() => props.loading !== false)
const progress = computed(() => (typeof props.loading === 'object' ? props.loading : null))
const percent = computed(() =>
  progress.value && progress.value.total > 0 ? Math.round((100 * progress.value.done) / progress.value.total) : null,
)

// Sütunlar (07 §3): anahtar 128 px sola sabit (mono), birincil ad sola sabit ve esnek; sıra sabit, genişlik oturumluk.
const sheetColumns = computed<Array<ColumnDef<Row>>>(() =>
  props.columns.map((d) =>
    d.id === props.keyColumn ? { ...d, pinned: 'left', width: 128 } : d.primary ? { ...d, pinned: 'left' } : d,
  ),
)
const defById = computed(() => new Map(sheetColumns.value.map((d) => [d.id as string, d])))
const store = useSheetStore<Row>({
  rows: loadedRows,
  columns: sheetColumns,
  rowKey: () => props.rowKey,
  keyColumn: () => props.keyColumn,
  i18n,
  locale: ctx.locale,
})
/** Yüklenen + yeni (yapıştırmayla eklenen) satırlar; gutter numarası bu dizideki sıra. */
const rowsAll = store.allRows
const layout = useColumnLayout<Row>({
  columns: sheetColumns,
  rows: rowsAll,
  rowKey: () => props.rowKey,
  flexLastStart: true,
})
const table = useSheetTable<Row>({
  rows: rowsAll,
  columnIds: () => layout.columns.value.map((c) => c.id),
  rowId: store.keyOf,
})
const indexByKey = computed(() => {
  const m = new Map<string, number>()
  rowsAll.value.forEach((r, i) => m.set(store.keyOf(r), i))
  return m
})
const visibleCols = computed(() => layout.columns.value)

// Telefon / yalnızca dokunmatik: salt okunur, karar açılışta (D14; banner ve telefon düzeni 6d).
const readOnlyDevice =
  typeof matchMedia === 'function' &&
  (matchMedia(`(max-width: ${props.readOnlyBelow - 1}px)`).matches ||
    matchMedia('(hover: none) and (pointer: coarse)').matches)

// Editörler filtre değer girişleriyle aynı aileden (07 §5); `boolean` editör açmaz (Space). multiselect/tags/ajax/user/
// object/array için yalnızca özel editör (`ColumnDef.editor`); yapıştırma yine de çalışır.
const EDITORS: Partial<Record<ColumnType, Component>> = {
  string: TextCell,
  text: TextCell,
  uppercase: TextCell,
  lowercase: TextCell,
  email: TextCell,
  url: TextCell,
  phone: TextCell,
  id: TextCell,
  color: TextCell,
  int: NumberCell,
  float: NumberCell,
  percentage: NumberCell,
  currency: NumberCell,
  star: NumberCell,
  select: OptionCell,
  date: DateCell,
  datetime: DateCell,
}
const editorFor = (def: ColumnDef<Row>): Component | null => def.editor ?? EDITORS[def.type] ?? null
/** Sütunlar varsayılan salt okunur; anahtar sütun yüklenmiş satırlarda her zaman (yeni satırda açık); yüklenirken ve telefonda hiçbiri. */
const canEdit = (row: Row, def: ColumnDef<Row>): boolean => {
  if (loadingNow.value || readOnlyDevice) return false
  const isNew = store.isNew(store.keyOf(row))
  if (def.id === props.keyColumn) return isNew
  if (def.type !== 'boolean' && !editorFor(def) && !PASTE_ONLY.has(def.type)) return false
  return typeof def.editable === 'function' ? def.editable(row, { isNew }) : def.editable === true
}
/** Yerleşik editörü olmayan ama yapıştırma/temizleme ile değişebilen tipler. */
const PASTE_ONLY = new Set<ColumnType>(['multiselect', 'tags'])

const parseEnv = (locale = ctx.locale): ParseEnv => ({
  locale,
  today: new Date(),
  todayWord: i18n.t('date.today'),
  yesWord: i18n.t('common.yes'),
  noWord: i18n.t('common.no'),
})
const edit = useSheetEditing<Row>({ store, canEdit, parse: (def, text) => parseInput(def, text, parseEnv()) })
const grid = useTemplateRef<InstanceType<typeof SheetGrid>>('grid')
const counts = store.counts
const fmtEnv: FormatEnv = { fmt, i18n, today: new Date(), labels: new RemoteLabels() }

/** Aralığı seçer ve odaklar (yapıştırma, doldurma, undo sonrası). */
const selectCells = (r1: number, c1: number, r2: number, c2: number) => {
  const rows = rowsAll.value
  const cols = visibleCols.value
  const a = rows[r1]
  const b = rows[r2]
  if (!a || !b || !cols[c1] || !cols[c2]) return
  table.selectRange({
    anchorRowId: store.keyOf(a),
    anchorColumnId: cols[c1]!.id,
    focusRowId: store.keyOf(b),
    focusColumnId: cols[c2]!.id,
  })
  grid.value?.focusActive()
}
/** Seçimdeki (ya da aktif) hücreler. */
const selectedCells = (): Array<{ r: number; c: number }> => {
  const b = table.bounds.value
  if (!b) return []
  const out: Array<{ r: number; c: number }> = []
  for (let r = b.minRowIndex; r <= b.maxRowIndex; r++)
    for (let c = b.minColumnIndex; c <= b.maxColumnIndex; c++) out.push({ r, c })
  return out
}

const toggle = (row: Row, def: ColumnDef<Row>) => store.set(row, def, !store.read(row, def))
/** Delete / ⌘X: seçimdeki düzenlenebilir hücreler boşalır, tek adım. */
const clearSelected = () => {
  const changes: Array<Change<Row>> = []
  for (const { r, c } of selectedCells()) {
    const row = rowsAll.value[r]
    const def = visibleCols.value[c]?.def
    if (row && def && canEdit(row, def)) changes.push({ row, def, value: null })
  }
  store.apply(changes)
}
const save = () => {
  edit.commit()
  if (!counts.value.changedCells) return
  emit('save', store.getChanges())
}
/** F8 / ⇧F8 ve status bar "go to": aktif satırdan sonraki/önceki hatalı satırın ilk hatalı hücresi (döngüsel). */
const goToError = (dir: 1 | -1) => {
  const rows = rowsAll.value
  const n = rows.length
  const a = table.active.value
  const from = a ? (indexByKey.value.get(a.rowId) ?? -1) : -1
  for (let s = 1; s <= n; s++) {
    const i = (((from + dir * s) % n) + n) % n
    const key = store.keyOf(rows[i]!)
    const issues = store.rowIssues(key)
    const col = issues && visibleCols.value.find((c) => issues.get(c.id)?.level === 'error')
    if (!col) continue
    table.focus(key, col.id)
    grid.value?.focusActive()
    return
  }
}

// Pano (07 §7): görüntülenen biçimde TSV + HTML; para kodu ve "—" yok, tarihler ISO, listeler `; ` ile (geri yapıştırılabilir).
const copyText = (def: ColumnDef<Row>, row: Row, value: unknown): string => {
  if (isEmptyValue(value)) return ''
  switch (def.type) {
    case 'currency':
      return fmt.decimal(Number(value), def.decimalPlaces ?? 2)
    case 'date':
    case 'datetime':
      return value instanceof Date ? value.toISOString() : String(value)
    case 'multiselect':
      return (value as unknown[]).map((v) => optionLabel(def.options, v)).join('; ')
    case 'tags':
      return (value as string[]).join('; ')
    case 'string':
    case 'text':
    case 'uppercase':
    case 'lowercase':
    case 'email':
    case 'url':
    case 'phone':
    case 'id':
      return String(value)
    default:
      return formatCell(def, row, value, fmtEnv)
  }
}
const copyMatrix = (): string[][] | null => {
  const b = table.bounds.value
  if (!b) return null
  const out: string[][] = []
  for (let r = b.minRowIndex; r <= b.maxRowIndex; r++) {
    const row = rowsAll.value[r]
    if (!row) continue
    const line: string[] = []
    for (let c = b.minColumnIndex; c <= b.maxColumnIndex; c++) {
      const def = visibleCols.value[c]!.def
      line.push(copyText(def, row, store.read(row, def)))
    }
    out.push(line)
  }
  return out
}
const copy = (data: DataTransfer | null): boolean => {
  const m = copyMatrix()
  if (!m || !data) return false
  data.setData('text/plain', toTsv(m))
  data.setData('text/html', toHtml(m))
  return true
}
const cut = (data: DataTransfer | null): boolean => {
  if (!copy(data)) return false
  clearSelected()
  return true
}
const pasteMatrix = (matrix: string[][]): boolean => {
  const a = table.active.value
  const width = Math.max(0, ...matrix.map((l) => l.length))
  if (!a || !matrix.length || !width) return false
  const cols = visibleCols.value
  const startRow = indexByKey.value.get(a.rowId)
  const startCol = cols.findIndex((c) => c.id === a.columnId)
  if (startRow === undefined || startCol < 0) return false
  const b = table.bounds.value
  const targets: Array<{ r: number; c: number; text: string }> = []
  if (
    matrix.length === 1 &&
    width === 1 &&
    b &&
    (b.maxRowIndex > b.minRowIndex || b.maxColumnIndex > b.minColumnIndex)
  ) {
    // Tek değer + aralık: değer tüm aralığa (07 §7).
    for (const { r, c } of selectedCells()) targets.push({ r, c, text: matrix[0]![0]! })
  } else {
    matrix.forEach((line, i) =>
      line.forEach((text, j) => {
        if (startCol + j < cols.length) targets.push({ r: startRow + i, c: startCol + j, text })
      }),
    )
  }
  const lastRow = Math.max(...targets.map((t) => t.r))
  const overflow = lastRow - rowsAll.value.length + 1
  if (overflow > 0 && rowsAll.value.length + overflow > props.maxRows) {
    showToast({
      text: i18n.t('sheet.limitPaste', {
        count: fmt.int(rowsAll.value.length + overflow),
        max: fmt.int(props.maxRows),
      }),
    })
    return true
  }
  // Son satırın altına taşanlar yeni satır olur; anahtar boşsa "Required" (07 §7).
  const addedRows = overflow > 0 ? store.addRows(overflow) : []
  const rows = rowsAll.value
  // Sayılar panonun yerel ayarıyla: sütun bazında çıkarım, belirsizse uygulama locale'i.
  const localeByCol = new Map<number, string>()
  for (const c of new Set(targets.map((t) => t.c))) {
    const def = cols[c]!.def
    if (!TYPE_SPECS[def.type].numeric) continue
    const dec = inferDecimal(targets.filter((t) => t.c === c).map((t) => t.text))
    localeByCol.set(c, dec === ',' ? 'de' : dec === '.' ? 'en' : ctx.locale)
  }
  const changes: Array<Change<Row>> = []
  for (const t of targets) {
    const row = rows[t.r]
    const def = cols[t.c]?.def
    if (!row || !def || !canEdit(row, def)) continue
    changes.push({ row, def, value: parseInput(def, t.text, parseEnv(localeByCol.get(t.c))) })
  }
  store.apply(changes, addedRows)
  const minR = Math.min(...targets.map((t) => t.r))
  const minC = Math.min(...targets.map((t) => t.c))
  const maxC = Math.max(...targets.map((t) => t.c))
  selectCells(minR, minC, lastRow, maxC)
  // Toast: seçenek olmayan değerler ("2 values aren't options") ve diğer hatalar ayrı sayılır; Review ilk sorunlu hücre.
  const issues = targets
    .map((t) => {
      const row = rows[t.r]
      const issue = row && store.rowIssues(store.keyOf(row))?.get(cols[t.c]!.id)
      return issue?.level === 'error'
        ? { ...t, option: cols[t.c]!.def.type === 'select' || cols[t.c]!.def.type === 'multiselect' }
        : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
  const options = issues.filter((i) => i.option).length
  const others = issues.length - options
  const dims = { rows: lastRow - minR + 1, cols: maxC - minC + 1 }
  const first = issues[0]
  showToast({
    text: i18n.t('sheet.pasted', { rows: fmt.int(dims.rows), cols: fmt.int(dims.cols) }),
    issues:
      [
        options ? i18n.t('sheet.pasteIssues', { count: options }) : '',
        others ? i18n.t('sheet.pasteErrors', { count: others }) : '',
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
    review: first ? () => selectCells(first.r, first.c, first.r, first.c) : undefined,
    undo: true,
  })
  polite.value = i18n.t('sr.pasted', dims)
  return true
}
const paste = (data: DataTransfer | null): boolean => pasteMatrix(matrixFromClipboard(data))

// Doldurma (07 §8): kaynak satır aralığı, hedef satıra kadar; seri ya da kopya, read-only atlanır, tek adım.
const fillPlan = (fromRow: number, toRow: number, cols: [number, number], target: number) => {
  const rows = rowsAll.value
  const up = target < fromRow
  const count = up ? fromRow - target : target - toRow
  const changes: Array<Change<Row>> = []
  for (let c = cols[0]; c <= cols[1]; c++) {
    const def = visibleCols.value[c]?.def
    if (!def) continue
    const source = rows.slice(fromRow, toRow + 1).map((r) => store.read(r, def))
    const values = fillValues(source, count, up)
    for (let k = 0; k < count; k++) {
      const row = rows[up ? fromRow - 1 - k : toRow + 1 + k]
      if (row && canEdit(row, def)) changes.push({ row, def, value: values[k] })
    }
  }
  return { changes, count }
}
const fill = (fromRow: number, toRow: number, cols: [number, number], target: number) => {
  const { changes } = fillPlan(fromRow, toRow, cols, target)
  store.apply(changes)
  selectCells(Math.min(fromRow, target), cols[0], Math.max(toRow, target), cols[1])
}
const fillLabel = (fromRow: number, toRow: number, cols: [number, number], target: number): string => {
  const { changes, count } = fillPlan(fromRow, toRow, cols, target)
  const first = changes[0]
  const value = first ? formatCell(first.def, first.row, first.value, fmtEnv) : ''
  return i18n.t('sheet.fillPreview', { count: count * (cols[1] - cols[0] + 1), value })
}
const fillDown = () => {
  const b = table.bounds.value
  if (!b || b.maxRowIndex === b.minRowIndex) return
  fill(b.minRowIndex, b.minRowIndex, [b.minColumnIndex, b.maxColumnIndex], b.maxRowIndex)
}

// Geri al / yinele (07 §12): seçim ve aktif hücre o adımın yerine taşınır.
const afterStep = (step: Step | null) => {
  if (!step?.patches.length) return
  const idx = visibleCols.value.map((c) => c.id)
  let r1 = Infinity
  let r2 = -1
  let c1 = Infinity
  let c2 = -1
  for (const p of step.patches) {
    const r = indexByKey.value.get(p.key)
    const c = idx.indexOf(p.col)
    if (r === undefined || c < 0) continue
    r1 = Math.min(r1, r)
    r2 = Math.max(r2, r)
    c1 = Math.min(c1, c)
    c2 = Math.max(c2, c)
  }
  if (r2 >= 0) selectCells(r1, c1, r2, c2)
}
const undo = () => {
  edit.cancel()
  afterStep(store.undo())
}
const redo = () => {
  edit.cancel()
  afterStep(store.redo())
}
const useSuggestion = (row: Row, def: ColumnDef<Row>, value: unknown) => store.set(row, def, value)

const sheet: SheetApi<Row> = {
  store,
  table,
  edit,
  canEdit,
  editorFor,
  toggle,
  clearCells: clearSelected,
  save,
  goToError,
  copy,
  cut,
  paste,
  fill,
  fillLabel,
  fillDown,
  undo,
  redo,
  useSuggestion,
}

// Izgara dışına tık onaylar (07 §5): formül çubuğu ve portallı editör katmanları (`dt-sheet-layer`) dışarı sayılmaz.
const onDocPointerdown = (e: PointerEvent) => {
  if (!edit.editing.value) return
  const t = e.target as Element | null
  if (t?.closest('.dt-cell.is-editing, .dt-formula, .dt-sheet-layer')) return
  edit.commit()
}
onMounted(() => document.addEventListener('pointerdown', onDocPointerdown, true))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerdown, true)
  clearTimeout(toastTimer)
})

// ⌘S / ⌘F odak sheet içindeyken (07 §2); ızgara kendi işlediyse (defaultPrevented) tekrar etmez.
const findBox = useTemplateRef<InstanceType<typeof SearchBox>>('findBox')
const onRootKeydown = (e: KeyboardEvent) => {
  if (e.defaultPrevented || !(e.metaKey || e.ctrlKey)) return
  const k = e.key.toLowerCase()
  if (k === 's') {
    e.preventDefault()
    save()
  } else if (k === 'f' && !loadingNow.value) {
    e.preventDefault()
    findBox.value?.focus()
  }
}

// Find in grid (07 §2): görünür sütunlarda görüntülenen metin; eşleşmeler vurgulanır, satır gizlenmez; Enter / ⇧Enter gezer.
const fold = (s: string) => s.toLocaleLowerCase(ctx.locale)
const findText = ref('')
const findIndex = ref(0)
const matches = computed(() => {
  const q = fold(findText.value.trim())
  if (!q) return null
  void store.version.value
  const map = new Map<string, Set<string>>()
  const list: Array<{ r: number; c: number }> = []
  const rows = rowsAll.value
  const cols = visibleCols.value
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!
    for (let c = 0; c < cols.length; c++) {
      const def = cols[c]!.def
      const v = store.readUntracked(row, def)
      if (isEmptyValue(v) || !fold(formatCell(def, row, v, fmtEnv)).includes(q)) continue
      const key = store.keyOf(row)
      let set = map.get(key)
      if (!set) map.set(key, (set = new Set()))
      set.add(def.id as string)
      list.push({ r, c })
    }
  }
  return { map, list }
})
const goToMatch = (i: number) => {
  const m = matches.value?.list[i]
  if (!m) return
  findIndex.value = i
  const row = rowsAll.value[m.r]!
  table.focus(store.keyOf(row), visibleCols.value[m.c]!.id)
  grid.value?.scrollToIndex(m.r)
}
watch(
  () => matches.value?.list.length ?? 0,
  () => goToMatch(0),
)
const findStep = (dir: 1 | -1) => {
  const n = matches.value?.list.length ?? 0
  if (n) goToMatch((((findIndex.value + dir) % n) + n) % n)
}
const onFindKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    findStep(e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape' && !findText.value) {
    e.preventDefault()
    grid.value?.focusActive()
  }
}
const findCount = computed(() =>
  matches.value
    ? i18n.t('sheet.findCount', {
        index: matches.value.list.length ? findIndex.value + 1 : 0,
        total: matches.value.list.length,
      })
    : '',
)

// Formül çubuğu (07 §2): ad kutusu, fx, değer (buraya yazmak hücreyi düzenler), ipucu.
const activeRow = computed(() => {
  const a = table.active.value
  return a ? (store.rowByKey(a.rowId) ?? null) : null
})
const activeDef = computed(() => {
  const a = table.active.value
  return a ? (defById.value.get(a.columnId) ?? null) : null
})
const rangeDims = computed(() => {
  const b = table.bounds.value
  if (!b) return null
  const rows = b.maxRowIndex - b.minRowIndex + 1
  const cols = b.maxColumnIndex - b.minColumnIndex + 1
  return rows * cols > 1 ? { rows, cols } : null
})
const rangeText = computed(() => (rangeDims.value ? i18n.t('sheet.cells', rangeDims.value) : null))
const keyDef = computed(() => defById.value.get(props.keyColumn))
const nameKey = computed(() =>
  activeRow.value && keyDef.value ? inputText(keyDef.value, store.read(activeRow.value, keyDef.value)) : '',
)
const formulaText = computed(() => {
  const e = edit.editing.value
  if (e) return e.text ?? inputText(e.def, e.value)
  return activeRow.value && activeDef.value
    ? inputText(activeDef.value, store.read(activeRow.value, activeDef.value))
    : ''
})
const formulaEditable = computed(
  () =>
    !!activeRow.value &&
    !!activeDef.value &&
    activeDef.value.type !== 'boolean' &&
    canEdit(activeRow.value, activeDef.value),
)
const onFormulaInput = (e: Event) => {
  const text = (e.target as HTMLInputElement).value
  const row = activeRow.value
  const def = activeDef.value
  if (!row || !def || !formulaEditable.value) return
  if (!edit.editing.value && !edit.start(row, def, { inCell: false })) return
  edit.setValue(parseInput(def, text, parseEnv()), text, false)
}
const onFormulaKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (edit.commit()) table.move('down')
    grid.value?.focusActive()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    edit.cancel()
    grid.value?.focusActive()
  }
}
const hint = computed(() => {
  const d = activeDef.value
  if (!d) return ''
  const parts = [i18n.t(typeLabelKey(d.type))]
  if (d.type === 'currency' && typeof d.currency === 'string') parts.push(d.currency)
  if (d.required) parts.push(i18n.t('sheet.required').toLocaleLowerCase(ctx.locale))
  if (d.hint) parts.push(d.hint)
  return parts.join(' · ')
})
const valueAria = computed(() =>
  activeDef.value ? i18n.t('sheet.valueAria', { column: activeDef.value.header, key: nameKey.value }) : '',
)

// Status bar seçim özeti (07 §2): Count = boş olmayan; Sum / Average yalnızca sayısal hücre varsa; tek hücrede gizli.
const summary = computed(() => {
  void store.version.value
  const b = table.bounds.value
  if (!b || !rangeDims.value) return null
  let count = 0
  let sum = 0
  let numeric = 0
  for (let r = b.minRowIndex; r <= b.maxRowIndex; r++) {
    const row = rowsAll.value[r]
    if (!row) continue
    for (let c = b.minColumnIndex; c <= b.maxColumnIndex; c++) {
      const def = visibleCols.value[c]!.def
      const v = store.readUntracked(row, def)
      if (isEmptyValue(v)) continue
      count++
      if (TYPE_SPECS[def.type].numeric && typeof v === 'number') {
        sum += v
        numeric++
      }
    }
  }
  return { count, sum: numeric ? fmt.decimal(sum, 2) : null, avg: numeric ? fmt.decimal(sum / numeric, 2) : null }
})

const status = computed<SheetStatus>(() => ({
  phase: loadingNow.value ? 'loading' : 'ready',
  ...counts.value,
}))
const changesText = computed(() =>
  counts.value.changedCells
    ? i18n.t('sheet.changes', { cells: fmt.int(counts.value.changedCells), rows: fmt.int(counts.value.changedRows) })
    : i18n.t('sheet.noChanges'),
)
const saveTip = `${i18n.t('sheet.save')} · ${SAVE_KBD}`
const undoTip = `${i18n.t('common.undo')} (${UNDO_KBD})`
const redoTip = `${i18n.t('common.redo')} (${REDO_KBD})`

// Toast (06 §8): yapıştırma sonucu ve sınır uyarısı; Review ilk sorunlu hücreye, Undo son adımı geri alır.
interface Toast {
  text: string
  issues?: string
  review?: () => void
  undo?: boolean
}
const toast = shallowRef<Toast | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
const showToast = (t: Toast) => {
  toast.value = t
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 6000)
}
const toastUndo = () => {
  toast.value = null
  undo()
}
const polite = ref('')

const discardOpen = ref(false)
const discard = () => {
  edit.cancel()
  store.reset()
  grid.value?.focusActive()
}

const displayProps = computed(() => ({
  density: density.value,
  verticalLines: pref.prefs.verticalLines,
  columns: layout.panel.value,
  counts: layout.counts.value,
  persistent: pref.persistent,
}))
const displayOn = {
  'update:density': (d: Density) => pref.set({ density: d }),
  'update:verticalLines': (on: boolean) => pref.set({ verticalLines: on }),
  'column-visible': (id: string, visible: boolean) => layout.setVisible(id, visible),
  'column-move': (id: string, delta: -1 | 1) => layout.move(id, delta),
  'columns-all': (visible: boolean) => {
    for (const c of layout.panel.value) if (!c.pinned && c.canHide) layout.setVisible(c.id, visible)
  },
  'columns-reset': () => layout.reset(),
  reset: () => pref.reset(),
}

const rootEl = ref<HTMLElement | null>(null)
const tooltip = useDelegatedTooltip(rootEl)

defineExpose({
  status,
  isDirty: () => counts.value.changedCells > 0 || counts.value.newRows > 0,
  getChanges: store.getChanges,
  reset: discard,
  undo,
  redo,
  goToNextError: () => goToError(1),
})
</script>

<template>
  <div ref="rootEl" class="dt dt-sheet" :data-density="density" @keydown="onRootKeydown">
    <div class="dt-toolbar dt-sheet-toolbar" role="toolbar">
      <div v-if="loadingNow" class="dt-progress-strip">
        <strong>{{ i18n.t('sheet.loading', { entity }) }}</strong>
        <span v-if="progress" class="dt-progress-count">
          {{ i18n.t('sheet.loadingCount', { loaded: fmt.int(progress.done), total: fmt.int(progress.total) }) }}
        </span>
        <div
          class="dt-progress"
          :class="{ 'is-indeterminate': percent === null }"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="percent ?? undefined"
        >
          <div class="dt-progress-fill" :style="percent !== null ? { width: `${percent}%` } : undefined" />
        </div>
      </div>
      <template v-else>
        <div class="dt-find" @keydown="onFindKeydown">
          <SearchBox
            ref="findBox"
            :model-value="findText"
            :placeholder="i18n.t('sheet.find')"
            :kbd="FIND_KBD"
            @update:model-value="(v) => (findText = v)"
          />
          <span v-if="findCount" class="dt-find-count" role="status">{{ findCount }}</span>
        </div>
        <span class="dt-toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          class="dt-btn dt-sheet-undo"
          :aria-disabled="store.canUndo.value ? undefined : 'true'"
          :aria-label="undoTip"
          :data-dt-tip="undoTip"
          @click="store.canUndo.value && undo()"
        >
          <PhArrowUUpLeft :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="dt-btn dt-sheet-undo"
          :aria-disabled="store.canRedo.value ? undefined : 'true'"
          :aria-label="redoTip"
          :data-dt-tip="redoTip"
          @click="store.canRedo.value && redo()"
        >
          <PhArrowUUpRight :size="16" aria-hidden="true" />
        </button>
        <span class="dt-toolbar-sep" aria-hidden="true" />
        <DisplayPopover v-bind="displayProps" v-on="displayOn" />
      </template>
      <span class="dt-toolbar-spacer" />
      <span class="dt-sheet-changes" :class="{ 'is-empty': !counts.changedCells }">
        <span v-if="counts.changedCells" class="dt-sheet-dot" aria-hidden="true" />
        {{ changesText }}
        <template v-if="counts.newRows">· {{ i18n.t('sheet.newShort', { count: counts.newRows }) }}</template>
      </span>
      <button
        type="button"
        class="dt-btn dt-btn-ghost"
        :disabled="!counts.changedCells && !counts.newRows"
        @click="discardOpen = true"
      >
        {{ i18n.t('sheet.discard') }}
      </button>
      <button
        type="button"
        class="dt-btn dt-btn-primary has-icon dt-sheet-save"
        :disabled="!counts.changedCells"
        :data-dt-tip="saveTip"
        @click="save"
      >
        <PhCheck :size="16" aria-hidden="true" />
        {{ i18n.t('sheet.save') }}
      </button>
    </div>

    <div v-if="overLimit" class="dt-strip dt-sheet-strip" role="status">
      <PhWarning :size="16" aria-hidden="true" />
      <span>{{ i18n.t('sheet.firstN', { max: fmt.int(maxRows), entity }) }}</span>
    </div>

    <div class="dt-formula">
      <div class="dt-formula-name">
        <template v-if="rangeText">{{ rangeText }}</template>
        <template v-else-if="activeDef">
          <span class="dt-mono">{{ nameKey }}</span>
          <span class="dt-formula-col">· {{ activeDef.header }}</span>
        </template>
      </div>
      <span class="dt-formula-fx" aria-hidden="true">fx</span>
      <input
        class="dt-formula-value"
        type="text"
        :value="formulaText"
        :readonly="!formulaEditable"
        :aria-label="valueAria"
        autocomplete="off"
        @input="onFormulaInput"
        @keydown="onFormulaKeydown"
      />
      <span v-if="hint" class="dt-formula-hint">{{ hint }}</span>
    </div>

    <SheetGrid
      ref="grid"
      :sheet="sheet"
      :layout="layout"
      :rows="rowsAll"
      :density="density"
      :label="entity.other"
      :loading="loadingNow"
      :skeleton="loadingNow"
      :vertical-lines="pref.prefs.verticalLines"
      :key-column="keyColumn"
      :found="matches?.map ?? null"
    >
      <template v-if="!loadingNow && rowsAll.length === 0" #state>
        <slot name="empty">
          <StateMessage kind="empty" :title="i18n.t('state.emptyTitle', { entity })" />
        </slot>
      </template>
    </SheetGrid>

    <div class="dt-status" role="status" :aria-label="i18n.t('sheet.statusAria')">
      <span class="dt-status-rows">
        {{ loadingNow ? i18n.t('common.loading') : i18n.t('sheet.rows', { count: fmt.int(rowsAll.length) }) }}
      </span>
      <template v-if="!loadingNow">
        <span v-if="counts.changedCells" class="dt-status-changes">
          <span class="dt-mark is-changed" aria-hidden="true" />
          {{ changesText }}
        </span>
        <span v-else class="dt-status-muted">{{ changesText }}</span>
        <span v-if="counts.newRows" class="dt-status-new">
          {{ i18n.t('sheet.newRows', { count: counts.newRows }) }}
        </span>
        <button v-if="counts.errorRows" type="button" class="dt-status-errors" @click="goToError(1)">
          <span class="dt-mark is-error" aria-hidden="true" />
          {{ i18n.t('sheet.errorsGoTo', { count: counts.errorRows }) }}
        </button>
        <span v-if="summary" class="dt-status-summary" :aria-label="i18n.t('sheet.selectionSummary')">
          <span>
            {{ i18n.t('sheet.agg.count') }}
            <b>{{ fmt.int(summary.count) }}</b>
          </span>
          <span v-if="summary.sum !== null">
            {{ i18n.t('sheet.agg.sum') }}
            <b>{{ summary.sum }}</b>
          </span>
          <span v-if="summary.avg !== null">
            {{ i18n.t('sheet.agg.avg') }}
            <b>{{ summary.avg }}</b>
          </span>
        </span>
      </template>
    </div>

    <div v-if="toast" class="dt-toast dt-sheet-toast" role="status">
      <strong>{{ toast.text }}</strong>
      <template v-if="toast.issues">
        <span aria-hidden="true">·</span>
        <span class="dt-toast-warn">{{ toast.issues }}</span>
        <button v-if="toast.review" type="button" class="dt-toast-link" @click="toast.review()">
          {{ i18n.t('sheet.review') }}
        </button>
      </template>
      <template v-if="toast.undo">
        <span class="dt-toast-sep" aria-hidden="true" />
        <button type="button" class="dt-toast-undo" @click="toastUndo">
          {{ i18n.t('common.undo') }}
          <kbd class="dt-kbd">{{ UNDO_KBD }}</kbd>
        </button>
      </template>
    </div>
    <span class="dt-sr-only" aria-live="polite">{{ polite }}</span>
    <div v-show="tooltip.open.value" class="dt-tip" role="tooltip" :style="tooltip.style.value">
      {{ tooltip.text.value }}
    </div>
    <ConfirmDialog
      v-model:open="discardOpen"
      :title="i18n.t('sheet.discard.title', { cells: fmt.int(counts.changedCells), rows: fmt.int(counts.changedRows) })"
      :body="i18n.t('sheet.discard.body')"
      :confirm-label="i18n.t('sheet.leave.discard')"
      danger
      @confirm="discard"
    />
  </div>
</template>
