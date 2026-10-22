// api-draft.ts §6'dan türetildi: @save yükü, kayıt sonucu, ilerleme, içe aktarma, durum ve handle (07).

/** `@save` yükündeki bir satır. */
export interface SheetChangeRow {
  /** Paketin satıra verdiği geçici kimlik; `applyResult` bununla eşleşir. */
  clientId: string
  /** Anahtar sütunun değeri (ör. SKU). */
  key: string
  /** create: anahtar sunucuda yok → tüm dolu alanlar. update: yalnızca değişen alanlar. Sunucu anahtara göre upsert yapar (D11). */
  op: 'create' | 'update'
  values: Record<string, unknown>
}

export interface SheetChanges {
  /** Yalnızca yeni + değişmiş satırlar; hatalı satırlar ve listeden çıkarılanlar yoktur (D11, D12). */
  rows: SheetChangeRow[]
}

export interface SheetRowResult<Row> {
  clientId: string
  status: 'created' | 'updated' | 'error'
  /** Sütun id → mesaj. Hücrede kırmızı gösterilir. */
  fieldErrors?: Record<string, string>
  /** Belirli bir alana bağlanamayan hata: satır başında gösterilir. */
  rowError?: string
  /** Sunucunun kaydettiği hali; verilirse satır bununla güncellenir. */
  row?: Row
}

/** İlerleme: boolean ya da sayaç ("Loading products… 6,200 of 10,000"). */
export type Progress = boolean | { done: number; total: number }

/** `parseFile` sonucu: biçimden bağımsız ham satırlar; başlık tespiti ve eşleme paketindir (07 §13). */
export interface ParsedWorkbook {
  sheets: Array<{ name: string; rows: unknown[][] }>
}

export type SheetFilterMode = 'all' | 'changed' | 'errors'

export interface SheetStatus {
  phase: 'loading' | 'ready' | 'saving' | 'saved' | 'partly-saved'
  changedCells: number
  changedRows: number
  newRows: number
  errorRows: number
  warningRows: number
}

/** useTemplateRef<DataSheetHandle>('sheet'). `applyResult` 6c'de. */
export interface DataSheetHandle {
  status: Readonly<SheetStatus>
  /** Yönlendirici koruması için. */
  isDirty: () => boolean
  /** `@save` ile aynı yük; uygulamanın kendi kaydetme düğmesi için. */
  getChanges: () => SheetChanges
  /** Discard: tüm satırlar yüklendiği hale döner; yığın temizlenir. */
  reset: () => void
  undo: () => void
  redo: () => void
  /** F8 ile aynı. */
  goToNextError: () => void
}
