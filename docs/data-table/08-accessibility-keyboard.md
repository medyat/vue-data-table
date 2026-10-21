# 08 · Erişilebilirlik ve klavye

Erişilebilirlik spesifikasyonun parçasıdır; her fazın kabul kriterlerinde yer alır (10). Hedef: **WCAG 2.2 AA**, NVDA + Firefox/Chrome, VoiceOver + Safari, klavyeyle uçtan uca kullanım.

## 1. Roller

| Bileşen | Kök | Satır | Hücre | Header |
|---|---|---|---|---|
| DataTable | `role="grid"` + `aria-label` (ör. “Production orders”), `aria-rowcount` (bilinmiyorsa `-1`), `aria-colcount` | `role="row"`, `aria-rowindex` (header = 1, ilk veri satırı = 2 + sayfa ofseti), `aria-selected` (seçim açıksa), `aria-expanded` (detayı varsa) | `role="gridcell"` | `role="columnheader"`, `aria-sort` (`ascending`/`descending`; sıralı değilse öznitelik yok) |
| DataSheet | `role="grid"`, `aria-rowcount` = parti büyüklüğü, `aria-multiselectable="true"` | `role="row"`, `aria-rowindex` | `role="gridcell"`, `aria-colindex`, `aria-selected` (aralıktaysa), `aria-readonly`, `aria-invalid` + `aria-describedby` (hata) | `role="columnheader"`, `aria-sort`, zorunluysa `aria-required` açıklaması |

- Alt satır (expand): `role="row"` içinde tek `role="gridcell"` (`aria-colspan` = sütun sayısı); expand butonunda `aria-controls` → alt satır id'si.
- Gutter (sheet): `role="rowheader"`.
- Seçim checkbox'ı: `aria-label="Select WO-26-0418"`; header checkbox `aria-label="Select all rows on this page"`, kısmi seçimde `aria-checked="mixed"`.
- Sabit sütunlar ve sanallaştırma DOM sırasını bozmaz: hücreler her satırda görsel sırada.
- Dekoratif ikonlar `aria-hidden="true"`; yalnızca ikonlu butonlar `aria-label` + `title` (kısayol dahil: “Refresh (R)”).

## 2. Odak modeli

### DataTable — satır odaklı

- Izgara **tek tab durağıdır** (roving tabindex). Tab ile girilince son odaklanan satıra (ilk seferde ilk satıra) gelir.
- Odaklı satır: 2 px `--dt-accent` çerçeve (05 §4). Odak görünürlüğü fareyle tıklamada da korunur (`:focus-visible` yerine kendi `is-focus` sınıfı, klavye ile gelindiyse).
- `→` satırdayken: genişletilebilir ve kapalıysa açar; değilse odağı satırın **ilk widget'ına** (birincil link) taşır. Widget'lar arası `←`/`→` (APG: next/previous widget); ilkinde `←` satıra döner; `Esc` her zaman satıra. Satırdayken `←` açık satırı kapatır.
- Hücre içindeki widget'lar (link, buton, `actions`, `cell` içeriği, input) her zaman `tabindex="-1"` taşır; `Tab` ızgaradan çıkar. Odak bir widget içindeyken ızgara tuşları (`↑↓`, `Space`, `Enter`, `X`, tek harfliler) devre dışıdır; input/combobox kendi tuşlarını alır; widget odaklıyken `Enter`/`Space` onu çalıştırır (native), satır kısayolunu tetiklemez.
- Hover'da beliren aksiyonlar (`actions`) `:focus-within`'de de görünür; yalnızca hover'a bağlı işlev yoktur.
- Sanallaştırma: odaklı satır (ya da detayında odak varsa o satır) her zaman render edilir (virtualizer `rangeExtractor` odak indeksini ekler); kaydırma odağı kaybettirmez. Sayfa/sorgu değişiminde odak önce `role="grid"` köküne alınır, veri gelince aynı anahtar → aynı indeks → ilk satır sırasıyla geri verilir.
- Tab ızgaradan çıkar: footer → bulk bar. `F6` bölgeler arası atlar: toolbar → filtre satırı → ızgara → footer → bulk bar.

### DataSheet — hücre odaklı

- **Roving tabindex:** aktif hücre DOM odağını tutar (TanStack `cell.getTabIndex()`: aktif 0, diğerleri −1); `aria-activedescendant` kullanılmaz (ARIA 1.2 referansın DOM'da olmasını ister, sanal listede garanti edilemez). Aktif satır `rangeExtractor` ile DOM'da tutulur; ok tuşu hedef hücreyi `scrollToIndex` ile getirip odaklar.
- Hücredeki widget'a düzenlenemez hücrede `Enter`, her hücrede `→` ile girilir; `Esc` hücreye döner. Widget içindeyken ızgara tuşları devre dışıdır (DataTable ile aynı kural).
- Düzenleme açılınca odak editör input'una geçer; Enter/Tab onaylar, Esc iptal eder, odak hücreye döner. Blur ile onaylama yoktur; portallı içerik (combobox listesi, popover) açıkken `Esc` önce onu kapatır, odak tetikleyiciye döner (07 §5).
- Formula bar input'u ayrı tab durağıdır (`aria-label="Value of List price for PS-045-C"`).

### Popover, menü, dialog

- Açılınca odak içeri: arama kutusu varsa ona, yoksa ilk öğeye. Kapanınca odak **tetikleyiciye** döner.
- Menüler `role="menu"` / `menuitem`, oklarla gezinme, harf ile atlama (typeahead), `Esc` kapatır.
- Dialog'lar odak tuzağı, `aria-modal="true"`, ilk odak: yıkıcı dialog'da **güvenli** buton (Keep orders / Stay / Fix first), formlu dialog'da ilk alan.
- Toast'lar `role="status"`; Undo butonu klavyeyle erişilebilir (`F6` döngüsünde son durak, toast görünürken).

### Filtre çipi

- Her çip parçası ayrı buton (alan, operatör, değer, kaldır). Çipler arası Tab; çip içinde `←`/`→` parçalar arası.
- Kaldır butonu: `aria-label="Remove Status filter"`. Değer butonu: `aria-label="Status is any of In progress, Released. Edit value"`.
- Eksik çip: değer butonu `aria-label="Customer: choose a value"`.

## 3. Klavye — liste modu

Tek harfli kısayollar yalnızca odak bir metin alanında değilken çalışır. `kbd` gösterimi platforma göre: macOS `⌘ ⌥ ⇧`, diğerleri `Ctrl Alt Shift`.

| Tuş | Eylem | Kapsam |
|---|---|---|
| `/` | Aramaya odaklan | Sayfa |
| `F` | Filter (column picker) | Sayfa |
| `V` | Görünüm menüsü | Sayfa |
| `R` | Refresh | Sayfa |
| `⌘S` | Görünüm düzenlenmişse Save changes (My view) / Save as my view… (System) | Sayfa |
| `↑` `↓` | Satırlar arası | Izgara |
| `Home` / `End` | İlk / son yüklü satır | Izgara |
| `PageUp` / `PageDown` | Bir ekran | Izgara |
| `→` / `←` | Aç / kapa, hücrelere gir / çık | Izgara |
| `X` | Satırı seç / bırak | Izgara |
| `⇧↑` `⇧↓` | Seçimi genişlet | Izgara |
| `⌘A` | Sayfadaki tüm satırları seç | Izgara |
| `↵` | Kaydı aç (`row-open`) | Izgara |
| `→` sonra `⌘↵` / `⇧↵` | Linke odaklan, yeni sekmede / pencerede aç (tarayıcı davranışı; paket kısayol bağlamaz) | Izgara |
| `⇧F10` veya Menü tuşu | Satır menüsü | Izgara |
| `Esc` | Sırayla: popover → seçim | Her yerde |
| `Alt←` / `Alt→` | Önceki / sonraki sayfa | Sayfa |
| `F6` | Bölgeler arası | Sayfa |

Header'a varış: ilk satırda `↑` ilk başlığa odaklanır; başlıklar arası `←`/`→`, `↓` odaklı satıra döner. Header'da: `↵`/`Space` sıralar, `⇧↵` ikincil sıralama ekler, `⇧F10` sütun menüsü, `⇧←`/`⇧→` (header odaklıyken) sütun genişliğini 16 px değiştirir, `⌥⇧←`/`⌥⇧→` sütunu taşır (odak taşınan başlıkta kalır). `Alt←`/`Alt→` her zaman sayfa değiştirir.

Uygulama tek harfli kısayolları `shortcuts={ false }` ile kapatabilir (tarayıcı eklentisi/uygulama çakışmaları için); ok tuşları ve Esc her zaman çalışır.

## 4. Klavye — sheet modu

| Tuş | Eylem |
|---|---|
| `↑ ↓ ← →` | Hücreler arası |
| `Tab` / `⇧Tab` | Sağ / sol (satır sonunda bir sonraki satırın başına) |
| `↵` | Düzenleme dışında: düzenlemeyi aç değil, **aşağı in** (Excel); düzenlenemez hücrede widget varsa ilk widget'a. Düzenlemede: onayla + aşağı |
| `F2` | Düzenle (imleç sonda) |
| Herhangi bir karakter | Düzenle, içeriği değiştir |
| `Esc` | Düzenlemeyi iptal et / seçimi tek hücreye indir |
| `Space` | `boolean` hücresinde Yes ↔ No |
| `Delete` / `Backspace` | Seçimi temizle |
| `⇧ + oklar` | Seçimi genişlet |
| `⌘ + oklar` | Veri bloğunun kenarına atla |
| `Home` / `End` | Satır başı / sonu |
| `⌘Home` / `⌘End` | İlk / son hücre |
| `PageUp` / `PageDown` | Bir ekran |
| `⌘A` | Görünür tüm hücreler |
| `⌘C` `⌘X` `⌘V` | Kopyala, kes, yapıştır |
| `⌘D` | Aşağı doldur |
| `⌘Z` / `⌘⇧Z` (`Ctrl+Y`) | Geri al / yinele |
| `F8` / `⇧F8` | Sonraki / önceki hata |
| `⌘F` | Find in grid |
| `⌘−` | Satırı listeden çıkar |
| `⌘S` | Kaydet |
| `⇧F10` / Menü tuşu | Hücre menüsü |
| `Alt↓` | Select/date hücresinde seçiciyi aç |

## 5. Ekran okuyucu duyuruları

Paket kök bileşende tek bir `aria-live="polite"` bölgesi tutar (ve acil durumlar için bir `assertive`). Duyurular kısaltılır, aynı mesaj 1 sn içinde tekrarlanmaz.

| Olay | Metin (EN) | Öncelik |
|---|---|---|
| Sorgu sonucu | “100 rows loaded” / “No orders match these 3 filters” | polite |
| Sayım | “1,284 orders” | polite |
| Seçim | “4 selected” | polite |
| Sıralama | “Sorted by Due date, ascending” | polite |
| Filtre | “Filter added: Status is any of In progress, Released” / “Status filter removed” | polite |
| Görünüm | “View Gebze plant, edited” | polite |
| Expand | “Operations for WO-26-0418 expanded, 4 rows” | polite |
| Yapıştırma | “Pasted 5 rows by 3 columns. 2 values aren't options.” | polite |
| Kayıt ilerlemesi | “Saving, 50 percent” (her %25'te; `saving` sayacından) | polite |
| Kayıt sonucu | “96 rows saved” / “3 rows couldn't be saved” | assertive (hata), polite (başarı) |
| Hücre hatası (aktif olunca) | `aria-describedby` ile hata metni okunur | — |
| Hata durumu | “Couldn't load orders. Try again.” | assertive |

## 6. Görsel gereksinimler

- **Kontrast:** metin ≥ 4.5:1, büyük metin ve UI sınırları ≥ 3:1. Özellikle doğrulanacak token çiftleri: `--dt-text-3` / `--dt-surface` ve `--dt-surface-2`; rozet `--dt-*-fg` / `--dt-*-bg` (8 ton × 2 tema); `--dt-accent-text` / `--dt-accent-soft`; sheet hata balonu. Faz 0'da otomatik kontrast testi (02'deki tüm çiftler) kurulur.
- **Renk tek başına anlam taşımaz:** değişmiş hücre = zemin + köşe üçgeni + gutter noktası; hata = zemin + çerçeve + ikon + metin; boolean = renk + ✓/– ikonu; overdue = renk + “· 3d late” metni.
- **Odak göstergesi** her etkileşimli öğede, en az 2 px, ≥ 3:1.
- **Dokunma hedefi:** `pointer: coarse` iken en az 44 × 44 px (görsel boyut küçük kalabilir, `::before` ile alan büyütülür). Masaüstünde en az 24 × 24 px (WCAG 2.5.8).
- **Hareket:** `prefers-reduced-motion: reduce` → döngüsel animasyonlar durur, geçişler anlık (02 · Hareket).
- **Yakınlaştırma:** %200'de yatay kaydırma yalnızca tablo gövdesinde; toolbar daralma kuralları (05 §3) bunu karşılar.
- **Yüksek kontrast modu** (`forced-colors: active`): seçili satır, aktif hücre ve odak çerçevesi `Highlight` / `CanvasText` sistem renkleriyle; köşe üçgenleri `CanvasText`.
