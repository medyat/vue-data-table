// DataTable Faz 2 (05 §3, §8, §10; 08 §3): talep akışı ve durumlar, footer metinleri, sıralama, sayfalama, toolbar yuvaları,
// tercihler, kısayollar, header menüsü. Gerçek tarayıcı senaryoları e2e/list.spec.ts.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import DataTable from '../src/list/DataTable.vue'
import type { ColumnDef, PreferencesAdapter, TableRequest, View, ViewsAdapter } from '../src/types'
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
  { id: 'urgent', header: 'Urgent', type: 'boolean' },
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
    expect(r.query.columns).toEqual(['number', 'product.name', 'status', 'value', 'dueAt', 'urgent'])
    expect(r.query.fields).toEqual(['id', 'number', 'product.name', 'status', 'value', 'dueAt', 'urgent'])
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
    expect(w.findAll('[role="columnheader"]')).toHaveLength(5)
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
    await w2
      .findAll('.dt-toolbar button')
      .find((b) => b.text() === 'Display')!
      .trigger('click')
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
    expect(ids).toEqual(['number', 'status', 'product.name', 'value', 'dueAt', 'urgent'])
    expect(document.activeElement).toBe(label('product.name').element)
    await label('product.name').trigger('keydown', { key: 'ArrowDown' })
    await flush()
    expect(document.activeElement).toBe(w.get('.dt-row[data-index="0"]').element)
    w.unmount()
  })
})

describe('filtreler (04)', () => {
  const chip = (w: W, col: string) => w.find(`.dt-chip[data-col="${col}"]`)
  /** Çip parçaları boşlukla: "Status is any of Planned, On hold". */
  const chipText = (w: W, col: string) =>
    [...chip(w, col).element.querySelectorAll('.dt-chip-body > span')].map((e) => e.textContent?.trim()).join(' ')
  const pop = () => document.querySelector<HTMLElement>('.dt-chip-pop')
  const openPicker = async (w: W) => {
    await w.get('.dt-toolbar .dt-filter-trigger').trigger('click')
    await flush()
  }
  const pickColumn = async (w: W, header: string) => {
    await openPicker(w)
    const item = [...document.querySelectorAll<HTMLElement>('.dt-picker-item')].find((el) =>
      el.textContent?.includes(header),
    )!
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
  }
  const check = async (label: string) => {
    const row = [...pop()!.querySelectorAll<HTMLElement>('.dt-option')].find((el) => el.textContent?.includes(label))!
    row.querySelector<HTMLInputElement>('input')!.click()
    await flush()
  }

  it('picker → eksik çip + editör; D2: ikinci seçim aynı çipi açar; değer seçilmeden kapanınca çip kalkar', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 5) })
    const n = requests(w).length
    await pickColumn(w, 'Status')
    expect(chip(w, 'status').exists()).toBe(true)
    expect(chip(w, 'status').classes()).toContain('is-incomplete')
    expect(chipText(w, 'status')).toBe('Status is Select…')
    expect(pop()).not.toBeNull()
    expect(requests(w)).toHaveLength(n) // eksik çip sorguya girmez
    expect(w.find('.dt-filter-trigger .dt-counter').exists()).toBe(false)
    await pickColumn(w, 'Status')
    expect(w.findAll('.dt-chip')).toHaveLength(1)
    // Editörü değer seçmeden kapat → çip kaldırılır.
    const bar = w.findComponent({ name: 'FilterBar' })
    bar.vm.$emit('update:editing', null)
    await flush()
    expect(w.findAll('.dt-chip')).toHaveLength(0)
    w.unmount()
  })

  it('seçenek editörü anında uygular: sorgu, sayaç, tekil/çoğul etiket, header filtre işareti; operatör değişiminde değer korunur', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 5) })
    await pickColumn(w, 'Status')
    await check('Done')
    expect(last(w).reason).toBe('query')
    expect(last(w).query.filters).toEqual([{ column: 'status', op: 'in', value: ['done'] }])
    expect(last(w).query.page.number).toBe(1)
    expect(w.get('.dt-filter-trigger .dt-counter').text()).toBe('1')
    expect(chipText(w, 'status')).toBe('Status is Done')
    expect(w.find('.dt-head-cell[data-col="status"] .dt-head-filtered').exists()).toBe(true)
    expect(w.get('[aria-live="polite"]').text()).toBe('Filter added: Status Done')
    // Operatör: in → not_in değeri korur; is_empty değeri siler ve anında uygulanır.
    const fc = w.findComponent({ name: 'FilterChip' })
    fc.vm.$emit('update:chip', { column: 'status', op: 'not_in', value: ['done'] })
    await flush()
    expect(chipText(w, 'status')).toBe('Status is not Done')
    fc.vm.$emit('update:chip', { column: 'status', op: 'is_empty' })
    await flush()
    expect(last(w).query.filters).toEqual([{ column: 'status', op: 'is_empty' }])
    expect(chip(w, 'status').find('.dt-chip-value').exists()).toBe(false)
    w.unmount()
  })

  it('boolean doğrudan "is Yes"; × çipi kaldırır ve duyurur; Clear all', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 5) })
    await pickColumn(w, 'Urgent')
    expect(chipText(w, 'urgent')).toBe('Urgent is Yes')
    expect(last(w).query.filters).toEqual([{ column: 'urgent', op: 'eq', value: true }])
    await chip(w, 'urgent').get('.dt-chip-body').trigger('click')
    expect(last(w).query.filters).toEqual([{ column: 'urgent', op: 'eq', value: false }])
    await chip(w, 'urgent').get('.dt-chip-remove').trigger('click')
    await flush()
    expect(w.findAll('.dt-chip')).toHaveLength(0)
    expect(last(w).query.filters).toEqual([])
    expect(w.get('[aria-live="polite"]').text()).toBe('Urgent filter removed')
    w.unmount()
  })

  it('istemci modu: No results başlığı, Remove “Status” / Clear all filters; F kısayolu picker’ı açar', async () => {
    const w = await mountClient()
    await pickColumn(w, 'Status')
    await check('Done')
    expect(footer(w)).toBe('Rows 1–16')
    const fc = w.findComponent({ name: 'FilterChip' })
    fc.vm.$emit('update:chip', { column: 'status', op: 'in', value: ['nope'] })
    await flush()
    expect(w.get('.dt-state').text()).toContain('No orders match this filter')
    expect(w.get('.dt-state button').text()).toBe('Remove “Status”')
    w.findComponent({ name: 'FilterBar' }).vm.$emit('update:editing', null)
    await flush()
    await pickColumn(w, 'Product')
    w.findAllComponents({ name: 'FilterChip' })[1]!.vm.$emit('update:chip', {
      column: 'product.name',
      op: 'contains',
      value: 'Pump',
    })
    await flush()
    expect(w.get('.dt-state').text()).toContain('No orders match these 2 filters')
    await w.get('.dt-state button').trigger('click')
    await flush()
    expect(w.findAll('.dt-chip')).toHaveLength(0)
    expect(footer(w)).toBe('Rows 1–40')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))
    await flush()
    expect(document.querySelector('.dt-picker')).not.toBeNull()
    w.unmount()
  })

  it('metin editörü 250 ms sonra uygular, Enter kapatır; sayı aralığı + para birimi', async () => {
    const w = await mountServer({}, { rows: rows.slice(0, 5) })
    await pickColumn(w, 'Product')
    const input = pop()!.querySelector<HTMLInputElement>('.dt-editor-text input')!
    input.value = 'pump'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(300)
    await flush()
    expect(last(w).query.filters).toEqual([{ column: 'product.name', op: 'contains', value: 'pump' }])
    expect(chipText(w, 'product.name')).toBe('Product contains “pump”')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flush()
    expect(pop()).toBeNull()

    await pickColumn(w, 'Value')
    const [min, max] = [...pop()!.querySelectorAll<HTMLInputElement>('.dt-editor-number input')]
    min!.value = '100000'
    min!.dispatchEvent(new Event('input', { bubbles: true }))
    max!.value = '250,000'
    max!.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(300)
    await flush()
    expect(last(w).query.filters.at(-1)).toEqual({
      column: 'value',
      op: 'between',
      value: [100000, 250000],
      currency: 'TRY',
    })
    expect(chipText(w, 'value')).toBe('Value is between 100K – 250K TRY')
    w.unmount()
  })
})

describe('görünümler (04 §7)', () => {
  const sys: View[] = [
    { id: 'all', name: 'All orders', kind: 'system', state: {}, default: true },
    {
      id: 'late',
      name: 'Late orders',
      kind: 'system',
      state: {
        filters: [{ column: 'status', op: 'in', value: ['done'] }],
        sort: [{ column: 'dueAt', dir: 'asc' }],
        columns: { visible: ['number', 'status', 'dueAt'], pinned: { left: ['number'], right: [] } },
      },
    },
  ]
  /** Bellek içi adapter: `views` dizisi test tarafından okunur. */
  const memoryAdapter = (initial: View[] = []) => {
    const views = [...initial]
    const adapter: ViewsAdapter & { views: View[] } = {
      views,
      list: async () => [...views],
      create: async (_t, input) => {
        const v: View = {
          id: `v${views.length + 1}`,
          name: input.name,
          kind: 'personal',
          state: input.state,
        }
        views.push(v)
        return v
      },
      update: async (_t, id, patch) => {
        const i = views.findIndex((v) => v.id === id)
        views[i] = { ...views[i]!, ...(patch.name && { name: patch.name }), ...(patch.state && { state: patch.state }) }
        return views[i]!
      },
      remove: async (_t, id) => {
        views.splice(
          views.findIndex((v) => v.id === id),
          1,
        )
      },
    }
    return adapter
  }
  const mountViews = async (opts: {
    adapter?: ViewsAdapter | null
    prefs?: PreferencesAdapter | null
    props?: Record<string, unknown>
  }) => {
    const { DATA_TABLE_KEY, createContext } = await import('../src/core/plugin')
    const ctx = createContext({ viewsAdapter: opts.adapter ?? undefined, preferences: opts.prefs ?? undefined })
    const w = mount(DataTable<Order>, {
      props: { tableId: 'orders', columns, rows, views: sys, ...opts.props },
      global: { provide: { [DATA_TABLE_KEY as symbol]: ctx } },
      attachTo: document.body,
    })
    await flush()
    await vi.advanceTimersByTimeAsync(1) // adapter.list() zinciri
    await flush()
    return w
  }
  const trigger = (w: W) => w.get('.dt-view-trigger')
  const menu = () => document.querySelector<HTMLElement>('.dt-views')
  const openMenu = async (w: W) => {
    if (menu()) return
    await trigger(w).trigger('click')
    await flush()
  }
  const row = (name: string) =>
    [...menu()!.querySelectorAll<HTMLElement>('.dt-view-row')].find((r) => r.textContent?.includes(name))
  const pickView = async (w: W, name: string) => {
    await openMenu(w)
    row(name)!
      .querySelector<HTMLElement>('.dt-view-item')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
  }
  const menuButton = (text: string) =>
    [...menu()!.querySelectorAll<HTMLElement>('.dt-pop-item')].find((b) => b.textContent?.includes(text))
  const rowAction = async (w: W, name: string, item: string) => {
    await openMenu(w)
    const more = row(name)!.querySelector<HTMLElement>('.dt-view-more')!
    more.focus()
    more.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await flush()
    const el = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (e) => e.textContent?.trim() === item,
    )!
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    await vi.advanceTimersByTimeAsync(1)
    await flush()
  }
  const sortBy = async (w: W, col: string) => {
    await w.get(`.dt-head-cell[data-col="${col}"] .dt-head-label`).trigger('click')
    await flush()
  }
  const dialog = () => document.querySelector<HTMLElement>('.dt-view-dialog')
  const submitDialog = async (name?: string) => {
    const input = dialog()!.querySelector<HTMLInputElement>('input[type="text"]')!
    if (name !== undefined) {
      input.value = name
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    dialog()!
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flush()
  }

  it('açılış: system default; tercih varsa o; görünüm seçimi tek talep (filtre + sıralama + sütunlar); view-change', async () => {
    const w = await mountViews({ props: { mode: 'server', onRequest: () => {} } })
    expect(trigger(w).text()).toBe('All orders')
    expect(w.emitted('view-change')?.[0]?.[0]).toEqual({ id: 'all', kind: 'system' })
    const n = requests(w).length
    await pickView(w, 'Late orders')
    expect(requests(w)).toHaveLength(n + 1)
    expect(last(w).reason).toBe('query')
    expect(last(w).query.filters).toEqual([{ column: 'status', op: 'in', value: ['done'] }])
    expect(last(w).query.sort).toEqual([{ column: 'dueAt', dir: 'asc' }])
    expect(last(w).query.columns).toEqual(['number', 'status', 'dueAt'])
    expect(trigger(w).text()).toBe('Late orders')
    expect(w.find('.dt-chip[data-col="status"]').exists()).toBe(true)
    expect(w.emitted('view-change')?.at(-1)?.[0]).toEqual({ id: 'late', kind: 'system' })
    w.unmount()

    const w2 = await mountViews({
      prefs: { get: () => ({ defaultViewId: 'late' }), set: () => {} },
      props: { mode: 'server', onRequest: () => {} },
    })
    expect(requests(w2)).toHaveLength(1)
    expect(requests(w2)[0]!.query.filters).toHaveLength(1)
    expect(trigger(w2).text()).toBe('Late orders')
    w2.unmount()
  })

  it('düzenlenince Edited + kaydetme bölümü (system: Save as my view…); Discard geri alır; taslak görünüm başına oturum boyu kalır', async () => {
    const w = await mountViews({ adapter: memoryAdapter() })
    await sortBy(w, 'product.name')
    expect(trigger(w).text()).toContain('Edited')
    expect(trigger(w).attributes('aria-label')).toBe('View All orders, edited')
    await openMenu(w)
    expect(menu()!.textContent).toContain('“All orders” edited')
    expect(menuButton('Save as my view…')).toBeTruthy()
    expect(menuButton('Save changes')).toBeUndefined()
    menuButton('Discard changes')!.click()
    await flush()
    expect(trigger(w).text()).not.toContain('Edited')
    expect(w.get('.dt-head-cell[data-col="product.name"]').attributes('aria-sort')).toBeUndefined()
    // Taslak: All orders düzenle → Late'e geç → geri dön.
    await sortBy(w, 'product.name')
    await pickView(w, 'Late orders')
    expect(trigger(w).text()).toBe('Late orders')
    await openMenu(w)
    expect(row('All orders')!.textContent).toContain('Edited')
    expect(row('Late orders')!.textContent).not.toContain('Edited')
    await pickView(w, 'All orders')
    expect(trigger(w).text()).toContain('Edited')
    expect(w.get('.dt-head-cell[data-col="product.name"]').attributes('aria-sort')).toBe('ascending')
    w.unmount()
  })

  it('⌘S: system → Save as new view dialog (ad doğrulama, varsayılan checkbox); personal → Save changes; yeni görünüm aktif', async () => {
    const adapter = memoryAdapter()
    const set = vi.fn()
    const w = await mountViews({ adapter, prefs: { get: () => ({}), set } })
    await sortBy(w, 'product.name')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }))
    await flush()
    expect(dialog()).toBeTruthy()
    expect(dialog()!.textContent).toContain('Only you can see it')
    await submitDialog()
    expect(dialog()!.textContent).toContain('Enter a name.')
    await submitDialog('x'.repeat(61))
    expect(dialog()!.textContent).toContain('60 characters')
    dialog()!.querySelector<HTMLInputElement>('.dt-check-row input')!.click()
    await submitDialog('Mine')
    await flush()
    expect(dialog()).toBeNull()
    expect(adapter.views).toHaveLength(1)
    expect(adapter.views[0]).toMatchObject({ name: 'Mine', kind: 'personal' })
    expect(adapter.views[0]!.state.sort).toEqual([{ column: 'product.name', dir: 'asc' }])
    expect(set).toHaveBeenCalledWith('orders', { defaultViewId: 'v1' })
    expect(trigger(w).text()).toBe('Mine')
    await openMenu(w)
    expect(row('Mine')!.textContent).toContain('Default')
    expect(menu()!.textContent).toContain('My views')
    await submitDialogClose(w)
    // Aynı adla ikinci kişisel görünüm: taken.
    await sortBy(w, 'product.name') // desc → edited
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }))
    await flush()
    expect(dialog()).toBeNull() // personal: doğrudan Save changes
    expect(adapter.views[0]!.state.sort).toEqual([{ column: 'product.name', dir: 'desc' }])
    expect(trigger(w).text()).not.toContain('Edited')
    await openMenu(w)
    menuButton('New view')!.click()
    await vi.advanceTimersByTimeAsync(1)
    await flush()
    await submitDialog('mine')
    expect(dialog()!.textContent).toContain('already have a view')
    w.unmount()
  })
  const submitDialogClose = async (w: W) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flush()
    void w
  }

  it('Rename, Duplicate ("{ad} copy" seçili), Delete onayı → remove; aktif silinince varsayılana dönülür', async () => {
    const adapter = memoryAdapter([
      { id: 'p1', name: 'Mine', kind: 'personal', state: { sort: [{ column: 'value', dir: 'desc' }] } },
    ])
    const w = await mountViews({ adapter })
    await rowAction(w, 'Mine', 'Rename')
    expect(dialog()!.textContent).toContain('Rename')
    expect(dialog()!.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe('Mine')
    await submitDialog('Renamed')
    expect(adapter.views[0]!.name).toBe('Renamed')
    await rowAction(w, 'Renamed', 'Duplicate')
    const input = dialog()!.querySelector<HTMLInputElement>('input[type="text"]')!
    expect(input.value).toBe('Renamed copy')
    expect(dialog()!.textContent).toContain('Value ↓')
    await submitDialog()
    expect(adapter.views.map((v) => v.name)).toEqual(['Renamed', 'Renamed copy'])
    expect(trigger(w).text()).toBe('Renamed copy')
    expect(w.get('.dt-head-cell[data-col="value"]').attributes('aria-sort')).toBe('descending')
    await rowAction(w, 'Renamed copy', 'Delete')
    const alert = document.querySelector<HTMLElement>('[role="alertdialog"]')!
    expect(alert.textContent).toContain('Delete “Renamed copy”?')
    expect(document.activeElement?.textContent?.trim()).toBe('Cancel')
    ;[...alert.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === 'Delete')!.click()
    await flush()
    expect(adapter.views.map((v) => v.name)).toEqual(['Renamed'])
    expect(trigger(w).text()).toBe('All orders')
    w.unmount()
  })

  it('adapter yoksa yalnızca Discard ve Set as default; New view yok', async () => {
    const w = await mountViews({ adapter: null })
    await sortBy(w, 'product.name')
    await openMenu(w)
    expect(menuButton('Discard changes')).toBeTruthy()
    expect(menuButton('Save as my view…')).toBeUndefined()
    expect(menuButton('New view')).toBeUndefined()
    w.unmount()
  })

  it('columns.visible beyaz liste; bilinmeyen sütun atlanır; Columns › Reset görünümün düzenine döner ve Edited kalkar', async () => {
    const views: View[] = [
      {
        id: 'v',
        name: 'Narrow',
        kind: 'system',
        state: { columns: { visible: ['status', 'product.name'], order: ['zzz', 'status', 'product.name', 'number'] } },
      },
    ]
    const w = await mountViews({ props: { views } })
    const ids = () => w.findAll('[role="columnheader"]').map((h) => h.attributes('data-col'))
    expect(ids()).toEqual(['number', 'status', 'product.name']) // primary hep görünür; zzz yok
    await w
      .findAll('.dt-toolbar button')
      .find((b) => b.text() === 'Display')!
      .trigger('click')
    await flush()
    const pop = document.querySelector<HTMLElement>('.dt-display')!
    ;[...pop.querySelectorAll<HTMLElement>('.dt-pop-item')].find((b) => b.textContent?.includes('Columns'))!.click()
    await flush()
    ;[
      ...[...pop.querySelectorAll<HTMLElement>('.dt-col-row')]
        .find((r) => r.textContent?.includes('Product'))!
        .querySelectorAll('button'),
    ]
      .at(-1)!
      .click()
    await flush()
    expect(ids()).toEqual(['number', 'status'])
    expect(trigger(w).text()).toContain('Edited')
    ;[...pop.querySelectorAll<HTMLElement>('.dt-pop-action')].find((b) => b.textContent?.trim() === 'Reset')!.click()
    await flush()
    expect(ids()).toEqual(['number', 'status', 'product.name'])
    expect(trigger(w).text()).not.toContain('Edited')
    w.unmount()
  })
})
