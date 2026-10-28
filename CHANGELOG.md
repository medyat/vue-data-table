# Sürüm notları

## Yayımlanmamış

### DataTable

- **Satır klavyesi kaldırıldı (D40).** Satır odağı ve çerçevesi, satır okları, satırda `↵` / `→` / `←` / `X` / `⇧↑↓` / `⌘A` / `⇧F10` ve başlıklar arası ok gezinmesi yok. Satırdaki widget'lar ve başlık düğmeleri doğal Tab sırasında; kök `role="table"`, hücreler `cell`, satırda `aria-selected` yok. Sayfa kısayolları ve başlık düğmesindeki sıralama/menü/genişlik/taşıma tuşları değişmedi. DataSheet etkilenmez.
- Toolbar sırası spesifikasyona döndü: görünüm · arama · Filter solda, Display · ⋯ · birincil aksiyon sağda.
- Odak seçim checkbox'ındayken `Esc` seçimi temizler ve tek harfli kısayollar çalışır.

## 1.0.0 — 2026-10-28

İlk sürüm: Faz 0–7 (`docs/data-table/10-roadmap.md`).

### DataTable

- 23 hücre tipi, sanal satırlar, sabit sütunlar, sütun menüsü (sırala, filtrele, sabitle, sığdır, taşı, gizle), yoğunluk ve dikey çizgiler (tercih adapter'ı).
- Sunucu ve istemci modu; `@request` / `@count`; durumlar (ilk yükleme, sorgu değişimi, yenileme, hata, stale, boş).
- Filtre çipleri (operatör + tipe göre editör, hazır tarih aralıkları), toolbar araması, sistem ve kişisel görünümler (`viewsAdapter`), Display.
- Seçim (sayfa kapsamlı), bulk bar, satır menüsü, satır detayı (expand), `row-click` / `row-open`.
- Sütun açıklaması (`description`: header tooltip'inde ikinci satır, Columns panelinde alt satır, `aria-describedby`). Satır aksiyonunda `when(row)` menüden gizler, `disabled(row)` gerekçesiyle pasifleştirir; `RowAction.inline` ⋯'nın solunda en fazla 2 ikon düğmesi; `RowAction` / `BulkAction.description` menüde ikinci satır, `BulkAction.when(rows)`. Uygulamanın satır hatası `rowError(row)` ile: kırmızı zemin, ⋯ hücresinde uyarı ikonu, satır tooltip'i.
- Telefon düzeni (kart < 640 px): birincil sütun sola sabit, 48 px satır ve seçim sütunu, 44 px dokunma hedefleri, sağ kenar solması; toolbar (görünüm · arama modu · Filter sayaçlı · ⋯); çip satırı tek düğme; alt sayfalar — Filters (taslak + Show results, değer editörü ve sütun seçici alt seviyeler, Sort), görünümler, ⋯ (Density/Columns/Sort/Export/…), bulk bar More; footer yalnızca Önceki / Sonraki.

### DataSheet (`@medyat/vue-data-table/sheet`)

- Hücre odaklı klavye, yerinde editörler (metin, sayı/para, seçenek combobox, tarih), doğrulama (tip → required → validate → warn, çapraz kural), formül çubuğu, status bar.
- Pano (TSV + HTML, yerel ayar çıkarımı), fill handle ve ⌘D, 100 adımlık geri al/yinele, Find in grid, seçim özeti.
- Satır partisi (Add row / Insert / Remove from list), `lookupKeys` ile New / Update, anahtar tekilliği, yerel sıralama, All / Changed / Errors.
- `optionEnabled(option, row)` ile satıra göre seçenek kapatma: kapalı seçenek editörde gizlenir, yapıştırma veya doldurmayla gelirse yalnızca değişen hücrede hata verir.
- Kayıt akışı: hata dialog'u, `@save`, `saving` ilerlemesi, `applyResult`, Partly saved şeridi, Copy errors, ayrılma koruması.
- Excel/CSV içe aktarma (`parseFile`; başlık satırı tespiti, otomatik eşleme, önizleme, yeni anahtarlar; `parseFile` hata fırlatırsa sebep dialog'da görünür), Export olayı, telefonda salt okunur.

### Erişilebilirlik

- ARIA ızgara rolleri, iki roving tabindex modeli, `aria-live` duyuruları, hata balonları `aria-describedby`, `forced-colors` ve `prefers-reduced-motion`, axe-core taraması (WCAG 2.1 AA, kritik/ciddi ihlal yok).

### Bilinen sınırlar

- Telefonda satır ⋯ menüsü ve sütun başlığı menüsü alt sayfa değil, açılır menü olarak kalır; Filters alt sayfasındaki Sort tek kuraldır (ikincil kurallar Show results'ta düşer); kişi listesindeki Me satırında gerçek ad gösterilmez. NVDA/VoiceOver turu elle yapılmadı.
- Sheet'te `ajax`/`user` hücreleri yalnızca özel editörle düzenlenir, `multiselect` yerleşik editörle (T11); `Alt↓` seçici açma yok. `tags` sütun tipi yoktur (D37); sabit seçenekli çoklu değer `multiselect`'tir.
