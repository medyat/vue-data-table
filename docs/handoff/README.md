# @medyat/vue-data-table · Tasarım teslim belgeleri

Bu klasör, T1–T13 tasarımlarının geliştiriciye (Claude Code dahil) teslimidir. **Davranışın kaynağı spesifikasyon dokümanlarıdır** (`docs/data-table/` 03–09 ve `api-draft.ts`; özeti `DESIGN-BRIEF.md`); bu belgeler onları tekrar etmez. Burada olan:

- tasarımlarda kullanılan **ölçüler, renkler ve durumlar** (brief'te yazmayan ayrıntılar),
- tasarım sırasında verilen **kararlar** ([Serbest] / [Öneri] alanlarında yapılan seçimler ve brief'ten bilinçli sapmalar),
- her bileşen için **durum tabloları** ve **erişilebilirlik notları**.

Çelişki olursa sıra: `02-design-tokens.md` > 03–09 ve `api-draft.ts` > `DESIGN-BRIEF.md` > bu belgeler > tasarım dosyası.

**Ölçek (D41):** Bu belgelerdeki px ölçüleri ve tasarım dosyası 13 px yazı / 16 ikon / 32 kontrol / 8 aralık temel ölçeğindedir. Uygulamada bunlar `02-design-tokens.md` › Ölçek token'larına eşlenir (ör. 32 → `--dt-control-h`, 28 → `--dt-control-h-sm`, 13 px → `--dt-ui-fs`); paket bir kademe büyük çizer.

## Tasarım dosyası

Link: https://claude.ai/artifact/AughfWtSj8V1c9SDcRfzki (özel; ekip için Share menüsünden paylaşılmalı)

Her tasarımın light ve dark artboard'u vardır. Çoğu sayfada light solda, dark sağdadır (telefonlarda yan yana); T1-05, T2-07 ve T9'da dark'lar ayrı satırda ya da ayrı blokta durur.

| Sayfa | İçerik | Belge |
|---|---|---|
| T1 · List screen | Production orders: normal, seçim, expand, üç yoğunluk, bileşen dili | [03-datatable.md](03-datatable.md), [02-ortak-bilesenler.md](02-ortak-bilesenler.md) |
| T2 · Filtering | Column picker, Status/Owner/Date/Value/Text editörleri, operatör menüsü, +N more (D29 ile kaldırıldı), çip anatomisi | [03-datatable.md](03-datatable.md) §3 |
| T3 · Views | Görünüm menüsü, satır menüsü, system görünüm, Save as new view, silme onayı, Display (Shared views ve Share with my team D30 ile kaldırıldı) | [03-datatable.md](03-datatable.md) §4 |
| T4 · Column headers | Header durumları, sütun menüsü, multi-sort, Columns ve Sort panelleri (playground'da T1 içinde) | [03-datatable.md](03-datatable.md) §5 |
| T5 · Selection | Checkbox kuralları, floating ve toolbar bulk bar, ⋯ menüsü, uygulamanın onay dialog'u, telefon | [03-datatable.md](03-datatable.md) §7, [04-datatable-telefon.md](04-datatable-telefon.md) |
| T6 · Row detail | Expand, satır aksiyonları, satır menüsü, “Copied” (playground'da T1 içinde; T5 de) | [03-datatable.md](03-datatable.md) §8 |
| T7 · Cell actions | Hücre aksiyonları (hover/odak), uygulamanın çizdiği hücreler | [03-datatable.md](03-datatable.md) §9 |
| T8 · Cell types | 23 tip, skeleton biçimleri, 8 ton, yoğunluklar | [02-ortak-bilesenler.md](02-ortak-bilesenler.md) §8 |
| T9 · States | First load, refreshing, query change, empty, no results (3), error, stale, still loading, no rows on page, footer durumları | [03-datatable.md](03-datatable.md) §10–11 |
| T11 · DataSheet | Toplu düzenleme ekranı, hücre durumları, editörler, doldurma, yapıştırma, hücre menüsü | [06-datasheet.md](06-datasheet.md) |
| T12 · Saving & import | Kayıt dialog'u, kaydetme, kaydedildi, kısmen kaydedildi, çıkış/vazgeç, açılış, satır sınırı, Excel içe aktarma, telefon salt okunur | [06-datasheet.md](06-datasheet.md) §9–12 |
| T13 · Phone | DataTable < 640 px: liste, kaydırma, arama, Filters / değer / görünüm / ⋯ alt sayfaları, bulk bar | [04-datatable-telefon.md](04-datatable-telefon.md) |

Token değerleri: [01-tokenlar.md](01-tokenlar.md).

## Tasarımda verilen kararlar (brief'e ek)

| # | Karar | Nerede |
|---|---|---|
| D26 | Toolbar'da facet / hızlı filtre çipi yok | README karar günlüğü (onaylandı 2026-10-21) |
| D27 | Görünüm kaydetme seçenekleri görünüm menüsünün en üstünde; filtre satırında “View edited / Save view” yok | README karar günlüğü (onaylandı 2026-10-21) |
| D28 | **Önizleme (peek) paketin değil.** Sağ panel, telefonda tam ekran sayfa, satırdaki Preview düğmesi, menüdeki Preview, `Space` ve `#peek` yok. Satır aksiyonu yalnızca ⋯ (56 px sütun). Uygulama isterse kendi sheet'ini açar | README karar günlüğü (onaylandı 2026-10-21) |
| S1 | Satır menüsü hover rengi ilk öğede gösterildi; menüde kısayol `kbd` sağda soluk | T6 |
| S2 | Telefonda filtre çipi iki parça: alan + değer; × yok; dokununca Filters alt sayfası | T13, T5 telefon |
| S3 | Telefon toolbar'ında birincil aksiyon 34 px mürekkep kare “+” (44 px dokunma alanı), ⋯'den sonra ayırıcıyla | T13 |
| S4 | Filters alt sayfasında uygulanmış her filtrenin satırında kaldırma (×) var; değer alt sayfasının düğmesi “Done” | T13 |
| S5 | Telefonda sayfa başına satır seçici yok (masaüstü tercihi) | T13 |
| S6 | DataSheet “Save with errors” dialog'u hatalı satırı (satır no · SKU · mesaj) gösterir; dialog 480 px | T12 |
| S7 | Kaydederken formül çubuğunun ipucu alanında kilit + “Read-only while saving” | T12 |
| S8 | Kısmen kaydedildi şeridinde hata gezinmesi (‹ 1 of 3 ›) ve Copy errors aynı şeritte | T12 |
| S9 | Discard dialog'unun gövde metni: “The sheet goes back to how it was loaded. This can't be undone.” | T12 |
| S10 | Import dialog'unda eşleşme anahtarı seçilmemişse select amber kenar + 3 px amber hale; mesaj amber metin | T12 |
| S11 | DataSheet toolbar'ında Find 188 px (brief 240): 1440 px'lik ekranda Save kontrolleriyle birlikte tek satıra sığması için | T11 |
| S12 | DataSheet gutter numaraları binlik ayırıcısız (`10001`) — 56 px'e sığması için | T11 |

S6, S11 ve S12 spesifikasyona işlendi (02 dialog ölçüsü, 07 Find genişliği ve gutter). Header row seçici (T12) kabul edildi ve 07 §13'e kuralıyla yazıldı.

## Brief'in örnek sayılarından sapmalar

- T12 “Saved”: brief “96 rows saved · 24 created · 72 updated” der; örnek veride tek yeni satır olduğu için “1 created · 95 updated” kullanıldı. Metin şablonu aynı.
- T12'de iki senaryo var: küçük (128 değişiklik / 96 satır) ve büyük (9,600 satırlık fiyat güncellemesi; “Saving… 4,800 of 9,600”, “3 rows couldn't be saved. 9,597 rows were saved.”).
- T12 içe aktarma, 10.000 satırlık tabloya 12 yeni SKU ekliyor gibi gösterildi (brief örneği). Gerçekte `maxRows` 10.000 ise `sheet.limitFile` uyarısı devreye girmeli; bu durum ayrıca çizilmedi.

## Açık kalanlar ve çizilmeyenler

- Telefonda satır ⋯ sütunu T13'te çizilmedi; 05 §11 gereği masaüstündeki gibi sağa sabit 56 px ⋯ sütunu uygulanır (düğme 28 × 28, dokunma alanı 44 px).
- Import'ta eşleşmeyen sütun satırı (select boş, “Choose a field”) ve `maxRows` aşımı uyarısı (`sheet.limitFile`) çizilmedi; metinler 09'da.
- Switch'in açık durumu çizilmedi (02-ortak §3).
- Q3 (Excel'deki boş hücre) için tasarımlar README'deki varsayılanı izler. Tasarımdaki `New` / `Update` etiketi uygulanmaz (D47): eklenen satır yalnızca gutter'daki `+` ve accent-soft anahtar hücresiyle işaretlenir.

## `design/` görselleri

T1–T13'ün 84 artboard'ı 1× PNG olarak light ve dark `design/` altındadır (2026-10-21 dışa aktarımı): klasör `design/T01-list` … `design/T13-phone`, dosya `T1-01-light.png` kalıbında; artboard başlıkları `design/README.md`'de. Roadmap'teki görsel karşılaştırmalar (T8 Playwright, T1/T13 “birebir”) bu dosyalara bakar. `design/` git'e girmez (`.gitignore`); yeni bir klonda veya tasarım değişince Paylaş › Dışa aktarma › PNG (1×) ile sayfa sayfa yeniden aktarılır ve `design/README.md`'deki adlandırmaya göre yerleştirilir.

## Metinler

Ekranlardaki her metin `09-i18n.md`'de bir anahtara karşılık gelir. Tasarım sırasında eklenen ve 09'a işlenen anahtarlar: `sort.addHint`, `state.tryAgain`, `sheet.savingReadOnly`, `sheet.prevError`, `sheet.nextError`, `sheet.discard.body`, `sheet.readOnly.total`, `import.headerRow`, `import.headerRowN`, `import.chooseField`, `sr.loadingPercent`, `common.done`, `mobile.chipAria`, `mobile.backToFilters`. 09'dan kaldırılanlar: `filter.viewEdited`, `filter.saveView` (D27), `row.preview`, `row.previewAria`, `peek.*` (D28).
