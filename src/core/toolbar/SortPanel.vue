<script setup lang="ts">
// Sort paneli (04 §6; Display › Sort ve telefon ⋯ sayfası): sıra numarası · sütun · yön · kaldır; altta ipucu + Clear sort.
import { PhArrowDown, PhArrowUp, PhX } from '@phosphor-icons/vue'
import type { SortRule } from '../../types/query'
import { useDataTableContext } from '../plugin'

defineProps<{ sort: SortRule[]; headerOf: (id: string) => string }>()
const emit = defineEmits<{
  'sort-dir': [column: string, dir: 'asc' | 'desc']
  'sort-remove': [column: string]
  'sort-clear': []
}>()
const { i18n } = useDataTableContext()
</script>

<template>
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
