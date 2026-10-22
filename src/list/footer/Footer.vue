<script setup lang="ts">
// Footer (05 §8, brief §6.13, T9-12): yalnızca snapshot'tan okur; simple sayfalama (D7); tazelik bilgisi burada.
import { PhArrowClockwise, PhCaretDown, PhCaretLeft, PhCaretRight, PhCircleNotch } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { getFormat } from '../../core/format'
import { useDataTableContext } from '../../core/plugin'

const props = defineProps<{
  /** Snapshot'taki satır sayısı ve sayfa (1 tabanlı). */
  rowCount: number
  page: { number: number; size: number }
  hasMore: boolean
  /** Biliniyorsa toplam (istemci modunda hep; sunucuda Count total sonrası). */
  total?: number
  /** Sunucu modu: footer'da Count total düğmesi; sonuç "counted 09:42" eki alır. */
  countable: boolean
  counting: boolean
  countedAt: Date | null
  /** `page` / `query` talebi sürüyor: sayfalama kilitli. */
  busy: boolean
  /** İlk yükleme: "Loading…". */
  firstLoad: boolean
  /** Gövde Empty (filtre/arama yok) mu: "No rows" / "0 rows". */
  empty: boolean
  pageSizes: number[]
  updatedAt: Date | null
  freshness: 'normal' | 'refreshing' | 'stale' | 'live'
  canRefresh: boolean
  /** Telefon (handoff 04 §5): sayfa boyutu ve tazelik yok; 44 px Önceki / Sonraki. */
  phone?: boolean
}>()
const emit = defineEmits<{ count: []; page: [number: number]; 'page-size': [size: number]; refresh: [] }>()
const { i18n, locale } = useDataTableContext()
const fmt = getFormat(locale)

const from = computed(() => (props.page.number - 1) * props.page.size + 1)
const to = computed(() => from.value + props.rowCount - 1)
const lastPage = computed(() => !props.hasMore)
const single = computed(() => props.page.number === 1 && lastPage.value)
const time = (d: Date) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

const canPrev = computed(() => props.page.number > 1 && !props.busy)
const canNext = computed(() => props.hasMore && !props.busy)
const updatedText = computed(() => {
  if (!props.updatedAt) return ''
  const ago = Date.now() - props.updatedAt.getTime()
  return ago < 60_000
    ? i18n.t('toolbar.updatedJustNow')
    : i18n.t('toolbar.updatedAgo', { time: fmt.relative(props.updatedAt, new Date(), 'short') })
})
</script>

<template>
  <div class="dt-footer" role="navigation" :aria-label="i18n.t('page.nav')">
    <div class="dt-footer-left">
      <span v-if="firstLoad" class="dt-footer-muted">{{ i18n.t('common.loading') }}</span>
      <span v-else-if="rowCount === 0" class="dt-footer-rows">{{ i18n.t(empty ? 'page.none' : 'page.zero') }}</span>
      <template v-else>
        <span class="dt-footer-rows">{{ i18n.t('page.rows', { from: fmt.int(from), to: fmt.int(to) }) }}</span>
        <template v-if="total !== undefined && !single">
          <span class="dt-footer-of">{{ i18n.t('page.of', { total: fmt.int(total) }) }}</span>
          <span v-if="countedAt" class="dt-footer-muted">
            · {{ i18n.t('page.counted', { time: time(countedAt) }) }}
          </span>
        </template>
        <span v-else-if="counting" class="dt-footer-muted">
          {{ i18n.t('page.of', { total: '' }) }}
          <PhCircleNotch :size="12" class="dt-spin" aria-hidden="true" />
          {{ i18n.t('page.counting') }}
        </span>
        <span v-else-if="lastPage && !single" class="dt-footer-muted">· {{ i18n.t('page.end') }}</span>
        <button
          v-else-if="countable && !single"
          type="button"
          class="dt-btn dt-btn-ghost dt-btn-xs dt-footer-count"
          @click="emit('count')"
        >
          · {{ i18n.t('page.countTotal') }}
        </button>
      </template>
      <template v-if="!phone && (updatedAt || freshness !== 'normal')">
        <span class="dt-footer-vsep" aria-hidden="true" />
        <span v-if="freshness === 'live'" class="dt-footer-live">
          <span class="dt-live-dot" aria-hidden="true" />
          {{ i18n.t('toolbar.live') }}
        </span>
        <span v-else-if="freshness === 'refreshing'" class="dt-footer-muted" role="status">
          {{ i18n.t('state.updating') }}
        </span>
        <span v-else-if="updatedAt" class="dt-footer-updated" :class="{ 'is-stale': freshness === 'stale' }">
          {{ updatedText }}
        </span>
        <button
          v-if="canRefresh"
          type="button"
          class="dt-icon-btn-sm"
          :aria-label="i18n.t('toolbar.refresh')"
          :data-dt-tip="`${i18n.t('toolbar.refresh')} · R`"
          @click="emit('refresh')"
        >
          <PhArrowClockwise :size="14" :class="{ 'dt-spin': freshness === 'refreshing' }" aria-hidden="true" />
        </button>
      </template>
    </div>
    <div class="dt-footer-right">
      <label v-if="!phone" class="dt-footer-size">
        <span class="dt-footer-size-label">{{ i18n.t('page.perPage') }}</span>
        <span class="dt-select">
          <select
            :value="page.size"
            :disabled="busy"
            @change="emit('page-size', Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
          </select>
          <PhCaretDown :size="12" aria-hidden="true" />
        </span>
      </label>
      <span v-if="!phone" class="dt-footer-vsep" aria-hidden="true" />
      <button
        type="button"
        class="dt-btn dt-btn-sm has-icon dt-footer-prev"
        :aria-label="phone ? i18n.t('page.previous') : undefined"
        :disabled="!canPrev"
        @click="emit('page', page.number - 1)"
      >
        <PhCaretLeft :size="phone ? 18 : 14" aria-hidden="true" />
        <span>{{ i18n.t('page.previous') }}</span>
      </button>
      <button
        type="button"
        class="dt-btn dt-btn-sm dt-footer-next"
        :aria-label="phone ? i18n.t('page.next') : undefined"
        :disabled="!canNext"
        @click="emit('page', page.number + 1)"
      >
        <span>{{ i18n.t('page.next') }}</span>
        <PhCaretRight :size="phone ? 18 : 14" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
