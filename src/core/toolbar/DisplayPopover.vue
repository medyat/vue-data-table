<script setup lang="ts">
// Display popover'ı (05 §3, §5; T3-06, T4-04/05): Density · Columns › · Sort › · Vertical grid lines · Saved for you only + Reset.
// Telefon genişliğinde tetikleyici ⋯ menüsündedir: `anchor` verilirse düğme çizilmez, içerik o öğeye hizalanır.
import {
  PhArrowDown,
  PhArrowUp,
  PhCaretLeft,
  PhCaretRight,
  PhEye,
  PhEyeSlash,
  PhLock,
  PhMagnifyingGlass,
  PhSlidersHorizontal,
  PhX,
} from '@phosphor-icons/vue'
import {
  PopoverAnchor,
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
import type { ColumnDef } from '../../types/columns'
import type { Density } from '../../types/core'
import type { SortRule } from '../../types/query'
import { useDataTableContext } from '../plugin'

export interface PanelColumn {
  id: string
  def: ColumnDef
  visible: boolean
  pinned: 'start' | 'end' | null
  canHide: boolean
}

const props = defineProps<{
  density: Density
  verticalLines: boolean
  columns: PanelColumn[]
  counts: { shown: number; total: number }
  sort: SortRule[]
  /** Tercih deposu varsa "Saved for you only". */
  persistent: boolean
  iconOnly?: boolean
  anchor?: HTMLElement | null
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
const find = ref('')
watch(open, (o) => {
  if (!o) {
    view.value = 'main'
    find.value = ''
  }
})
/** ⋯ menüsü kapanırken odağı tetikleyicisine (anchor) geri verir; bu "dışarı odak" popover'ı kapatmasın. */
const onFocusOutside = (e: CustomEvent<{ originalEvent: FocusEvent }>) => {
  if (props.anchor?.contains(e.detail.originalEvent.target as Node)) e.preventDefault()
}
const headerOf = (id: string) => props.columns.find((c) => c.id === id)?.def.header ?? id
const sortSummary = computed(() => {
  const first = props.sort[0]
  if (!first) return '—'
  const more = props.sort.length > 1 ? ` +${props.sort.length - 1}` : ''
  return `${headerOf(first.column)} ${first.dir === 'asc' ? '↑' : '↓'}${more}`
})
const matches = (c: PanelColumn) =>
  !find.value || c.def.header.toLocaleLowerCase().includes(find.value.toLocaleLowerCase())
const pinnedCols = computed(() => props.columns.filter((c) => c.pinned && c.visible && matches(c)))
const shownCols = computed(() => props.columns.filter((c) => !c.pinned && c.visible && matches(c)))
const hiddenCols = computed(() => props.columns.filter((c) => !c.visible && matches(c)))
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverAnchor v-if="anchor" as="span" :reference="anchor" />
    <PopoverTrigger v-else as-child>
      <button
        type="button"
        class="dt-btn has-icon"
        :class="{ 'dt-btn-icon': iconOnly }"
        :aria-label="iconOnly ? i18n.t('toolbar.display') : undefined"
        :data-dt-tip="iconOnly ? i18n.t('toolbar.display') : undefined"
      >
        <PhSlidersHorizontal :size="16" aria-hidden="true" />
        <span v-if="!iconOnly">{{ i18n.t('toolbar.display') }}</span>
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="dt-pop dt-display"
        :class="`is-${view}`"
        align="end"
        :side-offset="4"
        @focus-outside="onFocusOutside"
      >
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
          <button type="button" class="dt-pop-item" @click="view = 'sort'">
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

        <template v-else-if="view === 'columns'">
          <div class="dt-pop-head">
            <button type="button" class="dt-icon-btn-sm" :aria-label="i18n.t('common.back')" @click="view = 'main'">
              <PhCaretLeft :size="16" aria-hidden="true" />
            </button>
            <strong>{{ i18n.t('display.columns') }}</strong>
            <span class="dt-pop-value">{{ i18n.t('columns.shownOf', counts) }}</span>
          </div>
          <label class="dt-input has-icon dt-pop-find">
            <span class="dt-input-icon"><PhMagnifyingGlass :size="14" aria-hidden="true" /></span>
            <input
              v-model="find"
              type="search"
              :placeholder="i18n.t('columns.find')"
              :aria-label="i18n.t('columns.find')"
            />
          </label>
          <template v-if="pinnedCols.length">
            <div class="dt-pop-label">
              {{ i18n.t('columns.pinned') }}
              <span>{{ i18n.t('columns.alwaysShown') }}</span>
            </div>
            <div v-for="c in pinnedCols" :key="c.id" class="dt-col-row">
              <span class="dt-col-name">{{ c.def.header }}</span>
              <PhLock :size="14" class="dt-col-lock" aria-hidden="true" />
            </div>
          </template>
          <div class="dt-pop-label">
            {{ i18n.t('columns.shown') }}
            <button type="button" class="dt-pop-action" @click="emit('columns-all', false)">
              {{ i18n.t('columns.hideAll') }}
            </button>
          </div>
          <div v-for="(c, i) in shownCols" :key="c.id" class="dt-col-row">
            <span class="dt-col-name">{{ c.def.header }}</span>
            <button
              type="button"
              class="dt-icon-btn-xs"
              :disabled="i === 0"
              :aria-label="i18n.t('columns.moveUp')"
              @click="emit('column-move', c.id, -1)"
            >
              <PhArrowUp :size="14" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="dt-icon-btn-xs"
              :disabled="i === shownCols.length - 1"
              :aria-label="i18n.t('columns.moveDown')"
              @click="emit('column-move', c.id, 1)"
            >
              <PhArrowDown :size="14" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="dt-icon-btn-sm"
              :disabled="!c.canHide"
              :aria-label="i18n.t('header.hide')"
              @click="emit('column-visible', c.id, false)"
            >
              <PhEye :size="16" aria-hidden="true" />
            </button>
          </div>
          <div class="dt-pop-label">
            {{ i18n.t('columns.hidden') }}
            <button type="button" class="dt-pop-action" @click="emit('columns-all', true)">
              {{ i18n.t('columns.showAll') }}
            </button>
          </div>
          <div v-for="c in hiddenCols" :key="c.id" class="dt-col-row is-hidden">
            <span class="dt-col-name">{{ c.def.header }}</span>
            <button
              type="button"
              class="dt-icon-btn-sm"
              :aria-label="i18n.t('columns.shown')"
              @click="emit('column-visible', c.id, true)"
            >
              <PhEyeSlash :size="16" aria-hidden="true" />
            </button>
          </div>
          <div class="dt-pop-foot">
            <span />
            <button type="button" class="dt-pop-action" @click="emit('columns-reset')">
              {{ i18n.t('common.reset') }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="dt-pop-head">
            <button type="button" class="dt-icon-btn-sm" :aria-label="i18n.t('common.back')" @click="view = 'main'">
              <PhCaretLeft :size="16" aria-hidden="true" />
            </button>
            <strong>{{ i18n.t('display.sort') }}</strong>
          </div>
          <div v-for="(s, i) in sort" :key="s.column" class="dt-col-row dt-sort-row">
            <span class="dt-head-sort-index">{{ i + 1 }}</span>
            <span class="dt-col-name">{{ headerOf(s.column) }}</span>
            <button
              type="button"
              class="dt-btn dt-btn-xs has-icon"
              @click="emit('sort-dir', s.column, s.dir === 'asc' ? 'desc' : 'asc')"
            >
              <component :is="s.dir === 'asc' ? PhArrowUp : PhArrowDown" :size="12" aria-hidden="true" />
              {{ i18n.t(s.dir === 'asc' ? 'sr.asc' : 'sr.desc') }}
            </button>
            <button
              type="button"
              class="dt-icon-btn-sm"
              :aria-label="i18n.t('header.clearSort')"
              @click="emit('sort-remove', s.column)"
            >
              <PhX :size="14" aria-hidden="true" />
            </button>
          </div>
          <div class="dt-pop-foot">
            <span>{{ i18n.t('sort.addHint') }}</span>
            <button type="button" class="dt-pop-action" :disabled="!sort.length" @click="emit('sort-clear')">
              {{ i18n.t('header.clearSort') }}
            </button>
          </div>
        </template>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
