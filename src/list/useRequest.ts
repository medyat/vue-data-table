// Talep akışı (05 §10, brief §6.2, D18): paket veri çekmez; sorguyu `@request` ile yayar, uygulama `rows` / `hasMore` /
// `loading` / `error` verir. Her yeni talep öncekinin `signal`'ini abort eder; `pending`, talep yayıldığı andan
// `rows`/`error` değişene veya `loading` düşene kadar sürer (uygulama `loading`'i geç yazsa da Empty yanıp sönmez).
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { RequestReason, TableError, TableQuery, TableRequest } from '../types/query'

export interface Snapshot<Row> {
  rows: Row[]
  hasMore: boolean
  page: { number: number; size: number }
}

export interface RequestOptions<Row> {
  mode: () => 'client' | 'server'
  /** `@request` dinleyicisi var mı (istemci modunda Refresh/Retry yalnızca o zaman görünür). */
  hasListener: boolean
  query: () => TableQuery
  rows: () => Row[]
  hasMore: () => boolean | undefined
  loading: () => boolean | undefined
  error: () => TableError | undefined
  requestOnColumnChange: () => boolean
  emit: (request: TableRequest) => void
}

const STILL_LOADING_MS = 10_000
const COLUMNS_DEBOUNCE_MS = 400

export function useRequest<Row>(o: RequestOptions<Row>) {
  const pending = ref(false)
  const reason = ref<RequestReason | null>(null)
  const snapshot = shallowRef<Snapshot<Row> | null>(null)
  const updatedAt = ref<Date | null>(null)
  const stillLoading = ref(false)
  let controller: AbortController | null = null
  let stillTimer: ReturnType<typeof setTimeout> | undefined
  let columnsTimer: ReturnType<typeof setTimeout> | undefined
  /** Son yayılan talebin istediği alanlar: yeni görünen sütun bunların dışındaysa `columns` talebi. */
  let lastFields = new Set<string>()

  const settle = () => {
    pending.value = false
    stillLoading.value = false
    clearTimeout(stillTimer)
  }

  const send = (why: RequestReason) => {
    controller?.abort()
    controller = new AbortController()
    const query = o.query()
    lastFields = new Set(query.fields)
    reason.value = why
    pending.value = true
    stillLoading.value = false
    clearTimeout(stillTimer)
    stillTimer = setTimeout(() => (stillLoading.value = pending.value), STILL_LOADING_MS)
    o.emit({ query, reason: why, signal: controller.signal })
  }

  const isServer = () => o.mode() === 'server'

  // Sorgu (arama, filtre, sıralama, sütunlar) → 'query'; yalnızca sayfa → 'page'. Aynı tick'te sayfa sıfırlanırsa tek talep.
  const queryKey = computed(() => {
    const q = o.query()
    return JSON.stringify([q.search, q.filters, q.sort])
  })
  const pageKey = computed(() => JSON.stringify(o.query().page))
  const fieldsKey = computed(() => o.query().fields.join('\u0000'))

  watch([queryKey, pageKey], ([q], [prevQ]) => {
    if (!isServer()) return
    send(q !== prevQ ? 'query' : 'page')
  })
  watch(fieldsKey, () => {
    if (!isServer() || !o.requestOnColumnChange()) return
    if (o.query().fields.every((f) => lastFields.has(f))) return
    clearTimeout(columnsTimer)
    columnsTimer = setTimeout(() => send('columns'), COLUMNS_DEBOUNCE_MS)
  })

  // Bitiş: satırlar değişti (başarılı), hata geldi, ya da uygulama loading'i düşürdü.
  watch(o.rows, (rows) => {
    snapshot.value = { rows, hasMore: o.hasMore() ?? false, page: o.query().page }
    updatedAt.value = new Date()
    settle()
  })
  watch(o.error, (err) => {
    if (err) settle()
  })
  watch(o.loading, (now, before) => {
    if (before && !now) settle()
  })

  onMounted(() => {
    if (isServer()) send('initial')
    else {
      snapshot.value = { rows: o.rows(), hasMore: false, page: o.query().page }
      updatedAt.value = new Date()
    }
  })
  onBeforeUnmount(() => {
    controller?.abort()
    clearTimeout(stillTimer)
    clearTimeout(columnsTimer)
  })

  /** Hata türü: sorgu/sayfa/ilk talep hatası satırları geçersiz kılar (Error); yenileme hatası eskiyi korur (Stale). */
  const errorKind = computed<'error' | 'stale' | null>(() => {
    if (!o.error()) return null
    const r = reason.value
    const keepsRows = (r === 'refresh' || r === 'columns' || r === null) && (snapshot.value?.rows.length ?? 0) > 0
    return keepsRows ? 'stale' : 'error'
  })

  return {
    pending,
    reason,
    snapshot,
    updatedAt,
    stillLoading,
    errorKind,
    /** Son talebi aynı sorguyla, 'refresh' sebebiyle yeniden yayar (satırlar yerinde kalır). */
    refresh: () => {
      if (o.hasListener) send('refresh')
    },
    /** Retry / Try again: son sebeple aynı sorgu. */
    retry: () => {
      if (o.hasListener) send(reason.value ?? 'refresh')
    },
  }
}
