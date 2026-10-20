# 03 · Sütun tipleri

Tasarım referansı: `DESIGN-BRIEF.md` §5.1 ve görev paketi T8.

Her sütunun bir `type` değeri vardır (zorunlu; veriden çıkarsama yok). Tip; hücre görünümünü, hizalamayı, sıralama fonksiyonunu, filtre operatörlerini, filtre değer girişini, DataSheet editörünü ve dışa aktarma metnini **birlikte** belirler. Filtre değer girişi ile sheet editörü aynı bileşendir (`core/editors`). Tek fark: `select` gibi tekli seçimler filtrede çoklu seçime izin verir.

**24 tip:** 19'u mevcut sistemden gelir, 5'i (`currency`, `user`, `email`, `url`, `id`) yeni öneridir. `custom` tipi yoktur; özel içerik `cell`, hücre aksiyonları `actions`, özel editör `editor` ile tanımlanır (aşağıda **Özelleştirme**). Tipe uymayan veri için kaçış kapısı `object`'tir.

Sıralama ve filtreleme her zaman **ham değer** üzerinden çalışır; gösterim (`cell`, biçimlendirme) bunları etkilemez.

## Ortak kurallar (her tip)

| Kural | Ayrıntı |
|---|---|
| Boş değer | `null`, `undefined`, `''`, boş dizi → `emptyText` (varsayılan `—`, `--dt-text-3`). Hiçbir zaman boş hücre veya sahte `0`. |
| Hizalama | `int`, `float`, `percentage`, `currency` sağa; diğerleri sola. `align` ile ezilebilir. Header etiketi de aynı tarafa hizalanır; sayısal header'da sıralama oku metnin **solunda** durur. |
| Taşma | Tek satır, `…` ile kesilir, tam değer tooltip'te (400 ms gecikme). Sütun düzeyinde `wrap` seçeneği yok. Belge modunda metin sütunları en fazla 2 satıra sarılır (06); liste (D8) ve sheet modunda tek satır. |
| İkinci satır | `secondary` (ör. SKU, e-posta) yalnızca Comfortable'da; 12 px, `--dt-text-3`. |
| Birim | Hücrede değil, header'da (`Produced pcs`, `Lead time d`). Belge modunda satır birimi hücrede soluk yazılır (satırdan satıra değişebildiği için). |
| Değer okuma | `id` nokta yolu (`customer.title`) null-güvenli okunur (`row.customer?.title`); `accessor` fonksiyonu hesaplanan değer içindir ve `fields` ile sunucuya istenecek alanlar bildirilir. Hücre değeri her zaman depodan okunur. |
| Yerelleştirme | `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.Collator`; locale `createDataTable({ locale })` veya tablonun `locale` prop'u (varsayılan `navigator.language`). Biçimlendiriciler locale + seçenek anahtarıyla önbelleklenir. Metin sıralaması `Intl.Collator(locale, { numeric: true })`. |
| Skeleton | Tipe göre: metin → %55–80 genişlikte çubuk; sayı → sağa yaslı kısa çubuk; rozet → 76×20 hap; kişi → daire + çubuk. |
| Boşluk operatörleri | Filtrelenebilen her tipin operatör menüsü **is empty** ve **is not empty** ile biter. |
| `sortable` · `filterable` | Tip destekliyorsa varsayılan açık. `object` filtrelenemez; `object` ve `array` sıralanamaz. |

## Sayı

| Tip | Hücre | Seçenekler | Filtre operatörleri | Değer girişi / editör | Yapıştırma |
|---|---|---|---|---|---|
| `int` | `12,400`; negatif `−320` (gerçek eksi işareti U+2212) | — | `= ≠ > ≥ < ≤`, between, is empty | Tam sayı input'u | `12.400`, `12,400`, `12400` yerel ayara göre okunur |
| `float` | `1,284.50` — her zaman `decimalPlaces` hane (vars. 2), noktalar hizalanır | `decimalPlaces` | `int` ile aynı | Ondalık input'u | `1.284,50` / `1,284.50` |
| `percentage` | `68%`; `display: 'bar'` → 90 px'e kadar çubuk + değer | `display` | `= > ≥ < ≤`, between, is empty | `%` son ekli sayı input'u | `68`, `68%`, `%68` |
| `star` | `max` (vars. 5) yıldız, 14 px, dolu = `--dt-a-dot`, boş = `--dt-line-2`; tooltip “4 of 5” | `max` | at least, at most, `=`, is empty | 1–`max` yıldız seçici | `4` |
| `currency` **(yeni)** | `412,800.00` + soluk mono ISO kodu (`TRY`); negatif `−12,450.00` | `currency` (sabit kod veya satırdan) | `= > ≥ < ≤`, between, is empty | Sayı + para birimi segmented | `1.650,00` → `1,650.00` |

## Metin

| Tip | Hücre | Seçenekler | Filtre operatörleri | Değer girişi / editör |
|---|---|---|---|---|
| `string` | Tek satır, kesilir, tooltip | — | contains, doesn't contain, is, is not, starts with, is empty | Metin input'u; filtrede mevcut değerlerden öneriler (eşleşen kısım kalın) |
| `text` | Yalnızca ilk satır, `--dt-text-2`; sağda 14 px “genişlet” ikonu; tam metin hover kartında | — | contains, doesn't contain, is empty | Metin input'u; sheet'te büyük kutu, ⇧Enter yeni satır |
| `uppercase` | Kaydedildiği gibi | — | contains, is, is not, starts with, is empty — büyük/küçük harf duyarsız | Yazılanı büyük harfe çeviren input |
| `lowercase` | Kaydedildiği gibi | — | `uppercase` ile aynı | Yazılanı küçük harfe çeviren input |
| `phone` | E.164 saklanır ve ilk sürümde olduğu gibi gösterilir (`+905324121807`); dokunmatikte `tel:`. Ülkeye göre biçimlendirme kütüphane gerektirdiği için ertelendi | — | contains, starts with, is empty | Telefon input'u |
| `color` | 14 px kare (4 px yarıçap, iç kenar) + mono değer `#2D5BE3` veya renk adı. `display: 'fill'` → hücrenin tamamı boyanır, yazı rengi kontrasta göre | `display` | is any of, is empty | Renk paleti (swatch) |
| `email` **(yeni)** | Düz metin; hover'da `mailto:` link + kopyala | — | contains, is, ends with, is empty | Metin input'u; `@domain` yazılırsa “ends with” önerilir |
| `url` **(yeni)** | Yalnızca host, protokol gizli, `↗` ikonu, yeni sekme | — | contains, is empty | Metin input'u |
| `id` **(yeni)** | Mono, kayda link, hover'da kopyala butonu | `href(row)` | is, contains, is any of | Metin input'u; **liste yapıştırılırsa** (satır sonu/virgül ayrılmış) otomatik “is any of” |

## Seçim

| Tip | Hücre | Seçenekler | Filtre operatörleri | Değer girişi / editör |
|---|---|---|---|---|
| `boolean` | Yes: yeşil rozet + ✓ ikon. No: nötr rozet + – ikon. `falseTone: 'destructive'` → No kırmızı + ✕ | `falseTone` | is (Yes / No), is empty — çipte operatör “is”, değer “Yes” | Yes/No segmented — popover yok; sheet'te Space değiştirir |
| `select` | Seçeneğin tonunda yumuşak rozet (nokta + etiket). Açık/koyu tema renkleri ayrı verilebilir | `options[]` (`value, label, tone` veya `{ light, dark }`) | is any of, is none of, is empty | Combobox — filtrede çoklu seçim, sheet'te tekli. Arama, `Only` kısayolu (hover) |
| `multiselect` | En fazla 2 rozet, sonra `+N` (popover) | `options[]` | is any of (`in`: şunlardan birini içerir), is none of (`not_in`), is empty | ComboboxMultiple |
| `tags` | Nötr çerçeveli tag'ler (asla renkli değil), 2 + `+N`; seçenekler yüklü satırlardaki mevcut değerlerden (uzaktan öneri yok, D3) | — | is any of (`in`), is none of (`not_in`), is empty | ComboboxMultiple (mevcut tag'lerde arar, yeni tag yazılabilir) |
| `ajax` | Sunucudan gelen etiket; kaydın URL'i varsa link | `remote` (`search(q, page)`, `resolve(ids)`) | is any of, is none of, is empty | Async combobox: yazdıkça arar, 20'şer yükler, yükleniyor/boş durumları |
| `user` **(yeni)** | Avatar + isim; çoklu → avatar yığını (3 + `+N`); boş → “Unassigned” (kesik çizgili avatar) | `remote` veya `options` | is any of, is none of, **is me**, is empty | Kişi combobox'u, “Me” en üstte, “Unassigned” seçeneği |

## Tarih

| Tip | Hücre | Seçenekler | Filtre operatörleri | Değer girişi / editör |
|---|---|---|---|---|
| `date` | `Oct 24` — yıl yalnızca içinde bulunulan yıl değilse (`Mar 3, 2025`). `overdue: true` ve tarih geçmişse kırmızı metin + `· 3d late` (gecikme durumun değil tarihin özelliği) | `overdue` (bool veya `row => bool`) | is, is before, is after, **is within** (hazır aralık veya özel aralık), is empty | Tarih seçici (haftanın ilk günü yerel ayara göre: tr ve en-GB Pazartesi, en-US Pazar) + relatif hazır aralıklar (Today, This week, Next 7 days, This month, Last 30 days, This quarter, Overdue); “Custom range” takvimde iki uç |
| `datetime` | `Oct 17, 09:42` (yerel ayarda 24 saat), saat dilimi tooltip'te; `relative: true` → “2 hours ago” + tam zaman tooltip'te | `relative` | `date` ile aynı | Tarih + saat seçici |

Relatif hazır aralıklar **relatif kalır**: “This month” görünüme kaydedilirse ay değişince kendiliğinden kayar. Sheet editöründe “24.10”, “+7d” gibi kısa girişler kabul edilir.

Tarih tiplerinde tek operatör **is within** (`within`): değeri ya hazır aralık ya özel aralıktır (04).

## Yapısal

| Tip | Hücre | Seçenekler | Filtre | Editör |
|---|---|---|---|---|
| `object` | `summary(value, row)` sonucu (ör. “Gebze, Kocaeli”) veya “4 fields”; solunda `{ }` mono rozet; tıklayınca JSON görüntüleyici (popover, kopyala). **Kaçış kapısı:** tipe uymayan veri (`{ done, total }` gibi) bu tiple tanımlanır ve `cell` ile çizilir | `summary` | Filtrelenemez, sıralanmaz — gerekirse alanı ayrı sütun yapın | JSON metni (yalnızca sheet, gelişmiş) |
| `array` | İlk değerler + `+N`; solunda `[ ]` rozet; tam liste popover'da | `itemType` | contains, is empty | Öğe tipinin input'u |

## Özelleştirme: `cell`, `actions`, `editor`

Sütun tanımları feature'ın `columns.ts` dosyasında yaşar; özel gösterim Vue slot'u ile değil, tanımın içinde yapılır (D21). Üç alan, üç ayrı iş:

| Alan | Ne yapar | Ne yapmaz |
|---|---|---|
| `cell: (ctx) => VNodeChild` | Hücre **içeriğini** `h()` ile çizer. Bağlam `{ row, value, formatted, column, density }`; `value` tipe göre daralır (`int` → `number \| null`, `select` → `string \| number \| null`…), `formatted` tipin varsayılan metnidir. Tipin kabuğu (hizalama, kesme, boş değer, yoğunluk, hover) korunur. Yalnızca fonksiyon formu; bileşen `h(Comp, props)` ile verilir | Sıralama, filtre, editör ve dışa aktarmayı etkilemez; DataSheet düzenlemeye girince tipin editörü açılır |
| `actions: CellAction[]` | Hücrenin sağ kenarında **yardımcı aksiyonlar** (Kopyala, Düzenle, Detay, ⋯ menüsü). Paket overlay'i çizer: metin yerleşimi ve genişlik değişmez; `reveal: 'hover'` (varsayılan, hover ve `:focus-within`) veya `'always'`; en fazla 2 ikon, fazlası ⋯ menüsünde; `when(row)` değere bağlı aksiyon; `menu` alt menü | İş mantığı taşımaz; `run(row)` uygulamanın |
| `editor: Component` | DataSheet'te tipin editörü yerine özel editör. Sözleşme: props `{ modelValue, row, column }`, emit `update:modelValue`; Enter/Tab/Esc'i sheet yönetir, portallı içerik (popover, combobox) serbesttir | Görünümü değiştirmez |

Hücre içindeki `button`/`a` öğeleri normal Vue öğeleridir: geliştirici `stopPropagation` yazmaz. Paketin tek guard'ı etkileşimli hedefe tıklamayı satır tıklamasından, seçimden ve düzenleme başlatmadan ayırır (05 §7, 07 §5). Widget'lar `tabindex="-1"` taşır ve klavyeyle `→` / `Enter` ile ulaşılır (08 §2).

```ts
// features/orders/columns.ts
import { h } from 'vue'
import type { ColumnDef, CellRender } from '@swors/data-table'
import { Copy, ArrowSquareOut } from '@phosphor-icons/vue'
import StatusCell from '@/shared/cells/StatusCell.vue'

// feature'lar arası yeniden kullanım: tipli yardımcı
export const progressCell = <R,>(get: (r: R) => { done: number; total: number }): CellRender<R> =>
  ({ row }) => { const { done, total } = get(row); return h('div', { class: 'bar' }, `${done} / ${total}`) }

export const orderColumns: ColumnDef<Order>[] = [
  { id: 'number', header: 'Order', type: 'id', primary: true, href: r => `/orders/${r.id}`,
    actions: [{ id: 'copy', label: 'Copy number', icon: Copy, run: r => copy(r.number) }] },
  { id: 'status', header: 'Status', type: 'select', options: statusOptions,
    cell: ({ row, value }) => h(StatusCell, { status: value, late: row.dueAt < today }) },
  { id: 'qty', header: 'Qty', type: 'int',
    cell: ({ value, formatted }) => value != null && value > 100 ? h('b', formatted) : formatted },
  { id: 'progress', header: 'Progress', type: 'object', cell: progressCell<Order>(r => r.progress) },
  { id: 'customer.title', header: 'Customer', type: 'string',
    actions: [{ id: 'open', label: 'Open customer', icon: ArrowSquareOut, when: r => !!r.customer, run: r => router.push(`/customers/${r.customer!.id}`) }] },
]
```

## Operatör anahtarları

Arayüzde menü ve çip **kelime etiketlerini** kullanır (“is greater than”); semboller gösterilmez.

Sorguya giden anahtar kümesi küçük tutulur (**18 operatör**); aynı anahtar tipe göre farklı etiketle görünür. Etiketler i18n'den gelir (09). `FilterCondition` op'a göre ayrışan bir union'dır (api-draft); `currency` sütununda değer düz sayıdır, para birimi ayrı `currency` alanıyla gider.

| Anahtar | Değer | Etiket(ler) | Tipler |
|---|---|---|---|
| `eq` | tekil | is · `boolean`'da değer Yes/No | sayı, metin, `boolean`, `date`, `star` (`id` için tekil “is” = `in` tek değer) |
| `neq` | tekil | `≠` · is not | sayı, metin |
| `gt` `gte` `lt` `lte` | sayı | `>` `≥` `<` `≤` · `star` için `gte` = at least, `lte` = at most | sayı, `star` |
| `between` | `[min, max]` (uçlar dahil) | between | sayı |
| `contains` `not_contains` `starts_with` `ends_with` | metin | contains · doesn't contain · starts with · ends with | metin tipleri, `array` (`contains`) |
| `in` `not_in` | dizi | **1 değer: is / is not · 2+ değer: is any of / is none of** · çok değerli hücrede “şunlardan birini içerir / hiçbirini içermez” | `select`, `ajax`, `user`, `color`, `id`, `multiselect`, `tags` |
| `before` `after` | tarih veya hazır değer (`today`) | is before · is after | `date`, `datetime` |
| `within` | hazır aralık veya `{ from, to }` | is within | `date`, `datetime` |
| `is_empty` `is_not_empty` | — | is empty · is not empty | hepsi |

**“Me”** bir operatör değil, değerdir: `user` filtresinde `'@me'` gönderilir, sunucu oturumdaki kullanıcıya çevirir. Böylece “Owner is Me” içeren bir görünüm her kullanıcı için doğru çalışır. Operatör menüsündeki “is me” bir kısayoldur: `in ['@me']` kurar.
