<script setup lang="ts">
// T3 · Views (design/T03-views; D30: paylaşım yok): bellek içi adapter, tasarımdaki gibi hazır kişisel görünümler, kullanıcı
// varsayılanı "Gebze · this week". İstemci modu; sayfa yenilenince kayıtlar sıfırlanır.
import {
  createContext,
  DATA_TABLE_KEY,
  DataTable,
  type Preferences,
  type View,
  type ViewsAdapter,
} from '@medyat/vue-data-table'
import { provide } from 'vue'
import { makeOrders } from '../../server/mock-api'
import { orderColumns, orderViews } from '../data/orders'
import { settings } from '../settings'

const seed: View[] = [
  {
    id: 'gebze-week',
    name: 'Gebze · this week',
    kind: 'personal',
    state: {
      filters: [
        { column: 'plant', op: 'in', value: ['Gebze'] },
        { column: 'dueAt', op: 'within', value: { preset: 'this_week' } },
      ],
      sort: [{ column: 'dueAt', dir: 'asc' }],
      columns: { visible: ['number', 'product.name', 'customer', 'status', 'produced', 'owner', 'dueAt', 'value'] },
    },
  },
  {
    id: 'dilovasi-next',
    name: 'Dilovası · next week',
    kind: 'personal',
    state: {
      filters: [
        { column: 'plant', op: 'in', value: ['Dilovası'] },
        { column: 'dueAt', op: 'within', value: { preset: 'next_7_days' } },
      ],
    },
  },
  {
    id: 'rush',
    name: 'Rush orders',
    kind: 'personal',
    state: {
      filters: [{ column: 'value', op: 'gte', value: 250000, currency: 'TRY' }],
      sort: [{ column: 'value', dir: 'desc' }],
    },
  },
]

/** Sunucu adapter'ının yerine geçen bellek içi örnek. */
function memoryViews(initial: View[]): ViewsAdapter {
  let views = [...initial]
  const delay = () => new Promise((r) => setTimeout(r, 150))
  return {
    async list() {
      await delay()
      return [...views]
    },
    async create(_t, input) {
      await delay()
      const v: View = { id: `v-${Date.now()}`, name: input.name, kind: 'personal', state: input.state }
      views = [...views, v]
      return v
    },
    async update(_t, id, patch) {
      await delay()
      views = views.map((v) => (v.id === id ? { ...v, ...patch, state: patch.state ?? v.state } : v))
      return views.find((v) => v.id === id)!
    },
    async remove(_t, id) {
      await delay()
      views = views.filter((v) => v.id !== id)
    },
  }
}
let prefs: Partial<Preferences> = { defaultViewId: 'gebze-week' }
provide(
  DATA_TABLE_KEY,
  createContext({
    locale: settings.locale,
    viewsAdapter: memoryViews(seed),
    preferences: {
      get: () => prefs,
      set: (_t: string, p: Partial<Preferences>) => {
        prefs = { ...prefs, ...p }
      },
    },
  }),
)
const rows = makeOrders(300)
</script>

<template>
  <div class="pg-page">
    <header class="pg-title">
      <span class="pg-crumb">Production</span>
      <span class="pg-crumb-sep" aria-hidden="true">/</span>
      <h1>Production orders</h1>
      <span class="pg-sub">Saved views demo · in-memory adapter</span>
    </header>
    <DataTable
      table-id="t3-views"
      :columns="orderColumns"
      :views="orderViews"
      :rows="rows"
      :entity-name="{ one: 'order', other: 'orders' }"
    />
  </div>
</template>
