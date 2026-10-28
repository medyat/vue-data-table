# `@medyat/vue-data-table` — Tasarım ve Sistem Brifingi

**Sürüm:** 2026-10-21 · **Durum:** kodlama öncesi, kararlar kesinleşmiş · **Kaynaklar:** `README.md` (karar günlüğü D1–D25), `01–10`, `api-draft.ts`, `02-design-tokens.md`, `CLAUDE.md`.

Bu doküman, Medyat'ın ERP ürünü için geliştirilecek Vue 3 tablo paketinin **tek referansıdır**: ürün bağlamı, bileşenler, davranışlar, görsel sistem, teknik mimari ve tasarım görevleri bir arada. Claude Design'a bir bileşen veya ekran tasarlatılırken bu dosya bağlam olarak verilir; ilgili bölüm tek başına okunsa bile sistemin geri kalanıyla çelişmeyecek kadar bilgi taşır.

**İşaretler:**

- **[Karar]** — ürün sahibiyle kesinleşmiş; tasarımda değiştirilmez, soru doğarsa önce sorulur.
- **[Öneri]** — dokümanlardaki varsayılan; tasarımcı daha iyi bir çözüm önerebilir.
- **[Açık]** — henüz karar verilmemiş; tasarım bunu kesinleştirmez, seçenek sunar.
- **[Serbest]** — tasarımcıya bırakılmış alan.

Ölçü ve renk değerleri `02-design-tokens.md` ile birebirdir; burada tekrar edilenler özet amaçlıdır, çelişkide 02 geçerlidir.

---

## İçindekiler

1. [Ürün bağlamı](#1-ürün-bağlamı)
2. [Sistemin özeti: iki bileşen, tek çekirdek](#2-sistemin-özeti-iki-bileşen-tek-çekirdek)
3. [Tasarım ilkeleri ve KOBİ yaklaşımı](#3-tasarım-ilkeleri-ve-kobi̇-yaklaşımı)
4. [Görsel sistem](#4-görsel-sistem)
5. [Ortak çekirdek davranışları](#5-ortak-çekirdek-davranışları)
6. [DataTable](#6-datatable)
8. [DataSheet](#8-datasheet)
9. [Teknik mimari (davranış düzeyinde)](#9-teknik-mimari-davranış-düzeyinde)
10. [Kapsam dışı](#10-kapsam-dışı)
11. [Açık kararlar ve serbest alanlar](#11-açık-kararlar-ve-serbest-alanlar)
12. [Claude Design görev paketleri](#12-claude-design-görev-paketleri)
13. [Ekler](#13-ekler)

---

## 1. Ürün bağlamı

### 1.1 Ne geliştiriyoruz

Hedef uygulama, üretim yapan KOBİ'ler için bir ERP'dir (Laravel + Inertia + Vue 3). Hemen her modülü bir tabloyla başlar: üretim emirleri, ürünler, stok hareketleri, siparişler, müşteriler, faturalar. `@medyat/vue-data-table`, bu ekranların tamamında kullanılacak **tek tablo sistemidir**: iki bileşen, ortak bir çekirdek, tek tasarım dili.

| Bileşen | Ekran | Kullanıcı ne yapar |
|---|---|---|
| **DataTable** | Modülün liste ekranı (Üretim emirleri, Ürünler, Siparişler…) | Bulur (arama, filtre, kayıtlı görünüm), tarar (sayfalama, sanal satırlar), seçip toplu iş yapar, kayda iner (detay satırı, açma) |
| **DataSheet** | Toplu düzenleme (ürün fiyat listesi, stok kartları; en fazla 10.000 satır) | Excel gibi düzenler: yaz, yapıştır, doldur, geri al, Excel'den içe aktar; tek Save ile teslim eder |

### 1.2 Neden geliştiriyoruz

- Her modülde yeniden yazılan tablolar tutarsızlık ve bakım yükü üretiyor; filtre, görünüm, seçim gibi davranışlar her ekranda farklı çalışıyor.
- Kullanıcılar toplu işleri Excel'de yapıp dosya yüklüyor; hata ancak yüklemeden sonra görülüyor. DataSheet bu alışkanlığı tarayıcıya taşır: hata hücrede, kaydetmeden önce.
- Hazır kütüphanelerin (AG Grid, MUI X) lisans/ağırlık/özelleştirme maliyeti ve shadcn-vue ile tasarım dili uyumsuzluğu. Paket kendi tasarım token'larıyla çalışır, uygulamanın temasına köprülenebilir.
- Paket uluslararası yayınlanacak: İngilizce varsayılan, Türkçe birinci sınıf (D16).

### 1.3 Kimler kullanacak

Kullanıcıların önemli bir kısmı teknolojiye çok hâkim olmayan, günde saatlerce aynı ekranlarda çalışan KOBİ çalışanlarıdır. Tasarım kararları şu kişiler düşünülerek verilir:

| Kişi | Rol | Tipik iş | Tablodan beklediği |
|---|---|---|---|
| **Ayşe** | Üretim planlama sorumlusu | Sabah “Gebze tesisi · bu hafta termin” görünümünü açar, geciken emirleri bulur, 20 emri seçip “Release” yapar | Kayıtlı görünüm bir tıkla; geciken satır kırmızı tarih ile görünür; toplu işlem iki adımda |
| **Zeynep** | Muhasebe | Fatura listesinde tarih aralığı ve durum filtresi; tutar sütunlarını karşılaştırır | Sayılar alt alta hizalı, para birimi karışmaz, filtre çipi ne yaptığını söyler |
| **Can** | Ürün/stok sorumlusu | 3.000 ürünün liste fiyatını Excel'den yapıştırır, hataları düzeltir, kaydeder | Excel refleksleri çalışır (⌘C/⌘V, ⌘Z, aşağı doldur), hata hücrede, kaydetmeden önce |
| **Geliştirici** (ERP ekibi) | Vue/TS | Sütun tanımlarını feature'ın `columns.ts` dosyasında yazar, veriyi kendi API'siyle çeker | Tip güvenli tanım, az yapılandırma, paket I/O yapmaz |

### 1.4 Örnek veri evreni

Tasarımlarda gerçekçi ERP verisi kullanılır; sayı uydurulmaz, biçimler bölüm 4.6'daki kurallara uyar.

| Varlık | Alanlar (tip) | Örnek satır |
|---|---|---|
| **Üretim emri** (DataTable) | number (id, birincil), product (string + SKU ikinci satır), customer.title (string), status (select: Draft/Planned/Released/In progress/On hold/Done), produced (percentage, bar), owner (user), due_date (date, overdue), plant (select), value (currency TRY), priority (select), created_at (datetime) | `WO-26-0418 · Hydraulic cylinder HC-80 · Kuzey Otomotiv · In progress · 68% · Ayşe K. · Oct 24 · Gebze · 412,800.00 TRY` |
| **Ürün** (DataSheet) | sku (id, anahtar), name (string), category (select), unit (select: pcs/sets/kg), list_price (currency), cost (currency), vat (percentage), min_stock (int), lead_time (int, birim d), active (boolean), barcode (string) | `HC-080-S · Hydraulic cylinder HC-80 · Hydraulics · pcs · 1,650.00 · 1,120.00 · 20% · 10 · 14 · Yes` |
| **Müşteri** (DataTable) | code (id), title (string, birincil), city (string), segment (select), owner (user), balance (currency), last_order (datetime relative), email, phone | `C-0142 · Kuzey Otomotiv · Kocaeli · OEM · Mehmet D. · 84,200.00 TRY · 2 hours ago` |
| **Fatura** (DataTable) | number (id), customer (string), issued_at (date), due_at (date, overdue), status (select: Draft/Sent/Paid/Overdue), total (currency), currency (string), paid (boolean) | `INV-26-1182 · Kuzey Otomotiv · Oct 3 · Oct 17 · Overdue · 542,179.50 TRY · No` |

---

## 2. Sistemin özeti: iki bileşen, tek çekirdek

**[Karar D17]** İki ayrı bileşen vardır; tek bir bileşenin `variant` prop'u yoktur. Her biri kendi props/emits sözleşmesine sahiptir, ama hücre tipleri, token'lar, yoğunluk, biçimlendirme, filtre çipleri, durum ekranları ve klavye yardımcıları ortak çekirdekten gelir.

| | DataTable | DataSheet |
|---|---|---|
| Giriş noktası | `@medyat/vue-data-table` | `@medyat/vue-data-table/sheet` (ayrı, tembel yüklenir) |
| Yükseklik | Ebeveyni doldurur; yalnızca gövde kayar | Ebeveyni doldurur |
| Satır modeli | Sanal, sabit yükseklik, 100 satır/sayfa | Sanal, 10.000 satıra kadar |
| Toolbar | Otomatik yuvalar | Kendi toolbar'ı (Find, Filter, All/Changed/Errors, Undo/Redo, Add row, Import, Export, Display, Save) |
| Filtre / arama | Var (çip modeli) | Çipler yerelde; görünümü daraltır, düzenlemeler korunur |
| Sıralama | Tekli + ⇧ çoklu (3) | Yerel, düzenlenen satır yerinde kalır |
| Sayfalama | Simple (D7) | Yok (tamamı yüklü) |
| Görünümler, tercihler | Var | Yok (sütun genişliği/gizleme oturumluk) |
| Seçim | Satır, sayfa kapsamlı (D19) | Hücre aralığı |
| Düzenleme | Yok | Var (tek `editing` hücresi, editörler) |
| Satır detayı | Expand, open | — |
| Odak modeli | Satır odaklı | Hücre odaklı |
| Veri | `rows` prop; `mode: client \| `rows` prop | `rows` prop + `loading`; `@save` → `applyResult()` |

**Paket sınırı [Karar D18, D20]:** Paket veri çekmez, kaydetmez, iş mantığı taşımaz. Uygulama satırları verir, sunucu modunda `@request` ile gelen sorguyu kendi HTTP'siyle cevaplar, DataSheet'te `@save` ile gelen değişiklikleri kaydeder ve sonucu `applyResult()` ile bildirir. Toplu aksiyon ve satır aksiyonlarının onayı, toast'ı ve sonrası uygulamanındır. Bu sınır tasarım için şu anlama gelir: paketin arayüzünde “kaydediliyor / hata / başarılı” durumları vardır, ama bunlar uygulamanın verdiği bilgiden türer.

---

## 3. Tasarım ilkeleri ve KOBİ yaklaşımı

### 3.1 Yedi ilke [Karar]

1. **Mavi = durum, mürekkep = aksiyon.** Accent mavi yalnızca seçim, odak, aktif filtre, değişmiş hücre ve kaydırma göstergesi gibi *durumlar* içindir. Birincil buton koyu mürekkep rengidir (dark temada açık). Böylece seçili satırlar ve aktif filtreler tek bakışta ayrışır, mavi düğme enflasyonu olmaz.
2. **Kırmızı yalnızca hata.** Boolean “No”, iptal edilmiş kayıt, satırı listeden çıkarma nötr gösterilir. Kırmızı gördüğünde kullanıcı “bir şey yanlış” demeli.
3. **Az kalabalık, aşamalı görünürlük.** Filtre satırı yalnızca filtre varken; satır ve hücre aksiyonları hover/odakta; toolbar yalnızca yapılandırılmış yuvaları gösterir ve daraldıkça katlanır.
4. **Tablo karta dönüşmez.** Telefonda da tablo kalır: yatay kayar, birincil sütun sabit.
5. **Sayılar hizalı.** Sağa hizalı, tabular rakam, gerçek eksi işareti (−), para birimi kodu soluk mono ve sembol değil.
6. **Sayı uydurma yok.** Toplam bilinmiyorsa gösterilmez; “Count total” ile isteğe bağlı sayılır. “end of results” kısa sayfadan anlaşılır.
7. **Önce yerleşik özellik.** Davranışlar TanStack Table/Virtual ve reka-ui'nin yerleşik özellikleriyle kurulur; özel mekanizma yalnızca bunlar yetmezse.

### 3.2 KOBİ kullanıcısı için somut gereksinimler

Sloganlar değil, bileşenlere yansıyan kurallar:

| Gereksinim | Nerede, nasıl |
|---|---|
| Çok veri korkutmasın | Standard yoğunlukta 40 px satır, 13 px metin, dikey çizgiler kapalı; sayısal sütunlar sağa, metin sola; ikinci satır (SKU, e-posta) yalnızca Comfortable'da, diğerlerinde tooltip. Header soluk (`--dt-text-2`), veri koyu. |
| İşlev azaltmadan karmaşıklık kontrolü | Toolbar'da en fazla 8 yuva ve her biri yalnızca gerekince; ikincil işler More ⋯ altında; filtreler tek satır çip; Display popover'ı üç ayardan ibaret. |
| Sık işler bir tıkta | Görünüm seçici en solda; satır üzerinde ⋯; `⌘S` kaydet; `⌘Z` geri al; `F8` sonraki hata. |
| Gereksiz dialog/menü yok | Filtre değerleri popover'da ve anında uygulanır; boolean filtre popover bile açmaz; görünüm silme tek onay; toplu aksiyon onayı uygulamanın, paket araya girmez; Manage columns dialog'u yok (D22). |
| Eğitimsiz temel kullanım | Her boş/hata ekranı ne olduğunu ve ne yapılacağını söyler (“No orders match these 3 filters · Clear all filters”); operatörler kelimeyle (“is greater than”), sembolle değil; hata hücrenin üstünde balonda, kaydetmeden önce. |
| Profesyonel, sade, modern | Geist yazı tipi, 12 px kart yarıçapı, ince `--dt-line` ayırıcılar, gölge yalnızca yüzen öğelerde, tonlar yumuşak rozet (nokta + etiket). |
| Yoğun günlük kullanım | Klavyeyle uçtan uca; roving tabindex (tablo tek Tab durağı); 500 satırda 60 fps; sayfa değişince gövde başa kayar ama sayfa kaymaz; refresh satırları yerinde tutar. |
| Büyük veri | Liste 100 satır/sayfa + sanal satırlar; sheet 10.000 satır, 1.000 × 10 yapıştırma < 300 ms; sayım isteğe bağlı. |

---

## 4. Görsel sistem

Kaynak: `02-design-tokens.md`. Bileşen CSS'i yalnızca `--dt-*` token'larını kullanır; tasarımcı yeni bir değer gerekirse önce token olarak önerir.

### 4.1 Tema ve yüzeyler

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `--dt-canvas` | `#F4F5F7` | `#0B0C0F` | Sayfa zemini (tablonun dışı) |
| `--dt-surface` | `#FFFFFF` | `#131418` | Kart, satır, popover, dialog |
| `--dt-surface-2` | `#FAFAFB` | `#16181C` | Header, footer, alt satır (expand), salt-okunur hücre |
| `--dt-surface-3` | `#F1F2F4` | `#1F2127` | Hover dolguları, segmented zemini, ikon kutuları |
| `--dt-line` / `-2` / `-3` | `#E6E8EC` / `#D8DBE1` / `#B4B9C2` | `#24272D` / `#30333B` / `#4C515B` | Satır ayırıcı ve kart kenarı / buton-input-çip kenarı / checkbox kenarı |
| `--dt-text` / `-2` / `-3` | `#15171C` / `#4A505B` / `#676D78` | `#ECEDF0` / `#B3B8C1` / `#8D929C` | Birincil / ikincil, header / soluk, boş değer “—” |

Koyu tema `.dark` sınıfı veya `data-theme="dark"` ile. Her tasarım light + dark üretilir.

### 4.2 Aksiyon ve durum renkleri

| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `--dt-ink` / `--dt-on-ink` | `#15171C` / `#FFFFFF` | `#ECEDF0` / `#131418` | Birincil buton |
| `--dt-accent` | `#2D5BE3` | `#6E8BFF` | Seçili checkbox, aktif hücre kenarı, odak, sayaç rozeti |
| `--dt-accent-text` | `#2347C0` | `#9CB0FF` | Accent metin, link hover |
| `--dt-accent-soft` / `-2` | `#EEF2FE` / `#D9E3FD` | `rgba(110,139,255,.12)` / `.26` | Aktif filtre butonu, değişmiş/yeni hücre, aralık seçimi / aktif kenar, ilerleme zemini |
| `--dt-focus` / `--dt-focus-soft` | `rgba(45,91,227,.45)` / `.14` | `rgba(110,139,255,.55)` / `.18` | Odak halkası (2 px) / input odak halesi (3 px) |
| `--dt-row-hover` / `-current` / `-selected` / `-selected-hover` | `#F8F9FA` / `#F3F4F7` / `#F2F5FE` / `#EAF0FE` | `#17191E` / `#1A1C21` / `#161C2E` / `#1A2136` | Satır durumları |
| `--dt-danger` / `-hover` | `#C42626` / `#AE1F1F` | aynı | Yıkıcı birincil buton (“Discard changes”), metin beyaz |
| `--dt-bulk-bg` / `-fg` / `-fg-2` / `-link` | `#15171C` / `#F1F2F4` / `#A3A9B4` / `#AFC2FF` | `#24272E` / `#ECEDF0` / `#9AA0AA` / `#9CB0FF` | Koyu yüzer öğeler: bulk bar, toast, tooltip |
| `--dt-error-tip-bg` | `#B42323` (iki tema, metin beyaz) | | Sheet hata balonu |
| `--dt-sk` / `--dt-sk-hi` | `#EDEFF2` / `#F7F8FA` | `#1C1E23` / `#25282E` | Skeleton parıltısı |

### 4.3 Tonlar (rozet, seçenek, avatar)

Sekiz ton, her biri `-bg` / `-fg` / `-dot` (light örneği): gray `#F0F1F3 / #4A505B / #8C929C` · blue `#EBF0FE / #2347C0 / #3D68F0` · green `#E5F4EB / #1B683A / #2C9D5A` · amber `#FCF1DD / #864F00 / #E09412` · red `#FCEBEB / #B02121 / #E5484D` · violet `#F1EDFD / #5939C0 / #7C5CF0` · pink `#FCEAF1 / #9E2450 / #D9488A` · teal `#E3F3F3 / #1C6466 / #2A9A9C`. Dark değerleri 02'de.

Kurallar **[Karar]:** ton yalnızca anlam taşır; rozet her zaman nokta + metin etiketi içerir (renk tek başına anlam taşımaz); kırmızı/yeşil yerine mümkünse mavi/turuncu; avatar rengi kişiye göre sabittir (6 tondan biri).

### 4.4 Tipografi

- `--dt-font`: Geist (yüklenmezse sistem fontu; tasarım bunu kaldırmalı). `--dt-font-mono`: Geist Mono — ID'ler, kodlar, para birimi kodu, kbd.
- Hücre 13.5 / 13 / 12.5 px (yoğunluğa göre) · 400 · 1.4; ikincil satır 12 px `--dt-text-3`; header 12 / 12 / 11.5 px · 500 `--dt-text-2`; buton 13 px · 500; çip 12.5 px (değer 500); rozet 12 px · 500; menü öğesi 13 px; popover başlığı 13–15 px · 600; dialog başlığı 16 px · 600.
- Tüm sayılar, sayfalama aralıkları ve sayaçlar `tabular-nums`. ID/kod mono, hücre boyutunun 0.5 px altı.

### 4.5 Yoğunluk

`data-density`: **Comfortable / Standard / Compact**. Varsayılan: DataTable Standard, DataSheet Compact. Kişisel tercihtir, görünüme yazılmaz (D5).

| Token | Comfortable | Standard | Compact |
|---|---|---|---|
| Satır `--dt-row-h` | 52 | 40 | 32 px |
| Header `--dt-head-h` | 40 | 36 | 32 px |
| Yatay hücre dolgusu | 16 | 12 | 10 px |
| Metin / header | 13.5 / 12 | 13 / 12 | 12.5 / 11.5 px |
| Avatar / rozet | 24 / 24 | 20 / 22 | 18 / 20 px |

İkinci satır (`secondary`) yalnızca Comfortable'da. Dokunmatikte Compact → Standard; liste satırı ≥ 48 px.

### 4.6 Yarıçap, gölge, hareket

- Yarıçap: checkbox/kbd 4 · tag 5 · buton/input/çip 7 (sm 6) · menü öğesi 6 · segmented/mini tablo 8 · popover 10 · kart/bulk bar/toast 12 · dialog 14 · rozet 999 · telefon alt sayfası 18 px.
- Gölge yalnızca yüzen öğelerde: popover `--dt-shadow-pop`, dialog `--dt-shadow-dialog`, bulk bar/toast `--dt-shadow-float`, tooltip/hata balonu `--dt-shadow-tip`, düzenlenen hücre `--dt-shadow-editing`, sabit sütun kenarı `--dt-shadow-pin-l/r` (yalnızca o yöne kaydırılmışken).
- Hareket: hover 120 ms; sıralama/expand oku 150 ms döner; popover 120 ms ease-out; bulk bar 160 ms; kaydırma hapı 900 ms sonra 150 ms solar; skeleton 1.6 s; yenileme çubuğu 1.25 s. `prefers-reduced-motion` tüm döngüleri durdurur.
- İkonlar: Phosphor (regular), 16 px (buton), 14 px (hücre içi). Dekoratif ikonlar `aria-hidden`.

### 4.7 Sayı, tarih ve metin biçimleri [Karar]

| Şey | EN | TR |
|---|---|---|
| Sayı | 12,400 · 1,284.50 | 12.400 · 1.284,50 |
| Eksi | −320 (U+2212) | −320 |
| Yüzde | 68% | %68 |
| Kısa sayı (çip) | 100K – 250K TRY | 100 B – 250 B TRY |
| Para | 412,800.00 TRY (sayı + soluk ISO kodu, sembol yok) | 412.800,00 TRY |
| Tarih (bu yıl / başka yıl) | Oct 24 / Mar 3, 2025 | 24 Eki / 3 Mar 2025 |
| Tarih aralığı | Oct 12 – 24 | 12–24 Eki |
| Tarih-saat | Oct 17, 09:42 | 17 Eki 09:42 |
| Göreli | 2 hours ago | 2 saat önce |
| Gecikme | · 3d late | · 3 gün gecikti |
| Liste | In progress, Released | Devam ediyor, Yayınlandı |

Türkçe metinler İngilizceden ~%30 uzundur: sabit genişlikli buton yoktur, toolbar daralması metin genişliğinden ölçülür. Kısayollar macOS'ta `⌘ ⌥ ⇧`, diğerlerinde `Ctrl Alt Shift`.

### 4.8 Bileşen ölçüleri (sık kullanılanlar)

Toolbar padding 10 × 12, kontroller 32 px · filtre satırı 8 × 12, çip 28 px · buton 32 / 28 / 24 px · icon button 28 (24) · checkbox 16 px, seçim sütunu 40 px · menü öğesi 32 (iki satırlı 44) · footer min 48 px · bulk bar padding 6, buton 32, alt kenardan 64 px · dialog 460 (DataSheet hata listeli onay 480, import 560) · popover genişlikleri: Views 300–330, Column picker 264–280, Display/Columns 300–320, More 236, tarih 520, değer editörleri 296–300, operatör menüsü 220, sütun menüsü 248, satır menüsü 268.

---

## 5. Ortak çekirdek davranışları

Bu bölüm iki bileşende aynı şekilde çalışan parçaları tanımlar. Tasarım görevleri bunları yeniden tasarlamaz, kullanır.

### 5.1 Hücre tipleri (24) [Karar]

Her sütunun bir `type`'ı vardır; tip hücre görünümünü, hizalamayı, sıralamayı, filtre operatörlerini, filtre değer girişini, DataSheet editörünü ve dışa aktarma metnini birlikte belirler. Veriden tip çıkarsama yoktur. `custom` tipi yoktur; özel içerik için `cell`, uymayan veri için `object`.

| Grup | Tip | Hücre | Hizalama / genişlik varsayılanı |
|---|---|---|---|
| Sayı | `int` | `12,400`, negatif `−320` | sağ / 112 px |
| | `float` | Her zaman `decimalPlaces` hane (vars. 2): `1,284.50` | sağ / 112 |
| | `percentage` | `68%`; `display: 'bar'` → 90 px'e kadar çubuk + değer | sağ / 112 (bar 156) |
| | `star` | `max` yıldız (vars. 5), dolu `--dt-a-dot`; tooltip “4 of 5” | sol / 112 |
| | `currency` | `412,800.00` + soluk mono ISO kodu; negatif `−12,450.00` | sağ / 148 |
| Metin | `string` | Tek satır, `…`, tooltip | sol / `minmax(160px,1.2fr)` |
| | `text` | Yalnızca ilk satır `--dt-text-2`, sağda 14 px “genişlet” ikonu, tam metin hover kartında | sol |
| | `uppercase` / `lowercase` | Kaydedildiği gibi | sol |
| | `phone` | E.164 olduğu gibi (`+905324121807`); dokunmatikte `tel:` | sol / 156 |
| | `color` | 14 px kare + mono değer; `display: 'fill'` → hücre boyanır, yazı kontrasta göre | sol / 132 |
| | `email` | Düz metin; hover'da `mailto:` + kopyala | sol / 200 |
| | `url` | Yalnızca host, `↗`, yeni sekme | sol / 180 |
| | `id` | Mono, kayda link, hover'da kopyala | sol / 128 (birincil 136, sola sabit) |
| Seçim | `boolean` | Yes: yeşil rozet + ✓; No: nötr rozet + –; `falseTone: 'destructive'` → kırmızı + ✕ (D9) | sol / 96 |
| | `select` | Seçeneğin tonunda yumuşak rozet (nokta + etiket) | sol / 112–200 |
| | `multiselect` | En fazla 2 rozet, sonra `+N` (popover) | sol / 180 |
| | `ajax` | Sunucudan gelen etiket; kaydın URL'i varsa link | sol / 180 |
| | `user` | Avatar + isim; çoklu → avatar yığını (3 + `+N`); boş → “Unassigned” (kesik çizgili avatar) | sol / 156 |
| Tarih | `date` | `Oct 24` (yıl yalnızca başka yılsa); `overdue` ve geçmişse kırmızı metin + `· 3d late` | sol / 132 |
| | `datetime` | `Oct 17, 09:42`; `relative: true` → “2 hours ago”, tam zaman tooltip'te | sol / 156 |
| Yapısal | `object` | `summary()` metni veya “4 fields”, solda `{ }` rozeti; JSON popover. Kaçış kapısı: `cell` ile çizilir; sıralanmaz, filtrelenmez | sol / 180 |
| | `array` | İlk değerler + `+N`, solda `[ ]` rozeti | sol / 160 |

Skeleton tipe göre: metin → %55–80 çubuk, sayı → sağa yaslı kısa çubuk, rozet → 76×20 hap, kişi → daire + çubuk.

### 5.2 Boş değer, uzun metin, taşma, ikinci satır, birim [Karar]

- `null`, `undefined`, `''`, boş dizi → `emptyText` (varsayılan `—`, `--dt-text-3`). Asla boş hücre veya sahte `0`. Gerçek `0.00` gösterilir.
- Tek satır, `…` ile kesilir, tam değer 400 ms gecikmeli tooltip'te. DataTable ve DataSheet'te sarma yok (D8).
- `secondary` ikinci satır (SKU, e-posta) yalnızca Comfortable'da, 12 px `--dt-text-3`.
- Birim header'da soluk (`Lead time d`).
- Bilinmeyen `select` değeri ham değerle gri rozet.

### 5.3 Özel içerik ve hücre aksiyonları [Karar D21]

Sütun tanımları feature'ın `columns.ts` dosyasında yaşar; Vue slot ile hücre özelleştirme yoktur. Üç alan, üç ayrı iş:

| Alan | Ne | Tasarım için anlamı |
|---|---|---|
| `cell` | Hücre **içeriği**: uygulama `h()` ile kendi bileşenini çizer (durum rozeti, ilerleme çubuğu, onay düğmeleri). Tipin kabuğu (hizalama, kesme, boş değer, yoğunluk, hover) korunur | **Doğrudan görünen** düğme/ikon/menü içeren sütunlar bu yolla yapılır; her zaman görünürdür, hover gerektirmez |
| `actions` | Hücrenin **sağ kenarında yardımcı aksiyonlar**: Kopyala, Düzenle, Detay, ⋯ menüsü. Paket overlay olarak çizer | `reveal: 'hover'` (varsayılan): hover ve klavye odağında (`:focus-within`) görünür; `'always'`: her zaman. En fazla 2 ikon düğmesi, fazlası ⋯ menüsünde. Overlay metnin yerleşimini ve sütun genişliğini **değiştirmez**; satır zeminiyle aynı zemin üzerinde metnin kuyruğunu örter. `when(row)` ile değere bağlı aksiyon (ör. yalnızca kaydedilmiş satırda “Open”) |
| `editor` | DataSheet'te tipin editörü yerine özel editör (ör. kategori ağacı seçici) | Düzenleme deneyimi bölüm 8'deki kurallara uyar |

Örnek: Ürün adı hücresi normalde yalnızca adı gösterir; hover'da sağda **Copy** ve **Open product** ikonları belirir; odak klavyeyle gelince de belirir. Bir “Approve / Reject” sütunu ise `cell` ile iki küçük düğme olarak her zaman görünür.

### 5.4 Hücre içi etkileşim kuralları [Karar D24]

- Hücredeki düğmeye, linke, checkbox'a veya input'a tıklamak **yalnızca o öğeyi** çalıştırır: satır açılmaz, seçim değişmez, DataSheet'te düzenleme başlamaz. Geliştirici bunun için ek bir şey yazmaz; paket tek bir guard ile ayırır.
- Hücre içi widget'lar `Tab` durağı değildir (`tabindex="-1"`): yüzlerce düğme sekme sırasını şişirmez. Erişim ızgara klavyesiyle: satır/hücre odaklıyken `→` ilk widget'a, `→`/`←` widget'lar arası, `Esc` satıra/hücreye geri. Widget odaklıyken `Enter`/`Space` onu çalıştırır; ızgara kısayolları devre dışıdır, input/combobox kendi ok tuşlarını alır.
- Hover'da beliren aksiyonlar klavye odağında da görünür; yalnızca hover'a bağlı işlev yoktur.
- Hücre içi menü ve popover'lar portal ile açılır; `Esc` önce onları kapatır, odak tetikleyiciye döner (aksiyonlar görünür kalır), ikinci `Esc` hücreye.

### 5.5 Sanal satırlar [Karar]

DataTable ve DataSheet satırları sanal render eder: görünür satırlar + 10 overscan DOM'dadır, yükseklik yoğunluğa göre sabittir. Açık detay satırı yalnızca görünür aralıkta render edilir; yüksekliği ölçülür ve anahtarla önbelleklenir, kaydırıp dönünce zıplama olmaz. Odaklı satır (ve DataSheet'te aktif satır) kaydırmada da DOM'da tutulur; odak kaybolmaz. Kaydırırken sağ altta koyu hap: “Rows 41–56”, durunca 900 ms sonra solar.

### 5.6 Yükleme, boş, hata durumları (ortak kalıp) [Karar]

**Çerçeve asla çökmez:** toolbar/başlık, header ve footer yerinde kalır; durum içeriği gövdede ortalanır. Üç girdiden türer: yükleniyor mu, satır var mı, hata var mı.

| Durum | Ne zaman | Görünüm |
|---|---|---|
| First load | Yükleniyor, satır yok | Hemen skeleton (12 satır, tipe göre), 1.6 s parıltı; boş gövde gösterilmez |
| Refreshing | Yenileme, satırlar var | Satırlar etkileşimli kalır; header altında 2 px belirsiz çubuk (150 ms'den kısa sürerse görünmez); footer “Updating…” |
| Query change | Filtre/arama/sıralama/sayfa değişti | Eski satırlar `opacity .6` ve etkileşime kapalı; 400 ms'yi aşarsa skeleton; sayfalama kilitli |
| Empty | Satır yok, filtre yok | 40 px ikon kutusu, “No production orders yet”, açıklama ve uygulamanın aksiyonları (“Create order”, “Import from CSV”) |
| No results | Satır yok, filtre/arama var | “No orders match these 3 filters”; tek filtre varsa **Remove “Due date”**, aksi halde **Clear all filters**; arama varsa **Clear search** |
| Error | Hata, satırlar yeni sorguya ait değil | Eski satırlar kaldırılır; “Couldn't load orders”, uygulamanın mesajı, “Your filters are kept.”, **Try again**; hata kimliği varsa **Copy error ID** + mono `504 · req 8f3a1c2e` |
| Stale | Yenileme başarısız, eski satırlar var | Toolbar altında amber şerit “Couldn't refresh. Showing data from 09:42. **Retry**”; satırlar kalır; footer “Updated 14 min ago” |
| Still loading | 10 s'yi aşan yükleme | Mevcut görünüme “Still loading…” satırı |

Retry = aynı talebin yeniden yayılması; otomatik yeniden deneme yoktur. 401/403 için özel ekran yoktur; mesaj uygulamadan gelir.

### 5.7 Popover, menü, dialog, sheet, toast: ne zaman hangisi [Karar]

| Öğe | Kullanım | Kullanılmayan yer |
|---|---|---|
| **Popover** (10 px yarıçap, 120 ms) | Filtre değeri, operatör, görünüm menüsü, Display, Columns paneli, column picker, hücre JSON/uzun metin kartı | Kaydetmeyi gerektiren formlar |
| **Menü** (`role="menu"`) | Header ⋯, satır ⋯, More ⋯, hücre ⋯, sheet sağ tık | Değer seçimi (o combobox'tır) |
| **Dialog** (460 px, odak tuzağı) | Save as new view; görünüm silme onayı; DataSheet hata/ayrılma/discard onayları; Import (560 px) | Filtre düzenleme, sütun yönetimi (dialog yok, D22), toplu aksiyon onayı (uygulamanın) |
| **Bottom sheet** (telefon, 18 px üst yarıçap) | < 640 px'te tüm popover'lar; Filters | Masaüstü |
| **Toast** (koyu, altta) | DataSheet yapıştırma/içe aktarma sonucu + Undo; “Copied”. Toplu aksiyon ve kayıt toast'ları uygulamanın | Hata (hata yerinde gösterilir) |
| **Tooltip** (400 ms) | Kesilmiş değer, ikon düğmesi etiketi + kısayol (“Refresh (R)”), “Was 2,150.00 · ⌘Z” | Kritik bilgi |

Açılınca odak içeri (arama kutusu varsa ona), kapanınca tetikleyiciye. Dialog'da ilk odak **güvenli** düğmede (Keep editing / Stay / Fix first).

---

## 6. DataTable

Kaynak doküman: 05, 04.

### 6.1 Anatomi [Karar]

```
┌ uygulama başlığı (breadcrumb, sayfa başlığı) ───────────────────────┐  uygulamaya ait
├ DataTable kökü: flex sütun, ebeveyn yüksekliğini doldurur ───────────┤
│  Toolbar            52 px  (padding 10×12, kontroller 32 px)         │
│  FilterBar          44 px / satır, yalnızca filtre varken            │
│  ┌ kaydırma alanı  flex:1; yalnızca burası kayar ───────────────────┐ │
│  │  Header (sticky)                     --dt-head-h                 │ │
│  │  Satırlar (sanal)                    --dt-row-h + 1              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  Footer             min 48 px                                        │
└──────────────────────────────────────────────────────────────────────┘
   BulkBar  — yüzer, altta ortalı, alt kenardan 64 px
   ScrollPosition — yüzer, sağdan 22 px, alttan 62 px
```

- Kart: `--dt-surface`, 1 px `--dt-line`, 12 px yarıçap, `--dt-shadow-sm`. Sayfa kaymaz; gövde `overscroll-behavior: contain`.
- Sütun genişlikleri: sabit (pinli) sütunlar px; orta sütunlar `minmax(min, fr)`; kullanıcı resize edince px. Örnek düzen (Production orders): `40 │ 136 │ minmax(200,1.6fr) │ minmax(160,1.2fr) │ 124 │ 176 │ 156 │ 132 │ 148 │ 76` (seçim, WO no, ürün, müşteri, durum, üretilen, sahip, termin, tutar, aksiyonlar) → min 1350 px, aşarsa yatay kayar.
- Sabit sütunlar: seçim ve birincil sütun sola, satır aksiyonları sağa; kenar gölgesi yalnızca o yöne kaydırılmışken.

### 6.2 Veri modları ve yükleme geçişleri [Karar D18]

- **client:** uygulama tüm satırları verir; filtre, arama, sıralama, sayfalama yerelde ve anında. Footer toplamı bilir (“Rows 1–100 of 1,284”).
- **server:** paket sorguyu `@request` ile yayar (`search`, `filters`, `sort`, `page {number,size}`, görünür sütunlar, istenen alanlar, sebep: initial / query / page / columns / refresh); uygulama `rows`, `hasMore`, `loading`, `error` verir. Her yeni talep öncekini iptal eder.
- Kullanıcıya yansıması: filtre/sıralama/sayfa değişiminde eski satırlar soluklaşır ve etkileşime kapanır (400 ms'yi aşarsa skeleton), seçim ve açık satırlar temizlenir, sayfalama kilitlenir; yenilemede satırlar yerinde kalır ve ince çubuk görünür, seçim korunur. “Count total” sunucudan ayrıca istenir (`countable`), sonuç filtre değişene kadar geçerli.
- İki modda arayüz aynıdır; tasarım “client/server” ayrımı yapmaz.

### 6.3 Toolbar [Karar]

Sol = bağlam, sağ = görünüm ayarları ve aksiyonlar. **Yalnızca yapılandırılmış yuvalar görünür**; hazır ayar yoktur.

| # | Yuva | Görünme koşulu | Davranış |
|---|---|---|---|
| 1 | View switcher | En az bir görünüm varsa | Görünüm adı (600) + düzenlenmişse 6 px accent nokta; tıklanınca görünüm menüsü. `V` |
| 2 | Search | Aranabilir sütun varsa | 240 px; `/` odaklar; 250 ms sonra arar; çip üretmez (D3). İlk `Esc` temizler, ikinci odaktan çıkar |
| 3 | Filter | Filtrelenebilir sütun varsa | Sayaç rozeti = uygulanmış çip sayısı; column picker açar. `F`. Facet çipi yok (D26) |
| 4 | Filter bar | Yalnızca çip varken | Ayrı satır (6.5) |
| 5 | Display | Kullanılabilir ayar varsa | Popover 300–312 px: Density segmented · Columns › `8 of 14` · Sort › `Due date ↑` · Vertical grid lines switch · altta “Saved for you only” (yalnızca tercih deposu varsa) + Reset |
| 6 | More ⋯ | Öğe varsa | Export matching rows › CSV / Excel (seçim varsa üstte “Export 7 selected rows”) · Import… · Print · Refresh `R` · Auto-refresh switch (açıkken footer'da yeşil `live-dot` + “Live”). Her öğe yalnızca uygulama ilgili olayı dinliyorsa |
| 7 | `#toolbar-end` | Uygulama verirse | Birincil aksiyon (“New order”): mürekkep, asla accent mavi; en fazla bir |

Sıra `[1] [2] [3] ……… [5] [6] │ [7]`; 6 ile 7 arasında dikey ayırıcı. `toolbar: 'minimal'` yalnızca arama + sağ yuva; `false` toolbar yok.

**Daralma** (toolbar'ın kendi genişliğiyle ölçülür): ≥ 1024 px her şey etiketli · 640–1023 px Search ve Display yalnızca ikon (arama ikonu tıklanınca 240 px'e açılır) · < 640 px Display ⋯ içine, sağ yuva ikon modu, Filter ikon + sayaç.

Tazelik bilgisi (“Updated just now ↻”, “Live”) toolbar'da değil **footer'dadır**.

### 6.4 Arama [Karar D3]

Filtre değildir: çip üretmez, sayaca girmez, görünüme kaydedilmez, görünümü “edited” yapmaz. `searchable` sütunlarda (varsayılan: string, text, id, uppercase, lowercase, email, phone). Uzaktan öneri (suggest) yoktur. Sonuç yoksa No results aramayı da sayar: “No orders match “hc-99” and 2 filters”.

### 6.5 Filtreler [Karar D1, D2]

**Model:** filtre = sütun + operatör + değer. Çipler birlikte uygulanır (AND); grup, OR, iç içe koşul yoktur. Her sütun için en fazla bir çip; aralıklar tek çipte. 18 operatör, kelimeyle etiketlenir (“is greater than”, sembol yok):

| Tip grubu | Operatörler (etiket) | Varsayılan |
|---|---|---|
| Sayı, para, yüzde | is · is not · is greater than · is at least · is less than · is at most · is between · is empty · is not empty | is between |
| Metin | contains · doesn't contain · is · is not · starts with · ends with · is empty / is not empty | contains |
| `id` | is / is any of (liste yapıştırılırsa otomatik) · contains | is any of |
| `select`, `ajax`, `user`, `color` | is / is any of (1 değer tekil, 2+ çoğul) · is not / is none of · is empty; `user`'da “is me” | is any of |
| `multiselect` | is any of (“şunlardan birini içerir”) · is none of · is empty | is any of |
| `boolean` | is Yes / is No · is empty (popover yok) | is Yes |
| `date`, `datetime` | is · is before · is after · is within (hazır aralık veya özel) · is empty | is within |
| `star` | at least · at most · is · is empty | at least |

`currency` sütununda para birimi çipte ikinci bir parça olarak seçilir (segmented), değer düz sayıdır. Tarih hazır aralıkları: Today, This week, Next 7 days, This month, Last 30 days, This quarter, Overdue; göreli kalırlar (“This month” görünüme kaydedilince ay değişince kayar).

**Giriş noktaları:** toolbar Filter (`F`) → column picker; filtre satırında Add filter; header menüsü › Filter by this column…; filtrelenmiş header'daki filtre işareti; No results › Remove “…”.

**Column picker** (264–280 px): üstte arama; bölümler **Filtered** (“opens its chip” — mevcut çipi açar, yenisini oluşturmaz), **Suggested** (`suggested: true`, en fazla 4), **All columns** (sütun sırasında, sağda soluk tip etiketi: Date, Person, Currency…). Seçince çip tipin varsayılan operatörüyle oluşur ve değer popover'ı hemen açılır; `boolean` doğrudan “is Yes” olarak uygulanır.

**Çip anatomisi** (28 px, 7 px yarıçap, `--dt-line-2` kenar): `[ikon] Alan · operatör · değer │ ×` — **iki tıklama hedefi**: gövde (popover) ve kaldırma. Alan `--dt-text-2`, operatör `--dt-text-3`, değer 500 `--dt-text`. Durumlar: Applied, Hover (gövde `--dt-surface-3`), Editing (accent kenar + 3 px `--dt-focus-soft` hale), Incomplete (değer yerinde soluk “Select…”; sorguya ve sayaca girmez; popover değer seçilmeden kapanırsa çip kaldırılır), klavye odağı.

**Değer popover'ı** (296–300 px; tarih 520): üstte **operatör seçici** (her tipte; Include/Exclude ayrımı yok), seçenek tiplerinde ayrıca arama; gövde tipe göre: seçenek listesi (checkbox + rozet; hover'da sağda **Only**), takvim + hazır aralıklar, iki sayı alanı + “and” + para birimi, metin alanı, kişi listesi (**Me** en üstte, sonra **Unassigned**, ayırıcı, diğerleri); altta solda durum (“2 selected”, “Bounds included”, “Presets stay relative…”), sağda **Clear** (değeri siler, çip eksik kalır).

**Uygulama zamanı:** seçenek listeleri her işaretlemede anında (popover açık kalır); metin/sayı 250 ms sonra ve Enter'da; tarih hazır aralık tıklanınca; operatör değişiminde değer yalnızca aynı şekil grubunda korunur (`is any of` ↔ `is none of`, metin operatörleri arası), şekil değişirse çip eksik olur; `is empty` seçilince değer parçası gizlenir. `Esc` popover'ı kapatır, değeri geri almaz. Her filtre değişikliğinde sayfa 1'e döner, gövde başa kayar, seçim temizlenir.

**Değer özeti** (çip satırı kaymadan önce değer kısalır): uzun tek değer ≤ 180 px + tooltip; 2 değer virgülle; 3+ sayılır (“3 statuses”, sütunun `filterNoun`'u; yoksa “3 values”); kişiler 3 avatar + “3 people”; sayı aralığı `100K – 250K TRY`; tek uç `≥ 100K`; tarih `Oct 12 – 24` / “Last 30 days”.

**Filtre satırı:** çipler → **Add filter** (ghost, +) → sağda **Clear all** (satırın sağına sabit; görünüm kaydetme aksiyonları görünüm menüsündedir, D27). Taşma (D29): tek satır, sarma ve `+N more` yok; sığmayan çipler yatay kayar, sağ kenarda solma; Add filter kayan alanın dışında, taşınca sağda; düzenlenen/yeni çip görünür alana kaydırılır. Telefonda aynı satır, çip iki parça (alan + değer), dokunma Filters alt sayfasını açar.

### 6.6 Sıralama [Karar]

- Header tıklama: asc → desc → kapalı; diğer sıralamalar kalkar. ⇧ + tık ikincil sıralama ekler / yön çevirir / kaldırır; en fazla 3 sütun (dördüncü eklenince en eski düşer); header'da öncelik rozetleri `1 2 3` (14 px kare `--dt-surface-3`).
- Ok etiketin yanında, desc'te 180° döner (150 ms); sayısal sütunda ok etiketin solunda. `sortable: false` header tıklanmaz, ok yok. `object`/`array` sıralanmaz.
- Header menüsü: Sort ascending / Sort descending / Clear sort. Display › Sort: aktif sıralamaların listesi, yön çevirme, × ile kaldırma; sürükleme yok.
- Metin sıralaması yerel ayara uyar (Türkçe İ/ı doğru); boş değerler artan sırada sonda, azalan sırada başta (PostgreSQL ile aynı).
- Sıralama görünümün parçasıdır (D5): değişince görünüm “edited”. Sıralama değişince sayfa 1, seçim temizlenir.

### 6.7 Sütun başlıkları [Karar]

| Durum | Görünüm / davranış |
|---|---|
| Default | 12 px · 500 · `--dt-text-2`, `--dt-surface-2` zemin; sütunlar arası %40 yükseklikte 1 px ayraç |
| Hover | Sıralama oku ve `⋯` belirir; etiket butonu `--dt-surface-3` |
| Sorted / Multi-sort | Etiket `--dt-text`, ok görünür; öncelik rozeti |
| Filtered | Etiketin yanında `--dt-accent-text` filtre işareti; tıklanınca çip açılır |
| Pinned | 12 px raptiye; kenar gölgesi yalnızca kaydırılmışken |
| Long label | Kesilir, tooltip |
| Resize | Kenarda hover'da 2 px accent tutamaç; sürüklerken canlı genişlik rozeti (`184 px`); min 80 px; çift tık içeriğe sığdırır |
| Sıra | Menüden **Move left / Move right**, klavye `⌥⇧←/→`. Sürükleme yok (D22); sabit sütunlar kendi bölgesinde taşınır |

**Sütun menüsü** (`⋯` veya sağ tık, 248 px): `[tip etiketi]` · Sort ascending · Sort descending · Clear sort · ─ · Filter by this column… · ─ · Pin left · Pin right / Unpin · Fit to content · Move left · Move right · Hide column.

### 6.8 Sütun yönetimi: Display › Columns [Karar D22]

- Display popover'ı içinde drill-in (320 px): geri oku + “Columns” + `8 of 14 shown`; **Find a column** araması.
- Bölümler: **Pinned** (kilit; “Always shown” notu), **Shown** (sağda “Hide all”), **Hidden** (sağda “Show all”). Satır: tip ikonu · ad · göz switch'i · **Move up / Move down** okları. Sürükle tutamacı yok.
- Altta **Reset** (görünümün kayıtlı düzenine). Değişiklikler anında uygulanır ve görünümü “edited” yapar.
- Sütun gizleme/sıra/genişlik/sabitleme görünümün parçasıdır. Yeni görünen sütunun verisi sunucudan gelmemişse paket onu ister; o sütunun hücreleri gelene kadar skeleton.
- **Manage columns dialog'u yoktur** (860 px dialog ertelendi).

### 6.9 Görünümler [Karar D4, D5]

Görünüm = filtre + sıralama + sütun düzeni. Yoğunluk, çizgiler, arama, sayfa görünüme yazılmaz.

| Tür | Kim tanımlar | Kim görür | İzinler |
|---|---|---|---|
| **System** (“Built in”) | Ürün ekibi, kodda | Herkes | Duplicate, Set as default |
| **Personal** (“Only you”) | Kullanıcı | Yalnızca sahibi | Save changes, Rename, Duplicate, Set as default, Delete |

Kaydetme deposu yoksa yalnızca kod görünümleri vardır ve kaydetme aksiyonları gizlenir.

**Görünüm menüsü** (`V`, 300–330 px): üstte **Find a view…**; bölümler System views / My views (paylaşılan görünüm yok, D30); aktif kalın; varsayılanın sağında soluk `Default`; düzenlenmişin sağında nokta + `Edited`; satır `⋯` → Rename · Duplicate · Set as default · ─ · Delete (türe göre); altta **New view**. Manage views ekranı ve görünüm sekmeleri yoktur.

**Düzenlenmiş durum:** mevcut durum kayıtlıdan farklıysa görünüm adı yanında nokta + “Edited”; görünüm menüsünün en üstünde kaydetme bölümü (D27): ““Gebze · this week” edited” etiketi, **Save changes** (`⌘S`) · **Save as new view…** · **Discard changes**. Filtre satırında gösterge yoktur. System görünüm üzerine yazılamaz: ““Late orders” edited” + **Save as my view…** (`⌘S`) + Discard changes. Kaydedilmemiş değişiklik oturum boyunca görünüm başına bellekte kalır: başka görünüme geçip dönünce düzenleme yerinde durur; toast yok.

**Save as new view** dialog'u (460 px): başlık, alt metin (“It appears under My views. Only you can see it.”), **Name** (otomatik odak; Duplicate'ten “{ad} copy”; 60 karakter; aynı türde benzersiz), özet (Filters `Plant · Created · Owner` · Sort `Due date ↑` · Columns `8 of 14 · Order pinned`), **Make this my default view**; Cancel / **Save view**.

**Varsayılan görünüm:** kullanıcının Set as default'u (tercih) → kodda `default` olan → ilk system view. **Silme:** onay dialog'u (“Delete “{name}”?” · Cancel · **Delete**), anında silinir, Undo yok.

### 6.10 Tercihler [Karar D5]

Yoğunluk, dikey çizgiler, sayfa boyutu, varsayılan görünüm — ekran başına kişisel. Uygulama bir depo vermişse kalıcı (“Saved for you only”); vermemişse oturumluk ve arayüz “kaydedildi” demez. Display › Reset tercihleri varsayılana döndürür.

### 6.11 Seçim ve toplu işlem [Karar D6, D19, D20]

- Satır başındaki checkbox seçer (`aria-label="Select WO-26-0418"`); ⇧ + tık son tıklananla arasındaki aralığı; header checkbox **bu sayfadaki** satırlar (kısmi seçimde `indeterminate`); klavyede `X` seçer, `⇧↑/↓` genişletir, `⌘A` sayfadakiler.
- **Satır gövdesine tıklamak asla seçmez.**
- **Seçim sayfa kapsamlıdır:** sayfa, sayfa boyutu, filtre, arama veya sıralama değişince temizlenir; yenilemede korunur. Sayfalar arası seçim, “Select all matching”, hariç tutma yoktur. Sayaç yalnızca “4 selected”.
- Seçili satır `--dt-row-selected`; hover `--dt-row-selected-hover`.
- **Bulk bar** (varsayılan yüzer): koyu (`--dt-bulk-bg`), 12 px yarıçap, padding 6, butonlar 32 px; altta ortalı, alt kenardan 64 px; düzeni kaydırmaz; ilk seçimde 160 ms yukarı kayar. İçerik: `[4 selected] │ aksiyonlar (en fazla 3, `inBar`) │ ⋯ (kalanlar, yıkıcılar en altta “Cancel 4 orders…”) │ ×`. Alternatif `selection-bar: 'toolbar'`: seçim varken toolbar'ın yerine geçer. Uygulama çubuğun aksiyon alanını tamamen kendi içeriğiyle de doldurabilir.
- Aksiyon tıklanınca paket aksiyonu çağırır ve **beklemez**: onay dialog'u (uygulamanın kendi onayı için örnek: 460 px dialog, başlık “Cancel 4 production orders?”, etkilenen ilk 5 kayıt mono listede, atlanacak notu, isteğe bağlı seçenek, Keep orders · **Cancel 3 orders** kırmızı; ilk odak güvenli düğmede), toast, seçimi temizleme ve yenileme uygulamanındır.
- Telefonda bulk bar yanlardan 10 px, alttan 30 px, 14 px yarıçap; butonlar 44 px, ikon üstte etiket altta.

### 6.12 Satır etkileşimleri [Karar D6]

Aynı satır, üç derinlik:

| | Ne | Nasıl açılır | Liste |
|---|---|---|---|
| **Expand** | Alt kayıtlar satırın altında (operasyonlar, sipariş kalemleri, partiler) | Birincil hücredeki chevron; `→` aç / `←` kapa; `row-click="expand"` | Yerinde kalır |
| **Open** | Tam detay sayfası | Birincil link (gerçek `<a>`); satırda `↵`; satır menüsü › Open; `row-click="open"`. Yeni sekme: ⌘/Ctrl veya orta tık (tarayıcı) ya da `→` ile linke odaklanıp `⌘↵` | Terk edilir |

- **Satır gövdesi varsayılan olarak hiçbir şey yapmaz** (`row-click: 'none'`): metin seçilip kopyalanabilir. Uygulama `row-click` ile open/expand'den birini bağlayabilir; her durumda etkileşimli hedefe tıklama, metin seçimiyle biten tıklama, sürükleme ve değiştirici tuşlu tıklama yok sayılır; seçim asla tıklamayla yapılmaz.
- **Satır durumları:** Default `--dt-surface` · Hover `--dt-row-hover` · Selected · Klavye odağı 2 px accent çerçeve (`::after`, 3 px yarıçap).
- **Satır aksiyonları** (sağa sabit, içeriğe göre 44 / 66 px): yalnızca **⋯** (her zaman görünür; D28). Sağ tık da menüyü açar. Satır menüsü (268 px): Open `↵` · Open in new tab · **Copy order number** (yerleşik; toast “Copied”) · ─ · uygulamanın aksiyonları (pasif olan gerekçesiyle iki satır: “Release — Already running”; yıkıcı en altta kırmızı, sonu `…`).
- **Expand:** chevron 20 px birincil hücrede ID'nin solunda; açıkken 90° döner. Alt satır tam genişlik, `--dt-surface-2`, sol kenarı seçim sütununun sağından; içinde uygulamanın içeriği — örnek: mini tablo (8 px yarıçap, kendi header'ı, 34 px satırlar) + özet satırı (“4 operations · Line 2 routing” + “Open routing”). **Veriyi uygulamanın içeriği çeker;** yükleniyor/hata görünümü de onun (paket “Loading…” göstermez). Birden çok satır açık olabilir; sorgu/sayfa değişince kapanır; sanal listede zıplama olmaz.

### 6.13 Sayfalama ve footer [Karar D7]

Tek biçim: **simple**. Footer solu: `Rows 101–200 · Count total │ Updated just now ↻`; sağı: `Rows per page [100 ▾] │ ‹ Previous  Next ›`.

| Durum | Sol metin |
|---|---|
| Normal | `Rows 101–200 · Count total` (sayım isteğe bağlıysa) |
| Counting | `Rows 101–200 of ⟳ Counting…` |
| Counted / client | `Rows 101–200 of 1,284` (sunucuda `· counted 09:42`) |
| Son sayfa | `Rows 1,201–1,284 · end of results` |
| Tek sayfa | `Rows 1–37`, Previous/Next pasif |
| 0 satır, sayfa > 1 | Gövdede “No rows on this page” + **Go to previous page** |

Rows per page 50 / 100 / 250 / 500 (tercih); değişince sayfa 1. Previous ilk sayfada, Next son sayfada pasif. `Alt+←/→`. Sayfa değişince gövde başa kayar, seçim ve açık satırlar temizlenir. Sayfa/sorgu talebi sürerken düğmeler pasif; footer yalnızca başarıyla yüklenmiş veriyi gösterir. Numbered, load-more, infinite ve URL yazımı yoktur.

### 6.14 Durumlar

Bölüm 5.6'daki ortak kalıp. DataTable'a özgü: Empty'de uygulamanın birincil + ikincil aksiyonu (“Create order”, “Import from CSV”); No results'ta çipler satırda görünür kalır ve metin filtre sayısını söyler; Error'da toolbar çalışmaya devam eder, filtreler korunur; Stale'de footer “Updated 14 min ago”.

### 6.15 Klavye haritası [Karar]

Izgara tek Tab durağıdır (roving tabindex); Tab ile girilince son odaklanan satıra. Tek harfli kısayollar odak metin alanında değilken; uygulama bunları kapatabilir, oklar/Enter/Space/Esc her zaman çalışır.

| Tuş | Eylem |
|---|---|
| `/` · `F` · `V` · `R` | Aramaya odaklan · Filter · Görünüm menüsü · Refresh |
| `↑ ↓` · `Home/End` · `PageUp/Down` | Satırlar arası · ilk/son yüklü satır · bir ekran |
| `→` / `←` | Açılabilir satırı aç / kapa; değilse ilk widget'a gir / satıra dön; widget'lar arası |
| `X` · `⇧↑↓` · `⌘A` | Seç/bırak · seçimi genişlet · sayfadakileri seç |
| `↵` | Kaydı aç |
| `⇧F10` / Menü | Satır menüsü |
| `Esc` | Sırayla: popover → seçim |
| `Alt←` / `Alt→` | Önceki / sonraki sayfa |
| `⌘S` | Görünüm düzenlenmişse Save changes / Save as my view |
| `F6` | Bölgeler arası: toolbar → filtre satırı → ızgara → footer → bulk bar |
| Header'da `↵`/`Space` · `⇧↵` · `⇧F10` · `⇧←→` · `⌥⇧←→` | Sırala · ikincil sıralama · sütun menüsü · genişlik ±16 px · sütunu taşı |

### 6.16 Responsive [Karar ilke 4]

| Genişlik | Değişiklik |
|---|---|
| ≥ 1024 px | Varsayılan |
| 640–1023 px | Toolbar daralır |
| < 640 px | Seçim ve birincil sütun sola sabit, diğerleri yatay kayar (sağ kenarda solma); toolbar: görünüm adı, arama ikonu (tam genişlik alana açılır), filtre ikonu + sayaç, ⋯; çip satırı tek satır kayar; tüm popover'lar alt sayfa (52 px satırlar, tutamaç, tam genişlik birincil buton); bulk bar telefon düzeni; dokunmatikte Compact → Standard, satır ≥ 48 px, checkbox dokunma alanı 44 px (görsel 16); satır ⋯ sütunu (44 / 66 px) sağa sabit kalır |

**Filters alt sayfası** (< 640 px): başlık “Filters” + Clear all; uygulanmış filtreler, sonra `suggested` sütunlar (`Owner · Any`) 52 px satırlar; Add filter; **Sort** bölümü; altta tam genişlik **Show results** (değişiklikler bu düğmeyle uygulanır, masaüstündeki anında uygulamadan farklı).

### 6.17 Senaryo: Üretim emirleri listesi

Ayşe sabah “Production orders” ekranını açar. Varsayılan görünümü “Gebze · this week” (personal) yüklenir: Plant = Gebze, Due date is within This week, sıralama Due date ↑. Toolbar: görünüm adı, arama, Filter (2), Display, ⋯, “New order”. Filtre satırında iki çip. Tablo 100 satır, `Due date` sütununda geciken emirler kırmızı “Oct 18 · 3d late”. Ayşe Filter'dan Status çipi ekleyip “On hold” seçer; tablo anında daralır, görünüm “edited” olur (ad yanında nokta + Edited; kaydetme görünüm menüsünün üstünde). 12 satırı header checkbox'ıyla seçer; bulk bar “12 selected · Release · Reschedule · ⋯ · ×”. Release'e basar; uygulama kendi onay dialog'unu açar, tamamlanınca toast gösterir ve tabloyu yeniler (satırlar yerinde kalır, ince çubuk). Bir emrin satır menüsünden (⋯) numarasını kopyalar, `↵` ile emri açar.

---

## 8. DataSheet

Kaynak doküman: 07.

### 8.1 Amaç ve kurallar [Karar D11–D14]

Ürün kartları, fiyat listeleri gibi **çok sayıda kaydı tek seferde düzenleme** ekranı (en fazla 10.000 satır). Excel alışkanlığı tarayıcıya taşınır: hücreye yaz, aralık kopyala/yapıştır, aşağı doldur, geri al, Excel dosyası içe aktar. Değişiklikler orijinal satırlara dokunmadan **taslakta** birikir; **tek Save** yeni ve değişen satırları uygulamaya teslim eder; uygulama kendi API'siyle anahtar sütuna (SKU) göre upsert yapar ve sonucu bildirir; hatalar ilgili satır ve hücreye döner.

- **D11** Tek Save → yalnızca yeni + değişen satırlar → anahtara göre upsert. Asla silmez.
- **D12** Satır ekleme/çıkarma partiyi değiştirir; sunucuda kayıt oluşturmaz/silmez. “Remove from list” nötrdür.
- **D13** Filtre yalnızca görünümü daraltır; gizlenen satırlardaki değişiklikler korunur ve gönderilir.
- **D14** Telefonda (< 768 px veya yalnızca dokunmatik) salt okunur.

### 8.2 Anatomi

```
Products › Bulk edit · Bulk edit products                                        (sayfa başlığı uygulamanın)
┌ kart (Compact, flex:1) ──────────────────────────────────────────────────────────────────────────────┐
│ [⌕ Find ⌘F] [Filter 1] │ (All 10,000 | Changed 96 | Errors 1) ↶ ↷ │ Add row Import Export ⚙ │ ● 128 changes in 96 rows · 1 new [Discard] [✓ Save changes ⌘S] │  Toolbar
│ [Category · is any of · 6 categories ×]  Filters only change what you see — hidden rows keep their edits.                     │  FilterBar
│ PS-045-C · List price │ fx │ 96.50                                                   Currency · TRY · required · ≥ 0        │  Formula bar 36 px
│ Row │ SKU      │ Product name *          │ Category * │ Unit │ List price * │ Cost │ VAT │ Min stock │ Lead time d │ Active │  Header
│   1 │ HC-080-S │ Hydraulic cylinder HC-80│ Hydraulics │ pcs  │     1,650.00 │ 1,120.00 │ 20% │ 10 │ 14 │ Yes │          │  role="grid"
│ 10,000 rows · ■ 128 changes in 96 rows · 1 new row · ■ 1 error — go to          Count 5  Sum 1,153.50  Average 230.70 │  Status bar 36 px
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Kart viewport'u doldurur; yoğunluk Compact (32 px satır); dikey çizgiler açık.
- **Toolbar:** Find in grid (240 px, `⌘F`; eşleşmeleri vurgular ve gezer, satır gizlemez; `3 of 41`) · Filter (çip sistemi, yerel) · All / Changed / Errors segmented (sayılı; Errors kırmızı) · Undo / Redo (yığın boşsa pasif) · Add row · Import Excel (uygulama dosya ayrıştırıcı vermişse) · Export (All rows / Visible rows › Excel / CSV) · Display ⚙ (yoğunluk, Columns ›, çizgiler; Sort › yok) · sağda **Save kontrolleri**: 6 px accent nokta + “**128** changes in 96 rows · 1 new” · **Discard** (ghost) · **Save changes** (mürekkep, ✓, `⌘S`). Değişiklik yokken nokta yok, “No changes”, düğmeler görünür ama pasif (düzen zıplamaz).
- **Formula bar** (36 px): ad kutusu 240 px (aktif satırın anahtarı mono · sütun adı; aralıkta `5 × 1 cells`) · **fx** 40 px (yalnızca simge; **formül desteklenmez**, `=` metin sütununda metin, sayı sütununda hata “Formulas aren't supported”) · değer alanı (aktif hücrenin ham değeri; buraya yazmak hücreyi düzenler) · sağda ipucu “Currency · TRY · required · ≥ 0”.
- **Status bar** (36 px, `--dt-surface-2`): sol `10,000 rows` · ■ `128 changes in 96 rows` · `1 new row` · ■ kırmızı **`1 error — go to`** (F8 ile aynı); sağ seçim özeti `Count 5  Sum 1,153.50  Average 230.70` (sayısal hücre varsa; tek hücrede gizli). Kayıt sonucu burada görünür (“96 rows saved · 24 created · 72 updated”).

### 8.3 Sütunlar, gutter, anahtar [Karar]

| Sütun | Genişlik | Not |
|---|---|---|
| Gutter (satır no) | 56 px, sola sabit, `role="rowheader"` | Mono 11 px `--dt-text-3`, sağa yaslı, `--dt-surface-2`; solunda işaret: değişti = 6 px accent kare, hata = 13 px kırmızı ikon, yeni = 13 px accent `+`. Numara **kararlıdır**: yükleme sırası; yeni satırlar 10,001… ; sıralama/filtre numarayı değiştirmez |
| Anahtar (`keyColumn`, ör. SKU) | 128 px, sabit, mono | Header tooltip “Match key — an existing SKU updates that product, a new SKU creates one”; header'da kilit ikonu. Yüklenmiş satırlarda salt okunur, yeni satırda düzenlenebilir; yeni satırda sağda `New` / `Update` etiketi |
| Birincil ad | `minmax(220px, 1.4fr)`, sabit | |
| Diğerleri | Tanımdaki `width`, yoksa tip varsayılanı | Sayısal sağa yaslı; zorunlu sütun header'ında kırmızı `*`; birim header'da soluk (`Lead time d`) |

Sütunlar **varsayılan olarak salt okunurdur**; düzenlenecek sütun `editable` ile açılır (satır bazında fonksiyon olabilir). Sütun genişliği/gizleme oturumluktur; sıra sabittir.

### 8.4 Hücre durumları [Karar]

Mavi = senin değişikliğin veya seçimin · kırmızı = kaydedilemez · amber = ikinci bir bakışa değer.

| Durum | Görünüm | Davranış |
|---|---|---|
| Editable | Normal, `cursor: cell` | Çift tık, F2 veya yazmak düzenler |
| Read-only | `--dt-surface-2` zemin, `--dt-text-2`; aktif/hover'da sağda 12 px kilit | Yapıştırma ve doldurma atlar; `aria-readonly` |
| Active | 2 px accent iç çerçeve, sağ altta 7 px accent **fill handle** | Roving tabindex: DOM odağı bu hücrede |
| In selection | `--dt-accent-soft` zemin, aralığın dış kenarında 1.5 px accent | Status bar'da Count/Sum/Average |
| Editing | `--dt-surface` zemin, 2 px accent + `--dt-shadow-editing`, üstte | Enter onaylar, Esc iptal |
| Changed | `--dt-accent-soft` zemin + sağ üstte 7 px accent köşe üçgeni | Hover tooltip “Was 2,150.00 · ⌘Z” |
| Error | `--dt-r-bg` zemin + 1.5 px `--dt-r-dot` iç çerçeve + kırmızı köşe | Satırı kayıttan alıkoyar; hover/aktifken hücrenin üstünde kırmızı balon (`--dt-error-tip-bg`, beyaz metin) |
| Warning | `--dt-a-bg` zemin + amber köşe | Kayda izin verir (“Price changed by more than 40%”) |
| Required, empty | Hücrede kırmızı “Required” | Hata ile aynı |
| New row | Anahtar hücresi `--dt-accent-soft` + `New`; gutter'da `+` | Bilinmeyen anahtar → Save oluşturur |

Öncelik: Error > Warning > Changed. Renk tek başına anlam taşımaz: değişmiş = zemin + köşe + gutter noktası; hata = zemin + çerçeve + ikon + metin.

### 8.5 Seçim ve aralıklar [Karar]

Tık tek hücre; ⇧ + tık veya ⇧ + ok aralığı genişletir; sürükleme aralık seçer (kenara yaklaşınca otomatik kayar); gutter tıklaması satırın tamamı, ⇧ ile satır aralığı; `⌘A` görünür tüm hücreler. Tek seferde **tek aralık** (⌘-tık ile çoklu aralık yoktur). Header tıklaması sıralar, sütun seçmez. Aktif hücre kaydırmada DOM'da kalır; ok tuşu hedefi görünüre getirip odaklar.

### 8.6 Düzenleme ve editörler [Karar]

| Eylem | Sonuç |
|---|---|
| Yazmaya başlamak | Düzenleme açılır, içerik **yazılanla değiştirilir** |
| F2 / çift tık | Düzenleme açılır, imleç sonda |
| Enter (düzenlemede) | Onaylar, aşağı iner; düzenleme dışında aşağı iner (Excel) |
| Tab / ⇧Tab | Onaylar, sağa / sola |
| Esc | İptal, eski değer |
| Delete / Backspace (seçimde) | Seçili hücreleri temizler (read-only atlanır) |
| Space (`boolean`) | Yes ↔ No, popover yok |

Editörler filtre değer girişleriyle **aynı bileşenlerdir**: `string`/`text` metin (text büyük kutu, ⇧Enter yeni satır) · sayı/para sağa yaslı, `2240`, `2.240,00`, `2,240.00` kabul eder, para kodu soluk · `select`/`ajax` combobox (yazmak süzer, Enter seçer; listede olmayan değer → hata ““Pump” isn't an option” + yakın eşleşme varsa **Use Pumps**) · tarih yazılabilir (“24.10”, “+7d”, “today”) veya seçici · `boolean` Space · `multiselect` çoklu combobox · `object` JSON metni. Uygulama bir sütun için **özel editör** verebilir (kategori ağacı, ürün arama); portallı popover/combobox kullanabilir.

**Onaylama kuralları:** tek düzenlenen hücre vardır; **blur ile onaylama yoktur**. Onaylayanlar: Enter/Tab, başka hücreye tıklama, ızgara dışına tıklama; Esc iptal. Açık combobox listesinde ↓/Enter/Esc önce listeyi yönetir, ikinci Esc düzenlemeyi iptal eder; popover açıkken odak oraya gidebilir, düzenleme sürer. Hücredeki aksiyon düğmeleri düzenleme başlatmaz.

**Doğrulama** hücre onaylanınca anında: tip → `required` → hata kuralı → uyarı kuralı; aynı satırın diğer hücreleri de yeniden doğrulanır (“Cost can't be higher than list price (214.50)”).

### 8.7 Pano ve doldurma [Karar]

- **Kopyala/Kes:** `⌘C` aralığı TSV + HTML olarak panoya, **görüntülenen biçimde** (Excel'e doğru yapışsın). `⌘X` kopyalar ve hemen temizler (tek undo adımı); read-only kopyalanır ama temizlenmez.
- **Yapıştır:** başlangıç aktif hücre; tek değer + aralık seçiliyse değer tüm aralığa; aralık > seçim → aktif hücreden itibaren pano boyutu kadar; **yalnızca görünür satırlara** sırayla (filtreyle gizlenenler atlanır); son satırın altına taşanlar **yeni satır** olur; read-only atlanır; seçenekler etiketle eşleşir (büyük/küçük harf ve `İ/ı` duyarsız; eşleşmeyen → hücre hatası); sayılar panonun yerel ayarından çıkarsanır (`1.234,56` virgül ondalık, `1,234.56` nokta; belirsizse uygulama locale'i); `%20`, `20%`, `20` → 20%. Sonuç toast'ı: “**Pasted 5 rows × 3 columns** · 2 values aren't options · **Review** · Undo ⌘Z”. `maxRows` aşacaksa uygulanmaz (“This paste would make 10,240 rows. The limit is 10,000.”). Tek undo adımı.
- **Doldurma:** fill handle dikey sürüklenir; hedefler kesik accent çerçeve, etiket “Fill 4 cells with 10%”; kaynak en az iki sayısal hücre ve sabit artışlıysa seri (1, 2, 3), aksi halde kopyalar; `⌘D` seçimi ilk satırından aşağı doldurur; read-only atlanır; yatay doldurma yok.

### 8.8 Geri al / yinele [Karar]

`⌘Z` / `⌘⇧Z` (Windows `Ctrl+Y`). Adım = tek kullanıcı işlemi: hücre düzenleme, yapıştırma, doldurma, temizleme, kesme, satır ekleme, listeden çıkarma, içe aktarma. 100 adım. Undo seçimi ve aktif hücreyi o adımın yerine taşır. Kayıt sonucu işlenince ve Discard'da yığın temizlenir.

### 8.9 Satırlar bir partidir [Karar D12]

- **Add row** (toolbar) veya hücre menüsü › Insert row above/below: yeni satır varsayılan değerlerle, odak anahtar hücresinde, düzenleme açık. Anahtar yazılınca (300 ms) uygulama kontrol eder (verilmişse): sunucuda yok → `New` (accent), Save oluşturur; var, listede yok → `Update` (nötr), Save günceller **[Açık Q2: Update satırının boş hücreleri sunucudaki değerlerle doldurulsun mu? Dokümandaki varsayılan: evet, yalnızca değişen alanlar gider]**; listede zaten var → hata “HC-080-S is already in row 1”, hiçbiri gönderilmez.
- **Remove from list** (`⌘−`, hücre menüsü; çoklu seçimde hepsi): nötr renk; toast “Row 214 removed from this list. The product isn't deleted. **Undo**”. Çıkarılan yüklenmiş satırın değişiklikleri gönderilmez.
- **Hücre menüsü** (sağ tık): Cut `⌘X` · Copy `⌘C` · Paste `⌘V` · Fill down `⌘D` · Clear contents `Del` · ─ · Insert row above · Insert row below · Remove from list `⌘−` · ─ · Open product (yeni sekmede; yalnızca sunucuda var olan satırlar).

### 8.10 Sıralama, filtreler, All / Changed / Errors [Karar D13]

- Header tıklaması **yerel** sıralar; değişiklikler satırıyla taşınır; gutter numaraları değişmez; düzenlenen satır imlecin altından kaçmaz (sıralama sonraki header tıklamasında yeniden uygulanır).
- Filtre çipleri yerelde, taslak değerler üzerinde; sabit not “Filters only change what you see — hidden rows keep their edits.”; düzenleme sonrası filtreye uymayan satır gizlenmez, gutter'da soluk “doesn't match filters”.
- **All / Changed / Errors** segmented filtrelerle AND; Errors görünümünde son hatayı düzelttiğin satır yerinde kalır. `F8` / `⇧F8` sonraki/önceki hata; gizliyse toast “Next error is hidden by filters · Show it”.

### 8.11 Kaydetme, ilerleme, sonuç [Karar D18]

- `⌘S` veya **Save changes**. Hatalı satır varsa önce dialog: “**1 row has errors** — It won't be sent. The other 95 changed rows will be saved.” · **Fix first** · **Save 95 rows**. Uyarılar dialog açmaz.
- Paket değişiklikleri uygulamaya teslim eder (yeni satır: tüm dolu alanlar; değişen satır: yalnızca değişen alanlar). **Uygulama kaydederken** (`saving`): grid salt okunur (kaydırma, Find, seçim serbest); toolbar'ın yerini ilerleme şeridi alır: “**Saving… 4,800 of 9,600 rows**” + 6 px çubuk (sayaç yoksa belirsiz); Save düğmesi spinner “Saving…”, Discard pasif. Chunk, Stop, ETA ve çevrimdışı banner'ı **uygulamanın kendi arayüzüdür**.
- **Sonuç işlenince:** kaydedilen satırların işaretleri kalkar (sunucu satır döndürdüyse değerler onunla); hatalı satırlar değişikliklerini korur, hatalar hücrelerde ve gutter'da. Undo yığını temizlenir.
- **Bitiş:** Saved → status bar “96 rows saved · 24 created · 72 updated”, sonra “No changes” (toast uygulamanın). Partly saved → toolbar altında kırmızı banner (`role="alert"`) “**3 rows couldn't be saved.** 9,597 rows were saved.” · **Copy errors** (TSV: Row · SKU · Column · Message); görünüm otomatik **Errors**, aktif hücre ilk hatada, `1 of 3` gezinme. Taşıma hatası (ağ, 5xx, yetki) uygulamanın banner'ıdır; taslaklar olduğu gibi kalır.
- **Ayrılma:** değişiklik varken dialog “**Leave without saving?** 128 changes in 96 rows will be lost.” · Stay · **Discard changes** (kırmızı). **Discard:** “Discard 128 changes in 96 rows?” · Keep editing · **Discard changes**; her şey yüklendiği hale döner.

### 8.12 Açılış ve içe aktarma

- **Açılış:** uygulama satırları yükler; sayaç verirse kartın üstünde “Loading products… 6,200 of 10,000” + çubuk, altında skeleton satırlar. Düzenleme tamamı gelince açılır. `maxRows` aşılırsa “Showing the first 10,000 products. Narrow the selection to edit the rest.”
- **Import from Excel** (dialog 560 px): açıklama “Rows are matched by SKU…”; dosya (sürükle/seç, `.xlsx .xls .csv`; dosya kartı “Sheet “Fiyatlar” · 1,252 rows” · Replace file; sayfa seçici); başlık satırı; **Match rows by SKU ← “Stok Kodu”** (eşlenmeden Apply pasif); sütun eşleme tablosu (Excel column → Field, “Don't import”, First value önizlemesi `1.650,00 → 1,650.00`, `%20 → 20%`; otomatik eşleme header/id/`importAliases` ile, Türkçe karakter ve boşluk duyarsız; read-only alanlar pasif); özet banner “**1,240** update existing products · **12** new SKUs · See new SKUs” + “Add the 12 new SKUs as new rows”; Cancel · **Apply to grid**. Excel'deki boş hücre mevcut değeri silmez **[Açık Q3]**; tek undo adımı; toast “Imported 1,252 rows · 1,240 updated · 12 new · Undo”.

### 8.13 Telefon ve klavye

- **< 768 px veya yalnızca dokunmatik:** salt okunur. Banner “**Editing needs a larger screen.** You can search and look at products here; changes are made on a computer.” · Copy link. Anahtar sütunu sabit 104 px, kalanlar kayar; Find ve Filter çalışır; seçim aralığı, düzenleme, Add row, Import, Save yok; footer “10,000 products · Read-only”; satır 44 px. Karar açılışta verilir.
- **Klavye:** `↑↓←→` hücreler, `Tab/⇧Tab` sağ/sol (satır sonunda sonraki satırın başı), `↵` aşağı / düzenlemede onayla+aşağı, `F2` düzenle, herhangi karakter düzenle, `Esc` iptal / seçimi tek hücreye indir, `Space` boolean, `Delete` temizle, `⇧+oklar` genişlet, `⌘+oklar` veri bloğunun kenarı, `Home/End`, `⌘Home/End`, `PageUp/Down`, `⌘A`, `⌘C/X/V`, `⌘D`, `⌘Z/⌘⇧Z`, `F8/⇧F8`, `⌘F`, `⌘−`, `⌘S`, `⇧F10` hücre menüsü, `Alt↓` select/date seçicisini aç. Hücredeki widget'a `→` (düzenlenemez hücrede `Enter`) ile girilir.

### 8.14 Senaryo: Ürün fiyat listesi

Can “Products › Bulk edit” ekranını açar; 10.000 ürün yüklenir (ilerleme şeridi), düzenleme açılır. Excel'den 300 satır × 3 sütun (SKU, List price, Cost) kopyalayıp A1'e yapıştırır: 298 satır Changed olur, 2 SKU listede yoktur ve yeni satır olarak sona eklenir (`New`); toast “Pasted 300 rows × 3 columns · Undo”. Status bar “10,000 rows · 300 changes in 298 rows · 2 new rows”. Bir hücrede maliyet liste fiyatını aşmıştır: hücre kırmızı, balonda “Cost can't be higher than list price (214.50)”; Errors segmenti “1”. Can `F8` ile hataya gider, düzeltir. `⌘S`: değişiklikler uygulamaya gider; uygulama 500'lük parçalarla kaydederken şerit “Saving… 300 of 300 rows” sayacını gösterir; sonuçta 299 satır kaydedilir, 1 satır barkod çakışması hatası alır: kırmızı banner “1 row couldn't be saved. 299 rows were saved.”, görünüm Errors'a geçer, hücrede “Barcode is already used by HC-080-S”.

---

## 9. Teknik mimari (davranış düzeyinde)

Bu bölüm geliştiriciye sunulan imkânları ve neden böyle seçildiğini anlatır; implementasyon ayrıntıları 01 ve `api-draft.ts`'dedir.

### 9.1 Teknoloji seçimleri [Karar]

| Konu | Seçim | Neden |
|---|---|---|
| Çerçeve | Vue 3.5+, `<script setup lang="ts">`, TypeScript strict | ERP uygulamasının yığını; generic bileşenler satır tipini (`Order`) sütun tanımından çıkarır |
| Tablo mantığı | **TanStack Table 9** (headless) | Sütun modeli, sıralama, sayfalama durumu, satır seçimi, expand ve hücre seçimi hazır; UI bize ait. Paket içinde dört dosyada izole; public API'de TanStack tipi yok |
| Sanal satırlar | **TanStack Virtual** | Liste 100–500 satır/sayfa, sheet 10.000; detay satırı ölçülür ve önbelleklenir |
| Primitifler | **reka-ui** (shadcn-vue'nun temeli) | Erişilebilir Popover, Combobox, Dialog, DropdownMenu, Tooltip, Calendar; portallı içerikte Escape/odak davranışı doğru. Uygulamanın shadcn bileşenlerine bağımlılık yok |
| İkonlar | Phosphor (regular) | Tek ağırlık, tree-shake |
| Stil | Derlenmiş CSS + `--dt-*` token'ları; opsiyonel shadcn köprüsü | Uygulamanın Tailwind kurulumundan bağımsız; tema devralınabilir |
| Biçimlendirme | `Intl.NumberFormat / DateTimeFormat / Collator` (önbellekli) | Yerel ayar doğru; hücre başına formatter 134 ms, önbellekli 3,5 ms (10k) |
| Excel | Uygulama ayrıştırır (SheetJS/ExcelJS), paket satır dizisi alır | Lisans/boyut kararı uygulamanın |

**İlke [Karar D23]:** her ihtiyaçta önce TanStack ve reka-ui'nin yerleşik özelliğine bakılır; özel mekanizma ancak bunlar yetmezse yazılır; iç API'lere bağlanılmaz.

### 9.2 Sütun tanımı: `ColumnDef` [Karar D21]

Her feature sütunlarını tek bir TypeScript dosyasında tanımlar; sayfa yalnızca bu diziyi tabloya verir. Tanım tip güvenlidir: `type` zorunlu, satır tipi çıkarılır, `cell` bağlamındaki `row` ve `value` tipe göre daralır.

```ts
// features/orders/columns.ts
export const orderColumns: ColumnDef<Order>[] = [
  { id: 'number', header: 'Order', type: 'id', primary: true, href: r => `/orders/${r.id}`,
    actions: [{ id: 'copy', label: 'Copy number', icon: Copy, run: r => copy(r.number) }] },
  { id: 'product.name', header: 'Product', type: 'string', secondary: r => r.product.sku },
  { id: 'status', header: 'Status', type: 'select', options: statusOptions,
    cell: ({ row, value }) => h(StatusCell, { status: value, late: row.dueAt < today }) },
  { id: 'produced', header: 'Produced', unit: 'pcs', type: 'percentage', display: 'bar' },
  { id: 'owner', header: 'Owner', type: 'user', options: users },
  { id: 'dueAt', header: 'Due date', type: 'date', overdue: true, suggested: true },
  { id: 'value', header: 'Value', type: 'currency', currency: r => r.currency },
]
```

- `id` nokta yolu olabilir (`customer.title`); null-güvenli okunur. Hesaplanan değer `accessor` fonksiyonuyla.
- Ortak seçenekler: `header`, `headerShort`, `unit`, `align`, `width/minWidth/maxWidth`, `pinned`, `hidden`, `alwaysVisible`, `primary`, `href`, `secondary`, `emptyText`, `sortable`, `filterable`, `filter` (operatör alt kümesi), `searchable`, `suggested`, `filterNoun`, `priority`; DataSheet: `editable`, `editor`, `required`, `validate`, `warn`, `importAliases`, `hint`.
- `cell` yalnızca gösterim; sıralama, filtre, editör ve dışa aktarma tipten gelir. Vue slot ile hücre özelleştirme yoktur.

### 9.3 Veri akışı ve sorumluluk sınırı [Karar D18]

- **DataTable** `rows` alır. `mode: 'client'` (varsayılan): her şey yerelde. `mode: 'server'`: sorgu değişince `@request` yayar — `{ query: { search, filters, sort, page: { number, size }, columns, fields }, reason, signal }`; uygulama HTTP'yi atar, `rows`, `hasMore` (Laravel `simplePaginate` → `next_page_url !== null`), `loading`, `error` verir. `refresh()` son talebi yeniden yayar. Sayım `countable` + `@count` → `total`. Yeni görünen sütunun alanı yoksa paket `reason: 'columns'` ile ister.
- **DataSheet** `rows` + `loading` alır; `@save` ile `{ rows: [{ clientId, key, op: 'create' | 'update', values }] }` verir; uygulama kaydeder, `saving` ile ilerlemeyi bildirir, `applyResult([{ clientId, status, fieldErrors?, rowError?, row? }])` çağırır. `lookupKeys` ve `parseFile` uygulamanın verdiği callback'lerdir.
- Paket içinde HTTP, önbellek, otomatik yeniden deneme, chunk gönderimi ve iş mantığı **yoktur**. Toplu/satır aksiyonları `run(rows)` / `run(row)` olarak çağrılır ve beklenmez.

### 9.4 Filtre, sıralama, sayfalama modelleri [Karar]

- Filtre: `{ column, op, value }` dizisi, AND; 18 operatör; op'a göre değer şekli; tarih hazır aralıkları sunucuda çözülür (kullanıcının saat dilimiyle). Laravel eşlemesi 04 §1'de.
- Sıralama: `[{ column, dir }]`, en fazla 3; istemcide yerel ayar collator'ı, boş değerler PostgreSQL varsayılanıyla aynı sırada.
- Sayfalama: TanStack sayfalama durumu iki modda tek doğruluk kaynağı; sunucu modunda toplam bilinmezse `hasMore`'dan türetilir. Footer yalnızca başarıyla yüklenmiş veriyi gösterir; talep sürerken navigasyon kilitli.

### 9.5 Görünüm ve tercih saklama [Karar D4, D5]

- `View { id, name, kind, state }`; görünüm durumu = filtreler + sıralama + sütun düzeni (sıra, görünürlük, genişlikler, sabitleme). Kodla tanımlı system görünümler `views` prop'uyla; kişisel görünümler uygulamanın `viewsAdapter`'ıyla (list/create/update/remove; paylaşım yok, D30). Hazır tarayıcı deposu `createLocalStorageViews({ scope })`.
- Tercihler (yoğunluk, çizgiler, sayfa boyutu, varsayılan görünüm) `preferences` adapter'ıyla ekran başına; yoksa oturumluk.
- Plugin: `app.use(createDataTable({ locale, viewsAdapter, preferences }))` bir kez; tablo başına `tableId`.

### 9.6 Klavye ve odak [Karar D24]

İki model, ikisi de roving tabindex (tablo tek Tab durağı; `aria-activedescendant` yok): DataTable **satır odaklı** (satır odaklanır, `→` ile hücre içi widget'lara girilir), DataSheet **hücre odaklı** (aktif hücre odaklanır; TanStack `cellSelection`). Hücre içi widget'lar `tabindex="-1"`; odak widget içindeyken ızgara kısayolları kapalı; `Esc` geri döner; portallı menü/popover önce kapanır. Sanal listede odaklı/aktif satır DOM'da tutulur; sayfa değişiminde odak aynı anahtar → aynı indeks → ilk satır sırasıyla geri verilir.

### 9.7 Sanallaştırma [Karar]

TanStack Virtual; sabit satır yüksekliği (yoğunluk + 1 px); görünür + 10 overscan; sanal öğe = satır + (açıksa) detay, detay yalnızca görünür aralıkta render edilir, yüksekliği ölçülür ve anahtarla önbelleklenir; detay içeriği kaydırmayla unmount olduğu için yerel durum tutmaz (veri önbelleği uygulamanın).

### 9.8 DataSheet değişiklik ve kayıt mimarisi [Karar]

Uygulamanın `rows` dizisine dokunulmaz. Değişiklikler hücre başına **taslak** katmanında tutulur (bilinçli `null` korunur); kayıt sonrası sunucunun döndürdüğü satır **base** katmanında yaşar, uygulama `rows`'u yenileyince düşer; hatalar ayrı. Render, doğrulama, filtre ve kopyalama tek okuyucudan okur: taslak → base → rows. Komut yığını (geri al/yinele) hücre yamalarından oluşur; sonuç işlenince temizlenir. Hücre seçimi TanStack'in; düzenleme, editörler, doğrulama, pano ayrıştırma ve doldurma paketin — model TanStack'in resmi `spreadsheet` örneğiyle aynıdır.

### 9.9 i18n, erişilebilirlik, performans [Karar]

- Tüm metinler i18n anahtarından (EN varsayılan, TR birinci sınıf; `one/other` çoğullar); uygulama ezebilir; seçenek etiketleri uygulamadan gelir. Biçimler bölüm 4.7.
- WCAG 2.2 AA; NVDA + Firefox/Chrome, VoiceOver + Safari; roller 08 §1 (DataTable `grid`, DataSheet `grid` + `aria-multiselectable`); tek `aria-live="polite"` bölgesi (“100 rows loaded”, “No results”, “4 selected”, “Sorted by Due date, ascending”, “Pasted 5 rows by 3 columns”), hata `assertive`; yükleme boyunca `aria-busy`; `aria-sort` yalnızca birincil sıralama sütununda; odak göstergesi ≥ 2 px, kontrast ≥ 3:1; renk tek başına anlam taşımaz; dokunma hedefi ≥ 44 px (dokunmatik) / 24 px; `forced-colors` ve `prefers-reduced-motion` desteklenir.
- Bütçeler: liste 500 satırda 60 fps; istemci modunda 10.000 satırda filtre + arama + sıralama + sayfalama < 60 ms; sheet 10.000 satırda girdi gecikmesi < 100 ms, hücre düzenleme < 16 ms, 1.000 × 10 yapıştırma < 300 ms, Changed/Errors geçişi < 50 ms; paket gzip ≤ 60 kB (çekirdek + DataTable), sheet ayrı yüklenir.

### 9.10 Public API özeti

| | DataTable | DataSheet |
|---|---|---|
| Props | `tableId`, `columns`, `rows`, `rowKey`, `mode`, `loading`, `error`, `hasMore`, `total`, `countable`, `fields`, `requestOnColumnChange`, `views`, `toolbar`, `searchPlaceholder`, `selectable`, `selectionBar`, `bulkActions`, `rowActions`, `rowClick`, `expand`, `pageSize`, `pageSizes`, `autoRefresh`, `density`, `locale`, `messages`, `entityName`, `shortcuts` | `tableId`, `columns`, `rows`, `rowKey`, `keyColumn`, `loading`, `saving`, `lookupKeys`, `parseFile`, `maxRows`, `newRowDefaults`, `readOnlyBelow`, `density`, `locale`, `messages`, `entityName`, `shortcuts` |
| Emits | `request`, `count`, `selection-change`, `row-open`, `row-click`, `view-change`, `export`, `import`, `print` | `save`, `export` |
| Slot'lar | `#expanded`, `#empty`, `#toolbar-end`, `#selection-actions` | `#empty` |
| Handle | `refresh()`, `clearSelection()` | `status`, `isDirty()`, `getChanges()`, `applyResult()`, `reset()`, `undo()`, `redo()`, `goToNextError()` |

---

## 10. Kapsam dışı [Karar]

Bu özellikler tasarlanmaz ve geliştirilmez; tasarımda “ileride eklenebilir” diye yer bırakılmaz.

| Özellik | Karar |
|---|---|
| AND/OR filtre builder, grup, iç içe koşul | D1 |
| Uzaktan metin önerisi (suggest) | D3 |
| Mobilde kart görünümü | İlke 4 |
| Satırın tamamının link olması | D6 (satır tıklaması opsiyonu var, link değil) |
| Numbered, load-more, infinite sayfalama; URL senkronu | D7, D25 |
| Liste/sheet'te satır sarma (“Wrap long text”) | D8 |
| Sayfalar arası seçim, “Select all matching”, hariç tutma | D19 |
| Toplu aksiyon için paket içi onay dialog'u, toast, spinner | D20 |
| Vue slot ile hücre özelleştirme; `custom` tipi | D21 |
| Sürükle-bırak (sütun sırası, Columns paneli, Sort paneli); Manage columns dialog'u; Manage views ekranı; görünüm sekmeleri | D22, 04 §7 |
| Paket içinde HTTP, önbellek, otomatik yeniden deneme, chunk gönderimi; DataSheet'te Stop/ETA/çevrimdışı banner'ı | D18 |
| DataSheet'te sunucudan silme; çoklu aralık seçimi; yatay doldurma; formül | D11, 07 |
| Expand verisinin paket tarafından yüklenmesi ve önbelleklenmesi; önizleme (peek) paneli | 05 §7, D28 |
| “Removing *X* would show N” önerisi; 401/403 özel ekranı | 05 §10 |
| Telefonda DataSheet düzenleme | D14 |
| Ülkeye göre telefon biçimlendirme (ilk sürüm) | 03 |

---

## 11. Açık kararlar ve serbest alanlar

### 11.1 Açık kararlar [Açık]

| # | Soru | Dokümandaki varsayılan | Ne zaman |
|---|---|---|---|
| Q2 | DataSheet'te sunucuda var olan ama listede olmayan anahtar eklenince (Update satırı) boş hücreler sunucudaki değerlerle doldurulsun mu? | Evet; yalnızca kullanıcının değiştirdiği alanlar gider | Faz 6c |
| Q3 | Excel içe aktarmada boş hücre mevcut değeri silsin mi? | Hayır, atlanır | Faz 6d |
| — | DataSheet'te yükleme/taşıma hatasının gösterimi (paket prop'u yok, uygulamanın banner'ı) | Uygulamanın | Faz 6c |
| — | Yükleme süreleri (150 / 400 / 10.000 ms) gerçek ERP ekranlarında | Paket sabitleri | Faz 7 |

### 11.2 Tasarımcıya bırakılanlar [Serbest]

- Boş durum ve No results ikonları ve illüstrasyon dili (40 px ikon kutusu kuralı içinde).
- `cell` ile çizilen uygulama içerikleri (durum rozeti kompozisyonu, ilerleme çubuğu, onay düğmeleri) — kabuk kuralları içinde.
- Expand alt satırının içeriği (uygulamanın); dokümanlardaki örnekler referans, zorunlu değil.
- Toplu aksiyon onay dialog'unun uygulama tarafındaki tasarımı (6.11'deki örnek).
- Toast, sayfa başlığı, bilgi şeridi gibi uygulamaya ait çevre öğeleri.
- Import dialog'undaki önizleme tablosunun ayrıntı düzeyi.
- Mikro etkileşimlerin easing'i ve ikon seçimleri (süreler 02'ye bağlı kalarak).
- Dark temadaki gölge yoğunlukları (kit'teki değerler başlangıç).

---

## 12. Claude Design görev paketleri

Her görev bağımsız verilebilir. Her birinde: okunacak bölümler, tasarlanacak ekranlar/durumlar, zorunlu etkileşimler, örnek veri. Light + dark, Standard yoğunluk (DataSheet Compact) üretilir; gereken yerlerde üç yoğunluk.

### T1 · DataTable ana liste ekranı
- **Oku:** 1, 3, 4, 5.1–5.2, 6.1–6.3, 6.12–6.14, 6.17.
- **Tasarla:** 1440 px'te “Production orders” ekranı: toolbar (view switcher, arama, Filter (2), Display, ⋯, “New order”), iki çipli filtre satırı, header (sıralı sütun oklu, filtrelenmiş sütun işaretli, sabit sütun gölgesi), 100 satırlık gövde (seçili, hover, odaklı satır örnekleri; geciken tarih; percentage bar; user avatar; currency), footer (Rows 101–200 · Count total · Updated just now · Rows per page · Previous/Next), kaydırma hapı.
- **Durumlar:** normal; 12 satır seçili + bulk bar; bir satır expanded; üç yoğunluk.
- **Örnek veri:** bölüm 1.4 Üretim emri.

### T2 · Filtreleme deneyimi
- **Oku:** 5.7, 6.4–6.5, 4.7.
- **Tasarla:** column picker (Filtered / Suggested / All columns), çip anatomisi ve 5 durumu, değer popover'ları: seçenek listesi (Status), kişi listesi (Owner, Me/Unassigned), sayı aralığı + para birimi (Value), tarih (takvim + hazır aralıklar, 520 px), metin (Product), boolean (popover yok); operatör seçici; filtre satırı taşması (tek satır, yatay kayma); değer özetleri (3 statuses, 100K – 250K TRY, Oct 12 – 24, 3 people).
- **Etkileşim:** seçeneklerin anında uygulanması; operatör değişiminde değer korunumu/eksik çip; `is empty` değer parçasının gizlenmesi; Esc davranışı.

### T3 · Görünüm yönetimi
- **Oku:** 6.9–6.10, 5.7.
- **Tasarla:** görünüm menüsü (Find a view, System / My bölümleri, Default ve Edited işaretleri, satır ⋯ menüsü, New view); düzenlenmiş durum (nokta + Edited; menünün üstünde Save changes / Save as new view… / Discard changes; system görünümde “Save as my view…”); Save as new view dialog'u (ad, özet, default ve share checkbox'ları); silme onayı; Display popover'ı (Density, Columns ›, Sort ›, çizgiler, Saved for you only, Reset).

### T4 · Sütun başlıkları ve sütun yönetimi
- **Oku:** 6.6–6.8.
- **Tasarla:** header durumları (default, hover, sorted asc/desc, multi-sort rozetleri, filtered, pinned, uzun etiket, resize tutamacı ve canlı rozet), sütun menüsü (Move left/right dahil), Display › Columns drill-in (arama, Pinned/Shown/Hidden, Move up/down, Hide all/Show all, Reset), Sort drill-in (liste, yön, ×).
- **Kural:** sürükleme yok; Manage columns dialog'u yok.

### T5 · Satır seçimi ve toplu işlem çubuğu
- **Oku:** 6.11, 3.2.
- **Tasarla:** checkbox sütunu ve satır durumları, header checkbox (indeterminate), yüzer bulk bar (4 selected · 3 aksiyon · ⋯ · ×), `selection-bar: 'toolbar'` varyantı, ⋯ menüsü (yıkıcı en altta), telefon düzeni (ikon üstte etiket altta). Uygulamanın onay dialog'u için örnek.
- **Kural:** sayaç yalnızca “N selected”; all-matching ve diğer sayfalar yok.

### T6 · Satır detayı: expand, satır menüsü
- **Oku:** 6.12, 5.4–5.5, 5.7.
- **Tasarla:** chevron ve alt satır (uygulama içeriği örneği: mini tablo + özet), satır aksiyonları (yalnızca ⋯, her zaman görünür), satır menüsü (Open, Open in new tab, Copy order number, uygulama aksiyonları, pasif gerekçeli, yıkıcı), “Copied” toast'ı.
- **Etkileşim:** menü kapanınca (Esc) odağın satıra dönüşü; sağ tık ve ⇧F10 aynı menü.

### T7 · Hücre aksiyonlarının hover davranışı ve doğrudan görünen hücre butonları
- **Oku:** 5.3–5.4, 5.1.
- **Tasarla:** (a) “Product name” hücresi: normal, hover (sağda Copy + Open ikonları overlay, metin kuyruğu örtülü, genişlik değişmez), klavye odağı (aynı görünüm + odak halkası), 3 aksiyonda ⋯ menüsü; `reveal: 'always'` varyantı; (b) `cell` ile çizilen her zaman görünür düğmeler (Approve / Reject), ilerleme çubuğu “340 / 500”, özel durum rozeti; üç yoğunlukta.
- **Kural:** widget'lar Tab durağı değil; `→` ile giriş.

### T8 · Hücre tipleri kataloğu
- **Oku:** 5.1–5.2, 4.7, 4.3.
- **Tasarla:** 23 tipin hücre görünümü (boş değer, negatif, overdue, relative, bar, fill, falseTone, +N, avatar yığını, Unassigned), tipe göre skeleton'lar, ton paleti, üç yoğunluk, light/dark.

### T9 · Durum ekranları
- **Oku:** 5.6, 6.14, 6.13.
- **Tasarla:** First load (skeleton), Refreshing (2 px çubuk, Updating…), Query change (soluk + skeleton), Empty (uygulama aksiyonlu), No results (Remove “Due date” / Clear all / Clear search), Error (mesaj, Try again, Copy error ID), Stale (amber şerit), Still loading, “No rows on this page”.

### T11 · DataSheet düzenleme ekranı
- **Oku:** 8.1–8.10, 5.1, 5.4.
- **Tasarla:** tam ekran (Compact): toolbar (Find, Filter, All/Changed/Errors, Undo/Redo, Add row, Import, Export, ⚙, sayaç + Discard + Save changes), filtre satırı + not, formula bar, gutter + anahtar + sütunlar, hücre durumlarının tamamı (editable, read-only kilit, active + fill handle, in selection, editing, changed köşe, error balonu, warning, required, new row), status bar (sayaçlar + Count/Sum/Average), editörler (metin, sayı+TRY, combobox + “Use Pumps”, tarih, boolean, çoklu), yapıştırma toast'ı, fill önizlemesi “Fill 4 cells with 10%”, hücre menüsü, Remove from list toast'ı.
- **Etkileşim:** yazmaya başlayınca düzenleme; Enter aşağı; blur ile onay yok; açık combobox'ta Esc önce listeyi kapatır.

### T12 · DataSheet kayıt, hata ve açılış durumları
- **Oku:** 8.11–8.12.
- **Tasarla:** hatalı satır varken Save dialog'u (Fix first / Save 95 rows), kaydederken ilerleme şeridi (“Saving… 4,800 of 9,600 rows”, salt okunur grid, spinner'lı Save), Saved status bar, Partly saved banner (Copy errors) + Errors görünümü (1 of 3 gezinme), Leave without saving ve Discard dialog'ları, açılış ilerlemesi (“Loading products… 6,200 of 10,000” + skeleton), maxRows uyarısı, Import from Excel dialog'u (dosya kartı, Match rows by, eşleme tablosu + önizleme, özet banner, Apply to grid), telefon salt okunur banner'ı.
- **Kural:** Stop, ETA, chunk sayacı ve çevrimdışı banner'ı tasarlanmaz (uygulamanın).

### T13 · Telefon düzeni (DataTable)
- **Oku:** 6.16, 6.5 (telefon), 5.7.
- **Tasarla:** < 640 px liste: sabit seçim + birincil sütun, kayan sütunlar ve solma, daraltılmış toolbar, tam genişlik arama, tek satır kayan çipler, Filters alt sayfası (uygulanmış + suggested satırlar, Add filter, Sort, Show results), alt sayfa olarak görünüm menüsü ve değer editörü, sağa sabit ⋯ sütunu, telefon bulk bar'ı.

---

## 13. Ekler

### 13.1 Sözlük

| Terim | Anlamı |
|---|---|
| Çip (chip) | Filtre satırındaki tek filtre: `alan · operatör · değer · ×` |
| Görünüm (view) | Kaydedilmiş filtre + sıralama + sütun düzeni; system / personal (D30) |
| Tercih | Yoğunluk, çizgiler, sayfa boyutu, varsayılan görünüm; ekran başına kişisel |
| Talep (request) | Sunucu modunda paketin yaydığı sorgu |
| Snapshot | Footer'ın gösterdiği, başarıyla yüklenmiş son sayfa bilgisi |
| Bulk bar | Seçim varken altta yüzen toplu aksiyon çubuğu |
| Expand | Satırın altında açılan detay satırı |
| Open | Kaydın tam sayfasına gitmek |
| Birincil sütun | Kaydın adı/numarası; gerçek link; telefonda sabit |
| Roving tabindex | Tablonun tek Tab durağı olması; oklarla içeride gezinme |
| Widget | Hücre içindeki etkileşimli öğe (link, düğme, input) |
| Parti (batch) | DataSheet'teki satırların tamamı |
| Anahtar sütun (key) | Upsert eşleşmesini belirleyen sütun (SKU); satır kimliğinden ayrı |
| Taslak (draft) | DataSheet'te orijinal satıra dokunmadan tutulan değişiklikler |
| Fill handle | Aktif hücrenin sağ altındaki doldurma karesi |

### 13.2 Tasarım geçmişi

İlk canvas tasarımı (20 board, kit.css, ekran görüntüleri) kararlarla çeliştiği için 2026-10-21'de kaldırıldı. Oradaki davranışlardan değişenler README'deki karar günlüğünde (D4, D6, D7, D17–D25). Yeni tasarımlar bu brief'teki görev paketleriyle üretilir; token sistemi `02-design-tokens.md`'den başlar.

2026-10-21: T1–T13 tasarımları Claude Design ile üretildi; teslim belgeleri `docs/handoff/`. Tasarım sırasında alınan D26 (facet çipi yok), D27 (görünüm kaydetme menüde) ve D28 (peek paketin değil) README karar günlüğüne işlendi; bu brief buna göre güncellendi.

### 13.3 Kaynak dokümanlar

`README.md` (ilkeler, D1–D28, Q2–Q3) · `01-architecture.md` · `02-design-tokens.md` · `03-column-types.md` · `04-filters-and-views.md` · `05-mode-list.md` · `07-mode-sheet.md` · `08-accessibility-keyboard.md` · `09-i18n.md` · `10-roadmap.md` · `api-draft.ts` · `CLAUDE.md`.
