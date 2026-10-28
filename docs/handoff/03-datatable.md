# 03 · DataTable (masaüstü)

Davranış: brief §6. Tasarım: **T1–T9** sayfaları. Örnek ekran “Production orders”, görünüm “Gebze · this week” (Plant is Gebze, Due date is within This week, Due date ↑). Bugün: Wed Oct 21.

## 1. Sayfa ve kart

| Parça | Değer |
|---|---|
| Sayfa (uygulamanın) | `--dt-canvas`, dolgu `20px 24px 24px`; başlık satırı 24 px: breadcrumb 13 `--dt-text-3` · “/” `--dt-line-3` · başlık 16 / 600; başlıkla kart arası 16 |
| Kart | `--dt-surface`, 1 px `--dt-line`, yarıçap 12, `--dt-shadow-sm`, `overflow: hidden`; ebeveynin yüksekliğini doldurur |
| Dikey sıra | toolbar 52 → (şerit 36) → filtre satırı ≥ 44 → header → gövde (flex 1, tek kayan alan) → footer ≥ 48 |

## 2. Toolbar

Ölçüler 02 · Ölçek token'larıyla (D41). Sıra (D43, 2026-10-28; tasarım dosyasından sapma): `[görünüm] … [arama · Filter] … [Display · ⋯] │ [birincil]`; arama · Filter grubu toolbar'ın **tam ortasında** (iki yan eşit pay alan üç sütunlu ızgara). Köşeli parantezdeki öğeler **birleşik düğme grubu**dur (`.dt-btn-group`): kenarlıklar üst üste biner, iç köşeler düz, araya boşluk girmez.

| Öğe | Ölçü ve görünüş |
|---|---|
| Görünüm seçici | ghost, solda `--dt-control-h-xs` ikon kutusu (`Stack` 16, `--dt-surface-3` zemin, yarıçap `--dt-radius-item`; düğme içinde her yönde eşit boşluk; telefonda yok); ad 13 / 600; düzenlenmişse 6 px `--dt-accent` nokta + “Edited” 12 / 500 `--dt-text-2`; sonra `CaretDown` 14 `--dt-text-3` |
| Arama | Filter ile bir grup; 240 × 32 input, dolgu `0 34px`, `--dt-shadow-sm`; placeholder “Search orders…”; boşken sağda `/` kbd, değer varken 22 px temizle |
| Filter | 32 px; filtre yokken ikincil (`0 12px 0 10px`), varken aktif filtre stili + sayaç rozeti |
| Display | ⋯ ile bir grup; 32 px ikincil, `SlidersHorizontal` + “Display” |
| ⋯ | 32 × 32 ikincil ikon düğme |
| Ayırıcı | 1 × 20 `--dt-line` |
| Birincil (`#toolbar-end`) | 32 px mürekkep, `Plus` + “New order” |

**Daralma** (toolbar'ın kendi genişliği): 640–1023 px'te arama ve Display 32 × 32 ikon düğme; arama ikonu tıklanınca 240 px'e açılır. < 640: [04-datatable-telefon.md](04-datatable-telefon.md).

**Seçim toolbar varyantı** (`selection-bar: 'toolbar'`, T5-04): toolbar yerinde kalır, içerik değişir, zemin `--dt-row-selected`: `X` 32 (Clear selection) · “4 selected” 13 / 600 · 1 × 20 `--dt-line-2` · ikincil aksiyon düğmeleri (ikon + etiket) · ⋯ 32 ikincil. Yükseklik aynı, altındakiler kımıldamaz.

## 3. Filtreler (T2)

### 3.1 Filtre satırı

Yalnızca çip varken. Toolbar'dan 1 px `--dt-line` ile ayrılır; dolgu dört yönde `--dt-space-lg`, altta 1 px `--dt-line`. Çipler ([02 §5](02-ortak-bilesenler.md)) → **Add filter** (ghost 28, `Plus` 14) → sağ uçta **Clear all** (ghost 28, ilk satırın sonuna sabit).

Taşma: **D29 (2026-10-21) ile tek satır** — sığmayan çipler yatay kayar (çubuk gizli), sağ kenarda 40 px solma; Add filter ve Clear all kayan alanın dışında, sağda sabit (çipler sığarken Add filter son çipin yanındadır). T2-07'deki `+N more` popover'ı uygulanmaz.

### 3.2 Column picker (272)

Üstte odaklı arama “Filter by…” (32, accent kenar + halo). Bölümler (etiket 28 px): **Filtered** (sağda “opens its chip”), **Suggested** (en çok 4), **All columns**. Satır 32 px: tip ikonu 14 `--dt-text-3`, ad 13, sağda tip etiketi 12 `--dt-text-3` (Option, Person, Record ID, Text, Percentage, Currency, Date & time). Hover `--dt-surface-3`.

### 3.3 Değer editörleri

Hepsi popover kalıbında (başlık satırı: alan adı + operatör düğmesi; alt satır: durum + Clear).

| Editör | Genişlik | Gövde |
|---|---|---|
| Seçenek (Status) | 296 | “Search options…” 32; satırlar 32: checkbox 16 + rozet 22; hover satırda sağda **Only** (24 px ikincil küçük); alt satır “2 selected” |
| Kişi (Owner) | 296 | “Search people” 32 (açılınca odaklı); **Me** (avatar + “Me” + soluk gerçek ad), **Unassigned** (kesik avatar, `--dt-text-2`), ayırıcı, kişiler alfabetik |
| Tarih (Due date) | 520 | başlık 40 px (alt çizgili); solda 168 px hazır aralıklar (32 px öğeler; seçili 500 + sağda `Check`), ayırıcı, “Custom range”; sağda takvim (dolgu `12px 16px 16px`, ay başlığı 13 / 600 + 24 px oklar, gün adları 11.5 / 500 `--dt-text-3`, gün hücresi 32 px); aralık uçları `--dt-accent` dolu, ara günler `--dt-accent-soft`; alt satır “Presets stay relative — “This month” rolls over by itself.” |
| Sayı / para (Value) | 296 | para birimi segmented (24 px, TRY / EUR / USD, 11 / 500); Min ve Max (etiket 11.5 / 500 `--dt-text-3`, input 32 sağa yaslı) arasında “and” 12.5 `--dt-text-3`; alt satır “Bounds included” |
| Metin (Product) | 296 | input 32 (değer “cylinder”); operatör menüsü açık örnek |
| Operatör menüsü | 220 | operatörün popover'ın 6 px altında; öğeler 32, seçili 500 + `Check`; “is empty / is not empty” ayırıcıdan sonra |

`boolean` sütunun popover'ı yoktur; seçince doğrudan “is Yes” çipi oluşur.

## 4. Görünümler ve Display (T3)

### 4.1 Görünüm menüsü (316)

Seçicinin 4 px altında, solda hizalı.

1. **Kaydetme bölümü** (yalnızca görünüm düzenlenmişse): etiket “"Gebze · this week" edited” (28 px); öğeler: **Save changes** (alt satır “Updates "Gebze · this week"”, sağda `⌘S` kbd), **Save as new view…** (alt satır “Keeps "…" unchanged”), **Discard changes**. Alt satırlı öğe 44 px, alt satır 12 `--dt-text-3`. System görünümde: **Save as my view…** (`⌘S`) + Discard changes.
2. Ayırıcı, **Find a view…** (32).
3. Bölümler (etiket solda, sağda soluk “Built in / Only you”): System views · My views (Shared views D30 ile kaldırıldı). Satır 32: ad (aktifse 600), düzenlenmişse nokta + “Edited”, varsayılansa “Default” etiketi; hover'da sağda 24 px ⋯.
4. Ayırıcı, **New view** (`Plus`, `--dt-text-2`).

**Satır menüsü** (200, satırın 8 px sağında): Rename · Duplicate · Set as default · ayırıcı · Delete (`--dt-r-fg`). System görünümde yalnızca Duplicate ve Set as default (`views.systemNote`).

### 4.2 Dialog'lar

- **Save as new view** (460): başlık + “It appears under My views. Only you can see it.”; Name input (odaklı, önerilen ad “Gebze · on hold this week”); özet kutusu (`--dt-surface-2`, yarıçap 8, dolgu 12, 72 px etiket sütunu: Filters / Sort / Columns, 12.5); checkbox (Make this my default view; Share with my team D30 ile kaldırıldı); Cancel · **Save view**.
- **Delete view** (460, `alertdialog`): “Delete "Dilovası · next week"?” + “This can't be undone.”; Cancel (ilk odak) · **Delete** (danger).

### 4.3 Display (308)

Sağa hizalı, Display düğmesinin altında. Density segmented (Comfortable / Standard / Compact) · ayırıcı · **Columns ›** “8 of 14” · **Sort ›** “Due date ↑” · Vertical grid lines + switch · ayırıcı · “Saved for you only” + Reset. Drill-in öğeleri 32 px, değer 12.5 `--dt-text-3` + `CaretRight`.

## 5. Header ve sütun yönetimi (T4)

### 5.1 Header

Yükseklik `--dt-head-h`, `--dt-surface-2`, üst ve alt 1 px `--dt-line`, metin header boyutu / 500 / `--dt-text-2`. Sütunlar arası ayırıcı: 1 px `--dt-line`, yüksekliğin %40'ı, dikeyde ortalı. Etiket 24 px düğme (dolgu `0 4px`, yarıçap 6).

| Durum | Görünüş |
|---|---|
| Default | — |
| Hover | etiket zemini `--dt-surface-3`; sıralanabilirse soluk ok, sağda ⋯ (20 px) belirir |
| Klavye odağı | odak halkası; `↵` sıralar, `⇧F10` menüyü açar |
| Sorted ↑ / ↓ | etiket `--dt-text`, `ArrowUp`/`ArrowDown` 12; ↓ 180° döner (150 ms) |
| Sayısal sütun | sağa yaslı, ok etiketin **solunda** |
| Multi-sort | ok + öncelik rozeti 14 × 14 (yarıçap 4, `--dt-surface-3`, 11 / 600) |
| Filtrelenmiş | etiketin sağında 20 px `Funnel` `--dt-accent-text`; tıklayınca çipini açar |
| Pinned | etiketten sonra `PushPin` 12 `--dt-text-3`; kenar gölgesi yalnızca kaydırılmışken |
| Uzun etiket | `…`, tam metin tooltip'te |
| Açıklama (`description`) | tooltip iki satır: ad + açıklama (`--dt-tip-bg`, 12 / 500, satır 16, dolgu 5 × 8); header'da ikon yok. Tasarım dosyasında çizilmedi, 05'e göre (D33) |
| Resize | sütunun sağ kenarında 2 px `--dt-accent` tutamaç + canlı rozet (“184 px”, `--dt-tip-bg`, 20 px, 11 / 500); en az 80 px; içeriğe sığdırma yok (D42) |

### 5.2 Sütun menüsü (248)

Başlık etiketi sütun tipi (“Person”). Sort ascending · Sort descending · Clear sort (sıralama yokken `--dt-text-3`) · ayırıcı · Filter by this column… · ayırıcı · Pin left · Pin right · Move left `⌥⇧←` · Move right `⌥⇧→` · ayırıcı · Hide column.

### 5.3 Display › Columns (320)

Başlık 36 px: geri (24, `CaretLeft`) · “Columns” 13 / 600 · sağda “8 of 14 shown” 12 `--dt-text-3`. “Find a column” 32. Bölümler: **Pinned** (sağda “Always shown”), **Shown** (sağda Hide all), **Hidden** (sağda Show all). Satır 32: tip ikonu · ad · Move up / Move down (20 × 20; uçta pasif `--dt-line-3`) · göster/gizle 24 (`Eye` / `EyeSlash`; gizli satırın adı `--dt-text-2`, düğmesi `--dt-text-3`). Pinned satırında `Lock`. Alt: Reset. **Sürükle-bırak yok** (brief §6.8).

### 5.4 Display › Sort (320)

Satırlar 36 px: öncelik rozeti · sütun adı · yön düğmesi (24 px, kenarlı, yarıçap 5, `ArrowUp` + “Ascending” 12 / 500) · kaldır 24. Alt: “⇧ + click a header to add · up to 3” 12 `--dt-text-3` + Clear sort.

## 6. Satırlar

### 6.1 Sütun düzeni (Production orders)

| Blok | Genişlik | İçerik |
|---|---|---|
| Sol sabit | 176 = 40 + 136 | seçim sütunu 40 · Order no. 136 (sol dolgu `--dt-cell-x + 24`, expand chevron'u için) |
| Orta (kayar) | `minmax(200px,1.6fr) minmax(160px,1.2fr) 124px 176px 156px 132px 148px`, en az 1096 | Product · Customer · Status · Produced · Owner · Due date · Value |
| Sağ sabit | 44 (hatalı satır varken 66) | satır aksiyonları: dolgu 8, öğeler arası 8, ⋯ sağa yaslı (D28, D35) |

Toplam en az ~1330 px; dar ekranda orta blok yatay kayar, sabit blokların kenarında `--dt-shadow-pin-l/-r` yalnızca o yönde kaydırma varken.

### 6.2 Satır

Yükseklik `--dt-row-h` + 1 px alt çizgi `--dt-line`; hücre dolgusu `--dt-cell-x`; metin hücre boyutu.

| Durum | Zemin | Ek |
|---|---|---|
| Default | `--dt-surface` | |
| Hover | `--dt-row-hover` | ⋯ `--dt-text-2`; hücre aksiyonları görünür (T7) |
| Selected | `--dt-row-selected` | checkbox dolu |
| Selected + hover | `--dt-row-selected-hover` | |
| Error (`rowError`) | `--dt-r-bg` (hover ve seçimin üstünde) | ⋯ hücresinde, ⋯'nın solunda 14 px `WarningCircle` `--dt-r-dot`, 8 px ara; sütun 66 px; tooltip satırın her yerinde (imlecin altında) ve ikonda. Tasarım dosyasında çizilmedi, 05'e göre (D35) |
| Menü açık | hover zemini | ⋯ `--dt-line-2` zemin, `--dt-text` (görünüm satırı ve header ⋯'leriyle aynı; T6-03 ekranında `--dt-surface-3` çizildi, `--dt-line-2` esas alınmalı) |

Sabit bloklar satırın zeminini taşır (hover/seçili aynı renk).

### 6.3 Hücreler (örnek ekran)

| Sütun | Görünüş |
|---|---|
| Order no. | expand chevron 20 × 20 (yarıçap 5, `--dt-text-3`, açıkken 90°) + ID linki mono `--dt-mono-fs` / 500 `--dt-text` (gerçek `<a>`) |
| Product | ad `--dt-text`; Comfortable'da altında SKU 12 `--dt-text-3` mono |
| Customer | düz metin, `…` |
| Status | rozet (Draft gray, Planned violet, Released teal, In progress blue, On hold amber, Done green) |
| Produced | çubuk 90 × 6 + %36 px etiket, sağa yaslı |
| Owner | avatar + ad, boşsa Unassigned |
| Due date | `Oct 21`; gecikmiş: `--dt-r-fg` “Oct 20 · 1d late” |
| Value | sağa yaslı `412,500.00` + `TRY` (`--dt-currency-fs` / 500 / `--dt-text-3`), taban çizgisine hizalı |

Kaydırma hapı: gövde kayarken kaydırma alanının iç köşesinden sağdan ve alttan eşit `--dt-space-lg` (yer kaplayan kaydırma çubukları hariç tutulur; tasarımda kart kenarından 22 / 62); `--dt-control-h-xs`, yazı dikeyde ortalı, dolgu `0 10px`, yarıçap 999, `--dt-tip-bg`, 12 / 500, “Rows 41–56”; 900 ms sonra 150 ms'de solar.

## 7. Seçim ve toplu işlem (T5)

**Header checkbox:** none (boş) · some (indeterminate; tıklayınca sayfanın kalanını seçer) · all (tıklayınca temizler). Yalnızca bu sayfa.

**Floating bulk bar:** kartın altında ortada, alt kenardan 64 px; dolgu 6, boşluk 4, yarıçap 12, `--dt-bulk-bg` / `--dt-bulk-fg`, `--dt-shadow-float`; ilk seçimde 160 ms kayarak gelir.

| Parça | Değer |
|---|---|
| Sayaç | “4 selected” 13 / 500, dolgu `0 8px`; yalnızca “N selected” (brief) |
| Ayırıcı | 1 × 20 `--dt-bulk-line` |
| Aksiyon | 32 px, dolgu `0 12px 0 10px`, yarıçap 8, ikon 16 `--dt-bulk-fg-2` + etiket 13 / 500; hover `--dt-bulk-hover`. En çok 3 işaretli aksiyon |
| ⋯ | 32 × 32; açıkken `--dt-bulk-hover` zemin |
| ⋯ menüsü | 248, bar'ın 12 px üstünde, sola hizalı; diğer aksiyonlar, yıkıcı en altta `--dt-r-fg` (“Cancel 4 orders…”) |
| Temizle | `X` 32 × 32 `--dt-bulk-fg-2`; Esc ile aynı |

Örnek ekranda T1-02'de “12 selected · Release · Reschedule · ⋯ · ×”, T5'te “4 selected · Release · Reschedule · Assign owner · ⋯ · ×”.

**Uygulamanın onay dialog'u** (T5-05, paketin değil, örnek): “Cancel 4 production orders?”; seçili emirlerin listesi (34 px satırlar, mono ID, ad, rozet); atlanacak satır uyarısı (amber `WarningCircle` + “WO-26-0409 is already done and will be skipped.”); seçenek checkbox'ı; Keep orders (ilk odak) · **Cancel 3 orders** (danger).

## 8. Satır detayı (T6)

**Expand:** alt satır tam genişlik, `--dt-surface-2`, dolgu `12px 12px 12px (--dt-cell-x + 24)`; sol kenarı seçim sütununun sağından başlar. İçerik uygulamanın; örnek: mini tablo (en çok 920, 1 px `--dt-line`, yarıçap 8, header 34 `--dt-surface-2` 12 / 500, satırlar 34) + özet satırı (“4 operations · Line 2 routing” 12.5 `--dt-text-2`, sağda “Open routing →” 500). Birden fazla satır açık olabilir.

**Satır aksiyonları:** sağ sabit, içeriğe göre sütunda (dolgu 8, aralar 8; yalnızca ⋯ 44; `rowError` ikonu + 22; inline aksiyon başına + 36, D36; inline düğme ⋯ ile aynı 28 px, hover `--dt-surface-3`) ⋯ (28 × 28, yarıçap 6, `--dt-text-3`, her zaman görünür). Sağ tık ve `⇧F10` aynı menüyü açar.

**Satır menüsü** (268, ⋯'nin altında sağa hizalı): **Open** `↵` · Open in new tab · **Copy order number** · ayırıcı · uygulamanın aksiyonları (pasif olan iki satırlı: “Release / Already running”) · ayırıcı · yıkıcı (`--dt-r-fg`, “Cancel order…”). Copy order number “Copied” toast'ı gösterir ([02 §6](02-ortak-bilesenler.md)).

**Önizleme yok (D28).** Uygulama kendi önizlemesini satır menüsüne kendi aksiyonu olarak ekler ya da `row-click` olayında açar.

## 9. Hücre aksiyonları ve uygulamanın hücreleri (T7)

**Hücre aksiyonları** (ör. Product: Copy name, Open product):

| Kural | Değer |
|---|---|
| Düğme | 24 × 24, yarıçap 5, ikon 14 `--dt-text-2`, aralarında 2 px, kenardan 6 px |
| Arka plan | satırın kendi rengi; metnin üstüne 12 px solma (`linear-gradient(to right, transparent, satır rengi 12px)`), sütun genişlemez, metin kaymaz |
| Ne zaman | hover ve klavye odağı; yalnızca hover değil |
| Kaç tane | en çok 2; 3 ve üstü → ilk aksiyon + ⋯ (menü 220) |
| Etiket | tooltip 400 ms sonra (“Copy name”) |
| `reveal: 'always'` | düğmeler hep görünür, bir ton soluk |
| Tıklama | yalnızca o düğme çalışır; satır açılmaz, seçim değişmez |

Klavye (D40): düğmeler doğal Tab durağıdır (odak halkası), `↵` / `Space` çalıştırır.

**Uygulamanın çizdiği hücreler** (Lot inspection örneği): adet çubuğu “340 / 500” (çubuk + sayı, birim header'da); özel rozet (ikon + etiket + sayı, yarıçap 6, nokta rozetlerinden ayrı); Approve / Reject (Comfortable 28, diğerleri 24 px küçük ikincil düğmeler, karar verilince “✓ Approved · 09:42” / “✕ Rejected · 08:15”).

## 10. Durumlar (T9)

Çerçeve (toolbar, filtre satırı, header, footer) her durumda yerinde kalır; mesaj gövdenin ortasında ([02 §9](02-ortak-bilesenler.md)).

| Durum | Gövde | Footer |
|---|---|---|
| First load | 12 skeleton satır (tipe göre) | “Loading…” |
| Refreshing | satırlar etkileşimli; header altında 2 px belirsiz çubuk | “Updating…” + dönen yenile ikonu |
| Query change | eski satırlar `opacity: .6` + `inert` (tıklama, odak ve ekran okuyucu kapalı), `aria-busy`; 400 ms'i aşarsa skeleton | sayfalama kilitli |
| Empty | kutu ikonu · “No production orders yet” · “Orders you create or import show up here.” · **Create order** (birincil) + Import from CSV | “0 rows” |
| No results (çok filtre) | `Funnel` · “No production orders match these 3 filters” · Clear all filters | “0 rows” |
| No results (tek filtre) | “No production orders match this filter” · Remove “Due date” | “0 rows” |
| No results (arama + filtre) | `MagnifyingGlass` · “No production orders match "hc-800" and 2 filters” · Clear search + Clear all filters | “0 rows” |
| Error | kırmızı kutu · “Couldn't load production orders” · “The server didn't answer in time.” / “Your filters are kept.” · Try again · Copy error ID | — |
| Stale | toolbar altında amber şerit “Couldn't refresh. Showing data from 09:42. **Retry**”; satırlar kalır | “Updated 14 min ago” `--dt-a-fg` |
| Still loading | header altında `--dt-surface-2` satır: dönen ikon + “Still loading…”; altında skeleton | “Loading…” |
| No rows on this page | sayfa ikonu · “No rows on this page” · Go to previous page | “0 rows”, Previous aktif |

Çipler No results'ta görünür kalır.

## 11. Footer ve sayfalama

En az 48 px, dolgu `8px 12px`, boşluk 12, üstte 1 px `--dt-line`, `--dt-surface-2`, 12.5 `--dt-text-2`.

| Sol | Sağ |
|---|---|
| “Rows 1–100” `--dt-text` · “Count total” (24 px ghost, 12 / 500 `--dt-text`) │ 1 × 16 `--dt-line-2` │ “Updated just now” `--dt-text-3` + 24 px `ArrowClockwise` | “Rows per page” + select (28 px, yarıçap 6, ikincil, “100”) │ Previous · Next (28 px, yarıçap 6, ikincil; pasif: `--dt-surface-2` zemin, `--dt-line` kenar, `--dt-text-3`, gölgesiz) |

T9-12'deki footer durumları: Normal · Counting (“of ⟳ Counting…”) · Counted (“of 1,284 · counted 09:42”) · Last page (“· end of results”, Next pasif) · Single page (ikisi pasif) · Page loading (düğmeler pasif, eski aralık durur) · Auto-refresh on (yeşil nokta + `--dt-live-halo` + “Live”) · Refreshing (“Updating…”) · Stale (“Updated 14 min ago” amber).

## 12. Erişilebilirlik

| Bölge | Rol / etiket |
|---|---|
| Kart | `section aria-label="Production orders table"` |
| Toolbar | `role="toolbar"`; Filter düğmesi `aria-label="Filter, 2 applied"`; görünüm seçici `aria-label="View: Gebze · this week, edited"` |
| Filtre satırı | `role="region" aria-label="Filters"`; çip gövdesi `aria-label="{column} {op} {value}. Edit value"`, kaldır `Remove {column} filter` |
| Popover | `role="dialog"` (değer editörleri, column picker, Display), menüler `role="menu"` / `menuitem` / `menuitemradio` |
| Izgara | `role="table"`, header `columnheader` + `aria-sort`; satır klavyesi yok, widget'lar doğal Tab sırasında (D40) |
| Satır checkbox | `aria-label="Select {id}"`; header `Select all rows on this page` |
| Satır ⋯ | `aria-label="Actions for {id}"`, `aria-haspopup="menu"`, `aria-expanded` |
| Expand | `aria-label="Show details for {id}"`, `aria-expanded` |
| Bulk bar | `role="toolbar" aria-label="Bulk actions"`, sayaç `role="status"` |
| Durumlar | mesaj `role="status"` (hata `alert`), yenileme çubuğu `role="progressbar" aria-label="Updating"`, stale şerit `role="status"` |
| Duyurular | `sr.*` anahtarları (09-i18n.md) |

Klavye haritası: `08-accessibility-keyboard.md` §3.
