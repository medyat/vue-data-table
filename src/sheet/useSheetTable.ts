// Hücre seçimi (01 · TanStack sınırı, D23): TanStack `cellSelectionFeature`, tek aralık (⌘-tık ile çoklu aralık yok, 07 §6).
// Aktif hücre = aralığın çapası (roving tabindex 0). Sütun sırası ve görünürlüğü düzenden (useColumnLayout) gelir; satır
// sırası gösterilen dizidir. DOM'a dokunmaz; odak ve kaydırma SheetGrid'de.
import { cellSelectionFeature, tableFeatures, useTable, type ColumnDef as TanstackColumnDef } from '@tanstack/vue-table'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

const features = tableFeatures({ cellSelectionFeature })
type Features = typeof features

export type Direction = 'up' | 'down' | 'left' | 'right'

/** Gösterilen satır/sütun dizinlerinde dikdörtgen (TanStack `getCellSelectionBounds`). */
export interface SheetBounds {
  minRowIndex: number
  maxRowIndex: number
  minColumnIndex: number
  maxColumnIndex: number
}

export interface SheetTableOptions<Row extends object> {
  rows: MaybeRefOrGetter<Row[]>
  /** Görünür sütunlar, çizim sırasında. */
  columnIds: MaybeRefOrGetter<string[]>
  rowId: (row: Row) => string
}

export function useSheetTable<Row extends object>(o: SheetTableOptions<Row>) {
  const columns = computed<Array<TanstackColumnDef<Features, Row, unknown>>>(() =>
    toValue(o.columnIds).map((id) => ({ id, accessorFn: () => undefined })),
  )
  const table = useTable<Features, Row>({
    features,
    columns,
    data: computed(() => toValue(o.rows)),
    getRowId: o.rowId,
    // Satırlar parça parça gelirken (loading) seçim kaybolmasın; tek aralık (07 §6).
    autoResetCellSelection: false,
    enableMultiCellRangeSelection: false,
  })

  const active = computed<{ rowId: string; columnId: string } | null>(() => {
    const ranges = table.atoms.cellSelection.get()
    const a = ranges[ranges.length - 1]
    return a ? { rowId: a.anchorRowId, columnId: a.anchorColumnId } : null
  })
  const bounds = computed<SheetBounds | null>(() => table.getCellSelectionBounds()[0] ?? null)
  const cell = (rowId: string, columnId: string) =>
    table.getCoreRowModel().rowsById[rowId]?.getAllCellsByColumnId()[columnId]

  return {
    active,
    bounds,
    focus: (rowId: string, columnId: string) => table.setFocusedCell(rowId, columnId),
    move: (d: Direction) => table.moveCellSelection(d),
    extend: (d: Direction) => table.extendCellSelection(d),
    selectAll: () => table.selectAllCells(),
    /** Gutter tıklaması: satır aralığının tüm hücreleri (07 §6). */
    selectRange: (range: { anchorRowId: string; anchorColumnId: string; focusRowId: string; focusColumnId: string }) =>
      table.selectCellRange(range),
    clear: () => table.resetCellSelection(true),
    /** Fare: mousedown (⇧ ile genişletme, sürükleme başlangıcı) ve sürüklerken mouseover (TanStack handler'ları). */
    startHandler: (rowId: string, columnId: string) => cell(rowId, columnId)?.getSelectionStartHandler(),
    extendHandler: (rowId: string, columnId: string) => cell(rowId, columnId)?.getSelectionExtendHandler(),
  }
}

export type SheetTable<Row extends object> = ReturnType<typeof useSheetTable<Row>>
