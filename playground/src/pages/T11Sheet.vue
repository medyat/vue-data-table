<script setup lang="ts">
// T11 · DataSheet: 10.000 ürün sahte API'den 2.000'lik parçalarla yüklenir (ilerleme şeridi); düzenleme yükleme bitince
// açılır. Kayıt 07 §16 tarifiyle: 500'lük parçalar sırayla, `saving` sayacı, her parçanın yanıtı `applyResult` (snake_case →
// SheetRowResult). `lookupKeys` → /api/products/lookup-keys. URL: ?delay=ms (parça başına gecikme), ?limit=1 (maxRows
// şeridi), ?rows=N (yalnızca ilk N ürün; yeni satır / kayıt denemek için), ?saveDelay=ms (kayıt parçası gecikmesi).
import {
  DataSheet,
  type DataSheetHandle,
  type Progress,
  type SheetChanges,
  type SheetRowResult,
} from '@swors/data-table/sheet'
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
      :entity-name="{ one: 'product', other: 'products' }"
      @save="onSave"
    />
  </div>
</template>
