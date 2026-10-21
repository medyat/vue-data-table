// Liste satır modeli (01 · TanStack sınırı, D23): istemci modunda arama + sıralama + sayfalama TanStack row model'leriyle;
// sunucu modunda `manual*` ile satırlar olduğu gibi (işlemi sunucu yapar). Sıralama kuralları 04 §6.
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef as TanstackColumnDef,
} from '@tanstack/vue-table'
import { computed, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { TYPE_SPECS } from '../core/cells/specs'
import { readPath } from '../core/columns/readPath'
import { getFormat } from '../core/format'
import type { ColumnDef } from '../types/columns'
import type { SortRule } from '../types/query'

export const MAX_SORT = 3

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  // globalFiltering, columnFiltering'i ön koşul ister (TanStack); sütun filtreleri Faz 3'te kullanılır.
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})
type Features = typeof features

export interface ListTableOptions<Row extends object> {
  columns: MaybeRefOrGetter<Array<ColumnDef<Row>>>
  rows: MaybeRefOrGetter<Row[]>
  rowKey: MaybeRefOrGetter<string>
  mode: MaybeRefOrGetter<'client' | 'server'>
  locale: MaybeRefOrGetter<string>
  sort: Ref<SortRule[]>
  /** 1 tabanlı (Laravel simplePaginate). */
  page: Ref<{ number: number; size: number }>
  search: Ref<string>
  /** Sunucu modu: sonraki sayfa var mı. */
  hasMore: MaybeRefOrGetter<boolean | undefined>
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

/** Tipe göre karşılaştırma; boş değer "en büyük" (artanda sonda, azalanda başta — PostgreSQL varsayılanı). */
function comparator(def: ColumnDef, locale: string): (a: unknown, b: unknown) => number {
  const empty = (a: unknown, b: unknown): number | null => {
    const ea = isEmpty(a)
    const eb = isEmpty(b)
    if (ea && eb) return 0
    if (ea) return 1
    if (eb) return -1
    return null
  }
  const spec = TYPE_SPECS[def.type]
  if (spec.numeric || def.type === 'boolean' || def.type === 'star') {
    return (a, b) => empty(a, b) ?? Number(a) - Number(b)
  }
  if (def.type === 'date' || def.type === 'datetime') {
    return (a, b) => empty(a, b) ?? new Date(a as string).getTime() - new Date(b as string).getTime()
  }
  const collator = getFormat(locale).collator()
  return (a, b) => empty(a, b) ?? collator.compare(String(a), String(b))
}

export const isSearchable = (def: ColumnDef): boolean => def.searchable ?? TYPE_SPECS[def.type].searchable

export function useListTable<Row extends object>(o: ListTableOptions<Row>) {
  const defs = computed(() => toValue(o.columns))
  const locale = computed(() => toValue(o.locale))
  const isServer = computed(() => toValue(o.mode) === 'server')

  const tanstackColumns = computed<Array<TanstackColumnDef<Features, Row, unknown>>>(() =>
    defs.value.map((d) => {
      const id = d.id as string
      const cmp = comparator(d, locale.value)
      return {
        id,
        accessorFn: d.accessor ?? ((row: Row) => readPath(row, id)),
        enableSorting: d.sortable ?? TYPE_SPECS[d.type].sortable,
        enableGlobalFilter: isSearchable(d),
        sortFn: (a, b, columnId) => cmp(a.getValue(columnId), b.getValue(columnId)),
        sortUndefined: 1,
      }
    }),
  )

  // Arama metni küçük harfe locale'e göre çevrilir (09: I/ı, İ/i doğru eşleşmeli); TanStack'e normalize değer gider.
  const normalizedSearch = computed(() => o.search.value.trim().toLocaleLowerCase(locale.value))
  const state = computed(() => ({
    sorting: o.sort.value.map((s) => ({ id: s.column, desc: s.dir === 'desc' })),
    pagination: { pageIndex: o.page.value.number - 1, pageSize: o.page.value.size },
    globalFilter: normalizedSearch.value,
  }))
  const searchableIds = computed(() => new Set(defs.value.filter(isSearchable).map((d) => d.id as string)))

  const table = useTable<Features, Row>({
    features,
    columns: tanstackColumns,
    data: computed(() => toValue(o.rows)),
    getRowId: (row: Row) => String(readPath(row, toValue(o.rowKey))),
    state,
    manualSorting: isServer,
    manualFiltering: isServer,
    manualPagination: isServer,
    // Sunucu: sayfa sayısı bilinmez; hasMore varken -1 (sınırsız), yoksa bu sayfa son.
    autoResetPageIndex: false,
    enableSortingRemoval: true,
    maxMultiSortColCount: MAX_SORT,
    getColumnCanGlobalFilter: (column) => searchableIds.value.has(column.id),
    globalFilterFn: (row, columnId, filterValue: string) => {
      const v = row.getValue(columnId)
      if (isEmpty(v)) return false
      return String(v).toLocaleLowerCase(locale.value).includes(filterValue)
    },
    // Reka/Vue güncellemeleri bizde: state kontrollü, TanStack'in kendi updater'ları kullanılmaz.
    onSortingChange: () => {},
    onPaginationChange: () => {},
    onGlobalFilterChange: () => {},
  })

  /** Sayfadaki satırlar (istemci: süzülmüş + sıralı + dilimlenmiş; sunucu: verilen). */
  const rows = computed<Row[]>(() =>
    isServer.value ? toValue(o.rows) : table.getRowModel().rows.map((r) => r.original),
  )
  /** İstemci modunda eşleşen toplam; sunucuda bilinmez. */
  const total = computed<number | undefined>(() =>
    isServer.value ? undefined : table.getPrePaginatedRowModel().rows.length,
  )
  const canNext = computed(() =>
    isServer.value ? (toValue(o.hasMore) ?? false) : o.page.value.number * o.page.value.size < (total.value ?? 0),
  )
  const canPrev = computed(() => o.page.value.number > 1)

  /** Header tıklaması: asc → desc → kapalı; diğerleri kalkar. ⇧: ekle / yön değiştir / kaldır, en fazla 3 (dördüncüde en eski düşer). */
  const toggleSort = (column: string, multi: boolean) => {
    const current = o.sort.value
    const at = current.findIndex((s) => s.column === column)
    const existing = at >= 0 ? current[at]! : null
    const next: SortRule | null = !existing
      ? { column, dir: 'asc' }
      : existing.dir === 'asc'
        ? { column, dir: 'desc' }
        : null
    if (!multi) {
      o.sort.value = next ? [next] : []
      return
    }
    const rest = current.filter((s) => s.column !== column)
    if (!next) o.sort.value = rest
    else if (at >= 0) o.sort.value = current.map((s) => (s.column === column ? next : s))
    else o.sort.value = [...rest, next].slice(-MAX_SORT)
  }
  const setSort = (column: string, dir: 'asc' | 'desc' | null) => {
    o.sort.value = dir ? [{ column, dir }] : o.sort.value.filter((s) => s.column !== column)
  }

  return { rows, total, canNext, canPrev, toggleSort, setSort }
}
