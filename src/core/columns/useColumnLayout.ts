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
  columns: MaybeRefOrGetter<Array<ColumnDef<Row>>>
  rows: MaybeRefOrGetter<Row[]>
  /** Satır kimliği yolu. Varsayılan 'id'. */
  rowKey?: MaybeRefOrGetter<string>
  /** Görünümden gelen düzen (Faz 3b); verilmezse sütun tanımları. */
  layout?: MaybeRefOrGetter<Partial<ColumnLayout> | undefined>
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
  const minOf = (d: ColumnDef<Row>): number => Math.min(d.minWidth ?? MIN_COLUMN_WIDTH, trackMin(defaultTrack(d)))

  // TanStack sütunları: her zaman açık id + accessorFn (accessorKey asla: nokta → alt çizgi çakışması, 01).
  const tanstackColumns = computed<Array<TanstackColumnDef<Features, Row, unknown>>>(() =>
    defs.value.map((d) => {
      const id = d.id as string
      return {
        id,
        accessorFn: d.accessor ?? ((row: Row) => readPath(row, id)),
        size: trackMin(defaultTrack(d)),
        // Açık `width` 80'in altındaysa (ör. 56 px aksiyon sütunu) o geçerli.
        minSize: minOf(d),
        maxSize: d.maxWidth,
        enableHiding: !(d.alwaysVisible || d.primary),
      }
    }),
  )

  const initialState = computed(() => {
    const l = layout.value
    const start = l?.pinned?.left ?? defs.value.filter((d) => d.pinned === 'left').map((d) => d.id as string)
    const end = l?.pinned?.right ?? defs.value.filter((d) => d.pinned === 'right').map((d) => d.id as string)
    const visibility: Record<string, boolean> = {}
    for (const d of defs.value) {
      const id = d.id as string
      visibility[id] = l?.visible ? l.visible.includes(id) : !d.hidden
    }
    return {
      columnPinning: { start, end },
      columnVisibility: visibility,
      columnOrder: l?.order ?? [],
      columnSizing: l?.widths ?? {},
    }
  })

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

  const start = computed(() => {
    const cols = table.getStartVisibleLeafColumns()
    return cols.map((c, i) => toLayoutColumn(c, 'start', i === cols.length - 1))
  })
  const center = computed(() => table.getCenterVisibleLeafColumns().map((c) => toLayoutColumn(c, null, false)))
  const end = computed(() => table.getEndVisibleLeafColumns().map((c, i) => toLayoutColumn(c, 'end', i === 0)))
  const columns = computed(() => [...start.value, ...center.value, ...end.value])

  /** Sütunun gerçek track'i: sabit ve resize edilmiş sütunlar px, diğerleri tip varsayılanı (minmax olabilir). */
  const trackOf = (col: Column<Features, Row, unknown>, pinned: boolean): Track => {
    const resized = table.atoms.columnSizing.get()[col.id]
    return pinned ? col.getSize() : resized !== undefined ? resized : defaultTrack(defById.value.get(col.id)!)
  }

  /** grid-template-columns: sabit px, orta track'ler, bölge sonunda `auto` dolgu (05 · Resize). */
  const colsVar: ComputedRef<string> = computed(() =>
    [
      ...table.getStartVisibleLeafColumns().map((c) => trackCss(trackOf(c, true))),
      ...table.getCenterVisibleLeafColumns().map((c) => trackCss(trackOf(c, false))),
      'auto',
      ...table.getEndVisibleLeafColumns().map((c) => trackCss(trackOf(c, true))),
    ].join(' '),
  )

  /** Sabit hücrelerin sticky ofsetleri: start için left, end için right (TanStack getStart / getAfter). */
  const offsetVars = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const c of table.getStartVisibleLeafColumns()) out[offsetVarName(c.id)] = `${c.getStart('start')}px`
    for (const c of table.getEndVisibleLeafColumns()) out[offsetVarName(c.id)] = `${c.getAfter('end')}px`
    return out
  })

  /** Satır ve header'ın en az genişliği; kabı aşarsa yatay kayar. */
  const minWidth = computed(() =>
    table.getVisibleLeafColumns().reduce((sum, c) => sum + trackMin(trackOf(c, c.getIsPinned() !== false)), 0),
  )

  const resizing = computed(() => {
    const id = table.atoms.columnResizing.get().isResizingColumn
    return id ? { id, size: table.getColumn(id)?.getSize() ?? 0 } : null
  })

  return {
    columns,
    start,
    center,
    end,
    colsVar,
    offsetVars,
    minWidth,
    resizing,
    rowId: (row: Row) => String(readPath(row, rowKey.value)),
    widthOf: (id: string): number => table.getColumn(id)?.getSize() ?? 0,
    setWidth: (id: string, px: number) => {
      const def = defById.value.get(id)
      const min = def ? minOf(def) : MIN_COLUMN_WIDTH
      const clamped = Math.min(def?.maxWidth ?? Infinity, Math.max(min, Math.round(px)))
      table.setColumnSizing((s) => ({ ...s, [id]: clamped }))
    },
    resetWidth: (id: string) => table.getColumn(id)?.resetSize(),
    pin: (id: string, side: PinSide) => table.getColumn(id)?.pin(side ?? false),
    setVisible: (id: string, visible: boolean) => table.getColumn(id)?.toggleVisibility(visible),
    setOrder: (ids: string[]) => table.setColumnOrder(ids),
  }
}

export type ColumnLayoutApi<Row extends object> = ReturnType<typeof useColumnLayout<Row>>
