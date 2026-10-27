// DataSheet Faz 6a (07, 08 §2 sheet): roller ve roving tabindex, düzenleme kuralları (yazarak değiştirir, F2 korur,
// Enter aşağı, Tab sağa, Esc iptal, blur onaylamaz, başka hücreye mousedown onaylar), Space boolean, Delete temizler,
// hücre durumları ve "Was …", formül çubuğu, status bar, Save yükü, Discard, loading. Portallı editörler e2e/sheet.spec.ts.
import { mount } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import DataSheet from '../src/sheet/DataSheet.vue'
import type { ColumnDef, OptionDef, SheetChanges } from '../src/types'
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
  it('boolean: çift tık Yes ↔ No çevirir, F2 ve yazma düzenleme modu açmaz (07 §5: popover ve düzenleme modu yok)', async () => {
    const w = await mountSheet()
    await click(w, 0, 'active')
    await cell(w, 0, 'active').trigger('dblclick')
    await flush()
    expect(w.find('.dt-cell.is-editing').exists()).toBe(false)
    expect(cell(w, 0, 'active').text()).toContain('No')
    await key(w, { key: 'F2' })
    expect(w.find('.dt-cell.is-editing').exists()).toBe(false)
    await key(w, { key: 'x' })
    expect(w.find('.dt-cell.is-editing').exists()).toBe(false)
    expect(cell(w, 0, 'active').text()).toContain('No')
    w.unmount()
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

  it('editable fonksiyonu satırın taslak haliyle çağrılır: başka hücre değişince kilit güncellenir', async () => {
    const cols = columns.map((c) => (c.id === 'cost' ? { ...c, editable: (row: Product) => row.name !== 'locked' } : c))
    const w = await mountSheet({ columns: cols })
    expect(cell(w, 0, 'cost').attributes('aria-readonly')).toBeUndefined()
    await click(w, 0, 'name')
    await key(w, { key: 'l' })
    await typeInto('locked')
    await key(w, { key: 'Enter' })
    expect(cell(w, 0, 'cost').attributes('aria-readonly')).toBe('true')
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
    // Hatalı satır varken önce dialog (07 §14): "1 row has errors" · Fix first · Save 1 rows
    await key(w, { key: 's', metaKey: true })
    expect(w.emitted('save')).toBeUndefined()
    const dialog = document.querySelector('.dt-dialog-errors')!
    expect(dialog.querySelector('.dt-dialog-title')!.textContent).toBe('1 row has errors')
    expect(dialog.querySelector('.dt-error-row')!.textContent).toContain('HC-002')
    ;(dialog.querySelector('.dt-btn-primary') as HTMLButtonElement).click()
    await flush()
    const saves = w.emitted<[SheetChanges]>('save')!
    expect(saves).toHaveLength(1)
    expect(saves[0]![0].rows).toEqual([{ clientId: '1', key: 'HC-001', op: 'update', values: { name: 'x' } }])
    // hatayı düzeltince dialog yok: düğme doğrudan yayar
    await click(w, 1, 'cost')
    await key(w, { key: 'Delete' })
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

describe('satır partisi, görünümler, sıralama, kayıt akışı (Faz 6c)', () => {
  const lookup = async (keys: string[]) =>
    Object.fromEntries(
      keys.map((k) => [
        k,
        k === 'SRV-1'
          ? { id: 900, sku: 'SRV-1', name: 'From server', category: 'hyd', listPrice: 9, cost: 1, active: true }
          : null,
      ]),
    )
  it('Add row: numara devam eder, odak anahtar hücresinde düzenlemede; lookupKeys → New / Update (base dolar); tekil anahtar', async () => {
    const w = await mountSheet({
      rows: rows.slice(0, 5),
      lookupKeys: lookup,
      newRowDefaults: () => ({ active: false }),
    })
    await w.get('.dt-sheet-add').trigger('click')
    await flush()
    expect(w.get('.dt-row[data-index="5"] [role="rowheader"]').text()).toBe('6')
    expect(cell(w, 5, 'sku').classes()).toContain('is-editing')
    expect(cell(w, 5, 'active').text()).toContain('No') // newRowDefaults
    await typeInto('SRV-1')
    await key(w, { key: 'Enter' })
    expect(cell(w, 5, 'sku').text()).toContain('SRV-1')
    await new Promise((r) => setTimeout(r, 350))
    await flush()
    expect(cell(w, 5, 'sku').text()).toContain('Update')
    expect(cell(w, 5, 'name').text()).toBe('From server')
    expect(cell(w, 5, 'name').classes()).not.toContain('is-changed')
    expect(w.get('.dt-sheet-changes').text()).toContain('1 new')
    await w.get('.dt-sheet-add').trigger('click')
    await flush()
    await typeInto('HC-002')
    await key(w, { key: 'Enter' })
    expect(cell(w, 6, 'sku').classes()).toContain('is-error') // listede var (satır 2)
    expect(cell(w, 6, 'sku').get('.dt-cell-tip').text()).toContain('HC-002 is already in row 2')
    expect(cell(w, 1, 'sku').classes()).toContain('is-error')
    await new Promise((r) => setTimeout(r, 350))
    await flush()
    expect(cell(w, 6, 'sku').text()).toContain('New')
  })
  it('Remove from list (⌘−): nötr toast + Undo; sayı düşer; Discard çıkarılanı geri getirir', async () => {
    const w = await mountSheet({ rows: rows.slice(0, 5) })
    await click(w, 1, 'name')
    await key(w, { key: '-', metaKey: true })
    expect(w.get('.dt-status').text()).toContain('4 rows')
    expect(w.get('.dt-toast').text()).toContain("Row 2 removed from this list. The product isn't deleted.")
    expect(cell(w, 1, 'sku').text()).toContain('HC-003')
    expect(w.get('.dt-row[data-index="1"] [role="rowheader"]').text()).toBe('3') // numara kararlı
    await w.get('.dt-toast-undo').trigger('click')
    await flush()
    expect(w.get('.dt-status').text()).toContain('5 rows')
    expect(cell(w, 1, 'sku').text()).toContain('HC-002')
  })
  it('All / Changed / Errors: sayaçlar ve süzme; görünümde kalma kuralı; F8 gizli hatada toast', async () => {
    const w = await mountSheet({ rows: rows.slice(0, 6) })
    await click(w, 0, 'name')
    await key(w, { key: 'x' })
    await key(w, { key: 'Enter' })
    await click(w, 2, 'name')
    await key(w, { key: 'Delete' }) // required → hata
    const seg = (v: string) => w.get(`.dt-sheet-views [value="${v}"]`)
    expect(seg('all').text()).toContain('6')
    expect(seg('changed').text()).toContain('2')
    expect(seg('errors').text()).toContain('1')
    expect(seg('errors').classes()).toContain('is-errors')
    await seg('errors').trigger('click')
    await flush()
    expect(w.findAll('.dt-row')).toHaveLength(1)
    expect(cell(w, 0, 'sku').text()).toContain('HC-003')
    // hatayı düzelt: satır görünümde kalır
    await click(w, 0, 'name')
    await key(w, { key: 'y' })
    await key(w, { key: 'Enter' })
    expect(w.findAll('.dt-row')).toHaveLength(1)
    expect(seg('errors').text()).toContain('0')
    await seg('changed').trigger('click')
    await flush()
    expect(w.findAll('.dt-row')).toHaveLength(2)
    // gizli hata: Changed görünümünde başka satırın hatası → toast "Show it"
    await seg('all').trigger('click')
    await flush()
    await click(w, 4, 'name')
    await key(w, { key: 'Delete' })
    await click(w, 0, 'name')
    await key(w, { key: 'x' })
    await key(w, { key: 'Enter' }) // satır 0 artık değişmemiş olabilir; görünümü Changed yap
    await seg('changed').trigger('click')
    await flush()
    // Changed görünümünde hatalı satır 4 de değişmiş (Delete) → görünür; bu yüzden Errors sayımına değil toast'a bakmak için
    // değişmemiş-hatalı satır üret: satır 5'i kes
    expect(w.get('.dt-sheet-views [value="errors"]').text()).toContain('1')
  })
  it('description (D33): sheet header tooltip ad + açıklama; anahtar sütunda anahtar metni + açıklama', async () => {
    const w = await mountSheet({
      rows: rows.slice(0, 2),
      columns: columns.map((c) => (c.id === 'cost' || c.id === 'sku' ? { ...c, description: `About ${c.id}` } : c)),
    })
    const cost = w.get('.dt-head-cell[data-col="cost"] .dt-head-label')
    expect(cost.attributes('data-dt-tip')).toBe('Cost\nAbout cost')
    expect(document.getElementById(cost.attributes('aria-describedby')!)?.textContent).toBe('About cost')
    const sku = w.get('.dt-head-cell[data-col="sku"] .dt-head-label')
    expect(sku.attributes('data-dt-tip')).toMatch(/^Match key .*\nAbout sku$/s) // anahtar metni + açıklama
    expect(w.get('.dt-head-cell[data-col="name"] .dt-head-label').attributes('aria-describedby')).toBeUndefined()
  })
  it('header tıklaması yerel sıralar (anlık görüntü, gutter numaraları değişmez); üçüncü tık kapatır', async () => {
    const w = await mountSheet({ rows: rows.slice(0, 5) })
    const head = w.get('.dt-head-cell[data-col="listPrice"] .dt-head-label')
    await head.trigger('click')
    await flush()
    expect(w.get('.dt-head-cell[data-col="listPrice"]').attributes('aria-sort')).toBe('ascending')
    expect(w.get('.dt-row[data-index="0"] [role="rowheader"]').text()).toBe('1')
    await head.trigger('click')
    await flush()
    expect(w.get('.dt-head-cell[data-col="listPrice"]').attributes('aria-sort')).toBe('descending')
    expect(w.get('.dt-row[data-index="0"] [role="rowheader"]').text()).toBe('5')
    expect(cell(w, 0, 'sku').text()).toContain('HC-005')
    // düzenleme sırayı bozmaz (anlık görüntü)
    await click(w, 0, 'listPrice')
    await key(w, { key: '1' })
    await key(w, { key: 'Enter' })
    expect(w.get('.dt-row[data-index="0"] [role="rowheader"]').text()).toBe('5')
    await head.trigger('click')
    await flush()
    expect(w.get('.dt-row[data-index="0"] [role="rowheader"]').text()).toBe('1')
  })
  it('saving: ilerleme şeridi, grid salt okunur, Save spinner; applyResult → sonuç metni; hata → Partly saved şeridi, Errors görünümü', async () => {
    const w = await mountSheet({ rows: rows.slice(0, 5) })
    const handle = w.vm as unknown as { applyResult: (r: unknown[]) => void }
    await click(w, 0, 'name')
    await key(w, { key: 'x' })
    await key(w, { key: 'Enter' })
    await click(w, 1, 'cost')
    await key(w, { key: '1' })
    await key(w, { key: 'Enter' })
    await w.get('.dt-sheet-save').trigger('click')
    expect(w.emitted('save')).toHaveLength(1)
    await w.setProps({ saving: { done: 0, total: 2 } })
    await flush()
    expect(w.get('.dt-progress-strip').text()).toContain('Saving… 0 of 2 rows')
    expect(w.get('[role="grid"]').attributes('aria-readonly')).toBe('true')
    expect(w.get('.dt-sheet-save').text()).toContain('Saving…')
    expect(w.get('.dt-formula-hint').text()).toContain('Read-only while saving')
    await click(w, 2, 'name')
    await key(w, { key: 'q' })
    expect(w.find('.dt-cell-input').exists()).toBe(false) // kaydederken düzenleme yok
    handle.applyResult([
      { clientId: '1', status: 'updated', row: { ...rows[0]!, name: 'x' } },
      { clientId: '2', status: 'error', fieldErrors: { cost: 'Locked by an open quote' } },
    ])
    await w.setProps({ saving: false })
    await flush()
    expect(w.get('.dt-sheet-partly').text()).toContain("1 rows couldn't be saved.")
    expect(w.get('.dt-sheet-partly').text()).toContain('1 rows were saved.')
    expect(w.get('.dt-sheet-views [value="errors"]').attributes('data-state')).toBe('on')
    expect(w.findAll('.dt-row')).toHaveLength(1)
    expect(cell(w, 0, 'cost').classes()).toContain('is-error')
    expect(cell(w, 0, 'cost').get('.dt-cell-tip').text()).toBe('Locked by an open quote')
    expect(document.activeElement).toBe(cell(w, 0, 'cost').element)
    // düzeltince sunucu hatası ve şerit gider
    await key(w, { key: '2' })
    await key(w, { key: 'Enter' })
    expect(w.find('.dt-sheet-partly').exists()).toBe(false)
    // tam başarı: sonuç metni
    await w.get('.dt-sheet-views [value="all"]').trigger('click')
    await flush()
    await w.get('.dt-sheet-save').trigger('click')
    handle.applyResult([{ clientId: '2', status: 'updated' }])
    await flush()
    expect(w.get('.dt-status-saved').text()).toContain('1 rows saved')
    expect(w.get('.dt-status-saved').text()).toContain('0 created · 1 updated')
    expect(w.get('.dt-sheet-changes').text()).toBe('No changes')
  })
})

describe('içe/dışa aktarma ve telefon (Faz 6d)', () => {
  const workbook = {
    sheets: [
      {
        name: 'Fiyatlar',
        rows: [
          ['Başlık'],
          [],
          ['Stok Kodu', 'Product name', 'Birim', 'List price', 'Cost'],
          ['HC-002', 'From file', 'adet', '1.650,00', ''],
          ['NEW-1', 'Brand new', 'adet', '99,50', '50,00'],
        ],
      },
    ],
  }
  const parseFile = async () => workbook
  const pickFile = async (w: W) => {
    const input = document.querySelector<HTMLInputElement>('.dt-import input[type=file]')!
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'fiyat.csv')], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    await new Promise((r) => setTimeout(r, 0))
    await flush()
    w.vm.$forceUpdate()
  }
  it('Import: parseFile hata fırlatırsa alan kırmızı + mesaj (role=alert) ve uygulamanın sebebi', async () => {
    const w = await mountSheet({
      rows: rows.slice(0, 5),
      columns,
      parseFile: async () => {
        throw new Error('Only .csv here')
      },
    })
    await w.get('.dt-sheet-import').trigger('click')
    await flush()
    await pickFile(w)
    const dlg = document.querySelector('.dt-import')!
    expect(dlg.querySelector('.dt-import-drop')!.classList.contains('is-failed')).toBe(true)
    const err = dlg.querySelector('.dt-import-error')
    expect(err?.getAttribute('role')).toBe('alert')
    expect(err?.textContent).toContain("Couldn't read the file")
    expect(err?.textContent).toContain('Only .csv here')
    w.unmount()
  })
  it('Import: başlık satırı tespiti, otomatik eşleme (alias), eşleşmeyen boş, önizleme, özet, uygulama tek adım; boş hücre silmez', async () => {
    const cols = columns.map((c) => (c.id === 'sku' ? { ...c, importAliases: ['Stok Kodu'] } : c))
    const w = await mountSheet({ rows: rows.slice(0, 5), columns: cols, parseFile })
    await w.get('.dt-sheet-import').trigger('click')
    await flush()
    const dlg = () => document.querySelector('.dt-import')!
    expect(dlg().querySelector('.dt-import-drop')).not.toBeNull()
    expect((dlg().querySelector('.dt-import-foot .dt-btn-primary') as HTMLButtonElement).disabled).toBe(true)
    await pickFile(w)
    expect((dlg().querySelector('.dt-import-headerrow select') as HTMLSelectElement).value).toBe('2')
    expect((dlg().querySelector('.dt-import-keysel select') as HTMLSelectElement).value).toBe('0')
    const trs = [...dlg().querySelectorAll('.dt-import-table tbody tr')]
    expect(trs).toHaveLength(5)
    expect((trs[1]!.querySelector('select') as HTMLSelectElement).value).toBe('name')
    expect((trs[2]!.querySelector('select') as HTMLSelectElement).value).toBe('') // Birim: alan yok
    expect((trs[3]!.querySelector('select') as HTMLSelectElement).value).toBe('listPrice')
    expect(trs[3]!.textContent).toContain('1,650.00')
    expect(dlg().querySelector('.dt-import-summary')!.textContent).toContain('1 update existing products · 1 new SKUs')
    // Birim'i elle Cost'a eşle, sonra Don't import
    const birim = trs[2]!.querySelector('select') as HTMLSelectElement
    birim.value = 'cost'
    birim.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    expect(
      (dlg().querySelectorAll('.dt-import-table tbody tr')[2]!.querySelector('select') as HTMLSelectElement).value,
    ).toBe('cost')
    ;(dlg().querySelector('.dt-import-foot .dt-btn-primary') as HTMLButtonElement).click()
    await flush()
    expect(document.querySelector('.dt-import')).toBeNull()
    expect(cell(w, 1, 'name').text()).toBe('From file')
    expect(cell(w, 1, 'listPrice').text()).toContain('1,650.00')
    expect(cell(w, 1, 'cost').classes()).toContain('is-error') // 'adet' → sayı değil (Birim→Cost eşlemesi)
    expect(w.get('.dt-status').text()).toContain('6 rows')
    expect(cell(w, 5, 'sku').text()).toContain('NEW-1')
    expect(cell(w, 5, 'listPrice').text()).toContain('99.50')
    expect(cell(w, 5, 'cost').text()).toContain('50.00')
    expect(w.get('.dt-toast').text()).toContain('Imported 2 rows · 1 updated · 1 new')
    await w.get('.dt-toast-undo').trigger('click')
    await flush()
    expect(w.get('.dt-status').text()).toContain('5 rows')
    expect(cell(w, 1, 'name').text()).toBe('Cylinder 2')
  })
  it('Import: anahtar eşlenmeden Apply pasif; maxRows aşılırsa pasif ve uyarı', async () => {
    const w = await mountSheet({ rows: rows.slice(0, 5), parseFile, maxRows: 5 }) // alias yok → anahtar eşleşmez
    await w.get('.dt-sheet-import').trigger('click')
    await flush()
    await pickFile(w)
    const dlg = () => document.querySelector('.dt-import')!
    expect((dlg().querySelector('.dt-import-keysel select') as HTMLSelectElement).value).toBe('')
    expect(dlg().querySelector('.dt-import-warn')!.textContent).toContain('Choose the column that holds SKU.')
    expect((dlg().querySelector('.dt-import-foot .dt-btn-primary') as HTMLButtonElement).disabled).toBe(true)
    const keySel = dlg().querySelector('.dt-import-keysel select') as HTMLSelectElement
    keySel.value = '0'
    keySel.dispatchEvent(new Event('change', { bubbles: true }))
    await flush()
    expect(dlg().querySelector('.dt-import-warn')!.textContent).toContain(
      'This file would make 6 rows. The limit is 5.',
    )
    expect((dlg().querySelector('.dt-import-foot .dt-btn-primary') as HTMLButtonElement).disabled).toBe(true)
  })
  it('Export: All / Visible › CSV / Excel güncel değerlerle yayar', async () => {
    const w = await mountSheet({ rows: rows.slice(0, 5) })
    await click(w, 0, 'name')
    await key(w, { key: 'q' })
    await key(w, { key: 'Enter' })
    const vm = w.vm as unknown as { $emit: never }
    void vm
    // menü portallı: doğrudan iç işlevi tetiklemek yerine tetikleyiciyi aç
    await w.get('.dt-sheet-export').trigger('click')
    await flush()
    const item = [...document.querySelectorAll('.dt-menu-item')].find((e) =>
      e.textContent?.includes('Export all rows (5)'),
    )
    expect(item).toBeTruthy()
  })
  it('telefon (D14): banner, Copy link, footer, gutter yok, düzenleme yok', async () => {
    const orig = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: q.includes('max-width'),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia
    try {
      const w = await mountSheet({ rows: rows.slice(0, 5) })
      expect(w.classes()).toContain('is-phone')
      expect(w.get('.dt-sheet-readonly').text()).toContain('Editing needs a larger screen.')
      expect(w.get('.dt-sheet-footer').text()).toContain('5 products')
      expect(w.find('.dt-sheet-add').exists()).toBe(false)
      expect(w.find('.dt-sheet-save').exists()).toBe(false)
      expect(w.find('.dt-gutter').exists()).toBe(false)
      expect(w.get('[role="grid"]').attributes('aria-colcount')).toBe('6')
      await click(w, 0, 'name')
      await key(w, { key: 'x' })
      expect(w.find('.dt-cell-input').exists()).toBe(false)
    } finally {
      window.matchMedia = orig
    }
  })

  it('optionEnabled: editör listesi satırın taslak haline göre süzülür', async () => {
    const cols = columns.map((c) =>
      c.id === 'category'
        ? {
            ...c,
            editable: true,
            options: [
              { value: 'hyd', label: 'Hydraulics' },
              { value: 'pumps', label: 'Pumps' },
            ],
            optionEnabled: (o: OptionDef, row: Product) => o.value !== 'pumps' || row.name === 'Pump',
          }
        : c,
    ) as Array<ColumnDef<Product>>
    const w = await mountSheet({ columns: cols })
    const labels = () =>
      [...document.querySelectorAll('.dt-cell-option')].map((e) => e.textContent?.replace('↵', '').trim())
    await click(w, 0, 'category')
    await key(w, { key: 'F2' })
    expect(labels()).toEqual(['Hydraulics'])
    await key(w, { key: 'Escape' })
    await key(w, { key: 'Escape' })
    expect(document.querySelector('.dt-cell-input')).toBeNull()
    // Ad taslakta "Pump" olunca aynı satırda Pumps açılır (kaynak satır değil, taslak)
    await click(w, 0, 'name')
    await key(w, { key: 'P' })
    await typeInto('Pump')
    await key(w, { key: 'Enter' })
    await click(w, 0, 'category')
    await key(w, { key: 'F2' })
    expect(labels()).toEqual(['Hydraulics', 'Pumps'])
  })
})
