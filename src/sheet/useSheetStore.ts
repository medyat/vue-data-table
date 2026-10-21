// Taslak deposu (07 §18, D11): uygulamanın `rows` dizisine dokunmaz. `draft: Map<rowKey, Map<columnId, value>>` hücre
// başına, `Map.has` ile (bilinçli null korunur). Tek okuyucu `read`: taslak → satır; render, doğrulama ve kopyalama bunu
// kullanır. Doğrulama satır başına, hücre onaylanınca (07 §5): tip → required → validate → warn; aynı satırın diğer
// hücreleri de yenilenir (çapraz kural). Satır Map'leri her değişimde yeni nesnedir: yalnızca o satır yeniden çizilir.
import { computed, shallowReactive, toValue, type MaybeRefOrGetter } from 'vue'
import { isEmptyValue } from '../core/cells/format'
import { TYPE_SPECS } from '../core/cells/specs'
import { readPath } from '../core/columns/readPath'
import { toDate } from '../core/format'
import type { I18n } from '../core/i18n'
import type { ColumnDef } from '../types/columns'
import type { SheetChangeRow, SheetChanges } from '../types/sheet'

export interface Issue {
  level: 'error' | 'warning'
  message: string
}

export interface SheetStoreOptions<Row extends object> {
  rows: MaybeRefOrGetter<Row[]>
  columns: MaybeRefOrGetter<Array<ColumnDef<Row>>>
  rowKey: MaybeRefOrGetter<string>
  keyColumn: MaybeRefOrGetter<string>
  i18n: I18n
}

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

export function useSheetStore<Row extends object>(o: SheetStoreOptions<Row>) {
  const t = o.i18n.t
  const defs = computed(() => toValue(o.columns))
  const draft = shallowReactive(new Map<string, Map<string, unknown>>())
  const issues = shallowReactive(new Map<string, Map<string, Issue>>())

  const keyOf = (row: Row): string => String(readPath(row, toValue(o.rowKey)))
  const byKey = computed(() => {
    const m = new Map<string, Row>()
    for (const r of toValue(o.rows)) m.set(keyOf(r), r)
    return m
  })
  const original = (row: Row, def: ColumnDef<Row>): unknown =>
    def.accessor ? def.accessor(row) : readPath(row, def.id as string)
  const read = (row: Row, def: ColumnDef<Row>): unknown => {
    const d = draft.get(keyOf(row))
    const id = def.id as string
    return d?.has(id) ? d.get(id) : original(row, def)
  }
  /** Satırın güncel hali (doğrulama bağlamı): taslak değerler kopya üstüne yazılır; `rows` değişmez. */
  const current = (row: Row): Row => {
    const d = draft.get(keyOf(row))
    if (!d?.size) return row
    const obj = { ...row } as Record<string, unknown>
    for (const [col, v] of d) setPath(obj, col, v)
    return obj as Row
  }

  const typeIssue = (def: ColumnDef<Row>, value: unknown): string | null => {
    if (isEmptyValue(value)) return null
    if ((TYPE_SPECS[def.type].numeric || def.type === 'star') && typeof value !== 'number')
      return typeof value === 'string' && value.trim().startsWith('=') ? t('sheet.noFormulas') : t('sheet.notANumber')
    if ((def.type === 'date' || def.type === 'datetime') && Number.isNaN(toDate(value as string).getTime()))
      return t('sheet.notADate')
    if (def.type === 'select' && !def.options.some((opt) => opt.value === value))
      return t('sheet.notAnOption', { value: String(value) })
    return null
  }
  const validateRow = (row: Row) => {
    const key = keyOf(row)
    const cur = current(row)
    const map = new Map<string, Issue>()
    for (const def of defs.value) {
      const value = read(row, def)
      const ctx = { row: cur, isNew: false, original: original(row, def) }
      const err =
        typeIssue(def, value) ??
        (def.required && isEmptyValue(value) ? t('sheet.required') : null) ??
        def.validate?.(value, ctx) ??
        null
      if (err) map.set(def.id as string, { level: 'error', message: err })
      else {
        const warn = def.warn?.(value, ctx)
        if (warn) map.set(def.id as string, { level: 'warning', message: warn })
      }
    }
    if (map.size) issues.set(key, map)
    else issues.delete(key)
  }

  /** Hücreyi yazar; orijinale eşitse taslaktan düşer. Satırda taslak kalmazsa doğrulama da kalkar (yüklenen veri doğrulanmaz). */
  const set = (row: Row, def: ColumnDef<Row>, value: unknown) => {
    const key = keyOf(row)
    const id = def.id as string
    const next = new Map(draft.get(key))
    if (same(value, original(row, def))) next.delete(id)
    else next.set(id, value)
    if (next.size) {
      draft.set(key, next)
      validateRow(row)
    } else {
      draft.delete(key)
      issues.delete(key)
    }
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
    return { changedCells, changedRows: draft.size, errorRows, warningRows }
  })

  const reset = () => {
    draft.clear()
    issues.clear()
  }

  /** `@save` yükü (D11): yalnızca değişmiş, hatasız satırlar; satır başına yalnızca değişen alanlar. */
  const getChanges = (): SheetChanges => {
    const keyCol = toValue(o.keyColumn)
    const keyDef = defs.value.find((d) => d.id === keyCol)
    const rows: SheetChangeRow[] = []
    for (const [key, m] of draft) {
      const row = byKey.value.get(key)
      if (!row || hasError(key)) continue
      rows.push({
        clientId: key,
        key: String(keyDef ? read(row, keyDef) : readPath(row, keyCol)),
        op: 'update',
        values: Object.fromEntries(m),
      })
    }
    return { rows }
  }

  return {
    keyOf,
    rowByKey: (key: string) => byKey.value.get(key),
    read,
    original,
    current,
    set,
    rowDraft,
    rowIssues,
    hasError,
    counts,
    reset,
    getChanges,
  }
}

export type SheetStore<Row extends object> = ReturnType<typeof useSheetStore<Row>>
