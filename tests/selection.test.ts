// Seçim ve bulk bar (05 §6, D19, D20; 08 §3): checkbox / ⇧ aralık / header, klavye (X, ⇧↓, ⌘A, Esc), temizleme kuralları,
// bulk bar içeriği ve `run` çağrısı, toolbar varyantı, #selection-actions.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DataTable from '../src/list/DataTable.vue'
import type { BulkAction, ColumnDef } from '../src/types'
import { flush, mockLayout } from './helpers/dom'

interface Order {
  id: number
  number: string
  status: string
  value: number
}
const rows: Order[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  number: `WO-${100 + i}`,
  status: i % 2 ? 'done' : 'in_progress',
  value: 100 * (i + 1),
}))
const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, pinned: 'left', href: (r) => `/orders/${r.id}` },
  { id: 'status', header: 'Status', type: 'select', options: [{ value: 'done', label: 'Done' }] },
  { id: 'value', header: 'Value', type: 'int' },
]
const release = vi.fn()
const cancel = vi.fn(() => new Promise<void>(() => {}))
const bulkActions: Array<BulkAction<Order>> = [
  { id: 'release', label: 'Release', inBar: true, run: release },
  { id: 'reschedule', label: 'Reschedule', inBar: true, run: () => {} },
  { id: 'assign', label: 'Assign owner', inBar: true, run: () => {} },
  { id: 'print', label: 'Print job cards', inBar: true, run: () => {} }, // 4. inBar → ⋯'ye düşer
  { id: 'cancel', label: 'Cancel orders…', destructive: true, run: cancel },
  { id: 'hold', label: 'Put on hold', disabled: (rs) => (rs.length > 2 ? 'Too many' : false), run: () => {} },
]

beforeAll(mockLayout)
const mounted: Array<{ unmount: () => void }> = []
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})
const mountTable = async (extra: Record<string, unknown> = {}, slots?: Record<string, string>) => {
  const w = mount(DataTable<Order>, {
    props: { tableId: 'orders', columns, rows, selectable: true, bulkActions, ...extra },
    slots,
    attachTo: document.body,
  })
  await flush()
  mounted.push(w)
  return w
}
type W = Awaited<ReturnType<typeof mountTable>>
const rowAt = (w: W, i: number) => w.get(`.dt-row[data-index="${i}"]`)
const boxAt = (w: W, i: number) => rowAt(w, i).get('.dt-cell-select input')
const selected = (w: W) => (w.emitted('selection-change')?.at(-1)?.[0] as Order[] | undefined) ?? []
const bulk = (w: W) => w.find('.dt-bulk')

describe('seçim', () => {
  it('checkbox seçer (satır zemini, selection-change); ⇧ aralık; header kısmi → tümü → temiz', async () => {
    const w = await mountTable()
    expect(bulk(w).exists()).toBe(false)
    await boxAt(w, 0).trigger('click')
    await flush()
    expect(rowAt(w, 0).classes()).toContain('is-selected')
    expect(selected(w).map((r) => r.id)).toEqual([1])
    expect(bulk(w).text()).toContain('1 selected')
    await boxAt(w, 3).trigger('click', { shiftKey: true })
    await flush()
    expect(selected(w).map((r) => r.id)).toEqual([1, 2, 3, 4])
    const head = w.get('.dt-head-select input').element as HTMLInputElement
    expect(head.indeterminate).toBe(true)
    expect(head.checked).toBe(false)
    await w.get('.dt-head-select input').trigger('click')
    await flush()
    expect(selected(w)).toHaveLength(12)
    expect(head.checked).toBe(true)
    await w.get('.dt-head-select input').trigger('click')
    await flush()
    expect(selected(w)).toHaveLength(0)
    expect(bulk(w).exists()).toBe(false)
    w.unmount()
  })
  it('satır gövdesine tık seçmez; X / ⇧↓ / ⌘A satır kısayolu yok (D38); Esc temizler', async () => {
    const w = await mountTable()
    const cell = rowAt(w, 0).get('[data-col="status"]')
    await cell.trigger('mousedown', { clientX: 5, clientY: 5 })
    await cell.trigger('click', { clientX: 5, clientY: 5 })
    await flush()
    expect(w.emitted('row-click')).toHaveLength(1)
    expect(selected(w)).toHaveLength(0)
    for (const init of [{ key: 'x' }, { key: 'ArrowDown', shiftKey: true }, { key: 'a', metaKey: true }]) {
      await rowAt(w, 0).trigger('keydown', init)
      await flush()
    }
    expect(selected(w)).toHaveLength(0)
    await boxAt(w, 0).trigger('click')
    await flush()
    expect(selected(w)).toHaveLength(1)
    // Odak checkbox'tayken de (Tab durağı) Esc seçimi temizler.
    ;(boxAt(w, 0).element as HTMLElement).focus()
    boxAt(w, 0).element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flush()
    expect(selected(w)).toHaveLength(0)
    w.unmount()
  })
  it('D19: sıralama/arama/sayfa değişince temizlenir; refresh korur, yeni veride olmayan anahtar süzülür', async () => {
    const w = await mountTable({ mode: 'server', onRequest: () => {}, rows: rows.slice(0, 6) })
    await boxAt(w, 0).trigger('click')
    await boxAt(w, 1).trigger('click')
    await flush()
    expect(selected(w)).toHaveLength(2)
    await w.setProps({ rows: [rows[0]!, ...rows.slice(2, 6)] }) // refresh: 2 numaralı satır gitti
    await flush()
    expect(selected(w).map((r) => r.id)).toEqual([1])
    await w.get('.dt-head-cell[data-col="value"] .dt-head-label').trigger('click')
    await flush()
    expect(selected(w)).toHaveLength(0)
    await boxAt(w, 0).trigger('click')
    await flush()
    const input = w.get('.dt-search input').element as HTMLInputElement
    input.value = 'WO'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.waitFor(() => expect(selected(w)).toHaveLength(0))
    w.unmount()
  })
})

describe('bulk bar', () => {
  it('sayaç, en fazla 3 inBar, ⋯ kalanlar (yıkıcı en altta, pasif gerekçeli); run seçili satırlarla ve beklenmeden', async () => {
    const w = await mountTable()
    await boxAt(w, 0).trigger('click')
    await boxAt(w, 1).trigger('click')
    await boxAt(w, 2).trigger('click')
    await flush()
    const bar = bulk(w)
    expect(bar.attributes('role')).toBe('toolbar')
    expect(bar.get('.dt-bulk-count').text()).toBe('3 selected')
    const labels = bar
      .findAll('.dt-bulk-btn')
      .map((b) => b.text())
      .filter(Boolean)
    expect(labels).toEqual(['Release', 'Reschedule', 'Assign owner'])
    await bar
      .findAll('.dt-bulk-btn')
      .find((b) => b.text() === 'Release')!
      .trigger('click')
    expect(release).toHaveBeenCalledTimes(1)
    expect((release.mock.calls[0] as unknown[])[0]).toEqual(rows.slice(0, 3))
    const more = bar.get('.dt-bulk-more').element as HTMLElement
    more.focus()
    more.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await flush()
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    const text = (el: HTMLElement) =>
      [...el.querySelectorAll<HTMLElement>('.dt-menu-text > span')].map((s) => s.textContent?.trim()).join(' ')
    expect(items.map(text)).toEqual(['Print job cards', 'Put on hold Too many', 'Cancel orders…'])
    expect(items[1]!.getAttribute('data-disabled')).not.toBeNull()
    expect(items[2]!.classList.contains('is-destructive')).toBe(true)
    items[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(cancel).toHaveBeenCalledTimes(1) // Promise hiç çözülmese de paket beklemez
    await flush()
    bar.get('.dt-bulk-icon').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(selected(w)).toHaveLength(0)
    w.unmount()
  })
  it('bulk when(rows) false → bar ve ⋯ menüsünde yok (D36); description bar düğmesinde tooltip, menüde ikinci satır', async () => {
    const w = await mountTable({
      bulkActions: [
        { id: 'release', label: 'Release', inBar: true, description: 'Send to the line', run: () => {} },
        {
          id: 'archive',
          label: 'Archive',
          inBar: true,
          when: (rs: Order[]) => rs.every((r) => r.status === 'done'),
          run: () => {},
        },
        { id: 'hold', label: 'Put on hold', description: 'Pause work', run: () => {} },
        { id: 'export', label: 'Export', when: () => false, run: () => {} },
      ],
    })
    const labels = () =>
      bulk(w)
        .findAll('.dt-bulk-btn')
        .map((b) => b.text())
        .filter(Boolean)
    await boxAt(w, 1).trigger('click') // yalnızca done → Archive görünür
    await flush()
    expect(labels()).toEqual(['Release', 'Archive'])
    await boxAt(w, 0).trigger('click') // in_progress eklendi → Archive gizlenir
    await flush()
    expect(labels()).toEqual(['Release'])
    const bar = bulk(w)
    expect(
      bar
        .findAll('.dt-bulk-btn')
        .find((b) => b.text() === 'Release')!
        .attributes('data-dt-tip'),
    ).toBe('Send to the line')
    const more = bar.get('.dt-bulk-more').element as HTMLElement
    more.focus()
    more.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await flush()
    const text = (el: HTMLElement) =>
      [...el.querySelectorAll<HTMLElement>('.dt-menu-text > span')].map((s) => s.textContent?.trim()).join(' ')
    expect([...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].map(text)).toEqual([
      'Put on hold Pause work',
    ])
    w.unmount()
  })
  it("selection-bar=toolbar toolbar'ın yerini alır; #selection-actions aksiyon alanını değiştirir; clearSelection handle'da", async () => {
    const w = await mountTable(
      { selectionBar: 'toolbar' },
      {
        'selection-actions': '<button class="custom" @click="params.clear()">Custom {{ params.rows.length }}</button>',
      },
    )
    expect(w.find('.dt-toolbar').exists()).toBe(true)
    await boxAt(w, 0).trigger('click')
    await flush()
    expect(w.find('.dt-toolbar').exists()).toBe(false)
    const bar = w.get('.dt-bulk.is-toolbar')
    expect(bar.text()).toContain('1 selected')
    expect(bar.get('.custom').text()).toBe('Custom 1')
    expect(bar.find('.dt-bulk-btn').exists()).toBe(false)
    await bar.get('.custom').trigger('click')
    await flush()
    expect(w.find('.dt-toolbar').exists()).toBe(true)
    await boxAt(w, 0).trigger('click')
    await flush()
    ;(w.vm as unknown as { clearSelection: () => void }).clearSelection()
    await flush()
    expect(selected(w)).toHaveLength(0)
    w.unmount()
  })
})
