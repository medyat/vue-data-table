# 10 · Yol haritası ve kabul kriterleri

Sıra: **çekirdek → liste → belge satırları → toplu düzenleme.** Her faz kendi başına yayınlanabilir bir paket sürümü üretir. Her fazın sonunda CLAUDE.md'deki **Bitti tanımı** geçerlidir (light/dark, 3 yoğunluk, klavye, ekran okuyucu, playground sayfası, `vue-tsc` + ESLint sınırları + testler temiz).

Faz başlamadan: ilgili açık soruları (README › Açık sorular) ürün sahibine sorun. Her fazda önce "TanStack'te var mı?" sorusu (01 · TanStack sınırı); özel kod yalnızca yerleşik özellik yetmeyince.

| Faz | Kapsam | Sürüm |
|---|---|---|
| 0 | Kurulum, token'lar, i18n, plugin, playground | 0.0.x |
| 1 | Çekirdek ızgara, hücre tipleri, `cell`/`actions`, etkileşim guard'ı, sanal gövde | 0.1 |
| 2 | DataTable: veri akışı, durumlar, sıralama, sayfalama, toolbar, sütun yönetimi | 0.2 |
| 3a | Filtreler ve arama | 0.3 |
| 3b | Görünümler ve tercihler | 0.4 |
| 4 | Seçim, bulk bar, satır etkileşimleri | 0.5 → **1.0 (DataTable tamam)** |
| 5 | DocumentTable | 1.1 |
| 6a–6d | DataSheet | 1.2 → 1.5 |
| 7 | Telefon, erişilebilirlik turu, dokümantasyon | 1.6 |

---

## Faz 0 — Kurulum, token'lar, i18n, plugin, playground

**Kapsam:** Vite library mode (iki giriş: `.` ve `./sheet`), TypeScript strict, ESLint (import sınırları: `core/*` → `core/*`; `list/document/sheet` → `core/`), Vitest, Playwright; `styles/tokens.css` (02'deki tüm token'lar, light/dark, `data-density`); `shadcn-bridge.css` ve `shadcn-bridge-hsl.css`; i18n altyapısı (EN/TR, 09); `createDataTable()` plugin'i (locale, messages, adapter'lar); `createLocalStorageViews` / `createLocalStoragePreferences`; `playground/` (Vite app, her board için bir rota, tema/yoğunluk/dil anahtarı, sahte Laravel API'si).

**Kabul kriterleri**
- [ ] `pnpm build` iki giriş noktası için ESM + `.d.ts` üretir; `vue` ve `reka-ui` peer dependency.
- [ ] 02'deki her token `tokens.css`'te, light ve dark; değerler 02'deki tablolarla birebir (otomatik test).
- [ ] `.dark` sınıfı ve `data-theme="dark"` ikisi de koyu temaya geçirir.
- [ ] Kontrast testi: 08 §6'daki token çiftleri AA'yı geçer (Vitest, hesaplamalı).
- [ ] `t('key', params)` ve `.one/.other` çoğulları çalışır; eksik anahtar geliştirme modunda uyarı verir.
- [ ] ESLint, `grid/`'den TanStack import'unu reddeder (test).
- [ ] Playground'da tema, yoğunluk ve dil anahtarı.

## Faz 1 — Çekirdek ızgara ve hücre tipleri

**Tasarım:** DESIGN-BRIEF görev paketleri T8, T1, T7.
**Kapsam:** `core/columns/useColumnLayout` (TanStack sütun modeli: sıra, görünürlük, genişlik, resize, pinning); hibrit genişlik + `--cols` (resize `columnSizing` aboneliğiyle Vue dışından); `GridRoot`, `HeaderRow`, `HeaderCell` (görsel durumlar), `Row`, `Cell`, `SubRow`; sticky header, sabit sütunlar + koşullu kenar gölgesi, `--dt-row-bg` modeli; sanal gövde (`@tanstack/vue-virtual`, `getItemKey = rowKey`, `measureElement`, odaklı satır `rangeExtractor`); 24 tip için hücre + formatter (`core/format` Intl önbelleği, U+2212) + skeleton; `ColumnDef.cell` (`flexRender`), `actions` overlay (hover/always, ⋯ taşması); `core/interaction`: `isInteractive` guard, satır odaklı roving tabindex, widget'a giriş/çıkış; yoğunluk.

**Kabul kriterleri**
- [ ] Her tip, örnek değerle T8 tasarımındaki gibi render edilir (Playwright görsel karşılaştırma, light/dark).
- [ ] Boş değerler (`null`, `undefined`, `''`, `[]`) `emptyText`; sahte `0` yok; `null → undefined` normalizasyonu yok.
- [ ] Sayısal hücreler sağa hizalı, tabular; negatiflerde U+2212; formatter'lar önbellekli (10k hücre < 10 ms).
- [ ] `select` ton renkleri her iki temada; `date` overdue, `datetime` relative, `star` tooltip, `color` fill, `boolean` falseTone çalışır.
- [ ] `cell` bağlamı tipli: `row: Order`, `value` tipe göre daralır; yanlış prop `vue-tsc`'de hata (tsc testi).
- [ ] `actions` overlay metin yerleşimini ve genişliği değiştirmez; hover ve `:focus-within`'de görünür; 3+ aksiyon ⋯'ya düşer.
- [ ] Guard: hücredeki düğmeye tık satır tıklamasını/seçimi tetiklemez; `→` ilk widget'a, `←`/`Esc` satıra; widget içindeyken ızgara tuşları kapalı; input içinde oklar input'ta (Playwright, 16 senaryo).
- [ ] Sabit sütun kenar gölgesi yalnızca o yöne kaydırılmışken görünür; resize 30 satırda kare başına < 1 ms.
- [ ] 500 satır × 10 sütunda kaydırma 60 fps; DOM'da görünür + 10 satır; odaklı satır kaydırmada DOM'da kalır.
- [ ] Comfortable'da `secondary` görünür, diğerlerinde gizli.
- [ ] `role="grid"` ve 08 §1'deki öznitelikler.

## Faz 2 — DataTable: veri akışı, durumlar, sıralama, sayfalama, toolbar, sütun yönetimi

**Tasarım:** T1, T4, T9.
**Kapsam:** `rows` + `mode` + `@request` (`useRequest`: sorgu birleştirme, `pending`, snapshot, abort, `refresh()`, `request-on-column-change`, `fields`); istemci modu row model'leri; yükleme geçişleri (kimlik değiştiren/koruyan), tüm ekran durumları; sıralama (collator, çoklu ⇧, rozetler, `aria-sort`, `null` en büyük); TanStack pagination iki modda + footer (snapshot, Count total → `@count`); toolbar `auto` yuvaları ve daralma; header menüsü (Sort, Filter by, Pin, Fit, Hide, Move left/right), Display popover (Columns paneli: arama, Pinned/Shown/Hidden, Show/Hide all, Move up/down, Reset), `⌥⇧←/→`; More menüsü olayları; `preferences` (yoğunluk, çizgiler, sayfa boyutu).

**Kabul kriterleri**
- [ ] Tablo ebeveyninin yüksekliğini doldurur; yalnızca gövde kayar.
- [ ] Sunucu modu: her sorgu değişimi önceki talebi abort eder; yalnızca son yanıt render edilir; `pending` yalnızca `rows`/`error` değişimi veya `loading` düşüşüyle biter (yarış testleri).
- [ ] İstemci modu: 10.000 satırda filtre + arama + sıralama + sayfalama < 60 ms; hiç `@request` yayılmaz (Retry/Refresh yalnızca dinleyici varsa görünür).
- [ ] Kimlik değiştiren talepte eski satırlar soluk + `inert`, 400 ms sonra skeleton, hata → Error (eski satırlar kalkar); refresh'te satırlar kalır, 150 ms altı yenilemede çubuk görünmez, hata → Stale.
- [ ] Durum ekranları (T9): First load skeleton anında; No rows ≠ No results; Error `error.id` ile Copy error ID; Still loading 10 s.
- [ ] Footer metinleri DESIGN-BRIEF §6.13 ile birebir; footer yalnızca snapshot'tan okur; `page`/`query` sürerken Previous/Next/Rows per page/`Alt←→` pasif; son sayfa `hasMore: false`; başarısız sayfa talebinde Previous açık; eski yanıt render edilmez.
- [ ] Sıralama: tık asc → desc → kapalı; ⇧ ikincil, en fazla 3; `aria-sort` yalnızca birincil sütunda; Türkçe metin collator ile; `null` asc'de sonda, desc'te başta (PostgreSQL ile aynı).
- [ ] Sayfa boyutu değişince 1. sayfa; sayfa değişince gövde başa kayar; `Alt←/→` çalışır.
- [ ] Toolbar yalnızca yapılandırılmış yuvaları gösterir; ≥1024 / 640–1023 / <640 eşiklerinde DESIGN-BRIEF §6.3 daralma kurallarıyla aynı.
- [ ] Sütun resize min 80 px, çift tık sığdırır; pin/unpin; hide; Move left/right ve `⌥⇧←/→`; görünür olan yeni sütun `fields`'te yoksa `reason: 'columns'` talebi (400 ms birleştirme), gizleme/sıra/genişlik talep üretmez.
- [ ] Yoğunluk ve dikey çizgiler `preferences`'a yazılır; adapter yoksa oturumluk ve arayüz "kaydedildi" demez; localStorage erişilemezse hata vermez.

## Faz 3a — Filtreler ve arama

**Tasarım:** T2, T9.
**Kapsam:** filtre modeli (18 operatör, op'a göre `FilterCondition`), column picker, çip (gövde + ×; popover: operatör + değer), tipe göre değer editörleri (`core/editors` — sheet'te de kullanılır), operatör değişiminde değer korunumu, uygulama zamanlaması, değer özetleri, filtre satırı taşma kuralları (+N, Show all), arama (250 ms), istemci modu `filterFn`/`globalFilterFn`.

**Kabul kriterleri**
- [ ] Bir sütun için ikinci çip oluşturulamaz; picker'da Filtered bölümü mevcut çipi açar (D2).
- [ ] AND/OR, grup, iç içe koşul arayüzü yok (D1); toolbar'da facet çipi yok (D26).
- [ ] Eksik çip sorguya ve sayaca girmez; değer seçilmeden kapanırsa kaldırılır.
- [ ] Her tip için 03'teki operatör listesi; `is empty / is not empty` hepsinde; `in` tek değerde "is", çoklu değerde "is any of".
- [ ] Operatör değişiminde değer yalnızca aynı şekil grubunda korunur (`in ↔ not_in`, `contains ↔ starts_with`); boş/boş değil değersiz (tip bazlı testler).
- [ ] `currency` filtresinde para birimi ikinci çip; değer düz sayı.
- [ ] Değer özetleri 04 §3 ile birebir; 2 satırı aşan çipler +N'e taşınır; düzenlenen çip her zaman görünür.
- [ ] Tarih hazır aralıkları `{ preset }` olarak gider; `'@me'` aynen gider.
- [ ] Arama çip üretmez, görünümü "edited" yapmaz; uzaktan öneri yok.
- [ ] Filtre/arama değişiminde sayfa 1'e döner, seçim temizlenir (D19).

## Faz 3b — Görünümler ve tercihler

**Tasarım:** T3.
**Kapsam:** `View` / `ViewPatch` / `ViewState`, `views` prop'u + `viewsAdapter` birleşimi, görünüm menüsü (kind'e göre bölümler, `shared` yalnızca `capabilities.share`), düzenlenmiş durum (bellekte oturum boyu görünüm başına, Save/Reset), Save as new view dialog'u, varsayılan görünüm (`preferences.defaultViewId`), silme onayı, görünüm uygulaması (`batch()` tek bildirim), `columns.visible` beyaz liste kuralı.

**Kabul kriterleri**
- [ ] Görünüm = filtre + sıralama + sütun düzeni; arama ve yoğunluk "edited" yapmaz (D5).
- [ ] System view düzenlenince yalnızca Save as my view…; Rename/Delete yok.
- [ ] Kaydetme aksiyonları (Save changes `⌘S` / Save as new view… / Discard changes) görünüm menüsünün en üstünde; filtre satırında “View edited · Reset · Save view” yok (D27).
- [ ] `viewsAdapter` yoksa kaydetme aksiyonları gizli; adapter `share` desteklemiyorsa "shared" seçeneği yok.
- [ ] Varsayılan görünüm sırası: kullanıcı varsayılanı (tercih) → system `default` → ilk system view.
- [ ] Görünüm değiştirince önceki görünümün kaydedilmemiş değişiklikleri oturum boyu kalır (toast yok); sayfa yenilenince gider.
- [ ] Silme onay dialog'u ister, anında `remove`; Undo yok.
- [ ] Görünümde olmayan sütun sessizce atlanır; `columns.visible` tanımlıysa yeni sütun gizli.
- [ ] Görünüm uygulaması tek talep üretir (`batch()`).
- [ ] `createLocalStorageViews({ scope })` scope'suz çağrılamaz; scope değişince eski veri görünmez.

## Faz 4 — Seçim, bulk bar, satır etkileşimleri

**Tasarım:** T5, T6.
**Kapsam:** TanStack `rowSelection` (tekli/çoklu, sayfa select-all, ⇧ aralık, `X`), sıfırlama kuralları, `selection-change`, bulk bar (`floating`/`toolbar`), `bulkActions` + `#selection-actions`, `rowActions` menüsü ve sağ tık, `row-click`, birincil link (`row-open`, native modifier davranışı), Expand (TanStack expanding, ölçülen yükseklik, `#expanded`), liste klavye haritası (08 §3).

**Kabul kriterleri**
- [ ] Satır gövdesine tıklamak varsayılan olarak seçmez ve açmaz (D6); `row-click="open"` ile açar; etkileşimli hedef, metin seçimi ve değiştirici tuşta yok sayılır.
- [ ] Birincil link düz sol tıkta `row-open` yayar ve dinleyici yoksa tarayıcı gider; ⌘/Ctrl, orta ve sağ tık tarayıcıya bırakılır (Playwright).
- [ ] Seçim sayfa, sayfa boyutu, filtre, arama ve sıralama değişiminde temizlenir; refresh'te korunur ve sayfada olmayan anahtarlar süzülür; auto-refresh'te eski anahtar kalmaz.
- [ ] Header checkbox yalnızca bu sayfa; kısmi seçimde `indeterminate`; gerçek checkbox'ta ⇧ aralık çalışır.
- [ ] Bulk bar düzeni kaydırmaz; en fazla 3 aksiyon + ⋯; `run(rows)` beklenmez, hata yutulmaz; "Select all matching" yok.
- [ ] Expand: chevron yalnızca `canExpand`'ta; detay yalnızca görünür aralıkta render edilir; yükseklik önbelleği remount'ta zıplatmaz; `query`/`page` sonrası açıklar kapanır ve `virtualizer.measure()` çağrılır.
- [ ] Önizleme paneli, Preview düğmesi ve `Space` kısayolu yok (D28); satır aksiyon sütunu yalnızca ⋯ (56 px); menüdeki Open hedef satır DOM'da olmasa da `href(row)` ile çalışır.
- [ ] Odaklı satır sayfa değişiminde aynı anahtar → aynı indeks → ilk satır sırasıyla geri gelir.
- [ ] 08 §3'teki tüm kısayollar; metin alanındayken tek harfliler devre dışı.
- [ ] **1.0 sürüm kontrolü:** 05'in tamamı (§11 telefon düzeni hariç — Faz 7) karşılanıyor; T1 tasarımı playground'da birebir.

## Faz 5 — DocumentTable

**Tasarım:** T10.
**Kapsam:** `DocumentTable`, sanal olmayan gövde, 2 satır sarma, bölüm başlığı + Expand all, alt satır düzeni, `DocumentTotals`, hücrede birim (`unit` fonksiyonu), satır araması (`lineSearch`), boş durum, telefon öncelik düzeni ve toplam listesi.

**Kabul kriterleri**
- [ ] Yükseklik içeriğe göre; sayfa kayar; header sticky değil.
- [ ] Sıralama, seçim, toolbar, filtre, sayfalama yok (D15).
- [ ] Toplamlar `alignTo` sütununa hizalı; para kodu yalnızca genel toplamda; negatif U+2212.
- [ ] `lineSearch` açıkken arama kutusu; eşleşme vurgusu; "3 of 84 lines"; toplamlar değişmez.
- [ ] < 768 px: Product sabit, Line total yanında, kalanlar kayar; toplamlar özet liste.
- [ ] T10 tasarımı görsel olarak birebir.

## Faz 6 — DataSheet

Dört alt fazda; her biri playground'daki 10.000 satırlık örnekle test edilir (sahte Laravel API'si: gecikme, rastgele satır hataları, ağ kesintisi).

### 6a — Izgara, editörler, doğrulama, depo

**Kapsam:** `DataSheet`, `useSheetTable` (TanStack `cellSelection`: roving tabindex, aralık, mousedown/mouseenter handler'ları), `useSheetStore` (draft/base/errors/added/removed, tek okuyucu), `loading` ilerlemesi, gutter, anahtar/birincil sabit sütunlar, hücre odaklı klavye, formula bar, editörler (3a'daki `core/editors` + `ColumnDef.editor` v-model sözleşmesi, commit kuralları), hücre durumları (01), doğrulama (required, tip, validate, warn, çapraz), status bar sayaçları, Save/Discard kontrolleri (henüz `@save` sahte).

- [ ] 10.000 satır; düzenleme `loading` false olunca açılır.
- [ ] DESIGN-BRIEF §8.4'teki tüm hücre durumları (T11), light/dark.
- [ ] Yazmaya başlamak içeriği değiştirir; F2 sona koyar; Enter aşağı, Tab sağa, Esc iptal; blur ile commit yok; başka hücreye mousedown ve ızgara dışına tık commit eder.
- [ ] Portallı editörler (combobox, popover): açık listede ↓/Enter/Esc yalnızca widget'ta; odak portala gidince düzenleme sürer; reka public API'leri kullanılır (Playwright).
- [ ] Depo: bilinçli `null` değer korunur (`Map.has`); render, doğrulama ve kopyalama aynı okuyucuyu kullanır; `rows` mutasyonu yok.
- [ ] Sayı girişleri `2240`, `2.240,00`, `2,240.00` kabul eder; tarih "24.10", "+7d".
- [ ] Değişmiş hücre hover'da "Was …"; satır içi çapraz kural yeniden doğrulanır.
- [ ] Hücre düzenleme → ekrana < 16 ms; aktif satır kaydırmada DOM'da kalır.

### 6b — Seçim, pano, doldurma, geri al

**Kapsam:** aralık seçimi, status bar Σ, kopyala/kes/yapıştır (olay tabanlı + `readText` yedeği; `getCellSelectionBounds()` + depo okuyucu; TSV + HTML, yerel ayar çıkarımı, seçenek eşleme, read-only atlama, görünür satırlara yazma, sona taşmada yeni satır), fill handle + seri, ⌘D, komut yığını (undo/redo), Find in grid.

- [ ] Kopyalama güncel (taslak) değerleri alır; `getSelectedCellRangesData()` kullanılmaz.
- [ ] Excel'den kopyalanan 1.000 × 10 aralık < 300 ms'de yapıştırılır (doğrulama dahil).
- [ ] Read-only hücreler asla değişmez; gizli (filtreli) satırlara yazılmaz.
- [ ] "Pump" → hata + "Use Pumps"; toast "Pasted 5 rows × 3 columns · 2 values aren't options · Review · Undo".
- [ ] Seri (1, 2, 3) devam eder, diğerleri kopyalanır; "Fill 4 cells with 10%".
- [ ] Her işlem tek undo adımı; 100 adım sınırı; undo seçimi o hücreye taşır.
- [ ] Excel'e geri yapıştırılan aralık doğru biçimde görünür.

### 6c — Satır partisi, anahtar, kayıt teslimi

**Ön koşul:** Q2 cevaplandı.
**Kapsam:** Add row / insert / remove from list + undo toast'ı, `lookupKeys` callback'i (New/Update), Update satırı doldurma kuralı, duplicate kontrolü, All/Changed/Errors, F8, sıralama (gutter sabit), `@save` + `saving` + `applyResult()`, hata dialog'u, Partly saved banner'ı, Copy errors, ayrılma koruması (`isDirty`), Discard.

- [ ] `@save` yükünde yalnızca yeni + değişmiş satırlar; update satırlarında yalnızca değişen alanlar (D11); hatalı satırlar yok.
- [ ] Hiçbir yol silme isteği üretmez; Remove from list nötr renkte (D12).
- [ ] Filtreyle gizlenen satırların değişiklikleri gönderilir (D13).
- [ ] Aynı anahtar iki satırda → ikisi de hata, gönderilmez.
- [ ] `applyResult`: kaydedilen satırların işaretleri kalkar, `row` verilmişse değerler onunla güncellenir; hatalı satırlar değişiklikleri korur, hatalar hücrelerde; undo yığını temizlenir; parça parça çağrılabilir.
- [ ] `applyResult` sonrası uygulama eski/gecikmiş `rows` gönderirse kaydedilen değerler geri gelmez.
- [ ] `saving` sürerken grid salt okunur, ilerleme şeridi; bittiğinde Partly saved banner'ı ve Errors görünümü.
- [ ] Hatalı satır varken Save → hata dialog'u (07 §14).
- [ ] `beforeunload` ve `isDirty()` ile yönlendirici koruması.
- [ ] Playground'daki sahte Laravel API'si 07 §16 tarifiyle birebir (chunk, retry uygulama tarafında).

### 6d — İçe/dışa aktarma ve telefon

**Ön koşul:** Q3 cevaplandı.
**Kapsam:** Import dialog'u (`parseFile` callback'i; dosya, sayfa, başlık satırı tespiti + Header row seçici, anahtar eşleme, sütun eşleme (otomatik + elle, `importAliases`), önizleme dönüşümleri, özet, yeni anahtarlar), grid'e uygulama (tek undo), Export (`export` olayı), telefonda salt okunur mod.

- [ ] Anahtar eşlenmeden Apply pasif.
- [ ] Başlık satırı otomatik bulunur (07 §13); Header row seçici ile değiştirilince eşleme tablosu yeniden kurulur; `.xlsx` ve `.csv` için aynı kod yolu.
- [ ] `Stok Kodu`, `Liste Fiyatı` gibi başlıklar `importAliases` ile otomatik eşlenir; büyük/küçük harf, boşluk ve Türkçe karakter farkı eşleşmeyi engellemez.
- [ ] Hiçbir alana uymayan ya da birden fazla alana uyan sütun boş kalır (otomatik seçim yapılmaz); elle seçilebilir; otomatik eşleme de değiştirilebilir; boş bırakılan sütun Apply'da alınmaz.
- [ ] `1.650,00 → 1,650.00`, `%20 → 20%` önizlemeleri.
- [ ] Boş Excel hücresi mevcut değeri silmez.
- [ ] `maxRows` aşımı engellenir.
- [ ] < 768 px veya yalnızca dokunmatik: banner, Copy link, düzenleme/aralık/Save yok (D14).

## Faz 7 — Telefon, erişilebilirlik ve yayın cilası

**Tasarım:** T13.
**Kapsam:** DataTable telefon düzeni (alt sayfalar, Filters sheet, bulk bar konumu, 44 px dokunma alanları), `forced-colors`, NVDA/VoiceOver turu (iki roving tabindex modeli), tüm duyurular (08 §5), yükleme/skeleton sürelerinin gerçek SWORS ekranlarında ayarı, dokümantasyon sitesi (playground'dan), README ve kullanım örnekleri (Vue Router / Inertia `row-open` tarifleri, Laravel kayıt tarifi), sürüm notları.

**Kabul kriterleri**
- [ ] T13 tasarımındaki telefon ekranları birebir.
- [ ] Hiçbir modda kart görünümü yok (ilke 4).
- [ ] NVDA + Firefox ve VoiceOver + Safari ile: filtre ekle, görünüm kaydet, satır seç, bulk aksiyon, satır menüsü, sheet'te düzenle ve kaydet senaryoları tamamlanır.
- [ ] axe-core taramasında kritik/ciddi ihlal yok (Playwright).
- [ ] `prefers-reduced-motion` ve `forced-colors` kontrolleri.
- [ ] Paket boyutu (gzip): çekirdek + DataTable ≤ 60 kB; `@swors/data-table/sheet` ayrı yüklenir.
