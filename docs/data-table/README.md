# Data Table — Geliştirme Spesifikasyonu

Bu klasör, **Data Table** sisteminin Vue 3 paketi (`@medyat/vue-data-table`) olarak geliştirilmesi için hazırlanmış spesifikasyondur. Claude Code ile geliştirme yaparken her aşamada önce ilgili dokümanı okuyun; tasarım referansı `DESIGN-BRIEF.md`'dir. Dokümanla tasarım görseli çelişirse **doküman** geçerlidir.

> **Tasarım kaynağı:** ilk canvas tasarımı (20 board) kararlarla çeliştiği için 2026-10-21'de kaldırıldı. T1–T13 tasarımları aynı gün Claude Design ile [DESIGN-BRIEF.md](DESIGN-BRIEF.md)'deki görev paketlerinden üretildi; teslim belgeleri (ölçüler, durumlar, tasarım kararları) `docs/handoff/` altındadır, tasarım dosyasının linki orada. Dışa aktarılmış görseller (1× PNG, light/dark) `design/` altındadır (git'e girmez, yerelde tutulur); dizin `design/README.md`. Token'ların tek kaynağı `02-design-tokens.md`'dir.

---

## Ne inşa ediyoruz?

Ortak bir çekirdek (`core/`) üzerinde **üç bileşen**. Üçü de aynı hücre tiplerini, token'ları, yoğunluk sistemini ve bileşen dilini kullanır; her biri kendi props/emits sözleşmesine sahiptir (mod bayrağı yok).

| Bileşen | Giriş noktası | Nerede | Özet |
|---|---|---|---|
| `DataTable` | `@medyat/vue-data-table` | Siparişler, ürünler, müşteriler… modülün ana ekranı | Sayfa yüksekliğini doldurur; sanal satırlar; filtre, görünümler, sayfalama, sayfa kapsamlı seçim, toplu aksiyon, satır detayı. İstemci ya da sunucu modu |
| `DataSheet` | `@medyat/vue-data-table/sheet` | Ürün kartları, fiyat listeleri (≤ 10.000 satır) | Excel benzeri ızgara; hücre içi düzenleme, yapıştırma, doldurma, geri al, içe aktarma; değişiklikler `@save` ile uygulamaya teslim edilir |

**Paket veri çekmez, kaydetmez.** Uygulama `rows` verir; sunucu modunda `@request` ile sorguyu alır ve kendi HTTP'siyle cevaplar; DataSheet'te `@save` ile değişiklikleri alır ve `applyResult()` ile sonucu bildirir. Paket içinde HTTP, önbellek, otomatik yeniden deneme veya iş mantığı yoktur.

## Doküman haritası

| Dosya | İçerik |
|---|---|
| [01-architecture.md](01-architecture.md) | Paket yapısı, üç bileşen + çekirdek, TanStack sınırı, veri akışı, plugin ve adapter'lar |
| [02-design-tokens.md](02-design-tokens.md) | Tüm token'lar (light/dark), yoğunluk, tipografi, gölgeler, shadcn-vue eşlemesi |
| [03-column-types.md](03-column-types.md) | 23 sütun tipi: hücre görünümü, hizalama, filtre operatörleri, editör; `cell` / `actions` / `editor` ile özelleştirme |
| [04-filters-and-views.md](04-filters-and-views.md) | Filtre modeli (18 operatör), çip davranışı, arama, sıralama, görünümler, tercihler |
| [05-mode-list.md](05-mode-list.md) | DataTable: düzen, toolbar, header, sütun yönetimi, seçim, satır etkileşimleri, sayfalama, durumlar, mobil |
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
| D4 | **Görünümler tek tiptir:** `kind: system \| personal`. System görünümler kodla tanımlanır ve değiştirilemez; personal yalnızca sahibine. Kullanıcı varsayılan görünümünü seçebilir (tercih). *(`shared` türü D30 ile kaldırıldı.)* | Model tek; paylaşım yok (D30). |
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
| D15 | ~~Belge satırlarında sıralama yok.~~ D31 ile geçersiz (belge tablosu kapsam dışı). | |
| D16 | **Arayüz metinleri İngilizce varsayılan,** Türkçe çeviri birinci sınıf (09). | Paket uluslararası yayınlanacak. |
| D17 | **İki bileşen, tek çekirdek.** `DataTable`, `DataSheet`; `variant` prop'u yok. (D31'e kadar üçüncü bileşen `DocumentTable` vardı.) | `defineProps<A \| B>()` union'ı düzleştirir; ayrı sözleşmeler daha sade ve tip güvenli. |
| D18 | **Paket veri çekmez.** `rows` tek giriştir; sunucu modunda `@request` → uygulama HTTP → `rows/hasMore/loading/error`. DataSheet'te `@save` → uygulama HTTP → `applyResult()`. | HTTP, önbellek ve retry uygulamanın kalıbıyla; paket I/O kodu taşımaz. |
| D19 | **Seçim sayfa kapsamlıdır.** Sayfa, sayfa boyutu, filtre, arama ve sıralama değişince temizlenir; refresh'te korunur. All-matching, sayfalar arası seçim ve `excludedKeys` yoktur. | “Görmediğin satırı işleme”; basit ve öngörülebilir. |
| D20 | **Toplu ve satır aksiyonları iş mantığı taşımaz.** `run(rows)` / `run(row)` beklenmez; onay, toast, temizleme ve refresh uygulamanındır. | Paket işlem motoru değildir. |
| D21 | **Özel hücre = `ColumnDef.cell` (h() fonksiyonu), `actions`, `editor`.** Vue slot ile hücre özelleştirme yoktur; sütun tanımları feature'ın `columns.ts` dosyasında yaşar. `custom` tipi yoktur; `object` kaçış kapısıdır. | Tip güvenli, merkezi, yeniden kullanılabilir tanım. |
| D22 | **Sürükle-bırak ~~ilk sürümde~~ yalnızca Columns dialog'undadır** (2026-10-29 revize). Header ve Sort panelinde sürükleme yok; header'da sıra menü ve klavye ile (`⌥⇧←/→`). Dialog'da tutamaçla sürükle-bırak `@dnd-kit/vue` (+ `@dnd-kit/dom`, `~0.5.1`, external) ile; klavye (tutamaçta `Space` al · `↑↓` · `Space` bırak · `Esc` iptal) ve ekran okuyucu duyuruları kütüphanenin Accessibility eklentisinden, metinler i18n'den. Dialog ve kütüphane yalnızca ilk açılışta yüklenir. | İlk gerekçe bakımsız DnD bağımlılığından kaçınmaktı. Kullanıcı isteği: 15+ sütunda okla taşımak yorucu. dnd-kit aktif bakımlı (son sürüm 2026-10) ve klavye/duyuru desteği yerleşik olan tek aday; vue-draggable-plus (SortableJS) klavye desteği taşımıyor. 1.0 öncesi: sürüm sabit. |
| D23 | **Önce TanStack.** Sütun modeli, sıralama, sayfalama state'i, satır seçimi, expand ve hücre seçimi TanStack Table'ın yerleşik özellikleridir; sanal satırlar TanStack Virtual. Özel mekanizma yalnızca bunlar yetmeyince. | Yeniden yazılmış özellik ve bakım maliyeti yok. |
| D24 | **Klavye modeli:** ~~DataTable satır odaklı~~ (D40: DataTable'da satır klavyesi yok, widget'lar doğal Tab sırasında), DataSheet hücre odaklı; ikisi de roving tabindex (`aria-activedescendant` yok). Hücre içi widget'lar `tabindex="-1"`, `→` / `Enter` ile girilir, `Esc` ile çıkılır. | Sanal listede referans garantisi; ekran okuyucuya doğal odak olayları. |
| D25 | **`syncUrl` yok.** Uygulama isterse `view-change` / `request` olaylarıyla kendi URL'ini yazar. | Kapsam. |
| D26 | **Toolbar'da facet / hızlı filtre çipi yok.** Her filtre Filter › column picker veya header menüsünden eklenir; `ColumnDef.facet` yoktur. | Tek giriş noktası, sade toolbar. (Tasarım, 2026-10-21) |
| D27 | **Görünüm kaydetme aksiyonları görünüm menüsündedir.** Görünüm düzenlenince menünün üstünde Save changes (`⌘S`) · Save as new view… · Discard changes; filtre satırında “View edited · Reset · Save view” yoktur. | Filtre satırı yalnızca filtre içindir; sıralama/sütun değişikliği de aynı yerden kaydedilir. (Tasarım, 2026-10-21) |
| D28 | **Önizleme (peek) paketin değil.** Sağ panel, satırdaki Preview düğmesi, menüdeki Preview, `Space`, `peek` prop'u ve `#peek` slot'u yoktur; satır aksiyon sütunu ⋯ + hata ikonu (D35) + inline aksiyonlar (D36), içeriğe göre genişlik. İhtiyaç duyan uygulama `row-click` olayı veya `rowActions` ile kendi panelini/sayfasını açar. | Sanal listeyle odak/Prev-Next senkronu pahalı; uygulama önizlemeyi kendi tasarımıyla taşır. (Tasarım, 2026-10-21) |
| D31 | **Belge tablosu (`DocumentTable`) kapsam dışı.** Paket iki bileşendir: `DataTable`, `DataSheet`. Detay sayfasındaki satır listeleri için uygulama `DataTable`'ı istemci modunda `toolbar="false"` ile kullanır ya da kendi basit tablosunu yazar. 06 dokümanı, handoff 05, brief §7 ve T10 tasarımı kaldırıldı. | Kullanıcı: beklenen bileşen bu değildi; genel "SimpleTable" denemesi de istenen şey olmadı. (2026-10-22) |
| D30 | **Paylaşılan görünüm yok.** Görünümler `system` (kodda) ve `personal` (kullanıcının kendi); `shared` türü, `readonly`, adapter `capabilities.share`, “Share with my team” kutusu ve “Shared views” bölümü yoktur. Ekip için ortak görünüm gerekirse `views` prop'unda system view olarak kodda tanımlanır. | Kullanıcı kararı: görünümler kişiseldir; paylaşım katmanı (yetki, salt okunur, çakışma) ürünün ihtiyacı değil. (2026-10-21) |
| D32 | **Satıra göre seçenek kapatma: `optionEnabled(option, row)`.** `select`/`multiselect` sütununda `options` tam liste kalır; predicate kapalı seçeneği sheet editöründe gizler, yapıştırma/doldurma ile gelirse yalnızca **değişen** hücrede hata verir (mevcut değer kural değişince hata olmaz). `options`'ı fonksiyona çevirmek yok: etiket, filtre ve dışa aktarma satırsız çalışır. | Kullanıcı ihtiyacı (önceki sürümde vardı); gizle + doğrula ikilisi, kuralın yapıştırmayla delinmesini önler. (2026-10-22) |
| D33 | **Sütun açıklaması: `description`.** Header tooltip'i ad + açıklama olarak iki satır olur (etiket kesilmese de), Columns dialog'unda ad altında soluk satır, ekran okuyucuya `aria-describedby`. Header'da ⓘ ikonu yoktur; hücrede gösterilmez. | Kullanıcı ihtiyacı (önceki sürümde `headerDescription`, kısaltma ve hesaplanan alanları açıklamak için). İkon header'ı kalabalıklaştırır; tooltip ve panel aynı bilgiyi iki yerden verir. (2026-10-27) |
| D34 | **Satır aksiyonunda gizleme ile pasifleştirme ayrıdır:** `when(row)` false → aksiyon menüde yok (yetki); `disabled(row)` → pasif + gerekçe (durum). `CellAction.when` ile aynı. | Yetkisiz kullanıcıya pasif “Delete” göstermek soru doğurur; durum kaynaklı engel ise gerekçesiyle görünmeli. (2026-10-27) |
| D35 | **Liste satır hatası uygulamanın haritasından okunur: `rowError(row)`.** Paket hata saklamaz, temizlemez; metin/metin listesi dönen satır `--dt-r-bg` zemin (seçim ve hover'ın üstünde) + ⋯ hücresinde kırmızı uyarı ikonu (sayfada hatalı satır varken ⋯ sütunu 44 → 66 px; ⋯ sağa yaslı, hizası değişmez) + satırın tamamında tooltip + `aria-describedby`. Hücre bazlı hata, footer özeti, satır altı mesaj şeridi ve `busy`/`updated` tonları yoktur. | Toplu aksiyonun kısmi hatası satırda görünmeli (önceki sürümde `setErrors`); haritanın uygulamada olması “ne zaman silinir” sorusunu uygulamaya bırakır, D18 ile tutarlı. Sheet'in hata diliyle aynı token'lar. (2026-10-27) |
| D36 | **Inline satır aksiyonu ve aksiyon açıklaması.** `RowAction.inline` (+ `icon`) ⋯'nın solunda 28 px ikon düğmesi olarak çizilir; `when(row)` ile satıra göre; en fazla 2; çizildiği satırın menüsünde yer almaz (klavye `→` ile düğmeye ulaşır); menü boşalırsa ⋯ çizilmez. `RowAction.description` / `BulkAction.description` menüde ikinci satır (gerekçe ezer), düğmede tooltip. `BulkAction.when(rows)` bar ve menüden gizler. ⋯ sütunu içeriğe göre genişler. D28'in “yalnızca ⋯” kuralı bu kadar yumuşadı; satır aksiyon sütunu hâlâ önizleme ve link taşımaz. | Kullanıcı ihtiyacı: duruma göre satırda hızlı ikon (ör. Done'da Edit); aynı aksiyonun iki yerde görünmesi gereksiz. (2026-10-27) |
| D37 | **`tags` sütun tipi yoktur.** Serbest etiket listesi için ayrı tip tanımlanmaz; sabit seçenekli çoklu değer `multiselect`'tir. İhtiyaç doğarsa `multiselect`'e “yeni değer yazılabilir” seçeneği ya da ayrı tip olarak eklenir. | Bugünkü uygulamada karşılığı yok (tek serbest etiket alanı düz metin); `multiselect`'ten tek farkı seçeneklerin önceden bilinmemesi; kullanılmayan tipi taşımak yerine ihtiyaç olunca eklemek. (2026-10-28) |
| D38 | *Geri alındı (D47).* **Update satırının boş hücreleri sunucudaki kayıttan doldurulur** ve orijinal sayılır (değişmiş işaretlenmez); Save'de yalnızca kullanıcının değiştirdiği alanlar gider, boş bırakılan hücre mevcut değeri silmez (07 §9). Alternatif (boş hücre `null` gider, değeri siler) reddedildi. | Q2 kapanışı. D11 (update'te yalnızca değişen alanlar), D12 (silme yok) ve Q3 (boş Excel hücresi silmez) ile tutarlı; kullanıcı görmediği bir değeri yanlışlıkla silemez. (2026-10-28) |
| D39 | **İçe aktarmada boş Excel hücresi mevcut değeri silmez**, atlanır; yalnızca dolu hücreler yazılır (07 §13). Alternatif (boş hücre `null` yazar) reddedildi. | Q3 kapanışı. D12 (silme yok) ve D38 ile aynı ilke: kullanıcı dosyada görmediği bir değeri yanlışlıkla silemez; boş sütun "dokunma" demektir. (2026-10-28) |
| D40 | **DataTable'da satır klavyesi yoktur; liste fare odaklıdır** (D24'ün DataTable kısmını değiştirir). Satır odağı, odak çerçevesi, satır okları (`↑↓`, `Home/End`, `PageUp/Down`), satırda `↵` / `→` / `←` / `X` / `⇧↑↓` / `⌘A` / `⇧F10` ve başlıklar arası ok gezinmesi kalktı. Satırdaki widget'lar (checkbox, chevron, link, hücre aksiyonları, inline aksiyonlar, ⋯) ve başlık düğmeleri doğal Tab sırasındadır; kök `role="table"`, hücreler `cell`, satırda `aria-selected` yok (seçim checkbox'tan okunur). Sayfa kısayolları (`/ F V R ⌘S Alt←/→ Esc`) ve başlık düğmesindeki `↵ ⇧↵ ⇧F10 ⇧←/→ ⌥⇧←/→` kalır. Liste için hücre seçimi / aralık kopyalama reddedildi (aralık kopyalama DataSheet'in işidir). DataSheet hücre odaklı modeli değişmez. | Kullanıcı ihtiyacı: listede satır odağının fare kullanıcısına faydası yok; klavye erişimi Tab ile korunur, kod küçülür. (2026-10-28) |
| D41 | **Arayüz ölçeği token'a bağlı ve bir kademe büyük** (02 · Ölçek). Arayüz yazısı 14 px (`--dt-ui-fs`), ikon 18 (`--dt-icon`), kontrol 36 (`--dt-control-h`), aralık 10 (`--dt-space`), popover dolgusu 6 ve dört yönde eşit; diğer ölçüler bunlardan `calc` ile türer, uygulama kendi CSS'inde ezerek tüm paketi büyütüp küçültebilir. Comfortable 56 / 44 / 16 / 14.5, Standard 44 / 40 / 14 / 14; Compact (DataSheet) değişmez. DataTable'ın varsayılan sütun genişlikleri `--dt-fs / 13` oranında büyür. Tasarım ve handoff 13 / 16 / 32 / 8 temel ölçekte kalır. | Kullanıcı ihtiyacı: orta yaş kullanıcılar için daha okunur metin, daha büyük ikon ve dokunma hedefi; boyutun uygulamadan ayarlanabilmesi. (2026-10-28) |
| D42 | **Sütunu içeriğe sığdırma yoktur.** Resize tutamacında çift tık ve sütun menüsündeki Fit to content kaldırıldı; genişlik yalnızca sürükleyerek değişir. Yerine Reset width de eklenmedi. | Kullanıcı kararı: gizli hareket kazara tetikleniyordu, menü öğesi az kullanılıyor; sürüklemek yeterli. Ölçüm kodu (geçici `max-content` + reflow) da kalktı. (2026-10-28) |
| D43 | **Toolbar düzeni: gruplar.** Görünüm seçici ghost, başında ikon kutusu; arama + Filter grubu toolbar'ın tam ortasında; arama + Filter ve Display + ⋯ birer birleşik düğme grubu (ortak kenarlık, iç köşeler düz); filtre satırı toolbar'dan çizgiyle ayrılır. Display masaüstünde etiketli. Telefon düzeni değişmez. Tasarım dosyasından (T1) sapmadır. | Kullanıcı tasarımı: ilişkili kontroller tek blok olarak okunur, toolbar ve çipler tek başlık alanı gibi durur. (2026-10-28) |
| D44 | **Header ⋯ yalnızca gerektiğinde yer kaplar; filtre işareti etiketin solunda.** ⋯ hover, klavye odağı veya menü açıkken sağ uçta açılır (genişlik 0 → ikon, Tab sırasında kalır); sayısal başlıkta etiket o kadar sola kayar. Dokunmatikte hep görünür. Bindirme (⋯'nın etiketin üstüne gelmesi) reddedildi: kısa sayısal etiketin ortasını kapatıp sıralama tıklamasını menüye çeviriyordu. | Kullanıcı isteği: etiket ⋯'nın boş alanını kullansın. (2026-10-28) |
| D45 | **Sütun yönetimi dialog'dadır; Display › Columns drill-in'i kalkar** (D22'nin dialog kısmını değiştirir). Display menüsündeki Columns öğesi Manage columns dialog'unu açar: solda sol/sağ sabitleme, sağda arama + sütun listesi (göster/gizle, sıra). Sıra tutamaçla sürükle-bırak ve klavyeyle değişir (D22 revize); Move up / Move down okları yoktur. **Sabitleme konumsaldır:** sol Hiçbiri / İlk sütun / İlk iki sütun, sağ Hiçbiri / Son sütun / Son iki sütun; sayılan sütunlar seçim, birincil ve ⋯ gibi her zaman sabit sütunlardan sonraki veri sütunlarıdır, sıra değişince sabit sütun da değişir. Header menüsündeki Pin left / Pin right / Unpin kalkar. Görünümdeki `pinned.left/right` biçimi aynı kalır (sıradan türetilir). `ColumnDef.pinned` kalkar; birincil sütun kendiliğinden sola sabittir, varsayılan sabitleme system view'ın `columns.pinned`'ıyla verilir. **Dialog taslak üzerinde çalışır:** değişiklikler Kaydet'te tek seferde uygulanır (tek talep, tek “edited” geçişi); kapatmak/İptal hiçbir şeyi değiştirmez. | Kullanıcı ihtiyacı (önceki sürümdeki sütun tercihleri dialog'u): çok sütunlu ekranlarda 320 px'lik panel dar; aynı işi iki yerden yapmak bakım yükü. (2026-10-28) |
| D46 | **İçe ve dışa aktarma paketin içindedir (Excel, CSV).** Kütüphaneler zorunlu peer: `read-excel-file` + `write-excel-file` (MIT); ilk Import/Export'ta `import()` ile yüklenir, ilk açılış bundle'ına girmez. **Export ekranda görünen sütun ve satırları yazar:** DataTable'da seçim varsa seçili satırlar, yoksa sayfadaki satırlar (sunucu modunda yüklü sayfa; “tüm eşleşenler” yok); DataSheet'te All / Visible. Etiket “Export 100 rows” / “Export 3 selected rows”. .xlsx'te başlık kalın + dolgu + alt çizgi, dondurulmuş; sayı/para/tarih tipli hücre; `select` ve `boolean` sütunlarının seçenekleri ikinci sayfada (“Options”, görünür) birer sütun, hücreler o listeden açılır liste (data validation). .csv BOM'lu, ondalık virgüllü yerel ayarda `;`. Export menüsü varsayılan açık, `:exportable="false"` gizler (DataSheet'te `:importable` da). **Override:** `@export` dinlenirse paket dosya yazmaz (olay `rows` ile yayılır); `parseFile` verilirse yerleşik okuyucu yerine o kullanılır. Eski ikili `.xls` okunmaz (sebep mesajı). | Kullanıcı ihtiyacı: her listede Excel kodu yazmamak, özel durumda override. exceljs bakımsız (son sürüm 2023-10) ve ~8× büyük (gzip 262 KB, ikili 32 KB); SheetJS'in npm sürümü donuk ve CVE'li. Server modunda tüm eşleşenleri çekmek D18'e aykırı olurdu; kullanıcı kararı: ekranda ne varsa o. 01'deki “lisans/boyut kararını uygulama versin” gerekçesi kalktı. (2026-10-29) |
| D47 | **DataSheet'te Yeni / Güncelle ayrımı yoktur** (D38 ve Q2 kapanışını geri alır). Paket anahtarı sunucuda aramaz; `lookupKeys` prop'u, New / Update etiketi, kontrol spinner'ı ve Update satırını sunucudan doldurma kalktı. Eklenen satır gutter'da `+` ile işaretlenir. `@save` yükünde `op` yoktur: `values` = değişen alanlar + `required` sütunların güncel değeri + anahtar; eklenen satırda boş değer gitmez (boş hücre mevcut kaydı silmez, D39 ilkesi). Sunucu anahtara göre upsert eder. Import özeti “listede olan / olmayan” diye ayırır. | Kullanıcı kararı: sunucu zaten anahtara göre upsert ediyor (ör. `firstOrNew(['code'])`); ayrı sorgu uç noktası ve iki durumlu etiket bakım yükü. Required alanların her satırda gelmesi backend'in satır doğrulamasını (`required`) karşılar. (2026-10-29) |
| D29 | **Filtre satırı tek satırdır.** Çipler sarılmaz, `+N more` popover'ı ve Show all / Show fewer yoktur; sığmayan çipler yatay kayar, sağ kenarda solma, Clear all sağda sabit. | D2 çip sayısını sütun sayısıyla sınırlar; iki satır + ölçüm + gizli çip listesi bu sınırlı durum için karmaşıktı. (Uygulama, 2026-10-21) |

## Açık sorular (ilgili aşamaya başlamadan önce ürün sahibine sorun)

Açık soru kalmadı (2026-10-28). Kapananlar:

Q1 (kullanıcı varsayılan görünümü) kapandı: evet, tercihlerde `defaultViewId` (D4).

Q2 (Update satırında boş hücreler) kapandı: evet, sunucudaki kayıttan doldurulur ve orijinal sayılır; Save'de yalnızca kullanıcının değiştirdiği alanlar gider (D38). D47 ile geri alındı: Update satırı yoktur.

Q3 (içe aktarmada boş Excel hücresi) kapandı: hayır, mevcut değeri silmez, atlanır (D39).

## Tasarım geçmişi

İlk canvas board'ları (20 board, kit.css, ekran görüntüleri) kararlarla çeliştiği için kaldırıldı; oradaki davranışlardan değişen kararlar günlükte (D4, D6, D7, D17–D25). T1–T13 tasarımları 2026-10-21'de DESIGN-BRIEF'e göre Claude Design ile yapıldı; tasarım sırasında alınan D26–D28 günlüğe işlendi ve dokümanlar buna göre güncellendi; D29 uygulama sırasında (Faz 3a) alındı, T2-07 geçersiz. Teslim belgeleri `docs/handoff/`. Bir tasarım dokümanla çelişirse doküman geçerlidir, çelişki not edilip sorulur.

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
