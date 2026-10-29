// Telefon düzeni (05 §11, 04 §9, handoff 04): kart < 640 → is-phone; toolbar ikonları; Filters alt sayfası taslak + Show results;
// ⋯ alt sayfası; görünüm alt sayfası; bulk bar 2 aksiyon + More sayfası; footer yalnızca Önceki / Sonraki; birincil sütun sola sabit.
// Görsel ve dokunma senaryoları e2e/phone.spec.ts.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import DataTable from '../src/list/DataTable.vue'
import type { BulkAction, ColumnDef, TableRequest } from '../src/types'
import { flush, mockCardWidth, mockLayout } from './helpers/dom'

interface Order {
  id: number
  number: string
  product: string
  status: string | null
  value: number
}
const rows: Order[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  number: `WO-${100 + i}`,
  product: `Pump ${i}`,
  status: i % 2 ? 'done' : 'in_progress',
  value: 100 * i,
}))
const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', headerShort: 'No.', type: 'id', primary: true },
  { id: 'product', header: 'Product', type: 'string' },
  {
    id: 'status',
    header: 'Status',
    type: 'select',
    suggested: true,
    options: [
      { value: 'done', label: 'Done' },
      { value: 'in_progress', label: 'In progress' },
    ],
  },
  { id: 'value', header: 'Value', type: 'currency', currency: 'TRY' },
]
const bulkActions: Array<BulkAction<Order>> = [
  { id: 'a', label: 'Release', inBar: true, run: () => {} },
  { id: 'b', label: 'Reschedule', inBar: true, run: () => {} },
  { id: 'c', label: 'Assign', inBar: true, run: () => {} },
  { id: 'd', label: 'Cancel…', destructive: true, run: vi.fn() },
]

beforeAll(() => {
  mockCardWidth(390)
  mockLayout()
})
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const mountPhone = async (extra: Record<string, unknown> = {}) => {
  const w = mount(DataTable<Order>, {
    props: {
      tableId: 'orders',
      columns,
      rows,
      selectable: true,
      bulkActions,
      entityName: { one: 'order', other: 'orders' },
      ...extra,
    },
    attachTo: document.body,
  })
  // Telefon alt sayfaları tembel yüklenir (defineAsyncComponent): dinamik import'lar bitene kadar bekle.
  await flush()
  await vi.dynamicImportSettled()
  await flush()
  return w
}
const sheet = () => document.body.querySelector<HTMLElement>('.dt-bsheet')
const sheetRows = () => [...(sheet()?.querySelectorAll<HTMLElement>('.dt-bsheet-row, .dt-bsheet-row-main') ?? [])]
const rowNamed = (text: string) => sheetRows().find((r) => r.textContent?.includes(text))!
const click = async (el: Element | null | undefined) => {
  ;(el as HTMLElement).click()
  await flush()
}

describe('DataTable · telefon düzeni', () => {
  it('kart < 640: is-phone; toolbar ikon düğmeleri; birincil sütun sola sabit, sağa sabit yok; kısa header', async () => {
    const w = await mountPhone({
      views: [{ id: 'v', name: 'All', kind: 'system', state: { columns: { pinned: { left: [], right: ['product'] } } } }],
    })
    expect(w.classes()).toContain('is-phone')
    expect(w.find('.dt-toolbar.is-phone').exists()).toBe(true)
    expect(w.find('.dt-search-open').exists()).toBe(true)
    expect(w.find('.dt-filter-trigger').attributes('aria-label')).toBe('Filter')
    expect(w.find('.dt-more-trigger').exists()).toBe(true)
    expect(w.find('.dt-head-cell[data-col="number"]').classes()).toContain('is-pinned-start')
    expect(w.find('.dt-head-cell[data-col="product"]').classes()).not.toContain('is-pinned-end')
    expect(w.find('.dt-head-cell[data-col="number"] .dt-head-text').text()).toBe('No.')
    expect(w.find('.dt-footer').attributes('role')).toBe('navigation')
    expect(w.find('.dt-footer-size').exists()).toBe(false)
    w.unmount()
  })

  it('Filters alt sayfası: Suggested → editör → Done → Show results tek adımda uygular; çip tek düğme, × yok', async () => {
    const w = await mountPhone()
    await click(w.find('.dt-filter-trigger').element)
    expect(sheet()?.textContent).toContain('Filters')
    expect(sheet()?.textContent).toContain('Suggested')
    await click(rowNamed('Status'))
    expect(sheet()?.querySelector('.dt-bsheet-back')).toBeTruthy()
    const done = sheet()!.querySelector<HTMLInputElement>('.dt-option input')!
    done.click()
    await flush()
    // Henüz uygulanmadı (taslak).
    expect(w.find('.dt-footer-rows').text()).toContain('1–30')
    await click(sheet()!.querySelector('.dt-bsheet-primary'))
    expect(sheet()?.textContent).toContain('Filters')
    await click(sheet()!.querySelector('.dt-bsheet-primary'))
    expect(sheet()).toBeNull()
    expect(w.find('.dt-footer-rows').text()).toContain('1–15')
    const chip = w.find('.dt-chip')
    expect(chip.classes()).toContain('is-phone')
    expect(chip.find('.dt-chip-remove').exists()).toBe(false)
    expect(chip.find('.dt-chip-body').attributes('aria-label')).toMatch(/^Status is .*Open filters$/)
    // Çipe dokunmak sayfayı o filtrenin editöründe açar; Clear all + Show results temizler.
    await click(chip.find('.dt-chip-body').element)
    expect(sheet()?.querySelector('.dt-bsheet-title')?.textContent).toBe('Status')
    await click(sheet()!.querySelector('.dt-bsheet-back'))
    await click(sheet()!.querySelector('.dt-bsheet-action'))
    await click(sheet()!.querySelector('.dt-bsheet-primary'))
    expect(w.find('.dt-chip').exists()).toBe(false)
    expect(w.find('.dt-footer-rows').text()).toContain('1–30')
    w.unmount()
  })

  it('Sort bölümü: sütun + yön Show results ile uygulanır; sunucu modunda tek talep', async () => {
    const w = await mountPhone({ mode: 'server', rows: rows.slice(0, 5), onRequest: () => {} })
    const before = (w.emitted('request') ?? []).length
    await click(w.find('.dt-filter-trigger').element)
    const select = sheet()!.querySelector<HTMLSelectElement>('.dt-bsheet-row.is-sort select')!
    select.value = 'value'
    select.dispatchEvent(new Event('change'))
    await flush()
    await click(sheet()!.querySelector('.dt-bsheet-dir [value="desc"]'))
    await click(sheet()!.querySelector('.dt-bsheet-primary'))
    const reqs = (w.emitted('request') ?? []).map((e) => e[0] as TableRequest)
    expect(reqs.length).toBe(before + 1)
    expect(reqs.at(-1)!.query.sort).toEqual([{ column: 'value', dir: 'desc' }])
    w.unmount()
  })

  it('⋯ alt sayfası: Display başlığı, Density › seçim yoğunluğu değiştirir, Export › CSV olayı', async () => {
    const w = await mountPhone({ onExport: () => {} })
    await click(w.find('.dt-more-trigger').element)
    expect(sheet()?.textContent).toContain('Display')
    await click(rowNamed('Density'))
    await click(rowNamed('Compact'))
    expect(w.find('.dt-grid').attributes('data-density')).toBe('compact')
    await click(rowNamed('Export 30 rows'))
    await click(rowNamed('CSV'))
    expect(sheet()).toBeNull()
    expect(w.emitted('export')?.[0]?.[0]).toMatchObject({ format: 'csv' })
    w.unmount()
  })

  it('bulk bar: 2 aksiyon + More; More alt sayfası sayaç etiketi ve yıkıcı en altta; seçim çalıştırınca kapanır', async () => {
    const w = await mountPhone()
    await w.find('.dt-row[data-index="0"] .dt-cell-select input').trigger('click')
    await flush()
    const bulk = w.find('.dt-bulk')
    expect(bulk.classes()).toContain('is-phone')
    expect(bulk.findAll('.dt-bulk-btn:not(.dt-bulk-more):not(.dt-bulk-icon)').length).toBe(2)
    await click(bulk.find('.dt-bulk-more').element)
    expect(sheet()?.querySelector('.dt-bsheet-label')?.textContent).toBe('1 selected')
    const items = sheetRows()
    expect(items.at(-1)?.classList.contains('is-destructive')).toBe(true)
    await click(items.at(-1))
    expect(sheet()).toBeNull()
    expect(bulkActions[3]!.run).toHaveBeenCalled()
    w.unmount()
  })
})
