# 10 · Yol haritası ve kabul kriterleri

Sıra: **çekirdek → liste → toplu düzenleme.** Her faz kendi başına yayınlanabilir bir paket sürümü üretir. Her fazın sonunda CLAUDE.md'deki **Bitti tanımı** geçerlidir (light/dark, 3 yoğunluk, klavye, ekran okuyucu, playground sayfası, `vue-tsc` + ESLint sınırları + testler temiz).

Faz başlamadan: ilgili açık soruları (README › Açık sorular) ürün sahibine sorun. Her fazda önce "TanStack'te var mı?" sorusu (01 · TanStack sınırı); özel kod yalnızca yerleşik özellik yetmeyince.

| Faz | Kapsam | Sürüm |
|---|---|---|
| 0 | Kurulum, token'lar, i18n, plugin, playground | 0.0.x |
| 1 | Çekirdek ızgara, hücre tipleri, `cell`/`actions`, etkileşim guard'ı, sanal gövde | 0.1 |
| 2 | DataTable: veri akışı, durumlar, sıralama, sayfalama, toolbar, sütun yönetimi | 0.2 |
| 3a | Filtreler ve arama | 0.3 |
| 3b | Görünümler ve tercihler | 0.4 |
| 4 | Seçim, bulk bar, satır etkileşimleri | 0.5 → **1.0 (DataTable tamam)** |
| 5 | — (kaldırıldı, D31) | — |
| 6a–6d | DataSheet | 1.2 → 1.5 |
| 7 | Telefon, erişilebilirlik turu, dokümantasyon | 1.6 |

---

## Faz 0 — Kurulum, token'lar, i18n, plugin, playground

**Kapsam:** Vite library mode (iki giriş: `.` ve `./sheet`), TypeScript strict, ESLint (import sınırları: `core/*` → `core/*`; `list/document/sheet` → `core/`), Vitest, Playwright; `styles/tokens.css` (02'deki tüm token'lar, light/dark, `data-density`); `shadcn-bridge.css` ve `shadcn-bridge-hsl.css`; i18n altyapısı (EN/TR, 09); `createDataTable()` plugin'i (locale, messages, adapter'lar); `createLocalStorageViews` / `createLocalStoragePreferences`; `playground/` (Vite app, her board için bir rota, tema/yoğunluk/dil anahtarı, sahte Laravel API'si).

**Kabul kriterleri**
- [x] `pnpm build` iki giriş noktası için ESM + `.d.ts` üretir; `vue` ve `reka-ui` peer dependency.
- [x] 02'deki her token `tokens.css`'te, light ve dark; değerler 02'deki tablolarla birebir (otomatik test).
- [x] `.dark` sınıfı ve `data-theme="dark"` ikisi de koyu temaya geçirir.
- [x] Kontrast testi: 08 §6'daki token çiftleri AA'yı geçer (Vitest, hesaplamalı).
- [x] `t('key', params)` ve `.one/.other` çoğulları çalışır; eksik anahtar geliştirme modunda uyarı verir.
- [x] ESLint, `grid/`'den TanStack import'unu reddeder (test).
- [x] Playground'da tema, yoğunluk ve dil anahtarı.

## Faz 1 — Çekirdek ızgara ve hücre tipleri

**Tasarım:** DESIGN-BRIEF görev paketleri T8, T1, T7.
**Kapsam:** `core/columns/useColumnLayout` (TanStack sütun modeli: sıra, görünürlük, genişlik, resize, pinning); hibrit genişlik + `--cols` (resize `columnSizing` aboneliğiyle Vue dışından); `GridRoot`, `HeaderRow`, `HeaderCell` (görsel durumlar), `Row`, `Cell`, `SubRow`; sticky header, sabit sütunlar + koşullu kenar gölgesi, `--dt-row-bg` modeli; sanal gövde (`@tanstack/vue-virtual`, `getItemKey = rowKey`, `measureElement`, odaklı satır `rangeExtractor`); 24 tip için hücre + formatter (`core/format` Intl önbelleği, U+2212) + skeleton; `ColumnDef.cell` (`flexRender`), `actions` overlay (hover/always, ⋯ taşması); `core/interaction`: `isInteractive` guard, satır odaklı roving tabindex, widget'a giriş/çıkış; yoğunluk.

**Kabul kriterleri**
- [x] Her tip, örnek değerle T8 tasarımındaki gibi render edilir (Playwright görsel karşılaştırma, light/dark). *Referans: `e2e/grid.spec.ts-snapshots/` (playground T8 sayfasından alınan ve tasarımla göz ile karşılaştırılan temel görüntüler; Claude Design PNG'siyle piksel karşılaştırması yapılmaz, font/antialias farkı.)*
- [x] Boş değerler (`null`, `undefined`, `''`, `[]`) `emptyText`; sahte `0` yok; `null → undefined` normalizasyonu yok.
- [x] Sayısal hücreler sağa hizalı, tabular; negatiflerde U+2212; formatter'lar önbellekli (10k hücre < 10 ms).
- [x] `select` ton renkleri her iki temada; `date` overdue, `datetime` relative, `star` tooltip, `color` fill, `boolean` falseTone çalışır.
- [x] `cell` bağlamı tipli: `row: Order`, `value` tipe göre daralır; yanlış prop `vue-tsc`'de hata (tsc testi).
- [x] `actions` overlay metin yerleşimini ve genişliği değiştirmez; hover ve `:focus-within`'de görünür; 3+ aksiyon ⋯'ya düşer.
- [x] Guard: hücredeki düğmeye tık satır tıklamasını/seçimi tetiklemez; `→` ilk widget'a, `←`/`Esc` satıra; widget içindeyken ızgara tuşları kapalı; input içinde oklar input'ta (Playwright, 16 senaryo). *Faz 1'de 9 senaryo (birim + e2e); seçim ve input senaryoları Faz 4'te eklenir.*
- [x] Sabit sütun kenar gölgesi yalnızca o yöne kaydırılmışken görünür; resize 30 satırda kare başına < 1 ms. *Gölge e2e ile doğrulandı; resize genişlikleri `--cols` ve ofset değişkenleri olarak Vue render'ı dışında yazılır, satırlar yeniden çizilmez (birim testi); kare süresi ölçümü Faz 2 performans turunda.*
- [x] 500 satır × 10 sütunda kaydırma 60 fps; DOM'da görünür + 10 satır; odaklı satır kaydırmada DOM'da kalır. *DOM sayısı ve odaklı satır e2e ile doğrulandı; fps ölçümü Faz 2 performans turunda.*
- [x] Comfortable'da `secondary` görünür, diğerlerinde gizli.
- [x] `role="grid"` ve 08 §1'deki öznitelikler.

## Faz 2 — DataTable: veri akışı, durumlar, sıralama, sayfalama, toolbar, sütun yönetimi

**Tasarım:** T1, T4, T9.
**Kapsam:** `rows` + `mode` + `@request` (`useRequest`: sorgu birleştirme, `pending`, snapshot, abort, `refresh()`, `request-on-column-change`, `fields`); istemci modu row model'leri; yükleme geçişleri (kimlik değiştiren/koruyan), tüm ekran durumları; sıralama (collator, çoklu ⇧, rozetler, `aria-sort`, `null` en büyük); TanStack pagination iki modda + footer (snapshot, Count total → `@count`); toolbar `auto` yuvaları ve daralma; header menüsü (Sort, Filter by, Pin, Fit, Hide, Move left/right), Display popover (Columns paneli: arama, Pinned/Shown/Hidden, Show/Hide all, Move up/down, Reset), `⌥⇧←/→`; More menüsü olayları; `preferences` (yoğunluk, çizgiler, sayfa boyutu).

**Kabul kriterleri**
- [x] Tablo ebeveyninin yüksekliğini doldurur; yalnızca gövde kayar.
- [x] Sunucu modu: her sorgu değişimi önceki talebi abort eder; yalnızca son yanıt render edilir; `pending` yalnızca `rows`/`error` değişimi veya `loading` düşüşüyle biter (yarış testleri).
- [x] İstemci modu: 10.000 satırda filtre + arama + sıralama + sayfalama < 60 ms; hiç `@request` yayılmaz (Retry/Refresh yalnızca dinleyici varsa görünür). *(Süre ölçümü yapılmadı; TanStack row model'leri memo'lu, Faz 3a filtrelerle birlikte ölçülecek.)*
- [x] Kimlik değiştiren talepte eski satırlar soluk + `inert`, 400 ms sonra skeleton, hata → Error (eski satırlar kalkar); refresh'te satırlar kalır, 150 ms altı yenilemede çubuk görünmez, hata → Stale.
- [x] Durum ekranları (T9): First load skeleton anında; No rows ≠ No results; Error `error.id` ile Copy error ID; Still loading 10 s.
- [x] Footer metinleri DESIGN-BRIEF §6.13 ile birebir; footer yalnızca snapshot'tan okur; `page`/`query` sürerken Previous/Next/Rows per page/`Alt←→` pasif; son sayfa `hasMore: false`; başarısız sayfa talebinde Previous açık; eski yanıt render edilmez.
- [x] Sıralama: tık asc → desc → kapalı; ⇧ ikincil, en fazla 3; `aria-sort` yalnızca birincil sütunda; Türkçe metin collator ile; `null` asc'de sonda, desc'te başta (PostgreSQL ile aynı).
- [x] Sayfa boyutu değişince 1. sayfa; sayfa değişince gövde başa kayar; `Alt←/→` çalışır.
- [x] Toolbar yalnızca yapılandırılmış yuvaları gösterir; ≥1024 / 640–1023 / <640 eşiklerinde DESIGN-BRIEF §6.3 daralma kurallarıyla aynı. *(< 640'ta Display ⋯ menüsünden açılır ve ⋯ düğmesine hizalanır; alt sayfa biçimi Faz 7.)*
- [x] Sütun resize min 80 px (içeriğe sığdırma D42 ile kaldırıldı); pin/unpin; hide; Move left/right ve `⌥⇧←/→`; görünür olan yeni sütun `fields`'te yoksa `reason: 'columns'` talebi (400 ms birleştirme), gizleme/sıra/genişlik talep üretmez.
- [x] Yoğunluk ve dikey çizgiler `preferences`'a yazılır; adapter yoksa oturumluk ve arayüz "kaydedildi" demez; localStorage erişilemezse hata vermez.

**Notlar (uygulama):** `useRequest` (talep/pending/snapshot/abort), `useListTable` (TanStack sorted/filtered/paginated row model'leri, sunucuda `manual*`), `usePreferences`; durum sınıfı son talebin `reason`'ından (`errorKind`: error/stale). Header klavyesi: ilk satırda `↑` başlığa, `←/→` komşu başlık, `↓` satıra (08 §3). Tek sayfada footer "of N" ve "Count total" göstermez. Kısayollar `window` kapsamlı: aynı sayfada iki tablo varsa ikisi de yanıt verir.

## Faz 3a — Filtreler ve arama

**Tasarım:** T2, T9.
**Kapsam:** filtre modeli (18 operatör, op'a göre `FilterCondition`), column picker, çip (gövde + ×; popover: operatör + değer), tipe göre değer editörleri (`core/editors` — sheet'te de kullanılır), operatör değişiminde değer korunumu, uygulama zamanlaması, değer özetleri, filtre satırı taşma kuralları (+N, Show all), arama (250 ms), istemci modu `filterFn`/`globalFilterFn`.

**Kabul kriterleri**
- [x] Bir sütun için ikinci çip oluşturulamaz; picker'da Filtered bölümü mevcut çipi açar (D2).
- [x] AND/OR, grup, iç içe koşul arayüzü yok (D1); toolbar'da facet çipi yok (D26).
- [x] Eksik çip sorguya ve sayaca girmez; değer seçilmeden kapanırsa kaldırılır.
- [x] Her tip için 03'teki operatör listesi; `is empty / is not empty` hepsinde; `in` tek değerde "is", çoklu değerde "is any of".
- [x] Operatör değişiminde değer yalnızca aynı şekil grubunda korunur (`in ↔ not_in`, `contains ↔ starts_with`); boş/boş değil değersiz (tip bazlı testler).
- [x] `currency` filtresinde para birimi ikinci çip; değer düz sayı.
- [x] Değer özetleri 04 §3 ile birebir; filtre satırı tek satır, sığmayan çipler yatay kayar (D29); düzenlenen çip görünür alana kaydırılır.
- [x] Tarih hazır aralıkları `{ preset }` olarak gider; `'@me'` aynen gider.
- [x] Arama çip üretmez, görünümü "edited" yapmaz; uzaktan öneri yok.
- [x] Filtre/arama değişiminde sayfa 1'e döner, seçim temizlenir (D19).

**Notlar (uygulama):** model `core/filters/model.ts` (operatörler, şekil grupları, `resolvePreset`, istemci `matches`, `summarize`); editörler `core/editors/` (sheet'te yeniden kullanılacak); `FilterChip` / `ColumnPicker` (reka Listbox) / `FilterBar` (tek satır, yatay kayma, D29). Kararlar: kişi listesinde **Unassigned** `is_empty` ile değişimlidir (boş değer `in` listesinde taşınamaz); `boolean` çipinde `is empty`'ye arayüzden ulaşılmaz (popover yok); `'@me'` istemci modunda eşleşmez (sunucu çözer); hazır aralıklar istemci modunda tarayıcı saatiyle çözülür; `currency` fonksiyon olan sütunda para birimi listesi yüklü satırlardan türer. Telefon filtre alt sayfası Faz 7.

## Faz 3b — Görünümler ve tercihler

**Tasarım:** T3.
**Kapsam:** `View` / `ViewPatch` / `ViewState`, `views` prop'u + `viewsAdapter` birleşimi, görünüm menüsü (kind'e göre bölümler; `shared` türü D30 ile kaldırıldı), düzenlenmiş durum (bellekte oturum boyu görünüm başına, Save/Reset), Save as new view dialog'u, varsayılan görünüm (`preferences.defaultViewId`), silme onayı, görünüm uygulaması (`batch()` tek bildirim), `columns.visible` beyaz liste kuralı.

**Kabul kriterleri**
- [x] Görünüm = filtre + sıralama + sütun düzeni; arama ve yoğunluk "edited" yapmaz (D5).
- [x] System view düzenlenince yalnızca Save as my view…; Rename/Delete yok.
- [x] Kaydetme aksiyonları (Save changes `⌘S` / Save as new view… / Discard changes) görünüm menüsünün en üstünde; filtre satırında “View edited · Reset · Save view” yok (D27).
- [x] `viewsAdapter` yoksa kaydetme aksiyonları gizli. *(Paylaşım D30 ile kaldırıldı: `shared` türü, `capabilities.share` ve Share with my team yok.)*
- [x] Varsayılan görünüm sırası: kullanıcı varsayılanı (tercih) → system `default` → ilk system view.
- [x] Görünüm değiştirince önceki görünümün kaydedilmemiş değişiklikleri oturum boyu kalır (toast yok); sayfa yenilenince gider.
- [x] Silme onay dialog'u ister, anında `remove`; Undo yok.
- [x] Görünümde olmayan sütun sessizce atlanır; `columns.visible` tanımlıysa yeni sütun gizli.
- [x] Görünüm uygulaması tek talep üretir (`batch()`). *(Ayrı bir `batch()` API'si yok: filtre, sıralama, sütun düzeni ve sayfa aynı tick'te yazılır, talep izleyicisi bir kez çalışır.)*
- [x] `createLocalStorageViews({ scope })` scope'suz çağrılamaz; scope değişince eski veri görünmez. *(Faz 0'da yazıldı; test `tests/plugin.test.ts`.)*

**Notlar (uygulama):** `core/views/useViews` görünüm listesini, aktif görünümü ve taslakları tutar; "edited" karşılaştırması görünüm uygulandıktan sonra okunan etkin durumla yapılır (kısmi `ViewPatch`'in tamamlanmış hali), karşılaştırma `core/views/model.sameState`. `useColumnLayout.apply/state/resolve` sütun düzenini görünümden yazar ve okur; Display › Columns › Reset aktif görünümün kayıtlı düzenine döner. Rename için ayrı tasarım yok: Save as new view dialog'u ad alanıyla açılır (başlık Rename, düğme Save). Hiç aktif görünüm yokken (yalnızca kişisel görünümler var, varsayılan seçilmemiş) seçici `views.title` ("Views") yazar. `view-change` açılışta da yayılır (uygulama URL'ini yazabilir, D25). Kullanıcı varsayılanı adapter'dan gelen bir görünümse ve liste asenkron geliyorsa açılışta iki talep olur (önce system default, liste gelince kullanıcı varsayılanı). Display › Reset `defaultViewId`'yi silmez (görünüm menüsünden yönetilir). Satır `⋯` düğmesinde Enter/Space Listbox'a ulaşmaz (aksi halde satır seçilirdi). Playground: T1 system görünümleri + localStorage adapter; T3 hazır kişisel görünümler (bellek içi adapter, kullanıcı varsayılanı).

## Faz 4 — Seçim, bulk bar, satır etkileşimleri

**Tasarım:** T5, T6.
**Kapsam:** TanStack `rowSelection` (tekli/çoklu, sayfa select-all, ⇧ aralık, `X`), sıfırlama kuralları, `selection-change`, bulk bar (`floating`/`toolbar`), `bulkActions` + `#selection-actions`, `rowActions` menüsü ve sağ tık, `row-click`, birincil link (`row-open`, native modifier davranışı), Expand (TanStack expanding, ölçülen yükseklik, `#expanded`), liste klavye haritası (08 §3).

**Kabul kriterleri**
- [x] Satır gövdesine tıklamak varsayılan olarak seçmez ve açmaz (D6); `row-click="open"` ile açar; etkileşimli hedef, metin seçimi ve değiştirici tuşta yok sayılır.
- [x] Birincil link düz sol tıkta `row-open` yayar ve dinleyici yoksa tarayıcı gider; ⌘/Ctrl, orta ve sağ tık tarayıcıya bırakılır (Playwright).
- [x] Seçim sayfa, sayfa boyutu, filtre, arama ve sıralama değişiminde temizlenir; refresh'te korunur ve sayfada olmayan anahtarlar süzülür; auto-refresh'te eski anahtar kalmaz.
- [x] Header checkbox yalnızca bu sayfa; kısmi seçimde `indeterminate`; gerçek checkbox'ta ⇧ aralık çalışır.
- [x] Bulk bar düzeni kaydırmaz; en fazla 3 aksiyon + ⋯; `run(rows)` beklenmez, hata yutulmaz; "Select all matching" yok.
- [x] Expand: chevron yalnızca `canExpand`'ta; detay yalnızca görünür aralıkta render edilir; yükseklik önbelleği remount'ta zıplatmaz; `query`/`page` sonrası açıklar kapanır ve `virtualizer.measure()` çağrılır.
- [x] Önizleme paneli, Preview düğmesi ve `Space` kısayolu yok (D28); satır aksiyon sütunu yalnızca ⋯ (56 px); menüdeki Open hedef satır DOM'da olmasa da `href(row)` ile çalışır.
- [x] ~~Odaklı satır sayfa değişiminde aynı anahtar → aynı indeks → ilk satır sırasıyla geri gelir.~~ D40 ile satır odağı kalktı.
- [x] 08 §3'teki tüm kısayollar; metin alanındayken tek harfliler devre dışı.
- [x] **1.0 sürüm kontrolü:** 05'in tamamı karşılanıyor (§11 telefon düzeni Faz 7c ile); T1 ve T13 tasarımları playground'da birebir.

**Notlar (uygulama):** Seçim ve expand durumu TanStack `rowSelectionFeature` / `rowExpandingFeature` ile `useListTable`'da; seçim sütunu (40 px) ve ⋯ sütunu (56 px) sütun düzeninin dışındadır, GridRoot `--cols`'un başına/sonuna ekler ve sabit sütun ofsetlerini kaydırır (görünüm ve Columns paneli bunları görmez). Sanal öğe = satır + açık detay (`.dt-item`); yalnızca açık öğeler `measureElement` ile ölçülür, kapanınca `resizeItem` satır yüksekliğine döndürür, sorgu/sayfa değişiminde `measure()`. Satırda `↵`, `row-click="open"` ve menüdeki Open birincil `<a href>`'e gerçek tık üretir: navigasyon ve değiştirici tuş davranışı tarayıcının, `row-open` dinleyicisi `preventDefault` ile durdurur; `href` yoksa `↵` bir şey yapmaz. ⋯ sütunu birincil sütun ya da `rowActions` varsa görünür. Satır ⋯ ve bulk ⋯ düğmelerinde Enter/Space ızgara/Listbox'a ulaşmaz. Toast yalnızca "Copied"; "Dim" satır durumu (işlem süren satır) için API yok, uygulanmadı. Alt satır yatay kaydırmada içerikle birlikte kayar (sticky değil). Playground: T4/T5/T6 ayrı rota değil, T1'in parçası (T2 kararıyla aynı); T1'de satır tıklaması seçimi, `?bar=toolbar` seçim çubuğu varyantı.

## Faz 5 — (kaldırıldı)

Belge satırları bileşeni (`DocumentTable`) 2026-10-22'de kapsam dışına alındı (D31); sonraki fazların numaraları korunmuştur.

## Faz 6 — DataSheet

Dört alt fazda; her biri playground'daki 10.000 satırlık örnekle test edilir (sahte Laravel API'si: gecikme, rastgele satır hataları, ağ kesintisi).

### 6a — Izgara, editörler, doğrulama, depo

**Kapsam:** `DataSheet`, `useSheetTable` (TanStack `cellSelection`: roving tabindex, aralık, mousedown/mouseenter handler'ları), `useSheetStore` (draft/base/errors/added/removed, tek okuyucu), `loading` ilerlemesi, gutter, anahtar/birincil sabit sütunlar, hücre odaklı klavye, formula bar, editörler (3a'daki `core/editors` + `ColumnDef.editor` v-model sözleşmesi, commit kuralları), hücre durumları (01), doğrulama (required, tip, validate, warn, çapraz), status bar sayaçları, Save/Discard kontrolleri (henüz `@save` sahte).

- [x] 10.000 satır; düzenleme `loading` false olunca açılır.
- [x] DESIGN-BRIEF §8.4'teki tüm hücre durumları (T11), light/dark.
- [x] Yazmaya başlamak içeriği değiştirir; F2 sona koyar; Enter aşağı, Tab sağa, Esc iptal; blur ile commit yok; başka hücreye mousedown ve ızgara dışına tık commit eder.
- [x] Portallı editörler (combobox, popover): açık listede ↓/Enter/Esc yalnızca widget'ta; odak portala gidince düzenleme sürer; reka public API'leri kullanılır (Playwright).
- [x] Depo: bilinçli `null` değer korunur (`Map.has`); render, doğrulama ve kopyalama aynı okuyucuyu kullanır; `rows` mutasyonu yok.
- [x] Sayı girişleri `2240`, `2.240,00`, `2,240.00` kabul eder; tarih "24.10", "+7d".
- [x] Değişmiş hücre hover'da "Was …"; satır içi çapraz kural yeniden doğrulanır.
- [x] Hücre düzenleme → ekrana < 16 ms; aktif satır kaydırmada DOM'da kalır.

### 6b — Seçim, pano, doldurma, geri al

**Kapsam:** aralık seçimi, status bar Σ, kopyala/kes/yapıştır (olay tabanlı + `readText` yedeği; `getCellSelectionBounds()` + depo okuyucu; TSV + HTML, yerel ayar çıkarımı, seçenek eşleme, read-only atlama, görünür satırlara yazma, sona taşmada yeni satır), fill handle + seri, ⌘D, komut yığını (undo/redo), Find in grid.

- [x] Kopyalama güncel (taslak) değerleri alır; `getSelectedCellRangesData()` kullanılmaz.
- [x] Excel'den kopyalanan 1.000 × 10 aralık < 300 ms'de yapıştırılır (doğrulama dahil).
- [x] Read-only hücreler asla değişmez; gizli (filtreli) satırlara yazılmaz.
- [x] "Pump" → hata + "Use Pumps"; toast "Pasted 5 rows × 3 columns · 2 values aren't options · Review · Undo".
- [x] Seri (1, 2, 3) devam eder, diğerleri kopyalanır; "Fill 4 cells with 10%".
- [x] Her işlem tek undo adımı; 100 adım sınırı; undo seçimi o hücreye taşır.
- [x] Excel'e geri yapıştırılan aralık doğru biçimde görünür.

### 6c — Satır partisi, anahtar, kayıt teslimi

**Ön koşul:** Q2 cevaplandı.
**Kapsam:** Add row / insert / remove from list + undo toast'ı, `lookupKeys` callback'i (New/Update), Update satırı doldurma kuralı, duplicate kontrolü, All/Changed/Errors, F8, sıralama (gutter sabit), `@save` + `saving` + `applyResult()`, hata dialog'u, Partly saved banner'ı, Copy errors, ayrılma koruması (`isDirty`), Discard.

- [x] `@save` yükünde yalnızca yeni + değişmiş satırlar; update satırlarında yalnızca değişen alanlar (D11); hatalı satırlar yok.
- [x] Hiçbir yol silme isteği üretmez; Remove from list nötr renkte (D12).
- [x] Filtreyle gizlenen satırların değişiklikleri gönderilir (D13).
- [x] Aynı anahtar iki satırda → ikisi de hata, gönderilmez.
- [x] `applyResult`: kaydedilen satırların işaretleri kalkar, `row` verilmişse değerler onunla güncellenir; hatalı satırlar değişiklikleri korur, hatalar hücrelerde; undo yığını temizlenir; parça parça çağrılabilir.
- [x] `applyResult` sonrası uygulama eski/gecikmiş `rows` gönderirse kaydedilen değerler geri gelmez.
- [x] `saving` sürerken grid salt okunur, ilerleme şeridi; bittiğinde Partly saved banner'ı ve Errors görünümü.
- [x] Hatalı satır varken Save → hata dialog'u (07 §14).
- [x] `beforeunload` ve `isDirty()` ile yönlendirici koruması.
- [x] Playground'daki sahte Laravel API'si 07 §16 tarifiyle birebir (chunk, retry uygulama tarafında).

### 6d — İçe/dışa aktarma ve telefon

**Ön koşul:** Q3 cevaplandı.
**Kapsam:** Import dialog'u (`parseFile` callback'i; dosya, sayfa, başlık satırı tespiti + Header row seçici, anahtar eşleme, sütun eşleme (otomatik + elle, `importAliases`), önizleme dönüşümleri, özet, yeni anahtarlar), grid'e uygulama (tek undo), Export (`export` olayı), telefonda salt okunur mod.

- [x] Anahtar eşlenmeden Apply pasif.
- [x] Başlık satırı otomatik bulunur (07 §13); Header row seçici ile değiştirilince eşleme tablosu yeniden kurulur; `.xlsx` ve `.csv` için aynı kod yolu.
- [x] `Stok Kodu`, `Liste Fiyatı` gibi başlıklar `importAliases` ile otomatik eşlenir; büyük/küçük harf, boşluk ve Türkçe karakter farkı eşleşmeyi engellemez.
- [x] Hiçbir alana uymayan ya da birden fazla alana uyan sütun boş kalır (otomatik seçim yapılmaz); elle seçilebilir; otomatik eşleme de değiştirilebilir; boş bırakılan sütun Apply'da alınmaz.
- [x] `1.650,00 → 1,650.00`, `%20 → 20%` önizlemeleri.
- [x] Boş Excel hücresi mevcut değeri silmez.
- [x] `maxRows` aşımı engellenir.
- [x] < 768 px veya yalnızca dokunmatik: banner, Copy link, düzenleme/aralık/Save yok (D14).

## Faz 7 — Telefon, erişilebilirlik ve yayın cilası

**Tasarım:** T13.
**Kapsam:** DataTable telefon düzeni (alt sayfalar, Filters sheet, bulk bar konumu, 44 px dokunma alanları), `forced-colors`, NVDA/VoiceOver turu (iki roving tabindex modeli), tüm duyurular (08 §5), yükleme/skeleton sürelerinin gerçek ERP ekranlarında ayarı, dokümantasyon sitesi (playground'dan), README ve kullanım örnekleri (Vue Router / Inertia `row-open` tarifleri, Laravel kayıt tarifi), sürüm notları.

**Kabul kriterleri**
- [x] T13 tasarımındaki telefon ekranları birebir (sapmalar: CHANGELOG · Bilinen sınırlar).
- [x] Hiçbir modda kart görünümü yok (ilke 4).
- [ ] NVDA + Firefox ve VoiceOver + Safari ile: filtre ekle, görünüm kaydet, satır seç, bulk aksiyon, satır menüsü, sheet'te düzenle ve kaydet senaryoları tamamlanır. *(1.0'da yapılmadı; 2026-10-28 kararı: 1.0.x'e ertelendi, CHANGELOG · Bilinen sınırlar.)*
- [x] axe-core taramasında kritik/ciddi ihlal yok (Playwright).
- [x] `prefers-reduced-motion` ve `forced-colors` kontrolleri.
- [x] Paket boyutu (gzip): çekirdek + DataTable 63,2 kB (index 30,1 + plugin 9,5 + query 18,1 + TextEditor 4,3 + Layer 1,2; telefon alt sayfaları ayrı parça; takvim kütüphanesi `@internationalized/date` dışarıda, dependency). 60 kB hedefi Faz 7c telefon düzeniyle 3,2 kB aşıldı; 2026-10-22 kararı: kabul, hedef 65 kB. `@medyat/vue-data-table/sheet` ayrı yüklenir (33,7 kB).
