<script setup lang="ts">
// Telefon ⋯ alt sayfası (handoff 04 §6.4, T13-07): Display (Density › · Columns › · Sort ›) · Export matching rows › · Import ·
// Print · Refresh · Auto-refresh · "Saved for you only" + Reset. Masaüstündeki Display popover'ı ve ⋯ menüsünün yerini alır.
import { PhCaretLeft, PhCaretRight, PhCheck, PhDotsThree } from '@phosphor-icons/vue'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { Density } from '../../types/core'
import type { SortRule } from '../../types/query'
import { useDataTableContext } from '../plugin'
import Layer from '../ui/Layer.vue'
import ColumnsPanel, { type PanelColumn } from './ColumnsPanel.vue'
import SortPanel from './SortPanel.vue'

const props = defineProps<{
  density: Density
  columns: PanelColumn[]
  counts: { shown: number; total: number }
  sort: SortRule[]
  persistent: boolean
  refresh: boolean
  export: boolean
  import: boolean
  print: boolean
  autoRefresh: boolean
  autoRefreshOn: boolean
}>()
const emit = defineEmits<{
  'update:density': [density: Density]
  'column-visible': [id: string, visible: boolean]
  'column-move': [id: string, delta: -1 | 1]
  'columns-all': [visible: boolean]
  'columns-reset': []
  'sort-dir': [column: string, dir: 'asc' | 'desc']
  'sort-remove': [column: string]
  'sort-clear': []
  reset: []
  refresh: []
  export: [format: 'csv' | 'xlsx']
  import: []
  print: []
  'update:autoRefreshOn': [on: boolean]
}>()
const { i18n } = useDataTableContext()
const open = ref(false)
const level = ref<'main' | 'density' | 'columns' | 'sort' | 'export'>('main')
watch(open, (o) => {
  if (!o) level.value = 'main'
})
const DENSITIES: Density[] = ['comfortable', 'standard', 'compact']
const TITLES = {
  main: 'toolbar.more',
  density: 'display.density',
  columns: 'display.columns',
  sort: 'display.sort',
  export: 'toolbar.export',
} as const
const headerOf = (id: string) => props.columns.find((c) => c.id === id)?.def.header ?? id
const sortSummary = computed(() => {
  const first = props.sort[0]
  if (!first) return i18n.t('common.empty')
  const more = props.sort.length > 1 ? ` +${props.sort.length - 1}` : ''
  return `${headerOf(first.column)} ${first.dir === 'asc' ? '↑' : '↓'}${more}`
})
const hasActions = computed(() => props.export || props.import || props.print || props.refresh || props.autoRefresh)
const close = (fn: () => void) => {
  open.value = false
  fn()
}
const setDensity = (d: Density) => {
  emit('update:density', d)
  level.value = 'main'
}
</script>

<template>
  <Layer
    v-model:open="open"
    sheet
    content-class="dt-more-sheet"
    :title="i18n.t(TITLES[level])"
    :hide-title="level === 'main'"
  >
    <template #trigger>
      <button type="button" class="dt-btn dt-btn-icon dt-more-trigger" :aria-label="i18n.t('toolbar.more')">
        <PhDotsThree :size="20" weight="bold" aria-hidden="true" />
      </button>
    </template>
    <template v-if="level !== 'main'" #head-start>
      <button type="button" class="dt-bsheet-back" :aria-label="i18n.t('common.back')" @click="level = 'main'">
        <PhCaretLeft :size="20" aria-hidden="true" />
      </button>
    </template>
    <template v-if="level === 'columns'" #head-end>
      <span class="dt-bsheet-value">{{ i18n.t('columns.shownOf', counts) }}</span>
    </template>

    <template v-if="level === 'main'">
      <div class="dt-bsheet-label">{{ i18n.t('toolbar.display') }}</div>
      <button type="button" class="dt-bsheet-row" @click="level = 'density'">
        {{ i18n.t('display.density') }}
        <span class="dt-bsheet-value">{{ i18n.t(`display.${density}`) }}</span>
        <PhCaretRight :size="16" aria-hidden="true" />
      </button>
      <button type="button" class="dt-bsheet-row" @click="level = 'columns'">
        {{ i18n.t('display.columns') }}
        <span class="dt-bsheet-value">{{ i18n.t('columns.shownOf', counts) }}</span>
        <PhCaretRight :size="16" aria-hidden="true" />
      </button>
      <button type="button" class="dt-bsheet-row" @click="level = 'sort'">
        {{ i18n.t('display.sort') }}
        <span class="dt-bsheet-value">{{ sortSummary }}</span>
        <PhCaretRight :size="16" aria-hidden="true" />
      </button>
      <div v-if="hasActions" class="dt-bsheet-sep" />
      <button v-if="$props.export" type="button" class="dt-bsheet-row" @click="level = 'export'">
        {{ i18n.t('toolbar.export') }}
        <PhCaretRight :size="16" class="dt-bsheet-end" aria-hidden="true" />
      </button>
      <button v-if="$props.import" type="button" class="dt-bsheet-row" @click="close(() => emit('import'))">
        {{ i18n.t('toolbar.import') }}
      </button>
      <button v-if="print" type="button" class="dt-bsheet-row" @click="close(() => emit('print'))">
        {{ i18n.t('toolbar.print') }}
      </button>
      <button v-if="refresh" type="button" class="dt-bsheet-row" @click="close(() => emit('refresh'))">
        {{ i18n.t('toolbar.refresh') }}
      </button>
      <label v-if="autoRefresh" class="dt-bsheet-row">
        {{ i18n.t('toolbar.autoRefresh') }}
        <SwitchRoot
          class="dt-switch dt-bsheet-end"
          :model-value="autoRefreshOn"
          @update:model-value="(v) => emit('update:autoRefreshOn', v)"
        >
          <SwitchThumb class="dt-switch-thumb" />
        </SwitchRoot>
      </label>
      <div class="dt-bsheet-note">
        <span>{{ persistent ? i18n.t('display.savedForYou') : '' }}</span>
        <button type="button" class="dt-bsheet-action" @click="emit('reset')">{{ i18n.t('common.reset') }}</button>
      </div>
    </template>

    <template v-else-if="level === 'density'">
      <button v-for="d in DENSITIES" :key="d" type="button" class="dt-bsheet-row" @click="setDensity(d)">
        {{ i18n.t(`display.${d}`) }}
        <PhCheck v-if="d === density" :size="18" class="dt-bsheet-end dt-bsheet-check" aria-hidden="true" />
      </button>
    </template>

    <ColumnsPanel
      v-else-if="level === 'columns'"
      :columns="columns"
      @column-visible="(id, v) => emit('column-visible', id, v)"
      @column-move="(id, d) => emit('column-move', id, d)"
      @columns-all="(v) => emit('columns-all', v)"
      @columns-reset="emit('columns-reset')"
    />
    <SortPanel
      v-else-if="level === 'sort'"
      :sort="sort"
      :header-of="headerOf"
      @sort-dir="(c, d) => emit('sort-dir', c, d)"
      @sort-remove="(c) => emit('sort-remove', c)"
      @sort-clear="emit('sort-clear')"
    />

    <template v-else>
      <button type="button" class="dt-bsheet-row" @click="close(() => emit('export', 'csv'))">
        {{ i18n.t('toolbar.csv') }}
      </button>
      <button type="button" class="dt-bsheet-row" @click="close(() => emit('export', 'xlsx'))">
        {{ i18n.t('toolbar.xlsx') }}
      </button>
    </template>
  </Layer>
</template>
