# 07 · DataSheet (toplu düzenleme)

Tasarım referansı: `DESIGN-BRIEF.md` §8 ve görev paketleri T11, T12.

## 1. Genel bakış

Ürün kartları, fiyat listeleri gibi **çok sayıda kaydı tek seferde düzenleme** ekranı (`@swors/data-table/sheet`). Kullanıcılar bugün Excel'de çalışıp dosya yüklemeye alışkın; bu ekran o alışkanlığı tarayıcıya taşır: hücreye yaz, aralık kopyala/yapıştır, aşağı doldur, geri al, Excel dosyası içe aktar. Değişiklikler orijinal satırlara dokunmadan taslakta birikir; **tek Save** yeni ve değişen satırları `@save` olayıyla **uygulamaya teslim eder**; uygulama kendi API'siyle (chunk, yeniden deneme kendi kararı) **anahtar sütuna (SKU) göre upsert** yapar ve sonucu `applyResult()` ile bildirir; hatalar ilgili satır ve hücreye döner. Paket HTTP, chunk ve retry taşımaz (D18).

Hücre seçimi ve klavye hareketi TanStack Table'ın `cellSelection` özelliğiyle (01); düzenleme, depo, geçmiş, pano ve doldurma paketin — model TanStack'in resmi `spreadsheet` örneğiyle aynıdır.

Temel kurallar (karar günlüğü):

- **D11** — Tek Save → yalnızca yeni + değişen satırlar → `@save` → uygulama anahtara göre upsert. **Asla silmez.**
- **D12** — Satır ekleme/çıkarma **partiyi** değiştirir; sunucuda kayıt oluşturmaz/silmez. “Remove from list” nötrdür (kırmızı değil).
- **D13** — Filtre yalnızca görünümü daraltır; gizlenen satırlardaki değişiklikler korunur ve gönderilir.
- **D14** — Telefonda salt okunur.

En fazla **10.000 satır** (`maxRows`).

## 2. Yerleşim

```
Products › Bulk edit
Bulk edit products                                                                        (sayfa başlığı uygulamanın)
┌ dt-card (data-density="compact", flex:1) ───────────────────────────────────────────────────────────────────────────┐
│ [⌕ Find ⌘F] [Filter 1] │ (All 10,000 | Changed 96 | Errors 1) ↶ ↷ │ Add row  Import  Export ⚙ │ ● 128 changes in 96 rows · 1 new [Discard] [✓ Save changes ⌘S] │  Toolbar
│ [Category · is any of · Pumps, Valves, +4 ×]  Filters only change what you see — hidden rows keep their edits. │  FilterBar
│ PS-045-C · List price │ fx │ 96.50                                  Currency · TRY · required · ≥ 0 │  Formula bar 36 px
│ Row │ SKU      │ Product name *          │ Category * │ Unit │ List price * │ Cost │ VAT │ … │       │  Header
│   1 │ HC-080-S │ Hydraulic cylinder HC-80│ Hydraulics │ pcs  │     1,650.00 │ …                       │  role="grid"
│ …                                                                                                    │
│ 10,000 rows · ■ 128 changes in 96 rows · 1 new row · ■ 1 error — go to        Count 5  Sum 1,153.50  Average 230.70 │  Status bar 36 px
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Save kontrolleri DataSheet toolbar'ının sağındadır** (ayrı bir `SheetSaveControls` bileşeni yoktur). İçerik: `--dt-accent` 6 px nokta + “**128** changes in 96 rows · 1 new” (12.5 px, `--dt-text-2`) · **Discard** (ghost) · **Save changes** (birincil mürekkep, ✓ ikonu, `⌘S` kbd; odak sheet içindeyken).
  - Değişiklik yokken: nokta yok, metin “No changes”; Discard ve Save **görünür ama pasif** — düzen zıplamaz.
  - Uygulama kendi sayfa başlığında bir Save düğmesi isterse handle'daki `getChanges()` / `isDirty()` / `status` ile aynı akışı kurar; paketin kaydetme yolu tek: `@save`.
- Kart viewport'u doldurur (liste modundaki yükseklik sözleşmesi, 05 §2).
- Yoğunluk varsayılanı **Compact** (32 px satır). Dikey ızgara çizgileri **açık**.

### Toolbar

| Öğe | Ayrıntı |
|---|---|
| **Find in grid** | 188 px (1440 px'te Save kontrolleriyle tek satıra sığsın diye), `⌘F` (odak tablodayken tarayıcı aramasının yerine). Eşleşmeleri **vurgular ve gezer**, satır gizlemez: Enter sonraki, ⇧Enter önceki, sağda `3 of 41`. Arama görünür sütunlarda, görüntülenen metin üzerinde. |
| **Filter** | Liste modundaki çip sistemi (04), yerel çalışır. Sayaç rozeti. |
| **All / Changed / Errors** | Segmented, her birinde sayı (Errors sayısı `--dt-r-fg`). §11. |
| Undo / Redo | İkon butonlar, tooltip `Undo (⌘Z)` / `Redo (⌘⇧Z)`. Yığın boşsa pasif. |
| **Add row** | Partiye yeni satır (§9). |
| **Import Excel** | `parseFile` prop'u varsa (§13). |
| **Export** | Menü: Export all rows (10,000) · Export visible rows (96) › Excel (.xlsx) / CSV. Paket `export` olayını taslak değerlerle yayar; dosyayı uygulama yazar. |
| Display ⚙ | Yoğunluk, Columns ›, Vertical grid lines. (Sort › yok; header tıklaması yeterli.) |

### Formula bar (36 px)

- **Ad kutusu** 240 px: aktif satırın anahtarı (mono, `--dt-text`) · sütun adı. Aralık seçiliyken `5 × 1 cells`.
- **fx** 40 px — yalnızca simge. **Formül desteklenmez**: `=` ile başlayan giriş metin sütununda metin olarak kalır, sayı sütununda hata “Formulas aren't supported”.
- Değer alanı: aktif hücrenin ham değeri; buraya yazmak hücreyi düzenlemekle aynıdır (Enter onaylar, Esc iptal). Uzun metinler burada tam görünür.
- Sağda ipucu: tip · para birimi · `required` · kısıtlar (sütunun `hint`'i), ör. “Currency · TRY · required · ≥ 0”.

### Status bar (36 px, `--dt-surface-2`)

- Sol: `10,000 rows` · ■ accent `128 changes in 96 rows` · `1 new row` · ■ kırmızı **`1 error — go to`** (buton → sonraki hataya gider, F8 ile aynı). Değişiklik yoksa yalnızca `10,000 rows · No changes`.
- Sağ (seçim özeti, `aria-label="Selection summary"`): `Count 5  Sum 1,153.50  Average 230.70`. Count = boş olmayan hücreler; Sum/Average yalnızca seçimde sayısal hücre varsa. Tek hücrede gizli.

## 3. Sütunlar

| Sütun | Genişlik | Not |
|---|---|---|
| Gutter (satır no) | 56 px, sola sabit | Mono 11 px `--dt-text-3`, binlik ayırıcısız (`10001`), sağa yaslı, `--dt-surface-2` (header'da `--dt-surface-3`). Solunda işaret: değişti = 6 px accent kare (2 px yarıçap), hata = 13 px kırmızı ikon, yeni = 13 px accent `+`. `role="rowheader"`. |
| Anahtar (`keyColumn`) | 128 px, sabit | Mono. Header tooltip: “Match key — an existing SKU updates that product, a new SKU creates one”. **Yüklenmiş satırlarda salt okunur**, yeni satırlarda düzenlenebilir. Yeni satırda sağda `New` / `Update` etiketi. |
| Birincil ad | `minmax(220px, 1.4fr)`, sabit | |
| Diğerleri | Sütun tanımındaki `width`; yoksa 05 §4'teki tip varsayılanları | Sayısal sütunlar sağa yaslı. |

- Zorunlu sütun header'ında kırmızı `*` (`aria-label="required"`). Birim header'da soluk (`Lead time d`).
- **Gutter numarası kararlıdır:** yükleme sırasındaki sıra; yeni satırlar sonraki numaraları alır (10,001, 10,002…). Sıralama ve filtreleme numaraları **değiştirmez** (Excel'deki gibi), böylece “HC-080-S is already in row 1” gibi mesajlar ve hata listesi tutarlı kalır.
- Sütun genişliği ve gizleme bu oturuma özeldir (görünüm yok); sütun sırası sabittir.
- Sütunlar **varsayılan olarak salt okunurdur**; düzenlenecek her sütun `editable: true` (veya fonksiyon) ile açılır. Fonksiyon satırın güncel (taslak uygulanmış) halini alır; aynı satırda başka bir hücre değişince kilit yeniden değerlendirilir.
- Anahtar sütunun header'ında 12 px `--dt-text-3` kilit ikonu (yüklenmiş satırlarda değişmez olduğunu söyler).

## 4. Hücre durumları

Mavi = senin değişikliğin veya seçimin · kırmızı = kaydedilemez · amber = ikinci bir bakışa değer.

| Durum | Görünüm | Davranış |
|---|---|---|
| Editable | Normal, `cursor: cell` | Çift tık, F2 veya doğrudan yazmak düzenler |
| Read-only | `--dt-surface-2` zemin, `--dt-text-2`; hücre aktif veya hover'dayken sağda 12 px kilit ikonu | Yapıştırma ve doldurma **atlar**, asla üzerine yazmaz. `aria-readonly="true"` |
| Active | 2 px `--dt-accent` iç çerçeve, sağ altta 7 px accent **fill handle** (1.5 px `--dt-surface` halka) | |
| In selection | `--dt-accent-soft` zemin, aralığın dış kenarında 1.5 px accent | Status bar'da Count/Sum/Average |
| Editing | `--dt-surface` zemin, 2 px accent + gölge, `z-index: 5` | Enter grid'e kaydeder, Esc iptal |
| Changed | `--dt-accent-soft` zemin + sağ üstte 7 px accent köşe üçgeni | Hover tooltip: “Was 2,150.00 · ⌘Z”. Henüz kaydedilmedi. |
| Error | `--dt-r-bg` zemin + 1.5 px `--dt-r-dot` iç çerçeve + kırmızı köşe | Satırı kayıttan **alıkoyar**. Hover veya aktifken hücrenin üstünde kırmızı balon (`--dt-error-tip-bg` zemin, beyaz metin, `--dt-shadow-tip`). |
| Warning | `--dt-a-bg` zemin + amber köşe | Kayda izin verir (ör. “Price changed by more than 40%”) |
| Required, empty | Hücrede kırmızı “Required” metni (`--dt-r-fg`) | Hata ile aynı |
| New row | Anahtar hücresi `--dt-accent-soft`, sağda `New` etiketi; gutter'da `+` | Bilinmeyen anahtar → Save oluşturur |

Öncelik (aynı hücrede birden çoğu): Error > Warning > Changed. Active/Editing/Selection zemini üstte; köşe üçgeni her durumda görünür kalır.

## 5. Düzenleme ve editörler

| Eylem | Sonuç |
|---|---|
| Yazmaya başlamak | Düzenleme açılır, içerik **yazılanla değiştirilir** |
| F2 / çift tık | Düzenleme açılır, imleç sonda |
| Enter (düzenlemede) | Onaylar, **aşağı** iner |
| Tab / ⇧Tab | Onaylar, sağa / sola |
| Esc | İptal, eski değer |
| Delete / Backspace (seçimde) | Seçili hücreleri temizler (read-only atlanır) |
| Space (`boolean`) | Yes ↔ No, popover yok |

Editörler filtre değer girişleriyle **aynı bileşenler** (03):

- `string` · `text` — metin input'u; `text` daha büyük kutu açar, ⇧Enter yeni satır.
- `int` · `float` · `currency` — sağa yaslı; `2240`, `2.240,00`, `2,240.00` kabul edilir (§7 yerel ayar kuralı). Para birimi sabitse soluk kod sağda.
- `select` · `ajax` — combobox; yazmak süzer, Enter seçer. Listede olmayan değer → hata “**“Pump” isn't an option**”, yakın eşleşme varsa balonda **Use Pumps** düğmesi. `optionEnabled(option, row)` verilmişse satıra göre kapalı seçenekler listede görünmez (satırın taslak hali; aynı satırda başka hücre değişince liste yeniden hesaplanır); yapıştırma/doldurma ile gelen kapalı değer aynı hatayı verir, ama yalnızca **değişen** hücrede — mevcut değer kural değişince hata olmaz. `options` tam liste kalır: etiket, filtre ve dışa aktarma ondan okur.
- `date` · `datetime` — “24.10”, “24.10.2026”, “+7d”, “today” yazılabilir veya seçici açılır.
- `boolean` — Space değiştirir.
- `multiselect` — hücre içinde arama kutusu, altta seçenek listesi (reka Combobox, `multiple`). Yazmak süzer, Enter vurgulu seçeneği aç/kapar; eşleşen seçenek yoksa liste açılmaz; listede olmayan metin yok sayılır ve Enter onaylar (listede olmayan değer yalnızca yapıştırmayla girer ve “isn't an option” hatası olur). Editörde chip yok, yalnızca arama kutusu; seçim listeyi açık tutar, seçili seçenekler listede tik ile kalır, tekrar seçmek kaldırır. **Esc iptal etmez**: liste açıkken de seçimleri kaydedip düzenlemeden çıkar (geri almak için ⌘Z); Tab da onaylar. **Yazmaya başlamak mevcut değeri silmez**, yazılan harf aramaya gider (tablodaki genel kuralın istisnası). Yapıştırmada `;` veya `,` ayrılmış liste.
- `object` — yalnızca `editable: true` verilmişse JSON metni olarak düzenlenir (gelişmiş kullanım).

Doğrulama hücre onaylanınca anında çalışır: tip çözümleme → `required` → `validate` (hata) → `warn` (uyarı). Bir hücre değişince **aynı satırın** diğer hücrelerinin doğrulaması da yenilenir (çapraz kural: “Cost can't be higher than list price (214.50)”).

### Onaylama ve odak kuralları

- Tek `editing` hücresi vardır; editör yalnızca düzenlenirken render edilir, taslak değer depoda durur (sanal kaydırmada kaybolmaz).
- **Blur ile onaylama yoktur** (portallı bileşenler yanlış tetiklerdi). Onaylayan eylemler: `Enter`/`Tab` (editörde), başka hücreye `mousedown`, ızgara dışına `pointerdown` (reka katmanları — combobox listesi, popover — dışarı sayılmaz). `Esc` iptal eder.
- Editördeki `Enter`/`Esc`, hedef `aria-expanded="true"` (açık combobox) ise, olay `defaultPrevented` ise ya da hedef input dışı bir buton ise sheet'e ulaşmaz: önce widget çalışır, ikinci `Esc` düzenlemeyi iptal eder. İstisna: yerleşik `multiselect` editöründe `Esc` her zaman kaydedip çıkar.
- `ColumnDef.editor` ile özel editör: props `{ modelValue, row, column }`, emit `update:modelValue`; Enter/Tab/Esc'i sheet yönetir; reka Popover/Combobox gibi portallı içerik serbesttir ve reka'nın public olayları (`escapeKeyDown`, `focusOutside`, `interactOutside`) kullanılır. Portallı içeriğin köküne `dt-sheet-layer` sınıfı verilir: oradaki tık "ızgara dışı" sayılmaz, düzenleme sürer (yerleşik combobox ve takvim de böyle).
- Hücredeki `actions` ve `cell` içindeki düğmeler düzenleme başlatmaz: düzenleme yalnızca hücre gövdesinden (çift tık, F2, yazma) açılır; düğmeye `mousedown` hücreyi aktif yapar ama düzenlemez.

## 6. Seçim ve aralıklar

TanStack `cellSelection`: `cell.getTabIndex()` (roving tabindex; aktif hücre DOM odağını tutar, 08 §2), `getSelectionEdges()`, `getSelectionStartHandler()` (mousedown), `getSelectionExtendHandler()` (mouseenter), `moveCellSelection` / `extendCellSelection` / `selectAllCells`. Aralıklar satır ve sütun id'siyle tutulur; sıralama ve filtre sonrasında köşeler yerinde kalır. `autoResetCellSelection: false`.

- Tık: tek hücre. ⇧+tık veya ⇧+ok: aralığı genişletir. Sürükleme: aralık seçer (kenara yaklaşınca otomatik kayar).
- Gutter tıklaması: satırın tamamı; ⇧ ile satır aralığı.
- `⌘A`: görünür tüm hücreler.
- Tek seferde **tek aralık** (⌘-tık ile çoklu aralık v1'de yok).
- Header tıklaması **sıralar** (§10), sütun seçmez.

## 7. Pano

### Kopyala / Kes

- `⌘C` (ızgaradaki `copy` olayı): aralık panoya `text/plain` (TSV) ve `text/html` (`<table>`) olarak yazılır. Değerler **görüntülenen biçimde** (Excel'e yapıştırınca doğru görünsün): sayılar uygulama yerel ayarında, seçenekler etiketleriyle; geri yapıştırılabilsin diye para kodu ve boş değer işareti (“—”) yazılmaz, tarihler ISO (`2026-10-24`), listeler `; ` ile. Değerler aralık sınırlarından (`getCellSelectionBounds()`) depo okuyucusuyla alınır — taslak değerler; TanStack `getSelectedCellRangesData()` kullanılmaz (önbellekli `getValue`).
- `⌘X`: kopyalar ve hücreleri **hemen** temizler (tek undo adımı). Read-only hücreler kopyalanır ama temizlenmez.

### Yapıştır

- `paste` olayından (`clipboardData`) okunur; `⌘V` kısayolunda `navigator.clipboard.readText()` yedeği. TSV çözümlenir (Excel'in tırnaklı, içinde sekme/satır sonu olan hücreleri dahil). `text/html` yalnızca TSV yoksa okunur.
- **Başlangıç:** aktif hücre. Tek değer + aralık seçiliyse → değer tüm aralığa yazılır. Aralık > seçim → aktif hücreden itibaren pano boyutu kadar.
- **Yalnızca görünür satırlara** sırayla yazılır (filtreyle gizlenen satırlar atlanır — Excel'in gizli satırlara yazma tuzağı yok).
- Son satırın altına taşan satırlar **yeni satır** olur (“or paste below the last row”). Anahtar sütun yapıştırılmadıysa yeni satırların anahtarı boştur → “Required” hatası.
- **Read-only hücreler atlanır**, asla üzerine yazılmaz.
- **Seçenekler etiketle eşleşir:** büyük/küçük harf ve baş/son boşluk duyarsız, `tr` yerel ayarına uygun (`İ/i`, `I/ı`). Eşleşmeyen → hücre hatası (§5).
- **Sayılar panonun yerel ayarıyla okunur.** Pano yerel ayarı bilinmediği için sütun bazında çıkarım: değerlerden biri `1.234,56` / `12,5` kalıbına uyuyorsa virgül ondalık; `1,234.56` / `12.5` ise nokta ondalık. Belirsizse (`1.250`) uygulamanın `locale`'i. `%20`, `20%`, `20` → 20%.
- Sonuç toast'ı (koyu, altta): “**Pasted 5 rows × 3 columns** · 2 values aren't options · **Review** · Undo ⌘Z”. Seçenek dışı hatalar (“2 cells have errors”, `sheet.pasteErrors`) ayrıca sayılır. Review ilk sorunlu hücreye gider.
- Yapıştırma `maxRows`'u aşacaksa uygulanmaz: `sheet.limitPaste`: “This paste would make 10,240 rows. The limit is 10,000.”
- Tüm yapıştırma **tek undo adımı**.

## 8. Doldurma

- **Fill handle** (aktif hücre/aralığın sağ alt karesi) dikey sürüklenir. Sürüklerken hedef hücreler kesik accent çerçeve, yanında etiket “Fill 4 cells with 10%”.
- **Seri:** kaynak en az iki sayısal hücre ve sabit artışlıysa (1, 2, 3 / 10, 20) seri devam eder; aksi halde **kopyalar**. Tek sayı hücresi kopyalanır (Excel'deki gibi Ctrl ile seri yok).
- `⌘D`: seçimi **ilk satırından** aşağı doldurur.
- Read-only hücreler atlanır. Tek undo adımı.
- Yatay doldurma v1'de yok.

## 9. Satırlar bir partidir

### Ekleme

- **Add row** (toolbar) veya hücre menüsü › Insert row above / below. Yeni satır `newRowDefaults()` ile oluşur, odak **anahtar hücresinde**, düzenleme açık.
- Yeni satırın anahtarı yazıldıkça (onayda, 300 ms debounce) `lookupKeys` callback'i ile kontrol edilir (verilmemişse her bilinmeyen anahtar **New** sayılır). Kontrol sürerken etikette küçük spinner.

| Sonuç | Etiket | Save'de |
|---|---|---|
| Anahtar sunucuda yok | `New` (accent) | Ürün **oluşturulur** |
| Anahtar sunucuda var, listede yok | `Update` (nötr) | O ürün **güncellenir** |
| Anahtar listede zaten var | Hata: “HC-080-S is already in row 1” | Gönderilmez |

- **Update satırının boş hücreleri sunucudaki kayıttan doldurulur** ve bu değerler “orijinal” sayılır (değişmiş işaretlenmez). Böylece satır, yüklenmiş bir satır gibi davranır ve Save'de yalnızca kullanıcının değiştirdiği alanlar gider — boş bırakılan hücreler mevcut ürünü boşaltmaz. *(Önerilen kural; ürün sahibine teyit ettirin — README › Açık sorular.)*
- Bir anahtar listede **yalnızca bir kez** olabilir: aynı anahtarı taşıyan **tüm** satırların anahtar hücresi hata alır ve hiçbiri gönderilmez, biri düzeltilene veya listeden çıkarılana kadar.

### Listeden çıkarma

- Hücre menüsü › **Remove from list** (`⌘−`), birden çok satır seçiliyse hepsi. Menüde **nötr** renk (kırmızı değil, D12).
- Toast: “Row 214 removed from this list. The product isn't deleted. **Undo**” (çoklu: “12 rows removed from this list. The products aren't deleted.”).
- Çıkarılan yüklenmiş satırın değişiklikleri gönderilmez; ürün olduğu gibi kalır. Çıkarılan yeni satır tamamen gider.

### Hücre menüsü (sağ tık)

Cut `⌘X` · Copy `⌘C` · Paste `⌘V` · Fill down `⌘D` · Clear contents `Del` · ─ · Insert row above · Insert row below · Remove from list `⌘−` · ─ · Open product (yeni sekmede; yalnızca sunucuda var olan satırlar).

### Ne gönderilir

Yalnızca **yeni** ve **değişmiş** satırlar, chunk'lar halinde. Hatalı satırlar gönderilmez. Çıkarılan satırlar gönderilmez. Silme hiçbir koşulda yok.

## 10. Sıralama

Header tıklaması **yerel** sıralar (asc → desc → kapalı; ⇧ ile ikincil). Değişiklikler satırlarıyla birlikte taşınır; gutter numaraları değişmez. Sıralama sırasında düzenlenen satır yerinde kalır, sıralama bir sonraki header tıklamasında yeniden uygulanır (satır imlecin altından kaçmaz).

## 11. Filtreler ve All / Changed / Errors

- Filtre çipleri yalnızca görünümü daraltır (**D13**); not sabit: “Filters only change what you see — hidden rows keep their edits.”
- Filtreler **güncel** değerler üzerinde yerelde çalışır. Düzenleme sonrası filtreye artık uymayan satır **gizlenmez**; görünür kalır ve gutter'da soluk “doesn't match filters” işareti alır. Filtre değişince yeniden değerlendirilir.
- Segmented kontrol filtrelerle birlikte (AND):
  - **All** — tüm satırlar (sayı: parti büyüklüğü).
  - **Changed** — en az bir hücresi değişmiş veya yeni olan satırlar.
  - **Errors** — istemci veya sunucu hatası olan satırlar.
- Errors görünümünde son hatayı düzelttiğin satır, görünümden çıkana kadar yerinde kalır (aynı “imlecin altından kaçmama” kuralı).
- **F8** sonraki hataya, **⇧F8** öncekine gider (sona gelince başa sarar); gerekirse All görünümüne geçmeden, filtre gizliyorsa toast: “Next error is hidden by filters · Show it” (filtreleri temizler).

## 12. Geri al / Yinele

- `⌘Z` / `⌘⇧Z` (Windows'ta `Ctrl+Y` de). Adım = tek kullanıcı işlemi: hücre düzenleme, yapıştırma, doldurma, temizleme, kesme, satır ekleme, listeden çıkarma, içe aktarma.
- Yığın sınırı 100 adım. Undo, seçimi ve aktif hücreyi o adımın yerine taşır.
- `applyResult()` ve **Discard** yığını temizler (kaydedilmiş satır geri alınamaz; kısmi kayıtta hatalı satırların düzenlemesi korunur ama geri alınamaz).

## 13. Excel'den içe aktarma

İlke: dosya yalnızca grid'i doldurur; Save'e basılana kadar hiçbir şey kaydedilmez.

Dialog 560 px, başlık “Import from Excel”, açıklama: “Rows are matched by SKU: a known SKU updates its product, a new SKU becomes a new row. Everything lands in the grid for review first.”

1. **Dosya:** sürükle-bırak veya seç (`.xlsx`, `.xls`, `.csv`). Seçilince dosya kartı: XLS ikonu · ad · “Sheet “Fiyatlar” · 1,252 rows” · **Replace file**. Birden çok sayfa varsa sayfa seçici.
2. **Başlık satırı** (`detectHeaderRow`): paket ham satırlardan başlığı otomatik seçer — ilk 20 satır içinde, boş olmayan hücre sayısı en yüksek ve hücrelerinin çoğu metin olan ilk satır; eşitlikte ilk boş olmayan satır. Eşleşme satırının sağındaki **Header row** select'i (“Row 1”) tespit edilen satırla gelir; kullanıcı değiştirebilir, değişince sütun eşleme tablosu yeniden kurulur ve önceki elle seçimler sıfırlanır. Tespit dosya biçiminden bağımsızdır (.xlsx ve .csv aynı yol).
3. **Eşleşme anahtarı:** “Match rows by **SKU ← “Stok Kodu”**”. Anahtar eşlenmeden **Apply pasif**.
4. **Sütun eşleme tablosu** (`matchColumns`): Excel column → Field (yerel `select`; tasarımdaki özel liste yerine, klavye ve ekran okuyucu için) · First value (dönüşüm önizlemesiyle: `1.650,00 → 1,650.00`, `%20 → 20%`). Otomatik eşleme yalnızca **tek ve kesin** eşleşmede: başlık, normalize edilerek (küçük harf, baştaki/sondaki ve ardışık boşluklar, Türkçe karakterler `ı→i, ş→s` …) sütunun `header`, `id` veya `importAliases` değerlerinden biriyle aynıysa. Eşleşmeyen ya da birden fazla alana uyan sütunun select'i **boş** kalır (“Choose a field”, `import.chooseField`); kullanıcı elle seçer. Otomatik eşlemeler de değiştirilebilir. Seçenekler: alanlar · “Don't import”. Boş bırakılan sütun Apply'da alınmaz (Don't import gibi). Read-only alanlara eşleme yapılamaz (listede pasif). Başlık tespiti ve sütun eşleme ayrı saf fonksiyonlardır (01, `sheet/import/`), ayrı test edilir.
5. **Özet** (info banner): “**1,240** update existing products · **12** new SKUs · See new SKUs” + checkbox “Add the 12 new SKUs as new rows” (varsayılan açık).
6. Cancel · **Apply to grid**.

Uygulama kuralları:

- Listede olan anahtar → o satırın eşlenen hücreleri güncellenir (normal **Changed** durumu).
- Listede olmayan anahtar → `lookupKeys` → sunucuda varsa **Update** satırı eklenir (§9 doldurma kuralıyla), yoksa (checkbox açıksa) **New** satırı.
- **Excel'deki boş hücre mevcut değeri silmez** (atlanır). Bir değeri bilerek boşaltmak için grid'de temizlenir.
- Dosyada aynı anahtar iki kez → ikisi de içe alınır ve **duplicate** hatası alır (§9).
- Sayı/tarih hücreleri Excel'den tipli gelirse olduğu gibi; metin olarak gelirse §7'deki yerel ayar kuralı.
- `maxRows` aşılırsa Apply pasif ve uyarı: `sheet.limitFile`: “This file would make 11,252 rows. The limit is 10,000.”
- İçe aktarma **tek undo adımı**. Sonrasında toast: “Imported 1,252 rows · 1,240 updated · 12 new · Undo”.

## 14. Kaydetme: teslim ve sonuç

Paket kaydetmez; `@save` ile değişiklikleri teslim eder, `saving` prop'u ile ilerlemeyi gösterir, `applyResult()` ile sonucu işler. HTTP, chunk'lama, zaman aşımı ve yeniden deneme uygulamanındır (§16'daki tarif).

### Başlatma

- `⌘S` (odak sheet içindeyken) veya **Save changes**. Değişiklik yoksa pasif.
- **Hatalı satır varsa** önce dialog (`alertdialog`): “**1 row has errors** — It won't be sent. The other 95 changed rows will be saved.” · **Fix first** (Errors görünümüne geçer, ilk hataya gider) · **Save 95 rows**. Uyarılar dialog açmaz.
- Paket `save` olayını yayar: `{ rows: SheetChangeRow[] }` — gutter sırasıyla; **create** satırı anahtar + tüm dolu alanlar, **update** satırı anahtar + yalnızca değişen alanlar (kısmi güncelleme; başkasının aynı anda değiştirdiği diğer alanları ezmez). Hatalı ve listeden çıkarılan satırlar yoktur. Aynı yük `getChanges()` ile de alınabilir.

### Uygulama kaydederken (`saving` prop'u)

- Uygulama `saving: true` veya `{ done, total }` verir; grid **salt okunur** (kaydırma, Find ve seçim serbest). Toolbar'ın yerini ilerleme şeridi alır: “**Saving… 4,800 of 9,600 rows**” + 6 px ilerleme çubuğu (`role="progressbar"`). Sayaç verilmezse belirsiz çubuk.
- Save butonu spinner + “Saving…”, Discard pasif. Stop, ETA, chunk sayacı ve çevrimdışı banner'ı uygulamanın kendi arayüzündedir; paket bunları göstermez.

### Satır sonuçları (`applyResult(results)`)

Uygulama her chunk'ın yanıtı için ya da tümü için bir kez çağırır.

| Sonuç | Satıra ne olur |
|---|---|
| `created` | Taslak silinir, işaretler kalkar; satır artık “yüklenmiş” (anahtar salt okunur, `New` etiketi gider). `row` döndüyse değerler onunla, dönmediyse taslağın uygulanmış haliyle güncellenir. |
| `updated` | Taslak silinir; `row` döndüyse onunla güncellenir. |
| `error` | Değişiklikler **kalır**; `fieldErrors` ilgili hücrelerde kırmızı, `rowError` anahtar hücresinde ve gutter tooltip'inde. Kullanıcı hücreyi düzenleyince o hücrenin sunucu hatası temizlenir. |

- Kaydedilen değerler sunucu doğrulaması gelene kadar paketin `base` katmanında yaşar; uygulama `rows`'u yenileyince gelen anahtarlar için `base` düşer (sunucu artık doğruluk kaynağı), taslaklar kalır. **Uygulama eski veya gecikmiş bir `rows` verirse kaydedilen değerler geri gelmez** (test edilir).
- Undo/redo yığını temizlenir.

### Bitiş durumları

| Durum | Görünüm |
|---|---|
| **Saved** | Status bar: “**96 rows saved** · 24 created · 72 updated”, ardından “No changes”. Toast uygulamanın kararıdır. |
| **Partly saved** | Toolbar altında kırmızı banner (`role="alert"`): “**3 rows couldn't be saved.** 9,597 rows were saved.” · **Copy errors**. Görünüm otomatik **Errors**'a geçer, aktif hücre ilk hatada, `1 of 3` gezinme. Copy errors → TSV, başlık satırı `Row` · anahtar sütunun adı · `Column` · `Message` (`sheet.err.*` anahtarları). |
| Taşıma hatası (ağ, 5xx, 401/403) | Uygulama `saving`'i düşürür ve kendi mesajını gösterir; hiçbir satır `applyResult` almadıysa taslaklar olduğu gibi kalır, kullanıcı tekrar kaydeder. |

### Sayfadan ayrılma

- Değişiklik varken: `beforeunload` + uygulama yönlendirici koruması (`isDirty()`). Dialog: “**Leave without saving?** 128 changes in 96 rows will be lost.” · Stay · **Discard changes** (kırmızı).
- `saving` sürerken ayrılma uyarısı uygulamanındır (chunk durumu paket tarafından bilinmez).

### Discard (`reset()`)

Onay dialog'u: “Discard 128 changes in 96 rows?” · Keep editing · **Discard changes**. Tüm satırlar yüklendiği hale döner, eklenenler gider, çıkarılanlar geri gelir, yığın temizlenir.

## 15. Açılış

- Uygulama satırları yükler ve `rows` + `loading` verir; sayaç biçimi (`{ done, total }`) kartın üstünde ilerleme şeridi çizer: “Loading products…” · sağda `6,200 of 10,000` · 6 px çubuk; altında skeleton satırlar.
- **Düzenleme `loading` false olunca başlar** (anahtar tekilliği ve filtreler eksik veriyle yanıltıcı olur).
- Yükleme hatası uygulamanın banner'ıdır (DataSheet'in `error` prop'u yoktur); uygulama kaldığı sayfadan devam edip `rows`'u tamamlar.
- Satır sayısı `maxRows`'u aşarsa ilk `maxRows` kullanılır ve uyarı: “Showing the first 10,000 products. Narrow the selection to edit the rest.” (Hangi ürünlerin yükleneceğini uygulama URL parametreleriyle daraltır.)

## 16. Uygulama tarafı: Laravel tarifi (öneri)

Paket sözleşmesi `@save` → `SheetChanges` ve `applyResult(SheetRowResult[])`'tır; aşağıdaki HTTP biçimi ve chunk'lama **uygulamanın** tarifidir (playground'daki sahte API bunu uygular).

### `@save` işleyicisi (uygulama)

```ts
async function onSave(changes: SheetChanges) {
  saving.value = { done: 0, total: changes.rows.length }
  for (const chunk of chunksOf(changes.rows, 500)) {            // sıralı; bir sonraki, öncekinin yanıtı gelince
    const { data } = await http.post('/api/products/bulk-upsert', { key: 'sku', rows: chunk })
    sheet.value!.applyResult(data.results.map(toRowResult))     // snake_case → SheetRowResult
    saving.value = { done: saving.value.done + chunk.length, total: changes.rows.length }
  }
  saving.value = false
}
```

Zaman aşımı, yeniden deneme (upsert anahtarla yapıldığı için aynı chunk'ı tekrar göndermek güvenlidir), Stop ve ETA bu fonksiyonun içindedir.

### İstek — her chunk bir istek

`POST /api/products/bulk-upsert`

```json
{
  "key": "sku",
  "rows": [
    {
      "client_id": "r_10001",
      "key": "HC-125-S",
      "op": "create",
      "values": { "sku": "HC-125-S", "name": "Hydraulic cylinder HC-125", "category": "hydraulics", "unit": "pcs", "list_price": 2780.00, "vat": 20, "active": true }
    },
    {
      "client_id": "r_418",
      "key": "GH-310-AL",
      "op": "update",
      "values": { "list_price": 344.00 }
    }
  ]
}
```

### Yanıt — **200**, satır başına sonuç (bir satırın hatası chunk'ı düşürmez)

```json
{
  "results": [
    { "client_id": "r_10001", "status": "created", "row": { "id": 88213, "sku": "HC-125-S", "name": "Hydraulic cylinder HC-125", "list_price": 2780.00 } },
    { "client_id": "r_418", "status": "error", "field_errors": { "barcode": "Barcode is already used by HC-080-S" }, "row_error": null }
  ]
}
```

### Sunucu notları

- Her satırı **bağımsız** işleyin: satır başına doğrulama (`Validator::make`), satır başına transaction veya savepoint. Bir satırın hatası diğerlerini geri almamalı.
- Eşleme **anahtara göre**: `op` ipucudur; sunucu anahtarı kendisi arar (bu arada başka biri oluşturmuş olabilir). Var → güncelle, yok → oluştur. Hiçbir koşulda silme yok.
- `update` satırlarında yalnızca gelen alanları güncelleyin (`fill($values)`); gelmeyen alanlara dokunmayın. `null` gelen alan bilerek boşaltılmıştır.
- Eloquent `upsert()` toplu ve hızlıdır ama model olaylarını tetiklemez ve satır başına hata döndüremez; satır sonucu gerektiği için `firstOrNew` + `save()` döngüsü (chunk içinde) önerilir.
- Benzersizlik çakışmaları (barcode vb.) alan hatası olarak dönmeli, 500 değil.
- İstek başına en fazla 500 satır (uygulamanın chunk boyutu); üstü **413**.
- Ek uç noktalar: `GET /api/products/sheet?page=` (yükleme, `total` alanı ile), `POST /api/products/lookup-keys` → `{ "HC-125-S": null, "GH-310-AL": { …kayıt } }` (`lookupKeys` callback'i bunu çağırır).

## 17. Telefonda (D14)

- **< 768 px veya yalnızca dokunmatik** (`(any-pointer: fine)` eşleşmiyorsa): salt okunur.
- Banner: “**Editing needs a larger screen.** You can search and look at products here; changes are made on a computer.” · **Copy link**.
- Anahtar sütunu sabit (104 px) + kalan sütunlar yatay kayar. Find ve Filter çalışır; seçim aralıkları, düzenleme, Add row, Import, Save yok. Footer: “10,000 products · Read-only”. Satır yüksekliği 44 px.
- Karar **açılışta** verilir. Masaüstünde pencere sonradan daralırsa düzenleme kapanmaz (veri kaybı riski yok), yalnızca yatay kaydırma artar.

## 18. Performans

- Depo, uygulamanın `rows` dizisine dokunmaz: `draft: Map<rowKey, Map<columnId, value>>` (hücre başına, `Map.has` ile — bilinçli `null` korunur), `base: Map<rowKey, Row>` (kayıt sonrası sunucu satırı), `errors`, `added` (clientId), `removed`. Tek okuyucu: taslak → base → rows; render, doğrulama, filtre ve kopyalama aynı okuyucuyu kullanır. Komut yığını `{ label, patches: [{ key, col, before, after }] }`, 100 adım. Sayaçlar artımlı güncellenir.
- Satır dizisinin kimliği yalnızca ekle/çıkar/sırala'da değişir (TanStack row model 10k satırda ~12 ms), tuş başına değil.
- Satırlar sanal; 30+ sütunda sütun sanallaştırma da açılır.
- Doğrulama yalnızca değişen satır için; 1.000 satırlık yapıştırmada doğrulama bir `requestIdleCallback` dilimine bölünür, hücreler önce “doğrulanıyor” olmadan değerle görünür.
- Bütçeler: 01 · Performans.

## 19. Klavye (özet — tamamı 08)

| Tuş | Eylem |
|---|---|
| ↑ ↓ ← → · Tab | Hareket |
| F2 · ↵ · Esc | Düzenle · onayla · iptal |
| ⇧ + oklar | Seçimi genişlet |
| ⌘C · ⌘X · ⌘V | Kopyala · kes · yapıştır |
| ⌘D | Aşağı doldur |
| Delete | Hücreleri temizle |
| ⌘Z · ⌘⇧Z | Geri al · yinele |
| F8 · ⇧F8 | Sonraki · önceki hata |
| ⌘S | Kaydet (`@save`) |
| ⌘F | Find in grid |
| ⌘− | Listeden çıkar |
| ⌘A | Görünür tüm hücreler |
| Home / End · ⌘Home / ⌘End | Satır başı/sonu · tablo başı/sonu |
| PageUp / PageDown | Bir ekran yukarı/aşağı |
