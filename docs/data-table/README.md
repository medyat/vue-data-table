# Data Table — Geliştirme Spesifikasyonu

Bu klasör, **Data Table** sisteminin Vue 3 paketi (`@swors/data-table`) olarak geliştirilmesi için hazırlanmış spesifikasyondur. Claude Code ile geliştirme yaparken her aşamada önce ilgili dokümanı okuyun; tasarım referansı `DESIGN-BRIEF.md`'dir. Dokümanla tasarım görseli çelişirse **doküman** geçerlidir.

> **Tasarım kaynağı:** ilk canvas tasarımı (20 board) kararlarla çeliştiği için 2026-10-21'de kaldırıldı. T1–T13 tasarımları aynı gün Claude Design ile [DESIGN-BRIEF.md](DESIGN-BRIEF.md)'deki görev paketlerinden üretildi; teslim belgeleri (ölçüler, durumlar, tasarım kararları) `docs/handoff/` altındadır, tasarım dosyasının linki orada. Dışa aktarılmış görseller (1× PNG, light/dark) `design/` altındadır (git'e girmez, yerelde tutulur); dizin `design/README.md`. Token'ların tek kaynağı `02-design-tokens.md`'dir.

---

## Ne inşa ediyoruz?

Ortak bir çekirdek (`core/`) üzerinde **üç bileşen**. Üçü de aynı hücre tiplerini, token'ları, yoğunluk sistemini ve bileşen dilini kullanır; her biri kendi props/emits sözleşmesine sahiptir (mod bayrağı yok).

| Bileşen | Giriş noktası | Nerede | Özet |
|---|---|---|---|
| `DataTable` | `@swors/data-table` | Siparişler, ürünler, müşteriler… modülün ana ekranı | Sayfa yüksekliğini doldurur; sanal satırlar; filtre, görünümler, sayfalama, sayfa kapsamlı seçim, toplu aksiyon, satır detayı. İstemci ya da sunucu modu |
| `DocumentTable` | `@swors/data-table` | Sipariş, fatura, irsaliye detay sayfası | Yükseklik içeriğe göre; satır detayı (expand) ve toplamlar; toolbar/filtre/sayfalama/sıralama yok |
| `DataSheet` | `@swors/data-table/sheet` | Ürün kartları, fiyat listeleri (≤ 10.000 satır) | Excel benzeri ızgara; hücre içi düzenleme, yapıştırma, doldurma, geri al, içe aktarma; değişiklikler `@save` ile uygulamaya teslim edilir |

**Paket veri çekmez, kaydetmez.** Uygulama `rows` verir; sunucu modunda `@request` ile sorguyu alır ve kendi HTTP'siyle cevaplar; DataSheet'te `@save` ile değişiklikleri alır ve `applyResult()` ile sonucu bildirir. Paket içinde HTTP, önbellek, otomatik yeniden deneme veya iş mantığı yoktur.

## Doküman haritası

| Dosya | İçerik |
|---|---|
| [01-architecture.md](01-architecture.md) | Paket yapısı, üç bileşen + çekirdek, TanStack sınırı, veri akışı, plugin ve adapter'lar |
| [02-design-tokens.md](02-design-tokens.md) | Tüm token'lar (light/dark), yoğunluk, tipografi, gölgeler, shadcn-vue eşlemesi |
| [03-column-types.md](03-column-types.md) | 24 sütun tipi: hücre görünümü, hizalama, filtre operatörleri, editör; `cell` / `actions` / `editor` ile özelleştirme |
| [04-filters-and-views.md](04-filters-and-views.md) | Filtre modeli (18 operatör), çip davranışı, arama, sıralama, görünümler, tercihler |
| [05-mode-list.md](05-mode-list.md) | DataTable: düzen, toolbar, header, sütun yönetimi, seçim, satır etkileşimleri, sayfalama, durumlar, mobil |
| [06-mode-document.md](06-mode-document.md) | DocumentTable |
| [07-mode-sheet.md](07-mode-sheet.md) | DataSheet: düzenleme, pano, doldurma, geri al, içe aktarma, kayıt teslimi, Laravel tarifi |
| [08-accessibility-keyboard.md](08-accessibility-keyboard.md) | ARIA rolleri, odak modelleri, tüm klavye kısayolları |
| [09-i18n.md](09-i18n.md) | Tüm arayüz metinleri (EN + TR) ve biçimlendirme kuralları |
| [10-roadmap.md](10-roadmap.md) | Aşamalı geliştirme planı ve kabul kriterleri |
| [api-draft.ts](api-draft.ts) | Public TypeScript sözleşmesi (props, emits, handle, ColumnDef, filtre, görünüm, sheet) |
| [DESIGN-BRIEF.md](DESIGN-BRIEF.md) | Tasarım ve sistem brifingi: tüm kararların tek referansı, Claude Design görev paketleri (T1–T13) |

## Tasarım ilkeleri

1. **Mavi = durum, mürekkep = aksiyon.** Accent mavi yalnızca seçim, odak, aktif filtre, değişmiş hücre ve kaydırma göstergesi gibi *durumlar* içindir. Birincil buton koyu mürekkep rengindedir (dark temada açık).
2. **Kırmızı yalnızca hata.** Boolean “No”, iptal edilmiş kayıt, satırı listeden çıkarma gibi şeyler nötr gösterilir.
3. **Az kalabalık, aşamalı görünürlük.** Filtre satırı yalnızca filtre varken görünür. Satır ve hücre aksiyonları hover/odakta belirir. Toolbar yalnızca yapılandırılmış yuvaları gösterir ve daraldıkça katlanır.
4. **Tablo karta dönüşmez.** Mobilde de tablo korunur; yatay kayar, birincil sütun sabit kalır.
5. **Sayılar hizalı.** Sayı/tutar sağa hizalı, tabular rakam; para birimi kodu soluk mono.
6. **Sayı uydurma yok.** Toplam kayıt sayısı bilinmiyorsa gösterilmez; “Count total” ile isteğe bağlı sayılır.
7. **Önce yerleşik özellik.** Bir ihtiyaç için önce TanStack Table / Virtual ve reka-ui'nin desteklenen API'sine bakılır; özel mekanizma ancak bunlar yetmezse yazılır, iç API'lere bağlanılmaz.

## Karar günlüğü (değiştirmeden önce sorun)

Bu kararlar ürün sahibiyle (Hüseyin) birlikte alındı. Geliştirme sırasında değiştirmeyin; gerekirse önce sorun.

| # | Karar | Gerekçe |
|---|---|---|
| D1 | **AND/OR filtre builder yok.** Filtre = sütun + operatör + değer. Çipler hep birlikte (AND) uygulanır. | Tek model daha anlaşılır. |
| D2 | **Her sütun için tek çip.** Filtrelenmiş bir sütun tekrar seçilirse mevcut çip açılır. Aralıklar tek çipte (`between`, `within`). | Çelişen çipleri önler. |
| D3 | **Arama filtre değildir.** Çip üretmez; aranabilir metin sütunlarında arar. Uzaktan öneri (suggest) altyapısı yoktur. | Arama ve filtre zihinsel olarak ayrı. |
| D4 | **Görünümler tek tiptir:** `kind: system \| personal \| shared`. System görünümler kodla tanımlanır ve değiştirilemez; personal yalnızca sahibine; shared yalnızca adapter `capabilities.share` destekliyorsa. Kullanıcı varsayılan görünümünü seçebilir (tercih). | Paylaşım kararı adapter'a bırakıldı; model tek. |
| D5 | **Görünüm = filtre + sıralama + sütun düzeni.** Yoğunluk, tema, sayfa boyutu görünüme yazılmaz (kişisel tercih). | |
| D6 | **Satırın tamamı link değildir.** Birincil hücre gerçek `<a href>`; satır gövdesine tıklamak varsayılan olarak hiçbir şey yapmaz ve asla seçim yapmaz. `row-click="open \| expand"` ile satır tıklanabilir olur; yeni sekme ve sağ tık için birincil link kalır. | Seçim, kopyalama, navigasyon çakışmaz. |
| D7 | **Simple pagination, yalnızca o.** 100 satır/sayfa (50/100/250/500), sanal satırlar, toplam isteğe bağlı (`countable`). Numbered / load-more / infinite yok. | Pahalı COUNT sorgusu yok; tek sayfalama modeli. |
| D8 | **Sanal listede satır yüksekliği sabit.** DataTable'da “Wrap long text” yok. | Sanallaştırma için. |
| D9 | **boolean:** Yes = yeşil, No = nötr. Gerçek olumsuzluklar için sütunda `falseTone: 'destructive'`. | Kırmızı = hata. |
| D10 | **color:** renk kutusu + değer. Tam dolu hücre yalnızca `display: 'fill'`. | Seçim/hover durumlarını bozmaz. |
| D11 | **DataSheet kaydı:** tek Save → yalnızca yeni ve değişen satırlar → anahtar sütuna (SKU) göre **upsert**. Asla silmez. Kaydı uygulama yapar. | Ürün sahibinin mevcut iş akışı. |
| D12 | **DataSheet'te satır ekleme/çıkarma partiyi değiştirir,** sunucuda kayıt oluşturmaz/silmez. “Remove from list” nötr bir işlemdir. | |
| D13 | **DataSheet'te filtre yalnızca görünümü daraltır;** gizlenen satırlardaki değişiklikler korunur. | 10.000 satırda kaybolan düzenlemeleri önler. |
| D14 | **DataSheet telefonda salt okunur** (< 768 px veya yalnızca dokunmatik). | Hücre düzenleme telefonda verimsiz. |
| D15 | **Belge satırlarında sıralama yok;** satırlar belge sırasında (#) kalır. | |
| D16 | **Arayüz metinleri İngilizce varsayılan,** Türkçe çeviri birinci sınıf (09). | Paket uluslararası yayınlanacak. |
| D17 | **Üç bileşen, tek çekirdek.** `DataTable`, `DocumentTable`, `DataSheet`; `variant` prop'u yok. | `defineProps<A \| B>()` union'ı düzleştirir; ayrı sözleşmeler daha sade ve tip güvenli. |
| D18 | **Paket veri çekmez.** `rows` tek giriştir; sunucu modunda `@request` → uygulama HTTP → `rows/hasMore/loading/error`. DataSheet'te `@save` → uygulama HTTP → `applyResult()`. | HTTP, önbellek ve retry uygulamanın kalıbıyla; paket I/O kodu taşımaz. |
| D19 | **Seçim sayfa kapsamlıdır.** Sayfa, sayfa boyutu, filtre, arama ve sıralama değişince temizlenir; refresh'te korunur. All-matching, sayfalar arası seçim ve `excludedKeys` yoktur. | “Görmediğin satırı işleme”; basit ve öngörülebilir. |
| D20 | **Toplu ve satır aksiyonları iş mantığı taşımaz.** `run(rows)` / `run(row)` beklenmez; onay, toast, temizleme ve refresh uygulamanındır. | Paket işlem motoru değildir. |
| D21 | **Özel hücre = `ColumnDef.cell` (h() fonksiyonu), `actions`, `editor`.** Vue slot ile hücre özelleştirme yoktur; sütun tanımları feature'ın `columns.ts` dosyasında yaşar. `custom` tipi yoktur; `object` kaçış kapısıdır. | Tip güvenli, merkezi, yeniden kullanılabilir tanım. |
| D22 | **Sürükle-bırak ilk sürümde yok.** Sütun sırası menü ve klavye ile (`⌥⇧←/→`); Manage columns dialog'u ertelendi. | Bakımsız DnD bağımlılığı yok; menü yeterli. |
| D23 | **Önce TanStack.** Sütun modeli, sıralama, sayfalama state'i, satır seçimi, expand ve hücre seçimi TanStack Table'ın yerleşik özellikleridir; sanal satırlar TanStack Virtual. Özel mekanizma yalnızca bunlar yetmeyince. | Yeniden yazılmış özellik ve bakım maliyeti yok. |
| D24 | **Klavye modeli:** DataTable satır odaklı, DataSheet hücre odaklı; ikisi de roving tabindex (`aria-activedescendant` yok). Hücre içi widget'lar `tabindex="-1"`, `→` / `Enter` ile girilir, `Esc` ile çıkılır. | Sanal listede referans garantisi; ekran okuyucuya doğal odak olayları. |
| D25 | **`syncUrl` yok.** Uygulama isterse `view-change` / `request` olaylarıyla kendi URL'ini yazar. | Kapsam. |
| D26 | **Toolbar'da facet / hızlı filtre çipi yok.** Her filtre Filter › column picker veya header menüsünden eklenir; `ColumnDef.facet` yoktur. | Tek giriş noktası, sade toolbar. (Tasarım, 2026-10-21) |
| D27 | **Görünüm kaydetme aksiyonları görünüm menüsündedir.** Görünüm düzenlenince menünün üstünde Save changes (`⌘S`) · Save as new view… · Discard changes; filtre satırında “View edited · Reset · Save view” yoktur. | Filtre satırı yalnızca filtre içindir; sıralama/sütun değişikliği de aynı yerden kaydedilir. (Tasarım, 2026-10-21) |
| D28 | **Önizleme (peek) paketin değil.** Sağ panel, satırdaki Preview düğmesi, menüdeki Preview, `Space`, `peek` prop'u ve `#peek` slot'u yoktur; satır aksiyon sütunu yalnızca ⋯ (56 px). İhtiyaç duyan uygulama `row-click` olayı veya `rowActions` ile kendi panelini/sayfasını açar. | Sanal listeyle odak/Prev-Next senkronu pahalı; uygulama önizlemeyi kendi tasarımıyla taşır. (Tasarım, 2026-10-21) |

## Açık sorular (ilgili aşamaya başlamadan önce ürün sahibine sorun)

| # | Soru | Dokümanda varsayılan | Aşama |
|---|---|---|---|
| Q2 | DataSheet'te listede olmayan ama sunucuda var olan bir anahtar eklenince (Update satırı), boş hücreler sunucudaki değerlerle doldurulsun mu? | Evet: doldurulur, yalnızca kullanıcının değiştirdiği alanlar gönderilir (07 §9). Alternatif: boş hücreler `null` gönderilir ve mevcut değeri siler. | Faz 6c |
| Q3 | Excel içe aktarmada boş hücre mevcut değeri silsin mi? | Hayır: atlanır (07 §13). | Faz 6d |

Q1 (kullanıcı varsayılan görünümü) kapandı: evet, tercihlerde `defaultViewId` (D4).

## Tasarım geçmişi

İlk canvas board'ları (20 board, kit.css, ekran görüntüleri) kararlarla çeliştiği için kaldırıldı; oradaki davranışlardan değişen kararlar günlükte (D4, D6, D7, D17–D25). T1–T13 tasarımları 2026-10-21'de DESIGN-BRIEF'e göre Claude Design ile yapıldı; tasarım sırasında alınan D26–D28 günlüğe işlendi ve dokümanlar buna göre güncellendi. Teslim belgeleri `docs/handoff/`. Bir tasarım dokümanla çelişirse doküman geçerlidir, çelişki not edilip sorulur.

## Sözlük

| Terim | Anlamı |
|---|---|
| Çip (chip) | Filtre satırındaki tek filtre: `alan · operatör · değer · ×` |
| Görünüm (view) | Kaydedilmiş filtre + sıralama + sütun düzeni |
| Talep (request) | Sunucu modunda paketin `@request` ile yaydığı sorgu (`query`, `reason`, `signal`) |
| Snapshot | Footer'ın okuduğu, başarıyla yüklenmiş son sayfa bilgisi (satırlar + `hasMore`) |
| Bulk bar | Satır seçildiğinde altta yüzen toplu aksiyon çubuğu |
| Parti (batch) | DataSheet'teki satırların tamamı; Save'de yeni/değişen satırlar gönderilir |
| Anahtar sütun (key) | Upsert eşleşmesini belirleyen sütun (ör. SKU); `rowKey`'den ayrıdır |
| Taslak (draft) | DataSheet'te orijinal satıra dokunmadan tutulan hücre değişiklikleri |
