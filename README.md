# @swors/data-table

Vue 3 için `DataTable` (liste) ve `DataSheet` (toplu düzenleme): ortak çekirdek, iki bileşen, iki giriş noktası. Paket veri çekmez ve kaydetmez (D18): olay yayar (`@request`, `@count`, `@save`, `@export`), uygulama HTTP'yi yapar ve sonucu geri verir.

Spesifikasyon `docs/data-table/` (karar günlüğü `README.md`, bileşenler `05`/`07`, tipler `03`, filtreler/görünümler `04`, erişilebilirlik `08`, i18n `09`), tasarım teslimi `docs/handoff/`, çalışma kuralları `CLAUDE.md`.

## Kurulum

```bash
pnpm add @swors/data-table reka-ui vue
```

```ts
// main.ts
import { createDataTable, createLocalStoragePreferences, createLocalStorageViews } from '@swors/data-table'
import '@swors/data-table/style.css'

app.use(
  createDataTable({
    locale: 'tr',
    viewsAdapter: createLocalStorageViews({ scope: 'myapp' }), // kişisel görünümler; kendi adapter'ınızı da verebilirsiniz
    preferences: createLocalStoragePreferences({ scope: 'myapp' }), // yoğunluk, çizgiler, sayfa boyutu
  }),
)
```

shadcn-vue temasını devralmak için ek olarak `@swors/data-table/shadcn-bridge.css` (veya HSL tabanlı tema için `shadcn-bridge-hsl.css`) yüklenir.

## DataTable (liste)

Sütun tanımları feature'ın kendi dosyasında yaşar (D21); hücre özelleştirmesi `cell` fonksiyonuyla, slot yok.

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef, type TableRequest } from '@swors/data-table'

const columns: Array<ColumnDef<Order>> = [
  { id: 'number', header: 'Order no.', type: 'id', primary: true, pinned: 'left', href: (r) => `/orders/${r.id}` },
  { id: 'customer', header: 'Customer', type: 'string' },
  { id: 'status', header: 'Status', type: 'select', options: statusOptions },
  { id: 'dueAt', header: 'Due date', type: 'date', overdue: true },
  { id: 'value', header: 'Value', type: 'currency', currency: 'TRY' },
]
const rows = ref<Order[]>([])
const hasMore = ref(false)

// Sunucu modu: her talep (sayfa, sıralama, arama, filtreler) buradan geçer; paket yeniden denemez, önbelleklemez.
async function onRequest({ query, signal }: TableRequest) {
  const { data } = await axios.get('/api/orders', { params: toLaravelParams(query), signal })
  rows.value = data.data
  hasMore.value = data.next_page_url !== null
}
</script>

<template>
  <DataTable
    table-id="orders"
    mode="server"
    :columns="columns"
    :rows="rows"
    :has-more="hasMore"
    :entity-name="{ one: 'order', other: 'orders' }"
    selectable
    :bulk-actions="bulkActions"
    :row-actions="rowActions"
    expand
    @request="onRequest"
    @row-open="onRowOpen"
  >
    <template #expanded="{ row }"><OrderOperations :order="row" /></template>
  </DataTable>
</template>
```

### `row-open` tarifleri

Birincil hücre gerçek bir `<a href>`'tir (D6): ⌘/orta tık tarayıcıya kalır, düz tık `row-open` yayar. Dinleyici `preventDefault` yapmazsa tarayıcı gider.

```ts
// Vue Router
const router = useRouter()
const onRowOpen = ({ href, event }: { row: Order; href: string; event: MouseEvent }) => {
  event.preventDefault()
  router.push(href)
}

// Inertia
import { router } from '@inertiajs/vue3'
const onRowOpen = ({ href, event }) => {
  event.preventDefault()
  router.visit(href)
}
```

### Laravel talebi

`TableRequest.query` → `page`, `size`, `sort` (`[{ column, dir }]`), `search`, `filters` (`FilterCondition[]`, JSON), `fields`. Sunucu `simplePaginate` ile `{ data, next_page_url }` döner; `@count` ayrı bir `count` ucu çağırır (`{ total }`). Playground'daki `playground/server/mock-api.ts` aynı sözleşmeyi uygular.

## DataSheet (toplu düzenleme)

Ayrı giriş noktası: `@swors/data-table/sheet`. Sütunlar varsayılan salt okunurdur; `editable`, `required`, `validate`, `warn`, `hint`, `importAliases` ile açılır. Değişiklikler taslakta birikir, tek **Save** yeni + değişen satırları `@save` ile teslim eder; uygulama anahtara göre upsert yapar ve `applyResult()` ile sonucu bildirir (D11). Asla silmez (D12).

```vue
<script setup lang="ts">
import { DataSheet, type DataSheetHandle, type SheetChanges } from '@swors/data-table/sheet'

const sheet = useTemplateRef<DataSheetHandle>('sheet')
const saving = ref<boolean | { done: number; total: number }>(false)

// 07 §16: 500'lük parçalar sırayla; zaman aşımı, yeniden deneme ve Stop uygulamanındır.
async function onSave({ rows }: SheetChanges) {
  saving.value = { done: 0, total: rows.length }
  for (const chunk of chunksOf(rows, 500)) {
    const { data } = await axios.post('/api/products/bulk-upsert', {
      key: 'sku',
      rows: chunk.map((r) => ({ client_id: r.clientId, key: r.key, op: r.op, values: r.values })),
    })
    sheet.value!.applyResult(
      data.results.map((r) => ({
        clientId: r.client_id,
        status: r.status,
        fieldErrors: r.field_errors,
        rowError: r.row_error,
        row: r.row,
      })),
    )
    saving.value = { done: saving.value.done + chunk.length, total: rows.length }
  }
  saving.value = false
}
</script>

<template>
  <DataSheet
    ref="sheet"
    table-id="products"
    key-column="sku"
    :columns="columns"
    :rows="rows"
    :loading="loading"
    :saving="saving"
    :lookup-keys="(keys) => axios.post('/api/products/lookup-keys', { keys }).then((r) => r.data)"
    :new-row-defaults="() => ({ unit: 'pcs', vat: 20, active: true })"
    :parse-file="parseWithExceljs"
    @save="onSave"
    @export="writeFile"
  />
</template>
```

Sunucu notları (07 §16): her satırı bağımsız işleyin (satır başına doğrulama ve savepoint), eşleme anahtara göre (`op` ipucudur), `update` satırlarında yalnızca gelen alanları güncelleyin, benzersizlik çakışmaları alan hatası olarak dönsün (500 değil), istek başına en fazla 500 satır.

Ayrılma koruması: paket `beforeunload` uyarısını kendisi verir; yönlendirici koruması için `sheet.value.isDirty()`.

## Erişilebilirlik ve klavye

İki roving tabindex modeli: listede satır odaklıdır (oklar satırlar arası, `→` satırın widget'larına), sheet'te hücre odaklıdır (Excel kısayolları: `F2`, `↵`, `Tab`, `⌘C/X/V`, `⌘D`, `⌘Z`, `F8`, `⇧F10`). Tam liste `docs/data-table/08-accessibility-keyboard.md`. Duyurular tek `aria-live` bölgesinden; `forced-colors` ve `prefers-reduced-motion` desteklenir; Playwright'ta axe-core taraması (`e2e/a11y.spec.ts`).

## Geliştirme

Node 22+ ve pnpm (corepack ile): `corepack enable` bir kez, sonra `pnpm install`.

| Komut                               | Ne yapar                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Playground (`playground/`, http://localhost:5174); sahte API `/api/orders`, `/api/products`         |
| `pnpm test`                         | Vitest: token ↔ 02, kontrast, i18n ↔ 09, ESLint sınırları, bileşenler, depo, pano, içe aktarma      |
| `pnpm test:e2e`                     | Playwright (playground'a karşı; axe taraması dahil)                                                 |
| `pnpm typecheck` · `pnpm lint`      | vue-tsc, ESLint (import sınırları dahil)                                                            |
| `pnpm format` · `pnpm format:check` | Prettier (biçim yalnızca Prettier'ın; ESLint biçim kuralı taşımaz)                                  |
| `pnpm build`                        | `dist/`: `index.js`, `sheet.js`, `style.css`, köprü CSS'leri, `.d.ts`                               |
| `pnpm gen:docs`                     | 02 → `src/styles/tokens.css`, 09 → `src/core/i18n/{en,tr}.ts` (üretilmiş dosyalar elle düzenlenmez) |
| `pnpm check`                        | gen:docs + typecheck + lint + format:check + test                                                   |

Token ve metin değişikliği dokümanda yapılır, sonra `pnpm gen:docs`; testler dokümanla kodun ayrışmasını yakalar. Sürüm notları `CHANGELOG.md`.
