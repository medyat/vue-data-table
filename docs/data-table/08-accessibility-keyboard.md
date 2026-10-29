# 08 · Erişilebilirlik ve klavye

Erişilebilirlik spesifikasyonun parçasıdır; her fazın kabul kriterlerinde yer alır (10). Hedef: **WCAG 2.2 AA**, NVDA + Firefox/Chrome, VoiceOver + Safari, klavyeyle uçtan uca kullanım.

## 1. Roller

| Bileşen | Kök | Satır | Hücre | Header |
|---|---|---|---|---|
| DataTable | `role="table"` (D40) + `aria-label` (ör. “Production orders”), `aria-rowcount` (bilinmiyorsa `-1`), `aria-colcount` | `role="row"`, `aria-rowindex` (header = 1, ilk veri satırı = 2 + sayfa ofseti), `aria-describedby` (`rowError` varsa, hata ikonuna; ikon `role="img"` + mesaj); seçim checkbox'tan, açıklık chevron'un `aria-expanded`'ından okunur | `role="cell"` | `role="columnheader"`, `aria-sort` (`ascending`/`descending`; sıralı değilse öznitelik yok); `description` varsa etiket düğmesinde `aria-describedby` → görsel olarak gizli açıklama |
| DataSheet | `role="grid"`, `aria-rowcount` = parti büyüklüğü, `aria-multiselectable="true"` | `role="row"`, `aria-rowindex` | `role="gridcell"`, `aria-colindex`, `aria-selected` (aralıktaysa), `aria-readonly`, `aria-invalid` + `aria-describedby` (hata) | `role="columnheader"`, `aria-sort`, zorunluysa `aria-required` açıklaması; `description` varsa `aria-describedby` (DataTable ile aynı) |

- Alt satır (expand): `role="row"` içinde tek hücre (DataTable `cell`) (`aria-colspan` = sütun sayısı); expand butonunda `aria-controls` → alt satır id'si.
- Gutter (sheet): `role="rowheader"`.
- Seçim checkbox'ı: `aria-label="Select WO-26-0418"`; header checkbox `aria-label="Select all rows on this page"`, kısmi seçimde `aria-checked="mixed"`.
- Sabit sütunlar ve sanallaştırma DOM sırasını bozmaz: hücreler her satırda görsel sırada.
- Dekoratif ikonlar `aria-hidden="true"`; yalnızca ikonlu butonlar `aria-label` + `title` (kısayol dahil: “Refresh (R)”).

## 2. Odak modeli

### DataTable — doğal Tab sırası (D40)

- Satır klavyesi yoktur: satır odaklanmaz, odak çerçevesi çizilmez, ok tuşları satır gezmez. Kök `role="table"`, satırlar `row`, hücreler `cell`; seçim checkbox'tan okunur (satırda `aria-selected` yok).
- Satırdaki widget'lar (seçim checkbox'ı, expand chevron'u, birincil link, `actions`, `cell` içeriği, inline satır aksiyonları, ⋯) ve başlık düğmeleri (etiket, filtre işareti, ⋯) **doğal Tab sırasındadır**; Enter/Space onları native çalıştırır. Ortak hücre render'ları DataSheet için `tabindex="-1"` verir; liste satırı bunu kaldırır.
- Odak göstergesi widget'ın kendi `:focus-visible` halkasıdır (02 · odak halkası kalıbı).
- Hover'da beliren aksiyonlar (`actions`) `:focus-within`'de de görünür; yalnızca hover'a bağlı işlev yoktur.
- Sanallaştırma: odak bir satırdaki widget'tayken o satır her zaman render edilir (virtualizer `rangeExtractor`); kaydırma odağı kaybettirmez. Tarayıcının odak kaydırması sticky header ve yatay çubuğun altına girmesin diye kaydırma kabında ölçülen header/çubuk yüksekliği kadar `scroll-padding` vardır.
- `F6` bölgeler arası atlar: toolbar → filtre satırı → ızgara → footer → bulk bar.

### DataSheet — hücre odaklı

- **Roving tabindex:** aktif hücre DOM odağını tutar (TanStack `cell.getTabIndex()`: aktif 0, diğerleri −1); `aria-activedescendant` kullanılmaz (ARIA 1.2 referansın DOM'da olmasını ister, sanal listede garanti edilemez). Aktif satır `rangeExtractor` ile DOM'da tutulur; ok tuşu hedef hücreyi `scrollToIndex` ile getirip odaklar.
- Hücredeki widget'a düzenlenemez hücrede `Enter`, her hücrede `→` ile girilir; `Esc` hücreye döner. Widget içindeyken ızgara tuşları devre dışıdır.
- Düzenleme açılınca odak editör input'una geçer; Enter/Tab onaylar, Esc iptal eder, odak hücreye döner. Blur ile onaylama yoktur; portallı içerik (combobox listesi, popover) açıkken `Esc` önce onu kapatır, odak tetikleyiciye döner (07 §5). İstisna: yerleşik `multiselect` editöründe `Esc` seçimleri kaydedip çıkar.
- Formula bar input'u ayrı tab durağıdır (`aria-label="Value of List price for PS-045-C"`).

### Popover, menü, dialog

- Açılınca odak içeri: arama kutusu varsa ona, yoksa ilk öğeye. Kapanınca odak **tetikleyiciye** döner.
- Menüler `role="menu"` / `menuitem`, oklarla gezinme, harf ile atlama (typeahead), `Esc` kapatır.
- Dialog'lar odak tuzağı, `aria-modal="true"`, ilk odak: yıkıcı dialog'da **güvenli** buton (Keep orders / Stay / Fix first), formlu dialog'da ilk alan.
- Columns dialog'u (05 §5): sütun tutamacında `Space` al · `↑`/`↓` taşı · `Space` bırak · `Esc` iptal (dialog açık kalır). Tutamaç `aria-label="Reorder Status"`, talimat `aria-describedby` ile, konum canlı bölgede duyurulur (@dnd-kit Accessibility eklentisi, metinler `columns.drag*`). Gösterim switch'i adını sütundan alır.
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
| `Tab` / `⇧Tab` | Satırdaki widget'lar ve başlık düğmeleri arasında (doğal sıra; birincil linkte `↵` kaydı açar, `⌘↵` yeni sekme — tarayıcı davranışı) | Izgara |
| `↵` / `Space` | Odaktaki widget'ı çalıştırır (checkbox seçer, chevron açar, ⋯ menüyü açar) | Izgara |
| `Esc` | Sırayla: popover → seçim | Her yerde |
| `Alt←` / `Alt→` | Önceki / sonraki sayfa | Sayfa |
| `F6` | Bölgeler arası | Sayfa |

Header: başlık düğmeleri Tab durağıdır; `↵`/`Space` sıralar, `⇧↵` ikincil sıralama ekler, `⇧F10` sütun menüsü, `⇧←`/`⇧→` sütun genişliğini 16 px değiştirir, `⌥⇧←`/`⌥⇧→` sütunu taşır (odak taşınan başlıkta kalır). Düz `←`/`→` başlıklar arası gezinmez (D40). `Alt←`/`Alt→` her zaman sayfa değiştirir.

Uygulama tek harfli kısayolları `shortcuts={ false }` ile kapatabilir (tarayıcı eklentisi/uygulama çakışmaları için); `Alt←/→` ve Esc her zaman çalışır.

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
