<script setup lang="ts">
// T11 · DataSheet (Faz 6a): 10.000 ürün sahte API'den 2.000'lik parçalarla yüklenir (ilerleme şeridi); düzenleme yükleme
// bitince açılır. @save yalnızca konsola yazar (kayıt teslimi 6c). URL: ?delay=ms (parça başına gecikme), ?limit=1 (maxRows).
import { DataSheet, type DataSheetHandle, type Progress, type SheetChanges } from '@swors/data-table/sheet'
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import { productColumns, type Product } from '../data/products'

const params = new URLSearchParams(location.search)
const delay = Number(params.get('delay') ?? 150)
const maxRows = params.get('limit') === '1' ? 5000 : 10_000
const rows = shallowRef<Product[]>([])
const loading = shallowRef<Progress>(true)
const sheet = useTemplateRef<DataSheetHandle>('sheet')
const lastSave = shallowRef<SheetChanges | null>(null)

onMounted(async () => {
  const size = 2000
  for (let page = 1; ; page++) {
    const res = await fetch(`/api/products?page=${page}&size=${size}&delay=${delay}`)
    const data = (await res.json()) as { items: Product[]; total: number }
    rows.value = rows.value.concat(data.items)
    loading.value = { done: rows.value.length, total: data.total }
    if (rows.value.length >= data.total || data.items.length === 0) break
  }
  loading.value = false
})

const onSave = (changes: SheetChanges) => {
  lastSave.value = changes
  console.log('save', changes)
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
        · status
        <code data-testid="status">{{ sheet?.status.changedCells ?? 0 }} / {{ sheet?.status.errorRows ?? 0 }}</code>
      </label>
    </div>
    <DataSheet
      ref="sheet"
      table-id="products"
      key-column="sku"
      :columns="productColumns"
      :rows="rows"
      :loading="loading"
      :max-rows="maxRows"
      :entity-name="{ one: 'product', other: 'products' }"
      @save="onSave"
    />
  </div>
</template>
