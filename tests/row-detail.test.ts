// Satır etkileşimleri (05 §4, §7, D6, D28; 08 §2): satır menüsü (⋯, sağ tık, ⇧F10; Open / Open in new tab / Copy; uygulama
// aksiyonları), row-open sözleşmesi, row-click modları, expand (chevron, → ←, slot, close, sorgu değişince kapanır),
// sayfa değişiminde odağın anahtarla geri gelmesi.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DataTable from '../src/list/DataTable.vue'
import type { ColumnDef, RowAction } from '../src/types'
import { flush, mockLayout } from './helpers/dom'

interface Order {
  id: number
  number: string
  status: string
}
const rows: Order[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  number: `WO-${100 + i}`,
  status: i % 2 ? 'done' : 'in_progress',
}))
const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, href: (r) => `/orders/${r.id}` },
  { id: 'status', header: 'Status', type: 'string' },
]
const run = vi.fn()
const rowActions: Array<RowAction<Order>> = [
  { id: 'cancel', label: 'Cancel order…', destructive: true, run },
  { id: 'release', label: 'Release', disabled: (r) => (r.status === 'in_progress' ? 'Already running' : false), run },
  { id: 'hold', label: 'Put on hold', run },
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
    props: {
      tableId: 'orders',
      columns,
      rows,
      rowActions,
      onRowOpen: (p: { event: MouseEvent }) => p.event.preventDefault(), // jsdom navigasyon yapamaz
      ...extra,
    },
    slots,
    attachTo: document.body,
  })
  await flush()
  mounted.push(w)
  return w
}
type W = Awaited<ReturnType<typeof mountTable>>
const rowAt = (w: W, i: number) => w.get(`.dt-row[data-index="${i}"]`)
const menuItems = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
/** İki satırlı öğe: etiket + gerekçe boşlukla; kbd dahil. */
const itemText = (el: HTMLElement) => {
  const parts = [...el.querySelectorAll<HTMLElement>('.dt-menu-text > span')].map((s) => s.textContent?.trim() ?? '')
  return (parts.length ? parts.join(' ') : (el.textContent ?? '')).replace(/\s+/g, ' ').trim()
}
const openMenu = async (w: W, i: number) => {
  const more = rowAt(w, i).get('.dt-row-more').element as HTMLElement
  more.focus()
  more.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  await flush()
}

describe('satır menüsü ve row-open', () => {
  it('⋯ yalnızca birincil sütun ya da rowActions varken; menü: Open ↵ (href) · Open in new tab · Copy Order no. · ─ · aksiyonlar, yıkıcı en altta', async () => {
    const w = await mountTable()
    expect(rowAt(w, 0).find('.dt-row-more').exists()).toBe(true)
    await openMenu(w, 0)
    const items = menuItems()
    expect(items.map(itemText)).toEqual([
      'Open ↵',
      'Open in new tab',
      'Copy Order no.',
      'Release Already running',
      'Put on hold',
      'Cancel order…',
    ])
    expect(items[0]!.getAttribute('href')).toBe('/orders/1')
    expect(items[1]!.getAttribute('target')).toBe('_blank')
    expect(items[3]!.getAttribute('data-disabled')).not.toBeNull()
    expect(items[5]!.classList.contains('is-destructive')).toBe(true)
    items[4]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(run).toHaveBeenCalledWith(rows[0])
    w.unmount()

    const w2 = await mountTable({
      columns: [{ id: 'status', header: 'Status', type: 'string' }],
      rowActions: undefined,
    })
    expect(w2.find('.dt-row-more').exists()).toBe(false)
    expect(w2.find('.dt-head-menu-col').exists()).toBe(false)
    w2.unmount()
  })
  it('Copy panoya yazar ve "Copied" toast; sağ tık düz hücrede menüyü açar, linkte açmaz; ⇧F10 açar', async () => {
    const writeText = vi.fn()
    Object.assign(navigator, { clipboard: { writeText } })
    const w = await mountTable()
    await openMenu(w, 1)
    menuItems()[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(writeText).toHaveBeenCalledWith('WO-101')
    expect(w.get('.dt-toast').text()).toBe('Copied')
    await rowAt(w, 2).get('[data-col="status"]').trigger('contextmenu')
    await flush()
    expect(menuItems().length).toBeGreaterThan(0)
    expect(rowAt(w, 2).get('.dt-row-more').attributes('data-state')).toBe('open')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flush()
    const link = rowAt(w, 3).get('a.dt-link')
    await link.trigger('contextmenu')
    await flush()
    expect(rowAt(w, 3).get('.dt-row-more').attributes('data-state')).toBe('closed')
    ;(rowAt(w, 3).element as HTMLElement).focus()
    await rowAt(w, 3).trigger('keydown', { key: 'F10', shiftKey: true })
    await flush()
    expect(rowAt(w, 3).get('.dt-row-more').attributes('data-state')).toBe('open')
    w.unmount()
  })
  it('row-open: linke düz tık ve ↵ { row, href, event }; ⌘ tık yayılmaz; row-click: none / open / expand', async () => {
    const w = await mountTable()
    const link = rowAt(w, 0).get('a.dt-link')
    await link.trigger('click', { button: 0, metaKey: true })
    expect(w.emitted('row-open')).toBeUndefined()
    await link.trigger('click', { button: 0 })
    const p = w.emitted('row-open')![0]![0] as { row: Order; href: string; event: MouseEvent }
    expect(p.row).toBe(rows[0])
    expect(p.href).toBe('/orders/1')
    expect(p.event).toBeInstanceOf(MouseEvent)
    const cell = (i: number) => rowAt(w, i).get('[data-col="status"]')
    await cell(1).trigger('mousedown', { clientX: 5, clientY: 5 })
    await cell(1).trigger('click', { clientX: 5, clientY: 5 })
    expect((w.emitted('row-click')![0]![0] as { row: Order }).row).toBe(rows[1])
    expect(w.emitted('row-open')).toHaveLength(1) // none: açmaz
    await w.setProps({ rowClick: 'open' })
    await cell(2).trigger('mousedown', { clientX: 5, clientY: 5 })
    await cell(2).trigger('click', { clientX: 5, clientY: 5 })
    expect(w.emitted('row-open')).toHaveLength(2)
    expect((w.emitted('row-open')![1]![0] as { row: Order }).row).toBe(rows[2])
    await w.setProps({ rowClick: 'expand', expand: true })
    await cell(3).trigger('mousedown', { clientX: 5, clientY: 5 })
    await cell(3).trigger('click', { clientX: 5, clientY: 5 })
    await flush()
    expect(rowAt(w, 3).get('.dt-expand').attributes('aria-expanded')).toBe('true')
    w.unmount()
  })
})

describe('expand', () => {
  it('chevron yalnızca canExpand; aria-expanded/controls; slot içeriği ve close(); → açar, ← kapatır; sorgu değişince kapanır', async () => {
    const w = await mountTable(
      { expand: { canExpand: (r: Order) => r.id !== 2 } },
      {
        expanded:
          '<div class="detail">Detail of {{ params.row.number }}<button class="close" @click="params.close()">x</button></div>',
      },
    )
    expect(rowAt(w, 0).find('.dt-expand').exists()).toBe(true)
    expect(rowAt(w, 1).find('.dt-expand').exists()).toBe(false)
    expect(rowAt(w, 1).find('.dt-expand-space').exists()).toBe(true)
    expect(rowAt(w, 1).attributes('aria-expanded')).toBeUndefined() // grid satırında aria-expanded yok (axe); chevron taşır
    await rowAt(w, 0).get('.dt-expand').trigger('click')
    await flush()
    expect(rowAt(w, 0).get('.dt-expand').attributes('aria-expanded')).toBe('true')
    const sub = w.get('.dt-subrow')
    expect(sub.attributes('id')).toBe(rowAt(w, 0).get('.dt-expand').attributes('aria-controls'))
    expect(sub.get('[role="gridcell"]').attributes('aria-colspan')).toBe('2')
    expect(sub.get('.detail').text()).toContain('Detail of WO-100')
    await sub.get('.close').trigger('click')
    await flush()
    expect(w.find('.dt-subrow').exists()).toBe(false)
    ;(rowAt(w, 2).element as HTMLElement).focus()
    await rowAt(w, 2).trigger('keydown', { key: 'ArrowRight' })
    await flush()
    expect(rowAt(w, 2).get('.dt-expand').attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(rowAt(w, 2).element) // açılınca odak satırda kalır
    await rowAt(w, 2).trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(rowAt(w, 2).get('a.dt-link').element) // açıkken → ilk widget'a (birincil link; chevron atlanır)
    ;(rowAt(w, 2).element as HTMLElement).focus()
    await rowAt(w, 2).trigger('keydown', { key: 'ArrowLeft' })
    await flush()
    expect(rowAt(w, 2).get('.dt-expand').attributes('aria-expanded')).toBe('false')
    await rowAt(w, 2).trigger('keydown', { key: 'ArrowRight' })
    await flush()
    await w.get('.dt-head-cell[data-col="status"] .dt-head-label').trigger('click')
    await flush()
    expect(w.findAll('.dt-subrow')).toHaveLength(0)
    w.unmount()
  })
  it('sayfa/sıralama değişiminde odak aynı anahtarlı satıra döner, yoksa aynı indekse', async () => {
    const w = await mountTable()
    await rowAt(w, 2).get('[data-col="status"]').trigger('mousedown', { clientX: 5, clientY: 5 })
    ;(rowAt(w, 2).element as HTMLElement).focus()
    await flush()
    expect(rowAt(w, 2).attributes('tabindex')).toBe('0')
    await w.get('.dt-head-cell[data-col="number"] .dt-head-label').trigger('click') // asc (zaten) → aynı
    await w.get('.dt-head-cell[data-col="number"] .dt-head-label').trigger('click') // desc: WO-102 artık 5. sırada
    await flush()
    const focusedRow = w.findAll('.dt-row').find((r) => r.attributes('tabindex') === '0')!
    expect(focusedRow.text()).toContain('WO-102')
    expect(document.activeElement).toBe(focusedRow.element)
    await w.setProps({ rows: rows.slice(4) }) // anahtar yok → aynı indeks (sınırlanmış)
    await flush()
    const again = w.findAll('.dt-row').find((r) => r.attributes('tabindex') === '0')!
    expect(again.exists()).toBe(true)
    w.unmount()
  })
})
