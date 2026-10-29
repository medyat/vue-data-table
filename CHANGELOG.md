# Sürüm notları

## Yayımlanmamış

### İçe ve dışa aktarma (D46)

- **Excel ve CSV paketin içinde.** `@export` dinlenmezse DataTable ve DataSheet dosyayı kendisi yazar; DataSheet `parseFile` verilmezse .xlsx / .csv'yi kendisi okur. Yeni zorunlu peer'ler: `read-excel-file` (^9.3.13) ve `write-excel-file` (^4.1.1); ilk Import/Export'ta yüklenir. **Geçiş:** `pnpm add read-excel-file write-excel-file`; mevcut `@export` / `parseFile` kodu aynen çalışır (override), istenirse silinebilir.
- DataTable Export ekranda görüneni yazar: seçim varsa seçili satırlar, yoksa sayfadaki satırlar. Menü etiketi “Export matching rows” → “Export 100 rows” (`toolbar.export` artık `.one` / `.other`). `export` olayına `rows` eklendi.
- Export menüsü artık dinleyici olmadan da görünür; `:exportable="false"` gizler. DataSheet'te Import da varsayılan açık, `:importable="false"` gizler.
- .xlsx: yazı 16 pt; başlık kalın, dolgulu, dondurulmuş; sayı, para, yüzde ve tarih tipli hücre; `select` ve `boolean` sütunlarının seçenekleri ikinci sayfada (“Options”), hücreler o listeden açılır liste.
- Eski ikili `.xls` yerleşik okuyucuda desteklenmez (`import.xlsxOnly`); `import.drop` metninden `.xls` çıktı.

### DataSheet

- `required` sütunlar gizlenemez: Columns dialog'unda kilitli, görünümde gizli kayıtlı olsa da görünür.

### DataTable

- **Satır klavyesi kaldırıldı (D40).** Satır odağı ve çerçevesi, satır okları, satırda `↵` / `→` / `←` / `X` / `⇧↑↓` / `⌘A` / `⇧F10` ve başlıklar arası ok gezinmesi yok. Satırdaki widget'lar ve başlık düğmeleri doğal Tab sırasında; kök `role="table"`, hücreler `cell`, satırda `aria-selected` yok. Sayfa kısayolları ve başlık düğmesindeki sıralama/menü/genişlik/taşıma tuşları değişmedi. DataSheet etkilenmez.
- Toolbar sırası spesifikasyona döndü: görünüm · arama · Filter solda, Display · ⋯ · birincil aksiyon sağda.
- Odak seçim checkbox'ındayken `Esc` seçimi temizler ve tek harfli kısayollar çalışır.
- Filtre için alan seçilince (column picker, header menüsü › Filter by this column…, mevcut çip) odak doğrudan editörün ilk alanına gelir; önceden picker/menü odağı tetikleyicisine geri alıyor ya da operatör düğmesine düşüyordu.
- Popover içeriği kenarlara eşit uzaklıkta: column picker, görünüm menüsü ve Columns panelindeki arama kutuları ile filtre editörü gövdesi her yönde `--dt-pop-pad` (önceden üstte 4, yanlarda 8 px).
- Sütun sürüklenerek minimum genişliğin (80 px) altına inemez; önceden sürüklerken daralıp ilk tıklamada 80'e sıçrıyordu. Görünüme kaydedilen ve görünümden okunan genişlik de sütunun min–max aralığına kırpılır.
- **İçeriğe sığdırma kaldırıldı (D42).** Resize tutamacında çift tık ve sütun menüsündeki Fit to content yok; genişlik sürükleyerek ayarlanır. `header.fit` i18n anahtarı kaldırıldı.
- Display düğmesi her genişlikte yalnızca ikon (DataTable ve DataSheet); adı tooltip'te ve `aria-label`'da.
- **Toolbar grupları (D43).** Görünüm seçici başında ikon kutusuyla ghost (select kutusu görünümü geri alındı); arama + Filter grubu toolbar'ın tam ortasında; arama + Filter ve Display + ⋯ birleşik düğme grubu. Telefon düzeni değişmedi.
- Kaydırma hapı (Rows 41–56) kaydırma alanının köşesinden sağdan ve alttan eşit uzaklıkta; görünür kaydırma çubukları (Windows, macOS "her zaman göster") hesaba katılır; yazı dikeyde ortalı.
- Satıra sağ tık artık satır ⋯ menüsünü açmaz; tarayıcının kendi menüsü açılır.
- Header (D44): filtre işareti etiketin solunda; ⋯ her sütunda sağ uçta ve yalnızca hover, klavye odağı veya menü açıkken yer kaplar (önceden hep yer ayırıyordu; sayısal sütunlarda en soldaydı). Dokunmatikte hep görünür.
- **Ölçek büyüdü ve token'a bağlandı (D41).** Arayüz yazısı 13 → 14 px, ikonlar 16 → 18, kontroller 32 → 36, aralıklar 8 → 10, popover dolgusu 4 → 6; Comfortable satırı 52 → 56, Standard 40 → 44 (hücre yazısı 13 → 14). Toolbar, filtre satırı ve footer dolgusu dört yönde eşit. Varsayılan sütun genişlikleri hücre yazısıyla orantılı büyür. Yeni token'lar: `--dt-ui-fs`, `--dt-icon`, `--dt-control-h`, `--dt-checkbox`, `--dt-space`, `--dt-pop-pad`, `--dt-item-x` ve türevleri (02 · Ölçek); uygulama bunları ezerek paketi büyütüp küçültebilir. DataSheet'in ortak parçaları (buton, menü, popover, dialog) da büyür; Compact satır yoğunluğu değişmez.

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
