// Taslak deposu (07 §18, D11–D13): uygulamanın `rows` dizisine dokunmaz. Katmanlar, okuma sırasıyla:
//   draft  Map<rowKey, Map<columnId, value>>  — hücre başına, `Map.has` ile (bilinçli null korunur)
//   base   Map<rowKey, Row>                    — kayıt sonrası sunucu satırı ya da Update satırının sunucu kaydı (07 §9, §14)
//   rows   uygulamanın dizisi + `added` (yeni satırlar `new:n`, sunucu değeri yok, anahtar sütunu zorunlu)
// Tek okuyucu `read`; render, doğrulama, kopyalama bunu kullanır. Doğrulama satır başına, hücre onaylanınca (07 §5):
// tip → required → validate → warn; aynı satırın diğer hücreleri de yenilenir (çapraz kural); anahtar tekilliği (07 §9)
// aynı anahtarı taşıyan tüm satırlarda. Sunucu hataları (`applyResult`) ayrı tutulur; hücre düzenlenince o hücreninki
// temizlenir. Komut yığını (07 §12): adım = `{ patches, added, removed }`, 100 adım; `apply` toplu yazar.
// Satır Map'leri her değişimde yeni nesnedir: yalnızca o satır yeniden çizilir.
import { computed, shallowReactive, shallowRef, toRaw, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { isEmptyValue, optionLabel } from '../core/cells/format'
import { TYPE_SPECS } from '../core/cells/specs'
import { readPath } from '../core/columns/readPath'
import { toDate } from '../core/format'
import type { I18n } from '../core/i18n'
import type { ColumnDef, OptionDef } from '../types/columns'
import type { SheetChangeRow, SheetChanges, SheetRowResult } from '../types/sheet'

export interface Issue {
  level: 'error' | 'warning'
  message: string
  /** "“Pump” isn't an option" için yakın seçenek (balonda "Use Pumps"). */
  suggest?: OptionDef
  /** Sunucudan (`applyResult`): hücre düzenlenince temizlenir. */
  server?: boolean
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
  /** Bu adımda listeden çıkarılan satırlar (undo geri getirir). */
  removed?: string[]
}
export interface Change<Row extends object> {
  row: Row
  def: ColumnDef<Row>
  value: unknown
}
/** Yeni satırın anahtar durumu (07 §9): kontrol sürüyor · sunucuda yok (New) · sunucuda var (Update). */
export type KeyState = 'checking' | 'new' | 'update'

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
  const defById = computed(() => new Map(defs.value.map((d) => [d.id as string, d])))
  const keyCol = () => toValue(o.keyColumn)
  const draft = shallowReactive(new Map<string, Map<string, unknown>>())
  const issues = shallowReactive(new Map<string, Map<string, Issue>>())
  /** Sunucu alan hataları ve satır hatası (07 §14). */
  const serverErrors = shallowReactive(new Map<string, Map<string, string>>())
  const rowErrors = shallowReactive(new Map<string, string>())
  /** Sunucu değerleri; `from` kayıt anındaki yüklenmiş satır nesnesi (uygulama satırı yenileyince base düşer). */
  const base = shallowReactive(new Map<string, { row: Row; from: Row | undefined }>())
  const added = shallowRef<Array<{ key: string; row: Row; saved?: boolean }>>([])
  const removed = shallowReactive(new Set<string>())
  const keyStates = shallowReactive(new Map<string, KeyState>())
  /** Her yazmada artar: seçim özeti gibi toplu okuyucular hücre başına bağımlılık kurmadan buna bağlanır. */
  const version = shallowRef(0)
  const undoStack: Step[] = []
  const redoStack: Step[] = []
  const canUndo = shallowRef(false)
  const canRedo = shallowRef(false)
  let newCounter = 0

  const keyOf = (row: Row): string => String(readPath(row, toValue(o.rowKey)))
  /** Parti: yüklenen + eklenen satırlar, listeden çıkarılanlar dahil (gutter numarası bu sıradır, 07 §3). */
  const batch = computed<Row[]>(() =>
    added.value.length ? [...toValue(o.rows), ...added.value.map((a) => a.row)] : toValue(o.rows),
  )
  const batchIndex = computed(() => {
    const m = new Map<string, number>()
    batch.value.forEach((r, i) => m.set(keyOf(r), i))
    return m
  })
  /** Gösterilen parti: çıkarılanlar hariç. */
  const allRows = computed<Row[]>(() =>
    removed.size ? batch.value.filter((r) => !removed.has(keyOf(r))) : batch.value,
  )
  const byKey = computed(() => {
    const m = new Map<string, Row>()
    for (const r of batch.value) m.set(keyOf(r), r)
    return m
  })
  const addedByKey = computed(() => new Map(added.value.map((a) => [a.key, a])))
  /** Yeni satır: eklenmiş ve henüz kaydedilmemiş (kaydedilince yüklenmiş sayılır, numarası kalır). */
  const isNew = (key: string) => !!addedByKey.value.get(key) && !addedByKey.value.get(key)!.saved
  const rowNoOf = (key: string) => (batchIndex.value.get(key) ?? -1) + 1

  const original = (row: Row, def: ColumnDef<Row>): unknown => {
    const key = keyOf(row)
    const b = base.get(key)
    if (b) return def.accessor ? def.accessor(b.row) : readPath(b.row, def.id as string)
    if (isNew(key)) return undefined
    return def.accessor ? def.accessor(row) : readPath(row, def.id as string)
  }
  const readFrom = (map: Map<string, Map<string, unknown>>, row: Row, def: ColumnDef<Row>): unknown => {
    const d = map.get(keyOf(row))
    const id = def.id as string
    return d?.has(id) ? d.get(id) : original(row, def)
  }
  const read = (row: Row, def: ColumnDef<Row>): unknown => readFrom(draft, row, def)
  /** Bağımlılık kurmadan okur (toplu özetler `version` ile yenilenir). */
  const readUntracked = (row: Row, def: ColumnDef<Row>): unknown => readFrom(toRaw(draft), row, def)
  /** Satırın güncel hali (doğrulama bağlamı, create yükü): base + taslak kopya üstüne; `rows` değişmez. */
  const current = (row: Row): Row => {
    const key = keyOf(row)
    const b = base.get(key)
    const d = draft.get(key)
    if (!b && !d?.size) return row
    const obj = { ...row, ...(b?.row as object) } as Record<string, unknown>
    for (const [col, v] of d ?? []) setPath(obj, col, v)
    return obj as Row
  }

  /** Anahtar değeri → o değeri taşıyan satır anahtarları (tekillik, 07 §9); çıkarılanlar sayılmaz. */
  const keyIndex = computed(() => {
    void version.value
    const m = new Map<string, Set<string>>()
    const def = defById.value.get(keyCol())
    if (!def) return m
    for (const row of allRows.value) {
      const v = readUntracked(row, def)
      if (isEmptyValue(v)) continue
      const k = String(v)
      let set = m.get(k)
      if (!set) m.set(k, (set = new Set()))
      set.add(keyOf(row))
    }
    return m
  })

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
  /** `optionEnabled`: satıra göre kapalı seçenek yalnızca değişen hücrede hata (mevcut değer kural değişince değil). */
  const optionIssue = (def: ColumnDef<Row>, value: unknown, ctx: { row: Row; original: unknown }): Issue | null => {
    if ((def.type !== 'select' && def.type !== 'multiselect') || !def.optionEnabled) return null
    if (isEmptyValue(value) || same(value, ctx.original)) return null
    const { options, optionEnabled } = def
    const bad = (Array.isArray(value) ? value : [value]).find((v) => {
      const opt = options.find((o) => o.value === v)
      return opt && !optionEnabled(opt, ctx.row)
    })
    return bad === undefined
      ? null
      : { level: 'error', message: t('sheet.notAnOption', { value: optionLabel(options, bad) }) }
  }
  const duplicateIssue = (key: string, value: unknown): Issue | null => {
    if (isEmptyValue(value)) return null
    const others = keyIndex.value.get(String(value))
    if (!others || others.size < 2) return null
    const other = [...others].find((k) => k !== key)
    return other
      ? { level: 'error', message: t('sheet.duplicateKey', { key: String(value), row: rowNoOf(other) }) }
      : null
  }
  const validateRow = (row: Row) => {
    const key = keyOf(row)
    const isNewRow = isNew(key)
    const cur = current(row)
    const map = new Map<string, Issue>()
    for (const def of defs.value) {
      const value = read(row, def)
      const ctx = { row: cur, isNew: isNewRow, original: original(row, def) }
      const isKey = def.id === keyCol()
      const required = def.required || (isNewRow && isKey)
      const issue =
        typeIssue(def, value) ??
        optionIssue(def, value, ctx) ??
        (required && isEmptyValue(value) ? { level: 'error' as const, message: t('sheet.required') } : null) ??
        // Yüklenmiş satırların anahtarı salt okunur: çift anahtar yalnızca yeni satır varken mümkün (10k indeks boşa kurulmaz).
        (isKey && (isNewRow || added.value.length) ? duplicateIssue(key, value) : null) ??
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
  /** Anahtar sütunu değişince aynı değeri taşıyan diğer satırlar da yeniden doğrulanır (çift anahtar belirir/kalkar). */
  const revalidateKeys = (values: unknown[]) => {
    for (const v of values) {
      if (isEmptyValue(v)) continue
      for (const k of keyIndex.value.get(String(v)) ?? []) {
        const row = byKey.value.get(k)
        if (row) validateRow(row)
      }
    }
  }

  /** Ham yazma: satır başına tek Map kopyası ve tek doğrulama. Yama listesi döner (undo için `before`). */
  const write = (changes: Array<Change<Row>>): Patch[] => {
    const patches: Patch[] = []
    const touched = new Map<string, { row: Row; map: Map<string, unknown> }>()
    const keyValues: unknown[] = []
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
      if (id === keyCol()) keyValues.push(before, c.value)
      // Hücre düzenlenince o hücrenin sunucu hatası temizlenir; satır hatası da düşer (07 §14).
      const se = serverErrors.get(key)
      if (se?.has(id)) {
        const next = new Map(se)
        next.delete(id)
        if (next.size) serverErrors.set(key, next)
        else serverErrors.delete(key)
      }
      rowErrors.delete(key)
    }
    for (const [key, { map }] of touched) {
      if (map.size) draft.set(key, map)
      else draft.delete(key)
    }
    if (patches.length) version.value++
    for (const { row, map } of touched.values()) {
      if (map.size || isNew(keyOf(row))) validateRow(row)
      else issues.delete(keyOf(row))
    }
    if (keyValues.length) revalidateKeys(keyValues)
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

  /** Yeni satırlar (07 §9): anahtar `new:n`, numara mevcut satırların devamı; anahtar yazılınca doğrulanır. */
  const addRows = (count: number): Array<{ key: string; row: Row }> => {
    const rows = Array.from({ length: count }, () => {
      const key = `new:${++newCounter}`
      const row = {} as Record<string, unknown>
      setPath(row, toValue(o.rowKey), key)
      return { key, row: row as Row }
    })
    added.value = [...added.value, ...rows]
    version.value++
    for (const r of rows) {
      keyStates.set(r.key, 'new')
      validateRow(r.row)
    }
    return rows
  }
  const dropAdded = (keys: string[]) => {
    const drop = new Set(keys)
    added.value = added.value.filter((a) => !drop.has(a.key))
    for (const k of keys) {
      draft.delete(k)
      issues.delete(k)
      keyStates.delete(k)
      base.delete(k)
    }
    version.value++
  }
  /** Listeden çıkarma (D12): sunucuda silmez; değişiklikleri gönderilmez; tek undo adımı. */
  const removeRows = (keys: string[]) => {
    const keyDef = defById.value.get(keyCol())
    const values = keyDef ? keys.map((k) => byKey.value.get(k)).map((r) => (r ? read(r, keyDef) : null)) : []
    for (const k of keys) removed.add(k)
    version.value++
    record({ patches: [], removed: keys })
    revalidateKeys(values)
  }
  const restoreRows = (keys: string[]) => {
    for (const k of keys) removed.delete(k)
    version.value++
    const keyDef = defById.value.get(keyCol())
    if (keyDef) revalidateKeys(keys.map((k) => byKey.value.get(k)).map((r) => (r ? read(r, keyDef) : null)))
  }

  const replay = (step: Step, dir: 'undo' | 'redo') => {
    if (dir === 'undo' && step.added) dropAdded(step.added.map((a) => a.key))
    if (dir === 'redo' && step.added) {
      added.value = [...added.value, ...(step.added as Array<{ key: string; row: Row }>)]
      for (const a of step.added) keyStates.set(a.key, 'new')
      version.value++
    }
    if (step.removed) {
      if (dir === 'undo') restoreRows(step.removed)
      else {
        for (const k of step.removed) removed.add(k)
        version.value++
      }
    }
    const changes: Array<Change<Row>> = []
    for (const p of step.patches) {
      const row = byKey.value.get(p.key)
      const def = defById.value.get(p.col)
      if (row && def) changes.push({ row, def, value: dir === 'undo' ? p.before : p.after })
    }
    write(changes)
    if (dir === 'redo' && step.added) for (const a of step.added) validateRow(a.row as Row)
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
  /** İstemci + sunucu hataları (sunucu hatası olan birkaç satırda birleşik Map). */
  const rowIssues = (key: string): Map<string, Issue> | undefined => {
    const client = issues.get(key)
    const server = serverErrors.get(key)
    if (!server) return client
    const merged = new Map(client)
    for (const [col, message] of server)
      if (!merged.has(col)) merged.set(col, { level: 'error', message, server: true })
    return merged
  }
  const rowError = (key: string) => rowErrors.get(key)
  const hasError = (key: string): boolean => {
    if (serverErrors.has(key) || rowErrors.has(key)) return true
    const m = issues.get(key)
    if (!m) return false
    for (const i of m.values()) if (i.level === 'error') return true
    return false
  }
  const keyState = (key: string): KeyState | undefined => keyStates.get(key)
  const setKeyState = (key: string, state: KeyState) => {
    if (addedByKey.value.has(key)) keyStates.set(key, state)
  }
  /**
   * Update satırları (07 §9, Q2): sunucu kaydı orijinal sayılır; boş hücreler onunla dolar, yalnızca değişenler gider.
   * Toplu: sürüm bir kez artar, her satır bir kez doğrulanır (satır başına artış 10k içe aktarmada karesel olurdu).
   */
  const setBase = (entries: Array<{ key: string; row: Row }>) => {
    if (!entries.length) return
    for (const { key, row } of entries) base.set(key, { row, from: isNew(key) ? undefined : byKey.value.get(key) })
    version.value++
    for (const { key } of entries) {
      const r = byKey.value.get(key)
      if (!r) continue
      // Taslakta sunucuyla aynı olan değerler düşer.
      const d = draft.get(key)
      if (d) {
        const next = new Map(d)
        for (const [col, v] of d) {
          const def = defById.value.get(col)
          if (def && same(v, original(r, def))) next.delete(col)
        }
        if (next.size) draft.set(key, next)
        else draft.delete(key)
      }
      validateRow(r)
    }
  }

  const counts = computed(() => {
    let changedCells = 0
    const changedKeys = new Set<string>()
    for (const [k, m] of draft) {
      if (removed.has(k)) continue
      changedCells += m.size
      changedKeys.add(k)
    }
    let errorRows = 0
    let warningRows = 0
    const errorKeys = new Set<string>([...serverErrors.keys(), ...rowErrors.keys()])
    for (const [k, m] of issues) {
      if (removed.has(k)) continue
      let w = false
      for (const i of m.values())
        if (i.level === 'error') errorKeys.add(k)
        else w = true
      if (w) warningRows++
    }
    for (const k of errorKeys) if (!removed.has(k)) errorRows++
    let newRows = 0
    let changedOrNewRows = changedKeys.size
    for (const a of added.value) {
      if (a.saved || removed.has(a.key)) continue
      newRows++
      if (!changedKeys.has(a.key)) changedOrNewRows++
    }
    return { changedCells, changedRows: changedKeys.size, errorRows, warningRows, newRows, changedOrNewRows }
  })

  /** Discard: taslak, hatalar, yeni satırlar, çıkarılanlar ve yığın gider; base kalır (kaydedilmiş değerler). */
  const reset = () => {
    draft.clear()
    issues.clear()
    serverErrors.clear()
    rowErrors.clear()
    added.value = []
    removed.clear()
    keyStates.clear()
    clearHistory()
    version.value++
  }

  /** Kayıt başlarken: sunucuda var olan (Update) ve hiç değişmemiş yeni satırlar gönderilecek bir şey taşımaz; yüklenmiş sayılır. */
  const settleUntouched = () => {
    let changed = false
    const next = added.value.map((a) => {
      if (a.saved || removed.has(a.key) || keyStates.get(a.key) !== 'update' || draft.get(a.key)?.size) return a
      changed = true
      keyStates.delete(a.key)
      issues.delete(a.key)
      return { ...a, saved: true }
    })
    if (changed) {
      added.value = next
      version.value++
    }
  }

  /** `@save` yükü (D11, D12): değişmiş + yeni, hatasız, çıkarılmamış satırlar; güncellemede yalnızca değişen alanlar. */
  const getChanges = (): SheetChanges => {
    const keyDef = defById.value.get(keyCol())
    const rows: SheetChangeRow[] = []
    for (const [key, m] of draft) {
      const row = byKey.value.get(key)
      if (!row || removed.has(key) || hasError(key)) continue
      const create = isNew(key) && keyStates.get(key) !== 'update'
      const values = Object.fromEntries([...m].filter(([, v]) => !create || !isEmptyValue(v)))
      rows.push({
        clientId: key,
        key: String(keyDef ? read(row, keyDef) : readPath(row, keyCol())),
        op: create ? 'create' : 'update',
        values,
      })
    }
    rows.sort((a, b) => rowNoOf(a.clientId) - rowNoOf(b.clientId))
    return { rows }
  }

  /** Kayıt sonuçları (07 §14): created/updated → taslak düşer, değerler `row` ya da uygulanmış taslak; error → kalır. */
  const applyResult = (results: Array<SheetRowResult<Row>>) => {
    let created = 0
    let updated = 0
    let errors = 0
    for (const r of results) {
      const key = r.clientId
      const row = byKey.value.get(key)
      if (!row) continue
      if (r.status === 'error') {
        errors++
        const fe = r.fieldErrors ? new Map(Object.entries(r.fieldErrors)) : null
        if (fe?.size) serverErrors.set(key, fe)
        else serverErrors.delete(key)
        if (r.rowError) rowErrors.set(key, r.rowError)
        else rowErrors.delete(key)
        continue
      }
      if (r.status === 'created') created++
      else updated++
      base.set(key, { row: r.row ?? current(row), from: isNew(key) ? undefined : row })
      draft.delete(key)
      issues.delete(key)
      serverErrors.delete(key)
      rowErrors.delete(key)
      keyStates.delete(key)
      const a = addedByKey.value.get(key)
      if (a) added.value = added.value.map((x) => (x.key === key ? { ...x, saved: true } : x))
    }
    clearHistory()
    version.value++
    return { created, updated, errors }
  }
  // Uygulama satırları yenileyince (yeni nesneler) o anahtarların base'i düşer; aynı nesneler (eski/gecikmiş dizi) düşürmez.
  watch(
    () => toValue(o.rows),
    (rows) => {
      if (!base.size) return
      const byId = new Map<string, Row>()
      for (const r of rows) byId.set(keyOf(r), r)
      for (const [key, b] of base) {
        const now = byId.get(key)
        if (b.from && now && now !== b.from) base.delete(key)
      }
      version.value++
    },
  )

  return {
    keyOf,
    batch,
    allRows,
    rowByKey: (key: string) => byKey.value.get(key),
    rowNoOf,
    isNew,
    isRemoved: (key: string) => removed.has(key),
    keyState,
    setKeyState,
    setBase,
    read,
    readUntracked,
    original,
    current,
    set,
    apply,
    addRows,
    removeRows,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    version,
    rowDraft,
    rowIssues,
    rowError,
    hasError,
    counts,
    reset,
    getChanges,
    settleUntouched,
    applyResult,
  }
}

export type SheetStore<Row extends object> = ReturnType<typeof useSheetStore<Row>>
