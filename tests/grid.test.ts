// GridRoot / DataTable: roller (08 §1), klavye modeli (08 §2), guard (05 §7), skeleton, aksiyon overlay'i, yoğunluk.
import { PhCopy } from '@phosphor-icons/vue'
import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import DataTable from '../src/list/DataTable.vue'
import type { ColumnDef } from '../src/types'
import { flush, mockLayout } from './helpers/dom'

interface Order {
  id: number
  number: string
  product: { name: string; sku: string }
  status: string
  value: number
  dueAt: string
}

const rows: Order[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  number: `WO-26-${400 + i}`,
  product: { name: `Pump ${i}`, sku: `GP-${i}` },
  status: i % 2 ? 'done' : 'in_progress',
  value: 1000 * (i + 1),
  dueAt: '2026-10-18',
}))

const run = vi.fn()
const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, pinned: 'left', href: (r) => `/orders/${r.id}` },
  {
    id: 'product.name',
    header: 'Product',
    type: 'string',
    secondary: (r) => r.product.sku,
    actions: [
      { id: 'copy', label: 'Copy name', icon: PhCopy, run },
      { id: 'open', label: 'Open product', icon: PhCopy },
      { id: 'stock', label: 'Stock by warehouse', icon: PhCopy },
    ],
  },
  { id: 'status', header: 'Status', type: 'select', options: [{ value: 'done', label: 'Done', tone: 'green' }] },
  { id: 'value', header: 'Value', type: 'currency', currency: 'TRY' },
  { id: 'dueAt', header: 'Due date', type: 'date', overdue: true },
  {
    id: 'decide',
    header: 'Decision',
    type: 'object',
    cell: () => h('button', { type: 'button', class: 'approve' }, 'Approve'),
  },
]

beforeAll(mockLayout)

const mountTable = async (extra: Record<string, unknown> = {}) => {
  const w = mount(DataTable<Order>, {
    props: { tableId: 'orders', columns, rows, entityName: { one: 'order', other: 'orders' }, ...extra },
    attachTo: document.body,
  })
  await flush()
  return w
}

describe('roller ve yapı', () => {
  it('table, header, satır ve hücre rolleri (D38); aria-rowindex sayfa ofsetiyle', async () => {
    const w = await mountTable()
    const grid = w.get('[role="table"]')
    expect(grid.attributes('aria-label')).toBe('orders')
    expect(grid.attributes('aria-colcount')).toBe('7') // 6 sütun + ⋯ sütunu (birincil sütun var)
    expect(grid.attributes('aria-rowcount')).toBe('40') // istemci modunda toplam bilinir
    expect(w.findAll('[role="columnheader"][data-col]')).toHaveLength(6)
    const firstRow = w.get('.dt-row[data-index="0"]')
    expect(firstRow.attributes('role')).toBe('row')
    expect(firstRow.attributes('aria-rowindex')).toBe('2')
    expect(firstRow.findAll('[role="cell"][data-col]')).toHaveLength(6)
    // Sanal liste: 40 satırın hepsi değil, görünür + overscan.
    const rendered = w.findAll('.dt-row:not(.dt-row-skeleton)').length
    expect(rendered).toBeGreaterThan(10)
    expect(rendered).toBeLessThan(40)
    w.unmount()
  })
  it('birincil hücre gerçek link, sayısal sağa, sabit sütun sticky ofset değişkeni', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-10-21T10:00:00') }) // "3d late" sabit tarihe göre
    const w = await mountTable()
    const row = w.get('.dt-row[data-index="0"]')
    const primary = row.get('[data-col="number"]')
    expect(primary.classes()).toContain('is-pinned-start')
    expect(primary.attributes('style')).toContain('left: var(--dt-off-number)')
    expect(primary.get('a.dt-link').attributes('href')).toBe('/orders/1')
    const value = row.get('[data-col="value"]')
    expect(value.classes()).toEqual(expect.arrayContaining(['is-right', 'is-numeric']))
    expect(value.text()).toBe('1,000.00TRY')
    expect(row.get('[data-col="dueAt"]').text()).toBe('Oct 18 · 3d late')
    w.unmount()
    vi.useRealTimers()
  })
  it('ikinci satır yalnızca Comfortable', async () => {
    const std = await mountTable()
    expect(std.find('.dt-secondary').exists()).toBe(false)
    std.unmount()
    const cmf = await mountTable({ density: 'comfortable' })
    expect(cmf.get('.dt-row[data-index="0"] .dt-secondary').text()).toBe('GP-0')
    cmf.unmount()
  })
  it('loading + satır yok → 12 iskelet satır, aria-busy', async () => {
    const w = await mountTable({ rows: [], loading: true })
    expect(w.get('[role="table"]').attributes('aria-busy')).toBe('true')
    expect(w.findAll('.dt-row-skeleton')).toHaveLength(12)
    expect(w.findAll('.dt-sk').length).toBeGreaterThan(0)
    w.unmount()
  })
  it('aksiyon overlay: 3 aksiyon → ilk + ⋯', async () => {
    const w = await mountTable()
    const cell = w.get('.dt-row[data-index="0"] [data-col="product.name"]')
    const buttons = cell.findAll('.dt-cell-action')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.attributes('aria-label')).toBe('Copy name')
    expect(buttons[1]!.attributes('aria-label')).toBe('More')
    expect(cell.get('.dt-cell-content').text()).toBe('Pump 0')
    w.unmount()
  })
  it('description (D33): header tooltip ad + açıklama ve aria-describedby gizli açıklamaya; yoksa yalnızca ad', async () => {
    const w = await mountTable({
      columns: columns.map((c) => (c.id === 'value' ? { ...c, description: 'Net of discounts' } : c)),
    })
    const label = w.get('.dt-head-cell[data-col="value"] .dt-head-label')
    expect(label.attributes('data-dt-tip')).toBe('Value\nNet of discounts')
    expect(document.getElementById(label.attributes('aria-describedby')!)?.textContent).toBe('Net of discounts')
    expect(label.text()).not.toContain('Net of discounts') // erişilebilir ad değişmez
    await label.trigger('focusin')
    const tip = w.get('.dt-tip')
    expect(tip.text()).toContain('Net of discounts')
    expect(tip.classes()).toContain('is-multi')
    const plain = w.get('.dt-head-cell[data-col="status"] .dt-head-label')
    expect(plain.attributes('data-dt-tip')).toBe('Status')
    expect(plain.attributes('aria-describedby')).toBeUndefined()
    w.unmount()
  })
  it('rowError (D35): hatalı satırda is-error, ⋯ hücresinde ikon, satır ve ikon tooltip, aria-describedby; seçimde kalır; ⋯ yoksa ilk hücre', async () => {
    const w = await mountTable({
      selectable: true,
      rowError: (r: Order) => (r.id === 1 ? ['Open despatch', 'Locked by Ayşe'] : r.id === 3 ? '' : null),
    })
    const bad = w.get('.dt-row[data-index="0"]')
    expect(bad.classes()).toContain('is-error')
    const icon = bad.get('.dt-cell-menu .dt-row-error')
    expect(icon.attributes('data-dt-tip')).toBe('Open despatch\nLocked by Ayşe')
    expect(bad.attributes('data-dt-tip')).toBe('Open despatch\nLocked by Ayşe')
    expect(icon.attributes('role')).toBe('img')
    expect(bad.attributes('aria-describedby')).toBe(icon.attributes('id'))
    expect(bad.get('.dt-cell.is-primary').text()).toBe('WO-26-400') // numara kesilmez, ikon birincil hücrede değil
    const menuW = (x: typeof w) => (x.get('.dt-grid').element as HTMLElement).style.getPropertyValue('--dt-menu-w')
    expect(menuW(w)).toBe(
      'calc(16px + var(--dt-icon) - 2px + var(--dt-space) + 1 * var(--dt-control-h-sm) + 0 * var(--dt-space))',
    ) // sayfada hatalı satır var: ⋯ sütunu ikona yer açar
    for (const i of [1, 2]) {
      const ok = w.get(`.dt-row[data-index="${i}"]`)
      expect(ok.classes()).not.toContain('is-error')
      expect(ok.find('.dt-row-error').exists()).toBe(false)
      expect(ok.attributes('aria-describedby')).toBeUndefined()
    }
    await bad.get('.dt-select-box').trigger('click')
    expect(bad.classes()).toContain('is-selected')
    expect(bad.find('.dt-row-error').exists()).toBe(true)
    w.unmount()

    const w2 = await mountTable({ columns: columns.filter((c) => !c.primary), rowError: () => 'Oops' })
    const first = w2.get('.dt-row[data-index="0"]')
    expect(first.find('.dt-cell-menu').exists()).toBe(false)
    expect(first.findAll('.dt-cell')[0]!.find('.dt-row-error').exists()).toBe(true)
    expect(first.findAll('.dt-row-error')).toHaveLength(1)
    w2.unmount()

    const w3 = await mountTable({ rowError: () => null })
    expect(menuW(w3)).toBe('calc(16px + 1 * var(--dt-control-h-sm) + 0 * var(--dt-space))') // hata yok: yalnızca ⋯
    w3.unmount()
  })
})

describe('guard ve klavye', () => {
  it('hücredeki düğmeye tık satır tıklamasını tetiklemez; düz hücreye tık tetikler', async () => {
    const w = await mountTable()
    const cell = w.get('.dt-row[data-index="0"] [data-col="product.name"]')
    await cell.get('.dt-cell-action').trigger('mousedown')
    await cell.get('.dt-cell-action').trigger('click')
    expect(run).toHaveBeenCalledWith(rows[0])
    expect(w.emitted('row-click')).toBeUndefined()
    await cell.trigger('mousedown', { clientX: 10, clientY: 10 })
    await cell.trigger('click', { clientX: 10, clientY: 10 })
    expect(w.emitted('row-click')).toHaveLength(1)
    expect((w.emitted('row-click')![0]![0] as { row: Order }).row).toBe(rows[0])
    w.unmount()
  })
  it("satır klavyesi yok (D38): satır Tab durağı değil, widget'lar doğal Tab sırasında, ok tuşları satır gezmez", async () => {
    const w = await mountTable()
    const row0 = w.get('.dt-row[data-index="0"]')
    expect(row0.attributes('tabindex')).toBeUndefined()
    expect(row0.attributes('aria-selected')).toBeUndefined()
    // Ortak hücre render'ı (renderCell, CellActions) -1 verir; listede satır bunu kaldırır.
    for (const el of row0.findAll('a[href], button')) expect(el.attributes('tabindex')).toBeUndefined()
    expect(row0.find('button.approve').exists()).toBe(true)
    const link = row0.get('a.dt-link')
    ;(link.element as HTMLElement).focus()
    await link.trigger('keydown', { key: 'ArrowDown' })
    await flush()
    expect(document.activeElement).toBe(link.element)
    expect(w.find('.dt-row.is-focus').exists()).toBe(false)
    expect(w.emitted('row-open')).toBeUndefined()
    w.unmount()
  })
})
