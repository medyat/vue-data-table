# 02 · Design token'ları

Bu doküman token'ların **tek kaynağıdır**. Değerler ilk tasarımın kit dosyasından alındı; o dosya kaldırıldı. Bileşen CSS'i **yalnızca** bu değişkenleri kullanır. Claude Design ile yapılacak yeni tasarımlar bu token'larla başlar; değişen bir değer önce burada güncellenir, sonra tasarıma ve koda yansır.

Faz 0'daki token testi `tokens.css`'i bu dokümandaki tablolarla karşılaştırır.

## Renk — yüzeyler, çizgiler, metin

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `--dt-canvas` | `#F4F5F7` | `#0B0C0F` | Sayfa zemini (tablonun dışı) |
| `--dt-surface` | `#FFFFFF` | `#131418` | Kart, satır, popover, dialog |
| `--dt-surface-2` | `#FAFAFB` | `#16181C` | Header satırı, footer, alt satır (expand), salt-okunur hücre |
| `--dt-surface-3` | `#F1F2F4` | `#1F2127` | Hover dolguları, segmented arka planı, ikon kutuları |
| `--dt-seg-on` | `#FFFFFF` | `#2B2E35` | Segmented'ta seçili parça |
| `--dt-track` | `#E8EAEE` | `#2A2D34` | İlerleme çubuğu yolu |
| `--dt-line` | `#E6E8EC` | `#24272D` | Satır/hücre ayırıcıları, kart kenarı |
| `--dt-line-2` | `#D8DBE1` | `#30333B` | Buton/input/çip kenarı |
| `--dt-line-3` | `#B4B9C2` | `#4C515B` | Checkbox kenarı, güçlü ayırıcı |
| `--dt-text` | `#15171C` | `#ECEDF0` | Birincil metin |
| `--dt-text-2` | `#4A505B` | `#B3B8C1` | İkincil metin, header etiketleri |
| `--dt-text-3` | `#676D78` | `#8D929C` | Soluk metin, ikonlar, boş değer “—” (beyaz üzerinde 5:1) |

## Renk — aksiyon ve durum

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `--dt-ink` | `#15171C` | `#ECEDF0` | Birincil buton zemini |
| `--dt-on-ink` | `#FFFFFF` | `#131418` | Birincil buton metni |
| `--dt-accent` | `#2D5BE3` | `#6E8BFF` | Checkbox (seçili), aktif hücre kenarı, odak, sayaç rozeti |
| `--dt-on-accent` | `#FFFFFF` | `#0B0C0F` | Accent üstündeki metin/işaret |
| `--dt-accent-text` | `#2347C0` | `#9CB0FF` | Accent renkli metin, link hover |
| `--dt-accent-soft` | `#EEF2FE` | `rgba(110,139,255,.12)` | Aktif filtre butonu, değişmiş/yeni hücre, aralık seçimi |
| `--dt-accent-soft-2` | `#D9E3FD` | `rgba(110,139,255,.26)` | Aktif buton kenarı, ilerleme çubuğu zemini |
| `--dt-focus` | `rgba(45,91,227,.45)` | `rgba(110,139,255,.55)` | Odak halkası (2 px, 1–2 px offset) |
| `--dt-focus-soft` | `rgba(45,91,227,.14)` | `rgba(110,139,255,.18)` | Input odak halesi (3 px) |
| `--dt-row-hover` | `#F8F9FA` | `#17191E` | Satır hover |
| `--dt-row-selected` | `#F2F5FE` | `#161C2E` | Seçili satır |
| `--dt-row-selected-hover` | `#EAF0FE` | `#1A2136` | Seçili + hover |
| `--dt-sk` / `--dt-sk-hi` | `#EDEFF2` / `#F7F8FA` | `#1C1E23` / `#25282E` | Skeleton parıltısı |
| `--dt-scrim` | `rgba(15,17,22,.28)` | `rgba(0,0,0,.55)` | Dialog / bottom sheet arkası |
| `--dt-danger` / `--dt-danger-hover` | `#C42626` / `#AE1F1F` | aynı | Yıkıcı birincil buton (“Cancel 3 orders”, “Discard changes”), metni `#FFFFFF` |
| `--dt-on-danger` | `#FFFFFF` | `#FFFFFF` | Yıkıcı birincil buton metni |
| `--dt-switch-knob` | `#FFFFFF` | `#FFFFFF` | Switch topuzu |
| `--dt-swatch-line` | `rgba(16,24,40,.12)` | `rgba(255,255,255,.16)` | `color` hücresindeki renk karesinin kenarı |
| `--dt-live-halo` | `rgba(44,157,90,.18)` | `rgba(61,184,115,.2)` | Footer “Live” noktasının halesi |
| `--dt-r-line` | `#F6CFCF` | `rgba(240,82,82,.28)` | Kırmızı şeridin üst kenarı (DataSheet kısmen kaydedildi) |
| `--dt-a-line` | `#F2DDB4` | `rgba(232,163,42,.26)` | Amber şeridin üst kenarı (stale, satır sınırı) |
| `--dt-fill-text-dark` / `--dt-fill-text-light` | `#15171C` / `#FFFFFF` | aynı | `color` hücresi `display: fill`: dolgu rengine göre koyu ya da açık yazı (temadan bağımsız) |

## Renk — koyu yüzer öğeler (bulk bar, toast, tooltip)

| Token | Light | Dark |
|---|---|---|
| `--dt-bulk-bg` | `#15171C` | `#24272E` |
| `--dt-bulk-fg` | `#F1F2F4` | `#ECEDF0` |
| `--dt-bulk-fg-2` | `#A3A9B4` | `#9AA0AA` |
| `--dt-bulk-line` | `rgba(255,255,255,.14)` | `rgba(255,255,255,.12)` |
| `--dt-bulk-hover` | `rgba(255,255,255,.09)` | `rgba(255,255,255,.07)` |
| `--dt-bulk-link` | `#AFC2FF` | `#9CB0FF` |
| `--dt-tip-bg` / `--dt-tip-fg` | `#15171C` / `#F1F2F4` | `#2B2E35` / `#ECEDF0` |
| `--dt-bulk-danger` | `#FF9F9F` | `#FF9F9F` |
| `--dt-bulk-warn` | `#F1C46C` | `#F1C46C` |
| `--dt-error-tip-bg` | `#B42323` (her iki tema; metin `#FFFFFF`) | |

## Tonlar (durum rozetleri, seçenek renkleri, avatarlar)

Her ton üç değişkenden oluşur: `-bg` (rozet zemini), `-fg` (metin), `-dot` (nokta, ilerleme çubuğu).

| Ton | Ad | Light bg / fg / dot | Dark bg / fg / dot |
|---|---|---|---|
| `n` | gray | `#F0F1F3` / `#4A505B` / `#8C929C` | `#23262C` / `#C2C7CF` / `#8D929C` |
| `b` | blue | `#EBF0FE` / `#2347C0` / `#3D68F0` | `rgba(110,139,255,.15)` / `#AABBFF` / `#6E8BFF` |
| `g` | green | `#E5F4EB` / `#1B683A` / `#2C9D5A` | `rgba(56,178,108,.14)` / `#7DD4A2` / `#3DB873` |
| `a` | amber | `#FCF1DD` / `#864F00` / `#E09412` | `rgba(232,163,42,.14)` / `#F1C46C` / `#E8A32A` |
| `r` | red | `#FCEBEB` / `#B02121` / `#E5484D` | `rgba(240,82,82,.15)` / `#FF9F9F` / `#F05252` |
| `v` | violet | `#F1EDFD` / `#5939C0` / `#7C5CF0` | `rgba(155,123,255,.16)` / `#C7B9FF` / `#9B7BFF` |
| `p` | pink | `#FCEAF1` / `#9E2450` / `#D9488A` | `rgba(230,90,150,.15)` / `#FFA8CB` / `#E65A96` |
| `c` | teal | `#E3F3F3` / `#1C6466` / `#2A9A9C` | `rgba(50,180,182,.15)` / `#86DADB` / `#32B4B6` |

Kurallar:
- Ton yalnızca **anlam** taşır; süs için kullanılmaz. Rozet her zaman metin etiketi de içerir (renk tek başına anlam taşımaz).
- Ayırt edilmesi gereken renkler açıklıkta da farklıdır; kırmızı/yeşil yerine mümkünse mavi/turuncu.
- Avatar rengi kişiye göre sabittir (ör. kullanıcı ID'sinin hash'i → 6 tondan biri: b, g, a, v, p, c).

## Tipografi

| Token | Değer |
|---|---|
| `--dt-font` | `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--dt-font-mono` | `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

Font paketle gelmez; uygulama yükler (ör. `geist` npm paketi veya Google Fonts). Yüklenmezse sistem fontuna düşer — tasarım bunu kaldırır.

| Kullanım | Boyut / ağırlık / satır yüksekliği |
|---|---|
| Hücre metni | `--dt-fs` (yoğunluğa göre 13.5 / 13 / 12.5 px) · 400 · 1.4 |
| İkincil hücre satırı (SKU, e-posta) | 12 px · 400 · 1.25, `--dt-text-3` |
| Header etiketi | `--dt-fs-head` (12 / 12 / 11.5 px) · 500, `--dt-text-2` |
| Buton | 13 px · 500 (sm: 12.5, xs: 12) |
| Çip | 12.5 px; değer 500 |
| Rozet | 12 px · 500 |
| Menü öğesi | 13 px · 400; bölüm etiketi 11.5 px · 500 `--dt-text-3` |
| Popover/section başlığı | 13–15 px · 600 |
| Dialog başlığı | 16 px · 600, açıklama 13 px `--dt-text-2` |
| ID / kod | mono `--dt-mono-fs` (hücre boyutunun 0.5 px altı: 13 / 12.5 / 12 px) · 500, `letter-spacing: -.01em` |
| Para birimi kodu | mono `--dt-currency-fs` (11 / 11 / 10.5 px) · 500, `--dt-text-3`, sayıdan 6 px sonra, taban çizgisine hizalı |
| Kbd | mono 11 px · 500, 18 px yükseklik, 4 px yarıçap |

Tüm sayısal hücreler, sayfalama aralıkları ve sayaçlar `font-variant-numeric: tabular-nums`.

## Yoğunluk

`data-density` özniteliği (`comfortable | standard | compact`) aşağıdaki değişkenleri ayarlar. Varsayılan: list = standard, document = comfortable, sheet = compact.

| Token | Comfortable | Standard | Compact |
|---|---|---|---|
| `--dt-row-h` | 52 px | 40 px | 32 px |
| `--dt-head-h` | 40 px | 36 px | 32 px |
| `--dt-cell-x` (yatay hücre dolgusu) | 16 px | 12 px | 10 px |
| `--dt-fs` | 13.5 px | 13 px | 12.5 px |
| `--dt-fs-head` | 12 px | 12 px | 11.5 px |
| `--dt-av` (avatar) | 24 px | 20 px | 18 px |
| `--dt-badge-h` | 24 px | 22 px | 20 px |
| `--dt-mono-fs` (ID / kod) | 13 px | 12.5 px | 12 px |
| `--dt-currency-fs` (para birimi kodu) | 11 px | 11 px | 10.5 px |
| `--dt-avatar-fs` (avatar baş harfleri) | 10 px | 9 px | 8 px |

- İkinci satır (`secondary`) yalnızca Comfortable'da görünür; diğerlerinde tooltip'e taşınır.
- Dokunmatik cihazda (`pointer: coarse`) Compact otomatik Standard'a döner; mobil liste satırı en az 48 px, sheet salt-okunur satırı 44 px.
- Satır yüksekliğine 1 px alt kenarlık eklenir (sanallaştırmada `estimateSize = row-h + 1`).

## Yarıçap

| Token | Değer | Kullanım |
|---|---|---|
| `--dt-radius-xs` | 4 px | Checkbox, kbd, op token |
| `--dt-radius-sm` | 5 px | Tag, xs buton, hücre içi küçük kontroller |
| `--dt-radius-md` | 7 px | Buton (sm: 6), input, çip |
| `--dt-radius-item` | 6 px | Menü öğesi, icon-button |
| `--dt-radius-inner` | 8 px | Segmented, bulk bar butonları, expand içindeki mini tablo, seçim kartı (`.choice`), dosya kartı (import) |
| `--dt-radius-pop` | 10 px | Popover, menü |
| `--dt-radius-card` | 12 px | Tablo kartı, bulk bar, toast |
| `--dt-radius-dialog` | 14 px | Dialog |
| `--dt-radius-pill` | 999 px | Rozet, sayaç, switch |
| `--dt-radius-bottom-sheet` | 18 px | Telefonda alt sayfa (üst köşeler) |

Telefondaki bulk bar `--dt-radius-dialog` (14 px) kullanır.

## Gölgeler

| Token | Light |
|---|---|
| `--dt-shadow-sm` | `0 1px 2px rgba(16,24,40,.05)` — buton, input, çip, kart |
| `--dt-shadow-pop` | `0 0 0 1px rgba(16,24,40,.08), 0 2px 4px rgba(16,24,40,.04), 0 14px 34px -8px rgba(16,24,40,.18)` |
| `--dt-shadow-dialog` | `0 0 0 1px rgba(16,24,40,.07), 0 28px 60px -14px rgba(16,24,40,.34)` |
| `--dt-shadow-pin-l` / `-r` | `±1px 0 0 var(--dt-line), ±10px 0 12px -10px rgba(16,24,40,.22)` |
| `--dt-shadow-float` | `0 0 0 1px var(--dt-bulk-line), 0 18px 40px -10px rgba(16,24,40,.45)` — bulk bar, toast |
| `--dt-shadow-tip` | `0 6px 16px -6px rgba(16,24,40,.35)` — tooltip, kaydırma hapı, hata balonu |
| `--dt-shadow-editing` | `0 6px 16px -6px rgba(16,24,40,.28)` — sheet'te düzenlenen hücre |

Dark değerleri (siyah bazlı, daha yoğun):

| Token | Dark |
|---|---|
| `--dt-shadow-sm` | `0 1px 2px rgba(0, 0, 0, .35)` |
| `--dt-shadow-pop` | `0 0 0 1px rgba(255, 255, 255, .08), 0 14px 34px -8px rgba(0, 0, 0, .7)` |
| `--dt-shadow-dialog` | `0 0 0 1px rgba(255, 255, 255, .08), 0 28px 60px -14px rgba(0, 0, 0, .8)` |
| `--dt-shadow-pin-l` | `1px 0 0 var(--dt-line), 10px 0 12px -10px rgba(0, 0, 0, .7)` |
| `--dt-shadow-pin-r` | `-1px 0 0 var(--dt-line), -10px 0 12px -10px rgba(0, 0, 0, .7)` |

## Bileşen ölçüleri (sık kullanılanlar)

| Öğe | Ölçü |
|---|---|
| Toolbar | padding 10 × 12, öğe aralığı 8, kontroller 32 px |
| Filtre satırı | padding 8 × 12, çip aralığı 6, çip 28 px |
| Buton | 32 / 28 (sm) / 24 (xs) px; ikon 16 px, aralık 6 |
| Icon button | 28 px (sm 24) |
| Checkbox | 16 px, kenar 1.5 px; seçim sütunu 40 px |
| Menü öğesi | 32 px (iki satırlı: 44 px); popover iç dolgu 4 px |
| Footer | min 48 px, padding 8 × 12 |
| Bulk bar | padding 6, buton 32 px, alt kenardan 64 px (footer'ın üstü), yatay ortalı |
| Dialog | 460 px (DataSheet'te hatalı satır listeli onay 480; import 560) |
| Popover genişlikleri | Views 300–330 · Column picker 264–280 · Display ve Columns drill-in 300–320 · More 236 · Date 520 · Değer editörleri 296–300 · Operatör menüsü 220 · Sütun menüsü 248 · Satır menüsü 268 · Save view menüsü 320 · Görünüm satırı ⋯ 200 · Açılan toolbar araması 240 |
| Sheet formül çubuğu | 36 px; ad kutusu 240 px; `fx` 40 px |
| Sheet durum çubuğu | min 36 px, `--dt-surface-2` |

## Hareket

| Öğe | Tetik | Animasyon | Süre | Easing |
|---|---|---|---|---|
| Buton/menü hover | hover | arka plan/kenar rengi | 120 ms | ease |
| Sıralama oku | sıralama değişimi | `rotate(180deg)` | 150 ms | ease |
| Expand oku | aç/kapa | `rotate(90deg)` | 150 ms | ease |
| Switch | değişim | topuz `translateX(12px)` | 150 ms | ease |
| Popover / menü | aç | opacity 0→1, scale .98→1 | 120 ms | ease-out |
| Bulk bar | ilk seçim | translateY(8px)→0 + opacity | 160 ms | ease-out |
| Kaydırma göstergesi | kaydırma durunca | 900 ms sonra opacity → 0 | 150 ms | ease |
| Skeleton | yükleme | arka plan kayması | 1.6 s döngü | ease-in-out |
| Yenileme çubuğu | yenileme | belirsiz ilerleme | 1.25 s döngü | ease-in-out |
| Spinner | bekleme | dönme | 0.8 s döngü | linear |

`prefers-reduced-motion: reduce` → döngüsel animasyonlar durur, geçişler anlık olur.

## shadcn-vue köprüsü

Paket kendi token'larıyla çalışır; uygulamanın shadcn-vue temasını devralmak için opsiyonel `shadcn-bridge.css` yüklenir. **Dikkat:** shadcn'in `--accent` değişkeni bir hover grisidir, marka rengi değildir; `--dt-accent` ona bağlanmaz.

shadcn-vue'nun yeni sürümleri (Tailwind v4) değişkenleri tam renk (`oklch(...)`) olarak tutar → `var(--border)`. Eski sürümler (Tailwind v3) HSL üçlüsü tutar → `hsl(var(--border))`. Köprü iki varyantla verilir: `shadcn-bridge.css` ve `shadcn-bridge-hsl.css`.

| `--dt-*` | shadcn karşılığı (v4 yazımı) |
|---|---|
| `--dt-canvas` | `var(--background)` |
| `--dt-surface` | `var(--card)` |
| `--dt-surface-2` | `color-mix(in oklab, var(--muted) 45%, var(--card))` |
| `--dt-surface-3` | `var(--muted)` |
| `--dt-line` | `var(--border)` |
| `--dt-line-2` | `var(--input)` |
| `--dt-line-3` | `color-mix(in oklab, var(--muted-foreground) 45%, var(--border))` |
| `--dt-text` | `var(--foreground)` |
| `--dt-text-2` | `color-mix(in oklab, var(--foreground) 70%, var(--muted-foreground))` |
| `--dt-text-3` | `var(--muted-foreground)` |
| `--dt-ink` / `--dt-on-ink` | `var(--primary)` / `var(--primary-foreground)` |
| `--dt-focus` | `var(--ring)` |
| `--dt-r-dot`, `--dt-r-fg` | `var(--destructive)` |
| `--dt-accent*`, tonlar | paketin kendi değerleri (uygulama isterse kendi marka rengiyle ezer) |
| yarıçaplar | `--dt-radius-md: calc(var(--radius) - 2px)` vb. (opsiyonel) |

Koyu tema: köprü, shadcn'in `.dark` sınıfı altında aynı eşlemeyi kullanır; tonlar bu dokümandaki dark değerlerine geçer.
