// useColumnLayout: hibrit genişlik (--cols), sabit sütun ofsetleri, resize → px, görünürlük (05 §4, 01 · TanStack sınırı).
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useColumnLayout, type ColumnLayoutApi } from '../src/core/columns/useColumnLayout'
import type { ColumnDef } from '../src/types'

interface Order {
  id: number
  number: string
  product: { name: string }
  customer: string
  value: number
  dueAt: string
}

const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true },
  { id: 'product.name', header: 'Product', type: 'string' },
  { id: 'customer', header: 'Customer', type: 'string' },
  { id: 'value', header: 'Value', type: 'currency', currency: 'TRY' },
  { id: 'dueAt', header: 'Due date', type: 'date', hidden: true },
  { id: 'actions', header: '', type: 'object', width: 56, alwaysVisible: true },
]
const rows: Order[] = [
  { id: 7, number: 'WO-1', product: { name: 'Pump' }, customer: 'Acme', value: 10, dueAt: '2026-10-21' },
]

function setup() {
  let api!: ColumnLayoutApi<Order>
  const cols = ref(columns)
  mount(
    defineComponent({
      setup() {
        api = useColumnLayout<Order>({ columns: cols, rows, layout: { pinned: { left: [], right: ['actions'] } } })
        return () => null
      },
    }),
  )
  return { api, cols }
}

describe('useColumnLayout', () => {
  it('--cols: sabitler px, orta sütunlar minmax, bölge sonunda auto', () => {
    const { api } = setup()
    expect(api.colsVar.value).toBe('136px minmax(160px, 1.2fr) minmax(160px, 1.2fr) 148px auto 56px')
    expect(api.minWidth.value).toBe(136 + 160 + 160 + 148 + 56)
    expect(api.columns.value.map((c) => c.id)).toEqual(['number', 'product.name', 'customer', 'value', 'actions'])
  })
  it('sabit sütun ofsetleri CSS değişkeni olarak, kenar işareti', () => {
    const { api } = setup()
    const [number, product, , , actions] = api.columns.value
    expect(number).toMatchObject({ pinned: 'start', pinEdge: true, offsetVar: '--dt-off-number' })
    expect(actions).toMatchObject({ pinned: 'end', pinEdge: true })
    expect(product).toMatchObject({ pinned: null, pinEdge: false, offsetVar: '--dt-off-product_name' })
    expect(api.offsetVars.value).toEqual({ '--dt-off-number': '0px', '--dt-off-actions': '0px' })
  })
  it('resize: px olur, en az 80, satır sütun listesi değişmez', async () => {
    const { api } = setup()
    const before = api.columns.value
    api.setWidth('customer', 184)
    await nextTick()
    expect(api.colsVar.value).toContain('184px')
    expect(api.columns.value).toBe(before) // resize satırları yeniden çizdirmez
    api.setWidth('customer', 10)
    await nextTick()
    expect(api.widthOf('customer')).toBe(80)
    expect(api.resizing.value).toBeNull()
  })
  it('kaydedilen genişlik min/max ile kırpılır: görünümden gelen 28 → 80, state ve resolve aynı', async () => {
    const { api } = setup()
    api.reset({ widths: { customer: 28, 'product.name': 200 } })
    await nextTick()
    expect(api.state.value.widths).toEqual({ customer: 80, 'product.name': 200 })
    expect(api.resolve({ widths: { customer: 28 } }).widths).toEqual({ customer: 80 })
  })
  it('görünürlük: gizle / göster', async () => {
    const { api } = setup()
    api.setVisible('customer', false)
    await nextTick()
    expect(api.columns.value.map((c) => c.id)).not.toContain('customer')
    api.setVisible('dueAt', true)
    await nextTick()
    expect(api.columns.value.map((c) => c.id)).toContain('dueAt')
  })
  it('değer nokta yolundan, satır kimliği rowKey ile', () => {
    const { api } = setup()
    expect(api.rowId(rows[0]!)).toBe('7')
    expect(api.columns.value[1]!.def.header).toBe('Product')
  })
  it('birincil sütun tanımda pinned olmadan da sola sabit (D45)', () => {
    const { api } = setup()
    expect(api.state.value.pinned.left).toEqual(['number'])
    api.reset({ pinned: { left: [], right: [] } })
    expect(api.state.value.pinned.left).toEqual(['number'])
  })
  it('arrange: konumsal sabitleme — birincilden sonraki ilk N ve son M görünür sütun; gizli sayılmaz (D45)', async () => {
    const { api } = setup()
    const order = ['number', 'customer', 'dueAt', 'product.name', 'value', 'actions']
    api.arrange({ order, visible: ['number', 'customer', 'product.name', 'value', 'actions'], start: 2, end: 1 })
    await nextTick()
    expect(api.state.value.pinned).toEqual({ left: ['number', 'customer', 'product.name'], right: ['actions'] })
    expect(api.columns.value.map((c) => [c.id, c.pinned])).toEqual([
      ['number', 'start'],
      ['customer', 'start'],
      ['product.name', 'start'],
      ['value', null],
      ['actions', 'end'],
    ])
    // Dialog listesi ekrandaki sırayla: sabitler başta/sonda, gizli sütun yerinde.
    expect(api.panel.value.map((c) => c.id)).toEqual(['number', 'customer', 'product.name', 'dueAt', 'value', 'actions'])
    expect(api.panel.value[0]).toMatchObject({ fixed: true })
    api.arrange({ order, visible: ['number', 'customer', 'value'], start: 0, end: 2 })
    await nextTick()
    expect(api.state.value.pinned).toEqual({ left: ['number'], right: ['customer', 'value'] })
  })
  it('required sütun gizlenemez: dialog satırı kilitli, görünümde gizli verilse de görünür, setVisible(false) etkisiz', async () => {
    let api!: ColumnLayoutApi<Order>
    const cols = ref<Array<ColumnDef<Order>>>(
      columns.map((c) => (c.id === 'customer' ? { ...c, required: true, hidden: true } : c)),
    )
    mount(
      defineComponent({
        setup() {
          api = useColumnLayout<Order>({ columns: cols, rows, layout: { visible: ['number', 'value'] } })
          return () => null
        },
      }),
    )
    expect(api.panel.value.find((c) => c.id === 'customer')).toMatchObject({ canHide: false, visible: true })
    api.setVisible('customer', false)
    await nextTick()
    expect(api.columns.value.map((c) => c.id)).toContain('customer')
  })
  it('arrange genişlikleri korur', async () => {
    const { api } = setup()
    api.setWidth('customer', 220)
    api.arrange({ order: api.state.value.order, visible: api.state.value.visible, start: 1, end: 0 })
    await nextTick()
    expect(api.widthOf('customer')).toBe(220)
  })
})
