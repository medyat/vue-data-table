<script setup lang="ts">
// Display popover'ı (05 §3, §5; T3-06, T4-04/05): Density · Columns › · Sort › · Vertical grid lines · Saved for you only + Reset.
// Telefonda yerini ⋯ alt sayfası (PhoneMoreSheet) alır. Columns ve Sort panelleri ortak (ColumnsPanel / SortPanel).
import { PhCaretLeft, PhCaretRight, PhSlidersHorizontal } from '@phosphor-icons/vue'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  SwitchRoot,
  SwitchThumb,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import type { Density } from '../../types/core'
import type { SortRule } from '../../types/query'
import { useDataTableContext } from '../plugin'
import ColumnsPanel, { type PanelColumn } from './ColumnsPanel.vue'
import SortPanel from './SortPanel.vue'

const props = defineProps<{
  density: Density
  verticalLines: boolean
  columns: PanelColumn[]
  counts: { shown: number; total: number }
  /** Verilmezse Sort › satırı yok (DataSheet: header tıklaması yeterli, 07 §2). */
  sort?: SortRule[]
  /** Tercih deposu varsa "Saved for you only". */
  persistent: boolean
  iconOnly?: boolean
}>()
const emit = defineEmits<{
  'update:density': [density: Density]
  'update:verticalLines': [on: boolean]
  'column-visible': [id: string, visible: boolean]
  'column-move': [id: string, delta: -1 | 1]
  'columns-all': [visible: boolean]
  'columns-reset': []
  'sort-dir': [column: string, dir: 'asc' | 'desc']
  'sort-remove': [column: string]
  'sort-clear': []
  reset: []
}>()
const open = defineModel<boolean>('open', { default: false })

const { i18n } = useDataTableContext()
const DENSITIES: Density[] = ['comfortable', 'standard', 'compact']
const view = ref<'main' | 'columns' | 'sort'>('main')
watch(open, (o) => {
  if (!o) view.value = 'main'
})
const headerOf = (id: string) => props.columns.find((c) => c.id === id)?.def.header ?? id
const sortSummary = computed(() => {
  const first = props.sort?.[0]
  if (!first) return '—'
  const more = props.sort!.length > 1 ? ` +${props.sort!.length - 1}` : ''
  return `${headerOf(first.column)} ${first.dir === 'asc' ? '↑' : '↓'}${more}`
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="dt-btn has-icon"
        :class="{ 'dt-btn-icon': iconOnly }"
        :aria-label="i18n.t('toolbar.display')"
        :data-dt-tip="iconOnly ? i18n.t('toolbar.display') : undefined"
      >
        <PhSlidersHorizontal :size="16" aria-hidden="true" />
        <span v-if="!iconOnly">{{ i18n.t('toolbar.display') }}</span>
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="dt-pop dt-display" :class="`is-${view}`" align="end" :side-offset="4">
        <template v-if="view === 'main'">
          <div class="dt-pop-label">{{ i18n.t('display.density') }}</div>
          <ToggleGroupRoot
            class="dt-seg dt-seg-sm dt-display-density"
            type="single"
            :model-value="density"
            @update:model-value="(v) => v && emit('update:density', v as Density)"
          >
            <ToggleGroupItem v-for="d in DENSITIES" :key="d" class="dt-seg-item" :value="d">
              {{ i18n.t(`display.${d}`) }}
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <div class="dt-pop-sep" />
          <button type="button" class="dt-pop-item" @click="view = 'columns'">
            {{ i18n.t('display.columns') }}
            <span class="dt-pop-value">{{ i18n.t('columns.shownOf', counts) }}</span>
            <PhCaretRight :size="14" aria-hidden="true" />
          </button>
          <button v-if="sort" type="button" class="dt-pop-item" @click="view = 'sort'">
            {{ i18n.t('display.sort') }}
            <span class="dt-pop-value">{{ sortSummary }}</span>
            <PhCaretRight :size="14" aria-hidden="true" />
          </button>
          <label class="dt-pop-item">
            {{ i18n.t('display.verticalLines') }}
            <SwitchRoot
              class="dt-switch dt-pop-end"
              :model-value="verticalLines"
              @update:model-value="(v) => emit('update:verticalLines', v)"
            >
              <SwitchThumb class="dt-switch-thumb" />
            </SwitchRoot>
          </label>
          <div class="dt-pop-foot">
            <span>{{ persistent ? i18n.t('display.savedForYou') : '' }}</span>
            <button type="button" class="dt-pop-action" @click="emit('reset')">{{ i18n.t('common.reset') }}</button>
          </div>
        </template>

        <template v-else>
          <div class="dt-pop-head">
            <button type="button" class="dt-icon-btn-sm" :aria-label="i18n.t('common.back')" @click="view = 'main'">
              <PhCaretLeft :size="16" aria-hidden="true" />
            </button>
            <strong>{{ i18n.t(view === 'columns' ? 'display.columns' : 'display.sort') }}</strong>
            <span v-if="view === 'columns'" class="dt-pop-value">{{ i18n.t('columns.shownOf', counts) }}</span>
          </div>
          <ColumnsPanel
            v-if="view === 'columns'"
            :columns="columns"
            @column-visible="(id, v) => emit('column-visible', id, v)"
            @column-move="(id, d) => emit('column-move', id, d)"
            @columns-all="(v) => emit('columns-all', v)"
            @columns-reset="emit('columns-reset')"
          />
          <SortPanel
            v-else
            :sort="sort ?? []"
            :header-of="headerOf"
            @sort-dir="(c, d) => emit('sort-dir', c, d)"
            @sort-remove="(c) => emit('sort-remove', c)"
            @sort-clear="emit('sort-clear')"
          />
        </template>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
