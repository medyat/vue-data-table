// Düzenleme oturumu (07 §5): tek düzenlenen hücre; taslak değer burada durur, editör yalnızca düzenlenirken çizilir
// (sanal kaydırmada kaybolmaz). Onaylayanlar: Enter/Tab, başka hücreye mousedown, ızgara dışına tık; Esc iptal; blur ile
// onay yoktur. `inCell: false` formül çubuğundan düzenlemedir (hücre editör açmaz). Onayda '' → null.
import { shallowRef, type Component } from 'vue'
import type { ColumnDef } from '../types/columns'
import type { SheetStore } from './useSheetStore'
import type { SheetTable } from './useSheetTable'

export interface EditState<Row extends object> {
  row: Row
  def: ColumnDef<Row>
  value: unknown
  inCell: boolean
  /** Formül çubuğundan yazılan ham metin (çözümlenmiş değerden geri üretilmez: "2," yazarken virgül kaybolmasın). */
  text?: string
}

export interface SheetEditingOptions<Row extends object> {
  store: SheetStore<Row>
  canEdit: (row: Row, def: ColumnDef<Row>) => boolean
  parse: (def: ColumnDef<Row>, text: string) => unknown
}

export function useSheetEditing<Row extends object>(o: SheetEditingOptions<Row>) {
  const editing = shallowRef<EditState<Row> | null>(null)

  /** `replace`: yazarak açılış — içerik yazılanla değiştirilir; yoksa F2 / çift tık — mevcut değer, imleç sonda. */
  const start = (row: Row, def: ColumnDef<Row>, opts: { inCell: boolean; replace?: string }): boolean => {
    if (!o.canEdit(row, def)) return false
    // boolean'ın düzenleme modu yok (07 §5): Space / çift tık çevirir; özel editör verilmişse o açılır.
    if (def.type === 'boolean' && !def.editor) return false
    const value = opts.replace !== undefined ? o.parse(def, opts.replace) : o.store.read(row, def)
    editing.value = { row, def, value, inCell: opts.inCell, text: opts.replace }
    return true
  }
  const setValue = (value: unknown, text?: string, inCell?: boolean) => {
    const e = editing.value
    if (e) editing.value = { ...e, value, text, inCell: inCell ?? e.inCell }
  }
  const commit = (): boolean => {
    const e = editing.value
    if (!e) return false
    editing.value = null
    o.store.set(e.row, e.def, e.value === '' ? null : e.value)
    return true
  }
  const cancel = () => {
    editing.value = null
  }
  return { editing, start, setValue, commit, cancel }
}

export type SheetEditing<Row extends object> = ReturnType<typeof useSheetEditing<Row>>

/** DataSheet'in SheetGrid'e verdiği nesne: durum + niyetler (grid DOM'u, DataSheet kuralları yönetir). */
export interface SheetApi<Row extends object> {
  store: SheetStore<Row>
  table: SheetTable<Row>
  edit: SheetEditing<Row>
  canEdit: (row: Row, def: ColumnDef<Row>) => boolean
  editorFor: (def: ColumnDef<Row>) => Component | null
  /** `boolean` hücresinde Space. */
  toggle: (row: Row, def: ColumnDef<Row>) => void
  /** Delete / Backspace: seçimdeki düzenlenebilir hücreleri temizler. */
  clearCells: () => void
  /** ⌘S. */
  save: () => void
  /** F8 / ⇧F8. */
  goToError: (dir: 1 | -1) => void
  /** Pano olayları (07 §7): seçim TSV + HTML; yapıştırma aktif hücreden. İşlendiyse true (olay engellenir). */
  copy: (data: DataTransfer | null) => boolean
  cut: (data: DataTransfer | null) => boolean
  paste: (data: DataTransfer | null) => boolean
  /** Fill handle (07 §8): kaynak satır aralığı + sütun dizini aralığı → hedef satıra kadar. */
  fill: (fromRow: number, toRow: number, cols: [number, number], target: number) => void
  fillLabel: (fromRow: number, toRow: number, cols: [number, number], target: number) => string
  /** ⌘D. */
  fillDown: () => void
  undo: () => void
  redo: () => void
  /** Balondaki "Use Pumps". */
  useSuggestion: (row: Row, def: ColumnDef<Row>, value: unknown) => void
  /** Hücre menüsü (07 §9): panoya yaz / panodan oku (`navigator.clipboard`), satır ekle, listeden çıkar (⌘−). */
  copyToClipboard: (cut: boolean) => void
  pasteFromClipboard: () => void
  insertRow: (where: 'above' | 'below') => void
  removeSelectedRows: () => void
  /** Header tıklaması: yerel sıralama (07 §10). */
  sort: (columnId: string, additive: boolean) => void
  /** Sunucuda var olan satırın linki ("Open product"); yeni satırda undefined. */
  openHref: (row: Row) => string | undefined
}
