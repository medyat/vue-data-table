# 02 · Ortak bileşenler

DataTable ve DataSheet'in paylaştığı parçalar. Tasarım: **T1 · List screen › T1-06 Components**, **T8 · Cell types**, ayrıca her sayfadaki örnekler. Davranış kuralları brief §5'te; burada görünüş ve durumlar var.

## 1. Butonlar

Hepsi `display: inline-flex`, ikon ile metin arası 6 px, ikon 16 px, metin 13 / 500. Yarıçap yüksekliğe göre: 32 px → 7, 28 px → 6, 24 px → 5.

| Varyant | Yükseklik | Dolgu (sol ikon varsa) | Zemin / kenar / metin | Gölge | Kullanım |
|---|---|---|---|---|---|
| Birincil (mürekkep) | 32 | `0 12px 0 10px` (ikonsuz `0 12px`) | `--dt-ink` / `--dt-ink` / `--dt-on-ink` | `--dt-shadow-sm` | New order, Save view, Save changes, Apply to grid. **Asla accent mavi değil** |
| İkincil | 32 | aynı | `--dt-surface` / `--dt-line-2` / `--dt-text` | `--dt-shadow-sm` | Display, Cancel, Replace file, Clear search |
| Ghost | 28 (DataSheet toolbar'ında 32) | `0 8px` | şeffaf / şeffaf / `--dt-text-2` | yok | Add filter, Clear all, Discard (sheet) |
| Ghost küçük | 24 | `0 8px`, 12 / 500, yarıçap 5 | şeffaf / `--dt-text-2` | yok | Popover alt satırındaki Clear, Reset, Clear sort |
| Aktif filtre | 32 | `0 7px 0 10px` | `--dt-accent-soft` / `--dt-accent-soft-2` / `--dt-accent-text` | yok | Filter (n); sayaç rozeti 18 px, `--dt-accent` zemin, `--dt-on-accent` 11.5 / 600 |
| Yıkıcı | 32 | `0 12px` | `--dt-danger` / `--dt-danger` / `#FFFFFF` | `--dt-shadow-sm` | Delete, Discard changes, Cancel 3 orders (uygulama) |
| Pasif ikincil | aynı | aynı | `--dt-surface-2` zemin, 1 px `--dt-line` kenar, `--dt-text-3` | yok | Previous ilk sayfada, Next son sayfada |
| Pasif birincil | aynı | aynı | `--dt-surface-3` zemin ve kenar, `--dt-text-3` | yok | Save changes / Apply to grid değişiklik yokken |
| Pasif ghost / ikon | aynı | aynı | metin/ikon `--dt-line-3` | yok | Discard değişiklik yokken, Redo yığın boşken |
| İkon | 32 / 28 / 24 | kare | ikincil kalıp (32) veya şeffaf (28, 24) | 32'de `--dt-shadow-sm` | ⋯, Display (dar), arama (dar), hücre ve satır aksiyonları |

- **Hover:** ikincil ve ghost'ta zemin `--dt-surface-3`, 120 ms.
- **Klavye odağı:** `0 0 0 2px var(--dt-surface), 0 0 0 4px var(--dt-focus)`.
- **Dialog'un ilk odağı** güvenli düğmede (Cancel / Keep / Stay / Fix first); tasarımda bu yüzden odak halkasıyla çizildi.
- Sabit genişlikli buton yoktur; Türkçe metin ~%30 uzar.

## 2. Input ve arama

| Parça | Değer |
|---|---|
| Yükseklik | 32 (telefon 44, telefon araması 40) |
| Kenar / yarıçap | 1 px `--dt-line-2` / 7 (telefon 10) |
| Dolgu | metin 10; sol ikon varsa 32–34 |
| İkon | 14–16 px `--dt-text-3`, solda 10 px içeride |
| Placeholder | 13 / `--dt-text-3` |
| Odak | kenar `--dt-accent` + `0 0 0 3px var(--dt-focus-soft)` |
| Temizle (×) | 22 px ikon düğme, sağda 4–5 px; yalnızca değer varken |
| kbd ipucu | sağda 7 px; 18 px yükseklik, dolgu `0 5px`, `--dt-surface-3` zemin, `--dt-text-2`, mono 11 / 500 |

## 3. Segmented, switch, checkbox

**Segmented:** dış 32 (popover içinde 28 öğe), dolgu 2, yarıçap 8, zemin `--dt-surface-3`; öğe yarıçap 6, metin 12.5 / 500; seçili öğe `--dt-seg-on` zemin + `--dt-text` + `--dt-shadow-sm`. Seçili olmayan etiket: Display'deki Density'de `--dt-text-2`; sayaçlı varyantta (DataSheet All / Changed / Errors) `--dt-text`, sayı `--dt-text-3`; Errors > 0 iken etiket ve sayı `--dt-r-fg`.

**Switch:** 28 × 16, yarıçap 999, dolgu 2; kapalı zemin `--dt-line-3`, topuz 12 px `#FFFFFF` (iki temada da beyaz). Açık durum çizilmedi; öneri: zemin `--dt-accent`, topuz sağda.

**Checkbox:** 16 px (telefon listesinde de 16, dokunma alanı 44; telefon alt sayfası 20), yarıçap 4 (telefon alt sayfası 5), kenar 1.5 px.

| Durum | Görünüş |
|---|---|
| Off | `--dt-surface` zemin, `--dt-line-3` kenar |
| Hover | kenar `--dt-text-3` |
| On | `--dt-accent` zemin ve kenar, beyaz/`--dt-on-accent` onay işareti (Phosphor `Check`, 28 kalınlık) |
| Indeterminate | `--dt-accent` zemin, yatay çizgi |
| Klavye odağı | odak halkası kalıbı |

Dokunma alanı: masaüstünde hücrenin tamamı (40 px sütun), telefonda 44 px.

## 4. Rozet, tag, avatar

| Parça | Değer |
|---|---|
| Rozet | yükseklik yoğunluğa göre (24 / 22 / 20; popover listesinde 22; dialog listesinde 20), dolgu `0 8px`, yarıçap 999, 12 / 500, nokta 6 px + 6 px boşluk. Renkler `--dt-{ton}-bg/-fg/-dot` |
| Boolean | Yes: green, nokta yerine `Check` 11 px; No: gray, `Minus`; `falseTone` (yıkıcı) No: red + `X` |
| Bilinmeyen seçenek değeri | gray rozet, değer olduğu gibi (`qc_hold`) |
| +N | zemin `--dt-surface-3`, metin `--dt-text-2`. Avatar yığınında 20 px, yarıçap 999, 11.5 / 500; multiselect'te 22 px, yarıçap 5, 12 / 500; array'de 20 px, yarıçap 5 |
| “New” / “Update” (sheet) | 16 px, dolgu `0 5px`, yarıçap 4, 10.5 / 600; New `--dt-accent` + `--dt-on-accent`, Update `--dt-n-bg` + `--dt-n-fg` |
| “Default” (görünüm) | 20 px, dolgu `0 6px`, yarıçap 5, `--dt-surface-3`, 11.5 / 500 |
| Avatar | yoğunluğa göre 24 / 20 / 18; baş harfler `--dt-avatar-fs`, 600; kişinin tonu `-bg` / `-fg` |
| Avatar yığını | en fazla 3, her biri `0 0 0 1.5px` yüzey halkası; çipte −3 px, hücrede −4 px üst üste |
| Unassigned | aynı boyutta 1 px kesik `--dt-line-3` daire + “Unassigned” `--dt-text-3` |

## 5. Filtre çipi (masaüstü)

28 px, yarıçap 7, kenar 1 px `--dt-line-2`, zemin `--dt-surface`, `--dt-shadow-sm`. **İki tıklama hedefi:** gövde (popover) ve kaldırma.

| Parça | Değer |
|---|---|
| Gövde | dolgu `0 8px 0 9px`, boşluk 6, 12.5 px |
| İkon | sütun tipi ikonu 14 px `--dt-text-3` |
| Alan · operatör · değer | `--dt-text-2` · `--dt-text-3` · 500 `--dt-text`; değer en çok 180 px, `…` + tooltip |
| Kaldır | 26 px genişlik, sol kenarda 1 px `--dt-line-2`, `X` 12 px `--dt-text-3` |
| Kişi değeri | 3 avatar (18 px) + “3 people” |

| Durum | Değişen |
|---|---|
| Applied | — |
| Hover | gövde zemini `--dt-surface-3` |
| Editing (popover açık) | kenar `--dt-accent` + `0 0 0 3px var(--dt-focus-soft)` |
| Incomplete | değer yerine “Select…” 400 `--dt-text-3`; sorguya ve sayaca girmez |
| Klavye odağı | odak halkası kalıbı |

Telefon çipi farklıdır: bkz. [04-datatable-telefon.md](04-datatable-telefon.md) §3.

## 6. Yüzer katmanlar

| Katman | Ölçü | Görünüş |
|---|---|---|
| Popover | genişlik bileşene göre (brief §4.8), dolgu 4, yarıçap 10 | `--dt-surface`, `--dt-shadow-pop`; tetikleyicinin 4 px altında |
| Popover başlık satırı | 32 px, dolgu `0 4px 0 8px` | alan adı 12.5 `--dt-text-2` + operatör düğmesi (24 px, dolgu `0 6px`, yarıçap 5, `--dt-surface-3`, 12 / 500, `CaretDown` 12) |
| Popover alt satırı | 36 px, üstte 1 px `--dt-line` | solda durum (“2 selected”, “Bounds included”) 12 `--dt-text-3`, sağda ghost küçük Clear |
| Bölüm etiketi | 28 px, alt dolgu 7 | 11.5 / 500 `--dt-text-3`; sağda soluk açıklama (“opens its chip”, “Built in”) |
| Menü | dolgu 4, yarıçap 10, `--dt-shadow-pop` | öğe 32 px, dolgu `0 8px`, yarıçap 6, 13 px; iki satırlı pasif öğe 44 px (gerekçe 12 `--dt-text-3`); ayırıcı 1 px `--dt-line`, `4px 0` boşluk; kbd sağda; hover/klavye vurgusu `--dt-surface-3`; yıkıcı öğe en altta `--dt-r-fg`, sonu `…` |
| Dialog | 460 (hatalı satır listesiyle 480; Import 560), dolgu 20, yarıçap 14 | `--dt-shadow-dialog`; arka `--dt-scrim`; başlık 16 / 600, gövde 13 `--dt-text-2` (satır yüksekliği 1.45), başlık–gövde 4 px; bloklar arası 16 (yalnızca başlık + düğme olan onaylarda 20); düğmeler sağda, 8 px aralık, gövdenin 4 px altında |
| Tooltip | 28 px (sadece metin 26), dolgu `0 6px 0 8px`, yarıçap 6 | `--dt-tip-bg` / `--dt-tip-fg`, 12 / 500, `--dt-shadow-tip`; kbd zemini `--dt-bulk-line`. 400 ms gecikme |
| Toast | 40–44 px, dolgu `0 6px 0 14px`, yarıçap 12 | `--dt-bulk-bg` / `--dt-bulk-fg`, `--dt-shadow-float`; kartın altında ortada (DataSheet'te kartın alt kenarından 52 px yukarıda). Ana metin 600, ek bilgi `--dt-bulk-warn`, link `--dt-bulk-link` 600, Undo + `⌘Z` kbd |
| Bulk bar | bkz. 03-datatable.md §7 | |
| Telefon alt sayfası | bkz. 04-datatable-telefon.md §6 | |

“Copied” toast'ı: 40 px, `Check` 16 px `--dt-g-dot` + “Copied”; kendiliğinden kapanır.

## 7. Şeritler ve ilerleme

| Parça | Ölçü | Görünüş |
|---|---|---|
| Amber şerit (stale, satır sınırı) | 36 px, dolgu `0 12px` (DataSheet: 40 px, dolgu `0 8px 0 12px`), üstte 1 px çizgi | `--dt-a-bg` / `--dt-a-fg`, `Warning` 16 px `--dt-a-dot`, 12.5 px; eylem (Retry) 600 altı çizili |
| Kırmızı şerit (DataSheet kısmen kaydedildi) | 40 px | `--dt-r-bg` / `--dt-r-fg`, üst çizgi `--dt-r-line`, `WarningCircle` `--dt-r-dot`; `role="alert"` |
| Yenileme çubuğu | 2 px, header'ın altında | zemin `--dt-accent-soft-2`, %32'lik `--dt-accent` parça kayar (1.25 s), belirsiz |
| İlerleme çubuğu (DataSheet açılış/kayıt) | 320 × 6, yarıçap 999 | zemin `--dt-surface-3`, dolgu `--dt-accent`; `role="progressbar"` + `aria-valuenow` |
| Yüzde hücresi çubuğu | 90 × 6 (telefonda 48 × 6) | zemin `--dt-track`, dolgu `--dt-n-dot`; sağında 36 px sağa yaslı etiket |

## 8. Hücre tipleri (T8)

Kurallar brief §5.1–5.2'de. Tasarımdaki görünüş ve varsayılan genişlikler:

| Tip | Görünüş | Hizalama · genişlik |
|---|---|---|
| int | `12,400`; eksi U+2212 `−320` | sağ · 112 |
| float | sabit ondalık `1,284.50`; gerçek sıfır `0.00` gösterilir | sağ · 112 |
| percentage | `68%` veya `display: bar` (çubuk en çok 90 px + etiket) | sağ · 112, bar 156 |
| star | 5 yıldız, dolu `--dt-a-dot`, boş `--dt-line-2`; tooltip “4 of 5” | sol · 112 |
| currency | sayı + soluk ISO kodu (`--dt-currency-fs`, 500, `--dt-text-3`), taban çizgisine hizalı; sembol yok | sağ · 148 |
| string | tek satır, `…` + tooltip | sol · `minmax(160, 1.2fr)` |
| text | ilk satır + sağda genişlet ikonu; tam metin hover kartında | sol · doldurur |
| uppercase / lowercase | saklandığı gibi | sol · doldurur |
| phone | E.164 olduğu gibi; dokunmatikte `tel:` linki | sol · 156 |
| color | 14 px kare, yarıçap 3 (kenar `--dt-swatch-line`) + mono kod; `display: fill` hücreyi boyar, metin kontrastla | sol · 132 |
| email | düz metin; hover'da yaz + kopyala aksiyonları | sol · 200 |
| url | yalnızca host + `↗`, yeni sekme | sol · 180 |
| id | mono 500, kayda link; hover'da kopyala. Birincil sütun 136 | sol · 128 |
| boolean | rozet, asla checkbox (bkz. §4) | sol · 96 |
| select | seçeneğin tonunda rozet; bilinmeyen değer gray | sol · 112–200 |
| multiselect | iki rozet + `+N` (kalanı popover'da) | sol · 180 |
| ajax | sunucudan etiket; kaydın URL'i varsa altı çizili link | sol · 180 |
| user | avatar + ad; birden çok: 3 avatar + `+N`; boş: Unassigned | sol · 156 |
| date | `Oct 24`; başka yıl `Mar 3, 2025`; gecikmiş `--dt-r-fg` + `· 3d late` | sol · 132 |
| datetime | `Oct 17, 09:42`; göreli `2 hours ago` (tam zaman tooltip'te) | sol · 156 |
| object | `{ }` rozeti (20 px, yarıçap 4, `--dt-surface-3`, 11 / 500) + özet; özet yoksa “4 fields”, tıklayınca JSON | sol · 180 |
| array | `[ ]` rozeti + ilk değerler + `+N` | sol · 160 |

**Boş değer** her tipte “—” (`--dt-text-3`); asla boşluk veya sahte 0.

**Skeleton (tipe göre):** metin çubuğu %55–80 genişlikte (satırdan satıra değişir), 10 px, yarıçap 4; sayı kısa çubuk sağa yaslı; rozet 76 × 20 hap; kişi 20 px daire + çubuk. Parıltı `--dt-sk → --dt-sk-hi`, 1.6 s. İlk yüklemede 12 satır.

## 9. Durum mesajı bloğu

Boş, sonuç yok, hata ve “No rows on this page” için ortak kalıp (T9). Gövdenin ortasında, en fazla 440 px, alt dolgu 64 (optik orta).

| Parça | Değer |
|---|---|
| İkon kutusu | 40 × 40, yarıçap 10, `--dt-surface-3` + `--dt-text-2` ikon 20 px; hata: `--dt-r-bg` + `--dt-r-fg` |
| Başlık | 15 / 600 |
| Satırlar | 13 `--dt-text-2`, her biri ayrı satır |
| Düğmeler | 32 px; boşta birincil + ikincil (uygulamanın), diğerlerinde ikincil |
| Hata kimliği | “Copy error ID” ghost küçük + mono 11.5 `504 · req 8f3a1c2e`, `--dt-text-3` |
| Rol | hata `role="alert"`, diğerleri `role="status"` |

İkonlar: boş kutu (`Package`), filtre sonucu yok `Funnel`, arama sonucu yok `MagnifyingGlass`, hata `WarningCircle`, sayfada satır yok `File`.
