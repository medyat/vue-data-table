// useRequest: abort, pending bitişi, sebep sınıflandırması, columns birleştirme, Still loading (05 §10, Faz 2 yarış testleri).
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useRequest } from '../src/list/useRequest'
import type { TableError, TableQuery, TableRequest } from '../src/types'

interface R {
  id: number
}

function setup(mode: 'client' | 'server' = 'server', hasListener = true) {
  const search = ref('')
  const page = ref({ number: 1, size: 100 })
  const fields = ref(['number', 'product.name'])
  const rows = ref<R[]>([])
  const hasMore = ref<boolean | undefined>(undefined)
  const loading = ref<boolean | undefined>(undefined)
  const error = ref<TableError | undefined>(undefined)
  const emitted: TableRequest[] = []
  const query = (): TableQuery => ({
    search: search.value,
    filters: [],
    sort: [],
    page: page.value,
    columns: fields.value,
    fields: fields.value,
  })
  let api!: ReturnType<typeof useRequest<R>>
  const w = mount(
    defineComponent({
      setup() {
        api = useRequest<R>({
          mode: () => mode,
          hasListener,
          query,
          rows: () => rows.value,
          hasMore: () => hasMore.value,
          loading: () => loading.value,
          error: () => error.value,
          requestOnColumnChange: () => true,
          emit: (r) => emitted.push(r),
        })
        return () => null
      },
    }),
  )
  return { api, emitted, search, page, fields, rows, hasMore, loading, error, w }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('sunucu modu', () => {
  it('mount → initial; sorgu değişince önceki abort, yeni talep query; sayfa → page', async () => {
    const { api, emitted, search, page } = setup()
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.reason).toBe('initial')
    expect(api.pending.value).toBe(true)
    search.value = 'hc'
    page.value = { number: 1, size: 100 } // aynı tick'te sayfa sıfırlama tek talep üretir
    await nextTick()
    expect(emitted).toHaveLength(2)
    expect(emitted[0]!.signal.aborted).toBe(true)
    expect(emitted[1]!.reason).toBe('query')
    expect(emitted[1]!.query.search).toBe('hc')
    page.value = { number: 2, size: 100 }
    await nextTick()
    expect(emitted[2]!.reason).toBe('page')
  })
  it('pending: satırlar gelince biter ve snapshot alınır; loading düşünce biter; hata gelince biter', async () => {
    const { api, rows, hasMore, loading, error } = setup()
    rows.value = [{ id: 1 }]
    hasMore.value = true
    await nextTick()
    expect(api.pending.value).toBe(false)
    expect(api.snapshot.value).toMatchObject({ rows: [{ id: 1 }], hasMore: true, page: { number: 1 } })
    expect(api.updatedAt.value).toBeInstanceOf(Date)
    api.refresh()
    expect(api.pending.value).toBe(true)
    loading.value = true
    await nextTick()
    loading.value = false
    await nextTick()
    expect(api.pending.value).toBe(false)
    api.refresh()
    error.value = 'boom'
    await nextTick()
    expect(api.pending.value).toBe(false)
  })
  it('hata sınıfı: sorgu hatası Error, yenileme hatası satırlar varken Stale; retry son sebeple', async () => {
    const { api, emitted, rows, error, search } = setup()
    rows.value = [{ id: 1 }]
    await nextTick()
    api.refresh()
    error.value = { message: 'timeout', id: 'req 1' }
    await nextTick()
    expect(api.errorKind.value).toBe('stale')
    error.value = undefined
    search.value = 'x'
    await nextTick()
    error.value = 'boom'
    await nextTick()
    expect(api.errorKind.value).toBe('error')
    api.retry()
    expect(emitted.at(-1)!.reason).toBe('query')
    expect(emitted.at(-1)!.query.search).toBe('x')
  })
  it('yeni görünen sütunun alanı son talepte yoksa 400 ms birleştirmeyle columns talebi; varsa talep yok', async () => {
    const { emitted, fields } = setup()
    fields.value = ['number'] // daralma: alanlar zaten istenmişti
    await nextTick()
    vi.advanceTimersByTime(500)
    expect(emitted).toHaveLength(1)
    fields.value = ['number', 'customer']
    await nextTick()
    fields.value = ['number', 'customer', 'value']
    await nextTick()
    vi.advanceTimersByTime(399)
    expect(emitted).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(emitted).toHaveLength(2)
    expect(emitted[1]!.reason).toBe('columns')
    expect(emitted[1]!.query.fields).toEqual(['number', 'customer', 'value'])
  })
  it('10 s sonra Still loading; cevap gelince söner', async () => {
    const { api, rows } = setup()
    vi.advanceTimersByTime(9_999)
    expect(api.stillLoading.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(api.stillLoading.value).toBe(true)
    rows.value = [{ id: 1 }]
    await nextTick()
    expect(api.stillLoading.value).toBe(false)
  })
  it('unmount son talebi abort eder', () => {
    const { emitted, w } = setup()
    w.unmount()
    expect(emitted[0]!.signal.aborted).toBe(true)
  })
})

describe('istemci modu', () => {
  it('hiç talep yayılmaz; refresh yalnızca dinleyici varsa', async () => {
    const { api, emitted, search } = setup('client')
    search.value = 'x'
    await nextTick()
    expect(emitted).toHaveLength(0)
    expect(api.pending.value).toBe(false)
    expect(api.snapshot.value).not.toBeNull()
    api.refresh()
    expect(emitted).toHaveLength(1)
    expect(emitted[0]!.reason).toBe('refresh')
    const silent = setup('client', false)
    silent.api.refresh()
    expect(silent.emitted).toHaveLength(0)
    expect(silent.api.pending.value).toBe(false)
  })
})
