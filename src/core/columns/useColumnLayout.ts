// TanStack Table'ın sütun modeli (01 · TanStack sınırı, D23): sıra, görünürlük, genişlik, resize, sabitleme.
// Bu dosya dışında (grid/, cells/ …) TanStack import edilmez; dışarıya kendi tiplerimiz çıkar.
//
// Performans (05 · Resize): `columns` yalnızca görünürlük/sıra/sabitleme değişince yenilenir. Genişlikler ve sabit
// ofsetleri ayrı computed'lardır (`colsVar`, `offsetVars`) ve GridRoot bunları Vue render'ı dışında CSS değişkeni
// olarak yazar; satırlar resize sırasında yeniden çizilmez.
import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef as TanstackColumnDef,
  type Header,
} from '@tanstack/vue-table'
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { ColumnDef } from '../../types/columns'
import type { ColumnLayout } from '../../types/query'
import { defaultTrack, type Track } from '../cells/specs'
import { readPath } from './readPath'

export const MIN_COLUMN_WIDTH = 80

const features = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnVisibilityFeature,
})
type Features = typeof features

export type PinSide = 'start' | 'end' | null

/** Grid'in çizdiği, TanStack'ten bağımsız sütun görünümü. Genişlik burada değil, `colsVar`/`offsetVars`'ta. */
export interface LayoutColumn<Row extends object = object> {
  id: string
  def: ColumnDef<Row>
  pinned: PinSide
  /** Bölgenin kenarındaki sabit sütun: kaydırma gölgesini bu taşır. */
  pinEdge: boolean
  /** Sabit hücrelerin sticky ofsetini taşıyan CSS değişkeni (`--dt-off-…`). */
  offsetVar: string
  /** Dahili: resize tutamacı için TanStack header'ı. */
  header: Header<Features, Row, unknown>
}

export interface ColumnLayoutOptions<Row extends object> {
  /** Telefon (05 §11): yalnızca birincil sütun sola sabit; sağa sabit yok. */
  phone?: MaybeRefOrGetter<boolean>
  columns: MaybeRefOrGetter<Array<ColumnDef<Row>>>
  rows: MaybeRefOrGetter<Row[]>
  /** Satır kimliği yolu. Varsayılan 'id'. */
  rowKey?: MaybeRefOrGetter<string>
  /** Görünümden gelen düzen (Faz 3b); verilmezse sütun tanımları. */
  layout?: MaybeRefOrGetter<Partial<ColumnLayout> | undefined>
  /** Her zaman sola sabit sütunlar (D45); verilmezse birincil sütun. DataSheet anahtar + birincil verir. */
  fixedStart?: MaybeRefOrGetter<string[]>
  /** DataSheet (07 §3): sola sabit son sütun (birincil ad) px değil minmax ile esner; ofseti kimseye gerekmez. */
  flexLastStart?: boolean
  /** Varsayılan genişliklerin çarpanı (02 · Ölçek): hücre yazısı 13 px'ten büyükse sütunlar da o oranda genişler. Elle verilen genişlik etkilenmez. */
  scale?: MaybeRefOrGetter<number>
}

const trackCss = (t: Track): string => (typeof t === 'number' ? `${t}px` : `minmax(${t.min}px, ${t.fr}fr)`)
const trackMin = (t: Track): number => (typeof t === 'number' ? t : t.min)
/** Sütun id'si CSS özel özellik adına: 'product.name' → '--dt-off-product_name'. */
export const offsetVarName = (id: string): string => `--dt-off-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`

export function useColumnLayout<Row extends object>(options: ColumnLayoutOptions<Row>) {
  const defs = computed(() => toValue(options.columns))
  const defById = computed(() => new Map(defs.value.map((d) => [d.id as string, d])))
  const rowKey = computed(() => toValue(options.rowKey) ?? 'id')
  const layout = computed(() => toValue(options.layout))
  const fixed = computed(
    () => toValue(options.fixedStart) ?? defs.value.filter((d) => d.primary).map((d) => d.id as string),
  )
  const trackFor = (d: ColumnDef<Row>): Track => {
    const t = defaultTrack(d)
    const k = toValue(options.scale) ?? 1
    return typeof t === 'number' ? Math.round(t * k) : { ...t, min: Math.round(t.min * k) }
  }
  const minOf = (d: ColumnDef<Row>): number => Math.min(d.minWidth ?? MIN_COLUMN_WIDTH, trackMin(trackFor(d)))
  /** Kaydedilen / uygulanan genişlik sütunun min–max aralığında (05 · Resize: min 80). */
  const clampWidth = (id: string, px: number): number => {
    const def = defById.value.get(id)
    return Math.min(def?.maxWidth ?? Infinity, Math.max(def ? minOf(def) : MIN_COLUMN_WIDTH, Math.round(px)))
  }

  // TanStack sütunları: her zaman açık id + accessorFn (accessorKey asla: nokta → alt çizgi çakışması, 01).
  const tanstackColumns = computed<Array<TanstackColumnDef<Features, Row, unknown>>>(() =>
    defs.value.map((d) => {
      const id = d.id as string
      return {
        id,
        accessorFn: d.accessor ?? ((row: Row) => readPath(row, id)),
        size: trackMin(trackFor(d)),
        // Açık `width` 80'in altındaysa (ör. 56 px aksiyon sütunu) o geçerli.
        minSize: minOf(d),
        maxSize: d.maxWidth,
        enableHiding: !(d.alwaysVisible || d.primary),
      }
    }),
  )

  /** Görünümden gelen düzen → TanStack durumu (04 §7): bilinmeyen sütun atlanır; `visible` varsa beyaz listedir; gizlenemeyen hep açık. */
  const known = (ids: string[] | undefined) => ids?.filter((id) => defById.value.has(id))
  const stateOf = (l: Partial<ColumnLayout> | undefined) => {
    const fx = fixed.value.filter((id) => defById.value.has(id))
    const start = [...fx, ...(known(l?.pinned?.left) ?? []).filter((id) => !fx.includes(id))]
    const end = (known(l?.pinned?.right) ?? []).filter((id) => !fx.includes(id))
    const visibility: Record<string, boolean> = {}
    for (const d of defs.value) {
      const id = d.id as string
      visibility[id] = d.alwaysVisible || d.primary || (l?.visible ? l.visible.includes(id) : !d.hidden)
    }
    const sizing: Record<string, number> = {}
    for (const [id, w] of Object.entries(l?.widths ?? {})) if (defById.value.has(id)) sizing[id] = clampWidth(id, w)
    return {
      columnPinning: { start, end },
      columnVisibility: visibility,
      columnOrder: known(l?.order) ?? [],
      columnSizing: sizing,
    }
  }
  const initialState = computed(() => stateOf(layout.value))

  const table = useTable<Features, Row>({
    features,
    columns: tanstackColumns,
    data: computed(() => toValue(options.rows)),
    getRowId: (row: Row) => String(readPath(row, rowKey.value)),
    initialState: initialState.value,
    columnResizeMode: 'onChange',
  })

  const headerById = computed(() => new Map(table.getFlatHeaders().map((h) => [h.column.id, h])))

  const toLayoutColumn = (
    col: Column<Features, Row, unknown>,
    pinned: PinSide,
    pinEdge: boolean,
  ): LayoutColumn<Row> => ({
    id: col.id,
    def: defById.value.get(col.id)!,
    pinned,
    pinEdge,
    offsetVar: offsetVarName(col.id),
    header: headerById.value.get(col.id)!,
  })

  // Telefonda (05 §11) yalnızca birincil sütun sola sabit, sağa sabit yok; kayıtlı sabitleme durumu (`state`) değişmez.
  const phone = computed(() => !!toValue(options.phone))
  const isPrimary = (c: Column<Features, Row, unknown>) => !!defById.value.get(c.id)?.primary
  const startCols = computed(() =>
    phone.value ? table.getVisibleLeafColumns().filter(isPrimary) : table.getStartVisibleLeafColumns(),
  )
  const centerCols = computed(() =>
    phone.value ? table.getVisibleLeafColumns().filter((c) => !isPrimary(c)) : table.getCenterVisibleLeafColumns(),
  )
  const endCols = computed(() => (phone.value ? [] : table.getEndVisibleLeafColumns()))
  const isPinnedCol = (c: Column<Features, Row, unknown>) => (phone.value ? isPrimary(c) : c.getIsPinned() !== false)

  const start = computed(() => startCols.value.map((c, i, all) => toLayoutColumn(c, 'start', i === all.length - 1)))
  const center = computed(() => centerCols.value.map((c) => toLayoutColumn(c, null, false)))
  const end = computed(() => endCols.value.map((c, i) => toLayoutColumn(c, 'end', i === 0)))
  const columns = computed(() => [...start.value, ...center.value, ...end.value])

  /** Sütunun gerçek track'i: sabit ve resize edilmiş sütunlar px, diğerleri tip varsayılanı (minmax olabilir). */
  const trackOf = (col: Column<Features, Row, unknown>, pinned: boolean): Track => {
    // Ham columnSizing sürüklerken min/max'ı aşabilir; getSize() kırpar (min 80, 05 · Resize).
    const resized = table.atoms.columnSizing.get()[col.id] !== undefined
    return pinned || resized ? col.getSize() : trackFor(defById.value.get(col.id)!)
  }

  /** grid-template-columns: sabit px, orta track'ler, bölge sonunda `auto` dolgu (05 · Resize). */
  const colsVar: ComputedRef<string> = computed(() =>
    [
      ...startCols.value.map((c, i, all) => trackCss(trackOf(c, !(options.flexLastStart && i === all.length - 1)))),
      ...centerCols.value.map((c) => trackCss(trackOf(c, false))),
      'auto',
      ...endCols.value.map((c) => trackCss(trackOf(c, true))),
    ].join(' '),
  )

  /** Sabit hücrelerin sticky ofsetleri: start için left, end için right (TanStack getStart / getAfter). */
  const offsetVars = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    let left = 0
    for (const c of startCols.value) {
      out[offsetVarName(c.id)] = `${left}px`
      left += c.getSize()
    }
    for (const c of endCols.value) out[offsetVarName(c.id)] = `${c.getAfter('end')}px`
    return out
  })

  /** Satır ve header'ın en az genişliği; kabı aşarsa yatay kayar. */
  const minWidth = computed(() =>
    table.getVisibleLeafColumns().reduce((sum, c) => sum + trackMin(trackOf(c, isPinnedCol(c))), 0),
  )

  /** Columns dialog'u (05 §5, D45): tüm yaprak sütunlar ekrandaki sırada (sol sabitler · orta · sağ sabitler). */
  const panel = computed(() => {
    const rank = (c: Column<Features, Row, unknown>) => {
      const p = c.getIsPinned()
      return p === 'start' ? 0 : p === 'end' ? 2 : 1
    }
    return [...table.getOrderColumnsFn()(table.getAllLeafColumns())]
      .sort((a, b) => rank(a) - rank(b))
      .map((c) => {
        const pinned = c.getIsPinned()
        return {
          id: c.id,
          def: defById.value.get(c.id)!,
          visible: c.getIsVisible(),
          pinned: pinned === false ? null : pinned,
          canHide: c.getCanHide(),
          fixed: fixed.value.includes(c.id),
        }
      })
  })
  const counts = computed(() => ({
    shown: table.getVisibleLeafColumns().length,
    total: table.getAllLeafColumns().length,
  }))

  /** Move left/right (D22: sürükleme yok): aynı sabitleme bölgesindeki görünür komşuyla yer değiştirir. */
  const move = (id: string, delta: -1 | 1) => {
    const ordered = table.getOrderColumnsFn()(table.getAllLeafColumns())
    const at = ordered.findIndex((c) => c.id === id)
    const me = ordered[at]
    if (!me) return
    const region = me.getIsPinned()
    let j = at + delta
    while (j >= 0 && j < ordered.length && !(ordered[j]!.getIsVisible() && ordered[j]!.getIsPinned() === region))
      j += delta
    const other = ordered[j]
    if (!other) return
    const ids = ordered.map((c) => c.id)
    ids[at] = other.id
    ids[j] = me.id
    table.setColumnOrder(ids)
  }

  const apply = (l?: Partial<ColumnLayout>) => {
    const s = stateOf(l)
    table.setColumnOrder(s.columnOrder)
    table.setColumnVisibility(s.columnVisibility)
    table.setColumnPinning(s.columnPinning)
    table.setColumnSizing(s.columnSizing)
  }
  /** Dialog taslağı (D45): sabitleme konumsaldır — sabitlerden sonraki ilk `start` ve son `end` görünür sütun. */
  const arrange = (d: { order: string[]; visible: string[]; start: number; end: number }) => {
    const free = d.order.filter((id) => d.visible.includes(id) && !fixed.value.includes(id))
    const left = free.slice(0, d.start)
    apply({
      order: d.order,
      visible: d.visible,
      widths: state.value.widths,
      pinned: { left, right: d.end ? free.slice(left.length).slice(-d.end) : [] },
    })
  }
  /** Verilmezse `layout` seçeneğine (o da yoksa sütun tanımlarına) döner. */
  const reset = (l: Partial<ColumnLayout> | undefined = layout.value) => apply(l)

  /** Etkin düzen (görünüme yazılan biçim): sıra, görünürler, yalnızca değiştirilmiş genişlikler, sabitler. */
  const state = computed<ColumnLayout>(() => {
    const p = table.atoms.columnPinning.get()
    return {
      order: table
        .getOrderColumnsFn()(table.getAllLeafColumns())
        .map((c) => c.id),
      visible: table.getVisibleLeafColumns().map((c) => c.id),
      widths: Object.fromEntries(
        Object.entries(table.atoms.columnSizing.get()).map(([id, w]) => [id, clampWidth(id, w)]),
      ),
      pinned: { left: [...p.start], right: [...p.end] },
    }
  })
  /** Bir düzen yamasının uygulanmadan hesaplanan tam hali (Duplicate özeti, 04 §7). */
  const resolve = (l?: Partial<ColumnLayout>): ColumnLayout => {
    const s = stateOf(l)
    const ids = defs.value.map((d) => d.id as string)
    return {
      order: [...s.columnOrder, ...ids.filter((id) => !s.columnOrder.includes(id))],
      visible: ids.filter((id) => s.columnVisibility[id]),
      widths: s.columnSizing,
      pinned: { left: s.columnPinning.start, right: s.columnPinning.end },
    }
  }

  const resizing = computed(() => {
    const id = table.atoms.columnResizing.get().isResizingColumn
    return id ? { id, size: table.getColumn(id)?.getSize() ?? 0 } : null
  })

  return {
    columns,
    start,
    center,
    end,
    panel,
    counts,
    move,
    reset,
    apply,
    arrange,
    state,
    resolve,
    colsVar,
    offsetVars,
    minWidth,
    resizing,
    rowId: (row: Row) => String(readPath(row, rowKey.value)),
    widthOf: (id: string): number => table.getColumn(id)?.getSize() ?? 0,
    setWidth: (id: string, px: number) => table.setColumnSizing((s) => ({ ...s, [id]: clampWidth(id, px) })),
    resetWidth: (id: string) => table.getColumn(id)?.resetSize(),
    setVisible: (id: string, visible: boolean) => table.getColumn(id)?.toggleVisibility(visible),
    setOrder: (ids: string[]) => table.setColumnOrder(ids),
  }
}

export type ColumnLayoutApi<Row extends object> = ReturnType<typeof useColumnLayout<Row>>
