// Faz 1 kabul kriteri (tip testi, vue-tsc ile koşar): `cell` bağlamı tipli — `row: Order`, `value` tipe göre daralır,
// yanlış prop derleme hatası. Çalışma zamanı testi değildir; `pnpm typecheck` bu dosyayı dahil eder.
import { h } from 'vue'
import type { ColumnDef } from '../../src/types'

interface Order {
  id: number
  number: string
  qty: number | null
  status: 'draft' | 'done'
  dueAt: string
}

export const ok: Array<ColumnDef<Order>> = [
  {
    id: 'qty',
    header: 'Qty',
    type: 'int',
    cell: ({ row, value, formatted }) => {
      const n: number | null = value // int → number | null
      const num: string = row.number // row: Order
      return n !== null && n > 100 ? h('b', `${formatted} ${num}`) : formatted
    },
  },
  {
    id: 'status',
    header: 'Status',
    type: 'select',
    options: [{ value: 'draft', label: 'Draft' }],
    cell: ({ value }) => String(value satisfies string | number | null),
  },
  { id: 'dueAt', header: 'Due', type: 'date', overdue: (r) => r.status !== 'done' },
  { id: 'number', header: 'No', type: 'id', primary: true, href: (r) => `/orders/${r.id}` },
]

export const bad: Array<ColumnDef<Order>> = [
  // @ts-expect-error int sütununda `value` number | null; string'e atanamaz
  { id: 'qty', header: 'Qty', type: 'int', cell: ({ value }) => (value as string).toUpperCase() },
  // @ts-expect-error select için `options` zorunlu
  { id: 'status', header: 'Status', type: 'select' },
  // @ts-expect-error currency için `currency` zorunlu
  { id: 'qty', header: 'Qty', type: 'currency' },
  // @ts-expect-error `decimalPlaces` yalnızca float/percentage/currency'de
  { id: 'number', header: 'No', type: 'string', decimalPlaces: 2 },
  // @ts-expect-error overdue callback'i Order alır; bilinmeyen alan hata
  { id: 'dueAt', header: 'Due', type: 'date', overdue: (r) => r.nope === 1 },
  // @ts-expect-error bilinmeyen tip
  { id: 'number', header: 'No', type: 'custom' },
]
