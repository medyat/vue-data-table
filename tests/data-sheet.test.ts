// DataSheet Faz 6a (07, 08 §2 sheet): roller ve roving tabindex, düzenleme kuralları (yazarak değiştirir, F2 korur,
// Enter aşağı, Tab sağa, Esc iptal, blur onaylamaz, başka hücreye mousedown onaylar), Space boolean, Delete temizler,
// hücre durumları ve "Was …", formül çubuğu, status bar, Save yükü, Discard, loading. Portallı editörler e2e/sheet.spec.ts.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import DataSheet from '../src/sheet/DataSheet.vue'
import type { ColumnDef, SheetChanges } from '../src/types'
import { flush, mockLayout } from './helpers/dom'

interface Product {
  id: number
  sku: string
  name: string
  category: string
  listPrice: number
  cost: number
  active: boolean
}
const rows: Product[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  sku: `HC-${String(i + 1).padStart(3, '0')}`,
  name: `Cylinder ${i + 1}`,
  category: 'hyd',
  listPrice: 100 * (i + 1),
  cost: 60 * (i + 1),
  active: true,
}))
const columns: Array<ColumnDef<Product>> = [
  { id: 'sku', header: 'SKU', type: 'id' },
  { id: 'name', header: 'Product name', type: 'string', primary: true, editable: true, required: true },
  { id: 'category', header: 'Category', type: 'select', options: [{ value: 'hyd', label: 'Hydraulics' }] },
  {
    id: 'listPrice',
    header: 'List price',
    type: 'currency',
    currency: 'TRY',
    editable: true,
    required: true,
    hint: '≥ 0',
  },
  {
    id: 'cost',
    header: 'Cost',
    type: 'currency',
    currency: 'TRY',
    editable: true,
    validate: (v, { row }) => (typeof v === 'number' && v > row.listPrice ? 'cost > price' : null),
  },
  { id: 'active', header: 'Active', type: 'boolean', editable: true },
]

beforeAll(mockLayout)
const mounted: Array<{ unmount: () => void }> = []
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount()
})
const mountSheet = async (extra: Record<string, unknown> = {}) => {
  const w = mount(DataSheet<Product>, {
    props: {
      tableId: 'products',
      keyColumn: 'sku',
      columns,
      rows,
      entityName: { one: 'product', other: 'products' },
      ...extra,
    },
    attachTo: document.body,
  })
  await flush()
  mounted.push(w)
  return w
}
type W = Awaited<ReturnType<typeof mountSheet>>
const cell = (w: W, i: number, col: string) => w.get(`.dt-row[data-index="${i}"] .dt-cell[data-col="${col}"]`)
// jsdom'da her getBoundingClientRect 0..1000 × 0..40 döner (mockLayout): fill handle dikdörtgen testi yanılmasın diye
// tık koordinatları o alanın dışında.
const click = async (w: W, i: number, col: string) => {
  await cell(w, i, col).trigger('mousedown', { button: 0, clientX: 500, clientY: 500 })
  await flush()
}
const key = async (w: W, init: KeyboardEventInit) => {
  await (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
  )
  await flush()
}
const input = () => document.querySelector<HTMLInputElement>('.dt-cell-input')!
const typeInto = async (text: string) => {
  input().value = text
  input().dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

describe('yapı ve roving tabindex', () => {
  it('grid/rowheader/gridcell rolleri; gutter numarası; anahtar ve salt okunur hücreler aria-readonly', async () => {
    const w = await mountSheet()
    const grid = w.get('[role="grid"]')
    expect(grid.attributes('aria-label')).toBe('products')
    expect(grid.attributes('aria-colcount')).toBe('7') // 6 sütun + gutter
    expect(grid.attributes('aria-rowcount')).toBe('40')
    expect(w.get('.dt-row[data-index="0"] [role="rowheader"]').text()).toBe('1')
    expect(cell(w, 0, 'sku').attributes('aria-readonly')).toBe('true')
    expect(cell(w, 0, 'category').attributes('aria-readonly')).toBe('true') // editable verilmedi
    expect(cell(w, 0, 'name').attributes('aria-readonly')).toBeUndefined()
    expect(w.find('.dt-cell[tabindex="0"]').exists()).toBe(false) // seçim yok
    await click(w, 2, 'name')
    expect(cell(w, 2, 'name').attributes('tabindex')).toBe('0')
    expect(cell(w, 2, 'name').classes()).toContain('is-active')
    expect(document.activeElement).toBe(cell(w, 2, 'name').element)
    expect(w.get('.dt-formula-name').text()).toContain('HC-003')
    expect(w.get('.dt-formula-hint').text()).toBe('Text · required')
    await key(w, { key: 'ArrowRight' })
    expect(cell(w, 2, 'category').attributes('tabindex')).toBe('0')
    await key(w, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(cell(w, 3, 'category').element)
  })
})

describe('düzenleme kuralları (07 §5)', () => {
  it('yazmak içeriği değiştirir, Enter onaylar ve aşağı iner; hücre Changed + "Was …"', async () => {
    const w = await mountSheet()
    await click(w, 1, 'listPrice')
    await key(w, { key: '2' })
    expect(cell(w, 1, 'listPrice').classes()).toContain('is-editing')
    expect(input().value).toBe('2')
    expect(document.activeElement).toBe(input())
    await typeInto('2.240,00')
    await key(w, { key: 'Enter' })
    expect(cell(w, 1, 'listPrice').classes()).toContain('is-changed')
    expect(cell(w, 1, 'listPrice').text()).toContain('2,240.00')
    expect(cell(w, 1, 'listPrice').attributes('data-dt-tip')).toBe('Was 200.00 TRY')
    expect(document.activeElement).toBe(cell(w, 2, 'listPrice').element)
    expect(w.get('.dt-status').text()).toContain('1 changes in 1 rows')
    expect(w.get('.dt-sheet-changes').text()).toContain('1 changes in 1 rows')
    expect(w.find('.dt-row[data-index="1"] .dt-mark.is-changed').exists()).toBe(true)
  })
  it('F2 mevcut değeri korur; Esc iptal eder; Tab sağa onaylar', async () => {
    const w = await mountSheet()
    await click(w, 0, 'name')
    await key(w, { key: 'F2' })
    expect(input().value).toBe('Cylinder 1')
    await typeInto('Cylinder 1 X')
    await key(w, { key: 'Escape' })
    expect(cell(w, 0, 'name').classes()).not.toContain('is-changed')
    expect(cell(w, 0, 'name').text()).toBe('Cylinder 1')
    expect(document.activeElement).toBe(cell(w, 0, 'name').element)
    await key(w, { key: 'F2' })
    await typeInto('Renamed')
    await key(w, { key: 'Tab' })
    expect(cell(w, 0, 'name').text()).toBe('Renamed')
    expect(document.activeElement).toBe(cell(w, 0, 'category').element)
  })
  it('blur onaylamaz; başka hücreye mousedown ve ızgara dışına pointerdown onaylar', async () => {
    const w = await mountSheet()
    await click(w, 0, 'cost')
    await key(w, { key: '7' })
    input().blur()
    await flush()
    expect(cell(w, 0, 'cost').classes()).toContain('is-editing')
    await click(w, 1, 'cost')
    expect(cell(w, 0, 'cost').classes()).not.toContain('is-editing')
    expect(cell(w, 0, 'cost').text()).toContain('7.00')
    await key(w, { key: '8' })
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flush()
    expect(cell(w, 1, 'cost').classes()).toContain('is-changed')
    // ızgara dışı ama formül çubuğu: onaylamaz
    await click(w, 2, 'cost')
    await key(w, { key: '9' })
    w.get('.dt-formula-value').element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flush()
    expect(cell(w, 2, 'cost').classes()).toContain('is-editing')
  })
  it('salt okunur hücrede yazmak düzenlemez; loading sürerken hiçbir hücre düzenlenmez', async () => {
    const w = await mountSheet()
    await click(w, 0, 'sku')
    await key(w, { key: 'a' })
    expect(w.find('.dt-cell-input').exists()).toBe(false)
    await w.setProps({ loading: { done: 10, total: 40 } })
    await flush()
    expect(w.get('.dt-progress').attributes('aria-valuenow')).toBe('25')
    expect(w.get('.dt-progress-count').text()).toBe('10 of 40')
    expect(w.findAll('.dt-row-skeleton').length).toBeGreaterThan(0)
    expect(w.get('.dt-status').text()).toContain('Loading…')
  })
  it('Space boolean çevirir; Delete seçimi temizler (salt okunur atlanır); required boş → "Required"', async () => {
    const w = await mountSheet()
    await click(w, 0, 'active')
    await key(w, { key: ' ' })
    expect(cell(w, 0, 'active').classes()).toContain('is-changed')
    expect(cell(w, 0, 'active').text()).toContain('No')
    await click(w, 1, 'sku')
    await key(w, { key: 'ArrowRight', shiftKey: true })
    await key(w, { key: 'Delete' })
    expect(cell(w, 1, 'sku').text()).toContain('HC-002')
    expect(cell(w, 1, 'name').classes()).toContain('is-error')
    expect(cell(w, 1, 'name').get('.dt-cell-content').text()).toBe('Required')
    expect(w.find('.dt-row[data-index="1"] .dt-mark.is-error').exists()).toBe(true)
    expect(w.get('.dt-status-errors').text()).toContain('1 error — go to')
  })
  it('çapraz kural: cost > list price; aralık adı ve seçim sınıfları', async () => {
    const w = await mountSheet()
    await click(w, 0, 'cost')
    await key(w, { key: '5' })
    await typeInto('500')
    await key(w, { key: 'Enter' })
    expect(cell(w, 0, 'cost').classes()).toContain('is-error')
    expect(cell(w, 0, 'cost').get('.dt-cell-tip').text()).toBe('cost > price')
    await click(w, 3, 'name')
    await key(w, { key: 'ArrowDown', shiftKey: true })
    await key(w, { key: 'ArrowRight', shiftKey: true })
    expect(w.get('.dt-formula-name').text()).toBe('2 × 2 cells')
    expect(cell(w, 3, 'name').classes()).toEqual(expect.arrayContaining(['is-selected', 'is-edge-l', 'is-edge-t']))
    expect(cell(w, 4, 'category').classes()).toEqual(expect.arrayContaining(['is-selected', 'is-edge-r', 'is-edge-b']))
    await key(w, { key: 'Escape' })
    expect(cell(w, 4, 'category').classes()).not.toContain('is-selected')
  })
})

describe('formül çubuğu, Save, Discard, handle', () => {
  it('formül çubuğuna yazmak hücreyi düzenler; Enter onaylar ve aşağı iner', async () => {
    const w = await mountSheet()
    await click(w, 0, 'name')
    const f = w.get<HTMLInputElement>('.dt-formula-value')
    expect(f.element.value).toBe('Cylinder 1')
    f.element.value = 'From formula'
    await f.trigger('input')
    expect(cell(w, 0, 'name').classes()).toContain('is-editing')
    expect(w.find('.dt-cell-input').exists()).toBe(false)
    await f.trigger('keydown', { key: 'Enter' })
    await flush()
    expect(cell(w, 0, 'name').text()).toBe('From formula')
    expect(document.activeElement).toBe(cell(w, 1, 'name').element)
  })
  it('Save: ⌘S ve düğme @save yayar; hatalı satır yükte yok; Discard geri alır; handle', async () => {
    const w = await mountSheet()
    const handle = w.vm as unknown as { status: { changedCells: number }; isDirty: () => boolean; reset: () => void }
    expect(w.get('.dt-sheet-save').attributes('disabled')).toBeDefined()
    await click(w, 0, 'name')
    await key(w, { key: 'x' })
    await key(w, { key: 'Enter' })
    await click(w, 1, 'cost')
    await key(w, { key: '9' })
    await typeInto('99999')
    await key(w, { key: 'Enter' })
    expect(handle.status.changedCells).toBe(2)
    expect(handle.isDirty()).toBe(true)
    await key(w, { key: 's', metaKey: true })
    const saves = w.emitted<[SheetChanges]>('save')!
    expect(saves).toHaveLength(1)
    expect(saves[0]![0].rows).toEqual([{ clientId: '1', key: 'HC-001', op: 'update', values: { name: 'x' } }])
    await w.get('.dt-sheet-save').trigger('click')
    expect(w.emitted('save')).toHaveLength(2)
    handle.reset()
    await flush()
    expect(handle.status.changedCells).toBe(0)
    expect(cell(w, 0, 'name').text()).toBe('Cylinder 1')
    expect(w.get('.dt-sheet-changes').text()).toBe('No changes')
  })
})

/** jsdom'da ClipboardEvent/DataTransfer yok: `clipboardData` sahte nesneyle. */
const clipboardEvent = (type: 'copy' | 'cut' | 'paste', text = '') => {
  const data: Record<string, string> = { 'text/plain': text }
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'clipboardData', {
    value: { getData: (t: string) => data[t] ?? '', setData: (t: string, v: string) => (data[t] = v) },
  })
  return { e, data }
}
const dispatchClipboard = async (type: 'copy' | 'cut' | 'paste', text = '') => {
  const { e, data } = clipboardEvent(type, text)
  document.activeElement!.dispatchEvent(e)
  await flush()
  return { data, prevented: e.defaultPrevented }
}

describe('pano, doldurma, geri al (Faz 6b)', () => {
  it('kopyalama: görüntülenen biçimde TSV + HTML; kesme temizler (salt okunur kalır)', async () => {
    const w = await mountSheet()
    await click(w, 0, 'sku')
    await key(w, { key: 'ArrowRight', shiftKey: true })
    await key(w, { key: 'ArrowDown', shiftKey: true })
    const c = await dispatchClipboard('copy')
    expect(c.prevented).toBe(true)
    expect(c.data['text/plain']).toBe('HC-001\tCylinder 1\nHC-002\tCylinder 2')
    expect(c.data['text/html']).toContain('<td>HC-001</td>')
    expect(w.get('.dt-status-summary').text()).toMatch(/Count\s*4/)
    await dispatchClipboard('cut')
    expect(cell(w, 0, 'sku').text()).toContain('HC-001') // anahtar salt okunur: kopyalanır, temizlenmez
    expect(cell(w, 0, 'name').get('.dt-cell-content').text()).toBe('Required')
    expect(w.get('.dt-sheet-changes').text()).toContain('2 changes in 2 rows')
  })
  it('yapıştırma: aktif hücreden, read-only atlanır, tek değer aralığa, toast + Review + Undo; sona taşan yeni satır', async () => {
    // 20 satır: hepsi DOM'da (jsdom'da programatik kaydırma scroll olayı üretmez, sanal pencere ilerlemez).
    const w = await mountSheet({ rows: rows.slice(0, 20) })
    await click(w, 18, 'sku')
    const p = await dispatchClipboard('paste', 'K1\tPasted A\t5\nK2\tPasted B\t6\nK3\tPasted C\t7')
    expect(p.prevented).toBe(true)
    expect(cell(w, 18, 'sku').text()).toContain('HC-019')
    expect(cell(w, 18, 'name').text()).toBe('Pasted A')
    expect(cell(w, 19, 'name').text()).toBe('Pasted B')
    expect(w.get('.dt-status').text()).toContain('21 rows')
    expect(w.get('.dt-status').text()).toContain('1 new row')
    expect(cell(w, 20, 'sku').text()).toContain('K3')
    expect(cell(w, 20, 'sku').classes()).toContain('is-new')
    expect(cell(w, 20, 'sku').text()).toContain('New')
    expect(w.get('.dt-row[data-index="20"] [role="rowheader"]').text()).toBe('21')
    expect(cell(w, 20, 'listPrice').get('.dt-cell-content').text()).toBe('Required')
    expect(w.get('.dt-toast').text()).toContain('Pasted 3 rows × 3 columns')
    expect(w.find('.dt-toast-warn').exists()).toBe(false) // category salt okunur: atlandı, hata yok
    expect(cell(w, 18, 'category').text()).toContain('Hydraulics')
    expect(cell(w, 18, 'name').classes()).toContain('is-selected')
    expect(cell(w, 20, 'category').classes()).toContain('is-selected')
    await w.get('.dt-toast-undo').trigger('click')
    await flush()
    expect(w.get('.dt-status').text()).toContain('20 rows')
    expect(cell(w, 18, 'name').text()).toBe('Cylinder 19')
    // tek değer + aralık
    await click(w, 0, 'cost')
    await key(w, { key: 'ArrowDown', shiftKey: true })
    await dispatchClipboard('paste', '1')
    expect(cell(w, 0, 'cost').text()).toContain('1.00')
    expect(cell(w, 1, 'cost').text()).toContain('1.00')
    // maxRows sınırı
    await w.setProps({ maxRows: 20 })
    await click(w, 19, 'name')
    await dispatchClipboard('paste', 'x\ny')
    expect(w.get('.dt-toast').text()).toBe('This paste would make 21 rows. The limit is 20.')
    expect(w.get('.dt-status').text()).toContain('20 rows')
  })
  it('⌘D ilk satırdan aşağı doldurur; undo/redo seçimi adıma taşır; toolbar düğmeleri', async () => {
    const w = await mountSheet()
    const undoBtn = w.findAll('.dt-sheet-undo')[0]!
    expect(undoBtn.attributes('aria-disabled')).toBe('true')
    await click(w, 2, 'listPrice')
    await key(w, { key: 'ArrowDown', shiftKey: true })
    await key(w, { key: 'ArrowDown', shiftKey: true })
    await key(w, { key: 'd', metaKey: true })
    expect(cell(w, 3, 'listPrice').text()).toContain('300.00')
    expect(cell(w, 4, 'listPrice').text()).toContain('300.00')
    expect(undoBtn.attributes('aria-disabled')).toBeUndefined()
    await click(w, 10, 'name')
    await key(w, { key: 'z', metaKey: true })
    expect(cell(w, 4, 'listPrice').text()).toContain('500.00')
    expect(cell(w, 3, 'listPrice').classes()).toContain('is-selected')
    expect(document.activeElement).toBe(cell(w, 3, 'listPrice').element)
    await key(w, { key: 'z', metaKey: true, shiftKey: true })
    expect(cell(w, 4, 'listPrice').text()).toContain('300.00')
    await undoBtn.trigger('click')
    await flush()
    expect(cell(w, 4, 'listPrice').text()).toContain('500.00')
  })
  it('Find in grid: eşleşme sayısı, vurgulanan hücre, Enter sonraki; ⌘F odaklar', async () => {
    const w = await mountSheet()
    await click(w, 0, 'name')
    await key(w, { key: 'f', metaKey: true })
    const input = w.get<HTMLInputElement>('.dt-search input')
    expect(document.activeElement).toBe(input.element)
    input.element.value = 'Cylinder 1'
    await input.trigger('input')
    await new Promise((r) => setTimeout(r, 300))
    await flush()
    expect(w.get('.dt-find-count').text()).toBe('1 of 11') // 1, 10–19
    expect(cell(w, 0, 'name').classes()).toContain('is-match')
    expect(cell(w, 0, 'name').classes()).toContain('is-active')
    await input.trigger('keydown', { key: 'Enter' })
    await flush()
    expect(w.get('.dt-find-count').text()).toBe('2 of 11')
    expect(cell(w, 9, 'name').classes()).toContain('is-active')
  })
  it('"Use Pumps": balondaki düğme öneriyi yazar', async () => {
    const w = await mountSheet({
      columns: columns.map((c) =>
        c.id === 'category'
          ? {
              ...c,
              editable: true,
              options: [
                { value: 'hyd', label: 'Hydraulics' },
                { value: 'pumps', label: 'Pumps' },
              ],
            }
          : c,
      ),
    })
    await click(w, 0, 'category')
    await dispatchClipboard('paste', 'Pump')
    expect(cell(w, 0, 'category').classes()).toContain('is-error')
    const btn = cell(w, 0, 'category').get('.dt-cell-tip-btn')
    expect(btn.text()).toBe('Use Pumps')
    await btn.trigger('click')
    await flush()
    expect(cell(w, 0, 'category').classes()).not.toContain('is-error')
    expect(cell(w, 0, 'category').text()).toContain('Pumps')
  })
})
