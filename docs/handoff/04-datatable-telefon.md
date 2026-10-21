# 04 · DataTable telefon düzeni (< 640 px)

Davranış: brief §6.16. Tasarım: **T13 · Phone** (T13-01 … T13-08) ve **T5** telefon ekranları. Çerçeve 390 × 844. Dokunmatikte yoğunluk Standard'a çıkar; her dokunma hedefi ≥ 44 px.

## 1. Düzen

| Bölge | Yükseklik | Not |
|---|---|---|
| Uygulama başlığı | 52 | dolgu `0 16px`, başlık 17 / 600 (uygulamanın) |
| Toolbar | 52 | §2 |
| Çip satırı | 48 | yalnızca filtre varken; üstte 1 px `--dt-line` |
| Header | 40 | `--dt-surface-2`, 12 / 500 `--dt-text-2` |
| Gövde | kalan | satır 48 + 1 |
| Footer | 52 | §5 |

Zemin `--dt-surface` (kart çerçevesi yok, ekranı doldurur).

## 2. Toolbar

Dolgu `0 6px 0 8px`, boşluk 2. Sıra: görünüm seçici · boşluk · arama · Filter · ⋯ · ayırıcı · birincil.

| Öğe | Değer |
|---|---|
| Görünüm seçici | 44 px ghost, dolgu `0 8px`, 14 / 600; düzenlenmişse 6 px accent nokta (etiket yok); `CaretDown` 14 `--dt-text-3`; uzun ad `…` |
| Arama | 44 × 44 ikon düğme (`MagnifyingGlass` 20 `--dt-text-2`) |
| Filter | 44 × 44; filtre varken içte 36 px `--dt-accent-soft` kare (yarıçap 8), ikon `--dt-accent-text`, sağ üstte 16 px sayaç rozeti (`--dt-accent`, 10 / 600, `0 0 0 2px var(--dt-surface)` halkası) |
| ⋯ | 44 × 44; Display buraya taşınır (§6.4) |
| Ayırıcı | 1 × 20 `--dt-line` |
| Birincil | 44 px dokunma alanı içinde 34 × 34 `--dt-ink` kare, yarıçap 8, `Plus` 18 `--dt-on-ink`; `aria-label="New order"` (S3) |

**Arama açık** (T13-03): toolbar'ın yerini alır. Input 40 px (flex 1), yarıçap 10, 15 px, solda `MagnifyingGlass` 18, odaklı (accent kenar + 3 px halo); değer varken sağda 36 px temizle (`XCircle` dolu); sağında “Cancel” (44 px, 15 / 500). Arama çip üretmez; çipler altta kalır.

## 3. Çip satırı

Tek satır, yatay kayar; dolgu `0 12px`, aralık 6; sağ kenarda 40 px solma.

Telefon çipi (S2): 32 px, dolgu `0 11px 0 10px`, yarıçap 7, 1 px `--dt-line-2`, 13 px; ikon 14 `--dt-text-3` · alan `--dt-text-2` · değer 500. **Operatör ve × yok**; çipin tamamı tek düğme, dokununca Filters alt sayfası açılır. `aria-label` = `mobile.chipAria` (“Plant is Gebze. Open filters”).

## 4. Izgara

| Blok | Genişlik | İçerik |
|---|---|---|
| Sol sabit | 156 = 48 + 108 | checkbox sütunu 48 (checkbox 16 görsel, dokunma alanı 44; yarıçap 4, 1.5 px — tasarımda 18 çizildi, 05 §11 geçerli) · Order no. 108 (mono 12.5 / 500, sol dolgu 4) |
| Kayan | Product 200 · Customer 150 · Status 118 · Produced 116 · Owner 140 · Due date 104 · Value 132 | dolgu `0 12px`, 13 px |

- Sabit bloğun sağ kenarı: kaydırılmamışken `1px 0 0 var(--dt-line)`, sağa kaydırılmışken `--dt-shadow-pin-l` (T13-02).
- Sağ kenarda 40 px solma (header'da `--dt-surface-2`, satırda satır rengiyle).
- Produced: çubuk 48 × 6 + 36 px etiket. Owner: avatar 22 (9.5 / 600). Status rozeti 22 px.
- Header'da sıralı sütun `--dt-text` + ok, filtrelenmiş sütunda 11 px `Funnel` `--dt-accent` (`aria-label="Filtered"`).
- Seçili satır `--dt-row-selected` (sabit blok ve solma da aynı renkte).
- Hover yoktur. Satır ⋯ sütunu T13'te çizilmedi; 05 §11 gereği masaüstündeki gibi sağa sabit 56 px ⋯ sütunu uygulanır (28 × 28 düğme, 44 px dokunma alanı; sağ kenar solması bu sütunun solunda biter).

## 5. Footer

52 px, dolgu `0 4px 0 16px`, `--dt-surface-2`, üstte 1 px `--dt-line`, 13 px. Solda “Rows 1–100 · Count total”, sağda 44 × 44 Previous / Next ikon düğmeleri (`CaretLeft` / `CaretRight` 18; pasif `--dt-line-3`). Rows per page telefonda yok (S5). `role="navigation" aria-label="Pages"`.

## 6. Alt sayfalar

Telefonda bütün popover'lar alt sayfadır.

| Parça | Değer |
|---|---|
| Arka plan | `--dt-scrim`, tüm ekran |
| Sayfa | alta yapışık, üst köşeler 18, `--dt-surface`, `--dt-shadow-dialog`, en çok 776 px (~%92); fazlası içeride kayar |
| Tutamaç | 36 × 4, yarıçap 999, `--dt-line-3`; üstten 8, alttan 6 px (T5 More alt sayfasında 10 çizildi; 6 esas) |
| Başlık satırı | 48 px; başlık 17 / 600; sağda metin düğmesi (Clear all / Clear) 44 px, 15 / 500 `--dt-text-2`; alt seviyede solda 44 px geri (`CaretLeft` 20) |
| Satır | 52 px, dolgu `0 8px`, yarıçap 10, 15 px; dış dolgu `0 8px` |
| Bölüm etiketi | 32 px (üst dolgu 12), 12.5 / 500 `--dt-text-3`. Views'da 34 / 14, More'da 30 / 6 çizildi; 32 / 12 esas |
| Birincil düğme | tam genişlik 48 px, yarıçap 10, `--dt-ink`, 15 / 500; alanı: dolgu `12px 16px 30px` (alt güvenli alan), üstte 1 px `--dt-line` |
| Erişilebilirlik | `role="dialog" aria-modal="true"` + etiket; açılınca odak içeri (arama varsa ona), kapanınca tetikleyiciye |

### 6.1 Filters (T13-04)

Başlık “Filters” + **Clear all**. Sıra:

1. **Uygulanmış filtreler:** satırda alan (`--dt-text-2`) solda, değer (500) sağda, en sağda 44 px kaldır (`X` 16) (S4). Satıra dokunmak değer alt sayfasını açar.
2. **Suggested** etiketi; `suggested` sütunlar: alan `--dt-text-2`, sağda “Any” `--dt-text-3` + `CaretRight` 16.
3. **Add filter** satırı: `Plus` 18 + metin `--dt-accent-text` 15 / 500. Column picker'ın alt sayfa hâlini açar (ayrıca çizilmedi; masaüstü içeriği, 52 px satırlarla).
4. Ayırıcı, **Sort** etiketi; satır: sütun adı + `CaretDown` (sütun seçimi) · sağda yön segmented'i 36 px (iki 44 × 32 düğme, `ArrowUp` / `ArrowDown`, `aria-label` Sort ascending / Sort descending).
5. Alt: **Show results** (tam genişlik). Masaüstünden farklı olarak değişiklikler bu düğmeyle uygulanır.

### 6.2 Değer editörü (T13-05)

Filters'ın bir alt seviyesi. Başlık: geri (`aria-label` = `mobile.backToFilters`) · alan adı (“Owner”) · **Clear**. Gövde (dolgu `4px 16px 8px`, aralık 8): operatör seçici (44 px select, yarıçap 10, `--dt-shadow-sm`; 1 değer seçiliyken “is”) · arama 44 px (“Search people”). Liste: checkbox 20 (yarıçap 5) · avatar 26 (10.5 / 600) · ad 15; **Me** satırında soluk gerçek ad 13 `--dt-text-3`; **Unassigned** kesik avatar ve `--dt-text-2`; ayırıcı; kişiler. Alt düğme **Done** (`common.done`), Filters'a döner.

### 6.3 Görünümler (T13-06)

Masaüstü menüsüyle aynı içerik, 52 px satırlar:

- “"Gebze · this week" edited” 13 `--dt-text-3`; Save changes / Save as new view… (alt satır 13 `--dt-text-3`) / Discard changes. Kısayol gösterilmez.
- Ayırıcı, “Find a view…” 44 px.
- Bölüm etiketleri “System views · Built in” biçiminde.
- Satır: solda 18 px `Check` (`--dt-accent`, yalnızca aktif görünümde; aktif ad 600), ad, “Edited” (nokta + 12 / 500 `--dt-text-2`), “Default” etiketi; My views satırlarında sağda 44 px ⋯ **her zaman görünür** (hover yok).
- Açıkken toolbar'daki görünüm seçici `--dt-surface-3` zeminli.

### 6.4 ⋯ (T13-07)

“Display” etiketi altında: Density › “Standard” · Columns › “8 of 14” · Sort › “Due date ↑” (değer `--dt-text-2` + `CaretRight`). Ayırıcı. Export matching rows › · Refresh. En altta “Saved for you only” 13 `--dt-text-3` + Reset. Açıkken ⋯ düğmesi `--dt-surface-3` zeminli. Dokunmatikte Compact seçilmiş olsa da Standard uygulanır (brief §4.5).

## 7. Seçim ve bulk bar (T13-08 = T5-06/07)

- Header checkbox ve satır checkbox'ları 16 px (görsel), 48 px sütunda, dokunma alanı 44 px.
- Bulk bar: yanlardan 10, alttan 30 px; dolgu 6, aralık 4, yarıçap 14, `--dt-bulk-bg`, `--dt-shadow-float`. Sayaç “4 selected” 13 / 500 · ayırıcı 1 × 28 · aksiyonlar 44 px, **ikon üstte (18) etiket altta (11 / 500)**, eşit genişlikte (en çok 2 aksiyon + More) · ayırıcı · `X` 44.
- More alt sayfası: başlık yerine “4 selected” 13 / 500 `--dt-text-3`; öğeler 52 px 15 px; yıkıcı en altta `--dt-r-fg`. Açıkken More düğmesi `--dt-bulk-hover` zeminli.

## 8. Önizleme

Yok (D28). Satıra dokunmak `row-click` ayarına uyar; uygulama isterse kendi tam ekran sayfasını açar.
