<script setup lang="ts" generic="Row extends object">
// DataSheet (07, brief §8, handoff 06) — Faz 6a–6c: ızgara, editörler, doğrulama, taslak deposu; toolbar'da Find,
// All / Changed / Errors, Undo/Redo, Add row, Display + Save kontrolleri; formül çubuğu; status bar; açılış ilerlemesi;
// pano, fill handle, komut yığını; satır partisi (ekle / çıkar, lookupKeys New/Update, anahtar tekilliği); yerel
// sıralama; kayıt akışı (hata dialog'u, `@save`, `saving`, `applyResult`, Partly saved şeridi, Copy errors); ayrılma
// koruması. İçe/dışa aktarma ve telefon düzeni (6d) sonraki fazda. Veri çekmez, kaydetmez (D18): yalnızca `@save` yayar.
import {
  PhArrowUUpLeft,
  PhArrowUUpRight,
  PhCaretDown,
  PhCaretUp,
  PhCheck,
  PhCircleNotch,
  PhCopy,
  PhLock,
  PhDownloadSimple,
  PhExport,
  PhLink,
  PhMonitor,
  PhPlus,
  PhWarning,
  PhWarningCircle,
} from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  type Component,
  useTemplateRef,
  watch,
} from 'vue'
import { comparator } from '../core/cells/compare'
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
import type { ColumnsDraft } from '../core/toolbar/ColumnsDialog.vue'
import SearchBox from '../core/toolbar/SearchBox.vue'
import ConfirmDialog from '../core/ui/ConfirmDialog.vue'
import type { ColumnDef, ColumnType } from '../types/columns'
import type { Density, Plural, TableId } from '../types/core'
import type { SortRule } from '../types/query'
import type {
  ParsedWorkbook,
  Progress,
  SheetChanges,
  SheetFilterMode,
  SheetRowResult,
  SheetStatus,
} from '../types/sheet'
import { matrixFromClipboard, parseTsv, toHtml, toTsv } from './clipboard'
import NumberCell from './editors/NumberCell.vue'
import OptionCell from './editors/OptionCell.vue'
import TextCell from './editors/TextCell.vue'
import DateCell from './editors/DateCell.vue'
import MultiCell from './editors/MultiCell.vue'
import { SHEET_EDITOR_KEY } from './editors/context'
import { fillValues } from './fill'
import ImportDialog, { type ImportPayload } from './ImportDialog.vue'
import { inferDecimal, inputText, parseInput, type ParseEnv } from './parse'
import SaveErrorsDialog, { type ErrorRowItem } from './SaveErrorsDialog.vue'
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
    /** `@save` sonrası uygulama kaydederken: grid salt okunur, ilerleme şeridi (07 §14). */
    saving?: Progress
    /** Yeni satırlarda yazılan anahtarların kontrolü (New / Update, 07 §9). Verilmezse her bilinmeyen anahtar New. */
    lookupKeys?: (keys: string[], ctx: { signal: AbortSignal }) => Promise<Record<string, Row | null>>
    /** Add row ile oluşan satırın başlangıç değerleri. */
    newRowDefaults?: () => Partial<Row>
    /** Import Excel / CSV: dosyayı uygulama ayrıştırır ve ham satırları verir (07 §13). Verilmezse Import yok. */
    parseFile?: (file: File) => Promise<ParsedWorkbook>
    /** Aşılırsa ilk `maxRows` satır kullanılır ve şerit uyarır (07 §15); yapıştırma ve ekleme bu sınırı aşamaz. */
    maxRows?: number
    /** Bu genişliğin altında veya yalnızca dokunmatikte salt okunur (D14); karar açılışta. */
    readOnlyBelow?: number
  }>(),
  { rowKey: 'id', loading: false, saving: false, maxRows: 10_000, readOnlyBelow: 768 },
)
const emit = defineEmits<{
  /** Save: doğrulama geçen değişmiş + yeni satırlar. Uygulama kaydeder, `saving` verir, `applyResult` çağırır. */
  save: [changes: SheetChanges]
  /** Export: değerler güncel (kaydedilmemiş değişiklikler dahil); dosyayı uygulama yazar. */
  export: [payload: { format: 'csv' | 'xlsx'; scope: 'all' | 'visible'; columns: string[]; rows: Row[] }]
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
const savingNow = computed(() => props.saving !== false)
const progress = computed(() => {
  const p = loadingNow.value ? props.loading : props.saving
  return typeof p === 'object' ? p : null
})
const percent = computed(() =>
  progress.value && progress.value.total > 0 ? Math.round((100 * progress.value.done) / progress.value.total) : null,
)

// Sütunlar (07 §3): anahtar 128 px sola sabit (mono), birincil ad sola sabit ve esnek; sıra sabit, genişlik oturumluk.
// Telefon / yalnızca dokunmatik: salt okunur, karar açılışta (D14, 07 §17): anahtar 104 px sabit, kalanlar kayar.
const readOnlyDevice =
  typeof matchMedia === 'function' &&
  (matchMedia(`(max-width: ${props.readOnlyBelow - 1}px)`).matches || !matchMedia('(any-pointer: fine)').matches)
const sheetColumns = computed<Array<ColumnDef<Row>>>(() =>
  props.columns.map((d) => (d.id === props.keyColumn ? { ...d, width: readOnlyDevice ? 104 : 128 } : d)),
)
const fixedStart = computed(() =>
  sheetColumns.value
    .filter((d) => d.id === props.keyColumn || (d.primary && !readOnlyDevice))
    .map((d) => d.id as string),
)
const defById = computed(() => new Map(sheetColumns.value.map((d) => [d.id as string, d])))
const keyDef = computed(() => defById.value.get(props.keyColumn))
const primaryDef = computed(() => sheetColumns.value.find((d) => d.primary))
const store = useSheetStore<Row>({
  rows: loadedRows,
  columns: sheetColumns,
  rowKey: () => props.rowKey,
  keyColumn: () => props.keyColumn,
  i18n,
  locale: ctx.locale,
})

// Gösterim sırası (07 §10–11): parti sırası ya da header tıklamasında alınan sıralama anlık görüntüsü (düzenlenen satır
// imlecin altından kaçmaz); eklenen satır yerine konur; All / Changed / Errors görünümü ve çıkarılanlar süzülür.
const sortRules = ref<SortRule[]>([])
const order = shallowRef<string[] | null>(null)
const view = ref<SheetFilterMode>('all')
const viewKeys = shallowRef(new Set<string>())
const matchesView = (key: string) =>
  view.value === 'changed'
    ? !!store.rowDraft(key)?.size || store.isNew(key)
    : view.value === 'errors'
      ? store.hasError(key)
      : true
const refreshView = (union: boolean) => {
  const next = union ? new Set(viewKeys.value) : new Set<string>()
  for (const r of store.batch.value) {
    const k = store.keyOf(r)
    if (matchesView(k)) next.add(k)
  }
  viewKeys.value = next
}
/** Görünüm değişimi eşzamanlı uygulanır: hemen ardından gelen `goToError` doğru satır listesini görür. */
const setView = (v: SheetFilterMode) => {
  view.value = v
  refreshView(false)
}
// Görünümde kalma kuralı: son hatayı düzelttiğin satır görünümden çıkana kadar yerinde kalır; yeni uyanlar eklenir.
watch(store.version, () => {
  if (view.value !== 'all') refreshView(true)
})
const orderedBatch = computed<Row[]>(() => {
  const batch = store.batch.value
  const o = order.value
  if (!o) return batch
  const seen = new Set(o)
  const rows: Row[] = []
  for (const k of o) {
    const r = store.rowByKey(k)
    if (r) rows.push(r)
  }
  for (const r of batch) if (!seen.has(store.keyOf(r))) rows.push(r)
  return rows
})
/** Gösterilen satırlar: sıra + görünüm + çıkarılanlar. */
const rowsAll = computed<Row[]>(() => {
  const all = view.value === 'all'
  const keys = viewKeys.value
  return orderedBatch.value.filter((r) => {
    const k = store.keyOf(r)
    return !store.isRemoved(k) && (all || keys.has(k))
  })
})
const layout = useColumnLayout<Row>({
  columns: sheetColumns,
  rows: rowsAll,
  rowKey: () => props.rowKey,
  fixedStart,
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

const readOnlyNow = computed(() => loadingNow.value || savingNow.value || readOnlyDevice)

// Editörler filtre değer girişleriyle aynı aileden (07 §5); `boolean` editör açmaz (Space). ajax/user/object/array için
// yalnızca özel editör (`ColumnDef.editor`).
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
  multiselect: MultiCell,
  date: DateCell,
  datetime: DateCell,
}
const editorFor = (def: ColumnDef<Row>): Component | null => def.editor ?? EDITORS[def.type] ?? null
/** Sütunlar varsayılan salt okunur; anahtar sütun yüklenmiş satırlarda her zaman (yeni satırda açık); yüklenirken, kaydederken ve telefonda hiçbiri. */
const canEdit = (row: Row, def: ColumnDef<Row>): boolean => {
  if (readOnlyNow.value) return false
  const isNew = store.isNew(store.keyOf(row))
  if (def.id === props.keyColumn) return isNew
  if (def.type !== 'boolean' && !editorFor(def)) return false
  return typeof def.editable === 'function' ? def.editable(store.current(row), { isNew }) : def.editable === true
}

const parseEnv = (locale = ctx.locale): ParseEnv => ({
  locale,
  today: new Date(),
  todayWord: i18n.t('date.today'),
  yesWord: i18n.t('common.yes'),
  noWord: i18n.t('common.no'),
})
const edit = useSheetEditing<Row>({ store, canEdit, parse: (def, text) => parseInput(def, text, parseEnv()) })
provide(SHEET_EDITOR_KEY, { seed: () => edit.editing.value?.seed })
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
const focusCell = (r: number, columnId: string) => {
  const row = rowsAll.value[Math.max(0, Math.min(rowsAll.value.length - 1, r))]
  if (!row) return
  table.focus(store.keyOf(row), columnId)
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

// Hatalar (07 §11, §14): gösterim sırasında; görünüm gizliyorsa toast "Next error is hidden by filters · Show it".
const errorKeysInOrder = computed(() => {
  void store.version.value
  return orderedBatch.value.map((r) => store.keyOf(r)).filter((k) => !store.isRemoved(k) && store.hasError(k))
})
const goToError = (dir: 1 | -1) => {
  const rows = rowsAll.value
  const n = rows.length
  const a = table.active.value
  const from = a ? (indexByKey.value.get(a.rowId) ?? -1) : -1
  for (let s = 1; s <= n; s++) {
    const i = (((from + dir * s) % n) + n) % n
    const key = store.keyOf(rows[i]!)
    if (!store.hasError(key)) continue
    const issues = store.rowIssues(key)
    const col =
      visibleCols.value.find((c) => issues?.get(c.id)?.level === 'error') ??
      (store.rowError(key) ? visibleCols.value.find((c) => c.id === props.keyColumn) : undefined)
    if (!col) continue
    table.focus(key, col.id)
    grid.value?.focusActive()
    return
  }
  if (errorKeysInOrder.value.length && view.value !== 'all')
    showToast({
      text: i18n.t('sheet.nextErrorHidden'),
      action: {
        label: i18n.t('sheet.showIt'),
        run: () => {
          setView('all')
          goToError(dir)
        },
      },
    })
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
  if (!readOnlyNow.value) clearSelected()
  return true
}
/** Hücre menüsü › Copy / Cut: `navigator.clipboard` (TSV + HTML; yalnızca metin destekleniyorsa TSV). */
const copyToClipboard = (cutAfter: boolean) => {
  const m = copyMatrix()
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  if (!m || !clip) return
  const tsv = toTsv(m)
  const write =
    typeof ClipboardItem === 'function' && clip.write
      ? clip.write([
          new ClipboardItem({
            'text/plain': new Blob([tsv], { type: 'text/plain' }),
            'text/html': new Blob([toHtml(m)], { type: 'text/html' }),
          }),
        ])
      : clip.writeText(tsv)
  void write.catch(() => clip.writeText(tsv)).catch(() => {})
  if (cutAfter && !readOnlyNow.value) clearSelected()
}
const pasteMatrix = (matrix: string[][]): boolean => {
  const a = table.active.value
  const width = Math.max(0, ...matrix.map((l) => l.length))
  if (!a || !matrix.length || !width || readOnlyNow.value) return false
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
  if (overflow > 0 && store.allRows.value.length + overflow > props.maxRows) {
    showToast({
      text: i18n.t('sheet.limitPaste', {
        count: fmt.int(store.allRows.value.length + overflow),
        max: fmt.int(props.maxRows),
      }),
    })
    return true
  }
  // Son satırın altına taşanlar yeni satır olur; anahtar boşsa "Required" (07 §7).
  const addedRows = overflow > 0 ? store.addRows(overflow) : []
  if (addedRows.length && order.value) order.value = [...order.value, ...addedRows.map((x) => x.key)]
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
/** Hücre menüsü › Paste: `readText` yedeği (07 §7). */
const pasteFromClipboard = () => {
  void navigator.clipboard
    ?.readText()
    .then((text) => pasteMatrix(parseTsv(text)))
    .catch(() => {})
}

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
  if (!step) return
  // Listeden çıkarma geri alındı: geri gelen satıra odak (toast'taki Undo odağı ızgaradan almıştı).
  if (step.removed?.length && !step.patches.length) {
    const i = indexByKey.value.get(step.removed[0]!)
    if (i !== undefined) focusCell(i, table.active.value?.columnId ?? visibleCols.value[0]!.id)
    return
  }
  if (!step.patches.length) return
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
  if (readOnlyNow.value) return
  edit.cancel()
  afterStep(store.undo())
}
const redo = () => {
  if (readOnlyNow.value) return
  edit.cancel()
  afterStep(store.redo())
}
const useSuggestion = (row: Row, def: ColumnDef<Row>, value: unknown) => store.set(row, def, value)

// Satır partisi (07 §9, D12): Add row / Insert row above-below (newRowDefaults, odak anahtar hücresinde, düzenleme açık);
// Remove from list (⌘−): nötr, sunucuda silmez, toast + Undo.
const addRow = (at?: number) => {
  if (readOnlyNow.value) return
  if (store.allRows.value.length + 1 > props.maxRows) {
    showToast({
      text: i18n.t('sheet.limitPaste', { count: fmt.int(store.allRows.value.length + 1), max: fmt.int(props.maxRows) }),
    })
    return
  }
  edit.commit()
  const [added] = store.addRows(1)
  if (!added) return
  const defaults = props.newRowDefaults?.() ?? {}
  const changes: Array<Change<Row>> = []
  for (const [id, value] of Object.entries(defaults)) {
    const def = defById.value.get(id)
    if (def && !isEmptyValue(value)) changes.push({ row: added.row, def, value })
  }
  store.apply(changes, [added])
  if (at !== undefined) {
    const keys = order.value ?? store.batch.value.map((r) => store.keyOf(r)).filter((k) => k !== added.key)
    const pos = Math.max(0, Math.min(keys.length, at))
    order.value = [...keys.slice(0, pos), added.key, ...keys.slice(pos)]
  } else if (order.value) order.value = [...order.value, added.key]
  if (view.value !== 'all') viewKeys.value = new Set([...viewKeys.value, added.key])
  table.focus(added.key, props.keyColumn)
  // Yeni satır görünür alana kayar (sona eklenince 5.000 satır aşağıda olabilir); sanal liste yeni sayıyı bir sonraki
  // render'da öğrendiğinden nextTick. focusActive editör açıkken kaydırmaz.
  void nextTick(() => grid.value?.scrollToIndex(rowsAll.value.findIndex((r) => store.keyOf(r) === added.key)))
  grid.value?.focusActive()
  if (keyDef.value) edit.start(added.row, keyDef.value, { inCell: true })
}
const insertRow = (where: 'above' | 'below') => {
  const a = table.active.value
  const i = a ? orderedBatch.value.findIndex((r) => store.keyOf(r) === a.rowId) : -1
  addRow(i < 0 ? undefined : where === 'above' ? i : i + 1)
}
const removeSelectedRows = () => {
  if (readOnlyNow.value) return
  const b = table.bounds.value
  if (!b) return
  edit.cancel()
  const rows = rowsAll.value.slice(b.minRowIndex, b.maxRowIndex + 1)
  const keys = rows.map((r) => store.keyOf(r))
  if (!keys.length) return
  store.removeRows(keys)
  showToast({
    text:
      keys.length === 1
        ? i18n.t('sheet.removed', { count: 1, row: store.rowNoOf(keys[0]!), entity: entity.value })
        : i18n.t('sheet.removed', { count: keys.length, entity: entity.value }),
    undo: true,
  })
  focusCell(b.minRowIndex, table.active.value?.columnId ?? visibleCols.value[0]!.id)
}

// Yerel sıralama (07 §10): asc → desc → kapalı, ⇧ ile ikincil (en fazla 3); anlık görüntü, gutter numaraları değişmez.
const sort = (columnId: string, additive: boolean) => {
  const def = defById.value.get(columnId)
  if (!def || !(def.sortable ?? TYPE_SPECS[def.type].sortable)) return
  const current = sortRules.value
  const existing = current.find((s) => s.column === columnId)
  const next: SortRule | null = !existing
    ? { column: columnId, dir: 'asc' }
    : existing.dir === 'asc'
      ? { column: columnId, dir: 'desc' }
      : null
  const rest = current.filter((s) => s.column !== columnId)
  sortRules.value = additive
    ? next
      ? existing
        ? current.map((s) => (s.column === columnId ? next : s))
        : [...rest, next].slice(-3)
      : rest
    : next
      ? [next]
      : []
  if (!sortRules.value.length) {
    order.value = null
    return
  }
  const cmps = sortRules.value.map((s) => ({
    def: defById.value.get(s.column)!,
    cmp: comparator(defById.value.get(s.column)!, ctx.locale),
    sign: s.dir === 'desc' ? -1 : 1,
  }))
  order.value = [...store.batch.value]
    .sort((a, b) => {
      for (const { def: d, cmp, sign } of cmps) {
        const r = cmp(store.read(a, d), store.read(b, d)) * sign
        if (r) return r
      }
      return store.rowNoOf(store.keyOf(a)) - store.rowNoOf(store.keyOf(b))
    })
    .map((r) => store.keyOf(r))
}
const sortMap = computed(() => {
  const m = new Map<string, { dir: 'asc' | 'desc'; index: number | null }>()
  sortRules.value.forEach((s, i) => m.set(s.column, { dir: s.dir, index: sortRules.value.length > 1 ? i + 1 : null }))
  return m
})

// Anahtar kontrolü (07 §9): yeni satırın anahtarı onaylanınca 300 ms sonra `lookupKeys`; yok → New, var → Update + sunucu
// kaydı base (Q2). Verilmemişse her bilinmeyen anahtar New.
const looked = new Map<string, string>()
const pending = new Map<string, string>()
let lookupTimer: ReturnType<typeof setTimeout> | undefined
let lookupCtl: AbortController | null = null
const runLookup = async () => {
  const batchKeys = new Map(pending)
  pending.clear()
  if (!batchKeys.size) return
  if (!props.lookupKeys) {
    for (const rowKey of batchKeys.keys()) store.setKeyState(rowKey, 'new')
    return
  }
  for (const rowKey of batchKeys.keys()) store.setKeyState(rowKey, 'checking')
  lookupCtl?.abort()
  lookupCtl = new AbortController()
  try {
    const values = [...new Set(batchKeys.values())].slice(0, 500)
    const result = await props.lookupKeys(values, { signal: lookupCtl.signal })
    for (const [rowKey, value] of batchKeys) {
      if (looked.get(rowKey) !== value) continue
      const found = result[value]
      if (found) {
        store.setKeyState(rowKey, 'update')
        store.setBase(rowKey, found)
      } else store.setKeyState(rowKey, 'new')
    }
  } catch {
    for (const rowKey of batchKeys.keys()) store.setKeyState(rowKey, 'new')
  }
}
watch(store.version, () => {
  const def = keyDef.value
  if (!def) return
  for (const r of store.batch.value) {
    const rowKey = store.keyOf(r)
    if (!store.isNew(rowKey)) continue
    const v = store.readUntracked(r, def)
    const text = isEmptyValue(v) ? '' : String(v)
    if (looked.get(rowKey) === text) continue
    looked.set(rowKey, text)
    if (text) pending.set(rowKey, text)
    else store.setKeyState(rowKey, 'new')
  }
  if (pending.size) {
    clearTimeout(lookupTimer)
    lookupTimer = setTimeout(() => void runLookup(), 300)
  }
})

// Kayıt akışı (07 §14): hatalı satır varsa dialog; `@save` yükü; uygulama `saving` verir; `applyResult` sonuçları işler;
// bitişte status bar sonucu ya da Partly saved şeridi (görünüm Errors, aktif hücre ilk hatada).
const errorDialogOpen = ref(false)
const errorItems = computed<ErrorRowItem[]>(() =>
  errorKeysInOrder.value
    .filter((k) => !!store.rowDraft(k)?.size || store.isNew(k))
    .map((k) => {
      const row = store.rowByKey(k)!
      const issues = store.rowIssues(k)
      const first = issues ? [...issues.values()].find((i) => i.level === 'error') : undefined
      return {
        rowNo: store.rowNoOf(k),
        key: keyDef.value ? inputText(keyDef.value, store.read(row, keyDef.value)) : k,
        message: first?.message ?? store.rowError(k) ?? '',
      }
    }),
)
const saveTotals = shallowRef({ created: 0, updated: 0, errors: 0 })
const savedSummary = shallowRef<{ count: number; created: number; updated: number } | null>(null)
const partly = shallowRef<{ failed: number; saved: number } | null>(null)
const emitSave = () => {
  saveTotals.value = { created: 0, updated: 0, errors: 0 }
  savedSummary.value = null
  partly.value = null
  store.settleUntouched()
  emit('save', store.getChanges())
}
const save = () => {
  if (readOnlyNow.value) return
  edit.commit()
  if (!counts.value.changedCells && !counts.value.newRows) return
  if (errorItems.value.length) {
    errorDialogOpen.value = true
    return
  }
  emitSave()
}
const fixFirst = () => {
  setView('errors')
  goToError(1)
}
const finishSave = () => {
  const t = saveTotals.value
  if (!t.created && !t.updated && !t.errors) return
  if (t.errors) {
    partly.value = { failed: t.errors, saved: t.created + t.updated }
    assertive.value = i18n.t('sheet.partly.title', { count: fmt.int(t.errors) })
    setView('errors')
    goToError(1)
  } else {
    savedSummary.value = { count: t.created + t.updated, created: t.created, updated: t.updated }
    polite.value = i18n.t('sheet.saved', { count: fmt.int(t.created + t.updated) })
  }
  saveTotals.value = { created: 0, updated: 0, errors: 0 }
}
let resultVersion = -1
const applyResult = (results: Array<SheetRowResult<Row>>) => {
  const r = store.applyResult(results)
  resultVersion = store.version.value
  const t = saveTotals.value
  saveTotals.value = { created: t.created + r.created, updated: t.updated + r.updated, errors: t.errors + r.errors }
  if (!savingNow.value) finishSave()
}
watch(savingNow, (now) => {
  if (!now) finishSave()
})
// Sonraki düzenlemede sonuç metni gider (applyResult'ın kendi sürüm artışı sayılmaz); hata kalmayınca şerit kapanır.
watch(store.version, (v) => {
  if (v !== resultVersion) savedSummary.value = null
  if (partly.value && !counts.value.errorRows) partly.value = null
})
const partlyIndex = computed(() => {
  const a = table.active.value
  const i = a ? errorKeysInOrder.value.indexOf(a.rowId) : -1
  return i < 0 ? 0 : i + 1
})
/** Copy errors (07 §14): TSV, başlık Row · anahtar sütunu · Column · Message. */
const copyErrors = () => {
  const lines: string[][] = [
    [
      i18n.t('sheet.err.row'),
      keyDef.value?.header ?? props.keyColumn,
      i18n.t('sheet.err.column'),
      i18n.t('sheet.err.message'),
    ],
  ]
  for (const k of errorKeysInOrder.value) {
    const row = store.rowByKey(k)!
    const keyText = keyDef.value ? inputText(keyDef.value, store.read(row, keyDef.value)) : k
    const rowErr = store.rowError(k)
    if (rowErr) lines.push([String(store.rowNoOf(k)), keyText, '', rowErr])
    for (const [col, issue] of store.rowIssues(k) ?? [])
      if (issue.level === 'error')
        lines.push([String(store.rowNoOf(k)), keyText, defById.value.get(col)?.header ?? col, issue.message])
  }
  void navigator.clipboard?.writeText(toTsv(lines)).catch(() => {})
}
const openHref = (row: Row): string | undefined => {
  if (store.isNew(store.keyOf(row))) return undefined
  return keyDef.value?.href?.(row) ?? primaryDef.value?.href?.(row)
}

// Import (07 §13): listede olan anahtar güncellenir; sunucuda olan Update satırı (base), olmayan New satırı; tek undo adımı.
const importOpen = ref(false)
const keyIndexSet = computed(() => {
  void store.version.value
  const set = new Set<string>()
  const def = keyDef.value
  if (!def) return set
  for (const r of store.allRows.value) {
    const v = store.readUntracked(r, def)
    if (!isEmptyValue(v)) set.add(String(v))
  }
  return set
})
const inList = (key: string) => keyIndexSet.value.has(key)
const applyImport = (payload: ImportPayload<Row>) => {
  if (readOnlyNow.value || !keyDef.value) return
  edit.commit()
  const def = keyDef.value
  const byKeyValue = new Map<string, Row>()
  for (const r of store.allRows.value) {
    const v = store.readUntracked(r, def)
    if (!isEmptyValue(v)) byKeyValue.set(String(v), r)
  }
  const changes: Array<Change<Row>> = []
  const addedRows: Array<{ key: string; row: Row }> = []
  const bases: Array<{ key: string; row: Row }> = []
  let updated = 0
  let news = 0
  for (const item of payload.rows) {
    let row = byKeyValue.get(item.key)
    if (!row) {
      if (item.server === null && !payload.addNew) continue
      if (store.allRows.value.length + addedRows.length + 1 > props.maxRows) break
      const [a] = store.addRows(1)
      if (!a) continue
      row = a.row
      addedRows.push(a)
      byKeyValue.set(item.key, row)
      changes.push({ row, def, value: item.key })
      if (item.server) {
        bases.push({ key: a.key, row: item.server })
        updated++
      } else news++
    } else updated++
    for (const [id, value] of Object.entries(item.values)) {
      const d = defById.value.get(id)
      if (d && canEdit(row, d)) changes.push({ row, def: d, value })
    }
  }
  for (const b of bases) {
    store.setKeyState(b.key, 'update')
    store.setBase(b.key, b.row)
  }
  store.apply(changes, addedRows)
  if (addedRows.length && order.value) order.value = [...order.value, ...addedRows.map((a) => a.key)]
  showToast({
    text: i18n.t('import.done', {
      count: fmt.int(payload.rows.length),
      updated: fmt.int(updated),
      news: fmt.int(news),
    }),
    undo: true,
  })
  // Odak ızgaraya, ilk alınan satırın anahtar hücresine (dialog kapanınca odak Import düğmesine dönerdi).
  const firstKey = payload.rows[0]?.key
  const firstRow = firstKey ? byKeyValue.get(firstKey) : undefined
  const i = firstRow ? indexByKey.value.get(store.keyOf(firstRow)) : undefined
  if (i !== undefined) focusCell(i, props.keyColumn)
}
/** Export (07 §2): All / Visible › CSV / Excel; değerler güncel (taslak uygulanmış), dosyayı uygulama yazar. */
const exportRows = (format: 'csv' | 'xlsx', scope: 'all' | 'visible') => {
  edit.commit()
  const rows = (scope === 'all' ? store.allRows.value : rowsAll.value).map((r) => store.current(r))
  emit('export', { format, scope, columns: visibleCols.value.map((c) => c.id), rows })
}
const exportLabel = (scope: 'all' | 'visible') =>
  i18n.t(scope === 'all' ? 'sheet.exportAll' : 'sheet.exportVisible', {
    count: fmt.int(scope === 'all' ? store.allRows.value.length : rowsAll.value.length),
  })
const copyLink = () => void navigator.clipboard?.writeText(location.href).catch(() => {})

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
  copyToClipboard,
  pasteFromClipboard,
  insertRow,
  removeSelectedRows,
  sort,
  openHref,
}

// Izgara dışına tık onaylar (07 §5): formül çubuğu ve portallı editör katmanları (`dt-sheet-layer`) dışarı sayılmaz.
const onDocPointerdown = (e: PointerEvent) => {
  if (!edit.editing.value) return
  const t = e.target as Element | null
  if (t?.closest('.dt-cell.is-editing, .dt-formula, .dt-sheet-layer')) return
  edit.commit()
}
// Ayrılma koruması (07 §14): değişiklik varken tarayıcı uyarısı; yönlendirici dialog'u uygulamanın (`isDirty()`).
const isDirty = () => counts.value.changedCells > 0 || counts.value.newRows > 0
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!isDirty()) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerdown, true)
  window.addEventListener('beforeunload', onBeforeUnload)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerdown, true)
  window.removeEventListener('beforeunload', onBeforeUnload)
  clearTimeout(toastTimer)
  clearTimeout(lookupTimer)
  lookupCtl?.abort()
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

// All / Changed / Errors sayaçları (07 §11).
const viewCounts = computed(() => ({
  all: store.allRows.value.length,
  changed: counts.value.changedOrNewRows,
  errors: counts.value.errorRows,
}))

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
  phase: loadingNow.value
    ? 'loading'
    : savingNow.value
      ? 'saving'
      : partly.value
        ? 'partly-saved'
        : savedSummary.value
          ? 'saved'
          : 'ready',
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
const canSave = computed(() => !readOnlyNow.value && (counts.value.changedCells > 0 || counts.value.newRows > 0))

// Toast (06 §8): yapıştırma sonucu, sınır uyarısı, listeden çıkarma, gizli hata; Review / Show it / Undo.
interface Toast {
  text: string
  issues?: string
  review?: () => void
  action?: { label: string; run: () => void }
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
const toastAction = () => {
  const run = toast.value?.action?.run
  toast.value = null
  run?.()
}
const polite = ref('')
const assertive = ref('')
// Yükleme / kayıt ilerlemesi her %25'te duyurulur (08 §5).
let announcedQuarter = -1
watch(percent, (p) => {
  if (p === null) {
    announcedQuarter = -1
    return
  }
  const q = Math.floor(p / 25)
  if (q === announcedQuarter || p === 0) return
  announcedQuarter = q
  polite.value = i18n.t(loadingNow.value ? 'sr.loadingPercent' : 'sr.savingPercent', { percent: q * 25 })
})

const discardOpen = ref(false)
const discard = () => {
  edit.cancel()
  store.reset()
  order.value = null
  sortRules.value = []
  partly.value = null
  savedSummary.value = null
  looked.clear()
  pending.clear()
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
  'columns-save': (d: ColumnsDraft) => layout.arrange(d),
  // Display › Reset: tercihler + sütun düzeni tanımlara (sheet'te görünüm yok).
  reset: () => {
    pref.reset()
    layout.reset()
  },
}

const rootEl = ref<HTMLElement | null>(null)
const tooltip = useDelegatedTooltip(rootEl)

defineExpose({
  status,
  isDirty,
  getChanges: store.getChanges,
  applyResult,
  reset: discard,
  undo,
  redo,
  goToNextError: () => goToError(1),
})
</script>

<template>
  <div
    ref="rootEl"
    class="dt dt-sheet"
    :class="{ 'is-phone': readOnlyDevice }"
    :data-density="density"
    @keydown="onRootKeydown"
  >
    <div v-if="readOnlyDevice" class="dt-sheet-readonly" role="note">
      <PhMonitor :size="20" aria-hidden="true" />
      <div class="dt-sheet-readonly-text">
        <strong>{{ i18n.t('sheet.readOnly.title') }}</strong>
        <span>{{ i18n.t('sheet.readOnly.body', { entity }) }}</span>
        <button type="button" class="dt-btn has-icon" @click="copyLink">
          <PhLink :size="16" aria-hidden="true" />
          {{ i18n.t('common.copyLink') }}
        </button>
      </div>
    </div>
    <div class="dt-toolbar dt-sheet-toolbar" role="toolbar">
      <div v-if="loadingNow || savingNow" class="dt-progress-strip">
        <strong>
          {{
            loadingNow
              ? i18n.t('sheet.loading', { entity })
              : progress
                ? i18n.t('sheet.saving', { sent: fmt.int(progress.done), total: fmt.int(progress.total) })
                : i18n.t('sheet.savingIndeterminate')
          }}
        </strong>
        <span v-if="loadingNow && progress" class="dt-progress-count">
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
      <div v-else-if="readOnlyDevice" class="dt-find" @keydown="onFindKeydown">
        <SearchBox
          ref="findBox"
          :model-value="findText"
          :placeholder="i18n.t('sheet.find')"
          :kbd="FIND_KBD"
          @update:model-value="(v) => (findText = v)"
        />
        <span v-if="findCount" class="dt-find-count" role="status">{{ findCount }}</span>
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
        <ToggleGroupRoot
          class="dt-seg dt-sheet-views"
          type="single"
          :model-value="view"
          :aria-label="i18n.t('sheet.showRows')"
          @update:model-value="(v) => v && setView(v as SheetFilterMode)"
        >
          <ToggleGroupItem class="dt-seg-item" value="all">
            {{ i18n.t('sheet.all') }}
            <span class="dt-seg-count">{{ fmt.int(viewCounts.all) }}</span>
          </ToggleGroupItem>
          <ToggleGroupItem class="dt-seg-item" value="changed">
            {{ i18n.t('sheet.changed') }}
            <span class="dt-seg-count">{{ fmt.int(viewCounts.changed) }}</span>
          </ToggleGroupItem>
          <ToggleGroupItem class="dt-seg-item" :class="{ 'is-errors': viewCounts.errors > 0 }" value="errors">
            {{ i18n.t('sheet.errors') }}
            <span class="dt-seg-count">{{ fmt.int(viewCounts.errors) }}</span>
          </ToggleGroupItem>
        </ToggleGroupRoot>
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
        <button type="button" class="dt-btn dt-btn-ghost has-icon dt-sheet-add" @click="addRow()">
          <PhPlus :size="16" aria-hidden="true" />
          {{ i18n.t('sheet.addRow') }}
        </button>
        <button
          v-if="parseFile"
          type="button"
          class="dt-btn dt-btn-ghost has-icon dt-sheet-import"
          @click="importOpen = true"
        >
          <PhDownloadSimple :size="16" aria-hidden="true" />
          {{ i18n.t('sheet.import') }}
        </button>
        <DropdownMenuRoot>
          <DropdownMenuTrigger as-child>
            <button type="button" class="dt-btn dt-btn-ghost has-icon dt-sheet-export">
              <PhExport :size="16" aria-hidden="true" />
              {{ i18n.t('sheet.export') }}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent class="dt-menu" align="start" :side-offset="4">
              <DropdownMenuSub v-for="scope in ['all', 'visible'] as const" :key="scope">
                <DropdownMenuSubTrigger class="dt-menu-item">{{ exportLabel(scope) }}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent class="dt-menu" :side-offset="4">
                    <DropdownMenuItem class="dt-menu-item" @select="exportRows('xlsx', scope)">
                      {{ i18n.t('toolbar.xlsx') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem class="dt-menu-item" @select="exportRows('csv', scope)">
                      {{ i18n.t('toolbar.csv') }}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <DisplayPopover v-bind="displayProps" v-on="displayOn" />
      </template>
      <span class="dt-toolbar-spacer" />
      <template v-if="readOnlyDevice" />
      <span v-else-if="!savingNow" class="dt-sheet-changes" :class="{ 'is-empty': !counts.changedCells }">
        <span v-if="counts.changedCells" class="dt-sheet-dot" aria-hidden="true" />
        {{ changesText }}
        <template v-if="counts.newRows">· {{ i18n.t('sheet.newShort', { count: counts.newRows }) }}</template>
      </span>
      <button
        v-if="!readOnlyDevice"
        type="button"
        class="dt-btn dt-btn-ghost"
        :disabled="savingNow || (!counts.changedCells && !counts.newRows)"
        @click="discardOpen = true"
      >
        {{ i18n.t('sheet.discard') }}
      </button>
      <button
        v-if="!readOnlyDevice"
        type="button"
        class="dt-btn dt-btn-primary has-icon dt-sheet-save"
        :disabled="!savingNow && !canSave"
        :aria-disabled="savingNow ? 'true' : undefined"
        :data-dt-tip="savingNow ? undefined : saveTip"
        @click="!savingNow && save()"
      >
        <PhCircleNotch v-if="savingNow" :size="16" class="dt-spin" aria-hidden="true" />
        <PhCheck v-else :size="16" aria-hidden="true" />
        {{ savingNow ? i18n.t('sheet.savingButton') : i18n.t('sheet.save') }}
      </button>
    </div>

    <div v-if="partly" class="dt-sheet-partly" role="alert">
      <PhWarningCircle :size="16" aria-hidden="true" />
      <span>
        <strong>{{ i18n.t('sheet.partly.title', { count: fmt.int(partly.failed) }) }}</strong>
        {{ i18n.t('sheet.partly.body', { count: fmt.int(partly.saved) }) }}
      </span>
      <span class="dt-partly-spacer" />
      <span class="dt-partly-nav">
        <button type="button" class="dt-partly-btn" :aria-label="i18n.t('sheet.prevError')" @click="goToError(-1)">
          <PhCaretUp :size="14" aria-hidden="true" />
        </button>
        <span>{{ i18n.t('sheet.findCount', { index: partlyIndex, total: errorKeysInOrder.length }) }}</span>
        <button type="button" class="dt-partly-btn" :aria-label="i18n.t('sheet.nextError')" @click="goToError(1)">
          <PhCaretDown :size="14" aria-hidden="true" />
        </button>
      </span>
      <span class="dt-partly-sep" aria-hidden="true" />
      <button type="button" class="dt-partly-copy" @click="copyErrors">
        <PhCopy :size="14" aria-hidden="true" />
        {{ i18n.t('sheet.copyErrors') }}
      </button>
    </div>
    <div v-if="overLimit" class="dt-strip dt-sheet-strip" role="status">
      <PhWarning :size="16" aria-hidden="true" />
      <span>{{ i18n.t('sheet.firstN', { max: fmt.int(maxRows), entity }) }}</span>
    </div>

    <div v-if="!readOnlyDevice" class="dt-formula">
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
      <span v-if="savingNow" class="dt-formula-hint">
        <PhLock :size="12" aria-hidden="true" />
        {{ i18n.t('sheet.savingReadOnly') }}
      </span>
      <span v-else-if="hint" class="dt-formula-hint">{{ hint }}</span>
    </div>

    <SheetGrid
      ref="grid"
      :sheet="sheet"
      :layout="layout"
      :rows="rowsAll"
      :density="density"
      :label="entity.other"
      :entity="entity"
      :loading="loadingNow"
      :skeleton="loadingNow"
      :read-only="savingNow"
      :vertical-lines="pref.prefs.verticalLines"
      :key-column="keyColumn"
      :found="matches?.map ?? null"
      :sort="sortMap"
      :phone="readOnlyDevice"
    >
      <template v-if="!loadingNow && rowsAll.length === 0" #state>
        <slot name="empty">
          <StateMessage kind="empty" :title="i18n.t('state.emptyTitle', { entity })" />
        </slot>
      </template>
    </SheetGrid>

    <div v-if="readOnlyDevice" class="dt-sheet-footer" role="status">
      <span>{{ i18n.t('sheet.readOnly.total', { count: fmt.int(store.allRows.value.length), entity }) }}</span>
      <span aria-hidden="true">·</span>
      <span class="dt-sheet-footer-badge">
        <PhLock :size="14" aria-hidden="true" />
        {{ i18n.t('sheet.readOnly.badge') }}
      </span>
    </div>
    <div v-else class="dt-status" role="status" :aria-label="i18n.t('sheet.statusAria')">
      <span class="dt-status-rows">
        {{
          loadingNow ? i18n.t('common.loading') : i18n.t('sheet.rows', { count: fmt.int(store.allRows.value.length) })
        }}
      </span>
      <template v-if="!loadingNow">
        <span v-if="savedSummary" class="dt-status-saved">
          <PhCheck :size="14" aria-hidden="true" />
          <strong>{{ i18n.t('sheet.saved', { count: fmt.int(savedSummary.count) }) }}</strong>
          <span>
            ·
            {{
              i18n.t('sheet.savedDetail', {
                created: fmt.int(savedSummary.created),
                updated: fmt.int(savedSummary.updated),
              })
            }}
          </span>
        </span>
        <span v-else-if="counts.changedCells" class="dt-status-changes">
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
      <button v-if="toast.action" type="button" class="dt-toast-link" @click="toastAction">
        {{ toast.action.label }}
      </button>
      <template v-if="toast.undo">
        <span class="dt-toast-sep" aria-hidden="true" />
        <button type="button" class="dt-toast-undo" @click="toastUndo">
          {{ i18n.t('common.undo') }}
          <kbd class="dt-kbd">{{ UNDO_KBD }}</kbd>
        </button>
      </template>
    </div>
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
    <ConfirmDialog
      v-model:open="discardOpen"
      :title="i18n.t('sheet.discard.title', { cells: fmt.int(counts.changedCells), rows: fmt.int(counts.changedRows) })"
      :body="i18n.t('sheet.discard.body')"
      :confirm-label="i18n.t('sheet.leave.discard')"
      :cancel-label="i18n.t('sheet.discard.keep')"
      danger
      @confirm="discard"
    />
    <ImportDialog
      v-if="parseFile && importOpen"
      v-model:open="importOpen"
      :parse-file="parseFile"
      :columns="sheetColumns"
      :key-column="keyColumn"
      :entity="entity"
      :max-rows="maxRows"
      :row-count="store.allRows.value.length"
      :in-list="inList"
      :lookup-keys="lookupKeys"
      :parse-env="parseEnv"
      :fmt-env="fmtEnv"
      @apply="applyImport"
    />
    <SaveErrorsDialog
      v-if="errorDialogOpen"
      v-model:open="errorDialogOpen"
      :errors="errorItems"
      :ok-rows="store.getChanges().rows.length"
      @fix="fixFirst"
      @save="emitSave"
    />
  </div>
</template>
