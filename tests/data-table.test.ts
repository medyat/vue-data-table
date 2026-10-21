// DataTable Faz 2 (05 §3, §8, §10; 08 §3): talep akışı ve durumlar, footer metinleri, sıralama, sayfalama, toolbar yuvaları,
// tercihler, kısayollar, header menüsü. Gerçek tarayıcı senaryoları e2e/list.spec.ts.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import DataTable from '../src/list/DataTable.vue'
import type { ColumnDef, PreferencesAdapter, TableRequest } from '../src/types'
import { flush, mockLayout } from './helpers/dom'

interface Order {
  id: number
  number: string
  product: { name: string; sku: string }
  status: string | null
  value: number
  dueAt: string
}

const rows: Order[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  number: `WO-26-${400 + i}`,
  product: { name: `Pump ${i}`, sku: `GP-${i}` },
  status: i % 5 === 0 ? null : i % 2 ? 'done' : 'in_progress',
  value: 1000 * (40 - i),
  dueAt: '2026-10-18',
}))
const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, pinned: 'left' },
  { id: 'product.name', header: 'Product', type: 'string' },
  { id: 'status', header: 'Status', type: 'select', options: [{ value: 'done', label: 'Done' }] },
  { id: 'value', header: 'Value', type: 'currency', currency: 'TRY' },
  { id: 'dueAt', header: 'Due date', type: 'date' },
]

beforeAll(mockLayout)
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const mountRaw = (props: Record<string, unknown>, slots?: Record<string, string>) =>
  mount(DataTable<Order>, {
    props: { tableId: 'orders', columns, rows: [], entityName: { one: 'order', other: 'orders' }, ...props },
    slots,
    attachTo: document.body,
  })
type W = ReturnType<typeof mountRaw>
const requests = (w: W) => (w.emitted('request') ?? []).map((e) => e[0] as TableRequest)
const last = (w: W) => requests(w).at(-1)!
/** Footer solu: parçalar boşlukla birleşik ("Rows 1–20 of 1,284 · counted 09:42 Updated just now"). */
const footer = (w: W) => {
  const parts: string[] = []
  for (const e of w.get('.dt-footer-left').element.querySelectorAll(':scope > *')) {
    if (e.classList.contains('dt-footer-vsep')) break
    parts.push(e.textContent?.replace(/\s+/g, ' ').trim() ?? '')
  }
  return parts.filter(Boolean).join(' ')
}
const input = (w: W) => w.get('.dt-search input').element as HTMLInputElement

/** Sunucu modu: önce boş montaj (initial talep), sonra uygulamanın cevabı gibi satırlar. */
const mountServer = async (extra: Record<string, unknown> = {}, answer?: { rows: Order[]; hasMore?: boolean }) => {
  const w = mountRaw({ mode: 'server', onRequest: () => {}, ...extra })
  await flush()
  if (answer) {
    await w.setProps({ rows: answer.rows, hasMore: answer.hasMore ?? false })
    await flush()
  }
  return w
}
const mountClient = async (extra: Record<string, unknown> = {}) => {
  const w = mountRaw({ rows, ...extra })
  await flush()
  return w
}

describe('sunucu modu: talep akışı ve durumlar', () => {
  it('ilk talep: reason initial, görünür sütunlar + alanlar; satır yokken skeleton ve footer Loading…', async () => {
    const w = await mountServer()
    const r = last(w)
    expect(r.reason).toBe('initial')
    expect(r.query.columns).toEqual(['number', 'product.name', 'status', 'value', 'dueAt'])
    expect(r.query.fields).toEqual(['id', 'number', 'product.name', 'status', 'value', 'dueAt'])
    expect(r.query.page).toEqual({ number: 1, size: 100 })
    expect(w.findAll('.dt-row-skeleton')).toHaveLength(12)
    expect(footer(w)).toBe('Loading…')
    expect(w.get('.dt-footer-next').attributes('disabled')).toBeDefined()
    w.unmount()
  })
  it('satırlar gelince footer aralığı; hasMore → Next; countable → Count total → @count → of 1,284 · counted', async () => {
    const w = await mountServer({ countable: true, onCount: () => {} }, { rows: rows.slice(0, 20), hasMore: true })
    expect(footer(w)).toContain('Rows 1–20 · Count total')
    expect(w.get('.dt-footer-next').attributes('disabled')).toBeUndefined()
    await w.get('.dt-footer-count').trigger('click')
    expect(footer(w)).toContain('Counting…')
    const c = w.emitted('count')![0]![0] as { query: { search: string }; signal: AbortSignal }
    expect(c.query).not.toHaveProperty('page')
    await w.setProps({ total: 1284 })
    expect(footer(w)).toMatch(/Rows 1–20 of 1,284 · counted \d/)
    // Tek sayfa: Count total yok, Next pasif.
    await w.setProps({ hasMore: false, total: undefined, rows: rows.slice(0, 7) })
    await flush()
    expect(footer(w)).toBe('Rows 1–7')
    w.unmount()
  })
  it('arama → 250 ms sonra reason query, sayfa 1; eski satırlar soluk + inert, sayfalama kilitli; yeni satırlarla açılır', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 20), hasMore: true })
    await w.get('.dt-footer-next').trigger('click')
    expect(last(w).reason).toBe('page')
    expect(last(w).query.page.number).toBe(2)
    await w.setProps({ rows: rows.slice(20, 40) })
    await flush()
    expect(w.get('.dt-row[data-index="0"]').attributes('aria-rowindex')).toBe('102')
    expect(footer(w)).toContain('Rows 101–120')

    await w.get('.dt-search input').setValue('pump')
    expect(requests(w)).toHaveLength(2) // debounce
    await vi.advanceTimersByTimeAsync(260)
    expect(last(w).reason).toBe('query')
    expect(last(w).query).toMatchObject({ search: 'pump', page: { number: 1, size: 100 } })
    expect(w.get('.dt-body').attributes('inert')).toBeDefined()
    expect(w.get('.dt-grid').classes()).toContain('is-dim')
    expect(w.get('.dt-footer-prev').attributes('disabled')).toBeDefined()
    expect(w.get('.dt-select select').attributes('disabled')).toBeDefined()
    // 400 ms'yi aşınca skeleton.
    await vi.advanceTimersByTimeAsync(450)
    expect(w.findAll('.dt-row-skeleton')).toHaveLength(12)
    await w.setProps({ rows: rows.slice(0, 5), hasMore: false })
    await flush()
    expect(w.get('.dt-body').attributes('inert')).toBeUndefined()
    expect(w.findAll('.dt-row-skeleton')).toHaveLength(0)
    expect(footer(w)).toBe('Rows 1–5')
    w.unmount()
  })
  it('hata: sorgu talebinde Error durumu (satırlar kalkar, Try again, Copy error ID); yenilemede Stale şeridi', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 20) })
    await w.get('.dt-search input').setValue('x')
    await vi.advanceTimersByTimeAsync(260)
    await w.setProps({ error: { message: 'Timeout', id: '504 · req 8f3a' } })
    await flush()
    const state = w.get('.dt-state.is-error')
    expect(state.attributes('role')).toBe('alert')
    expect(state.text()).toContain("Couldn't load orders")
    expect(state.text()).toContain('Timeout')
    expect(state.text()).toContain('Your filters are kept.')
    expect(state.get('.dt-state-code').text()).toBe('504 · req 8f3a')
    expect(w.findAll('.dt-row:not(.dt-row-skeleton)')).toHaveLength(0)
    expect(input(w).value).toBe('x')
    const before = requests(w).length
    await state.get('button.dt-btn').trigger('click')
    expect(requests(w)).toHaveLength(before + 1)
    expect(last(w).reason).toBe('query')
    expect(w.get('[aria-live="assertive"]').text()).toContain("Couldn't load orders")

    await w.setProps({ error: undefined, rows: rows.slice(0, 3) })
    await flush()
    expect(w.find('.dt-state').exists()).toBe(false)
    w.vm.refresh()
    await w.setProps({ error: 'Offline' })
    await flush()
    expect(w.get('.dt-strip').text()).toContain("Couldn't refresh. Showing data from")
    expect(w.findAll('.dt-row:not(.dt-row-skeleton)').length).toBe(3)
    expect(w.get('.dt-footer-updated').classes()).toContain('is-stale')
    w.unmount()
  })
  it('sayfa > 1 ve 0 satır → No rows on this page + Go to previous page; arama sonucu yok → Clear search', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 20), hasMore: true })
    await w.get('.dt-footer-next').trigger('click')
    await w.setProps({ rows: [], hasMore: false })
    await flush()
    expect(w.get('.dt-state').text()).toContain('No rows on this page')
    await w.get('.dt-state button').trigger('click')
    expect(last(w).query.page.number).toBe(1)
    await w.setProps({ rows: [] })
    await w.get('.dt-search input').setValue('zzz')
    await vi.advanceTimersByTimeAsync(260)
    await w.setProps({ rows: [], hasMore: false, loading: false })
    await flush()
    // rows aynı ([] → []) → watch tetiklenmez; uygulama loading'i düşürdü → pending biter.
    await w.setProps({ loading: true })
    await w.setProps({ loading: false })
    await flush()
    expect(w.get('.dt-state').text()).toContain('No orders match “zzz”')
    await w.get('.dt-state button').trigger('click')
    expect(input(w).value).toBe('')
    w.unmount()
  })
  it('sütun görünür olunca alanı yoksa 400 ms sonra reason columns; gizleme talep üretmez', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 5) })
    const n = requests(w).length
    const label = w.get('.dt-head-cell[data-col="status"] .dt-head-label')
    ;(label.element as HTMLElement).focus()
    await label.trigger('keydown', { key: 'F10', shiftKey: true })
    await nextTick()
    const hide = [...document.querySelectorAll('[role="menuitem"]')].find(
      (el) => el.textContent?.trim() === 'Hide column',
    )!
    hide.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(w.findAll('[role="columnheader"]')).toHaveLength(4)
    await vi.advanceTimersByTimeAsync(500)
    expect(requests(w)).toHaveLength(n)
    w.unmount()
  })
})

describe('istemci modu: arama, sıralama, sayfalama', () => {
  it('hiç @request yayılmaz; arama süzer; footer "Rows 1–N of 40"', async () => {
    const w = await mountClient({ pageSize: 10 })
    expect(w.emitted('request')).toBeUndefined()
    expect(footer(w)).toBe('Rows 1–10 of 40')
    expect(w.find('.dt-footer-updated').exists()).toBe(false) // dinleyici yok → tazelik/Refresh yok
    await w.get('.dt-search input').setValue('pump 1')
    await vi.advanceTimersByTimeAsync(260)
    await flush()
    expect(footer(w)).toBe('Rows 1–10 of 11') // Pump 1, 10–19
    expect(w.get('.dt-row[data-index="0"] [data-col="product.name"]').text()).toBe('Pump 1')
    w.unmount()
  })
  it('sıralama: tık asc → desc → kapalı; ⇧ ikincil ve rozetler; boş değer artanda sonda', async () => {
    const w = await mountClient()
    const value = () => w.get('.dt-head-cell[data-col="value"]')
    await value().get('.dt-head-label').trigger('click')
    expect(value().attributes('aria-sort')).toBe('ascending')
    expect(w.get('.dt-row[data-index="0"] [data-col="value"]').text()).toContain('1,000.00')
    expect(w.get('[aria-live="polite"]').text()).toBe('Sorted by Value, ascending')
    await value().get('.dt-head-label').trigger('click')
    expect(value().attributes('aria-sort')).toBe('descending')
    expect(w.get('.dt-row[data-index="0"] [data-col="value"]').text()).toContain('40,000.00')
    await value().get('.dt-head-label').trigger('click')
    expect(value().attributes('aria-sort')).toBeUndefined()

    const status = () => w.get('.dt-head-cell[data-col="status"]')
    await status().get('.dt-head-label').trigger('click')
    await value().get('.dt-head-label').trigger('click', { shiftKey: true })
    expect(status().attributes('aria-sort')).toBe('ascending')
    expect(value().attributes('aria-sort')).toBe('ascending')
    expect(status().get('.dt-head-sort-index').text()).toBe('1')
    expect(value().get('.dt-head-sort-index').text()).toBe('2')
    // Boş değer artanda sonda, azalanda başta (PostgreSQL).
    expect(w.get('.dt-row[data-index="0"] [data-col="status"]').text()).toBe('Done')
    await status().get('.dt-head-label').trigger('click')
    expect(status().attributes('aria-sort')).toBe('descending')
    expect(w.get('.dt-row[data-index="0"] [data-col="status"]').text()).toBe('—')
    w.unmount()
  })
  it('sayfalama: Next/Alt← ve sayfa boyutu → 1. sayfa; aria-rowindex ofsetli', async () => {
    const w = await mountClient({ pageSize: 10 })
    await w.get('.dt-footer-next').trigger('click')
    await flush()
    expect(footer(w)).toBe('Rows 11–20 of 40')
    expect(w.get('.dt-row[data-index="0"]').attributes('aria-rowindex')).toBe('12')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    await flush()
    expect(footer(w)).toBe('Rows 1–10 of 40')
    await w.get('.dt-footer-next').trigger('click')
    await w.get('.dt-select select').setValue('50')
    await flush()
    expect(footer(w)).toBe('Rows 1–40')
    expect(w.get('.dt-footer-next').attributes('disabled')).toBeDefined()
    w.unmount()
  })
})

describe('toolbar, tercihler, kısayollar', () => {
  it('yuvalar: aranabilir sütun yoksa arama yok; dinleyici yoksa ⋯ yok; toolbar=false hiç yok; #toolbar-end', async () => {
    const plain = await mountClient({ columns: [{ id: 'value', header: 'Value', type: 'currency', currency: 'TRY' }] })
    expect(plain.find('.dt-search').exists()).toBe(false)
    expect(plain.find('[aria-label="More actions"]').exists()).toBe(false)
    expect(plain.find('[aria-label="Display"], .dt-toolbar .dt-btn').exists()).toBe(true)
    plain.unmount()
    const none = await mountClient({ toolbar: false })
    expect(none.find('.dt-toolbar').exists()).toBe(false)
    none.unmount()
    const w = mountRaw(
      { rows, onExport: () => {}, onRequest: () => {} },
      { 'toolbar-end': '<button class="new">New</button>' },
    )
    await flush()
    expect(w.find('.dt-toolbar button.new').exists()).toBe(true)
    expect(w.find('[aria-label="More actions"]').exists()).toBe(true)
    expect(w.get('.dt-search input').attributes('placeholder')).toBe('Search orders…')
    w.unmount()
  })
  it('Display › Density ve çizgiler tercih deposuna yazılır; yoğunluk kökte, çizgiler ızgarada', async () => {
    const set = vi.fn()
    const adapter: PreferencesAdapter = { get: () => ({ density: 'compact' }), set }
    const w = await mountClient()
    expect(w.get('.dt').attributes('data-density')).toBe('standard')
    w.unmount()

    const { DATA_TABLE_KEY, createContext } = await import('../src/core/plugin')
    const w2 = mount(DataTable<Order>, {
      props: { tableId: 'orders', columns, rows },
      global: { provide: { [DATA_TABLE_KEY as symbol]: createContext({ preferences: adapter }) } },
      attachTo: document.body,
    })
    await flush()
    expect(w2.get('.dt').attributes('data-density')).toBe('compact')
    await w2.get('.dt-toolbar .dt-btn.has-icon').trigger('click')
    await flush()
    const pop = document.querySelector('.dt-display')!
    expect(pop.textContent).toContain('Saved for you only')
    ;[...pop.querySelectorAll<HTMLElement>('.dt-seg-item')]
      .find((b) => b.textContent?.trim() === 'Comfortable')!
      .click()
    await flush()
    expect(set).toHaveBeenCalledWith('orders', { density: 'comfortable' })
    expect(w2.get('.dt').attributes('data-density')).toBe('comfortable')
    ;(pop.querySelector('.dt-switch') as HTMLElement).click()
    await flush()
    expect(set).toHaveBeenCalledWith('orders', { verticalLines: true })
    expect(w2.get('.dt-grid').classes()).toContain('has-vlines')
    w2.unmount()
  })
  it("'/' aramaya odaklar, 'R' yeniler; shortcuts=false kapatır; metin alanında çalışmaz", async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 3) })
    const n = requests(w).length
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    expect(document.activeElement).toBe(w.get('.dt-search input').element)
    input(w).dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))
    expect(requests(w)).toHaveLength(n)
    input(w).blur()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    expect(requests(w)).toHaveLength(n + 1)
    expect(last(w).reason).toBe('refresh')
    await w.setProps({ shortcuts: false })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    expect(requests(w)).toHaveLength(n + 1)
    w.unmount()
  })
  it('header klavyesi: ilk satırda ↑ başlığa, ←/→ komşu, ⇧→ 16 px, ⌥⇧→ taşır, ↓ satıra', async () => {
    const w = await mountClient()
    ;(w.get('.dt-row[data-index="0"]').element as HTMLElement).focus()
    await w.get('.dt-row[data-index="0"]').trigger('keydown', { key: 'ArrowUp' })
    const label = (id: string) => w.get(`.dt-head-cell[data-col="${id}"] .dt-head-label`)
    expect(document.activeElement).toBe(label('number').element)
    await label('number').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(label('product.name').element)
    const before = w.get('.dt-grid').attributes('style')!
    await label('product.name').trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(w.get('.dt-grid').attributes('style')).not.toBe(before)
    await label('product.name').trigger('keydown', { key: 'ArrowRight', altKey: true, shiftKey: true })
    await flush()
    const ids = w.findAll('[role="columnheader"]').map((h) => h.attributes('data-col'))
    expect(ids).toEqual(['number', 'status', 'product.name', 'value', 'dueAt'])
    expect(document.activeElement).toBe(label('product.name').element)
    await label('product.name').trigger('keydown', { key: 'ArrowDown' })
    await flush()
    expect(document.activeElement).toBe(w.get('.dt-row[data-index="0"]').element)
    w.unmount()
  })
})
