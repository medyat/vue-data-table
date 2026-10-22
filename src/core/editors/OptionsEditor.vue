<script setup lang="ts">
// Seçenek editörü (04 §3, T2-02/03): select · multiselect · tags · color · ajax · user. Her işaretleme anında uygulanır;
// hover'da "Only"; `user`'da Me ve Unassigned en üstte; uzak kaynaklar yazdıkça arar ve 20'şer yükler (03).
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ColumnDef, OptionDef, RemoteOptions, UserOption } from '../../types/columns'
import type { FilterOp } from '../../types/query'
import { avatar, badge } from '../cells/renderCell'
import type { RemoteLabels } from '../cells/remoteLabels'
import { readPath } from '../columns/readPath'
import { useDataTableContext } from '../plugin'

const props = defineProps<{
  column: ColumnDef
  op: FilterOp
  modelValue: Array<string | number>
  /** tags/color: yüklü satırlardaki mevcut değerler (uzaktan öneri yok, D3). */
  rows: object[]
  labels: RemoteLabels
}>()
const emit = defineEmits<{ 'update:modelValue': [values: Array<string | number>]; unassigned: [] }>()
const { i18n } = useDataTableContext()

const def = computed(() => props.column)
const remote = computed<RemoteOptions | undefined>(() =>
  def.value.type === 'ajax' || def.value.type === 'user' ? (def.value as { remote?: RemoteOptions }).remote : undefined,
)
const isUser = computed(() => def.value.type === 'user')
const q = ref('')

const distinctFromRows = (): OptionDef[] => {
  const seen = new Set<string | number>()
  for (const row of props.rows) {
    const raw = def.value.accessor ? def.value.accessor(row) : readPath(row, def.value.id as string)
    for (const v of Array.isArray(raw) ? raw : [raw])
      if (v !== null && v !== undefined && v !== '') seen.add(v as string | number)
  }
  return [...seen].sort((a, b) => String(a).localeCompare(String(b))).map((value) => ({ value, label: String(value) }))
}
const staticOptions = computed<OptionDef[]>(() => {
  const d = def.value
  if (d.type === 'select' || d.type === 'multiselect') return d.options
  if (d.type === 'user' && d.options) return [...d.options].sort((a, b) => a.label.localeCompare(b.label))
  if (d.type === 'color' && d.palette) return d.palette.map((value) => ({ value, label: value }))
  if (d.type === 'tags' || d.type === 'color') return distinctFromRows()
  return []
})

// Uzak kaynak: 250 ms sonra arar; sayfa sayfa ekler.
const items = ref<OptionDef[]>([])
const hasMore = ref(false)
const loading = ref(false)
let page = 1
let ctl: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const load = async (append: boolean) => {
  const r = remote.value
  if (!r) return
  ctl?.abort()
  ctl = new AbortController()
  loading.value = true
  try {
    const res = await r.search(q.value, page, { signal: ctl.signal })
    items.value = append ? [...items.value, ...res.items] : res.items
    hasMore.value = res.hasMore
    props.labels.seed(def.value.id as string, res.items)
  } catch {
    /* abort veya ağ hatası: liste olduğu gibi kalır (D18) */
  } finally {
    loading.value = false
  }
}
if (remote.value) void load(false)
watch(q, () => {
  if (!remote.value) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    page = 1
    void load(false)
  }, 250)
})
const loadMore = () => {
  page += 1
  void load(true)
}
onBeforeUnmount(() => {
  clearTimeout(timer)
  ctl?.abort()
})

const options = computed<OptionDef[]>(() => {
  if (remote.value) return items.value
  const needle = q.value.trim().toLocaleLowerCase()
  return needle ? staticOptions.value.filter((o) => o.label.toLocaleLowerCase().includes(needle)) : staticOptions.value
})
const showSearch = computed(() => !!remote.value || staticOptions.value.length > 7)
const searchPlaceholder = computed(() =>
  def.value.filterNoun ? i18n.t('option.searchNoun', { noun: def.value.filterNoun }) : i18n.t('option.search'),
)

const selected = computed(() => new Set(props.modelValue.map(String)))
const isOn = (v: string | number) => selected.value.has(String(v))
const toggle = (v: string | number) => {
  const next = isOn(v) ? props.modelValue.filter((x) => String(x) !== String(v)) : [...props.modelValue, v]
  emit('update:modelValue', next)
}
const only = (v: string | number) => emit('update:modelValue', [v])
const unassigned = computed(() => props.op === 'is_empty')

// Sabit bileşen: her render'da yeni bileşen üretmek rozeti DOM'da değiştirir ve tıkı yutabilir (bkz. sheet/editors/OptionCell).
const rich = computed(() => ['select', 'multiselect', 'user'].includes(def.value.type))
const Opt = (p: { o: OptionDef }) =>
  def.value.type === 'user' ? [avatar(p.o as UserOption), ' ', p.o.label] : badge(p.o.tone ?? 'gray', p.o.label)
</script>

<template>
  <div class="dt-options">
    <label v-if="showSearch" class="dt-input has-icon dt-options-search">
      <span class="dt-input-icon"><PhMagnifyingGlass :size="14" aria-hidden="true" /></span>
      <input v-model="q" type="search" :placeholder="searchPlaceholder" :aria-label="searchPlaceholder" autofocus />
    </label>
    <div class="dt-options-list" role="group">
      <template v-if="isUser && !q">
        <label class="dt-option" :class="{ 'is-on': isOn('@me') }">
          <input type="checkbox" class="dt-checkbox" :checked="isOn('@me')" @change="toggle('@me')" />
          <span class="dt-option-body">
            <span class="dt-avatar dt-tone-blue" aria-hidden="true">{{ i18n.t('common.me').slice(0, 2) }}</span>
            {{ i18n.t('common.me') }}
          </span>
        </label>
        <label class="dt-option is-unassigned" :class="{ 'is-on': unassigned }">
          <input type="checkbox" class="dt-checkbox" :checked="unassigned" @change="emit('unassigned')" />
          <span class="dt-option-body">
            <span class="dt-avatar is-empty" aria-hidden="true" />
            {{ i18n.t('common.unassigned') }}
          </span>
        </label>
        <div class="dt-pop-sep" />
      </template>
      <label v-for="o in options" :key="String(o.value)" class="dt-option" :class="{ 'is-on': isOn(o.value) }">
        <input type="checkbox" class="dt-checkbox" :checked="isOn(o.value)" @change="toggle(o.value)" />
        <span class="dt-option-body">
          <Opt v-if="rich" :o="o" />
          <template v-else-if="def.type === 'color'">
            <span class="dt-swatch" :style="{ background: String(o.value) }" aria-hidden="true" />
            <span class="dt-mono">{{ o.label }}</span>
          </template>
          <span v-else-if="def.type === 'tags'" class="dt-tag">{{ o.label }}</span>
          <template v-else>{{ o.label }}</template>
        </span>
        <button type="button" class="dt-btn dt-btn-xs dt-option-only" tabindex="-1" @click.prevent="only(o.value)">
          {{ i18n.t('option.only') }}
        </button>
      </label>
      <div v-if="remote && !loading && options.length === 0" class="dt-options-empty">
        {{ i18n.t('remote.noResults') }}
      </div>
      <div v-else-if="!remote && options.length === 0" class="dt-options-empty">{{ i18n.t('picker.noMatch') }}</div>
      <div v-if="loading" class="dt-options-empty">{{ i18n.t('common.loading') }}</div>
      <button
        v-if="remote && hasMore && !loading"
        type="button"
        class="dt-btn dt-btn-ghost dt-btn-sm dt-options-more"
        @click="loadMore"
      >
        {{ i18n.t('remote.loadMore') }}
      </button>
    </div>
  </div>
</template>
