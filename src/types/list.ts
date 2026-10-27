// api-draft.ts §4'ten: satır ve toplu aksiyonlar, satır tıklaması, expand (05 §6–7, D6, D19, D20).
import type { Component } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Row için üst sınır; api-draft ile aynı
export interface RowAction<Row = any> {
  id: string
  label: string
  /** Menüde etiketin altında ikinci satır (gerekçe varsa o gösterilir); inline düğmede tooltip "Label — description" (D36). */
  description?: string
  icon?: Component
  /** Gösterim için ("⌘↵"); paket kısayol bağlamaz, yalnızca Open yerleşiktir. */
  shortcut?: string
  /** Yetkiye bağlı: false → ne menüde ne inline (D34). Duruma bağlı pasiflik için `disabled`. */
  when?: (row: Row) => boolean
  /** ⋯'nın solunda 28 px ikon düğmesi olarak çizilir (`icon` zorunlu); çizildiği satırın menüsünde yer almaz. Satır başına ilk 2 (D36). */
  inline?: boolean
  /** true veya gerekçe metni ("Already running") → pasif, gerekçe ikinci satırda. */
  disabled?: (row: Row) => boolean | string
  destructive?: boolean
  /** Menüde üstündeki ayırıcı. */
  separatorBefore?: boolean
  /** Onay, toast ve refresh uygulamanın işidir; paket sonucu beklemez (D20). */
  run: (row: Row) => void | Promise<void>
}

/** Toplu aksiyon. Seçim sayfa kapsamlıdır (D19): `rows` o anda seçili, yüklü satırlardır. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BulkAction<Row = any> {
  id: string
  label: string
  /** Bar düğmesinde tooltip, ⋯ menüsünde ikinci satır (gerekçe varsa o) (D36). */
  description?: string
  icon?: Component
  /** Bar'da görünür; değilse ⋯ menüsünde. Bar'da en fazla 3. */
  inBar?: boolean
  destructive?: boolean
  /** Yetkiye bağlı: false → bar'da ve menüde yok (D36). Duruma bağlı pasiflik için `disabled`. */
  when?: (rows: Row[]) => boolean
  disabled?: (rows: Row[]) => boolean | string
  run: (rows: Row[]) => void | Promise<void>
}

/** Satır gövdesine tıklama. Varsayılan 'none': metin seçilip kopyalanabilir, seçim ve açma yapmaz (D6). */
export type RowClickMode = 'none' | 'open' | 'expand'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExpandOptions<Row = any> {
  /** Bu satırın detayı var mı? Yoksa chevron yerinde boşluk kalır. */
  canExpand?: (row: Row) => boolean
}
