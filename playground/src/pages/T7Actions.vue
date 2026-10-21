<script setup lang="ts">
// T7 · Cell actions (hover/odak overlay'i) ve uygulamanın çizdiği hücreler (`cell`), üç yoğunlukta.
import { PhArrowSquareOut, PhCheck, PhClock, PhCopy, PhMagnifyingGlass, PhWarning, PhX } from '@phosphor-icons/vue'
import { DataTable, type ColumnDef } from '@swors/data-table'
import { h, ref } from 'vue'
import { settings } from '../settings'

interface Lot {
  id: number
  number: string
  product: { name: string; sku: string }
  produced: { done: number; total: number }
  inspection: 'lot_ready' | 'first_piece' | 'passed' | 'defects' | 'not_inspected'
  defects: number
  decision: { kind: 'pending' } | { kind: 'approved' | 'rejected'; at: string }
}

const lots = ref<Lot[]>([
  {
    id: 1,
    number: 'WO-26-0418',
    product: { name: 'Hydraulic cylinder HC-80', sku: 'HC-080-S' },
    produced: { done: 340, total: 500 },
    inspection: 'lot_ready',
    defects: 0,
    decision: { kind: 'pending' },
  },
  {
    id: 2,
    number: 'WO-26-0385',
    product: { name: 'Tipper cylinder TP-120', sku: 'TP-120-D' },
    produced: { done: 6, total: 50 },
    inspection: 'first_piece',
    defects: 0,
    decision: { kind: 'pending' },
  },
  {
    id: 3,
    number: 'WO-26-0389',
    product: { name: 'Hydraulic power unit HPU-5.5', sku: 'HPU-055' },
    produced: { done: 18, total: 20 },
    inspection: 'passed',
    defects: 0,
    decision: { kind: 'approved', at: '09:42' },
  },
  {
    id: 4,
    number: 'WO-26-0414',
    product: { name: 'Piston rod 40 × 600', sku: 'PRD-40-600' },
    produced: { done: 130, total: 250 },
    inspection: 'defects',
    defects: 2,
    decision: { kind: 'rejected', at: '08:15' },
  },
  {
    id: 5,
    number: 'WO-26-0398',
    product: { name: 'Cylinder mounting bracket CB-80', sku: 'CB-080' },
    produced: { done: 70, total: 200 },
    inspection: 'not_inspected',
    defects: 0,
    decision: { kind: 'pending' },
  },
])

const decide = (lot: Lot, kind: 'approved' | 'rejected') => {
  lot.decision = { kind, at: new Date().toTimeString().slice(0, 5) }
}

const INSPECTION = {
  lot_ready: { label: 'Lot 3 ready', icon: PhClock, cls: 'pg-badge-amber' },
  first_piece: { label: 'First piece', icon: PhMagnifyingGlass, cls: 'pg-badge-blue' },
  passed: { label: 'Passed', icon: PhCheck, cls: 'pg-badge-green' },
  defects: { label: 'Defects', icon: PhWarning, cls: 'pg-badge-red' },
  not_inspected: { label: 'Not inspected', icon: null, cls: 'pg-badge-gray' },
} as const

const actionColumns: Array<ColumnDef<Lot>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, width: 136 },
  {
    id: 'product.name',
    header: 'Product · hover',
    type: 'string',
    width: 200,
    actions: [
      { id: 'copy', label: 'Copy name', icon: PhCopy, run: (r) => navigator.clipboard?.writeText(r.product.name) },
      { id: 'open', label: 'Open product', icon: PhArrowSquareOut },
    ],
  },
  {
    id: 'always',
    header: 'reveal: always',
    type: 'string',
    accessor: (r) => r.product.name,
    width: 200,
    actions: [
      { id: 'copy', label: 'Copy name', icon: PhCopy, reveal: 'always' },
      { id: 'open', label: 'Open product', icon: PhArrowSquareOut, reveal: 'always' },
    ],
  },
  {
    id: 'three',
    header: 'Three actions',
    type: 'string',
    accessor: (r) => r.product.name,
    width: 200,
    actions: [
      { id: 'copy', label: 'Copy name', icon: PhCopy },
      { id: 'open', label: 'Open product', icon: PhArrowSquareOut },
      { id: 'stock', label: 'Stock by warehouse', icon: PhMagnifyingGlass },
    ],
  },
  { id: 'number2', header: 'Customer', type: 'string', accessor: () => 'Marmara Vinç' },
]

const customColumns: Array<ColumnDef<Lot>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, width: 136 },
  { id: 'product.name', header: 'Product', type: 'string', secondary: (r) => r.product.sku },
  {
    id: 'produced',
    header: 'Produced',
    unit: 'pcs',
    type: 'object',
    align: 'right',
    width: 176,
    cell: ({ row }) => {
      const { done, total } = row.produced
      return h('span', { class: 'pg-qty' }, [
        h('span', { class: 'pg-qty-track' }, [
          h('span', { class: 'pg-qty-fill', style: { width: `${(done / total) * 100}%` } }),
        ]),
        h('span', { class: 'pg-qty-text' }, [`${done}`, h('span', { class: 'pg-qty-total' }, ` / ${total}`)]),
      ])
    },
  },
  {
    id: 'inspection',
    header: 'Inspection',
    type: 'select',
    options: Object.entries(INSPECTION).map(([value, v]) => ({ value, label: v.label })),
    width: 150,
    cell: ({ row, formatted }) => {
      const spec = INSPECTION[row.inspection]
      return h('span', { class: ['pg-badge', spec.cls] }, [
        spec.icon ? h(spec.icon, { size: 12, weight: 'bold' }) : null,
        formatted,
        row.defects ? h('span', { class: 'pg-badge-count' }, String(row.defects)) : null,
      ])
    },
  },
  {
    id: 'decision',
    header: 'Decision',
    type: 'object',
    width: 220,
    cell: ({ row, density }) => {
      const d = row.decision
      if (d.kind === 'pending')
        return h('span', { class: 'pg-decide' }, [
          h(
            'button',
            {
              type: 'button',
              class: ['pg-btn', density === 'comfortable' ? 'is-md' : 'is-sm'],
              onClick: () => decide(row, 'approved'),
            },
            [h(PhCheck, { size: 14, class: 'is-green' }), 'Approve'],
          ),
          h(
            'button',
            {
              type: 'button',
              class: ['pg-btn', density === 'comfortable' ? 'is-md' : 'is-sm'],
              onClick: () => decide(row, 'rejected'),
            },
            [h(PhX, { size: 14, class: 'is-red' }), 'Reject'],
          ),
        ])
      return h('span', { class: 'pg-decided' }, [
        h(d.kind === 'approved' ? PhCheck : PhX, { size: 14, class: d.kind === 'approved' ? 'is-green' : 'is-red' }),
        d.kind === 'approved' ? 'Approved' : 'Rejected',
        h('span', { class: 'pg-qty-total' }, ` · ${d.at}`),
      ])
    },
  },
]
</script>

<template>
  <div class="pg-page pg-scroll">
    <h1>Cell actions · Product name</h1>
    <p class="pg-sub">
      Buttons sit over the end of the text on the row's own background · the column never changes width
    </p>
    <div class="pg-fixed" style="height: 290px">
      <DataTable
        table-id="t7-actions"
        :columns="actionColumns"
        :rows="lots"
        :density="settings.density"
        :entity-name="{ one: 'order', other: 'orders' }"
      />
    </div>
    <h1>Cells the app draws · always visible</h1>
    <p class="pg-sub">
      Quantity bar, custom badge and Approve / Reject through `cell`; the package keeps alignment, cut-off, empty value
      and density
    </p>
    <div class="pg-fixed" style="height: 330px">
      <DataTable
        table-id="t7-cells"
        :columns="customColumns"
        :rows="lots"
        :density="settings.density"
        :entity-name="{ one: 'order', other: 'orders' }"
      />
    </div>
  </div>
</template>

<style>
.pg-qty {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}
.pg-qty-track {
  width: 64px;
  height: 6px;
  border-radius: 999px;
  background: var(--dt-track);
  overflow: hidden;
}
.pg-qty-fill {
  display: block;
  height: 100%;
  background: var(--dt-n-dot);
}
.pg-qty-text {
  font-variant-numeric: tabular-nums;
}
.pg-qty-total {
  color: var(--dt-text-3);
}
.pg-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--dt-badge-h);
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: var(--tone-bg);
  color: var(--tone-fg);
}
.pg-badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--dt-surface);
  font-size: 11px;
}
.pg-badge-amber {
  --tone-bg: var(--dt-a-bg);
  --tone-fg: var(--dt-a-fg);
}
.pg-badge-blue {
  --tone-bg: var(--dt-b-bg);
  --tone-fg: var(--dt-b-fg);
}
.pg-badge-green {
  --tone-bg: var(--dt-g-bg);
  --tone-fg: var(--dt-g-fg);
}
.pg-badge-red {
  --tone-bg: var(--dt-r-bg);
  --tone-fg: var(--dt-r-fg);
}
.pg-badge-gray {
  --tone-bg: var(--dt-n-bg);
  --tone-fg: var(--dt-n-fg);
}
.pg-decide {
  display: inline-flex;
  gap: 6px;
}
.pg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 0 8px;
  border: 1px solid var(--dt-line-2);
  border-radius: var(--dt-radius-item);
  background: var(--dt-surface);
  color: var(--dt-text);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  box-shadow: var(--dt-shadow-sm);
  cursor: pointer;
}
.pg-btn.is-md {
  height: 28px;
}
.pg-btn.is-sm {
  height: 24px;
}
.pg-btn:hover {
  background: var(--dt-surface-3);
}
.pg-decided {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.is-green {
  color: var(--dt-g-dot);
}
.is-red {
  color: var(--dt-r-dot);
}
</style>
