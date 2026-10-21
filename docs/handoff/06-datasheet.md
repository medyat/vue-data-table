# 06 · DataSheet

Davranış: brief §8. Tasarım: **T11 · DataSheet** (T11-01 … T11-07) ve **T12 · Saving & import** (T12-01 … T12-12). Örnek: “Bulk edit products”, 10,000 ürün, anahtar SKU, yoğunluk **Compact**, dikey çizgiler açık.

## 1. Düzen

Kart ekranı doldurur (sayfa dolgusu 16, başlık satırı 24 px, aralık 12). Kart içinde dikey sıra:

| Bölge | Yükseklik | Not |
|---|---|---|
| Toolbar | 52 | §2; açılış ve kayıt sırasında ilerleme şeridine döner (§9) |
| Şerit | 40 | yalnızca kısmen kaydedildi (kırmızı) veya satır sınırı (amber) |
| Filtre satırı | 44 | yalnızca filtre varken; çip + sabit not |
| Formül çubuğu | 36 | §4 |
| Header | 32 | `--dt-surface-2`, 11.5 / 500 `--dt-text-2` |
| Izgara | kalan | satır 32 |
| Status bar | 36 | §6 |

**Sütunlar** (örnek): `56px 128px minmax(220px,1.4fr) 148px 64px 116px 116px 72px 92px 100px 84px` = gutter · SKU · Product name * · Category * · Unit · List price * · Cost · VAT · Min stock · Lead time `d` · Active. Gutter, SKU ve ad sola sabit.

Header: anahtar sütunda `Lock` 12 `--dt-text-3` + tooltip “Match key — an existing SKU updates that product, a new SKU creates one”; zorunlu sütunda kırmızı `*` (`--dt-r-dot`, `aria-label="required"`); birim soluk 400 `--dt-text-3` (“Lead time d”); sıralı sütunda `--dt-text` + ok; sayısal sütunlar sağa yaslı.

## 2. Toolbar

52 px, dolgu `10px 10px 10px 12px`, aralık 4, tek satır.

| Öğe | Değer |
|---|---|
| Find in grid | **188 × 32** (S11), `⌘F` kbd sağda |
| Filter | 32 px; filtre varken aktif filtre stili + sayaç; yokken ikincil |
| Ayırıcı | 1 × 20 `--dt-line`, `0 3px` |
| All / Changed / Errors | sayaçlı segmented ([02 §3](02-ortak-bilesenler.md)); Errors > 0 iken kırmızı |
| Undo / Redo | 28 × 32 ikon düğme, `--dt-text-2`; yığın boşsa `--dt-line-3` + `aria-disabled="true"` (odaklanabilir kalsın; tasarımda Redo `disabled` ile çizildi) |
| Add row · Import Excel · Export | 32 px ghost, ikon `--dt-text-2` + etiket 13 / 500; Export menü açar (All rows / Visible rows › Excel / CSV), görsel chevron yok |
| Display | 32 × 32 ikon (`SlidersHorizontal`) |
| Kayıt kontrolleri (sağda) | 6 px `--dt-accent` nokta + “**128** changes in 96 rows · 1 new” (12.5 `--dt-text-2`, sayı 600 `--dt-text`) · **Discard** (ghost, `--dt-text-2`) · **Save changes** (birincil, `Check` 16; `⌘S` yalnızca tooltip'te) |

**Değişiklik yokken** (T12-03, T12-08): nokta yok, “No changes” `--dt-text-3`; Discard `--dt-line-3`; Save `--dt-surface-3` zemin, `--dt-text-3`, gölgesiz. Düğmeler yerinde kalır (düzen zıplamaz). Import dialog'u açıkken Import Excel düğmesi `--dt-surface-3` zeminli; Discard dialog'u açıkken Discard da.

## 3. Filtre satırı

44 px, dolgu `0 12px`, aralık 12: çip (28 px, ör. “Category · is any of · 6 categories”) + sabit not “Filters only change what you see — hidden rows keep their edits.” 12.5 `--dt-text-3`.

## 4. Formül çubuğu

36 px, üstte 1 px `--dt-line`, 12.5 px.

| Parça | Değer |
|---|---|
| Ad kutusu | 240 px, dolgu `0 12px`, sağ kenar çizgili: aktif satırın anahtarı mono 12 / 500 + “·” + sütun adı `--dt-text-2`; aralıkta “5 × 1 cells” |
| fx | 40 px, yalnızca simge (italik serif “fx”, `--dt-text-3`); formül desteklenmez |
| Değer | ham değer, `tabular-nums` |
| İpucu | sağda 12 `--dt-text-3`: tip · birim · zorunluluk · sınır (“Currency · TRY · required · ≥ 0”, “Percentage · required · 0–100”, “Option · required”, “Text · required”). Kaydederken: `Lock` 12 + “Read-only while saving” (S7) |

## 5. Izgara ve hücre durumları

Satır 32 px, hücre dolgusu 10, 12.5 px; her hücrenin sağ ve alt kenarı 1 px `--dt-line`.

**Gutter** (56 px, sabit, `--dt-surface-2`, header hücresi `--dt-surface-3`, `role="rowheader"`): dolgu `0 5px 0 4px`; solda 13 px işaret yuvası, sağda satır no mono 11 `--dt-text-3`, binlik ayırıcısız (S12). İşaretler: değişti 6 × 6 kare (yarıçap 1.5) `--dt-accent` · hata 13 px `WarningCircle` `--dt-r-dot` · yeni 13 px `Plus` `--dt-accent` · filtreye uymuyor üstü çizili huni ikonu, soluk + tooltip “Doesn't match filters”.

**Anahtar hücresi** (SKU, 128): mono 12 / 500; yeni satırda `--dt-accent-soft` zemin + sağda “New” etiketi; sunucuda var olan anahtarda `--dt-surface-3` zemin + “Update” etiketi ([02 §4](02-ortak-bilesenler.md)).

| Durum | Görünüş | Not |
|---|---|---|
| Editable | normal | `cursor: cell` |
| Read-only | `--dt-surface-2` zemin, `--dt-text-2`; hover/aktifken sağda `Lock` 12 (`role="img" aria-label="Read-only"`) | kilit için yatay dolgu 26 |
| Active | `inset 0 0 0 2px var(--dt-accent)` + sağ altta fill handle: 7 × 7 `--dt-accent`, 1.5 px `--dt-surface` kenar, hücrenin 4 px dışına taşar | |
| In selection | `--dt-accent-soft` zemin; aralığın dış kenarlarında 1.5 px `--dt-accent` (inset gölgelerle) | Status bar'da Count / Sum / Average |
| Editing | `--dt-surface` zemin, `inset 0 0 0 2px accent` + `--dt-shadow-editing`, üst katmanda (z 2); imleç görünür | gölge değeri yaklaşık |
| Changed | `--dt-accent-soft` zemin + sağ üstte 7 px köşe üçgeni `--dt-accent` | hover tooltip “Was 89.00 · ⌘Z” (`--dt-tip-bg`) |
| Error | `--dt-r-bg` zemin + `inset 0 0 0 1.5px var(--dt-r-dot)` + kırmızı köşe | balon (aşağıda) |
| Warning | `--dt-a-bg` zemin + `--dt-a-dot` köşe | balon koyu (`--dt-tip-bg`): “Price changed by more than 40%” |
| Required, empty | hata kalıbı + hücrede “Required” 12 / 500 `--dt-r-fg` | |
| Doesn't match filters | satır `opacity: .55` + gutter'da üstü çizili huni | bir sonraki sorguya kadar kalır |
| Fill target | 1.5 px kesik `--dt-accent` sol/sağ kenar, son hücrede alt kenar | etiket “Fill 4 cells with 10%” |

Öncelik: Error > Warning > Changed. Renk tek başına anlam taşımaz (zemin + köşe + gutter işareti).

**Hata balonu:** hücrenin üstünde (ilk görünür satırdaysa altında), sol kenarı hücreyle hizalı, 6 px ara; dolgu `7px 10px` (T11-06 panosunda `6px 9px`; ekrandaki değer esas), yarıçap 6, `--dt-error-tip-bg`, `#FFFFFF` 12 / 500, `--dt-shadow-tip`, en çok 280 px. Hover veya aktifken görünür.

**Doldurma etiketi:** son hedef hücrenin sağında 10 px, hücrenin alt kenarı üzerinde dikeyde ortalı (`bottom: -14px`); 26 px, dolgu `0 9px`, yarıçap 6, `--dt-tip-bg` / `--dt-tip-fg`, 12 / 500.

## 6. Status bar

36 px, dolgu `0 12px`, aralık 14, `--dt-surface-2`, üstte 1 px `--dt-line`, 12.5 `--dt-text-2`.

| Sol (sırayla, olanlar) | Sağ |
|---|---|
| “10,000 rows” `--dt-text` · ■ “128 changes in 96 rows” (7 px kare `--dt-accent`, yarıçap 1.5) · “1 new row” · ■ “2 errors — go to” (kare `--dt-r-dot`, metin `--dt-r-fg` 500 altı çizili, F8 ile aynı) | seçim özeti: “Count 5  Sum 1,153.50  Average 230.70” (etiket `--dt-text-3`, değer `--dt-text`); yalnızca sayısal hücre varken, tek hücrede gizli |

Kayıt sonucu (T12-03): ✓ (`Check` 14 `--dt-g-dot`) + “96 rows saved” 500 `--dt-text` · “1 created · 95 updated”. Açılışta “Loading…” `--dt-text-3`.

## 7. Editörler (T11-07)

Editörler filtre değer girişleriyle aynı bileşenlerdir; hücrenin yerinde açılır (2 px accent çerçeve).

| Editör | Görünüş |
|---|---|
| Metin | hücre içinde input; uzun metin daha uzun kutu açar, `⇧↵` yeni satır; “=…” metin olarak kalır |
| Sayı / para | sağa yaslı; para kodu soluk sağda (“2.240,00 TRY”). `2240`, `2.240,00`, `2,240.00` → `2,240.00` (örnekler mono kbd kutularında) |
| Seçenek (combobox) | yazmak listeyi daraltır; liste hücrenin altında, sağa hizalı popover (eşleşen rozetler, seçili satır `--dt-surface-3`, `↵` işareti). Listede olmayan değer (Tab/yapıştırma ile) hata olur; balon “"Pump" isn't an option” + içinde **Use Pumps** düğmesi (24 px, `--dt-bulk-line` zemin, beyaz 12 / 600) |
| Tarih | yazılabilir (“24.10”, “+7d”, “today”) + takvim simgesi; seçici popover'ı: üstte çözümlenen tarih “Wed, Oct 28” + “in 7 days” (`--dt-accent-soft` şerit), ay takvimi, bugün kenarlı, seçili gün `--dt-accent` |
| Yes / No | `Space` değiştirir; popover ve düzenleme modu yok; değişiklik hemen sayılır (köşe + undo) |
| Tags / çoklu | hücre içinde chip'ler (`X`'li outline tag) + yazma alanı; altta öneri listesi (eşleşen harfler 600); Backspace son chip'i siler |

## 8. Doldurma, yapıştırma, hücre menüsü, çıkarma

- **Doldurma** (T11-02): kaynak aktif hücre (fill handle), hedefler kesik çerçeve, etiket “Fill 4 cells with 10%”.
- **Yapıştırma** (T11-04): yapıştırılan aralık seçili (dış kenar 1.5 px accent); seçenek olmayan değerler hücre hatası; toast: “**Pasted 5 rows × 3 columns** · 2 values aren't options (`--dt-bulk-warn`) · **Review** (`--dt-bulk-link`) │ Undo `⌘Z`”. Toast kartın altında ortada, alttan 52 px.
- **Hücre menüsü** (T11-03, 236 px, sağ tıklanan noktada açılır): Cut `⌘X` · Copy `⌘C` · Paste `⌘V` · Fill down `⌘D` · Clear contents `Del` · ayırıcı · Insert row above · Insert row below · Remove from list `⌘−` · ayırıcı · Open product. Kısayollar mono 11 `--dt-text-3`.
- **Listeden çıkarma** (T11-05): satır kaybolur, satır sayısı “9,999 rows”; toast “Row 7121 removed from this list. The product isn't deleted.” │ Undo. Nötr renk (kırmızı değil).

## 9. Açılış ve kayıt (T12)

### 9.1 İlerleme şeridi

Toolbar araçlarının yerini alır; kayıt kontrolleri sağda kalır. Solda etiket 600 + sayaç `--dt-text-2` (“**Loading products…** 6,200 of 10,000” / “**Saving…** 4,800 of 9,600 rows”), 10 px sonra 320 × 6 ilerleme çubuğu ([02 §7](02-ortak-bilesenler.md)); sayaç yoksa çubuk belirsiz.

| | Açılış (T12-07) | Kaydetme (T12-02) |
|---|---|---|
| Kayıt kontrolleri | “No changes”, düğmeler pasif | sayaç gizli; Discard pasif; Save mürekkep, `CircleNotch` + “Saving…”, `aria-disabled` |
| Formül çubuğu | boş | aktif hücre + kilit ipucu (S7) |
| Header | sıralama oku yok | sıralama oku görünür |
| Izgara | skeleton satırlar (gutter'da kısa çubuk, metin çubukları, kategori ve Active için hap) | satırlar okunur; kaydırma, Find, seçim serbest; düzenleme yok (`aria-readonly="true"`, `aria-busy="true"`) |
| Status bar | “Loading…” | “10,000 rows · 19,200 changes in 9,600 rows” |

Stop, ETA, parça sayacı ve çevrimdışı banner'ı uygulamanındır.

### 9.2 Sonuç

- **Saved** (T12-03): işaretler kalkar, yeni satır sıradan satır olur (numarası 10001 kalır); undo yığını temizlenir (Undo pasif); status bar sonucu gösterir, sonra “No changes”.
- **Partly saved** (T12-04): toolbar altında 40 px kırmızı şerit `role="alert"`: `WarningCircle` · “**3 rows couldn't be saved.** 9,597 rows were saved.” · sağda `CaretUp` / “1 of 3” / `CaretDown` (28 px, `aria-label` Previous error (⇧F8) / Next error (F8)) · ayırıcı (`--dt-r-line`) · **Copy errors** (`Copy` 14, 600). Görünüm otomatik **Errors** segmentinde; aktif hücre ilk hatada, balon açık; status bar “6 changes in 3 rows · 3 errors — go to”. Copy errors TSV verir: Row · SKU · Column · Message.

### 9.3 Satır sınırı (T12-08)

Amber şerit (40 px, `--dt-a-line` üst çizgi): `Warning` · “Showing the first 10,000 products. Narrow the selection to edit the rest.” Eylem düğmesi yok (daraltma uygulamanın önceki ekranında).

## 10. Dialog'lar (T12)

Ortak: `alertdialog`, 460 px (hatalı satır listesiyle 480; tasarımda 440 çizildi, 02 geçerli), dolgu 20, yarıçap 14, `--dt-scrim` tüm sayfanın üstünde. İlk odak güvenli düğmede.

| Dialog | Başlık | Gövde | Düğmeler |
|---|---|---|---|
| Save with errors (T12-01) | “1 row has errors” | “It won't be sent. The other 95 changed rows will be saved.” + hatalı satır kutusu (36 px, `--dt-surface-2`, 1 px `--dt-line`, yarıçap 8: `WarningCircle` · satır no mono 11.5 `--dt-text-3` · SKU mono 12 / 500 · mesaj `--dt-text-2` `…`) | **Fix first** (ilk odak) · Save 95 rows (birincil) |
| Leave (T12-05) | “Leave without saving?” | “128 changes in 96 rows will be lost.” | **Stay** · Discard changes (danger) |
| Discard (T12-06) | “Discard 128 changes in 96 rows?” | “The sheet goes back to how it was loaded. This can't be undone.” (S9) | **Keep editing** · Discard changes (danger) |

Uyarılar dialog açmaz.

## 11. Import from Excel (T12-09/10/11)

Dialog 560, `role="dialog"`, ekranın üstünden ~80–250 px (içeriğe göre). Yapı: başlık bloğu (dolgu `18px 14px 0 20px`; “Import from Excel” 16 / 600 + açıklama 13 `--dt-text-2`; sağda 32 px kapat) · gövde (dolgu `16px 20px 20px`, aralık 16) · alt (dolgu `14px 20px`, üstte 1 px `--dt-line`; Cancel · **Apply to grid**).

| Durum | Gövde |
|---|---|
| Dosya yok (T12-10) | bırakma alanı 176 px: 1.5 px kesik `--dt-line-3`, yarıçap 10, `--dt-surface-2`; ortada 40 px ikon kutusu (`UploadSimple`) + “Drop an .xlsx, .xls or .csv file, or **choose one**” (link `--dt-accent-text`). Apply pasif |
| Eşlenmiş (T12-09) | dosya kartı · eşleşme satırı · eşleme tablosu · özet; Apply aktif |
| Anahtar seçilmemiş (T12-11) | anahtar select'i amber (`--dt-a-dot` kenar + `0 0 0 3px var(--dt-a-bg)`) ve boş (“Excel column” `--dt-text-3`); altında `WarningCircle` (`--dt-a-dot`) + “Choose the column that holds SKU.” 12.5 `--dt-a-fg`; özet yok; Apply pasif. Örnekte alan listesi açık |

**Dosya kartı:** dolgu `10px 10px 10px 12px`, 1 px `--dt-line`, yarıçap 10, `--dt-surface-2`; 36 px ikon kutusu (yarıçap 8, `--dt-g-bg` / `--dt-g-fg`, `Table`) · dosya adı 500 · altında sayfa seçici “Sheet "Fiyatlar" · 1,252 rows” + `CaretDown` (birden çok sayfa varsa) · sağda **Replace file** (30 px ikincil).

**Eşleşme satırı:** solda “Match rows by” (12.5 / 500): anahtar alanı hapı (30 px, `--dt-surface-3`, yarıçap 7, `Lock` + “SKU” mono 12 / 500) · `ArrowLeft` 14 · Excel sütunu select'i (200 × 30, ör. “Stok Kodu”). Sağda **Header row** select'i (104 × 30, “Row 1”): otomatik tespit edilen başlık satırıyla gelir (07 §13); değiştirilince eşleme tablosu yeniden kurulur.

**Eşleme tablosu:** 1 px `--dt-line`, yarıçap 10. Sütunlar `132px 22px 182px 1fr` = Excel column · → · Field · First value. Header 32 px `--dt-surface-2` 12 / 500. Satırlar 38 px.

| Satır tipi | Field | First value |
|---|---|---|
| Anahtar | statik: “SKU” mono + “match key” `--dt-text-3` | `HC-080-S` |
| Eşlenmiş | select 166 × 28 (yarıçap 7, `--dt-shadow-sm`) | ham değer `--dt-text-3` → çözümlenmiş 500: `1.650,00 → 1,650.00`, `%20 → 20%`; değişmiyorsa yalnızca değer |
| Alma | select “Don't import” `--dt-text-3`; Excel sütun adı da `--dt-text-3` | ham değer `--dt-text-3` |
| Eşleşmeyen (çizilmedi) | select boş, placeholder “Choose a field” `--dt-text-3`; otomatik eşleme yalnızca tek ve kesin eşleşmede (07 §13), boş bırakılan sütun Apply'da alınmaz | ham değer `--dt-text-3` |

**Alan listesi** (T12-11, 220 px, select'in altında): Don't import · ayırıcı · alanlar (30 px öğeler, seçili olanda solda `Check` `--dt-accent`, vurgulu öğe `--dt-surface-3`); salt okunur alan pasif `--dt-text-3` + sağda `Lock` + “Read-only”. Anahtar alan listede yoktur (yukarıda seçilir).

**Özet:** `--dt-accent-soft`, yarıçap 8, dolgu `10px 12px`: `Info` `--dt-accent` · “**1,240** update existing products · **12** new SKUs” · **See new SKUs** (link); altında checkbox “Add the 12 new SKUs as new rows” (işaretli).

Sonrası (çizilmedi, metin hazır): toast “Imported 1,252 rows · 1,240 updated · 12 new · Undo”; `maxRows` aşılacaksa “This file would make {count} rows. The limit is {max}.”

## 12. Telefon: salt okunur (T12-12)

< 768 px veya yalnızca dokunmatik; karar açılışta.

| Parça | Değer |
|---|---|
| Başlık | geri 44 + “Bulk edit products” 18 / 600 (uygulamanın) |
| Banner | `--dt-accent-soft`, yarıçap 12, dolgu 14; `Monitor` 20 `--dt-accent` · “Editing needs a larger screen.” 14 / 600 · “You can search and look at products here; changes are made on a computer.” 13.5 `--dt-text-2` · **Copy link** (36 px ikincil, `Link`) |
| Arama satırı | Find in grid 44 px (yarıçap 10, 15 px) + Filter 44 × 44 |
| Izgara | kart (üst köşeler 12); header 36 `--dt-surface-2`; SKU sabit 104 (mono 12.5 / 500, header'da `Lock`); Product name 200 · Category 128 · List price 104 kayar; sağ kenarda 40 px solma; satır 44 px; gutter ve işaret yok |
| Footer | 48 px `--dt-surface-2`: “10,000 products” · `Lock` 14 + “Read-only” (`sheet.readOnly.total`, `sheet.readOnly.badge`) |
| Yok | seçim aralığı, düzenleme, Add row, Import, Save |

## 13. Erişilebilirlik

- Izgara `role="grid"`, `aria-rowcount` toplam satır; gutter `rowheader`, hücreler `gridcell`, salt okunurlarda `aria-readonly="true"`. Kayıt sırasında ızgarada `aria-readonly` ve `aria-busy`.
- Toolbar `role="toolbar"`; segmented `role="radiogroup" aria-label="Show rows"`; Undo/Redo `title` ile kısayol.
- Formül çubuğu değer alanı düzenlenebilir; ad kutusu okunur metin.
- Gutter işaretleri `role="img"` + `aria-label` (“changed”, “has errors”, “new row”).
- Hata balonu `role="tooltip"`; doldurma etiketi `role="status"`.
- Status bar `role="status" aria-label="Sheet status"`; seçim özeti `aria-label="Selection summary"`.
- İlerleme `role="progressbar"` + `aria-valuenow`; duyurular `sr.savingPercent` / `sr.loadingPercent`.
- Klavye: brief §8.13.
