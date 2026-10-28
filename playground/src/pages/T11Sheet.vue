<script setup lang="ts">
// T11 · DataSheet: 10.000 ürün sahte API'den 2.000'lik parçalarla yüklenir (ilerleme şeridi); düzenleme yükleme bitince
// açılır. Kayıt 07 §16 tarifiyle: 500'lük parçalar sırayla, `saving` sayacı, her parçanın yanıtı `applyResult` (snake_case →
// SheetRowResult). `lookupKeys` → /api/products/lookup-keys. URL: ?delay=ms (parça başına gecikme), ?limit=1 (maxRows
// şeridi), ?rows=N (yalnızca ilk N ürün; yeni satır / kayıt denemek için), ?saveDelay=ms (kayıt parçası gecikmesi).
import {
  DataSheet,
  type DataSheetHandle,
  type ParsedWorkbook,
  type Progress,
  type SheetChanges,
  type SheetRowResult,
} from '@medyat/vue-data-table/sheet'
import { Workbook, type CellValue } from 'exceljs'
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import { productColumns, type Product } from '../data/products'

const params = new URLSearchParams(location.search)
const delay = Number(params.get('delay') ?? 150)
const saveDelay = Number(params.get('saveDelay') ?? 300)
const maxRows = params.get('limit') === '1' ? 5000 : 10_000
const onlyRows = Number(params.get('rows') ?? 0)
const fresh = params.has('fresh') ? '&fresh=1' : ''
const rows = shallowRef<Product[]>([])
const loading = shallowRef<Progress>(true)
const saving = shallowRef<Progress>(false)
const sheet = useTemplateRef<DataSheetHandle>('sheet')
const lastSave = shallowRef<SheetChanges | null>(null)

onMounted(async () => {
  const size = 2000
  for (let page = 1; ; page++) {
    const res = await fetch(`/api/products?page=${page}&size=${size}&delay=${delay}${fresh}`)
    const data = (await res.json()) as { items: Product[]; total: number }
    rows.value = rows.value.concat(data.items)
    if (onlyRows && rows.value.length >= onlyRows) {
      rows.value = rows.value.slice(0, onlyRows)
      break
    }
    loading.value = { done: rows.value.length, total: data.total }
    if (rows.value.length >= data.total || data.items.length === 0) break
  }
  loading.value = false
})

interface ApiResult {
  client_id: string
  status: 'created' | 'updated' | 'error'
  field_errors?: Record<string, string>
  row_error?: string | null
  row?: Product
}
const toRowResult = (r: ApiResult): SheetRowResult<Product> => ({
  clientId: r.client_id,
  status: r.status,
  fieldErrors: r.field_errors,
  rowError: r.row_error ?? undefined,
  row: r.row,
})
const chunksOf = <T,>(xs: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

/** 07 §16: parçalar sırayla; zaman aşımı, yeniden deneme ve Stop uygulamanın işidir (burada yok). */
async function onSave(changes: SheetChanges) {
  lastSave.value = changes
  saving.value = { done: 0, total: changes.rows.length }
  let done = 0
  for (const chunk of chunksOf(changes.rows, 500)) {
    const res = await fetch(`/api/products/bulk-upsert?delay=${saveDelay}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: 'sku',
        rows: chunk.map((r) => ({ client_id: r.clientId, key: r.key, op: r.op, values: r.values })),
      }),
    })
    const data = (await res.json()) as { results: ApiResult[] }
    sheet.value!.applyResult(data.results.map(toRowResult))
    done += chunk.length
    saving.value = { done, total: changes.rows.length }
  }
  saving.value = false
}

async function lookupKeys(keys: string[], { signal }: { signal: AbortSignal }) {
  const res = await fetch('/api/products/lookup-keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ keys }),
    signal,
  })
  return (await res.json()) as Record<string, Product | null>
}
const newRowDefaults = (): Partial<Product> => ({ unit: 'pcs', vat: 20, active: true })

/** Dosyayı uygulama ayrıştırır (07 §13): .xlsx exceljs ile, .csv küçük bir ayrıştırıcıyla (`;` veya `,`, tırnaklı).
 * Eski ikili .xls biçimini exceljs okumaz; paket sebebi dialog'da gösterir. */
async function parseFile(file: File): Promise<ParsedWorkbook> {
  if (/\.csv$/i.test(file.name)) return parseCsv(file)
  if (!/\.xlsx$/i.test(file.name))
    throw new Error('Only .xlsx and .csv files (the old binary .xls format is not supported)')
  const wb = new Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  return {
    sheets: wb.worksheets.map((ws) => ({
      name: ws.name,
      rows: Array.from({ length: ws.rowCount }, (_, i) => (ws.getRow(i + 1).values as CellValue[]).slice(1).map(plain)),
    })),
  }
}
/** exceljs hücre değeri → düz değer: formül → sonucu, zengin metin → birleşik metin, köprü → metni, hata → boş. */
const plain = (v: CellValue): unknown => {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('richText' in v) return v.richText.map((r) => r.text).join('')
    if ('result' in v) return plain(v.result as CellValue)
    if ('text' in v) return typeof v.text === 'string' ? v.text : plain(v.text as CellValue)
    if ('error' in v) return null
  }
  return v
}
async function parseCsv(file: File): Promise<ParsedWorkbook> {
  const text = await file.text()
  const first = text.split('\n')[0] ?? ''
  const sep = first.split(';').length > first.split(',').length ? ';' : ','
  const rows: unknown[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return { sheets: [{ name: file.name.replace(/\.csv$/i, ''), rows }] }
}
const lastExport = shallowRef('')
/** Export (07 §4): paket yalnızca olayı yayar; dosyayı uygulama yazar. .xlsx exceljs ile (başlık kalın, tipe göre sayı/tarih
 * biçimi), .csv `;` ayrılmış ve UTF-8 BOM'lu (Excel Türkçe karakterleri doğru açsın). Gerçek uygulamada aynı tarif kullanılır. */
const onExport = async (e: {
  format: 'csv' | 'xlsx'
  scope: 'all' | 'visible'
  columns: string[]
  rows: Product[]
}) => {
  lastExport.value = `${e.scope} ${e.format} ${e.rows.length} rows ${e.columns.length} cols`
  const cols = e.columns.map((id) => productColumns.find((c) => c.id === id)!)
  const name = `products-${e.scope}.${e.format}`
  if (e.format === 'csv') {
    const esc = (v: unknown) => {
      const t = v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : String(v)
      return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
    }
    const lines = [cols.map((c) => esc(c.header)), ...e.rows.map((r) => cols.map((c) => esc(exportValue(c, r))))]
    download(
      new Blob(['\ufeff' + lines.map((l) => l.join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }),
      name,
    )
    return
  }
  const wb = new Workbook()
  const ws = wb.addWorksheet('Products')
  ws.columns = cols.map((c) => ({
    header: c.header,
    key: c.id as string,
    width: Math.max(12, c.header.length + 4),
    style: numFmt(c) ? { numFmt: numFmt(c) } : {},
  }))
  ws.getRow(1).font = { bold: true }
  for (const r of e.rows) ws.addRow(Object.fromEntries(cols.map((c) => [c.id as string, exportValue(c, r)])))
  download(
    new Blob([await wb.xlsx.writeBuffer()], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    name,
  )
}
type Col = (typeof productColumns)[number]
const numFmt = (c: Col) =>
  c.type === 'currency' || c.type === 'float'
    ? '#,##0.00'
    : c.type === 'percentage'
      ? '0"%"'
      : c.type === 'date'
        ? 'yyyy-mm-dd'
        : undefined
/** Hücre değeri → dışa aktarılan değer: select etiketi, tarih Date, diğerleri olduğu gibi (boş → null). */
const exportValue = (c: Col, r: Product): CellValue => {
  const v = (r as unknown as Record<string, unknown>)[c.id as string]
  if (v === null || v === undefined || v === '') return null
  if (c.type === 'select') return c.options.find((o) => o.value === v)?.label ?? String(v)
  if (c.type === 'date') return new Date(String(v))
  return v as CellValue
}
const download = (blob: Blob, name: string) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<template>
  <div class="pg-page">
    <div class="pg-title">
      <span class="pg-crumb">Products</span>
      <span class="pg-crumb-sep">/</span>
      <h1>Bulk edit products</h1>
      <label>
        Last save
        <code data-testid="last-save">{{ lastSave ? `${lastSave.rows.length} rows` : '—' }}</code>
        · export
        <code data-testid="last-export">{{ lastExport || '—' }}</code>
        · status
        <code data-testid="status">
          {{ sheet?.status.phase ?? '' }} {{ sheet?.status.changedCells ?? 0 }} / {{ sheet?.status.errorRows ?? 0 }}
        </code>
      </label>
    </div>
    <DataSheet
      ref="sheet"
      table-id="products"
      key-column="sku"
      :columns="productColumns"
      :rows="rows"
      :loading="loading"
      :saving="saving"
      :max-rows="maxRows"
      :lookup-keys="lookupKeys"
      :new-row-defaults="newRowDefaults"
      :parse-file="parseFile"
      @export="onExport"
      :entity-name="{ one: 'product', other: 'products' }"
      @save="onSave"
    />
  </div>
</template>
