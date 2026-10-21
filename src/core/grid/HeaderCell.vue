<script setup lang="ts" generic="Row extends object">
// Header hücresi (05 §4 · Header, T4): etiket düğmesi, birim, sıralama oku, filtre işareti, raptiye, ⋯, resize tutamacı.
import { PhArrowUp, PhDotsThree, PhFunnel, PhPushPin } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { alignOf, isNumericType } from '../cells/specs'
import type { LayoutColumn } from '../columns/useColumnLayout'
import { useDataTableContext } from '../plugin'

const props = defineProps<{
  column: LayoutColumn<Row>
  sort?: 'asc' | 'desc' | null
  /** Çoklu sıralamada öncelik (1 tabanlı). */
  sortIndex?: number | null
  filtered?: boolean
  /** Sürüklenirken canlı genişlik (px); değilse null. */
  resizing?: number | null
  sortable?: boolean
}>()
const emit = defineEmits<{
  sort: [column: LayoutColumn<Row>, additive: boolean]
  menu: [column: LayoutColumn<Row>, event: Event]
  filter: [column: LayoutColumn<Row>]
  fit: [column: LayoutColumn<Row>]
  /** Sürükleme başlarken çizilen genişlik: model (minmax) ile ekran aynı olsun, sütun zıplamasın. */
  'resize-start': [column: LayoutColumn<Row>, renderedWidth: number]
}>()

const { i18n } = useDataTableContext()
const def = computed(() => props.column.def)
const numeric = computed(() => isNumericType(def.value.type))
const align = computed(() => alignOf(def.value))
const unit = computed(() => (typeof def.value.unit === 'string' ? def.value.unit : undefined))
const canSort = computed(() => props.sortable ?? false)

const resizeHandler = (e: MouseEvent | TouchEvent) => {
  const cell = (e.currentTarget as HTMLElement).parentElement!
  emit('resize-start', props.column, cell.getBoundingClientRect().width)
  props.column.header.getResizeHandler()(e)
}
</script>

<template>
  <div
    class="dt-head-cell"
    :class="[
      `is-${align}`,
      {
        'is-numeric': numeric,
        'is-sorted': !!sort,
        'is-pinned-start': column.pinned === 'start',
        'is-pinned-end': column.pinned === 'end',
        'is-pin-edge': column.pinEdge,
        'is-resizing': resizing !== null && resizing !== undefined,
      },
    ]"
    :style="
      column.pinned === 'start'
        ? { left: `var(${column.offsetVar})` }
        : column.pinned === 'end'
          ? { right: `var(${column.offsetVar})` }
          : undefined
    "
    role="columnheader"
    :aria-sort="sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined"
    :data-col="column.id"
  >
    <button
      type="button"
      class="dt-head-label"
      :class="{ 'is-static': !canSort }"
      :tabindex="canSort ? -1 : -1"
      :aria-disabled="canSort ? undefined : 'true'"
      :data-dt-tip="def.header"
      @click="canSort && emit('sort', column, $event.shiftKey)"
    >
      <span v-if="sort && numeric" class="dt-head-sort" aria-hidden="true">
        <span v-if="sortIndex" class="dt-head-sort-index">{{ sortIndex }}</span>
        <PhArrowUp :size="12" :class="{ 'is-desc': sort === 'desc' }" />
      </span>
      <span class="dt-head-text">{{ def.header }}</span>
      <span v-if="unit" class="dt-head-unit">{{ unit }}</span>
      <span v-if="sort && !numeric" class="dt-head-sort" aria-hidden="true">
        <PhArrowUp :size="12" :class="{ 'is-desc': sort === 'desc' }" />
        <span v-if="sortIndex" class="dt-head-sort-index">{{ sortIndex }}</span>
      </span>
      <PhPushPin v-if="column.pinned" :size="12" class="dt-head-pin" aria-hidden="true" />
    </button>
    <button
      v-if="filtered"
      type="button"
      class="dt-head-icon dt-head-filtered"
      tabindex="-1"
      :aria-label="i18n.t('header.filterBy')"
      @click="emit('filter', column)"
    >
      <PhFunnel :size="14" weight="fill" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="dt-head-icon dt-head-menu"
      tabindex="-1"
      :aria-label="i18n.t('toolbar.more')"
      aria-haspopup="menu"
      @click="emit('menu', column, $event)"
    >
      <PhDotsThree :size="16" weight="bold" aria-hidden="true" />
    </button>
    <span class="dt-head-sep" aria-hidden="true" />
    <span
      class="dt-resize"
      aria-hidden="true"
      @mousedown="resizeHandler"
      @touchstart.passive="resizeHandler"
      @dblclick="emit('fit', column)"
    >
      <span v-if="resizing !== null && resizing !== undefined" class="dt-resize-badge">
        {{ Math.round(resizing) }} px
      </span>
    </span>
  </div>
</template>
