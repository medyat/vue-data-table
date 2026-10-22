<script setup lang="ts" generic="Row extends object">
// Import from Excel (07 §13, handoff 06 §11, T12-09/10/11): dosya yalnızca grid'i doldurur; Save'e kadar kaydedilmez.
// Dosya (bırak/seç) → `parseFile` → sayfa · başlık satırı (otomatik, değiştirilebilir) · eşleşme anahtarı (eşlenmeden
// Apply pasif) · sütun eşleme (otomatik tek/kesin, elle değiştirilebilir, boş kalan alınmaz, read-only pasif) · ilk değer
// önizlemesi (1.650,00 → 1,650.00) · özet (listede/sunucuda olanlar günceller, yeni anahtarlar satır olur). Dosyadaki
// boş hücre mevcut değeri silmez (Q3). `maxRows` aşılırsa Apply pasif.
import {
  PhArrowLeft,
  PhArrowRight,
  PhInfo,
  PhLock,
  PhTable,
  PhUploadSimple,
  PhWarningCircle,
  PhX,
} from '@phosphor-icons/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref, shallowRef, watch } from 'vue'
import { formatCell, type FormatEnv } from '../core/cells/format'
import { TYPE_SPECS } from '../core/cells/specs'
import { useDataTableContext } from '../core/plugin'
import type { ColumnDef } from '../types/columns'
import type { Plural } from '../types/core'
import type { ParsedWorkbook } from '../types/sheet'
import { cellText, detectHeaderRow, matchColumns } from './import/model'
import { inferDecimal, parseInput, type ParseEnv } from './parse'

export interface ImportRow<Row> {
  key: string
  values: Record<string, unknown>
  /** undefined: listede var; Row: sunucuda var (Update); null: yeni. */
  server?: Row | null
}
export interface ImportPayload<Row> {
  rows: Array<ImportRow<Row>>
  addNew: boolean
}

const props = defineProps<{
  parseFile: (file: File) => Promise<ParsedWorkbook>
  columns: Array<ColumnDef<Row>>
  keyColumn: string
  entity: Plural
  maxRows: number
  /** Şu anki satır sayısı (sınır için). */
  rowCount: number
  inList: (key: string) => boolean
  lookupKeys?: (keys: string[], ctx: { signal: AbortSignal }) => Promise<Record<string, Row | null>>
  parseEnv: (locale?: string) => ParseEnv
  fmtEnv: FormatEnv
}>()
const emit = defineEmits<{ apply: [payload: ImportPayload<Row>] }>()
const open = defineModel<boolean>('open', { default: false })
const { i18n, locale } = useDataTableContext()
const SKIP = '__skip__'

const keyDef = computed(() => props.columns.find((c) => c.id === props.keyColumn))
const keyHeader = computed(() => keyDef.value?.header ?? props.keyColumn)
/** Eşlenebilir alanlar: anahtar dışındaki sütunlar; düzenlenemeyenler listede pasif. */
const fields = computed(() =>
  props.columns
    .filter((c) => c.id !== props.keyColumn)
    .map((c) => ({ id: c.id as string, def: c, editable: !!c.editable })),
)

const file = shallowRef<File | null>(null)
const workbook = shallowRef<ParsedWorkbook | null>(null)
const loading = ref(false)
const failed = ref(false)
/** `parseFile`'ın fırlattığı sebep (uygulamanın metni); `import.failed` başlığının altında gösterilir. */
const failReason = ref('')
const sheetIndex = ref(0)
const headerRow = ref(0)
const mapping = ref<Record<number, string>>({})
const keyCol = ref<number | null>(null)
const addNew = ref(true)
const showNew = ref(false)
const dragging = ref(false)
const input = ref<HTMLInputElement | null>(null)

const rows = computed(() => workbook.value?.sheets[sheetIndex.value]?.rows ?? [])
const headers = computed(() => (rows.value[headerRow.value] ?? []).map(cellText))
const dataRows = computed(() =>
  rows.value.slice(headerRow.value + 1).filter((r) => (r ?? []).some((c) => cellText(c) !== '')),
)
const headerOptions = computed(() => Math.min(rows.value.length, 20))

const rebuild = () => {
  const auto = matchColumns(headers.value, props.columns)
  const m: Record<number, string> = {}
  let key: number | null = null
  for (const [i, id] of Object.entries(auto)) {
    if (id === props.keyColumn) key = key ?? Number(i)
    else if (fields.value.find((f) => f.id === id)?.editable) m[Number(i)] = id
  }
  mapping.value = m
  keyCol.value = key
  showNew.value = false
}
const load = async (f: File) => {
  file.value = f
  failed.value = false
  loading.value = true
  try {
    const wb = await props.parseFile(f)
    workbook.value = wb
    sheetIndex.value = 0
    headerRow.value = detectHeaderRow(wb.sheets[0]?.rows ?? [])
    rebuild()
  } catch (e) {
    workbook.value = null
    failed.value = true
    failReason.value = e instanceof Error ? e.message : ''
  } finally {
    loading.value = false
  }
}
watch(sheetIndex, () => {
  headerRow.value = detectHeaderRow(rows.value)
  rebuild()
})
const onHeaderRow = (n: number) => {
  headerRow.value = n
  rebuild()
}
const onPick = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) void load(f)
  ;(e.target as HTMLInputElement).value = ''
}
const onDrop = (e: DragEvent) => {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) void load(f)
}
const reset = () => {
  file.value = null
  workbook.value = null
  failed.value = false
  mapping.value = {}
  keyCol.value = null
  lookup.value = null
}
watch(open, (o) => {
  if (!o) reset()
})

// Anahtarlar: listede olanlar güncellenir; olmayanlar `lookupKeys` ile sunucuda aranır (varsa Update, yoksa New).
const keyTexts = computed(() =>
  keyCol.value === null ? [] : dataRows.value.map((r) => cellText(r?.[keyCol.value!])).filter(Boolean),
)
const lookup = shallowRef<Map<string, Row | null> | null>(null)
let ctl: AbortController | null = null
watch(keyTexts, async (keys) => {
  lookup.value = null
  ctl?.abort()
  const unknown = [...new Set(keys.filter((k) => !props.inList(k)))]
  if (!unknown.length || !props.lookupKeys) {
    lookup.value = new Map(unknown.map((k) => [k, null]))
    return
  }
  ctl = new AbortController()
  const map = new Map<string, Row | null>()
  try {
    for (let i = 0; i < unknown.length; i += 500) {
      const chunk = unknown.slice(i, i + 500)
      const res = await props.lookupKeys(chunk, { signal: ctl.signal })
      for (const k of chunk) map.set(k, res[k] ?? null)
    }
    lookup.value = map
  } catch {
    if (!ctl.signal.aborted) lookup.value = new Map(unknown.map((k) => [k, null]))
  }
})
const summary = computed(() => {
  if (!keyTexts.value.length) return null
  const seen = new Set<string>()
  let inList = 0
  let server = 0
  const news: string[] = []
  for (const k of keyTexts.value) {
    if (seen.has(k)) continue
    seen.add(k)
    if (props.inList(k)) inList++
    else if (lookup.value?.get(k)) server++
    else news.push(k)
  }
  return { updates: inList + server, news, pending: lookup.value === null && !!props.lookupKeys }
})
const overLimit = computed(() => {
  const s = summary.value
  return !!s && addNew.value && props.rowCount + s.news.length > props.maxRows
})
const canApply = computed(
  () => !!workbook.value && keyCol.value !== null && !!summary.value && !summary.value.pending && !overLimit.value,
)

// Önizleme: ilk veri satırının ham değeri ve çözümlenmiş biçimi (sütun bazında ondalık çıkarımı, 07 §7).
const localeFor = (col: number, def: ColumnDef<Row>): string => {
  if (!TYPE_SPECS[def.type].numeric) return locale
  const dec = inferDecimal(dataRows.value.slice(0, 50).map((r) => cellText(r?.[col])))
  return dec === ',' ? 'de' : dec === '.' ? 'en' : locale
}
const convert = (col: number, def: ColumnDef<Row>, raw: unknown): unknown => {
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw
  if (raw instanceof Date) return cellText(raw)
  const text = cellText(raw)
  return text === '' ? null : parseInput(def, text, props.parseEnv(localeFor(col, def)))
}
const preview = (col: number): { raw: string; shown: string | null } => {
  const row = dataRows.value[0]
  const raw = cellText(row?.[col])
  const id = mapping.value[col]
  const def = id ? props.columns.find((c) => c.id === id) : undefined
  if (!def || !raw) return { raw, shown: null }
  const value = convert(col, def, row?.[col])
  const shown = formatCell(def, {} as Row, value, props.fmtEnv)
  return { raw, shown: shown === raw ? null : shown }
}

const apply = () => {
  if (!canApply.value || keyCol.value === null) return
  const out: Array<ImportRow<Row>> = []
  for (const r of dataRows.value) {
    const key = cellText(r?.[keyCol.value])
    if (!key) continue
    const values: Record<string, unknown> = {}
    for (const [col, id] of Object.entries(mapping.value)) {
      if (!id || id === SKIP) continue
      const def = props.columns.find((c) => c.id === id)
      const raw = r?.[Number(col)]
      if (!def || cellText(raw) === '') continue // boş hücre mevcut değeri silmez (Q3)
      values[id] = convert(Number(col), def, raw)
    }
    out.push({ key, values, server: props.inList(key) ? undefined : (lookup.value?.get(key) ?? null) })
  }
  emit('apply', { rows: out, addNew: addNew.value })
  open.value = false
}
const sheetInfo = computed(() => {
  const s = workbook.value?.sheets[sheetIndex.value]
  return s ? i18n.t('import.sheetInfo', { sheet: s.name, count: dataRows.value.length }) : ''
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="dt-scrim" />
      <DialogContent class="dt-dialog dt-import">
        <div class="dt-import-head">
          <div>
            <DialogTitle class="dt-dialog-title">{{ i18n.t('import.title') }}</DialogTitle>
            <DialogDescription class="dt-dialog-body">
              {{ i18n.t('import.body', { key: keyHeader, entity }) }}
            </DialogDescription>
          </div>
          <DialogClose class="dt-btn dt-btn-icon dt-btn-ghost" :aria-label="i18n.t('common.close')">
            <PhX :size="16" aria-hidden="true" />
          </DialogClose>
        </div>
        <div class="dt-import-body">
          <input ref="input" type="file" class="dt-sr-only" accept=".xlsx,.xls,.csv" tabindex="-1" @change="onPick" />
          <button
            v-if="!workbook"
            type="button"
            class="dt-import-drop"
            :class="{ 'is-over': dragging, 'is-failed': failed }"
            :aria-busy="loading ? 'true' : undefined"
            @click="input?.click()"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="onDrop"
          >
            <span class="dt-import-drop-icon"><PhUploadSimple :size="20" aria-hidden="true" /></span>
            <span>{{ i18n.t('import.drop') }}</span>
          </button>
          <template v-else>
            <div class="dt-import-file">
              <span class="dt-import-file-icon"><PhTable :size="18" aria-hidden="true" /></span>
              <span class="dt-import-file-text">
                <strong>{{ file?.name }}</strong>
                <label v-if="workbook.sheets.length > 1" class="dt-select dt-import-sheet">
                  <select v-model="sheetIndex" :aria-label="i18n.t('import.sheetInfo', { sheet: '', count: 0 })">
                    <option v-for="(s, i) in workbook.sheets" :key="i" :value="i">
                      {{ i18n.t('import.sheetInfo', { sheet: s.name, count: s.rows.length }) }}
                    </option>
                  </select>
                </label>
                <span v-else class="dt-import-sheet-info">{{ sheetInfo }}</span>
              </span>
              <button type="button" class="dt-btn dt-btn-sm" @click="input?.click()">
                {{ i18n.t('import.replace') }}
              </button>
            </div>
            <div class="dt-import-match">
              <span class="dt-import-match-label">{{ i18n.t('import.matchBy') }}</span>
              <span class="dt-import-key">
                <PhLock :size="12" aria-hidden="true" />
                <span class="dt-mono">{{ keyHeader }}</span>
              </span>
              <PhArrowLeft :size="14" aria-hidden="true" />
              <label class="dt-select dt-import-keysel" :class="{ 'is-missing': keyCol === null }">
                <select
                  :value="keyCol ?? ''"
                  :aria-label="i18n.t('import.excelColumn')"
                  @change="
                    keyCol =
                      ($event.target as HTMLSelectElement).value === ''
                        ? null
                        : Number(($event.target as HTMLSelectElement).value)
                  "
                >
                  <option value="">{{ i18n.t('import.excelColumn') }}</option>
                  <option v-for="(h, i) in headers" :key="i" :value="i" :disabled="!h">{{ h }}</option>
                </select>
              </label>
              <span class="dt-import-spacer" />
              <label class="dt-select dt-import-headerrow">
                <span class="dt-import-match-label">{{ i18n.t('import.headerRow') }}</span>
                <select :value="headerRow" @change="onHeaderRow(Number(($event.target as HTMLSelectElement).value))">
                  <option v-for="n in headerOptions" :key="n" :value="n - 1">
                    {{ i18n.t('import.headerRowN', { n }) }}
                  </option>
                </select>
              </label>
            </div>
            <p v-if="keyCol === null" class="dt-import-warn">
              <PhWarningCircle :size="14" aria-hidden="true" />
              {{ i18n.t('import.keyRequired', { key: keyHeader }) }}
            </p>
            <table class="dt-import-table">
              <thead>
                <tr>
                  <th>{{ i18n.t('import.excelColumn') }}</th>
                  <th />
                  <th>{{ i18n.t('import.field') }}</th>
                  <th>{{ i18n.t('import.firstValue') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(h, i) in headers"
                  :key="i"
                  :class="{ 'is-skipped': i !== keyCol && (mapping[i] ?? '') === SKIP }"
                >
                  <td class="dt-import-col">{{ h }}</td>
                  <td><PhArrowRight :size="14" aria-hidden="true" /></td>
                  <td>
                    <template v-if="i === keyCol">
                      <span class="dt-mono">{{ keyHeader }}</span>
                      <span class="dt-import-muted">{{ i18n.t('import.matchKey') }}</span>
                    </template>
                    <label v-else class="dt-select dt-import-field">
                      <select
                        :value="mapping[i] ?? ''"
                        :aria-label="i18n.t('import.field')"
                        @change="mapping = { ...mapping, [i]: ($event.target as HTMLSelectElement).value }"
                      >
                        <option value="" disabled>{{ i18n.t('import.chooseField') }}</option>
                        <option :value="SKIP">{{ i18n.t('import.skip') }}</option>
                        <option v-for="f in fields" :key="f.id" :value="f.id" :disabled="!f.editable">
                          {{ f.def.header }}{{ f.editable ? '' : ` · ${i18n.t('sheet.readOnly.badge')}` }}
                        </option>
                      </select>
                    </label>
                  </td>
                  <td class="dt-import-preview">
                    <template v-if="i === keyCol">
                      <span class="dt-mono">{{ preview(i).raw }}</span>
                    </template>
                    <template v-else-if="preview(i).shown">
                      <span class="dt-import-muted">{{ preview(i).raw }}</span>
                      <PhArrowRight :size="12" aria-hidden="true" />
                      <strong>{{ preview(i).shown }}</strong>
                    </template>
                    <span v-else :class="{ 'dt-import-muted': !mapping[i] || mapping[i] === SKIP }">
                      {{ preview(i).raw }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="summary && keyCol !== null" class="dt-import-summary">
              <div class="dt-import-summary-line">
                <PhInfo :size="16" aria-hidden="true" />
                <span>
                  {{
                    i18n.t('import.summary', {
                      updates: summary.updates,
                      news: summary.news.length,
                      entity,
                      key: keyHeader,
                    })
                  }}
                </span>
                <button
                  v-if="summary.news.length"
                  type="button"
                  class="dt-link dt-import-link"
                  @click="showNew = !showNew"
                >
                  {{ i18n.t('import.seeNew', { key: keyHeader }) }}
                </button>
              </div>
              <div v-if="showNew" class="dt-import-newlist dt-mono">{{ summary.news.join(', ') }}</div>
              <label v-if="summary.news.length" class="dt-check-row">
                <input v-model="addNew" type="checkbox" class="dt-checkbox" />
                {{ i18n.t('import.addNew', { count: summary.news.length, key: keyHeader }) }}
              </label>
              <p v-if="overLimit" class="dt-import-warn">
                <PhWarningCircle :size="14" aria-hidden="true" />
                {{ i18n.t('sheet.limitFile', { count: rowCount + summary.news.length, max: maxRows }) }}
              </p>
            </div>
          </template>
          <p v-if="failed && !workbook" class="dt-import-error" role="alert">
            {{ i18n.t('import.failed') }}
            <template v-if="failReason">· {{ failReason }}</template>
          </p>
        </div>
        <div class="dt-import-foot">
          <DialogClose class="dt-btn">{{ i18n.t('common.cancel') }}</DialogClose>
          <button type="button" class="dt-btn dt-btn-primary" :disabled="!canApply" @click="apply">
            {{ i18n.t('import.apply') }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
