// DataSheet deposu ve giriş çözümleme (07 §5, §7, §18; Faz 6a kabul kriterleri): tek okuyucu, bilinçli null (Map.has),
// orijinale dönünce taslaktan düşme, sayaçlar, doğrulama sırası (tip → required → validate → warn) ve çapraz kural,
// @save yükü; sayı ("2240", "2.240,00", "2,240.00", "%20"), tarih ("24.10", "+7d", "today") ve seçenek çözümleme.
import { describe, expect, it } from 'vitest'
import { createI18n } from '../src/core/i18n'
import { inputText, parseDateInput, parseInput } from '../src/sheet/parse'
import { useSheetStore } from '../src/sheet/useSheetStore'
import type { ColumnDef } from '../src/types'

interface Product {
  id: number
  sku: string
  name: string
  category: string | null
  listPrice: number | null
  cost: number | null
  note: string | null
}
const rows: Product[] = [
  { id: 1, sku: 'HC-080-S', name: 'Cylinder', category: 'hyd', listPrice: 100, cost: 60, note: null },
  { id: 2, sku: 'GP-25', name: 'Pump', category: 'pumps', listPrice: 200, cost: 150, note: 'x' },
]
const columns: Array<ColumnDef<Product>> = [
  { id: 'sku', header: 'SKU', type: 'id' },
  { id: 'name', header: 'Name', type: 'string', editable: true, required: true },
  {
    id: 'category',
    header: 'Category',
    type: 'select',
    editable: true,
    options: [
      { value: 'hyd', label: 'Hydraulics' },
      { value: 'pumps', label: 'Pumps' },
    ],
  },
  {
    id: 'listPrice',
    header: 'List price',
    type: 'currency',
    currency: 'TRY',
    editable: true,
    required: true,
    validate: (v) => (typeof v === 'number' && v < 0 ? 'negative' : null),
    warn: (v, { original }) =>
      typeof v === 'number' && typeof original === 'number' && Math.abs(v - original) / original > 0.4
        ? 'big change'
        : null,
  },
  {
    id: 'cost',
    header: 'Cost',
    type: 'currency',
    currency: 'TRY',
    editable: true,
    validate: (v, { row }) =>
      typeof v === 'number' && typeof row.listPrice === 'number' && v > row.listPrice ? 'cost > price' : null,
  },
  { id: 'note', header: 'Note', type: 'string', editable: true },
]
const i18n = createI18n({ locale: 'en' })
const def = (id: string) => columns.find((c) => c.id === id)!
const make = () => useSheetStore<Product>({ rows, columns, rowKey: 'id', keyColumn: 'sku', i18n, locale: 'en' })

describe('useSheetStore', () => {
  it('tek okuyucu: taslak → satır; rows değişmez', () => {
    const s = make()
    expect(s.read(rows[0]!, def('name'))).toBe('Cylinder')
    s.set(rows[0]!, def('name'), 'Cylinder 80')
    expect(s.read(rows[0]!, def('name'))).toBe('Cylinder 80')
    expect(rows[0]!.name).toBe('Cylinder')
    expect(s.current(rows[0]!)).toEqual({ ...rows[0]!, name: 'Cylinder 80' })
  })
  it('bilinçli null korunur (Map.has); orijinale dönünce taslaktan düşer', () => {
    const s = make()
    s.set(rows[1]!, def('note'), null)
    expect(s.read(rows[1]!, def('note'))).toBeNull()
    expect(s.rowDraft('2')?.has('note')).toBe(true)
    expect(s.counts.value).toMatchObject({ changedCells: 1, changedRows: 1 })
    s.set(rows[1]!, def('note'), 'x')
    expect(s.rowDraft('2')).toBeUndefined()
    expect(s.counts.value.changedCells).toBe(0)
    // boş değerler eşdeğer: null → '' değişiklik değildir
    s.set(rows[0]!, def('note'), '')
    expect(s.counts.value.changedCells).toBe(0)
  })
  it('doğrulama: tip → required → validate → warn; aynı satırın çapraz kuralı yenilenir', () => {
    const s = make()
    s.set(rows[0]!, def('listPrice'), 'abc')
    expect(s.rowIssues('1')?.get('listPrice')).toEqual({ level: 'error', message: 'Enter a number' })
    s.set(rows[0]!, def('listPrice'), '=A1')
    expect(s.rowIssues('1')?.get('listPrice')?.message).toBe("Formulas aren't supported")
    s.set(rows[0]!, def('listPrice'), null)
    expect(s.rowIssues('1')?.get('listPrice')?.message).toBe('Required')
    s.set(rows[0]!, def('listPrice'), -5)
    expect(s.rowIssues('1')?.get('listPrice')?.message).toBe('negative')
    s.set(rows[0]!, def('listPrice'), 50)
    expect(s.rowIssues('1')?.get('listPrice')).toEqual({ level: 'warning', message: 'big change' })
    // çapraz: cost 60 > yeni liste fiyatı 50 → cost hücresi de hatalı (cost değişmedi)
    expect(s.rowIssues('1')?.get('cost')?.message).toBe('cost > price')
    expect(s.counts.value).toMatchObject({ errorRows: 1, warningRows: 1 })
    s.set(rows[0]!, def('category'), 'Pump')
    expect(s.rowIssues('1')?.get('category')?.message).toBe("“Pump” isn't an option")
  })
  it('getChanges: yalnızca değişmiş ve hatasız satırlar, yalnızca değişen alanlar, anahtar sütun değeri', () => {
    const s = make()
    s.set(rows[1]!, def('name'), 'New name')
    s.set(rows[1]!, def('note'), null)
    s.set(rows[0]!, def('cost'), 999) // cost > price → hata, gönderilmez
    expect(s.getChanges()).toEqual({
      rows: [{ clientId: '2', key: 'GP-25', op: 'update', values: { name: 'New name', note: null } }],
    })
    s.reset()
    expect(s.getChanges().rows).toEqual([])
    expect(s.counts.value).toEqual({ changedCells: 0, changedRows: 0, errorRows: 0, warningRows: 0, newRows: 0 })
  })
})

describe('parseInput', () => {
  const env = { locale: 'en', today: new Date(2026, 9, 21), todayWord: 'Today', yesWord: 'Yes', noWord: 'No' }
  const tr = { ...env, locale: 'tr', todayWord: 'Bugün' }
  it('sayılar yerel ayara göre; yüzde; boş → null; çözülemeyen ham metin', () => {
    const price = def('listPrice')
    expect(parseInput(price, '2240', env)).toBe(2240)
    expect(parseInput(price, '2.240,00', env)).toBe(2240)
    expect(parseInput(price, '2,240.00', env)).toBe(2240)
    expect(parseInput(price, '2,5', tr)).toBe(2.5)
    expect(parseInput(price, '2.5', env)).toBe(2.5)
    expect(parseInput(price, '', env)).toBeNull()
    expect(parseInput(price, 'abc', env)).toBe('abc')
    expect(parseInput(price, '=1+1', env)).toBe('=1+1')
    const pct: ColumnDef = { id: 'vat', header: 'VAT', type: 'percentage' }
    expect(parseInput(pct, '%20', env)).toBe(20)
    expect(parseInput(pct, '20%', env)).toBe(20)
  })
  it('tarihler: "24.10", "24.10.2026", "+7d", "today"/"bugün", ISO; geçersiz gün ham kalır', () => {
    expect(parseDateInput('24.10', env)).toBe('2026-10-24')
    expect(parseDateInput('24/10/2025', env)).toBe('2025-10-24')
    expect(parseDateInput('+7d', env)).toBe('2026-10-28')
    expect(parseDateInput('-1d', env)).toBe('2026-10-20')
    expect(parseDateInput('today', env)).toBe('2026-10-21')
    expect(parseDateInput('Bugün', tr)).toBe('2026-10-21')
    expect(parseDateInput('2026-02-03T10:00', env)).toBe('2026-02-03')
    expect(parseDateInput('31.02', env)).toBeNull()
    const date: ColumnDef = { id: 'd', header: 'D', type: 'date' }
    expect(parseInput(date, '31.02', env)).toBe('31.02')
  })
  it('seçenek etiketle, büyük/küçük harf ve İ/ı duyarsız; eşleşmeyen ham kalır', () => {
    const cat = def('category')
    expect(parseInput(cat, 'pumps', env)).toBe('pumps')
    expect(parseInput(cat, 'HYDRAULICS', env)).toBe('hyd')
    expect(parseInput(cat, 'Pump', env)).toBe('Pump')
    const trCat: ColumnDef = { id: 'c', header: 'C', type: 'select', options: [{ value: 'i', label: 'İthal' }] }
    expect(parseInput(trCat, 'ithal', tr)).toBe('i')
  })
  it('inputText: ham metin; seçenek etiketi; boş → ""', () => {
    expect(inputText(def('listPrice'), 2240)).toBe('2240')
    expect(inputText(def('category'), 'hyd')).toBe('Hydraulics')
    expect(inputText(def('note'), null)).toBe('')
  })
})

describe('komut yığını, toplu yazma, yeni satırlar (Faz 6b)', () => {
  it('apply tek adım; undo/redo before/after ile; 100 adım sınırı; boş değişiklik adım değil', () => {
    const s = make()
    const patches = s.apply([
      { row: rows[0]!, def: def('name'), value: 'A' },
      { row: rows[0]!, def: def('note'), value: 'n' },
      { row: rows[1]!, def: def('name'), value: 'Pump' }, // aynı değer → yama yok
    ])
    expect(patches).toEqual([
      { key: '1', col: 'name', before: 'Cylinder', after: 'A' },
      { key: '1', col: 'note', before: null, after: 'n' },
    ])
    expect(s.canUndo.value).toBe(true)
    expect(s.canRedo.value).toBe(false)
    const step = s.undo()
    expect(step?.patches).toHaveLength(2)
    expect(s.read(rows[0]!, def('name'))).toBe('Cylinder')
    expect(s.counts.value.changedCells).toBe(0)
    expect(s.canRedo.value).toBe(true)
    s.redo()
    expect(s.read(rows[0]!, def('note'))).toBe('n')
    expect(s.apply([{ row: rows[0]!, def: def('note'), value: 'n' }])).toEqual([])
    for (let i = 0; i < 120; i++) s.set(rows[1]!, def('note'), `v${i}`)
    let n = 0
    while (s.undo()) n++
    expect(n).toBe(100)
    expect(s.read(rows[1]!, def('note'))).toBe('v19') // 20. adımdan geriye gidilemez
  })
  it('addRows: anahtar new:n, orijinal yok, anahtar sütunu zorunlu; getChanges create; undo satırı kaldırır, redo geri koyar', () => {
    const s = make()
    const added = s.addRows(1)
    const row = added[0]!.row
    expect(s.allRows.value).toHaveLength(3)
    expect(s.isNew('new:1')).toBe(true)
    expect(s.keyOf(row)).toBe('new:1')
    s.apply([{ row, def: def('name'), value: 'Fresh' }], added)
    expect(s.rowIssues('new:1')?.get('sku')?.message).toBe('Required')
    expect(s.rowIssues('new:1')?.get('listPrice')?.message).toBe('Required')
    expect(s.getChanges().rows).toEqual([]) // hatalı → gönderilmez
    s.apply([
      { row, def: def('sku'), value: 'NEW-1' },
      { row, def: def('listPrice'), value: 10 },
      { row, def: def('note'), value: '' },
    ])
    expect(s.getChanges().rows).toEqual([
      { clientId: 'new:1', key: 'NEW-1', op: 'create', values: { name: 'Fresh', sku: 'NEW-1', listPrice: 10 } },
    ])
    expect(s.counts.value.newRows).toBe(1)
    s.undo()
    s.undo()
    expect(s.allRows.value).toHaveLength(2)
    expect(s.counts.value.newRows).toBe(0)
    s.redo()
    expect(s.allRows.value).toHaveLength(3)
    expect(s.read(s.allRows.value[2]!, def('name'))).toBe('Fresh')
    s.reset()
    expect(s.allRows.value).toHaveLength(2)
    expect(s.canUndo.value).toBe(false)
  })
  it('seçenek hatasında yakın öneri; readUntracked taslağı görür', () => {
    const s = make()
    s.set(rows[0]!, def('category'), 'Pump')
    expect(s.rowIssues('1')?.get('category')?.suggest?.label).toBe('Pumps')
    s.set(rows[0]!, def('category'), 'hydraulix')
    expect(s.rowIssues('1')?.get('category')?.suggest?.label).toBe('Hydraulics')
    expect(s.readUntracked(rows[0]!, def('category'))).toBe('hydraulix')
  })
})

describe('pano ve doldurma yardımcıları (07 §7–8)', () => {
  it('TSV: tırnaklı hücreler, sekme ve satır sonu; sondaki boş satır atılır; HTML tablo', async () => {
    const { parseTsv, toTsv, toHtml, parseHtmlTable } = await import('../src/sheet/clipboard')
    expect(parseTsv('a\tb\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(parseTsv('"x\ty"\t"say ""hi"""\r\n"multi\nline"\tz')).toEqual([
      ['x\ty', 'say "hi"'],
      ['multi\nline', 'z'],
    ])
    expect(
      toTsv([
        ['a\tb', 'c'],
        ['"q"', ''],
      ]),
    ).toBe('"a\tb"\tc\n"""q"""\t')
    expect(toHtml([['<b>', 'x']])).toBe('<table><tbody><tr><td>&lt;b&gt;</td><td>x</td></tr></tbody></table>')
    expect(parseHtmlTable('<table><tr><td>1&nbsp;</td><th>2</th></tr></table>')).toEqual([['1', '2']])
  })
  it('seri: sabit artış devam eder, aksi halde döngüyle kopya; yukarı yönde geriye', async () => {
    const { fillValues } = await import('../src/sheet/fill')
    expect(fillValues([1, 2], 3)).toEqual([3, 4, 5])
    expect(fillValues([10, 20], 2)).toEqual([30, 40])
    expect(fillValues([0.1, 0.2], 2)).toEqual([0.3, 0.4])
    expect(fillValues([5], 3)).toEqual([5, 5, 5])
    expect(fillValues(['a', 'b'], 3)).toEqual(['a', 'b', 'a'])
    expect(fillValues([1, 3, 4], 2)).toEqual([1, 3])
    expect(fillValues([3, 4], 2, true)).toEqual([2, 1])
    expect(fillValues(['a', 'b'], 3, true)).toEqual(['b', 'a', 'b'])
  })
  it('ondalık çıkarımı: 1.234,56 ve 12,5 virgül; 1,234.56 ve 12.5 nokta; 1.250 belirsiz', async () => {
    const { inferDecimal } = await import('../src/sheet/parse')
    expect(inferDecimal(['1.234,56'])).toBe(',')
    expect(inferDecimal(['12,5', '3'])).toBe(',')
    expect(inferDecimal(['1,234.56'])).toBe('.')
    expect(inferDecimal(['12.5'])).toBe('.')
    expect(inferDecimal(['1.250', '3'])).toBeNull()
    expect(inferDecimal(['1,250'])).toBeNull()
  })
  it('boolean, tags ve multiselect yapıştırma çözümlemesi', async () => {
    const { parseInput } = await import('../src/sheet/parse')
    const env = { locale: 'en', today: new Date(), todayWord: 'Today', yesWord: 'Yes', noWord: 'No' }
    const bool: ColumnDef = { id: 'b', header: 'B', type: 'boolean' }
    expect(parseInput(bool, 'yes', env)).toBe(true)
    expect(parseInput(bool, '0', env)).toBe(false)
    expect(parseInput(bool, 'maybe', env)).toBe('maybe')
    const tags: ColumnDef = { id: 't', header: 'T', type: 'tags' }
    expect(parseInput(tags, 'a; b, c', env)).toEqual(['a', 'b', 'c'])
    const multi: ColumnDef = { id: 'm', header: 'M', type: 'multiselect', options: [{ value: 'x', label: 'Ex' }] }
    expect(parseInput(multi, 'ex; Zed', env)).toEqual(['x', 'Zed'])
  })
})
