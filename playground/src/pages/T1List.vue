<script setup lang="ts">
// T1 · List screen (Faz 2): sunucu modu — sahte Laravel API'si (/api/orders), arama, sıralama, sayfalama, Count total,
// Display, ⋯ (Refresh / Export / Import / Print / Auto-refresh), birincil aksiyon. URL: ?delay=800 ?fail=1 ?failAfter=1 ?size=500
import { PhPlus } from '@phosphor-icons/vue'
import { DataTable, type CountRequest, type TableError, type TableRequest } from '@swors/data-table'
import { ref } from 'vue'
import { orderColumns, type Order } from '../data/orders'

const rows = ref<Order[]>([])
const hasMore = ref(false)
const total = ref<number>()
const error = ref<TableError>()
const params = new URLSearchParams(location.search)
let calls = 0

async function onRequest({ query, signal }: TableRequest) {
  const q = new URLSearchParams({ page: String(query.page.number), size: String(query.page.size), q: query.search })
  const s = query.sort[0]
  if (s) {
    q.set('sort', s.column)
    q.set('dir', s.dir)
  }
  if (params.get('delay')) q.set('delay', params.get('delay')!)
  const failAfter = Number(params.get('failAfter') ?? Infinity)
  if (params.get('fail') === '1' || ++calls > failAfter) q.set('fail', '1')
  try {
    const res = await fetch(`/api/orders?${q}`, { signal })
    const body = (await res.json()) as { items: Order[]; hasMore: boolean; message?: string }
    if (!res.ok) throw new Error(body.message)
    error.value = undefined
    rows.value = body.items
    hasMore.value = body.hasMore
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    error.value = { message: (e as Error).message, id: `${500} · req ${calls.toString(16).padStart(8, '0')}` }
  }
}
async function onCount({ query, signal }: CountRequest) {
  const res = await fetch(`/api/orders/count?q=${encodeURIComponent(query.search)}`, { signal })
  total.value = ((await res.json()) as { total: number }).total
}
</script>

<template>
  <div class="pg-page">
    <header class="pg-title">
      <span class="pg-crumb">Production</span>
      <span class="pg-crumb-sep" aria-hidden="true">/</span>
      <h1>Production orders</h1>
    </header>
    <DataTable
      table-id="production-orders"
      mode="server"
      countable
      :auto-refresh="30"
      :page-size="Number(params.get('size') ?? 100)"
      :columns="orderColumns"
      :rows="rows"
      :has-more="hasMore"
      :total="total"
      :error="error"
      :entity-name="{ one: 'order', other: 'orders' }"
      @request="onRequest"
      @count="onCount"
      @export="(p) => console.log('export', p)"
      @import="() => console.log('import')"
      @print="(p) => console.log('print', p)"
      @row-open="(r) => console.log('open', r.number)"
    >
      <template #toolbar-end="{ compact }">
        <button
          type="button"
          class="dt-btn dt-btn-primary has-icon"
          :class="{ 'dt-btn-icon': compact }"
          aria-label="New order"
        >
          <PhPlus :size="16" aria-hidden="true" />
          <span v-if="!compact">New order</span>
        </button>
      </template>
    </DataTable>
  </div>
</template>
