// useListTable: istemci modunda arama + sıralama + sayfalama (04 §5–6, 05 §8); sunucu modunda geçiş. Faz 2 kabul kriterleri.
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useListTable } from '../src/list/useListTable'
import type { ColumnDef, FilterCondition, SortRule } from '../src/types'

interface R {
  id: number
  name: string | null
  qty: number | null
  due: string | null
  note: string
}

const columns: Array<ColumnDef<R>> = [
  { id: 'name', header: 'Name', type: 'string' },
  { id: 'qty', header: 'Qty', type: 'int' },
  { id: 'due', header: 'Due', type: 'date' },
  { id: 'note', header: 'Note', type: 'string', searchable: false },
]
const data: R[] = [
  { id: 1, name: 'ışık', qty: 10, due: '2026-10-05', note: 'alpha' },
  { id: 2, name: 'Çelik', qty: null, due: null, note: 'beta' },
  { id: 3, name: 'IŞIK', qty: 2, due: '2026-10-01', note: 'gamma' },
  { id: 4, name: null, qty: 7, due: '2026-10-03', note: 'delta' },
  { id: 5, name: 'Bakır', qty: 7, due: '2026-10-02', note: 'epsilon' },
]

function setup(mode: 'client' | 'server' = 'client', rows: R[] = data) {
  const sort = ref<SortRule[]>([])
  const page = ref({ number: 1, size: 2 })
  const search = ref('')
  const hasMore = ref<boolean | undefined>(undefined)
  const filters = ref<FilterCondition[]>([])
  const rowsRef = ref(rows)
  let api!: ReturnType<typeof useListTable<R>>
  mount(
    defineComponent({
      setup() {
        api = useListTable<R>({
          columns,
          rows: rowsRef,
          rowKey: 'id',
          mode,
          locale: 'tr',
          sort,
          filters,
          page,
          search,
          hasMore,
        })
        return () => null
      },
    }),
  )
  return { api, filters, sort, page, search, hasMore, rowsRef }
}
const ids = (rows: R[]) => rows.map((r) => r.id)

describe('istemci modu', () => {
  it('sayfalama: 2 satırlık sayfa, toplam ve Next', async () => {
    const { api, page } = setup()
    expect(ids(api.rows.value)).toEqual([1, 2])
    expect(api.total.value).toBe(5)
    expect(api.canNext.value).toBe(true)
    expect(api.canPrev.value).toBe(false)
    page.value = { number: 3, size: 2 }
    await nextTick()
    expect(ids(api.rows.value)).toEqual([5])
    expect(api.canNext.value).toBe(false)
  })
  it('metin sıralaması collator ile (Türkçe), boş değer artanda sonda azalanda başta', async () => {
    const { api, sort, page } = setup()
    page.value = { number: 1, size: 10 }
    sort.value = [{ column: 'name', dir: 'asc' }]
    await nextTick()
    expect(api.rows.value.map((r) => r.name)).toEqual(['Bakır', 'Çelik', 'ışık', 'IŞIK', null])
    sort.value = [{ column: 'name', dir: 'desc' }]
    await nextTick()
    expect(api.rows.value.map((r) => r.name)[0]).toBeNull()
  })
  it('sayı ve tarih sıralaması; çoklu sıralama ikincil anahtarla', async () => {
    const { api, sort, page } = setup()
    page.value = { number: 1, size: 10 }
    sort.value = [
      { column: 'qty', dir: 'asc' },
      { column: 'due', dir: 'desc' },
    ]
    await nextTick()
    expect(ids(api.rows.value)).toEqual([3, 4, 5, 1, 2]) // qty 2, 7(due 03), 7(due 02), 10, null
    sort.value = [{ column: 'due', dir: 'asc' }]
    await nextTick()
    expect(ids(api.rows.value)).toEqual([3, 5, 4, 1, 2])
  })
  it('arama: yalnızca aranabilir sütunlarda, locale küçük harf (I/ı)', async () => {
    const { api, search, page } = setup()
    page.value = { number: 1, size: 10 }
    search.value = 'IŞIK'
    await nextTick()
    expect(ids(api.rows.value)).toEqual([1, 3])
    search.value = 'alpha' // note aranabilir değil
    await nextTick()
    expect(api.rows.value).toEqual([])
    expect(api.total.value).toBe(0)
  })
  it('toggleSort: asc → desc → kapalı; ⇧ ile en fazla 3, dördüncüde en eski düşer', () => {
    const { api, sort } = setup()
    api.toggleSort('name', false)
    expect(sort.value).toEqual([{ column: 'name', dir: 'asc' }])
    api.toggleSort('name', false)
    expect(sort.value).toEqual([{ column: 'name', dir: 'desc' }])
    api.toggleSort('name', false)
    expect(sort.value).toEqual([])
    api.toggleSort('name', true)
    api.toggleSort('qty', true)
    api.toggleSort('due', true)
    api.toggleSort('note', true)
    expect(sort.value.map((s) => s.column)).toEqual(['qty', 'due', 'note'])
    api.toggleSort('qty', true)
    expect(sort.value.find((s) => s.column === 'qty')?.dir).toBe('desc')
    api.toggleSort('qty', true)
    expect(sort.value.map((s) => s.column)).toEqual(['due', 'note'])
    api.toggleSort('note', false) // tekli tık diğerlerini kaldırır
    expect(sort.value).toEqual([{ column: 'note', dir: 'desc' }])
    api.setSort('due', null)
    expect(sort.value).toEqual([{ column: 'note', dir: 'desc' }])
    api.setSort('due', 'asc')
    expect(sort.value).toEqual([{ column: 'due', dir: 'asc' }])
  })
})

describe('sunucu modu', () => {
  it('satırlar olduğu gibi; Next hasMore ile; toplam bilinmez', async () => {
    const { api, hasMore, sort, search } = setup('server', data.slice(0, 2))
    expect(ids(api.rows.value)).toEqual([1, 2])
    expect(api.total.value).toBeUndefined()
    expect(api.canNext.value).toBe(false)
    hasMore.value = true
    await nextTick()
    expect(api.canNext.value).toBe(true)
    sort.value = [{ column: 'name', dir: 'desc' }]
    search.value = 'zzz'
    await nextTick()
    expect(ids(api.rows.value)).toEqual([1, 2]) // yerel işlem yok
  })
})

describe('istemci modu: sütun filtreleri (04 §1)', () => {
  it('koşullar AND ile süzer, arama ile birleşir; sunucu modunda süzmez', async () => {
    const { api, filters, search } = setup()
    filters.value = [{ column: 'qty', op: 'gte', value: 7 }]
    await nextTick()
    expect(api.total.value).toBe(3) // 10, 7, 7
    filters.value = [
      { column: 'qty', op: 'gte', value: 7 },
      { column: 'due', op: 'within', value: { from: '2026-10-02', to: '2026-10-03' } },
    ]
    await nextTick()
    expect(api.rows.value.map((r) => r.id)).toEqual([4, 5])
    search.value = 'bakır'
    await nextTick()
    expect(api.rows.value.map((r) => r.id)).toEqual([5])
    filters.value = [{ column: 'name', op: 'is_empty' }]
    search.value = ''
    await nextTick()
    expect(api.rows.value.map((r) => r.id)).toEqual([4])
    const server = setup('server')
    server.filters.value = [{ column: 'qty', op: 'gte', value: 7 }]
    await nextTick()
    expect(server.api.rows.value).toHaveLength(5)
  })
})
