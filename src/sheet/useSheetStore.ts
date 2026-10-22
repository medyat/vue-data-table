// Taslak deposu (07 §18, D11): uygulamanın `rows` dizisine dokunmaz. `draft: Map<rowKey, Map<columnId, value>>` hücre
// başına, `Map.has` ile (bilinçli null korunur). Tek okuyucu `read`: taslak → satır; render, doğrulama, kopyalama bunu
// kullanır. Doğrulama satır başına, hücre onaylanınca (07 §5): tip → required → validate → warn; aynı satırın diğer
// hücreleri de yenilenir (çapraz kural). Satır Map'leri her değişimde yeni nesnedir: yalnızca o satır yeniden çizilir.
// Komut yığını (07 §12): adım = tek kullanıcı işlemi `{ patches: [{ key, col, before, after }], added }`, 100 adım;
// `apply` toplu yazar (yapıştırma 1.000 satırda satır başına tek doğrulama). Yeni satırlar (07 §7: sona taşan yapıştırma)
// `added`da; anahtarı `new:n`, sunucu değeri yok, anahtar sütunu zorunlu.
import { computed, shallowReactive, shallowRef, toRaw, toValue, type MaybeRefOrGetter } from 'vue'
import { isEmptyValue } from '../core/cells/format'
import { TYPE_SPECS } from '../core/cells/specs'
import { readPath } from '../core/columns/readPath'
import { toDate } from '../core/format'
import type { I18n } from '../core/i18n'
import type { ColumnDef, OptionDef } from '../types/columns'
import type { SheetChangeRow, SheetChanges } from '../types/sheet'

export interface Issue {
  level: 'error' | 'warning'
  message: string
  /** "“Pump” isn't an option" için yakın seçenek (balonda "Use Pumps"). */
  suggest?: OptionDef
}
export interface Patch {
  key: string
  col: string
  before: unknown
  after: unknown
}
export interface Step {
  patches: Patch[]
  /** Bu adımda eklenen satırlar (undo kaldırır, redo geri koyar). */
  added?: Array<{ key: string; row: object }>
}
export interface Change<Row extends object> {
  row: Row
  def: ColumnDef<Row>
  value: unknown
}

export interface SheetStoreOptions<Row extends object> {
  rows: MaybeRefOrGetter<Row[]>
  columns: MaybeRefOrGetter<Array<ColumnDef<Row>>>
  rowKey: MaybeRefOrGetter<string>
  keyColumn: MaybeRefOrGetter<string>
  i18n: I18n
  locale: string
}

const HISTORY = 100

/** Boş değerler (null / undefined / '' / []) birbirine eşit sayılır; diziler elemanlarıyla. */
const same = (a: unknown, b: unknown): boolean =>
  (isEmptyValue(a) && isEmptyValue(b)) ||
  Object.is(a, b) ||
  (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i])))

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let o = obj
  for (const k of keys.slice(0, -1)) {
    const next = o[k]
    o[k] = next && typeof next === 'object' ? { ...(next as object) } : {}
    o = o[k] as Record<string, unknown>
  }
  o[keys[keys.length - 1]!] = value
}

const fold = (s: string, locale: string) => s.trim().toLocaleLowerCase(locale).replace(/ı|i̇/g, 'i')
/** Yakın seçenek: aynı başlangıç, içerme ya da ≤ 2 harf farkı. */
function closest(options: OptionDef[], value: string, locale: string): OptionDef | undefined {
  const v = fold(value, locale)
  if (!v) return undefined
  const dist = (a: string, b: string): number => {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]!
      d[0] = i
      for (let j = 1; j <= b.length; j++) {
        const tmp = d[j]!
        d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
        prev = tmp
      }
    }
    return d[b.length]!
  }
  return (
    options.find((o) => fold(o.label, locale).startsWith(v) || v.startsWith(fold(o.label, locale))) ??
    options.find((o) => dist(fold(o.label, locale), v) <= 2)
  )
}

export function useSheetStore<Row extends object>(o: SheetStoreOptions<Row>) {
  const t = o.i18n.t
  const defs = computed(() => toValue(o.columns))
  const draft = shallowReactive(new Map<string, Map<string, unknown>>())
  const issues = shallowReactive(new Map<string, Map<string, Issue>>())
  const added = shallowRef<Array<{ key: string; row: Row }>>([])
  /** Her yazmada artar: seçim özeti gibi toplu okuyucular hücre başına bağımlılık kurmadan buna bağlanır. */
  const version = shallowRef(0)
  const undoStack: Step[] = []
  const redoStack: Step[] = []
  const canUndo = shallowRef(false)
  const canRedo = shallowRef(false)
  let newCounter = 0

  const keyOf = (row: Row): string => String(readPath(row, toValue(o.rowKey)))
  const allRows = computed<Row[]>(() =>
    added.value.length ? [...toValue(o.rows), ...added.value.map((a) => a.row)] : toValue(o.rows),
  )
  const byKey = computed(() => {
    const m = new Map<string, Row>()
    for (const r of allRows.value) m.set(keyOf(r), r)
    return m
  })
  const addedKeys = computed(() => new Set(added.value.map((a) => a.key)))
  const isNew = (key: string) => addedKeys.value.has(key)

  const original = (row: Row, def: ColumnDef<Row>): unknown =>
    isNew(keyOf(row)) ? undefined : def.accessor ? def.accessor(row) : readPath(row, def.id as string)
  const readFrom = (map: Map<string, Map<string, unknown>>, row: Row, def: ColumnDef<Row>): unknown => {
    const d = map.get(keyOf(row))
    const id = def.id as string
    return d?.has(id) ? d.get(id) : original(row, def)
  }
  const read = (row: Row, def: ColumnDef<Row>): unknown => readFrom(draft, row, def)
  /** Bağımlılık kurmadan okur (toplu özetler `version` ile yenilenir). */
  const readUntracked = (row: Row, def: ColumnDef<Row>): unknown => readFrom(toRaw(draft), row, def)
  /** Satırın güncel hali (doğrulama bağlamı): taslak değerler kopya üstüne yazılır; `rows` değişmez. */
  const current = (row: Row): Row => {
    const d = draft.get(keyOf(row))
    if (!d?.size) return row
    const obj = { ...row } as Record<string, unknown>
    for (const [col, v] of d) setPath(obj, col, v)
    return obj as Row
  }

  const typeIssue = (def: ColumnDef<Row>, value: unknown): Issue | null => {
    if (isEmptyValue(value)) return null
    const error = (message: string, suggest?: OptionDef): Issue => ({ level: 'error', message, suggest })
    if ((TYPE_SPECS[def.type].numeric || def.type === 'star') && typeof value !== 'number')
      return error(
        typeof value === 'string' && value.trim().startsWith('=') ? t('sheet.noFormulas') : t('sheet.notANumber'),
      )
    if ((def.type === 'date' || def.type === 'datetime') && Number.isNaN(toDate(value as string).getTime()))
      return error(t('sheet.notADate'))
    if (def.type === 'boolean' && typeof value !== 'boolean')
      return error(t('sheet.notAnOption', { value: String(value) }))
    if (def.type === 'select' && !def.options.some((opt) => opt.value === value))
      return error(t('sheet.notAnOption', { value: String(value) }), closest(def.options, String(value), o.locale))
    if (def.type === 'multiselect') {
      const bad = (Array.isArray(value) ? value : [value]).find((v) => !def.options.some((opt) => opt.value === v))
      if (bad !== undefined) return error(t('sheet.notAnOption', { value: String(bad) }))
    }
    return null
  }
  const validateRow = (row: Row) => {
    const key = keyOf(row)
    const isNewRow = isNew(key)
    const cur = current(row)
    const map = new Map<string, Issue>()
    for (const def of defs.value) {
      const value = read(row, def)
      const ctx = { row: cur, isNew: isNewRow, original: original(row, def) }
      const required = def.required || (isNewRow && def.id === toValue(o.keyColumn))
      const issue =
        typeIssue(def, value) ??
        (required && isEmptyValue(value) ? { level: 'error' as const, message: t('sheet.required') } : null) ??
        (() => {
          const err = def.validate?.(value, ctx)
          if (err) return { level: 'error' as const, message: err }
          const warn = def.warn?.(value, ctx)
          return warn ? { level: 'warning' as const, message: warn } : null
        })()
      if (issue) map.set(def.id as string, issue)
    }
    if (map.size) issues.set(key, map)
    else issues.delete(key)
  }

  /** Ham yazma: satır başına tek Map kopyası ve tek doğrulama. Yama listesi döner (undo için `before`). */
  const write = (changes: Array<Change<Row>>): Patch[] => {
    const patches: Patch[] = []
    const touched = new Map<string, { row: Row; map: Map<string, unknown> }>()
    for (const c of changes) {
      const key = keyOf(c.row)
      const id = c.def.id as string
      const before = read(c.row, c.def)
      if (same(before, c.value)) continue
      let entry = touched.get(key)
      if (!entry) touched.set(key, (entry = { row: c.row, map: new Map(draft.get(key)) }))
      if (same(c.value, original(c.row, c.def))) entry.map.delete(id)
      else entry.map.set(id, c.value)
      patches.push({ key, col: id, before, after: c.value })
    }
    for (const [key, { row, map }] of touched) {
      if (map.size) {
        draft.set(key, map)
        validateRow(row)
      } else {
        draft.delete(key)
        issues.delete(key)
      }
    }
    if (patches.length) version.value++
    return patches
  }
  const syncHistory = () => {
    canUndo.value = undoStack.length > 0
    canRedo.value = redoStack.length > 0
  }
  const record = (step: Step) => {
    undoStack.push(step)
    if (undoStack.length > HISTORY) undoStack.shift()
    redoStack.length = 0
    syncHistory()
  }

  /** Tek kullanıcı işlemi = tek undo adımı; boş değişiklik kaydedilmez. */
  const apply = (changes: Array<Change<Row>>, addedRows: Array<{ key: string; row: Row }> = []): Patch[] => {
    const patches = write(changes)
    if (patches.length || addedRows.length) record({ patches, added: addedRows.length ? addedRows : undefined })
    return patches
  }
  const set = (row: Row, def: ColumnDef<Row>, value: unknown) => apply([{ row, def, value }])

  /** Sona taşan yapıştırma için yeni satırlar (07 §7): anahtar `new:n`, numara mevcut satırların devamı. */
  const addRows = (count: number): Array<{ key: string; row: Row }> => {
    const rows = Array.from({ length: count }, () => {
      const key = `new:${++newCounter}`
      const row = {} as Record<string, unknown>
      setPath(row, toValue(o.rowKey), key)
      return { key, row: row as Row }
    })
    added.value = [...added.value, ...rows]
    version.value++
    return rows
  }
  const removeRows = (keys: string[]) => {
    const drop = new Set(keys)
    added.value = added.value.filter((a) => !drop.has(a.key))
    for (const k of keys) {
      draft.delete(k)
      issues.delete(k)
    }
    version.value++
  }
  const defById = computed(() => new Map(defs.value.map((d) => [d.id as string, d])))
  const replay = (step: Step, dir: 'undo' | 'redo') => {
    if (dir === 'undo' && step.added) removeRows(step.added.map((a) => a.key))
    if (dir === 'redo' && step.added) {
      added.value = [...added.value, ...(step.added as Array<{ key: string; row: Row }>)]
      version.value++
    }
    const changes: Array<Change<Row>> = []
    for (const p of step.patches) {
      const row = byKey.value.get(p.key)
      const def = defById.value.get(p.col)
      if (row && def) changes.push({ row, def, value: dir === 'undo' ? p.before : p.after })
    }
    write(changes)
  }
  const undo = (): Step | null => {
    const step = undoStack.pop()
    if (!step) return null
    replay(step, 'undo')
    redoStack.push(step)
    syncHistory()
    return step
  }
  const redo = (): Step | null => {
    const step = redoStack.pop()
    if (!step) return null
    replay(step, 'redo')
    undoStack.push(step)
    syncHistory()
    return step
  }
  const clearHistory = () => {
    undoStack.length = 0
    redoStack.length = 0
    syncHistory()
  }

  const rowDraft = (key: string) => draft.get(key)
  const rowIssues = (key: string) => issues.get(key)
  const hasError = (key: string): boolean => {
    const m = issues.get(key)
    if (!m) return false
    for (const i of m.values()) if (i.level === 'error') return true
    return false
  }

  const counts = computed(() => {
    let changedCells = 0
    for (const m of draft.values()) changedCells += m.size
    let errorRows = 0
    let warningRows = 0
    for (const m of issues.values()) {
      let e = false
      let w = false
      for (const i of m.values())
        if (i.level === 'error') e = true
        else w = true
      if (e) errorRows++
      if (w) warningRows++
    }
    return { changedCells, changedRows: draft.size, errorRows, warningRows, newRows: added.value.length }
  })

  /** Discard: taslak, hatalar, yeni satırlar ve yığın gider. */
  const reset = () => {
    draft.clear()
    issues.clear()
    added.value = []
    clearHistory()
    version.value++
  }

  /** `@save` yükü (D11): yalnızca değişmiş ve hatasız satırlar; güncellemede yalnızca değişen alanlar, yeni satırda dolu alanlar. */
  const getChanges = (): SheetChanges => {
    const keyCol = toValue(o.keyColumn)
    const keyDef = defs.value.find((d) => d.id === keyCol)
    const rows: SheetChangeRow[] = []
    for (const [key, m] of draft) {
      const row = byKey.value.get(key)
      if (!row || hasError(key)) continue
      const create = isNew(key)
      const values = Object.fromEntries([...m].filter(([, v]) => !create || !isEmptyValue(v)))
      rows.push({
        clientId: key,
        key: String(keyDef ? read(row, keyDef) : readPath(row, keyCol)),
        op: create ? 'create' : 'update',
        values,
      })
    }
    return { rows }
  }

  return {
    keyOf,
    allRows,
    rowByKey: (key: string) => byKey.value.get(key),
    isNew,
    read,
    readUntracked,
    original,
    current,
    set,
    apply,
    addRows,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    version,
    rowDraft,
    rowIssues,
    hasError,
    counts,
    reset,
    getChanges,
  }
}

export type SheetStore<Row extends object> = ReturnType<typeof useSheetStore<Row>>
