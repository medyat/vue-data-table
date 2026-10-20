# 04 · Filtreler, arama, sıralama ve görünümler

Tasarım referansı: `DESIGN-BRIEF.md` §6.4–6.10 ve görev paketleri T2, T3.

Bu doküman DataTable'ı anlatır. DataSheet'teki farklar en altta.

---

## 1. Filtre modeli

```ts
// op'a göre ayrışan union; tam tanım api-draft.ts
type FilterCondition = { column: string; op: FilterOp; value?: …; currency?: string }
type TableQuery = { search: string; filters: FilterCondition[]; sort: SortRule[]; page: { number: number; size: number }; columns: string[]; fields: string[] }
```

- Filtre = **sütun + operatör + değer.** Çipler her zaman birlikte uygulanır (AND). Grup, OR, iç içe koşul yok (**D1**).
- **Her sütun için en fazla bir çip** (**D2**). `filters` dizisinde bir `column` tekrar edemez. Aralıklar (`between`, `within`) tek çipte.
- Sıra = oluşturulma sırası. Görünümden gelen çipler önce, yeni eklenen çip sona.
- **Eksik çip** (değeri henüz seçilmemiş) ekranda görünür ama sorguya **girmez**. Popover değer seçilmeden kapanırsa çip kaldırılır.
- Operatör anahtarları ve tiplere göre etiketleri: [03 · Operatör anahtarları](03-column-types.md#operatör-anahtarları).

### Değer biçimleri

| Operatör | `value` | Örnek |
|---|---|---|
| `eq`, `neq` | `string \| number \| boolean` | `{ column: 'urgent', op: 'eq', value: true }` |
| `gt` `gte` `lt` `lte` | `number`; `currency` sütununda para birimi ayrı `currency` alanında (çipteki ikinci parça) | `{ op: 'gt', value: 100000, currency: 'TRY' }` |
| `between` | `[min, max]`, uçlar dahil; biri `null` olabilir | `[100000, 250000]` |
| `contains` … `ends_with` | `string` (büyük/küçük harf duyarsız) | `'HC-'` |
| `in`, `not_in` | `Array<string \| number>` (`user` için `'@me'` olabilir). Çok değerli hücrelerde (`multiselect`, `tags`) “şunlardan birini içerir / hiçbirini içermez” | `['in_progress', 'released']` |
| `before`, `after` | ISO tarih veya `{ preset: 'today' }` | `{ preset: 'today' }` |
| `within` | `{ preset: DatePreset }` veya `{ from, to }` (ISO, uçlar dahil) | `{ preset: 'last_30_days' }` |
| `is_empty`, `is_not_empty` | yok | — |

`DatePreset`: `today, this_week, next_7_days, this_month, last_30_days, this_quarter, overdue`. Hazır değerler **sunucuda** çözülür (kullanıcının saat dilimiyle, `X-Timezone` başlığı veya sorgu alanı), böylece kaydedilmiş görünümler zamanla kayar. `overdue` = bugünden önce.

### Laravel tarafı eşlemesi (öneri)

| `op` | Eloquent |
|---|---|
| `eq` / `neq` | `where($col, $v)` / `where($col, '!=', $v)` |
| `gt` … `lte` | `where($col, '>', $v)` … |
| `between` | `whereBetween($col, [$min, $max])` (bir uç `null` ise tek taraflı `where`) |
| `contains` / `not_contains` | `where($col, 'ilike', "%$v%")` (MySQL: `like` + uygun collation) — `%` ve `_` kaçışlanır |
| `starts_with` / `ends_with` | `like "$v%"` / `like "%$v"` |
| `in` / `not_in` | `whereIn` / `whereNotIn` (`'@me'` → `auth()->id()`); çok değerli sütunda JSON: `whereJsonContains`, pivot: `whereHas` / `whereDoesntHave` |
| `before` / `after` / `within` | preset → `[from, to]` çözümü, sonra `where` / `whereBetween` |
| `is_empty` / `is_not_empty` | `whereNull` (+ metinse `orWhere($col, '')`) / tersi |

Sunucu, `columns` listesinde `filterable` olmayan bir sütun veya tipine uymayan bir operatör gelirse **422** döner; paket bunu Error durumunda gösterir (05).

---

## 2. Filtreye giriş noktaları

| Nereden | Ne olur |
|---|---|
| Toolbar **Filter** butonu (kısayol `F`) | Column picker açılır. Butondaki sayaç = **uygulanmış** çip sayısı (eksikler sayılmaz). |
| Filtre satırında **Add filter** | Aynı column picker, butonun altında. |
| Header menüsü › **Filter by this column…** | O sütunun çipini açar (yoksa oluşturur). |
| Header'daki filtre işareti (filtrelenmiş sütun) | O sütunun çipini açar. |
| No results durumu › **Remove “Due date”** | Önerilen çipi kaldırır (05 · Durumlar). |

### Column picker

- Üstte arama kutusu (otomatik odak). Liste üç bölüm:
  1. **Filtered** — “opens its chip”: zaten filtrelenen sütunlar, sağda mevcut değer özeti. Seçince **yeni çip açılmaz**, var olan çipin değer popover'ı açılır (D2).
  2. **Suggested** — sütun tanımındaki `suggested: true` olanlar (en fazla 4).
  3. **All columns** — kalanlar, sütun sırasında; sağda soluk tip etiketi (Date, Relation, Currency, Text, Yes / No…).
- `filterable: false` olan sütunlar listede yok.
- Bir sütun seçilince: çip oluşur, tipin varsayılan operatörüyle, **değer popover'ı hemen açılır**.

| Tip | Varsayılan operatör |
|---|---|
| sayı tipleri, `currency` | `between` |
| metin tipleri | `contains` |
| `id` | `in` |
| `select`, `ajax`, `user`, `color` | `in` |
| `multiselect`, `tags` | `in` |
| `date`, `datetime` | `within` |
| `boolean` | `eq` + `true` — popover açılmaz, çip doğrudan “is Yes” olarak uygulanır |
| `star` | `gte` |

---

## 3. Çip

### Anatomi

`[ikon] Alan · operatör · değer │ × ` — **iki tıklama hedefi**: gövde ve kaldırma.

| Parça | Tıklayınca |
|---|---|
| Gövde | Değer popover'ı: üstte operatör seçici (her tipte, Include/Exclude ayrımı yok), altında tipin değer editörü. `boolean` için popover yok: tıklama Yes ↔ No değiştirir. Sütun değiştirme yoktur; başka sütun için yeni çip açılır. |
| × | Çipi kaldırır, sorgu hemen yenilenir. Odak sonraki çipe, yoksa Add filter'a geçer. |

Ölçüler: yükseklik 28 px, yarıçap `--dt-radius-md`, kenar `--dt-line-2`, parçalar arası 1 px `--dt-line`, parça dolgusu 0 × 8 (× için 0 × 6), yazı 12.5 px. Alan `--dt-text-2`, operatör `--dt-text-3`, değer 500 ağırlık `--dt-text`.

### Durumlar

| Durum | Görünüm |
|---|---|
| Applied | Varsayılan |
| Hover (parça) | Parça arka planı `--dt-surface-3` |
| Editing | Popover açıkken kenar `--dt-accent` + 3 px `--dt-focus-soft` halka |
| Incomplete | Değer yerinde soluk “Select…” (400 ağırlık, `--dt-text-3`); sorguya girmez, sayaca girmez |
| Odak (klavye) | Parça üzerinde standart odak halkası |

### Değer popover'ı

- Üst: **operatör seçici** (`Order value [is between ▾]`) her tipte; seçenek tiplerinde ayrıca arama kutusu (“Search statuses”, “Search people”).
- Gövde tipe göre: seçenek listesi (checkbox + rozet, hover'da sağda **Only** = yalnızca bunu seç), takvim + hazır aralıklar (520 px), iki sayı alanı + “and” + para birimi segmented (`currency` sütunu), metin alanı (uzaktan öneri yok, D3), kişi listesi (**Me · {ad}** en üstte, ardından **Unassigned**, ayırıcı, diğerleri).
- Alt bilgi: solda durum (“2 selected”, “Bounds included”, “Presets stay relative…”), sağda **Clear** — değeri siler, çip açık ve eksik kalır.

### Uygulama zamanı

- Seçenek listeleri (`in`, `not_in`): her işaretleme **anında** uygulanır, popover açık kalır.
- Metin ve sayı girişleri: yazmayı bıraktıktan **250 ms** sonra ve Enter'da. Enter popover'ı kapatır.
- Tarih: hazır aralık tıklanınca uygulanır ve popover kapanır; özel aralıkta ikinci uç seçilince.
- Operatör değişimi: değer yalnızca **aynı şekil grubunda** korunur (`in` ↔ `not_in`; metin operatörleri arasında; `gt`/`gte`/`lt`/`lte` arasında; `before` ↔ `after`). Şekil değişiyorsa (`between` ↔ tek değer, `within` ↔ `before`) değer silinir ve çip eksik duruma düşer. `is_empty` / `is_not_empty` seçilince değer silinir, anında uygulanır, değer parçası gizlenir.
- `Esc` popover'ı kapatır, **değeri geri almaz** (değişiklikler zaten uygulanmıştır).
- Her filtre değişikliğinde: sayfa başa döner, gövde en üste kayar, **seçim temizlenir** (D19).

### Değer özeti (çipin içinde)

Çip satırı kaymadan **önce değer kısalır**:

| Durum | Gösterim |
|---|---|
| Uzun tek değer | En fazla 180 px, `…`, tam metin tooltip'te |
| 1 değer | Değerin kendisi; operatör etiketi tekil (“is”, “is not”) |
| 2 değer | Virgülle listelenir: `In progress, Released` |
| 3+ değer | Sayılır: `3 statuses`, `3 work centers` (sütunun `filterNoun` çoğulu; yoksa `3 values`); isimler tooltip'te |
| Kişiler | En fazla 3 avatar yığını + `3 people`; tek kişi: avatar + isim veya `Me` |
| Sayı aralığı | Kısa gösterim: `100K – 250K TRY` (`Intl.NumberFormat` `notation: 'compact'`) |
| Tek uçlu aralık | `≥ 100K` / `≤ 250K` |
| Tarih aralığı | Aynı ay: `Oct 12 – 24`; farklı ay: `Sep 28 – Oct 4`; hazır: `Last 30 days` |
| Boolean | `Yes` / `No` |

---

## 4. Filtre satırı

- **Yalnızca en az bir çip varken** görünür. Toolbar ile tablo arasında; padding 8 × 12, çip aralığı 6.
- Sıra: çipler → **Add filter** (ghost, `+` ikonu) → sağa yaslı aksiyonlar.
- Sağdaki aksiyonlar:
  - **Clear all** — tüm çipleri kaldırır. Her zaman (çip varken).
  - **View edited · Reset · Save view** — yalnızca aktif görünüm düzenlenmişse (§7). `views` ve `viewsAdapter` ikisi de yoksa bu üçlü hiç yok. Yalnızca `views` (system) varsa (kaydetme yok): **View edited · Reset** görünür, Save view görünmez.
- Sağdaki aksiyon grubu **ilk satırın sağ üstüne sabittir**, çipler sarılsa da yer değiştirmez.

### Taşma

| Durum | Davranış |
|---|---|
| Tek satıra sığıyor | Normal |
| 2 satıra kadar | Çipler alt satıra sarılır |
| 2 satırdan fazla | İkinci satırın sonunda **`+N more`** ve Add filter kalır; sığmayan çipler `+N`'e taşınır |
| `+N more` tıklanınca | Popover: “N more filters”, her gizli çip bir satır (`Alan · operatör · değer`, sağda hover'da `×` ile kaldırma), satıra tıklayınca o çipin editörü açılır. Altta **Show all filters** → satır sınırı kalkar, `+N`'in yerinde **Show fewer** belirir. Sınırsız durum filtreler değişene kadar sürer. |
| Düzenlenen / yeni eklenen çip | Her zaman görünür: gerekiyorsa son görünür çip `+N`'e itilir |
| Telefon (< 640 px) | Tek satır, yatay kayar, sağ kenarda solma (fade). Sarma ve `+N` yok. Çip 32 px, iki parça: **alan + değer** (operatör gösterilmez; tam ifade alt sayfada). Uygulanmış çiplerden sonra `suggested` sütunlar için `Owner · Any` biçiminde boş çipler. Çipe dokunmak **Filters** alt sayfasını açar (§9). |

Ölçüm `ResizeObserver` ile yapılır; çip genişlikleri değer özeti uygulandıktan sonra hesaplanır. Ölçüm her yeniden boyutlanmada ve çip değişiminde, bir animasyon karesinde bir kez.

---

## 5. Arama

- Toolbar'da, `/` ile odaklanır. Placeholder: `searchPlaceholder` prop'u, yoksa `toolbar.search` (“Search {entity.other}…”, 09). “Search orders, products, customers” gibi özel bir metin uygulamanın tercihidir.
- **Filtre değildir** (**D3**): çip üretmez, filtre sayacına girmez, görünüme kaydedilmez, görünümü “edited” yapmaz. Uzaktan öneri (suggest) altyapısı yoktur.
- `searchable: true` sütunlarda arar. Varsayılan: `string`, `text`, `id`, `uppercase`, `lowercase`, `email`, `phone`.
- 250 ms debounce; sunucu modunda önceki talep abort edilir, istemci modunda `globalFilterFn` ile yerelde. `Esc`: önce metni temizler, ikinci `Esc` odaktan çıkar.
- Sonuç yoksa No results durumu aramayı da sayar: “No orders match “hc-99” and 2 filters”.

---

## 6. Sıralama

| Etkileşim | Sonuç |
|---|---|
| Header tıklama | asc → desc → kapalı döngüsü; diğer sıralamalar kalkar |
| ⇧ + header tıklama | İkincil sıralama ekler / yönünü değiştirir / kaldırır; header'da öncelik rozetleri `1`, `2`, `3` (en fazla 3 sütun; dördüncü eklenince en eski düşer) |
| Header menüsü | Sort ascending / Sort descending / Clear sort |
| Display › Sort | Aktif sıralamaların listesi: yön çevirme, × ile kaldırma. Sürükleme yok (D22); öncelik değiştirmek = kaldırıp yeniden eklemek |

- `sortable: false` sütunun header'ı tıklanınca bir şey olmaz, ok göstermez. `object` ve `array` sıralanamaz.
- `aria-sort` yalnızca birincil sıralama sütununda (ARIA 1.2); ikincil sütunların rozeti `aria-label` ile okunur.
- İstemci modunda sıralama TanStack `createSortedRowModel` ile, tipe göre `sortFn`: metin `Intl.Collator(locale, { numeric: true })`, sayı sayısal, tarih zaman damgası. Boş değerler (`null`/`undefined`) “en büyük” sayılır: artan sırada sonda, azalan sırada başta — PostgreSQL varsayılanıyla aynı. Sunucu modunda `sort` sorguya gider.
- Sıralama görünümün parçasıdır (D5) ve değiştiğinde görünüm “edited” olur.
- Sunucuya `sort: [{ column, dir }]` öncelik sırasıyla gider. Kararlı sıralama için sunucu sona `rowKey` ekler.
- Belge modunda sıralama yoktur (**D15**). Sheet modunda sıralama satırları yerel olarak dizer; değişiklikler satırıyla birlikte taşınır.

---

## 7. Görünümler

### Tek tip, üç tür (D4)

```ts
interface View { id; name; kind: 'system' | 'personal' | 'shared'; state: ViewPatch; readonly?; default?; updatedAt?; v? }
```

| | `system` | `personal` | `shared` |
|---|---|---|---|
| Kim tanımlar | Ürün ekibi, ekranla birlikte kodda (`views` prop'u) | Kullanıcı | Kullanıcı; yalnızca `viewsAdapter.capabilities.share` destekliyorsa |
| Kim görür | Herkes | Yalnızca sahibi | Ekip (adapter belirler); yazma yetkisi yoksa `readonly` |
| İzin verilen | Duplicate, Set as default | Save changes, Rename, Duplicate, Set as default, Delete | Aynı (readonly ise yalnızca Duplicate, Set as default) |
| Yasak | Rename, üzerine yazma, silme | — | — |
| Sıralama | Kodda verilen sıra | Ada göre (yerel ayar karşılaştırması) | Ada göre |
| Saklama | Kod | `viewsAdapter` | `viewsAdapter` |

`viewsAdapter` yoksa yalnızca `views` prop'undaki görünümler vardır ve tüm kaydetme aksiyonları gizlenir. Hazır adapter: `createLocalStorageViews({ scope })` (tarayıcıda, `scope` zorunlu).

### Görünümün içeriği (**D5**)

```ts
interface ViewState {                       // kaydedilen tam snapshot
  filters: FilterCondition[]
  sort: SortRule[]
  columns: { order: string[]; visible: string[]; widths: Record<string, number>; pinned: { left: string[]; right: string[] } }
}
interface ViewPatch { filters?; sort?; columns?: Partial<ColumnLayout> }   // system view tanımı ve adapter kayıtları; eksikler tablonun varsayılanıyla tamamlanır
```

Yoğunluk, tema, dikey ızgara çizgileri, arama metni, sayfa ve sayfa başına satır görünüme **yazılmaz**.

Örnek:

```json
{
  "id": "v_8f2c",
  "name": "Gebze plant",
  "kind": "personal",
  "state": {
    "filters": [
      { "column": "plant", "op": "in", "value": ["gebze"] },
      { "column": "created_at", "op": "within", "value": { "preset": "last_30_days" } },
      { "column": "owner_id", "op": "in", "value": ["@me"] }
    ],
    "sort": [{ "column": "due_date", "dir": "asc" }],
    "columns": {
      "order": ["number", "product", "customer", "status", "produced", "owner_id", "due_date", "value"],
      "visible": ["number", "product", "customer", "status", "produced", "owner_id", "due_date", "value"],
      "widths": { "product": 260 },
      "pinned": { "left": ["number"], "right": [] }
    }
  },
  "updatedAt": "2026-10-14T09:42:00Z"
}
```

Sütun kimlikleri sabit tutulmalı. Kayıtlı bir görünümde artık var olmayan sütun **sessizce atlanır**. `columns.visible` tanımlıysa beyaz listedir: tanımlara sonradan eklenen sütun görünümde yoksa **gizli** olarak sona eklenir; `visible` tanımsızsa ColumnDef varsayılanları geçerlidir. Görünüm uygulaması tek adımda (`batch()`) yapılır ve tek talep üretir.

### Görünüm menüsü (kısayol `V`)

- Tetik: toolbar'ın en solunda görünüm adı (600 ağırlık) + düzenlenmişse `--dt-accent` 6 px nokta. Hiç görünüm yoksa (ne `views` ne adapter) tetik görünmez.
- Popover 300–330 px: üstte **Find a view…** araması; **System views** (`Built in`), **My views** (`Only you`) ve varsa **Shared views** (`Team`) bölümleri; aktif görünüm kalın; varsayılan görünümün sağında soluk `Default`; düzenlenmiş olanın sağında nokta + `Edited`.
- Satır menüsü `⋯` → Rename · Duplicate · Set as default · ayırıcı · Delete (türün izin verdiği kadarı).
- Altta **New view** (mevcut durumla Save as new view dialog'unu açar).
- **Manage views** ekranı ve görünüm sekmeleri v1'de yoktur.

### Düzenlenmiş durum

- Görünüm, mevcut `ViewState` kayıtlı `state`'ten farklıysa **edited** olur. Karşılaştırma normalize edilmiş durum üzerinden: eksik çipler hariç, `in` değerleri sırasız, sütun genişliklerinde ±2 px tolerans.
- Göstergeler: görünüm adının yanında nokta, filtre satırında **View edited · Reset · Save view**.
  - Filtre yoksa ama sıralama/sütun değiştiyse filtre satırı yine görünür, yalnızca bu üçlüyle.
- **Reset** → kayıtlı duruma döner (filtre + sıralama + sütunlar).
- **Save view** (personal/shared) → menü: **Save changes** (`⌘S`) · **Save as new view…** · **Discard changes** (= Reset).
- **System view** düzenlenmişse üzerine yazılamaz: etiket ““Late orders” edited”, buton doğrudan **Save as my view…**.
- Kaydedilmemiş değişiklik **bellekte, oturum boyu, görünüm başına** tutulur: başka görünüme geçip dönünce düzenleme yerinde durur; toast yok, otomatik atma yok. Sayfa yenilenince gider (kalıcı çalışma kopyası yoktur).

### Save as new view dialog

- 460 px. Başlık “Save as new view”, alt metin “It appears under My views. Only you can see it.”
- **Name** — boş açılır, otomatik odak; Duplicate'ten açıldıysa “{ad} copy” dolu ve seçili gelir. Zorunlu, en fazla 60 karakter, aynı türde benzersiz (büyük/küçük harf duyarsız). Hata metni alanın altında.
- Özet (salt okunur): Filters `Plant · Created · Owner` · Sort `Due date ↑` · Columns `8 of 14 · Order pinned`.
- **Make this my default view** checkbox; adapter `share` destekliyorsa **Share with my team** checkbox (alt metin “Team” olur).
- Cancel / **Save view** (birincil, mürekkep). Enter kaydeder. Kayıt sonrası yeni görünüm aktif olur.

### Varsayılan görünüm

Ekran açılırken görünüm seçimi sırası:

1. Kullanıcının **Set as default** ile seçtiği görünüm (`preferences.defaultViewId`; system, personal veya shared).
2. `views` içinde `default: true` olan system view.
3. İlk system view; hiç görünüm yoksa tablonun varsayılan durumu.

Varsayılan görünüm tercihtir (D5): `preferences` adapter'ı yoksa oturumluktur.

### Silme

- Onay dialog'u: “Delete “{name}”?” · Cancel · **Delete** (kırmızı). Onaylanınca `viewsAdapter.remove` hemen çağrılır; Undo yoktur.
- Aktif görünüm silinirse varsayılan görünüme geçilir. Varsayılan olan silinirse varsayılan system default'a döner.

### Sütun düzeni ve görünüm

Sütun gizleme/gösterme, sıra (menü ve klavye; D22), genişlik ve sabitleme görünümü düzenler. Ayrıntılar 05 · Sütun yönetimi.

---

## 8. Ekran tercihleri (görünüm değil)

| Tercih | Varsayılan | Saklama |
|---|---|---|
| Yoğunluk | DataTable: Standard, DocumentTable: Comfortable, DataSheet: Compact | `preferences` adapter, ekran (`tableId`) başına |
| Vertical grid lines | DataTable/DocumentTable: kapalı, DataSheet: açık | aynı |
| Rows per page | 100 | aynı |
| Varsayılan görünüm (`defaultViewId`) | yok | aynı |

`preferences` adapter'ı yoksa (plugin'e verilmemişse) tercihler oturumluktur; arayüz “Saved for you only” notunu göstermez. Hazır adapter: `createLocalStoragePreferences({ scope })`. Display popover'ının altındaki **Reset** bu tercihleri varsayılana döndürür.

---

## 9. Telefonda filtreler (< 640 px)

- Filter butonu ve çipe dokunma **Filters** alt sayfasını (bottom sheet) açar; popover yok.
- Alt sayfa (`--dt-radius-bottom-sheet`, üstte tutamaç): başlık “Filters” + **Clear all**; önce uygulanmış filtreler, sonra uygulanmamış `suggested` sütunlar — her biri 52 px'lik bir satır (`Alan` solda, değer özeti sağda, `›`); uygulanmamış olanlar `Any` yazar; **Add filter**; **Sort** bölümü (aktif sıralama + hızlı seçenekler); altta tam genişlik **Show results**.
- Alt sayfadaki değişiklikler **Show results**'a basınca uygulanır (masaüstündeki anında uygulamadan farklı — her dokunuşta tablo arkada yenilenip dikkat dağıtmasın diye).
- Satıra dokunmak o filtrenin editörünü aynı alt sayfa içinde ikinci seviye olarak açar (geri oku ile döner).

---

## 10. DataSheet'teki farklar

- Filtre çipleri ve arama (`⌘F` = **Find**) aynı bileşenler. Görünüm menüsü ve Save view **yok**.
- **D13:** filtre yalnızca görünümü daraltır; gizlenen satırlardaki düzenlemeler korunur ve Save'de gönderilir. Filtre satırında sabit not: “Filters only change what you see — hidden rows keep their edits.”
- Filtreler **yerelde**, yüklenmiş satırlar üzerinde çalışır (sunucu sorgusu yok); taslak (düzenlenmiş) değerlere göre filtreler (düzenlenmiş değer filtreden çıkarsa satır gizlenmez, görünür kalır ve soluk bir “doesn't match filters” işareti alır — düzenlediğin satırın gözden kaybolmaması için).
- All / Changed / Errors segmented kontrolü filtrelerle birlikte (AND) uygulanır. Ayrıntılar 07.
