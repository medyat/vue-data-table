<script setup lang="ts">
// T9 · States: sahte talep akışıyla her durum (design/T09-states). URL: ?s=normal|loading|slow|empty|error|stale|pageEmpty
import { DataTable, type TableError, type TableRequest } from '@swors/data-table'
import { ref } from 'vue'
import { makeOrders } from '../../server/mock-api'
import { orderColumns, type Order } from '../data/orders'

const SCENARIOS = ['normal', 'loading', 'slow', 'empty', 'error', 'stale', 'pageEmpty'] as const
type Scenario = (typeof SCENARIOS)[number]
const params = new URLSearchParams(location.search)
const scenario = ref<Scenario>((params.get('s') as Scenario) ?? 'normal')
const all = makeOrders(260)

const rows = ref<Order[]>([])
const hasMore = ref(false)
const error = ref<TableError>()
let calls = 0

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true })
  })

async function onRequest({ query, signal }: TableRequest) {
  calls++
  const s = scenario.value
  await sleep(s === 'loading' ? 1e9 : s === 'slow' ? 3000 : 600, signal)
  if (signal.aborted) return
  if (s === 'error' || (s === 'stale' && calls > 1)) {
    error.value = { message: "The server didn't answer in time.", id: '504 · req 8f3a1c2e' }
    return
  }
  error.value = undefined
  const q = query.search.toLocaleLowerCase('tr')
  const matching =
    s === 'empty'
      ? []
      : all.filter(
          (o) => !q || [o.number, o.product.name, o.customer].some((v) => v.toLocaleLowerCase('tr').includes(q)),
        )
  const { number, size } = query.page
  const start = (number - 1) * size
  rows.value = s === 'pageEmpty' && number > 1 ? [] : matching.slice(start, start + size)
  hasMore.value = s === 'pageEmpty' ? number === 1 : start + size < matching.length
}

function pick(s: Scenario) {
  scenario.value = s
  calls = 0
  rows.value = []
  error.value = undefined
  history.replaceState(null, '', `?s=${s}`)
}
</script>

<template>
  <div class="pg-page">
    <header class="pg-title">
      <h1>T9 · States</h1>
      <nav class="pg-sub" data-testid="scenarios">
        <button
          v-for="s in SCENARIOS"
          :key="s"
          type="button"
          class="dt-btn dt-btn-xs"
          :class="{ 'is-active': scenario === s }"
          @click="pick(s)"
        >
          {{ s }}
        </button>
      </nav>
    </header>
    <DataTable
      :key="scenario"
      table-id="t9-states"
      mode="server"
      :columns="orderColumns"
      :rows="rows"
      :has-more="hasMore"
      :error="error"
      :page-size="50"
      :entity-name="{ one: 'production order', other: 'production orders' }"
      @request="onRequest"
    >
      <template #empty>
        <div class="dt-state is-empty" role="status">
          <span class="dt-state-icon" aria-hidden="true">📦</span>
          <strong class="dt-state-title">No production orders yet</strong>
          <p class="dt-state-line">Orders you create or import show up here.</p>
          <div class="dt-state-actions">
            <button type="button" class="dt-btn dt-btn-primary">Create order</button>
            <button type="button" class="dt-btn">Import from CSV</button>
          </div>
        </div>
      </template>
    </DataTable>
  </div>
</template>
