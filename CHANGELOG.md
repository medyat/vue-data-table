# Sürüm notları

## Yayınlanmadı (1.0 adayı) — 2026-10-22

İlk sürüm: Faz 0–7 (`docs/data-table/10-roadmap.md`).

### DataTable

- 24 hücre tipi, sanal satırlar, sabit sütunlar, sütun menüsü (sırala, filtrele, sabitle, sığdır, taşı, gizle), yoğunluk ve dikey çizgiler (tercih adapter'ı).
- Sunucu ve istemci modu; `@request` / `@count`; durumlar (ilk yükleme, sorgu değişimi, yenileme, hata, stale, boş).
- Filtre çipleri (operatör + tipe göre editör, hazır tarih aralıkları), toolbar araması, sistem ve kişisel görünümler (`viewsAdapter`), Display.
- Seçim (sayfa kapsamlı), bulk bar, satır menüsü, satır detayı (expand), `row-click` / `row-open`.

### DataSheet (`@swors/data-table/sheet`)

- Hücre odaklı klavye, yerinde editörler (metin, sayı/para, seçenek combobox, tarih), doğrulama (tip → required → validate → warn, çapraz kural), formül çubuğu, status bar.
- Pano (TSV + HTML, yerel ayar çıkarımı), fill handle ve ⌘D, 100 adımlık geri al/yinele, Find in grid, seçim özeti.
- Satır partisi (Add row / Insert / Remove from list), `lookupKeys` ile New / Update, anahtar tekilliği, yerel sıralama, All / Changed / Errors.
- Kayıt akışı: hata dialog'u, `@save`, `saving` ilerlemesi, `applyResult`, Partly saved şeridi, Copy errors, ayrılma koruması.
- Excel/CSV içe aktarma (`parseFile`; başlık satırı tespiti, otomatik eşleme, önizleme, yeni anahtarlar), Export olayı, telefonda salt okunur.

### Erişilebilirlik

- ARIA ızgara rolleri, iki roving tabindex modeli, `aria-live` duyuruları, hata balonları `aria-describedby`, `forced-colors` ve `prefers-reduced-motion`, axe-core taraması (WCAG 2.1 AA, kritik/ciddi ihlal yok).

### Bilinen sınırlar

- DataTable telefon düzeni (alt sayfalar, Filters sheet) kısmi; NVDA/VoiceOver turu elle yapılmadı.
- Sheet'te `multiselect`/`tags`/`ajax`/`user` hücreleri yalnızca özel editörle düzenlenir; `Alt↓` seçici açma yok.
