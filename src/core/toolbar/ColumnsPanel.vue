<script setup lang="ts">
// Columns paneli (05 §5; Display › Columns ve telefon ⋯ sayfası): bul · Pinned (kilitli) · Shown (↑ ↓ gizle) · Hidden (göster) · Reset.
import { PhArrowDown, PhArrowUp, PhEye, PhEyeSlash, PhLock, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import type { ColumnDef } from '../../types/columns'
import { useDataTableContext } from '../plugin'

export interface PanelColumn {
  id: string
  def: ColumnDef
  visible: boolean
  pinned: 'start' | 'end' | null
  canHide: boolean
}

const props = defineProps<{ columns: PanelColumn[] }>()
const emit = defineEmits<{
  'column-visible': [id: string, visible: boolean]
  'column-move': [id: string, delta: -1 | 1]
  'columns-all': [visible: boolean]
  'columns-reset': []
}>()
const { i18n } = useDataTableContext()
const find = ref('')
const matches = (c: PanelColumn) =>
  !find.value || c.def.header.toLocaleLowerCase().includes(find.value.toLocaleLowerCase())
const pinnedCols = computed(() => props.columns.filter((c) => c.pinned && c.visible && matches(c)))
const shownCols = computed(() => props.columns.filter((c) => !c.pinned && c.visible && matches(c)))
const hiddenCols = computed(() => props.columns.filter((c) => !c.visible && matches(c)))
</script>

<template>
  <label class="dt-input has-icon dt-pop-find">
    <span class="dt-input-icon"><PhMagnifyingGlass :size="14" aria-hidden="true" /></span>
    <input v-model="find" type="search" :placeholder="i18n.t('columns.find')" :aria-label="i18n.t('columns.find')" />
  </label>
  <template v-if="pinnedCols.length">
    <div class="dt-pop-label">
      {{ i18n.t('columns.pinned') }}
      <span>{{ i18n.t('columns.alwaysShown') }}</span>
    </div>
    <div v-for="c in pinnedCols" :key="c.id" class="dt-col-row">
      <span class="dt-col-name">
        <span>{{ c.def.header }}</span>
        <span v-if="c.def.description" class="dt-col-desc">{{ c.def.description }}</span>
      </span>
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
    <span class="dt-col-name">
      <span>{{ c.def.header }}</span>
      <span v-if="c.def.description" class="dt-col-desc">{{ c.def.description }}</span>
    </span>
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
    <span class="dt-col-name">
      <span>{{ c.def.header }}</span>
      <span v-if="c.def.description" class="dt-col-desc">{{ c.def.description }}</span>
    </span>
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
    <button type="button" class="dt-pop-action" @click="emit('columns-reset')">{{ i18n.t('common.reset') }}</button>
  </div>
</template>
