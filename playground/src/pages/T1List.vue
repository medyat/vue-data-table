<script setup lang="ts">
// T1 · List screen (Faz 1: yalnızca ızgara; toolbar/footer Faz 2, seçim ve satır menüsü Faz 4).
import { DataTable } from '@swors/data-table'
import { onMounted, ref } from 'vue'
import { loadOrders, orderColumns, type Order } from '../data/orders'
import { settings } from '../settings'

const rows = ref<Order[]>([])
const loading = ref(true)
onMounted(async () => {
  rows.value = await loadOrders(500)
  loading.value = false
})
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
      :columns="orderColumns"
      :rows="rows"
      :loading="loading"
      :density="settings.density"
      :entity-name="{ one: 'order', other: 'orders' }"
      @row-open="(r) => console.log('open', r.number)"
    />
  </div>
</template>
