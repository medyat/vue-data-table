/**
 * Data Table — API taslağı
 *
 * Bu dosya public sözleşmedir; geliştirme sırasında `src/types/` altına
 * bölünerek taşınır. Alan adlarını değiştirmek gerekirse önce dokümanları
 * (03, 04, 05, 07) güncelleyin.
 *
 * İki bileşen, tek çekirdek:
 *   <DataTable>      liste ekranı         (import { DataTable } from '@medyat/vue-data-table')
 *   <DataSheet>      toplu düzenleme      (import { DataSheet } from '@medyat/vue-data-table/sheet')
 *
 * Public API'de TanStack tipi yoktur; TanStack Table yalnızca paket içinde
 * (01 · TanStack sınırı) kullanılır.
 *
 * Bölümler:
 *   1. Temel tipler ve plugin
 *   2. Sütun tanımı (03)
 *   3. Filtre, sıralama, sorgu, talep (04, 05)
 *   4. Liste: aksiyonlar, seçim, satır etkileşimleri (05)
 *   5. Görünümler ve tercihler (04)
 *   6. Toplu düzenleme (07)
 *   7. Bileşen props / emits / slots / handle
 *   8. i18n (09)
 */

import type { Component, Plugin, VNodeChild } from 'vue'

/* ------------------------------------------------------------------ */
/* 1. Temel tipler ve plugin                                           */
/* ------------------------------------------------------------------ */

export type Density = 'comfortable' | 'standard' | 'compact'
export type RowKey = string | number
/** Tablo örneğinin kalıcı kimliği: görünümler ve tercihler bununla saklanır (ör. "production-orders"). */
export type TableId = string
/** ISO tarih ("2026-10-24") veya tarih-saat ("2026-10-24T09:42:00Z"). */
export type IsoDate = string

export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'pink' | 'teal'

/** Çoğul biçimli metin: { one: 'status', other: 'statuses' } */
export interface Plural {
  one: string
  other: string
}

/**
 * Nokta yolu: 'customer.title', 'stock.available'. En fazla 4 seviye; diziler yaprak sayılır.
 * Derleme zamanında Row üzerinde doğrulanır ('customer.nope' hata verir).
 */
export type Path<Row> = string // gerçek tanım: koşullu tip (src/types/path.ts); taslakta string

/** Uygulama genelinde bir kez: app.use(createDataTable({ … })) */
export interface DataTableOptions {
  /** Varsayılan navigator.language. Sayı/tarih biçimi ve metin karşılaştırması bu locale ile. */
  locale?: string
  messages?: Partial<Messages>
  /** Yoksa yalnızca `views` prop'undaki görünümler; kaydetme yok. */
  viewsAdapter?: ViewsAdapter
  /** Yoksa tercihler oturumluk (kalıcı değil) ve arayüz bunu "kaydedildi" gibi sunmaz. */
  preferences?: PreferencesAdapter
}
export declare function createDataTable(options?: DataTableOptions): Plugin

/* ------------------------------------------------------------------ */
/* 2. Sütun tanımı                                                     */
/* ------------------------------------------------------------------ */

/** 23 tip. `type` zorunludur; veriden çıkarsama yoktur. */
export type ColumnType =
  // sayı
  | 'int' | 'float' | 'percentage' | 'star' | 'currency'
  // metin
  | 'string' | 'text' | 'uppercase' | 'lowercase' | 'phone' | 'color' | 'email' | 'url' | 'id'
  // seçim
  | 'boolean' | 'select' | 'multiselect' | 'ajax' | 'user'
  // tarih
  | 'date' | 'datetime'
  // yapısal (object: sıralanmaz, filtrelenmez — özel içerik için kaçış kapısı)
  | 'object' | 'array'

export interface OptionDef {
  value: string | number
  label: string
  /** Hazır ton veya tema başına açık renk. Verilmezse 'gray'. */
  tone?: Tone | { light: string; dark: string }
  description?: string
}

export interface UserOption extends OptionDef {
  avatarUrl?: string
  /** Avatar yoksa gösterilecek baş harfler; verilmezse label'dan üretilir. */
  initials?: string
}

/** `ajax` ve `user` sütunlarının seçenek kaynağı (sütunun kendi verisi; metin filtresi önerisi değildir). */
export interface RemoteOptions<O extends OptionDef = OptionDef> {
  /** Yazdıkça arama. Varsayılan sayfa boyutu 20. */
  search: (q: string, page: number, ctx: { signal: AbortSignal }) => Promise<{ items: O[]; hasMore: boolean }>
  /** Kayıtlı filtre değerlerinin, yapıştırılan değerlerin ve hücre değerlerinin etiketlerini çözer. */
  resolve: (values: Array<string | number>, ctx: { signal: AbortSignal }) => Promise<O[]>
  pageSize?: number
}

/** Özel hücre içeriğine verilen bağlam. `value` tipe göre daralır (int → number | null, select → string | number | null …). */
export interface CellContext<Row, V = unknown> {
  row: Row
  value: V
  /** Tipin varsayılan biçimlendirmesi ("12,400", "Oct 24"); özel içerik bunu sarabilir. */
  formatted: string
  column: { id: string; type: ColumnType }
  density: Density
}

/**
 * Özel hücre içeriği: yalnızca fonksiyon formu. Bileşen `h(Comp, props)` ile verilir.
 * Tipin kabuğu (hizalama, kesme, boş değer, yoğunluk, hover) korunur; yalnızca içerik değişir.
 * Sıralama, filtre, editör ve dışa aktarma `type`'tan gelir; `cell` yalnızca gösterimdir.
 */
export type CellRender<Row, V = unknown> = (ctx: CellContext<Row, V>) => VNodeChild

/** Hücre aksiyonu: paket sağ kenarda overlay olarak çizer (metin yerleşimi değişmez), ≤ 2 ikon + ⋯ menüsü. */
export interface CellAction<Row> {
  id: string
  label: string
  icon: Component
  /** 'hover': hover ve focus-within'de görünür (varsayılan). 'always': her zaman. */
  reveal?: 'hover' | 'always'
  /** Değere bağlı aksiyon: false → gösterilmez. */
  when?: (row: Row) => boolean
  disabled?: (row: Row) => boolean | string
  destructive?: boolean
  /** Alt menü (⋯ olarak çizilir). */
  menu?: Array<Omit<CellAction<Row>, 'reveal' | 'menu'>>
  run?: (row: Row) => void | Promise<void>
}

/**
 * Özel editör (DataSheet). Sözleşme: props { modelValue, row, column }, emit 'update:modelValue'.
 * Enter/Tab/Esc'i sheet yönetir; bileşen yalnızca değeri üretir. Portallı içerik (popover, combobox) serbesttir;
 * köküne `dt-sheet-layer` sınıfı verilir ki oradaki tık düzenlemeyi onaylamasın (07 §5).
 */
export type CellEditor = Component

export interface ValidationContext<Row> {
  /** Aynı satırdaki diğer güncel değerler (ör. cost ≤ listPrice). */
  row: Row
  /** Satır yeni mi (anahtar sunucuda yok)? */
  isNew: boolean
  /** Satırın yüklendiği andaki değeri. Yeni satırda undefined. */
  original: unknown
}

/** null/undefined/'' → geçerli; string → hata veya uyarı metni (i18n'lenmiş). */
export type Validator<Row> = (value: unknown, ctx: ValidationContext<Row>) => string | null | undefined
/**
 * Satıra göre kapalı seçenek (DataSheet). `options` tam liste kalır (etiket, filtre, dışa aktarma); kapalı seçenekler
 * editör listesinde görünmez, yapıştırma/doldurma ile gelirse "isn't an option" hatası — yalnızca **değişen** hücrede
 * (mevcut değer kural değişince hata olmaz). Satırın taslak halini alır.
 */
export type OptionEnabled<Row> = (option: OptionDef, row: Row) => boolean

export interface ColumnFilterOptions {
  /** Tipin listesinden alt küme. */
  operators?: FilterOp[]
  defaultOperator?: FilterOp
}

interface BaseColumn<Row, V = unknown> {
  /**
   * Kararlı kimlik. Görünümlerde, sorguda ve sunucu sözleşmesinde kullanılır. Değiştirmeyin.
   * `accessor` verilmezse değer bu yoldan okunur: 'number' → row.number, 'customer.title' → row.customer?.title.
   */
  id: Path<Row> | string
  /** Header metni (uygulama i18n'den verir). */
  header: string
  /** Dar alanlarda (telefon) kısa header: "Disc.". */
  headerShort?: string
  /** Sütun açıklaması (uygulama i18n'den verir): header tooltip'inde ad altında ikinci satır, Columns dialog'unda ad altında; hücrede gösterilmez. */
  description?: string
  /** Hesaplanan değer. Verilirse `fields` ile sunucudan istenecek alanlar bildirilir. */
  accessor?: (row: Row) => V
  /** Sunucu modunda `query.fields`'e eklenecek alan yolları (hesaplanan sütunlar için). */
  fields?: string[]
  /** string → header'da soluk son ek ("pcs", "d"). Fonksiyon → hücrede, satır bazında. */
  unit?: string | ((row: Row) => string)

  align?: 'left' | 'right' | 'center'
  /** px. Varsayılan tipe göre (05 · Sütun genişlikleri). Sabit sütunlar her zaman px. */
  width?: number
  /** px. Varsayılan 80. */
  minWidth?: number
  maxWidth?: number
  /** Varsayılan olarak gizli (Columns dialog'unda kapalı). Sabitleme sütunda değil, görünümde ve dialog'da (D45). */
  hidden?: boolean
  /** Gizlenemez (Columns dialog'unda anahtarı pasif). Birincil sütun için otomatik true. */
  alwaysVisible?: boolean

  /**
   * Birincil hücre: kaydın adı/numarası. Gerçek <a href> olarak render edilir (D6),
   * telefonda sabit kalır. Tabloda en fazla bir tane.
   */
  primary?: boolean
  /** Birincil hücre veya `id`/`ajax` tipi için kayıt linki. Satır menüsündeki Open da bunu kullanır. */
  href?: (row: Row) => string | undefined
  /** İkinci satır (yalnızca Comfortable). */
  secondary?: (row: Row) => string | null | undefined
  /** Boş değer metni. Varsayılan "—". */
  emptyText?: string

  /** Tip destekliyorsa varsayılan true. */
  sortable?: boolean
  /** Tip destekliyorsa varsayılan true. */
  filterable?: boolean
  filter?: ColumnFilterOptions
  /** Toolbar aramasına dahil mi? Varsayılan true: string, text, id, uppercase, lowercase, email, phone. Diğerlerinde false. */
  searchable?: boolean
  /** Column picker › Suggested (en fazla 4). */
  suggested?: boolean
  /** Çip özetinde sayım için: "3 statuses". Verilmezse "3 values". */
  filterNoun?: Plural
  /** Telefonda sütun önceliği: küçük sayı = birincile daha yakın. */
  priority?: number

  /* ---- gösterim ve aksiyonlar ---- */
  cell?: CellRender<Row, V>
  actions?: Array<CellAction<Row>>

  /* ---- DataSheet ---- */
  /** Varsayılan false (sütun salt okunur). Fonksiyon satır bazında kilitleyebilir; satırın güncel (taslak uygulanmış) halini alır, başka bir hücre değişince yeniden değerlendirilir. Anahtar sütun yüklenmiş satırlarda her zaman salt okunurdur. */
  editable?: boolean | ((row: Row, ctx: { isNew: boolean }) => boolean)
  /** Tipin editörü yerine özel editör. */
  editor?: CellEditor
  /** Boş bırakılırsa hata (header'da `*`). */
  required?: boolean
  /** Hata: satırı kayıttan alıkoyar. */
  validate?: Validator<Row>
  /** Uyarı: kayda izin verir (ör. fiyat %40'tan fazla değişti). */
  warn?: Validator<Row>
  /** İçe aktarmada otomatik eşleşme için alternatif başlıklar: ["Stok Kodu", "Stock code"]. `header` ve `id` ile birlikte normalize edilerek (küçük harf, boşluk ve Türkçe karakter duyarsız) karşılaştırılır (07 §13). */
  importAliases?: string[]
  /** Formula bar ipucundaki kısıt metni: "≥ 0". Tip, para birimi ve "required" otomatik eklenir. */
  hint?: string
}

export type ColumnDef<Row = any> =
  | (BaseColumn<Row, number | null> & { type: 'int' })
  | (BaseColumn<Row, number | null> & { type: 'float'; /** Varsayılan 2. */ decimalPlaces?: number })
  | (BaseColumn<Row, number | null> & { type: 'percentage'; display?: 'text' | 'bar'; decimalPlaces?: number })
  | (BaseColumn<Row, number | null> & { type: 'star'; /** Varsayılan 5. */ max?: number })
  | (BaseColumn<Row, number | null> & {
      type: 'currency'
      /** Sabit ISO kodu veya satırdan okuma. Filtrede para birimi ikinci çip olarak seçilir. */
      currency: string | ((row: Row) => string)
      decimalPlaces?: number
    })
  | (BaseColumn<Row, string | null> & { type: 'string' | 'text' | 'uppercase' | 'lowercase' | 'email' | 'url' | 'id' })
  | (BaseColumn<Row, string | null> & { type: 'phone' })
  | (BaseColumn<Row, string | null> & { type: 'color'; display?: 'swatch' | 'fill'; palette?: string[] })
  | (BaseColumn<Row, boolean | null> & { type: 'boolean'; /** Varsayılan 'neutral' (D9). */ falseTone?: 'neutral' | 'destructive' })
  | (BaseColumn<Row, string | number | null> & {
      type: 'select'
      options: OptionDef[]
      optionEnabled?: OptionEnabled<Row>
    })
  | (BaseColumn<Row, Array<string | number> | null> & {
      type: 'multiselect'
      options: OptionDef[]
      optionEnabled?: OptionEnabled<Row>
    })
  | (BaseColumn<Row, string | number | null> & { type: 'ajax'; remote: RemoteOptions })
  | (BaseColumn<Row, string | number | Array<string | number> | null> & {
      type: 'user'
      remote?: RemoteOptions<UserOption>
      options?: UserOption[]
      /** Birden çok kişi (avatar yığını). */
      multiple?: boolean
    })
  | (BaseColumn<Row, IsoDate | Date | null> & { type: 'date'; overdue?: boolean | ((row: Row) => boolean) })
  | (BaseColumn<Row, IsoDate | Date | null> & { type: 'datetime'; relative?: boolean; overdue?: boolean | ((row: Row) => boolean) })
  | (BaseColumn<Row, unknown> & { type: 'object'; summary?: (value: unknown, row: Row) => string })
  | (BaseColumn<Row, unknown[] | null> & { type: 'array'; itemType?: 'string' | 'int' | 'float' | 'id' })

/* ------------------------------------------------------------------ */
/* 3. Filtre, sıralama, sorgu, talep                                   */
/* ------------------------------------------------------------------ */

/** 18 operatör. Çok değerli hücrelerde (multiselect) `in` "şunlardan birini içerir" anlamındadır. */
export type FilterOp =
  | 'is_empty' | 'is_not_empty'
  | 'eq' | 'neq'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'in' | 'not_in'
  | 'before' | 'after' | 'within'

export type DatePreset =
  | 'today' | 'this_week' | 'next_7_days' | 'this_month' | 'last_30_days' | 'this_quarter' | 'overdue'

/** `user` filtrelerinde oturumdaki kullanıcı. Sunucuda çözülür. */
export const ME = '@me' as const

/** Operatöre göre ayrışan koşul. `currency` sütununda değer düz sayıdır; para birimi `currency` alanıyla gelir. */
export type FilterCondition =
  | { column: string; op: 'is_empty' | 'is_not_empty' }
  | { column: string; op: 'eq' | 'neq'; value: string | number | boolean }
  | { column: string; op: 'contains' | 'not_contains' | 'starts_with' | 'ends_with'; value: string }
  | { column: string; op: 'gt' | 'gte' | 'lt' | 'lte'; value: number; currency?: string }
  /** Uçlar dahil; tek taraflıysa biri null. */
  | { column: string; op: 'between'; value: [number | null, number | null]; currency?: string }
  | { column: string; op: 'in' | 'not_in'; value: Array<string | number> }
  | { column: string; op: 'before' | 'after'; value: IsoDate | { preset: 'today' } }
  | { column: string; op: 'within'; value: { preset: DatePreset } | { from: IsoDate; to: IsoDate } }

export interface SortRule {
  column: string
  dir: 'asc' | 'desc'
}

export interface TableQuery {
  search: string
  filters: FilterCondition[]
  /** Öncelik sırasıyla, en fazla 3. */
  sort: SortRule[]
  /** Sayfa numarası 1'den başlar (Laravel simplePaginate ile aynı). */
  page: { number: number; size: number }
  /** Görünür sütun id'leri. */
  columns: string[]
  /** Sunucudan istenen alan yolları: görünür sütunların yolları + sütunların `fields`'i + tablonun `fields` prop'u. */
  fields: string[]
}

export type QueryWithoutPage = Omit<TableQuery, 'page'>

export type RequestReason = 'initial' | 'query' | 'page' | 'columns' | 'refresh'

/**
 * `@request` olayının yükü. Paket veri çekmez: uygulama bu sorguyla kendi HTTP'sini atar ve
 * `rows`, `hasMore`, `loading`, `error` prop'larını günceller. Her yeni talepte öncekinin `signal`'i abort edilir.
 */
export interface TableRequest {
  query: TableQuery
  reason: RequestReason
  signal: AbortSignal
}

/** `countable` tablolarda "Count total" → `@count`; uygulama `total` prop'unu verir. */
export interface CountRequest {
  query: QueryWithoutPage
  signal: AbortSignal
}

/* ------------------------------------------------------------------ */
/* 4. Liste: aksiyonlar, seçim, satır etkileşimleri                    */
/* ------------------------------------------------------------------ */

export interface RowAction<Row> {
  id: string
  label: string
  /** Menüde etiketin altında ikinci satır (`disabled` gerekçesi varsa o gösterilir); inline düğmede tooltip "Label — description" (D36). */
  description?: string
  icon?: Component
  /** Gösterim için: "⌘↵". Kısayolu paket bağlamaz; yalnızca Open yerleşiktir. */
  shortcut?: string
  /** Yetkiye bağlı: false → ne menüde ne inline (D34). Duruma bağlı pasiflik için `disabled`. */
  when?: (row: Row) => boolean
  /**
   * ⋯'nın solunda 28 px ikon düğmesi olarak çizilir (`icon` zorunlu; yoksa yalnızca menüde). Çizildiği satırın ⋯ menüsünde
   * yer almaz (klavye: satırda `→` ile düğmeye gelinir). Satır başına ilk 2 inline görünür, fazlası menüde kalır; ⋯ sütunu
   * sayfadaki en kalabalık satıra göre genişler (05 §4). Menü boş kalırsa o satırda ⋯ çizilmez (D36).
   */
  inline?: boolean
  /** true veya gerekçe metni ("Already running") → pasif, gerekçe ikinci satırda. */
  disabled?: (row: Row) => boolean | string
  destructive?: boolean
  /** Menüde üstündeki ayırıcı. */
  separatorBefore?: boolean
  /** Onay, toast ve refresh uygulamanın işidir; paket sonucu beklemez. */
  run: (row: Row) => void | Promise<void>
}

/**
 * Toplu aksiyon. Seçim sayfa kapsamlıdır: `rows` o anda seçili, yüklü satırlardır.
 * Paket `run`'ı beklemez ve hata yutmaz; onay dialog'u, toast, `clearSelection()` ve `refresh()` uygulamanındır.
 */
export interface BulkAction<Row> {
  id: string
  label: string
  /** Bar düğmesinde tooltip, ⋯ menüsünde ikinci satır (`disabled` gerekçesi varsa o) (D36). */
  description?: string
  icon?: Component
  /** Bar'da görünür; değilse ⋯ menüsünde. Bar'da en fazla 3 görünür aksiyon. */
  inBar?: boolean
  destructive?: boolean
  /** Yetkiye bağlı (seçime göre): false → bar'da ve menüde yok (D36). Duruma bağlı pasiflik için `disabled`. */
  when?: (rows: Row[]) => boolean
  disabled?: (rows: Row[]) => boolean | string
  run: (rows: Row[]) => void | Promise<void>
}

/** Satır gövdesine tıklama. Varsayılan 'none': metin seçilip kopyalanabilir, seçim ve açma yapmaz. */
export type RowClickMode = 'none' | 'open' | 'expand'

export interface ExpandOptions<Row> {
  /** Bu satırın detayı var mı? Yoksa chevron gösterilmez. */
  canExpand?: (row: Row) => boolean
}

/* ------------------------------------------------------------------ */
/* 5. Görünümler ve tercihler                                          */
/* ------------------------------------------------------------------ */

export interface ColumnLayout {
  /** Görünür + gizli tüm sütunların sırası. */
  order: string[]
  /** Tanımlıysa beyaz liste: burada olmayan (sonradan eklenen) sütun gizlidir. */
  visible: string[]
  /** Yalnızca varsayılandan farklı genişlikler. */
  widths: Record<string, number>
  pinned: { left: string[]; right: string[] }
}

/** D5: görünüm = filtre + sıralama + sütun düzeni. Arama, yoğunluk, tema, sayfa yazılmaz. Kaydedilen tam snapshot. */
export interface ViewState {
  filters: FilterCondition[]
  sort: SortRule[]
  columns: ColumnLayout
}

/** Kısmi görünüm (system view tanımı ve adapter'dan gelen kayıtlar). Eksik alanlar tablonun varsayılanlarıyla tamamlanır. */
export interface ViewPatch {
  filters?: FilterCondition[]
  sort?: SortRule[]
  columns?: Partial<ColumnLayout>
}

/** Tek görünüm tipi (D4, D30). system: kodla tanımlı, değiştirilemez (Duplicate, Set as default). personal: yalnızca sahibine. */
export interface View {
  id: string
  name: string
  kind: 'system' | 'personal'
  state: ViewPatch
  /** Ekranın varsayılanı (system içinde en fazla bir tane). Kullanıcı varsayılanı tercihlerde (`defaultViewId`). */
  default?: boolean
  updatedAt?: IsoDate
  /** Sunucu sürüm numarası (çakışma tespiti için, opsiyonel). */
  v?: number
}

export interface ViewsAdapter {
  list: (tableId: TableId) => Promise<View[]>
  create: (tableId: TableId, input: { name: string; state: ViewState }) => Promise<View>
  update: (tableId: TableId, id: string, patch: { name?: string; state?: ViewState }) => Promise<View>
  remove: (tableId: TableId, id: string) => Promise<void>
}

/** Tarayıcıya kaydeden hazır adapter. `scope` zorunludur (uygulama/kiracı anahtarı); scope değişince eski veri taşınmaz. */
export declare function createLocalStorageViews(options: { scope: string }): ViewsAdapter

export interface Preferences {
  density: Density
  verticalLines: boolean
  pageSize: number
  /** Kullanıcının "Set as default" seçtiği görünüm (system veya personal). */
  defaultViewId: string | null
}

export interface PreferencesAdapter {
  get: (tableId: TableId) => Partial<Preferences> | Promise<Partial<Preferences>>
  set: (tableId: TableId, prefs: Partial<Preferences>) => void | Promise<void>
}

export declare function createLocalStoragePreferences(options: { scope: string }): PreferencesAdapter

/* ------------------------------------------------------------------ */
/* 6. Toplu düzenleme                                                  */
/* ------------------------------------------------------------------ */

/** `@save` yükündeki bir satır. */
export interface SheetChangeRow {
  /** Paketin satıra verdiği geçici kimlik; `applyResult` bununla eşleşir. */
  clientId: string
  /** Anahtar sütunun değeri (ör. SKU). */
  key: string
  /**
   * create: anahtar sunucuda yok → tüm dolu alanlar.
   * update: anahtar var → yalnızca değişen alanlar (kısmi güncelleme).
   * Sunucu her durumda anahtara göre upsert yapar (D11); `op` ipucudur.
   */
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
  /** Sunucunun kaydettiği hali (hesaplanan alanlar vb.). Verilirse satır bununla güncellenir. */
  row?: Row
}

/** İlerleme: boolean ya da sayaç ("Loading products… 6,200 of 10,000", "Saving… 4,800 of 9,600 rows"). */
export type Progress = boolean | { done: number; total: number }

/**
 * `parseFile` sonucu: dosya biçiminden bağımsız ham satırlar (.xlsx/.xls için ör. exceljs, .csv için uygulamanın
 * CSV ayrıştırıcısı). Başlık satırı tespiti ve sütun eşleme paketindir (07 §13); uygulama başlığı ayırmaz.
 */
export interface ParsedWorkbook {
  sheets: Array<{
    name: string
    /** Ham satırlar, başlık satırı dahil, boş satırlar yerinde (Header row seçici satır numarasıyla çalışır). Sayı/tarih çözümlemesini paket yapar. */
    rows: unknown[][]
  }>
}

/** 07 §13: başlık satırı tespiti (`detectHeaderRow`) ve sütun eşleme (`matchColumns`) ayrı, saf fonksiyonlardır; `@medyat/vue-data-table/sheet`'ten dışa verilir ve ayrı test edilir. */
export declare function detectHeaderRow(rows: unknown[][]): number
/** Dönen eşlemede yalnızca tek ve kesin eşleşenler vardır; eşleşmeyen ya da birden fazla alana uyan sütun haritada yoktur (seçici boş kalır). */
export declare function matchColumns(headers: string[], columns: Array<Pick<ColumnDef<any>, 'id' | 'header' | 'importAliases'>>): Record<number, string>

export type SheetFilterMode = 'all' | 'changed' | 'errors'

export interface SheetStatus {
  phase: 'loading' | 'ready' | 'saving' | 'saved' | 'partly-saved'
  changedCells: number
  changedRows: number
  newRows: number
  errorRows: number
  warningRows: number
}

/* ------------------------------------------------------------------ */
/* 7. Bileşen props / emits / slots / handle                           */
/* ------------------------------------------------------------------ */

/** Yükleme hatası. string → uygulamanın mesajı; nesne → mesaj + "Copy error ID". */
export type TableError = boolean | string | { message?: string; id?: string }

interface CommonProps<Row> {
  tableId: TableId
  columns: Array<ColumnDef<Row>>
  rows: Row[]
  /** Satır kimliğinin yolu. Varsayılan 'id'. Geliştirme modunda tekrar eden veya undefined anahtar uyarı verir. */
  rowKey?: Path<Row> | string
  /** Verilmezse tercihten, o da yoksa bileşene göre varsayılan (02 · Yoğunluk). */
  density?: Density
  /** Plugin ayarını bu tablo için ezer. */
  locale?: string
  messages?: Partial<Messages>
  /** Mesajlarda kullanılır: { one: 'order', other: 'orders' }. */
  entityName?: Plural
  /** Tek harfli kısayollar (/, F, V, R, X). Varsayılan true. Oklar, Enter, Space ve Esc her zaman çalışır. */
  shortcuts?: boolean
}

export interface DataTableProps<Row> extends CommonProps<Row> {
  /** client: tüm satırlar verilir, filtre/arama/sıralama/sayfalama yerelde. server: `@request` ile uygulama çeker. Varsayılan 'client'. */
  mode?: 'client' | 'server'
  loading?: boolean
  error?: TableError
  /** Sunucu modu: sonraki sayfa var mı (Laravel `next_page_url !== null`). */
  hasMore?: boolean
  /** Biliniyorsa toplam ("Rows 101–200 of 1,284"). İstemci modunda otomatik. */
  total?: number
  /** Sunucu modu: footer'da "Count total" → `@count`. */
  countable?: boolean
  /** Her talepte `query.fields`'e eklenecek ek alanlar (ör. satır aksiyonlarının ihtiyaçları). */
  fields?: string[]
  /** Yeni görünen sütunun yolu son talebin `fields`'inde yoksa `reason: 'columns'` talebi (400 ms birleştirme). Varsayılan true. */
  requestOnColumnChange?: boolean
  /** Kodla tanımlı görünümler (kind: 'system'); adapter'daki kişisel görünümlerle birleştirilir. */
  views?: View[]
  /** auto: yapılandırılana göre yuvalar; minimal: yalnızca arama + `#toolbar-end`; false: toolbar yok. Varsayılan 'auto'. */
  toolbar?: 'auto' | 'minimal' | false
  /** Arama kutusu metni. Varsayılan i18n `toolbar.search`. */
  searchPlaceholder?: string
  /** Varsayılan false. */
  selectable?: boolean
  /** Seçim çubuğu: yüzer (varsayılan) veya toolbar'ın yerine. */
  selectionBar?: 'floating' | 'toolbar'
  bulkActions?: Array<BulkAction<Row>>
  rowActions?: Array<RowAction<Row>>
  /** Varsayılan 'none'. */
  rowClick?: RowClickMode
  expand?: boolean | ExpandOptions<Row>
  /**
   * Satır hatası (D35): metin ya da metin listesi dönerse satır `--dt-r-bg` (seçim ve hover'ın üstünde), ⋯ hücresinde (yoksa
   * ilk hücrede) kırmızı uyarı ikonu; mesajlar satırın her yerinde tooltip'te alt alta, satıra `aria-describedby`. Boş metin,
   * boş dizi, null → hata yok.
   * Haritayı uygulama tutar ve temizler (toplu aksiyonun kısmi hatası); paket saklamaz.
   */
  rowError?: (row: Row) => string | string[] | null | undefined
  /** Varsayılan 100; tercih varsa o. */
  pageSize?: number
  /** Varsayılan [50, 100, 250, 500]. */
  pageSizes?: number[]
  /** Saniye. Verilmezse More menüsünde Auto-refresh görünmez. */
  autoRefresh?: number
}

export interface DataTableEmits<Row> {
  /** Sunucu modunda her talep; istemci modunda yalnızca `refresh()` (reason: 'refresh'). */
  request: TableRequest
  count: CountRequest
  /** Seçim her değiştiğinde; sayfa kapsamlı yüklü satırlar. */
  'selection-change': Row[]
  /** Birincil linke düz sol tık, satırda Enter, satır menüsü › Open, `row-click="open"`. Paket preventDefault yapmaz: dinleyici yoksa tarayıcı gider; SPA için `event.preventDefault()` + router. */
  'row-open': { row: Row; href: string; event: MouseEvent }
  /** Etkileşimli hedef, metin seçimi ve değiştirici tuş dışındaki satır tıklamaları (`rowClick` değerinden bağımsız). */
  'row-click': { row: Row; event: MouseEvent }
  /** Açılışta (varsayılan görünüm) ve her görünüm değişiminde; uygulama isterse URL'ini yazar (D25). */
  'view-change': { id: string; kind: View['kind'] }
  /** More › Export. Dosyayı uygulama üretir. */
  export: { format: 'csv' | 'xlsx'; query: QueryWithoutPage; selection: Row[]; visibleColumns: string[] }
  /** More › Import… (uygulama kendi akışını açar). */
  import: void
  print: { query: QueryWithoutPage; visibleColumns: string[] }
}

/** useTemplateRef<DataTableHandle<Row>>('table') */
export interface DataTableHandle<Row = any> {
  /** Son talebi `reason: 'refresh'` ile yeniden yayar; satırlar ve seçim yerinde kalır. */
  refresh: () => void
  clearSelection: () => void
}

/**
 * DataTable slot'ları:
 *   #expanded="{ row, close }"           Satır detayı; veriyi slot bileşeni çeker (paket yüklemez, önbelleklemez)
 *   #empty                               İlk kullanım boş durumu (başlık, metin, aksiyonlar)
 *   #toolbar-end="{ compact }"           Toolbar'ın sağı (birincil aksiyon vb.)
 *   #selection-actions="{ rows, clear }" bulkActions yerine özel seçim çubuğu içeriği
 */

export interface DataSheetProps<Row> extends CommonProps<Row> {
  /** Upsert anahtarı olan sütun (ör. "sku"). Yüklenmiş satırlarda salt okunur. `rowKey`'den ayrıdır. */
  keyColumn: string
  /** Uygulama satırları yüklerken; sayaç verilirse "Loading… 6,200 of 10,000". Düzenleme false olunca açılır. */
  loading?: Progress
  /** `@save` sonrası uygulama kaydederken; grid salt okunur, ilerleme şeridi. */
  saving?: Progress
  /**
   * Yeni satırlarda yazılan / yapıştırılan / içe aktarılan anahtarların kontrolü (New / Update ayrımı).
   * Verilmezse her bilinmeyen anahtar New sayılır. Toplu çağrılır (en fazla 500 anahtar).
   */
  lookupKeys?: (keys: string[], ctx: { signal: AbortSignal }) => Promise<Record<string, Row | null>>
  /** Import Excel / CSV: dosyayı uygulama ayrıştırır (ör. exceljs; CSV için kendi ayrıştırıcısı) ve ham satırları verir. Verilmezse toolbar'da Import gösterilmez. */
  parseFile?: (file: File) => Promise<ParsedWorkbook>
  /** Varsayılan 10.000. Aşılırsa ekleme/yapıştırma/içe aktarma durur ve uyarır. */
  maxRows?: number
  /** Add row ile oluşan satırın başlangıç değerleri. */
  newRowDefaults?: () => Partial<Row>
  /** Bu genişliğin altında veya yalnızca dokunmatikte salt okunur (D14). Varsayılan 768. */
  readOnlyBelow?: number
}

export interface DataSheetEmits<Row> {
  /** Save: doğrulama geçen yeni + değişmiş satırlar. Uygulama kaydeder, `saving` verir, `applyResult` çağırır. */
  save: SheetChanges
  /** Export. Değerler güncel (kaydedilmemiş değişiklikler dahil); dosyayı uygulama yazar. */
  export: { format: 'csv' | 'xlsx'; scope: 'all' | 'visible'; columns: string[]; rows: Row[] }
}

/** useTemplateRef<DataSheetHandle<Row>>('sheet') */
export interface DataSheetHandle<Row = any> {
  status: Readonly<SheetStatus>
  /** Yönlendirici koruması için. */
  isDirty: () => boolean
  /** `@save` ile aynı yük; uygulamanın kendi kaydetme düğmesi için. */
  getChanges: () => SheetChanges
  /**
   * Kayıt sonuçlarını işler (parça parça çağrılabilir): created/updated → işaretler kalkar, `row` verildiyse değerler onunla
   * güncellenir; error → değişiklikler kalır, hatalar hücrelere yazılır. Undo/redo yığını temizlenir.
   */
  applyResult: (results: Array<SheetRowResult<Row>>) => void
  /** Discard: tüm satırlar yüklendiği hale döner. */
  reset: () => void
  undo: () => void
  redo: () => void
  /** F8 ile aynı. */
  goToNextError: () => void
}

/**
 * DataSheet slot'ları:
 *   #empty
 */

/* ------------------------------------------------------------------ */
/* 8. i18n                                                             */
/* ------------------------------------------------------------------ */

/** Anahtar listesi ve EN/TR metinleri: 09-i18n.md. Parametreli metinler fonksiyondur. */
export type MessageValue = string | ((params: Record<string, string | number>) => string)
export type Messages = Record<string, MessageValue>
