# 06 · DocumentTable (belge satırları)

Tasarım referansı: `DESIGN-BRIEF.md` §7 ve görev paketi T10.

## 1. Genel bakış

Sipariş, fatura, irsaliye, satınalma siparişi gibi bir **detay sayfasının içindeki satırlar**. Kullanıcı burada belgeyi okur: ne, kaç tane, kaça, toplam ne. Bulmak, filtrelemek, toplu iş yapmak bu ekranın işi değildir; bu yüzden toolbar, filtre, görünüm, sayfalama, seçim ve sıralama **yoktur**. Bunların yerine satır detayı (expand) ve toplamlar vardır.

Tablo içeriği kadar uzar; **sayfa kayar, tablo kaymaz**. Satırlar salt okunurdur (düzenleme belge düzenleme ekranının işidir; bu bileşenin kapsamı dışında). Satırlar `rows` prop'uyla verilir; talep yoktur. Hücre tipleri, `cell`/`actions`, token'lar ve yoğunluk DataTable ile ortaktır (01).

## 2. Yerleşim

```
Sayfa başlığı (uygulamaya ait): SO-26-1182 [Confirmed] · Kuzey Otomotiv · Gebze plant        [Edit]
Bilgi şeridi (uygulamaya ait): Customer │ Order date │ Delivery │ Payment │ Currency │ Sales rep

Bölüm başlığı:  Lines (6)                                        [#section-actions] [Expand all]
┌ dt-card (data-density="comfortable") ──────────────────────────────────────────────┐
│  ›  │ #  │ Product                     │ Quantity │ Unit price │ Discount │ VAT │ Line total │
│  ›  │ 1  │ Hydraulic cylinder HC-80    │ 120 pcs  │  1,650.00  │    —     │ 20% │ 198,000.00 │
│     │    │ HC-080-S                    │          │            │          │     │            │
│     └ satır detayı (açıksa) ─────────────────────────────────────────────────────── │
│  …                                                                                 │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│                                              Subtotal              460,975.00      │
│                                              Line discounts         −9,158.75      │
│                                              VAT 20%                90,363.25      │
│ ─────────────────────────────────────────────────────────────────────────────────  │
│                                              Total            542,179.50 TRY       │
└────────────────────────────────────────────────────────────────────────────────────┘
```

- Bölüm başlığı: `title` (15 px / 600) + sayı rozeti (12 px, `--dt-surface-3`, hap), sağda `#section-actions` slot'u ve **Expand all** (ghost sm; en az bir satırda detay varsa). Tümü açıkken etiket **Collapse all** olur.
- Kart: liste modundaki kartla aynı; yükseklik içeriğe göre, `overflow: visible` (sayfa kayar).
- Header **sticky değildir** (sayfa kayar; uzun belgede satır araması var).
- Yoğunluk varsayılanı **Comfortable**; kullanıcı değiştiremez (Display yok). Uygulama `density` prop'u ile değiştirebilir.

## 3. Sütunlar

| Sütun | Genişlik | Tip / içerik | Not |
|---|---|---|---|
| Details (expander) | 36 px | Chevron, yalnızca detayı olan satırda | Header metni yok, `sr-only` “Details” |
| `#` | 40 px | Satır numarası, mono 12 px, `--dt-text-3` | Belge sırası (D15) |
| Product | `minmax(0, 1.6fr)` | Ad + SKU ikinci satırda (mono, `--dt-text-3`) | Ad **en fazla 2 satıra sarılır**, sonra `…` |
| Quantity | 130 px | `int`/`float` + soluk birim (`pcs`, `sets`) hücrede: `unit: row => row.unit` | Birim satırdan satıra değişebildiği için hücrede; sütun tanımında `unit` fonksiyon formu (03 · Birim) |
| Unit price | 130 px | `float`/`currency`, para kodu **yok** | |
| Discount | 96 px | `percentage`; yoksa `—` | |
| VAT | 76 px | `percentage`, `--dt-text-2` | |
| Line total | 150 px | `currency`, 500 ağırlık, para kodu **yok** | Toplamların hizalandığı sütun (`totals.alignTo`) |

- Para birimi kodu satırlarda gösterilmez; **yalnızca genel toplamda** (bilgi şeridinde Currency zaten yazıyor).
- Sütunlar uygulamanın `columns` prop'undan gelir; yukarıdaki düzen sipariş/fatura için önerilen varsayılandır. İrsaliyede fiyat sütunları olmayabilir; o zaman `totals` da verilmez.
- `sortable` bu modda yok sayılır (D15); header tıklanmaz, `aria-sort` yok.
- Dikey ızgara çizgileri kapalı.

### Satır

- Yükseklik içeriğe göre: en az `--dt-row-h` (52 px), dikey dolgu 9 px (`is-wrap`).
- Hover: `--dt-row-hover`. Seçim, current, odak çerçevesi yok (satırlar tek tab durağı değil; yalnızca expand butonları, linkler ve hücre aksiyonları odaklanır).
- Satırda link varsa (ör. ürün kartına) yalnızca Product adı link olur (D6): `primary` + `href(row)`, düz tıkta `row-open` (05 §7 ile aynı kural). `row-click` prop'u bu bileşende yoktur.

## 4. Satır detayı (expand)

- `expand.canExpand(row)` false olan satırda chevron yok, hücre boş kalır.
- Açılınca satırın altında tam genişlik alt satır: `--dt-surface-2`, padding `14px 24px 16px 92px` (içerik Product sütunuyla hizalanır).
- İçerik `#expanded="{ row, close }"` slot'undan; veriyi slot bileşeni çeker (yükleniyor/hata görünümü de onun). Örnek: üç sütunlu ızgara (`1.2fr 1fr 1.2fr`, aralık 28 px, 12.5 px):
  - **Deliveries** — tarih · miktar · durum rozeti (Delivered yeşil, Planned içi boş nötr).
  - **Production** — iş emri linki (mono) + durum rozeti.
  - **Note** — serbest metin, `--dt-text-2`.
  - Alt başlıklar 11.5 px / 500 / `--dt-text-3`.
- `expand: true | { canExpand }`. Paket detay verisi yüklemez ve önbelleklemez; yükleniyor/hata görünümü uygulamanın slot içeriğidir.
- **Expand all**: yalnızca `canExpand` olan satırları açar.

## 5. Toplamlar (`totals` prop'u)

- Satırların altında, 1 px `--dt-line` üst çizgi; padding 6 px üst, 10 px alt.
- Her satır tablo ızgarasını (`--cols`) paylaşır: **etiket** `alignTo`'dan önceki sayısal sütunları kaplar ve sağa yaslıdır (`--dt-text-2`, 16 px sağ dolgu); **tutar** `alignTo` sütununda, sağa yaslı, tabular. Satır yüksekliği 30 px, 13 px.
- Negatif tutarlar (indirim) gerçek eksiyle: `−9,158.75`.
- **Genel toplam** (`grand: true`): üstte 1 px çizgi, 4 px boşluk, 40 px yükseklik; etiket `--dt-text` 600; tutar 15 px / 600 + 11 px soluk mono para kodu.
- Toplamlar **sunucudan hazır gelir** (vergi kırılımı, yuvarlama, iskonto kuralları uygulamaya aittir). Paket hesaplama yapmaz, satır toplamını da toplamaz.
- Toplamlar **her zaman tüm satırları** kapsar; satır araması yalnızca görüneni daraltır (“Totals always cover all lines” notu).

## 6. Uzun belgeler — satır araması

- `lineSearch` prop'u açıkken (varsayılan kapalı; satır sayısına bağlı otomatik eşik yoktur, uygulama isterse `:line-search="rows.length > 20"` verir) bölüm başlığının sağında 200 × 30 px arama kutusu: placeholder “Find a line”.
- Product adı, SKU ve `searchable` sütunlarda yerel arama (debounce yok, anında). Eşleşen kısım **600 ağırlıkla** vurgulanır.
- Arama sonuç verirken kartın altında 40 px footer: solda `3 of 84 lines`, sağda soluk “Totals always cover all lines”. Toplam satırları gizlenmez.
- Sonuç yoksa: “No lines match “valve”” + **Clear search**.
- `Esc` aramayı temizler.

## 7. Boş belge

- Taslak belgede satır yoksa: 40 px ikon kutusu, “No lines yet”, “Add products to this draft order to see quantities and totals.”, **Add line** (uygulama aksiyonu; `#empty` slot'u ile değiştirilebilir).
- Header görünmez, toplamlar gösterilmez. Sayı rozeti `0`.

## 8. Duyarlı davranış

| Genişlik | Değişiklik |
|---|---|
| ≥ 768 px | Masaüstü düzeni; tablo kabı aşarsa yatay kayar, Product sabit |
| < 768 px | **Öncelik düzeni** (aşağıda) |

Telefonda:
- **Product** sola sabit, 176 px: satır numarası (mono, soluk) + ad tek satırda, SKU ikinci satırda (**ikinci satır her zaman görünür**, yoğunluktan bağımsız).
- **Sütun önceliği** (`priority`): en düşük öncelik numaralı sayısal sütun (Line total) Product'ın hemen yanına gelir; kalanlar (Qty, Unit price, Disc., VAT) yatay kayar, sağ kenarda solma. Dar alan için `headerShort` kullanılır (“Discount” → “Disc.”).
- Expander sütunu kalkar; satıra dokunmak (link dışı) detayı açar. Detay alt satırı **tam genişlikte**, bölümler alt alta.
- **Toplamlar sütundan çıkar**, tablonun altında özet liste olur: etiket solda, tutar sağda, 30 px satırlar; genel toplam 42 px, 15 px / 600, üst çizgili.
- Dokunmatikte satır en az 48 px.

## 9. Kenar durumlar

- **Çok uzun ürün adı:** 2 satır, sonra `…` + tooltip.
- **Birim yok:** yalnızca sayı.
- **Karışık para birimi:** belge tek para birimindedir; satır bazında farklıysa uygulama `currency` sütununu satırdan okutur ve kodlar satırlarda görünür (bu durumda toplam satırı tek kodla verilemez — uygulamanın sorumluluğu).
- **Sıfır tutarlı satır** (bedelsiz): `0.00`, `—` değil (gerçek değer).
- **İndirim satırı / açıklama satırı** (fiyatı olmayan): sayısal hücreler `emptyText`.
- **Yüzlerce satır:** sanallaştırma yok (sayfa kayar); 500 satıra kadar performans hedefi ilk render < 150 ms. Üstü için uygulama sayfalamayı belge düzeyinde çözmeli (bu modun kapsamı dışında).

## 10. Erişilebilirlik

- `role="table"`, `aria-label` = `title` (ör. “Order lines”). Sıralama yok, `aria-sort` yok.
- Expand butonu: `aria-label="Show details for line 2"`, `aria-expanded`, `aria-controls` → alt satır.
- Toplamlar ayrı `rowgroup` (`aria-label="Totals"`), etiketler `rowheader`.
- Satır araması sonucu `aria-live="polite"`: “3 of 84 lines”.
