# CLAUDE.md — Data Table paketi

Bu repo, Vue 3 için `@medyat/vue-data-table` paketini geliştirir: ortak bir çekirdek üzerinde **iki bileşen** — `DataTable` (liste), `DataSheet` (toplu düzenleme, ayrı giriş noktası). Ürün kararları ve spesifikasyon `docs/data-table/` altındadır; tasarım referansı `docs/data-table/DESIGN-BRIEF.md`, Claude Design'dan gelen tasarımlar `design/` altına konur.

## Her işe başlamadan önce

1. `docs/data-table/README.md` dosyasını oku (özellikle **Karar günlüğü**).
2. Üzerinde çalıştığın aşamayı `docs/data-table/10-roadmap.md` içinde bul; kabul kriterlerini not al.
3. İlgili bileşen dokümanını (05/07) ve gerekiyorsa 01 (mimari, TanStack sınırı), 03 (tipler), 04 (filtre/görünüm) dokümanlarını oku. Public sözleşme `api-draft.ts`'tedir; props/emit/tip adlarını oradan al.
4. Tasarım referansı `docs/data-table/DESIGN-BRIEF.md`'dir: §4 görsel sistem, bileşen bölümlerinde anatomi ve durumlar, §12'de görev paketleri. Tasarımın ölçü, durum ve kararları `docs/handoff/` altındaki teslim belgelerindedir (bileşen başına bir dosya); tasarım dosyasının linki orada. Dışa aktarılmış görseller `design/` altına eklendikçe ilgili ekranın görselini de aç. Ölçü ve renk için `02-design-tokens.md` geçerlidir; değerleri yuvarlama, ızgaraya oturtma.
5. Dokümanla tasarım görseli çelişirse **doküman** geçerlidir; çelişkiyi not et ve sor.
6. Bir özelliği yazmadan önce TanStack Table / TanStack Virtual / reka-ui'de aynı ihtiyacı karşılayan yerleşik özellik var mı bak (01 · TanStack sınırı). Sıra: yerleşik özellik → resmi API ile yapılandırma → desteklenen genişletme noktası → özel çözüm. İç API'lere bağlanma.

## Teknoloji

- Vue 3.5+, `<script setup lang="ts">`, TypeScript `strict`.
- Headless tablo mantığı: `@tanstack/vue-table` 9.x — yalnızca `core/columns/useColumnLayout`, `list/useListTable`, `sheet/useSheetTable` içinde; `grid/`, `cells/`, `filters/`, `ui/` TanStack import edemez (ESLint). Public API'de TanStack tipi yok. Sanal satırlar: `@tanstack/vue-virtual`.
- Popover, Combobox, Dialog, Calendar, Tooltip, DropdownMenu gibi primitifler: shadcn-vue'nun dayandığı `reka-ui`. Uygulamadaki shadcn-vue bileşenlerine bağımlı olma; paket kendi bileşenlerini taşır. Portallı içerik için reka'nın public emit/prop'larını kullan (`escapeKeyDown`, `focusOutside`, `interactOutside`), dahili özniteliklerini değil.
- İkonlar: `@phosphor-icons/vue` (regular).
- Stil: paketle birlikte derlenmiş CSS + `--dt-*` CSS değişkenleri. Ayrıntılar: `02-design-tokens.md`.
- Test: Vitest + @vue/test-utils (birim/bileşen), Playwright (etkileşim: klavye, pano, sanal kaydırma, portallı editörler).
- Paketleme: Vite library mode, ESM + tipler (`unplugin-dts`, vue-tsc tabanlı; giriş başına tek d.ts, `bundleTypes`; yan etkili import’lar d.ts’e girmez), `vue` ve `reka-ui` peer dependency; `./sheet` ayrı giriş noktası.

## Kurallar

- **Renk, ölçü, gölge, yarıçap için asla sabit değer yazma.** Her zaman `--dt-*` token'larını kullan. Yeni bir değer gerekiyorsa önce `02-design-tokens.md`'ye ekle.
- Sayılar ve tutarlar `font-variant-numeric: tabular-nums`. ID ve kodlar `--dt-font-mono`. Biçimlendiriciler (`Intl.*`) önbelleklenir, hücre başına oluşturulmaz.
- **Paket veri çekmez, kaydetmez (D18).** HTTP, önbellek, otomatik yeniden deneme, chunk gönderimi ve iş mantığı uygulamadadır. Paket yalnızca `@request` / `@save` yayar ve `rows` / `applyResult()` alır.
- Spesifikasyonda olmayan özellik ekleme. Özellikle **reddedilmiş** olanları ekleme: AND/OR filtre builder, mobilde kart görünümü, satırın tamamının link olması, bulk edit'te sunucudan silme, Vue slot ile hücre özelleştirme (D21), sürükle-bırak (D22), numbered/load-more/infinite sayfalama (D7), all-matching seçim (D19), `syncUrl` (D25), uzaktan metin önerisi (D3), toolbar'da facet çipi (D26), filtre satırında görünüm kaydetme üçlüsü (D27), önizleme (peek) paneli (D28), `tags` sütun tipi (D37).
- Hücre içindeki etkileşimli öğeler için geliştirici `stopPropagation` yazmaz; paket tek bir guard ile satır tıklaması, seçim ve düzenleme başlatmayı ayırır (05 §7, 07 §5).
- Karar günlüğündeki bir karar uygulamada sorun çıkarırsa, değiştirmeden önce sor.
- Erişilebilirlik spesifikasyonun parçasıdır, sonradan eklenmez: `08-accessibility-keyboard.md`.
- Tüm kullanıcıya görünen metinler i18n anahtarından gelir (`09-i18n.md`); bileşenlerde düz metin yok.
- Açık bir soru varsa tek bir soru sor, cevabı bekle, sonra devam et.

## Bitti tanımı (her aşama)

- Kabul kriterlerinin hepsi sağlandı ve testleri var.
- Light ve dark temada, üç yoğunlukta (Comfortable / Standard / Compact) görsel olarak tasarım referansıyla (DESIGN-BRIEF ve `design/` altındaki tasarımlar) eşleşiyor.
- Klavye ile baştan sona kullanılabiliyor; ekran okuyucu etiketleri yerinde.
- Playground'da (`playground/`) ilgili senaryo sayfası var.
- `vue-tsc --noEmit`, ESLint import sınırları ve testler temiz.
