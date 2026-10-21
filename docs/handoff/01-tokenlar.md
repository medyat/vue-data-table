# 01 · Tokenlar

Bileşen CSS'i yalnızca `--dt-*` değişkenlerini kullanır. Aşağıdaki değerler tasarım dosyasında kullanılanlardır.

**Kaynak sütunu:**
- **brief** — `DESIGN-BRIEF.md` §4'te tanımlı.
- **02** — `02-design-tokens.md`'de tanımlı (tasarım sırasında eklenenler dahil; 2026-10-21'de işlendi). Değer farkı olursa 02 kazanır.

Koyu tema: `.dark` sınıfı veya `data-theme="dark"`.

## 1. Yüzeyler, çizgiler, metin

| Token | Light | Dark | Kullanım | Kaynak |
|---|---|---|---|---|
| `--dt-canvas` | `#F4F5F7` | `#0B0C0F` | Sayfa zemini | brief |
| `--dt-surface` | `#FFFFFF` | `#131418` | Kart, satır, popover, dialog | brief |
| `--dt-surface-2` | `#FAFAFB` | `#16181C` | Header, footer, expand satırı, salt okunur hücre, gutter | brief |
| `--dt-surface-3` | `#F1F2F4` | `#1F2127` | Hover dolgusu, segmented zemini, ikon kutusu, menüde vurgulu öğe | brief |
| `--dt-line` | `#E6E8EC` | `#24272D` | Satır ayırıcı, kart kenarı | brief |
| `--dt-line-2` | `#D8DBE1` | `#30333B` | Buton, input, çip kenarı | brief |
| `--dt-line-3` | `#B4B9C2` | `#4C515B` | Checkbox kenarı, pasif ikon/metin, tutamaç | brief |
| `--dt-text` | `#15171C` | `#ECEDF0` | Birincil metin | brief |
| `--dt-text-2` | `#4A505B` | `#B3B8C1` | İkincil metin, header | brief |
| `--dt-text-3` | `#676D78` | `#8D929C` | Soluk metin, “—” | brief |
| `--dt-track` | `#E8EAEE` | `#2A2D34` | Yüzde çubuğu zemini | 02 |
| `--dt-seg-on` | `#FFFFFF` | `#2B2E35` | Segmented'de seçili öğe zemini | 02 |
| `--dt-scrim` | `rgba(15,17,22,.28)` | `rgba(0,0,0,.55)` | Dialog ve alt sayfa arkası | 02 |

Kenar solmaları (yatay kaydırma, hücre aksiyonu arka planı) aynı yüzey renginin alfa 0 hâlinden kendisine `linear-gradient` ile yapılır (ör. `rgba(255,255,255,0) → #FFFFFF`). Ayrı token gerekmez.

## 2. Aksiyon ve durum renkleri

| Token | Light | Dark | Kullanım | Kaynak |
|---|---|---|---|---|
| `--dt-ink` / `--dt-on-ink` | `#15171C` / `#FFFFFF` | `#ECEDF0` / `#131418` | Birincil buton | brief |
| `--dt-accent` | `#2D5BE3` | `#6E8BFF` | Seçili checkbox, aktif hücre, odak, sayaç rozeti, ilerleme dolgusu | brief |
| `--dt-on-accent` | `#FFFFFF` | `#0B0C0F` | Accent zemin üstündeki metin/ikon | 02 |
| `--dt-accent-text` | `#2347C0` | `#9CB0FF` | Accent metin, link | brief |
| `--dt-accent-soft` | `#EEF2FE` | `rgba(110,139,255,.12)` | Aktif filtre butonu, değişmiş/yeni hücre, aralık seçimi, bilgi kutusu | brief |
| `--dt-accent-soft-2` | `#D9E3FD` | `rgba(110,139,255,.26)` | Aktif filtre butonu kenarı, yenileme çubuğu zemini | brief |
| `--dt-focus` | `rgba(45,91,227,.45)` | `rgba(110,139,255,.55)` | Odak halkası | brief |
| `--dt-focus-soft` | `rgba(45,91,227,.14)` | `rgba(110,139,255,.18)` | Input odak halesi (3 px) | brief |
| `--dt-row-hover` | `#F8F9FA` | `#17191E` | Satır hover | brief |
| `--dt-row-selected` / `-hover` | `#F2F5FE` / `#EAF0FE` | `#161C2E` / `#1A2136` | Seçili satır | brief |
| `--dt-danger` / `-hover` | `#C42626` / `#AE1F1F` | aynı | Yıkıcı birincil buton (metin `#FFFFFF`) | brief |
| `--dt-bulk-bg` | `#15171C` | `#24272E` | Bulk bar, toast | brief |
| `--dt-bulk-fg` / `-fg-2` | `#F1F2F4` / `#A3A9B4` | `#ECEDF0` / `#9AA0AA` | Bulk bar metni / ikon ve ikincil metin | brief |
| `--dt-bulk-link` | `#AFC2FF` | `#9CB0FF` | Toast içindeki “Review” | brief |
| `--dt-bulk-line` | `rgba(255,255,255,.14)` | `rgba(255,255,255,.12)` | Bulk bar ayırıcısı, koyu yüzeyde kbd zemini, hata balonundaki düğme zemini | 02 |
| `--dt-bulk-hover` | `rgba(255,255,255,.09)` | `rgba(255,255,255,.07)` | Bulk bar düğmesi hover/açık | 02 |
| `--dt-bulk-warn` | `#F1C46C` | `#F1C46C` | Toast'taki uyarı parçası (“2 values aren't options”) | 02 |
| `--dt-tip-bg` / `--dt-tip-fg` | `#15171C` / `#F1F2F4` | `#2B2E35` / `#ECEDF0` | Tooltip, kaydırma hapı, resize rozeti, doldurma etiketi. Dark'ta bulk bar'dan bir ton açık | 02 |
| `--dt-error-tip-bg` | `#B42323` | `#B42323` | Sheet hata balonu (metin `#FFFFFF`) | brief |
| `--dt-sk` / `--dt-sk-hi` | `#EDEFF2` / `#F7F8FA` | `#1C1E23` / `#25282E` | Skeleton (parıltı `sk → sk-hi %45 → sk %90`) | brief |
| `--dt-swatch-line` | `rgba(16,24,40,.12)` | `rgba(255,255,255,.16)` | `color` hücresindeki renk karesinin kenarı | 02 |
| `--dt-live-halo` | `rgba(44,157,90,.18)` | `rgba(61,184,115,.2)` | Footer “Live” noktasının halesi | 02 |
| `--dt-r-line` | `#F6CFCF` | `rgba(240,82,82,.28)` | Kırmızı şeridin üst kenarı (DataSheet kısmen kaydedildi) | 02 |
| `--dt-a-line` | `#F2DDB4` | `rgba(232,163,42,.26)` | Amber şeridin üst kenarı (satır sınırı) | 02 |

## 3. Tonlar

Her ton `-bg` / `-fg` / `-dot`. Rozet her zaman nokta + metin içerir.

| Ton | Light bg / fg / dot | Dark bg / fg / dot | Örnek kullanım |
|---|---|---|---|
| gray `n` | `#F0F1F3` / `#4A505B` / `#8C929C` | `#23262C` / `#C2C7CF` / `#8D929C` | Draft, No, bilinmeyen değer, Hydraulics |
| blue `b` | `#EBF0FE` / `#2347C0` / `#3D68F0` | `rgba(110,139,255,.15)` / `#AABBFF` / `#6E8BFF` | In progress, Pumps |
| green `g` | `#E5F4EB` / `#1B683A` / `#2C9D5A` | `rgba(56,178,108,.14)` / `#7DD4A2` / `#3DB873` | Done, Yes, Passed, Live |
| amber `a` | `#FCF1DD` / `#864F00` / `#E09412` | `rgba(232,163,42,.14)` / `#F1C46C` / `#E8A32A` | On hold, uyarı, stale |
| red `r` | `#FCEBEB` / `#B02121` / `#E5484D` | `rgba(240,82,82,.15)` / `#FF9F9F` / `#F05252` | Gecikme, hata, yıkıcı menü öğesi metni |
| violet `v` | `#F1EDFD` / `#5939C0` / `#7C5CF0` | `rgba(155,123,255,.16)` / `#C7B9FF` / `#9B7BFF` | Planned, Valves |
| pink `p` | `#FCEAF1` / `#9E2450` / `#D9488A` | `rgba(230,90,150,.15)` / `#FFA8CB` / `#E65A96` | Hoses & fittings |
| teal `c` | `#E3F3F3` / `#1C6466` / `#2A9A9C` | `rgba(50,180,182,.15)` / `#86DADB` / `#32B4B6` | Released, Seals |

Yüzde çubuğu dolgusu `--dt-n-dot`. Yıkıcı menü öğesi metni `--dt-r-fg` (dolu kırmızı değil). Hata işaretleri (gutter ikonu, hücre çerçevesi) `--dt-r-dot`.

Kişi avatarları kişiye sabit tonla: Ayşe K. blue, Emre T. green, Selin A. violet, Burak Y. amber, Deniz Ö. teal, Murat S. pink (örnek veri).

## 4. Gölgeler

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `--dt-shadow-sm` | `0 1px 2px rgba(16,24,40,.05)` | `0 1px 2px rgba(0,0,0,.35)` | Kart, buton, input, çip |
| `--dt-shadow-pop` | `0 0 0 1px rgba(16,24,40,.08), 0 2px 4px rgba(16,24,40,.04), 0 14px 34px -8px rgba(16,24,40,.18)` | `0 0 0 1px rgba(255,255,255,.08), 0 14px 34px -8px rgba(0,0,0,.7)` | Popover, menü, listbox |
| `--dt-shadow-dialog` | `0 0 0 1px rgba(16,24,40,.07), 0 28px 60px -14px rgba(16,24,40,.34)` | `0 0 0 1px rgba(255,255,255,.08), 0 28px 60px -14px rgba(0,0,0,.8)` | Dialog, telefon alt sayfası |
| `--dt-shadow-float` | `0 0 0 1px rgba(255,255,255,.14), 0 18px 40px -10px rgba(16,24,40,.45)` | `0 0 0 1px rgba(255,255,255,.12), 0 18px 40px -10px rgba(16,24,40,.45)` | Bulk bar, toast |
| `--dt-shadow-tip` | `0 6px 16px -6px rgba(16,24,40,.35)` | aynı | Tooltip, hata balonu, kaydırma hapı |
| `--dt-shadow-editing` | `0 6px 16px -6px rgba(16,24,40,.28)` | aynı | Düzenlenen sheet hücresi (02 değeri; tasarımda biraz daha belirgin çizildi) |
| `--dt-shadow-pin-l` | `1px 0 0 var(--dt-line), 10px 0 12px -10px rgba(16,24,40,.22)` | `1px 0 0 var(--dt-line), 10px 0 12px -10px rgba(0,0,0,.7)` | Sola sabit sütun, yalnızca sağa kaydırılmışken |
| `--dt-shadow-pin-r` | `-1px 0 0 var(--dt-line), -10px 0 12px -10px rgba(16,24,40,.22)` | `-1px 0 0 var(--dt-line), -10px 0 12px -10px rgba(0,0,0,.7)` | Sağa sabit sütun (satır aksiyonları), yalnızca kaydırma kalan tarafta |

Masaüstünde sabit bloklar kaydırılmamışken kenar çizilmez (header'daki %40 yükseklikli ayırıcı dışında). Telefonda sola sabit blok kaydırılmamışken `1px 0 0 var(--dt-line)` kenarı taşır.

Odak halkası kalıbı (buton, çip, checkbox, hücre düğmeleri): `box-shadow: 0 0 0 2px var(--dt-surface), 0 0 0 4px var(--dt-focus)`. Input odağı: kenar `--dt-accent` + `0 0 0 3px var(--dt-focus-soft)`. Satır ve hücre odağı: 2 px `--dt-accent` iç çerçeve, 3 px yarıçap.

## 5. Yoğunluk

| Değer | Comfortable | Standard | Compact | Not |
|---|---|---|---|---|
| Satır `--dt-row-h` | 52 | 40 | 32 | + 1 px alt çizgi |
| Header `--dt-head-h` | 40 | 36 | 32 | |
| Hücre yatay dolgusu `--dt-cell-x` | 16 | 12 | 10 | |
| Hücre metni | 13.5 | 13 | 12.5 | |
| Header metni | 12 | 12 | 11.5 | 500 |
| ID / kod (mono) `--dt-mono-fs` | 13 | 12.5 | 12 | 500 |
| Rozet yüksekliği | 24 | 22 | 20 | metin 12 / 500 |
| Avatar | 24 | 20 | 18 | |
| Avatar baş harf `--dt-avatar-fs` | 10 | 9 | 8 | 600 |
| Para birimi kodu `--dt-currency-fs` | 11 | 11 | 10.5 | 500, `--dt-text-3` |
| İkinci satır (SKU) | 12 | — | — | yalnızca Comfortable (02; tasarımda 11.5 çizildi) |
| Hücre aksiyon düğmesi (Copy / Open) | 24 | 24 | 24 | her yoğunlukta aynı |
| Uygulamanın hücre düğmesi (Approve / Reject) | 28 | 24 | 24 | |

Dokunmatikte Compact → Standard; liste satırı ≥ 48 px (telefon 48 + 1).

## 6. Tipografi

Font: `--dt-font` Geist, `--dt-font-mono` Geist Mono. Sayılar her yerde `font-variant-numeric: tabular-nums`.

| Kullanım | Boyut / ağırlık / renk |
|---|---|
| Sayfa başlığı (uygulamanın) | 16 / 600; telefonda 17 / 600 |
| Dialog başlığı | 16 / 600 |
| Boş/hata mesajı başlığı | 15 / 600 |
| Bölüm başlığı (DocumentTable “Lines”) | 15 / 600 |
| Popover başlığı / panel başlığı | 13 / 600 |
| Buton, menü öğesi, input | 13 / 500 (menü öğesi 400) |
| Çip | 12.5; alan `--dt-text-2`, operatör `--dt-text-3`, değer 500 `--dt-text` |
| Rozet | 12 / 500 |
| Bölüm etiketi (popover içi) | 11.5 / 500 / `--dt-text-3` |
| Popover alt satırı, ipucu | 12 / `--dt-text-3` |
| kbd | Geist Mono 11 / 500, 18 px yükseklik, 4 px yarıçap (bileşenlerde; açıklama panolarındaki büyük kbd'ler 20–24 px) |
| Telefon | gövde 14–15; alt sayfa satırı 15; ikincil 13 |

## 7. Yarıçap

checkbox 4 (telefon alt sayfasında 5) · kbd 4 · tag / küçük düğme 5 · menü öğesi, sm buton, hücre düğmesi 6 · buton, input, çip 7 · segmented ve mini tablo 8 · popover, ikon kutusu 10 · telefon inputu 10 · kart, bulk bar, toast 12 · telefon bulk bar 14 · dialog 14 · telefon alt sayfası 18 (üst köşeler) · rozet, avatar, ilerleme çubuğu 999.

## 8. Hareket

Brief §4.6 aynen: hover 120 ms; sıralama ve expand oku 150 ms döner; popover 120 ms ease-out; bulk bar 160 ms; kaydırma hapı 900 ms sonra 150 ms solar; skeleton 1.6 s; yenileme çubuğu 1.25 s. `prefers-reduced-motion` bütün döngüleri durdurur.

## 9. İkonlar

Phosphor regular. Düğmede 16 px, hücre/çip içinde 14 px, telefonda 18–20 px; çizgi kalınlığı 16 (256 birimlik viewBox). Dekoratif ikonlar `aria-hidden="true"`.

| İşlev | Phosphor |
|---|---|
| Arama | `MagnifyingGlass` |
| Filtre | `Funnel` |
| Display | `SlidersHorizontal` |
| Diğer | `DotsThree` |
| Ekle / yeni | `Plus` |
| Kapat, kaldır | `X` |
| Açılır, ileri/geri, expand | `CaretDown`, `CaretRight`, `CaretLeft`, `CaretUp` |
| Sıralama yönü | `ArrowUp`, `ArrowDown` |
| Seçili, onay | `Check` |
| Kilit (anahtar, salt okunur) | `Lock` |
| Sabitlenmiş sütun | `PushPin` |
| Sütun göster/gizle | `Eye`, `EyeSlash` |
| Yenile | `ArrowClockwise` |
| Geri al / yinele | `ArrowUUpLeft`, `ArrowUUpRight` |
| Kopyala | `Copy` |
| Kaydı aç | `ArrowSquareOut` (hücre aksiyonunda `ArrowUpRight`) |
| İçe / dışa aktar | `DownloadSimple`, `UploadSimple` |
| Uyarı | `Warning` (üçgen), `WarningCircle` |
| Bilgi | `Info` |
| Yükleniyor | `CircleNotch` |
| Excel dosyası | `Table` |
| Telefonda salt okunur | `Monitor` |
| Bağlantı | `Link` |
| Sütun tipleri (column picker) | Plant `MapPin`, tarih `CalendarBlank`, seçenek `Circle` + nokta, kişi `User`, para `CurrencyCircleDollar`, metin `TextT`, yüzde `Percent`, tarih-saat `Clock`, ID `Hash` |
