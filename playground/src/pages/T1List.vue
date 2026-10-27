<script setup lang="ts">
// T1 · List screen (Faz 2–3a; T2 filtreleme aynı ekranda): sunucu modu — sahte Laravel API'si (/api/orders), arama, sıralama,
// sayfalama, Count total, filtreler (JSON `filters`), Display, ⋯ (Refresh / Export / Import / Print / Auto-refresh), birincil aksiyon.
// Görünümler: sistem görünümleri `orderViews`, kişisel görünümler plugin'deki localStorage adapter'ında (T3: hazır görünümler).
// Seçim + bulk bar (T5), satır menüsü ve expand (T6): aksiyonlar yalnızca konsola yazar (iş mantığı uygulamanın, D20).
// Sunucu senaryosu başlıktaki seçimle ya da URL ile: ?delay=800 ?fail=1 ?failAfter=1 ?size=500; ?bar=toolbar seçim çubuğu toolbar'da.
import { PhCalendarBlank, PhPencilSimple, PhPlay, PhPlus, PhUser } from '@phosphor-icons/vue'
import {
  DataTable,
  type BulkAction,
  type CountRequest,
  type RowAction,
  type RowClickMode,
  type TableError,
  type TableRequest,
} from '@swors/data-table'
import { ref, useTemplateRef } from 'vue'
import { orderColumns, orderViews, type Order } from '../data/orders'

const rows = ref<Order[]>([])
/** Toplu aksiyonun kısmi hatası (D35): harita uygulamada, paket yalnızca okur. */
const rowErrors = ref(new Map<number, string>())
const hasMore = ref(false)
const total = ref<number>()
const error = ref<TableError>()
const params = new URLSearchParams(location.search)
let calls = 0
/** Seçim URL'yi değiştirir, sayfa yeniden yüklenir; e2e aynı parametreleri doğrudan kullanır. */
const SCENARIOS = [
  ['', 'Normal'],
  ['?delay=1500', 'Slow server (1.5 s)'],
  ['?fail=1', 'Load fails'],
  ['?failAfter=1', 'Refresh fails (stale data)'],
  ['?size=500', 'Page size 500'],
] as const
const search = location.search
const go = (e: Event) => (location.search = (e.target as HTMLSelectElement).value)
const rowClick = ref<RowClickMode>('none')
const table = useTemplateRef<{ clearSelection: () => void }>('table')

const bulkActions: Array<BulkAction<Order>> = [
  {
    id: 'release',
    label: 'Release',
    description: 'Send the selected orders to the line',
    icon: PhPlay,
    inBar: true,
    // D35 demo: her üçüncü satır sunucuda reddedilmiş gibi haritaya yazılır; refresh'te id aynı kaldığı için işaret kalır.
    run: (rows) => {
      rowErrors.value = new Map(rows.filter((_, i) => i % 3 === 2).map((r) => [r.id, 'Open despatch DS-1042']))
      console.log('bulk release', rows.length, 'failed', rowErrors.value.size)
    },
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    icon: PhCalendarBlank,
    inBar: true,
    run: (rows) => console.log('bulk reschedule', rows.length),
  },
  {
    id: 'assign',
    label: 'Assign owner',
    icon: PhUser,
    inBar: true,
    run: (rows) => console.log('bulk assign', rows.length),
  },
  { id: 'hold', label: 'Put on hold', run: (rows) => console.log('bulk hold', rows.length) },
  {
    // D36: yalnızca hepsi Done seçiliyken görünür
    id: 'archive',
    label: 'Archive',
    when: (rows) => rows.every((r) => r.status === 'done'),
    run: (rows) => console.log('bulk archive', rows.length),
  },
  { id: 'priority', label: 'Change priority…', run: (rows) => console.log('bulk priority', rows.length) },
  { id: 'print', label: 'Print job cards', run: (rows) => console.log('bulk print', rows.length) },
  {
    id: 'copy',
    label: 'Copy order numbers',
    run: (rows) => void navigator.clipboard?.writeText(rows.map((r) => r.number).join('\n')),
  },
  {
    id: 'cancel',
    label: 'Cancel orders…',
    destructive: true,
    disabled: (rows) => (rows.every((r) => r.status === 'done') ? 'All already done' : false),
    run: (rows) => {
      console.log('bulk cancel', rows.length)
      table.value?.clearSelection()
    },
  },
]
const rowActions: Array<RowAction<Order>> = [
  {
    // D36: yalnızca Done satırlarda ⋯'nın solunda kalem; menüde de var
    id: 'edit',
    label: 'Edit',
    description: 'Open the order in the editor',
    icon: PhPencilSimple,
    inline: true,
    when: (r) => r.status === 'done',
    run: (r) => console.log('edit', r.number),
  },
  {
    id: 'release',
    label: 'Release',
    disabled: (r) => (r.status === 'in_progress' ? 'Already running' : r.status === 'done' ? true : false),
    run: (r) => console.log('release', r.number),
  },
  { id: 'reschedule', label: 'Reschedule…', run: (r) => console.log('reschedule', r.number) },
  { id: 'hold', label: 'Put on hold', run: (r) => console.log('hold', r.number) },
  {
    id: 'archive',
    label: 'Archive',
    // D34: yetki örneği — yalnızca bitmiş siparişte görünür (pasif değil, yok)
    when: (r) => r.status === 'done',
    run: (r) => console.log('archive', r.number),
  },
  { id: 'cancel', label: 'Cancel order…', destructive: true, run: (r) => console.log('cancel', r.number) },
]
/** Alt satır için sahte operasyonlar (aynı sipariş → aynı liste); gerçek uygulamada slot bileşeni çeker. */
const OPS = ['Cutting', 'CNC machining', 'Welding', 'Assembly', 'Pressure test', 'Painting and packing']
const CENTERS = ['Saw SC-2', 'CNC-04', 'Robot cell W-1', 'Line 2', 'Test bench T-1', 'Paint shop']
const operations = (o: Order) =>
  Array.from({ length: 3 + (o.id % 3) }, (_, i) => {
    const k = (o.id + i) % OPS.length
    const done = i < Math.round(((3 + (o.id % 3)) * o.produced) / 100)
    return { op: (i + 1) * 10, name: OPS[k], center: CENTERS[k], status: done ? 'Done' : 'In progress' }
  })

async function onRequest({ query, signal }: TableRequest) {
  const q = new URLSearchParams({ page: String(query.page.number), size: String(query.page.size), q: query.search })
  if (query.filters.length) q.set('filters', JSON.stringify(query.filters))
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
      <label>
        Row click
        <select v-model="rowClick">
          <option value="none">None (default)</option>
          <option value="open">Open record</option>
          <option value="expand">Expand details</option>
        </select>
      </label>
      <label>
        Server
        <select :value="search" @change="go">
          <option v-for="[q, label] in SCENARIOS" :key="q" :value="q">{{ label }}</option>
        </select>
      </label>
    </header>
    <DataTable
      ref="table"
      table-id="production-orders"
      mode="server"
      countable
      selectable
      :selection-bar="params.get('bar') === 'toolbar' ? 'toolbar' : 'floating'"
      :bulk-actions="bulkActions"
      :row-actions="rowActions"
      :row-error="(r) => rowErrors.get(r.id)"
      :row-click="rowClick"
      expand
      :auto-refresh="30"
      :page-size="Number(params.get('size') ?? 100)"
      :columns="orderColumns"
      :views="orderViews"
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
      @row-open="(p) => (p.event.preventDefault(), console.log('open', p.href))"
    >
      <template #expanded="{ row }">
        <div class="pg-ops">
          <table class="pg-ops-table">
            <thead>
              <tr>
                <th>Op</th>
                <th>Operation</th>
                <th>Work center</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="op in operations(row)" :key="op.op">
                <td class="pg-mono">{{ op.op }}</td>
                <td>{{ op.name }}</td>
                <td>{{ op.center }}</td>
                <td>{{ op.status }}</td>
              </tr>
            </tbody>
          </table>
          <div class="pg-ops-foot">
            <span>{{ operations(row).length }} operations · Line {{ (row.id % 2) + 1 }} routing</span>
            <a href="#">Open routing →</a>
          </div>
        </div>
      </template>
      <template #toolbar-end="{ compact }">
        <button
          type="button"
          class="dt-btn dt-btn-primary has-icon"
          :class="{ 'dt-btn-icon': compact }"
          aria-label="New order"
        >
          <PhPlus :size="compact ? 18 : 16" aria-hidden="true" />
          <span v-if="!compact">New order</span>
        </button>
      </template>
    </DataTable>
  </div>
</template>

<style>
/* Alt satır içeriği uygulamanın (handoff 03 §8 örneği): mini tablo 8 px yarıçap, 34 px satırlar, özet satırı. */
.pg-ops {
  max-width: 920px;
}
.pg-ops-table {
  width: 100%;
  border: 1px solid var(--dt-line);
  border-radius: var(--dt-radius-inner);
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  background: var(--dt-surface);
  font-size: 13px;
}
.pg-ops-table th,
.pg-ops-table td {
  height: 34px;
  padding: 0 12px;
  text-align: left;
  border-bottom: 1px solid var(--dt-line);
}
.pg-ops-table th {
  background: var(--dt-surface-2);
  color: var(--dt-text-2);
  font-size: 12px;
  font-weight: 500;
}
.pg-ops-table tr:last-child td {
  border-bottom: 0;
}
.pg-mono {
  font-family: var(--dt-font-mono);
  font-size: var(--dt-mono-fs);
}
.pg-ops-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: var(--dt-text-2);
  font-size: 12.5px;
}
.pg-ops-foot a {
  color: var(--dt-text);
  font-weight: 500;
  text-decoration: none;
}
</style>
