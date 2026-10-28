<script setup lang="ts" generic="Row extends object">
// Header hücresi (05 §4 · Header, T4): etiket düğmesi, birim, sıralama oku, filtre işareti, raptiye, ⋯ sütun menüsü,
// resize tutamacı. Klavye (08 §3): ↵/Space sırala, ⇧F10 menü, ⇧←/→ ±16 px, ⌥⇧←/→ taşı.
import { PhArrowUp, PhDotsThree, PhFunnel, PhPushPin } from '@phosphor-icons/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, ref, useId } from 'vue'
import { TYPE_SPECS, alignOf, isNumericType, typeLabelKey } from '../cells/specs'
import type { LayoutColumn } from '../columns/useColumnLayout'
import { useDataTableContext } from '../plugin'
import { MOVE_KBD, type HeaderAction } from './headerActions'

const props = defineProps<{
  /** Telefon: `headerShort` varsa o. */
  phone?: boolean
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
  filter: [column: LayoutColumn<Row>]
  action: [column: LayoutColumn<Row>, action: HeaderAction]
  /** Klavye: komşu başlığa veya odaklı satıra geç. */
  'resize-by': [column: LayoutColumn<Row>, delta: number]
  /** Sürükleme başlarken çizilen genişlik: model (minmax) ile ekran aynı olsun, sütun zıplamasın. */
  'resize-start': [column: LayoutColumn<Row>, renderedWidth: number]
}>()

const { i18n } = useDataTableContext()
const def = computed(() => props.column.def)
const numeric = computed(() => isNumericType(def.value.type))
const align = computed(() => alignOf(def.value))
const unit = computed(() => (typeof def.value.unit === 'string' ? def.value.unit : undefined))
const canSort = computed(() => props.sortable ?? false)
const canFilter = computed(() => def.value.filterable ?? TYPE_SPECS[def.value.type].filterable)
// D33: açıklama tooltip'te ikinci satır, ekran okuyucuya aria-describedby; düğme metnine girmez (erişilebilir ad değişmez).
const descId = useId()
const tip = computed(() => (def.value.description ? `${def.value.header}\n${def.value.description}` : def.value.header))
const menuOpen = ref(false)

const resizeHandler = (e: MouseEvent | TouchEvent) => {
  const cell = (e.currentTarget as HTMLElement).parentElement!
  emit('resize-start', props.column, cell.getBoundingClientRect().width)
  props.column.header.getResizeHandler()(e)
}

const onKeydown = (e: KeyboardEvent) => {
  const k = e.key
  if (k === 'Enter' || k === ' ') {
    if (canSort.value) {
      e.preventDefault()
      emit('sort', props.column, e.shiftKey)
    }
    return
  }
  if ((k === 'F10' && e.shiftKey) || k === 'ContextMenu') {
    e.preventDefault()
    menuOpen.value = true
    return
  }
  if ((k === 'ArrowLeft' || k === 'ArrowRight') && e.shiftKey) {
    e.preventDefault()
    const left = k === 'ArrowLeft'
    if (e.altKey) emit('action', props.column, left ? 'move-left' : 'move-right')
    else emit('resize-by', props.column, left ? -16 : 16)
  }
}
// Filter by this column… ile kapanınca odak ⋯'ya dönmez: açılan çip editörü alır (08 §2 · Popover).
let toFilter = false
const act = (action: HeaderAction) => {
  toFilter = action === 'filter'
  emit('action', props.column, action)
}
const onMenuCloseAutoFocus = (e: Event) => {
  if (toFilter) e.preventDefault()
  toFilter = false
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
        'is-menu-open': menuOpen,
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
    @contextmenu.prevent="menuOpen = true"
  >
    <button
      v-if="filtered"
      type="button"
      class="dt-head-icon dt-head-filtered"
      :aria-label="i18n.t('header.filterBy')"
      @click="emit('filter', column)"
    >
      <PhFunnel :size="14" weight="fill" aria-hidden="true" />
    </button>
    <button
      type="button"
      class="dt-head-label"
      :class="{ 'is-static': !canSort }"
      :aria-disabled="canSort ? undefined : 'true'"
      :data-dt-tip="tip"
      :aria-describedby="def.description ? descId : undefined"
      @click="canSort && emit('sort', column, $event.shiftKey)"
      @keydown="onKeydown"
    >
      <span v-if="sort && numeric" class="dt-head-sort" aria-hidden="true">
        <span v-if="sortIndex" class="dt-head-sort-index">{{ sortIndex }}</span>
        <PhArrowUp :size="12" :class="{ 'is-desc': sort === 'desc' }" />
      </span>
      <span class="dt-head-text">{{ (phone && def.headerShort) || def.header }}</span>
      <span v-if="unit" class="dt-head-unit">{{ unit }}</span>
      <span v-if="sort && !numeric" class="dt-head-sort" aria-hidden="true">
        <PhArrowUp :size="12" :class="{ 'is-desc': sort === 'desc' }" />
        <span v-if="sortIndex" class="dt-head-sort-index">{{ sortIndex }}</span>
      </span>
      <PhPushPin v-if="column.pinned" :size="12" class="dt-head-pin" aria-hidden="true" />
    </button>
    <span v-if="def.description" :id="descId" class="dt-sr-only">{{ def.description }}</span>
    <DropdownMenuRoot v-model:open="menuOpen">
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="dt-head-icon dt-head-menu"
          :aria-label="i18n.t('header.optionsAria', { column: def.header })"
        >
          <PhDotsThree :size="16" weight="bold" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          class="dt-menu dt-col-menu"
          align="end"
          :side-offset="4"
          @close-auto-focus="onMenuCloseAutoFocus"
        >
          <DropdownMenuLabel class="dt-menu-label">{{ i18n.t(typeLabelKey(def.type)) }}</DropdownMenuLabel>
          <template v-if="canSort">
            <DropdownMenuItem class="dt-menu-item" @select="act('sort-asc')">
              {{ i18n.t('header.sortAsc') }}
            </DropdownMenuItem>
            <DropdownMenuItem class="dt-menu-item" @select="act('sort-desc')">
              {{ i18n.t('header.sortDesc') }}
            </DropdownMenuItem>
            <DropdownMenuItem class="dt-menu-item" :disabled="!sort" @select="act('sort-clear')">
              {{ i18n.t('header.clearSort') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator class="dt-menu-sep" />
          </template>
          <template v-if="canFilter">
            <DropdownMenuItem class="dt-menu-item" @select="act('filter')">
              {{ i18n.t('header.filterBy') }}
            </DropdownMenuItem>
            <DropdownMenuSeparator class="dt-menu-sep" />
          </template>
          <DropdownMenuItem v-if="column.pinned" class="dt-menu-item" @select="act('unpin')">
            {{ i18n.t('header.unpin') }}
          </DropdownMenuItem>
          <template v-else>
            <DropdownMenuItem class="dt-menu-item" @select="act('pin-left')">
              {{ i18n.t('header.pinLeft') }}
            </DropdownMenuItem>
            <DropdownMenuItem class="dt-menu-item" @select="act('pin-right')">
              {{ i18n.t('header.pinRight') }}
            </DropdownMenuItem>
          </template>
          <DropdownMenuItem class="dt-menu-item" @select="act('move-left')">
            {{ i18n.t('header.moveLeft') }}
            <kbd class="dt-kbd">{{ MOVE_KBD.left }}</kbd>
          </DropdownMenuItem>
          <DropdownMenuItem class="dt-menu-item" @select="act('move-right')">
            {{ i18n.t('header.moveRight') }}
            <kbd class="dt-kbd">{{ MOVE_KBD.right }}</kbd>
          </DropdownMenuItem>
          <DropdownMenuSeparator class="dt-menu-sep" />
          <DropdownMenuItem
            class="dt-menu-item"
            :disabled="!!column.pinned || !column.header.column.getCanHide()"
            @select="act('hide')"
          >
            {{ i18n.t('header.hide') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <span class="dt-head-sep" aria-hidden="true" />
    <span class="dt-resize" aria-hidden="true" @mousedown="resizeHandler" @touchstart.passive="resizeHandler">
      <span v-if="resizing !== null && resizing !== undefined" class="dt-resize-badge">
        {{ Math.round(resizing) }} px
      </span>
    </span>
  </div>
</template>
