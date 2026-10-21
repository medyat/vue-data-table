# 05 · DocumentTable

Davranış: brief §7. Tasarım: **T10 · Document lines** (T10-01 … T10-05). Örnek: satış siparişi SO-26-1182, 6 kalem; toplamlar sunucudan hazır gelir ve tüm kalemleri kapsar.

## 1. Sayfa (uygulamanın, örnek)

Belge sayfasının başlığı ve bilgi şeridi uygulamanındır; tasarımda bağlam için çizildi: breadcrumb “Sales / Orders” · belge no 20 / 600 + durum rozeti + “Kuzey Otomotiv · Gebze plant” · sağda Edit (ikincil). Bilgi şeridi 6 eşit sütun (etiket 11.5 / 500 `--dt-text-3`, değer 13.5), kart kalıbında. İçerik en çok 1120 px, bölümler arası 20.

## 2. Bölüm başlığı

32 px satır, aralık 8: **“Lines”** 15 / 600 · sayı rozeti (20 px, en az 20 genişlik, dolgu `0 6px`, yarıçap 999, `--dt-surface-3`, `--dt-text-2`, 12 / 500) · boşluk · (satır araması) · **Add line** (30 px ikincil, `Plus`) · **Expand all** (30 px ghost, `--dt-text-2`; hepsi açıkken “Collapse all”). Başlıkla tablo arası 12.

Satır araması açıkken (T10-02/03): 200 × 30 input (dolgu `0 30px`, sol ikon 14, odaklı) Add line'ın solunda; Expand all gizlenir.

## 3. Tablo

Kart kalıbı (yarıçap 12, `--dt-shadow-sm`), yoğunluk **Comfortable**, dikey çizgi yok.

**Sütunlar:** `36px 40px minmax(0,1.6fr) 130px 130px 96px 76px 150px` = expander · # · Product · Quantity · Unit price · Discount · VAT · Line total.

| Parça | Değer |
|---|---|
| Header | 40 px, `--dt-surface-2`, alt 1 px `--dt-line`, üst köşeler 12; 12 / 500 `--dt-text-2`; sayısal sütunlar sağa yaslı; hücre dolgusu 16 (# için 8); expander sütununun başlığı görsel olarak gizli “Details” |
| Satır | en az 52 px, dikey dolgu 9, içerik üstten hizalı, 13.5 px, alt 1 px `--dt-line`; hover `--dt-row-hover` |
| Expander | 20 × 20 düğme (yarıçap 5), `CaretRight` 14 `--dt-text-3`, açıkken 90°; yalnızca detayı olan satırda |
| # | mono 12 `--dt-text-3` |
| Product | ad link (`--dt-text`, en çok 2 satır, `-webkit-line-clamp: 2`), altında SKU mono 12 `--dt-text-3` |
| Quantity | `120` + birim `pcs` `--dt-text-3`, sağa yaslı |
| Unit price | sağa yaslı, para kodu yok (belgenin para birimi bilgi şeridinde) |
| Discount | `5%` / `2.5%`; yoksa “—” `--dt-text-3` |
| VAT | `20%` `--dt-text-2` |
| Line total | 500, sağa yaslı; net tutar (e-Fatura alışkanlığı: indirim sonrası, KDV hariç) |

### 3.1 Detay satırı (expand)

`--dt-surface-2`, dolgu `14px 24px 16px 92px` (sol dolgu ürün sütununa hizalanır), alt 1 px `--dt-line`. Üç sütun `1.2fr 1fr 1.2fr`, aralık 24, 12.5 px. Her sütun başlığı 11.5 / 500 `--dt-text-3`. İçerik uygulamanındır; örnek:

- **Deliveries:** tarih · adet · durum rozeti (20 px; Delivered dolu yeşil, Planned outline: 1 px `--dt-line-2` kenar, noktası içi boş 1.5 px `--dt-n-dot` halka).
- **Production:** iş emri linki mono 12 / 500 + durum rozeti.
- **Note:** serbest metin `--dt-text-2`.

### 3.2 Toplamlar

Satırlardan sonra, üst dolgu 8:

| Satır | Değer |
|---|---|
| Subtotal · Line discounts · VAT 20% | 30 px; etiket 1–7. sütunları kaplar, sağa yaslı, 13 `--dt-text-2`; değer Line total sütununda sağa yaslı (eksi U+2212: `−9,158.75`) |
| Total | 40 px, üstte 1 px `--dt-line`, 8 px boşlukla; etiket 13 / 600; değer 15 / 600 + `TRY` mono `--dt-text-3`, taban çizgisine hizalı |

Örnek değerler: Subtotal 460,975.00 · Line discounts −9,158.75 · VAT 20% 90,363.25 · Total 542,179.50 TRY. Kalem toplamları bu tutarlarla birebir tutar.

### 3.3 Satır araması

- Eşleşen metin 600 ağırlıkla vurgulanır (ürün adı, SKU).
- Kartın altında 40 px şerit: `--dt-surface-2`, üstte 1 px `--dt-line`, alt köşeler 12, 12.5 px: “2 of 6 lines” · “Totals always cover all lines” `--dt-text-3`.
- Eşleşme yoksa (T10-03): tablo gövdesinde ortalı “No lines match "bracket"” 13.5 / 500 + **Clear search** (30 px ikincil), dolgu 32 / 24; toplamlar yine görünür, şerit “0 of 6 lines”.
- `Esc` aramayı temizler.

### 3.4 Boş belge (T10-04)

Taslak sipariş, 0 kalem: sayı rozeti “0”; Add line ve Expand all başlıkta görünmez; kartın içinde ortalı blok (dolgu 56 / 24, aralık 14): ikon kutusu 40 · “No lines yet” 15 / 600 · “Add products to this draft order to see quantities and totals.” 13 `--dt-text-2` · **Add line** (birincil). Toplamlar ve header çizilmez.

## 4. Telefon (T10-05)

390 px, belge başlığı uygulamanın (geri 44 · belge no 18 / 600 · rozet · 2 sütunlu bilgi listesi).

| Parça | Değer |
|---|---|
| Bölüm başlığı | “Lines” 16 / 600 + rozet · sağda Add line (36 px ikincil); Expand all yok |
| Header | 36 px, `--dt-surface-2`, 12 / 500 |
| Sabit sütun | Product 176: `#` mono 12 `--dt-text-3` + ad (tek satır, `…`) · altında SKU mono 12 |
| Kayan | Line total 108 (500) · Quantity 96 · Unit price 96; sağ kenarda 36 px solma |
| Satır | en az 56 px, dolgu `9px 0`, 14 px |
| Detay | satırın altında tam genişlik `--dt-surface-2` blok (dolgu `14px 12px 16px`, 13.5 px), bölümler alt alta: Deliveries · Production · Note |
| Toplamlar | sütunlardan çıkar, liste olur: 30 px satırlar (etiket `--dt-text-2` solda, değer sağda); Total 42 px, üstte 1 px çizgi, değer 16 / 600 + `TRY` |

## 5. Erişilebilirlik

- Tablo `role="table"` (DocumentTable bir grid değildir; satırlar odak durağı değildir; yalnızca expander, ürün linki ve hücre aksiyonları odaklanır — brief §7.3).
- Expander `aria-label="Show details for line {n}"`, `aria-expanded`.
- Toplamlar `role="rowgroup" aria-label="Totals"`, etiketler `rowheader`.
- Arama sonucu şeridi `role="status"` (sayı değiştiğinde okunur).
