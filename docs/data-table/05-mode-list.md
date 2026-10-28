# 05 · DataTable (liste)

Tasarım referansı: `DESIGN-BRIEF.md` §6 ve görev paketleri T1–T7, T9, T13.

## 1. Genel bakış

Bir modülün ana ekranı: siparişler, ürünler, müşteriler, iş emirleri. Kullanıcı burada **bulur** (arama, filtre, görünüm), **tarar** (sanal satırlar, sayfalama), **seçip toplu iş yapar** (bulk bar) ve **kayda iner** (expand, open). Tablo sayfanın tamamını kaplar; yalnızca tablo gövdesi kayar, toolbar ve footer her zaman görünür.

Varsayılanlar: Standard yoğunluk, 100 satır/sayfa, simple pagination (D7), dikey ızgara çizgileri kapalı, `mode: 'client'`, `row-click: 'none'`.

İki veri modu (01): **client** — uygulama tüm satırları verir, filtre/arama/sıralama/sayfalama yerelde, talep yok; **server** — paket `@request` ile sorguyu yayar, uygulama `rows`/`hasMore`/`loading`/`error` ile cevaplar. Arayüz iki modda aynıdır.

## 2. Yerleşim

```
┌ uygulama başlığı (breadcrumb, sayfa başlığı) ──────────────────────┐  uygulamaya ait
├ DataTable kökü: display:flex; flex-direction:column; height:100% ──┤
│  Toolbar            52 px  (padding 10×12, kontroller 32 px)        │
│  FilterBar          44 px / satır, yalnızca filtre varken           │
│  ┌ dt-scroll  flex:1; min-height:0; overflow:auto ───────────────┐  │
│  │  Header (sticky top:0)                     --dt-head-h         │  │
│  │  Rows (sanal)                              --dt-row-h + 1      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  Footer             min 48 px                                        │
└──────────────────────────────────────────────────────────────────────┘
   BulkBar  — yüzer, altta ortalı, alt kenardan 64 px
   ScrollPosition — yüzer, sağdan 22 px, alttan 62 px
```

- **Yükseklik sözleşmesi:** uygulama, DataTable'ın ebeveynine belirli bir yükseklik verir (ör. `height: calc(100dvh - var(--app-header-h))` veya flex çocuğu `min-height: 0`). Paket bunu bulamazsa (yükseklik 0 veya içerikle büyüyorsa) geliştirme modunda konsola uyarı yazar.
- Kart: `--dt-surface`, 1 px `--dt-line`, `--dt-radius-card`, `--dt-shadow-sm`, `overflow: hidden`.
- Sayfa kaymaz; `dt-scroll` `overscroll-behavior: contain`.

## 3. Toolbar

### Yuvalar (`toolbar: 'auto'`)

Sol = bağlam, sağ = görünüm ayarları ve aksiyonlar. **Yalnızca yapılandırılmış yuvalar görünür**; hazır ayar (`minimal/standard/full`) yoktur.

| # | Yuva | Görünme koşulu |
|---|---|---|
| 1 | View switcher | `views` prop'unda veya adapter'da en az bir görünüm varsa (04 §7) |
| 2 | Search | `searchable` sütun varsa. `/`. Çip üretmez (04 §5) |
| 3 | Filter | `filterable` sütun varsa. Sayaç rozeti = uygulanmış çip sayısı. Column picker açar. `F`. Facet çipi yok (D26) |
| 4 | Filter bar | Ayrı satır, yalnızca filtre varken (04 §4) |
| 5 | Display | Kullanılabilir en az bir ayar varsa: yoğunluk, Columns ›, Sort › (sıralama varsa), dikey çizgiler |
| 6 | More `⋯` | Öğe varsa: **Refresh** `R` (sunucu modunda veya `@request` dinleyicisi varsa), **Export** / **Import…** / **Print** (ilgili olay dinleniyorsa), **Auto-refresh** (`autoRefresh` verilmişse) |
| 7 | `#toolbar-end="{ compact }"` | Uygulamanın birincil aksiyonu vb. **En fazla bir** birincil buton; mürekkep (`--dt-ink`), asla accent mavi değil. `compact` daralmada ikon moduna geçmek için |

Sıra: `[1] [2] [3] ……… [5] [6] │ [7]`. 1–3 arası 8 px, 5–6 arası 8 px, 6 ile 7 arasında `vsep` (1×20 px, `--dt-line`). Tazelik bilgisi (“Updated just now ↻”, “Live”) **footer**'dadır (§8).

| `toolbar` | Sonuç |
|---|---|
| `'auto'` (varsayılan) | Yukarıdaki kurallar |
| `'minimal'` | Yalnızca Search (varsa) ve `#toolbar-end` |
| `false` | Toolbar yok (gömülü küçük listeler) |

`selection-bar: 'toolbar'` ise seçim varken toolbar'ın yerini seçim çubuğu alır (§6); varsayılan `'floating'`.

### Daralma sırası

Önce metin ikona, sonra ikincil aksiyonlar `⋯` içine. Ölçüm toolbar'ın kendi genişliğiyle (`ResizeObserver`), viewport ile değil.

| Toolbar genişliği | Değişiklik |
|---|---|
| ≥ 1024 px | Her şey etiketli |
| 640 – 1023 px | Search ve Display yalnızca ikon (search ikonu tıklanınca 240 px'e açılır, odakta kalır) |
| < 640 px | Display `⋯` içine taşınır (menü öğesi; popover `⋯` düğmesine hizalı açılır, alt sayfa biçimi §11); `#toolbar-end` içeriği `compact: true` alır (uygulama butonunu ikona indirir, `aria-label` korunur); Filter yalnızca ikon + sayaç |

### Display popover (300–312 px)

- **Density** — üçlü segmented: Comfortable / Standard / Compact.
- **Columns** › `8 of 14` — drill-in (§5).
- **Sort** › `Due date ↑` — drill-in: aktif sıralamalar (en fazla 3), yön değiştirme, × ile kaldırma. Sürükleme yok (D22).
- **Vertical grid lines** — switch.
- Altta soluk not “Saved for you only” (yalnızca `preferences` adapter'ı varsa) + **Reset** (tercihleri sıfırlar).
- Liste modunda **Wrap long text yoktur** (D8 — sanal satırlar sabit yükseklikte).

### More menüsü (236 px)

- **Export matching rows** › CSV / Excel (.xlsx). Seçim varsa üstte “Export 7 selected rows”. Dışa aktarma uygulamada yapılır: paket `export` olayını (`format`, sorgu, seçili satırlar, görünür sütunlar) yayar, dosyayı uygulama üretir. `cell` içeriği dışa aktarılmaz; tipin biçimlendirmesi kullanılır.
- **Import…** — uygulama olayı.
- **Print**, **Refresh** `R`, **Auto-refresh** (switch; açıkken footer'daki “Updated …” yerine yeşil `live-dot` + “Live”).

## 4. Izgara

### Sütun genişlikleri (varsayılan; `width` ile ezilir)

| Tip | Genişlik |
|---|---|
| Seçim (checkbox) | 40 px, sola sabit |
| Birincil `id` (expand oku dahil) | 136 px, sola sabit |
| Birincil olmayan `id` | 128 px |
| Birincil metin | `minmax(200px, 1.6fr)` |
| `string`, `text` | `minmax(160px, 1.2fr)` |
| `int`, `float`, `percentage`, `star` | 112 px (`percentage` bar: 156) |
| `currency` | 148 px |
| `select` | En uzun seçenek + 40 px, 112–200 arası |
| `multiselect`, `ajax`, `object` | 180 px |
| `user` | 156 px |
| `date` | 132 px · `datetime` 156 px |
| `boolean` | 96 px |
| `phone` 156 · `email` 200 · `url` 180 · `color` 132 · `array` 160 | |
| `uppercase`, `lowercase` | `string` ile aynı |
| `cell` ile çizilen sütun | Tipin varsayılanı; gerekirse `width` (Main'deki Produced: `object`, 176 px) |
| Satır aksiyonları | İçeriğe göre: 8 + [hata ikonu 14 + 8] + [inline aksiyon × (28 + 8)] + ⋯ 28 + 8. Yalnızca ⋯ → 44 px (D28); `rowError` olan satır varsa + 22 (D35); `inline` aksiyon varsa sayfadaki en kalabalık satıra göre + 36 / + 72 (D36). Sağa sabit |

Örnek düzen (Production orders): `40 │ 136 │ minmax(200,1.6fr) │ minmax(160,1.2fr) │ 124 │ 176 │ 156 │ 132 │ 148 │ 44` → min genişlik 1318 px. Toplam genişlik kabı aşarsa yatay kayar.

### Header

| Durum | Görünüm / davranış |
|---|---|
| Default | 12 px, 500, `--dt-text-2`, `--dt-surface-2` zemin. Sütunlar arası %40 yükseklikte 1 px ayraç. |
| Hover | Sıralama oku ve `⋯` belirir; etiket butonu `--dt-surface-3`. |
| Sorted asc / desc | Etiket `--dt-text`, ok görünür; desc'te 180° döner (150 ms). |
| Multi-sort | Öncelik rozetleri `1`, `2` (14 px kare, `--dt-surface-3`). |
| Filtered | Etiketin yanında `--dt-accent-text` filtre işareti; tıklanınca o çip açılır. |
| Pinned | Etiketin yanında 12 px raptiye; kenar gölgesi **yalnızca** içerik o yöne kaydırılmışken. |
| Long label | Kesilir, tam ad tooltip'te. |
| Description | `description` varsa tooltip iki satırdır: ad + açıklama (etiket kesilmese de); ekran okuyucuya `aria-describedby` ile verilir. Header'da ek ikon yok (D33). |
| Sayısal | Sağa hizalı; ok etiketin solunda, `⋯` en solda. |
| Resize | Kenarda hover'da 2 px `--dt-accent` tutamaç; sürüklerken canlı genişlik rozeti (`184 px`); min 80 px; genişlikler tek `--cols` değişkenine Vue dışından yazılır. Çift tık = içeriğe sığdır (görünür satırlar + header). Sabit sütunlar px, orta sütunlar `minmax(min, fr)`, resize sonrası px; bölge sonunda `auto` dolgu. |
| Sıra | Header menüsü › **Move left / Move right**; klavye `⌥⇧←` / `⌥⇧→`. Sürükleme yok (D22). Sabit sütunlar kendi bölgeleri içinde taşınır. |

Tıklama: sıralama (04 §6). ⇧+tık: ikincil sıralama. `⋯` veya sağ tık: **Column menu** —
`[Tip etiketi başlıkta]` · Sort ascending · Sort descending · Clear sort · ─ · Filter by this column… · ─ · Pin left · Pin right (sabitse Unpin) · Fit to content · Move left · Move right · Hide column

### Satır

| Durum | `--dt-row-bg` | Not |
|---|---|---|
| Default | `--dt-surface` | |
| Hover | `--dt-row-hover` | Hücre aksiyonları (`actions`, `reveal: 'hover'`) görünür; ⋯ `--dt-text-2` |
| Selected | `--dt-row-selected` | Hover: `--dt-row-selected-hover` |
| Klavye odağı | — | Satır üstünde 2 px `--dt-accent` çerçeve (yarıçap 3 px, `::after`) |
| Dim | opacity .55 | İşlem süren satır (bulk aksiyon çalışırken) |
| Error | `--dt-r-bg` | `rowError(row)` metin ya da metin listesi dönerse. Zemin Hover ve Selected'ın **üstündedir** (sheet'teki Error önceliği; seçim checkbox'tan okunur). ⋯ hücresinde, ⋯'nın solunda 14 px `WarningCircle` `--dt-r-dot`; sayfada en az bir hatalı satır varken ⋯ sütunu 44'ten 66'ya genişler, ⋯ sağa yaslı kaldığı için hizası değişmez (⋯ hücresi yoksa ikon ilk görünür hücrenin başında; sabit genişlikli birincil id kesilmesin). Mesajlar alt alta tooltip'te: satırın **herhangi bir yerine** gelince imlecin altında, ikona gelince ikonun altında; klavye odağı satıra gelince hemen. Satıra `aria-describedby` → ikon (`role="img"`, adı mesaj). Hata haritası uygulamanındır (D35). |

- Hücreler zemin rengini `--dt-row-bg`'den alır; sabit hücreler opak kalsın diye bu zorunludur (01).
- **Birincil hücre gerçek `<a href>`** (D6). Satır gövdesine tıklamak varsayılan olarak (`row-click: 'none'`) hiçbir şey yapmaz: seçim yapmaz, açmaz; metin seçilip kopyalanabilir. `row-click: 'open' | 'expand'` satır tıklamasına bir eylem bağlar (§7). Hangi değer olursa olsun: etkileşimli hedefe (link, buton, checkbox, input, menü) tıklama, metin seçimiyle biten tıklama, sürükleme ve değiştirici tuşlu tıklama yok sayılır; satır tıklaması asla seçim yapmaz. Guard tek yerdedir; `cell`/`actions` içindeki düğmeler `stopPropagation` yazmaz.
- Satır aksiyonları (sağa sabit, içeriğe göre): **⋯** (28 × 28; hücre dolgusu 8, öğeler arası 8, sağa yaslı; hata ikonu ve inline aksiyonlar soluna gelince ⋯'nın hizası değişmez, sütun genişler; her zaman görünür, `--dt-text-3`, hover'da `--dt-text-2`; satır menüsünü açar). Sağ tık ve `⇧F10` da satır menüsünü açar. Önizleme düğmesi ve paneli yoktur (D28).
- Satır menüsü (268 px): Open `↵` (gerçek `<a href>`; düz tıkta `row-open`) · Open in new tab (gerçek `<a target="_blank">`, tarayıcı açar) · **Copy {birincil sütun}** (yerleşik, ör. “Copy order number”; birincil değeri panoya yazar, toast “Copied”) · ─ · uygulamanın `rowActions` listesi (`run(row)` beklenmez; onay ve toast uygulamanın). `when(row)` false dönen aksiyon menüde **yoktur** (yetki için; D34); `disabled` durum içindir: pasif aksiyon gerekçesiyle iki satırlı gösterilir (“Release — Already running”). `description` varsa etiketin altında soluk ikinci satır (gerekçe varsa yalnızca gerekçe). Yıkıcı aksiyon en altta, ayırıcıdan sonra, kırmızı metin, sonu `…` (onay ister).
- **Inline satır aksiyonu** (D36): `inline: true` + `icon` olan aksiyon ⋯'nın solunda ⋯ ile aynı 28 px ikon düğmesi olarak da çizilir (gri, hover'da koyu; yıkıcı olsa da kırmızı değil); `when(row)` satır satır belirler, `disabled` pasif + gerekçe tooltip'te; label `aria-label`'da, `description` tooltip'te (“Edit — Open in editor”) ve `aria-describedby` ile. Satır başına ilk 2 inline; **inline çizilen aksiyon o satırın ⋯ menüsünde yer almaz** (ikonsuz ya da 3. ve sonraki inline'lar menüde kalır). Menüde hiçbir öğe kalmazsa (Open/Copy yok, tüm aksiyonlar inline ya da gizli) o satırda ⋯ çizilmez, 28 px yeri boş kalır. Hücre düzeni: `[hata ikonu?] [inline…] [⋯]`. Inline düğmeler satır widget'ıdır (08 §2: Tab durağı değil, `→` ile ulaşılır, Enter çalıştırır).

## 5. Sütun yönetimi

### Display › Columns (günlük kullanım)

- Drill-in görünüm (Display popover'ı içinde, 320 px), başlıkta geri oku + “Columns” + `8 of 14 shown`; altında **Find a column** araması.
- Bölümler: **Pinned** (kilit, “Always shown” notu), **Shown** (sağda “Hide all”), **Hidden** (sağda “Show all”).
- Satır: tip ikonu · ad (altında varsa `description`, 12 px `--dt-text-3`, tek satır kesilir) · göz switch'i · **Move up / Move down** ok butonları (sürükle tutamacı yok, D22).
- Altta **Reset** (görünümün kayıtlı sütun düzenine).
- Değişiklikler anında uygulanır ve görünümü “edited” yapar.

### Manage columns dialog

860 px'lik bir Manage columns dialog'u (gruplu alan listesi, genişlik input'u, L/–/R sabitleme) **ilk sürümde yoktur** (D22). Columns drill-in'i aynı işleri (arama, göster/gizle, sıra, sabitleme menüden) görür; 40+ sütunlu ekranlarda ihtiyaç doğarsa yeniden ele alınır.

## 6. Seçim ve bulk bar

### Seçim kuralları

- Satır başındaki checkbox seçer. **⇧+tık** son tıklanan satırla arasındaki aralığı seçer/kaldırır.
- **Satır gövdesine tıklamak asla seçmez** (D6).
- Header checkbox = **bu sayfadaki** yüklü satırlar. Kısmi seçimde `indeterminate`.
- **Seçim sayfa kapsamlıdır (D19):** sayfa, sayfa boyutu, filtre, arama veya sıralama değişince temizlenir; refresh'te korunur, yeni veride olmayan anahtarlar süzülür. Sayfalar arası seçim, “Select all matching”, `excludedKeys` yoktur.
- Klavye: odaklı satırda `X` seçer/bırakır, `⇧↑/↓` aralık, `⌘A` sayfadaki tüm satırlar.
- `selection-change` olayı seçili satırları (`Row[]`) verir; `clearSelection()` handle'dadır.
- `Esc` seçimi temizler (odak bir popover'da değilse).

### Bulk bar

- Koyu yüzer çubuk (`--dt-bulk-bg`), yarıçap `--dt-radius-card`, padding 6, butonlar 32 px. Altta ortalı, alt kenardan 64 px; **düzeni kaydırmaz**, içeriğin üstünde durur. İlk seçimde 160 ms yukarı kayarak gelir.
- İçerik: `[sayaç] │ aksiyonlar (en fazla 3, inBar) │ ⋯ │ ×`.

| Durum | Sayaç |
|---|---|
| Normal | `4 selected` (yalnızca bu sayfadaki satırlar) |

- `⋯` menüsü: kalan bulk aksiyonlar; yıkıcı olanlar en altta (“Cancel 7 orders…”).
- `when(rows)` false dönen aksiyon ne bar'da ne menüdedir (seçime göre yetki; D36); `disabled(rows)` pasif + gerekçe. `description` bar düğmesinde tooltip, menüde ikinci satır (gerekçe varsa yalnızca gerekçe).
- `×` (Clear selection, `Esc`).
- Telefonda: yanlardan 10 px, alttan 30 px, yarıçap `--dt-radius-dialog` (14 px); butonlar 44 px yüksek, **ikon üstte + etiket altta** dikey düzen; başparmak erişiminde.

### Yıkıcı onay (uygulamanın dialog'u için örnek)

Dialog 460 px: başlık “Cancel 4 production orders?”, açıklama, etkilenen ilk 5 kayıt mono listede (+N), atlanacaklar notu (“1 is already completed and will be skipped.”), isteğe bağlı tek seçenek (“Notify order owners”), Keep orders · **Cancel 3 orders** (kırmızı birincil — sayı atlananlar düşülerek). Odak ilk açılışta güvenli butonda.

### Aksiyon ve sonrası

`BulkAction.run(rows)` seçili satırlarla çağrılır; paket sonucu **beklemez** ve hata yutmaz (D20). Onay dialog'u (yukarıdaki tasarım uygulamanın kendi dialog'u için örnektir), toast, `clearSelection()` ve `refresh()` uygulamanındır. `#selection-actions="{ rows, clear }"` slot'u ile çubuğun aksiyon alanı tamamen uygulamanın olabilir; `selection-bar: 'toolbar'` ile çubuk toolbar'ın yerine geçer.

## 7. Satır detayı

Aynı satır, iki derinlik:

| Derinlik | Ne | Nasıl açılır | Liste |
|---|---|---|---|
| **Expand** | Alt kayıtlar satırın altında (operasyonlar, sipariş satırları, partiler) | Birincil hücredeki chevron, `→` aç / `←` kapa; `row-click="expand"` | Yerinde kalır |
| **Open** | Tam detay sayfası | Birincil link (düz tık → `row-open`), satırda `↵`, `row-click="open"`; yeni sekme: ⌘/Ctrl veya orta tık (tarayıcı) ya da `→` ile linke odaklanıp `⌘↵` | Terk edilir |

`row-open { row, href, event }`: paket `preventDefault` yapmaz. Dinleyici yoksa tarayıcı `href`'e gider (tam sayfa). SPA için uygulama `event.preventDefault()` çağırıp `router.push(href)` (Vue Router) veya `router.visit(href)` (Inertia) yapar. Satırda `↵`, satır tıklaması ve menüdeki Open aynı `href(row)` çözümlemesini kullanır; DOM'daki bir öğeye bağımlı değildir. *(Uygulama: menüdeki Open kendi `<a href>`'idir; `↵` ve satır tıklaması odaklı/tıklanan satırın birincil linkine gerçek tık üretir, böylece navigasyon ve yeni sekme davranışı tarayıcınındır; `href` yoksa açılacak şey yoktur.)*

### Expand

- Chevron 20 px, birincil hücrede ID'nin solunda; açıkken 90° döner (150 ms). `canExpand(row)` false ise chevron yerinde boşluk kalır (hizalama bozulmaz).
- Alt satır (`dt-subrow`): tam genişlik, `--dt-surface-2` zemin, sol kenar seçim sütununun sağından başlar; içinde **mini tablo** (`--dt-radius-inner`, kendi header'ı, 34 px satırlar) ve altında özet satırı (“4 operations · Line 2 routing” + “Open routing” linki). İçerik `#expanded` slot'undan gelir.
- İçerik `#expanded="{ row, close }"` slot'undan. **Veriyi slot bileşeni çeker** (vue-query, fetch); yükleniyor ve hata görünümü de onun. Paket detay verisi yüklemez, önbelleklemez, “Loading…” göstermez; yükleme/hata görünümü uygulamanın slot içeriğidir.
- `expand: true | { canExpand }`; TanStack expanding state'i satır anahtarıyla tutulur (refresh'te açık kalır); `query`/`page` taleplerinde açıklar kapanır.
- Sanal liste: öğe = satır + detay; detay yalnızca görünür aralıkta render edilir (kaydırınca unmount olur, içindeki yerel durum gider), yükseklik `measureElement` ile ölçülür ve anahtar bazlı önbellekte kalır; yeniden mount zıplatmaz. Birden çok satır açık olabilir.

### Önizleme (peek) yok — D28

Paket önizleme paneli taşımaz. Uygulama isterse `row-click` olayında veya `rowActions` ile kendi panelini/sayfasını açar; birincil link ve `row-open` değişmez.

## 8. Sayfalama

### Simple (tek biçim, D7)

Footer solu: `Rows 101–200 · Count total │ Updated just now ↻`. Sağı: `Rows per page [100 ▾] │ ‹ Previous  Next ›`.

| Durum | Sol metin |
|---|---|
| Normal | `Rows 101–200 · Count total` (`countable` ise) |
| Counting | `Rows 101–200 of ⟳ Counting…` — sayfalama kullanılabilir kalır |
| Counted / istemci modu | `Rows 101–200 of 1,284` (sunucu modunda `counted 09:42` eki; sonuç sorgu değişene kadar geçerli) |
| Son sayfa (`hasMore: false`) | `Rows 1,201–1,284 · end of results` — kısa sayfa sonu söyler, sayım gerekmez |
| Tek sayfa | `Rows 1–37` (Count total yok, Previous/Next pasif) |
| 0 satır, sayfa 1 | `0 rows` — durumlar §10 |
| 0 satır, sayfa > 1 | Gövdede “No rows on this page” + **Go to previous page**; Previous açık |

- Sayfalama state'i TanStack `rowPaginationFeature`'dadır (01); istemci modunda `createPaginatedRowModel`, sunucu modunda `manualPagination` + `hasMore`/`total`'dan türetilen `pageCount`. Laravel sayfası = `pageIndex + 1`.
- Aralık `(sayfa − 1) × boyut + 1 … + satır sayısı`; `hasMore` Laravel `simplePaginate`'in `next_page_url !== null` değeridir.
- **Footer yalnızca snapshot'tan okur:** satırlar, `hasMore` ve aralık, başarıyla yüklenmiş son yanıta aittir. Uygulama `rows` ve `hasMore`'u aynı anda vermelidir.
- **`page` / `query` talebi sürerken** Previous, Next, Rows per page ve `Alt+←/→` pasiftir (eski `hasMore` ile hızlı Next–Next olmaz). `refresh` sırasında açık kalırlar. Sayfa talebi hata verirse sayfa hedefte kalır, Error durumu gösterilir, Previous ve Retry açıktır.
- Rows per page: 50 / 100 / 250 / 500 (tercih, görünüm değil). Değişince ilk sayfaya döner.
- Previous ilk sayfada, Next `hasMore: false` iken pasif. `Alt+←` / `Alt+→`.
- Sayfa değişince **tablo gövdesi** en üste kayar (sayfa değil); seçim ve açık satırlar temizlenir (D19).
- Sanal satırlar: görünür satırlar + 10 overscan render edilir; yükseklik yoğunluğa göre sabit.

Numbered, load-more ve infinite biçimleri **yoktur** (D7). URL'ye yazma yoktur (D25).

### Kaydırma konumu

Kaydırırken sağ altta koyu hap: `Rows 41–56` (sayfa ofseti dahil, tabular). Kaydırma durduktan **900 ms** sonra kaybolur (150 ms). `aria-hidden` — ekran okuyucu satır konumunu `aria-rowindex`'ten alır.

## 9. Yoğunluk

Token tablosu: 02 · Yoğunluk. Kişisel tercih, görünüme yazılmaz. Comfortable'da ikinci satırlar (`secondary`) görünür; diğerlerinde gizli ve tooltip'te.

## 10. Durumlar

**Çerçeve asla çökmez:** toolbar, header ve footer her durumda yerinde kalır; durum içeriği gövde alanında ortalanır.

| Durum | Ne zaman | Görünüm |
|---|---|---|
| **First load** | `loading` ve satır yok (ilk talep) | Header görünür; **hemen** 12 satır tipine göre skeleton (03); footer'da Previous/Next pasif. 1.6 s kayan parıltı. Boş gövde gösterilmez (“kayıt yok” sanılır). |
| **Refreshing** | `refresh` / `columns` talebi (Refresh, otomatik yenileme, yeni sütun alanı) | Satırlar etkileşimli kalır; header altında 2 px belirsiz çubuk (150 ms'den kısa sürerse hiç gösterilmez); footer'da `Updating…`; bekleyen sütun hücreleri skeleton. Seçim korunur. |
| **Query change** | `query` / `page` talebi (filtre, arama, sıralama, sayfa, sayfa boyutu) | Eski satırlar `opacity .6` + `inert` (tıklama, odak, ekran okuyucu kapalı), `aria-busy`; 400 ms'yi aşarsa skeleton. Seçim ve açık satırlar temizlenir; sayfalama kilitli (§8). |
| **Empty** | Satır yok, filtre/arama yok, sayfa 1 | 40 px ikon kutusu, başlık “No production orders yet”, açıklama ve aksiyonlar `#empty` slot'undan. Footer `No rows`. |
| **No results** | Satır yok, filtre veya arama var | “No orders match these 3 filters” / “… match “hc-99” and 2 filters”; tek filtre varsa **Remove “Due date”**, aksi halde **Clear all filters**; arama varsa **Clear search**. Footer `0 rows`. |
| **Error** | `error` ve son talep `query` / `page` / `initial` | Eski satırlar kaldırılır (artık sorguya ait değiller). Gövdede: “Couldn't load orders”, `error` metni veya genel açıklama, “Your filters are kept.”, **Try again**; `error.id` verilmişse **Copy error ID** ve mono kimlik. Toolbar çalışmaya devam eder. |
| **Stale** | `error` ve son talep `refresh` / `columns` (satırlar var) | Toolbar altında amber şerit: “Couldn't refresh. Showing data from 09:42. Retry”; satırlar etkileşimli kalır; footer `Updated 14 min ago`. |
| **Still loading** | Herhangi bir yükleme 10 s'yi aşınca | Mevcut görünüme “Still loading…” satırı eklenir. |

- Üç girdi: `loading`, satır var mı, `error`; sınıf son yayılan talebin `reason`'ından. İstemci modunda `loading`/`error` uygulama verirse aynı tablo (satır varken Stale, yokken Error).
- **Retry / Try again** = son talebin aynı `reason` ve sorguyla yeniden yayılması; talep sürerken düğme pasif. Otomatik yeniden deneme yoktur. İstemci modunda `@request` dinleyicisi yoksa Retry düğmesi gösterilmez.
- Paket, `request` yaydığı andan `rows`/`error` değişene veya `loading` düşene kadar kendini yükleniyor sayar (`pending`): uygulama `loading`'i geç yazarsa Empty yanıp sönmez. Sunucu modunda `@request` dinleyicisi yoksa geliştirme uyarısı.
- Abort edilen talep hata sayılmaz.
- “Removing *Due date* would show 4 orders” önerisi **yoktur**: ek sayım sorgusu gerektirir.
- Hata mesajı uygulamadan gelir (`error: string | { message, id }`); 401/403 gibi durumlar için özel metin veya “Try again yok” kuralı yoktur.

## 11. Duyarlı davranış

**Tablo karta dönüşmez** (ilke 4).

| Genişlik | Değişiklik |
|---|---|
| ≥ 1024 px | Varsayılan düzen |
| 640 – 1023 px | Toolbar daralır (§3) |
| < 640 px | Seçim sütunu ve birincil sütun sola sabit, diğerleri yatay kayar, sağ kenarda solma (“daha fazlası var”); kaydırınca sabit kenar gölgesi belirir |

Telefonda (< 640 px):
- Toolbar: görünüm adı (tıklanınca alt sayfa), arama ikonu, filtre ikonu + sayaç, `⋯`. Arama ikonu toolbar'ın yerine tam genişlik arama alanı açar (sol başta geri oku).
- Filtre çip satırı tek satır, yatay kayar; çipe dokunmak **Filters alt sayfasını** açar (04 §9).
- Tüm popover'lar **alt sayfa** olur: 52 px satırlar, üstte tutamaç, altta tam genişlik birincil buton.
- Bulk bar §6'daki telefon düzeninde.
- Dokunmatikte (`pointer: coarse`) Compact otomatik Standard'a döner; satır en az 48 px; checkbox dokunma alanı 44 px (görsel 16 px kalır); satır aksiyon sütunu (`⋯`, 44 / 66 px) sağa sabit kalır, düğmenin dokunma alanı 44 px.

## 12. Kenar durumlar

- **Uzun metin:** tek satır + `…` + tooltip (400 ms). Çip değerleri 180 px'te kesilir.
- **Çeviri uzunluğu:** Türkçe metinler İngilizceden ~%30 uzun; buton genişlikleri sabit değil, içerikle. Toolbar daralma eşikleri metin genişliğinden ölçülür.
- **Sayfa tam dolu ama son:** sunucu `hasMore: false` dönerse “end of results”; paket satır sayısından tahmin yürütmez.
- **Refresh'te kaybolan seçili satır:** yeni veride olmayan anahtar seçimden süzülür (D19).
- **Hızlı ardışık etkileşim:** her yeni talep öncekinin `signal`'ini abort eder; yalnızca son yanıt render edilir (`pending` + snapshot).
- **Yavaş bağlantı:** 10 sn sonra “Still loading…”.
- **Eksik veri:** `null` hücreler `emptyText`; bilinmeyen `select` değeri ham değerle gri rozet olarak gösterilir (geliştirme modunda konsol uyarısı).
- **Kolon tanımı değişti:** kayıtlı görünümdeki bilinmeyen sütun atlanır (04 §7).

## 13. Hareket

02 · Hareket tablosu. Bu modda: popover 120 ms, bulk bar 160 ms, sıralama oku 150 ms, kaydırma hapı 900 ms bekleme + 150 ms solma, refresh çubuğu 1.25 s döngü. `prefers-reduced-motion` desteklenir.

## 14. Erişilebilirlik (özet — tamamı 08)

- Kök `role="grid"` (satırlar seçilebilir ve odaklanabilir; `aria-selected` yalnızca grid'de geçerli), **satır odaklı** model. `aria-rowcount="-1"` (toplam bilinmiyor; count yapıldıysa gerçek sayı), satırlar `aria-rowindex` (sayfa ofseti dahil).
- Header `aria-sort`; seçili satır `aria-selected="true"`; expand butonu `aria-expanded` + `aria-controls`.
- Odak sırası: toolbar → filter bar → header → satırlar (tek tab durağı, içeride oklar) → footer → bulk bar (göründüğünde `F6` ile atlanır).
- Durum değişimleri `aria-live="polite"` bölgesinden: “25 rows loaded”, “No results”, “4 selected”; yükleme boyunca kökte `aria-busy="true"`.
