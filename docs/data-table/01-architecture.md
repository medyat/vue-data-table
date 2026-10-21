# 01 · Mimari

## Hedef

Ortak bir çekirdek üzerinde üç bileşen. Uygulama (ör. Laravel + Inertia/Vue ERP) **sütun tanımlarını** (feature'ın `columns.ts` dosyasında), **satırları** ve gerekirse **görünüm/tercih adapter'larını** verir; sunucu modunda `@request` olayını kendi HTTP'siyle cevaplar, DataSheet'te `@save` olayını kaydedip sonucu `applyResult()` ile bildirir. Geri kalan her şey (filtre çipleri, görünüm menüsü, sayfalama, seçim, düzenleme, hücre durumları) paketin içindedir. Paket veri çekmez, kaydetmez, iş mantığı taşımaz (D18, D20).

| Bileşen | Giriş | İş |
|---|---|---|
| `DataTable` | `@swors/data-table` | Liste ekranı: toolbar, filtre, görünümler, sıralama, sayfalama, seçim, satır detayı; `mode: 'client' \| 'server'` |
| `DocumentTable` | `@swors/data-table` | Belge satırları: salt okunur, expand, toplamlar |
| `DataSheet` | `@swors/data-table/sheet` | Toplu düzenleme: hücre seçimi, düzenleme, pano, doldurma, geri al, içe aktarma, kayıt teslimi |

Üçü ayrı bileşendir çünkü `defineProps<A | B>()` union'ı düzleştirip tüm prop'ları zorunlu yapar (compiler-sfc ile doğrulandı); ayrı sözleşmeler daha sade ve tip güvenlidir (D17). Çekirdek "iki kuralı" ile büyür: bir parça en az iki bileşende kullanılıyorsa `core/`'a girer; çekirdekte mod bayrağı yoktur.

## Teknoloji seçimleri ve nedenleri

| Konu | Seçim | Neden |
|---|---|---|
| Tablo mantığı | `@tanstack/vue-table` 9.x (headless) | Sütun modeli, sıralama, sayfalama state'i, satır seçimi, expand ve hücre seçimi hazır; UI bize ait. |
| Sanal satırlar | `@tanstack/vue-virtual` | Liste 100–500 satır/sayfa, sheet 10.000 satır. Sabit satır yüksekliği; expand alt satırı `measureElement` ile ölçülür. |
| Primitifler | `reka-ui` | shadcn-vue'nun temeli; erişilebilir Popover, Combobox, Dialog, DropdownMenu, Tooltip, Calendar. |
| İkonlar | `@phosphor-icons/vue` | Tek ağırlık (regular), tree-shake. |
| Stil | Derlenmiş CSS + `--dt-*` değişkenleri | Uygulamanın Tailwind kurulumundan bağımsız; shadcn temasına köprülenebilir (02). |
| Biçimlendirme | `Intl.NumberFormat` / `DateTimeFormat` / `Collator`, locale+seçenek anahtarıyla önbellekli | Hücre başına formatter oluşturmak 10k satırda 134 ms, önbellekli 3,5 ms. |
| Excel / CSV okuma | `parseFile` callback'i — öneri: `exceljs` (.xlsx/.xls okuma ve Export için yazma), CSV için uygulamanın ayrıştırıcısı | Lisans/boyut kararını uygulama versin; paket yalnızca ham satır dizisi alır. Başlık satırı tespiti ve sütun eşleme paketindedir ve dosya biçiminden bağımsızdır (07 §13). |
| Pano | Clipboard olayları (`copy`/`cut`/`paste`, `clipboardData`) + `readText` yedeği; `text/plain` (TSV) + `text/html` | Excel'den kopyalanan aralıklar TSV gelir; olay tabanlı yol izin istemez. |

### TanStack sınırı (D23)

TanStack Table yalnızca dört dosyada yaşar; her biri kendi `tableFeatures({...})` sabitini tanımlar. `grid/`, `cells/`, `filters/`, `ui/` TanStack import edemez (ESLint `no-restricted-imports`). Public API'de TanStack tipi yoktur (`SortRule`, `ColumnLayout`, `View` bizim).

| Alan | Kim | Not |
|---|---|---|
| Sütun sırası, görünürlük, genişlik, resize, pinning (start/end) | TanStack `core/columns/useColumnLayout` | `getStart/getAfter` ile sabit sütun ofsetleri; genişlikler tek `--cols` CSS değişkenine `columnSizing` atomuyla yazılır |
| Sıralama state'i ve header handler | TanStack | `sortDescFirst: false`, `maxMultiSortColCount: 3`, `isMultiSortEvent` = ⇧; istemci modunda `createSortedRowModel` + tipe göre `sortFn` (metin: `Intl.Collator`, `null` en büyük = PostgreSQL varsayılanı) |
| Sayfalama state'i | TanStack `rowPaginationFeature` | İstemci: `createPaginatedRowModel`; sunucu: `manualPagination` + `pageCount` (total varsa `ceil(total/size)`, yoksa `hasMore ? -1 : pageIndex + 1`); `autoResetPageIndex: false`, sıfırlama sorgu değişiminde bizde |
| Filtre ve arama | İstemci: TanStack `columnFiltering` + `globalFiltering` (tek dispatcher `filterFn`); sunucu: kayıt edilmez, sorguya gider | Filtre modeli (`FilterCondition`) bizim |
| Satır seçimi | TanStack `rowSelection` (dahili state) | Sayfa kapsamlı; sorgu/sayfa değişiminde `resetRowSelection(true)` biz çağırırız; checkbox `@click` + `getToggleSelectedHandler` (⇧ aralık) |
| Expand | TanStack `rowExpanding` state (row model'siz) | `autoResetExpanded: false`; sorgu/sayfa değişiminde `resetExpanded(true)` + `virtualizer.measure()` |
| Hücre seçimi (sheet) | TanStack `cellSelection` | `getTabIndex`, `getSelectionEdges`, `moveCellSelection`, `extendCellSelection`, mousedown/mouseenter handler'ları; `enableMultiCellRangeSelection: false`, `autoResetCellSelection: false` |
| Hücre değeri | **Depodan** (`row.original` / sheet deposu) | `cell.getValue()` önbellekli, veri kimliği değişmeden yenilenmez; kopyalama da `getCellSelectionBounds()` + depo okuyucu (`getSelectedCellRangesData()` kullanılmaz) |
| Sütun erişimi | Her zaman açık `id` + `accessorFn` | `accessorKey` asla (nokta → alt çizgi id çakışması) |
| Veri çekme, refresh, count, görünümler, tercihler, durumlar | Bizde | TanStack I/O yapmaz |
| Sheet deposu, düzenleme, doğrulama, undo, pano ayrıştırma, doldurma, klavye tabloları | Bizde | Referans: TanStack'in resmi `spreadsheet` örneği (`examples/react/spreadsheet`) |

Keyboard binding için `@tanstack/vue-hotkeys` kullanılmaz (1.0 öncesi); tuş tabloları paketin kendi `keydown` işleyicilerindedir.

## Klasör yapısı

```
src/
  index.ts                  # DataTable, DocumentTable, createDataTable, tipler
  sheet.ts                  # DataSheet (ayrı giriş: @swors/data-table/sheet)
  core/
    columns/                # useColumnLayout (TanStack), genişlik hesabı, --cols
    cells/                  # 24 tip: specs (hizalama, genişlik, skeleton), format, renderCell, remoteLabels, CellActions
    format/                 # Intl önbelleği, eksi işareti, göreli zaman, liste biçimi
    editors/                # tipe göre değer girişi (filtre çipi ve sheet editörü ortak)
    grid/                   # GridRoot (sanal gövde, sticky header, sabit sütun gölgesi), HeaderCell, Row (+hücreler), SkeletonRow, useDelegatedTooltip
    interaction/            # isInteractive guard (isPlainRowClick), useRovingRows (satır odaklı roving tabindex, widget giriş/çıkış)
    filters/                # FilterBar, FilterChip, ColumnPicker, OperatorMenu
    views/                  # ViewMenu, SaveViewDialog, useViews, useEditedState
    toolbar/                # Toolbar yuvaları, DisplayPopover, MoreMenu
    states/                 # Skeleton, EmptyState, NoResults, ErrorState, StaleBanner, RefreshBar
    i18n/                   # t(), en.ts, tr.ts (09'dan üretilir: scripts/i18n-from-docs.ts)
    adapters/               # createLocalStorageViews, createLocalStoragePreferences
    plugin.ts               # createDataTable, useDataTableContext
  list/
    DataTable.vue
    useListTable.ts         # TanStack: sütunlar + sıralama + sayfalama + seçim + expand (+ istemci filtre)
    useRequest.ts           # sorgu birleştirme, pending, snapshot, abort, refresh
    selection/              # BulkBar
    details/                # expand alt satırı
    footer/                 # Pagination
  document/
    DocumentTable.vue
    useDocumentTable.ts     # TanStack: sütunlar + expand
    DocumentTotals.vue
  sheet/
    DataSheet.vue
    useSheetTable.ts        # TanStack: sütunlar + sıralama + cellSelection
    useSheetStore.ts        # draft / base / errors / added / removed, okuyucu
    useSheetEditing.ts      # editing state, editör sözleşmesi, doğrulama
    useSheetHistory.ts      # komut yığını (undo/redo)
    useSheetClipboard.ts    # TSV/HTML serileştirme ve ayrıştırma, doldurma
    useSheetKeyboard.ts
    FormulaBar.vue, StatusBar.vue, ContextMenu.vue, ImportDialog.vue, SaveControls.vue
    import/detectHeaderRow.ts   # ham satırlar → başlık satırı indeksi (saf, biçimden bağımsız)
    import/matchColumns.ts      # başlıklar + ColumnDef → sütun→alan eşlemesi (saf; belirsizse boş)
  types/                    # api-draft.ts'den türetilir
  styles/
    tokens.css              # --dt-* değişkenleri (light/dark/density); 02'den üretilir (scripts/tokens-from-docs.ts)
    shadcn-bridge.css       # opsiyonel: --dt-* → shadcn değişkenleri (Tailwind v4, oklch)
    shadcn-bridge-hsl.css   # opsiyonel: aynı köprü, Tailwind v3 HSL üçlüleri için
    data-table.css          # bileşen stilleri
playground/                 # her tasarım sayfası için bir rota, sahte Laravel API'si (server/mock-api.ts)
scripts/                    # docs.ts (02/09 tablo parser'ı) ve üreticiler; pnpm gen:docs
tests/ · e2e/               # Vitest (birim/bileşen, doküman eşitlik testleri) · Playwright
```

ESLint sınırları: `core/*` yalnızca `core/*` import eder; `list/`, `document/`, `sheet/` yalnızca `core/` import eder, birbirini etmez.

## Bileşen ağaçları

```
<DataTable>
├─ Toolbar (toolbar: 'auto')
│  ├─ ViewSwitcher (görünüm varsa)        ├─ SearchInput (/, aranabilir sütun varsa)
│  ├─ FilterButton (filtrelenebilir sütun varsa)
│  ├─ DisplayPopover (kullanılabilir ayar varsa)
│  ├─ MoreMenu (Refresh sunucu modunda; Export/Import/Print dinleyici varsa; Auto-refresh ayarlıysa)
│  └─ [#toolbar-end]
├─ FilterBar (yalnızca filtre varken) → FilterChip × n, Add filter, Clear all
├─ GridRoot (role="grid", satır odaklı, sanal gövde)
│  ├─ HeaderRow → HeaderCell × n (sort, menü, resize)
│  └─ Row × n → Cell × n (+ SubRow, satır aksiyonları)
├─ Footer → Pagination (simple)
├─ BulkBar (seçim varsa; selectionBar: 'floating' | 'toolbar')
└─ ScrollPosition (kaydırırken)

<DocumentTable>
├─ (opsiyonel) SectionHeader: title, sayı, [#section-actions], Expand all, satır araması (lineSearch)
├─ GridRoot (role="table", sanal değil, yükseklik içeriğe göre)
└─ DocumentTotals

<DataSheet>
├─ Toolbar: Find, Filter, All/Changed/Errors, Undo/Redo, Add row, Import Excel, Export, Display │ değişiklik sayacı, Discard, Save changes ⌘S
├─ FilterBar (+ “Filters only change what you see…” notu)
├─ FormulaBar (aktif hücre adı + değer + tip ipucu)
├─ GridRoot (role="grid", hücre odaklı, sanal, hücre seçimi)
├─ StatusBar (satır, değişiklik, yeni, hata, seçim Σ; kayıt ilerlemesi ve sonucu)
└─ ContextMenu, ImportDialog, dialoglar
```

## Veri akışı

### DataTable

```
sütun/filtre/arama/sıralama/sayfa değişimi
  → istemci modu: TanStack row model'leri (filtered → sorted → paginated), talep yok
  → sunucu modu: TableQuery { search, filters, sort, page, columns, fields }
      → önceki talebin signal'i abort edilir → @request { query, reason, signal }
      → uygulama HTTP → rows / hasMore / loading / error prop'ları
```

- Talep sebepleri: `initial`, `query` (filtre, arama, sıralama, sayfa boyutu), `page`, `columns` (yeni görünen sütunun alanı yoksa, 400 ms birleştirme), `refresh`.
- **Kimlik değiştiren talepler** (`query`, `page`): seçim ve açık satırlar temizlenir, eski satırlar soluk + `inert`, 400 ms sonra skeleton; hata → Error durumu (eski satırlar kaldırılır). **Kimlik koruyan talepler** (`refresh`, `columns`): satırlar etkileşimli, 150 ms sonra 2 px çubuk, seçim korunur; hata → Stale şeridi (05 §10).
- Talep sürerken paket dahili `pending` bayrağı tutar: `rows`/`error` değişene ya da `loading` düşene kadar; sayfalama düğmeleri kilitlidir, footer yalnızca yüklenmiş **snapshot**'tan okur.
- Arama 250 ms debounce. Filtre değişikliği anında (çip değeri seçilince).
- `countable` ise footer'daki Count total `@count` yayar; uygulama `total` verir; sorgu (sayfa hariç) değişince sonuç geçersizdir.
- Laravel karşılığı: `simplePaginate()` (`next_page_url !== null` → `hasMore`), isteğe bağlı count endpoint'i.

### DocumentTable

Satırlar `rows` ile verilir, talep yoktur. Toplamlar `totals` ile hazır gelir (vergi kırılımı sunucu tarafında; paket yalnızca gösterir). Expand içeriği `#expanded` slot'undan; veriyi slot bileşeni çeker.

### DataSheet

```
rows (uygulama yükler; loading: { done, total } ile ilerleme) → depo: base/draft/errors (satır kopyası yok)
düzenleme / yapıştırma / doldurma / içe aktarma → draft (hücre başına, Map.has ile; bilinçli null korunur) + komut yığını
Save → doğrulama → (hatalı satır varsa dialog) → @save { rows: yeni + değişmiş }
     → uygulama HTTP (chunk, retry, ilerleme kendi kararı; `saving` prop'u ile bildirir)
     → applyResult(results) → created/updated: draft silinir, base = sunucu satırı; error: draft + hücre hataları kalır
```

Kayıt sırasında grid salt okunur; ilerleme, Partly saved banner'ı, Errors görünümü ve F8 paketin. Ayrıntılar 07.

## Plugin ve adapter'lar

```ts
app.use(createDataTable({ locale: 'tr', viewsAdapter, preferences }))
```

| Parça | Zorunlu mu | Görev |
|---|---|---|
| `viewsAdapter` | hayır (yoksa yalnızca `views` prop'undaki görünümler; kaydetme yok) | kişisel görünümleri listele / oluştur / güncelle / sil (paylaşım yok, D30) |
| `preferences` | hayır (yoksa tercihler oturumluk; arayüz “kaydedildi” demez) | yoğunluk, dikey çizgiler, sayfa boyutu, varsayılan görünüm id'si — `tableId` başına |
| `createLocalStorageViews({ scope })`, `createLocalStoragePreferences({ scope })` | hazır adapter'lar | tarayıcıda saklar; `scope` zorunlu, değişince eski veri taşınmaz |
| DataSheet `lookupKeys`, `parseFile` | hayır | callback prop'ları; HTTP ve Excel ayrıştırma uygulamada |

Arayüzlerin tamamı: [api-draft.ts](api-draft.ts).

## Render kararları

- **`<table>` değil, ARIA'lı div ızgarası.** Her satır `display: grid; grid-template-columns: var(--cols)`. Sanallaştırma, sabit sütunlar ve alt satırlar bu yapıda daha öngörülebilir.
- **Hibrit genişlik:** sabit sütunlar px; orta sütunlar `minmax(min, fr)` veya px; resize sonrası px; bölge sonunda `auto` dolgu track'i. Resize sırasında `--cols` Vue dışından (`columnSizing` atom aboneliği) yazılır; 30 görünür satırda kare başına < 1 ms.
- **Sabit header:** `position: sticky; top: 0`. **Sabit sütunlar:** `position: sticky; left/right: <hesaplanan ofset>`; kenar gölgesi **yalnızca** o yönde kaydırılmış içerik varken.
- **Satır arka planı tek değişkenle:** satır `--dt-row-bg` değişkenini ayarlar (hover, seçili, current, sheet durumları); hücreler bu değişkeni boyar. Sabit hücrelerin opak kalması için zorunlu.
- **Sanal satırlar sabit yükseklikte:** yükseklik = yoğunluğun `--dt-row-h` değeri + 1 px kenarlık. Sanal öğe = satır + (açıksa) detay; detay yalnızca görünür aralıkta render edilir, yüksekliği `measureElement` ile ölçülür ve `getItemKey = rowKey` sayesinde unmount'ta önbellekte kalır. Yalnızca odaklı satır `rangeExtractor` ile DOM'da tutulur.
- **Özel hücre:** `ColumnDef.cell` fonksiyonu vue-table'ın `flexRender`'ı ile çizilir; tipin kabuğu (hizalama, kesme, boş değer, yoğunluk) korunur. Hücre aksiyonları (`actions`) sağ kenarda overlay.
- **Tema:** paket, `.dark` sınıfına (shadcn-vue varsayılanı) veya `data-theme="dark"` özniteliğine sahip bir ataya göre koyu token'lara geçer.
- **Tooltip tek ve delegasyonlu:** kesilmiş hücre metni ve `data-dt-tip` taşıyan öğeler için ızgara kökünde tek dinleyici + tek DOM düğümü (400 ms). Hücre başına reka Tooltip örneği sanal listede yüzlerce bileşen demek olurdu; popover, menü ve dialog reka-ui ile.
- **Satır yüksekliği token'dan:** `--dt-row-h` kökten `getComputedStyle` ile okunur (02 ile tek kaynak); yoğunluk değişince virtualizer `measure()` ile ölçümleri sıfırlar.
- **Genişlikler Vue dışından:** `--cols` ve sabit sütun ofsetleri (`--dt-off-*`) senkron `watchEffect` ile kök elemana yazılır; resize sırasında satırlar yeniden çizilmez.

## Performans bütçeleri

| Senaryo | Hedef |
|---|---|
| Liste: 500 satırlık sayfada kaydırma | 60 fps; DOM'da görünür + 10 overscan satır |
| Liste: 10.000 satır istemci modu, filtre + arama + sıralama + sayfalama | < 60 ms |
| Sheet: 10.000 satır ilk yükleme sonrası etkileşim | < 100 ms girdi gecikmesi |
| Sheet: hücre düzenleme → ekrana yansıma | < 16 ms |
| Sheet: 1.000 satır × 10 sütun yapıştırma | < 300 ms (doğrulama dahil) |
| Sheet: “Changed / Errors” filtresi geçişi | < 50 ms |

## URL senkronizasyonu

Pakette yoktur (D25). Uygulama isterse `view-change` ve `request` olaylarındaki sorguyu kendi yönlendiricisine yazar ve açılışta `views` / filtre başlangıç durumunu verir.
